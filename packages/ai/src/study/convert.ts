import { hashString, normalizeLabel, seededRandom, shuffle, validateChallenge, type Challenge, type Difficulty } from "@goomi/content";
import { containsQuote, detectLang } from "../text";
import type { StudyLang } from "./prompts";
import type { Candidate, Extraction, StudyKindName } from "./schemas";

export type ChunkRef = { id: string; sectionIndex: number; text: string; paragraphStart: number };
export type ConvertContext = { materialId: string; materialTitle: string; lang: StudyLang; chunks: readonly ChunkRef[]; conceptIds: readonly string[] };
export type Converted = { ok: true; challenge: Challenge; chunkIds: string[]; candidateKey: string } | { ok: false; reasons: string[] };

const TRUE_FALSE: Record<StudyLang, [string, string]> = { en: ["True", "False"], es: ["Verdadero", "Falso"], "pt-BR": ["Verdadeiro", "Falso"] };
const DIFFICULTY: Record<StudyKindName, Difficulty> = { cloze: "gentle", ordering: "curious", compare: "curious", cause_effect: "curious", error_spot: "curious", application: "deep", synthesis: "deep" };
const DURATION = { choice: 30, true_false: 20, cloze: 30, order: 45, match: 45 } as const;
const clean = (value: string | null | undefined) => (value ?? "").replace(/\s+/g, " ").trim();

/** Stable key: the same question text for the same material always maps to the same row. */
export const candidateKeyOf = (candidate: Candidate) => hashString(`${candidate.kind}|${candidate.format}|${normalizeLabel(candidate.prompt)}`).toString(36);

/**
 * Deterministic gate between the model and the device: shape per format, chunk citations that
 * exist, a verbatim quote from a cited chunk, cloze answers taken from that quote, synthesis
 * spanning sections, and the target language. Anything failing is dropped before the judge.
 */
