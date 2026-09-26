import { timingSafeEqual } from "node:crypto";
import { enqueueBankRefresh, enqueueMaterialJob, factsAreStale, getBankInventory, listBankChanges, ocrPageImage, reconcileCosts, summarizeInventory, type GenerationLookup, type StudyProgress } from "@goomi/ai";
import {
  API, INSTALL_ID_HEADER, STUDY_AI_CONSENT_VERSION, STUDY_STAGES, STUDY_UPLOAD_LIMITS, hashString, installIdSchema,
  type MaterialKind, type MaterialProgress, type StudyStage,
} from "@goomi/content";
import { deleteMaterial } from "@goomi/db";
import { Hono, type Context } from "hono";
import { bodyLimit } from "hono/body-limit";
import { z } from "zod";
import type { Entitlements } from "./entitlements";
import { ApiFailure, errorResponse, on, refuse } from "./http";
import { createAllowance, dayKey } from "./limits";
import { aiContext, runJobs, type RunnerDeps } from "./runner";

export type ContentDeps = RunnerDeps & {
  getUserId: (headers: Headers) => Promise<string | null>;
  entitlements: Entitlements;
  studyEnabled: boolean;
  secrets: { cron?: string; jobs?: string; revenueCatWebhook?: string };
  production: boolean;
  /** Runs work after the response (Vercel `waitUntil`); tests await it. */
  waitUntil: (promise: Promise<unknown>) => void;
  /** Gateway cost lookup for reconciliation; defaults to `gateway.getGenerationInfo`. */
  lookupGeneration?: GenerationLookup;
};

