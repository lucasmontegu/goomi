import { en } from "./en";
import { enLegal, enSupport } from "./legal.en";
import { esLegal } from "./legal.es";
import { ptLegal } from "./legal.pt";
import type { LandingCopy } from "./types";
import type { LegalCopy, LegalDocKey } from "./legal-types";

export const LOCALES = ["en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

const copy: Record<Locale, LandingCopy> = { en };

export function getCopy(locale: Locale = DEFAULT_LOCALE): LandingCopy {
  return copy[locale];
}

/**
 * The legal pages ship in more languages than the landing, because consumer and privacy law in Brazil
 * and Spanish-speaking Latin America expects them in the reader's language. English lives at the root
 * (/privacy); the others under a prefix (/es/privacy, /pt/privacy).
 */
export const LEGAL_LOCALES = ["en", "es", "pt"] as const;
export type LegalLocale = (typeof LEGAL_LOCALES)[number];

const legal: Record<LegalLocale, LegalCopy> = { en: enLegal, es: esLegal, pt: ptLegal };

export function getLegal(locale: LegalLocale = "en"): LegalCopy {
  return legal[locale];
}

export function isLegalLocale(value: string): value is LegalLocale {
  return (LEGAL_LOCALES as readonly string[]).includes(value);
}

/** Path segment of each legal document. */
export const LEGAL_SLUGS: Record<LegalDocKey, string> = {
  privacy: "privacy",
  terms: "terms",
  deleteAccount: "delete-account",
};

export function legalPath(locale: LegalLocale, doc: LegalDocKey): string {
  return locale === "en" ? `/${LEGAL_SLUGS[doc]}` : `/${locale}/${LEGAL_SLUGS[doc]}`;
}

export const support = enSupport;

export type { LandingCopy, LegalCopy, LegalDocKey };
