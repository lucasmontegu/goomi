import { z } from "zod";
import type { Source } from "./schema";

export const SOURCE_IDS = ["wikidata", "aic", "met", "natural-earth", "flagcdn", "pubchem", "nasa-images", "tatoeba"] as const;
export type SourceId = (typeof SOURCE_IDS)[number];

/**
 * Licenses content may be redistributed under inside a paid app without share-alike obligations.
 * Share-alike licenses (CC-BY-SA-*, GFDL, ODbL) are intentionally absent: storing derived questions
 * under them would put the whole bank under that license.
 */
export const OPEN_LICENSES = ["CC0-1.0", "public-domain", "NASA-media", "ISC"] as const;
/** Attribution-only licenses; allowed only with a creator and credit line (ADR-001 Q6, off by default). */
export const ATTRIBUTION_LICENSES = ["CC-BY-2.0-FR", "CC-BY-4.0"] as const;
export type License = (typeof OPEN_LICENSES)[number] | (typeof ATTRIBUTION_LICENSES)[number];

export const attributionSchema = z.object({
  sourceId: z.enum(SOURCE_IDS),
  sourceItemId: z.string().min(1),
  sourceUrl: z.url({ protocol: /^https$/ }),
  sourceTitle: z.string().min(1),
  dataLicense: z.string().min(1),
  mediaUrl: z.url({ protocol: /^https$/ }).optional(),
  mediaLicense: z.string().optional(),
  mediaLicenseUrl: z.url().optional(),
  creator: z.string().optional(),
  creditLine: z.string().optional(),
  attributionRequired: z.boolean(),
  /** e.g. "insignia" (flags), "no-endorsement" (NASA), "personality-rights". */
  restrictions: z.array(z.string()).default([]),
  retrievedAt: z.string(),
  sourceRevision: z.string().optional(),
});
export type Attribution = z.infer<typeof attributionSchema>;

export type LicensePolicy = { allowAttributionLicenses: boolean };
export const DEFAULT_LICENSE_POLICY: LicensePolicy = { allowAttributionLicenses: false };

/** Why an attribution cannot be published under the policy, or null when it can. */
export function licenseProblem(attribution: Attribution, policy: LicensePolicy = DEFAULT_LICENSE_POLICY): string | null {
  const check = (license: string | undefined, what: string) => {
    if (!license) return `${what} license missing`;
    if ((OPEN_LICENSES as readonly string[]).includes(license)) return null;
    if ((ATTRIBUTION_LICENSES as readonly string[]).includes(license)) {
      if (!policy.allowAttributionLicenses) return `${what} license ${license} needs ADR-001 Q6 approval`;
      if (!attribution.creator || !attribution.creditLine) return `${what} license ${license} requires a creator and credit line`;
      return null;
    }
    return `${what} license ${license} is not allowed`;
  };
  return check(attribution.dataLicense, "data") ?? (attribution.mediaUrl ? check(attribution.mediaLicense, "media") : null);
}

/** The compact provenance the device shows under a challenge. */
export function toChallengeSource(attribution: Attribution): Source {
  return {
    title: attribution.sourceTitle,
    url: attribution.sourceUrl,
    license: attribution.dataLicense,
    ...(attribution.mediaLicense ? { mediaLicense: attribution.mediaLicense } : {}),
    ...(attribution.creator ? { creator: attribution.creator } : {}),
    ...(attribution.creditLine ? { creditLine: attribution.creditLine } : {}),
  };
}
