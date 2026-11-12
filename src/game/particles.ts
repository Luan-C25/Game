/**
 * A small particle system for the moments worth celebrating: a block leaving
 * the board, and a level being finished. Deliberately tiny - a fixed pool, no
 * allocation per frame once warm, and it goes completely quiet when the
 * "reduce motion" setting is on.
 */

import { DEFAULT_EFFECT, type EffectId } from './cosmetics.ts';
import { shade, tint } from './theme.ts';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  colour: string;
  spin: number;
  angle: number;
  /** Confetti draws as a rotating rectangle; sparks draw as circles. */
  confetti: boolean;
}

const TAU = Math.PI * 2;
const GRAVITY = 900;
const MAX_PARTICLES = 260;

/* ------------------------------------------------------------ exit effects */

const EFFECT_MS: Record<EffectId, number> = { 'kiln-puff': 440, petals: 480, 'glaze-splash': 420 };
const MAX_EXIT_EFFECTS = 12;

function easeOut(p: number): number {
  return 1 - Math.pow(1 - p, 3);
}
function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/** mulberry32, so an exit looks the same every time for the same block. */
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

/** Kiln puffs: fixed offsets, facing right; rotated to the gate's outward angle. */
const KILN_PUFFS = [
  { delay: 0, r0: 3, r1: 14, dx: 16, dy: -10 },
  { delay: 60, r0: 2, r1: 11, dx: 28, dy: -22 },
  { delay: 110, r0: 2, r1: 8, dx: 10, dy: -30 },
];

interface Petal {
  delay: number;
  angle: number;
  dist: number;
  rot0: number;
  spin: number;
}
interface Drop {
  angle: number;
  speed: number;
  r0: number;
}

interface ExitFx {
  kind: EffectId;
  /** Milliseconds since the block crossed the gate line. */
  t: number;
  x: number;
  y: number;
  /** Gate outward angle in radians (0 = the gate faces right). */
  rot: number;
  k: number;
  colour: string;
  under: string;
  face: string;
  glint: string;
  petals: Petal[];
  drops: Drop[];
}

function buildPetals(seed: number, rotDeg: number): Petal[] {
  const r = seededRng(seed);
  const list: Petal[] = [];
  for (let i = 0; i < 9; i++) {
    const jitter = (r() - 0.5) * 16;
    const dist = 26 + r() * 12;
    const spin = (r() - 0.5) * 160;
    const rot0 = r() * 180;
    list.push({ delay: i * 8, angle: -70 + (i / 8) * 140 + jitter + rotDeg, dist, rot0, spin });
  }
  return list;
}

function buildDrops(seed: number, rotDeg: number): Drop[] {
  const r = seededRng(seed);
  const list: Drop[] = [];
  for (let i = 0; i < 8; i++) {
    const jitter = (r() - 0.5) * 12;
    list.push({
      angle: -165 + (i / 7) * 150 + jitter + rotDeg,
      speed: 30 + r() * 12,
      r0: i % 3 === 0 ? 4.6 : 3.2,
    });
  }
  return list;
}

export class Particles {
  private items: Particle[] = [];
  private exits: ExitFx[] = [];

  get count(): number {
    return this.items.length + this.exits.length;
  }

  clear(): void {
    this.items.length = 0;
    this.exits.length = 0;
  }

  /**
   * Starts a calm exit effect at the gate mouth (canvas pixels). `dir` is the
   * gate's outward direction (default: facing right), `seed` is the block id,
   * and `cell` is the board cell size in px (the designs assume 56).
   */
  exitEffect(
    x: number,
    y: number,
    colour: string,
    effect: EffectId = DEFAULT_EFFECT,
    dir?: { x: number; y: number },
    seed = 0,
    cell = 56,
  ): void {
    if (this.exits.length >= MAX_EXIT_EFFECTS) return;
    const rot = dir && (dir.x !== 0 || dir.y !== 0) ? Math.atan2(dir.y, dir.x) : 0;
    const rotDeg = (rot * 180) / Math.PI;
    this.exits.push({
      kind: effect,
      t: 0,
      x,
      y,
      rot,
      k: cell / 56,
      colour,
      under: shade(colour, effect === 'glaze-splash' ? 0.4 : 0.35),
      face: tint(colour, 0.12),
      glint: tint(colour, effect === 'glaze-splash' ? 0.65 : 0.6),
      petals: effect === 'petals' ? buildPetals(seed, rotDeg) : [],
      drops: effect === 'glaze-splash' ? buildDrops(seed, rotDeg) : [],
    });
  }

  /**
   * Kept for existing callers: the block-exit burst. It now starts a calm
   * exit effect (default kiln puff) instead of scattering random sparks.
   */
  burst(
    x: number,
    y: number,
    colour: string,
    dirX: number,
    dirY: number,
    effect: EffectId = DEFAULT_EFFECT,
    seed = 0,
    cell = 56,
  ): void {
    this.exitEffect(x, y, colour, effect, { x: dirX, y: dirY }, seed, cell);
  }

  /** Confetti rained across the top of the screen on a win. */
  celebrate(width: number, colours: string[]): void {
    const count = Math.min(90, MAX_PARTICLES - this.items.length);
    for (let i = 0; i < count; i++) {
      this.items.push({
        x: Math.random() * width,
        y: -20 - Math.random() * 220,
        vx: (Math.random() - 0.5) * 130,
        vy: 120 + Math.random() * 220,
        life: 0,
        maxLife: 1.7 + Math.random() * 1.1,
        size: 5 + Math.random() * 6,
        colour: colours[i % colours.length],
        spin: (Math.random() - 0.5) * 12,
        angle: Math.random() * Math.PI,
        confetti: true,
      });
    }
  }

