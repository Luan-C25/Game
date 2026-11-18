// Builds the twelve Glazeway characters (map and side sizes), characters.json, manifest.json.
// Run: node design/depth/build-characters.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TILES, shade, tint, f, shadow } from '../maps/kit.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), 'characters');
mkdirSync(OUT, { recursive: true });

const SKIN = '#f2c29b', INK = '#3a2a22', BOOT = '#6f452c';
const e = (cx, cy, rx, ry, fill, rot = 0, op = 1) => `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${fill}"${op < 1 ? ` opacity="${op}"` : ''}${rot ? ` transform="rotate(${rot} ${f(cx)} ${f(cy)})"` : ''}/>`;
const r = (x, y, w, h, rx, fill) => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(rx)}" fill="${fill}"/>`;
const c = (x, y, rad, fill) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(rad)}" fill="${fill}"/>`;
const p = (pts, fill) => `<polygon points="${pts.map((q) => q.join(',')).join(' ')}" fill="${fill}" stroke="${fill}" stroke-width="1.2" stroke-linejoin="round"/>`;
const ln = (x1, y1, x2, y2, w, s) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${s}" stroke-width="${w}" stroke-linecap="round"/>`;
// ellipse with a darker underside and one highlight
const blob = (cx, cy, rx, ry, col, rot = 0) => e(cx, cy + 1.2, rx, ry, shade(col, 0.25), rot) + e(cx, cy, rx, ry, col, rot) + e(cx - rx * 0.4, cy - ry * 0.45, rx * 0.28, ry * 0.2, tint(col, 0.45), rot);
const ground = (rx = 11) => shadow(16, 37.2, rx, 2.4);
const eyes = (x1, x2, y, rad = 1.1) => c(x1, y, rad, INK) + c(x2, y, rad, INK) + c(x1 - 0.35, y - 0.4, rad * 0.35, '#fff') + c(x2 - 0.35, y - 0.4, rad * 0.35, '#fff');
const smile = (x, y, w = 2.6) => `<path d="M${f(x - w)} ${f(y)} Q${x} ${f(y + 2.2)} ${f(x + w)} ${f(y)}" fill="none" stroke="${INK}" stroke-width="1" stroke-linecap="round"/>`;
const cheeks = (x1, x2, y) => e(x1, y, 1.6, 1, '#f08a7a') + e(x2, y, 1.6, 1, '#f08a7a');

// A small standing villager.
function person(o) {
  const skin = o.skin || SKIN;
  let s = ground();
  s += r(11, 33.5, 4.8, 3.6, 1.6, shade(BOOT, 0.2)) + r(16.4, 33.5, 4.8, 3.6, 1.6, shade(BOOT, 0.2)) + r(11, 32.8, 4.8, 3.6, 1.6, BOOT) + r(16.4, 32.8, 4.8, 3.6, 1.6, BOOT);
  s += r(9, 20.2, 14, 14.5, 6, shade(o.shirt, 0.25)) + r(9, 19, 14, 14.5, 6, o.shirt) + r(11, 20.5, 3, 7, 1.5, tint(o.shirt, 0.4));
  s += o.under || '';
  s += blob(8, 26, 2.4, 3.2, o.shirt, 10) + blob(24, 26, 2.4, 3.2, o.shirt, -10);
  s += c(8.4, 29.2, 1.8, skin) + c(23.6, 29.2, 1.8, skin);
  s += c(16, 14.2, 7.2, shade(skin, 0.2)) + c(16, 13.2, 7.2, skin) + e(13.2, 10.6, 2, 1.2, tint(skin, 0.5));
  s += (o.face || '') + eyes(13, 19, 13.6) + smile(16, 16.4, 2.2) + cheeks(10.8, 21.2, 15.8);
  s += o.beard || '';
  s += o.hat || '';
  return s;
}
const strawHat = (col) => e(16, 8.8, 11, 2.8, shade(col, 0.25)) + e(16, 8, 11, 2.8, col) + `<path d="M10 8 Q10 1.6 16 1.6 Q22 1.6 22 8 Z" fill="${col}"/>` + r(10.4, 6, 11.2, 1.8, 0.9, '#c9673f') + e(13, 3.8, 1.8, 1, tint(col, 0.5));
const pot = (x, y, s, col) => e(x, y, 4.4 * s, 4.6 * s, shade(col, 0.28)) + e(x - 0.3, y - 0.6, 4.2 * s, 4.5 * s, col) + r(x - 2.2 * s, y - 6.8 * s, 4.4 * s, 3 * s, 1, col) + r(x - 3 * s, y - 7.6 * s, 6 * s, 1.8 * s, 0.9, shade(col, 0.28)) + r(x - 3 * s, y - 2.4 * s, 1.4 * s, 3.4 * s, 0.7, tint(col, 0.5));

