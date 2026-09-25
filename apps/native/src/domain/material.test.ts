import { describe, expect, test } from "bun:test";
import { DEFAULT_PROFILE } from "./content";
import { createInitialLearningState, selectChallenges } from "./engine";
import { aiMaterial, conceptCount, goneMaterial, studyPhase } from "./material";
import type { Challenge } from "./types";

const choice = (id: string, extra: Partial<Challenge> = {}): Challenge => ({
  id, conceptId: `concept-${id}`, topicId: "geography", type: "geography", title: "Capital cities", prompt: `Question ${id}?`,
  explanation: "Because.", memoryTip: "Remember.", difficulty: "curious", durationSeconds: 20, origin: "bank", locale: "es",
  choices: [{ id: "0", label: "A" }, { id: "1", label: "B" }], correctChoiceId: "0", ...extra,
} as Challenge);
describe("AI materials", () => {
  const previous = { id: "ai-local", kind: "pdf" as const, createdAt: 1, text: "" };
  test("processing, ready and failed states map to the library", () => {
    const progress = { stage: "generate", step: 5, total: 7 };
    expect(aiMaterial({ id: "m1", title: "Bio", status: "processing", lang: "es", error: null, progress }, previous)).toMatchObject({ status: "processing", remoteId: "m1", processingMethod: "ai", progress, challenges: [] });
    const ready = aiMaterial({ id: "m1", title: "Bio", status: "ready", lang: "es", error: null, progress, challenges: [choice("q1", { topicId: "study" })] }, previous);
    expect(ready).toMatchObject({ status: "ready", id: "ai-local" });
    expect(ready.challenges).toHaveLength(1);
    expect(aiMaterial({ id: "m1", title: "Bio", status: "failed", lang: "es", error: "no_questions", progress }, previous).message).toContain("enough to ask about");
  });

  test("ready AI questions join the study pool; processing ones don't", () => {
    const state = createInitialLearningState();
    const ready = aiMaterial({ id: "m1", title: "Bio", status: "ready", lang: "es", error: null, progress: { stage: "publish", step: 7, total: 7 }, challenges: [choice("q1", { topicId: "study", origin: "study-ai" })] }, previous);
    const pending = aiMaterial({ id: "m2", title: "Chem", status: "processing", lang: "es", error: null, progress: { stage: "embed", step: 2, total: 7 } }, { ...previous, id: "ai-2" });
    const picked = selectChallenges({ ...state, materials: [ready, pending] }, DEFAULT_PROFILE, { mode: "study", limit: 5 });
    expect(picked.map((challenge) => challenge.id)).toEqual(["q1"]);
  });

  test("unknown server error codes fall back; a vanished material settles as failed", () => {
    const progress = { stage: "queued", step: 0, total: 7 };
    expect(aiMaterial({ id: "m1", title: "Bio", status: "failed", lang: null, error: "something_new", progress }, previous).message).toContain("went wrong");
    const processing = aiMaterial({ id: "m1", title: "Bio", status: "processing", lang: null, error: null, progress }, previous);
    expect(goneMaterial(processing)).toMatchObject({ status: "failed", remoteId: "m1", challenges: [] });
  });

  test("server stages map onto the four visible phases in order", () => {
    expect(["uploaded", "queued", "structure", "embed", "extract", "link", "generate", "judge", "publish"].map((stage) => studyPhase({ stage }))).toEqual([0, 0, 0, 0, 1, 1, 2, 3, 3]);
    expect(studyPhase(undefined)).toBe(0);
  });

  test("AI materials count their question concepts, not extracted definitions", () => {
    const progress = { stage: "publish", step: 7, total: 7 };
    const ready = aiMaterial({ id: "m1", title: "Bio", status: "ready", lang: "es", error: null, progress, challenges: [choice("q1", { conceptId: "c1" }), choice("q2", { conceptId: "c1" }), choice("q3", { conceptId: "c2" })] }, previous);
    expect(conceptCount(ready)).toBe(2);
    expect(conceptCount({ ...ready, status: "processing" })).toBe(0);
  });
});
