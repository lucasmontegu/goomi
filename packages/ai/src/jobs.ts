import type { Database, Prisma } from "@goomi/db";
import { runStudyStep, type StudyDeps, type StudyProgress } from "./study/pipeline";

/**
 * Neon-backed durable jobs (ADR-001 §7). A job is advanced by whoever claims it first:
 * the upload request (waitUntil), its own re-kick, the app's status poll, or the cron sweeper.
 * Every unit of work checkpoints `progress`, so a crash or timeout loses at most one unit.
 */
export const LEASE_SECONDS = 90;
export const DEFAULT_BUDGET_MS = 240_000;

type JobRow = { id: string; kind: string; materialId: string | null; stage: string; attempts: number; maxAttempts: number; progress: unknown };

/** Atomically leases one runnable job (optionally a specific one); concurrent claimers skip locked rows. */
export async function claimJob(db: Database, jobId?: string): Promise<JobRow | null> {
  const rows = await db.$queryRaw<JobRow[]>`
    UPDATE "job" SET "status" = 'running', "lockedUntil" = now() + make_interval(secs => ${LEASE_SECONDS}), "updatedAt" = now()
    WHERE "id" = (
      SELECT "id" FROM "job"
      WHERE "status" IN ('queued', 'running') AND "lockedUntil" < now() AND "runAfter" <= now()
        AND (${jobId ?? null}::text IS NULL OR "id" = ${jobId ?? null})
      ORDER BY "createdAt" LIMIT 1 FOR UPDATE SKIP LOCKED)
    RETURNING "id", "kind", "materialId", "stage", "attempts", "maxAttempts", "progress"`;
  return rows[0] ?? null;
}

export async function enqueueMaterialJob(db: Database, materialId: string, userId: string) {
  const progress: StudyProgress = { stage: "structure" };
  return db.job.upsert({
    where: { idempotencyKey: `material.process:${materialId}` },
    create: { kind: "material.process", materialId, userId, stage: "structure", idempotencyKey: `material.process:${materialId}`, progress: progress as Prisma.InputJsonValue },
    update: {},
  });
}

export type RunOutcome = "succeeded" | "paused" | "retrying" | "failed";

/** Runs a leased material job until it finishes, fails, or the time budget is spent. */
export async function runMaterialJob(job: JobRow, deps: StudyDeps, budgetMs = DEFAULT_BUDGET_MS, now = () => Date.now()): Promise<RunOutcome> {
  const deadline = now() + budgetMs;
  let progress = (job.progress as StudyProgress | null) ?? { stage: "structure" };
  const context = { ...deps, ai: { ...deps.ai, jobId: job.id, materialId: job.materialId ?? undefined } };
  try {
    while (now() < deadline) {
      const step = await runStudyStep(job.materialId!, progress, context);
      progress = step.progress;
      if (step.finished) {
        await deps.db.job.update({ where: { id: job.id }, data: { status: "succeeded", stage: progress.stage, progress: progress as Prisma.InputJsonValue, lastError: null } });
        return "succeeded";
      }
      // Checkpoint and extend the lease after every unit.
      await deps.db.job.update({ where: { id: job.id }, data: { stage: progress.stage, progress: progress as Prisma.InputJsonValue, lockedUntil: new Date(now() + LEASE_SECONDS * 1000) } });
    }
    await deps.db.job.update({ where: { id: job.id }, data: { status: "queued", lockedUntil: new Date(0) } });
    return "paused";
  } catch (error) {
    const attempts = job.attempts + 1;
    const message = error instanceof Error ? error.message.slice(0, 500) : "unknown error";
    if (attempts >= job.maxAttempts) {
      await deps.db.$transaction([
        deps.db.job.update({ where: { id: job.id }, data: { status: "failed", attempts, lastError: message } }),
        deps.db.material.update({ where: { id: job.materialId! }, data: { status: "failed", error: "processing_failed" } }),
      ]);
      return "failed";
    }
    // Exponential backoff: 30 s, 60 s, 120 s…
    await deps.db.job.update({ where: { id: job.id }, data: { status: "queued", attempts, lastError: message, lockedUntil: new Date(0), runAfter: new Date(now() + 30_000 * 2 ** (attempts - 1)) } });
    return "retrying";
  }
}