const CH = {};

CH.potter = (side) => person({
  shirt: '#f4ead2',
  under: r(11, 23, 10, 11, 3.5, shade('#d9764a', 0.25)) + r(11, 22, 10, 11, 3.5, '#d9764a') + r(12, 23, 2.4, 6, 1.2, '#eb9468') + (side ? r(13.5, 26.5, 5, 3.6, 1.4, shade('#d9764a', 0.2)) : ''),
  hat: r(9.2, 6.2, 13.6, 3.2, 1.6, shade('#CC79A7', 0.2)) + r(9.2, 5.4, 13.6, 3.2, 1.6, '#CC79A7') + r(10.6, 5.8, 4, 1, 0.5, tint('#CC79A7', 0.5)),
  face: side ? e(21, 17, 1.4, 0.9, '#b4552f') : '',
}) + (side ? pot(26.5, 24.5, 1.1, '#56B4E9') : pot(26.5, 26, 0.9, '#56B4E9'));

CH.duck = (side) => {
  let s = ground();
  s += p([[5, 25], [1.5, 20], [8, 23]], shade('#ffcc33', 0.2)) + p([[5, 24], [1.5, 19.4], [8, 22]], '#ffcc33');
  s += r(10, 33, 2.4, 3.4, 1, '#d9822b') + r(17, 33, 2.4, 3.4, 1, '#d9822b') + e(10.8, 36.6, 3, 1.2, '#d9822b') + e(18.2, 36.6, 3, 1.2, '#d9822b');
  s += blob(15, 28, 10, 7.8, '#ffcc33') + blob(13, 28.5, 5, 3.6, '#f2b01e', -15);
  s += blob(20.5, 15.5, 6.4, 6.2, '#ffcc33');
  s += blob(26.8, 17.4, 3.6, 1.9, '#e8812b') + c(21.8, 14, 1.2, INK) + c(21.4, 13.6, 0.4, '#fff') + e(19, 17, 1.5, 0.9, '#f08a7a');
  if (side) s += p([[16, 21], [20, 21], [18, 24.4]], '#CC79A7') + p([[20, 21], [24, 21], [22, 24.4]], shade('#CC79A7', 0.15)) + c(20, 21, 1.1, '#CC79A7');
  return s;
};

