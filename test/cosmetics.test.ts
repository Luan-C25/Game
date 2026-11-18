import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ANIMATED_RIMS,
  EFFECTS,
  GLAZES,
  RIMS,
  WIN_EFFECTS,
  effectById,
  glazeById,
  rimById,
  winEffectById,
} from '../src/game/cosmetics.ts';
import { reconcile } from '../src/game/save.ts';
import { BLOCK_COLOURS, THEMES, themeById } from '../src/game/theme.ts';

test('glaze ids are unique and exactly one is free: gloss', () => {
  assert.equal(new Set(GLAZES.map((g) => g.id)).size, GLAZES.length);
  const free = GLAZES.filter((g) => g.price === 0);
  assert.deepEqual(free.map((g) => g.id), ['gloss']);
});

test('effect ids are unique and exactly one is free: kiln-puff', () => {
  assert.equal(new Set(EFFECTS.map((e) => e.id)).size, EFFECTS.length);
  const free = EFFECTS.filter((e) => e.price === 0);
  assert.deepEqual(free.map((e) => e.id), ['kiln-puff']);
});

test('lookups return known items and fall back to the defaults', () => {
  assert.equal(glazeById('matte').id, 'matte');
  assert.equal(glazeById('nope').id, 'gloss');
  assert.equal(effectById('petals').id, 'petals');
  assert.equal(effectById('nope').id, 'kiln-puff');
});

test('the new exit effects are in the catalogue at their prices', () => {
  const price = (id: string): number | undefined => EFFECTS.find((e) => e.id === id)?.price;
  assert.equal(price('sparks'), 200);
  assert.equal(price('steam'), 150);
  assert.equal(price('spinning-pot'), 250);
  assert.equal(effectById('spinning-pot').id, 'spinning-pot');
});

test('rims: unique ids, the empty theme rim is the only free one, prices as designed', () => {
  assert.equal(new Set(RIMS.map((r) => r.id)).size, RIMS.length);
  assert.deepEqual(RIMS.filter((r) => r.price === 0).map((r) => r.id), ['']);
  const price = (id: string): number | undefined => RIMS.find((r) => r.id === id)?.price;
  assert.equal(price('neon-kiln'), 350);
  assert.equal(price('lava'), 350);
  assert.equal(price('raku'), 300);
  assert.equal(price('celadon'), 250);
  assert.deepEqual([...ANIMATED_RIMS].sort(), ['lava', 'neon-kiln']);
});

test('rim and win effect lookups fall back to the free default', () => {
  assert.equal(rimById('raku').id, 'raku');
  assert.equal(rimById('nope').id, '');
  assert.equal(rimById('').id, '');
  assert.equal(winEffectById('gold-drip').id, 'gold-drip');
  assert.equal(winEffectById('nope').id, '');
});

test('win effects: unique ids, one free, prices as designed', () => {
  assert.equal(new Set(WIN_EFFECTS.map((w) => w.id)).size, WIN_EFFECTS.length);
  assert.deepEqual(WIN_EFFECTS.filter((w) => w.price === 0).map((w) => w.id), ['']);
  const price = (id: string): number | undefined => WIN_EFFECTS.find((w) => w.id === id)?.price;
  assert.equal(price('kiln-flash'), 250);
  assert.equal(price('gold-drip'), 300);
});

test('a fresh save has the new fields at their defaults', () => {
  const s = reconcile({});
  assert.equal(s.settings.rim, '');
  assert.equal(s.settings.winEffect, '');
  assert.deepEqual(s.ownedRims, []);
  assert.deepEqual(s.ownedWinEffects, []);
});

test('save reconciliation keeps good new fields and drops bad ones', () => {
  const s = reconcile({
    settings: { rim: 'lava', winEffect: 'kiln-flash' },
    ownedRims: ['lava', 'lava', 7, null, 'raku'],
    ownedWinEffects: ['kiln-flash', {}, 'gold-drip'],
  });
  assert.equal(s.settings.rim, 'lava');
  assert.equal(s.settings.winEffect, 'kiln-flash');
  assert.deepEqual(s.ownedRims, ['lava', 'raku']);
  assert.deepEqual(s.ownedWinEffects, ['kiln-flash', 'gold-drip']);

  const bad = reconcile({
    settings: { rim: 42, winEffect: ['x'] },
    ownedRims: 'lava',
    ownedWinEffects: { a: 1 },
  });
  assert.equal(bad.settings.rim, '');
  assert.equal(bad.settings.winEffect, '');
  assert.deepEqual(bad.ownedRims, []);
  assert.deepEqual(bad.ownedWinEffects, []);

  // An id from a future build is kept in the save but draws the default.
  const future = reconcile({ settings: { rim: 'from-the-future' } });
  assert.equal(rimById(future.settings.rim).id, '');
});

/** WCAG relative luminance and contrast ratio, from #rrggbb. */
function luminance(hex: string): number {
  const v = parseInt(hex.slice(1), 16);
  const lin = (c: number): number => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin((v >> 16) & 255) + 0.7152 * lin((v >> 8) & 255) + 0.0722 * lin(v & 255);
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

test('the new themes exist at their prices and every floor clears 1.6:1 against all six tiles', () => {
  const price = (id: string): number => themeById(id).price;
  assert.equal(themeById('ember').id, 'ember');
  assert.equal(price('ember'), 225);
  assert.equal(price('sage'), 225);
  assert.equal(price('midnight-kiln'), 300);
  assert.equal(new Set(THEMES.map((t) => t.id)).size, THEMES.length);
  for (const theme of THEMES) {
    for (const tile of BLOCK_COLOURS) {
      const ratio = contrast(tile, theme.floor);
      assert.ok(ratio >= 1.6, `${theme.id} floor vs ${tile} is ${ratio.toFixed(2)}`);
    }
  }
});
