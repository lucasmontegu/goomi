import { estimateMaterialTokens } from "@goomi/ai";
import type { Database } from "@goomi/db";
import { refuse } from "./http";

/** ADR-001 §8.2 defaults; tune here. */
export const LIMITS = {
  free: { bankItemsPerDay: 30, bankRequestsPer10Min: 10 },
  plus: { bankItemsPerDay: 200, bankRequestsPer10Min: 30, documentsPerMonth: 40, pagesPerMonth: 1_500, ocrPagesPerMonth: 150, spendUsdPerMonth: 1, concurrentDocuments: 2 },
  /** Global bank AI (enrichment ≈ $0.0004 per locale, so ~$3.6/month at 300 a night). */
  bank: { spendUsdPerMonth: 5, enrichPerRun: 300, enrichBatch: 20 },
  ipRequestsPer10Min: 60,
  /** Running jobs stop once estimates overshoot the monthly allowance by this factor. */
  spendHardStop: 1.5,
  // Per-document upload limits live in the shared contract: STUDY_UPLOAD_LIMITS (@goomi/content).
} as const;

export const dayKey = (now: Date) => now.toISOString().slice(0, 10);
const monthKey = (now: Date) => now.toISOString().slice(0, 7);
const monthStart = (now: Date) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

/** Rough upload-time cost guard (~$0.04 per 27K tokens, ADR-001 §9). */
const estimateDocumentUsd = (pages: { text: string }[], ocrPages: number) => (estimateMaterialTokens(pages) / 27_000) * 0.04 + ocrPages * 0.0005;

/** Something taken from a quota that can be returned when the work it paid for didn't happen. */
export type Ticket = { giveBack(): Promise<void> };

/**
 * Every quota, rate limit and AI spend cap (ADR-001 §8.2) behind one module. Takes are atomic under
 * concurrency (check-and-take in one statement, over-limit takes returned at once); refusals throw
 * an ApiFailure with the quota's contract code.
 */