CH.dog = (side) => {
  let s = ground();
  s += `<path d="M24 31 Q31 30 29.6 22" fill="none" stroke="${shade('#b87a45', 0.25)}" stroke-width="3.6" stroke-linecap="round"/><path d="M24 30 Q30.4 29 29 22.4" fill="none" stroke="#b87a45" stroke-width="3.4" stroke-linecap="round"/>`;
  s += blob(15.5, 28, 8.2, 8.6, '#b87a45') + e(15.5, 30.5, 4.6, 5.6, '#f3dcb2');
  s += r(9.6, 34, 4.6, 3.2, 1.6, '#f3dcb2') + r(17.4, 34, 4.6, 3.2, 1.6, '#f3dcb2');
  s += blob(16, 14.5, 7.6, 7, '#b87a45');
  s += blob(8.6, 15, 2.8, 5.6, '#7a4d31', 14) + blob(23.6, 15, 2.8, 5.6, '#7a4d31', -14);
  s += e(16, 17.6, 4.4, 3.2, '#f3dcb2') + e(16, 15.6, 1.9, 1.3, INK) + eyes(12.8, 19.2, 12.6);
  s += `<path d="M13.8 18.6 Q16 20.4 18.2 18.6" fill="none" stroke="${INK}" stroke-width="0.9" stroke-linecap="round"/>`;
  if (side) s += e(16, 21, 1.5, 2, '#f0728a') + r(10.4, 22.6, 11.2, 2.4, 1.2, shade(TILES[5], 0.2)) + r(10.4, 22, 11.2, 2.4, 1.2, TILES[5]) + c(16, 25.6, 1.4, '#ffcc33');
  return s;
};

CH.cat = (side) => {
  let s = ground();
  s += `<path d="M23 33 Q31.5 34 30.5 25 Q30 22 27.6 23" fill="none" stroke="${shade('#E69F00', 0.25)}" stroke-width="3.8" stroke-linecap="round"/><path d="M23 32 Q30.6 33 29.6 25.4 Q29 22.8 27.6 23.2" fill="none" stroke="#E69F00" stroke-width="3.6" stroke-linecap="round"/>`;
  s += blob(15.5, 28.5, 8, 8.2, '#E69F00');
  s += r(9.6, 34, 4.6, 3.2, 1.6, '#fff1d6') + r(17.4, 34, 4.6, 3.2, 1.6, '#fff1d6');
  s += r(11.5, 24, 1.8, 4.6, 0.9, shade('#E69F00', 0.28)) + r(18.5, 24, 1.8, 4.6, 0.9, shade('#E69F00', 0.28));
  s += p([[8.6, 11], [9, 3.6], [14.2, 8.6]], shade('#E69F00', 0.25)) + p([[23.4, 11], [23, 3.6], [17.8, 8.6]], shade('#E69F00', 0.25));
  s += p([[9.2, 10.2], [9.6, 4.6], [13.4, 8.4]], '#E69F00') + p([[22.8, 10.2], [22.4, 4.6], [18.6, 8.4]], '#E69F00') + p([[10.4, 8.8], [10.6, 6.6], [12, 8]], '#f4a0a8');
  s += blob(16, 14.5, 7.8, 6.6, '#E69F00') + r(15, 8.4, 2, 3.4, 1, shade('#E69F00', 0.28)) + r(11.2, 9.4, 1.6, 2.6, 0.8, shade('#E69F00', 0.28)) + r(19.2, 9.4, 1.6, 2.6, 0.8, shade('#E69F00', 0.28));
  s += eyes(12.6, 19.4, 14, 1.2) + p([[15.1, 16], [16.9, 16], [16, 17.1]], '#f08a7a') + `<path d="M16 17.1 Q14.6 18.8 13.2 17.8 M16 17.1 Q17.4 18.8 18.8 17.8" fill="none" stroke="${INK}" stroke-width="0.8" stroke-linecap="round"/>`;
  if (side) s += ln(7, 16.4, 11.6, 16.8, 0.6, INK) + ln(7, 18.4, 11.6, 17.8, 0.6, INK) + ln(25, 16.4, 20.4, 16.8, 0.6, INK) + ln(25, 18.4, 20.4, 17.8, 0.6, INK) + r(11, 21.8, 10, 2.2, 1.1, shade(TILES[3], 0.2)) + r(11, 21.2, 10, 2.2, 1.1, TILES[3]) + c(16, 25, 1.5, '#ffcc33') + c(15.6, 24.6, 0.5, '#fff1d6');
  return s;
};

