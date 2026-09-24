import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { embedTexts, generateStructured, truncateEmbedding } from "../src/gateway";
import { estimateCostUsd } from "../src/models";
import { collectUsage } from "../src/usage";
import { hashingEmbedder, scriptedModel } from "./mocks";

describe("gateway wrapper", () => {
  test("structured call: document privacy options, reasoning off, usage and cost recorded", async () => {
    const model = scriptedModel(() => ({ answer: "42" }), "qwen-test");
    const usage = collectUsage();
    const output = await generateStructured({ purpose: "study.generate", model, schema: z.object({ answer: z.string() }), system: "s", prompt: "p" }, { privacy: "zdr", userId: "u1", record: usage.sink });
    expect(output).toEqual({ answer: "42" });
    const call = model.doGenerateCalls[0]!;
    expect(call.providerOptions?.gateway).toEqual({ zeroDataRetention: true, disallowPromptTraining: true, user: "u1", tags: ["study.generate"] });
    expect(usage.records[0]).toMatchObject({ purpose: "study.generate", model: "mock/qwen-test", inputTokens: 1000, outputTokens: 200, zdr: true });
  });

  test("public content is not forced onto ZDR routes", async () => {
    const model = scriptedModel(() => ({ ok: true }));
    await generateStructured({ purpose: "bank.enrich", model, schema: z.object({ ok: z.boolean() }), system: "s", prompt: "p" }, { privacy: "public", record: () => {} });
    expect(model.doGenerateCalls[0]!.providerOptions?.gateway).toEqual({ tags: ["bank.enrich"] });
  });

  test("invalid model output fails loudly instead of returning partial data", async () => {
    const model = scriptedModel(() => ({ wrong: 1 }));
    await expect(generateStructured({ purpose: "study.judge", model, schema: z.object({ answer: z.string() }), system: "s", prompt: "p" }, { privacy: "zdr", record: () => {} })).rejects.toThrow();
  });

  test("embeddings are truncated to 1024 dims and renormalized (MRL)", async () => {
    const usage = collectUsage();
    const [vector] = await embedTexts(["La célula es la unidad básica de la vida"], { model: hashingEmbedder(), purpose: "study.embed", dimensions: 1024 }, { privacy: "zdr", record: usage.sink });
    expect(vector).toHaveLength(1024);
    expect(Math.hypot(...vector!)).toBeCloseTo(1, 6);
    expect(usage.records[0]!.purpose).toBe("study.embed");
    expect(() => truncateEmbedding([1, 2], 1024)).toThrow(RangeError);
  });

  test("cost estimate honours qwen3.7's 32K price tier and prices unknown models high", () => {
    expect(estimateCostUsd("alibaba/qwen3.7-flash", 30_000, 1_000)).toBeCloseTo((30_000 * 0.03 + 1_000 * 0.13) / 1e6, 10);
    expect(estimateCostUsd("alibaba/qwen3.7-flash", 40_000, 1_000)).toBeCloseTo((40_000 * 0.1 + 1_000 * 0.4) / 1e6, 10);
    expect(estimateCostUsd("someone/new-model", 1_000_000, 0)).toBe(1);
  });
});
