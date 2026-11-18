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
import { applyMove, findBlock, legalMoves, maxSlide } from './board.ts';
import {
  type Block,
  type Cell,
  cloneLevel,
  CRATE_COLOR,
  type Dir,
  DIR_VECTORS,
  type Gate,
  type Level,
  type Move,
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
  /**
   * Planning depth: the longest run of setup moves the shortest solution
   * needs before the next block can leave. At 1 every exit is "move the one
   * blocker aside", which reads as busywork; at 2 and up the player has to
   * see a sequence before it pays off.
   */
  minDepth: number;
  /** How many separate times the solution needs a run of 2+ setup moves. */
  minThinks: number;
  /** Obstacles placed on top of the built board (see OBSTACLE_START). */
  obstacles: Obstacles;
}

export interface Obstacles {
  /** Raw clay blocks, each with a kiln tile somewhere on the floor. */
  raw: number;
  /** Wet clay floor cells. */
  wet: number;
  /** Kiln doors: gates keyed to another colour. */
  doors: number;
}

const NO_OBSTACLES: Obstacles = { raw: 0, wet: 0, doors: 0 };

/**
 * First level of each obstacle, per heat. The first level an obstacle
 * appears on has that obstacle alone, so its tip card has a clear example.
 */
export const OBSTACLE_START: Record<Heat, Record<keyof Obstacles, number>> = {
  warm: { raw: 30, wet: 60, doors: 100 },
  hot: { raw: 20, wet: 40, doors: 70 },
  white: { raw: 10, wet: 25, doors: 50 },
};

export function obstaclesFor(id: number, heat: Heat): Obstacles {
  const start = OBSTACLE_START[heat];
  for (const kind of ['raw', 'wet', 'doors'] as const) {
    if (id === start[kind]) return { ...NO_OBSTACLES, [kind]: 1 };
  }
  // A second raw block and a second wet patch arrive 40 levels after the first.
  const count = (kind: keyof Obstacles, max: number): number =>
    id < start[kind] ? 0 : Math.min(max, 1 + Math.floor((id - start[kind]) / 40));
  return { raw: count('raw', 2), wet: count('wet', 2), doors: count('doors', 1) };
}

/**
 * Kiln heat: the player's chosen difficulty. Warm is the main curve; Hot and
 * White-hot are separate packs built from the same level numbers.
 */
export type Heat = 'warm' | 'hot' | 'white';
export const HEATS: Heat[] = ['warm', 'hot', 'white'];

function band(
  width: number,
  height: number,
  blockCount: number,
  colorCount: number,
  crateCount: number,
  detours: [number, number],
  [minDepth, minThinks]: [number, number],
  shapePool: Cell[][],
  scramble: [number, number],
): DifficultyProfile {
  return {
    width,
    height,
    blockCount,
    colorCount,
    crateCount,
    extraMoves: detours,
    minDepth,
    minThinks,
    shapePool,
    scramble,
    obstacles: NO_OBSTACLES,
  };
}

function warmProfile(id: number): DifficultyProfile {
  // Levels 1 to 3 teach the rules; nothing is in the way yet.
  if (id <= 3) return band(5, 5, 3, 2, 0, [0, 3], [0, 0], SMALL_SHAPES, [1, 2]);
  // From level 4 the difficulty is in the order, not the block count: each
  // band asks for longer and more frequent chains of setup moves before a
  // block can leave.
  if (id <= 10) return band(5, 6, 4, 2, 0, [2, 7], [2, 1], MEDIUM_SHAPES, [2, 3]);
  if (id <= 25) return band(6, 6, 5, 3, 1, [3, 9], [2, 2], MEDIUM_SHAPES, [2, 4]);
  if (id <= 50) return band(6, 6, 6, 3, 1, [4, 11], [3, 2], MEDIUM_SHAPES, [2, 4]);
  if (id <= 90) return band(6, 7, 6, 3, 2, [5, 13], [3, 2], SHAPES, [3, 5]);
  // The curve stops at 91: later levels stay at this level of planning
  // rather than climbing. (Roomier 7x7 boards were tried and needed less
  // thought, not more.)
  return band(6, 7, 6, 3, 2, [5, 13], [3, 2], SHAPES, [3, 5]);
}

function hotProfile(id: number): DifficultyProfile {
  // Same tray as the Warm plateau, climbed further: between Warm and White-hot.
  if (id <= 25) return band(6, 7, 6, 3, 2, [5, 13], [4, 2], SHAPES, [3, 5]);
  return band(6, 7, 6, 3, 2, [5, 14], [4, 2], SHAPES, [3, 5]);
}

