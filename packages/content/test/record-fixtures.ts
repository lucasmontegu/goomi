/**
 * Re-records the raw fixtures from the live sources (manual; not part of `bun test`):
 *   CONTENT_USER_AGENT="Goomi/1.0 (https://…; contact@…)" bun packages/content/test/record-fixtures.ts
 * Keeps a small, representative slice so tests stay fast and the files stay reviewable.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { aicSearchUrl } from "../src/fetchers/aic";
import { COUNTRIES_QUERY, ELEMENTS_QUERY, INVENTIONS_QUERY, countryIdsToLabel, inventionIdsToLabel, labelsQuery, sparql } from "../src/fetchers/wikidata";

const userAgent = process.env.CONTENT_USER_AGENT;
if (!userAgent) throw new Error("Set CONTENT_USER_AGENT (Wikimedia requires contact details).");
const context = { userAgent };
const out = (name: string, data: unknown) => writeFileSync(join(import.meta.dir, "fixtures", name), `${JSON.stringify(data, null, 1)}\n`);
const labelsFor = async (ids: string[]) => {
  const bindings = [];
  for (let start = 0; start < ids.length; start += 150) bindings.push(...await sparql(labelsQuery(ids.slice(start, start + 150)), context));
  return bindings;
};

const KEEP_ISO = new Set(["AR", "BR", "CL", "UY", "PY", "BO", "PE", "EC", "CO", "VE", "GY", "SR", "ES", "PT", "FR", "IT", "DE", "NL", "LU", "BE", "IE", "RU", "ZA", "EG", "KE", "NG", "MA", "JP", "CN", "IN"]);
const countries = (await sparql(COUNTRIES_QUERY, context)).filter((b) => KEEP_ISO.has(b.iso2?.value ?? ""));
out("wikidata-countries.json", { bindings: countries, labels: await labelsFor(countryIdsToLabel(countries)) });

const elements = (await sparql(ELEMENTS_QUERY, context)).filter((b) => Number(b.num?.value) <= 40);
out("wikidata-elements.json", { bindings: elements, labels: await labelsFor([...new Set(elements.map((b) => b.el!.value.split("/").pop()!))]) });

const inventions = (await sparql(INVENTIONS_QUERY, context)).sort((a, b) => Number(b.sitelinks!.value) - Number(a.sitelinks!.value)).slice(0, 80);
out("wikidata-inventions.json", { bindings: inventions, labels: await labelsFor(inventionIdsToLabel(inventions)) });

const aic = await (await fetch(aicSearchUrl(1), { headers: { "AIC-User-Agent": userAgent } })).json() as { data: unknown[] };
out("aic-page1.json", { ...aic, data: aic.data.slice(0, 60) });
console.log("recorded", { countries: countries.length, elements: elements.length, inventions: inventions.length, aic: Math.min(60, aic.data.length) });
