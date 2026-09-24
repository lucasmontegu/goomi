export type AiPurpose =
  | "study.ocr" | "study.extract" | "study.generate" | "study.judge" | "study.embed"
  | "bank.enrich" | "bank.judge";

export type AiUsageRecord = {
  purpose: AiPurpose;
  model: string;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  costUsd: number;
  generationId?: string;
  zdr: boolean;
  latencyMs: number;
};

/** Where every AI call is recorded; the server writes to `ai_usage`, tests collect in memory. */
export type UsageSink = (record: AiUsageRecord) => Promise<void> | void;

export type AiContext = {
  userId?: string;
  jobId?: string;
  materialId?: string;
  /**
   * Routing for anything derived from a user's documents (ADR-001 §8.4): "zdr" = zero-data-retention
   * providers only (fails closed); "no-training" = providers that don't train on prompts; "public" = open data.
   */
  privacy: "zdr" | "no-training" | "public";
  record: UsageSink;
};

export const collectUsage = () => {
  const records: AiUsageRecord[] = [];
  return { records, sink: ((record) => { records.push(record); }) satisfies UsageSink, total: () => records.reduce((sum, record) => sum + record.costUsd, 0) };
};
