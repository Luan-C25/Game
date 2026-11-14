import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { applyMove, blockFitsGate, isSolved, legalMoves, maxSlide } from '../src/engine/board.ts';
import { solve } from '../src/engine/solver.ts';
import { generateLevel, profileForLevel } from '../src/engine/generator.ts';
import { cloneLevel, type Level } from '../src/engine/types.ts';

function level(overrides: Partial<Level> = {}): Level {
  return {
    id: 1,
    seed: 1,
    width: 4,
    height: 4,
    blocks: [],
    gates: [],
    minMoves: 0,
    ...overrides,
  };
}

describe('movement rules', () => {
  it('slides a block until it meets another block', () => {
    const l = level({
      blocks: [
        { id: 0, color: 0, kind: 'block', shape: [{ x: 0, y: 0 }], pos: { x: 0, y: 0 }, exited: false },
        { id: 1, color: 1, kind: 'block', shape: [{ x: 0, y: 0 }], pos: { x: 3, y: 0 }, exited: false },
      ],
    });
    assert.deepEqual(maxSlide(l, l.blocks[0], 'right'), { distance: 2, exits: false });
  });

  it('stops at the wall when there is no gate', () => {
    const l = level({
      blocks: [
        { id: 0, color: 0, kind: 'block', shape: [{ x: 0, y: 0 }], pos: { x: 0, y: 0 }, exited: false },
      ],
    });
    assert.deepEqual(maxSlide(l, l.blocks[0], 'right'), { distance: 3, exits: false });
  });

  it('exits through a gate of its own colour', () => {
    const l = level({
      blocks: [
        { id: 0, color: 0, kind: 'block', shape: [{ x: 0, y: 0 }], pos: { x: 0, y: 0 }, exited: false },
      ],
      gates: [{ side: 'right', start: 0, length: 1, color: 0 }],
    });
    const reach = maxSlide(l, l.blocks[0], 'right');
    assert.equal(reach.exits, true);
    assert.equal(applyMove(l, { blockId: 0, dir: 'right', distance: reach.distance }).exited, true);
    assert.equal(isSolved(l), true);
  });

  it('refuses a gate of the wrong colour', () => {
    const l = level({
      blocks: [
        { id: 0, color: 0, kind: 'block', shape: [{ x: 0, y: 0 }], pos: { x: 0, y: 0 }, exited: false },
      ],
      gates: [{ side: 'right', start: 0, length: 1, color: 1 }],
    });
    assert.equal(maxSlide(l, l.blocks[0], 'right').exits, false);
  });

  it('refuses a gate narrower than the block, so nothing wedges half-out', () => {
    const tall = [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
    ];
    const l = level({
      blocks: [{ id: 0, color: 0, kind: 'block', shape: tall, pos: { x: 0, y: 0 }, exited: false }],
      gates: [{ side: 'right', start: 0, length: 1, color: 0 }],
    });
    assert.equal(blockFitsGate(l, l.blocks[0], 'right'), false);
    assert.equal(maxSlide(l, l.blocks[0], 'right').exits, false);
  });

  it('accepts a gate that spans the whole block', () => {
    const tall = [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
    ];
    const l = level({
      blocks: [{ id: 0, color: 0, kind: 'block', shape: tall, pos: { x: 0, y: 0 }, exited: false }],
      gates: [{ side: 'right', start: 0, length: 2, color: 0 }],
    });
    assert.equal(maxSlide(l, l.blocks[0], 'right').exits, true);
  });

  it('never moves a crate and never counts it towards winning', () => {
    const l = level({
      blocks: [
        { id: 0, color: -1, kind: 'crate', shape: [{ x: 0, y: 0 }], pos: { x: 1, y: 1 }, exited: false },
      ],
    });
    assert.equal(maxSlide(l, l.blocks[0], 'right').distance, 0);
    assert.equal(isSolved(l), true);
    assert.equal(legalMoves(l).length, 0);
  });

  it('rejects an over-long move without changing the board', () => {
    const l = level({
      blocks: [
        { id: 0, color: 0, kind: 'block', shape: [{ x: 0, y: 0 }], pos: { x: 0, y: 0 }, exited: false },
      ],
    });
    const before = JSON.stringify(l);
    assert.equal(applyMove(l, { blockId: 0, dir: 'right', distance: 9 }).ok, false);
    assert.equal(JSON.stringify(l), before);
  });
});

