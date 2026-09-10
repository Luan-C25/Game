/**
 * Writes the PWA/launcher icons as PNGs with no image dependencies - Node's
 * own zlib is enough to emit a valid file, which keeps the toolchain free and
 * the repository free of binary blobs that nobody can diff.
 *
 * Usage: node scripts/make-icons.ts
 */

import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = join(here, '..', 'public');

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

function png(size: number, pixels: Uint8Array): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  // Each scanline is prefixed with a filter byte; 0 means "no filter".
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    Buffer.from(pixels.buffer, y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function hex(value: string): [number, number, number] {
  const n = parseInt(value.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

/** The icon is the game itself: three blocks queued at a coloured gate. */
function draw(size: number): Uint8Array {
  const px = new Uint8Array(size * size * 4);
  // Matches the Sunrise theme: a warm vertical wash behind a light board.
  const skyTop = hex('#ffd9a8');
  const skyBottom = hex('#ff9ec4');
  const board = hex('#fffaf3');
  const boardEdge = hex('#f7b98f');

  const set = (x: number, y: number, [r, g, b]: [number, number, number]): void => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    px[i] = r;
    px[i + 1] = g;
    px[i + 2] = b;
    px[i + 3] = 255;
  };

  const rect = (x0: number, y0: number, w: number, h: number, colour: [number, number, number], radius = 0): void => {
    for (let y = y0; y < y0 + h; y++) {
      for (let x = x0; x < x0 + w; x++) {
        if (radius > 0) {
          const dx = Math.max(x0 + radius - x, x - (x0 + w - 1 - radius), 0);
          const dy = Math.max(y0 + radius - y, y - (y0 + h - 1 - radius), 0);
          if (dx * dx + dy * dy > radius * radius) continue;
        }
        set(x, y, colour);
      }
    }
  };

  for (let y = 0; y < size; y++) {
    const t = y / (size - 1);
    const row: [number, number, number] = [
      skyTop[0] + (skyBottom[0] - skyTop[0]) * t,
      skyTop[1] + (skyBottom[1] - skyTop[1]) * t,
      skyTop[2] + (skyBottom[2] - skyTop[2]) * t,
    ];
    for (let x = 0; x < size; x++) set(x, y, row);
  }

  const unit = size / 16;
  rect(Math.round(unit * 1.7), Math.round(unit * 1.7), Math.round(unit * 12.6), Math.round(unit * 12.6), boardEdge, Math.round(unit * 2));
  rect(Math.round(unit * 2.4), Math.round(unit * 2.4), Math.round(unit * 11.2), Math.round(unit * 11.2), board, Math.round(unit * 1.5));

  const blocks: Array<[number, number, number, number, string]> = [
    [3.4, 3.8, 2.8, 2.8, '#E69F00'],
    [7.6, 3.8, 2.8, 2.8, '#56B4E9'],
    [3.4, 7.9, 2.8, 2.8, '#009E73'],
    [7.6, 7.9, 2.8, 2.8, '#CC79A7'],
  ];
  for (const [x, y, w, h, colour] of blocks) {
    rect(
      Math.round(unit * x),
      Math.round(unit * y),
      Math.round(unit * w),
      Math.round(unit * h),
      hex(colour),
      Math.round(unit * 0.7),
    );
  }

  // The exit gate, cut into the right-hand wall.
  rect(Math.round(unit * 13.1), Math.round(unit * 3.8), Math.round(unit * 1.5), Math.round(unit * 2.8), hex('#E69F00'), Math.round(unit * 0.6));

  return px;
}

for (const size of [192, 512]) {
  const file = join(publicDir, `icon-${size}.png`);
  writeFileSync(file, png(size, draw(size)));
  console.log(`wrote ${file}`);
}
