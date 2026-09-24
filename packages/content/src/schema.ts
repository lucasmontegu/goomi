import { z } from "zod";

/** Bump when the upload consent copy changes; the server rejects uploads made under an older version. */
export const STUDY_AI_CONSENT_VERSION = "2026-09-23";

/**
 * The Challenge contract shared by the device, the content bank and the AI pipeline.
 * Mirrors apps/native/src/domain/types.ts; every new field is optional so existing
 * on-device content stays valid.
 */
export const TOPIC_IDS = [
  "geography", "history", "science", "art", "languages", "memory", "math", "logic", "nature", "space",
  "technology", "psychology", "business", "popculture", "philosophy", "study", "focus",
] as const;
export const topicIdSchema = z.enum(TOPIC_IDS);
export const difficultySchema = z.enum(["gentle", "curious", "deep"]);
export const VISUALS = ["globe", "planet", "sunflower", "shapes", "numbers", "words", "moon", "focus", "leaf"] as const;

const text = (max: number) => z.string().trim().min(1).max(max);

export const choiceSchema = z.object({ id: z.string().min(1).max(64), label: text(200) });

export const sourceSchema = z.object({
  title: text(200),
  url: z.url({ protocol: /^https$/ }).optional(),
  excerpt: z.string().max(1200).optional(),
  materialId: z.string().optional(),
  paragraph: z.number().int().positive().optional(),
  /** SPDX-style id of the data license, e.g. "CC0-1.0". */
  license: z.string().max(64).optional(),
  licenseUrl: z.url().optional(),
  creator: z.string().max(200).optional(),
  /** Human-readable credit shown where attribution is required. */
  creditLine: z.string().max(300).optional(),
  mediaLicense: z.string().max(64).optional(),
  /** Study material chunks that support the answer ("your notes say…"). */
  chunkIds: z.array(z.string()).max(8).optional(),
});

export const challengeOrigins = ["starter", "bank", "study-local", "study-ai"] as const;

const base = z.object({
  id: z.string().min(1).max(200),
  conceptId: z.string().min(1).max(200),
  topicId: topicIdSchema,
  title: text(120),
  prompt: text(600),
  explanation: text(900),
  memoryTip: text(400),
  difficulty: difficultySchema,
  durationSeconds: z.number().int().min(5).max(120),
  source: sourceSchema.optional(),
  relatedConceptIds: z.array(z.string()).optional(),
  visual: z.enum(VISUALS).optional(),
  /** Target language of a language-learning challenge (filters by the learner's languages). */
  language: z.string().optional(),
  country: z.string().optional(),
  /** Language the challenge text is written in, e.g. "es". */
  locale: z.string().optional(),
  origin: z.enum(challengeOrigins).optional(),
  version: z.number().int().positive().optional(),
});

const choices = { choices: z.array(choiceSchema).min(2).max(6), correctChoiceId: z.string().min(1) };

export const choiceChallengeSchema = base.extend({
  type: z.enum(["multiple-choice", "true-false", "geography", "vocabulary", "translation", "mental-math", "logic", "pattern", "art-identification", "spaced-recall", "study-question"]),
  ...choices,
});
export const imageChallengeSchema = base.extend({
  type: z.literal("image-identification"),
  /** A bundled asset key or a cached local file URI; the device never renders a remote URL mid-interruption. */
  imageAsset: z.string(),
  /** Original remote media, downloaded ahead of time by the sync layer. */
  imageUrl: z.url({ protocol: /^https$/ }).optional(),
  imageDescription: text(300),
  ...choices,
});
export const textChallengeSchema = base.extend({
  type: z.literal("fill-blank"),
  acceptedAnswers: z.array(text(120)).min(1).max(8),
  answerLabel: text(120),
});
export const memoryChallengeSchema = base.extend({
  type: z.literal("memory"),
  preview: z.array(z.string()).min(1).max(12),
  previewSeconds: z.number().positive().max(15),
  ...choices,
});
export const sequenceChallengeSchema = base.extend({
  type: z.enum(["sequence", "historical-order"]),
  items: z.array(choiceSchema).min(2).max(6),
  correctOrder: z.array(z.string()).min(2).max(6),
});
export const matchingChallengeSchema = base.extend({
  type: z.literal("matching"),
  pairs: z.array(z.object({ left: choiceSchema, right: choiceSchema })).min(2).max(6),
});
export const sudokuChallengeSchema = base.extend({
  type: z.literal("micro-sudoku"),
  grid: z.array(z.number().int().min(0).max(4)).length(16),
  ...choices,
});
export const audioChallengeSchema = base.extend({
  type: z.literal("listening"),
  audioAsset: z.string(),
  transcript: text(400),
  ...choices,
});
export const pronunciationChallengeSchema = base.extend({
  type: z.literal("pronunciation"),
  phrase: text(200),
  phoneticHint: text(200),
  audioAsset: z.string(),
  assessment: z.literal("speech-service-required"),
});
export const reflectionChallengeSchema = base.extend({
  type: z.enum(["reflection", "breathing"]),
  actionLabel: text(80),
  seconds: z.number().int().positive().max(120).optional(),
});

export const challengeSchema = z.discriminatedUnion("type", [
  choiceChallengeSchema, imageChallengeSchema, textChallengeSchema, memoryChallengeSchema, sequenceChallengeSchema,
  matchingChallengeSchema, sudokuChallengeSchema, audioChallengeSchema, pronunciationChallengeSchema, reflectionChallengeSchema,
]);

export type TopicId = z.infer<typeof topicIdSchema>;
export type Difficulty = z.infer<typeof difficultySchema>;
export type Choice = z.infer<typeof choiceSchema>;
export type Source = z.infer<typeof sourceSchema>;
export type ChallengeOrigin = (typeof challengeOrigins)[number];
export type ChallengeBase = z.infer<typeof base>;
export type ChoiceChallenge = z.infer<typeof choiceChallengeSchema>;
export type ImageChallenge = z.infer<typeof imageChallengeSchema>;
export type TextChallenge = z.infer<typeof textChallengeSchema>;
export type MemoryChallenge = z.infer<typeof memoryChallengeSchema>;
export type SequenceChallenge = z.infer<typeof sequenceChallengeSchema>;
export type MatchingChallenge = z.infer<typeof matchingChallengeSchema>;
export type SudokuChallenge = z.infer<typeof sudokuChallengeSchema>;
export type AudioChallenge = z.infer<typeof audioChallengeSchema>;
export type PronunciationChallenge = z.infer<typeof pronunciationChallengeSchema>;
export type ReflectionChallenge = z.infer<typeof reflectionChallengeSchema>;
export type Challenge = z.infer<typeof challengeSchema>;
export type ChallengeType = Challenge["type"];
