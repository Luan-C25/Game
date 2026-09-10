/**
 * Canvas renderer.
 *
 * The look is built from geometry rather than from gradients. A tile has a
 * real extruded side face under it, a chamfer drawn as two clipped strokes,
 * and a flat glaze on top - not a vertical gradient with a gloss sweep, which
 * is the thing that makes a puzzle board look generated rather than made.
 *
 * Two rules the styling must not break: tile colours stay fixed because they
 * carry the rules, and every animation stops when "reduce motion" is on.
 */

import { blockCells, type Block, type Level } from '../engine/types.ts';
import type { Particles } from './particles.ts';
import { blockColour, blockGlyph, shade, tint, withAlpha, type Theme } from './theme.ts';

export interface Viewport {
  cell: number;
  originX: number;
  originY: number;
  wall: number;
}

export interface DragVisual {
  blockId: number;
  offsetX: number;
  offsetY: number;
}

export interface RenderOptions {
  theme: Theme;
  glyphs: boolean;
  /** Seconds since start; frozen when motion is reduced. */
  time: number;
  reduceMotion: boolean;
  drag?: DragVisual | null;
  highlight?: number[];
  particles?: Particles;
}

const WALL_RATIO = 0.34;
const MAX_CELL = 88;
/** Tile thickness, as a fraction of a cell. */
const DEPTH_RATIO = 0.13;

export function computeViewport(level: Level, widthPx: number, heightPx: number): Viewport {
  const margin = 14;
  const usableW = Math.max(40, widthPx - margin * 2);
  const usableH = Math.max(40, heightPx - margin * 2);
  const cell = Math.min(
    MAX_CELL,
    Math.floor(
      Math.min(usableW / (level.width + WALL_RATIO * 2), usableH / (level.height + WALL_RATIO * 2)),
    ),
  );
  const wall = Math.max(11, Math.round(cell * WALL_RATIO));
  return {
    cell,
    wall,
    originX: Math.round((widthPx - level.width * cell) / 2),
    originY: Math.round((heightPx - level.height * cell) / 2),
  };
}

/* ------------------------------------------------------------------ paths */

interface Corners {
  tl: number;
  tr: number;
  br: number;
  bl: number;
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  c: Corners,
): void {
  const cap = Math.min(w, h) / 2;
  const tl = Math.max(0, Math.min(c.tl, cap));
  const tr = Math.max(0, Math.min(c.tr, cap));
  const br = Math.max(0, Math.min(c.br, cap));
  const bl = Math.max(0, Math.min(c.bl, cap));

  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  ctx.arcTo(x + w, y, x + w, y + tr, tr);
  ctx.lineTo(x + w, y + h - br);
  ctx.arcTo(x + w, y + h, x + w - br, y + h, br);
  ctx.lineTo(x + bl, y + h);
  ctx.arcTo(x, y + h, x, y + h - bl, bl);
  ctx.lineTo(x, y + tl);
  ctx.arcTo(x, y, x + tl, y, tl);
}

function box(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  roundRectPath(ctx, x, y, w, h, { tl: r, tr: r, br: r, bl: r });
}

/* ---------------------------------------------------------------- texture */

/**
 * A speckle tile, built once and reused as a fill pattern. It is what stops
 * a flat colour reading as flat vector art - a ceramic glaze is never a
 * perfectly even field.
 */
let speckle: CanvasPattern | null = null;

function specklePattern(ctx: CanvasRenderingContext2D): CanvasPattern | null {
  if (speckle) return speckle;
  const size = 64;
  const tile = document.createElement('canvas');
  tile.width = size;
  tile.height = size;
  const tctx = tile.getContext('2d');
  if (!tctx) return null;

  // Deterministic noise, so the glaze does not shimmer between frames.
  let seed = 0x9e3779b9;
  const rand = (): number => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  for (let i = 0; i < 900; i++) {
    const light = rand() > 0.5;
    tctx.fillStyle = light ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    tctx.fillRect(rand() * size, rand() * size, 1, 1);
  }

  speckle = ctx.createPattern(tile, 'repeat');
  return speckle;
}

/* ------------------------------------------------------------------ board */

