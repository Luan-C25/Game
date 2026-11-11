/**
 * The level tiles on a chapter map, as SVG markup. The map art is scenery
 * only; the tiles, stars and pin are drawn here from the save, using the
 * same shapes as the design in design/maps/build-chapters.mjs.
 *
 * Pure string building, so it runs in tests without a DOM.
 */

import type { Chapter } from './chapters.ts';

/** The six tile colours, in the order the design cycles through them. */
const TILES = ['#E69F00', '#56B4E9', '#009E73', '#CC79A7', '#0072B2', '#D55E00'];

export type NodeState = 'done' | 'open' | 'now' | 'locked';

export interface NodeInfo {
  level: number;
  state: NodeState;
  /** 0 to 3; only drawn on a done tile. */
  stars: number;
}

const channels = (h: string): number[] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex = (v: number[]): string =>
  '#' + v.map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('');
const shade = (h: string, a: number): string => hex(channels(h).map((c) => c * (1 - a)));
const tint = (h: string, a: number): string => hex(channels(h).map((c) => c + (255 - c) * a));
const f = (n: number): number => Number(n.toFixed(1));

function star(cx: number, cy: number, r: number, fill: string, stroke: string): string {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.46 : r;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    d += (i ? 'L' : 'M') + f(cx + Math.cos(a) * rr) + ' ' + f(cy + Math.sin(a) * rr);
  }
  return `<path d="${d}Z" fill="${fill}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/>`;
}

/** Size of a tile's face in map units, for hit areas. */
export function tileSize(state: NodeState): number {
  return state === 'now' ? 56 : 46;
}

/** One level tile; `index` is its place in the chapter, which picks its colour. */
export function nodeSvg(chapter: Chapter, index: number, node: NodeInfo): string {
  const [x, y] = chapter.nodes[index];
  const { state, level } = node;
  const locked = state === 'locked';
  const c = locked ? chapter.locked[0] : TILES[index % TILES.length];
  const edge = locked ? chapter.locked[1] : shade(c, 0.45);
  const s = tileSize(state);
  const lift = state === 'now' ? 8 : 6;

  let o = `<ellipse cx="${f(x)}" cy="${f(y + s / 2 + lift)}" rx="${f(s * 0.52)}" ry="7" fill="#3a2a12" opacity="0.25"/>`;
  if (state === 'now') {
    o += `<rect x="${f(x - s / 2 - 6)}" y="${f(y - s / 2 - 6)}" width="${s + 12}" height="${s + 12 + lift}" rx="19" fill="#ffffff"/>`;
  }
  o += `<rect x="${f(x - s / 2)}" y="${f(y - s / 2 + lift)}" width="${s}" height="${s}" rx="14" fill="${edge}"/>`;
  o += `<rect x="${f(x - s / 2)}" y="${f(y - s / 2)}" width="${s}" height="${s}" rx="14" fill="${c}"/>`;
  o += `<rect x="${f(x - s / 2 + 3)}" y="${f(y - s / 2 + 3)}" width="${s - 6}" height="${s - 6}" rx="11" fill="none" stroke="${tint(c, locked ? 0.35 : 0.4)}" stroke-width="2"/>`;
  o += `<rect x="${f(x - s / 2 + 9)}" y="${f(y - s / 2 + 8)}" width="${f(s * 0.36)}" height="5" rx="2.5" fill="${tint(c, 0.55)}"/>`;

  const size = (state === 'now' ? 30 : 24) - (level > 99 ? 5 : 0);
  const ink = locked
    ? `fill="${shade(chapter.locked[1], 0.15)}"`
    : `fill="#ffffff" stroke="${shade(c, 0.6)}" stroke-width="4" paint-order="stroke" stroke-linejoin="round"`;
  o += `<text x="${f(x)}" y="${f(y + size * 0.37)}" text-anchor="middle" font-family="'Baloo 2', sans-serif" font-weight="800" font-size="${size}" ${ink}>${level}</text>`;

  if (state === 'done') {
    for (let k = 0; k < 3; k++) {
      const earned = k < node.stars;
      o += star(
        x - 15 + k * 15,
        y - s / 2 - 9 - (k === 1 ? 4 : 0),
        8,
        earned ? '#ffd23f' : '#fff6dc',
        earned ? '#a86f00' : '#b9a57c',
      );
    }
  }
  if (state === 'now') {
    o +=
      `<g class="pin"><path d="M${f(x)} ${f(y - s / 2 - 12)} l-11 -15 a13 13 0 1 1 22 0 Z" fill="#b3261e"/>` +
      `<path d="M${f(x)} ${f(y - s / 2 - 15)} l-11 -15 a13 13 0 1 1 22 0 Z" fill="#ff5a4d"/>` +
      `<circle cx="${f(x)}" cy="${f(y - s / 2 - 38)}" r="5.5" fill="#ffffff"/></g>`;
  }
  return o;
}

/**
 * Every tile on a chapter, drawn last to first so a tile further up the
 * road never covers the stars of the one below it.
 */
export function chapterNodesSvg(chapter: Chapter, nodes: NodeInfo[]): string {
  let out = '';
  for (let i = nodes.length - 1; i >= 0; i--) out += nodeSvg(chapter, i, nodes[i]);
  return out;
}
