/**
 * Best-move records across kiln heats.
 *
 * Progress is shared between heats (clearing level N at any heat opens N+1),
 * but each heat keeps its own best move counts, because a hotter board has a
 * different par. These are pure functions of the save, so they are testable
 * without loading the level packs.
 */

import type { Heat } from '../engine/generator.ts';
import { starsFor } from './migrate.ts';

export interface RecordSave {
  bestMoves: Record<number, number>;
  heatBest: { hot: Record<number, number>; white: Record<number, number> };
}

/** Looks up a level's par at a heat, or null when the level does not exist. */
export type ParLookup = (id: number, heat: Heat) => number | null;

const HEAT_ORDER: Heat[] = ['warm', 'hot', 'white'];

export const HEAT_NAMES: Record<Heat, string> = { warm: 'Warm', hot: 'Hot', white: 'White-hot' };

export const HEAT_COIN_FACTOR: Record<Heat, number> = { warm: 1, hot: 1.5, white: 2 };

/** The record map for one heat. */
export function bestOn(save: RecordSave, heat: Heat): Record<number, number> {
  if (heat === 'hot') return save.heatBest.hot;
  if (heat === 'white') return save.heatBest.white;
  return save.bestMoves;
}

/** Stars for a level at one heat, or null when it has not been cleared there. */
export function starsOn(save: RecordSave, id: number, heat: Heat, par: number | null): number | null {
  const best = bestOn(save, heat)[id];
  if (best === undefined) return null;
  return par === null ? 1 : starsFor(best, par);
}

/** The best stars across every heat, or null when never cleared at any heat. */
export function bestStars(save: RecordSave, id: number, parFor: ParLookup): number | null {
  let top: number | null = null;
  for (const heat of HEAT_ORDER) {
    const s = starsOn(save, id, heat, parFor(id, heat));
    if (s !== null && (top === null || s > top)) top = s;
  }
  return top;
}

export function isCleared(save: RecordSave, id: number): boolean {
  return HEAT_ORDER.some((heat) => bestOn(save, heat)[id] !== undefined);
}

/** How many distinct level numbers are cleared at any heat. */
export function clearedCount(save: RecordSave): number {
  const ids = new Set<number>();
  for (const heat of HEAT_ORDER) {
    for (const key of Object.keys(bestOn(save, heat))) ids.add(Number(key));
  }
  return ids.size;
}

/**
 * Coins for clearing a level: paid once per level number, on the first clear
 * at any heat. Hotter heats multiply the base reward.
 */
export function levelReward(stars: number, heat: Heat, alreadyCleared: boolean): number {
  if (alreadyCleared) return 0;
  return Math.round((5 + stars * 2) * HEAT_COIN_FACTOR[heat]);
}
