import { embedMany, generateText, Output, type LanguageModel, type EmbeddingModel, type ModelMessage } from "ai";
import type { z } from "zod";
import { estimateCostUsd } from "./models";
import type { AiContext, AiPurpose } from "./usage";

/** Model ids resolve through Vercel AI Gateway; tests inject AI SDK mock models instead. */
export type ModelRef = string | LanguageModel;
export type EmbeddingRef = string | EmbeddingModel;

const modelId = (model: ModelRef | EmbeddingRef) => (typeof model === "string" ? model : `${model.provider}/${model.modelId}`);

/**
 * Document-derived calls must route only to zero-data-retention providers and never to providers
 * that train on prompts; the request fails closed if no such provider serves the model.
 * Request-level ZDR requires a Vercel Pro/Enterprise team (Gateway docs) — see ADR-001 Q1.
 */
function gatewayOptions(context: AiContext, purpose: AiPurpose) {
  return {
    gateway: {
      ...(context.privacy === "zdr" ? { zeroDataRetention: true, disallowPromptTraining: true } : {}),
      ...(context.privacy === "no-training" ? { disallowPromptTraining: true } : {}),
      ...(context.userId ? { user: context.userId } : {}),
      tags: [purpose],
    },
  };
}

export type StructuredCall<T> = {
  purpose: AiPurpose;
  model: ModelRef;
  schema: z.ZodType<T>;
  system: string;
  prompt?: string;
  messages?: ModelMessage[];
  maxOutputTokens?: number;
};

/** One structured-output call: reasoning off, bounded output, usage and cost always recorded. */
export async function generateStructured<T>(call: StructuredCall<T>, context: AiContext): Promise<T> {
  const started = performance.now();
  const base = {
    model: call.model,
    system: call.system,
    output: Output.object({ schema: call.schema }),
    reasoning: "none" as const,
    temperature: 0.2,
    maxOutputTokens: call.maxOutputTokens ?? 4_000,
    maxRetries: 2,
    providerOptions: gatewayOptions(context, call.purpose),
  };
  const result = call.messages ? await generateText({ ...base, messages: call.messages }) : await generateText({ ...base, prompt: call.prompt ?? "" });
  const inputTokens = result.totalUsage.inputTokens ?? 0;
  const outputTokens = result.totalUsage.outputTokens ?? 0;
  const generationId = (result.providerMetadata?.gateway as { generationId?: string } | undefined)?.generationId;
  await context.record({
    purpose: call.purpose, model: modelId(call.model), inputTokens, outputTokens,
    reasoningTokens: result.totalUsage.outputTokenDetails.reasoningTokens ?? 0,
    costUsd: estimateCostUsd(modelId(call.model), inputTokens, outputTokens),
    ...(generationId ? { generationId } : {}),
    zdr: context.privacy === "zdr", latencyMs: Math.round(performance.now() - started),
  });
  return result.output as T;
}

/** MRL truncation: keep the first `dimensions` values and L2-renormalize (valid for Qwen3-Embedding). */
export function truncateEmbedding(embedding: readonly number[], dimensions: number): number[] {
  if (embedding.length < dimensions) throw new RangeError(`Embedding has ${embedding.length} dims, need ${dimensions}.`);
  const head = embedding.slice(0, dimensions);
  const norm = Math.hypot(...head);
  if (!norm) throw new RangeError("Zero-norm embedding.");
  return head.map((value) => value / norm);
}

/** Qwen3-Embedding is instruction-aware: queries get a task prefix, documents don't. */
export const queryInstruction = (task: string, query: string) => `Instruct: ${task}\nQuery: ${query}`;

export async function embedTexts(values: readonly string[], options: { model: EmbeddingRef; purpose: AiPurpose; dimensions: number }, context: AiContext): Promise<number[][]> {
  if (!values.length) return [];
  const started = performance.now();
  const result = await embedMany({
    model: options.model, values: [...values], maxParallelCalls: 4, maxRetries: 2,
    providerOptions: gatewayOptions(context, options.purpose),
  });
  await context.record({
    purpose: options.purpose, model: modelId(options.model), inputTokens: result.usage.tokens, outputTokens: 0, reasoningTokens: 0,
    costUsd: estimateCostUsd(modelId(options.model), result.usage.tokens, 0),
    zdr: context.privacy === "zdr", latencyMs: Math.round(performance.now() - started),
  });
  return result.embeddings.map((embedding) => truncateEmbedding(embedding, options.dimensions));
}
