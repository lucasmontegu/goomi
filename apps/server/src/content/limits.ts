import type { Database } from "@goomi/db";

/** ADR-001 §8.2 defaults; tune here. */
export const LIMITS = {
  free: { bankItemsPerDay: 30, bankRequestsPer10Min: 10 },
  plus: { bankItemsPerDay: 200, bankRequestsPer10Min: 30, documentsPerMonth: 40, pagesPerMonth: 1_500, ocrPagesPerMonth: 150, spendUsdPerMonth: 1, concurrentDocuments: 2 },
  ipRequestsPer10Min: 60,
  maxPagesPerDocument: 50,
  maxCharsPerDocument: 100_000,
  maxImagesPerRequest: 10,
  maxImageBytes: 1_500_000,
} as const;

export const dayKey = (now: Date) => now.toISOString().slice(0, 10);
export const monthKey = (now: Date) => now.toISOString().slice(0, 7);

/** Fixed-window counter; returns the count after this hit. One round trip, atomic under concurrency. */
export async function hitRateLimit(db: Database, key: string, windowSeconds: number, now: Date): Promise<number> {
  const windowStart = new Date(Math.floor(now.getTime() / (windowSeconds * 1000)) * windowSeconds * 1000);
  const [row] = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "rate_limit_bucket" ("key", "windowStart", "count") VALUES (${key}, ${windowStart}, 1)
    ON CONFLICT ("key", "windowStart") DO UPDATE SET "count" = "rate_limit_bucket"."count" + 1
    RETURNING "count"`;
  return Number(row?.count ?? 1);
}

export async function readCounter(db: Database, subject: string, period: string, metric: string): Promise<number> {
  const row = await db.usageCounter.findUnique({ where: { subject_period_metric: { subject, period, metric } } });
  return row?.value ?? 0;
}

/** Adds `amount` and returns the new total (atomic). */
export async function addToCounter(db: Database, subject: string, period: string, metric: string, amount: number): Promise<number> {
  const [row] = await db.$queryRaw<{ value: number }[]>`
    INSERT INTO "usage_counter" ("subject", "period", "metric", "value") VALUES (${subject}, ${period}, ${metric}, ${amount})
    ON CONFLICT ("subject", "period", "metric") DO UPDATE SET "value" = "usage_counter"."value" + ${amount}
    RETURNING "value"`;
  return Number(row?.value ?? amount);
}

/** Month-to-date AI spend for a user from `ai_usage` (estimates until reconciled). */
export async function monthSpendUsd(db: Database, userId: string, now: Date): Promise<number> {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const result = await db.aiUsage.aggregate({ where: { userId, createdAt: { gte: start } }, _sum: { costUsd: true } });
  return Number(result._sum.costUsd ?? 0);
}

/** Old rate-limit windows are useless after an hour; the sweeper trims them. */
export const pruneRateLimits = (db: Database, now: Date) => db.rateLimitBucket.deleteMany({ where: { windowStart: { lt: new Date(now.getTime() - 3_600_000) } } });