  update(dt: number): void {
    for (let i = this.exits.length - 1; i >= 0; i--) {
      const fx = this.exits[i];
      fx.t += dt * 1000;
      if (fx.t >= EFFECT_MS[fx.kind]) this.exits.splice(i, 1);
    }
    for (let i = this.items.length - 1; i >= 0; i--) {
      const p = this.items[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        // Swap-and-pop: order does not matter and this avoids a reshuffle.
        this.items[i] = this.items[this.items.length - 1];
        this.items.pop();
        continue;
      }
      p.vy += GRAVITY * dt * (p.confetti ? 0.28 : 1);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.angle += p.spin * dt;
      if (!p.confetti) {
        p.vx *= 1 - 2.4 * dt;
        p.vy *= 1 - 2.4 * dt;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.items) {
      const fade = 1 - p.life / p.maxLife;
      ctx.globalAlpha = Math.max(0, Math.min(1, fade));
      ctx.fillStyle = p.colour;

      if (p.confetti) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * fade, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    for (const fx of this.exits) this.drawExit(ctx, fx);
  }

  private drawExit(ctx: CanvasRenderingContext2D, fx: ExitFx): void {
    const { t, k } = fx;
    const cosR = Math.cos(fx.rot);
    const sinR = Math.sin(fx.rot);
    if (fx.kind === 'kiln-puff') {
      const D = 440;
      for (const p of KILN_PUFFS) {
        if (t < p.delay) continue;
        const lp = clamp01((t - p.delay) / (D - p.delay));
        const e = easeOut(lp);
        const a = 0.92 * (1 - Math.pow(clamp01((lp - 0.5) / 0.5), 2));
        if (a <= 0.01) continue;
        const ox = p.dx * e * k;
        const oy = p.dy * e * k;
        const px = fx.x + ox * cosR - oy * sinR;
        const py = fx.y + ox * sinR + oy * cosR;
        const r = (p.r0 + (p.r1 - p.r0) * e) * k;
        ctx.globalAlpha = a;
        ctx.fillStyle = '#b9c4cf';
        ctx.beginPath();
        ctx.arc(px, py + 2.5 * k, r, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(px, py, r, 0, TAU);
        ctx.fill();
      }
    } else if (fx.kind === 'petals') {
      const D = 480;
      for (const p of fx.petals) {
        if (t < p.delay) continue;
        const lp = clamp01((t - p.delay) / (D - p.delay));
        const e = easeOut(lp);
        const a = 1 - clamp01((lp - 0.6) / 0.4);
        if (a <= 0.01) continue;
        const ang = (p.angle * Math.PI) / 180;
        const px = fx.x + Math.cos(ang) * p.dist * e * k;
        const py = fx.y + Math.sin(ang) * p.dist * e * k + 14 * lp * lp * k;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(((p.rot0 + p.spin * lp) * Math.PI) / 180);
        ctx.globalAlpha = a;
        ctx.fillStyle = fx.under;
        ctx.beginPath();
        ctx.ellipse(0, 1.4 * k, 5.6 * k, 3.2 * k, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = fx.face;
        ctx.beginPath();
        ctx.ellipse(0, 0, 5.6 * k, 3.2 * k, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = fx.glint;
        ctx.beginPath();
        ctx.ellipse(-1.4 * k, -0.9 * k, 2.2 * k, 0.9 * k, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    } else {
      const D = 420;
      const lp = clamp01(t / D);
      const e = easeOut(lp);
      const poolA = 1 - clamp01((lp - 0.6) / 0.4);
      const rx = (4 + 12 * e) * k;
      const ry = (1.5 + 4 * e) * k;
      if (poolA > 0.01) {
        ctx.globalAlpha = poolA;
        ctx.fillStyle = fx.under;
        ctx.beginPath();
        ctx.ellipse(fx.x, fx.y + 9 * k, rx, ry, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = fx.colour;
        ctx.beginPath();
        ctx.ellipse(fx.x, fx.y + 6 * k, rx, ry, 0, 0, TAU);
        ctx.fill();
      }
      for (const d of fx.drops) {
        const da = 1 - clamp01((lp - 0.65) / 0.35);
        if (da <= 0.01) continue;
        const ang = (d.angle * Math.PI) / 180;
        const px = fx.x + Math.cos(ang) * d.speed * lp * k;
        const py = fx.y + (6 + Math.sin(ang) * d.speed * lp + 0.5 * 58 * lp * lp) * k;
        const r = d.r0 * (1 - 0.65 * lp) * k;
        ctx.globalAlpha = da;
        ctx.fillStyle = fx.under;
        ctx.beginPath();
        ctx.arc(px, py + 1.4 * k, r, 0, TAU);
        ctx.fill();
        ctx.fillStyle = fx.colour;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, TAU);
        ctx.fill();
        if (d.r0 > 4) {
          ctx.fillStyle = fx.glint;
          ctx.beginPath();
          ctx.arc(px - r * 0.35, py - r * 0.35, r * 0.32, 0, TAU);
          ctx.fill();
        }
      }
    }
    ctx.globalAlpha = 1;
  }
}

