import { MODE_CONFIG, SLEEP_CHALLENGE, STARTER_CHALLENGES, TOPICS, WORK_CHALLENGE } from "./content";
import type { Answer, AnswerResult, Challenge, ConceptMemory, LearningState, Mode, Profile, Progress, TopicId } from "./types";

export const DAY_MS = 86_400_000;
export const createInitialLearningState = (): LearningState => ({ version: 1, memories: {}, history: [], materials: [], savedTopicIds: [] });

const normalized = (text: string) => text.trim().normalize("NFKC").toLocaleLowerCase("en").replace(/\s+/g, " ");

export function evaluateAnswer(challenge: Challenge, answer: Answer): AnswerResult {
  const result = (correct: boolean, answerLabel: string, graded = true): AnswerResult => ({ correct, graded, answerLabel, explanation: challenge.explanation });
  if ("choices" in challenge) {
    const correctChoice = challenge.choices.find((choice) => choice.id === challenge.correctChoiceId);
    return result(typeof answer === "string" && answer === challenge.correctChoiceId, correctChoice?.label ?? "");
  }
  switch (challenge.type) {
    case "fill-blank":
      return result(typeof answer === "string" && challenge.acceptedAnswers.some((accepted) => normalized(accepted) === normalized(answer)), challenge.answerLabel);
    case "sequence":
    case "historical-order":
      return result(Array.isArray(answer) && answer.length === challenge.correctOrder.length && answer.every((id, index) => id === challenge.correctOrder[index]), challenge.correctOrder.map((id) => challenge.items.find((item) => item.id === id)?.label ?? id).join(" → "));
    case "matching": {
      const isMapping = typeof answer === "object" && !Array.isArray(answer) && answer !== null;
      return result(isMapping && Object.keys(answer).length === challenge.pairs.length && challenge.pairs.every(({ left, right }) => answer[left.id] === right.id), challenge.pairs.map(({ left, right }) => `${left.label} → ${right.label}`).join(" · "));
    }
    case "pronunciation":
      return result(false, challenge.phrase, false);
    case "reflection":
    case "breathing":
      return result(false, challenge.actionLabel, false);
  }
}

/** A conservative, transparent interval schedule; early practice cannot manufacture mastery. */
export function scheduleReview(previous: ConceptMemory | undefined, challenge: Challenge, correct: boolean, now: number): ConceptMemory {
  const wasDue = !previous || now >= previous.dueAt;
  const successfulDueReview = Boolean(previous && wasDue && correct);
  const consecutiveCorrect = !correct ? 0 : wasDue ? (previous?.consecutiveCorrect ?? 0) + 1 : previous.consecutiveCorrect;
  const ease = Math.max(1.3, Math.min(2.8, (previous?.ease ?? 2.3) + (correct ? (successfulDueReview ? 0.05 : 0) : -0.2)));
  let intervalDays: number;
  if (!correct) intervalDays = 10 / 1440; // Return a missed concept after ten minutes.
  else if (!wasDue && previous) intervalDays = previous.intervalDays;
  else if (consecutiveCorrect === 1) intervalDays = 1;
  else if (consecutiveCorrect === 2) intervalDays = 3;
  else intervalDays = Math.min(180, Math.max(7, Math.round((previous?.intervalDays ?? 3) * ease)));
  return {
    conceptId: challenge.conceptId, topicId: challenge.topicId,
    attempts: (previous?.attempts ?? 0) + 1,
    correct: (previous?.correct ?? 0) + Number(correct), consecutiveCorrect, intervalDays, ease,
    dueAt: correct && !wasDue && previous ? previous.dueAt : now + intervalDays * DAY_MS,
    lastReviewedAt: now,
    firstLearnedAt: previous?.firstLearnedAt ?? (correct ? now : null),
  };
}

/** Supply the same submissionId when retrying a persisted answer to keep the operation idempotent. */
export function recordAnswer(state: LearningState, challenge: Challenge, answer: Answer, now = Date.now(), submissionId = `${challenge.id}:${now}`): LearningState {
  if (!Number.isFinite(now)) throw new RangeError("An answer needs a valid timestamp.");
  if (state.history.some((event) => event.id === submissionId)) return state;
  const previous = state.memories[challenge.conceptId];
  if (previous && now < previous.lastReviewedAt) throw new RangeError("An answer cannot precede its last review.");
  const result = evaluateAnswer(challenge, answer);
  // Calming and focus moments are completions, never evidence of knowledge or retention.
  const event = {
    id: submissionId, challengeId: challenge.id, conceptId: challenge.conceptId, topicId: challenge.topicId,
    correct: result.correct, graded: result.graded,
    review: result.graded && Boolean(previous && now >= previous.dueAt), answeredAt: now,
  };
  return {
    ...state,
    memories: result.graded ? { ...state.memories, [challenge.conceptId]: scheduleReview(previous, challenge, result.correct, now) } : state.memories,
    history: [...state.history, event],
  };
}

export function dateKey(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function calendarDaysAgo(now: number, count: number): Date {
  const date = new Date(now);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - count);
  return date;
}
const accuracy = (events: { correct: boolean }[]) => events.length ? Math.round(100 * events.filter((event) => event.correct).length / events.length) : null;