export function toStudyChallenge(candidate: Candidate, context: ConvertContext): Converted {
  const reasons: string[] = [];
  const cited = [...new Set(candidate.chunks)].map((index) => context.chunks[index]).filter((chunk): chunk is ChunkRef => Boolean(chunk));
  if (!cited.length || cited.length !== new Set(candidate.chunks).size) reasons.push("cites a chunk that was not provided");
  const quoteChunk = cited.find((chunk) => containsQuote(chunk.text, candidate.quote));
  if (!quoteChunk) reasons.push("quote is not verbatim from a cited chunk");
  if (candidate.kind === "synthesis" && new Set(cited.map((chunk) => chunk.sectionIndex)).size < 2) reasons.push("synthesis must cite chunks from two sections");

  const prompt = clean(candidate.prompt);
  const explanation = clean(candidate.explanation);
  const detected = detectLang(`${prompt} ${explanation} ${clean(candidate.memoryTip)} ${(candidate.options ?? []).join(" ")}`);
  if (detected && detected !== context.lang) reasons.push(`written in ${detected}, expected ${context.lang}`);

  const candidateKey = candidateKeyOf(candidate);
  const id = `study-${context.materialId}-${candidateKey}`;
  const base = {
    id, conceptId: context.conceptIds[0] ?? id, topicId: "study" as const, title: context.materialTitle.slice(0, 120),
    prompt, explanation, memoryTip: clean(candidate.memoryTip), difficulty: DIFFICULTY[candidate.kind],
    durationSeconds: DURATION[candidate.format], visual: "words" as const, locale: context.lang, origin: "study-ai" as const, version: 1,
    ...(context.conceptIds.length > 1 ? { relatedConceptIds: context.conceptIds.slice(1) } : {}),
    source: {
      title: context.materialTitle.slice(0, 200), materialId: context.materialId,
      excerpt: clean(candidate.quote).slice(0, 1200), chunkIds: cited.map((chunk) => chunk.id),
      ...(quoteChunk ? { paragraph: quoteChunk.paragraphStart } : {}),
    },
  };
  const random = seededRandom(id);
  let challenge: Challenge | null = null;
  switch (candidate.format) {
    case "choice": {
      const options = (candidate.options ?? []).map(clean);
      if (options.length !== 4 || candidate.correctIndex === null || !options[candidate.correctIndex]) { reasons.push("choice needs 4 options and a valid correctIndex"); break; }
      const order = shuffle(options.map((label, index) => ({ label, index })), random);
      challenge = { ...base, type: "study-question", choices: order.map((option, position) => ({ id: String(position), label: option.label })), correctChoiceId: String(order.findIndex((option) => option.index === candidate.correctIndex)) };
      break;
    }
    case "true_false": {
      if (candidate.isTrue === null) { reasons.push("true_false needs isTrue"); break; }
      const [yes, no] = TRUE_FALSE[context.lang];
      challenge = { ...base, type: "true-false", choices: [{ id: "true", label: yes }, { id: "false", label: no }], correctChoiceId: candidate.isTrue ? "true" : "false" };
      break;
    }
    case "cloze": {
      const answer = clean(candidate.answer);
      if (!answer || !prompt.includes("____")) { reasons.push("cloze needs an answer and a ____ blank"); break; }
      if (!containsQuote(candidate.quote, answer) && normalizeLabel(candidate.quote).indexOf(normalizeLabel(answer)) < 0) reasons.push("cloze answer does not appear in the quote");
      const accepted = [answer, ...(candidate.alternatives ?? []).map(clean).filter(Boolean)].slice(0, 8);
      challenge = { ...base, type: "fill-blank", acceptedAnswers: [...new Map(accepted.map((value) => [normalizeLabel(value), value])).values()], answerLabel: answer };
      break;
    }
    case "order": {
      const steps = (candidate.steps ?? []).map(clean).filter(Boolean);
      if (steps.length < 3 || steps.length > 6) { reasons.push("order needs 3-6 steps"); break; }
      const items = steps.map((label, index) => ({ id: `s${index}`, label }));
      let shown = shuffle(items, random);
      if (shown.every((item, index) => item.id === items[index]!.id)) shown = [...shown].reverse();
      challenge = { ...base, type: "sequence", items: shown, correctOrder: items.map((item) => item.id) };
      break;
    }
    case "match": {
      const pairs = (candidate.pairs ?? []).map((pair) => ({ left: clean(pair.left), right: clean(pair.right) })).filter((pair) => pair.left && pair.right);
      if (pairs.length < 3 || pairs.length > 4) { reasons.push("match needs 3-4 pairs"); break; }
      challenge = { ...base, type: "matching", pairs: pairs.map((pair, index) => ({ left: { id: `l${index}`, label: pair.left }, right: { id: `r${index}`, label: pair.right } })) };
      break;
    }
  }
  if (challenge) {
    const validation = validateChallenge(challenge);
    reasons.push(...validation.issues.map((issue) => `${issue.path}: ${issue.message}`));
    if (validation.challenge) challenge = validation.challenge;
  }
  if (reasons.length || !challenge) return { ok: false, reasons: reasons.length ? reasons : ["unsupported format"] };
  return { ok: true, challenge, chunkIds: cited.map((chunk) => chunk.id), candidateKey };
}

/** Drops extracted concepts/claims whose quote isn't verbatim from the chunk they cite. */
export function groundExtraction(extraction: Extraction, chunks: readonly ChunkRef[]) {
  const grounded = <T extends { chunk: number; quote: string }>(item: T) => {
    const chunk = chunks[item.chunk];
    return chunk && containsQuote(chunk.text, item.quote) ? { ...item, chunkId: chunk.id } : null;
  };
  return {
    concepts: extraction.concepts.map(grounded).filter((item) => item !== null && item.name.trim() && item.definition.trim()) as (Extraction["concepts"][number] & { chunkId: string })[],
    claims: extraction.claims.map(grounded).filter((item) => item !== null && item.text.trim()) as (Extraction["claims"][number] & { chunkId: string })[],
  };
}

/** Renders a converted challenge for the judge with the keyed answer marked. */
export function renderForJudge(challenge: Challenge, index: number): string {
  const head = `Q${index}. [${challenge.type}] ${challenge.prompt}`;
  if ("choices" in challenge) return `${head}\n${challenge.choices.map((choice) => `  ${choice.id === challenge.correctChoiceId ? "✓" : "-"} ${choice.label}`).join("\n")}`;
  switch (challenge.type) {
    case "fill-blank": return `${head}\n  ✓ ${challenge.acceptedAnswers.join(" / ")}`;
    case "sequence":
    case "historical-order": return `${head}\n  ✓ ${challenge.correctOrder.map((id) => challenge.items.find((item) => item.id === id)?.label).join(" → ")}`;
    case "matching": return `${head}\n${challenge.pairs.map((pair) => `  ✓ ${pair.left.label} ↔ ${pair.right.label}`).join("\n")}`;
    default: return head;
  }
}