CH.scarecrow = (side) => {
  let s = ground(9);
  s += r(14.4, 12, 3.4, 25, 1.4, shade('#8a5a3c', 0.2)) + r(14.2, 12, 3, 25, 1.4, '#8a5a3c');
  s += r(2.4, 21.6, 27.2, 3.4, 1.7, shade('#8a5a3c', 0.2)) + r(2.4, 20.8, 27.2, 3.4, 1.7, '#8a5a3c');
  s += r(8.4, 20.6, 15.2, 12, 4, shade(TILES[4], 0.3)) + r(8.4, 19.6, 15.2, 12, 4, TILES[4]) + r(10, 22, 3, 7, 1.5, tint(TILES[4], 0.4));
  s += r(13.4, 24, 5.4, 5.4, 1.2, '#fff1d6') + r(14.2, 24.8, 3.8, 3.8, 0.8, '#E69F00');
  for (const x of [2.4, 29.6]) s += `<path d="M${x} 24.4 l-1.6 3.8 M${x} 24.4 l0 4.4 M${x} 24.4 l1.6 3.8" stroke="#e8c46a" stroke-width="1.2" stroke-linecap="round" fill="none"/>`;
  s += `<path d="M12 32 l-1.6 4 M16 32.4 l0 4.4 M20 32 l1.6 4" stroke="#e8c46a" stroke-width="1.3" stroke-linecap="round" fill="none"/>`;
  s += c(16, 14.2, 6.8, shade('#e3c08a', 0.2)) + c(16, 13.2, 6.8, '#e3c08a') + e(13.4, 10.8, 1.8, 1.1, tint('#e3c08a', 0.5));
  s += c(13, 13, 1.1, INK) + c(19, 13, 1.1, INK) + `<path d="M12.6 16.6 L19.4 16.6" stroke="${INK}" stroke-width="1" stroke-dasharray="1.4 1.2"/>` + cheeks(10.8, 21.2, 15.4);
  s += strawHat('#e8c46a');
  if (side) s += blob(26.4, 18.6, 2.6, 2.1, '#3a3f4a') + p([[28.6, 18.2], [31.4, 18.8], [28.6, 19.6]], '#E69F00') + c(27.2, 17.8, 0.5, '#fff') + p([[23.6, 19.4], [20.6, 21], [24.2, 20.8]], '#3a3f4a');
  return s;
};

CH.ferrycaptain = (side) => person({
  shirt: '#1d4e89',
  under: r(15.2, 21, 1.6, 12, 0.8, '#ffd556') + c(13.6, 25, 0.9, '#ffd556') + c(18.4, 25, 0.9, '#ffd556') + c(13.6, 29, 0.9, '#ffd556') + c(18.4, 29, 0.9, '#ffd556'),
  beard: `<path d="M9.8 15 Q16 24.4 22.2 15 Q22 19 16 20.6 Q10 19 9.8 15 Z" fill="#e9eef2"/>` + smile(16, 17.4, 1.6),
  hat: e(16, 9.4, 9, 1.4, shade('#1b2a4a', 0.3)) + `<path d="M8.6 8.6 Q9 2 16 2 Q23 2 23.4 8.6 Z" fill="#ffffff"/><path d="M8.4 8.6 L23.6 8.6 L23.2 6.6 L8.8 6.6 Z" fill="#1b2a4a"/>` + c(16, 5.2, 1.6, '#ffd556') + e(12.4, 4, 2, 1, '#e9eef2'),
}) + (side ? c(26, 27, 3.8, '#ffffff') + `<path d="M26 23.2 A3.8 3.8 0 0 1 29.8 27 L27.9 27 A1.9 1.9 0 0 0 26 25.1 Z M26 30.8 A3.8 3.8 0 0 1 22.2 27 L24.1 27 A1.9 1.9 0 0 0 26 28.9 Z" fill="#D55E00"/><circle cx="26" cy="27" r="1.9" fill="#bfeaf8"/>` : '');

