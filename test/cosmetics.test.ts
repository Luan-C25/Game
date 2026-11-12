import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EFFECTS, GLAZES, effectById, glazeById } from '../src/game/cosmetics.ts';

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
