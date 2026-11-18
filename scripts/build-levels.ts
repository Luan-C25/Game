/**
 * Precomputes the level packs, one per Kiln heat.
 *
 * Every board is generated, solved, and then the solution is *replayed* to
 * confirm it actually wins. Nothing reaches a pack that has not been proven
 * beatable, and doing this at build time keeps level loading instant on a
 * phone rather than spending seconds of search per level on the player's
 * device.
 *
 * Boards are also hill-climbed for planning depth (see measureDifficulty in
 * the generator), which takes a few seconds a level, so the work is split
 * across worker processes.
 *
 * Usage: node scripts/build-levels.ts [count] [--only heat:from-to,...]
 *
 * --only rebuilds just those ranges and keeps every other level from the
 * packs already on disk.
 */

import { spawn } from 'node:child_process';
import { availableParallelism } from 'node:os';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { applyMove, isSolved } from '../src/engine/board.ts';
import { generateLevel, HEATS, type Heat, measureDifficulty, profileForLevel } from '../src/engine/generator.ts';
import { solve } from '../src/engine/solver.ts';
import { PACK_VERSION } from '../src/game/pack-history.ts';
import { cloneLevel, type Level } from '../src/engine/types.ts';

const here = dirname(fileURLToPath(import.meta.url));
const gameDir = join(here, '..', 'src', 'game');

/** In-game hints search from wherever the player is with this budget. */
const HINT_BUDGET = 80_000;
/** The start must solve well inside it, leaving room for detours. */
const START_BUDGET = 60_000;
const CLIMB: Record<Heat, number> = { warm: 40, hot: 80, white: 120 };
const SEED_TRIES = 3;

export const PACK_FILES: Record<Heat, string> = {
  warm: 'levels.json',
  hot: 'levels-hot.json',
  white: 'levels-white.json',
};

function planScore(level: Level): number {
  const d = measureDifficulty(level);
  return d.depth * 10 + d.thinks * 4 + d.detours;
}

function buildOne(id: number, heat: Heat): Level {
  const profile = profileForLevel(id, heat);
  let best: Level | null = null;
  for (let salt = 0; salt < SEED_TRIES; salt++) {
    const level = generateLevel(id, {
      heat,
      seedSalt: salt,
      strict: true,
      maxAttempts: 50,
      maxStatesPerSolve: START_BUDGET,
      hintBudget: START_BUDGET,
      climb: CLIMB[heat],
    });
    if (!best || planScore(level) > planScore(best)) best = level;
    const d = measureDifficulty(level);
    if (d.depth >= profile.minDepth && d.thinks >= profile.minThinks) break;
  }
  return best!;
}

function verify(level: Level, heat: Heat): void {
  const where = `${heat} level ${level.id}`;
  if (!level.solution || level.solution.length === 0) throw new Error(`${where} has no recorded solution`);
  const replay = cloneLevel(level);
  for (const move of level.solution) {
    if (!applyMove(replay, move).ok) throw new Error(`${where} has an illegal move in its solution`);
  }
  if (!isSolved(replay)) throw new Error(`${where} solution does not actually win`);
  if (level.solution.length !== level.minMoves) throw new Error(`${where} minMoves disagrees with its solution`);
  const check = solve(level, { maxStates: HINT_BUDGET });
  if (!check.solved || check.minMoves !== level.minMoves) throw new Error(`${where} is not hintable within budget`);
}

// Worker: build one range of one heat and print it as JSON.
if (process.argv[2] === '--worker') {
  const heat = process.argv[3] as Heat;
  const from = Number(process.argv[4]);
  const to = Number(process.argv[5]);
  const out: Level[] = [];
  for (let id = from; id <= to; id++) out.push(buildOne(id, heat));
  process.stdout.write(JSON.stringify(out));
  process.exit(0);
}

const count = Number(process.argv[2] ?? 200);
const chunk = 10;
const jobs: Array<{ heat: Heat; from: number; to: number }> = [];
const onlyArg = process.argv.indexOf('--only');
const only = onlyArg > 0
  ? process.argv[onlyArg + 1].split(',').map((part) => {
      const [heat, range] = part.split(':');
      const [from, to] = range.split('-').map(Number);
      return { heat: heat as Heat, from, to };
    })
  : null;
const wanted = (heat: Heat, id: number): boolean =>
  !only || only.some((o) => o.heat === heat && id >= o.from && id <= o.to);

for (const heat of HEATS) {
  for (let from = 1; from <= count; from += chunk) {
    const ids = Array.from({ length: Math.min(count, from + chunk - 1) - from + 1 }, (_, i) => from + i).filter((id) => wanted(heat, id));
    if (ids.length) jobs.push({ heat, from: ids[0], to: ids[ids.length - 1] });
  }
}
// Hardest first, so the slowest jobs are not left running alone at the end.
jobs.sort((a, b) => HEATS.indexOf(b.heat) - HEATS.indexOf(a.heat) || b.from - a.from);

const started = Date.now();
const results = new Map<Heat, Level[]>(
  HEATS.map((h) => [
    h,
    only
      ? (JSON.parse(readFileSync(join(gameDir, PACK_FILES[h]), 'utf8')).levels as Level[]).filter((l) => l.id <= count && !wanted(h, l.id))
      : [],
  ]),
);
let done = 0;

function run(job: (typeof jobs)[number]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [fileURLToPath(import.meta.url), '--worker', job.heat, String(job.from), String(job.to)], {
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    let text = '';
    child.stdout.on('data', (d) => (text += d));
    child.on('close', (code) => {
      if (code !== 0) return reject(new Error(`${job.heat} ${job.from}-${job.to} failed`));
      results.get(job.heat)!.push(...(JSON.parse(text) as Level[]));
      done++;
      process.stdout.write(`  ${done}/${jobs.length} ${job.heat} ${job.from}-${job.to} (${Math.round((Date.now() - started) / 1000)}s)\n`);
      resolve();
    });
  });
}

const queue = [...jobs];
const workers = Math.max(1, Math.min(jobs.length, availableParallelism() - 1));
await Promise.all(
  Array.from({ length: workers }, async () => {
    while (queue.length) await run(queue.shift()!);
  }),
);

for (const heat of HEATS) {
  const levels = results.get(heat)!.sort((a, b) => a.id - b.id);
  levels.forEach((level) => verify(level, heat));
  writeFileSync(join(gameDir, PACK_FILES[heat]), JSON.stringify({ version: PACK_VERSION, heat, levels }));
  const ds = levels.map(measureDifficulty);
  const mean = (xs: number[]) => (xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(2);
  const shallow = ds.filter((d) => d.depth <= 1).length;
  console.log(
    `${heat}: ${levels.length} levels, moves mean ${mean(levels.map((l) => l.minMoves))}, ` +
      `planning depth mean ${mean(ds.map((d) => d.depth))}, ${shallow} with depth 1 or less`,
  );
}
console.log(`built in ${Math.round((Date.now() - started) / 1000)}s`);