CH.lanternkeeper = (side) => {
  let s = r(25.4, 6, 1.6, 31, 0.8, shade('#7a4d31', 0.1));
  s += person({
    shirt: '#5a3d7a',
    under: r(9, 31, 14, 3.6, 1.8, '#d9a93c') + r(9, 30.4, 14, 3.4, 1.6, '#ffe08a'),
    hat: `<path d="M16 -1 L24 9.4 L8 9.4 Z" fill="${shade('#5a3d7a', 0.3)}"/><path d="M16 -2 L23 8.6 L9 8.6 Z" fill="#7a55a0"/>` + e(16, 9.6, 9, 1.6, shade('#5a3d7a', 0.3)) + e(16, 8.8, 9, 1.6, '#5a3d7a') + e(13, 4.4, 1, 2.6, tint('#7a55a0', 0.5), 20),
  });
  s += `<path d="M22.4 25 L25.4 21" stroke="${SKIN}" stroke-width="2.6" stroke-linecap="round"/>`;
  s += e(26.2, 7, 5.6, 6.6, '#ffd556', 0, 0.3);
  s += r(22.6, 3.6, 7.2, 8.4, 2, shade('#D55E00', 0.25)) + r(22.6, 2.8, 7.2, 8.4, 2, '#D55E00') + r(24, 4.2, 4.4, 5.2, 1.6, '#ffe08a') + r(24.4, 4.4, 1.4, 3, 0.7, '#fff6d0') + r(23.4, 1.2, 5.6, 2, 1, shade('#D55E00', 0.25));
  if (side) s += c(26.2, 7.2, 1.5, '#ffb347');
  return s;
};

CH.kilnmaster = (side) => person({
  shirt: '#d9d4cc', skin: '#e8b48a',
  under: r(10.5, 22.6, 11, 11.4, 3.5, shade('#b4552f', 0.2)) + r(10.5, 21.6, 11, 11.4, 3.5, '#8f4226') + r(12, 22.6, 2.4, 6, 1.2, '#b4552f') + r(11.5, 25, 9, 1.4, 0.7, '#5a2a18'),
  face: e(12.4, 15, 1.4, 0.8, '#5a4a40') + e(20, 11, 1.2, 0.7, '#5a4a40'),
  beard: `<path d="M11 16 Q13.4 14.4 16 16.2 Q18.6 14.4 21 16 Q20 18.6 16 17.6 Q12 18.6 11 16 Z" fill="${shade('#7a4d31', 0.1)}"/><path d="M11.4 15.8 Q13.4 14.6 16 16 Q18.6 14.6 20.6 15.8 Q19.6 17.8 16 17 Q12.4 17.8 11.4 15.8 Z" fill="#7a4d31"/>`,
  hat: r(9.6, 5.2, 12.8, 5, 2.4, '#6f6558') + r(9.6, 4.4, 12.8, 5, 2.4, '#8a7f70') + r(11, 4.8, 4, 1, 0.5, tint('#8a7f70', 0.5)) + r(8.6, 8.4, 14.8, 2.2, 1.1, shade('#8a7f70', 0.3)) + r(13, 7.2, 6, 2.4, 1.2, TILES[5]),
}) + (side ? ln(26, 30, 26, 18, 1, '#5a5f6a') + blob(26, 17, 3.2, 2.2, '#ffb347') + blob(26, 17.2, 1.8, 1.2, '#ffe08a') : blob(25.4, 24.6, 2.6, 2.6, '#d9764a'));

