import { en } from "./en";
import { enLegal } from "./legal.en";
import type { LandingCopy } from "./types";
import type { LegalCopy } from "./legal-types";

export const LOCALES = ["en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

const copy: Record<Locale, LandingCopy> = { en };
const legal: Record<Locale, LegalCopy> = { en: enLegal };

export function getCopy(locale: Locale = DEFAULT_LOCALE): LandingCopy {
  return copy[locale];
}

export function getLegal(locale: Locale = DEFAULT_LOCALE): LegalCopy {
  return legal[locale];
}

export type { LandingCopy, LegalCopy };
