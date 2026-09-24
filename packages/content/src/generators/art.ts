import { baseFields, bankItemId, langsOf, pickDistractors, toChoices, type BankDraft, type GeneratorOptions } from "../bank";
import type { ArtworkFact } from "../facts";
import { CENTURY, T, fill, label } from "../i18n";
import { normalizeLabel } from "../random";

export const centuryOf = (year: number) => (year > 0 ? Math.floor((year - 1) / 100) + 1 : 0);

/** Artist identification from a public-domain image; distractor artists come from the same century. */
export function artistChallenges(artworks: readonly ArtworkFact[], options?: GeneratorOptions): BankDraft[] {
  const drafts: BankDraft[] = [];
  const usedArtists = new Set<string>();
  for (const artwork of artworks) {
    if (artwork.year <= 0) continue;
    // One item per artist keeps the bank varied and avoids near-duplicate questions.
    if (usedArtists.has(artwork.artistId)) continue;
    const century = centuryOf(artwork.year);
    const peers = uniqueByArtist(artworks.filter((other) => other.year > 0 && Math.abs(centuryOf(other.year) - century) <= 1));
    const draft: BankDraft = {
      id: bankItemId("artist", [artwork.id]), templateId: "artist", topicId: "art", type: "image-identification",
      difficulty: "curious", conceptKey: `artist:${artwork.id}`, factIds: [artwork.id], attribution: artwork.attribution,
      media: { url: artwork.imageUrl, license: artwork.attribution.mediaLicense ?? "public-domain" }, locales: {},
    };
    for (const lang of langsOf(options)) {
      const title = label(artwork.title, lang) ?? artwork.title.en;
      const distractors = pickDistractors(peers, artwork, 3, (other) => other.artist, `${draft.id}:${lang}`, (other) => other.artistId === artwork.artistId || normalizeLabel(other.artist) === normalizeLabel(artwork.artist));
      if (!distractors) continue;
      const values = { title, artist: artwork.artist, date: artwork.dateDisplay, museum: artwork.museum };
      draft.locales[lang] = {
        ...baseFields(draft, lang, 25), type: "image-identification", visual: "sunflower",
        imageAsset: artwork.imageUrl, imageUrl: artwork.imageUrl, imageDescription: title,
        title: T.artist.title[lang], prompt: fill(T.artist.prompt[lang], values),
        ...toChoices(artwork.artist, distractors.map((d) => d.artist), draft.id),
        explanation: fill(T.artist.explanation[lang], values), memoryTip: fill(T.artist.tip[lang], values),
      };
    }
    if (Object.keys(draft.locales).length) {
      drafts.push(draft);
      usedArtists.add(artwork.artistId);
    }
    if (options?.limit && drafts.length >= options.limit) break;
  }
  return drafts;
}

/** "In which century…?" with the three neighbouring centuries as options. Skips works dated across a century boundary. */
export function centuryChallenges(artworks: readonly ArtworkFact[], options?: GeneratorOptions): BankDraft[] {
  const drafts: BankDraft[] = [];
  for (const artwork of artworks) {
    const century = centuryOf(artwork.year);
    // A date range that crosses a century boundary has no single right answer.
    if (century < 3 || (artwork.yearEnd !== undefined && centuryOf(artwork.yearEnd) !== century)) continue;
    const draft: BankDraft = {
      id: bankItemId("century", [artwork.id]), templateId: "century", topicId: "art", type: "multiple-choice",
      difficulty: "deep", conceptKey: `century:${artwork.id}`, factIds: [artwork.id], attribution: artwork.attribution, locales: {},
    };
    const offsets = century >= 21 ? [-3, -2, -1] : [-2, -1, 1];
    for (const lang of langsOf(options)) {
      const title = label(artwork.title, lang) ?? artwork.title.en;
      const values = { title, artist: artwork.artist, date: artwork.dateDisplay, century: CENTURY[lang](century) };
      draft.locales[lang] = {
        ...baseFields(draft, lang, 20), type: "multiple-choice", visual: "sunflower",
        title: T.century.title[lang], prompt: fill(T.century.prompt[lang], values),
        ...toChoices(values.century, offsets.map((offset) => CENTURY[lang](century + offset)), draft.id),
        explanation: fill(T.century.explanation[lang], values), memoryTip: fill(T.century.tip[lang], values),
      };
    }
    drafts.push(draft);
    if (options?.limit && drafts.length >= options.limit) break;
  }
  return drafts;
}

function uniqueByArtist(artworks: readonly ArtworkFact[]): ArtworkFact[] {
  const seen = new Set<string>();
  return artworks.filter((artwork) => (seen.has(artwork.artistId) ? false : (seen.add(artwork.artistId), true)));
}