function whiteProfile(id: number): DifficultyProfile {
  // Tight 6x7 trays: the build climbs these longest, for the deepest plans.
  if (id <= 25) return band(6, 7, 6, 3, 2, [5, 14], [4, 3], SHAPES, [3, 5]);
  return band(6, 7, 6, 3, 2, [6, 15], [4, 3], SHAPES, [3, 5]);
}

export function profileForLevel(id: number, heat: Heat = 'warm'): DifficultyProfile {
  const base = heat === 'hot' ? hotProfile(id) : heat === 'white' ? whiteProfile(id) : warmProfile(id);
  return { ...base, obstacles: obstaclesFor(id, heat) };
}

export interface Difficulty {
  /** Moves in the shortest solution that are not a block leaving. */
  detours: number;
  /** Longest run of setup moves before an exit. */
  depth: number;
  /** Runs of two or more setup moves. */
  thinks: number;
}

/** How much thinking a solved level needs, beyond sliding blocks out. */
export function measureDifficulty(level: Level): Difficulty {
  const playable = level.blocks.filter((b) => b.kind === 'block').length;
  const board = cloneLevel(level);
  let run = 0;
  let depth = 0;
  let thinks = 0;
  for (const move of level.solution ?? []) {
    if (applyMove(board, move).exited) {
      depth = Math.max(depth, run);
      if (run >= 2) thinks++;
      run = 0;
    } else {
      run++;
    }
  }
  return { detours: Math.max(0, level.minMoves - playable), depth, thinks };
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

const SIDE_DIR: Record<Side, Dir> = { top: 'up', bottom: 'down', left: 'left', right: 'right' };

function footprint(profile: DifficultyProfile, shape: Cell[], pos: Cell): number[] {
  return shape.map((c) => (pos.y + c.y) * profile.width + pos.x + c.x);
}

/** Cells a block would sweep through on its way out of the given side. */
function exitCorridor(profile: DifficultyProfile, shape: Cell[], pos: Cell, side: Side): Set<number> {
  const vec = DIR_VECTORS[SIDE_DIR[side]];
  const own = new Set(footprint(profile, shape, pos));
  const cells = new Set<number>();
  for (let step = 1; step <= profile.width + profile.height; step++) {
    let inside = false;
    for (const c of shape) {
      const x = pos.x + c.x + vec.x * step;
      const y = pos.y + c.y + vec.y * step;
      if (x < 0 || y < 0 || x >= profile.width || y >= profile.height) continue;
      inside = true;
      const i = y * profile.width + x;
      if (!own.has(i)) cells.add(i);
    }
    if (!inside) break;
  }
  return cells;
}

/**
 * Builds a chain of obstructions in front of a newly placed block. A block
 * already on the board is slid (backwards in time) into the cells the new
 * block needs to leave through; then another block is slid into the cells
 * that first one needs to slide back through; and so on. Played forwards,
 * the player has to undo the chain from the far end before the block can
 * leave, which is what turns "slide it out" into a plan.
 */
function obstruct(
  rng: Rng,
  profile: DifficultyProfile,
  occupied: Uint8Array,
  placements: Placement[],
  self: number,
  target: Set<number>,
  links: number,
): void {
  const used = new Set<number>([self]);
  for (let link = 0; link < links && target.size > 0; link++) {
    const options: Array<{ index: number; to: Cell; swept: Set<number> }> = [];
    placements.forEach((p, index) => {
      if (used.has(index)) return;
      const from = footprint(profile, p.shape, p.pos);
      setCells(occupied, profile, p.shape, p.pos, 0);
      for (const dir of ALL_DIRS) {
        const vec = DIR_VECTORS[dir];
        for (let d = 1; d <= profile.width + profile.height; d++) {
          const to = { x: p.pos.x + vec.x * d, y: p.pos.y + vec.y * d };
          if (!cellsFree(occupied, profile, p.shape, to)) break;
          const landed = footprint(profile, p.shape, to);
          if (!landed.some((i) => target.has(i))) continue;
          // The way back: every cell the block passes through, less where it lands.
          const swept = new Set<number>(from);
          for (let k = 1; k < d; k++) {
            for (const i of footprint(profile, p.shape, { x: p.pos.x + vec.x * k, y: p.pos.y + vec.y * k })) swept.add(i);
          }
          for (const i of landed) swept.delete(i);
          options.push({ index, to, swept });
        }
      }
      setCells(occupied, profile, p.shape, p.pos, 1);
    });
    if (options.length === 0) return;
    const pick = rng.pick(options);
    const p = placements[pick.index];
    setCells(occupied, profile, p.shape, p.pos, 0);
    p.pos = pick.to;
    setCells(occupied, profile, p.shape, p.pos, 1);
    used.add(pick.index);
    target = pick.swept;
  }
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
    if (profile.minDepth > 0) {
      const self = placements.length - 1;
      const corridor = exitCorridor(profile, spec.shape, pos, gate.side);
      obstruct(rng, profile, occupied, placements, self, corridor, profile.minDepth + rng.range(0, 1));
    }
  }

  for (const p of placements) {
    blocks.push({ id: nextId++, color: p.color, kind: 'block', shape: p.shape, pos: p.pos, exited: false });
  }

  const level: Level = {
    id,
    seed,
    width: profile.width,
    height: profile.height,
    blocks,
    gates: [...gates.values()],
    minMoves: 0,
  };
  placeObstacles(rng, level, profile.obstacles, occupied);
  return level;
}

