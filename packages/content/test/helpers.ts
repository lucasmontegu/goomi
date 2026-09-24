import aic from "./fixtures/aic-page1.json";
import countries from "./fixtures/wikidata-countries.json";
import elements from "./fixtures/wikidata-elements.json";
import inventions from "./fixtures/wikidata-inventions.json";
import { parseAic, type AicPage } from "../src/fetchers/aic";
import { parseCountries, parseElements, parseInventions, parseLabels } from "../src/fetchers/wikidata";

const AT = "2026-09-23T00:00:00.000Z";
type Raw = { bindings: never[]; labels: never[] };
export const countryFacts = () => parseCountries((countries as Raw).bindings, parseLabels((countries as Raw).labels), AT);
export const elementFacts = () => parseElements((elements as Raw).bindings, parseLabels((elements as Raw).labels), AT);
export const inventionFacts = () => parseInventions((inventions as Raw).bindings, parseLabels((inventions as Raw).labels), AT);
export const artworkFacts = () => parseAic(aic as unknown as AicPage, AT);
export const allFacts = () => [...countryFacts(), ...elementFacts(), ...inventionFacts(), ...artworkFacts()];
