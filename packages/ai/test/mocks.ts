import { MockEmbeddingModelV4, MockLanguageModelV4 } from "ai/test";
import { hashString } from "@goomi/content";

type Prompt = { role: string; content: string | { type: string; text?: string }[] }[];
const textOf = (prompt: Prompt) => prompt.map((message) => (typeof message.content === "string" ? message.content : message.content.map((part) => part.text ?? "").join("\n"))).join("\n");

/** A language model whose JSON answer is computed from the real prompt it receives. */
export function scriptedModel(handler: (prompt: string) => unknown, modelId = "scripted") {
  return new MockLanguageModelV4({
    provider: "mock", modelId,
    doGenerate: async (options) => ({
      content: [{ type: "text", text: JSON.stringify(handler(textOf(options.prompt as Prompt))) }],
      finishReason: { unified: "stop", raw: undefined },
      usage: { inputTokens: { total: 1000, noCache: 1000, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 200, text: 200, reasoning: undefined } },
      warnings: [],
    }),
  });
}

/** Bag-of-words hashing into the first 1024 of 4096 dims, so truncation keeps the signal. */
export function hashingEmbedder() {
  const embed = (text: string) => {
    const vector = new Array<number>(4096).fill(0);
    for (const word of text.toLocaleLowerCase().match(/\p{L}{4,}/gu) ?? []) vector[hashString(word) % 1024]! += 1;
    vector[4095] = 5; // outside the kept head: must be dropped by truncation
    if (vector.slice(0, 1024).every((value) => value === 0)) vector[0] = 1;
    return vector;
  };
  return new MockEmbeddingModelV4({
    provider: "mock", modelId: "hashing", maxEmbeddingsPerCall: 64,
    doEmbed: async ({ values }) => ({ embeddings: values.map(embed), usage: { tokens: values.join(" ").length / 4 }, warnings: [] }),
  });
}

export const chunksIn = (prompt: string) =>
  [...prompt.matchAll(/\[C(\d+)\] \(page \d+\)\n([\s\S]*?)(?=\n\n\[C\d+\]|\n\nRelated concepts|\n\nExtract|\n\nQuestions|$)/g)].map((match) => ({ index: Number(match[1]), text: match[2]!.trim() }));
export const firstSentence = (text: string) => (text.match(/[^.!?]+[.!?]/)?.[0] ?? text).trim();

/**
 * Scripted study models that read the real prompts: extraction quotes the defining sentence of
 * each chunk (plus one hallucinated claim that grounding must drop), generation answers each
 * planned task, and the judge rejects every fill-blank to exercise the rejection path.
 */