describe('solver', () => {
  it('reports an unsolvable board rather than guessing', () => {
    const l = level({
      blocks: [
        { id: 0, color: 0, kind: 'block', shape: [{ x: 0, y: 0 }], pos: { x: 0, y: 0 }, exited: false },
      ],
      gates: [],
    });
    const result = solve(l);
    assert.equal(result.solved, false);
    assert.equal(result.exhausted, false);
  });

  it('finds the shortest line, not just any line', () => {
    const l = level({
      blocks: [
        { id: 0, color: 0, kind: 'block', shape: [{ x: 0, y: 0 }], pos: { x: 0, y: 0 }, exited: false },
        { id: 1, color: 0, kind: 'block', shape: [{ x: 0, y: 0 }], pos: { x: 1, y: 0 }, exited: false },
      ],
      gates: [{ side: 'right', start: 0, length: 1, color: 0 }],
    });
    const result = solve(l);
    assert.equal(result.solved, true);
    assert.equal(result.minMoves, 2);
  });

  it('produces a line that actually wins when replayed', () => {
    const l = generateLevel(37);
    const result = solve(l);
    assert.equal(result.solved, true);

    const replay = cloneLevel(l);
    for (const move of result.solution) {
      assert.equal(applyMove(replay, move).ok, true, 'every move in the solution must be legal');
    }
    assert.equal(isSolved(replay), true);
  });
});

describe('the shipped level pack', () => {
  const pack = JSON.parse(readFileSync(new URL('../src/game/levels.json', import.meta.url), 'utf8')) as {
    version: number;
    levels: Level[];
  };

  it('ships a usable number of levels', () => {
    assert.ok(pack.levels.length >= 100, 'the pack should hold at least 100 levels');
  });

  it('every shipped level is beatable by replaying its recorded solution', () => {
    // The product promise, checked without searching: each level carries a
    // winning line, and replaying it has to actually win.
    for (const level of pack.levels) {
      assert.ok(level.solution && level.solution.length > 0, `level ${level.id} has no solution`);
      const replay = cloneLevel(level);
      for (const move of level.solution!) {
        assert.equal(applyMove(replay, move).ok, true, `level ${level.id} has an illegal solution move`);
      }
      assert.equal(isSolved(replay), true, `level ${level.id} solution does not win`);
      assert.equal(level.solution!.length, level.minMoves, `level ${level.id} par disagrees with its solution`);
    }
  });

  it('never overlaps two blocks and keeps every block on the board', () => {
    for (const level of pack.levels) {
      const seen = new Set<string>();
      for (const b of level.blocks) {
        for (const c of b.shape) {
          const x = b.pos.x + c.x;
          const y = b.pos.y + c.y;
          assert.ok(x >= 0 && y >= 0 && x < level.width && y < level.height, `level ${level.id} out of bounds`);
          const key = `${x},${y}`;
          assert.ok(!seen.has(key), `level ${level.id} overlaps at ${key}`);
          seen.add(key);
        }
      }
    }
  });

  it('gives every block a gate of its own colour', () => {
    for (const level of pack.levels) {
      for (const b of level.blocks) {
        if (b.kind === 'crate') continue;
        assert.ok(
          level.gates.some((g) => g.color === b.color),
          `level ${level.id} block ${b.id} has no gate of its colour`,
        );
      }
    }
  });

  it('has no timer, life or energy field anywhere in the data', () => {
    // A guard against the pressure mechanics this game exists to avoid
    // creeping back in through level data.
    const serialised = JSON.stringify(pack);
    for (const banned of ['timeLimit', 'timer', 'lives', 'energy', 'countdown']) {
      assert.ok(!serialised.includes(banned), `level data must not contain "${banned}"`);
    }
  });

  it('starts gently and does not spike', () => {
    const first = pack.levels.slice(0, 5);
    for (const level of first) {
      assert.ok(level.minMoves <= 8, `level ${level.id} is too long for an opener`);
    }
    const hardest = Math.max(...pack.levels.map((l) => l.minMoves));
    assert.ok(hardest <= 25, 'no level should need an unreasonable number of moves');
  });
});

describe('freshly generated levels', () => {
  it('is deterministic for a given level number', () => {
    assert.equal(JSON.stringify(generateLevel(42)), JSON.stringify(generateLevel(42)));
  });

  it('produces solvable boards outside the shipped pack', () => {
    for (const id of [7, 33, 64]) {
      const level = generateLevel(id);
      const result = solve(level);
      assert.equal(result.solved, true, `level ${id} must be solvable`);
      assert.equal(result.minMoves, level.minMoves, `level ${id} must report its true minimum`);
    }
  });

  it('keeps difficulty inside the profile band', () => {
    for (const id of [5, 20, 45]) {
      const level = generateLevel(id);
      const profile = profileForLevel(id);
      assert.ok(level.width <= profile.width && level.height <= profile.height, `level ${id} board size`);
      assert.ok(level.minMoves <= profile.blockCount + profile.extraMoves[1] + 4, `level ${id} too hard`);
    }
  });
});
