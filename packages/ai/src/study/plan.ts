import type { GenerationTask } from "./prompts";
import type { Extraction, StudyKindName } from "./schemas";

export type GroundedClaim = Extraction["claims"][number] & { chunkId: string; sectionIndex: number };
export type PlannedTask = GenerationTask & { sectionIndex: number; chunkIds: string[]; conceptNames: string[] };

/** Target question mix: over-produce ~1.5× the 40 kept per document (ADR-001 §5.5). */
export const MAX_CANDIDATES = 60;

const KINDS_FOR: Record<GroundedClaim["type"], StudyKindName[]> = {
  definition: ["cloze", "application"],
  cause_effect: ["cause_effect"],
  sequence: ["ordering"],
  comparison: ["compare"],
  property: ["error_spot", "cloze"],
  example: ["application"],
};

/**
 * Deterministic plan from grounded claims: every claim yields its natural question kinds,
 * sequences need ≥3 steps, and synthesis pairs claims from different sections that share a
 * concept. Kinds are interleaved so a cap never starves one kind.
 */
export function planQuestions(claims: readonly GroundedClaim[], max = MAX_CANDIDATES): PlannedTask[] {
  const byKind = new Map<StudyKindName, PlannedTask[]>();
  const add = (task: PlannedTask) => byKind.set(task.kind, [...(byKind.get(task.kind) ?? []), task]);
  for (const claim of claims) {
    for (const kind of KINDS_FOR[claim.type]) {
      if (kind === "ordering" && (claim.steps?.length ?? 0) < 3) continue;
      add({ kind, focus: claim.text, sectionIndex: claim.sectionIndex, chunkIds: [claim.chunkId], conceptNames: claim.concepts });
    }
  }
  const seenPairs = new Set<string>();
  for (const a of claims) {
    for (const b of claims) {
      if (a.sectionIndex >= b.sectionIndex) continue;
      const shared = a.concepts.find((name) => b.concepts.some((other) => other.toLocaleLowerCase() === name.toLocaleLowerCase()));
      const key = `${a.chunkId}|${b.chunkId}`;
      if (!shared || seenPairs.has(key)) continue;
      seenPairs.add(key);
      add({ kind: "synthesis", focus: `Connect: “${a.text}” with “${b.text}”`, sectionIndex: a.sectionIndex, chunkIds: [a.chunkId, b.chunkId], conceptNames: [...new Set([...a.concepts, ...b.concepts])] });
    }
  }
  const queues = [...byKind.values()];
  const plan: PlannedTask[] = [];
  while (plan.length < max && queues.some((queue) => queue.length)) {
    for (const queue of queues) {
      const task = queue.shift();
      if (task) plan.push(task);
      if (plan.length === max) break;
    }
  }
  return plan;
}

/** Balanced final selection: best-scored first, round-robin across kinds, capped per document. */
export function selectBalanced<T extends { kind: string; score: number }>(items: readonly T[], cap = 40): T[] {
  const byKind = new Map<string, T[]>();
  for (const item of [...items].sort((a, b) => b.score - a.score)) byKind.set(item.kind, [...(byKind.get(item.kind) ?? []), item]);
  const selected: T[] = [];
  const queues = [...byKind.values()];
  while (selected.length < cap && queues.some((queue) => queue.length)) {
    for (const queue of queues) {
      const item = queue.shift();
      if (item) selected.push(item);
      if (selected.length === cap) break;
    }
  }
  return selected;
}
