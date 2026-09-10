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

/** The icon is the game itself: glazed tiles seated in a slate tray. */
function draw(size: number): Uint8Array {
  const px = new Uint8Array(size * size * 4);

  const set = (x: number, y: number, [r, g, b]: [number, number, number]): void => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    px[i] = r;
    px[i + 1] = g;
    px[i + 2] = b;
    px[i + 3] = 255;
  };

  const rect = (
    x0: number,
    y0: number,
    w: number,
    h: number,
    colour: [number, number, number],
    radius = 0,
  ): void => {
    for (let y = Math.round(y0); y < Math.round(y0 + h); y++) {
      for (let x = Math.round(x0); x < Math.round(x0 + w); x++) {
        if (radius > 0) {
          const dx = Math.max(x0 + radius - x, x - (x0 + w - 1 - radius), 0);
          const dy = Math.max(y0 + radius - y, y - (y0 + h - 1 - radius), 0);
          if (dx * dx + dy * dy > radius * radius) continue;
        }
        set(x, y, colour);
      }
    }
  };

  const unit = size / 16;
  rect(0, 0, size, size, hex('#20263a'));

  // Tray, with its own thickness under the face.
  rect(unit * 1.4, unit * 1.9, unit * 13.2, unit * 12.7, hex('#2b3342'), unit * 1.8);
  rect(unit * 1.4, unit * 1.4, unit * 13.2, unit * 12.7, hex('#515f73'), unit * 1.8);
  rect(unit * 2.5, unit * 2.5, unit * 11, unit * 11, hex('#161a26'), unit * 1);

  // Recessed wells behind the tiles.
  for (let gy = 0; gy < 2; gy++) {
    for (let gx = 0; gx < 2; gx++) {
      rect(unit * (2.9 + gx * 5.2), unit * (2.9 + gy * 5.2), unit * 4.8, unit * 4.8, hex('#252c3b'), unit * 0.7);
    }
  }

  // Four glaze tiles: a solid extruded side, then the flat top.
  const tiles: Array<[number, number, string]> = [
    [3.3, 3.3, '#E69F00'],
    [8.5, 3.3, '#56B4E9'],
    [3.3, 8.5, '#009E73'],
    [8.5, 8.5, '#CC79A7'],
  ];
  for (const [tx, ty, colour] of tiles) {
    const [r, g, b] = hex(colour);
    rect(unit * tx, unit * (ty + 0.5), unit * 4, unit * 4, [r * 0.58, g * 0.58, b * 0.58], unit * 0.7);
    rect(unit * tx, unit * ty, unit * 4, unit * 4, [r, g, b], unit * 0.7);
    // Lit chamfer along the top edge.
    rect(unit * (tx + 0.5), unit * (ty + 0.35), unit * 3, unit * 0.5, [
      r + (255 - r) * 0.45,
      g + (255 - g) * 0.45,
      b + (255 - b) * 0.45,
    ], unit * 0.25);
  }

  // One exit channel cut through the right-hand frame.
  rect(unit * 13.4, unit * 4, unit * 1.2, unit * 3.2, hex('#12151f'), unit * 0.5);
  rect(unit * 13.6, unit * 4.3, unit * 0.9, unit * 2.6, hex('#E69F00'), unit * 0.4);

  return px;
}

for (const size of [192, 512]) {
  const file = join(publicDir, `icon-${size}.png`);
  writeFileSync(file, png(size, draw(size)));
  console.log(`wrote ${file}`);
}
