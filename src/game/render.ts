/**
 * Canvas renderer.
 *
 * The board is drawn as a physical object: a moulded tray with grooves
 * channelled between its pads, tiles that sit *inside* it with real
 * thickness, and exits cut clean through the frame. Depth comes from
 * geometry - extruded sides, inner shadows, lit and shaded chamfers - never
 * from a gradient standing in for a shape.
 *
 * Surfaces stay smooth and colours stay solid. No speckle, no sparkle: the
 * satisfaction is meant to come from weight and shadow, not from decoration.
 *
 * Two rules the styling must not break: tile colours are fixed because they
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

const WALL_RATIO = 0.36;
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
  const wall = Math.max(12, Math.round(cell * WALL_RATIO));
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

/**
 * Casts a shadow *inwards* from the edge of a shape: fill everything outside
 * the shape while clipped to the inside, so only the blur bleeds in. This is
 * what makes the tiles read as sitting down inside the tray.
 */
function innerShadow(
  ctx: CanvasRenderingContext2D,
  append: () => void,
  blur: number,
  offsetY: number,
  colour: string,
): void {
  ctx.save();
  ctx.beginPath();
  append();
  ctx.clip();

  // Fill everything *outside* the shape while clipped to the inside, so only
  // the blur bleeds in. `append` must add a subpath without resetting the
  // path, or the outer rectangle is lost and this fills solid.
  ctx.beginPath();
  ctx.rect(-2000, -2000, 6000, 6000);
  append();
  ctx.shadowColor = colour;
  ctx.shadowBlur = blur;
  ctx.shadowOffsetY = offsetY;
  ctx.fillStyle = 'rgba(0,0,0,1)';
  ctx.fill('evenodd');
  ctx.restore();
}

/* ------------------------------------------------------------------ board */

function drawTray(ctx: CanvasRenderingContext2D, level: Level, vp: Viewport, theme: Theme): void {
  const { cell, wall, originX, originY } = vp;
  const boardW = level.width * cell;
  const boardH = level.height * cell;
  const outer = Math.round(wall * 0.72);
  const slab = Math.max(5, Math.round(wall * 0.38));

  // The tray is a moulded part with thickness: a dark under-slab, then the
  // satin face on top of it.
  ctx.fillStyle = theme.trayEdge;
  box(ctx, originX - wall, originY - wall + slab, boardW + wall * 2, boardH + wall * 2, outer);
  ctx.fill();

  ctx.fillStyle = theme.tray;
  box(ctx, originX - wall, originY - wall, boardW + wall * 2, boardH + wall * 2, outer);
  ctx.fill();

  // Lit chamfer around the outside of the frame.
  ctx.save();
  box(ctx, originX - wall, originY - wall, boardW + wall * 2, boardH + wall * 2, outer);
  ctx.clip();
  ctx.strokeStyle = theme.trayLip;
  ctx.lineWidth = Math.max(2, wall * 0.14);
  ctx.beginPath();
  roundRectPath(ctx, originX - wall + 1, originY - wall + 1, boardW + wall * 2 - 2, boardH + wall * 2 - 2, {
    tl: outer,
    tr: outer,
    br: outer,
    bl: outer,
  });
  ctx.stroke();
  ctx.restore();
}

