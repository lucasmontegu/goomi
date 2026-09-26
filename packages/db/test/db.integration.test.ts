/**
 * Runs against a real Neon branch with the migration applied (never production):
 *   TEST_DATABASE_URL=postgresql://…dev-branch… bun test packages/db
 * Skipped when TEST_DATABASE_URL is unset.
 */
import { afterAll, describe, expect, test } from "bun:test";
import { EMBEDDING_DIMENSIONS, createPrismaClient, deleteMaterial, nearestChunks, nearestConcepts, purgeUserContent, setChunkEmbeddings, setConceptEmbedding, toVectorLiteral } from "../src";

const url = process.env.TEST_DATABASE_URL;
const run = url ? describe : describe.skip;

/** Unit vector pointing mostly along `axis`, with a controllable blend toward `other`. */
function vector(axis: number, other = axis, blend = 0): number[] {
  const values = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
  values[axis] = 1 - blend;
  values[other] = (values[other] ?? 0) + blend;
  const norm = Math.hypot(...values);
  return values.map((value) => value / norm);
}

run("pgvector on Neon (integration)", () => {
  const db = createPrismaClient({ DATABASE_URL: url! });
  const userA = `test-user-a-${Date.now()}`;
  const userB = `test-user-b-${Date.now()}`;
  afterAll(async () => {
    await purgeUserContent(db, userA);
    await purgeUserContent(db, userB);
  });

  const material = (userId: string, textHash: string) => db.material.create({
    data: { userId, title: "Biology notes", kind: "text", pageCount: 1, charCount: 100, textHash, consentVersion: "2026-09", consentedAt: new Date() },
  });
  const chunk = (materialId: string, userId: string, index: number, text: string) => db.chunk.create({
    data: { materialId, userId, sectionIndex: 0, index, text, pageStart: 1, pageEnd: 1, paragraphStart: index, paragraphEnd: index, charStart: 0, charEnd: text.length, tokenCount: 10 },
  });

  test("stores halfvec(1024) embeddings and ranks neighbours by cosine similarity", async () => {
    const notes = await material(userA, `hash-a-${Date.now()}`);
    const photosynthesis = await chunk(notes.id, userA, 0, "Photosynthesis turns light into chemical energy.");
    const respiration = await chunk(notes.id, userA, 1, "Cellular respiration releases energy from glucose.");
    const unrelated = await chunk(notes.id, userA, 2, "The French Revolution began in 1789.");
    await setChunkEmbeddings(db, [
      { id: photosynthesis.id, embedding: vector(0) },
      { id: respiration.id, embedding: vector(0, 1, 0.4) },
      { id: unrelated.id, embedding: vector(5) },
    ]);
    const neighbours = await nearestChunks(db, { userId: userA, embedding: vector(0), limit: 3 });
    expect(neighbours.map((n) => n.id)).toEqual([photosynthesis.id, respiration.id, unrelated.id]);
    expect(neighbours[0]!.similarity).toBeCloseTo(1, 2);
    expect(neighbours[2]!.similarity).toBeCloseTo(0, 2);
    const excluding = await nearestChunks(db, { userId: userA, embedding: vector(0), limit: 1, excludeChunkIds: [photosynthesis.id] });
    expect(excluding[0]!.id).toBe(respiration.id);
  });

  test("never returns another user's chunks, even when they are the closest match", async () => {
    const other = await material(userB, `hash-b-${Date.now()}`);
    const secret = await chunk(other.id, userB, 0, "User B's private notes");
    await setChunkEmbeddings(db, [{ id: secret.id, embedding: vector(0) }]);
    const neighbours = await nearestChunks(db, { userId: userA, embedding: vector(0), limit: 10 });
    expect(neighbours.some((n) => n.id === secret.id)).toBe(false);
  });

  test("concept similarity band selects related-but-different distractors", async () => {
    const make = async (name: string, embedding: number[]) => {
      const concept = await db.concept.create({ data: { userId: userA, name, definition: `${name} definition` } });
      await setConceptEmbedding(db, concept.id, embedding);
      return concept;
    };
    const target = await make("Photosynthesis", vector(10));
    const duplicate = await make("Photo-synthesis", vector(10, 11, 0.05));
    const related = await make("Chlorophyll", vector(10, 11, 0.5));
    await make("Mitochondria", vector(20));
    const band = await nearestConcepts(db, { userId: userA, embedding: vector(10), minSimilarity: 0.55, maxSimilarity: 0.85, excludeIds: [target.id] });
    expect(band.map((c) => c.id)).toEqual([related.id]);
    const dupes = await nearestConcepts(db, { userId: userA, embedding: vector(10), minSimilarity: 0.9, excludeIds: [target.id] });
    expect(dupes.map((c) => c.id)).toEqual([duplicate.id]);
  });

  test("deleting a material cascades and removes orphaned concepts", async () => {
    const notes = await material(userA, `hash-del-${Date.now()}`);
    const piece = await chunk(notes.id, userA, 0, "Osmosis moves water across a membrane.");
    const concept = await db.concept.create({ data: { userId: userA, name: "Osmosis", definition: "water across a membrane", mentions: { create: { chunkId: piece.id, materialId: notes.id, quote: "Osmosis moves water" } } } });
    expect(await deleteMaterial(db, userA, notes.id)).toBe(true);
    expect(await db.chunk.count({ where: { materialId: notes.id } })).toBe(0);
    expect(await db.concept.findUnique({ where: { id: concept.id } })).toBeNull();
    expect(await deleteMaterial(db, userB, notes.id)).toBe(false);
  });

  test("rejects malformed vectors before they reach SQL", () => {
    expect(() => toVectorLiteral([1, 2, 3])).toThrow(RangeError);
    expect(() => toVectorLiteral(new Array(EMBEDDING_DIMENSIONS).fill(Number.NaN))).toThrow(RangeError);
  });

  test("every app table has row-level security on and no grants to PUBLIC (deny by default)", async () => {
    const tables = await db.$queryRaw<{ name: string; rls: boolean; publicSelect: boolean }[]>`
      SELECT c.relname AS "name", c.relrowsecurity AS "rls", has_table_privilege('public', c.oid, 'SELECT') AS "publicSelect"
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname <> '_prisma_migrations'`;
    expect(tables.length).toBeGreaterThan(20);
    expect(tables.filter((table) => !table.rls || table.publicSelect).map((table) => table.name)).toEqual([]);
  });
});
