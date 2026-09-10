/**
 * Canvas renderer.
 *
 * The board is at most 7x7, so everything is repainted every frame and the
 * budget goes on looking good instead: a drifting gradient background, blocks
 * drawn as one merged glossy shape rather than a grid of separate tiles, and
 * gates that glow and point the way out.
 *
 * Two things the styling must never cost: block colours stay fixed because
 * they carry the rules, and every animation stops dead when the player turns
 * on "reduce motion".
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
  /** Seconds since start; frozen at 0 when motion is reduced. */
  time: number;
  reduceMotion: boolean;
  drag?: DragVisual | null;
  /** Block ids the hint is pointing at. */
  highlight?: number[];
  particles?: Particles;
}

const WALL_RATIO = 0.3;
const MAX_CELL = 92;

export function computeViewport(level: Level, widthPx: number, heightPx: number): Viewport {
  // The board plus its wall ring has to fit inside the margins, so the
  // divisor carries the ring rather than a guessed fudge factor.
  const margin = 16;
  const usableW = Math.max(40, widthPx - margin * 2);
  const usableH = Math.max(40, heightPx - margin * 2);
  const cell = Math.min(
    MAX_CELL,
    Math.floor(
      Math.min(usableW / (level.width + WALL_RATIO * 2), usableH / (level.height + WALL_RATIO * 2)),
    ),
  );
  const wall = Math.max(9, Math.round(cell * WALL_RATIO));
  return {
    cell,
    wall,
    originX: Math.round((widthPx - level.width * cell) / 2),
    originY: Math.round((heightPx - level.height * cell) / 2),
  };
}

interface Corners {
  tl: number;
  tr: number;
  br: number;
  bl: number;
}