export function getProgress(state: LearningState, now = Date.now()): Progress {
  const events = state.history.filter((event) => event.graded && event.answeredAt <= now);
  const memories = Object.values(state.memories).filter((memory) => memory.lastReviewedAt <= now);
  const learned = memories.filter((memory) => memory.firstLearnedAt !== null);
  const reviews = events.filter((event) => event.review);
  const latestByConcept = new Map<string, (typeof events)[number]>();
  events.forEach((event) => latestByConcept.set(event.conceptId, event));
  const mastered = (memory: ConceptMemory) => memory.consecutiveCorrect >= 3 && memory.intervalDays >= 7;
  const activityDays = new Set(events.map((event) => dateKey(event.answeredAt)));
  let streak = 0;
  // A streak remains alive until the end of today if the user learned yesterday.
  const firstOffset = activityDays.has(dateKey(now)) ? 0 : 1;
  for (let offset = firstOffset; activityDays.has(dateKey(calendarDaysAgo(now, offset).getTime())); offset++) streak++;
  const weekStart = calendarDaysAgo(now, (new Date(now).getDay() + 6) % 7).getTime();
  return {
    thingsLearned: learned.length,
    stillRemembered: [...latestByConcept.values()].filter((event) => event.review && event.correct).length,
    retentionPercent: accuracy(reviews.slice(-30)),
    mastered: memories.filter(mastered).length,
    streak,
    todayCompleted: events.filter((event) => dateKey(event.answeredAt) === dateKey(now)).length,
    knowledgeThisWeek: learned.filter((memory) => memory.firstLearnedAt! >= weekStart).length,
    totalAnswers: events.length, accuracyPercent: accuracy(events),
    dueCount: memories.filter((memory) => memory.dueAt <= now).length,
    weeklyActivity: Array.from({ length: 7 }, (_, index) => {
      const date = dateKey(calendarDaysAgo(now, 6 - index).getTime());
      return { date, count: events.filter((event) => dateKey(event.answeredAt) === date).length };
    }),
    categories: TOPICS.filter((topic) => topic.id !== "focus").map(({ id: topicId }) => ({
      topicId,
      learned: learned.filter((memory) => memory.topicId === topicId).length,
      mastered: memories.filter((memory) => memory.topicId === topicId && mastered(memory)).length,
      accuracy: accuracy(events.filter((event) => event.topicId === topicId)),
    })),
  };
}

export function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
  return hash >>> 0;
}

export type SelectionOptions = {
  now?: number;
  limit?: number;
  mode?: Mode;
  topicId?: TopicId;
  excludeIds?: string[];
  /** Explicit practice permits familiar concepts before they are due. */
  practice?: boolean;
  seed?: number;
};

/** Finite queue, due concepts first, then personal interests with a little format variety. */
export function selectChallenges(state: LearningState, profile: Profile, options: SelectionOptions = {}): Challenge[] {
  const now = options.now ?? Date.now();
  const mode = options.mode ?? profile.defaultMode;
  const limit = Math.max(0, Math.min(10, Math.floor(options.limit ?? MODE_CONFIG[mode].sessionSize)));
  if (!limit) return [];
  if (mode === "work") return [WORK_CHALLENGE];
  if (mode === "sleep") return [SLEEP_CHALLENGE];
  const study = state.materials.filter((material) => material.status === "ready").flatMap((material) => material.challenges);
  const pool = mode === "study" || options.topicId === "study" ? study : STARTER_CHALLENGES;
  const seed = options.seed ?? hashString(`${dateKey(now)}:${state.history.length}`);
  const excluded = new Set(options.excludeIds ?? []);
  const eligible = pool.filter((challenge) => {
    if (excluded.has(challenge.id)) return false;
    if (options.topicId && challenge.topicId !== options.topicId) return false;
    if (challenge.language && !profile.learningLanguages.some((language) => normalized(language) === normalized(challenge.language!))) return false;
    const memory = state.memories[challenge.conceptId];
    return options.practice || !memory || memory.dueAt <= now;
  });
  const score = (challenge: Challenge) => {
    const memory = state.memories[challenge.conceptId];
    const due = memory && memory.dueAt <= now;
    return (due ? 1000 + Math.min(100, (now - memory.dueAt) / DAY_MS) + (1 - memory.correct / memory.attempts) * 100 : 0)
      + (profile.interests.includes(challenge.topicId) ? 30 : 0)
      + (challenge.country === profile.country ? 15 : 0)
      + (challenge.difficulty === profile.level ? 10 : 0)
      + (challenge.relatedConceptIds?.some((id) => state.memories[id]) ? 8 : 0)
      + (hashString(`${seed}:${challenge.id}`) % 1000) / 1000;
  };
  eligible.sort((a, b) => score(b) - score(a));
  const queue: Challenge[] = [];
  const concepts = new Set<string>();
  for (const challenge of eligible) {
    if (concepts.has(challenge.conceptId)) continue;
    queue.push(challenge);
    concepts.add(challenge.conceptId);
    if (queue.length === limit) break;
  }
  return queue;
}

export function getWeakConcepts(state: LearningState): ConceptMemory[] {
  return Object.values(state.memories)
    .filter((memory) => memory.correct < memory.attempts && memory.consecutiveCorrect < 3)
    .sort((a, b) => a.correct / a.attempts - b.correct / b.attempts);
}
