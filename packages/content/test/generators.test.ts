import { describe, expect, test } from "bun:test";
import { attributionSchema } from "../src/attribution";
import { buildBank } from "../src/build";
import { artistChallenges, centuryOf } from "../src/generators/art";
import { LOOKALIKE_FLAGS, capitalChallenges, flagChallenges } from "../src/generators/countries";
import { MIN_YEAR_GAP, timelineChallenges } from "../src/generators/history";
import { translationChallenges } from "../src/generators/languages";
import type { SentenceFact } from "../src/facts";
import { normalizeLabel } from "../src/random";
import { validateChallenge } from "../src/validate";
import { allFacts, artworkFacts, countryFacts, inventionFacts } from "./helpers";

describe("bank build", () => {
  const result = buildBank(allFacts());

  test("produces a sizeable, fully valid bank from open data", () => {
    expect(result.accepted.length).toBeGreaterThan(150);
    expect(result.rejected).toEqual([]);
    for (const draft of result.accepted) {
      for (const challenge of Object.values(draft.locales)) expect(validateChallenge(challenge).issues).toEqual([]);
    }
  });

  test("covers every template and all three launch languages", () => {
    const templates = new Set(result.accepted.map((draft) => draft.templateId));
    for (const template of ["capital", "capital-match", "flag", "area", "artist", "century", "element-symbol", "element-match", "timeline", "inventor"]) expect(templates).toContain(template);
    const langs = new Set(result.accepted.flatMap((draft) => Object.keys(draft.locales)));
    expect([...langs].sort()).toEqual(["en", "es", "pt-BR"]);
  });

  test("is deterministic: same facts, same ids, same answers", () => {
    const again = buildBank(allFacts());
    expect(again.accepted.map((draft) => draft.id)).toEqual(result.accepted.map((draft) => draft.id));
    expect(JSON.stringify(again.accepted)).toBe(JSON.stringify(result.accepted));
  });

  test("every item is attributed and reviews share one concept across languages", () => {
    for (const draft of result.accepted) {
      expect(attributionSchema.safeParse(draft.attribution).success).toBe(true);
      const concepts = new Set(Object.values(draft.locales).map((challenge) => challenge!.conceptId));
      expect([...concepts]).toEqual([draft.conceptKey]);
    }
  });
});

describe("same-class distractors", () => {
  const countries = countryFacts();

  test("capital options are all capitals of countries in the same region", () => {
    const drafts = capitalChallenges(countries);
    expect(drafts.length).toBeGreaterThan(15);
    for (const draft of drafts) {
      const country = countries.find((fact) => fact.id === draft.factIds[0])!;
      const regional = new Set(countries.filter((fact) => fact.regionId === country.regionId).flatMap((fact) => fact.capitals.map((capital) => capital.en)));
      const challenge = draft.locales.en!;
      if (!("choices" in challenge)) throw new Error("expected choices");
      for (const choice of challenge.choices) expect(regional.has(choice.label)).toBe(true);
    }
  });

  test("countries with several capitals are skipped rather than made ambiguous", () => {
    const ids = new Set(capitalChallenges(countries).map((draft) => draft.factIds[0]));
    for (const country of countries.filter((fact) => fact.capitals.length !== 1)) expect(ids.has(country.id)).toBe(false);
  });

  test("lookalike flags are never offered against each other", () => {
    for (const draft of flagChallenges(countries)) {
      const country = countries.find((fact) => fact.id === draft.factIds[0])!;
      const challenge = draft.locales.en!;
      if (!("choices" in challenge)) throw new Error("expected choices");
      const offered = challenge.choices.map((choice) => countries.find((fact) => fact.name.en === choice.label)!.iso2);
      for (const iso2 of offered) {
        if (iso2 === country.iso2) continue;
        expect(LOOKALIKE_FLAGS.some((set) => set.includes(iso2) && set.includes(country.iso2))).toBe(false);
      }
      expect(challenge.type === "image-identification" && challenge.imageUrl).toBe(`https://flagcdn.com/w320/${country.iso2.toLowerCase()}.png`);
    }
  });

  test("artist distractors are other artists from a neighbouring century", () => {
    const artworks = artworkFacts();
    for (const draft of artistChallenges(artworks)) {
      const artwork = artworks.find((fact) => fact.id === draft.factIds[0])!;
      const challenge = draft.locales.en!;
      if (!("choices" in challenge)) throw new Error("expected choices");
      expect(new Set(challenge.choices.map((choice) => normalizeLabel(choice.label))).size).toBe(4);
      for (const choice of challenge.choices) {
        const peer = artworks.find((fact) => fact.artist === choice.label)!;
        expect(Math.abs(centuryOf(peer.year) - centuryOf(artwork.year))).toBeLessThanOrEqual(1);
      }
    }
  });

  test("timelines are ordered, spaced and never pre-sorted", () => {
    const events = inventionFacts();
    const drafts = timelineChallenges(events);
    expect(drafts.length).toBeGreaterThan(3);
    for (const draft of drafts) {
      const challenge = draft.locales.en!;
      if (challenge.type !== "historical-order") throw new Error("expected order");
      const years = challenge.correctOrder.map((id) => events.find((event) => event.id === id)!.year);
      for (let index = 1; index < years.length; index++) expect(years[index]! - years[index - 1]!).toBeGreaterThanOrEqual(MIN_YEAR_GAP);
      expect(challenge.items.map((item) => item.id)).not.toEqual(challenge.correctOrder);
    }
  });
});

