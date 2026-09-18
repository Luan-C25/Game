/**
 * Level generation by reverse construction.
 *
 * Boards are not guessed and then checked - they are built backwards from a
 * won position. Each block is placed at its exit gate and then slid *away*
 * along empty cells; replaying those slides in reverse is, by construction, a
 * legal winning line. An unsolvable level therefore cannot exist, rather than
 * merely being unlikely.
 *
 * Difficulty is expressed as a target range for the proven shortest solution.
 * It deliberately plateaus: the point where the games we are answering start
 * being described as unbeatable is the point this curve flattens.
 */

import { solve } from './solver.ts';
import { Rng, seedForLevel } from './rng.ts';
import {
  type Block,
  type Cell,
  CRATE_COLOR,
  type Dir,
  DIR_VECTORS,
  type Gate,
  type Level,
  type Side,
  shapeHeight,
  shapeWidth,
} from './types.ts';

const SHAPES: Cell[][] = [
  [{ x: 0, y: 0 }],
  [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
  ],
  [
    { x: 0, y: 0 },
    { x: 0, y: 1 },
  ],
  [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 2, y: 0 },
  ],
  [
    { x: 0, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: 2 },
  ],
  [
    { x: 0, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
  ],
  [
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
  ],
  [
    { x: 0, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 1 },
  ],
];

const SMALL_SHAPES = SHAPES.slice(0, 3);
const MEDIUM_SHAPES = SHAPES.slice(0, 5);
const ALL_SIDES: Side[] = ['top', 'bottom', 'left', 'right'];
const ALL_DIRS: Dir[] = ['up', 'down', 'left', 'right'];

export interface DifficultyProfile {
  width: number;
  height: number;
  blockCount: number;
  colorCount: number;
  crateCount: number;
  /** How far the shortest solution should exceed the block count. */
  extraMoves: [number, number];
  shapePool: Cell[][];
  /** Reverse slides per block; more scrambling means a longer solution. */
  scramble: [number, number];
}

export function profileForLevel(id: number): DifficultyProfile {
  if (id <= 8) {
    return {
      width: 5,
      height: 5,
      blockCount: 3,
      colorCount: 2,
      crateCount: 0,
      extraMoves: [0, 3],
      shapePool: SMALL_SHAPES,
      scramble: [1, 2],
    };
  }
  if (id <= 25) {
    return {
      width: 5,
      height: 6,
      blockCount: 4,
      colorCount: 2,
      crateCount: 0,
      extraMoves: [1, 5],
      shapePool: MEDIUM_SHAPES,
      scramble: [1, 2],
    };
  }
  if (id <= 50) {
    return {
      width: 6,
      height: 6,
      blockCount: 5,
      colorCount: 3,
      crateCount: 1,
      extraMoves: [2, 7],
      shapePool: MEDIUM_SHAPES,
      scramble: [1, 3],
    };
  }
  if (id <= 90) {
    return {
      width: 6,
      height: 7,
      blockCount: 6,
      colorCount: 3,
      crateCount: 1,
      extraMoves: [2, 9],
      shapePool: SHAPES,
      scramble: [2, 4],
    };
  }
  // The curve stops here. Later levels stay hard; they do not keep climbing.
  return {
    width: 7,
    height: 7,
    blockCount: 7,
    colorCount: 3,
    crateCount: 2,
    extraMoves: [2, 12],
    shapePool: SHAPES,
    scramble: [3, 6],
  };
}

interface Placement {
  shape: Cell[];
  color: number;
  pos: Cell;
}

/** Gate wide enough for every block of its colour, in any orientation. */
function planGates(rng: Rng, profile: DifficultyProfile, specs: Array<{ shape: Cell[]; color: number }>): Map<number, Gate> | null {
  const byColor = new Map<number, number>();
  for (const spec of specs) {
    const need = Math.max(shapeWidth(spec.shape), shapeHeight(spec.shape));
    byColor.set(spec.color, Math.max(byColor.get(spec.color) ?? 0, need));
  }

  const gates = new Map<number, Gate>();
  const usedBySide: Record<Side, Array<[number, number]>> = { top: [], bottom: [], left: [], right: [] };

  for (const color of rng.shuffle([...byColor.keys()])) {
    const length = byColor.get(color)!;
    let placed = false;

    for (const side of rng.shuffle([...ALL_SIDES])) {
      const sideLength = side === 'top' || side === 'bottom' ? profile.width : profile.height;
      if (length > sideLength) continue;

      for (const start of rng.shuffle([...Array(sideLength - length + 1).keys()])) {
        const clash = usedBySide[side].some(([s, len]) => start < s + len && s < start + length);
        if (clash) continue;
        gates.set(color, { side, start, length, color });
        usedBySide[side].push([start, length]);
        placed = true;
        break;
      }
      if (placed) break;
    }

    if (!placed) return null;
  }

  return gates;
}

