/**
 * Tray rims and win effects.
 *
 * Kept out of render.ts on purpose so the board drawing there stays easy to
 * merge. render.ts calls three entry points:
 *
 *  - drawRimStatic: the groove and the band itself, painted once into the
 *    cached static layer (every rim, animated or not).
 *  - drawRimLive: only what moves on Neon kiln and Lava (the travelling
 *    colour, the pulsing crack), drawn each frame over the cached layer.
 *  - drawWinEffect: a one-off effect over the tray when a level is won.
 *
 * A rim is a band set into the outer edge of the tray: a dark groove cut
 * round it, a shaded underside, the body, and a thin lit line. Depth comes
 * from those stacked shapes, not from a gradient. The only colour ramps are
 * the Neon kiln hue cycle, which is the effect itself.
 *
 * Nothing here is random per frame: every pattern comes from a seeded
 * generator, so a rim looks the same on every phone and every launch.
 */

import type { Level } from '../engine/types.ts';
import type { RimId, WinEffectId } from './cosmetics.ts';
import type { Viewport } from './render.ts';
import { shade, tint, withAlpha, type Theme } from './theme.ts';

const TAU = Math.PI * 2;

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/** mulberry32: the same sequence for the same seed, everywhere. */
function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* --------------------------------------------------------------- geometry */

interface RimGeo {
  /** The tray's outer rectangle and corner radius, as drawn by drawTray. */
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
  /** Band thickness, and the centreline's inset from the outer edge. */
  band: number;
  inset: number;
  key: string;
}

function rimGeo(level: Level, vp: Viewport): RimGeo {
  const { cell, wall, originX, originY } = vp;
  const x = originX - wall;
  const y = originY - wall;
  const w = level.width * cell + wall * 2;
  const h = level.height * cell + wall * 2;
  const r = Math.round(wall * 0.72);
  const band = Math.max(5, Math.round(wall * 0.3));
  const inset = Math.max(1.5, wall * 0.05) + band / 2;
  return { x, y, w, h, r, band, inset, key: [x, y, w, h, r, band, inset].join('|') };
}

function rrPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const c = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.moveTo(x + c, y);
  ctx.lineTo(x + w - c, y);
  ctx.arcTo(x + w, y, x + w, y + c, c);
  ctx.lineTo(x + w, y + h - c);
  ctx.arcTo(x + w, y + h, x + w - c, y + h, c);
  ctx.lineTo(x + c, y + h);
  ctx.arcTo(x, y + h, x, y + h - c, c);
  ctx.lineTo(x, y + c);
  ctx.arcTo(x, y, x + c, y, c);
  ctx.closePath();
}

/** Strokes the band's centreline, moved by (dx, dy) and `extra` further in. */
function strokeBand(
  ctx: CanvasRenderingContext2D,
  g: RimGeo,
  width: number,
  colour: string,
  dx = 0,
  dy = 0,
  extra = 0,
): void {
  const i = g.inset + extra;
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.beginPath();
  rrPath(ctx, g.x + i + dx, g.y + i + dy, g.w - i * 2, g.h - i * 2, Math.max(1.5, g.r - i));
  ctx.stroke();
}

/** The band as a filled ring (outer edge minus inner edge). */
function bandRingPath(ctx: CanvasRenderingContext2D, g: RimGeo): void {
  const o = g.inset - g.band / 2;
  const n = g.inset + g.band / 2;
  ctx.beginPath();
  rrPath(ctx, g.x + o, g.y + o, g.w - o * 2, g.h - o * 2, Math.max(1.5, g.r - o));
  rrPath(ctx, g.x + n, g.y + n, g.w - n * 2, g.h - n * 2, Math.max(1.5, g.r - n));
}

interface Perimeter {
  key: string;
  /** Evenly spaced centreline points and their outward-facing unit normals. */
  px: number[];
  py: number[];
  nx: number[];
  ny: number[];
  /** Fraction of the way round (0 to 1) for each point. */
  u: number[];
  length: number;
}

let perimeterCache: Perimeter | null = null;

