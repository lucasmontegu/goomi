import { describe, expect, test } from "bun:test";
import { groundExtraction, toStudyChallenge } from "../src/study/convert";
import { planQuestions, selectBalanced } from "../src/study/plan";
import type { Candidate } from "../src/study/schemas";

const chunks = [
  { id: "c0", sectionIndex: 0, paragraphStart: 2, text: "La mitocondria es el orgánulo que produce la energía de la célula. Usa glucosa y oxígeno." },
  { id: "c1", sectionIndex: 1, paragraphStart: 5, text: "La fotosíntesis ocurre en el cloroplasto y produce glucosa a partir de luz." },
];
const context = { materialId: "m1", materialTitle: "Biología", lang: "es" as const, chunks, conceptIds: ["k1", "k2"] };
const base: Candidate = {
  kind: "application", format: "choice", prompt: "Un atleta necesita más energía celular. ¿Qué orgánulo trabaja más?",
  options: ["Mitocondria", "Cloroplasto", "Ribosoma", "Vacuola"], correctIndex: 0, isTrue: null, answer: null, alternatives: null, steps: null, pairs: null,
  explanation: "Tus apuntes dicen que la mitocondria produce la energía de la célula.", memoryTip: "Mitocondria = central eléctrica.",
  chunks: [0], quote: "La mitocondria es el orgánulo que produce la energía de la célula.",
};

describe("toStudyChallenge", () => {
  test("choice → study-question with provenance and a shuffled key", () => {
    const result = toStudyChallenge(base, context);
    if (!result.ok) throw new Error(result.reasons.join());
    const { challenge } = result;
    expect(challenge.type).toBe("study-question");
    if (challenge.type !== "study-question") return;
    expect(challenge.choices.find((c) => c.id === challenge.correctChoiceId)?.label).toBe("Mitocondria");
    expect(challenge.source).toMatchObject({ materialId: "m1", chunkIds: ["c0"], paragraph: 2, excerpt: base.quote });
    expect(challenge).toMatchObject({ origin: "study-ai", locale: "es", topicId: "study", conceptId: "k1", relatedConceptIds: ["k2"], difficulty: "deep" });
    expect(toStudyChallenge(base, context)).toEqual(result); // deterministic
  });

  test("rejects a paraphrased 'quote' — every answer needs verbatim support", () => {
    const result = toStudyChallenge({ ...base, quote: "La mitocondria genera toda la energía del cuerpo." }, context);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reasons).toContain("quote is not verbatim from a cited chunk");
  });

  test("rejects citations to chunks that were not provided", () => {
    const result = toStudyChallenge({ ...base, chunks: [7] }, context);
    expect(result.ok).toBe(false);
  });

  test("cloze: blank must hide a term taken from the quote, and the prompt must not leak it", () => {
    const cloze: Candidate = { ...base, kind: "cloze", format: "cloze", prompt: "La ____ es el orgánulo que produce la energía de la célula.", options: null, correctIndex: null, answer: "mitocondria", alternatives: ["mitocondrias"] };
    const ok = toStudyChallenge(cloze, context);
    expect(ok.ok).toBe(true);
    if (ok.ok && ok.challenge.type === "fill-blank") expect(ok.challenge.acceptedAnswers).toEqual(["mitocondria", "mitocondrias"]);
    expect(toStudyChallenge({ ...cloze, answer: "ribosoma" }, context).ok).toBe(false);
    expect(toStudyChallenge({ ...cloze, prompt: "La mitocondria (____) produce energía." }, context).ok).toBe(false);
  });

  test("synthesis must span two sections", () => {
    const synthesis: Candidate = { ...base, kind: "synthesis" };
    expect(toStudyChallenge(synthesis, context).ok).toBe(false);
    expect(toStudyChallenge({ ...synthesis, chunks: [0, 1] }, context).ok).toBe(true);
  });

  test("order, match and true/false formats", () => {
    const order = toStudyChallenge({ ...base, kind: "ordering", format: "order", options: null, correctIndex: null, steps: ["Glucosa entra", "Se oxida", "Se libera energía"] }, context);
    expect(order.ok && order.challenge.type === "sequence" && order.challenge.items.map((i) => i.id).join() !== order.challenge.correctOrder.join()).toBe(true);
    const match = toStudyChallenge({ ...base, kind: "compare", format: "match", options: null, correctIndex: null, pairs: [{ left: "Mitocondria", right: "Energía" }, { left: "Cloroplasto", right: "Luz" }, { left: "Ribosoma", right: "Proteínas" }] }, context);
    expect(match.ok).toBe(true);
    const tf = toStudyChallenge({ ...base, kind: "error_spot", format: "true_false", prompt: "La mitocondria produce luz.", options: null, correctIndex: null, isTrue: false }, context);
    expect(tf.ok && tf.challenge.type === "true-false" && tf.challenge.choices.map((c) => c.label)).toEqual(["Verdadero", "Falso"]);
  });

  test("rejects content written in the wrong language", () => {
    const english: Candidate = { ...base, prompt: "An athlete needs more cellular energy, so which of the organelles in the cell is the one that works the hardest?", explanation: "The notes say that the mitochondria is the organelle that produces the energy of the cell and it is in all of the cells.", memoryTip: "It is the power plant of the cell." };
    const result = toStudyChallenge(english, context);
    expect(result.ok).toBe(false);
  });
});

