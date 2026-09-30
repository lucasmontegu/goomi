import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LegalPage } from "./components/legal-page";
import { LEGAL_LOCALES, getLegal, isLegalLocale, legalPath, type LegalDocKey, type LegalLocale } from "./i18n";

const OG_LOCALE: Record<LegalLocale, string> = { en: "en_US", es: "es_419", pt: "pt_BR" };

/** Prefixed languages; English is served at the root. */
export function legalLocaleParams() {
  return LEGAL_LOCALES.filter((locale) => locale !== "en").map((lang) => ({ lang }));
}

export function prefixedLocale(lang: string): LegalLocale {
  if (lang === "en" || !isLegalLocale(lang)) notFound();
  return lang;
}

export function legalMetadata(locale: LegalLocale, key: LegalDocKey): Metadata {
  const doc = getLegal(locale)[key];
  const path = legalPath(locale, key);
  const languages: Record<string, string> = { "x-default": legalPath("en", key) };
  for (const other of LEGAL_LOCALES) languages[getLegal(other).ui.lang] = legalPath(other, key);
  return {
    title: doc.metaTitle,
    description: doc.metaDescription,
    alternates: { canonical: path, languages },
    openGraph: { url: path, title: doc.metaTitle, description: doc.metaDescription, locale: OG_LOCALE[locale] },
  };
}

export function LegalRoute({ locale, doc }: { locale: LegalLocale; doc: LegalDocKey }) {
  const copy = getLegal(locale);
  const alternates = LEGAL_LOCALES.filter((other) => other !== locale).map((other) => ({
    lang: getLegal(other).ui.lang,
    label: getLegal(other).ui.languageName,
    href: legalPath(other, doc),
  }));
  return <LegalPage doc={copy[doc]} ui={copy.ui} alternates={alternates} />;
}