function drawFloor(ctx: CanvasRenderingContext2D, level: Level, vp: Viewport, theme: Theme): void {
  const { cell, wall, originX, originY } = vp;
  const boardW = level.width * cell;
  const boardH = level.height * cell;
  const radius = Math.round(cell * 0.14);
  const plate = (): void =>
    roundRectPath(ctx, originX, originY, boardW, boardH, {
      tl: radius,
      tr: radius,
      br: radius,
      bl: radius,
    });

  ctx.fillStyle = theme.floor;
  ctx.beginPath();
  plate();
  ctx.fill();

  // Rounded channels moulded between the pads, in place of ruled grid lines.
  // Both tones come off the floor colour, so a groove always reads as a
  // shallow recess in *this* surface rather than a line drawn on top of it.
  const grooveInk = shade(theme.floor, 0.36);
  const grooveLip = tint(theme.floor, 0.18);
  const groove = Math.max(3, Math.round(cell * 0.075));
  const half = groove / 2;
  ctx.save();
  ctx.beginPath();
  plate();
  ctx.clip();

  for (let x = 1; x < level.width; x++) {
    const gx = originX + x * cell - half;
    ctx.fillStyle = grooveInk;
    box(ctx, gx, originY, groove, boardH, half);
    ctx.fill();
    // Light catches the far wall of the channel.
    ctx.fillStyle = withAlpha(grooveLip, 0.6);
    box(ctx, gx + groove - 1.2, originY, 1.2, boardH, 0.6);
    ctx.fill();
  }

  for (let y = 1; y < level.height; y++) {
    const gy = originY + y * cell - half;
    ctx.fillStyle = grooveInk;
    box(ctx, originX, gy, boardW, groove, half);
    ctx.fill();
    ctx.fillStyle = withAlpha(grooveLip, 0.6);
    box(ctx, originX, gy + groove - 1.2, boardW, 1.2, 0.6);
    ctx.fill();
  }

  ctx.restore();

  // The frame casts down into the tray, so the pieces read as sitting inside.
  innerShadow(ctx, plate, wall * 0.8, wall * 0.2, 'rgba(0,0,0,0.55)');

  // Crisp lip where the floor meets the frame.
  ctx.save();
  ctx.beginPath();
  plate();
  ctx.clip();
  ctx.strokeStyle = withAlpha(theme.trayEdge, 0.9);
  ctx.lineWidth = 2;
  ctx.beginPath();
  plate();
  ctx.stroke();
  ctx.restore();
}

/* ------------------------------------------------------------------ gates */

