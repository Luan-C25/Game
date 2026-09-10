/**
 * Colours and themes.
 *
 * Block colours come from the Okabe-Ito palette, which stays distinguishable
 * under the common forms of colour blindness. Themes restyle the board and
 * chrome only - they never change block colours, because those carry the
 * rules. Turning on glyphs adds a shape to every block and gate so colour is
 * never the only way to read the board.
 */

export interface Theme {
  id: string;
  name: string;
  price: number;
  background: string;
  boardWall: string;
  boardFloor: string;
  gridLine: string;
  crate: string;
  text: string;
}

export const BLOCK_COLOURS: string[] = [
  '#E69F00',
  '#56B4E9',
  '#009E73',
  '#CC79A7',
  '#0072B2',
  '#D55E00',
];

/** One glyph per colour index, drawn when the accessibility option is on. */
export const BLOCK_GLYPHS: string[] = ['●', '▲', '■', '◆', '★', '✚'];

export const THEMES: Theme[] = [
  {
    id: 'daylight',
    name: 'Daylight',
    price: 0,
    background: '#f4f1ea',
    boardWall: '#d8d2c4',
    boardFloor: '#fffdf8',
    gridLine: '#e8e3d7',
    crate: '#8a8377',
    text: '#2b2924',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    price: 300,
    background: '#14161c',
    boardWall: '#272b36',
    boardFloor: '#1c1f27',
    gridLine: '#2f3442',
    crate: '#5b6274',
    text: '#e8eaf0',
  },
  {
    id: 'orchard',
    name: 'Orchard',
    price: 600,
    background: '#eef4ec',
    boardWall: '#cbdcc6',
    boardFloor: '#f8fcf7',
    gridLine: '#dcebd8',
    crate: '#7d8f79',
    text: '#22301f',
  },
];

export function themeById(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

export function blockColour(index: number): string {
  return BLOCK_COLOURS[((index % BLOCK_COLOURS.length) + BLOCK_COLOURS.length) % BLOCK_COLOURS.length];
}

export function blockGlyph(index: number): string {
  return BLOCK_GLYPHS[((index % BLOCK_GLYPHS.length) + BLOCK_GLYPHS.length) % BLOCK_GLYPHS.length];
}

/** Darkens a hex colour for bevels and outlines. */
export function shade(hex: string, amount: number): string {
  const value = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, Math.round(((value >> 16) & 0xff) * (1 - amount))));
  const g = Math.max(0, Math.min(255, Math.round(((value >> 8) & 0xff) * (1 - amount))));
  const b = Math.max(0, Math.min(255, Math.round((value & 0xff) * (1 - amount))));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
