import { baseFields, bankItemId, langsOf, pickDistractors, toChoices, type BankDraft, type GeneratorOptions } from "../bank";
import type { ElementFact } from "../facts";
import { T, capitalize, fill, label, type Lang } from "../i18n";
import type { Difficulty } from "../schema";
import { seededRandom, shuffle } from "../random";

const difficultyOf = (element: ElementFact): Difficulty => (element.atomicNumber <= 20 ? "gentle" : element.atomicNumber <= 56 ? "curious" : "deep");
/** Wikidata keeps element names lowercase in es/pt; quiz labels read better capitalized. */
const nameOf = (element: ElementFact, lang: Lang): string | undefined => { const name = label(element.name, lang); return name ? capitalize(name) : undefined; };

/** Symbol → element name; distractors from the same block of the table. */
export function elementSymbolChallenges(elements: readonly ElementFact[], options?: GeneratorOptions): BankDraft[] {
  const drafts: BankDraft[] = [];
  for (const element of elements.filter((e) => e.atomicNumber <= 92)) {
    const pool = elements.filter((other) => other.groupBlock === element.groupBlock && other.atomicNumber <= 92);
    const draft: BankDraft = {
      id: bankItemId("element-symbol", [element.id]), templateId: "element-symbol", topicId: "science", type: "multiple-choice",
      difficulty: difficultyOf(element), conceptKey: `element-symbol:${element.symbol}`, factIds: [element.id], attribution: element.attribution, locales: {},
    };
    for (const lang of langsOf(options)) {
      const name = nameOf(element, lang);
      if (!name) continue;
      const distractors = pickDistractors(pool, element, 3, (other) => nameOf(other, lang), `${draft.id}:${lang}`);
      if (!distractors) continue;
      const values = { symbol: element.symbol, element: label(element.name, lang)!, number: element.atomicNumber };
      draft.locales[lang] = {
        ...baseFields(draft, lang, 15), type: "multiple-choice", visual: "shapes",
        title: T.elementSymbol.title[lang], prompt: fill(T.elementSymbol.prompt[lang], values),
        ...toChoices(name, distractors.map((d) => nameOf(d, lang)!), draft.id),
        explanation: fill(T.elementSymbol.explanation[lang], values), memoryTip: fill(T.elementSymbol.tip[lang], values),
      };
    }
    if (Object.keys(draft.locales).length) drafts.push(draft);
    if (options?.limit && drafts.length >= options.limit) break;
  }
  return drafts;
}

/** Four element ↔ symbol pairs among the first 56 elements. */
export function elementMatchingChallenges(elements: readonly ElementFact[], options?: GeneratorOptions): BankDraft[] {
  const drafts: BankDraft[] = [];
  const common = shuffle(elements.filter((e) => e.atomicNumber <= 56), seededRandom("element-match"));
  for (let start = 0; start + 4 <= common.length; start += 4) {
    const group = common.slice(start, start + 4);
    const factIds = group.map((e) => e.id);
    const draft: BankDraft = {
      id: bankItemId("element-match", factIds), templateId: "element-match", topicId: "science", type: "matching",
      difficulty: "curious", conceptKey: `element-match:${[...factIds].sort().join(",")}`, factIds, attribution: group[0]!.attribution, locales: {},
    };
    for (const lang of langsOf(options)) {
      const names = group.map((e) => nameOf(e, lang));
      if (names.some((name) => !name)) continue;
      draft.locales[lang] = {
        ...baseFields(draft, lang, 35), type: "matching", visual: "shapes",
        title: T.elementMatch.title[lang], prompt: T.elementMatch.prompt[lang],
        pairs: group.map((e, index) => ({ left: { id: `l${index}`, label: names[index]! }, right: { id: `r${index}`, label: e.symbol } })),
        explanation: fill(T.elementMatch.explanation[lang], { pairs: group.map((e, index) => `${names[index]} → ${e.symbol}`).join(" · ") }),
        memoryTip: T.elementMatch.tip[lang],
      };
    }
    if (Object.keys(draft.locales).length) drafts.push(draft);
    if (options?.limit && drafts.length >= options.limit) break;
  }
  return drafts;
}
