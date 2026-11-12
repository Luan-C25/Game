import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  badgeLabel,
  badgeThreshold,
  claimGift,
  currentStreak,
  dailyDifficulty,
  dailyLevelId,
  dayNumber,
  defaultDaily,
  defaultGift,
  giftStatus,
  nextBadge,
  recordDailyClear,
  type DailyState,
} from '../src/game/daily.ts';
import { GIFT_CHARACTERS, nextGiftCharacter } from '../src/game/characters.ts';
import { GOALS, claimable, type GoalStats } from '../src/game/goals.ts';
import { reconcile } from '../src/game/save.ts';
import { generateLevel } from '../src/engine/generator.ts';
import { solve } from '../src/engine/solver.ts';

const D = 20_000; // an arbitrary day number

function clearDays(days: number[]): DailyState {
  let state = defaultDaily();
  for (const d of days) state = recordDailyClear(state, d).state;
  return state;
}

describe('day clock', () => {
  it('turns over at local midnight', () => {
    const late = new Date(2026, 10, 12, 23, 59, 59);
    const early = new Date(2026, 10, 13, 0, 0, 1);
    assert.equal(dayNumber(early) - dayNumber(late), 1);
    assert.equal(dayNumber(new Date(2026, 10, 12, 0, 0, 1)), dayNumber(late));
  });

  it('runs easy early in the week and hardest at the weekend', () => {
    // 16 November 2026 is a Monday.
    const monday = dayNumber(new Date(2026, 10, 16));
    assert.equal(dailyDifficulty(monday), 45);
    assert.equal(dailyDifficulty(monday + 6), 91);
  });
});

describe('Daily Kiln streak', () => {
  it('counts consecutive days and keeps the best', () => {
    const s = clearDays([D, D + 1, D + 2]);
    assert.equal(currentStreak(s, D + 2), 3);
    assert.equal(currentStreak(s, D + 3), 3, 'still alive the next day');
    assert.equal(currentStreak(s, D + 4), 0, 'a missed day ends it');
    const after = recordDailyClear(s, D + 4).state;
    assert.equal(after.streak, 1);
    assert.equal(after.best, 3);
  });

  it('pays only once a day', () => {
    const s = clearDays([D]);
    assert.equal(recordDailyClear(s, D).firstToday, false);
  });

  it('earns 7, 14, 21 days, months, a year, then every month after', () => {
    assert.deepEqual([0, 1, 2, 3, 4].map(badgeThreshold), [7, 14, 21, 30, 60]);
    assert.equal(badgeThreshold(13), 330);
    assert.equal(badgeThreshold(14), 365);
    assert.equal(badgeThreshold(15), 395);
    assert.equal(badgeLabel(7), '7 days');
    assert.equal(badgeLabel(30), '1 month');
    assert.equal(badgeLabel(330), '11 months');
    assert.equal(badgeLabel(365), '1 year');
    assert.equal(badgeLabel(395), '1 year 1 month');
    assert.equal(badgeLabel(365 + 12 * 30), '2 years');
    assert.equal(nextBadge(21), 30);
  });

  it('awards each badge once and keeps it after the streak breaks', () => {
    const days = Array.from({ length: 14 }, (_, i) => D + i);
    let state = defaultDaily();
    const earned: number[] = [];
    for (const d of days) {
      const r = recordDailyClear(state, d);
      earned.push(...r.newBadges);
      state = r.state;
    }
    assert.deepEqual(earned, [7, 14]);
    const broken = recordDailyClear(state, D + 30).state;
    assert.deepEqual(broken.badges, [7, 14]);
  });

  it('builds a solvable daily board that is not a pack level', () => {
    const level = generateLevel(dailyLevelId(D), { profileLevel: dailyDifficulty(D) });
    assert.ok(level.id > 200);
    assert.ok(solve(level).solved);
  });
});

describe('daily gift', () => {
  it('starts on day 1 and steps through the week', () => {
    assert.deepEqual(giftStatus(defaultGift(), D), { kind: 'ready', index: 1 });
    let g = claimGift(D, 1);
    assert.deepEqual(giftStatus(g, D), { kind: 'claimed' });
    assert.deepEqual(giftStatus(g, D + 1), { kind: 'ready', index: 2 });
    g = claimGift(D + 6, 7);
    assert.deepEqual(giftStatus(g, D + 7), { kind: 'ready', index: 1 }, 'wraps after day 7');
  });

  it('offers to keep the place after exactly one missed day, and resets after two', () => {
    const g = claimGift(D, 4);
    assert.deepEqual(giftStatus(g, D + 2), { kind: 'missed-one', keepIndex: 5 });
    assert.deepEqual(giftStatus(g, D + 3), { kind: 'ready', index: 1 });
  });

  it('gives gift characters in order, never twice', () => {
    assert.equal(nextGiftCharacter([])?.id, GIFT_CHARACTERS[0].id);
    assert.equal(nextGiftCharacter([GIFT_CHARACTERS[0].id])?.id, GIFT_CHARACTERS[1].id);
    assert.equal(nextGiftCharacter(GIFT_CHARACTERS.map((c) => c.id)), null);
  });
});

describe("Potter's Ledger", () => {
  const stats = (over: Partial<GoalStats> = {}): GoalStats => ({
    bestMoves: {},
    parFor: () => 5,
    flicks: 0,
    dailyClears: 0,
    ...over,
  });

  it('has unique ids', () => {
    assert.equal(new Set(GOALS.map((g) => g.id)).size, GOALS.length);
  });

  it('pays a chapter clear once every level in it is cleared', () => {
    const bestMoves: Record<number, number> = {};
    for (let i = 1; i <= 20; i++) bestMoves[i] = 9; // over par: 1 star each
    const ready = claimable(stats({ bestMoves }), []).map((g) => g.id);
    assert.ok(ready.includes('chapter-1-clear'));
    assert.ok(ready.includes('clears-10'));
    assert.ok(!ready.includes('chapter-1-stars'));
    assert.ok(!claimable(stats({ bestMoves }), ['chapter-1-clear']).some((g) => g.id === 'chapter-1-clear'));
  });

  it('counts flicks and dailies', () => {
    const ready = claimable(stats({ flicks: 120, dailyClears: 1 }), []).map((g) => g.id);
    assert.ok(ready.includes('flicks-100') && ready.includes('daily-1'));
    assert.ok(!ready.includes('flicks-500'));
  });
});

describe('save', () => {
  it('loads an old save with fresh daily, gift and ledger data', () => {
    const s = reconcile({ highestUnlocked: 30, coins: 5 });
    assert.deepEqual(s.daily, defaultDaily());
    assert.deepEqual(s.gift, defaultGift());
    assert.deepEqual(s.characters, []);
    assert.equal(s.flicks, 0);
  });

  it('drops junk but keeps what is valid', () => {
    const s = reconcile({
      daily: { clearedDays: [5, 'x', 3, 5], streak: 2, best: -1, badges: [7, 7] },
      gift: { lastClaimDay: 10, lastIndex: 9 },
      characters: ['cat', 3, 'cat'],
    });
    assert.deepEqual(s.daily.clearedDays, [3, 5]);
    assert.equal(s.daily.best, 0);
    assert.deepEqual(s.daily.badges, [7]);
    assert.deepEqual(s.gift, { lastClaimDay: 10, lastIndex: 0 });
    assert.deepEqual(s.characters, ['cat']);
  });
});
