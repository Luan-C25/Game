/**
 * Movement rules.
 *
 * Every rule here is total and deterministic: a move either happens or it
 * does not, and a level is won exactly when every non-crate block has left
 * the board. There is no separate "did the player win" heuristic that can
 * disagree with the board state.
 */

import {
  ALL_DIRS,
  type Block,
  type Cell,
  type Dir,
  DIR_VECTORS,
  type Level,
  type Move,
  type Side,
  blockCells,
} from './types.ts';

export interface SlideResult {
  /** How many cells the block can travel before something stops it. */
  distance: number;
  /** True when travelling the full distance takes the block off the board. */
  exits: boolean;
}

export function sideForDir(dir: Dir): Side {
  switch (dir) {
    case 'up':
      return 'top';
    case 'down':
      return 'bottom';
    case 'left':
      return 'left';
    case 'right':
      return 'right';
  }
}

/** Which coordinate of a cell indexes along a given wall. */
export function laneOf(cell: Cell, side: Side): number {
  return side === 'top' || side === 'bottom' ? cell.x : cell.y;
}

export function gateCoversLane(level: Level, side: Side, lane: number, color: number): boolean {
  return level.gates.some(
    (g) => g.side === side && g.color === color && lane >= g.start && lane < g.start + g.length,
  );
}

/**
 * A block may only start leaving the board if *every* lane it occupies on
 * that wall is covered by a gate of its colour. This is what stops a block
 * ever ending up wedged half-outside the board.
 */
export function blockFitsGate(level: Level, block: Block, side: Side): boolean {
  if (block.kind === 'crate') return false;
  const lanes = new Set(blockCells(block).map((c) => laneOf(c, side)));
  for (const lane of lanes) {
    if (!gateCoversLane(level, side, lane, block.color)) return false;
  }
  return true;
}

/** Grid of block ids, or -1 for empty. Exited blocks occupy nothing. */
export function buildOccupancy(level: Level): Int32Array {
  const grid = new Int32Array(level.width * level.height).fill(-1);
  for (const b of level.blocks) {
    if (b.exited) continue;
    for (const c of blockCells(b)) {
      grid[c.y * level.width + c.x] = b.id;
    }
  }
  return grid;
}

function inBounds(level: Level, c: Cell): boolean {
  return c.x >= 0 && c.y >= 0 && c.x < level.width && c.y < level.height;
}

/**
 * How far a block can slide in one direction, and whether that slide takes
 * it off the board.
 */
export function maxSlide(level: Level, block: Block, dir: Dir): SlideResult {
  if (block.exited || block.kind === 'crate') return { distance: 0, exits: false };

  const occupancy = buildOccupancy(level);
  const vec = DIR_VECTORS[dir];
  const side = sideForDir(dir);
  const cells = blockCells(block);
  const limit = level.width + level.height;

  for (let step = 1; step <= limit; step++) {
    let anyOutside = false;
    let blocked = false;

    for (const c of cells) {
      const next = { x: c.x + vec.x * step, y: c.y + vec.y * step };
      if (!inBounds(level, next)) {
        anyOutside = true;
        continue;
      }
      const occupant = occupancy[next.y * level.width + next.x];
      if (occupant !== -1 && occupant !== block.id) {
        blocked = true;
        break;
      }
    }

    if (blocked) return { distance: step - 1, exits: false };

    if (anyOutside) {
      // The board edge is only passable through a matching gate wide enough
      // for the whole block.
      if (blockFitsGate(level, block, side)) return { distance: step, exits: true };
      return { distance: step - 1, exits: false };
    }
  }

  return { distance: limit, exits: false };
}

export function findBlock(level: Level, blockId: number): Block | undefined {
  return level.blocks.find((b) => b.id === blockId);
}

export interface AppliedMove {
  ok: boolean;
  exited: boolean;
}

/**
 * Applies a move in place. Returns ok=false and changes nothing when the
 * move is not legal, so an illegal drag can never corrupt the board.
 */
export function applyMove(level: Level, move: Move): AppliedMove {
  const block = findBlock(level, move.blockId);
  if (!block || block.exited || move.distance <= 0) return { ok: false, exited: false };

  const reach = maxSlide(level, block, move.dir);
  if (move.distance > reach.distance) return { ok: false, exited: false };

  const exits = reach.exits && move.distance === reach.distance;
  if (exits) {
    block.exited = true;
    return { ok: true, exited: true };
  }

  const vec = DIR_VECTORS[move.dir];
  block.pos = { x: block.pos.x + vec.x * move.distance, y: block.pos.y + vec.y * move.distance };
  return { ok: true, exited: false };
}

/** Every legal move from the current position, for the solver. */
export function legalMoves(level: Level): Move[] {
  const moves: Move[] = [];
  for (const block of level.blocks) {
    if (block.exited || block.kind === 'crate') continue;
    for (const dir of ALL_DIRS) {
      const reach = maxSlide(level, block, dir);
      for (let d = 1; d <= reach.distance; d++) {
        moves.push({ blockId: block.id, dir, distance: d });
      }
    }
  }
  return moves;
}

export function isSolved(level: Level): boolean {
  return level.blocks.every((b) => b.kind === 'crate' || b.exited);
}

export function remainingBlocks(level: Level): number {
  return level.blocks.filter((b) => b.kind !== 'crate' && !b.exited).length;
}

/** Compact key for visited-set lookups in the solver. */
export function encodeState(level: Level): string {
  let key = '';
  for (const b of level.blocks) {
    if (b.kind === 'crate') continue;
    key += b.exited ? 'x|' : `${b.pos.x},${b.pos.y}|`;
  }
  return key;
}
