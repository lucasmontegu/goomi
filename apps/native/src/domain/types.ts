export type Mode = "free" | "study" | "work" | "sleep";
/**
 * Challenge contracts are shared with the server (content bank, AI study) and validated with zod
 * there and on sync; see packages/content/src/schema.ts.
 */
export type {
  AudioChallenge, Challenge, ChallengeBase, ChallengeOrigin, Choice, ChoiceChallenge, Difficulty, ImageChallenge, MatchingChallenge,
  MemoryChallenge, PronunciationChallenge, ReflectionChallenge, SequenceChallenge, Source, SudokuChallenge, TextChallenge, TopicId,
} from "@goomi/content";
import type { Challenge, Difficulty, TopicId } from "@goomi/content";
export type Answer = string | string[] | Record<string, string>;
export type AnswerResult = { correct: boolean; graded: boolean; answerLabel: string; explanation: string };

export type Profile = {
  name: string;
  country: string;
  nativeLanguage: string;
  learningLanguages: string[];
  interests: TopicId[];
  level: Difficulty;
  goals: string[];
  dailyGoal: number;
  defaultMode: Mode;
  selectedApps: string[];
  estimatedUsageMinutes: number;
  /** When scrolling tends to happen, as the user described it in onboarding. */
  scrollMoments?: 'gaps' | 'focus' | 'evening' | 'all';
  onboardingComplete: boolean;
};
export type Settings = {
  mode: Mode;
  intensity: "light" | "balanced" | "frequent";
  unlockMinutes: number;
  haptics: boolean;
  sound: boolean;
  reminders: boolean;
  appearance: "system" | "light" | "dark";
  currentTask: string;
  screenTimePermission: "not-requested" | "authorized" | "denied" | "revoked" | "unavailable";
  subscription: "not-configured" | "trial" | "active" | "expired";
};
export type ConceptMemory = {
  conceptId: string;
  topicId: TopicId;
  attempts: number;
  correct: number;
  consecutiveCorrect: number;
  intervalDays: number;
  ease: number;
  dueAt: number;
  lastReviewedAt: number;
  firstLearnedAt: number | null;
};
export type AnswerEvent = {
  id: string;
  challengeId: string;
  conceptId: string;
  topicId: TopicId;
  correct: boolean;
  graded: boolean;
  /** A review is a previously encountered concept answered after its due time. */
  review: boolean;
  answeredAt: number;
};
export type StudyMaterial = {
  id: string;
  title: string;
  kind: "text" | "pdf" | "image" | "slides";
  createdAt: number;
  text: string;
  /** "processing" = sent for AI study and not ready yet (see remoteId/progress). */
  status: "ready" | "no-concepts" | "needs-extraction" | "failed" | "processing";
  processingMethod: "local-extractive" | "ai";
  /** Server material id for AI study. */
  remoteId?: string;
  /** Last known server progress while processing. */
  progress?: { stage: string; step: number; total: number };
  concepts: { id: string; term: string; definition: string; paragraph: number }[];
  challenges: Challenge[];
  message: string;
};
export type LearningState = {
  version: 1;
  memories: Record<string, ConceptMemory>;
  history: AnswerEvent[];
  materials: StudyMaterial[];
  savedTopicIds: TopicId[];
};
export type Progress = {
  thingsLearned: number;
  stillRemembered: number;
  /** Observed accuracy on due reviews; null means no delayed review evidence yet. */
  retentionPercent: number | null;
  mastered: number;
  streak: number;
  todayCompleted: number;
  knowledgeThisWeek: number;
  totalAnswers: number;
  accuracyPercent: number | null;
  dueCount: number;
  weeklyActivity: { date: string; count: number }[];
  categories: { topicId: TopicId; learned: number; mastered: number; accuracy: number | null }[];
};
