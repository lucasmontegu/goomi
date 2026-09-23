import { describe, expect, test } from "bun:test";
import { DEFAULT_PROFILE, SLEEP_CHALLENGE, STARTER_CHALLENGES, WORK_CHALLENGE } from "./content";
import { createInitialLearningState, DAY_MS, evaluateAnswer, getProgress, recordAnswer, selectChallenges } from "./engine";
import { extractStudyMaterial } from "./study";
import type { Challenge, LearningState } from "./types";

const now = new Date(2026, 8, 23, 12).getTime();
const question = STARTER_CHALLENGES.find((item) => item.id === "space-venus")!;
const answerFor = (challenge: Challenge) => {
  if ("choices" in challenge) return challenge.correctChoiceId;
  if (challenge.type === "fill-blank") return challenge.acceptedAnswers[0]!;
  if (challenge.type === "sequence" || challenge.type === "historical-order") return challenge.correctOrder;
  if (challenge.type === "matching") return Object.fromEntries(challenge.pairs.map(({ left, right }) => [left.id, right.id]));
  return "";
};

describe("honest learning metrics", () => {
  test("a new account has no invented learning or retention", () => {
    expect(getProgress(createInitialLearningState(), now)).toMatchObject({ thingsLearned: 0, stillRemembered: 0, retentionPercent: null, mastered: 0, streak: 0, todayCompleted: 0, knowledgeThisWeek: 0 });
  });
  test("a first correct answer is learned, but is not delayed retention evidence", () => {
    const state = recordAnswer(createInitialLearningState(), question, answerFor(question), now);
    expect(getProgress(state, now)).toMatchObject({ thingsLearned: 1, retentionPercent: null, stillRemembered: 0, todayCompleted: 1, streak: 1 });
    expect(state.memories[question.conceptId]!.dueAt).toBe(now + DAY_MS);
  });
  test("failed learning is not marked learned and returns in ten minutes", () => {
    const state = recordAnswer(createInitialLearningState(), question, "wrong", now);
    expect(state.memories[question.conceptId]!.dueAt).toBe(now + 600_000);
    expect(getProgress(state, now).thingsLearned).toBe(0);
  });
  test("due success builds retention and mastery only across spaced reviews", () => {
    let state = recordAnswer(createInitialLearningState(), question, answerFor(question), now);
    state = recordAnswer(state, question, answerFor(question), now + DAY_MS);
    expect(getProgress(state, now + DAY_MS)).toMatchObject({ retentionPercent: 100, stillRemembered: 1, mastered: 0 });
    state = recordAnswer(state, question, answerFor(question), now + 4 * DAY_MS);
    expect(getProgress(state, now + 4 * DAY_MS).mastered).toBe(1);
    expect(state.memories[question.conceptId]!.intervalDays).toBe(7);
  });
  test("rapid repeated practice cannot inflate mastery or extend the due date", () => {
    let state = recordAnswer(createInitialLearningState(), question, answerFor(question), now);
    for (let index = 1; index <= 10; index++) state = recordAnswer(state, question, answerFor(question), now + index);
    expect(getProgress(state, now + 10)).toMatchObject({ mastered: 0, retentionPercent: null, thingsLearned: 1 });
    expect(state.memories[question.conceptId]!.dueAt).toBe(now + DAY_MS);
    expect(state.memories[question.conceptId]!.consecutiveCorrect).toBe(1);
  });
  test("a missed due review lowers retention and resets the success run", () => {
    let state = recordAnswer(createInitialLearningState(), question, answerFor(question), now);
    state = recordAnswer(state, question, "wrong", now + DAY_MS);
    expect(getProgress(state, now + DAY_MS)).toMatchObject({ thingsLearned: 1, stillRemembered: 0, retentionPercent: 0, mastered: 0 });
    expect(state.memories[question.conceptId]!.consecutiveCorrect).toBe(0);
  });
  test("the same submission cannot count twice", () => {
    const state = recordAnswer(createInitialLearningState(), question, answerFor(question), now, "submission-1");
    expect(recordAnswer(state, question, answerFor(question), now + 1000, "submission-1")).toBe(state);
  });
  test("sleep and intention prompts never inflate knowledge", () => {
    let state = recordAnswer(createInitialLearningState(), SLEEP_CHALLENGE, "done", now);
    state = recordAnswer(state, WORK_CHALLENGE, "done", now + 1);
    expect(getProgress(state, now + 1)).toMatchObject({ thingsLearned: 0, totalAnswers: 0, todayCompleted: 0, retentionPercent: null });
    expect(state.history.length).toBe(2);
  });
  test("streak persists through today and expires after a missed calendar day", () => {
    const state = recordAnswer(createInitialLearningState(), question, answerFor(question), now);
    expect(getProgress(state, now + DAY_MS).streak).toBe(1);
    expect(getProgress(state, now + 2 * DAY_MS).streak).toBe(0);
  });
});

