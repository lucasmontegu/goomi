import { describe, expect, test } from "bun:test";
import { BANK_CAP, EMPTY_BANK, aiMaterial, applyBankPage, bankLangFor, isPlayableOffline } from "./bank";
import { DEFAULT_PROFILE } from "./content";
import { createInitialLearningState, selectChallenges } from "./engine";
import type { Challenge, ConceptMemory } from "./types";

const choice = (id: string, extra: Partial<Challenge> = {}): Challenge => ({
  id, conceptId: `concept-${id}`, topicId: "geography", type: "geography", title: "Capital cities", prompt: `Question ${id}?`,
  explanation: "Because.", memoryTip: "Remember.", difficulty: "curious", durationSeconds: 20, origin: "bank", locale: "es",
  choices: [{ id: "0", label: "A" }, { id: "1", label: "B" }], correctChoiceId: "0", ...extra,
} as Challenge);
const flag = (id: string, imageAsset: string): Challenge => ({ ...choice(id), type: "image-identification", imageAsset, imageUrl: "https://flagcdn.com/w320/ar.png", imageDescription: "A flag" } as Challenge);

describe("bank cache", () => {
  test("pages merge: new items append, changed items replace, retired items leave", () => {
    const first = applyBankPage(EMPTY_BANK, { lang: "es", items: [choice("a"), choice("b")], retired: [], cursor: "2" }, {}, 1);
    const second = applyBankPage(first, { lang: "es", items: [choice("b", { prompt: "Updated?" }), choice("c")], retired: ["a"], cursor: "5" }, {}, 2);
    expect(second.items.map((item) => item.id)).toEqual(["b", "c"]);
    expect(second.items[0]!.prompt).toBe("Updated?");
    expect(second).toMatchObject({ cursor: "5", lang: "es", syncedAt: 2 });
  });

  test("switching language starts a fresh cache", () => {
    const spanish = applyBankPage(EMPTY_BANK, { lang: "es", items: [choice("a")], retired: [], cursor: "9" }, {}, 1);
    const english = applyBankPage(spanish, { lang: "en", items: [choice("z")], retired: [], cursor: "3" }, {}, 2);
    expect(english.items.map((item) => item.id)).toEqual(["z"]);
  });

  test("the cap evicts the oldest items but never one that is due for review", () => {
    const items = Array.from({ length: BANK_CAP + 5 }, (_, index) => choice(`i${index}`));
    const due: Record<string, ConceptMemory> = { "concept-i0": { conceptId: "concept-i0", topicId: "geography", attempts: 1, correct: 1, consecutiveCorrect: 1, intervalDays: 1, ease: 2.3, dueAt: 0, lastReviewedAt: 0, firstLearnedAt: 0 } };
    const bank = applyBankPage(EMPTY_BANK, { lang: "es", items, retired: [], cursor: "1" }, due, 10);
    expect(bank.items).toHaveLength(BANK_CAP);
    expect(bank.items[0]!.id).toBe("i0");
    expect(bank.items.some((item) => item.id === "i1")).toBe(false);
  });

  test("an image not yet downloaded is never playable mid-interruption", () => {
    expect(isPlayableOffline(flag("f1", "https://flagcdn.com/w320/ar.png"))).toBe(false);
    expect(isPlayableOffline(flag("f2", "file:///var/mobile/Containers/Data/goomi-media/ar.png"))).toBe(true);
    const state = createInitialLearningState();
    const picked = selectChallenges(state, { ...DEFAULT_PROFILE, interests: ["geography"] }, { mode: "free", limit: 10, practice: true, bank: [flag("remote", "https://x.org/a.png"), flag("local", "file:///a.png"), choice("plain")] });
    const ids = picked.map((challenge) => challenge.id);
    expect(ids).not.toContain("remote");
    expect(ids).toContain("local");
  });

  test("language mapping from the profile", () => {
    expect([bankLangFor("Spanish"), bankLangFor("Español"), bankLangFor("Portuguese"), bankLangFor("English"), bankLangFor("Japanese")]).toEqual(["es", "es", "pt-BR", "en", "en"]);
  });
});

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
});
