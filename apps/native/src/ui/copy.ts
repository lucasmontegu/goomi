import type { Mode, Progress } from '../domain';
import type { Pose } from './mascot';

export function greeting(now = new Date()): string {
  const hour = now.getHours();
  return hour < 5 ? 'Still up' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}

/** Which Goomi shows up, by what the user is doing and how the day is going. */
export function homePose(mode: Mode, progress: Progress, goal: number): Pose {
  if (mode === 'sleep') return 'sleep';
  if (progress.todayCompleted >= goal) return 'celebrate';
  if (mode === 'study') return 'read';
  if (mode === 'work') return 'think';
  return new Date().getHours() < 12 ? 'wave' : 'globe';
}

export function homeLine(mode: Mode, progress: Progress, goal: number): string {
  if (mode === 'sleep') return 'Nothing to catch up on. Just a softer moment.';
  if (progress.todayCompleted >= goal) return 'Daily goal done. Anything else is a bonus.';
  if (progress.dueCount > 0) return `${progress.dueCount} ${progress.dueCount === 1 ? 'memory wants' : 'memories want'} a quick hello.`;
  if (progress.totalAnswers === 0) return 'Want something better than another scroll?';
  if (mode === 'study') return 'Your next review is a small step forward.';
  if (mode === 'work') return 'One small next step. You’ve got this.';
  return 'A little discovery goes a long way.';
}

export const STREAK_MILESTONES = [3, 7, 14, 21, 30, 50, 75, 100, 150, 200, 365];

export function plural(count: number, one: string, many = `${one}s`) {
  return `${count} ${count === 1 ? one : many}`;
}