/**
 * Adds obstacles to a built board. Obstacles only ever restrict, so the
 * board may no longer be winnable: the solver run that follows is what
 * decides, and an unwinnable candidate is simply skipped.
 */
function placeObstacles(rng: Rng, level: Level, obstacles: Obstacles, occupied: Uint8Array): void {
  // No obstacles: touch nothing, not even the random stream, so boards
  // before an obstacle's first level stay exactly as they were.
  if (obstacles.raw + obstacles.wet + obstacles.doors === 0) return;
  const free = rng.shuffle(
    [...Array(level.width * level.height).keys()].filter((i) => !occupied[i]).map((i) => ({ x: i % level.width, y: Math.floor(i / level.width) })),
  );
  const playable = rng.shuffle(level.blocks.filter((b) => b.kind === 'block'));

  if (obstacles.raw > 0) {
    const raw = playable.slice(0, Math.min(obstacles.raw, playable.length));
    raw.forEach((b) => (b.raw = true));
    level.kilns = free.splice(0, raw.length);
  }
  if (obstacles.wet > 0) {
    // Never on a gate's own edge lane, so a block can always reach a gate flush.
    const wet: Cell[] = [];
    while (wet.length < obstacles.wet && free.length) {
      const c = free.shift()!;
      const onEdge = c.x === 0 || c.y === 0 || c.x === level.width - 1 || c.y === level.height - 1;
      if (!onEdge) wet.push(c);
    }
    if (wet.length) level.wet = wet;
  }
  if (obstacles.doors > 0 && level.gates.length > 1) {
    const [door, keyGate] = rng.shuffle([...level.gates]);
    door.key = keyGate.color;
  }
}

export interface GenerateOptions {
  maxAttempts?: number;
  maxStatesPerSolve?: number;
  scrambleCap?: number;
  /** Use this level number's difficulty instead of the id's own (daily puzzles). */
  profileLevel?: number;
  /** Kiln heat. Hot and White-hot use their own seeds, so boards differ. */
  heat?: Heat;
  /**
   * Rounds of hill-climbing on the starting position (build time only; each
   * round is a full solve). 0 leaves the board as built.
   */
  climb?: number;
  /** Largest search the start may need, so in-game hints stay quick. */
  hintBudget?: number;
  /** Tries a different seed for the same level (build-time retries). */
  seedSalt?: number;
  /**
   * Keep building candidates until one meets the profile's planning targets.
   * Each candidate costs a full search, so this is for the build machine.
   */
  strict?: boolean;
}

function planScore(d: Difficulty): number {
  return d.depth * 10 + d.thinks * 4 + d.detours;
}

function isExit(level: Level, move: Move): boolean {
  const block = findBlock(level, move.blockId)!;
  const reach = maxSlide(level, block, move.dir);
  return reach.exits && move.distance === reach.distance;
}

/**
 * Nudges the starting position around its own reachable space and keeps the
 * start that needs the most planning. Every nudge is a legal, reversible
 * slide, so the level stays winnable; each new start is re-solved, so par and
 * the stored solution stay exact.
 */
/** Every raw block is still raw, and none starts on a kiln tile. */
function rawIntact(before: Level, after: Level): boolean {
  const kilns = new Set((after.kilns ?? []).map((c) => c.y * after.width + c.x));
  return after.blocks.every((b, i) => {
    if (!before.blocks[i].raw) return true;
    if (!b.raw) return false;
    return b.shape.every((c) => !kilns.has((b.pos.y + c.y) * after.width + b.pos.x + c.x));
  });
}