/** Walks the band's centreline once and caches the points. */
function perimeterFor(g: RimGeo, count: number): Perimeter {
  const key = `${g.key}|${count}`;
  if (perimeterCache && perimeterCache.key === key) return perimeterCache;

  const i = g.inset;
  const x0 = g.x + i;
  const y0 = g.y + i;
  const w = g.w - i * 2;
  const h = g.h - i * 2;
  const rr = Math.max(1.5, Math.min(g.r - i, Math.min(w, h) / 2));
  const top = w - rr * 2;
  const side = h - rr * 2;
  const arc = (Math.PI / 2) * rr;
  const total = top * 2 + side * 2 + arc * 4;

  const px: number[] = [];
  const py: number[] = [];
  const nx: number[] = [];
  const ny: number[] = [];
  const us: number[] = [];

  const at = (s: number): void => {
    let d = s;
    let x = 0;
    let y = 0;
    let ux = 0;
    let uy = 0;
    const corner = (cx: number, cy: number, from: number): void => {
      const a = from + d / rr;
      ux = Math.cos(a);
      uy = Math.sin(a);
      x = cx + ux * rr;
      y = cy + uy * rr;
    };
    if (d < top) {
      x = x0 + rr + d;
      y = y0;
      ux = 0;
      uy = -1;
    } else if ((d -= top) < arc) {
      corner(x0 + w - rr, y0 + rr, -Math.PI / 2);
    } else if ((d -= arc) < side) {
      x = x0 + w;
      y = y0 + rr + d;
      ux = 1;
      uy = 0;
    } else if ((d -= side) < arc) {
      corner(x0 + w - rr, y0 + h - rr, 0);
    } else if ((d -= arc) < top) {
      x = x0 + w - rr - d;
      y = y0 + h;
      ux = 0;
      uy = 1;
    } else if ((d -= top) < arc) {
      corner(x0 + rr, y0 + h - rr, Math.PI / 2);
    } else if ((d -= arc) < side) {
      x = x0;
      y = y0 + h - rr - d;
      ux = -1;
      uy = 0;
    } else {
      d -= side;
      corner(x0 + rr, y0 + rr, Math.PI);
    }
    px.push(x);
    py.push(y);
    nx.push(ux);
    ny.push(uy);
    us.push(s / total);
  };

  // Straights get roughly `count` points between them; every corner gets its
  // own handful so a rounded corner never collapses into a chamfer.
  const spacing = total / count;
  const pieces = [top, arc, side, arc, top, arc, side, arc];
  let start = 0;
  for (const len of pieces) {
    const isArc = len === arc;
    const steps = isArc ? 6 : Math.max(1, Math.round(len / spacing));
    for (let k = 0; k < steps; k++) at(Math.min(total * 0.99999, start + (k / steps) * len));
    start += len;
  }
  perimeterCache = { key, px, py, nx, ny, u: us, length: total };
  return perimeterCache;
}

/* ------------------------------------------------------------- raku tile */

let rakuTileCanvas: HTMLCanvasElement | null = null;

/**
 * A seamless tile of fine gold crackle, drawn once and reused as a pattern.
 * Each line is drawn nine times, shifted by a tile width, so lines that run
 * off one edge arrive on the other and the repeat shows no seam.
 */
function rakuTile(): HTMLCanvasElement {
  if (rakuTileCanvas) return rakuTileCanvas;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const c = canvas.getContext('2d');
  if (!c) throw new Error('canvas 2d context unavailable');

  const rng = seededRng(0x7a4b0);
  const lines: { x: number; y: number }[][] = [];
  const walk = (x: number, y: number, heading: number, steps: number): void => {
    const pts = [{ x, y }];
    for (let s = 0; s < steps; s++) {
      heading += (rng() - 0.5) * 1.5;
      const len = 12 + rng() * 22;
      x += Math.cos(heading) * len;
      y += Math.sin(heading) * len;
      pts.push({ x, y });
      if (rng() < 0.28 && steps > 3) walk(x, y, heading + (rng() < 0.5 ? 1 : -1) * (0.7 + rng() * 0.6), steps - 3);
    }
    lines.push(pts);
  };
  for (let n = 0; n < 7; n++) walk(rng() * size, rng() * size, rng() * TAU, 5 + Math.floor(rng() * 5));

  c.lineCap = 'round';
  c.lineJoin = 'round';
  const pass = (width: number, colour: string): void => {
    c.lineWidth = width;
    c.strokeStyle = colour;
    for (const ox of [-size, 0, size]) {
      for (const oy of [-size, 0, size]) {
        for (const pts of lines) {
          c.beginPath();
          c.moveTo(pts[0].x + ox, pts[0].y + oy);
          for (let k = 1; k < pts.length; k++) c.lineTo(pts[k].x + ox, pts[k].y + oy);
          c.stroke();
        }
      }
    }
  };
  pass(1.3, 'rgba(190, 146, 52, 0.7)');
  pass(0.5, 'rgba(240, 214, 140, 0.8)');
  rakuTileCanvas = canvas;
  return canvas;
}

