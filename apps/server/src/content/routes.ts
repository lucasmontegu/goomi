import { timingSafeEqual } from "node:crypto";
import { STAGES, enqueueMaterialJob, reconcileCosts, type GenerationLookup, enrichPending, estimateMaterialTokens, listBankChanges, ocrPageImage, publishDrafts, storeFacts, type StudyProgress } from "@goomi/ai";
import { STUDY_AI_CONSENT_VERSION, buildBank, factSchema, hashString, type Challenge, type Fact } from "@goomi/content";
import { deleteMaterial } from "@goomi/db";
import { Hono, type Context } from "hono";
import { z } from "zod";
import type { Entitlements } from "./entitlements";
import { LIMITS, addToCounter, dayKey, hitRateLimit, monthKey, monthSpendUsd, pruneRateLimits, readCounter } from "./limits";
import { aiContext, runJobs, usageSink, type RunnerDeps } from "./runner";

export type ContentDeps = RunnerDeps & {
  getUserId: (headers: Headers) => Promise<string | null>;
  entitlements: Entitlements;
  studyEnabled: boolean;
  bankModels: { generate: RunnerDeps["models"]["generate"]; judge: RunnerDeps["models"]["judge"] };
  aiConfigured: boolean;
  secrets: { cron?: string; jobs?: string; revenueCatWebhook?: string };
  production: boolean;
  /** Runs work after the response (Vercel `waitUntil`); tests await it. */
  waitUntil: (promise: Promise<unknown>) => void;
  /** Weekly open-data fetch (network); injected so tests use fixtures. */
  fetchFacts?: () => Promise<Fact[]>;
  /** Gateway cost lookup for reconciliation; defaults to `gateway.getGenerationInfo`. */
  lookupGeneration?: GenerationLookup;
};

type ErrorCode =
  | "auth.required" | "identity.required" | "plus.required" | "study.disabled" | "consent.required" | "rate_limited"
  | "quota.documents" | "quota.pages" | "quota.ocr" | "quota.spend" | "quota.concurrent" | "material.not_found"
  | "material.no_text" | "material.too_large" | "material.started" | "invalid" | "unauthorized" | "unavailable";
const fail = (c: Context, status: 400 | 401 | 403 | 404 | 409 | 413 | 422 | 429 | 503, code: ErrorCode, message: string) => c.json({ error: { code, message } }, status);

