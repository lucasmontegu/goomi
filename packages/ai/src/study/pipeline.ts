import { EMBEDDING_DIMENSIONS, Prisma, nearestChunks, nearestConcepts, setChunkEmbeddings, setConceptEmbedding, type Database } from "@goomi/db";
import { STUDY_STAGES, normalizeLabel, type Challenge, type MaterialErrorCode, type StudyStage } from "@goomi/content";
import { embedTexts, generateStructured, queryInstruction, type EmbeddingRef, type ModelRef } from "../gateway";
import { MODELS } from "../models";
import type { AiContext } from "../usage";
import { chunkSections, detectLang, estimateTokens, paragraphsOf, sectionize } from "../text";
import { groundExtraction, renderForJudge, toStudyChallenge, type ChunkRef } from "./convert";
import { planQuestions, selectBalanced, type GroundedClaim, type PlannedTask } from "./plan";
import { EXTRACT_SYSTEM, extractPrompt, generatePrompt, generateSystem, judgePrompt, judgeSystem, OCR_SYSTEM, renderChunks, type StudyLang } from "./prompts";
import { candidateSchema, extractionSchema, judgeSchema, ocrSchema, type Verdict } from "./schemas";

/** The stage list is part of the app contract (`progress.step` counts it). */
type Stage = StudyStage;

export type StudyModels = { extract: ModelRef; generate: ModelRef; judge: ModelRef; ocr: ModelRef; embed: EmbeddingRef };
export const DEFAULT_STUDY_MODELS: StudyModels = { extract: MODELS.extract, generate: MODELS.generate, judge: MODELS.judge, ocr: MODELS.ocr, embed: MODELS.embed };
export type StudyDeps = { db: Database; models: StudyModels; ai: AiContext };

/** Durable per-material state carried in `job.progress` between invocations. */
export type StudyProgress = {
  stage: Stage;
  lang?: StudyLang;
  extractedSections?: number[];
  claims?: GroundedClaim[];
  generatedTasks?: number;
  rejected?: { stage: Stage; reasons: string[] }[];
  counts?: { chunks?: number; concepts?: number; candidates?: number; accepted?: number };
};
/** Outcome of one unit of work: stay on this stage (more units left) or move on. */
export type StepResult = { progress: StudyProgress; done: boolean };

const JUDGE_BATCH = 5;
const GENERATE_BATCH = 5;
const ACCEPT_SCORE = 0.7;
const asJson = (value: unknown) => value as Prisma.InputJsonValue;

// ─── OCR fallback (called from the upload route; images are never stored) ────────────────────
export async function ocrPageImage(image: Uint8Array, mediaType: "image/jpeg" | "image/png", deps: Pick<StudyDeps, "models" | "ai">) {
  return generateStructured({
    purpose: "study.ocr", model: deps.models.ocr, schema: ocrSchema, system: OCR_SYSTEM, maxOutputTokens: 3_000,
    messages: [{ role: "user", content: [{ type: "file", data: image, mediaType }, { type: "text", text: "Transcribe this page." }] }],
  }, deps.ai);
}

// ─── Stages ───────────────────────────────────────────────────────────────────────────────────
async function structure(materialId: string, progress: StudyProgress, deps: StudyDeps): Promise<StepResult> {
  const material = await deps.db.material.findUniqueOrThrow({ where: { id: materialId }, include: { pages: { orderBy: { n: "asc" } } } });
  const paragraphs = paragraphsOf(material.pages.map((page) => ({ n: page.n, text: page.text })));
  const sections = sectionize(paragraphs);
  const chunks = chunkSections(sections);
  const lang = detectLang(paragraphs.map((p) => p.text).join(" ")) ?? (material.lang as StudyLang | null) ?? "en";
  await deps.db.$transaction([
    deps.db.materialSection.createMany({ data: sections.map((section) => ({ materialId, index: section.index, heading: section.heading, pageStart: section.pageStart, pageEnd: section.pageEnd, tokenCount: section.tokenCount })), skipDuplicates: true }),
    deps.db.chunk.createMany({ data: chunks.map((chunk) => ({ ...chunk, materialId, userId: material.userId })), skipDuplicates: true }),
    deps.db.material.update({ where: { id: materialId }, data: { lang, status: "processing" } }),
  ]);
  return { progress: { ...progress, lang, counts: { ...progress.counts, chunks: chunks.length } }, done: true };
}

