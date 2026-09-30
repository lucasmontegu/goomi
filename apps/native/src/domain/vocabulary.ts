import { seededRandom, shuffle } from "@goomi/content";
import { hashString } from "./engine";
import type { Challenge, Difficulty } from "./types";

/**
 * Word lists ("你好 (nǐ hǎo) – hola", "apple – manzana") become a ladder of prompts per word,
 * built on the device: recognise it (gentle), pick it or its reading (curious), type it (deep).
 * Written practice only; listening comes from cached audio later, never mid-interruption.
 */
export type VocabLanguage = "Chinese" | "English" | "Portuguese";
export type VocabEntry = { term: string; reading?: string; meaning: string; line: number; source: string };
export type Vocabulary = { language: VocabLanguage; entries: VocabEntry[] };

export const MAX_VOCAB_ENTRIES = 80;
const MIN_ENTRIES = 4;
/** Share of candidate lines that must parse as pairs, so prose with a few colons isn't read as a list. */
const MIN_RATIO = 0.6;

const HAN = /\p{Script=Han}/u;
const HAN_RUN = /\p{Script=Han}(?:[\p{Script=Han}，。？！、…～·]|\s(?=\p{Script=Han}))*/u;
/** Tab, a spaced dash/arrow, or a colon/equals/pipe; a dash inside a word ("well-known") never splits. */
const SEPARATOR = /\s*(?:\t+|\s[-–—=→>|]\s|[:：=|→]|\s{3,})\s*/;
const BRACKETED = /[(\[（【]([^)\]）】]+)[)\]）】]/;

const TONE_MARKS: Record<string, string> = { a: "āáǎà", e: "ēéěè", i: "īíǐì", o: "ōóǒò", u: "ūúǔù", ü: "ǖǘǚǜ" };
const MARKED = new Map(Object.entries(TONE_MARKS).flatMap(([base, marks]) => [...marks].map((mark, index) => [mark, { base, tone: index + 1 }] as const)));
const SYLLABLES = /^(?:(?:zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])?[aeiouüv]+(?:ng|n|r)?[1-5]?)+$/;

