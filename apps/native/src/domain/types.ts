export type Mode = "free" | "study" | "work" | "sleep";
export type TopicId = "geography" | "history" | "science" | "art" | "languages" | "memory" | "math" | "logic" | "nature" | "space" | "study" | "focus";
export type Difficulty = "gentle" | "curious" | "deep";
export type Choice = { id: string; label: string };
export type Source = { title: string; url?: string; excerpt?: string; materialId?: string; paragraph?: number };
export type ChallengeBase = {
  id: string;
  conceptId: string;
  topicId: TopicId;
  title: string;
  prompt: string;
  explanation: string;
  memoryTip: string;
  difficulty: Difficulty;
  durationSeconds: number;
  source?: Source;
  relatedConceptIds?: string[];
  /** Media keys are resolved by the native presentation layer, never fetched during an interruption. */
  visual?: "globe" | "planet" | "sunflower" | "shapes" | "numbers" | "words" | "moon" | "focus" | "leaf";
  language?: string;
  country?: string;
};
export type ChoiceChallenge = ChallengeBase & {
  type: "multiple-choice" | "true-false" | "geography" | "vocabulary" | "translation" | "mental-math" | "logic" | "pattern" | "art-identification" | "spaced-recall" | "study-question";
  choices: Choice[];
  correctChoiceId: string;
};
export type ImageChallenge = ChallengeBase & {
  type: "image-identification";
  imageAsset: string;
  imageDescription: string;
  choices: Choice[];
  correctChoiceId: string;
};
export type TextChallenge = ChallengeBase & {
  type: "fill-blank";
  acceptedAnswers: string[];
  answerLabel: string;
};
export type MemoryChallenge = ChallengeBase & {
  type: "memory";
  preview: string[];
  previewSeconds: number;
  choices: Choice[];
  correctChoiceId: string;
};
export type SequenceChallenge = ChallengeBase & {
  type: "sequence" | "historical-order";
  items: Choice[];
  correctOrder: string[];
};
export type MatchingChallenge = ChallengeBase & {
  type: "matching";
  pairs: { left: Choice; right: Choice }[];
};
export type SudokuChallenge = ChallengeBase & {
  type: "micro-sudoku";
  /** Row-major 4×4 grid; 0 denotes the one missing cell. */
  grid: number[];
  choices: Choice[];
  correctChoiceId: string;
};
export type AudioChallenge = ChallengeBase & {
  type: "listening";
  audioAsset: string;
  transcript: string;
  choices: Choice[];
  correctChoiceId: string;
};
export type PronunciationChallenge = ChallengeBase & {
  type: "pronunciation";
  phrase: string;
  phoneticHint: string;
  audioAsset: string;
  /** Requires a real speech assessor. Unassessed recordings cannot count as correct answers. */
  assessment: "speech-service-required";
};
export type ReflectionChallenge = ChallengeBase & {
  type: "reflection" | "breathing";
  actionLabel: string;
  seconds?: number;
};
export type Challenge = ChoiceChallenge | ImageChallenge | TextChallenge | MemoryChallenge | SequenceChallenge | MatchingChallenge | SudokuChallenge | AudioChallenge | PronunciationChallenge | ReflectionChallenge;
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
  status: "ready" | "no-concepts" | "needs-extraction" | "failed";
  processingMethod: "local-extractive";
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