async function embed(materialId: string, progress: StudyProgress, deps: StudyDeps): Promise<StepResult> {
  const pending = await deps.db.$queryRaw<{ id: string; text: string }[]>`SELECT "id", "text" FROM "chunk" WHERE "materialId" = ${materialId} AND "embedding" IS NULL ORDER BY "index" LIMIT 64`;
  if (!pending.length) return { progress, done: true };
  const vectors = await embedTexts(pending.map((chunk) => chunk.text), { model: deps.models.embed, purpose: "study.embed", dimensions: EMBEDDING_DIMENSIONS }, deps.ai);
  await setChunkEmbeddings(deps.db, pending.map((chunk, index) => ({ id: chunk.id, embedding: vectors[index]! })));
  return { progress, done: pending.length < 64 };
}

async function loadChunks(db: Database, materialId: string, sectionIndex?: number): Promise<(ChunkRef & { pageStart: number; tokenCount: number })[]> {
  return db.chunk.findMany({
    where: { materialId, ...(sectionIndex === undefined ? {} : { sectionIndex }) }, orderBy: { index: "asc" },
    select: { id: true, sectionIndex: true, text: true, paragraphStart: true, pageStart: true, tokenCount: true },
  });
}

/** One long-context pass per section (ADR-001 §5.4), then concept dedupe against the user's library. */
async function extract(materialId: string, progress: StudyProgress, deps: StudyDeps): Promise<StepResult> {
  const material = await deps.db.material.findUniqueOrThrow({ where: { id: materialId }, include: { sections: { orderBy: { index: "asc" } } } });
  const done = new Set(progress.extractedSections ?? []);
  const section = material.sections.find((candidate) => !done.has(candidate.index));
  if (!section) return { progress, done: true };
  const chunks = await loadChunks(deps.db, materialId, section.index);
  const extraction = await generateStructured({
    purpose: "study.extract", model: deps.models.extract, schema: extractionSchema, system: EXTRACT_SYSTEM,
    prompt: extractPrompt(section.heading, renderChunks(chunks)), maxOutputTokens: 6_000,
  }, deps.ai);
  const grounded = groundExtraction(extraction, chunks);
  const rejected = extraction.concepts.length + extraction.claims.length - grounded.concepts.length - grounded.claims.length;

  // Dedupe within the section first, then against the user's existing concepts.
  const unique = [...new Map(grounded.concepts.map((concept) => [normalizeLabel(concept.name), concept])).values()];
  const vectors = await embedTexts(unique.map((concept) => `${concept.name}: ${concept.definition}`), { model: deps.models.embed, purpose: "study.embed", dimensions: EMBEDDING_DIMENSIONS }, deps.ai);
  for (const [index, concept] of unique.entries()) {
    const embedding = vectors[index]!;
    const [match] = await nearestConcepts(deps.db, { userId: material.userId, embedding, limit: 1, minSimilarity: 0.9 });
    const sameName = match && normalizeLabel(match.name) === normalizeLabel(concept.name);
    let conceptId: string;
    if (match && (sameName || match.similarity >= 0.93)) {
      conceptId = match.id;
      if (!sameName) await deps.db.concept.update({ where: { id: match.id }, data: { aliases: { push: concept.name } } });
    } else {
      const created = await deps.db.concept.create({ data: { userId: material.userId, name: concept.name.slice(0, 120), definition: concept.definition.slice(0, 600), lang: progress.lang ?? null } });
      await setConceptEmbedding(deps.db, created.id, embedding);
      conceptId = created.id;
    }
    await deps.db.conceptMention.upsert({
      where: { conceptId_chunkId: { conceptId, chunkId: concept.chunkId } },
      create: { conceptId, chunkId: concept.chunkId, materialId, quote: concept.quote.slice(0, 600) }, update: {},
    });
  }
  return {
    progress: {
      ...progress,
      extractedSections: [...done, section.index],
      claims: [...(progress.claims ?? []), ...grounded.claims.map((claim) => ({ ...claim, sectionIndex: section.index }))],
      counts: { ...progress.counts, concepts: (progress.counts?.concepts ?? 0) + unique.length },
      ...(rejected ? { rejected: [...(progress.rejected ?? []), { stage: "extract" as const, reasons: [`${rejected} items without a verbatim quote in section ${section.index}`] }] } : {}),
    },
    done: done.size + 1 >= material.sections.length,
  };
}

async function materialConcepts(db: Database, materialId: string) {
  return db.concept.findMany({ where: { mentions: { some: { materialId } } }, select: { id: true, name: true, definition: true } });
}
async function conceptEmbedding(db: Database, id: string): Promise<number[] | null> {
  const [row] = await db.$queryRaw<{ embedding: string | null }[]>`SELECT "embedding"::text AS "embedding" FROM "concept" WHERE "id" = ${id}`;
  return row?.embedding ? (JSON.parse(row.embedding) as number[]) : null;
}

