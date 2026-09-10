/**
 * Canvas renderer.
 *
 * Drawing is deliberately plain and cheap: a full repaint per frame of a
 * board that is at most 7x7. Jerky, stuttering block movement is one of the
 * loudest complaints about the games this answers, so the renderer's job is
 * simply to never be the reason a drag feels bad.
 */

import { blockCells, type Block, type Level } from '../engine/types.ts';
import { blockColour, blockGlyph, shade, type Theme } from './theme.ts';

export interface Viewport {
  /** Pixel size of one grid cell. */
  cell: number;
  /** Top-left of the playfield in CSS pixels. */
  originX: number;
  originY: number;
  /** Thickness of the wall ring that gates are cut into. */
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
  drag?: DragVisual | null;
  /** Block ids to draw with a highlight, used by the hint. */
  highlight?: number[];
  /** 0..1 progress of the level-complete flourish. */
  celebrate?: number;
}

/** Wall thickness as a fraction of one cell. */
const WALL_RATIO = 0.28;
/** Stops the board becoming comically large on a desktop window. */
const MAX_CELL = 92;

export function computeViewport(level: Level, widthPx: number, heightPx: number): Viewport {
  // The board plus a wall ring on both sides has to fit inside the margins,
  // so the divisor carries the ring rather than a guessed fudge factor.
  const margin = 16;
  const usableW = Math.max(40, widthPx - margin * 2);
  const usableH = Math.max(40, heightPx - margin * 2);
  const cell = Math.min(
    MAX_CELL,
    Math.floor(
      Math.min(usableW / (level.width + WALL_RATIO * 2), usableH / (level.height + WALL_RATIO * 2)),
    ),
  );
  const wall = Math.max(8, Math.round(cell * WALL_RATIO));
  const boardW = level.width * cell;
  const boardH = level.height * cell;
  return {
    cell,
    wall,
    originX: Math.round((widthPx - boardW) / 2),
    originY: Math.round((heightPx - boardH) / 2),
  };
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawWalls(ctx: CanvasRenderingContext2D, level: Level, vp: Viewport, theme: Theme): void {
  const { cell, wall, originX, originY } = vp;
  const boardW = level.width * cell;
  const boardH = level.height * cell;

  ctx.fillStyle = theme.boardWall;
  ctx.fillRect(originX - wall, originY - wall, boardW + wall * 2, wall);
  ctx.fillRect(originX - wall, originY + boardH, boardW + wall * 2, wall);
  ctx.fillRect(originX - wall, originY, wall, boardH);
  ctx.fillRect(originX + boardW, originY, wall, boardH);
}

function drawGates(
  ctx: CanvasRenderingContext2D,
  level: Level,
  vp: Viewport,
  glyphs: boolean,
): void {
  const { cell, wall, originX, originY } = vp;
  const boardW = level.width * cell;
  const boardH = level.height * cell;
  // The gate fills the wall's full thickness and overlaps the playfield edge
  // slightly, so it reads as an opening cut through the wall rather than a
  // sticker placed near it.
  const lip = Math.max(2, Math.round(cell * 0.07));

  for (const gate of level.gates) {
    const colour = blockColour(gate.color);
    ctx.fillStyle = colour;

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

    roundRect(ctx, gx, gy, gw, gh, Math.round(wall * 0.3));
    ctx.fill();

    if (glyphs) {
      ctx.fillStyle = shade(colour, 0.55);
      ctx.font = `${Math.round(Math.min(gw, gh) * 0.8)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(blockGlyph(gate.color), gx + gw / 2, gy + gh / 2);
    }
  }
}

function drawFloor(ctx: CanvasRenderingContext2D, level: Level, vp: Viewport, theme: Theme): void {
  const { cell, originX, originY } = vp;
  ctx.fillStyle = theme.boardFloor;
  ctx.fillRect(originX, originY, level.width * cell, level.height * cell);

  ctx.strokeStyle = theme.gridLine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 1; x < level.width; x++) {
    ctx.moveTo(originX + x * cell + 0.5, originY);
    ctx.lineTo(originX + x * cell + 0.5, originY + level.height * cell);
  }
  for (let y = 1; y < level.height; y++) {
    ctx.moveTo(originX, originY + y * cell + 0.5);
    ctx.lineTo(originX + level.width * cell, originY + y * cell + 0.5);
  }
  ctx.stroke();
}

function drawBlock(
  ctx: CanvasRenderingContext2D,
  block: Block,
  vp: Viewport,
  options: RenderOptions,
  dx: number,
  dy: number,
): void {
  const { cell, originX, originY } = vp;
  const pad = Math.max(2, Math.round(cell * 0.06));
  const isCrate = block.kind === 'crate';
  const base = isCrate ? options.theme.crate : blockColour(block.color);
  const highlighted = options.highlight?.includes(block.id) ?? false;

  // Each cell is drawn as its own tile; a shared fill would need polygon
  // tracing for L shapes and buys nothing at this size.
  for (const c of blockCells(block)) {
    const x = originX + c.x * cell + pad + dx;
    const y = originY + c.y * cell + pad + dy;
    const size = cell - pad * 2;

    ctx.fillStyle = shade(base, 0.22);
    roundRect(ctx, x, y + Math.max(2, size * 0.06), size, size, size * 0.22);
    ctx.fill();

    ctx.fillStyle = base;
    roundRect(ctx, x, y, size, size, size * 0.22);
    ctx.fill();

    if (highlighted) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(2, cell * 0.06);
      roundRect(ctx, x, y, size, size, size * 0.22);
      ctx.stroke();
    }
  }

  if (options.glyphs && !isCrate) {
    const cells = blockCells(block);
    const cx = originX + (cells.reduce((s, c) => s + c.x, 0) / cells.length + 0.5) * cell + dx;
    const cy = originY + (cells.reduce((s, c) => s + c.y, 0) / cells.length + 0.5) * cell + dy;
    ctx.fillStyle = shade(base, 0.5);
    ctx.font = `${Math.round(cell * 0.42)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(blockGlyph(block.color), cx, cy);
  }
}

export function render(
  ctx: CanvasRenderingContext2D,
  level: Level,
  vp: Viewport,
  options: RenderOptions,
): void {
  const canvas = ctx.canvas;
  const width = canvas.width / (window.devicePixelRatio || 1);
  const height = canvas.height / (window.devicePixelRatio || 1);

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = options.theme.background;
  ctx.fillRect(0, 0, width, height);

  // Order matters: the wall ring first, then the gates cut into it, then the
  // playfield on top. Painting the wall last would hide every exit.
  drawWalls(ctx, level, vp, options.theme);
  drawGates(ctx, level, vp, options.glyphs);
  drawFloor(ctx, level, vp, options.theme);

  for (const block of level.blocks) {
    if (block.exited) continue;
    const dragging = options.drag?.blockId === block.id;
    drawBlock(
      ctx,
      block,
      vp,
      options,
      dragging ? options.drag!.offsetX : 0,
      dragging ? options.drag!.offsetY : 0,
    );
  }
}
