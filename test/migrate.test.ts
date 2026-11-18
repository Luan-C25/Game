import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { PAR_HISTORY } from '../src/game/pack-history.ts';

const LEGACY_PARS = PAR_HISTORY[1].warm!;
import { migrateBestMoves, movesForStars, starsFor } from '../src/game/migrate.ts';

describe('migrating best moves to the rebuilt pack', () => {
  it('keeps the stars earned on the old board', () => {
    const oldPar = LEGACY_PARS[9];
    const best = { 10: oldPar, 11: LEGACY_PARS[10] + 1, 12: LEGACY_PARS[11] + 30 };
    const migrated = migrateBestMoves(best, LEGACY_PARS, (id) => 20 + id);
    assert.equal(starsFor(migrated[10], 30), 3);
    assert.equal(starsFor(migrated[11], 31), 2);
    assert.equal(starsFor(migrated[12], 32), 1);
  });

  it('leaves a level alone when its par did not change, and keeps cleared levels cleared', () => {
    const migrated = migrateBestMoves({ 1: 99, 50: 7 }, LEGACY_PARS, (id) => (id === 1 ? LEGACY_PARS[0] : 15));
    assert.equal(migrated[1], 99);
    assert.ok(migrated[50] !== undefined);
  });

  it('movesForStars is the smallest count that earns those stars', () => {
    for (const par of [5, 9, 14, 20]) {
      for (const stars of [1, 2, 3]) {
        const moves = movesForStars(stars, par);
        assert.equal(starsFor(moves, par), stars);
        if (stars < 3) assert.ok(starsFor(moves - 1, par) > stars);
      }
    }
  });
});

describe('the pack history', () => {
  it('has a whole, positive par for every level of every recorded pack', () => {
    for (const [version, heats] of Object.entries(PAR_HISTORY)) {
      for (const [heat, pars] of Object.entries(heats)) {
        assert.equal(pars!.length, 200, `pack ${version} ${heat}`);
        assert.ok(pars!.every((p) => Number.isInteger(p) && p > 0), `pack ${version} ${heat} has a bad par`);
      }
    }
  });

  it('the shipped packs carry the current version', async () => {
    const { readFileSync } = await import('node:fs');
    const { PACK_VERSION } = await import('../src/game/pack-history.ts');
    for (const file of ['levels.json', 'levels-hot.json', 'levels-white.json']) {
      const pack = JSON.parse(readFileSync(new URL(`../src/game/${file}`, import.meta.url), 'utf8'));
      assert.equal(pack.version, PACK_VERSION, `${file} version`);
    }
  });
});
