/**
 * Breadth-first solver over a compact board representation.
 *
 * This is the backbone of the "every level is solvable" promise. The
 * generator proves a board is winnable before it ships, and the in-game hint
 * re-runs this search from wherever the player currently is, so a hint stays
 * correct however far they have wandered from the intended line.
 *
 * Pruning: when a block can exit right now, exiting it immediately is always
 * part of some optimal solution. Every block must exit exactly once, an exit
 * costs one move whatever the distance, and removing a block only frees space
 * for the others - so an available exit can be hoisted to the front of any
 * optimal solution without lengthening it. Treating it as forced therefore
 * preserves the true minimum while cutting the branching factor hard.
 */

import {
  ALL_DIRS,
  type Block,
  CRATE_COLOR,
  type Dir,
  DIR_VECTORS,
  type Level,
  type Move,
  type Side,
} from './types.ts';
import { sideForDir } from './board.ts';

const EXITED = -128;
const CRATE_MARK = 255;

const SIDE_INDEX: Record<Side, number> = { top: 0, bottom: 1, left: 2, right: 3 };

/** Static, position-independent facts about a level, precomputed once. */
class SearchModel {
  readonly width: number;
  readonly height: number;
  readonly count: number;
  readonly blockIds: number[];
  readonly shapes: Int8Array[];
  readonly xOffsets: Int8Array[];
  readonly yOffsets: Int8Array[];
  readonly colors: Int8Array;
  readonly baseGrid: Uint8Array;
  private readonly gateLanes: Uint8Array;
  private readonly laneStride: number;

  constructor(level: Level) {
    this.width = level.width;
    this.height = level.height;

    const playable = level.blocks.filter((b) => b.kind === 'block');
    this.count = playable.length;
    this.blockIds = playable.map((b) => b.id);
    this.shapes = playable.map((b) => {
      const flat = new Int8Array(b.shape.length * 2);
      b.shape.forEach((c, i) => {
        flat[i * 2] = c.x;
        flat[i * 2 + 1] = c.y;
      });
      return flat;
    });
    this.xOffsets = playable.map((b) => Int8Array.from(new Set(b.shape.map((c) => c.x))));
    this.yOffsets = playable.map((b) => Int8Array.from(new Set(b.shape.map((c) => c.y))));
    this.colors = Int8Array.from(playable.map((b) => b.color));

    this.baseGrid = new Uint8Array(level.width * level.height);
    for (const b of level.blocks) {
      if (b.kind !== 'crate') continue;
      for (const c of b.shape) {
        this.baseGrid[(b.pos.y + c.y) * level.width + b.pos.x + c.x] = CRATE_MARK;
      }
    }

    const colorCount = Math.max(1, ...level.gates.map((g) => g.color + 1));
    this.laneStride = Math.max(level.width, level.height);
    this.gateLanes = new Uint8Array(colorCount * 4 * this.laneStride);
    for (const g of level.gates) {
      for (let lane = g.start; lane < g.start + g.length; lane++) {
        const idx = (g.color * 4 + SIDE_INDEX[g.side]) * this.laneStride + lane;
        if (idx >= 0 && idx < this.gateLanes.length) this.gateLanes[idx] = 1;
      }
    }
  }

  gateOpen(color: number, side: Side, lane: number): boolean {
    if (lane < 0 || lane >= this.laneStride) return false;
    const idx = (color * 4 + SIDE_INDEX[side]) * this.laneStride + lane;
    return idx >= 0 && idx < this.gateLanes.length && this.gateLanes[idx] === 1;
  }

  /** State layout: two Int8 slots per block; x === EXITED means gone. */
  initialState(level: Level): Int8Array {
    const state = new Int8Array(this.count * 2);
    const playable = level.blocks.filter((b) => b.kind === 'block');
    playable.forEach((b, i) => {
      if (b.exited) {
        state[i * 2] = EXITED;
        state[i * 2 + 1] = 0;
      } else {
        state[i * 2] = b.pos.x;
        state[i * 2 + 1] = b.pos.y;
      }
    });
    return state;
  }

  fillGrid(state: Int8Array, grid: Uint8Array): void {
    grid.set(this.baseGrid);
    for (let i = 0; i < this.count; i++) {
      const px = state[i * 2];
      if (px === EXITED) continue;
      const py = state[i * 2 + 1];
      const shape = this.shapes[i];
      for (let s = 0; s < shape.length; s += 2) {
        grid[(py + shape[s + 1]) * this.width + px + shape[s]] = i + 1;
      }
    }
  }

  /** Whether every lane the block occupies on `side` is an open gate. */
  fitsGate(state: Int8Array, index: number, side: Side): boolean {
    const color = this.colors[index];
    if (color === CRATE_COLOR) return false;
    const px = state[index * 2];
    const py = state[index * 2 + 1];
    const offsets = side === 'top' || side === 'bottom' ? this.xOffsets[index] : this.yOffsets[index];
    const base = side === 'top' || side === 'bottom' ? px : py;
    for (let i = 0; i < offsets.length; i++) {
      if (!this.gateOpen(color, side, base + offsets[i])) return false;
    }
    return true;
  }