describe("extraction grounding and planning", () => {
  test("drops concepts and claims without verbatim quotes", () => {
    const grounded = groundExtraction({
      concepts: [
        { name: "Mitocondria", definition: "Produce energía", chunk: 0, quote: "La mitocondria es el orgánulo que produce la energía de la célula." },
        { name: "Núcleo", definition: "Guarda ADN", chunk: 0, quote: "El núcleo guarda el ADN." },
      ],
      claims: [{ type: "definition", text: "La fotosíntesis ocurre en el cloroplasto", concepts: ["Fotosíntesis"], steps: null, chunk: 1, quote: "La fotosíntesis ocurre en el cloroplasto" }],
    }, chunks);
    expect(grounded.concepts.map((c) => c.name)).toEqual(["Mitocondria"]);
    expect(grounded.claims[0]!.chunkId).toBe("c1");
  });

  test("plan maps claim types to kinds, pairs sections for synthesis, and interleaves kinds", () => {
    const claim = (type: "definition" | "sequence" | "cause_effect", sectionIndex: number, concepts: string[], steps: string[] | null = null) =>
      ({ type, text: `${type} ${sectionIndex}`, concepts, steps, chunk: 0, quote: "q", chunkId: `c${sectionIndex}`, sectionIndex });
    const plan = planQuestions([claim("definition", 0, ["Glucosa"]), claim("sequence", 0, ["Respiración"], ["a", "b"]), claim("cause_effect", 1, ["Glucosa", "Luz"]), claim("sequence", 1, ["Ciclo"], ["a", "b", "c"])]);
    expect(plan.map((t) => t.kind).sort()).toEqual(["application", "cause_effect", "cloze", "ordering", "synthesis"]);
    expect(plan.find((t) => t.kind === "synthesis")!.chunkIds).toEqual(["c0", "c1"]);
    expect(planQuestions([claim("definition", 0, ["A"]), claim("definition", 1, ["B"])], 2).map((t) => t.kind)).toEqual(["cloze", "application"]);
  });

  test("final selection is balanced across kinds and capped", () => {
    const items = [...Array.from({ length: 50 }, (_, i) => ({ kind: "cloze", score: 0.99 - i / 1000 })), { kind: "synthesis", score: 0.71 }, { kind: "ordering", score: 0.8 }];
    const selected = selectBalanced(items, 10);
    expect(selected).toHaveLength(10);
    expect(selected.map((s) => s.kind)).toContain("synthesis");
    expect(selected.map((s) => s.kind)).toContain("ordering");
  });
});