/** A solid, moulded arrow with a lit top facet and a shaded underside. */
function mouldedArrow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  side: 'top' | 'bottom' | 'left' | 'right',
  face: string,
  lip: string,
  ink: string,
): void {
  const w = size;
  const h = size * 0.78;

  const trace = (dx: number, dy: number): void => {
    ctx.beginPath();
    if (side === 'top') {
      ctx.moveTo(cx + dx, cy - h * 0.62 + dy);
      ctx.lineTo(cx + w * 0.62 + dx, cy + h * 0.3 + dy);
      ctx.lineTo(cx + w * 0.24 + dx, cy + h * 0.3 + dy);
      ctx.lineTo(cx + w * 0.24 + dx, cy + h * 0.62 + dy);
      ctx.lineTo(cx - w * 0.24 + dx, cy + h * 0.62 + dy);
      ctx.lineTo(cx - w * 0.24 + dx, cy + h * 0.3 + dy);
      ctx.lineTo(cx - w * 0.62 + dx, cy + h * 0.3 + dy);
    } else if (side === 'bottom') {
      ctx.moveTo(cx + dx, cy + h * 0.62 + dy);
      ctx.lineTo(cx + w * 0.62 + dx, cy - h * 0.3 + dy);
      ctx.lineTo(cx + w * 0.24 + dx, cy - h * 0.3 + dy);
      ctx.lineTo(cx + w * 0.24 + dx, cy - h * 0.62 + dy);
      ctx.lineTo(cx - w * 0.24 + dx, cy - h * 0.62 + dy);
      ctx.lineTo(cx - w * 0.24 + dx, cy - h * 0.3 + dy);
      ctx.lineTo(cx - w * 0.62 + dx, cy - h * 0.3 + dy);
    } else if (side === 'left') {
      ctx.moveTo(cx - h * 0.62 + dx, cy + dy);
      ctx.lineTo(cx + h * 0.3 + dx, cy + w * 0.62 + dy);
      ctx.lineTo(cx + h * 0.3 + dx, cy + w * 0.24 + dy);
      ctx.lineTo(cx + h * 0.62 + dx, cy + w * 0.24 + dy);
      ctx.lineTo(cx + h * 0.62 + dx, cy - w * 0.24 + dy);
      ctx.lineTo(cx + h * 0.3 + dx, cy - w * 0.24 + dy);
      ctx.lineTo(cx + h * 0.3 + dx, cy - w * 0.62 + dy);
    } else {
      ctx.moveTo(cx + h * 0.62 + dx, cy + dy);
      ctx.lineTo(cx - h * 0.3 + dx, cy + w * 0.62 + dy);
      ctx.lineTo(cx - h * 0.3 + dx, cy + w * 0.24 + dy);
      ctx.lineTo(cx - h * 0.62 + dx, cy + w * 0.24 + dy);
      ctx.lineTo(cx - h * 0.62 + dx, cy - w * 0.24 + dy);
      ctx.lineTo(cx - h * 0.3 + dx, cy - w * 0.24 + dy);
      ctx.lineTo(cx - h * 0.3 + dx, cy - w * 0.62 + dy);
    }
    ctx.closePath();
  };

  const rise = Math.max(1.5, size * 0.1);

  // Light catching the lower wall of the impression, then the arrow itself
  // pressed into the lip above it.
  ctx.fillStyle = lip;
  trace(0, rise);
  ctx.fill();

  ctx.fillStyle = face;
  trace(0, 0);
  ctx.fill();

  // A darker core keeps the shape crisp at small sizes.
  ctx.save();
  trace(0, 0);
  ctx.clip();
  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(1, size * 0.08);
  trace(0, 0);
  ctx.stroke();
  ctx.restore();
}

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

  for (const gate of level.gates) {
    const colour = blockColour(gate.color);
    const horizontal = gate.side === 'top' || gate.side === 'bottom';
    const span = gate.length * cell;
    const inset = Math.max(2, cell * 0.05);

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

    const slotRadius = Math.max(3, wall * 0.24);
    const slot = (): void =>
      roundRectPath(ctx, sx, sy, sw, sh, {
        tl: slotRadius,
        tr: slotRadius,
        br: slotRadius,
        bl: slotRadius,
      });

    // An open cutout through the frame: dark inside, with the wall's own
    // shadow falling into it.
    ctx.fillStyle = theme.channel;
    ctx.beginPath();
    slot();
    ctx.fill();
    innerShadow(ctx, slot, wall * 0.45, wall * 0.12, 'rgba(0,0,0,0.7)');

    // The painted lip of the slot, seated below the frame's top face.
    const pad = Math.max(2, wall * 0.2);
    const bx = sx + (horizontal ? 0 : pad);
    const by = sy + (horizontal ? pad : 0);
    const bw = sw - (horizontal ? 0 : pad * 2);
    const bh = sh - (horizontal ? pad * 2 : 0);
    const barRadius = Math.max(2, slotRadius * 0.65);

    ctx.fillStyle = shade(colour, 0.3);
    box(ctx, bx, by, bw, bh, barRadius);
    ctx.fill();
    ctx.fillStyle = colour;
    box(ctx, bx, by, bw - (horizontal ? 0 : 1.5), bh - (horizontal ? 1.5 : 0), barRadius);
    ctx.fill();

    // A moulded arrow set into the lip, pointing out of the tray.
    mouldedArrow(
      ctx,
      bx + bw / 2,
      by + bh / 2,
      Math.min(bw, bh) * 0.8,
      gate.side,
      shade(colour, 0.42),
      tint(colour, 0.5),
      shade(colour, 0.6),
    );

    if (options.glyphs) {
      ctx.fillStyle = withAlpha(shade(colour, 0.62), 0.95);
      ctx.font = `800 ${Math.round(Math.min(bw, bh) * 0.36)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const offX = gate.side === 'left' ? -bw * 0.32 : gate.side === 'right' ? bw * 0.32 : 0;
      const offY = gate.side === 'top' ? -bh * 0.32 : gate.side === 'bottom' ? bh * 0.32 : 0;
      ctx.fillText(blockGlyph(gate.color), bx + bw / 2 + offX, by + bh / 2 + offY);
    }
  }
}

/* ------------------------------------------------------------------ tiles */

/**
 * Traces a whole block as one silhouette. Each cell contributes a rectangle
 * whose corners are rounded only where no neighbour adjoins, so a 2x2 reads
 * as a single moulded slab rather than four loose tiles.
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
  const radius = cell * 0.2;

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
  const inset = Math.max(2, Math.round(cell * 0.06));
  const depth = Math.max(3, Math.round(cell * DEPTH_RATIO));
  const bounds = blockBounds(block, vp, dx, dy);
  const highlighted = options.highlight?.includes(block.id) ?? false;
  const face = (): void => blockPath(ctx, block, vp, dx, dy, inset);

  // Contact shadow in the groove beneath the tile.
  ctx.save();
  ctx.globalAlpha = 0.34;
  ctx.fillStyle = '#000000';
  blockPath(ctx, block, vp, dx + depth * 0.3, dy + depth * 1.25, inset);
  ctx.fill();
  ctx.restore();

  // The moulded side wall: a solid darker slab, giving the tile thickness.
  ctx.fillStyle = shade(base, 0.44);
  blockPath(ctx, block, vp, dx, dy + depth, inset);
  ctx.fill();

  // Top face: one solid, smooth colour.
  ctx.fillStyle = base;
  face();
  ctx.fill();

  // A soft, broad top highlight - satin, not a candy sparkle.
  ctx.save();
  face();
  ctx.clip();
  const sheen = ctx.createLinearGradient(bounds.x, bounds.y, bounds.x, bounds.y + bounds.h * 0.62);
  sheen.addColorStop(0, 'rgba(255,255,255,0.24)');
  sheen.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h * 0.62);
  ctx.restore();

  // Crates are embossed obstacle pieces: raised ribs, each with a lit edge
  // and a shaded one, so they read as moulded rather than painted.
  if (isCrate) {
    ctx.save();
    face();
    ctx.clip();
    const step = Math.max(8, cell * 0.28);
    const rib = Math.max(2.5, cell * 0.09);
    for (let i = -bounds.h; i < bounds.w + bounds.h; i += step) {
      ctx.lineWidth = rib;
      ctx.strokeStyle = withAlpha(tint(base, 0.4), 0.55);
      ctx.beginPath();
      ctx.moveTo(bounds.x + i, bounds.y);
      ctx.lineTo(bounds.x + i + bounds.h, bounds.y + bounds.h);
      ctx.stroke();
      ctx.lineWidth = rib * 0.7;
      ctx.strokeStyle = withAlpha(shade(base, 0.45), 0.6);
      ctx.beginPath();
      ctx.moveTo(bounds.x + i + rib * 0.8, bounds.y);
      ctx.lineTo(bounds.x + i + rib * 0.8 + bounds.h, bounds.y + bounds.h);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Seams between the cells of one piece: still one object, but you can read
  // how many squares it covers.
  const cells = blockCells(block);
  ctx.save();
  face();
  ctx.clip();
  ctx.strokeStyle = withAlpha(shade(base, 0.32), 0.5);
  ctx.lineWidth = Math.max(1, cell * 0.02);
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

  // The crisp inset line just inside the edge - the moulded tile's own rim.
  ctx.save();
  face();
  ctx.clip();
  ctx.strokeStyle = withAlpha(tint(base, 0.5), 0.85);
  ctx.lineWidth = 1;
  blockPath(ctx, block, vp, dx + 1.5, dy + 1.5, inset + 1.5);
  ctx.stroke();
  ctx.restore();

  // Hard outline, so every tile stays legible against its neighbours.
  face();
  ctx.strokeStyle = withAlpha(shade(base, 0.58), 0.9);
  ctx.lineWidth = Math.max(1.2, cell * 0.025);
  ctx.stroke();

  if (highlighted) {
    const pulse = options.reduceMotion ? 1 : 0.55 + Math.sin(options.time * 5.5) * 0.45;
    face();
    ctx.strokeStyle = `rgba(255,255,255,${0.45 + pulse * 0.5})`;
    ctx.lineWidth = Math.max(2.5, cell * 0.07);
    ctx.stroke();
  }

  if (options.glyphs && !isCrate) {
    ctx.fillStyle = withAlpha(shade(base, 0.5), 0.7);
    ctx.font = `800 ${Math.round(cell * 0.36)}px system-ui, sans-serif`;
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
  drawFloor(ctx, level, vp, options.theme);
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
