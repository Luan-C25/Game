/**
 * Precomputes the level pack.
 *
 * Every board is generated, solved, and then the solution is *replayed* to
 * confirm it actually wins. Nothing reaches the pack that has not been proven
 * beatable, and doing this at build time keeps level loading instant on a
 * phone rather than spending a second of CPU per level on the player's device.
 *
 * Usage: node scripts/build-levels.ts [count]
 */

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { applyMove, isSolved } from '../src/engine/board.ts';
import { generateLevel } from '../src/engine/generator.ts';
import { cloneLevel, type Level } from '../src/engine/types.ts';

const here = dirname(fileURLToPath(import.meta.url));
const outputPath = join(here, '..', 'src', 'game', 'levels.json');

function verify(level: Level): void {
  if (!level.solution || level.solution.length === 0) {
    throw new Error(`level ${level.id} has no recorded solution`);
  }
  const replay = cloneLevel(level);
  for (const move of level.solution) {
    if (!applyMove(replay, move).ok) {
      throw new Error(`level ${level.id} has an illegal move in its solution`);
    }
  }
  if (!isSolved(replay)) {
    throw new Error(`level ${level.id} solution does not actually win`);
  }
  if (level.solution.length !== level.minMoves) {
    throw new Error(`level ${level.id} minMoves disagrees with its solution length`);
  }
}

const count = Number(process.argv[2] ?? 200);
const levels: Level[] = [];
const started = Date.now();

for (let id = 1; id <= count; id++) {
  // A build machine can afford a far deeper search than a phone, so the pack
  // gets the best board the generator can find rather than the quickest.
  const level = generateLevel(id, { maxAttempts: 50, maxStatesPerSolve: 150_000 });
  verify(level);
  levels.push(level);
  if (id % 25 === 0) {
    process.stdout.write(`  ${id}/${count} verified (${Date.now() - started}ms)\n`);
  }
}

writeFileSync(outputPath, JSON.stringify({ version: 1, levels }));

const moves = levels.map((l) => l.minMoves);
console.log(
  `\n${levels.length} levels verified in ${Date.now() - started}ms\n` +
    `shortest solution: min ${Math.min(...moves)}, max ${Math.max(...moves)}, ` +
    `mean ${(moves.reduce((a, b) => a + b, 0) / moves.length).toFixed(1)}\n` +
    `written to ${outputPath}`,
);
