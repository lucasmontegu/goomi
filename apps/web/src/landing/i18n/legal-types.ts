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
  pose: Pose;
  metaTitle: string;
  metaDescription: string;
  sections: LegalSection[];
};

export type LegalCopy = {
  privacy: LegalDoc;
  terms: LegalDoc;
  support: LegalDoc & { contactTitle: string; contactBody: string; contactCta: string };
};