/* ---------------------------------------------------------- lava cracks */

interface Cracks {
  key: string;
  /** Flat x, y, x, y... lists, one per unbroken stretch of crack. */
  paths: number[][];
}

let cracksCache: Cracks | null = null;

function cracksFor(g: RimGeo): Cracks {
  const key = g.key;
  if (cracksCache && cracksCache.key === key) return cracksCache;
  const per = perimeterFor(g, 160);
  const rng = seededRng(0x1a7a);
  const paths: number[][] = [];
  const count = per.px.length;
  let k = 0;
  while (k < count) {
    // A stretch of crack, then a gap of solid basalt.
    const run = 6 + Math.floor(rng() * 12);
    const path: number[] = [];
    for (let j = 0; j < run && k < count; j++, k++) {
      const off = (rng() - 0.5) * g.band * 0.55;
      path.push(per.px[k] + per.nx[k] * off, per.py[k] + per.ny[k] * off);
    }
    if (path.length >= 6) paths.push(path);
    k += 4 + Math.floor(rng() * 10);
  }
  cracksCache = { key, paths };
  return cracksCache;
}

/* ------------------------------------------------------------ rim: static */

/** Paints the groove and the band body. Called while the static layer is built. */
export function drawRimStatic(
  ctx: CanvasRenderingContext2D,
  level: Level,
  vp: Viewport,
  theme: Theme,
  rim: RimId,
): void {
  if (rim === '') return;
  const g = rimGeo(level, vp);

  // The groove the band sits in, cut into the tray face.
  strokeBand(ctx, g, g.band + 3, shade(theme.trayEdge, 0.4));

  let under: string;
  let body: string;
  let lit: string;
  if (rim === 'neon-kiln') {
    under = '#06070b';
    body = '#161a25';
    lit = '#2d3446';
  } else if (rim === 'lava') {
    under = '#12100f';
    body = '#2a2725';
    lit = '#5b534e';
  } else if (rim === 'raku') {
    under = '#050505';
    body = '#161515';
    lit = '#34312f';
  } else {
    under = '#7f9889';
    body = '#b7ccbc';
    lit = '#e6f1e8';
  }

  // Shaded underside, then the body, then a thin lit line along its crown.
  strokeBand(ctx, g, g.band, under, 0, 1.2);
  strokeBand(ctx, g, g.band - 1.2, body);
  strokeBand(ctx, g, Math.max(1, g.band * 0.2), withAlpha(lit, rim === 'celadon' ? 0.85 : 0.7), 0, -g.band * 0.2);

  if (rim === 'celadon') {
    // A soft, broader sheen where the glaze pooled.
    strokeBand(ctx, g, Math.max(1.5, g.band * 0.42), withAlpha(tint(body, 0.7), 0.35), 0, -g.band * 0.14);
  }

  if (rim === 'raku') {
    ctx.save();
    bandRingPath(ctx, g);
    ctx.clip('evenodd');
    const pattern = ctx.createPattern(rakuTile(), 'repeat');
    if (pattern) {
      // The tile is 256 device pixels drawn at 128 CSS pixels, so the fine
      // lines stay sharp on a 2x screen.
      if (typeof pattern.setTransform === 'function' && typeof DOMMatrix === 'function') {
        pattern.setTransform(new DOMMatrix().translate(g.x, g.y).scale(0.5));
      }
      ctx.fillStyle = pattern;
      ctx.fillRect(g.x, g.y, g.w, g.h);
    }
    ctx.restore();
  }
}

