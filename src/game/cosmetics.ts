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

export type EffectId = 'kiln-puff' | 'petals' | 'glaze-splash' | 'sparks' | 'steam' | 'spinning-pot';

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
  { id: 'sparks', name: 'Sparks', price: 200, blurb: 'A short burst of warm sparks off the kiln.' },
  { id: 'steam', name: 'Steam', price: 150, blurb: 'A few wisps of steam rising from the gate.' },
  { id: 'spinning-pot', name: 'Spinning pot', price: 250, blurb: 'A tiny pot in the tile colour spins out through the gate.' },
];

export function glazeById(id: string): GlazeInfo {
  return GLAZES.find((g) => g.id === id) ?? GLAZES.find((g) => g.id === DEFAULT_GLAZE)!;
}

export function effectById(id: string): EffectInfo {
  return EFFECTS.find((e) => e.id === id) ?? EFFECTS.find((e) => e.id === DEFAULT_EFFECT)!;
}

/**
 * Tray rims: a band set into the outer edge of the tray. The empty id is the
 * theme's own rim and is free, so it doubles as "no rim".
 */
export type RimId = '' | 'neon-kiln' | 'lava' | 'raku' | 'celadon';

export interface RimInfo {
  id: RimId;
  name: string;
  price: number;
  blurb: string;
}

export const DEFAULT_RIM: RimId = '';

export const RIMS: RimInfo[] = [
  { id: '', name: 'Theme rim', price: 0, blurb: 'The plain edge that comes with the tray.' },
  { id: 'neon-kiln', name: 'Neon kiln', price: 350, blurb: 'A band of colour that slowly circles the tray.' },
  { id: 'lava', name: 'Lava', price: 350, blurb: 'Dark basalt with a slow, glowing crack.' },
  { id: 'raku', name: 'Raku', price: 300, blurb: 'Matte black, crazed with fine gold lines.' },
  { id: 'celadon', name: 'Celadon', price: 250, blurb: 'Pale grey-green glaze with a soft highlight.' },
];

/** Rims that need a redraw every frame (the rest are painted once). */
export const ANIMATED_RIMS: RimId[] = ['neon-kiln', 'lava'];

export function rimById(id: string): RimInfo {
  return RIMS.find((r) => r.id === id) ?? RIMS.find((r) => r.id === DEFAULT_RIM)!;
}

/** Played once when a level is won. The empty id is the plain win. */
export type WinEffectId = '' | 'kiln-flash' | 'gold-drip';

export interface WinEffectInfo {
  id: WinEffectId;
  name: string;
  price: number;
  blurb: string;
}

export const DEFAULT_WIN_EFFECT: WinEffectId = '';

export const WIN_EFFECTS: WinEffectInfo[] = [
  { id: '', name: 'Confetti', price: 0, blurb: 'Confetti and a clear board.' },
  { id: 'kiln-flash', name: 'Kiln flash', price: 250, blurb: 'The board glows warm white, like a kiln door opening.' },
  { id: 'gold-drip', name: 'Gold drip', price: 300, blurb: 'Gold glaze runs down from the top of the tray.' },
];

export function winEffectById(id: string): WinEffectInfo {
  return WIN_EFFECTS.find((w) => w.id === id) ?? WIN_EFFECTS.find((w) => w.id === DEFAULT_WIN_EFFECT)!;
}
