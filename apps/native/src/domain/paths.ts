import { STARTER_CHALLENGES, TOPICS } from "./content";
import type { LearningState, Profile, TopicId } from "./types";

export type TopicPath = { topicId: TopicId; total: number; learned: number; due: number; mastered: number };

/** A topic's finite path: every curated concept in it, and how many the user has actually learned. */
export function topicPath(state: LearningState, topicId: TopicId, now = Date.now()): TopicPath {
  const concepts = new Set(STARTER_CHALLENGES.filter((challenge) => challenge.topicId === topicId).map((challenge) => challenge.conceptId));
  const memories = [...concepts].map((id) => state.memories[id]).filter((memory) => memory !== undefined);
  return {
    topicId,
    total: concepts.size,
    learned: memories.filter((memory) => memory.firstLearnedAt !== null).length,
    due: memories.filter((memory) => memory.dueAt <= now).length,
    mastered: memories.filter((memory) => memory.consecutiveCorrect >= 3 && memory.intervalDays >= 7).length,
  };
}

/** Paths worth continuing: interests first, then anything started, never empty topics. */
export function continuePaths(state: LearningState, profile: Profile, now = Date.now()): TopicPath[] {
  return TOPICS.filter((topic) => topic.id !== "focus" && topic.id !== "study")
    .map((topic) => topicPath(state, topic.id, now))
    .filter((path) => path.total > 0)
    .sort((a, b) => {
      const rank = (path: TopicPath) => (path.learned > 0 && path.learned < path.total ? 40 : 0)
        + (profile.interests.includes(path.topicId) ? 20 : 0) + path.due * 5 - (path.learned === path.total ? 30 : 0);
      return rank(b) - rank(a);
    });
}