/** Positions in which a block sits flush against its gate, ready to leave. */
function exitPositions(gate: Gate, shape: Cell[], profile: DifficultyProfile): Cell[] {
  const w = shapeWidth(shape);
  const h = shapeHeight(shape);
  const spots: Cell[] = [];

  if (gate.side === 'left' || gate.side === 'right') {
    if (h > gate.length) return spots;
    const x = gate.side === 'left' ? 0 : profile.width - w;
    for (let y = gate.start; y <= gate.start + gate.length - h; y++) spots.push({ x, y });
  } else {
    if (w > gate.length) return spots;
    const y = gate.side === 'top' ? 0 : profile.height - h;
    for (let x = gate.start; x <= gate.start + gate.length - w; x++) spots.push({ x, y });
  }

  return spots;
}

function cellsFree(occupied: Uint8Array, profile: DifficultyProfile, shape: Cell[], pos: Cell): boolean {
  for (const c of shape) {
    const x = pos.x + c.x;
    const y = pos.y + c.y;
    if (x < 0 || y < 0 || x >= profile.width || y >= profile.height) return false;
    if (occupied[y * profile.width + x]) return false;
  }
  return true;
}

function setCells(occupied: Uint8Array, profile: DifficultyProfile, shape: Cell[], pos: Cell, value: number): void {
  for (const c of shape) {
    occupied[(pos.y + c.y) * profile.width + pos.x + c.x] = value;
  }
}

/**
 * Slides a block backwards through empty cells. The forward replay of these
 * slides is legal because the same blocks are on the board at the matching
 * moment in each direction.
 */
function scrambleBackwards(
  rng: Rng,
  profile: DifficultyProfile,
  occupied: Uint8Array,
  shape: Cell[],
  start: Cell,
  rounds: number,
): Cell {
  let pos = start;
  setCells(occupied, profile, shape, pos, 0);

  for (let round = 0; round < rounds; round++) {
    const dirs = rng.shuffle([...ALL_DIRS]);
    let moved = false;

    for (const dir of dirs) {
      const vec = DIR_VECTORS[dir];
      let reach = 0;
      while (reach < profile.width + profile.height) {
        const next = { x: pos.x + vec.x * (reach + 1), y: pos.y + vec.y * (reach + 1) };
        if (!cellsFree(occupied, profile, shape, next)) break;
        reach++;
      }
      if (reach === 0) continue;
      pos = { x: pos.x + vec.x * rng.range(1, reach), y: pos.y + vec.y * rng.range(1, reach) };
      moved = true;
      break;
    }

    if (!moved) break;
  }

  setCells(occupied, profile, shape, pos, 1);
  return pos;
}

