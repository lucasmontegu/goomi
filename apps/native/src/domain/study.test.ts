import { describe, expect, test } from "bun:test";
import { evaluateAnswer } from "./engine";
import { extractStudyMaterial } from "./study";

describe("study extraction", () => {
  test("drops a leading article from the term but still accepts it", () => {
    const material = extractStudyMaterial("Chem", "An atom is the smallest unit of a chemical element.");
    expect(material.concepts[0]!.term).toBe("atom");
    const challenge = material.challenges[0]!;
    expect(evaluateAnswer(challenge, "atom").correct).toBe(true);
    expect(evaluateAnswer(challenge, "An atom").correct).toBe(true);
  });
  test("keeps terms without an article unchanged", () => {
    const material = extractStudyMaterial("Bio", "Osmosis is the movement of water across a membrane.");
    expect(material.concepts[0]!.term).toBe("Osmosis");
  });
});