CH.stallholder = (side) => person({
  shirt: '#fff1d6',
  under: [0, 1, 2, 3, 4].map((k) => r(10 + k * 2.4, 22, 2.4, 11, 0, k % 2 ? '#ffffff' : TILES[3])).join('') + r(10, 32.4, 12, 1.6, 0.8, shade(TILES[3], 0.25)),
  hat: e(16, 8.8, 9.4, 2.4, shade('#009E73', 0.3)) + `<path d="M9.4 8.6 Q9.8 2.6 16 2.6 Q22.2 2.6 22.6 8.6 Z" fill="#009E73"/>` + r(9.8, 6.4, 12.4, 1.8, 0.9, '#fff1d6') + e(13, 4.8, 1.8, 1, tint('#009E73', 0.5)),
}) + (side ? `<path d="M22 27 L28 24" stroke="${SKIN}" stroke-width="2.4" stroke-linecap="round"/>` + c(27, 26, 3.6, shade('#D55E00', 0.25)) + c(27, 25, 3.6, '#D55E00') + c(25.8, 23.8, 1.2, tint('#D55E00', 0.5)) + r(26.6, 20.6, 1, 2, 0.5, '#6f452c') + e(29, 21.6, 2, 1, '#3f9a4a', -25) : c(26, 28, 2.6, '#D55E00'));

CH.snowgoat = (side) => {
  let s = ground();
  s += r(9.6, 32, 3.4, 5, 1.2, '#f2f6f8') + r(18.6, 32, 3.4, 5, 1.2, '#f2f6f8') + r(9.6, 35.4, 3.4, 1.8, 0.8, '#5a5f6a') + r(18.6, 35.4, 3.4, 1.8, 0.8, '#5a5f6a');
  s += blob(15.5, 27.5, 9, 7.6, '#eef3f6') + blob(10, 25, 4.6, 4, '#ffffff') + blob(21.4, 26, 4, 3.6, '#ffffff');
  s += p([[24, 31], [27.6, 29], [26.4, 32.4]], '#e0e8ec');
  s += `<path d="M10.6 9.4 Q7.6 2.6 12.4 1.6 Q9.8 5.4 13.4 9" fill="none" stroke="${shade('#a89b86', 0.15)}" stroke-width="2.4" stroke-linecap="round"/><path d="M21.4 9.4 Q24.4 2.6 19.6 1.6 Q22.2 5.4 18.6 9" fill="none" stroke="#a89b86" stroke-width="2.4" stroke-linecap="round"/>`;
  s += blob(16, 14.5, 6.6, 6.4, '#f7fafb') + blob(8.8, 13.6, 2.6, 1.4, '#e0e8ec', 25) + blob(23.2, 13.6, 2.6, 1.4, '#e0e8ec', -25);
  s += e(16, 17.6, 3.4, 2.4, '#e0e8ec') + e(15, 17.2, 0.6, 0.6, INK) + e(17, 17.2, 0.6, 0.6, INK) + eyes(12.8, 19.2, 13.4, 1);
  s += p([[14.4, 19.4], [17.6, 19.4], [16, 23.2]], '#e9eef2');
  s += r(8.6, 20.4, 14.8, 3.6, 1.8, shade(TILES[1], 0.25)) + r(8.6, 19.6, 14.8, 3.6, 1.8, TILES[1]) + r(19.4, 22, 3.4, 7, 1.4, TILES[1]) + r(10, 20, 4, 1, 0.5, tint(TILES[1], 0.5)) + r(19.4, 26.6, 3.4, 1, 0.5, '#fff');
  if (side) s += c(4, 6, 0.9, '#ffffff') + c(28, 8, 0.9, '#ffffff') + c(6, 31, 0.9, '#ffffff');
  return s;
};

