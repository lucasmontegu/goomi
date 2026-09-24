/**
 * Deterministic document structure: language, sections and chunks with page/paragraph/char
 * provenance (ADR-001 §5.2). No model calls here.
 */
export type Page = { n: number; text: string };
export type Paragraph = { text: string; page: number; index: number; charStart: number; charEnd: number };
export type Section = { index: number; heading: string | null; paragraphs: Paragraph[]; pageStart: number; pageEnd: number; tokenCount: number };
export type ChunkDraft = {
  sectionIndex: number; index: number; text: string;
  pageStart: number; pageEnd: number; paragraphStart: number; paragraphEnd: number;
  charStart: number; charEnd: number; tokenCount: number;
};

/** ~3.8 characters per token for es/en/pt prose; good enough for budgeting and tier checks. */
export const estimateTokens = (text: string) => Math.ceil(text.length / 3.8);

const STOPWORDS: Record<"en" | "es" | "pt-BR", string[]> = {
  en: ["the", "and", "of", "to", "is", "in", "that", "it", "with", "for", "are", "this", "as", "was", "on"],
  es: ["el", "la", "de", "que", "y", "en", "los", "las", "es", "por", "un", "una", "con", "para", "del"],
  "pt-BR": ["o", "a", "de", "que", "e", "em", "os", "as", "é", "por", "um", "uma", "com", "para", "do", "não", "da"],
};
/** Stopword vote; returns null when the text is too short or too mixed to call. */
export function detectLang(text: string): "en" | "es" | "pt-BR" | null {
  const words = text.toLocaleLowerCase().match(/\p{L}+/gu)?.slice(0, 4000) ?? [];
  if (words.length < 20) return null;
  const scores = Object.entries(STOPWORDS).map(([lang, list]) => {
    const set = new Set(list);
    return [lang, words.filter((word) => set.has(word)).length] as const;
  }).sort((a, b) => b[1] - a[1]);
  const [best, second] = scores;
  if (!best || best[1] < 5 || best[1] < (second?.[1] ?? 0) * 1.2) return null;
  return best[0] as "en" | "es" | "pt-BR";
}

const HEADING = /^(?:(?:\d+(?:\.\d+)*|[IVXLC]+)[.)]?\s+\S.{0,80}|(?:chapter|cap[ií]tulo|unit|unidad|unidade|tema|section|secci[oó]n|se[cç][aã]o)\b.{0,80}|[\p{Lu}\d][\p{Lu}\d\s,:;'’()-]{3,80})$/iu;
const isHeading = (line: string) => line.length <= 90 && !/[.!?]$/.test(line) && HEADING.test(line) && line.split(/\s+/).length <= 12;

/** Splits page text into paragraphs, keeping page numbers and offsets into the joined document. */
export function paragraphsOf(pages: readonly Page[]): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  let offset = 0;
  for (const page of pages) {
    const blocks = page.text.replace(/\r\n?/g, "\n").split(/\n\s*\n|\n(?=[-•*]\s)|\n(?=\d+[.)]\s)/);
    for (const block of blocks) {
      const text = block.replace(/-\n(?=\p{Ll})/gu, "").replace(/\s*\n\s*/g, " ").replace(/\s+/g, " ").trim();
      if (!text) continue;
      paragraphs.push({ text, page: page.n, index: paragraphs.length, charStart: offset, charEnd: offset + text.length });
      offset += text.length + 2;
    }
  }
  return paragraphs;
}

