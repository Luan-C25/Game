/**
 * The Potter's Ledger: a fixed list of goals, each paying coins once.
 * Progress is read from the save, so a goal can never be lost or undone,
 * and hints or undo never count against one.
 */

import { CHAPTERS, CHAPTER_SIZE } from './chapters.ts';

/** Every level id the chapters cover. */
const MAX_LEVEL_ID = CHAPTERS.length * CHAPTER_SIZE;

export interface GoalStats {
  /** Best stars across every heat for a level, or null if never cleared at any heat. */
  starsFor(levelId: number): number | null;
  flicks: number;
  dailyClears: number;
}

export interface Goal {
  id: string;
  title: string;
  reward: number;
  progress(stats: GoalStats): { current: number; target: number };
}

function chapterGoals(): Goal[] {
  const goals: Goal[] = [];
  for (const chapter of CHAPTERS) {
    const first = (chapter.n - 1) * CHAPTER_SIZE + 1;
    const ids = Array.from({ length: CHAPTER_SIZE }, (_, i) => first + i);
    const stars = (s: GoalStats): number =>
      ids.reduce((sum, id) => sum + (s.starsFor(id) ?? 0), 0);
    goals.push(
      {
        id: `chapter-${chapter.n}-clear`,
        title: `Clear every level in ${chapter.name}`,
        reward: 25,
        progress: (s) => ({ current: ids.filter((id) => s.starsFor(id) !== null).length, target: CHAPTER_SIZE }),
      },
      {
        id: `chapter-${chapter.n}-stars`,
        title: `Earn 50 stars in ${chapter.name}`,
        reward: 40,
        progress: (s) => ({ current: Math.min(50, stars(s)), target: 50 }),
      },
      {
        id: `chapter-${chapter.n}-par`,
        title: `Match par on every level in ${chapter.name}`,
        reward: 75,
        progress: (s) => ({ current: stars(s), target: CHAPTER_SIZE * 3 }),
      },
    );
  }
  return goals;
}

function tiered(id: string, title: (n: number) => string, tiers: [number, number][], read: (s: GoalStats) => number): Goal[] {
  return tiers.map(([target, reward]) => ({
    id: `${id}-${target}`,
    title: title(target),
    reward,
    progress: (s: GoalStats) => ({ current: Math.min(target, read(s)), target }),
  }));
}

export const GOALS: Goal[] = [
  ...tiered('clears', (n) => `Clear ${n} levels`, [[10, 10], [50, 30], [100, 60]], (s) => {
    let n = 0;
    for (let id = 1; id <= MAX_LEVEL_ID; id++) if (s.starsFor(id) !== null) n++;
    return n;
  }),
  ...tiered('flicks', (n) => `Flick ${n.toLocaleString('en-AU')} blocks out through their gates`, [[100, 15], [500, 40], [1000, 75]], (s) => s.flicks),
  ...tiered('daily', (n) => (n === 1 ? 'Clear a Daily Kiln' : `Clear ${n} Daily Kilns`), [[1, 10], [10, 30], [50, 100]], (s) => s.dailyClears),
  ...chapterGoals(),
];

export function isDone(goal: Goal, stats: GoalStats): boolean {
  const { current, target } = goal.progress(stats);
  return current >= target;
}

/** Goals finished but not yet claimed. */
export function claimable(stats: GoalStats, claimed: string[]): Goal[] {
  return GOALS.filter((g) => !claimed.includes(g.id) && isDone(g, stats));
}