/** Rounded rectangle with independent corner radii. */
function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  c: Corners,
): void {
  const cap = Math.min(w, h) / 2;
  const tl = Math.min(c.tl, cap);
  const tr = Math.min(c.tr, cap);
  const br = Math.min(c.br, cap);
  const bl = Math.min(c.bl, cap);

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

function simpleRound(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  roundRectPath(ctx, x, y, w, h, { tl: r, tr: r, br: r, bl: r });
}

/* ------------------------------------------------------------------ board */

function drawBoard(ctx: CanvasRenderingContext2D, level: Level, vp: Viewport, theme: Theme): void {
  const { cell, wall, originX, originY } = vp;
  const boardW = level.width * cell;
  const boardH = level.height * cell;
  const outer = Math.round(wall * 0.85);

  // Drop shadow beneath the whole board unit.
  ctx.save();
  ctx.shadowColor = theme.dark ? 'rgba(0,0,0,0.55)' : 'rgba(120,80,50,0.25)';
  ctx.shadowBlur = wall * 1.6;
  ctx.shadowOffsetY = wall * 0.45;

  const wallGradient = ctx.createLinearGradient(originX, originY - wall, originX, originY + boardH + wall);
  wallGradient.addColorStop(0, theme.wallFrom);
  wallGradient.addColorStop(1, theme.wallTo);
  ctx.fillStyle = wallGradient;
  ctx.beginPath();
  simpleRound(ctx, originX - wall, originY - wall, boardW + wall * 2, boardH + wall * 2, outer);
  ctx.fill();
  ctx.restore();

  const floorGradient = ctx.createLinearGradient(originX, originY, originX, originY + boardH);
  floorGradient.addColorStop(0, theme.floorFrom);
  floorGradient.addColorStop(1, theme.floorTo);
  ctx.fillStyle = floorGradient;
  ctx.beginPath();
  simpleRound(ctx, originX, originY, boardW, boardH, Math.round(cell * 0.14));
  ctx.fill();

  // Dots at the cell corners read as a grid without ruling hard lines across
  // the board, which would fight the blocks for attention.
  ctx.fillStyle = theme.gridDot;
  const dot = Math.max(1.2, cell * 0.035);
  for (let x = 1; x < level.width; x++) {
    for (let y = 1; y < level.height; y++) {
      ctx.beginPath();
      ctx.arc(originX + x * cell, originY + y * cell, dot, 0, Math.PI * 2);
      ctx.fill();
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
  const lip = Math.max(2, Math.round(cell * 0.08));
  const pulse = options.reduceMotion ? 0.5 : 0.5 + Math.sin(options.time * 2.2) * 0.5;

  for (const gate of level.gates) {
    const colour = blockColour(gate.color);
    let gx = 0;
    let gy = 0;
    let gw = 0;
    let gh = 0;

    if (gate.side === 'top') {
      gx = originX + gate.start * cell;
      gy = originY - wall;
      gw = gate.length * cell;
      gh = wall + lip;
    } else if (gate.side === 'bottom') {
      gx = originX + gate.start * cell;
      gy = originY + boardH - lip;
      gw = gate.length * cell;
      gh = wall + lip;
    } else if (gate.side === 'left') {
      gx = originX - wall;
      gy = originY + gate.start * cell;
      gw = wall + lip;
      gh = gate.length * cell;
    } else {
      gx = originX + boardW - lip;
      gy = originY + gate.start * cell;
      gw = wall + lip;
      gh = gate.length * cell;
    }

    const horizontal = gate.side === 'top' || gate.side === 'bottom';

    ctx.save();
    // The glow breathes, so an exit is the liveliest thing on a still board.
    ctx.shadowColor = withAlpha(colour, 0.45 + pulse * 0.4);
    ctx.shadowBlur = wall * (0.7 + pulse * 0.8);

    const grad = horizontal
      ? ctx.createLinearGradient(gx, gy, gx, gy + gh)
      : ctx.createLinearGradient(gx, gy, gx + gw, gy);
    grad.addColorStop(0, tint(colour, 0.35));
    grad.addColorStop(1, shade(colour, 0.12));
    ctx.fillStyle = grad;
    ctx.beginPath();
    simpleRound(ctx, gx, gy, gw, gh, Math.round(wall * 0.32));
    ctx.fill();
    ctx.restore();

    // A chevron pointing out of the board, so the exit direction is explicit
    // rather than something the player has to infer from the layout.
    const cx = gx + gw / 2;
    const cy = gy + gh / 2;
    const reach = Math.min(gw, gh) * 0.22;
    const spread = Math.min(gw, gh) * 0.26;
    ctx.strokeStyle = withAlpha(shade(colour, 0.55), 0.85);
    ctx.lineWidth = Math.max(2, cell * 0.055);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    if (gate.side === 'top') {
      ctx.moveTo(cx - spread, cy + reach);
      ctx.lineTo(cx, cy - reach);
      ctx.lineTo(cx + spread, cy + reach);
    } else if (gate.side === 'bottom') {
      ctx.moveTo(cx - spread, cy - reach);
      ctx.lineTo(cx, cy + reach);
      ctx.lineTo(cx + spread, cy - reach);
    } else if (gate.side === 'left') {
      ctx.moveTo(cx + reach, cy - spread);
      ctx.lineTo(cx - reach, cy);
      ctx.lineTo(cx + reach, cy + spread);
    } else {
      ctx.moveTo(cx - reach, cy - spread);
      ctx.lineTo(cx + reach, cy);
      ctx.lineTo(cx - reach, cy + spread);
    }
    ctx.stroke();

    if (options.glyphs) {
      ctx.fillStyle = withAlpha(shade(colour, 0.6), 0.9);
      ctx.font = `700 ${Math.round(Math.min(gw, gh) * 0.42)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const offX = gate.side === 'left' ? -gw * 0.34 : gate.side === 'right' ? gw * 0.34 : 0;
      const offY = gate.side === 'top' ? -gh * 0.32 : gate.side === 'bottom' ? gh * 0.32 : 0;
      ctx.fillText(blockGlyph(gate.color), cx + offX, cy + offY);
    }
  }
}

/* ----------------------------------------------------------------- blocks */

/**
 * Traces a whole block as one shape. Each cell contributes a rectangle whose
 * corners are only rounded where no neighbour of the same block adjoins, so a
 * 2x2 reads as one rounded slab instead of four separate tiles.
 */
function buildBlockPath(
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
  const radius = cell * 0.26;

  ctx.beginPath();
  for (const c of cells) {
    const left = has(c.x - 1, c.y);
    const right = has(c.x + 1, c.y);
    const up = has(c.x, c.y - 1);
    const down = has(c.x, c.y + 1);

    // Grow the rectangle over any shared edge so neighbouring cells fuse with
    // no seam, and only inset on the outside faces.
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
  const inset = Math.max(2, Math.round(cell * 0.07));
  const bounds = blockBounds(block, vp, dx, dy);
  const highlighted = options.highlight?.includes(block.id) ?? false;

  // Contact shadow.
  ctx.save();
  ctx.fillStyle = options.theme.dark ? 'rgba(0,0,0,0.45)' : 'rgba(70,45,30,0.22)';
  ctx.filter = 'none';
  buildBlockPath(ctx, block, vp, dx, dy + Math.max(2, cell * 0.07), inset);
  ctx.fill();
  ctx.restore();

  // Body: a vertical gradient gives the slab weight without a texture.
  buildBlockPath(ctx, block, vp, dx, dy, inset);
  const body = ctx.createLinearGradient(bounds.x, bounds.y, bounds.x, bounds.y + bounds.h);
  body.addColorStop(0, tint(base, isCrate ? 0.22 : 0.34));
  body.addColorStop(0.55, base);
  body.addColorStop(1, shade(base, isCrate ? 0.18 : 0.24));
  ctx.fillStyle = body;
  ctx.fill();

  // Gloss, clipped to the block so it hugs the merged silhouette.
  ctx.save();
  buildBlockPath(ctx, block, vp, dx, dy, inset);
  ctx.clip();
  const gloss = ctx.createLinearGradient(bounds.x, bounds.y, bounds.x, bounds.y + bounds.h * 0.5);
  gloss.addColorStop(0, 'rgba(255,255,255,0.42)');
  gloss.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gloss;
  ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h * 0.5);
  ctx.restore();

  // Crates get hatching so they read as scenery, not as a block you can move.
  if (isCrate) {
    ctx.save();
    buildBlockPath(ctx, block, vp, dx, dy, inset);
    ctx.clip();
    ctx.strokeStyle = withAlpha(shade(base, 0.4), 0.5);
    ctx.lineWidth = Math.max(1.5, cell * 0.04);
    ctx.beginPath();
    for (let i = -bounds.h; i < bounds.w + bounds.h; i += Math.max(6, cell * 0.24)) {
      ctx.moveTo(bounds.x + i, bounds.y);
      ctx.lineTo(bounds.x + i + bounds.h, bounds.y + bounds.h);
    }
    ctx.stroke();
    ctx.restore();
  }

  // Rim light along the top edge.
  ctx.save();
  buildBlockPath(ctx, block, vp, dx, dy, inset);
  ctx.strokeStyle = withAlpha(tint(base, 0.65), 0.55);
  ctx.lineWidth = Math.max(1, cell * 0.03);
  ctx.stroke();
  ctx.restore();

  if (highlighted) {
    const pulse = options.reduceMotion ? 1 : 0.6 + Math.sin(options.time * 6) * 0.4;
    ctx.save();
    ctx.shadowColor = withAlpha(tint(base, 0.5), 0.9);
    ctx.shadowBlur = cell * 0.5 * pulse;
    buildBlockPath(ctx, block, vp, dx, dy, inset);
    ctx.strokeStyle = `rgba(255,255,255,${0.55 + pulse * 0.45})`;
    ctx.lineWidth = Math.max(2.5, cell * 0.07);
    ctx.stroke();
    ctx.restore();
  }

  if (options.glyphs && !isCrate) {
    ctx.fillStyle = withAlpha(shade(base, 0.55), 0.8);
    ctx.font = `700 ${Math.round(cell * 0.4)}px system-ui, sans-serif`;
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

  // Board first, then the gates cut into its wall. Painting the wall after
  // the gates would hide every exit.
  drawBoard(ctx, level, vp, options.theme);
  drawGates(ctx, level, vp, options);

  // The dragged block draws last so it rides above its neighbours.
  const dragged = options.drag?.blockId;
  for (const block of level.blocks) {
    if (block.exited || block.id === dragged) continue;
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
