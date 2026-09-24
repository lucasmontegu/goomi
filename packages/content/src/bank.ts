import type { Attribution } from "./attribution";
import { toChallengeSource } from "./attribution";
import type { Lang } from "./i18n";
import { LANGS } from "./i18n";
import { hashString, normalizeLabel, seededRandom, shuffle } from "./random";
import type { Challenge, Choice, Difficulty, TopicId } from "./schema";

/** A language-independent bank item with one fully written challenge per language it supports. */
export type BankDraft = {
  id: string;
  templateId: string;
  topicId: TopicId;
  type: Challenge["type"];
  difficulty: Difficulty;
  conceptKey: string;
  factIds: string[];
  attribution: Attribution;
  media?: { url: string; license: string };
  locales: Partial<Record<Lang, Challenge>>;
};

export type GeneratorOptions = {
  langs?: readonly Lang[];
  /** Upper bound on drafts per template run. */
  limit?: number;
};

/** Stable across rebuilds: the same template over the same facts yields the same id. */
export const bankItemId = (templateId: string, factIds: readonly string[]) =>
  `bank-${templateId}-${hashString([...factIds].sort().join("|")).toString(36)}`;

export const langsOf = (options?: GeneratorOptions) => options?.langs ?? LANGS;

/**
 * Picks `count` distractors from a same-class pool. `isAlsoCorrect` removes candidates that
 * would make the question ambiguous; duplicate labels (after normalization) are never offered.
 */
export function pickDistractors<T>(pool: readonly T[], correct: T, count: number, labelOf: (item: T) => string | undefined, seed: string, isAlsoCorrect: (item: T) => boolean = () => false): T[] | null {
  const correctLabel = labelOf(correct);
  if (!correctLabel) return null;
  const seen = new Set([normalizeLabel(correctLabel)]);
  const picked: T[] = [];
  for (const candidate of shuffle(pool, seededRandom(seed))) {
    if (candidate === correct || isAlsoCorrect(candidate)) continue;
    const candidateLabel = labelOf(candidate);
    if (!candidateLabel) continue;
    const key = normalizeLabel(candidateLabel);
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push(candidate);
    if (picked.length === count) return picked;
  }
  return null;
}

/** Shuffles labels into choices; returns the id of the correct one. */
export function toChoices(correctLabel: string, distractorLabels: readonly string[], seed: string): { choices: Choice[]; correctChoiceId: string } {
  const labels = shuffle([correctLabel, ...distractorLabels], seededRandom(`${seed}:order`));
  const choices = labels.map((label, index) => ({ id: String(index), label }));
  return { choices, correctChoiceId: String(labels.indexOf(correctLabel)) };
}

export function baseFields(draft: Pick<BankDraft, "id" | "topicId" | "difficulty" | "conceptKey" | "attribution">, lang: Lang, durationSeconds: number) {
  return {
    id: `${draft.id}:${lang}`,
    conceptId: draft.conceptKey,
    topicId: draft.topicId,
    difficulty: draft.difficulty,
    durationSeconds,
    source: toChallengeSource(draft.attribution),
    locale: lang,
    origin: "bank" as const,
    version: 1,
  };
}

/** Notability tiers → difficulty. Thresholds are Wikidata sitelink counts. */
export const difficultyFromSitelinks = (sitelinks: number): Difficulty => (sitelinks >= 200 ? "gentle" : sitelinks >= 120 ? "curious" : "deep");