function climbStart(
  rng: Rng,
  level: Level,
  profile: DifficultyProfile,
  rounds: number,
  maxMoves: number,
  hintBudget: number,
): Level {
  // Enough planning to feel like a puzzle, but not a wall: early levels are
  // capped so the ramp stays gentle.
  const maxDepth = profile.minDepth + 2;
  const goodEnough = (d: Difficulty): boolean => d.depth >= profile.minDepth + 1 && d.thinks >= profile.minThinks + 1;
  // Tutorial levels are left exactly as built.
  if (profile.minDepth === 0) return level;
  let best = level;
  let bestDifficulty = measureDifficulty(level);
  let bestScore = planScore(bestDifficulty);
  for (let round = 0; round < rounds && !goodEnough(bestDifficulty); round++) {
    const next = cloneLevel(best);
    const steps = rng.range(1, 3);
    for (let step = 0; step < steps; step++) {
      const moves = legalMoves(next).filter((m) => !isExit(next, m));
      if (moves.length === 0) break;
      applyMove(next, rng.pick(moves));
    }
    // The nudges must not fire raw clay or park it on a kiln before play starts.
    if (!rawIntact(level, next)) continue;
    const result = solve(next, { maxStates: hintBudget });
    if (!result.solved || result.minMoves > maxMoves) continue;
    next.minMoves = result.minMoves;
    next.solution = result.solution;
    const difficulty = measureDifficulty(next);
    if (difficulty.depth > maxDepth) continue;
    const score = planScore(difficulty);
    // Ties are taken too, so the search can drift across flat ground.
    if (score >= bestScore) {
      best = next;
      bestScore = score;
      bestDifficulty = difficulty;
    }
  }
  return best;
}

const HEAT_SEED_OFFSET: Record<Heat, number> = { warm: 0, hot: 50_000, white: 70_000 };

/**
 * Builds level `id`. Deterministic: the same level number produces the same
 * board for every player on every device, with no level data shipped.
 */
export function generateLevel(id: number, options: GenerateOptions = {}): Level {
  const maxAttempts = options.maxAttempts ?? 60;
  const maxStates = options.maxStatesPerSolve ?? 60_000;
  const scrambleCap = options.scrambleCap ?? 8;
  const heat = options.heat ?? 'warm';
  const profile = profileForLevel(options.profileLevel ?? id, heat);
  const seed = seedForLevel(id + HEAT_SEED_OFFSET[heat] + (options.seedSalt ?? 0) * 7_919);
  const rng = new Rng(seed);

  const targetMin = profile.blockCount + profile.extraMoves[0];
  const targetMax = profile.blockCount + profile.extraMoves[1];

  let best: Level | null = null;
  let bestScore = Infinity;

  // If boards keep coming out below the target band, scramble harder rather
  // than shipping a level that is easier than its position in the run.
  let boost = 0;

  const climbRounds = options.climb ?? 0;
  const hintBudget = options.hintBudget ?? maxStates;
  const finish = (level: Level): Level =>
    climbRounds > 0 ? climbStart(rng, level, profile, climbRounds, targetMax, hintBudget) : level;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = buildCandidate(rng, profile, id, seed, boost);
    if (!candidate) continue;

    const result = solve(candidate, { maxStates });
    // Reverse construction guarantees a solution exists; a miss here only
    // means the search budget ran out, so the candidate is simply skipped.
    if (!result.solved || result.statesExplored > hintBudget) continue;

    candidate.minMoves = result.minMoves;
    candidate.solution = result.solution;
    const inBand = result.minMoves >= targetMin && result.minMoves <= targetMax;
    const { depth, thinks } = measureDifficulty(candidate);
    // The planning targets can take many candidates to meet, so only the
    // build insists on them; the Daily Kiln, built on the phone, accepts on
    // length alone and relies on a short climb.
    const shortfall =
      options.strict ? Math.max(0, profile.minDepth - depth) + Math.max(0, profile.minThinks - thinks) : 0;
    if (inBand && shortfall === 0) return finish(candidate);

    if (result.minMoves < targetMin || shortfall > 0) boost = Math.min(boost + 1, scrambleCap);
    else if (result.minMoves > targetMax && boost > 0) boost--;

    // Too little planning costs most: that is what makes a level feel easy.
    const bandMiss =
      result.minMoves < targetMin ? targetMin - result.minMoves : Math.max(0, result.minMoves - targetMax);
    const score = shortfall * 3 + bandMiss;
    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  if (best) return finish(best);

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
      return finish(candidate);
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
