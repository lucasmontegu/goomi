import type { Attribution } from "../attribution";
import { baseFields, bankItemId, difficultyFromSitelinks, langsOf, pickDistractors, toChoices, type BankDraft, type GeneratorOptions } from "../bank";
import type { EventFact } from "../facts";
import { T, capitalize, fill, label } from "../i18n";
import { normalizeLabel, seededRandom, shuffle } from "../random";

/** Minimum gap between neighbouring items so the order is unambiguous and fair to recall. */
export const MIN_YEAR_GAP = 15;

/** Four well-known inventions/events in chronological order, each ≥ MIN_YEAR_GAP apart. */
export function timelineChallenges(events: readonly EventFact[], options?: GeneratorOptions): BankDraft[] {
  const drafts: BankDraft[] = [];
  const pool = shuffle(events.filter((event) => event.sitelinks >= 60), seededRandom("timeline"));
  const used = new Set<string>();
  for (const anchor of pool) {
    if (used.has(anchor.id)) continue;
    const group = [anchor];
    for (const candidate of pool) {
      if (group.length === 4) break;
      if (used.has(candidate.id) || group.includes(candidate)) continue;
      if (group.every((member) => Math.abs(member.year - candidate.year) >= MIN_YEAR_GAP)) group.push(candidate);
    }
    if (group.length < 4) continue;
    const ordered = [...group].sort((a, b) => a.year - b.year);
    const factIds = ordered.map((event) => event.id);
    const draft: BankDraft = {
      id: bankItemId("timeline", factIds), templateId: "timeline", topicId: "history", type: "historical-order",
      difficulty: difficultyFromSitelinks(Math.min(...group.map((event) => event.sitelinks))),
      conceptKey: `timeline:${[...factIds].sort().join(",")}`, factIds, attribution: wikidataGroup(group), locales: {},
    };
    for (const lang of langsOf(options)) {
      const names = ordered.map((event) => label(event.label, lang));
      if (names.some((name) => !name)) continue;
      const items = shuffle(ordered.map((event, index) => ({ id: event.id, label: capitalize(names[index]!) })), seededRandom(`${draft.id}:${lang}`));
      // Never present the items already in the answer order.
      if (items.every((item, index) => item.id === ordered[index]!.id)) items.reverse();
      draft.locales[lang] = {
        ...baseFields(draft, lang, 35), type: "historical-order", visual: "globe",
        title: T.timeline.title[lang], prompt: T.timeline.prompt[lang],
        items, correctOrder: ordered.map((event) => event.id),
        explanation: fill(T.timeline.explanation[lang], { timeline: ordered.map((event, index) => `${capitalize(names[index]!)} (${event.year})`).join(" → ") }),
        memoryTip: T.timeline.tip[lang],
      };
    }
    if (Object.keys(draft.locales).length) {
      drafts.push(draft);
      group.forEach((event) => used.add(event.id));
    }
    if (options?.limit && drafts.length >= options.limit) break;
  }
  return drafts;
}

/** Who is credited with an invention/discovery? Distractor people come from the same era (±60 years). */
export function inventorChallenges(events: readonly EventFact[], options?: GeneratorOptions): BankDraft[] {
  const drafts: BankDraft[] = [];
  const withPeople = events.filter((event) => event.person && event.category !== "event");
  for (const event of withPeople) {
    const peers = withPeople.filter((other) => Math.abs(other.year - event.year) <= 60);
    const draft: BankDraft = {
      id: bankItemId("inventor", [event.id]), templateId: "inventor", topicId: event.category === "invention" ? "technology" : "science",
      type: "multiple-choice", difficulty: difficultyFromSitelinks(event.sitelinks), conceptKey: `inventor:${event.id}`,
      factIds: [event.id], attribution: event.attribution, locales: {},
    };
    for (const lang of langsOf(options)) {
      const thing = label(event.label, lang);
      const person = label(event.person!, lang);
      if (!thing || !person) continue;
      const personOf = (other: EventFact) => label(other.person!, lang);
      const distractors = pickDistractors(peers, event, 3, personOf, `${draft.id}:${lang}`, (other) => normalizeLabel(personOf(other) ?? "") === normalizeLabel(person));
      if (!distractors) continue;
      const values = { thing: capitalize(thing), person, year: event.year };
      draft.locales[lang] = {
        ...baseFields(draft, lang, 20), type: "multiple-choice", visual: "shapes",
        title: T.inventor.title[lang], prompt: fill(T.inventor.prompt[lang], values),
        ...toChoices(person, distractors.map((d) => personOf(d)!), draft.id),
        explanation: fill(T.inventor.explanation[lang], values), memoryTip: fill(T.inventor.tip[lang], values),
      };
    }
    if (Object.keys(draft.locales).length) drafts.push(draft);
    if (options?.limit && drafts.length >= options.limit) break;
  }
  return drafts;
}

function wikidataGroup(group: readonly EventFact[]): Attribution {
  return { ...group[0]!.attribution, sourceItemId: group.map((event) => event.id).join(","), sourceUrl: "https://www.wikidata.org/", sourceTitle: "Wikidata" };
}
