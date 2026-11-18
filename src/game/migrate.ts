/**
 * Save migration for rebuilt levels.
 *
 * When a pack version rebuilds levels (1.2.0 for planning depth, 1.3.0 for
 * obstacles), a save's best move counts were set on the old boards and
 * cannot be compared with the new pars. Each one is replaced with the fewest
 * moves that earn, on the new board, the same stars the player had on the
 * old one: a cleared level stays cleared, and no star, goal or gold pot is
 * lost. Old pars live in pack-history.ts.
 */

export function starsFor(moves: number, par: number): number {
  if (moves <= par) return 3;
  if (moves <= par + Math.max(2, Math.ceil(par * 0.4))) return 2;
  return 1;
}

/** The fewest moves that earn exactly `stars` against `par`. */
export function movesForStars(stars: number, par: number): number {
  if (stars >= 3) return par;
  if (stars === 2) return par + 1;
  return par + Math.max(2, Math.ceil(par * 0.4)) + 1;
}

/**
 * Rewrites best move counts set on boards whose pars were `oldPars` (by
 * level number, from 1). `newPar` gives the current pack's par; a level
 * whose par did not change is left alone, and with no old pars at all the
 * records are returned unchanged.
 */
export function migrateBestMoves(
  bestMoves: Record<number, number>,
  oldPars: readonly number[] | undefined,
  newPar: (levelId: number) => number | null,
): Record<number, number> {
  if (!oldPars) return { ...bestMoves };
  const out: Record<number, number> = {};
  for (const [key, moves] of Object.entries(bestMoves)) {
    const id = Number(key);
    const oldPar = oldPars[id - 1];
    const par = newPar(id);
    if (oldPar === undefined || par === null || par === oldPar) {
      out[id] = moves;
      continue;
    }
    out[id] = movesForStars(starsFor(moves, oldPar), par);
  }
  return out;
}