export function scriptedStudyModels() {
  const keySentence = (text: string) => (text.match(/(?:La|El) [^.]*? (?:es|ocurre|detiene|producida)[^.]*\./u)?.[0] ?? firstSentence(text)).trim();
  const termOf = (sentence: string) => sentence.match(/^(?:La|El)\s+([\p{L}\s]+?)\s+(?:es|ocurre)\b/u)?.[1] ?? sentence.split(" ").slice(1, 3).join(" ");

  const extract = scriptedModel((prompt) => {
    const chunks = chunksIn(prompt);
    return {
      concepts: chunks.map((chunk) => ({ name: termOf(keySentence(chunk.text)), definition: keySentence(chunk.text), chunk: chunk.index, quote: keySentence(chunk.text) })),
      claims: chunks.flatMap((chunk) => {
        const sentence = keySentence(chunk.text);
        const claims: object[] = [{ type: "definition", text: sentence, concepts: [termOf(sentence), "glucosa"], steps: null, chunk: chunk.index, quote: sentence }];
        if (/tres etapas/.test(chunk.text)) claims.push({ type: "sequence", text: "Etapas de la respiración", concepts: ["respiración celular"], steps: ["Glucólisis", "Ciclo de Krebs", "Cadena de transporte de electrones"], chunk: chunk.index, quote: sentence });
        // A hallucinated claim with a non-verbatim quote: must be dropped by grounding.
        claims.push({ type: "property", text: "Inventado", concepts: [], steps: null, chunk: chunk.index, quote: "Esta frase no aparece en los apuntes." });
        return claims;
      }),
    };
  }, "extract");

  const generate = scriptedModel((prompt) => {
    const chunks = chunksIn(prompt);
    const tasks = [...prompt.matchAll(/^\d+\. kind=(\w+)\..*\n\s+Focus: .*?\(see ((?:\[C\d+\](?:, )?)+)\)/gm)].map((m) => ({ kind: m[1]!, refs: [...m[2]!.matchAll(/C(\d+)/g)].map((r) => Number(r[1])) }));
    return {
      questions: tasks.map((task) => {
        const chunk = chunks.find((c) => c.index === task.refs[0]) ?? chunks[0]!;
        const quote = keySentence(chunk.text);
        const common = { kind: task.kind, explanation: `Tus apuntes lo dicen: ${quote}`, memoryTip: "Relaciónalo con un ejemplo propio.", chunks: task.refs.length ? task.refs : [chunk.index], quote, options: null, correctIndex: null, isTrue: null, answer: null, alternatives: null, steps: null, pairs: null };
        const term = termOf(quote);
        switch (task.kind) {
          case "cloze": return { ...common, format: "cloze", prompt: quote.replace(term, "____"), answer: term };
          case "ordering": return { ...common, format: "order", prompt: "Ordena las etapas de la respiración celular.", steps: ["Glucólisis", "Ciclo de Krebs", "Cadena de transporte de electrones"] };
          case "error_spot": return { ...common, format: "true_false", prompt: quote.replace("energía", "luz"), isTrue: false };
          default: return { ...common, format: "choice", prompt: `¿Qué concepto describe esto: ${quote.slice(0, 60)}…?`, options: [term, "El ribosoma", "El núcleo", "La vacuola"], correctIndex: 0 };
        }
      }),
    };
  }, "generate");

  // Judge rejects every fill-blank (to prove rejection is honoured) and approves the rest.
  const judge = scriptedModel((prompt) => ({
    verdicts: [...prompt.matchAll(/^Q(\d+)\. \[([\w-]+)\]/gm)].map((m) => ({
      question: Number(m[1]), supported: m[2] !== "fill-blank", uniquelyCorrect: true, answerableFromNotes: true, distractorsPlausible: true, languageOk: true,
      score: m[2] === "fill-blank" ? 0.2 : 0.9, issue: m[2] === "fill-blank" ? "ambiguous" : null,
    })),
  }), "judge");
  const ocr = scriptedModel(() => ({ text: "La célula es la unidad básica de la vida. Texto leído por OCR de una página escrita a mano.", legibility: "partial" }), "ocr");
  return { extract, generate, judge, ocr, embed: hashingEmbedder() };
}

/** Realistic section lengths (~450 tokens each) so sectioning keeps three sections and several chunks. */
const filler = (topic: string, count: number) => Array.from({ length: count }, (_, i) =>
  `Detalle ${i + 1} sobre ${topic}: los apuntes de clase repiten esta idea con ejemplos del laboratorio, preguntas de repaso y observaciones del profesor sobre el tema de hoy.`).join("\n\n");
export const NOTES = [
  { n: 1, text: `1. La célula\n\nLa célula es la unidad básica de la vida de todos los organismos.\n\n${filler("la célula", 6)}\n\nLa mitocondria es el orgánulo que produce la energía de la célula a partir de la glucosa.\n\n${filler("la mitocondria", 6)}` },
  { n: 2, text: `2. Fotosíntesis\n\nLa fotosíntesis es el proceso por el cual las plantas transforman la luz en glucosa.\n\n${filler("la fotosíntesis", 6)}\n\nLa glucosa producida por la fotosíntesis es usada luego por la mitocondria para obtener energía.\n\n${filler("la glucosa", 6)}` },
  { n: 3, text: `3. Respiración celular\n\nLa respiración celular ocurre en tres etapas en orden: glucólisis, ciclo de Krebs y cadena de transporte de electrones.\n\n${filler("la respiración", 6)}\n\nLa falta de oxígeno detiene la cadena de transporte de electrones y reduce la energía disponible.\n\n${filler("el oxígeno", 6)}` },
];
