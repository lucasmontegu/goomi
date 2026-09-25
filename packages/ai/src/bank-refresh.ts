import { buildBank, factSchema, type Fact } from "@goomi/content";
import type { Database, Prisma } from "@goomi/db";
import { enrichPending, getBankInventory, publishDrafts, storeFacts, summarizeInventory, type InventoryTotals } from "./bank";
import type { ModelRef } from "./gateway";
import type { JobStep } from "./jobs";
import type { AiContext } from "./usage";

/**
 * The nightly global-bank job (`bank.refresh`): fetch → build → enrich, each unit checkpointed so a
 * Vercel invocation can stop anywhere and the next one resumes. Never user-scoped, never in a request path.
 */
export const BANK_REFRESH_KIND = "bank.refresh";
export const FACTS_MAX_AGE_MS = 6 * 86_400_000;

/** One open-data source per key; fetching one source is one resumable unit. */
export type FactFetchers = Record<string, () => Promise<Fact[]>>;

export type BankRefreshProgress = {
  stage: "fetch" | "build" | "enrich";
  /** Decided once at enqueue, so a resume never flips it: a full refresh also retires what templates stop producing. */
  refreshFacts: boolean;
  fetchedSources: string[];
  factsWritten: number;
  published?: { created: number; updated: number; unchanged: number; retired: number };
  rejected?: number;
  enrich: { enriched: number; kept: number };
  budgetExhausted?: boolean;
  /** Per-topic snapshot taken when the job finishes, queryable later in SQL. */
  inventory?: InventoryTotals;
};

export type BankRefreshDeps = {
  db: Database;
  fetchers?: FactFetchers;
  /** Absent when AI isn't configured: the $0 template bank is still built and published. */
  enrich?: {
    models: { generate: ModelRef; judge: ModelRef };
    ai: AiContext;
    batchSize: number;
    perRun: number;
    /** Remaining global bank AI budget this month (USD); checked before every batch. */
    budgetLeftUsd: () => Promise<number>;
  };
};

/** True when the newest stored fact is older than `maxAgeMs` (or there are none). */
export async function factsAreStale(db: Database, now: Date, maxAgeMs = FACTS_MAX_AGE_MS) {
  const newest = await db.contentFact.findFirst({ orderBy: { retrievedAt: "desc" }, select: { retrievedAt: true } });
  return !newest || now.getTime() - newest.retrievedAt.getTime() > maxAgeMs;
}

/**
 * Enqueues at most one refresh per `day` (the idempotency key). While any refresh is still queued or
 * running, that one is returned instead: two concurrent refreshes could enrich the same row twice.
 */
export async function enqueueBankRefresh(db: Database, options: { day: string; refreshFacts: boolean }) {
  const active = await db.job.findFirst({ where: { kind: BANK_REFRESH_KIND, status: { in: ["queued", "running"] } }, orderBy: { createdAt: "asc" } });
  if (active) return active;
  const progress: BankRefreshProgress = { stage: "fetch", refreshFacts: options.refreshFacts, fetchedSources: [], factsWritten: 0, enrich: { enriched: 0, kept: 0 } };
  const idempotencyKey = `${BANK_REFRESH_KIND}:${options.day}`;
  return db.job.upsert({
    where: { idempotencyKey },
    create: { kind: BANK_REFRESH_KIND, stage: progress.stage, idempotencyKey, progress: progress as Prisma.InputJsonValue },
    update: {},
  });
}

const loadFacts = async (db: Database) =>
  (await db.contentFact.findMany({ select: { payload: true } })).flatMap((row) => {
    const parsed = factSchema.safeParse(row.payload);
    return parsed.success ? [parsed.data] : [];
  });

/** One unit of `bank.refresh`. */
export const bankRefreshStep = (deps: BankRefreshDeps): JobStep<BankRefreshProgress> => async (progress) => {
  if (progress.stage === "fetch") {
    const next = progress.refreshFacts ? Object.keys(deps.fetchers ?? {}).sort().find((source) => !progress.fetchedSources.includes(source)) : undefined;
    if (!next) return { progress: { ...progress, stage: "build" }, finished: false };
    const written = await storeFacts(deps.db, await deps.fetchers![next]!());
    return { progress: { ...progress, fetchedSources: [...progress.fetchedSources, next], factsWritten: progress.factsWritten + written }, finished: false };
  }

  if (progress.stage === "build") {
    // One atomic unit on purpose: retirement compares against the COMPLETE draft set, so a partial
    // build would retire valid items. Re-running it is safe — unchanged locales are skipped.
    const built = buildBank(await loadFacts(deps.db));
    const published = await publishDrafts(deps.db, built.accepted, progress.refreshFacts ? { retireMissingTemplates: [...new Set(built.accepted.map((draft) => draft.templateId))] } : {});
    return { progress: { ...progress, stage: "enrich", published, rejected: built.rejected.length }, finished: false };
  }

  const finish = async (extra: Partial<BankRefreshProgress> = {}) =>
    ({ progress: { ...progress, ...extra, inventory: summarizeInventory(await getBankInventory(deps.db)) }, finished: true });
  const enrich = deps.enrich;
  if (!enrich) return finish();
  const remaining = enrich.perRun - progress.enrich.enriched - progress.enrich.kept;
  if (remaining <= 0) return finish();
  if (await enrich.budgetLeftUsd() <= 0) return finish({ budgetExhausted: true });
  // No cursor needed: every processed row gets `enrichedBy`, so the next batch skips it.
  const stats = await enrichPending(deps.db, enrich.models, enrich.ai, Math.min(enrich.batchSize, remaining));
  if (!stats.enriched && !stats.kept) return finish();
  return { progress: { ...progress, enrich: { enriched: progress.enrich.enriched + stats.enriched, kept: progress.enrich.kept + stats.kept } }, finished: false };
};