/** Heading-delimited sections, merged when tiny and split when over `maxTokens` (keeps qwen3.7's ≤32K tier). */
export function sectionize(paragraphs: readonly Paragraph[], maxTokens = 24_000, minTokens = 300): Section[] {
  const raw: { heading: string | null; paragraphs: Paragraph[] }[] = [];
  for (const paragraph of paragraphs) {
    if (isHeading(paragraph.text) || !raw.length) raw.push({ heading: isHeading(paragraph.text) ? paragraph.text : null, paragraphs: isHeading(paragraph.text) ? [] : [paragraph] });
    else raw[raw.length - 1]!.paragraphs.push(paragraph);
  }
  const merged: typeof raw = [];
  for (const section of raw) {
    const previous = merged[merged.length - 1];
    const tokens = estimateTokens(section.paragraphs.map((p) => p.text).join(" "));
    const previousTokens = previous ? estimateTokens(previous.paragraphs.map((p) => p.text).join(" ")) : 0;
    if (previous && (tokens < minTokens || previousTokens < minTokens) && previousTokens + tokens <= maxTokens) previous.paragraphs.push(...section.paragraphs);
    else merged.push({ heading: section.heading, paragraphs: [...section.paragraphs] });
  }
  const sections: Section[] = [];
  for (const section of merged.filter((s) => s.paragraphs.length)) {
    let current: Paragraph[] = [];
    let tokens = 0;
    const flush = () => {
      if (!current.length) return;
      sections.push({ index: sections.length, heading: section.heading, paragraphs: current, pageStart: current[0]!.page, pageEnd: current[current.length - 1]!.page, tokenCount: tokens });
      current = []; tokens = 0;
    };
    for (const paragraph of section.paragraphs) {
      const size = estimateTokens(paragraph.text);
      if (tokens + size > maxTokens) flush();
      current.push(paragraph); tokens += size;
    }
    flush();
  }
  return sections;
}

/**
 * ~`target`-token chunks cut at paragraph boundaries with one trailing paragraph of overlap
 * (a single paragraph larger than the target is split at sentence ends).
 */
export function chunkSections(sections: readonly Section[], target = 400, overlapTokens = 60): ChunkDraft[] {
  const chunks: ChunkDraft[] = [];
  for (const section of sections) {
    const pieces = section.paragraphs.flatMap((paragraph) => splitLong(paragraph, target));
    let start = 0;
    while (start < pieces.length) {
      let end = start;
      let tokens = 0;
      while (end < pieces.length && (end === start || tokens + estimateTokens(pieces[end]!.text) <= target)) tokens += estimateTokens(pieces[end++]!.text);
      const slice = pieces.slice(start, end);
      chunks.push({
        sectionIndex: section.index, index: chunks.length, text: slice.map((p) => p.text).join("\n\n"),
        pageStart: slice[0]!.page, pageEnd: slice[slice.length - 1]!.page,
        paragraphStart: slice[0]!.index + 1, paragraphEnd: slice[slice.length - 1]!.index + 1,
        charStart: slice[0]!.charStart, charEnd: slice[slice.length - 1]!.charEnd, tokenCount: tokens,
      });
      if (end >= pieces.length) break;
      // Overlap: repeat the last piece when it is small enough, so ideas spanning a boundary stay whole.
      start = end - 1 > start && estimateTokens(pieces[end - 1]!.text) <= overlapTokens ? end - 1 : end;
    }
  }
  return chunks;
}

function splitLong(paragraph: Paragraph, target: number): Paragraph[] {
  if (estimateTokens(paragraph.text) <= target) return [paragraph];
  const sentences = paragraph.text.match(/[^.!?]+(?:[.!?]+|$)\s*/g) ?? [paragraph.text];
  const parts: Paragraph[] = [];
  let buffer = "";
  let offset = paragraph.charStart;
  const push = () => {
    const text = buffer.trim();
    if (text) parts.push({ ...paragraph, text, charStart: offset, charEnd: offset + text.length });
    offset += buffer.length;
    buffer = "";
  };
  for (const sentence of sentences) {
    if (buffer && estimateTokens(buffer + sentence) > target) push();
    buffer += sentence;
  }
  push();
  return parts;
}

/** Whitespace/quote-insensitive normalization used for exact-quote grounding checks. */
export const normalizeForQuote = (text: string) => text.normalize("NFKC").replace(/[“”«»„"]/g, "\"").replace(/[‘’`´]/g, "'").replace(/[‐-―]/g, "-").replace(/\s+/g, " ").trim().toLocaleLowerCase();
export const containsQuote = (haystack: string, quote: string) => {
  const needle = normalizeForQuote(quote);
  return needle.length >= 8 && normalizeForQuote(haystack).includes(needle);
};
