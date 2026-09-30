import type { Pose } from "./types";

export type LegalSection = {
  id: string;
  heading: string;
  body?: string[];
  bullets?: string[];
  links?: { label: string; href: string }[];
};

export type LegalDoc = {
  eyebrow: string;
  title: string;
  lead: string;
  /** A highlighted paragraph above the sections, for what a reader must not miss. */
  notice?: string;
  pose: Pose;
  metaTitle: string;
  metaDescription: string;
  sections: LegalSection[];
};

/** The legal pages published in every language. */
export type LegalDocKey = "privacy" | "terms" | "deleteAccount";

export type LegalUi = {
  /** BCP 47 tag, used for the page's `lang` and its date format. */
  lang: string;
  languageName: string;
  updated: string;
  onThisPage: string;
  contact: string;
  otherLanguages: string;
};

export type LegalCopy = Record<LegalDocKey, LegalDoc> & { ui: LegalUi };

export type SupportCopy = LegalDoc & { contactTitle: string; contactBody: string; contactCta: string };
