import { describe, expect, test } from "bun:test";
import { licenseProblem } from "../src/attribution";
import { unsupportedNumbers, validateChallenge } from "../src/validate";

const base = {
  id: "t1", conceptId: "c1", topicId: "geography", title: "Test", prompt: "Which one?", explanation: "Because.",
  memoryTip: "Remember it.", difficulty: "gentle", durationSeconds: 20,
} as const;
const messages = (input: unknown) => validateChallenge(input).issues.map((issue) => `${issue.path}: ${issue.message}`);

describe("validateChallenge", () => {
  test("accepts a well-formed choice challenge", () => {
    expect(messages({ ...base, type: "multiple-choice", choices: [{ id: "0", label: "A" }, { id: "1", label: "B" }], correctChoiceId: "1" })).toEqual([]);
  });
  test("rejects a missing correct answer and duplicate labels", () => {
    const issues = messages({ ...base, type: "multiple-choice", choices: [{ id: "0", label: "Lima" }, { id: "1", label: " lima " }], correctChoiceId: "9" });
    expect(issues).toContain("choices: labels are not unique");
    expect(issues).toContain("correctChoiceId: is not one of the choices");
  });
  test("rejects unfilled template placeholders", () => {
    expect(messages({ ...base, prompt: "What is the capital of {country}?", type: "true-false", choices: [{ id: "t", label: "True" }, { id: "f", label: "False" }], correctChoiceId: "t" })).toContain("prompt: contains an unfilled placeholder or stringified empty value");
  });
  test("rejects a cloze whose prompt gives the answer away", () => {
    expect(messages({ ...base, type: "fill-blank", prompt: "Photosynthesis turns light into energy. Name the process: ____", acceptedAnswers: ["photosynthesis"], answerLabel: "Photosynthesis" })).toContain("prompt: reveals the answer “photosynthesis”");
  });
  test("rejects sequences that are pre-sorted or reuse items", () => {
    const items = [{ id: "a", label: "A" }, { id: "b", label: "B" }];
    expect(messages({ ...base, type: "sequence", items, correctOrder: ["a", "b"] })).toContain("items: are already shown in the correct order");
    expect(messages({ ...base, type: "sequence", items, correctOrder: ["b", "b"] })).toContain("correctOrder: must use each item exactly once");
  });
  test("requires remote images to be declared for caching", () => {
    expect(messages({ ...base, type: "image-identification", imageAsset: "https://example.com/a.png", imageDescription: "flag", choices: [{ id: "0", label: "A" }, { id: "1", label: "B" }], correctChoiceId: "0" })).toContain("imageAsset: remote media must also be declared as imageUrl so the device can cache it");
  });
  test("reports schema errors instead of throwing", () => {
    expect(validateChallenge({ ...base, type: "mystery" }).challenge).toBeNull();
  });
});

describe("licenses and grounding guards", () => {
  const attribution = { sourceId: "wikidata" as const, sourceItemId: "Q1", sourceUrl: "https://www.wikidata.org/wiki/Q1", sourceTitle: "Wikidata", attributionRequired: false, restrictions: [], retrievedAt: "2026-09-23" };
  test("share-alike licenses are never publishable", () => {
    expect(licenseProblem({ ...attribution, dataLicense: "CC-BY-SA-4.0" })).toBe("data license CC-BY-SA-4.0 is not allowed");
    expect(licenseProblem({ ...attribution, dataLicense: "CC0-1.0" })).toBeNull();
    expect(licenseProblem({ ...attribution, dataLicense: "CC0-1.0", mediaUrl: "https://x.org/a.jpg" })).toBe("media license missing");
  });
  test("flags numbers in generated prose that the facts don't contain", () => {
    expect(unsupportedNumbers("Built in 1889, about 330 m tall.", "year 1889")).toEqual(["330"]);
    expect(unsupportedNumbers("Area: 2,780,400 km²", "areaKm2 2780400")).toEqual([]);
  });
});
