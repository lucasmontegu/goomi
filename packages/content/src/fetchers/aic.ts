import type { ArtworkFact } from "../facts";
import { fetchJson, type FetchContext } from "./http";

export const AIC_SEARCH = "https://api.artic.edu/api/v1/artworks/search";
const FIELDS = "id,title,image_id,artist_id,artist_title,date_start,date_end,date_display,is_public_domain";

type AicArtwork = {
  id: number; title: string | null; image_id: string | null; artist_id: number | null; artist_title: string | null;
  date_start: number | null; date_end: number | null; date_display: string | null; is_public_domain: boolean;
};
export type AicPage = { data: AicArtwork[]; config?: { iiif_url?: string }; pagination?: { total_pages?: number } };

/** Public-domain, museum-highlighted works with an image. 60 req/min; one page per call. */
export function aicSearchUrl(page: number): string {
  const params = new URLSearchParams();
  params.append("query[bool][must][][term][is_public_domain]", "true");
  params.append("query[bool][must][][term][is_boosted]", "true");
  params.append("query[bool][must][][exists][field]", "image_id");
  params.set("fields", FIELDS);
  params.set("limit", "100");
  params.set("page", String(page));
  return `${AIC_SEARCH}?${params}`;
}

/** Drops anything not explicitly public domain, anonymous, or undated; 843px is AIC's recommended IIIF width. */
export function parseAic(page: AicPage, retrievedAt: string): ArtworkFact[] {
  const iiif = page.config?.iiif_url ?? "https://www.artic.edu/iiif/2";
  const facts: ArtworkFact[] = [];
  for (const artwork of page.data) {
    if (!artwork.is_public_domain || !artwork.image_id || !artwork.artist_id || !artwork.artist_title || !artwork.title || artwork.date_start === null || !artwork.date_display) continue;
    if (/unknown|anonymous/i.test(artwork.artist_title)) continue;
    const imageUrl = `${iiif}/${artwork.image_id}/full/843,/0/default.jpg`;
    const sourceUrl = `https://www.artic.edu/artworks/${artwork.id}`;
    facts.push({
      kind: "artwork", id: `aic-${artwork.id}`, title: { en: artwork.title }, artist: artwork.artist_title, artistId: `aic-artist-${artwork.artist_id}`,
      year: artwork.date_start, ...(artwork.date_end !== null ? { yearEnd: artwork.date_end } : {}),
      dateDisplay: artwork.date_display, museum: "Art Institute of Chicago", imageUrl,
      attribution: {
        sourceId: "aic", sourceItemId: String(artwork.id), sourceUrl, sourceTitle: "Art Institute of Chicago",
        dataLicense: "CC0-1.0", mediaUrl: imageUrl, mediaLicense: "public-domain", mediaLicenseUrl: "https://www.artic.edu/open-access/open-access-images",
        creator: artwork.artist_title, attributionRequired: false, restrictions: [], retrievedAt,
      },
    });
  }
  return facts;
}

export async function fetchArtworkFacts(context: FetchContext, pages = 3, now = new Date()): Promise<ArtworkFact[]> {
  const facts: ArtworkFact[] = [];
  for (let page = 1; page <= pages; page++) {
    const result = await fetchJson<AicPage>(aicSearchUrl(page), { headers: { "AIC-User-Agent": context.userAgent, "User-Agent": context.userAgent } }, context);
    facts.push(...parseAic(result, now.toISOString()));
    if (page >= (result.pagination?.total_pages ?? 1)) break;
    await new Promise((resolve) => setTimeout(resolve, 1100));
  }
  return facts;
}