  /** How far block `index` can slide, and whether that slide exits the board. */
  slide(state: Int8Array, grid: Uint8Array, index: number, dir: Dir): { distance: number; exits: boolean } {
    const px = state[index * 2];
    if (px === EXITED) return { distance: 0, exits: false };
    const py = state[index * 2 + 1];
    const shape = this.shapes[index];
    const vec = DIR_VECTORS[dir];
    const side = sideForDir(dir);
    const limit = this.width + this.height;
    const self = index + 1;

    for (let step = 1; step <= limit; step++) {
      let anyOutside = false;
      for (let s = 0; s < shape.length; s += 2) {
        const nx = px + shape[s] + vec.x * step;
        const ny = py + shape[s + 1] + vec.y * step;
        if (nx < 0 || ny < 0 || nx >= this.width || ny >= this.height) {
          anyOutside = true;
          continue;
        }
        const occupant = grid[ny * this.width + nx];
        if (occupant !== 0 && occupant !== self) return { distance: step - 1, exits: false };
      }
      if (anyOutside) {
        if (this.fitsGate(state, index, side)) return { distance: step, exits: true };
        return { distance: step - 1, exits: false };
      }
    }
    return { distance: limit, exits: false };
  }

  solved(state: Int8Array): boolean {
    for (let i = 0; i < this.count; i++) {
      if (state[i * 2] !== EXITED) return false;
    }
    return true;
  }
}

function keyOf(state: Int8Array): string {
  let key = '';
  for (let i = 0; i < state.length; i++) key += String.fromCharCode(state[i] + 128);
  return key;
}

export interface SolveResult {
  solved: boolean;
  /** Shortest move count found, or Infinity when no solution was found. */
  minMoves: number;
  solution: Move[];
  /** True when the search hit its budget before exhausting the state space. */
  exhausted: boolean;
  statesExplored: number;
}

export interface SolveOptions {
  /** Search budget, so a pathological board can never hang the app. */
  maxStates?: number;
}

const DEFAULT_MAX_STATES = 200_000;

export function solve(level: Level, options: SolveOptions = {}): SolveResult {
  const maxStates = options.maxStates ?? DEFAULT_MAX_STATES;
  const model = new SearchModel(level);
  const start = model.initialState(level);

  if (model.solved(start)) {
    return { solved: true, minMoves: 0, solution: [], exhausted: false, statesExplored: 0 };
  }

  const grid = new Uint8Array(model.width * model.height);
  const states: Int8Array[] = [start];
  const parents: number[] = [-1];
  const viaBlock: number[] = [-1];
  const viaDir: Dir[] = ['up'];
  const viaDistance: number[] = [0];
  const visited = new Set<string>([keyOf(start)]);

  const reconstruct = (node: number): Move[] => {
    const moves: Move[] = [];
    for (let n = node; n > 0; n = parents[n]) {
      moves.push({ blockId: model.blockIds[viaBlock[n]], dir: viaDir[n], distance: viaDistance[n] });
    }
    return moves.reverse();
  };

  for (let head = 0; head < states.length; head++) {
    if (states.length > maxStates) {
      return { solved: false, minMoves: Infinity, solution: [], exhausted: true, statesExplored: head };
    }

    const state = states[head];
    model.fillGrid(state, grid);

    // Forced-exit pruning: one available exit replaces the whole move list.
    let forced: { index: number; dir: Dir; distance: number } | null = null;
    outer: for (let i = 0; i < model.count && !forced; i++) {
      if (state[i * 2] === EXITED) continue;
      for (const dir of ALL_DIRS) {
        const reach = model.slide(state, grid, i, dir);
        if (reach.exits) {
          forced = { index: i, dir, distance: reach.distance };
          break outer;
        }
      }
    }

    const expand = (index: number, dir: Dir, distance: number, exits: boolean): number | null => {
      const next = Int8Array.from(state);
      if (exits) {
        next[index * 2] = EXITED;
        next[index * 2 + 1] = 0;
      } else {
        const vec = DIR_VECTORS[dir];
        next[index * 2] = state[index * 2] + vec.x * distance;
        next[index * 2 + 1] = state[index * 2 + 1] + vec.y * distance;
      }
      const key = keyOf(next);
      if (visited.has(key)) return null;
      visited.add(key);
      states.push(next);
      parents.push(head);
      viaBlock.push(index);
      viaDir.push(dir);
      viaDistance.push(distance);
      return states.length - 1;
    };

    if (forced) {
      const node = expand(forced.index, forced.dir, forced.distance, true);
      if (node !== null && model.solved(states[node])) {
        return {
          solved: true,
          minMoves: reconstruct(node).length,
          solution: reconstruct(node),
          exhausted: false,
          statesExplored: states.length,
        };
      }
      continue;
    }

    for (let i = 0; i < model.count; i++) {
      if (state[i * 2] === EXITED) continue;
      for (const dir of ALL_DIRS) {
        const reach = model.slide(state, grid, i, dir);
        for (let d = 1; d <= reach.distance; d++) {
          const exits = reach.exits && d === reach.distance;
          const node = expand(i, dir, d, exits);
          if (node !== null && model.solved(states[node])) {
            const solution = reconstruct(node);
            return {
              solved: true,
              minMoves: solution.length,
              solution,
              exhausted: false,
              statesExplored: states.length,
            };
          }
        }
      }
    }
  }

  return { solved: false, minMoves: Infinity, solution: [], exhausted: false, statesExplored: states.length };
}

/**
 * The next move on a shortest path from the player's current position.
 * Returns null only when the search budget is exhausted, which the caller
 * handles by offering a rewind rather than by pretending there is no hint.
 */
export function hintFrom(level: Level, options: SolveOptions = {}): Move | null {
  const result = solve(level, options);
  return result.solved && result.solution.length > 0 ? result.solution[0] : null;
}

export type { Block };