describe("localization", () => {
  test("Spanish and Portuguese items are written entirely in their language", () => {
    const [draft] = capitalChallenges(countryFacts().filter((fact) => fact.iso2 === "AR" || fact.regionName.en === "South America"));
    expect(draft!.locales.es!.prompt).toStartWith("¿Cuál es la capital de");
    expect(draft!.locales["pt-BR"]!.prompt).toStartWith("Qual é a capital de");
    expect(draft!.locales.es!.locale).toBe("es");
  });
});

describe("license policy", () => {
  const attribution = (license: string, creator?: string) => ({
    sourceId: "tatoeba" as const, sourceItemId: "1", sourceUrl: "https://tatoeba.org/en/sentences/show/1", sourceTitle: "Tatoeba",
    dataLicense: license, attributionRequired: license !== "CC0-1.0", restrictions: [], retrievedAt: "2026-09-23",
    ...(creator ? { creator, creditLine: `Sentence by ${creator} (Tatoeba, ${license})` } : {}),
  });
  const sentence = (id: string, text: string, en: string, license = "CC0-1.0", creator?: string): SentenceFact => ({
    kind: "sentence", id, lang: "spa", text, translations: [{ lang: "eng", text: en }], attribution: { ...attribution(license, creator), sourceItemId: id },
  });
  const sentences = [
    sentence("1", "Tengo hambre.", "I'm hungry."), sentence("2", "Hace frío.", "It's cold."),
    sentence("3", "Estoy cansado.", "I'm tired."), sentence("4", "Me gusta leer.", "I like reading."),
    sentence("5", "¿Dónde está el baño?", "Where is the bathroom?", "CC-BY-2.0-FR", "someone"),
  ];

  test("CC BY sentences are excluded until ADR-001 Q6 is approved", () => {
    const drafts = translationChallenges(sentences, { langs: ["en"] });
    expect(drafts.map((draft) => draft.factIds[0]).sort()).toEqual(["1", "2", "3", "4"]);
    const challenge = drafts[0]!.locales.en!;
    expect(challenge.language).toBe("Spanish");
  });

  test("with approval, CC BY sentences need and carry a credit line", () => {
    const drafts = translationChallenges(sentences, { langs: ["en"], policy: { allowAttributionLicenses: true } });
    const credited = drafts.find((draft) => draft.factIds[0] === "5");
    expect(credited?.locales.en?.source?.creditLine).toContain("someone");
  });
});
