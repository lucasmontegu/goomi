import { licenseProblem, type LicensePolicy } from "../attribution";
import { baseFields, bankItemId, langsOf, pickDistractors, toChoices, type BankDraft, type GeneratorOptions } from "../bank";
import type { SentenceFact } from "../facts";
import { T, fill, type Lang } from "../i18n";

/** Tatoeba uses ISO 639-3; our UI languages map onto it. */
const TATOEBA_LANG: Record<Lang, string> = { en: "eng", es: "spa", "pt-BR": "por" };
/** The device matches `language` against the learner's languages by English name (profile.learningLanguages). */
export const LANGUAGE_NAMES: Record<string, string> = { eng: "English", spa: "Spanish", por: "Portuguese", fra: "French", ita: "Italian", deu: "German", jpn: "Japanese" };

/**
 * "What does <sentence in the learned language> mean?" with the answer written in the UI language.
 * Distractors are translations of other sentences of similar length. Honours the license policy.
 */
export function translationChallenges(sentences: readonly SentenceFact[], options?: GeneratorOptions & { policy?: LicensePolicy }): BankDraft[] {
  const drafts: BankDraft[] = [];
  const allowed = sentences.filter((sentence) => licenseProblem(sentence.attribution, options?.policy) === null);
  for (const sentence of allowed) {
    const languageName = LANGUAGE_NAMES[sentence.lang];
    if (!languageName) continue;
    const draft: BankDraft = {
      id: bankItemId("translation", [sentence.id]), templateId: "translation", topicId: "languages", type: "translation",
      difficulty: sentence.text.split(/\s+/).length <= 5 ? "gentle" : "curious", conceptKey: `sentence:${sentence.id}`,
      factIds: [sentence.id], attribution: sentence.attribution, locales: {},
    };
    for (const lang of langsOf(options)) {
      if (TATOEBA_LANG[lang] === sentence.lang) continue;
      const meaningOf = (fact: SentenceFact) => fact.translations.find((translation) => translation.lang === TATOEBA_LANG[lang])?.text;
      const meaning = meaningOf(sentence);
      if (!meaning) continue;
      const peers = allowed.filter((other) => other.lang === sentence.lang && Math.abs(other.text.length - sentence.text.length) <= 25);
      const distractors = pickDistractors(peers, sentence, 3, meaningOf, `${draft.id}:${lang}`);
      if (!distractors) continue;
      const values = { sentence: sentence.text, meaning };
      draft.locales[lang] = {
        ...baseFields(draft, lang, 20), type: "translation", visual: "words", language: languageName,
        title: T.translation.title[lang], prompt: fill(T.translation.prompt[lang], values),
        ...toChoices(meaning, distractors.map((d) => meaningOf(d)!), draft.id),
        explanation: fill(T.translation.explanation[lang], values), memoryTip: T.translation.tip[lang],
      };
    }
    if (Object.keys(draft.locales).length) drafts.push(draft);
    if (options?.limit && drafts.length >= options.limit) break;
  }
  return drafts;
}
