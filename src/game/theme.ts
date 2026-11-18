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

  /**
   * The moulded floor plate. The grooves channelled between its pads are
   * derived from this in the renderer, so they stay in harmony with it.
   */
  floor: string;

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
    floor: '#252c3b',
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
  /*
   * Five brighter themes added in 1.0.1 (design/themes/ has the preview and
   * the contrast figures). A tile-matching floor can only clear 1.6:1 against
   * all six tiles if it is very light or very dark, so the colour lives in
   * the tray, backdrop and buttons instead.
   */
  // Lime tray, cream floor, lemon backdrop, mint Hint button.
  {
    id: 'citrus',
    name: 'Citrus',
    price: 150,
    dark: false,
    backdrop: '#ffe9a3',
    backdropLift: '#fff5cf',
    tray: '#b2df55',
    trayEdge: '#6f9f28',
    trayLip: '#d3f097',
    floor: '#fffbe8',
    channel: '#3c5a14',
    rim: '#eaf7c4',
    crate: '#b3ad96',
    surface: '#fffdf2',
    surfaceEdge: '#e0c877',
    line: '#f1e3b0',
    text: '#3a3210',
    muted: '#6e6130',
    accent: '#35d0a5',
    accentEdge: '#1b9474',
    accentInk: '#05301f',
  },
  // Hedge-green tray, daisy-white floor, spring-leaf backdrop, sunflower Hint button.
  {
    id: 'meadow',
    name: 'Meadow',
    price: 150,
    dark: false,
    backdrop: '#d3eab0',
    backdropLift: '#e8f5cf',
    tray: '#2f6a24',
    trayEdge: '#1b4514',
    trayLip: '#57994a',
    floor: '#f8fcea',
    channel: '#11300b',
    rim: '#cfe8b0',
    crate: '#a7ab98',
    surface: '#fcfff4',
    surfaceEdge: '#a5c97c',
    line: '#dcedc0',
    text: '#1f3314',
    muted: '#506540',
    accent: '#ffc83a',
    accentEdge: '#c9951a',
    accentInk: '#3b2a00',
  },
  {
    id: 'clay',
    name: 'Warm Clay',
    // Was 250; a tester said it "took me ages just to unlock".
    price: 225,
    dark: false,
    backdrop: '#ddcdba',
    backdropLift: '#efe4d5',
    tray: '#b98a68',
    trayEdge: '#8a604a',
    trayLip: '#d5ab8b',
    floor: '#e5d8c8',
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
  // Grape tray on a bubblegum-pink backdrop, hot-pink Hint button. The tray
  // is grape, not pink, so it never sits on top of the pink tile.
  {
    id: 'bubblegum',
    name: 'Bubblegum',
    price: 225,
    dark: false,
    backdrop: '#ffcfe0',
    backdropLift: '#ffe6ee',
    tray: '#6a45c2',
    trayEdge: '#432a85',
    trayLip: '#9273e0',
    floor: '#fff3f7',
    channel: '#24134f',
    rim: '#e6dcff',
    crate: '#b9a9b8',
    surface: '#fffafc',
    surfaceEdge: '#eba6c0',
    line: '#ffdbe7',
    text: '#45193a',
    muted: '#7d4a69',
    accent: '#ff5fa2',
    accentEdge: '#c9306f',
    accentInk: '#4a0826',
  },
  // Shell-white tray around a deep-sea floor, sky backdrop, coral Hint
  // button. A light theme with a dark floor.
  {
    id: 'seaside',
    name: 'Seaside',
    price: 225,
    dark: false,
    backdrop: '#93d3ec',
    backdropLift: '#c2e8f6',
    tray: '#fbecc8',
    trayEdge: '#c9a868',
    trayLip: '#fff8e3',
    floor: '#12304d',
    channel: '#0a1c2e',
    rim: '#fff6dc',
    crate: '#6f8296',
    surface: '#fbfeff',
    surfaceEdge: '#5fa9c6',
    line: '#cfeaf4',
    text: '#12304d',
    muted: '#2f5068',
    accent: '#ff7059',
    accentEdge: '#c9442f',
    accentInk: '#4a0f06',
  },
  // The cosy dark one: warm plum tray and backdrop, amber Hint button.
  {
    id: 'lantern',
    name: 'Lantern',
    price: 300,
    dark: true,
    backdrop: '#241829',
    backdropLift: '#35233a',
    tray: '#71468a',
    trayEdge: '#3d2350',
    trayLip: '#9a6fb5',
    floor: '#1b111e',
    channel: '#0d070f',
    rim: '#e3b877',
    crate: '#7d6a7c',
    surface: '#3f2b42',
    surfaceEdge: '#1c121f',
    line: '#573d59',
    text: '#fbeedd',
    muted: '#c2a8b8',
    accent: '#ffb14a',
    accentEdge: '#c57a1c',
    accentInk: '#33200a',
  },
  {
    id: 'ink',
    name: 'Ink',
    price: 600,
    dark: true,
    backdrop: '#101219',
    backdropLift: '#1d212c',
    tray: '#343a49',
    trayEdge: '#15171f',
    trayLip: '#4e566a',
    floor: '#1b1e26',
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
    price: 600,
    dark: false,
    backdrop: '#cfd6df',
    backdropLift: '#e8edf2',
    tray: '#9fabba',
    trayEdge: '#74808f',
    trayLip: '#c4cedb',
    floor: '#eef1f5',
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
  // Deep charcoal tray with a near-black floor, warm amber light and a copper rim.
  {
    id: 'ember',
    name: 'Ember',
    price: 225,
    dark: true,
    backdrop: '#1d1815',
    backdropLift: '#2c231e',
    tray: '#46403b',
    trayEdge: '#201c19',
    trayLip: '#6a5f56',
    floor: '#171311',
    channel: '#0b0908',
    rim: '#d79a52',
    crate: '#7a6c5f',
    surface: '#3a322d',
    surfaceEdge: '#1c1714',
    line: '#524740',
    text: '#f8ecdb',
    muted: '#b9a690',
    accent: '#f0a238',
    accentEdge: '#b06d12',
    accentInk: '#2b1b05',
  },
  // Muted green-grey tray around a pale daylight floor, soft sage backdrop.
  {
    id: 'sage',
    name: 'Sage',
    price: 225,
    dark: false,
    backdrop: '#dde4d3',
    backdropLift: '#eef2e7',
    tray: '#7d907c',
    trayEdge: '#566656',
    trayLip: '#a3b5a1',
    floor: '#f3f5ee',
    channel: '#43533f',
    rim: '#dbe5d3',
    crate: '#a5ab9a',
    surface: '#f9fbf5',
    surfaceEdge: '#b3c0a7',
    line: '#d3dcc7',
    text: '#27331f',
    muted: '#5c6a50',
    accent: '#c7794a',
    accentEdge: '#8f4f2a',
    accentInk: '#fff4ea',
  },
  // Navy tray under cool moonlight, with the kiln's warm glow in the buttons and rim.
  {
    id: 'midnight-kiln',
    name: 'Midnight kiln',
    price: 300,
    dark: true,
    backdrop: '#0e1626',
    backdropLift: '#19243a',
    tray: '#2b4066',
    trayEdge: '#141f36',
    trayLip: '#4a6592',
    floor: '#0a101d',
    channel: '#050911',
    rim: '#e0a36a',
    crate: '#5d6e8c',
    surface: '#1f2d48',
    surfaceEdge: '#0e1626',
    line: '#334766',
    text: '#e8eefb',
    muted: '#9aabc9',
    accent: '#ff9b4d',
    accentEdge: '#c25f1b',
    accentInk: '#2d1604',
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

/**
 * One shape per colour, drawn on blocks and their gates when the
 * accessibility option is on. They are drawn as paths, not text characters,
 * because symbol glyphs differ by phone maker and Android version.
 */
export type GlyphShape = 'circle' | 'triangle' | 'square' | 'diamond' | 'star' | 'cross';
export const BLOCK_GLYPHS: GlyphShape[] = ['circle', 'triangle', 'square', 'diamond', 'star', 'cross'];

export function themeById(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

function wrap(index: number, length: number): number {
  return ((index % length) + length) % length;
}

export function blockColour(index: number): string {
  return BLOCK_COLOURS[wrap(index, BLOCK_COLOURS.length)];
}

export function blockGlyph(index: number): GlyphShape {
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
