import { z } from "zod";
import { attributionSchema } from "./attribution";

const labels = z.object({ en: z.string().min(1), es: z.string().min(1).optional(), "pt-BR": z.string().min(1).optional() });

/** Wikidata (CC0) country record. `regionId` is the grouping used for same-class distractors. */
export const countryFactSchema = z.object({
  kind: z.literal("country"),
  id: z.string().regex(/^Q\d+$/),
  iso2: z.string().regex(/^[A-Z]{2}$/),
  name: labels,
  /** Several capitals (e.g. Bolivia) make "the capital" ambiguous; templates skip those. */
  capitals: z.array(labels),
  regionId: z.string(),
  regionName: labels,
  areaKm2: z.number().positive().optional(),
  population: z.number().positive().optional(),
  /** Wikidata sitelink count — a notability proxy used for difficulty. */
  sitelinks: z.number().int().nonnegative(),
  attribution: attributionSchema,
});

/** Public-domain artwork from the Art Institute of Chicago or The Met. */
export const artworkFactSchema = z.object({
  kind: z.literal("artwork"),
  id: z.string(),
  title: labels,
  artist: z.string().min(1),
  artistId: z.string().min(1),
  /** Start year of the date range; used for the century and for ordering. */
  year: z.number().int(),
  yearEnd: z.number().int().optional(),
  dateDisplay: z.string().min(1),
  museum: z.string().min(1),
  imageUrl: z.url({ protocol: /^https$/ }),
  attribution: attributionSchema,
});

/** Wikidata (CC0) chemical element; `groupBlock` (s/p/d/f) is the distractor class. */
export const elementFactSchema = z.object({
  kind: z.literal("element"),
  id: z.string(),
  atomicNumber: z.number().int().min(1).max(118),
  symbol: z.string().regex(/^[A-Z][a-z]{0,2}$/),
  name: labels,
  groupBlock: z.string(),
  attribution: attributionSchema,
});

/** Wikidata invention/discovery/event with a single well-established year. */
export const eventFactSchema = z.object({
  kind: z.literal("event"),
  id: z.string().regex(/^Q\d+$/),
  label: labels,
  year: z.number().int(),
  category: z.enum(["invention", "discovery", "event"]),
  person: labels.optional(),
  sitelinks: z.number().int().nonnegative(),
  attribution: attributionSchema,
});

/** Tatoeba sentence with translations; license per sentence. */
export const sentenceFactSchema = z.object({
  kind: z.literal("sentence"),
  id: z.string(),
  /** Language being learned, e.g. "es". */
  lang: z.string(),
  text: z.string().min(1).max(160),
  translations: z.array(z.object({ lang: z.string(), text: z.string().min(1).max(200) })),
  attribution: attributionSchema,
});

export const factSchema = z.discriminatedUnion("kind", [countryFactSchema, artworkFactSchema, elementFactSchema, eventFactSchema, sentenceFactSchema]);

export type CountryFact = z.infer<typeof countryFactSchema>;
export type ArtworkFact = z.infer<typeof artworkFactSchema>;
export type ElementFact = z.infer<typeof elementFactSchema>;
export type EventFact = z.infer<typeof eventFactSchema>;
export type SentenceFact = z.infer<typeof sentenceFactSchema>;
export type Fact = z.infer<typeof factSchema>;
export type FactKind = Fact["kind"];
