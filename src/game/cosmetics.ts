/**
 * Cosmetic catalogue: tile glaze finishes and block exit effects.
 * Plain data and lookups only, so tests can import it without a canvas.
 * Prices are placeholders for the economy pass. Remember: no enums or
 * parameter properties here (Node strips types in tests).
 */

export type GlazeId = 'gloss' | 'speckled' | 'crackle' | 'matte';

export interface GlazeInfo {
  id: GlazeId;
  name: string;
  price: number;
  blurb: string;
}

export const DEFAULT_GLAZE: GlazeId = 'gloss';

export const GLAZES: GlazeInfo[] = [
  { id: 'gloss', name: 'Gloss', price: 0, blurb: 'Crisp and glassy, with one clean highlight.' },
  { id: 'speckled', name: 'Speckled', price: 250, blurb: 'Fired clay with tiny iron flecks.' },
  { id: 'crackle', name: 'Crackle', price: 300, blurb: 'Fine hairline cracks, like old crazed glaze.' },
  { id: 'matte', name: 'Matte', price: 350, blurb: 'No shine. Soft, unglazed clay.' },
];

export type EffectId = 'kiln-puff' | 'petals' | 'glaze-splash';

export interface EffectInfo {
  id: EffectId;
  name: string;
  price: number;
  blurb: string;
}

export const DEFAULT_EFFECT: EffectId = 'kiln-puff';

export const EFFECTS: EffectInfo[] = [
  { id: 'kiln-puff', name: 'Kiln puff', price: 0, blurb: 'Three soft puffs of kiln smoke.' },
  { id: 'petals', name: 'Petals', price: 150, blurb: 'A small handful of petals in the tile colour.' },
  { id: 'glaze-splash', name: 'Glaze splash', price: 200, blurb: 'The glaze pours out at the gate.' },
];

export function glazeById(id: string): GlazeInfo {
  return GLAZES.find((g) => g.id === id) ?? GLAZES.find((g) => g.id === DEFAULT_GLAZE)!;
}

export function effectById(id: string): EffectInfo {
  return EFFECTS.find((e) => e.id === id) ?? EFFECTS.find((e) => e.id === DEFAULT_EFFECT)!;
}
