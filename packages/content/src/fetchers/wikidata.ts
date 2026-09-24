import type { Attribution } from "../attribution";
import type { CountryFact, ElementFact, EventFact } from "../facts";
import type { Labels } from "../i18n";
import { fetchJson, type FetchContext } from "./http";

export const WDQS_ENDPOINT = "https://query.wikidata.org/sparql";
type Binding = Record<string, { value: string; "xml:lang"?: string } | undefined>;
type SparqlResult = { results: { bindings: Binding[] } };

export async function sparql(query: string, context: FetchContext): Promise<Binding[]> {
  const result = await fetchJson<SparqlResult>(WDQS_ENDPOINT, {
    method: "POST",
    headers: { Accept: "application/sparql-results+json", "Content-Type": "application/x-www-form-urlencoded", "User-Agent": context.userAgent },
    body: new URLSearchParams({ query }).toString(),
  }, context);
  return result.results.bindings;
}

const qid = (uri: string | undefined) => uri?.split("/").pop() ?? "";
const num = (value: string | undefined) => (value === undefined || value === "" ? undefined : Number(value));

export const wikidataAttribution = (id: string, retrievedAt: string): Attribution => ({
  sourceId: "wikidata", sourceItemId: id, sourceUrl: `https://www.wikidata.org/wiki/${id}`, sourceTitle: "Wikidata",
  dataLicense: "CC0-1.0", attributionRequired: false, restrictions: [], retrievedAt,
});

// ─── Queries ────────────────────────────────────────────────────────────────────────────────
/** Current sovereign states. Capitals keep their statement rank so a preferred capital can win. */
export const COUNTRIES_QUERY = `SELECT ?country ?iso2 ?sitelinks (MAX(?area) AS ?areaKm2) (MAX(?pop) AS ?population)
  (GROUP_CONCAT(DISTINCT CONCAT(STR(?capital), "#", STR(?rank)); separator="|") AS ?capitals)
  (GROUP_CONCAT(DISTINCT ?continent; separator="|") AS ?continents)
WHERE {
  ?country wdt:P31 wd:Q3624078; wdt:P297 ?iso2; wikibase:sitelinks ?sitelinks.
  FILTER NOT EXISTS { ?country wdt:P576 [] }
  OPTIONAL { ?country p:P36 ?cs. ?cs ps:P36 ?capital; wikibase:rank ?rank.
    FILTER(?rank != wikibase:DeprecatedRank) FILTER NOT EXISTS { ?cs pq:P582 [] } }
  OPTIONAL { ?country wdt:P2046 ?area }
  OPTIONAL { ?country wdt:P1082 ?pop }
  OPTIONAL { ?country wdt:P30 ?continent }
} GROUP BY ?country ?iso2 ?sitelinks`;

export const ELEMENTS_QUERY = `SELECT ?el ?num ?symbol ?sitelinks WHERE {
  ?el wdt:P31 wd:Q11344; wdt:P1086 ?num; wdt:P246 ?symbol; wikibase:sitelinks ?sitelinks.
  FILTER(?num >= 1 && ?num <= 118)
}`;

/** Inventions and discoveries credited to people, with a year-precision date and real notability. */
export const INVENTIONS_QUERY = `SELECT ?item ?sitelinks (GROUP_CONCAT(DISTINCT STR(YEAR(?time)); separator="|") AS ?years)
  (GROUP_CONCAT(DISTINCT ?person; separator="|") AS ?people) (SAMPLE(?isEl) AS ?element)
WHERE {
  ?item wdt:P61 ?person; p:P575/psv:P575 ?tv; wikibase:sitelinks ?sitelinks.
  ?tv wikibase:timeValue ?time; wikibase:timePrecision ?prec.
  FILTER(?prec >= 9 && ?sitelinks >= 60)
  OPTIONAL { ?item wdt:P31 wd:Q11344 BIND(true AS ?isEl) }
} GROUP BY ?item ?sitelinks`;

export const labelsQuery = (ids: readonly string[]) => `SELECT ?item ?label WHERE {
  VALUES ?item { ${ids.map((id) => `wd:${id}`).join(" ")} }
  VALUES ?lang { "en" "es" "pt-br" "pt" }
  ?item rdfs:label ?label FILTER(LANG(?label) = ?lang)
}`;

