import { describe, expect, test } from "bun:test";
import { DEFAULT_PROFILE, STARTER_CHALLENGES, createInitialLearningState, recordAnswer } from "./index";
import { continuePaths, topicPath } from "./paths";

describe("topic paths", () => {
  test("a fresh learner has finite paths with nothing learned", () => {
    const state = createInitialLearningState();
    const path = topicPath(state, "geography");
    expect(path.total).toBeGreaterThan(0);
    expect(path.learned).toBe(0);
    expect(path.due).toBe(0);
  });

  test("a correct answer moves exactly one concept into learned", () => {
    const challenge = STARTER_CHALLENGES.find((item) => item.topicId === "geography" && "correctChoiceId" in item)!;
    const answer = "correctChoiceId" in challenge ? challenge.correctChoiceId : "";
    const state = recordAnswer(createInitialLearningState(), challenge, answer, Date.now());
    expect(topicPath(state, "geography").learned).toBe(1);
  });

  test("continue paths never include study/focus or empty topics, and rank interests first", () => {
    const paths = continuePaths(createInitialLearningState(), { ...DEFAULT_PROFILE, interests: ["art"] });
    expect(paths.some((path) => path.topicId === "study" || path.topicId === "focus")).toBe(false);
    expect(paths.every((path) => path.total > 0)).toBe(true);
    expect(paths[0]!.topicId).toBe("art");
  });
});
