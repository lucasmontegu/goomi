/**
 * HTTP-level tests of the content routes against a real Neon branch with scripted models:
 *   TEST_DATABASE_URL=<dev branch> bun test apps/server
 * Auth, RevenueCat and the AI Gateway are replaced by in-process fakes; everything else is real.
 */
import { afterAll, describe, expect, setDefaultTimeout, test } from "bun:test";
import { STUDY_AI_CONSENT_VERSION, bankResponseSchema, challengeSchema, materialDetailSchema } from "@goomi/content";
import { createPrismaClient, purgeUserContent } from "@goomi/db";
import { allFacts } from "../../../packages/content/test/helpers";
import { NOTES, scriptedStudyModels } from "../../../packages/ai/test/mocks";
import type { Entitlements } from "../src/content/entitlements";
import { createContentApp, type ContentDeps } from "../src/content/routes";
import { runJobs } from "../src/content/runner";
import type { BankRefreshProgress } from "@goomi/ai";

const url = process.env.TEST_DATABASE_URL;
const run = url ? describe : describe.skip;

run("content routes (integration)", () => {
  setDefaultTimeout(120_000);
  const db = createPrismaClient({ DATABASE_URL: url! });
  const stamp = Date.now();
  const plusUser = `test-plus-${stamp}`;
  const freeUser = `test-free-${stamp}`;
  const install = `install-${stamp}-abcdefgh`;
  const pending: Promise<unknown>[] = [];
  const refreshed: string[] = [];
  const entitlements: Entitlements = { hasPlus: async (userId) => userId === plusUser, refresh: async (userId) => { refreshed.push(userId); return { active: true, expiresAt: null }; } };
  const models = scriptedStudyModels();
  const deps: ContentDeps = {
    db, models, bankModels: { generate: models.generate, judge: models.judge }, privacy: "zdr", now: () => new Date(),
    getUserId: async (headers) => headers.get("x-test-user"), entitlements, studyEnabled: true, aiConfigured: true,
    secrets: { cron: "cron-secret-0123456789abcdef", jobs: "jobs-secret-0123456789abcdef0123456789", revenueCatWebhook: "rc-webhook-0123456789abcdef" },
    production: true, waitUntil: (promise) => { pending.push(promise); }, fetchers: { fixtures: async () => allFacts() }, budgetMs: 60_000,
    bankLimits: { enrichPerRun: 40, spendUsdPerMonth: Number.MAX_SAFE_INTEGER },
    lookupGeneration: async (id) => { if (id === "gen_missing") throw new Error("404"); return { totalCost: 0.0123 }; },
  };
  const app = createContentApp(deps);
  const settle = async () => { while (pending.length) await pending.shift(); };
  const as = (user: string | null, init: RequestInit = {}) => ({ ...init, headers: { ...(user ? { "x-test-user": user } : {}), "content-type": "application/json", ...(init.headers as Record<string, string> | undefined) } });
  afterAll(async () => {
    for (const user of [plusUser, freeUser, `install:${install}`]) await purgeUserContent(db, user);
  });

  test("cron: secrets required; /cron/bank enqueues one resumable bank.refresh job that publishes open-data challenges", async () => {
    const cron = { headers: { authorization: "Bearer cron-secret-0123456789abcdef" } };
    expect((await app.request("/cron/bank")).status).toBe(401);
    const res = await app.request("/cron/bank", cron);
    expect(res.status).toBe(202);
    const { jobId } = await res.json() as { jobId: string };
    // Same day, same job: the cron is safe to fire twice.
    expect(((await (await app.request("/cron/bank", cron)).json()) as { jobId: string }).jobId).toBe(jobId);
    await settle();
    // No self-kick in tests: resume by hand until the job is done, as the sweeper would.
    for (let tries = 0; tries < 10 && (await db.job.findUniqueOrThrow({ where: { id: jobId } })).status === "queued"; tries++) await runJobs(deps, { jobId });
    const job = await db.job.findUniqueOrThrow({ where: { id: jobId } });
    expect(job).toMatchObject({ kind: "bank.refresh", status: "succeeded", materialId: null, userId: null });
    const progress = job.progress as BankRefreshProgress;
    expect(progress.published!.created + progress.published!.updated + progress.published!.unchanged).toBeGreaterThan(500);
    expect(progress.rejected).toBe(0);
    // The scripted "generate" model answers with study questions, not enrichment JSON: every item
    // must fall back to its template instead of failing the job.
    expect(progress.enrich.enriched).toBe(0);
    expect(progress.enrich.kept).toBeLessThanOrEqual(40);
    expect(Object.keys(progress.inventory ?? {})).toEqual(expect.arrayContaining(["geography", "art", "science", "history"]));
  });

  test("internal bank inventory: JOBS_SECRET required; counts by topic × lang × difficulty × type", async () => {
    expect((await app.request("/internal/bank/inventory")).status).toBe(401);
    const res = await app.request("/internal/bank/inventory", { headers: { authorization: "Bearer jobs-secret-0123456789abcdef0123456789" } });
    expect(res.status).toBe(200);
    const body = await res.json() as { topics: Record<string, { published: number }>; rows: { topicId: string; lang: string; published: number }[] };
    expect(body.topics.geography!.published).toBeGreaterThan(0);
    expect(body.rows.some((row) => row.topicId === "geography" && row.lang === "es" && row.published > 0)).toBe(true);
  });

  test("jobs of an unknown kind fail without breaking the runner", async () => {
    const job = await db.job.create({ data: { kind: "bogus.kind", stage: "start", idempotencyKey: `bogus:${stamp}` } });
    expect(await runJobs(deps, { jobId: job.id })).toEqual([{ jobId: job.id, outcome: "failed" }]);
    expect(await db.job.findUniqueOrThrow({ where: { id: job.id } })).toMatchObject({ status: "failed", lastError: "unknown kind: bogus.kind" });
    await db.job.delete({ where: { id: job.id } });
  });

  test("bank sync: identity required, free daily cap, sync cursor, rate limit", async () => {
    expect((await app.request("/v1/bank?lang=es")).status).toBe(400);
    const headers = { "x-goomi-install": install, "x-forwarded-for": `10.0.${stamp % 250}.1` };
    // Malformed query params are rejected by the contract, not coerced.
    for (const query of ["lang=fr", "lang=es&cursor=abc", "lang=es&limit=0", "lang=es&limit=500", "lang=es&topics=not-a-topic"]) {
      expect((await app.request(`/v1/bank?${query}`, { headers: { ...headers, "x-forwarded-for": "10.9.9.9" } })).status).toBe(400);
    }
    const first = await app.request("/v1/bank?lang=es&limit=20", { headers });
    expect(first.status).toBe(200);
    const page = await first.json() as { items: unknown[]; cursor: string; quota: { remainingToday: number } };
    expect(bankResponseSchema.safeParse(page).success).toBe(true);
    expect(page.items).toHaveLength(20);
    for (const item of page.items) expect(challengeSchema.safeParse(item).success).toBe(true);
    expect(page.quota.remainingToday).toBe(10);
    const second = await (await app.request(`/v1/bank?lang=es&limit=50&cursor=${page.cursor}`, { headers })).json() as { items: { id: string }[]; quota: { remainingToday: number } };
    expect(second.items).toHaveLength(10); // capped at the free daily allowance
    expect(second.quota.remainingToday).toBe(0);
    const third = await (await app.request(`/v1/bank?lang=es&cursor=${page.cursor}`, { headers })).json() as { items: unknown[] };
    expect(third.items).toHaveLength(0);
    let limited = 0;
    for (let i = 0; i < 10; i++) if ((await app.request("/v1/bank?lang=es", { headers })).status === 429) limited++;
    expect(limited).toBeGreaterThan(0);
  });

  test("materials: disabled switch, auth, Plus and consent are enforced", async () => {
    const payload = { title: "Biología", kind: "pdf", consentVersion: STUDY_AI_CONSENT_VERSION, pages: NOTES };
    const off = createContentApp({ ...deps, studyEnabled: false });
    expect((await off.request("/v1/materials", as(plusUser, { method: "POST", body: JSON.stringify(payload) }))).status).toBe(503);
    expect((await app.request("/v1/materials", as(null, { method: "POST", body: JSON.stringify(payload) }))).status).toBe(401);
    const free = await app.request("/v1/materials", as(freeUser, { method: "POST", body: JSON.stringify(payload) }));
    expect(free.status).toBe(403);
    expect(((await free.json()) as { error: { code: string } }).error.code).toBe("plus.required");
    const noConsent = await app.request("/v1/materials", as(plusUser, { method: "POST", body: JSON.stringify({ ...payload, consentVersion: "old" }) }));
    expect(((await noConsent.json()) as { error: { code: string } }).error.code).toBe("consent.required");
  });

  test("materials: upload → OCR a low-text page → start → poll → offline challenges → delete", async () => {
    const pages = [...NOTES, { n: 4, text: "" }];
    const created = await app.request("/v1/materials", as(plusUser, { method: "POST", body: JSON.stringify({ title: "Biología", kind: "pdf", consentVersion: STUDY_AI_CONSENT_VERSION, pages, ocrPages: [4] }) }));
    expect(created.status).toBe(201);
    const { id } = await created.json() as { id: string };
    const again = await app.request("/v1/materials", as(plusUser, { method: "POST", body: JSON.stringify({ title: "Biología", kind: "pdf", consentVersion: STUDY_AI_CONSENT_VERSION, pages, ocrPages: [4] }) }));
    // A repeated upload resumes: nothing started yet, page 4 still needs its image.
    expect(again.status).toBe(200);
    expect(await again.json()).toMatchObject({ id, duplicate: true, started: false, ocrPages: [4] });

    const form = new FormData();
    form.append("n", "4");
    form.append("image", new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])], "p4.jpg", { type: "image/jpeg" }));
    const ocr = await app.request(`/v1/materials/${id}/pages`, { method: "POST", body: form, headers: { "x-test-user": plusUser } });
    expect(ocr.status).toBe(200);
    expect(((await ocr.json()) as { pages: { n: number; chars: number }[] }).pages[0]).toMatchObject({ n: 4 });
    const twice = new FormData();
    for (let i = 0; i < 2; i++) { twice.append("n", "4"); twice.append("image", new File([new Uint8Array([0xff, 0xd8])], "p4.jpg", { type: "image/jpeg" })); }
    expect((await app.request(`/v1/materials/${id}/pages`, { method: "POST", body: twice, headers: { "x-test-user": plusUser } })).status).toBe(400);
    expect((await db.materialPage.findUniqueOrThrow({ where: { materialId_n: { materialId: id, n: 4 } } })).source).toBe("ai-ocr");
    const upload = () => app.request("/v1/materials", as(plusUser, { method: "POST", body: JSON.stringify({ title: "Biología", kind: "pdf", consentVersion: STUDY_AI_CONSENT_VERSION, pages, ocrPages: [4] }) }));
    expect(await (await upload()).json()).toMatchObject({ id, started: false, ocrPages: [] });

    expect((await app.request(`/v1/materials/${id}`, as(freeUser))).status).toBe(404); // not yours
    expect((await app.request(`/v1/materials/${id}/start`, as(plusUser, { method: "POST" }))).status).toBe(202);
    // Idempotent: a retried upload may call /start again; still one job.
    expect((await app.request(`/v1/materials/${id}/start`, as(plusUser, { method: "POST" }))).status).toBe(202);
    expect(await db.job.count({ where: { materialId: id } })).toBe(1);
    expect(await (await upload()).json()).toMatchObject({ id, duplicate: true, started: true, ocrPages: [] });
    await settle();
    for (let poll = 0; poll < 10; poll++) {
      const status = await (await app.request(`/v1/materials/${id}`, as(plusUser))).json() as { status: string };
      if (status.status === "ready" || status.status === "failed") break;
      await settle();
    }
    const ready = await (await app.request(`/v1/materials/${id}`, as(plusUser))).json() as { status: string; lang: string; challenges: { source: { excerpt: string; chunkIds: string[] } }[] };
    expect(ready).toMatchObject({ status: "ready", lang: "es" });
    expect(materialDetailSchema.safeParse(ready).success).toBe(true);
    expect(ready.challenges.length).toBeGreaterThan(3);
    for (const challenge of ready.challenges) expect(challenge.source.chunkIds.length).toBeGreaterThan(0);
    const usage = await db.aiUsage.findMany({ where: { userId: plusUser } });
    expect(usage.length).toBeGreaterThan(5);
    expect(usage.every((row) => row.zdr && row.materialId === id)).toBe(true);
    expect(new Set(usage.map((row) => row.purpose))).toEqual(new Set(["study.ocr", "study.embed", "study.extract", "study.generate", "study.judge"]));

    expect((await app.request(`/v1/materials/${id}`, as(plusUser, { method: "DELETE" }))).status).toBe(204);
    expect((await app.request(`/v1/materials/${id}`, as(plusUser))).status).toBe(404);
    expect(await db.chunk.count({ where: { materialId: id } })).toBe(0);
  });

  test("quotas: monthly document limit returns a readable 429", async () => {
    const month = new Date().toISOString().slice(0, 7);
    await db.usageCounter.upsert({ where: { subject_period_metric: { subject: plusUser, period: month, metric: "study.documents" } }, create: { subject: plusUser, period: month, metric: "study.documents", value: 40 }, update: { value: 40 } });
    const res = await app.request("/v1/materials", as(plusUser, { method: "POST", body: JSON.stringify({ title: "Otra", kind: "text", consentVersion: STUDY_AI_CONSENT_VERSION, pages: [{ n: 1, text: `${NOTES[0]!.text} nueva versión` }] }) }));
    expect(res.status).toBe(429);
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe("quota.documents");
  });

  test("quotas: concurrent uploads can't overrun the monthly document limit", async () => {
    const month = new Date().toISOString().slice(0, 7);
    await db.usageCounter.upsert({ where: { subject_period_metric: { subject: plusUser, period: month, metric: "study.documents" } }, create: { subject: plusUser, period: month, metric: "study.documents", value: 39 }, update: { value: 39 } });
    const upload = (i: number) => app.request("/v1/materials", as(plusUser, { method: "POST", body: JSON.stringify({ title: `Carrera ${i}`, kind: "text", consentVersion: STUDY_AI_CONSENT_VERSION, pages: [{ n: 1, text: `${NOTES[0]!.text} carrera ${i} ${stamp}` }] }) }));
    const statuses = (await Promise.all([0, 1, 2].map(upload))).map((res) => res.status).sort();
    expect(statuses).toEqual([201, 429, 429]);
    const counter = await db.usageCounter.findUniqueOrThrow({ where: { subject_period_metric: { subject: plusUser, period: month, metric: "study.documents" } } });
    expect(counter.value).toBe(40);
  });

  test("oversized bodies are refused before parsing", async () => {
    const huge = JSON.stringify({ title: "x", kind: "text", consentVersion: STUDY_AI_CONSENT_VERSION, pages: [{ n: 1, text: "a".repeat(2 * 1024 * 1024) }] });
    const res = await app.request("/v1/materials", as(plusUser, { method: "POST", body: huge }));
    expect(res.status).toBe(413);
  });

  test("cron/jobs reconciles estimated costs with the Gateway's recorded cost", async () => {
    const old = new Date(Date.now() - 10 * 60_000);
    const base = { userId: freeUser, purpose: "study.generate", model: "alibaba/qwen3.8-omni-flash", inputTokens: 10, outputTokens: 10, costUsd: 0.001, costSource: "estimate", zdr: true, latencyMs: 5, createdAt: old };
    const known = await db.aiUsage.create({ data: { ...base, generationId: "gen_known" } });
    const missing = await db.aiUsage.create({ data: { ...base, generationId: "gen_missing" } });
    const res = await app.request("/cron/jobs", { headers: { authorization: "Bearer cron-secret-0123456789abcdef" } });
    expect(res.status).toBe(200);
    expect(await db.aiUsage.findUniqueOrThrow({ where: { id: known.id } })).toMatchObject({ costSource: "gateway" });
    expect(Number((await db.aiUsage.findUniqueOrThrow({ where: { id: known.id } })).costUsd)).toBeCloseTo(0.0123, 6);
    expect((await db.aiUsage.findUniqueOrThrow({ where: { id: missing.id } })).costSource).toBe("estimate");
    await db.aiUsage.deleteMany({ where: { id: { in: [known.id, missing.id] } } });
  });

  test("RevenueCat webhook: auth, de-duplication, sandbox ignored in production, refresh on event", async () => {
    const event = (id: string, environment = "PRODUCTION") => JSON.stringify({ api_version: "1.0", event: { id, type: "INITIAL_PURCHASE", app_user_id: plusUser, environment, entitlement_ids: ["goomi_pro"] } });
    expect((await app.request("/v1/webhooks/revenuecat", { method: "POST", body: event(`e-${stamp}`), headers: { authorization: "wrong" } })).status).toBe(401);
    const auth = { authorization: "rc-webhook-0123456789abcdef", "content-type": "application/json" };
    expect(await (await app.request("/v1/webhooks/revenuecat", { method: "POST", body: event(`e-${stamp}`), headers: auth })).json()).toEqual({ ok: true });
    expect(await (await app.request("/v1/webhooks/revenuecat", { method: "POST", body: event(`e-${stamp}`), headers: auth })).json()).toEqual({ ok: true, duplicate: true });
    expect(await (await app.request("/v1/webhooks/revenuecat", { method: "POST", body: event(`s-${stamp}`, "SANDBOX"), headers: auth })).json()).toEqual({ ok: true, ignored: "sandbox" });
    expect(refreshed).toEqual([plusUser]);
    await db.revenueCatEvent.deleteMany({ where: { id: { in: [`e-${stamp}`, `s-${stamp}`] } } });
  });
});
