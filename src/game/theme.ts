/**
 * Colour and theme system.
 *
 * Two rules constrain the styling. Block hues come from the Okabe-Ito
 * palette, which stays distinguishable under the common forms of colour
 * blindness, and themes are never allowed to change them - a theme restyles
 * the world around the blocks, because the blocks carry the rules. Within
 * those limits the styling is meant to be loud: gradients, glow, drifting
 * colour in the background.
 */

export interface Theme {
  id: string;
  name: string;
  price: number;
  /** True when the theme needs light text on dark chrome. */
  dark: boolean;

  /** Background gradient, top to bottom. */
  bgFrom: string;
  bgTo: string;
  /** Slow-drifting colour blobs painted over the background. */
  blobs: [string, string, string];

  /** Wall ring gradient. */
  wallFrom: string;
  wallTo: string;
  /** Playfield gradient. */
  floorFrom: string;
  floorTo: string;
  gridDot: string;
  crate: string;

  /** Chrome, pushed into CSS custom properties by the app shell. */
  surface: string;
  line: string;
  text: string;
  muted: string;
  accent: string;
  accentInk: string;
}

export const THEMES: Theme[] = [
  {
    id: 'sunrise',
    name: 'Sunrise',
    price: 0,
    dark: false,
    bgFrom: '#fff3df',
    bgTo: '#ffdcea',
    blobs: ['#ff9a4d', '#ff6f9c', '#b58cff'],
    wallFrom: '#ffd9b8',
    wallTo: '#f7b98f',
    floorFrom: '#fffaf3',
    floorTo: '#fff1e2',
    gridDot: '#f0d5c0',
    crate: '#9c8878',
    surface: '#fffdfa',
    line: '#f3ddcb',
    text: '#3a2a22',
    muted: '#8a6f5f',
    accent: '#f4703a',
    accentInk: '#ffffff',
  },
  {
    id: 'midnight',
    name: 'Midnight Neon',
    price: 250,
    dark: true,
    bgFrom: '#161033',
    bgTo: '#2b1055',
    blobs: ['#6a3df0', '#1fd1c8', '#f25fa0'],
    wallFrom: '#4a3691',
    wallTo: '#2b1f5c',
    floorFrom: '#221a45',
    floorTo: '#1a1436',
    gridDot: '#3d3170',
    crate: '#5b5289',
    surface: '#241d47',
    line: '#3a3070',
    text: '#f0ecff',
    muted: '#a79ed4',
    accent: '#1fd1c8',
    accentInk: '#0f1030',
  },
  {
    id: 'candy',
    name: 'Candy Pop',
    price: 400,
    dark: false,
    bgFrom: '#f6e8ff',
    bgTo: '#dff1ff',
    blobs: ['#c46bff', '#4bc4ff', '#ff7ec0'],
    wallFrom: '#e6d3ff',
    wallTo: '#c9adf0',
    floorFrom: '#fdfaff',
    floorTo: '#f2ecff',
    gridDot: '#e0d0f2',
    crate: '#9a8fb0',
    surface: '#fffdff',
    line: '#e8dcf7',
    text: '#33234a',
    muted: '#7b6a94',
    accent: '#a34ff0',
    accentInk: '#ffffff',
  },
  {
    id: 'reef',
    name: 'Deep Reef',
    price: 400,
    dark: true,
    bgFrom: '#04283b',
    bgTo: '#07485a',
    blobs: ['#14b8a6', '#0ea5e9', '#22d3a6'],
    wallFrom: '#12798a',
    wallTo: '#0a4d5f',
    floorFrom: '#0a3d50',
    floorTo: '#062e3d',
    gridDot: '#14566b',
    crate: '#3f7183',
    surface: '#0b3c4e',
    line: '#14566b',
    text: '#e6fbff',
    muted: '#8fc4d4',
    accent: '#22d3a6',
    accentInk: '#04283b',
  },
];

/** Block hues never change with the theme; they are part of the rules. */
export const BLOCK_COLOURS: string[] = [
  '#E69F00',
  '#56B4E9',
  '#009E73',
  '#CC79A7',
  '#0072B2',
  '#D55E00',
];

/** One glyph per colour, drawn when the accessibility option is on. */
export const BLOCK_GLYPHS: string[] = ['●', '▲', '■', '◆', '★', '✚'];

export function themeById(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

function wrap(index: number, length: number): number {
  return ((index % length) + length) % length;
}

export function blockColour(index: number): string {
  return BLOCK_COLOURS[wrap(index, BLOCK_COLOURS.length)];
}

export function blockGlyph(index: number): string {
  return BLOCK_GLYPHS[wrap(index, BLOCK_GLYPHS.length)];
}

function channels(hex: string): [number, number, number] {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

function toHex(r: number, g: number, b: number): string {
  const clamp = (v: number): number => Math.max(0, Math.min(255, Math.round(v)));
  return `#${((clamp(r) << 16) | (clamp(g) << 8) | clamp(b)).toString(16).padStart(6, '0')}`;
}

/** Darkens a hex colour, for bevels and outlines. */
export function shade(hex: string, amount: number): string {
  const [r, g, b] = channels(hex);
  return toHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

/** Lightens a hex colour towards white, for gradient tops and gloss. */
export function tint(hex: string, amount: number): string {
  const [r, g, b] = channels(hex);
  return toHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
}

export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = channels(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
