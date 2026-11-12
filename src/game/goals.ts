/**
 * The Potter's Ledger: a fixed list of goals, each paying coins once.
 * Progress is read from the save, so a goal can never be lost or undone,
 * and hints or undo never count against one.
 */

import { CHAPTERS, CHAPTER_SIZE } from './chapters.ts';

export interface GoalStats {
  /** Best moves per cleared level. */
  bestMoves: Record<number, number>;
  /** Par (three stars) per level id, for levels that exist. */
  parFor(levelId: number): number | null;
  flicks: number;
  dailyClears: number;
}

export interface Goal {
  id: string;
  title: string;
  reward: number;
  progress(stats: GoalStats): { current: number; target: number };
}

function starsFor(moves: number, par: number): number {
  if (moves <= par) return 3;
  if (moves <= par + Math.max(2, Math.ceil(par * 0.4))) return 2;
  return 1;
}

function chapterGoals(): Goal[] {
  const goals: Goal[] = [];
  for (const chapter of CHAPTERS) {
    const first = (chapter.n - 1) * CHAPTER_SIZE + 1;
    const ids = Array.from({ length: CHAPTER_SIZE }, (_, i) => first + i);
    const stars = (s: GoalStats): number =>
      ids.reduce((sum, id) => {
        const best = s.bestMoves[id];
        const par = s.parFor(id);
        return best === undefined ? sum : sum + (par === null ? 1 : starsFor(best, par));
      }, 0);
    goals.push(
      {
        id: `chapter-${chapter.n}-clear`,
        title: `Clear every level in ${chapter.name}`,
        reward: 50,
        progress: (s) => ({ current: ids.filter((id) => s.bestMoves[id] !== undefined).length, target: CHAPTER_SIZE }),
      },
      {
        id: `chapter-${chapter.n}-stars`,
        title: `Earn 50 stars in ${chapter.name}`,
        reward: 75,
        progress: (s) => ({ current: Math.min(50, stars(s)), target: 50 }),
      },
      {
        id: `chapter-${chapter.n}-par`,
        title: `Match par on every level in ${chapter.name}`,
        reward: 150,
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
  ...tiered('clears', (n) => `Clear ${n} levels`, [[10, 20], [50, 60], [100, 120]], (s) => Object.keys(s.bestMoves).length),
  ...tiered('flicks', (n) => `Flick ${n.toLocaleString('en-AU')} blocks out through their gates`, [[100, 25], [500, 75], [1000, 150]], (s) => s.flicks),
  ...tiered('daily', (n) => (n === 1 ? 'Clear a Daily Kiln' : `Clear ${n} Daily Kilns`), [[1, 15], [10, 60], [50, 200]], (s) => s.dailyClears),
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
