/**
 * One place to swap models (ADR-001 §4.1). Prices are $ per 1M tokens from
 * https://ai-gateway.vercel.sh/v1/models (2026-09-23) and only seed the cost *estimate*;
 * the Gateway's recorded cost replaces it during reconciliation.
 */
export const MODELS = {
  /** Long-context concept/claim extraction; sections stay ≤ 32K tokens for the cheapest tier. */
  extract: "alibaba/qwen3.7-flash",
  /** Hard-question generation, bank enrichment and localization. */
  generate: "alibaba/qwen3.8-omni-flash",
  /** OCR fallback for low-text pages rendered on the device. */
  ocr: "alibaba/qwen3.8-omni-flash",
  /** Different model family from the generator, so errors are less correlated. */
  judge: "google/gemini-2.5-flash-lite",
  /** Multilingual, MRL-trained; truncated to 1024 dims locally. */
  embed: "alibaba/qwen3-embedding-8b",
} as const;
export type ModelRole = keyof typeof MODELS;

type Price = { input: number; output: number; inputAbove32k?: number; outputAbove32k?: number };
export const PRICES: Record<string, Price> = {
  "alibaba/qwen3.7-flash": { input: 0.03, output: 0.13, inputAbove32k: 0.1, outputAbove32k: 0.4 },
  "alibaba/qwen3.8-omni-flash": { input: 0.15, output: 0.47 },
  "alibaba/qwen3.8-flash": { input: 0.15, output: 0.47 },
  "google/gemini-2.5-flash-lite": { input: 0.1, output: 0.4 },
  "alibaba/qwen3-embedding-8b": { input: 0.01, output: 0 },
};

/** Estimated USD for one call. Unknown models estimate high on purpose so the spend cap stays conservative. */
export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const price = PRICES[model] ?? { input: 1, output: 5 };
  const above = inputTokens > 32_000 && price.inputAbove32k !== undefined;
  const input = above ? price.inputAbove32k! : price.input;
  const output = above ? price.outputAbove32k ?? price.output : price.output;
  return (inputTokens * input + outputTokens * output) / 1_000_000;
}
