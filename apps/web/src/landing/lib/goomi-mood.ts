"use client";

import { useSyncExternalStore } from "react";

import type { Pose } from "../i18n/types";

/**
 * Goomi's mood in the hero, shared by the challenge card (which sets it), the 3D scene (which reads it
 * every frame without re-rendering) and the static fallback. `beat` increments on every reaction so the
 * same pose twice still gets a squash.
 */
export type Mood = { pose: Pose; beat: number };

let mood: Mood = { pose: "wave", beat: 0 };
const listeners = new Set<() => void>();

export function getMood(): Mood {
  return mood;
}

export function react(pose: Pose) {
  mood = { pose, beat: mood.beat + 1 };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const serverMood: Mood = { pose: "wave", beat: 0 };

export function useMood(): Mood {
  return useSyncExternalStore(subscribe, getMood, () => serverMood);
}
