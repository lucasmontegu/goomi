import { gateway } from "ai";
import type { Database } from "@goomi/db";

export type GenerationLookup = (id: string) => Promise<{ totalCost: number }>;
export const gatewayLookup: GenerationLookup = (id) => gateway.getGenerationInfo({ id });

/**
 * Replaces price-table estimates with the Gateway's recorded cost (ADR-001 §8.3). Usage is
 * recorded asynchronously, so only rows older than a few minutes are looked up; misses stay
 * estimates and are retried on the next sweep.
 */
export async function reconcileCosts(db: Database, lookup: GenerationLookup = gatewayLookup, options: { limit?: number; now?: Date } = {}) {
  const cutoff = new Date((options.now ?? new Date()).getTime() - 5 * 60_000);
  const rows = await db.aiUsage.findMany({ where: { costSource: "estimate", generationId: { not: null }, createdAt: { lt: cutoff } }, orderBy: { createdAt: "asc" }, take: options.limit ?? 100, select: { id: true, generationId: true } });
  let reconciled = 0;
  for (const row of rows) {
    try {
      const info = await lookup(row.generationId!);
      await db.aiUsage.update({ where: { id: row.id }, data: { costUsd: info.totalCost, costSource: "gateway" } });
      reconciled++;
    } catch {
      // Not recorded yet (404) or transient — keep the estimate for now.
    }
  }
  return { checked: rows.length, reconciled };
}