function drawTray(ctx: CanvasRenderingContext2D, level: Level, vp: Viewport, theme: Theme): void {
  const { cell, wall, originX, originY } = vp;
  const boardW = level.width * cell;
  const boardH = level.height * cell;
  const radius = Math.round(wall * 0.7);
  const depth = Math.max(4, Math.round(wall * 0.34));

  // The tray has a thickness of its own: a dark slab behind the face.
  ctx.fillStyle = theme.trayEdge;
  box(ctx, originX - wall, originY - wall + depth, boardW + wall * 2, boardH + wall * 2, radius);
  ctx.fill();

  ctx.fillStyle = theme.tray;
  box(ctx, originX - wall, originY - wall, boardW + wall * 2, boardH + wall * 2, radius);
  ctx.fill();

  // Lit top lip, clipped inside the frame so it reads as a chamfer.
  ctx.save();
  box(ctx, originX - wall, originY - wall, boardW + wall * 2, boardH + wall * 2, radius);
  ctx.clip();
  ctx.strokeStyle = theme.trayLip;
  ctx.lineWidth = Math.max(2, wall * 0.16);
  ctx.beginPath();
  roundRectPath(
    ctx,
    originX - wall + 1,
    originY - wall + 1,
    boardW + wall * 2 - 2,
    boardH + wall * 2 - 2,
    { tl: radius, tr: radius, br: radius, bl: radius },
  );
  ctx.stroke();
  ctx.restore();

  // Recessed floor: grout first, then a well per cell.
  ctx.fillStyle = theme.grout;
  box(ctx, originX, originY, boardW, boardH, Math.round(cell * 0.1));
  ctx.fill();

  const gap = Math.max(1.5, cell * 0.045);
  const wellRadius = Math.max(2, cell * 0.12);
  for (let y = 0; y < level.height; y++) {
    for (let x = 0; x < level.width; x++) {
      const wx = originX + x * cell + gap;
      const wy = originY + y * cell + gap;
      const ws = cell - gap * 2;

      ctx.fillStyle = theme.well;
      box(ctx, wx, wy, ws, ws, wellRadius);
      ctx.fill();

      // A single lit edge along the bottom of each well sells the recess.
      ctx.save();
      box(ctx, wx, wy, ws, ws, wellRadius);
      ctx.clip();
      ctx.strokeStyle = theme.wellLip;
      ctx.lineWidth = Math.max(1, cell * 0.03);
      ctx.beginPath();
      roundRectPath(ctx, wx, wy - ctx.lineWidth, ws, ws, {
        tl: wellRadius,
        tr: wellRadius,
        br: wellRadius,
        bl: wellRadius,
      });
      ctx.stroke();
      ctx.restore();
    }
  }
}

/* ------------------------------------------------------------------ gates */