const INSTALL_ID = /^[A-Za-z0-9_-]{16,64}$/;
const clientIp = (c: Context) => c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || c.req.header("x-real-ip") || "unknown";
const bearer = (c: Context) => c.req.header("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
const secretMatches = (given: string, expected: string | undefined) => {
  if (!expected) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

const createMaterialSchema = z.object({
  title: z.string().trim().min(1).max(120),
  kind: z.enum(["pdf", "image", "slides", "text"]),
  consentVersion: z.string(),
  pages: z.array(z.object({ n: z.number().int().min(1).max(LIMITS.maxPagesPerDocument), text: z.string().max(LIMITS.maxCharsPerDocument) })).min(1).max(LIMITS.maxPagesPerDocument),
  /** Pages the device could not read; their images may be sent to /pages before /start. */
  ocrPages: z.array(z.number().int().min(1).max(LIMITS.maxPagesPerDocument)).max(LIMITS.maxPagesPerDocument).default([]),
});

/** Rough upload-time cost guard (~$0.04 per 27K tokens, ADR-001 §9). */
const estimateDocumentUsd = (tokens: number, ocrPages: number) => (tokens / 27_000) * 0.04 + ocrPages * 0.0005;

export function createContentApp(deps: ContentDeps) {
  const app = new Hono();
  const now = () => deps.now();

  async function requirePlus(c: Context): Promise<{ userId: string } | Response> {
    if (!deps.studyEnabled || !deps.aiConfigured) return fail(c, 503, "study.disabled", "AI study is not available right now.");
    const userId = await deps.getUserId(c.req.raw.headers);
    if (!userId) return fail(c, 401, "auth.required", "Sign in to use AI study.");
    if (!(await deps.entitlements.hasPlus(userId))) return fail(c, 403, "plus.required", "AI study is part of Goomi Plus.");
    return { userId };
  }
  const runSoon = (jobId: string) => deps.waitUntil(runJobs(deps, { jobId }).catch(() => undefined));

  // ─── Bank sync (free + Plus; anonymous devices use an install id) ───────────────────────────
  app.get("/v1/bank", async (c) => {
    const lang = z.enum(["en", "es", "pt-BR"]).safeParse(c.req.query("lang"));
    if (!lang.success) return fail(c, 400, "invalid", "lang must be en, es or pt-BR.");
    const userId = await deps.getUserId(c.req.raw.headers);
    const installId = c.req.header("x-goomi-install");
    if (!userId && !(installId && INSTALL_ID.test(installId))) return fail(c, 400, "identity.required", "Send x-goomi-install or sign in.");
    const subject = userId ?? `install:${installId}`;
    const plus = userId ? await deps.entitlements.hasPlus(userId) : false;
    const tier = plus ? LIMITS.plus : LIMITS.free;
    const at = now();
    if (await hitRateLimit(deps.db, `bank:${subject}`, 600, at) > tier.bankRequestsPer10Min || await hitRateLimit(deps.db, `bank-ip:${clientIp(c)}`, 600, at) > LIMITS.ipRequestsPer10Min) {
      return fail(c, 429, "rate_limited", "Too many syncs. Try again in a few minutes.");
    }
    const used = await readCounter(deps.db, subject, dayKey(at), "bank.items");
    const remaining = Math.max(0, tier.bankItemsPerDay - used);
    const cursor = c.req.query("cursor") ?? null;
    if (!remaining) return c.json({ items: [], retired: [], cursor: cursor ?? "0", hasMore: false, quota: { remainingToday: 0 } });
    const requested = Math.min(100, Math.max(1, Number(c.req.query("limit")) || 50));
    const topics = c.req.query("topics")?.split(",").filter(Boolean).slice(0, 20);
    const page = await listBankChanges(deps.db, { lang: lang.data, cursor, limit: Math.min(requested, remaining), ...(topics?.length ? { topics } : {}) });
    const total = page.items.length ? await addToCounter(deps.db, subject, dayKey(at), "bank.items", page.items.length) : used;
    c.header("Cache-Control", "private, no-store");
    return c.json({ ...page, quota: { remainingToday: Math.max(0, tier.bankItemsPerDay - total) } });
  });

  // ─── Study materials (Plus only) ────────────────────────────────────────────────────────────
  app.get("/v1/materials", async (c) => {
    const userId = await deps.getUserId(c.req.raw.headers);
    if (!userId) return fail(c, 401, "auth.required", "Sign in to see your materials.");
    const rows = await deps.db.material.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, title: true, kind: true, status: true, lang: true, error: true, createdAt: true, _count: { select: { challenges: { where: { accepted: true } } } } } });
    return c.json({ materials: rows.map(({ _count, ...row }) => ({ ...row, challengeCount: _count.challenges })) });
  });

  app.post("/v1/materials", async (c) => {
    const auth = await requirePlus(c);
    if (auth instanceof Response) return auth;
    const parsed = createMaterialSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return fail(c, 400, "invalid", parsed.error.issues[0]?.message ?? "Invalid material.");
    const body = parsed.data;
    if (body.consentVersion !== STUDY_AI_CONSENT_VERSION) return fail(c, 422, "consent.required", "Please review and accept how AI study handles your document.");
    const pages = [...new Map(body.pages.map((page) => [page.n, { n: page.n, text: page.text.trim() }])).values()].sort((a, b) => a.n - b.n);
    const chars = pages.reduce((sum, page) => sum + page.text.length, 0);
    if (chars > LIMITS.maxCharsPerDocument) return fail(c, 413, "material.too_large", "This document is longer than 100,000 characters.");
    const ocrPages = [...new Set(body.ocrPages)];
    if (chars < 200 && !ocrPages.length) return fail(c, 422, "material.no_text", "There isn't enough readable text in this document.");

    const at = now();
    const month = monthKey(at);
    const [documents, pagesUsed, spend, active] = await Promise.all([
      readCounter(deps.db, auth.userId, month, "study.documents"), readCounter(deps.db, auth.userId, month, "study.pages"),
      monthSpendUsd(deps.db, auth.userId, at), deps.db.material.count({ where: { userId: auth.userId, status: { in: ["queued", "processing"] }, createdAt: { gt: new Date(at.getTime() - 86_400_000) } } }),
    ]);
    const textHash = hashString(pages.map((page) => page.text).join("\n")).toString(36) + `-${chars}`;
    const existing = await deps.db.material.findUnique({ where: { userId_textHash: { userId: auth.userId, textHash } } });
    if (existing) return c.json({ id: existing.id, status: existing.status, duplicate: true }, 200);
    if (documents >= LIMITS.plus.documentsPerMonth) return fail(c, 429, "quota.documents", "You've reached this month's document limit.");
    if (pagesUsed + pages.length > LIMITS.plus.pagesPerMonth) return fail(c, 429, "quota.pages", "You've reached this month's page limit.");
    if (active >= LIMITS.plus.concurrentDocuments) return fail(c, 429, "quota.concurrent", "Two documents are already being prepared. Try again when they're ready.");
    if (spend + estimateDocumentUsd(estimateMaterialTokens(pages), ocrPages.length) > LIMITS.plus.spendUsdPerMonth) return fail(c, 429, "quota.spend", "You've reached this month's AI study allowance.");

    const material = await deps.db.material.create({
      data: {
        userId: auth.userId, title: body.title, kind: body.kind, pageCount: pages.length, charCount: chars, textHash,
        consentVersion: body.consentVersion, consentedAt: at, progress: { stage: "uploaded", ocrPages },
        pages: { create: pages.map((page) => ({ ...page, source: "device" })) },
      },
    });
    await addToCounter(deps.db, auth.userId, month, "study.documents", 1);
    await addToCounter(deps.db, auth.userId, month, "study.pages", pages.length);
    return c.json({ id: material.id, status: material.status, ocrPages }, 201);
  });

  /** OCR fallback for low-text pages: images are transcribed in memory and never stored. */
  app.post("/v1/materials/:id/pages", async (c) => {
    const auth = await requirePlus(c);
    if (auth instanceof Response) return auth;
    const material = await deps.db.material.findFirst({ where: { id: c.req.param("id"), userId: auth.userId }, include: { jobs: { select: { id: true } } } });
    if (!material) return fail(c, 404, "material.not_found", "Material not found.");
    if (material.jobs.length) return fail(c, 409, "material.started", "This material is already being prepared.");
    const allowed = new Set(((material.progress as { ocrPages?: number[] } | null)?.ocrPages) ?? []);
    const form = await c.req.parseBody({ all: true });
    const numbers = ([] as unknown[]).concat(form.n ?? []).map(Number);
    const images = ([] as unknown[]).concat(form.image ?? []).filter((file): file is File => file instanceof File);
    if (!images.length || images.length !== numbers.length || images.length > LIMITS.maxImagesPerRequest) return fail(c, 400, "invalid", `Send 1-${LIMITS.maxImagesPerRequest} images, each with its page number n.`);
    for (const [index, image] of images.entries()) {
      if (!allowed.has(numbers[index]!)) return fail(c, 400, "invalid", `Page ${numbers[index]} was not marked for reading.`);
      if (!["image/jpeg", "image/png"].includes(image.type) || image.size > LIMITS.maxImageBytes) return fail(c, 413, "material.too_large", "Each page image must be a JPEG or PNG under 1.5 MB.");
    }
    const month = monthKey(now());
    if (await readCounter(deps.db, auth.userId, month, "study.ocrPages") + images.length > LIMITS.plus.ocrPagesPerMonth) return fail(c, 429, "quota.ocr", "You've reached this month's limit for reading handwritten or scanned pages.");
    const context = aiContext(deps, { userId: auth.userId, materialId: material.id });
    const results: { n: number; chars: number; legibility: string }[] = [];
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
    await addToCounter(deps.db, auth.userId, month, "study.ocrPages", images.length);
    return c.json({ pages: results });
  });

  app.post("/v1/materials/:id/start", async (c) => {
    const auth = await requirePlus(c);
    if (auth instanceof Response) return auth;
    const material = await deps.db.material.findFirst({ where: { id: c.req.param("id"), userId: auth.userId } });
    if (!material) return fail(c, 404, "material.not_found", "Material not found.");
    const pages = await deps.db.materialPage.findMany({ where: { materialId: material.id }, select: { text: true } });
    if (pages.reduce((sum, page) => sum + page.text.length, 0) < 200) return fail(c, 422, "material.no_text", "There isn't enough readable text in this document.");
    const job = await enqueueMaterialJob(deps.db, material.id, auth.userId);
    runSoon(job.id);
    return c.json({ id: material.id, status: "queued" }, 202);
  });

  app.get("/v1/materials/:id", async (c) => {
    const userId = await deps.getUserId(c.req.raw.headers);
    if (!userId) return fail(c, 401, "auth.required", "Sign in to see your materials.");
    const material = await deps.db.material.findFirst({ where: { id: c.req.param("id"), userId }, include: { jobs: { select: { id: true, status: true, lockedUntil: true, runAfter: true, progress: true } } } });
    if (!material) return fail(c, 404, "material.not_found", "Material not found.");
    const job = material.jobs[0];
    // The app's poll doubles as a sweeper: a stalled job gets picked up again (Hobby cron is daily).
    if (job && (job.status === "queued" || job.status === "running") && job.lockedUntil < now() && job.runAfter <= now() && deps.aiConfigured) runSoon(job.id);
    const progress = job?.progress as StudyProgress | undefined;
    const challenges = material.status === "ready"
      ? (await deps.db.studyChallenge.findMany({ where: { materialId: material.id, accepted: true }, orderBy: { createdAt: "asc" }, select: { challenge: true } })).map((row) => row.challenge as unknown as Challenge)
      : undefined;
    return c.json({
      id: material.id, title: material.title, status: material.status, lang: material.lang, error: material.error,
      progress: progress ? { stage: progress.stage, step: STAGES.indexOf(progress.stage) + 1, total: STAGES.length } : { stage: job ? "queued" : "uploaded", step: 0, total: STAGES.length },
      ...(challenges ? { challenges } : {}),
    });
  });

  app.delete("/v1/materials/:id", async (c) => {
    const userId = await deps.getUserId(c.req.raw.headers);
    if (!userId) return fail(c, 401, "auth.required", "Sign in to manage your materials.");
    return (await deleteMaterial(deps.db, userId, c.req.param("id"))) ? c.body(null, 204) : fail(c, 404, "material.not_found", "Material not found.");
  });

  // ─── RevenueCat webhook: a trigger to re-read the customer (never trusted as the source) ────
  app.post("/v1/webhooks/revenuecat", async (c) => {
    if (!secretMatches(c.req.header("authorization") ?? "", deps.secrets.revenueCatWebhook)) return fail(c, 401, "unauthorized", "Unauthorized.");
    const body = (await c.req.json().catch(() => null)) as { event?: { id?: string; type?: string; app_user_id?: string; environment?: string } } | null;
    const event = body?.event;
    if (!event?.id || !event.type || !event.app_user_id) return fail(c, 400, "invalid", "Missing event.");
    const inserted = await deps.db.revenueCatEvent.createMany({ data: [{ id: event.id, type: event.type, appUserId: event.app_user_id }], skipDuplicates: true });
    if (!inserted.count) return c.json({ ok: true, duplicate: true });
    if (deps.production && event.environment === "SANDBOX") return c.json({ ok: true, ignored: "sandbox" });
    if (event.app_user_id.startsWith("$RCAnonymousID:")) return c.json({ ok: true, ignored: "anonymous" });
    await deps.entitlements.refresh(event.app_user_id);
    return c.json({ ok: true });
  });

  // ─── Scheduled + internal ───────────────────────────────────────────────────────────────────
  app.get("/cron/jobs", async (c) => {
    if (!secretMatches(bearer(c), deps.secrets.cron)) return fail(c, 401, "unauthorized", "Unauthorized.");
    const at = now();
    await pruneRateLimits(deps.db, at);
    // Uploads never started within a day are abandoned: remove their text.
    await deps.db.material.deleteMany({ where: { status: "queued", jobs: { none: {} }, createdAt: { lt: new Date(at.getTime() - 86_400_000) } } });
    const ran = deps.aiConfigured ? await runJobs({ ...deps, budgetMs: Math.min(deps.budgetMs ?? 200_000, 200_000) }) : [];
    const costs = deps.aiConfigured ? await reconcileCosts(deps.db, deps.lookupGeneration, { now: at }) : null;
    return c.json({ ran, costs });
  });

  app.get("/cron/bank", async (c) => {
    if (!secretMatches(bearer(c), deps.secrets.cron)) return fail(c, 401, "unauthorized", "Unauthorized.");
    const result: Record<string, unknown> = {};
    const newest = await deps.db.contentFact.findFirst({ orderBy: { retrievedAt: "desc" }, select: { retrievedAt: true } });
    const stale = !newest || now().getTime() - newest.retrievedAt.getTime() > 6 * 86_400_000;
    if (stale && deps.fetchFacts) result.factsWritten = await storeFacts(deps.db, await deps.fetchFacts());
    const facts = (await deps.db.contentFact.findMany({ select: { payload: true } })).flatMap((row) => {
      const parsed = factSchema.safeParse(row.payload);
      return parsed.success ? [parsed.data] : [];
    });
    const built = buildBank(facts);
    result.published = await publishDrafts(deps.db, built.accepted, stale ? { retireMissingTemplates: [...new Set(built.accepted.map((draft) => draft.templateId))] } : {});
    result.rejected = built.rejected.length;
    if (deps.aiConfigured) result.enriched = await enrichPending(deps.db, deps.bankModels, { privacy: "public", record: usageSink(deps.db, {}) }, 40);
    return c.json(result);
  });

  app.post("/internal/jobs/:id/run", async (c) => {
    if (!secretMatches(bearer(c), deps.secrets.jobs)) return fail(c, 401, "unauthorized", "Unauthorized.");
    deps.waitUntil(runJobs(deps, { jobId: c.req.param("id") }).catch(() => undefined));
    return c.json({ accepted: true }, 202);
  });

  return app;
}

