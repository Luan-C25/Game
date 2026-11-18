/**
 * Level access.
 *
 * The packs are generated and verified at build time (see
 * scripts/build-levels.ts), so start-up costs a JSON parse rather than
 * seconds of search per level on the player's phone. There is one pack per
 * Kiln heat; every pack has the same level numbers.
 */

import type { Heat } from '../engine/generator.ts';
import type { Level } from '../engine/types.ts';
import warmPack from './levels.json';
import hotPack from './levels-hot.json';
import whitePack from './levels-white.json';

interface Pack {
  version: number;
  levels: Level[];
}

const PACKS: Record<Heat, Pack> = {
  warm: warmPack as unknown as Pack,
  hot: hotPack as unknown as Pack,
  white: whitePack as unknown as Pack,
};

export { PACK_VERSION } from './pack-history.ts';

export const LEVEL_COUNT = PACKS.warm.levels.length;

export function getLevel(id: number, heat: Heat = 'warm'): Level | null {
  if (!Number.isInteger(id) || id < 1 || id > LEVEL_COUNT) return null;
  return PACKS[heat].levels[id - 1] ?? null;
}

export function hasLevel(id: number): boolean {
  return id >= 1 && id <= LEVEL_COUNT;
}
