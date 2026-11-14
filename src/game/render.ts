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
import type { GlazeId } from './cosmetics.ts';
import type { Particles } from './particles.ts';
import { blockColour, blockGlyph, shade, tint, withAlpha, type GlyphShape, type Theme } from './theme.ts';

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
  /** Tile finish. Defaults to 'gloss', which is the original look. */
  glaze?: GlazeId;
}

/**
 * Backing-store pixels per CSS pixel. Capped at 2: a 3.5x phone would push
 * about three times the pixels of the cap for no difference anyone can see.
 */
export function canvasScale(): number {
  return Math.min(2, window.devicePixelRatio || 1);
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

/* ----------------------------------------------------------------- glyphs */

/** Fills one colour-blind shape, `size` across, centred on (cx, cy). */
function drawGlyph(
  ctx: CanvasRenderingContext2D,
  shape: GlyphShape,
  cx: number,
  cy: number,
  size: number,
  fill: string,
): void {
  const r = size / 2;
  ctx.fillStyle = fill;
  ctx.beginPath();
  switch (shape) {
    case 'circle':
      ctx.arc(cx, cy, r * 0.82, 0, Math.PI * 2);
      break;
    case 'triangle':
      ctx.moveTo(cx, cy - r * 0.92);
      ctx.lineTo(cx + r, cy + r * 0.78);
      ctx.lineTo(cx - r, cy + r * 0.78);
      break;
    case 'square':
      ctx.rect(cx - r * 0.74, cy - r * 0.74, r * 1.48, r * 1.48);
      break;
    case 'diamond':
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r * 0.8, cy);
      ctx.lineTo(cx, cy + r);
      ctx.lineTo(cx - r * 0.8, cy);
      break;
    case 'star':
      for (let i = 0; i < 10; i++) {
        const radius = i % 2 === 0 ? r : r * 0.45;
        const angle = -Math.PI / 2 + (i * Math.PI) / 5;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius + r * 0.08;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      break;
    case 'cross': {
      const arm = r * 0.34;
      ctx.rect(cx - arm, cy - r * 0.9, arm * 2, r * 1.8);
      ctx.rect(cx - r * 0.9, cy - arm, r * 1.8, arm * 2);
      break;
    }
  }
  ctx.closePath();
  ctx.fill('nonzero');
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

    // A moulded arrow set into the lip, pointing out of the tray. With
    // shapes on, the arrow moves along the lip to make room for the gate's
    // shape beside it, the same shape its blocks carry.
    const thickness = Math.min(bw, bh);
    const length = Math.max(bw, bh);
    const spread = options.glyphs ? Math.min(length * 0.2, thickness * 0.95) : 0;
    const ax = bx + bw / 2 - (horizontal ? spread : 0);
    const ay = by + bh / 2 - (horizontal ? 0 : spread);
    mouldedArrow(
      ctx,
      ax,
      ay,
      thickness * 0.8,
      gate.side,
      shade(colour, 0.42),
      tint(colour, 0.5),
      shade(colour, 0.6),
    );

    if (options.glyphs) {
      const gx = bx + bw / 2 + (horizontal ? spread : 0);
      const gy = by + bh / 2 + (horizontal ? 0 : spread);
      drawGlyph(ctx, blockGlyph(gate.color), gx, gy, thickness * 0.72, shade(colour, 0.6));
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

/* ----------------------------------------------------------- glaze finishes */

type Bounds = ReturnType<typeof blockBounds>;

/** mulberry32: a tiny seeded generator, so patterns never use Math.random. */
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

interface Fleck {
  x: number;
  y: number;
  r: number;
  light: boolean;
}

const FLECKS_PER_CELL = 15;
const speckleCache = new Map<string, Fleck[]>();

/** Fleck positions in unit coordinates, per block id and cell count. Built once. */
function flecksFor(block: Block, cellCount: number): Fleck[] {
  const key = block.id + ':' + cellCount;
  let list = speckleCache.get(key);
  if (!list) {
    const r = seededRng(block.id * 7919 + 13);
    list = [];
    for (let c = 0; c < cellCount; c++) {
      for (let i = 0; i < FLECKS_PER_CELL; i++) {
        list.push({ x: 0.15 + r() * 0.7, y: 0.17 + r() * 0.66, r: 0.016 + r() * 0.02, light: i >= 10 });
      }
    }
    speckleCache.set(key, list);
  }
  return list;
}

/** One fixed crack template in unit coordinates; blocks pick a variant of it. */
const CRACKLE: number[][][] = [
  [[0.06, 0.34], [0.3, 0.42], [0.46, 0.3], [0.72, 0.38], [0.94, 0.27]],
  [[0.46, 0.3], [0.53, 0.08]],
  [[0.3, 0.42], [0.26, 0.7], [0.52, 0.78], [0.62, 0.96]],
  [[0.72, 0.38], [0.66, 0.62], [0.9, 0.76]],
  [[0.26, 0.7], [0.06, 0.82]],
  [[0.52, 0.78], [0.78, 0.88]],
];

/** The eight variants (4 rotations, optional mirror) as ready-made point lists. */
const CRACKLE_VARIANTS: number[][][][] = [];
for (let v = 0; v < 8; v++) {
  CRACKLE_VARIANTS.push(
    CRACKLE.map((line) =>
      line.map(([px, py]) => {
        let x = px;
        let y = py;
        if (v >> 2) x = 1 - x;
        for (let i = 0; i < (v & 3); i++) {
          const t = x;
          x = 1 - y;
          y = t;
        }
        return [x, y];
      }),
    ),
  );
}

function fillPill(
  ctx: CanvasRenderingContext2D,
  b: Bounds,
  fx: number,
  fy: number,
  fw: number,
  fh: number,
  fill: string,
): void {
  const w = fw * b.w;
  const h = fh * b.h;
  ctx.fillStyle = fill;
  roundRectPath(ctx, b.x + fx * b.w, b.y + fy * b.h, w, h, { tl: h / 2, tr: h / 2, br: h / 2, bl: h / 2 });
  ctx.fill();
}

/**
 * Draws one non-gloss finish over the flat base colour, clipped to the face.
 * Everything is a flat fill or hairline stroke in a fixed tint or shade of
 * the tile's own colour, so the colour (and the glyph drawn after) is never
 * disturbed. Patterns are seeded from the block id, so they hold still.
 */
function drawGlazeLayer(
  ctx: CanvasRenderingContext2D,
  glaze: GlazeId,
  block: Block,
  vp: Viewport,
  b: Bounds,
  base: string,
  dx: number,
  dy: number,
  face: () => void,
  inset: number,
): void {
  const { cell } = vp;
  const cells = blockCells(block);
  ctx.save();
  face();
  ctx.clip();

  if (glaze === 'speckled') {
    fillPill(ctx, b, 0.13, 0.11, 0.3, 0.1, 'rgba(255,255,255,0.32)');
    const flecks = flecksFor(block, cells.length);
    for (const light of [false, true]) {
      ctx.fillStyle = light ? withAlpha(tint(base, 0.55), 0.75) : withAlpha(shade(base, 0.32), 0.6);
      ctx.beginPath();
      for (let ci = 0; ci < cells.length; ci++) {
        const cx = vp.originX + cells[ci].x * cell + dx;
        const cy = vp.originY + cells[ci].y * cell + dy;
        for (let i = 0; i < FLECKS_PER_CELL; i++) {
          const f = flecks[ci * FLECKS_PER_CELL + i];
          if (f.light !== light) continue;
          const px = cx + f.x * cell;
          const py = cy + f.y * cell;
          const rr = Math.max(0.9, f.r * cell);
          ctx.moveTo(px + rr, py);
          ctx.arc(px, py, rr, 0, Math.PI * 2);
        }
      }
      ctx.fill();
    }
  } else if (glaze === 'crackle') {
    fillPill(ctx, b, 0.13, 0.11, 0.34, 0.11, 'rgba(255,255,255,0.4)');
    const lines = CRACKLE_VARIANTS[block.id % 8];
    ctx.strokeStyle = withAlpha(shade(base, 0.38), 0.55);
    ctx.lineWidth = Math.max(0.8, cell * 0.016);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (const c of cells) {
      const cx = vp.originX + c.x * cell + dx;
      const cy = vp.originY + c.y * cell + dy;
      for (const line of lines) {
        for (let i = 0; i < line.length; i++) {
          const px = cx + line[i][0] * cell;
          const py = cy + line[i][1] * cell;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
      }
    }
    ctx.stroke();
  } else if (glaze === 'matte') {
    // No shine: a pressed-in inset, dark on the top-left, light on the bottom-right.
    const sh = Math.max(1.4, cell * 0.04);
    ctx.lineWidth = sh * 2;
    ctx.strokeStyle = withAlpha(shade(base, 0.3), 0.38);
    blockPath(ctx, block, vp, dx + sh, dy + sh, inset);
    ctx.stroke();
    ctx.strokeStyle = withAlpha(tint(base, 0.35), 0.3);
    blockPath(ctx, block, vp, dx - sh, dy - sh, inset);
    ctx.stroke();
  }
  ctx.restore();
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

  // The finish layer. Crates and the default gloss keep the original satin
  // sheen; the other glazes draw flat shapes only (no gradients).
  const glaze: GlazeId = isCrate ? 'gloss' : (options.glaze ?? 'gloss');
  if (glaze === 'gloss') {
    ctx.save();
    face();
    ctx.clip();
    const sheen = ctx.createLinearGradient(bounds.x, bounds.y, bounds.x, bounds.y + bounds.h * 0.62);
    sheen.addColorStop(0, 'rgba(255,255,255,0.24)');
    sheen.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sheen;
    ctx.fillRect(bounds.x, bounds.y, bounds.w, bounds.h * 0.62);
    ctx.restore();
  } else {
    drawGlazeLayer(ctx, glaze, block, vp, bounds, base, dx, dy, face, inset);
  }

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
  // Matte skips it: it has its own pressed-in inset instead.
  if (glaze !== 'matte') {
    ctx.save();
    face();
    ctx.clip();
    ctx.strokeStyle = withAlpha(tint(base, 0.5), 0.85);
    ctx.lineWidth = 1;
    blockPath(ctx, block, vp, dx + 1.5, dy + 1.5, inset + 1.5);
    ctx.stroke();
    ctx.restore();
  }

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
    drawGlyph(ctx, blockGlyph(block.color), bounds.cx, bounds.cy, cell * 0.34, withAlpha(shade(base, 0.5), 0.75));
  }
}

/* ----------------------------------------------------------- static layer */

/**
 * The tray, floor and gates never change during a level, and they carry
 * every `shadowBlur` on the board - the costliest thing to paint on a weak
 * GPU. They are painted once into an offscreen layer and copied in on each
 * frame; only the tiles and the effects are drawn live.
 */
interface StaticLayer {
  key: string;
  level: Level;
  canvas: HTMLCanvasElement;
  bitmap: ImageBitmap | null;
}

let staticLayer: StaticLayer | null = null;

/** Forces the next frame to repaint the static layer, e.g. after the app resumes. */
export function invalidateStaticLayer(): void {
  staticLayer?.bitmap?.close();
  staticLayer = null;
}

function staticLayerFor(
  ctx: CanvasRenderingContext2D,
  level: Level,
  vp: Viewport,
  options: RenderOptions,
  dpr: number,
): CanvasImageSource {
  const { width, height } = ctx.canvas;
  const key = [width, height, dpr, vp.cell, vp.wall, vp.originX, vp.originY, options.theme.id, options.glyphs].join('|');
  if (staticLayer && staticLayer.level === level && staticLayer.key === key) {
    return staticLayer.bitmap ?? staticLayer.canvas;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const layer = canvas.getContext('2d');
  if (!layer) throw new Error('canvas 2d context unavailable');
  layer.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawTray(layer, level, vp, options.theme);
  drawFloor(layer, level, vp, options.theme);
  drawGates(layer, level, vp, options);

  invalidateStaticLayer();
  const entry: StaticLayer = { key, level, canvas, bitmap: null };
  staticLayer = entry;

  // A canvas used as an image source may be uploaded to the GPU again on
  // every draw; an ImageBitmap stays put. The canvas stands in until it is ready.
  if (typeof createImageBitmap === 'function') {
    createImageBitmap(canvas)
      .then((bitmap) => {
        if (staticLayer === entry) entry.bitmap = bitmap;
        else bitmap.close();
      })
      .catch(() => {});
  }
  return canvas;
}

/* ------------------------------------------------------------------ frame */

export function render(
  ctx: CanvasRenderingContext2D,
  level: Level,
  vp: Viewport,
  options: RenderOptions,
): void {
  const dpr = canvasScale();
  const cssWidth = ctx.canvas.width / dpr;
  const cssHeight = ctx.canvas.height / dpr;
  ctx.clearRect(0, 0, cssWidth, cssHeight);
  ctx.drawImage(staticLayerFor(ctx, level, vp, options, dpr), 0, 0, cssWidth, cssHeight);

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