/** Related edges from vector similarity (0.75–0.90) across the user's whole library. */
async function link(materialId: string, progress: StudyProgress, deps: StudyDeps): Promise<StepResult> {
  const { userId } = await deps.db.material.findUniqueOrThrow({ where: { id: materialId }, select: { userId: true } });
  const edges: Prisma.ConceptEdgeCreateManyInput[] = [];
  for (const concept of await materialConcepts(deps.db, materialId)) {
    const embedding = await conceptEmbedding(deps.db, concept.id);
    if (!embedding) continue;
    for (const neighbor of await nearestConcepts(deps.db, { userId, embedding, limit: 3, minSimilarity: 0.75, maxSimilarity: 0.9, excludeIds: [concept.id] })) {
      const [fromId, toId] = [concept.id, neighbor.id].sort() as [string, string];
      edges.push({ fromId, toId, relation: "related", weight: neighbor.similarity, origin: "vector" });
    }
  }
  if (edges.length) await deps.db.conceptEdge.createMany({ data: edges, skipDuplicates: true });
  return { progress, done: true };
}

/** Plans kinds from grounded claims and asks the generator in small batches, each with its own notes. */
async function generate(materialId: string, progress: StudyProgress, deps: StudyDeps): Promise<StepResult> {
  const material = await deps.db.material.findUniqueOrThrow({ where: { id: materialId } });
  const plan = planQuestions(progress.claims ?? []);
  const start = progress.generatedTasks ?? 0;
  const batch = plan.slice(start, start + GENERATE_BATCH);
  if (!batch.length) return { progress, done: true };
  const lang = progress.lang ?? "en";
  const allChunks = await loadChunks(deps.db, materialId);
  const concepts = await materialConcepts(deps.db, materialId);

  // Notes = the cited chunks plus their section neighbours, kept well under the cheap-tier size.
  const wanted = new Set(batch.flatMap((task) => task.chunkIds));
  const sections = new Set(batch.map((task) => task.sectionIndex));
  const notes: typeof allChunks = [];
  let tokens = 0;
  for (const chunk of [...allChunks.filter((c) => wanted.has(c.id)), ...allChunks.filter((c) => !wanted.has(c.id) && sections.has(c.sectionIndex))]) {
    if (tokens + chunk.tokenCount > 8_000 && notes.length) break;
    notes.push(chunk); tokens += chunk.tokenCount;
  }
  const related = await relatedConcepts(deps, material.userId, batch, concepts);
  const result = await generateStructured({
    purpose: "study.generate", model: deps.models.generate, schema: candidateSchema, system: generateSystem(lang),
    prompt: generatePrompt(batch.map((task) => ({ kind: task.kind, focus: withChunkLabels(task, notes) })), renderChunks(notes), related), maxOutputTokens: 5_000,
  }, deps.ai);

  const rejected: string[] = [];
  let created = 0;
  for (const candidate of result.questions) {
    const involved = concepts.filter((concept) => candidate.prompt.toLocaleLowerCase().includes(concept.name.toLocaleLowerCase()) || candidate.quote.toLocaleLowerCase().includes(concept.name.toLocaleLowerCase()));
    const converted = toStudyChallenge(candidate, { materialId, materialTitle: material.title, lang, chunks: notes, conceptIds: involved.map((concept) => concept.id).slice(0, 4) });
    if (!converted.ok) { rejected.push(`${candidate.kind}: ${converted.reasons.join("; ")}`); continue; }
    await deps.db.studyChallenge.upsert({
      where: { materialId_candidateKey: { materialId, candidateKey: converted.candidateKey } },
      create: { materialId, userId: material.userId, candidateKey: converted.candidateKey, kind: candidate.kind, lang, conceptIds: involved.map((c) => c.id), chunkIds: converted.chunkIds, challenge: asJson(converted.challenge) },
      update: {},
    });
    created++;
  }
  const next = start + batch.length;
  return {
    progress: {
      ...progress, generatedTasks: next,
      counts: { ...progress.counts, candidates: (progress.counts?.candidates ?? 0) + created },
      ...(rejected.length ? { rejected: [...(progress.rejected ?? []), { stage: "generate" as const, reasons: rejected.slice(0, 10) }] } : {}),
    },
    done: next >= plan.length,
  };
}

const withChunkLabels = (task: PlannedTask, notes: readonly ChunkRef[]) =>
  `${task.focus} (see ${task.chunkIds.map((id) => `[C${notes.findIndex((chunk) => chunk.id === id)}]`).filter((label) => label !== "[C-1]").join(", ") || "the notes"})`;