function drawGates(
  ctx: CanvasRenderingContext2D,
  level: Level,
  vp: Viewport,
  options: RenderOptions,
): void {
  const { cell, wall, originX, originY } = vp;
  const boardW = level.width * cell;
  const boardH = level.height * cell;
  const theme = options.theme;
  const pulse = options.reduceMotion ? 0.35 : 0.35 + (Math.sin(options.time * 2) * 0.5 + 0.5) * 0.4;

  for (const gate of level.gates) {
    const colour = blockColour(gate.color);
    const horizontal = gate.side === 'top' || gate.side === 'bottom';
    const span = gate.length * cell;
    const inset = Math.max(2, cell * 0.05);

    // Slot cut clean through the frame.
    let sx = 0;
    let sy = 0;
    let sw = 0;
    let sh = 0;
    if (gate.side === 'top') {
      sx = originX + gate.start * cell + inset;
      sy = originY - wall;
      sw = span - inset * 2;
      sh = wall + 1;
    } else if (gate.side === 'bottom') {
      sx = originX + gate.start * cell + inset;
      sy = originY + boardH - 1;
      sw = span - inset * 2;
      sh = wall + 1;
    } else if (gate.side === 'left') {
      sx = originX - wall;
      sy = originY + gate.start * cell + inset;
      sw = wall + 1;
      sh = span - inset * 2;
    } else {
      sx = originX + boardW - 1;
      sy = originY + gate.start * cell + inset;
      sw = wall + 1;
      sh = span - inset * 2;
    }

    const slotRadius = Math.max(2, wall * 0.22);
    ctx.fillStyle = theme.channel;
    box(ctx, sx, sy, sw, sh, slotRadius);
    ctx.fill();

    // Painted colour bar seated inside the slot, with a metal rim above it.
    const pad = Math.max(2, wall * 0.18);
    const bx = sx + (horizontal ? 0 : pad);
    const by = sy + (horizontal ? pad : 0);
    const bw = sw - (horizontal ? 0 : pad * 2);
    const bh = sh - (horizontal ? pad * 2 : 0);

    ctx.fillStyle = colour;
    box(ctx, bx, by, bw, bh, Math.max(2, slotRadius * 0.7));
    ctx.fill();

    ctx.save();
    box(ctx, bx, by, bw, bh, Math.max(2, slotRadius * 0.7));
    ctx.clip();
    ctx.strokeStyle = withAlpha(theme.rim, 0.55 + pulse * 0.45);
    ctx.lineWidth = Math.max(1.5, wall * 0.1);
    ctx.beginPath();
    roundRectPath(ctx, bx + 0.5, by + 0.5, bw - 1, bh - 1, {
      tl: slotRadius,
      tr: slotRadius,
      br: slotRadius,
      bl: slotRadius,
    });
    ctx.stroke();
    ctx.restore();

    // Engraved arrow: a dark notch with a light edge under it, pointing out.
    const cx = bx + bw / 2;
    const cy = by + bh / 2;
    const reach = Math.min(bw, bh) * 0.26;
    const spread = Math.min(bw, bh) * 0.3;
    const arrow = (dx: number, dy: number, style: string, width: number): void => {
      ctx.strokeStyle = style;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      if (gate.side === 'top') {
        ctx.moveTo(cx - spread + dx, cy + reach + dy);
        ctx.lineTo(cx + dx, cy - reach + dy);
        ctx.lineTo(cx + spread + dx, cy + reach + dy);
      } else if (gate.side === 'bottom') {
        ctx.moveTo(cx - spread + dx, cy - reach + dy);
        ctx.lineTo(cx + dx, cy + reach + dy);
        ctx.lineTo(cx + spread + dx, cy - reach + dy);
      } else if (gate.side === 'left') {
        ctx.moveTo(cx + reach + dx, cy - spread + dy);
        ctx.lineTo(cx - reach + dx, cy + dy);
        ctx.lineTo(cx + reach + dx, cy + spread + dy);
      } else {
        ctx.moveTo(cx - reach + dx, cy - spread + dy);
        ctx.lineTo(cx + reach + dx, cy + dy);
        ctx.lineTo(cx - reach + dx, cy + spread + dy);
      }
      ctx.stroke();
    };

    const stroke = Math.max(2, cell * 0.06);
    arrow(0, Math.max(1, stroke * 0.5), withAlpha(tint(colour, 0.6), 0.5), stroke);
    arrow(0, 0, withAlpha(shade(colour, 0.55), 0.9), stroke);

    if (options.glyphs) {
      ctx.fillStyle = withAlpha(shade(colour, 0.6), 0.9);
      ctx.font = `700 ${Math.round(Math.min(bw, bh) * 0.4)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const offX = gate.side === 'left' ? -bw * 0.3 : gate.side === 'right' ? bw * 0.3 : 0;
      const offY = gate.side === 'top' ? -bh * 0.3 : gate.side === 'bottom' ? bh * 0.3 : 0;
      ctx.fillText(blockGlyph(gate.color), cx + offX, cy + offY);
    }
  }
}

/* ------------------------------------------------------------------ tiles */

/**
 * Traces a whole block as one silhouette. Each cell contributes a rectangle
 * whose corners are rounded only where no neighbour adjoins, so a 2x2 reads
 * as a single slab rather than four loose tiles.
 */
function blockPath(
  ctx: CanvasRenderingContext2D,
  block: Block,
  vp: Viewport,
  dx: number,
  dy: number,
  inset: number,
): void {
  const { cell, originX, originY } = vp;
  const cells = blockCells(block);
  const has = (x: number, y: number): boolean => cells.some((c) => c.x === x && c.y === y);
  const radius = cell * 0.18;

  ctx.beginPath();
  for (const c of cells) {
    const left = has(c.x - 1, c.y);
    const right = has(c.x + 1, c.y);
    const up = has(c.x, c.y - 1);
    const down = has(c.x, c.y + 1);

    const x = originX + c.x * cell + (left ? -1 : inset) + dx;
    const y = originY + c.y * cell + (up ? -1 : inset) + dy;
    const w = cell - (left ? -1 : inset) - (right ? -1 : inset);
    const h = cell - (up ? -1 : inset) - (down ? -1 : inset);

    roundRectPath(ctx, x, y, w, h, {
      tl: !left && !up ? radius : 0,
      tr: !right && !up ? radius : 0,
      br: !right && !down ? radius : 0,
      bl: !left && !down ? radius : 0,
    });
  }
}

function blockBounds(block: Block, vp: Viewport, dx: number, dy: number) {
  const cells = blockCells(block);
  const minX = Math.min(...cells.map((c) => c.x));
  const minY = Math.min(...cells.map((c) => c.y));
  const maxX = Math.max(...cells.map((c) => c.x));
  const maxY = Math.max(...cells.map((c) => c.y));
  return {
    x: vp.originX + minX * vp.cell + dx,
    y: vp.originY + minY * vp.cell + dy,
    w: (maxX - minX + 1) * vp.cell,
    h: (maxY - minY + 1) * vp.cell,
    cx: vp.originX + ((minX + maxX) / 2 + 0.5) * vp.cell + dx,
    cy: vp.originY + ((minY + maxY) / 2 + 0.5) * vp.cell + dy,
  };
}

function drawBlock(
  ctx: CanvasRenderingContext2D,
  block: Block,
  vp: Viewport,
  options: RenderOptions,
  dx: number,
  dy: number,
): void {
  const { cell } = vp;
  const isCrate = block.kind === 'crate';
  const base = isCrate ? options.theme.crate : blockColour(block.color);
  const inset = Math.max(2, Math.round(cell * 0.055));
  const depth = Math.max(3, Math.round(cell * DEPTH_RATIO));
  const bevel = Math.max(1.5, cell * 0.045);
  const bounds = blockBounds(block, vp, dx, dy);
  const highlighted = options.highlight?.includes(block.id) ?? false;

  // Cast shadow into the well below the tile.
  ctx.save();
  ctx.globalAlpha = 0.32;
  ctx.fillStyle = '#000000';
  blockPath(ctx, block, vp, dx + depth * 0.35, dy + depth * 1.3, inset);
  ctx.fill();
  ctx.restore();

  // The extruded side: a solid darker slab, not a gradient. This is what
  // gives the tile real thickness.
  ctx.fillStyle = shade(base, 0.42);
  blockPath(ctx, block, vp, dx, dy + depth, inset);
  ctx.fill();

  // Glaze: flat colour, then a fine speckle so it is not a dead vector fill.
  blockPath(ctx, block, vp, dx, dy, inset);
  ctx.fillStyle = base;
  ctx.fill();

  const pattern = specklePattern(ctx);
  if (pattern) {
    ctx.save();
    blockPath(ctx, block, vp, dx, dy, inset);
    ctx.clip();
    ctx.fillStyle = pattern;
    ctx.fillRect(bounds.x - cell, bounds.y - cell, bounds.w + cell * 2, bounds.h + cell * 2);
    ctx.restore();
  }

  // Chamfer: two strokes offset in opposite directions and clipped to the
  // tile, so only their inner halves show - a lit edge and a shaded one.
  ctx.save();
  blockPath(ctx, block, vp, dx, dy, inset);
  ctx.clip();
  ctx.lineWidth = bevel * 2;
  ctx.strokeStyle = withAlpha(tint(base, 0.55), isCrate ? 0.5 : 0.75);
  blockPath(ctx, block, vp, dx - bevel * 0.7, dy - bevel * 0.7, inset);
  ctx.stroke();
  ctx.strokeStyle = withAlpha(shade(base, 0.35), 0.75);
  blockPath(ctx, block, vp, dx + bevel * 0.7, dy + bevel * 0.7, inset);
  ctx.stroke();

  // Seams between the cells of one block: it is a single piece, but you can
  // still read how many squares it covers.
  const cells = blockCells(block);
  ctx.strokeStyle = withAlpha(shade(base, 0.3), 0.45);
  ctx.lineWidth = Math.max(1, cell * 0.022);
  ctx.beginPath();
  for (const c of cells) {
    if (cells.some((o) => o.x === c.x + 1 && o.y === c.y)) {
      const sx = vp.originX + (c.x + 1) * cell + dx;
      ctx.moveTo(sx, vp.originY + c.y * cell + dy + inset);
      ctx.lineTo(sx, vp.originY + (c.y + 1) * cell + dy - inset);
    }
    if (cells.some((o) => o.x === c.x && o.y === c.y + 1)) {
      const sy = vp.originY + (c.y + 1) * cell + dy;
      ctx.moveTo(vp.originX + c.x * cell + dx + inset, sy);
      ctx.lineTo(vp.originX + (c.x + 1) * cell + dx - inset, sy);
    }
  }
  ctx.stroke();
  ctx.restore();

  // Crates are scenery: scored across so they never read as movable.
  if (isCrate) {
    ctx.save();
    blockPath(ctx, block, vp, dx, dy, inset);
    ctx.clip();
    ctx.strokeStyle = withAlpha(shade(base, 0.45), 0.5);
    ctx.lineWidth = Math.max(1.5, cell * 0.05);
    ctx.beginPath();
    for (let i = -bounds.h; i < bounds.w + bounds.h; i += Math.max(7, cell * 0.26)) {
      ctx.moveTo(bounds.x + i, bounds.y);
      ctx.lineTo(bounds.x + i + bounds.h, bounds.y + bounds.h);
    }
    ctx.stroke();
    ctx.restore();
  }

  // Hard outline. Keeps every tile legible against its neighbours.
  blockPath(ctx, block, vp, dx, dy, inset);
  ctx.strokeStyle = withAlpha(shade(base, 0.55), 0.85);
  ctx.lineWidth = Math.max(1.2, cell * 0.025);
  ctx.stroke();

  if (highlighted) {
    const pulse = options.reduceMotion ? 1 : 0.55 + Math.sin(options.time * 5.5) * 0.45;
    blockPath(ctx, block, vp, dx, dy, inset);
    ctx.strokeStyle = `rgba(255,255,255,${0.45 + pulse * 0.5})`;
    ctx.lineWidth = Math.max(2.5, cell * 0.07);
    ctx.stroke();
  }

  if (options.glyphs && !isCrate) {
    ctx.fillStyle = withAlpha(shade(base, 0.5), 0.75);
    ctx.font = `700 ${Math.round(cell * 0.38)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(blockGlyph(block.color), bounds.cx, bounds.cy);
  }
}

/* ------------------------------------------------------------------ frame */

export function render(
  ctx: CanvasRenderingContext2D,
  level: Level,
  vp: Viewport,
  options: RenderOptions,
): void {
  const dpr = window.devicePixelRatio || 1;
  ctx.clearRect(0, 0, ctx.canvas.width / dpr, ctx.canvas.height / dpr);

  drawTray(ctx, level, vp, options.theme);
  drawGates(ctx, level, vp, options);

  // Tiles nearer the bottom draw later, so their thickness overlaps correctly.
  const ordered = level.blocks
    .filter((b) => !b.exited)
    .sort((a, b) => a.pos.y - b.pos.y || a.pos.x - b.pos.x);

  const dragged = options.drag?.blockId;
  for (const block of ordered) {
    if (block.id === dragged) continue;
    drawBlock(ctx, block, vp, options, 0, 0);
  }
  if (dragged !== undefined) {
    const block = level.blocks.find((b) => b.id === dragged);
    if (block && !block.exited) {
      drawBlock(ctx, block, vp, options, options.drag!.offsetX, options.drag!.offsetY);
    }
  }

  options.particles?.draw(ctx);
}

/** Screen position of a block's centre, for spawning effects. */
export function blockCentre(block: Block, vp: Viewport): { x: number; y: number } {
  const bounds = blockBounds(block, vp, 0, 0);
  return { x: bounds.cx, y: bounds.cy };
}
