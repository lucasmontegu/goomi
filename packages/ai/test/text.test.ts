import { describe, expect, test } from "bun:test";
import { chunkSections, containsQuote, detectLang, paragraphsOf, sectionize } from "../src/text";

const pages = [
  { n: 1, text: "1. La célula\n\nLa célula es la unidad básica de la vida. Todos los seres vivos están formados por células.\n\nLa membrana plasmática es la capa que rodea a la célula y controla lo que entra y sale." },
  { n: 2, text: "2. Fotosíntesis\n\nLa fotosíntesis es el proceso por el cual las plantas transforman la luz en energía química.\n\nPrimero la clorofila absorbe la luz, luego se divide el agua y finalmente se produce glucosa." },
];

describe("document structure", () => {
  test("paragraphs keep their page and offsets", () => {
    const paragraphs = paragraphsOf(pages);
    expect(paragraphs.map((p) => p.page)).toEqual([1, 1, 1, 2, 2, 2]);
    expect(paragraphs[0]!.text).toBe("1. La célula");
    expect(paragraphs[1]!.charStart).toBeGreaterThan(paragraphs[0]!.charEnd);
  });

  test("numbered headings open sections; tiny sections merge", () => {
    const sections = sectionize(paragraphsOf(pages), 24_000, 10);
    expect(sections.map((s) => s.heading)).toEqual(["1. La célula", "2. Fotosíntesis"]);
    expect(sections[1]!.pageStart).toBe(2);
    expect(sectionize(paragraphsOf(pages)).length).toBe(1); // default minTokens merges these short sections
  });

  test("chunks stay within a section and carry paragraph provenance", () => {
    const chunks = chunkSections(sectionize(paragraphsOf(pages), 24_000, 10), 30, 10);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    for (const chunk of chunks) {
      expect(chunk.paragraphStart).toBeLessThanOrEqual(chunk.paragraphEnd);
      expect(chunk.pageStart).toBeLessThanOrEqual(chunk.pageEnd);
    }
    expect(chunks.every((chunk, index) => chunk.index === index)).toBe(true);
    expect(new Set(chunks.map((c) => c.sectionIndex))).toEqual(new Set([0, 1]));
  });

  test("a single overlong paragraph is split at sentence ends", () => {
    const long = Array.from({ length: 80 }, (_, i) => `Esta es la oración número ${i} del párrafo.`).join(" ");
    const chunks = chunkSections(sectionize(paragraphsOf([{ n: 1, text: long }])), 100, 20);
    expect(chunks.length).toBeGreaterThan(3);
    for (const chunk of chunks) expect(chunk.text.endsWith(".")).toBe(true);
  });

  test("language detection and verbatim quote checks", () => {
    expect(detectLang(pages.map((p) => p.text).join(" "))).toBe("es");
    expect(detectLang("The cell is the basic unit of life and all the living things that we know are made of cells, which is the idea of the cell theory.")).toBe("en");
    expect(detectLang("Hola")).toBeNull();
    expect(containsQuote("La célula es la unidad   básica de la vida.", "la célula es la unidad básica")).toBe(true);
    expect(containsQuote("La célula es la unidad básica de la vida.", "la célula es la parte básica")).toBe(false);
    expect(containsQuote("abc", "ab")).toBe(false); // too short to prove anything
  });
});