export const toneless = (reading: string) => reading.normalize("NFD").replace(/\p{M}/gu, "").replace(/[1-5]/g, "").toLocaleLowerCase("en");
const isPinyinToken = (token: string) => SYLLABLES.test(token.toLocaleLowerCase("en").normalize("NFD").replace(/\p{M}/gu, "").replace(/[’'-]/g, ""));
const hasTone = (token: string) => [...token].some((char) => MARKED.has(char)) || /[a-zü][1-5]\b/i.test(token);
/** A piece reads as pinyin when every word is syllable-shaped and at least one carries a tone. */
const isPinyin = (piece: string) => {
  const tokens = piece.trim().split(/\s+/).filter(Boolean);
  return tokens.length > 0 && tokens.length <= 8 && tokens.every(isPinyinToken) && tokens.some(hasTone);
};

const cleanLine = (raw: string) => raw.replace(/^\s*(?:\d+[.)]|[-•*·])\s+/, "").replace(/\s+$/, "");
const trimSeparators = (piece: string) => piece.replace(/^[\s\-–—=→>|:：]+|[\s\-–—=→>|:：]+$/g, "");
const cleanTerm = (term: string) => term.replace(/[，。？！、…～·\s]+$/u, "").trim();
const words = (value: string) => value.trim().split(/\s+/).filter(Boolean).length;

function parseChineseLine(line: string, number: number): VocabEntry | null {
  const run = line.match(HAN_RUN);
  if (!run) return null;
  const term = cleanTerm(run[0]);
  if (!term || [...term].length > 12) return null;
  let rest = line.replace(run[0], " | ");
  let reading: string | undefined;
  const bracketed = rest.match(BRACKETED);
  if (bracketed && isPinyin(bracketed[1]!)) {
    reading = bracketed[1]!.trim();
    rest = rest.replace(bracketed[0], " | ");
  }
  const pieces = rest.split(SEPARATOR).map(trimSeparators).filter(Boolean);
  if (!reading && pieces.length > 1) {
    const index = pieces.findIndex(isPinyin);
    if (index >= 0) reading = pieces.splice(index, 1)[0];
  }
  if (!reading && pieces.length === 1) {
    // "你好 nǐ hǎo hola": leading toned syllables are the reading; a neutral one only between toned ones.
    // One character is one syllable, so the reading never has more words than the term has characters.
    const tokens = pieces[0]!.split(/\s+/);
    const syllables = [...term].filter((char) => HAN.test(char)).length;
    let end = 0;
    for (let index = 0; index < Math.min(tokens.length, syllables); index++) {
      if (!isPinyinToken(tokens[index]!)) break;
      if (hasTone(tokens[index]!)) end = index + 1;
      else if (!tokens.slice(index + 1).some(hasTone)) break;
    }
    if (end > 0 && end < tokens.length) {
      reading = tokens.slice(0, end).join(" ");
      pieces[0] = tokens.slice(end).join(" ");
    }
  }
  const meaning = pieces.join("; ").trim();
  if (!meaning || HAN.test(meaning) || meaning.length > 60 || words(meaning) > 8) return null;
  return { term, ...(reading ? { reading } : {}), meaning, line: number, source: line.trim() };
}

function parseLatinLine(line: string, number: number): VocabEntry | null {
  const pieces = line.split(SEPARATOR).map(trimSeparators).filter(Boolean);
  if (pieces.length !== 2) return null;
  const [term, meaning] = pieces as [string, string];
  const short = (value: string) => value.length <= 40 && words(value) <= 5 && !/[.!?]$/.test(value) && !/\d{2,}/.test(value);
  if (!short(term) || !short(meaning)) return null;
  return { term, meaning, line: number, source: line.trim() };
}

const dedupe = (entries: VocabEntry[]) => {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key = entry.term.toLocaleLowerCase("en");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/**
 * Reads a pasted or scanned word list. Han terms mark a Chinese list; otherwise the left side is the
 * word being learned and `languageHint` names its language (English or Portuguese).
 */
export function parseVocabulary(text: string, languageHint?: string): Vocabulary | null {
  const lines = text.replace(/\r\n?/g, "\n").split("\n").map(cleanLine).map((line, index) => ({ line, number: index + 1 }))
    .filter(({ line }) => line.trim() && line.length <= 100);
  const han = lines.filter(({ line }) => HAN.test(line));
  if (han.length >= MIN_ENTRIES) {
    const parsed = han.map(({ line, number }) => parseChineseLine(line, number)).filter((entry): entry is VocabEntry => entry !== null);
    const entries = dedupe(parsed);
    return entries.length >= MIN_ENTRIES && parsed.length / han.length >= MIN_RATIO ? { language: "Chinese", entries: entries.slice(0, MAX_VOCAB_ENTRIES) } : null;
  }
  const language: VocabLanguage | null = languageHint === "English" || languageHint === "Portuguese" ? languageHint : null;
  if (!language) return null;
  const parsed = lines.map(({ line, number }) => parseLatinLine(line, number)).filter((entry): entry is VocabEntry => entry !== null);
  const entries = dedupe(parsed);
  return entries.length >= MIN_ENTRIES && parsed.length / lines.length >= MIN_RATIO ? { language, entries: entries.slice(0, MAX_VOCAB_ENTRIES) } : null;
}

/** Same syllables, one tone changed: the classic reading trap, and honest because the list gives the tones. */
export function toneVariants(reading: string, count: number, random: () => number): string[] {
  const chars = [...reading];
  const slots = chars.flatMap((char, index) => (MARKED.has(char) ? [index] : []));
  const variants = new Set<string>();
  for (const slot of slots) {
    const { base, tone } = MARKED.get(chars[slot]!)!;
    for (let next = 1; next <= 4; next++) {
      if (next === tone) continue;
      const copy = [...chars];
      copy[slot] = TONE_MARKS[base]![next - 1]!;
      variants.add(copy.join(""));
    }
  }
  return shuffle([...variants], random).slice(0, count);
}

/** "nǐ hǎo" → "ni3 hao3", word by word; words with more than one tone mark are left out. */
function numbered(reading: string): string | null {
  const tokens = reading.split(/\s+/).map((token) => {
    const marks = [...token].filter((char) => MARKED.has(char));
    if (marks.length > 1) return null;
    return `${toneless(token)}${marks.length ? MARKED.get(marks[0]!)!.tone : 5}`;
  });
  return tokens.every(Boolean) ? tokens.join(" ") : null;
}

const ARTICLES: Record<VocabLanguage, RegExp | null> = { English: /^(?:to|the|a|an)\s+/i, Portuguese: /^(?:o|a|os|as|um|uma)\s+/i, Chinese: null };

function acceptedAnswers(entry: VocabEntry, language: VocabLanguage): string[] {
  const values = [entry.term];
  if (entry.reading) {
    const plain = toneless(entry.reading);
    values.push(entry.reading, plain, plain.replace(/\s+/g, ""), numbered(entry.reading) ?? "");
  }
  const article = ARTICLES[language];
  if (article) values.push(entry.term.replace(article, ""));
  if (language !== "Chinese") values.push(toneless(entry.term), toneless(entry.term.replace(article ?? /^$/, "")));
  return [...new Map(values.map((value) => value.trim()).filter(Boolean).map((value) => [value.normalize("NFKC").toLocaleLowerCase("en"), value])).values()].slice(0, 8);
}

/** Near distractors make "curious" harder: shared characters first, then similar length. Gentle ones stay random. */
function distractors(values: readonly string[], answer: string, near: boolean, random: () => number): string[] {
  const key = (value: string) => value.normalize("NFKC").toLocaleLowerCase("en");
  const pool = [...new Map(values.filter((value) => key(value) !== key(answer)).map((value) => [key(value), value])).values()];
  if (!near) return shuffle(pool, random).slice(0, 3);
  const shared = (value: string) => [...value].filter((char) => HAN.test(char) && answer.includes(char)).length;
  return shuffle(pool, random).sort((a, b) => shared(b) - shared(a) || Math.abs(a.length - answer.length) - Math.abs(b.length - answer.length)).slice(0, 3);
}

function choiceSet(answer: string, wrong: readonly string[], random: () => number) {
  const options = shuffle([answer, ...wrong], random);
  return { choices: options.map((label, index) => ({ id: String(index), label })), correctChoiceId: String(options.indexOf(answer)) };
}

export function vocabularyChallenges(vocabulary: Vocabulary, material: { id: string; title: string }): { concepts: { id: string; term: string; definition: string; paragraph: number }[]; challenges: Challenge[] } {
  const { language, entries } = vocabulary;
  const concepts: { id: string; term: string; definition: string; paragraph: number }[] = [];
  const challenges: Challenge[] = [];
  const meanings = entries.map((entry) => entry.meaning);
  const terms = entries.map((entry) => entry.term);
  const readings = entries.flatMap((entry) => (entry.reading ? [entry.reading] : []));
  for (const entry of entries) {
    const conceptId = `${material.id}-${hashString(entry.term.toLocaleLowerCase("en")).toString(36)}`;
    const random = seededRandom(conceptId);
    const shown = entry.reading ? `${entry.term} (${entry.reading})` : entry.term;
    concepts.push({ id: conceptId, term: shown, definition: entry.meaning, paragraph: entry.line });
    const base = (suffix: string, difficulty: Difficulty, durationSeconds: number) => ({
      id: `${conceptId}-${suffix}`, conceptId, topicId: "study" as const, title: material.title,
      explanation: `${shown} means “${entry.meaning}”.`,
      memoryTip: entry.reading ? `Read it as ${entry.reading}, then picture “${entry.meaning}”.` : `Say “${entry.term}” in your head, then picture “${entry.meaning}”.`,
      difficulty, durationSeconds, visual: "words" as const, origin: "study-local" as const,
      source: { title: material.title, materialId: material.id, paragraph: entry.line, excerpt: entry.source },
    });
    const wrongMeanings = distractors(meanings, entry.meaning, false, random);
    if (wrongMeanings.length === 3) {
      challenges.push({ ...base("meaning", "gentle", 12), type: "vocabulary", prompt: `What does this mean?\n\n${entry.reading ? `${entry.term}\n${entry.reading}` : entry.term}`, ...choiceSet(entry.meaning, wrongMeanings, random) });
    }
    const wrongTerms = distractors(terms, entry.term, true, random);
    if (wrongTerms.length === 3) {
      challenges.push({ ...base("term", "curious", 15), type: "vocabulary", prompt: `Which one means “${entry.meaning}”?`, ...choiceSet(entry.term, wrongTerms, random) });
    }
    if (entry.reading) {
      const tones = toneVariants(entry.reading, 3, random);
      const wrongReadings = tones.length === 3 ? tones : [...tones, ...distractors(readings, entry.reading, true, random)].slice(0, 3);
      if (wrongReadings.length === 3) {
        challenges.push({ ...base("reading", "curious", 15), type: "vocabulary", prompt: `How do you read it?\n\n${entry.term}`, ...choiceSet(entry.reading, wrongReadings, random) });
      }
    }
    challenges.push({
      ...base("recall", "deep", 25), type: "fill-blank",
      prompt: `${language === "Chinese" ? "Type it in characters or pinyin" : `Type it in ${language}`}\n\n“${entry.meaning}”`,
      acceptedAnswers: acceptedAnswers(entry, language), answerLabel: shown,
    });
  }
  return { concepts, challenges };
}
