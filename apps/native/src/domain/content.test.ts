import { describe, expect, test } from "bun:test";
import { STARTER_CHALLENGES, TOPICS } from "./content";
import type { TopicId } from "./types";

const NEW_TOPICS: TopicId[] = ["technology", "psychology", "business", "popculture", "philosophy"];

describe("starter library integrity", () => {
  test("each new interest topic is listed and has at least three challenges", () => {
    for (const topicId of NEW_TOPICS) {
      expect(TOPICS.some((topic) => topic.id === topicId)).toBe(true);
      expect(STARTER_CHALLENGES.filter((challenge) => challenge.topicId === topicId).length).toBeGreaterThanOrEqual(3);
    }
  });

  test("every challenge id is unique", () => {
    const ids = STARTER_CHALLENGES.map((challenge) => challenge.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("every choice challenge's correct answer is one of its choices, with unique choice ids", () => {
    for (const challenge of STARTER_CHALLENGES) {
      if (!("choices" in challenge)) continue;
      const choiceIds = challenge.choices.map((choice) => choice.id);
      expect(new Set(choiceIds).size).toBe(choiceIds.length);
      expect(choiceIds).toContain(challenge.correctChoiceId);
    }
  });

  test("every sequence and timeline order uses exactly its own items", () => {
    for (const challenge of STARTER_CHALLENGES) {
      if (challenge.type !== "sequence" && challenge.type !== "historical-order") continue;
      expect([...challenge.correctOrder].sort()).toEqual(challenge.items.map((item) => item.id).sort());
      expect(new Set(challenge.correctOrder).size).toBe(challenge.correctOrder.length);
    }
  });

  test("matching pairs never reuse an id on either side", () => {
    for (const challenge of STARTER_CHALLENGES) {
      if (challenge.type !== "matching") continue;
      expect(new Set(challenge.pairs.map((pair) => pair.left.id)).size).toBe(challenge.pairs.length);
      expect(new Set(challenge.pairs.map((pair) => pair.right.id)).size).toBe(challenge.pairs.length);
    }
  });

  test("every new-topic challenge cites an https source and is fully written", () => {
    for (const challenge of STARTER_CHALLENGES.filter((item) => NEW_TOPICS.includes(item.topicId))) {
      expect(challenge.source?.title).toBeTruthy();
      expect(challenge.source?.url).toMatch(/^https:\/\/\S+$/);
      expect(challenge.explanation.length).toBeGreaterThan(0);
      expect(challenge.memoryTip.length).toBeGreaterThan(0);
      expect(challenge.durationSeconds).toBeGreaterThan(0);
    }
  });

  test("related concept ids point at concepts that exist", () => {
    const concepts = new Set(STARTER_CHALLENGES.map((challenge) => challenge.conceptId));
    for (const challenge of STARTER_CHALLENGES) for (const id of challenge.relatedConceptIds ?? []) expect(concepts.has(id)).toBe(true);
  });
});