// ─── Parsers (pure; covered by fixture tests) ───────────────────────────────────────────────
export type LabelMap = Map<string, Labels>;

/** Wikidata "pt-br" wins over "pt"; missing languages stay absent, never guessed. */
export function parseLabels(bindings: Binding[]): LabelMap {
  const raw = new Map<string, Record<string, string>>();
  for (const binding of bindings) {
    const id = qid(binding.item?.value);
    const lang = binding.label?.["xml:lang"];
    if (!id || !lang || !binding.label?.value) continue;
    raw.set(id, { ...raw.get(id), [lang]: binding.label.value });
  }
  const labels: LabelMap = new Map();
  for (const [id, byLang] of raw) {
    if (!byLang.en) continue;
    const pt = byLang["pt-br"] ?? byLang.pt;
    labels.set(id, { en: byLang.en, ...(byLang.es ? { es: byLang.es } : {}), ...(pt ? { "pt-BR": pt } : {}) });
  }
  return labels;
}

/** Continent ids collapse into six quiz regions (Oceania has several Wikidata items). */
const REGION_OF: Record<string, string> = { Q15: "Q15", Q46: "Q46", Q48: "Q48", Q49: "Q49", Q18: "Q18", Q538: "Q55643", Q55643: "Q55643", Q3960: "Q55643" };

export function countryIdsToLabel(bindings: Binding[]): string[] {
  const ids = new Set<string>(Object.values(REGION_OF));
  for (const binding of bindings) {
    ids.add(qid(binding.country?.value));
    for (const entry of binding.capitals?.value.split("|") ?? []) if (entry) ids.add(qid(entry.split("#")[0]));
  }
  ids.delete("");
  return [...ids];
}

export function parseCountries(bindings: Binding[], labels: LabelMap, retrievedAt: string): CountryFact[] {
  const facts: CountryFact[] = [];
  for (const binding of bindings) {
    const id = qid(binding.country?.value);
    const name = labels.get(id);
    const iso2 = binding.iso2?.value;
    // Transcontinental states take the lowest continent id (Europe before Asia) for a stable answer.
    const regionId = (binding.continents?.value.split("|").map((uri) => REGION_OF[qid(uri)]).filter(Boolean) as string[]).sort()[0];
    const regionName = regionId ? labels.get(regionId) : undefined;
    if (!name || !iso2 || !/^[A-Z]{2}$/.test(iso2) || !regionId || !regionName) continue;
    const statements = (binding.capitals?.value.split("|") ?? []).filter(Boolean).map((entry) => {
      const [uri, rank] = entry.split("#");
      return { id: qid(uri), preferred: rank?.endsWith("PreferredRank") ?? false };
    });
    const preferred = statements.filter((statement) => statement.preferred);
    const capitalIds = [...new Set((preferred.length ? preferred : statements).map((statement) => statement.id))];
    const capitals = capitalIds.map((capitalId) => labels.get(capitalId)).filter((label): label is Labels => Boolean(label));
    if (capitals.length !== capitalIds.length) continue;
    facts.push({
      kind: "country", id, iso2, name, capitals, regionId, regionName,
      ...(num(binding.areaKm2?.value) ? { areaKm2: num(binding.areaKm2?.value)! } : {}),
      ...(num(binding.population?.value) ? { population: num(binding.population?.value)! } : {}),
      sitelinks: num(binding.sitelinks?.value) ?? 0, attribution: wikidataAttribution(id, retrievedAt),
    });
  }
  return facts.sort((a, b) => a.id.localeCompare(b.id));
}

/** s/p/d/f block from the atomic number — the class used for element distractors. */
export function blockOf(atomicNumber: number): string {
  if ([1, 2, 3, 4, 11, 12, 19, 20, 37, 38, 55, 56, 87, 88].includes(atomicNumber)) return "s";
  if ((atomicNumber >= 57 && atomicNumber <= 70) || (atomicNumber >= 89 && atomicNumber <= 102)) return "f";
  if ((atomicNumber >= 21 && atomicNumber <= 30) || (atomicNumber >= 39 && atomicNumber <= 48) || (atomicNumber >= 71 && atomicNumber <= 80) || (atomicNumber >= 103 && atomicNumber <= 112)) return "d";
  return "p";
}

