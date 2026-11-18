/**
 * Generates every raster icon the project needs, using only Node's zlib - no
 * image dependencies, and no binary assets committed without a source that
 * produced them.
 *
 * Outputs:
 *   public/icon-192.png, icon-512.png     PWA / web manifest
 *   store/icon-512.png                    Play Store listing icon
 *   android res mipmap-<density> ic_launcher variants, all densities
 *
 * Usage: node scripts/make-icons.ts
 */

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

/* ------------------------------------------------------------------- png */

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buf) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function png(width: number, height: number, pixels: Uint8Array): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  // Each scanline carries a leading filter byte; 0 means "no filter".
  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    Buffer.from(pixels.buffer, y * width * 4, width * 4).copy(raw, y * (width * 4 + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ----------------------------------------------------------------- paint */

type RGB = [number, number, number];

function hex(value: string): RGB {
  const n = parseInt(value.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** A pixel buffer that starts fully transparent. */
class Surface {
  readonly px: Uint8Array;
  readonly width: number;
  readonly height: number;

  // Fields are declared explicitly rather than as constructor parameter
  // properties: Node runs this file by stripping types, which cannot emit the
  // assignments that shorthand implies.
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.px = new Uint8Array(width * height * 4);
  }

  set(x: number, y: number, colour: RGB, alpha = 255): void {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const i = (y * this.width + x) * 4;
    this.px[i] = Math.round(colour[0]);
    this.px[i + 1] = Math.round(colour[1]);
    this.px[i + 2] = Math.round(colour[2]);
    this.px[i + 3] = alpha;
  }

  fill(colour: RGB): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) this.set(x, y, colour);
    }
  }

  /** Rounded rectangle; `radius` of half the short side gives a circle. */
  rect(x0: number, y0: number, w: number, h: number, colour: RGB, radius = 0): void {
    for (let y = Math.round(y0); y < Math.round(y0 + h); y++) {
      for (let x = Math.round(x0); x < Math.round(x0 + w); x++) {
        if (radius > 0) {
          const dx = Math.max(x0 + radius - x, x - (x0 + w - 1 - radius), 0);
          const dy = Math.max(y0 + radius - y, y - (y0 + h - 1 - radius), 0);
          if (dx * dx + dy * dy > radius * radius) continue;
        }
        this.set(x, y, colour);
      }
    }
  }

  /** Clears everything outside a centred circle, for round launcher icons. */
  maskToCircle(): void {
    const r = this.width / 2;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const dx = x + 0.5 - r;
        const dy = y + 0.5 - r;
        if (dx * dx + dy * dy > r * r) this.px[(y * this.width + x) * 4 + 3] = 0;
      }
    }
  }
}

const BACKDROP = '#20263a';
const TILES: Array<[number, number, string]> = [
  [3.3, 3.3, '#E69F00'],
  [8.5, 3.3, '#56B4E9'],
  [3.3, 8.5, '#009E73'],
  [8.5, 8.5, '#CC79A7'],
];

/**
 * The icon is the game itself: glazed tiles seated in a slate tray, with one
 * exit channel cut through the frame.
 *
 * `inset` shrinks the artwork towards the centre. Adaptive-icon foregrounds
 * need it, because Android masks the outer third of the canvas away.
 */
function drawArt(s: Surface, inset: number): void {
  const size = s.width;
  const span = size * (1 - inset * 2);
  const unit = span / 16;
  const ox = size * inset;
  const oy = size * inset;
  const at = (n: number): number => ox + unit * n;
  const ay = (n: number): number => oy + unit * n;

  // Tray: a dark under-slab, then the satin face on top of it.
  s.rect(at(1.4), ay(1.9), unit * 13.2, unit * 12.7, hex('#2b3342'), unit * 1.8);
  s.rect(at(1.4), ay(1.4), unit * 13.2, unit * 12.7, hex('#515f73'), unit * 1.8);
  s.rect(at(2.5), ay(2.5), unit * 11, unit * 11, hex('#161a26'), unit * 1);

  // Recessed wells behind the tiles.
  for (let gy = 0; gy < 2; gy++) {
    for (let gx = 0; gx < 2; gx++) {
      s.rect(at(2.9 + gx * 5.2), ay(2.9 + gy * 5.2), unit * 4.8, unit * 4.8, hex('#252c3b'), unit * 0.7);
    }
  }

  // Tiles: a solid extruded side, the flat glaze, then a lit chamfer.
  for (const [tx, ty, colour] of TILES) {
    const base = hex(colour);
    s.rect(at(tx), ay(ty + 0.5), unit * 4, unit * 4, mix(base, [0, 0, 0], 0.42), unit * 0.7);
    s.rect(at(tx), ay(ty), unit * 4, unit * 4, base, unit * 0.7);
    s.rect(at(tx + 0.5), ay(ty + 0.35), unit * 3, unit * 0.5, mix(base, [255, 255, 255], 0.45), unit * 0.25);
  }

  // The exit channel, cut through the right-hand frame.
  s.rect(at(13.4), ay(4), unit * 1.2, unit * 3.2, hex('#12151f'), unit * 0.5);
  s.rect(at(13.6), ay(4.3), unit * 0.9, unit * 2.6, hex('#E69F00'), unit * 0.4);
}

type Variant = 'square' | 'round' | 'foreground';

function icon(size: number, variant: Variant): Buffer {
  const s = new Surface(size, size);
  if (variant !== 'foreground') s.fill(hex(BACKDROP));
  // The adaptive foreground sits inside the safe zone Android does not mask.
  drawArt(s, variant === 'foreground' ? 0.19 : 0.02);
  if (variant === 'round') s.maskToCircle();
  return png(size, size, s.px);
}

function write(path: string, data: Buffer): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, data);
  console.log(`wrote ${path.replace(root + '/', '')} (${data.length} bytes)`);
}

/* ---------------------------------------------------------------- output */

for (const size of [192, 512]) {
  write(join(root, 'public', `icon-${size}.png`), icon(size, 'square'));
}

// Play Store listing icon: 512x512, square, no transparency.
write(join(root, 'store', 'icon-512.png'), icon(512, 'square'));

// Android launcher. Legacy icons are 48dp; adaptive foregrounds are 108dp.
const densities: Array<[string, number, number]> = [
  ['mdpi', 48, 108],
  ['hdpi', 72, 162],
  ['xhdpi', 96, 216],
  ['xxhdpi', 144, 324],
  ['xxxhdpi', 192, 432],
];

const res = join(root, 'android', 'app', 'src', 'main', 'res');
for (const [density, legacy, adaptive] of densities) {
  write(join(res, `mipmap-${density}`, 'ic_launcher.png'), icon(legacy, 'square'));
  write(join(res, `mipmap-${density}`, 'ic_launcher_round.png'), icon(legacy, 'round'));
  write(join(res, `mipmap-${density}`, 'ic_launcher_foreground.png'), icon(adaptive, 'foreground'));
}
