/**
 * End-to-end study pipeline on a real Neon branch with scripted models (no Gateway spend):
 *   TEST_DATABASE_URL=<dev branch> bun test packages/ai
 */
import { afterAll, describe, expect, test } from "bun:test";
import { challengeSchema } from "@goomi/content";
import { createPrismaClient, purgeUserContent } from "@goomi/db";
import { claimJob, enqueueMaterialJob, runMaterialJob } from "../src/jobs";
import { collectUsage } from "../src/usage";
import type { StudyDeps } from "../src/study/pipeline";
import { NOTES, hashingEmbedder, scriptedModel, scriptedStudyModels } from "./mocks";

const { extract: extractModel, generate: generateModel, judge: judgeModel } = scriptedStudyModels();

const url = process.env.TEST_DATABASE_URL;
const run = url ? describe : describe.skip;



run("study pipeline (integration)", () => {
  const db = createPrismaClient({ DATABASE_URL: url! });
  const userId = `test-pipeline-${Date.now()}`;
  const usage = collectUsage();
  const deps: StudyDeps = { db, models: { extract: extractModel, generate: generateModel, judge: judgeModel, ocr: generateModel, embed: hashingEmbedder() }, ai: { userId, privacy: "zdr", record: usage.sink } };
  afterAll(() => purgeUserContent(db, userId));

  test("uploaded pages become grounded, judged, offline-ready challenges", async () => {
    const material = await db.material.create({
      data: { userId, title: "Biología · Unidad 2", kind: "pdf", pageCount: 3, charCount: 800, textHash: `h-${Date.now()}`, consentVersion: "2026-09", consentedAt: new Date(), pages: { create: NOTES.map((page) => ({ ...page, source: "device" })) } },
    });
    const job = await enqueueMaterialJob(db, material.id, userId);
    expect((await enqueueMaterialJob(db, material.id, userId)).id).toBe(job.id); // idempotent enqueue

    // Tiny budget: forces pause/resume across several "invocations", like chained re-kicks.
    let outcome = "";
    for (let invocation = 0; invocation < 40 && outcome !== "succeeded"; invocation++) {
      const claimed = await claimJob(db, job.id);
      if (!claimed) throw new Error("job could not be claimed");
      outcome = await runMaterialJob(claimed, deps, invocation % 2 ? 1 : 1_500);
    }
    expect(outcome).toBe("succeeded");

    const done = await db.material.findUniqueOrThrow({ where: { id: material.id } });
    expect(done).toMatchObject({ status: "ready", lang: "es" });
    const chunks = await db.chunk.findMany({ where: { materialId: material.id } });
    const withEmbedding = await db.$queryRaw<{ n: bigint }[]>`SELECT count(*) AS n FROM "chunk" WHERE "materialId" = ${material.id} AND "embedding" IS NOT NULL`;
    expect(Number(withEmbedding[0]!.n)).toBe(chunks.length);

    const all = await db.studyChallenge.findMany({ where: { materialId: material.id } });
    const accepted = all.filter((row) => row.accepted);
    if (process.env.DEBUG_PIPELINE) {
      const progress = (await db.job.findUniqueOrThrow({ where: { id: job.id } })).progress as { counts?: unknown; rejected?: unknown; claims?: { type: string; sectionIndex: number; concepts: string[] }[] };
      console.log(JSON.stringify({ counts: progress.counts, rejected: progress.rejected, claims: progress.claims?.map((c) => [c.type, c.sectionIndex, c.concepts]), rows: all.map((r) => [r.kind, r.accepted]) }, null, 1));
    }
    expect(accepted.length).toBeGreaterThan(3);
    expect(new Set(accepted.map((row) => row.kind))).toContain("synthesis");
    expect(new Set(accepted.map((row) => row.kind))).toContain("ordering");
    expect(all.some((row) => row.kind === "cloze")).toBe(true);
    expect(accepted.some((row) => row.kind === "cloze")).toBe(false); // judge rejection honoured
    for (const row of accepted) {
      const challenge = challengeSchema.parse(row.challenge);
      expect(challenge.source?.excerpt).toBeTruthy();
      const cited = chunks.filter((chunk) => row.chunkIds.includes(chunk.id));
      expect(cited.length).toBe(row.chunkIds.length);
      expect(cited.some((chunk) => chunk.text.includes(challenge.source!.excerpt!))).toBe(true); // "your notes say…"
    }

    const concepts = await db.concept.findMany({ where: { userId } });
    expect(concepts.length).toBeGreaterThan(3);
    expect(usage.records.every((record) => record.zdr)).toBe(true);
    const job2 = await db.job.findUniqueOrThrow({ where: { id: job.id } });
    expect(job2.status).toBe("succeeded");
    expect(JSON.stringify(job2.progress)).toContain("without a verbatim quote"); // hallucinated claims were dropped
  }, 120_000);

  test("a failing model retries with backoff, then fails the material with a readable code", async () => {
    const broken = scriptedModel(() => ({ nonsense: true }), "broken");
    const material = await db.material.create({
      data: { userId, title: "Rotos", kind: "text", pageCount: 1, charCount: 100, textHash: `broken-${Date.now()}`, consentVersion: "2026-09", consentedAt: new Date(), pages: { create: [{ n: 1, text: NOTES[0]!.text, source: "device" }] } },
    });
    const job = await enqueueMaterialJob(db, material.id, userId);
    const brokenDeps = { ...deps, models: { ...deps.models, extract: broken } };
    const outcomes: string[] = [];
    for (let attempt = 0; attempt < 3; attempt++) {
      await db.job.update({ where: { id: job.id }, data: { runAfter: new Date(0) } }); // skip the backoff wait
      const claimed = await claimJob(db, job.id);
      outcomes.push(await runMaterialJob(claimed!, brokenDeps));
    }
    expect(outcomes).toEqual(["retrying", "retrying", "failed"]);
    expect(await db.material.findUniqueOrThrow({ where: { id: material.id } })).toMatchObject({ status: "failed", error: "processing_failed" });
  }, 60_000);

  test("a leased job cannot be claimed twice", async () => {
    const material = await db.material.create({ data: { userId, title: "Lease", kind: "text", pageCount: 1, charCount: 10, textHash: `lease-${Date.now()}`, consentVersion: "2026-09", consentedAt: new Date() } });
    const job = await enqueueMaterialJob(db, material.id, userId);
    const [a, b] = await Promise.all([claimJob(db, job.id), claimJob(db, job.id)]);
    expect([a, b].filter(Boolean)).toHaveLength(1);
  });
});