CH.koala = (side) => {
  let s = ground();
  s += r(1, 31.4, 30, 3.4, 1.7, shade('#8a5a3c', 0.2)) + r(1, 30.6, 30, 3.4, 1.7, '#8a5a3c') + r(3, 31, 8, 0.9, 0.45, '#a56c44');
  s += `<path d="M24.6 29.6 q4.6 -3 4.6 -8" fill="none" stroke="#3f9a4a" stroke-width="1.2" stroke-linecap="round"/>` + e(28.4, 21, 3.4, 1.6, '#4fae52', -60) + e(27.2, 26.6, 3.2, 1.5, '#3f9a4a', 35);
  s += blob(15.5, 25.6, 8.4, 7.4, '#9ea5ad') + e(15.5, 27.4, 5, 4.4, '#d9dde1');
  s += blob(8.6, 29.4, 3, 2.4, '#7d848c') + blob(22.4, 29.4, 3, 2.4, '#7d848c');
  s += blob(7.6, 9.4, 5.2, 5.2, '#9ea5ad') + blob(24.4, 9.4, 5.2, 5.2, '#9ea5ad') + c(7.8, 9.8, 2.8, '#e7dcdf') + c(24.2, 9.8, 2.8, '#e7dcdf');
  s += blob(16, 13.6, 7.6, 6.6, '#9ea5ad');
  s += eyes(12.4, 19.6, 12.6, 1.1) + blob(16, 15.4, 2.7, 3.2, '#3a3f4a');
  if (side) s += `<path d="M13.6 19.6 Q16 21.4 18.4 19.6" fill="none" stroke="${INK}" stroke-width="0.8" stroke-linecap="round"/>`;
  return s;
};

CH.cameltrader = (side) => {
  let s = ground(12.5);
  for (const x of [8.4, 11.4, 19.8, 22.8]) s += r(x, 28, 2.6, 9, 1.2, x < 15 ? '#c28a52' : '#a97740');
  s += blob(15, 26, 10.4, 5.6, '#d6a468') + blob(10.6, 19, 4.4, 4.4, '#d6a468') + blob(19.4, 20.4, 3.6, 3.8, '#d6a468');
  s += `<path d="M22 24 Q26.4 20 25.4 13" fill="none" stroke="${shade('#d6a468', 0.25)}" stroke-width="5" stroke-linecap="round"/><path d="M22 23 Q26 19 25.4 12.6" fill="none" stroke="#d6a468" stroke-width="4.6" stroke-linecap="round"/>`;
  s += blob(27, 11.6, 4.4, 3.2, '#d6a468', -10) + c(27.4, 10.6, 0.9, INK) + c(30.6, 12, 0.6, shade('#b4552f', 0.3)) + e(27, 14, 2.6, 1, '#f3dcb2');
  s += r(5.6, 20.6, 12, 4.6, 1.4, shade(TILES[3], 0.3)) + r(5.6, 19.6, 12, 4.6, 1.4, TILES[3]) + r(7, 20, 4, 1, 0.5, tint(TILES[3], 0.5)) + r(5.6, 22.4, 12, 1.2, 0, TILES[0]);
  s += `<path d="M5.4 24 L4 29 M17.6 24 L19 29" stroke="${TILES[0]}" stroke-width="1.4" stroke-linecap="round"/>`;
  s += e(26.6, 7.2, 4.4, 1.6, shade('#fff1d6', 0.25)) + `<path d="M23.4 7 Q23.6 2.6 26.8 2.6 Q30 2.6 30.2 7 Z" fill="#fff1d6"/>` + r(23.4, 5.2, 6.8, 1.2, 0.6, TILES[5]);
  if (side) s += blob(8, 17.4, 3, 2.2, '#009E73') + r(7.6, 15, 1, 2.4, 0.5, '#3f9a4a');
  return s;
};

