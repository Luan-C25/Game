import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { bestStars, clearedCount, isCleared, levelReward, starsOn, type RecordSave } from '../src/game/records.ts';
import { reconcile } from '../src/game/save.ts';

const save = (over: Partial<RecordSave> = {}): RecordSave => ({
  bestMoves: {},
  heatBest: { hot: {}, white: {} },
  ...over,
});

// par 10 on warm, 12 on hot, 14 on white
const parFor = (_id: number, heat: string): number => (heat === 'warm' ? 10 : heat === 'hot' ? 12 : 14);

describe('records across heats', () => {
  it('counts a level cleared at any heat', () => {
    const s = save({ heatBest: { hot: { 3: 20 }, white: { 4: 14 } }, bestMoves: { 1: 10, 3: 10 } });
    assert.ok(isCleared(s, 1) && isCleared(s, 3) && isCleared(s, 4));
    assert.ok(!isCleared(s, 2));
    assert.equal(clearedCount(s), 3);
  });

  it('takes the best stars across heats, against each heat par', () => {
    const s = save({ bestMoves: { 5: 30 }, heatBest: { hot: { 5: 12 }, white: {} } });
    assert.equal(starsOn(s, 5, 'warm', 10), 1);
    assert.equal(starsOn(s, 5, 'hot', 12), 3);
    assert.equal(starsOn(s, 5, 'white', 14), null);
    assert.equal(bestStars(s, 5, parFor), 3);
    assert.equal(bestStars(s, 6, parFor), null);
  });

  it('pays coins once per level, with a heat bonus', () => {
    assert.equal(levelReward(3, 'warm', false), 11);
    assert.equal(levelReward(3, 'hot', false), 17);
    assert.equal(levelReward(3, 'white', false), 22);
    assert.equal(levelReward(3, 'white', true), 0);
  });
});

describe('save reconciliation for heats', () => {
  it('defaults and cleans heat data', () => {
    const fresh = reconcile({});
    assert.equal(fresh.settings.heat, 'warm');
    assert.deepEqual(fresh.heatBest, { hot: {}, white: {} });
    assert.equal(reconcile({ highestUnlocked: 3 }).packVersion, 1);
    const s = reconcile({
      settings: { heat: 'lava' },
      packVersion: 2,
      heatBest: { hot: { 2: 9, x: 4, 3: -1, 0: 5 }, white: 'bad' },
    });
    assert.equal(s.settings.heat, 'warm');
    assert.equal(s.packVersion, 2);
    assert.deepEqual(s.heatBest, { hot: { 2: 9 }, white: {} });
  });
});