export function createAllowance(db: Database, now: () => Date) {
  /** Fixed-window counter; returns the count after this hit. */
  async function hit(key: string, windowSeconds: number, at: Date): Promise<number> {
    const windowStart = new Date(Math.floor(at.getTime() / (windowSeconds * 1000)) * windowSeconds * 1000);
    const [row] = await db.$queryRaw<{ count: number }[]>`
      INSERT INTO "rate_limit_bucket" ("key", "windowStart", "count") VALUES (${key}, ${windowStart}, 1)
      ON CONFLICT ("key", "windowStart") DO UPDATE SET "count" = "rate_limit_bucket"."count" + 1
      RETURNING "count"`;
    return Number(row?.count ?? 1);
  }
  async function read(subject: string, period: string, metric: string): Promise<number> {
    const row = await db.usageCounter.findUnique({ where: { subject_period_metric: { subject, period, metric } } });
    return row?.value ?? 0;
  }
  /** Adds `amount` and returns the new total. */
  async function add(subject: string, period: string, metric: string, amount: number): Promise<number> {
    const [row] = await db.$queryRaw<{ value: number }[]>`
      INSERT INTO "usage_counter" ("subject", "period", "metric", "value") VALUES (${subject}, ${period}, ${metric}, ${amount})
      ON CONFLICT ("subject", "period", "metric") DO UPDATE SET "value" = "usage_counter"."value" + ${amount}
      RETURNING "value"`;
    return Number(row?.value ?? amount);
  }
  /** Takes `amount` if the total stays within `limit`; otherwise returns it and answers false. */
  async function take(subject: string, period: string, metric: string, amount: number, limit: number): Promise<boolean> {
    if (await add(subject, period, metric, amount) <= limit) return true;
    await add(subject, period, metric, -amount);
    return false;
  }
  async function userMonthSpendUsd(userId: string, at: Date): Promise<number> {
    const result = await db.aiUsage.aggregate({ where: { userId, createdAt: { gte: monthStart(at) } }, _sum: { costUsd: true } });
    return Number(result._sum.costUsd ?? 0);
  }

  return {
    /**
     * Rate-limits one bank sync (per subject and per IP) and returns what the subject may still take
     * today; `take(n)` records items actually sent and returns what's left.
     */
    async bankSync(subject: string, plus: boolean, ip: string): Promise<{ remaining: number; take(count: number): Promise<number> }> {
      const at = now();
      const tier = plus ? LIMITS.plus : LIMITS.free;
      if (await hit(`bank:${subject}`, 600, at) > tier.bankRequestsPer10Min || await hit(`bank-ip:${ip}`, 600, at) > LIMITS.ipRequestsPer10Min) {
        refuse("rate_limited", "Too many syncs. Try again in a few minutes.");
      }
      const day = dayKey(at);
      const used = await read(subject, day, "bank.items");
      return {
        remaining: Math.max(0, tier.bankItemsPerDay - used),
        async take(count) {
          const total = count ? await add(subject, day, "bank.items", count) : used;
          return Math.max(0, tier.bankItemsPerDay - total);
        },
      };
    },

    /** Checks concurrency and this month's spend, then takes one document and its pages. */
    async takeUpload(userId: string, upload: { pages: { text: string }[]; ocrPages: number }): Promise<Ticket> {
      const at = now();
      const month = monthKey(at);
      const [spend, active] = await Promise.all([
        userMonthSpendUsd(userId, at),
        db.material.count({ where: { userId, status: { in: ["queued", "processing"] }, createdAt: { gt: new Date(at.getTime() - 86_400_000) } } }),
      ]);
      if (active >= LIMITS.plus.concurrentDocuments) refuse("quota.concurrent", "Two documents are already being prepared. Try again when they're ready.");
      if (spend + estimateDocumentUsd(upload.pages, upload.ocrPages) > LIMITS.plus.spendUsdPerMonth) refuse("quota.spend", "You've reached this month's AI study allowance.");
      if (!(await take(userId, month, "study.documents", 1, LIMITS.plus.documentsPerMonth))) refuse("quota.documents", "You've reached this month's document limit.");
      const pages = upload.pages.length;
      if (!(await take(userId, month, "study.pages", pages, LIMITS.plus.pagesPerMonth))) {
        await add(userId, month, "study.documents", -1);
        refuse("quota.pages", "You've reached this month's page limit.");
      }
      return {
        async giveBack() {
          await add(userId, month, "study.documents", -1);
          await add(userId, month, "study.pages", -pages);
        },
      };
    },

    /** Takes `count` OCR pages; `giveBack(unread)` returns the ones that were never read. */
    async takeOcrPages(userId: string, count: number): Promise<{ giveBack(unread: number): Promise<void> }> {
      const month = monthKey(now());
      if (!(await take(userId, month, "study.ocrPages", count, LIMITS.plus.ocrPagesPerMonth))) {
        refuse("quota.ocr", "You've reached this month's limit for reading handwritten or scanned pages.");
      }
      return { async giveBack(unread) { if (unread > 0) await add(userId, month, "study.ocrPages", -unread); } };
    },

    /** Hard stop for a running job: upload-time estimates may overshoot, never past LIMITS.spendHardStop. */
    async spendStopped(userId: string): Promise<boolean> {
      return await userMonthSpendUsd(userId, now()) > LIMITS.plus.spendUsdPerMonth * LIMITS.spendHardStop;
    },

    /** What's left this month of the global bank AI budget (not tied to any user). */
    async bankBudgetLeftUsd(monthlyUsd: number = LIMITS.bank.spendUsdPerMonth): Promise<number> {
      const result = await db.aiUsage.aggregate({ where: { userId: null, purpose: { startsWith: "bank." }, createdAt: { gte: monthStart(now()) } }, _sum: { costUsd: true } });
      return monthlyUsd - Number(result._sum.costUsd ?? 0);
    },

    /** Old rate-limit windows are useless after an hour; the sweeper trims them. */
    prune: () => db.rateLimitBucket.deleteMany({ where: { windowStart: { lt: new Date(now().getTime() - 3_600_000) } } }),
  };
}
export type Allowance = ReturnType<typeof createAllowance>;
