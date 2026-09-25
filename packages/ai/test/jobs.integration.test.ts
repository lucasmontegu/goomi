/** Kind-agnostic job loop + the durable `bank.refresh` job, on a real Neon branch (TEST_DATABASE_URL). */
import { afterAll, describe, expect, setDefaultTimeout, test } from "bun:test";
import { buildBank, type Fact } from "@goomi/content";
import { createPrismaClient, purgeUserContent, type Prisma } from "@goomi/db";
import { bankRefreshStep, enqueueBankRefresh, type BankRefreshDeps, type BankRefreshProgress } from "../src/bank-refresh";
import { publishDrafts } from "../src/bank";
import { claimJob, enqueueMaterialJob, runJob, type RunOutcome } from "../src/jobs";
import { collectUsage } from "../src/usage";
import { countryFacts } from "../../content/test/helpers";
import { scriptedModel } from "./mocks";

const url = process.env.TEST_DATABASE_URL;
const run = url ? describe : describe.skip;

run("durable jobs (integration)", () => {
  setDefaultTimeout(120_000);
  const db = createPrismaClient({ DATABASE_URL: url! });
  const stamp = Date.now();
  const userId = `test-jobs-${stamp}`;
  const created: string[] = [];
  const track = <T extends { id: string }>(job: T) => { created.push(job.id); return job; };
  afterAll(async () => {
    await db.job.deleteMany({ where: { id: { in: created } } });
    await purgeUserContent(db, userId);
  });

  /** A fake clock where every unit of work spends the whole budget: exactly one unit per invocation. */
  const oneUnitPerRun = () => {
    let clock = 0;
    return { now: () => clock, tick: () => { clock += 10; }, budgetMs: 10 };
  };

  /** Claims and runs the job until it finishes, like successive kicks would. */
  async function drive<P extends { stage: string }>(jobId: string, initial: P, step: (progress: P) => Promise<{ progress: P; finished: boolean }>) {
    const outcomes: RunOutcome[] = [];
    for (let invocation = 0; invocation < 50; invocation++) {
      await db.job.update({ where: { id: jobId }, data: { runAfter: new Date(0) } }); // skip any backoff wait
      const claimed = await claimJob(db, jobId);
      if (!claimed) break;
      const clock = oneUnitPerRun();
      outcomes.push(await runJob(db, claimed, initial, async (progress) => { const result = await step(progress); clock.tick(); return result; }, clock));
      if (outcomes.at(-1) === "succeeded" || outcomes.at(-1) === "failed") break;
    }
    return outcomes;
  }

  test("a global job (no material, no user) checkpoints, pauses and resumes through the generic loop", async () => {
    const job = track(await db.job.create({ data: { kind: "test.counter", stage: "count", idempotencyKey: `test.counter:${stamp}` } }));
    const outcomes = await drive(job.id, { stage: "count", n: 0 }, async (progress) => ({ progress: { ...progress, n: progress.n + 1 }, finished: progress.n + 1 >= 3 }));
    expect(outcomes).toEqual(["paused", "paused", "succeeded"]);
    expect(await db.job.findUniqueOrThrow({ where: { id: job.id } })).toMatchObject({ status: "succeeded", materialId: null, progress: { stage: "count", n: 3 } });
  });

  test("a failing global job retries with backoff, then fails without touching any material", async () => {
    const job = track(await db.job.create({ data: { kind: "test.broken", stage: "start", idempotencyKey: `test.broken:${stamp}` } }));
    const outcomes = await drive(job.id, { stage: "start" }, async () => { throw new Error("source down"); });
    expect(outcomes).toEqual(["retrying", "retrying", "failed"]);
    expect(await db.job.findUniqueOrThrow({ where: { id: job.id } })).toMatchObject({ status: "failed", attempts: 3, lastError: "source down" });
  });

  test("the sweeper claims a user's document before older global bank work", async () => {
    const bank = track(await db.job.create({ data: { kind: "bank.refresh", stage: "fetch", idempotencyKey: `bank.refresh:priority-${stamp}`, createdAt: new Date("2000-01-01") } }));
    const material = await db.material.create({ data: { userId, title: "Prioridad", kind: "text", pageCount: 1, charCount: 10, textHash: `priority-${stamp}`, consentVersion: "2026-09", consentedAt: new Date() } });
    track(await enqueueMaterialJob(db, material.id, userId));
    const claimed = await claimJob(db);
    expect(claimed?.kind).toBe("material.process");
    expect(claimed?.id).not.toBe(bank.id);
    await db.job.update({ where: { id: claimed!.id }, data: { status: "queued", lockedUntil: new Date(0) } }); // hand it back
    await db.job.update({ where: { id: bank.id }, data: { status: "cancelled" } });
  });

  test("bank.refresh is enqueued once per day and never alongside another active refresh", async () => {
    const first = await enqueueBankRefresh(db, { day: `test-${stamp}`, refreshFacts: false });
    const again = await enqueueBankRefresh(db, { day: `test-${stamp}`, refreshFacts: true });
    const otherDay = await enqueueBankRefresh(db, { day: `test-${stamp}-next`, refreshFacts: false });
    expect(again.id).toBe(first.id);
    expect(otherDay.id).toBe(first.id); // still active → reused
    // Only clean up our own job; an unrelated active refresh in the test database is left alone.
    if (first.idempotencyKey === `bank.refresh:test-${stamp}`) await db.job.update({ where: { id: track(first).id }, data: { status: "cancelled" } });
  });

  describe("bank.refresh", () => {
    const facts: Fact[] = countryFacts().filter((fact) => fact.regionName.en === "South America");
    const drafts = buildBank(facts).accepted.filter((draft) => draft.templateId === "capital");
    const ids = drafts.map((draft) => draft.id);
    const judge = scriptedModel(() => ({ supported: true, issue: null }), "judge");
    const generate = scriptedModel(() => ({ explanation: "Es la ciudad donde funciona el gobierno del país.", memoryTip: "Imagina el palacio de gobierno." }), "good");
    const deps = (usage: ReturnType<typeof collectUsage>, budgetLeftUsd = 1): BankRefreshDeps => ({
      db,
      fetchers: { "b.second": async () => facts.slice(3), "a.first": async () => facts.slice(0, 3) },
      enrich: { models: { generate, judge }, ai: { privacy: "public", record: usage.sink }, batchSize: 2, perRun: 3, budgetLeftUsd: async () => budgetLeftUsd },
    });
    const start = (refreshFacts: boolean): BankRefreshProgress => ({ stage: "fetch", refreshFacts, fetchedSources: [], factsWritten: 0, enrich: { enriched: 0, kept: 0 } });
    const maxSeq = async () => (await db.bankItemLocale.aggregate({ _max: { seq: true } }))._max.seq;

    test("fetch → build → enrich runs one unit per invocation and resumes to the same result", async () => {
      await publishDrafts(db, drafts);
      // Only our rows are pending, so the batches (and their AI calls) are exact.
      await db.bankItemLocale.updateMany({ where: { enrichedBy: null, itemId: { notIn: ids } }, data: { enrichedBy: "template" } });
      await db.bankItemLocale.updateMany({ where: { itemId: { in: ids } }, data: { enrichedBy: null } });
      const usage = collectUsage();
      const initial = start(true);
      const job = track(await db.job.create({ data: { kind: "bank.refresh", stage: "fetch", idempotencyKey: `bank.refresh:resume-${stamp}`, progress: initial as Prisma.InputJsonValue } }));
      const outcomes = await drive(job.id, initial, bankRefreshStep(deps(usage)));
      // fetch a, fetch b, → build, build, enrich 2, enrich 1, finish.
      expect(outcomes).toEqual([...Array<RunOutcome>(6).fill("paused"), "succeeded"]);
      const progress = (await db.job.findUniqueOrThrow({ where: { id: job.id } })).progress as BankRefreshProgress;
      expect(progress.fetchedSources).toEqual(["a.first", "b.second"]); // sorted: a stable resume order
      expect(progress.rejected).toBe(0);
      expect(progress.enrich.enriched + progress.enrich.kept).toBe(3);
      // Exactly one generation per processed row: pausing never repeats paid work.
      expect(usage.records.filter((record) => record.purpose === "bank.enrich")).toHaveLength(3);
      expect(progress.inventory?.geography?.published).toBeGreaterThan(0);
    });

    test("rebuilding unchanged facts writes nothing and does not move the sync cursor", async () => {
      const before = await maxSeq();
      const result = await bankRefreshStep(deps(collectUsage()))({ ...start(true), stage: "build" });
      expect(result.progress.published).toMatchObject({ created: 0, updated: 0, retired: 0 });
      expect(await maxSeq()).toBe(before);
    });

    test("an exhausted monthly bank budget stops enrichment without an AI call", async () => {
      await db.bankItemLocale.updateMany({ where: { itemId: { in: ids } }, data: { enrichedBy: null } });
      const usage = collectUsage();
      const result = await bankRefreshStep(deps(usage, 0))({ ...start(false), stage: "enrich" });
      expect(result.finished).toBe(true);
      expect(result.progress.budgetExhausted).toBe(true);
      expect(usage.records).toHaveLength(0);
    });
  });
});
