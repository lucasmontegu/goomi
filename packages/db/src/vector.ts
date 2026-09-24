import type { Database } from "./index";

/** Dimensions stored in `chunk.embedding` / `concept.embedding` (halfvec). */
export const EMBEDDING_DIMENSIONS = 1024;

/** pgvector text literal; rejects wrong sizes and non-finite values before they reach SQL. */
export function toVectorLiteral(embedding: readonly number[]): string {
  if (embedding.length !== EMBEDDING_DIMENSIONS) throw new RangeError(`Expected ${EMBEDDING_DIMENSIONS} dimensions, got ${embedding.length}.`);
  if (!embedding.every(Number.isFinite)) throw new RangeError("Embedding contains a non-finite value.");
  return `[${embedding.join(",")}]`;
}

export async function setChunkEmbeddings(db: Database, rows: readonly { id: string; embedding: readonly number[] }[]) {
  for (const row of rows) {
    await db.$executeRaw`UPDATE "chunk" SET "embedding" = ${toVectorLiteral(row.embedding)}::halfvec WHERE "id" = ${row.id}`;
  }
}

export async function setConceptEmbedding(db: Database, id: string, embedding: readonly number[]) {
  await db.$executeRaw`UPDATE "concept" SET "embedding" = ${toVectorLiteral(embedding)}::halfvec WHERE "id" = ${id}`;
}

export type ChunkNeighbor = { id: string; materialId: string; sectionIndex: number; index: number; text: string; similarity: number };
export type ConceptNeighbor = { id: string; name: string; definition: string; similarity: number };

/**
 * Cosine neighbours inside one user's library. Iterative scans keep the per-user filter from
 * starving the HNSW result set (pgvector ≥ 0.8), so this runs inside a transaction.
 */
export async function nearestChunks(db: Database, options: { userId: string; embedding: readonly number[]; limit?: number; materialId?: string; excludeChunkIds?: readonly string[] }): Promise<ChunkNeighbor[]> {
  const literal = toVectorLiteral(options.embedding);
  const limit = Math.min(50, options.limit ?? 8);
  const exclude = [...(options.excludeChunkIds ?? [])];
  const [, rows] = await db.$transaction([
    db.$executeRaw`SET LOCAL hnsw.iterative_scan = relaxed_order`,
    db.$queryRaw<ChunkNeighbor[]>`
      SELECT "id", "materialId", "sectionIndex", "index", "text", 1 - ("embedding" <=> ${literal}::halfvec) AS "similarity"
      FROM "chunk"
      WHERE "userId" = ${options.userId} AND "embedding" IS NOT NULL
        AND (${options.materialId ?? null}::text IS NULL OR "materialId" = ${options.materialId ?? null})
        AND NOT ("id" = ANY(${exclude}::text[]))
      ORDER BY "embedding" <=> ${literal}::halfvec
      LIMIT ${limit}`,
  ]);
  return rows.map((row) => ({ ...row, similarity: Number(row.similarity) }));
}

/** Concepts within a similarity band — the band 0.55–0.85 gives plausible-but-wrong distractors (ADR-001 §5.4). */
export async function nearestConcepts(db: Database, options: { userId: string; embedding: readonly number[]; limit?: number; minSimilarity?: number; maxSimilarity?: number; excludeIds?: readonly string[] }): Promise<ConceptNeighbor[]> {
  const literal = toVectorLiteral(options.embedding);
  const exclude = [...(options.excludeIds ?? [])];
  const [, rows] = await db.$transaction([
    db.$executeRaw`SET LOCAL hnsw.iterative_scan = relaxed_order`,
    db.$queryRaw<ConceptNeighbor[]>`
      SELECT * FROM (
        SELECT "id", "name", "definition", 1 - ("embedding" <=> ${literal}::halfvec) AS "similarity"
        FROM "concept"
        WHERE "userId" = ${options.userId} AND "embedding" IS NOT NULL AND NOT ("id" = ANY(${exclude}::text[]))
        ORDER BY "embedding" <=> ${literal}::halfvec
        LIMIT ${Math.min(100, (options.limit ?? 8) * 4)}
      ) AS nearest
      WHERE "similarity" >= ${options.minSimilarity ?? -1} AND "similarity" <= ${options.maxSimilarity ?? 1}
      ORDER BY "similarity" DESC
      LIMIT ${Math.min(25, options.limit ?? 8)}`,
  ]);
  return rows.map((row) => ({ ...row, similarity: Number(row.similarity) }));
}