// ---- output ----
const wrap = (w, h, body, title) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><title>${title}</title>${body}</svg>\n`;

const META = [
  { id: 'potter', name: 'Poppy the Potter', description: 'Keeps the village wheel turning and always has a fresh pot in hand.', home: 'Kiln Meadow', homeChapter: 1, kind: 'gift', giftOrder: 1 },
  { id: 'dog', name: 'Biscuit the Dog', description: 'A friendly meadow dog who guards the kiln and fetches stray tiles.', home: 'Kiln Meadow', homeChapter: 1, kind: 'gift', giftOrder: 2 },
  { id: 'duck', name: 'Puddle the Duck', description: 'Paddles along the creek and quacks when a block slides home.', home: 'Clay Creek', homeChapter: 2, kind: 'gift', giftOrder: 3 },
  { id: 'scarecrow', name: 'Scruff the Scarecrow', description: 'Keeps watch over the sunflowers, with a crow friend on one arm.', home: 'Sunflower Fields', homeChapter: 3, kind: 'gift', giftOrder: 4 },
  { id: 'cat', name: 'Marmalade the Cat', description: 'A market-square cat who naps on warm cobbles and watches every move.', home: 'Market Town', homeChapter: 4, kind: 'gift', giftOrder: 5 },
  { id: 'kilnmaster', name: 'Old Ember the Kiln Master', description: 'Sooty, proud and patient, he has fired every glaze at the Great Kiln.', home: 'The Great Kiln', homeChapter: 10, kind: 'gift', giftOrder: 6 },
  { id: 'stallholder', name: 'Mabel the Stallholder', description: 'Sells apples and chatter from a striped stall in Market Town.', home: 'Market Town', homeChapter: 4, kind: 'shop', price: 120 },
  { id: 'koala', name: 'Gumnut the Koala', description: 'Dozes on a gum branch and wakes only for a very good puzzle.', home: 'Bluegum Forest', homeChapter: 6, kind: 'shop', price: 140 },
  { id: 'ferrycaptain', name: 'Captain Brine', description: 'Runs the ferry off Seaside Pier and keeps a lifebuoy handy.', home: 'Seaside Pier', homeChapter: 5, kind: 'shop', price: 160 },
  { id: 'snowgoat', name: 'Flurry the Snow-goat', description: 'A scarfed mountain goat who hops the icy ledges of Snowy Peaks.', home: 'Snowy Peaks', homeChapter: 8, kind: 'shop', price: 180 },
  { id: 'lanternkeeper', name: 'Wick the Lantern Keeper', description: 'Lights every lantern in the garden at dusk, one pole at a time.', home: 'Lantern Gardens', homeChapter: 7, kind: 'shop', price: 200 },
  { id: 'cameltrader', name: 'Dune the Camel Trader', description: 'Hauls glass and bright rugs across the desert with a patient smile.', home: 'Glass Desert', homeChapter: 9, kind: 'shop', price: 250 },
];

const labels = { potter: 'potter', dog: 'dog', duck: 'duck', scarecrow: 'scarecrow', cat: 'cat', kilnmaster: 'kiln master', stallholder: 'market stallholder', koala: 'koala', ferrycaptain: 'ferry captain', snowgoat: 'snow-goat', lanternkeeper: 'lantern keeper', cameltrader: 'camel trader' };
const manifest = [], chars = [];
for (const m of META) {
  const slug = m.id, label = labels[slug];
  const mapFile = `${slug}-map.svg`, sideFile = `${slug}-side.svg`;
  writeFileSync(join(OUT, mapFile), wrap(32, 40, CH[slug](false), `${m.name} (map)`));
  writeFileSync(join(OUT, sideFile), wrap(58, 72, `<g transform="scale(1.8125 1.8)">${CH[slug](true)}</g>`, `${m.name} (side)`));
  manifest.push({ file: mapFile, width: 32, height: 40, label: `${label} (map)`, group: 'characters' }, { file: sideFile, width: 58, height: 72, label: `${label} (side)`, group: 'characters' });
  chars.push({ id: m.id, name: m.name, description: m.description, home: m.home, homeChapter: m.homeChapter, kind: m.kind, ...(m.kind === 'gift' ? { giftOrder: m.giftOrder } : { price: m.price }), files: { map: mapFile, side: sideFile } });
}
writeFileSync(join(OUT, 'characters.json'), JSON.stringify(chars, null, 2) + '\n');
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`wrote ${manifest.length} svgs, characters.json, manifest.json`);
