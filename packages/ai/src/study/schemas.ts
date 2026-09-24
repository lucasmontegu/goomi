import { z } from "zod";

/**
 * Model-facing output schemas. Kept flat with nullable fields (no unions) because strict
 * structured-output modes on several providers reject anyOf/optional properties.
 * Chunks are referenced by the local [C#] labels shown in the prompt.
 */
export const CLAIM_TYPES = ["definition", "cause_effect", "sequence", "comparison", "property", "example"] as const;

export const extractionSchema = z.object({
  concepts: z.array(z.object({
    name: z.string().describe("The concept's name exactly as the notes use it"),
    definition: z.string().describe("One-sentence meaning, faithful to the notes"),
    chunk: z.number().int().describe("The [C#] number where the notes explain it"),
    quote: z.string().describe("A verbatim sentence from that chunk that supports the definition"),
  })).max(12),
  claims: z.array(z.object({
    type: z.enum(CLAIM_TYPES),
    text: z.string().describe("The claim restated plainly, adding nothing the notes don't say"),
    concepts: z.array(z.string()).max(4).describe("Names of concepts this claim involves"),
    steps: z.array(z.string()).max(6).nullable().describe("For sequence claims only: the steps in the notes' order; otherwise null"),
    chunk: z.number().int(),
    quote: z.string().describe("A verbatim excerpt from that chunk supporting the claim"),
  })).max(20),
});
export type Extraction = z.infer<typeof extractionSchema>;

export const STUDY_KINDS = ["application", "compare", "cause_effect", "ordering", "cloze", "error_spot", "synthesis"] as const;
export type StudyKindName = (typeof STUDY_KINDS)[number];
export const QUESTION_FORMATS = ["choice", "true_false", "cloze", "order", "match"] as const;

export const candidateSchema = z.object({
  questions: z.array(z.object({
    kind: z.enum(STUDY_KINDS),
    format: z.enum(QUESTION_FORMATS),
    prompt: z.string().describe("The question. For cloze, the key sentence with the missing term replaced by ____"),
    options: z.array(z.string()).nullable().describe("choice: exactly 4 options; otherwise null"),
    correctIndex: z.number().int().nullable().describe("choice: index of the correct option; otherwise null"),
    isTrue: z.boolean().nullable().describe("true_false: whether the statement in the prompt is true; otherwise null"),
    answer: z.string().nullable().describe("cloze: the missing term, verbatim from the quote; otherwise null"),
    alternatives: z.array(z.string()).nullable().describe("cloze: other acceptable spellings or synonyms from the notes; otherwise null"),
    steps: z.array(z.string()).nullable().describe("order: 3-6 steps in the correct order; otherwise null"),
    pairs: z.array(z.object({ left: z.string(), right: z.string() })).nullable().describe("match: 3-4 pairs; otherwise null"),
    explanation: z.string().describe("Why the answer is right, grounded only in the notes (1-3 sentences)"),
    memoryTip: z.string().describe("A short, concrete hook to remember it"),
    chunks: z.array(z.number().int()).min(1).max(4).describe("The [C#] numbers that support the answer"),
    quote: z.string().describe("A verbatim excerpt from a cited chunk that proves the answer"),
  })).max(8),
});
export type Candidate = z.infer<typeof candidateSchema>["questions"][number];

export const judgeSchema = z.object({
  verdicts: z.array(z.object({
    question: z.number().int().describe("The Q# being judged"),
    supported: z.boolean().describe("The keyed answer is stated or directly implied by the cited notes"),
    uniquelyCorrect: z.boolean().describe("No other option is also defensible from the notes shown"),
    answerableFromNotes: z.boolean().describe("A student who studied these notes can answer without outside knowledge"),
    distractorsPlausible: z.boolean().describe("Wrong options are plausible, not silly or give-aways"),
    languageOk: z.boolean().describe("Everything is written in the required language"),
    score: z.number().min(0).max(1).describe("Overall quality for a 15-60 second recall moment"),
    issue: z.string().nullable().describe("The main problem, or null"),
  })),
});
export type Verdict = z.infer<typeof judgeSchema>["verdicts"][number];

export const ocrSchema = z.object({
  text: z.string().describe("All readable text on the page in reading order, verbatim. Empty if none."),
  legibility: z.enum(["clear", "partial", "illegible"]),
});
