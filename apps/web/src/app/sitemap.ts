import type { MetadataRoute } from "next";

import { LEGAL_UPDATED, SITE_URL } from "@/landing/config";
import { LEGAL_LOCALES, LEGAL_SLUGS, getLegal, legalPath, type LegalDocKey } from "@/landing/i18n";

export default function sitemap(): MetadataRoute.Sitemap {
  const updated = new Date(`${LEGAL_UPDATED}T00:00:00Z`);
  const legal = (Object.keys(LEGAL_SLUGS) as LegalDocKey[]).flatMap((doc) =>
    LEGAL_LOCALES.map((locale) => ({
      url: `${SITE_URL}${legalPath(locale, doc)}`,
      lastModified: updated,
      changeFrequency: "yearly" as const,
      priority: 0.4,
      alternates: {
        languages: Object.fromEntries(LEGAL_LOCALES.map((other) => [getLegal(other).ui.lang, `${SITE_URL}${legalPath(other, doc)}`])),
      },
    })),
  );
  return [
    { url: SITE_URL, lastModified: updated, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/support`, lastModified: updated, changeFrequency: "monthly", priority: 0.6 },
    ...legal,
  ];
}
