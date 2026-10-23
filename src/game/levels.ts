/**
 * Level access.
 *
 * The pack is generated and verified at build time (see
 * scripts/build-levels.ts), so start-up costs a JSON parse rather than a
 * second of search per level on the player's phone.
 */

import type { Level } from '../engine/types.ts';
import pack from './levels.json';

interface Pack {
  version: number;
  levels: Level[];
}

const data = pack as unknown as Pack;

export const LEVEL_COUNT = data.levels.length;

export function getLevel(id: number): Level | null {
  if (!Number.isInteger(id) || id < 1 || id > LEVEL_COUNT) return null;
  return data.levels[id - 1];
}

export function hasLevel(id: number): boolean {
  return id >= 1 && id <= LEVEL_COUNT;
}
