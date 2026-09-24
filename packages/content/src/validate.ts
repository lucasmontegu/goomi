import { licenseProblem, type LicensePolicy } from "./attribution";
import type { BankDraft } from "./bank";
import { normalizeLabel } from "./random";
import { challengeSchema, type Challenge } from "./schema";

export type Issue = { path: string; message: string };

const LEFTOVER = /\{\w+\}|\bundefined\b|\bnull\b|\bNaN\b|\[object Object\]/;

/** Structural and fairness checks every challenge must pass, whatever produced it. */
export function validateChallenge(input: unknown): { challenge: Challenge; issues: Issue[] } | { challenge: null; issues: Issue[] } {
  const parsed = challengeSchema.safeParse(input);
  if (!parsed.success) {
    return { challenge: null, issues: parsed.error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })) };
  }
  const challenge = parsed.data;
  const issues: Issue[] = [];
  const add = (path: string, message: string) => issues.push({ path, message });

  for (const [field, value] of Object.entries({ title: challenge.title, prompt: challenge.prompt, explanation: challenge.explanation, memoryTip: challenge.memoryTip })) {
    if (LEFTOVER.test(value)) add(field, "contains an unfilled placeholder or stringified empty value");
  }
  const uniqueLabels = (labels: string[], path: string) => {
    if (new Set(labels.map(normalizeLabel)).size !== labels.length) add(path, "labels are not unique");
    labels.forEach((label, index) => { if (LEFTOVER.test(label)) add(`${path}.${index}`, "contains an unfilled placeholder"); });
  };
  const uniqueIds = (ids: string[], path: string) => { if (new Set(ids).size !== ids.length) add(path, "ids are not unique"); };

  if ("choices" in challenge) {
    uniqueIds(challenge.choices.map((choice) => choice.id), "choices");
    uniqueLabels(challenge.choices.map((choice) => choice.label), "choices");
    if (!challenge.choices.some((choice) => choice.id === challenge.correctChoiceId)) add("correctChoiceId", "is not one of the choices");
    if (challenge.type === "true-false" && challenge.choices.length !== 2) add("choices", "true-false needs exactly two choices");
  }
  switch (challenge.type) {
    case "sequence":
    case "historical-order": {
      const ids = challenge.items.map((item) => item.id);
      uniqueIds(ids, "items");
      uniqueLabels(challenge.items.map((item) => item.label), "items");
      if (challenge.correctOrder.length !== ids.length || [...challenge.correctOrder].sort().join() !== [...ids].sort().join()) add("correctOrder", "must use each item exactly once");
      if (challenge.correctOrder.every((id, index) => ids[index] === id)) add("items", "are already shown in the correct order");
      break;
    }
    case "matching":
      uniqueIds(challenge.pairs.map((pair) => pair.left.id), "pairs.left");
      uniqueIds(challenge.pairs.map((pair) => pair.right.id), "pairs.right");
      uniqueLabels(challenge.pairs.map((pair) => pair.left.label), "pairs.left");
      uniqueLabels(challenge.pairs.map((pair) => pair.right.label), "pairs.right");
      break;
    case "fill-blank": {
      const prompt = ` ${normalizeLabel(challenge.prompt).replace(/[^\p{L}\p{N}]+/gu, " ")} `;
      for (const answer of challenge.acceptedAnswers) {
        const needle = normalizeLabel(answer).replace(/[^\p{L}\p{N}]+/gu, " ").trim();
        if (needle && prompt.includes(` ${needle} `)) add("prompt", `reveals the answer “${answer}”`);
      }
      break;
    }
    case "image-identification":
      if (/^https?:/.test(challenge.imageAsset) && challenge.imageAsset !== challenge.imageUrl) add("imageAsset", "remote media must also be declared as imageUrl so the device can cache it");
      break;
  }
  return { challenge, issues };
}

/** Bank drafts: every locale valid, consistent concept, publishable license. */
export function validateBankDraft(draft: BankDraft, policy?: LicensePolicy): Issue[] {
  const issues: Issue[] = [];
  const license = licenseProblem(draft.attribution, policy);
  if (license) issues.push({ path: "attribution", message: license });
  const locales = Object.entries(draft.locales);
  if (!locales.length) issues.push({ path: "locales", message: "no language produced a challenge" });
  for (const [lang, challenge] of locales) {
    const result = validateChallenge(challenge);
    issues.push(...result.issues.map((issue) => ({ path: `locales.${lang}.${issue.path}`, message: issue.message })));
    if (!result.challenge) continue;
    if (result.challenge.locale !== lang) issues.push({ path: `locales.${lang}.locale`, message: "does not match its locale key" });
    if (result.challenge.conceptId !== draft.conceptKey) issues.push({ path: `locales.${lang}.conceptId`, message: "must equal the draft concept so reviews carry across languages" });
    if (result.challenge.type !== draft.type) issues.push({ path: `locales.${lang}.type`, message: "differs from the draft type" });
    if (result.challenge.origin !== "bank") issues.push({ path: `locales.${lang}.origin`, message: "must be bank" });
  }
  return issues;
}

/** Numbers and years in generated prose must come from the source facts (enrichment guard). */
export function unsupportedNumbers(textToCheck: string, facts: string): string[] {
  const known = new Set([...facts.matchAll(/\d[\d.,]*/g)].map((match) => match[0].replace(/[.,]/g, "")));
  return [...textToCheck.matchAll(/\d[\d.,]*/g)].map((match) => match[0]).filter((value) => !known.has(value.replace(/[.,]/g, "")));
}