/* -------------------------------------------------------------- rim: live */

const NEON_LAP_SECONDS = 6;
const LAVA_PULSE_SECONDS = 3.4;
const NEON_SEGMENTS = 64;

/**
 * The moving parts of an animated rim. With reduce motion on, `time` is
 * ignored: Neon holds one fixed hue mix and Lava a steady glow.
 */
export function drawRimLive(
  ctx: CanvasRenderingContext2D,
  level: Level,
  vp: Viewport,
  rim: RimId,
  time: number,
  reduceMotion: boolean,
): void {
  if (rim !== 'neon-kiln' && rim !== 'lava') return;
  const g = rimGeo(level, vp);

  // Leave a clean break where a gate is cut through the frame: clip out each
  // gate's span (matching how drawGates places it) plus a hair of margin.
  ctx.save();
  ctx.beginPath();
  ctx.rect(g.x - 4, g.y - 4, g.w + 8, g.h + 8);
  const { cell, wall, originX, originY } = vp;
  const inset = Math.max(2, cell * 0.05) - 1.5;
  for (const gate of level.gates) {
    const a = gate.start * cell + inset;
    const len = gate.length * cell - inset * 2;
    if (gate.side === 'top') ctx.rect(originX + a, originY - wall - 2, len, wall + 2);
    else if (gate.side === 'bottom') ctx.rect(originX + a, originY + level.height * cell - 1, len, wall + 2);
    else if (gate.side === 'left') ctx.rect(originX - wall - 2, originY + a, wall + 2, len);
    else ctx.rect(originX + level.width * cell - 1, originY + a, wall + 2, len);
  }
  ctx.clip('evenodd');

  if (rim === 'neon-kiln') {
    const per = perimeterFor(g, NEON_SEGMENTS);
    const lap = reduceMotion ? 0 : time / NEON_LAP_SECONDS;
    ctx.lineCap = 'round';
    const n = per.px.length;
    // A soft halo first, then the tube on top of it.
    for (const [width, alpha] of [
      [g.band * 0.95, 0.22],
      [Math.max(2.5, g.band * 0.6), 1],
    ] as const) {
      ctx.lineWidth = width;
      ctx.globalAlpha = alpha;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        const hue = Math.round((((per.u[i] - lap) % 1) + 1) % 1 * 360);
        ctx.strokeStyle = `hsl(${hue}, 95%, 62%)`;
        ctx.beginPath();
        ctx.moveTo(per.px[i], per.py[i]);
        ctx.lineTo(per.px[j], per.py[j]);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    ctx.lineCap = 'butt';
    ctx.restore();
    return;
  }

  const pulse = reduceMotion ? 0.6 : 0.5 + 0.5 * Math.sin((time / LAVA_PULSE_SECONDS) * TAU);
  const { paths } = cracksFor(g);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const trace = (path: number[]): void => {
    ctx.beginPath();
    ctx.moveTo(path[0], path[1]);
    for (let k = 2; k < path.length; k += 2) ctx.lineTo(path[k], path[k + 1]);
    ctx.stroke();
  };
  ctx.lineWidth = g.band * 0.8;
  ctx.strokeStyle = `rgba(255, 106, 26, ${(0.14 + 0.2 * pulse).toFixed(3)})`;
  for (const p of paths) trace(p);
  ctx.lineWidth = Math.max(1.2, g.band * 0.24);
  ctx.strokeStyle = pulse > 0.5 ? '#ffb347' : '#ff7a1f';
  ctx.globalAlpha = 0.65 + 0.35 * pulse;
  for (const p of paths) trace(p);
  ctx.globalAlpha = 1;
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';
  ctx.restore();
}

/* ------------------------------------------------------------ win effects */

export interface WinFx {
  id: WinEffectId;
  /** Seconds since the level was won. */
  t: number;
  /** Reduce motion: a plain short fade in place of the effect. */
  reduced: boolean;
}

const WIN_SECONDS: Record<string, number> = { 'kiln-flash': 1.2, 'gold-drip': 1.7 };
const WIN_REDUCED_SECONDS = 0.4;

/** How long an effect runs, so the caller knows when to stop asking for frames. */
export function winEffectSeconds(id: WinEffectId, reduced: boolean): number {
  if (id === '') return 0;
  return reduced ? WIN_REDUCED_SECONDS : (WIN_SECONDS[id] ?? 0);
}

export function drawWinEffect(ctx: CanvasRenderingContext2D, level: Level, vp: Viewport, fx: WinFx): void {
  if (fx.id === '') return;
  const g = rimGeo(level, vp);
  const done = winEffectSeconds(fx.id, fx.reduced);
  if (fx.t >= done) return;

  ctx.save();
  ctx.beginPath();
  rrPath(ctx, g.x, g.y, g.w, g.h, g.r);
  ctx.clip();

  if (fx.reduced) {
    ctx.globalAlpha = 0.3 * (1 - fx.t / WIN_REDUCED_SECONDS);
    ctx.fillStyle = fx.id === 'kiln-flash' ? '#fff1d6' : '#e0b23a';
    ctx.fillRect(g.x, g.y, g.w, g.h);
    ctx.restore();
    return;
  }

  if (fx.id === 'kiln-flash') {
    // The door swings open: a quick rise to warm white, then a slow cool-down.
    const rise = clamp01(fx.t / 0.16);
    const fall = clamp01((fx.t - 0.16) / (done - 0.16));
    const a = rise * (1 - fall * fall);
    ctx.globalAlpha = 0.82 * a;
    ctx.fillStyle = '#fff1d6';
    ctx.fillRect(g.x, g.y, g.w, g.h);
    ctx.restore();
    return;
  }

  // Gold drip.
  const fade = 1 - clamp01((fx.t - 1.2) / 0.5);
  ctx.globalAlpha = fade;
  const gold = '#dba52c';
  const goldUnder = '#8f6a14';
  const goldGlint = '#f8e19a';

  // The pooled glaze along the top edge arrives first.
  const pool = g.r * 0.5 + (vp.wall * 0.5) * clamp01(fx.t / 0.35);
  ctx.fillStyle = goldUnder;
  ctx.fillRect(g.x, g.y, g.w, pool + 2);
  ctx.fillStyle = gold;
  ctx.fillRect(g.x, g.y, g.w, pool);
  ctx.fillStyle = goldGlint;
  ctx.fillRect(g.x, g.y + 1.5, g.w, Math.max(1.5, vp.wall * 0.08));

  const rng = seededRng(0x601d);
  const count = Math.max(4, Math.min(9, Math.round(g.w / (vp.cell * 0.95))));
  for (let i = 0; i < count; i++) {
    const width = vp.cell * (0.13 + rng() * 0.1);
    const x = g.x + g.w * ((i + 0.5 + (rng() - 0.5) * 0.5) / count);
    const reach = g.h * (0.22 + rng() * 0.5);
    const delay = 0.05 + rng() * 0.3;
    const p = clamp01((fx.t - delay) / 0.95);
    // A drip gathers slowly and then runs.
    const y = pool + (reach - pool) * Math.pow(p, 1.7);
    if (y <= pool) continue;
    ctx.fillStyle = goldUnder;
    ctx.fillRect(x - width / 2 + 1.2, g.y, width, y);
    ctx.beginPath();
    ctx.arc(x + 1.2, g.y + y, width * 0.72, 0, TAU);
    ctx.fill();
    ctx.fillStyle = gold;
    ctx.fillRect(x - width / 2, g.y, width, y);
    ctx.beginPath();
    ctx.arc(x, g.y + y, width * 0.72, 0, TAU);
    ctx.fill();
    ctx.fillStyle = goldGlint;
    ctx.fillRect(x - width * 0.3, g.y + pool, Math.max(1, width * 0.16), Math.max(0, y - pool - width * 0.2));
  }
  ctx.restore();
}