/** Wrong-option material: the user's concepts in the 0.55–0.85 similarity band of the batch's concepts. */
async function relatedConcepts(deps: StudyDeps, userId: string, batch: readonly PlannedTask[], concepts: readonly { id: string; name: string }[]): Promise<string> {
  const names = new Set(batch.flatMap((task) => task.conceptNames.map((name) => name.toLocaleLowerCase())));
  const lines = new Map<string, string>();
  for (const concept of concepts.filter((c) => names.has(c.name.toLocaleLowerCase())).slice(0, 4)) {
    const embedding = await conceptEmbedding(deps.db, concept.id);
    if (!embedding) continue;
    for (const neighbor of await nearestConcepts(deps.db, { userId, embedding, limit: 4, minSimilarity: 0.55, maxSimilarity: 0.85, excludeIds: [concept.id] })) {
      lines.set(neighbor.id, `- ${neighbor.name}: ${neighbor.definition}`);
    }
  }
  return [...lines.values()].slice(0, 10).join("\n");
}

/** Judge in batches with the cited chunks plus each question's nearest other passages (ambiguity check). */
async function judge(materialId: string, progress: StudyProgress, deps: StudyDeps): Promise<StepResult> {
  const pending = await deps.db.studyChallenge.findMany({ where: { materialId, judge: { equals: Prisma.DbNull } }, take: JUDGE_BATCH, orderBy: { createdAt: "asc" } });
  if (!pending.length) return { progress, done: true };
  const { userId } = pending[0]!;
  const lang = progress.lang ?? "en";
  const challenges = pending.map((row) => row.challenge as unknown as Challenge);
  const queries = await embedTexts(challenges.map((challenge) => queryInstruction("Find passages of the notes relevant to this question", challenge.prompt)), { model: deps.models.embed, purpose: "study.embed", dimensions: EMBEDDING_DIMENSIONS }, deps.ai);
  const noteIds = new Set(pending.flatMap((row) => row.chunkIds));
  for (const [index, query] of queries.entries()) {
    for (const neighbor of await nearestChunks(deps.db, { userId, embedding: query, limit: 2, excludeChunkIds: pending[index]!.chunkIds })) noteIds.add(neighbor.id);
  }
  const notes = await deps.db.chunk.findMany({ where: { id: { in: [...noteIds] }, userId }, select: { text: true, pageStart: true } });
  const { verdicts } = await generateStructured({
    purpose: "study.judge", model: deps.models.judge, schema: judgeSchema, system: judgeSystem(lang),
    prompt: judgePrompt(challenges.map(renderForJudge).join("\n\n"), renderChunks(notes)), maxOutputTokens: 2_000,
  }, deps.ai);
  for (const [index, row] of pending.entries()) {
    const verdict: Verdict | undefined = verdicts.find((candidate) => candidate.question === index);
    const accepted = Boolean(verdict && verdict.supported && verdict.uniquelyCorrect && verdict.answerableFromNotes && verdict.languageOk && verdict.score >= ACCEPT_SCORE);
    await deps.db.studyChallenge.update({ where: { id: row.id }, data: { judge: asJson(verdict ?? { missing: true, score: 0 }), accepted } });
  }
  return { progress, done: pending.length < JUDGE_BATCH };
}

async function publish(materialId: string, progress: StudyProgress, deps: StudyDeps): Promise<StepResult> {
  const accepted = await deps.db.studyChallenge.findMany({ where: { materialId, accepted: true } });
  const selected = selectBalanced(accepted.map((row) => ({ ...row, score: Number((row.judge as { score?: number } | null)?.score ?? 0) })));
  const keep = new Set(selected.map((row) => row.id));
  await deps.db.$transaction([
    deps.db.studyChallenge.updateMany({ where: { materialId, accepted: true, id: { notIn: [...keep] } }, data: { accepted: false } }),
    deps.db.material.update({
      where: { id: materialId },
      data: keep.size ? { status: "ready", error: null } : { status: "failed", error: "no_questions" satisfies MaterialErrorCode },
    }),
  ]);
  return { progress: { ...progress, counts: { ...progress.counts, accepted: keep.size } }, done: true };
}

const STAGE_FN: Record<Stage, (materialId: string, progress: StudyProgress, deps: StudyDeps) => Promise<StepResult>> = { structure, embed, extract, link, generate, judge, publish };

/** Runs one unit of the current stage and advances the stage pointer when it completes. */
export async function runStudyStep(materialId: string, progress: StudyProgress, deps: StudyDeps): Promise<{ progress: StudyProgress; finished: boolean }> {
  const result = await STAGE_FN[progress.stage](materialId, progress, deps);
  if (!result.done) return { progress: result.progress, finished: false };
  const next = STUDY_STAGES[STUDY_STAGES.indexOf(progress.stage) + 1];
  return next ? { progress: { ...result.progress, stage: next }, finished: false } : { progress: result.progress, finished: true };
}

export const estimateMaterialTokens = (pages: readonly { text: string }[]) => pages.reduce((sum, page) => sum + estimateTokens(page.text), 0);
