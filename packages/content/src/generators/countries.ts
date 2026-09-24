import type { Attribution } from "../attribution";
import { baseFields, bankItemId, difficultyFromSitelinks, langsOf, pickDistractors, toChoices, type BankDraft, type GeneratorOptions } from "../bank";
import type { CountryFact } from "../facts";
import { T, fill, label, numberFormat } from "../i18n";
import { normalizeLabel, seededRandom, shuffle } from "../random";

const singleCapital = (country: CountryFact) => (country.capitals.length === 1 ? country.capitals[0] : undefined);
const byRegion = (countries: readonly CountryFact[]) => {
  const groups = new Map<string, CountryFact[]>();
  for (const country of countries) groups.set(country.regionId, [...(groups.get(country.regionId) ?? []), country]);
  return groups;
};

/** "What is the capital of X?" — distractors are capitals of countries in the same region. */
export function capitalChallenges(countries: readonly CountryFact[], options?: GeneratorOptions): BankDraft[] {
  const drafts: BankDraft[] = [];
  const regions = byRegion(countries);
  for (const country of countries) {
    const capital = singleCapital(country);
    if (!capital) continue;
    const pool = (regions.get(country.regionId) ?? []).filter((other) => singleCapital(other));
    const draft: BankDraft = {
      id: bankItemId("capital", [country.id]), templateId: "capital", topicId: "geography", type: "geography",
      difficulty: difficultyFromSitelinks(country.sitelinks), conceptKey: `capital:${country.id}`, factIds: [country.id],
      attribution: country.attribution, locales: {},
    };
    for (const lang of langsOf(options)) {
      const countryName = label(country.name, lang);
      const capitalName = label(capital, lang);
      const region = label(country.regionName, lang);
      if (!countryName || !capitalName || !region) continue;
      const capitalOf = (other: CountryFact) => label(singleCapital(other)!, lang);
      // A distractor that is also some capital of this country (e.g. a shared name) would be ambiguous.
      const distractors = pickDistractors(pool, country, 3, capitalOf, `${draft.id}:${lang}`, (other) => country.capitals.some((c) => normalizeLabel(label(c, lang) ?? "") === normalizeLabel(capitalOf(other) ?? "")));
      if (!distractors) continue;
      const values = { country: countryName, capital: capitalName, region };
      draft.locales[lang] = {
        ...baseFields(draft, lang, 20), type: "geography", visual: "globe", country: country.name.en,
        title: T.capital.title[lang], prompt: fill(T.capital.prompt[lang], values),
        ...toChoices(capitalName, distractors.map((d) => capitalOf(d)!), draft.id),
        explanation: fill(T.capital.explanation[lang], values), memoryTip: fill(T.capital.tip[lang], values),
      };
    }
    if (Object.keys(draft.locales).length) drafts.push(draft);
    if (options?.limit && drafts.length >= options.limit) break;
  }
  return drafts;
}

/** Four country ↔ capital pairs from one region, in a stable rotation. */
export function capitalMatchingChallenges(countries: readonly CountryFact[], options?: GeneratorOptions): BankDraft[] {
  const drafts: BankDraft[] = [];
  for (const [regionId, members] of byRegion(countries)) {
    const eligible = shuffle(members.filter((country) => singleCapital(country)), seededRandom(`match:${regionId}`));
    for (let start = 0; start + 4 <= eligible.length; start += 4) {
      const group = eligible.slice(start, start + 4);
      const factIds = group.map((country) => country.id);
      const draft: BankDraft = {
        id: bankItemId("capital-match", factIds), templateId: "capital-match", topicId: "geography", type: "matching",
        difficulty: difficultyFromSitelinks(Math.min(...group.map((country) => country.sitelinks))),
        conceptKey: `capital-match:${[...factIds].sort().join(",")}`, factIds, attribution: mergedAttribution(group), locales: {},
      };
      for (const lang of langsOf(options)) {
        const rows = group.map((country) => ({ country: label(country.name, lang), capital: label(singleCapital(country)!, lang) }));
        const region = label(group[0]!.regionName, lang);
        if (!region || rows.some((row) => !row.country || !row.capital)) continue;
        if (new Set(rows.map((row) => normalizeLabel(row.capital!))).size !== rows.length) continue;
        const pairs = shuffle(rows, seededRandom(`${draft.id}:${lang}`)).map((row, index) => ({
          left: { id: `l${index}`, label: row.country! }, right: { id: `r${index}`, label: row.capital! },
        }));
        draft.locales[lang] = {
          ...baseFields(draft, lang, 40), type: "matching", visual: "globe",
          title: T.capitalMatch.title[lang], prompt: fill(T.capitalMatch.prompt[lang], { region }), pairs,
          explanation: fill(T.capitalMatch.explanation[lang], { pairs: rows.map((row) => `${row.country} → ${row.capital}`).join(" · ") }),
          memoryTip: T.capitalMatch.tip[lang],
        };
      }
      if (Object.keys(draft.locales).length) drafts.push(draft);
      if (options?.limit && drafts.length >= options.limit) return drafts;
    }
  }
  return drafts;
}

