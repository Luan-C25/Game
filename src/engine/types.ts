/** Core data model for the sliding-block puzzle. */

export type Dir = 'up' | 'down' | 'left' | 'right';
export type Side = 'top' | 'bottom' | 'left' | 'right';

export const DIR_VECTORS: Record<Dir, Cell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export const ALL_DIRS: Dir[] = ['up', 'down', 'left', 'right'];

export interface Cell {
  x: number;
  y: number;
}

/** A crate is scenery: it never moves and never exits. */
export type BlockKind = 'block' | 'crate';

export const CRATE_COLOR = -1;

export interface Block {
  id: number;
  /** Palette index, or CRATE_COLOR for crates. */
  color: number;
  kind: BlockKind;
  /** Normalised cell offsets; the top-left of the bounding box is (0,0). */
  shape: Cell[];
  /** Grid position of the shape's origin. */
  pos: Cell;
  /** True once the block has left the board through a matching gate. */
  exited: boolean;
}

/**
 * An opening in a wall. `start` is the index along that wall (x for
 * top/bottom, y for left/right) and `length` is how many lanes it spans.
 */
export interface Gate {
  side: Side;
  start: number;
  length: number;
  color: number;
}

export interface Level {
  id: number;
  seed: number;
  width: number;
  height: number;
  blocks: Block[];
  gates: Gate[];
  /** Length of the shortest solution, proven by the solver at build time. */
  minMoves: number;
  /**
   * A winning line, verified at build time. Shipping it means a hint is
   * instant while the player is on the intended path, and gives the app a
   * proof of solvability that does not depend on a live search.
   */
  solution?: Move[];
}

/** One player action: slide `blockId` `distance` cells in `dir`. */
export interface Move {
  blockId: number;
  dir: Dir;
  distance: number;
}

export function cloneBlock(b: Block): Block {
  return { ...b, pos: { ...b.pos }, shape: b.shape.map((c) => ({ ...c })) };
}

export function cloneLevel(level: Level): Level {
  return {
    ...level,
    blocks: level.blocks.map(cloneBlock),
    gates: level.gates.map((g) => ({ ...g })),
    solution: level.solution?.map((m) => ({ ...m })),
  };
}

/** Absolute grid cells currently occupied by a block. */
export function blockCells(b: Block): Cell[] {
  return b.shape.map((c) => ({ x: b.pos.x + c.x, y: b.pos.y + c.y }));
}

export function shapeWidth(shape: Cell[]): number {
  return Math.max(...shape.map((c) => c.x)) + 1;
}

export function shapeHeight(shape: Cell[]): number {
  return Math.max(...shape.map((c) => c.y)) + 1;
}
