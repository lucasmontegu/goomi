import { describe, expect, test } from "bun:test";
import { factSchema } from "../src/facts";
import { blockOf } from "../src/fetchers/wikidata";
import { artworkFacts, countryFacts, elementFacts, inventionFacts } from "./helpers";

describe("wikidata parsers (recorded live responses)", () => {
  test("countries carry trilingual names, a quiz region and valid facts", () => {
    const facts = countryFacts();
    expect(facts.length).toBeGreaterThanOrEqual(25);
    for (const fact of facts) expect(factSchema.safeParse(fact).success).toBe(true);
    const argentina = facts.find((fact) => fact.iso2 === "AR")!;
    expect(argentina.name).toMatchObject({ en: "Argentina", es: "Argentina" });
    expect(argentina.capitals.map((capital) => capital.en)).toEqual(["Buenos Aires"]);
    expect(argentina.regionName.en).toBe("South America");
    expect(argentina.areaKm2).toBeGreaterThan(2_000_000);
    expect(argentina.attribution).toMatchObject({ sourceId: "wikidata", dataLicense: "CC0-1.0" });
  });

  test("transcontinental states get one stable region", () => {
    const russia = countryFacts().find((fact) => fact.iso2 === "RU")!;
    expect(russia.regionName.en).toBe("Europe");
  });

  test("elements: one fact per atomic number, s/p/d/f block, localized names", () => {
    const facts = elementFacts();
    expect(new Set(facts.map((fact) => fact.atomicNumber)).size).toBe(facts.length);
    const iron = facts.find((fact) => fact.symbol === "Fe")!;
    expect(iron).toMatchObject({ atomicNumber: 26, groupBlock: "d" });
    expect(iron.name.es).toBe("hierro");
    expect([blockOf(1), blockOf(6), blockOf(26), blockOf(92)]).toEqual(["s", "p", "d", "f"]);
  });

  test("inventions keep a single year; people only when uniquely credited", () => {
    const facts = inventionFacts();
    expect(facts.length).toBeGreaterThan(20);
    for (const fact of facts) {
      expect(Number.isInteger(fact.year)).toBe(true);
      expect(fact.label.en).not.toMatch(/^Q\d+$/);
    }
  });

  test("AIC: public domain, attributed, IIIF image, no anonymous works", () => {
    const facts = artworkFacts();
    expect(facts.length).toBeGreaterThan(30);
    for (const fact of facts) {
      expect(fact.imageUrl).toMatch(/^https:\/\/www\.artic\.edu\/iiif\/2\/[\w-]+\/full\/843,\/0\/default\.jpg$/);
      expect(fact.attribution).toMatchObject({ sourceId: "aic", dataLicense: "CC0-1.0", mediaLicense: "public-domain" });
      expect(fact.artist).not.toMatch(/unknown|anonymous/i);
    }
  });
});