describe("finite personalized sessions", () => {
  test("every starter answer evaluates correctly and IDs are unique", () => {
    expect(new Set(STARTER_CHALLENGES.map((item) => item.id)).size).toBe(STARTER_CHALLENGES.length);
    for (const challenge of STARTER_CHALLENGES) {
      expect(evaluateAnswer(challenge, answerFor(challenge)).correct).toBe(true);
      expect(evaluateAnswer(challenge, "not-an-answer").correct).toBe(false);
    }
  });
  test("due concepts take priority over a new interested topic", () => {
    const state = recordAnswer(createInitialLearningState(), question, "wrong", now);
    expect(selectChallenges(state, { ...DEFAULT_PROFILE, interests: ["art"] }, { now: now + 600_000, limit: 1 })[0]!.id).toBe(question.id);
  });
  test("the session is bounded and respects topic/language preferences", () => {
    const empty = createInitialLearningState();
    const queue = selectChallenges(empty, DEFAULT_PROFILE, { now, limit: 3, topicId: "logic" });
    expect(queue.length).toBe(3);
    expect(queue.every((item) => item.topicId === "logic")).toBe(true);
    expect(selectChallenges(empty, { ...DEFAULT_PROFILE, learningLanguages: [] }, { now, topicId: "languages" })).toEqual([]);
  });
  test("a completed finite topic ends instead of endlessly recycling", () => {
    let state = createInitialLearningState();
    for (const challenge of STARTER_CHALLENGES.filter((item) => item.topicId === "logic")) state = recordAnswer(state, challenge, answerFor(challenge), now);
    expect(selectChallenges(state, DEFAULT_PROFILE, { now, topicId: "logic" })).toEqual([]);
    expect(selectChallenges(state, DEFAULT_PROFILE, { now, topicId: "logic", practice: true }).length).toBe(3);
  });
  test("study stays empty until actual material is added", () => {
    expect(selectChallenges(createInitialLearningState(), DEFAULT_PROFILE, { mode: "study", now })).toEqual([]);
  });
  test("matching rejects partial and extra mappings; sequences reject duplicates", () => {
    const matching = STARTER_CHALLENGES.find((item) => item.type === "matching")!;
    expect(evaluateAnswer(matching, { hola: "hello" }).correct).toBe(false);
    expect(evaluateAnswer(matching, { hola: "hello", gracias: "thanks", agua: "water", extra: "oops" }).correct).toBe(false);
    const sequence = STARTER_CHALLENGES.find((item) => item.type === "sequence")!;
    expect(evaluateAnswer(sequence, ["mercury", "venus", "earth", "earth"]).correct).toBe(false);
  });
  test("micro sudoku is internally consistent", () => {
    const challenge = STARTER_CHALLENGES.find((item) => item.type === "micro-sudoku")!;
    if (challenge.type !== "micro-sudoku") throw new Error("Missing sudoku");
    const answer = Number(challenge.choices.find((item) => item.id === challenge.correctChoiceId)!.label);
    const grid = challenge.grid.map((cell) => cell || answer);
    const valid = (cells: number[]) => [...cells].sort().join("") === "1234";
    for (let row = 0; row < 4; row++) expect(valid(grid.slice(row * 4, row * 4 + 4))).toBe(true);
    for (let column = 0; column < 4; column++) expect(valid([grid[column]!, grid[column + 4]!, grid[column + 8]!, grid[column + 12]!])).toBe(true);
    for (const start of [0, 2, 8, 10]) expect(valid([grid[start]!, grid[start + 1]!, grid[start + 4]!, grid[start + 5]!])).toBe(true);
  });
});

describe("private extractive study material", () => {
  test("creates source-linked recall without inventing information", () => {
    const text = "Photosynthesis is the process plants use to turn light into chemical energy.\nMitosis: division of a cell into two daughter cells.";
    const material = extractStudyMaterial("Biology notes", text, now);
    expect(material.status).toBe("ready");
    expect(material.concepts.map((concept) => concept.term)).toEqual(["Photosynthesis", "Mitosis"]);
    expect(material.challenges[0]!.source?.excerpt).toBe("Photosynthesis is the process plants use to turn light into chemical energy.");
    expect(material.challenges[1]!.source?.paragraph).toBe(2);
    expect(evaluateAnswer(material.challenges[0]!, "  PHOTOSYNTHESIS  ").correct).toBe(true);
    const state: LearningState = { ...createInitialLearningState(), materials: [material] };
    expect(selectChallenges(state, DEFAULT_PROFILE, { now, mode: "study" }).length).toBe(2);
  });
  test("empty and unstructured text remains an honest empty state", () => {
    expect(extractStudyMaterial("", "", now).status).toBe("no-concepts");
    expect(extractStudyMaterial("Notes", "Buy bread. Call a friend.", now).challenges).toEqual([]);
  });
  test("deduplicates definitions and skips ambiguous pronouns", () => {
    const material = extractStudyMaterial("Notes", "It is something without a clear subject.\nGravity is an attractive interaction between masses.\nGravity is the same term being repeated.", now);
    expect(material.concepts.length).toBe(1);
    expect(material.concepts[0]!.term).toBe("Gravity");
  });
});