const revenueCatWebhookSchema = z.object({
  event: z.object({
    id: z.string().min(1).max(200), type: z.string().min(1).max(100), app_user_id: z.string().min(1).max(200),
    environment: z.string().max(32).optional(),
  }),
});
const clientIp = (c: Context) => c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || c.req.header("x-real-ip") || "unknown";
const bearer = (c: Context) => c.req.header("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
const secretMatches = (given: string, expected: string | undefined) => {
  if (!expected) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};
const requireSecret = (given: string, expected: string | undefined) => { if (!secretMatches(given, expected)) refuse("unauthorized", "Unauthorized."); };

/** Pages marked for OCR at upload that haven't been read yet. */
const pendingOcrPages = (progress: unknown, read: { n: number }[]) => {
  const done = new Set(read.map((page) => page.n));
  return ((progress as { ocrPages?: number[] } | null)?.ocrPages ?? []).filter((n) => !done.has(n));
};

/** A job's checkpoint as the app sees it: which stage, and how far along the pipeline. */
function progressOf(job: { progress: unknown } | undefined): MaterialProgress {
  const stage = (job?.progress as StudyProgress | undefined)?.stage as StudyStage | undefined;
  const total = STUDY_STAGES.length;
  return stage ? { stage, step: STUDY_STAGES.indexOf(stage) + 1, total } : { stage: job ? "queued" : "uploaded", step: 0, total };
}

export function createContentApp(deps: ContentDeps) {
  const app = new Hono();
  app.onError(errorResponse);
  const allowance = createAllowance(deps.db, deps.now);
  const runSoon = (jobId: string) => deps.waitUntil(runJobs(deps, { jobId }).catch(() => undefined));

  async function signedIn(c: Context, message: string): Promise<string> {
    return (await deps.getUserId(c.req.raw.headers)) ?? refuse("auth.required", message);
  }
  async function plusUser(c: Context): Promise<string> {
    if (!deps.studyEnabled || !deps.aiConfigured) refuse("study.disabled", "AI study is not available right now.");
    const userId = await signedIn(c, "Sign in to use AI study.");
    if (!(await deps.entitlements.hasPlus(userId))) refuse("plus.required", "AI study is part of Goomi Plus.");
    return userId;
  }
  async function ownMaterial(userId: string, id: string) {
    return (await deps.db.material.findFirst({ where: { id, userId }, include: { jobs: { select: { id: true, status: true, lockedUntil: true, runAfter: true, progress: true } } } }))
      ?? refuse("material.not_found", "Material not found.");
  }

  // ─── Bank sync (free + Plus; anonymous devices use an install id) ───────────────────────────
  on(app, API.bank, async (c, { query }) => {
    const userId = await deps.getUserId(c.req.raw.headers);
    const installId = installIdSchema.safeParse(c.req.header(INSTALL_ID_HEADER));
    if (!userId && !installId.success) refuse("identity.required", `Send ${INSTALL_ID_HEADER} or sign in.`);
    const subject = userId ?? `install:${installId.data}`;
    const sync = await allowance.bankSync(subject, userId ? await deps.entitlements.hasPlus(userId) : false, clientIp(c));
    const { lang, cursor = null, limit, topics } = query;
    c.header("Cache-Control", "private, no-store");
    if (!sync.remaining) return { items: [], retired: [], cursor: cursor ?? "0", hasMore: false, quota: { remainingToday: 0 } };
    const page = await listBankChanges(deps.db, { lang, cursor, limit: Math.min(limit, sync.remaining), ...(topics.length ? { topics } : {}) });
    return { ...page, quota: { remainingToday: await sync.take(page.items.length) } };
  });

  // ─── Study materials (Plus only) ────────────────────────────────────────────────────────────
  on(app, API.listMaterials, async (c) => {
    const userId = await signedIn(c, "Sign in to see your materials.");
    const rows = await deps.db.material.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, title: true, kind: true, status: true, lang: true, error: true, createdAt: true, _count: { select: { challenges: { where: { accepted: true } } } } } });
    return { materials: rows.map(({ _count, createdAt, kind, ...row }) => ({ ...row, kind: kind as MaterialKind, createdAt: createdAt.toISOString(), challengeCount: _count.challenges })) };
  });

  /** Uploading the same text again resumes it: the answer says what's still missing. */
  on(app, API.createMaterial, async (c, { body }) => {
    const userId = await plusUser(c);
    if (body.consentVersion !== STUDY_AI_CONSENT_VERSION) refuse("consent.required", "Please review and accept how AI study handles your document.");
    const pages = [...new Map(body.pages.map((page) => [page.n, { n: page.n, text: page.text.trim() }])).values()].sort((a, b) => a.n - b.n);
    const chars = pages.reduce((sum, page) => sum + page.text.length, 0);
    if (chars > STUDY_UPLOAD_LIMITS.maxCharsPerDocument) refuse("material.too_large", "This document is longer than 100,000 characters.");
    const ocrPages = [...new Set(body.ocrPages)];
    if (chars < STUDY_UPLOAD_LIMITS.minCharsPerDocument && !ocrPages.length) refuse("material.no_text", "There isn't enough readable text in this document.");

    const textHash = hashString(pages.map((page) => page.text).join("\n")).toString(36) + `-${chars}`;
    const existing = await deps.db.material.findUnique({
      where: { userId_textHash: { userId, textHash } },
      include: { jobs: { select: { id: true } }, pages: { where: { source: "ai-ocr" }, select: { n: true } } },
    });
    if (existing) {
      c.status(200);
      const started = existing.jobs.length > 0;
      return { id: existing.id, status: existing.status, duplicate: true, started, ocrPages: started ? [] : pendingOcrPages(existing.progress, existing.pages) };
    }

    const ticket = await allowance.takeUpload(userId, { pages, ocrPages: ocrPages.length });
    try {
      const at = deps.now();
      const material = await deps.db.material.create({
        data: {
          userId, title: body.title, kind: body.kind, pageCount: pages.length, charCount: chars, textHash,
          consentVersion: body.consentVersion, consentedAt: at, progress: { stage: "uploaded", ocrPages },
          pages: { create: pages.map((page) => ({ ...page, source: "device" })) },
        },
      });
      return { id: material.id, status: material.status, started: false, ocrPages };
    } catch (error) {
      // Nothing was stored (e.g. the same upload raced in twice): give the quota back.
      await ticket.giveBack();
      throw error;
    }
  });

  /** OCR fallback for low-text pages: images are transcribed in memory and never stored. */
  const { maxImagesPerRequest, maxImageBytes, imageTypes } = STUDY_UPLOAD_LIMITS;
  on(app, API.addMaterialPages, async (c, { params }) => {
    const userId = await plusUser(c);
    const material = await ownMaterial(userId, params.id);
    if (material.jobs.length) refuse("material.started", "This material is already being prepared.");
    const allowed = new Set(((material.progress as { ocrPages?: number[] } | null)?.ocrPages) ?? []);
    const form = await c.req.parseBody({ all: true });
    const numbers = ([] as unknown[]).concat(form.n ?? []).map(Number);
    const images = ([] as unknown[]).concat(form.image ?? []).filter((file): file is File => file instanceof File);
    if (!images.length || images.length !== numbers.length || images.length > maxImagesPerRequest) refuse("invalid", `Send 1-${maxImagesPerRequest} images, each with its page number n.`);
    if (new Set(numbers).size !== numbers.length) refuse("invalid", "Each page can be sent once per request.");
    for (const [index, image] of images.entries()) {
      if (!Number.isInteger(numbers[index]) || !allowed.has(numbers[index]!)) refuse("invalid", `Page ${numbers[index]} was not marked for reading.`);
      if (!(imageTypes as readonly string[]).includes(image.type) || image.size > maxImageBytes) refuse("material.too_large", "Each page image must be a JPEG or PNG under 1.5 MB.");
    }
    const ticket = await allowance.takeOcrPages(userId, images.length);
    const context = aiContext(deps, { userId, materialId: material.id });
    const results: { n: number; chars: number; legibility: string }[] = [];
    try {
      for (let start = 0; start < images.length; start += 4) {
        const batch = images.slice(start, start + 4);
        results.push(...await Promise.all(batch.map(async (image, offset) => {
          const n = numbers[start + offset]!;
          const page = await ocrPageImage(new Uint8Array(await image.arrayBuffer()), image.type as "image/jpeg" | "image/png", { models: deps.models, ai: context });
          const text = page.text.trim().slice(0, 20_000);
          await deps.db.materialPage.upsert({ where: { materialId_n: { materialId: material.id, n } }, create: { materialId: material.id, n, text, source: "ai-ocr" }, update: { text, source: "ai-ocr" } });
          return { n, chars: text.length, legibility: page.legibility };
        })));
      }
    } catch (error) {
      // Only pages that were actually read count against the quota.
      await ticket.giveBack(images.length - results.length);
      throw error;
    }
    return { pages: results };
  }, { maxBodyBytes: maxImagesPerRequest * maxImageBytes + 512 * 1024 });

  /** Idempotent: a started material answers with its status, so a retried upload can always call it. */
  on(app, API.startMaterial, async (c, { params }) => {
    const userId = await plusUser(c);
    const material = await ownMaterial(userId, params.id);
    if (!material.jobs.length) {
      const pages = await deps.db.materialPage.findMany({ where: { materialId: material.id }, select: { text: true } });
      if (pages.reduce((sum, page) => sum + page.text.length, 0) < STUDY_UPLOAD_LIMITS.minCharsPerDocument) refuse("material.no_text", "There isn't enough readable text in this document.");
    }
    const job = await enqueueMaterialJob(deps.db, material.id, userId);
    if (job.status === "queued" || job.status === "running") runSoon(job.id);
    return { id: material.id, status: material.status };
  });

  on(app, API.getMaterial, async (c, { params }) => {
    const userId = await signedIn(c, "Sign in to see your materials.");
    const material = await ownMaterial(userId, params.id);
    const job = material.jobs[0];
    const at = deps.now();
    // The app's poll doubles as a sweeper: a stalled job gets picked up again (Hobby cron is daily).
    if (job && (job.status === "queued" || job.status === "running") && job.lockedUntil < at && job.runAfter <= at && deps.aiConfigured) runSoon(job.id);
    const challenges = material.status === "ready"
      ? (await deps.db.studyChallenge.findMany({ where: { materialId: material.id, accepted: true }, orderBy: { createdAt: "asc" }, select: { challenge: true } })).map((row) => row.challenge)
      : undefined;
    c.header("Cache-Control", "private, no-store");
    return {
      id: material.id, title: material.title, status: material.status, lang: material.lang, error: material.error,
      progress: progressOf(job), ...(challenges ? { challenges } : {}),
    };
  });

  on(app, API.deleteMaterial, async (c, { params }) => {
    const userId = await signedIn(c, "Sign in to manage your materials.");
    if (!(await deleteMaterial(deps.db, userId, params.id))) refuse("material.not_found", "Material not found.");
    return null;
  });

  // ─── RevenueCat webhook: a trigger to re-read the customer (never trusted as the source) ────
  app.post("/v1/webhooks/revenuecat", bodyLimit({ maxSize: 64 * 1024, onError: (c) => errorResponse(new ApiFailure("material.too_large", "This request is too large."), c) }), async (c) => {
    requireSecret(c.req.header("authorization") ?? "", deps.secrets.revenueCatWebhook);
    const parsed = revenueCatWebhookSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) refuse("invalid", "Missing event.");
    const { event } = parsed.data;
    const inserted = await deps.db.revenueCatEvent.createMany({ data: [{ id: event.id, type: event.type, appUserId: event.app_user_id }], skipDuplicates: true });
    if (!inserted.count) return c.json({ ok: true, duplicate: true });
    if (deps.production && event.environment === "SANDBOX") return c.json({ ok: true, ignored: "sandbox" });
    if (event.app_user_id.startsWith("$RCAnonymousID:")) return c.json({ ok: true, ignored: "anonymous" });
    await deps.entitlements.refresh(event.app_user_id);
    return c.json({ ok: true });
  });

  // ─── Scheduled + internal ───────────────────────────────────────────────────────────────────
  app.get("/cron/jobs", async (c) => {
    requireSecret(bearer(c), deps.secrets.cron);
    const at = deps.now();
    await allowance.prune();
    // Uploads never started within a day are abandoned: remove their text.
    await deps.db.material.deleteMany({ where: { status: "queued", jobs: { none: {} }, createdAt: { lt: new Date(at.getTime() - 86_400_000) } } });
    const ran = deps.aiConfigured ? await runJobs({ ...deps, budgetMs: Math.min(deps.budgetMs ?? 200_000, 200_000) }) : [];
    const costs = deps.aiConfigured ? await reconcileCosts(deps.db, deps.lookupGeneration, { now: at }) : null;
    return c.json({ ran, costs });
  });

  /** Only enqueues: fetch → build → enrich runs as a resumable `bank.refresh` job, not in this request. */
  app.get("/cron/bank", async (c) => {
    requireSecret(bearer(c), deps.secrets.cron);
    const at = deps.now();
    const refreshFacts = Boolean(deps.fetchers && Object.keys(deps.fetchers).length) && await factsAreStale(deps.db, at);
    const job = await enqueueBankRefresh(deps.db, { day: dayKey(at), refreshFacts });
    if (job.status === "queued" || job.status === "running") runSoon(job.id);
    return c.json({ jobId: job.id, status: job.status }, 202);
  });

  app.get("/internal/bank/inventory", async (c) => {
    requireSecret(bearer(c), deps.secrets.jobs);
    const rows = await getBankInventory(deps.db);
    return c.json({ topics: summarizeInventory(rows), rows });
  });

  app.post("/internal/jobs/:id/run", async (c) => {
    requireSecret(bearer(c), deps.secrets.jobs);
    deps.waitUntil(runJobs(deps, { jobId: c.req.param("id") }).catch(() => undefined));
    return c.json({ accepted: true }, 202);
  });

  return app;
}
