import { DEFAULT_BUDGET_MS, claimJob, runMaterialJob, type AiContext, type AiUsageRecord, type StudyModels } from "@goomi/ai";
import type { Database } from "@goomi/db";
import { LIMITS, monthSpendUsd } from "./limits";

export type RunnerDeps = {
  db: Database;
  models: StudyModels;
  privacy: "zdr" | "no-training";
  now: () => Date;
  /** Continues a paused job in a fresh invocation (self-call with JOBS_SECRET); absent locally. */
  kick?: (jobId: string) => Promise<void>;
  budgetMs?: number;
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

/**
 * Claims and runs jobs until the budget is spent. With `jobId`, only that job (upload/poll/kick);
 * without, any runnable job (cron sweeper). Paused jobs are handed to a fresh invocation.
 */
export async function runJobs(deps: RunnerDeps, options: { jobId?: string } = {}) {
  const deadline = Date.now() + (deps.budgetMs ?? DEFAULT_BUDGET_MS);
  const outcomes: { jobId: string; outcome: string }[] = [];
  while (Date.now() < deadline - 5_000) {
    const job = await claimJob(deps.db, options.jobId);
    if (!job) break;
    const material = job.materialId ? await deps.db.material.findUnique({ where: { id: job.materialId }, select: { userId: true } }) : null;
    if (!material) {
      await deps.db.job.update({ where: { id: job.id }, data: { status: "cancelled", lastError: "material deleted" } });
      continue;
    }
    // Hard spend stop: estimates can overshoot the upload-time check, never by more than 50%.
    if (await monthSpendUsd(deps.db, material.userId, deps.now()) > LIMITS.plus.spendUsdPerMonth * 1.5) {
      await deps.db.$transaction([
        deps.db.job.update({ where: { id: job.id }, data: { status: "failed", lastError: "quota.spend" } }),
        deps.db.material.update({ where: { id: job.materialId! }, data: { status: "failed", error: "quota.spend" } }),
      ]);
      outcomes.push({ jobId: job.id, outcome: "failed" });
      continue;
    }
    const outcome = await runMaterialJob(job, { db: deps.db, models: deps.models, ai: aiContext(deps, { userId: material.userId, jobId: job.id, materialId: job.materialId! }) }, Math.max(10_000, deadline - Date.now() - 5_000));
    outcomes.push({ jobId: job.id, outcome });
    if (outcome === "paused" && deps.kick) await deps.kick(job.id).catch(() => undefined);
    if (options.jobId) break;
  }
  return outcomes;
}