export function parseElements(bindings: Binding[], labels: LabelMap, retrievedAt: string): ElementFact[] {
  // Several items can claim a number (isotopes, hypothetical entries); keep the most notable one.
  const best = new Map<number, Binding>();
  for (const binding of bindings) {
    const atomicNumber = num(binding.num?.value);
    if (!atomicNumber || !Number.isInteger(atomicNumber)) continue;
    const current = best.get(atomicNumber);
    if (!current || (num(binding.sitelinks?.value) ?? 0) > (num(current.sitelinks?.value) ?? 0)) best.set(atomicNumber, binding);
  }
  const facts: ElementFact[] = [];
  for (const [atomicNumber, binding] of [...best].sort((a, b) => a[0] - b[0])) {
    const id = qid(binding.el?.value);
    const name = labels.get(id);
    const symbol = binding.symbol?.value;
    if (!name || !symbol || !/^[A-Z][a-z]{0,2}$/.test(symbol)) continue;
    facts.push({ kind: "element", id, atomicNumber, symbol, name, groupBlock: blockOf(atomicNumber), attribution: wikidataAttribution(id, retrievedAt) });
  }
  return facts;
}

export function inventionIdsToLabel(bindings: Binding[]): string[] {
  const ids = new Set<string>();
  for (const binding of bindings) {
    ids.add(qid(binding.item?.value));
    for (const person of binding.people?.value.split("|") ?? []) if (person) ids.add(qid(person));
  }
  ids.delete("");
  return [...ids];
}

/** Only single-person, single-year claims: co-inventors or disputed dates make unfair questions. */
export function parseInventions(bindings: Binding[], labels: LabelMap, retrievedAt: string): EventFact[] {
  const facts: EventFact[] = [];
  for (const binding of bindings) {
    const id = qid(binding.item?.value);
    const years = (binding.years?.value.split("|") ?? []).filter(Boolean);
    const people = (binding.people?.value.split("|") ?? []).filter(Boolean);
    const label = labels.get(id);
    const person = people.length === 1 ? labels.get(qid(people[0])) : undefined;
    if (!label || years.length !== 1) continue;
    // A label that is just a Q-id means the item has no real name in that language.
    if (/^Q\d+$/.test(label.en)) continue;
    facts.push({
      kind: "event", id, label, year: Number(years[0]), category: binding.element ? "discovery" : "invention",
      ...(person ? { person } : {}), sitelinks: num(binding.sitelinks?.value) ?? 0, attribution: wikidataAttribution(id, retrievedAt),
    });
  }
  return facts.sort((a, b) => a.id.localeCompare(b.id));
}

// ─── Live fetchers (server cron; never in the request path) ─────────────────────────────────
async function fetchLabels(ids: readonly string[], context: FetchContext): Promise<LabelMap> {
  const bindings: Binding[] = [];
  // Batches keep each query well under the 60 s WDQS timeout.
  for (let start = 0; start < ids.length; start += 150) bindings.push(...await sparql(labelsQuery(ids.slice(start, start + 150)), context));
  return parseLabels(bindings);
}

export async function fetchCountryFacts(context: FetchContext, now = new Date()): Promise<CountryFact[]> {
  const bindings = await sparql(COUNTRIES_QUERY, context);
  return parseCountries(bindings, await fetchLabels(countryIdsToLabel(bindings), context), now.toISOString());
}

export async function fetchElementFacts(context: FetchContext, now = new Date()): Promise<ElementFact[]> {
  const bindings = await sparql(ELEMENTS_QUERY, context);
  return parseElements(bindings, await fetchLabels([...new Set(bindings.map((binding) => qid(binding.el?.value)))], context), now.toISOString());
}

export async function fetchInventionFacts(context: FetchContext, now = new Date()): Promise<EventFact[]> {
  const bindings = await sparql(INVENTIONS_QUERY, context);
  return parseInventions(bindings, await fetchLabels(inventionIdsToLabel(bindings), context), now.toISOString());
}