/** Flags too similar to tell apart at quiz size; never offered as each other's distractor. */
export const LOOKALIKE_FLAGS: readonly (readonly string[])[] = [["NL", "LU"], ["TD", "RO", "AD", "MD"], ["ID", "MC", "PL"], ["IE", "CI"], ["AU", "NZ"], ["SN", "ML"], ["VE", "EC", "CO"], ["SI", "SK", "RU"]];
const lookalike = (a: string, b: string) => LOOKALIKE_FLAGS.some((set) => set.includes(a) && set.includes(b));

/** Public-domain national flag (flagcdn, sourced from Wikimedia Commons) → which country? */
export function flagChallenges(countries: readonly CountryFact[], options?: GeneratorOptions): BankDraft[] {
  const drafts: BankDraft[] = [];
  const regions = byRegion(countries);
  for (const country of countries) {
    const imageUrl = `https://flagcdn.com/w320/${country.iso2.toLowerCase()}.png`;
    const attribution: Attribution = {
      ...country.attribution, mediaUrl: imageUrl, mediaLicense: "public-domain",
      mediaLicenseUrl: "https://flagpedia.net/terms", restrictions: [...new Set([...country.attribution.restrictions, "insignia"])],
    };
    const draft: BankDraft = {
      id: bankItemId("flag", [country.id]), templateId: "flag", topicId: "geography", type: "image-identification",
      difficulty: difficultyFromSitelinks(country.sitelinks), conceptKey: `flag:${country.id}`, factIds: [country.id],
      attribution, media: { url: imageUrl, license: "public-domain" }, locales: {},
    };
    for (const lang of langsOf(options)) {
      const countryName = label(country.name, lang);
      const region = label(country.regionName, lang);
      if (!countryName || !region) continue;
      const distractors = pickDistractors(regions.get(country.regionId) ?? [], country, 3, (other) => label(other.name, lang), `${draft.id}:${lang}`, (other) => lookalike(country.iso2, other.iso2));
      if (!distractors) continue;
      const values = { country: countryName, region };
      draft.locales[lang] = {
        ...baseFields(draft, lang, 20), type: "image-identification", visual: "globe", country: country.name.en,
        imageAsset: imageUrl, imageUrl, imageDescription: T.flag.alt[lang],
        title: T.flag.title[lang], prompt: T.flag.prompt[lang],
        ...toChoices(countryName, distractors.map((d) => label(d.name, lang)!), draft.id),
        explanation: fill(T.flag.explanation[lang], values), memoryTip: fill(T.flag.tip[lang], values),
      };
    }
    if (Object.keys(draft.locales).length) drafts.push(draft);
    if (options?.limit && drafts.length >= options.limit) break;
  }
  return drafts;
}

/** Which of four same-region countries is largest? Requires a ≥15% gap so rounding can't flip the answer. */
export function areaChallenges(countries: readonly CountryFact[], options?: GeneratorOptions): BankDraft[] {
  const drafts: BankDraft[] = [];
  for (const [regionId, members] of byRegion(countries)) {
    const withArea = shuffle(members.filter((country) => country.areaKm2), seededRandom(`area:${regionId}`));
    for (let start = 0; start + 4 <= withArea.length; start += 4) {
      const group = withArea.slice(start, start + 4);
      const sorted = [...group].sort((a, b) => b.areaKm2! - a.areaKm2!);
      if (sorted[0]!.areaKm2! < sorted[1]!.areaKm2! * 1.15) continue;
      const largest = sorted[0]!;
      const factIds = group.map((country) => country.id);
      const draft: BankDraft = {
        id: bankItemId("area", factIds), templateId: "area", topicId: "geography", type: "multiple-choice",
        difficulty: sorted[0]!.areaKm2! > sorted[1]!.areaKm2! * 2 ? "gentle" : "curious",
        conceptKey: `area:${largest.id}`, factIds, attribution: mergedAttribution(group), locales: {},
      };
      for (const lang of langsOf(options)) {
        const names = group.map((country) => label(country.name, lang));
        const region = label(largest.regionName, lang);
        if (!region || names.some((name) => !name)) continue;
        const values = { region, country: label(largest.name, lang)!, area: numberFormat(lang, largest.areaKm2!) };
        draft.locales[lang] = {
          ...baseFields(draft, lang, 20), type: "multiple-choice", visual: "globe",
          title: T.area.title[lang], prompt: fill(T.area.prompt[lang], values),
          ...toChoices(values.country, group.filter((c) => c !== largest).map((c) => label(c.name, lang)!), draft.id),
          explanation: fill(T.area.explanation[lang], values), memoryTip: fill(T.area.tip[lang], values),
        };
      }
      if (Object.keys(draft.locales).length) drafts.push(draft);
      if (options?.limit && drafts.length >= options.limit) return drafts;
    }
  }
  return drafts;
}

/** Multi-fact items credit the shared source once (all Wikidata, CC0). */
function mergedAttribution(group: readonly CountryFact[]): Attribution {
  const first = group[0]!.attribution;
  return { ...first, sourceItemId: group.map((country) => country.id).join(","), sourceUrl: "https://www.wikidata.org/", sourceTitle: "Wikidata" };
}

