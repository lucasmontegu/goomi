import { hashString } from "./engine";
import type { Challenge, StudyMaterial } from "./types";

/** Local, source-preserving extraction. This does not summarize, verify claims or call an AI. */
export function extractStudyMaterial(title: string, text: string, now = Date.now()): StudyMaterial {
  const cleanText = text.replace(/\r\n?/g, "\n").trim().slice(0, 100_000);
  const cleanTitle = title.trim().slice(0, 120) || "Untitled notes";
  const materialId = `notes-${hashString(`${cleanTitle}:${cleanText}`).toString(36)}`;
  const material: StudyMaterial = {
    id: materialId, title: cleanTitle, kind: "text", createdAt: now, text: cleanText,
    status: "no-concepts", processingMethod: "local-extractive", concepts: [], challenges: [],
    message: "Try a definition like “Photosynthesis is the process plants use to turn light into chemical energy.” Your wording stays intact.",
  };
  const seen = new Set<string>();
  const paragraphs = cleanText.split(/\n+/).filter((paragraph) => paragraph.trim());
  for (let paragraph = 0; paragraph < paragraphs.length && material.concepts.length < 24; paragraph++) {
    const sentences = paragraphs[paragraph]!.match(/[^.!?]+(?:[.!?]+|$)/g) ?? [];
    for (const sentence of sentences) {
      const cleaned = sentence.trim().replace(/^[-•*]\s*/, "");
      // Definitions only; avoid constructing an unsupported causal claim or guessing a concept.
      const match = cleaned.match(/^([\p{L}\p{N}][\p{L}\p{N}\s()'’\-]{1,64}?)\s+(?:is|are|means|refers to)\s+(.{12,400})[.!?]?$/iu)
        ?? cleaned.match(/^([\p{L}\p{N}][\p{L}\p{N}\s()'’\-]{1,64}?)\s*:\s*(.{12,400})[.!?]?$/u);
      if (!match) continue;
      const term = match[1]!.trim();
      const definition = match[2]!.trim().replace(/[.!?]+$/, "");
      if (/^(it|this|that|these|those|they|he|she|we|you|there|what|which|who)$/i.test(term)) continue;
      const key = term.toLocaleLowerCase("en");
      if (seen.has(key)) continue;
      seen.add(key);
      const id = `${materialId}-${hashString(key).toString(36)}`;
      material.concepts.push({ id, term, definition, paragraph: paragraph + 1 });
      const challenge: Challenge = {
        id: `${id}-recall`, conceptId: id, topicId: "study", type: "fill-blank",
        title: cleanTitle, prompt: `From your notes, which term matches this definition?\n\n“${definition}”`,
        acceptedAnswers: [term], answerLabel: term,
        explanation: `Your notes say: “${cleaned}”`,
        memoryTip: "Recall the idea, then check it against your original notes.",
        difficulty: "curious", durationSeconds: 30, visual: "words",
        source: { title: cleanTitle, materialId, paragraph: paragraph + 1, excerpt: cleaned },
      };
      material.challenges.push(challenge);
      if (material.concepts.length === 24) break;
    }
  }
  if (material.concepts.length) {
    material.status = "ready";
    material.message = `${material.concepts.length} recall ${material.concepts.length === 1 ? "prompt" : "prompts"} extracted from your notes. Original wording, processed on this device. Review the source for accuracy.`;
  }
  return material;
}

export function createPendingMaterial(title: string, kind: "pdf" | "image" | "slides", now = Date.now()): StudyMaterial {
  return {
    id: `file-${hashString(`${title}:${kind}:${now}`).toString(36)}`, title, kind, createdAt: now,
    text: "", status: "needs-extraction", processingMethod: "local-extractive", concepts: [], challenges: [],
    message: "Text extraction for this file needs a connected document service. Paste the readable text to create private, on-device recall prompts now.",
  };
}
