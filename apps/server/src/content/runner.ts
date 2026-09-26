import {
  BANK_REFRESH_KIND, DEFAULT_BUDGET_MS, bankRefreshStep, claimJob, runJob, runMaterialJob,
  type AiContext, type AiUsageRecord, type BankRefreshProgress, type FactFetchers, type JobRow, type RunOutcome, type StudyModels,
} from "@goomi/ai";
import type { MaterialErrorCode } from "@goomi/content";
import type { Database } from "@goomi/db";
import { LIMITS, createAllowance } from "./limits";

export type RunnerDeps = {
  db: Database;
  models: StudyModels;
  bankModels: { generate: StudyModels["generate"]; judge: StudyModels["judge"] };
  aiConfigured: boolean;
  privacy: "zdr" | "no-training";
  now: () => Date;
  /** Continues a paused job in a fresh invocation (self-call with JOBS_SECRET); absent locally. */
  kick?: (jobId: string) => Promise<void>;
  budgetMs?: number;
  /** Open-data sources for `bank.refresh` (network); injected so tests use fixtures. */
  fetchers?: FactFetchers;
  /** Overrides `LIMITS.bank` (tests). */
  bankLimits?: Partial<Record<keyof typeof LIMITS.bank, number>>;
};

/** Every AI call lands in `ai_usage` (ADR-001 §8.3). */
export const usageSink = (db: Database, scope: { userId?: string; jobId?: string; materialId?: string }) => async (record: AiUsageRecord) => {
  await db.aiUsage.create({
    data: {
      ...scope, purpose: record.purpose, model: record.model, inputTokens: record.inputTokens, outputTokens: record.outputTokens,
      reasoningTokens: record.reasoningTokens, costUsd: record.costUsd, costSource: "estimate",
      generationId: record.generationId ?? null, zdr: record.zdr, latencyMs: record.latencyMs,
    },
  });
};

export const aiContext = (deps: Pick<RunnerDeps, "db" | "privacy">, scope: { userId: string; jobId?: string; materialId?: string }): AiContext =>
  ({ ...scope, privacy: deps.privacy, record: usageSink(deps.db, scope) });

type Outcome = RunOutcome | "cancelled";
type Handler = (job: JobRow, deps: RunnerDeps, budgetMs: number) => Promise<Outcome>;

async function runMaterial(job: JobRow, deps: RunnerDeps, budgetMs: number): Promise<Outcome> {
  const material = job.materialId ? await deps.db.material.findUnique({ where: { id: job.materialId }, select: { userId: true } }) : null;
  if (!material) {
    await deps.db.job.update({ where: { id: job.id }, data: { status: "cancelled", lastError: "material deleted" } });
    return "cancelled";
  }
  if (await createAllowance(deps.db, deps.now).spendStopped(material.userId)) {
    await deps.db.$transaction([
      deps.db.job.update({ where: { id: job.id }, data: { status: "failed", lastError: "quota.spend" } }),
      deps.db.material.update({ where: { id: job.materialId! }, data: { status: "failed", error: "quota.spend" satisfies MaterialErrorCode } }),
    ]);
    return "failed";
  }
  return runMaterialJob(job, { db: deps.db, models: deps.models, ai: aiContext(deps, { userId: material.userId, jobId: job.id, materialId: job.materialId! }) }, budgetMs);
}

/** Global bank work: public data, no user, capped by its own monthly AI budget. */
async function runBankRefresh(job: JobRow, deps: RunnerDeps, budgetMs: number): Promise<Outcome> {
  const limits = { ...LIMITS.bank, ...deps.bankLimits };
  const step = bankRefreshStep({
    db: deps.db,
    fetchers: deps.fetchers,
    enrich: deps.aiConfigured
      ? {
        models: deps.bankModels, ai: { jobId: job.id, privacy: "public", record: usageSink(deps.db, { jobId: job.id }) },
        batchSize: limits.enrichBatch, perRun: limits.enrichPerRun,
        budgetLeftUsd: () => createAllowance(deps.db, deps.now).bankBudgetLeftUsd(limits.spendUsdPerMonth),
      }
      : undefined,
  });
  const initial: BankRefreshProgress = { stage: "fetch", refreshFacts: false, fetchedSources: [], factsWritten: 0, enrich: { enriched: 0, kept: 0 } };
  return runJob(deps.db, job, initial, step, { budgetMs });
}

const HANDLERS: Record<string, Handler> = {
  "material.process": runMaterial,
  [BANK_REFRESH_KIND]: runBankRefresh,
};

/**
 * Claims and runs jobs until the budget is spent, dispatching on `job.kind`. With `jobId`, only that
 * job (upload/poll/kick); without, any runnable job (cron sweeper). Paused jobs are handed to a fresh invocation.
 */
export async function runJobs(deps: RunnerDeps, options: { jobId?: string } = {}) {
  const deadline = Date.now() + (deps.budgetMs ?? DEFAULT_BUDGET_MS);
  const outcomes: { jobId: string; outcome: Outcome }[] = [];
  while (Date.now() < deadline - 5_000) {
    const job = await claimJob(deps.db, options.jobId);
    if (!job) break;
    const handler = HANDLERS[job.kind];
    let outcome: Outcome;
    if (handler) outcome = await handler(job, deps, Math.max(10_000, deadline - Date.now() - 5_000));
    else {
      await deps.db.job.update({ where: { id: job.id }, data: { status: "failed", lastError: `unknown kind: ${job.kind}` } });
      outcome = "failed";
    }
    outcomes.push({ jobId: job.id, outcome });
    if (outcome === "paused" && deps.kick) await deps.kick(job.id).catch(() => undefined);
    if (options.jobId) break;
  }
  return outcomes;
}