function buildCandidate(
  rng: Rng,
  profile: DifficultyProfile,
  id: number,
  seed: number,
  scrambleBoost = 0,
): Level | null {
  const occupied = new Uint8Array(profile.width * profile.height);
  const blocks: Block[] = [];
  let nextId = 0;

  for (let i = 0; i < profile.crateCount; i++) {
    for (let attempt = 0; attempt < 30; attempt++) {
      const pos = { x: rng.int(profile.width), y: rng.int(profile.height) };
      const shape = [{ x: 0, y: 0 }];
      if (!cellsFree(occupied, profile, shape, pos)) continue;
      setCells(occupied, profile, shape, pos, 1);
      blocks.push({ id: nextId++, color: CRATE_COLOR, kind: 'crate', shape, pos, exited: false });
      break;
    }
  }

  const palette = rng.shuffle([...Array(profile.colorCount).keys()]);
  const specs = Array.from({ length: profile.blockCount }, (_, i) => ({
    shape: rng.pick(profile.shapePool),
    // Use every colour once before repeating any, so no colour is decorative.
    color: palette[i % palette.length],
  }));

  const gates = planGates(rng, profile, specs);
  if (!gates) return null;

  // Reverse exit order: the first block placed is the last one to leave.
  const placements: Placement[] = [];
  for (const spec of specs) {
    const gate = gates.get(spec.color)!;
    const spots = rng.shuffle(exitPositions(gate, spec.shape, profile));
    const spot = spots.find((s) => cellsFree(occupied, profile, spec.shape, s));
    if (!spot) return null;

    setCells(occupied, profile, spec.shape, spot, 1);
    const pos = scrambleBackwards(
      rng,
      profile,
      occupied,
      spec.shape,
      spot,
      rng.range(profile.scramble[0], profile.scramble[1]) + scrambleBoost,
    );
    placements.push({ shape: spec.shape, color: spec.color, pos });
  }

  for (const p of placements) {
    blocks.push({ id: nextId++, color: p.color, kind: 'block', shape: p.shape, pos: p.pos, exited: false });
  }

  return {
    id,
    seed,
    width: profile.width,
    height: profile.height,
    blocks,
    gates: [...gates.values()],
    minMoves: 0,
  };
}

export interface GenerateOptions {
  maxAttempts?: number;
  maxStatesPerSolve?: number;
  scrambleCap?: number;
}

/**
 * Builds level `id`. Deterministic: the same level number produces the same
 * board for every player on every device, with no level data shipped.
 */
export function generateLevel(id: number, options: GenerateOptions = {}): Level {
  const maxAttempts = options.maxAttempts ?? 60;
  const maxStates = options.maxStatesPerSolve ?? 60_000;
  const scrambleCap = options.scrambleCap ?? 8;
  const profile = profileForLevel(id);
  const seed = seedForLevel(id);
  const rng = new Rng(seed);

  const targetMin = profile.blockCount + profile.extraMoves[0];
  const targetMax = profile.blockCount + profile.extraMoves[1];

  let best: Level | null = null;
  let bestScore = Infinity;

  // If boards keep coming out below the target band, scramble harder rather
  // than shipping a level that is easier than its position in the run.
  let boost = 0;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = buildCandidate(rng, profile, id, seed, boost);
    if (!candidate) continue;

    const result = solve(candidate, { maxStates });
    // Reverse construction guarantees a solution exists; a miss here only
    // means the search budget ran out, so the candidate is simply skipped.
    if (!result.solved) continue;

    candidate.minMoves = result.minMoves;
    candidate.solution = result.solution;
    if (result.minMoves >= targetMin && result.minMoves <= targetMax) return candidate;

    if (result.minMoves < targetMin) boost = Math.min(boost + 1, scrambleCap);
    else if (result.minMoves > targetMax && boost > 0) boost--;

    const score =
      result.minMoves < targetMin ? targetMin - result.minMoves : result.minMoves - targetMax;
    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  if (best) return best;

  // Nothing landed in the band. Step the profile down until something does.
  // Every rung still returns a real, solver-verified board - the player never
  // receives a placeholder, only an easier level than intended.
  for (let rung = 1; rung <= profile.blockCount; rung++) {
    const simpler: DifficultyProfile = {
      ...profile,
      blockCount: Math.max(2, profile.blockCount - rung),
      crateCount: Math.max(0, profile.crateCount - rung),
      shapePool: rung >= 2 ? SMALL_SHAPES : MEDIUM_SHAPES,
      scramble: [1, Math.max(1, profile.scramble[1] - rung)],
    };
    for (let attempt = 0; attempt < 40; attempt++) {
      const candidate = buildCandidate(rng, simpler, id, seed);
      if (!candidate) continue;
      const result = solve(candidate, { maxStates });
      if (!result.solved) continue;
      candidate.minMoves = result.minMoves;
      candidate.solution = result.solution;
      return candidate;
    }
  }

  throw new Error(`level ${id} could not be generated`);
}

const cache = new Map<number, Level>();

/** Memoised generation, so revisiting a level is instant. */
export function getLevel(id: number): Level {
  const cached = cache.get(id);
  if (cached) return cached;
  const level = generateLevel(id);
  cache.set(id, level);
  return level;
}
