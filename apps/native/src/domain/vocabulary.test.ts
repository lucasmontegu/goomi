import { describe, expect, test } from "bun:test";
import { challengeSchema, seededRandom } from "@goomi/content";
import { DEFAULT_PROFILE } from "./content";
import { DAY_MS, createInitialLearningState, evaluateAnswer, recordAnswer, selectChallenges, targetDifficulty } from "./engine";
import { extractStudyMaterial } from "./study";
import type { Challenge, LearningState } from "./types";
import { parseVocabulary, toneVariants, toneless } from "./vocabulary";

const seededToneVariants = (reading: string, seed: string) => toneVariants(reading, 3, seededRandom(seed));

const CHINESE = `HSK 1 · Lección 2
1. 你好 (nǐ hǎo) – hola
2. 谢谢 xièxie – gracias
3. 再见 | zàijiàn | adiós
4. 水	shuǐ	agua
5. 茶 chá té
6. 猫：gato`;

const ENGLISH = `apple - manzana
to run - correr
the house = la casa
blue: azul
Remember to review chapter 3 before the exam on Friday.`;

describe("parsing word lists", () => {
  test("reads Chinese lines in the common layouts, with or without pinyin", () => {
    const vocabulary = parseVocabulary(CHINESE)!;
    expect(vocabulary.language).toBe("Chinese");
    expect(vocabulary.entries.map(({ term, reading, meaning }) => [term, reading, meaning])).toEqual([
      ["你好", "nǐ hǎo", "hola"],
      ["谢谢", "xièxie", "gracias"],
      ["再见", "zàijiàn", "adiós"],
      ["水", "shuǐ", "agua"],
      ["茶", "chá", "té"],
      ["猫", undefined, "gato"],
    ]);
  });

  test("keeps Spanish accents in the meaning instead of mistaking them for tones", () => {
    const entry = parseVocabulary(`你好 nǐ hǎo – hola\n谢谢 – gracias\n对 duì – está bien\n水 – agua`)!.entries[2]!;
    expect(entry).toMatchObject({ term: "对", reading: "duì", meaning: "está bien" });
  });

  test("Latin lists need the language being learned and tolerate a stray sentence", () => {
    expect(parseVocabulary(ENGLISH)).toBeNull();
    const vocabulary = parseVocabulary(ENGLISH, "English")!;
    expect(vocabulary.language).toBe("English");
    expect(vocabulary.entries.map((entry) => entry.term)).toEqual(["apple", "to run", "the house", "blue"]);
  });

  test("prose with a couple of colons is not a word list", () => {
    const notes = "Photosynthesis: the process plants use to turn light into chemical energy.\nIt happens in the chloroplast, mostly in the leaves.\nKey idea: light becomes sugar.\nThe Calvin cycle fixes carbon dioxide into sugar molecules.";
    expect(parseVocabulary(notes, "English")).toBeNull();
  });
});

describe("the ladder", () => {
  const material = extractStudyMaterial("HSK 1", CHINESE, { now: 1 });
  const byConcept = (conceptId: string) => material.challenges.filter((challenge) => challenge.conceptId === conceptId);

  test("a word list becomes a vocabulary material with one concept per word", () => {
    expect(material.status).toBe("ready");
    expect(material.vocabulary).toEqual({ language: "Chinese" });
    expect(material.concepts.map((concept) => concept.term)).toContain("你好 (nǐ hǎo)");
    expect(material.concepts[0]!.paragraph).toBe(2);
  });

  test("every word gets gentle, curious and deep prompts that pass the shared schema", () => {
    for (const concept of material.concepts) {
      const rungs = new Set(byConcept(concept.id).map((challenge) => challenge.difficulty));
      expect([...rungs].sort()).toEqual(["curious", "deep", "gentle"]);
    }
    for (const challenge of material.challenges) expect(challengeSchema.safeParse(challenge).success).toBe(true);
  });

  test("the reading prompt offers the same syllables with a different tone", () => {
    const reading = byConcept(material.concepts[0]!.id).find((challenge) => challenge.id.endsWith("-reading"))! as Extract<Challenge, { choices: unknown }>;
    const labels = reading.choices.map((choice) => choice.label);
    expect(labels).toContain("nǐ hǎo");
    expect(new Set(labels.map(toneless))).toEqual(new Set(["ni hao"]));
    expect(new Set(labels).size).toBe(4);
  });

  test("typing accepts characters, toned or plain pinyin and tone numbers", () => {
    const recall = byConcept(material.concepts[0]!.id).find((challenge) => challenge.type === "fill-blank")!;
    for (const answer of ["你好", "nǐ hǎo", "ni hao", "nihao", "ni3 hao3"]) expect(evaluateAnswer(recall, answer).correct).toBe(true);
    expect(evaluateAnswer(recall, "谢谢").correct).toBe(false);
  });

  test("English recall accepts the word with or without its article", () => {
    const english = extractStudyMaterial("Words", ENGLISH, { languageHint: "English" });
    const recall = english.challenges.find((challenge) => challenge.type === "fill-blank" && challenge.acceptedAnswers.includes("to run"))!;
    expect(evaluateAnswer(recall, "run").correct).toBe(true);
    expect(evaluateAnswer(recall, "To run").correct).toBe(true);
  });

  test("tone variants are deterministic per seed and never repeat the answer", () => {
    const variants = seededToneVariants("nǐ hǎo", "seed");
    expect(variants).toEqual(seededToneVariants("nǐ hǎo", "seed"));
    expect(variants).not.toContain("nǐ hǎo");
    expect(variants).toHaveLength(3);
  });
});

describe("choosing the rung", () => {
  const material = extractStudyMaterial("HSK 1", CHINESE, { now: 1 });
  const base: LearningState = { ...createInitialLearningState(), materials: [material] };
  const profile = { ...DEFAULT_PROFILE, level: "gentle" as const };
  const word = material.concepts[0]!.id;
  const shown = (state: LearningState, now: number) => selectChallenges(state, profile, { mode: "study", now, limit: 10 }).find((challenge) => challenge.conceptId === word);
  const correct = (challenge: Challenge) => ("correctChoiceId" in challenge ? challenge.correctChoiceId : "acceptedAnswers" in challenge ? challenge.acceptedAnswers[0]! : "");

  test("a new word starts at the learner's level and is never deep cold", () => {
    expect(targetDifficulty(undefined, "gentle")).toBe("gentle");
    expect(targetDifficulty(undefined, "deep")).toBe("curious");
    expect(shown(base, 1)!.difficulty).toBe("gentle");
  });

  test("right answers on due reviews climb the ladder and a miss drops it back", () => {
    let now = 1;
    let state = base;
    const first = shown(state, now)!;
    state = recordAnswer(state, first, correct(first), now);
    now += 1.5 * DAY_MS;
    const second = shown(state, now)!;
    expect(second.difficulty).toBe("curious");
    state = recordAnswer(state, second, correct(second), now);
    now += 4 * DAY_MS;
    const third = shown(state, now)!;
    expect(third.difficulty).toBe("deep");
    state = recordAnswer(state, third, "wrong", now);
    now += DAY_MS;
    expect(shown(state, now)!.difficulty).toBe("gentle");
  });
});
