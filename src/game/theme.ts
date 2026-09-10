/**
 * Materials.
 *
 * The game commits to one physical idea: glazed ceramic tiles set into a
 * slate tray, with the exits cut as metal-rimmed channels through the frame.
 * Everything here describes that material rather than a set of decorative
 * colours - which is why there are separate entries for a bevel, a recess and
 * a rim, and why nothing in a theme is a gradient.
 *
 * Tile colours never change with the theme. They come from the Okabe-Ito
 * palette, which stays distinguishable under the common forms of colour
 * blindness, and they carry the rules; a theme restyles the tray, the light
 * and the chrome around them.
 */

export interface Theme {
  id: string;
  name: string;
  price: number;
  dark: boolean;

  /** Page and canvas backdrop. Deliberately quiet: the board is the subject. */
  backdrop: string;
  backdropLift: string;

  /** Tray frame: face, outer edge, and the lit top bevel. */
  tray: string;
  trayEdge: string;
  trayLip: string;

  /** Grout between the cell wells, and the wells themselves. */
  grout: string;
  well: string;
  wellLip: string;

  /** Exit channel cut through the frame, and its metal rim. */
  channel: string;
  rim: string;

  crate: string;

  /* Chrome, pushed into CSS custom properties by the app shell. */
  surface: string;
  surfaceEdge: string;
  line: string;
  text: string;
  muted: string;
  accent: string;
  accentEdge: string;
  accentInk: string;
}

export const THEMES: Theme[] = [
  {
    id: 'slate',
    name: 'Slate',
    price: 0,
    dark: true,
    backdrop: '#20263a',
    backdropLift: '#2f3852',
    tray: '#515f73',
    trayEdge: '#2b3342',
    trayLip: '#71819a',
    grout: '#161a26',
    well: '#252c3b',
    wellLip: '#39435a',
    channel: '#12151f',
    rim: '#aab6c8',
    crate: '#77839a',
    surface: '#39435a',
    surfaceEdge: '#1e2432',
    line: '#4d5a72',
    text: '#eef2f7',
    muted: '#a3adbb',
    accent: '#e8a33d',
    accentEdge: '#a86f18',
    accentInk: '#2a2110',
  },
  {
    id: 'clay',
    name: 'Warm Clay',
    price: 250,
    dark: false,
    backdrop: '#ddcdba',
    backdropLift: '#efe4d5',
    tray: '#b98a68',
    trayEdge: '#8a604a',
    trayLip: '#d5ab8b',
    grout: '#8d6a53',
    well: '#e5d8c8',
    wellLip: '#f2e9dd',
    channel: '#7b5942',
    rim: '#e0c9a8',
    crate: '#a08d7a',
    surface: '#f7f1e8',
    surfaceEdge: '#c9b8a3',
    line: '#ddcdb9',
    text: '#3d2f24',
    muted: '#7d6a58',
    accent: '#d2683c',
    accentEdge: '#9c4526',
    accentInk: '#fff6ef',
  },
  {
    id: 'ink',
    name: 'Ink',
    price: 400,
    dark: true,
    backdrop: '#101219',
    backdropLift: '#1d212c',
    tray: '#343a49',
    trayEdge: '#15171f',
    trayLip: '#4e566a',
    grout: '#0f1116',
    well: '#1b1e26',
    wellLip: '#262a34',
    channel: '#0b0d11',
    rim: '#6f7a8c',
    crate: '#565e6c',
    surface: '#22262f',
    surfaceEdge: '#101218',
    line: '#343a46',
    text: '#e9edf4',
    muted: '#8f98a8',
    accent: '#4bb8a9',
    accentEdge: '#2b7d72',
    accentInk: '#0c1a18',
  },
  {
    id: 'porcelain',
    name: 'Porcelain',
    price: 400,
    dark: false,
    backdrop: '#cfd6df',
    backdropLift: '#e8edf2',
    tray: '#9fabba',
    trayEdge: '#74808f',
    trayLip: '#c4cedb',
    grout: '#8a94a1',
    well: '#eef1f5',
    wellLip: '#ffffff',
    channel: '#6f7885',
    rim: '#dbe1e8',
    crate: '#9aa4b0',
    surface: '#fbfcfe',
    surfaceEdge: '#b6bfca',
    line: '#d3dae2',
    text: '#2a3038',
    muted: '#6d7784',
    accent: '#3f7fd0',
    accentEdge: '#28558f',
    accentInk: '#ffffff',
  },
];

/** Tile glaze colours. Fixed across every theme: they carry the rules. */
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

/** Darkens a colour, for extruded sides and recessed edges. */
export function shade(hex: string, amount: number): string {
  const [r, g, b] = channels(hex);
  return toHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

/** Lightens a colour towards white, for lit bevels. */
export function tint(hex: string, amount: number): string {
  const [r, g, b] = channels(hex);
  return toHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
}

export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = channels(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
