import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { applyMove, encodeState, isSolved, legalMoves, maxSlide } from '../src/engine/board.ts';
import { solve } from '../src/engine/solver.ts';
import { cloneLevel, type Block, type Level } from '../src/engine/types.ts';
import { Rng } from '../src/engine/rng.ts';

const one = [{ x: 0, y: 0 }];

function block(id: number, color: number, x: number, y: number, extra: Partial<Block> = {}): Block {
  return { id, color, kind: 'block', shape: one, pos: { x, y }, exited: false, ...extra };
}

function board(blocks: Block[], extra: Partial<Level> = {}): Level {
  return {
    id: 1,
    seed: 1,
    width: 5,
    height: 1,
    blocks,
    gates: [{ side: 'right', start: 0, length: 1, color: 0 }],
    minMoves: 0,
    ...extra,
  };
}

const find = (l: Level, id: number): Block => l.blocks.find((b) => b.id === id)!;

describe('raw clay and kiln tiles', () => {
  it('a raw block cannot leave through its gate', () => {
    const l = board([block(0, 0, 0, 0, { raw: true })]);
    assert.deepEqual(maxSlide(l, find(l, 0), 'right'), { distance: 4, exits: false });
    assert.equal(solve(l).solved, false);
  });

  it('sliding over a kiln tile fires it, and it can leave on the next move', () => {
    const l = board([block(0, 0, 0, 0, { raw: true })], { kilns: [{ x: 2, y: 0 }] });
    assert.equal(applyMove(l, { blockId: 0, dir: 'right', distance: 4 }).exited, false);
    assert.equal(find(l, 0).raw, false);
    assert.equal(applyMove(l, { blockId: 0, dir: 'right', distance: 1 }).exited, true);
    const fresh = board([block(0, 0, 0, 0, { raw: true })], { kilns: [{ x: 2, y: 0 }] });
    assert.equal(solve(fresh).minMoves, 2);
  });

  it('stopping short of the kiln leaves it raw', () => {
    const l = board([block(0, 0, 0, 0, { raw: true })], { kilns: [{ x: 3, y: 0 }] });
    applyMove(l, { blockId: 0, dir: 'right', distance: 2 });
    assert.equal(find(l, 0).raw, true);
  });
});

describe('wet clay', () => {
  it('stops a slide on the wet cell, and the next move carries on', () => {
    const l = board([block(0, 0, 0, 0)], { wet: [{ x: 2, y: 0 }] });
    assert.deepEqual(maxSlide(l, find(l, 0), 'right'), { distance: 2, exits: false });
    applyMove(l, { blockId: 0, dir: 'right', distance: 2 });
    assert.deepEqual(maxSlide(l, find(l, 0), 'right'), { distance: 3, exits: true });
    const fresh = board([block(0, 0, 0, 0)], { wet: [{ x: 2, y: 0 }] });
    assert.equal(solve(fresh).minMoves, 2);
  });

  it('a long block is caught only by the cell its leading edge enters', () => {
    const bar = { id: 0, color: 0, kind: 'block' as const, shape: [{ x: 0, y: 0 }, { x: 1, y: 0 }], pos: { x: 0, y: 0 }, exited: false };
    const l = board([bar], { width: 6, wet: [{ x: 1, y: 0 }, { x: 3, y: 0 }] });
    // Already on (1,0), so only entering (3,0) stops it: 2 steps.
    assert.deepEqual(maxSlide(l, find(l, 0), 'right'), { distance: 2, exits: false });
  });
});

describe('kiln doors', () => {
  it('stays shut until a block of the key colour has left', () => {
    const l = board([block(0, 0, 0, 0), block(1, 1, 0, 0)], {
      width: 3,
      height: 2,
      gates: [
        { side: 'right', start: 0, length: 1, color: 0, key: 1 },
        { side: 'right', start: 1, length: 1, color: 1 },
      ],
    });
    find(l, 1).pos = { x: 0, y: 1 };
    assert.equal(maxSlide(l, find(l, 0), 'right').exits, false);
    applyMove(l, { blockId: 1, dir: 'right', distance: 3 });
    assert.equal(maxSlide(l, find(l, 0), 'right').exits, true);
  });
});

/** Reference breadth-first search written only with the board rules. */
function referenceMinMoves(level: Level, cap = 200_000): number | null {
  const seen = new Set([encodeState(level)]);
  let frontier = [cloneLevel(level)];
  for (let depth = 0; frontier.length && seen.size < cap; depth++) {
    const next: Level[] = [];
    for (const l of frontier) {
      if (isSolved(l)) return depth;
      for (const m of legalMoves(l)) {
        const c = cloneLevel(l);
        applyMove(c, m);
        const key = encodeState(c);
        if (seen.has(key)) continue;
        seen.add(key);
        next.push(c);
      }
    }
    frontier = next;
  }
  return frontier.length ? null : Infinity;
}

describe('the solver agrees with the board rules', () => {
  it('on random small boards with every obstacle', () => {
    const rng = new Rng(77);
    let solvable = 0;
    for (let n = 0; n < 60; n++) {
      const cells = rng.shuffle(Array.from({ length: 16 }, (_, i) => ({ x: i % 4, y: Math.floor(i / 4) })));
      const blocks = [0, 1, 2].map((i) => block(i, i % 2, cells[i].x, cells[i].y, { raw: i === 0 && rng.int(2) === 0 }));
      const l = board(blocks, {
        width: 4,
        height: 4,
        gates: [
          { side: 'right', start: rng.int(4), length: 1, color: 0, key: rng.int(2) === 0 ? 1 : undefined },
          { side: 'top', start: rng.int(4), length: 1, color: 1 },
        ],
        wet: cells.slice(3, 3 + rng.int(3)),
        kilns: cells.slice(6, 6 + rng.int(2)),
      });
      const fast = solve(l);
      const slow = referenceMinMoves(l);
      assert.ok(slow !== null, 'reference search finished');
      assert.equal(fast.solved, Number.isFinite(slow!), `board ${n} solvability`);
      if (!fast.solved) continue;
      solvable++;
      assert.equal(fast.minMoves, slow, `board ${n} minimum`);
      const replay = cloneLevel(l);
      for (const m of fast.solution) assert.equal(applyMove(replay, m).ok, true);
      assert.equal(isSolved(replay), true);
    }
    assert.ok(solvable >= 20, `only ${solvable} of 60 boards were solvable`);
  });
});
