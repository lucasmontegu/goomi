import type { LicensePolicy } from "./attribution";
import type { BankDraft, GeneratorOptions } from "./bank";
import type { ArtworkFact, CountryFact, ElementFact, EventFact, Fact, SentenceFact } from "./facts";
import { artistChallenges, centuryChallenges } from "./generators/art";
import { areaChallenges, capitalChallenges, capitalMatchingChallenges, flagChallenges } from "./generators/countries";
import { elementMatchingChallenges, elementSymbolChallenges } from "./generators/elements";
import { inventorChallenges, timelineChallenges } from "./generators/history";
import { translationChallenges } from "./generators/languages";
import { validateBankDraft, type Issue } from "./validate";

export type BuildResult = { accepted: BankDraft[]; rejected: { draft: BankDraft; issues: Issue[] }[] };

const ofKind = <K extends Fact["kind"]>(facts: readonly Fact[], kind: K) => facts.filter((fact): fact is Extract<Fact, { kind: K }> => fact.kind === kind);

/** Runs every template over the facts and keeps only drafts that pass deterministic validation. $0 per question. */
export function buildBank(facts: readonly Fact[], options: GeneratorOptions & { policy?: LicensePolicy } = {}): BuildResult {
  const countries: CountryFact[] = ofKind(facts, "country");
  const artworks: ArtworkFact[] = ofKind(facts, "artwork");
  const elements: ElementFact[] = ofKind(facts, "element");
  const events: EventFact[] = ofKind(facts, "event");
  const sentences: SentenceFact[] = ofKind(facts, "sentence");
  const drafts = [
    ...capitalChallenges(countries, options), ...capitalMatchingChallenges(countries, options),
    ...flagChallenges(countries, options), ...areaChallenges(countries, options),
    ...artistChallenges(artworks, options), ...centuryChallenges(artworks, options),
    ...elementSymbolChallenges(elements, options), ...elementMatchingChallenges(elements, options),
    ...timelineChallenges(events, options), ...inventorChallenges(events, options),
    ...translationChallenges(sentences, options),
  ];
  const result: BuildResult = { accepted: [], rejected: [] };
  const seen = new Set<string>();
  for (const draft of drafts) {
    if (seen.has(draft.id)) continue;
    seen.add(draft.id);
    const issues = validateBankDraft(draft, options.policy);
    if (issues.length) result.rejected.push({ draft, issues });
    else result.accepted.push(draft);
  }
  return result;
}
