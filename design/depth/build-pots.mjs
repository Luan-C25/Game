// Pottery shelf art: ten chapter pots (normal, gold, empty), a generic empty pot, and the shelf.
// Run: node design/depth/build-pots.mjs   (writes design/depth/pots/)
// Flat shapes only: each pot has a ground shadow, a darker underside and one highlight.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { shade, tint, f } from '../maps/kit.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), 'pots');
mkdirSync(OUT, { recursive: true });
const GOLD = '#E8B730', CX = 48, W = 96, H = 120;
const files = [];

/* ---- smooth silhouette from a half-width profile ---- */
function curve(pts) { // Catmull-Rom to cubic bezier, segments after the first point
  let d = '';
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)], t = 0.17;
    d += `C${f(p1[0] + (p2[0] - p0[0]) * t)} ${f(p1[1] + (p2[1] - p0[1]) * t)} ${f(p2[0] - (p3[0] - p1[0]) * t)} ${f(p2[1] - (p3[1] - p1[1]) * t)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}
function bodyPath(prof) {
  const R = prof.map(([y, hw]) => [CX + hw, y]), L = prof.map(([y, hw]) => [CX - hw, y]).reverse();
  return `M${f(L[L.length - 1][0])} ${f(L[L.length - 1][1])}L${f(R[0][0])} ${f(R[0][1])}${curve(R)}L${f(L[0][0])} ${f(L[0][1])}${curve(L)}Z`;
}

const mirror = (s) => `<g transform="translate(${W},0) scale(-1,1)">${s}</g>`;
const daisy = (x, y, r, pe, ce) => { let o = ''; for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; o += `<circle cx="${f(x + Math.cos(a) * r)}" cy="${f(y + Math.sin(a) * r)}" r="${f(r * 0.72)}" fill="${pe}"/>`; } return o + `<circle cx="${x}" cy="${y}" r="${f(r * 0.6)}" fill="${ce}"/>`; };
const leaf = (x, y, rot, s, c) => `<path transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" d="M0 0Q9 -14 0 -32Q-9 -14 0 0Z" fill="${c}"/>`;

// lt = light accent, md = mid accent, dk = dark accent. The gold version derives all four from GOLD.
const POTS = [
  { n: 1, slug: 'kiln-meadow', label: 'Kiln Meadow', base: '#2fa866', lt: '#fff1d6', md: '#ffd556', dk: '#1c7d4c', gw: 32,
    prof: [[16, 14], [20, 12], [32, 9], [42, 10], [52, 17], [64, 28], [80, 32], [94, 28], [104, 21], [108, 19]],
    handle: 'M57 30C82 24 88 52 73 63', handles: 1,
    motif: (c) => `<rect x="0" y="56" width="96" height="6" fill="${c.lt}"/>` + leaf(34, 100, -62, 0.5, c.dk) + leaf(62, 100, 62, 0.5, c.dk) + daisy(48, 82, 6.5, c.lt, c.md) },
  { n: 2, slug: 'clay-creek', label: 'Clay Creek', base: '#c8562c', lt: '#f0b48a', md: '#56B4E9', dk: '#7a3a1f', gw: 40,
    prof: [[24, 26], [28, 24], [40, 28], [58, 38], [78, 38], [94, 30], [108, 25]], handles: 0,
    motif: (c) => {
      let o = `<rect x="0" y="26" width="96" height="6" fill="${c.dk}"/><circle cx="48" cy="68" r="17" fill="${c.dk}"/><circle cx="48" cy="68" r="12" fill="${c.base}"/>`;
      for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI; o += `<line x1="${f(48 - Math.cos(a) * 12)}" y1="${f(68 - Math.sin(a) * 12)}" x2="${f(48 + Math.cos(a) * 12)}" y2="${f(68 + Math.sin(a) * 12)}" stroke="${c.dk}" stroke-width="3" stroke-linecap="round"/>`; }
      for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2 + 0.4; o += `<circle cx="${f(48 + Math.cos(a) * 17)}" cy="${f(68 + Math.sin(a) * 17)}" r="3" fill="${c.lt}"/>`; }
      return o + `<circle cx="48" cy="68" r="3.4" fill="${c.lt}"/><path d="M14 92Q23 86 32 92T50 92T68 92T86 92" fill="none" stroke="${c.md}" stroke-width="4" stroke-linecap="round"/>`;
    } },
  { n: 3, slug: 'sunflower-fields', label: 'Sunflower Fields', base: '#E69F00', lt: '#ffe27a', md: '#3f9a4a', dk: '#7a4d31', gw: 28,
    prof: [[10, 15], [16, 13], [30, 10], [46, 12], [62, 22], [78, 28], [94, 24], [108, 20]], handles: 0,
    motif: (c) => {
      let o = `<rect x="0" y="12" width="96" height="5" fill="${c.dk}"/><line x1="48" y1="76" x2="48" y2="102" stroke="${c.md}" stroke-width="3.4" stroke-linecap="round"/>` + leaf(48, 98, 62, 0.42, c.md) + leaf(48, 90, -62, 0.36, c.md);
      for (let k = 0; k < 10; k++) { const a = (k / 10) * 360; o += `<ellipse cx="48" cy="53" rx="4.6" ry="9" fill="${c.lt}" transform="rotate(${a} 48 62)"/>`; }
      return o + `<circle cx="48" cy="62" r="8" fill="${c.dk}"/>`;
    } },
  { n: 4, slug: 'market-town', label: 'Market Town', base: '#CC79A7', lt: '#fff1d6', md: '#E69F00', dk: '#8c4a6e', gw: 34,
    prof: [[22, 18], [28, 14], [38, 22], [54, 32], [72, 34], [90, 26], [100, 14], [108, 20]],
    handle: 'M32 44C14 40 12 64 20 68', handles: 2, mirrorHandle: true,
    motif: (c) => {
      let o = ''; for (let k = -2; k <= 2; k++) o += `<rect x="${48 + k * 17 - 4.5}" y="30" width="9" height="80" fill="${c.lt}"/>`;
      o += `<rect x="0" y="44" width="96" height="6" fill="${c.dk}"/>`; for (let k = 0; k < 6; k++) o += `<path d="M${14 + k * 14} 50a7 7 0 0 0 14 0Z" fill="${c.dk}"/>`;
      return o + `<rect x="0" y="20" width="96" height="5" fill="${c.md}"/>`;
    } },
  { n: 5, slug: 'seaside-pier', label: 'Seaside Pier', base: '#56B4E9', lt: '#ffffff', md: '#a8e4fb', dk: '#0072B2', gw: 26,
    prof: [[8, 14], [14, 10], [30, 8], [44, 18], [60, 26], [80, 24], [96, 14], [104, 8], [108, 12]],
    handle: 'M40 26C20 22 18 46 28 54', handles: 2, mirrorHandle: true,
    motif: (c) => `<rect x="0" y="8" width="96" height="6" fill="${c.dk}"/><rect x="0" y="62" width="96" height="16" fill="${c.dk}"/><path d="M10 70Q19 62 28 70T46 70T64 70T82 70T100 70" fill="none" stroke="${c.lt}" stroke-width="4" stroke-linecap="round"/><path d="M0 79Q9 73 18 79T36 79T54 79T72 79T90 79" fill="none" stroke="${c.md}" stroke-width="3" stroke-linecap="round"/>` },
  { n: 6, slug: 'bluegum-forest', label: 'Bluegum Forest', base: '#7fb38f', lt: '#d9efd0', md: '#3c7a52', dk: '#8a5a3c', gw: 32,
    prof: [[20, 22], [26, 20], [40, 27], [60, 32], [80, 28], [96, 21], [108, 18]], handles: 0,
    motif: (c) => `<rect x="0" y="20" width="96" height="6" fill="${c.md}"/><line x1="48" y1="102" x2="48" y2="80" stroke="${c.md}" stroke-width="3" stroke-linecap="round"/>` + leaf(48, 90, -48, 0.62, c.lt) + leaf(48, 90, 48, 0.62, c.lt) + leaf(48, 92, 0, 0.78, c.lt) + `<circle cx="48" cy="93" r="3.4" fill="${c.dk}"/>` },
  { n: 7, slug: 'lantern-gardens', label: 'Lantern Gardens', base: '#d9483b', lt: '#fff3c4', md: '#ffd556', dk: '#7a2218', gw: 42,
    prof: [[44, 40], [48, 38], [60, 42], [74, 38], [90, 28], [100, 18], [108, 17]], handles: 0,
    motif: (c) => {
      let o = `<rect x="0" y="44" width="96" height="7" fill="${c.dk}"/>`;
      [30, 48, 66].forEach((x, i) => {
        const y = 64 + (i === 1 ? 4 : 0);
        o += `<line x1="${x}" y1="51" x2="${x}" y2="${y}" stroke="${c.dk}" stroke-width="1.6"/><rect x="${x - 6}" y="${y}" width="12" height="16" rx="5" fill="${c.md}"/><rect x="${x - 4}" y="${y + 3}" width="3.5" height="9" rx="1.7" fill="${c.lt}"/><rect x="${x - 4}" y="${y - 2}" width="8" height="3" rx="1.5" fill="${c.dk}"/><rect x="${x - 4}" y="${y + 15}" width="8" height="3" rx="1.5" fill="${c.dk}"/>`;
      });
      return o;
    } },
  { n: 8, slug: 'snowy-peaks', label: 'Snowy Peaks', base: '#e3eef8', lt: '#ffffff', md: '#56B4E9', dk: '#2f6f93', gw: 34,
    prof: [[8, 4], [12, 6], [18, 9], [24, 24], [28, 26], [36, 27], [42, 29], [58, 34], [76, 34], [92, 28], [108, 24]], handles: 0,
    motif: (c) => `<rect x="0" y="36" width="96" height="5" fill="${c.md}"/><path d="M14 25Q20 33 26 25Q31 33 38 25Q44 33 50 25Q56 33 62 25Q68 33 74 25Q80 33 86 25L86 14L14 14Z" fill="${c.lt}"/><rect x="45.5" y="94" width="5" height="9" fill="${c.dk}"/><path d="M48 58L60 76L36 76Z" fill="${c.dk}"/><path d="M48 70L63 90L33 90Z" fill="${c.dk}"/><path d="M48 58L52.5 65L43.5 65Z" fill="${c.lt}"/><path d="M48 70L54.5 79L41.5 79Z" fill="${c.lt}"/>` },
  { n: 9, slug: 'glass-desert', label: 'Glass Desert', base: '#8fd8f5', lt: '#e8f9ff', md: '#f0c868', dk: '#a56c44', gw: 38, cork: true,
    prof: [[10, 9], [16, 8], [34, 8], [48, 15], [66, 33], [86, 38], [100, 33], [108, 29]], handles: 0,
    motif: (c) => `<rect x="0" y="80" width="96" height="40" fill="${c.md}"/><path d="M0 80Q16 74 32 80T64 80T96 80L96 84L0 84Z" fill="${c.md}"/><rect x="0" y="30" width="96" height="4" fill="${c.lt}"/>`,
    front: (c) => `<rect x="39" y="2" width="18" height="12" rx="4" fill="${shade(c.dk, 0.3)}"/><rect x="39" y="0" width="18" height="12" rx="4" fill="${c.dk}"/><rect x="42" y="2" width="5" height="3" rx="1.5" fill="${tint(c.dk, 0.45)}"/>` },
  { n: 10, slug: 'great-kiln', label: 'The Great Kiln', base: '#0072B2', lt: '#f6d36b', md: '#ffb347', dk: '#00456f', gw: 36,
    prof: [[4, 3], [8, 5], [13, 8], [18, 16], [24, 24], [28, 24], [31, 12], [36, 11], [48, 22], [62, 34], [80, 36], [94, 28], [100, 19], [104, 17], [108, 24]],
    handle: 'M18 52C2 46 2 84 20 86', handles: 2, mirrorHandle: true,
    motif: (c) => `<rect x="0" y="24" width="96" height="4" fill="${c.lt}"/><rect x="0" y="48" width="96" height="4" fill="${c.lt}"/><rect x="0" y="100" width="96" height="4" fill="${c.lt}"/><path d="M28 94L28 80Q28 62 48 62Q68 62 68 80L68 94Z" fill="${c.lt}"/><path d="M38 94L38 82Q38 72 48 72Q58 72 58 82L58 94Z" fill="${c.dk}"/><path d="M43 94Q42 84 48 79Q54 84 53 94Z" fill="${c.md}"/>` },
];

/* ---- one pot, as an inner group ---- */
function potGroup(p, state, id, opts = {}) {
  const gold = state === 'gold', empty = state === 'empty';
  const bodyD = bodyPath(p.prof), bot = p.prof[p.prof.length - 1][0], hwMax = Math.max(...p.prof.map((r) => r[1]));
  const sh = opts.shadow || '#2f5d2a';
  const shadowEl = `<ellipse cx="${CX}" cy="${bot + 3}" rx="${f(hwMax + 4)}" ry="${f(hwMax * 0.2 + 1.5)}" fill="${sh}" opacity="${empty ? 0.08 : 0.22}"/>`;
  const handleEls = (draw) => { if (!p.handles) return ''; const one = draw(p.handle); return p.mirrorHandle ? one + mirror(one) : one; };
  if (empty) {
    const ink = opts.ink || '#a58a6a';
    return shadowEl
      + handleEls((d) => `<path d="${d}" fill="none" stroke="${ink}" stroke-width="2" stroke-dasharray="5 4" stroke-linecap="round"/>`)
      + `<path d="${bodyD}" fill="${ink}" fill-opacity="0.1" stroke="${ink}" stroke-width="2.4" stroke-dasharray="6 5" stroke-linejoin="round"/>`
      + (p.cork ? `<rect x="39" y="0" width="18" height="12" rx="4" fill="none" stroke="${ink}" stroke-width="2" stroke-dasharray="5 4"/>` : '');
  }
  const base = gold ? GOLD : p.base;
  const c = gold ? { base, lt: tint(GOLD, 0.55), md: shade(GOLD, 0.2), dk: shade(GOLD, 0.42) } : { base, lt: p.lt, md: p.md, dk: p.dk };
  const under = shade(base, 0.3), hi = tint(base, 0.5);
  const hx = CX - p.gw * 0.64, hy = p.prof.find((r) => r[1] >= hwMax * 0.88)[0] - 4;
  const hLen = Math.min(24, (bot - hy) * 0.45);
  return shadowEl
    + handleEls((d) => `<path d="${d}" fill="none" stroke="${under}" stroke-width="7" stroke-linecap="round" transform="translate(0 2)"/><path d="${d}" fill="none" stroke="${base}" stroke-width="6" stroke-linecap="round"/>`)
    + `<defs><clipPath id="${id}b"><path d="${bodyD}"/></clipPath><clipPath id="${id}u"><rect x="${f(CX + hwMax * 0.56)}" y="0" width="60" height="130"/><rect x="0" y="${bot - 9}" width="96" height="30"/></clipPath></defs>`
    + `<path d="${bodyD}" fill="${under}" stroke="${under}" stroke-width="3" stroke-linejoin="round"/>`
    + `<g clip-path="url(#${id}b)"><rect x="0" y="0" width="96" height="${bot + 4}" fill="${base}"/>${p.motif(c)}`
    + `<g clip-path="url(#${id}u)"><path d="${bodyD}" fill="${under}" opacity="0.5"/></g></g>`
    + `<rect x="${f(hx)}" y="${f(hy)}" width="5" height="${f(hLen)}" rx="2.5" fill="${hi}"/>`
    + (p.front ? p.front(c) : '');
}
const svgWrap = (w, h, inner, title) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><title>${title}</title>${inner}</svg>\n`;
function emit(file, w, h, inner, label, title) { writeFileSync(join(OUT, file), svgWrap(w, h, inner, title)); files.push({ file, width: w, height: h, label, group: 'pots' }); }

for (const p of POTS) {
  const s = `${p.n}-${p.slug}`;
  emit(`pot-${s}.svg`, W, H, potGroup(p, 'fired', `p${p.n}n`), p.label, `${p.label} pot`);
  emit(`pot-${s}-gold.svg`, W, H, potGroup(p, 'gold', `p${p.n}g`), `${p.label} (gold)`, `${p.label} pot, gold glaze`);
  emit(`pot-${s}-empty.svg`, W, H, potGroup(p, 'empty', `p${p.n}e`), `${p.label} (not fired)`, `${p.label} pot, not fired yet`);
}
const GENERIC = { prof: [[18, 14], [24, 12], [38, 16], [56, 28], [76, 30], [94, 24], [108, 18]], handles: 0 };
emit('pot-empty.svg', W, H, potGroup(GENERIC, 'empty', 'pge'), 'Not fired yet', 'A pot not fired yet');

/* ---- the shelf: 2 pots per row, 5 planks ---- */
function shelf(states, file, label) {
  const SW = 375, SCALE = 1.15, PW = W * SCALE, PH = H * SCALE, ROW = 206, TOP = 26, PAD = 14, rows = 5, SH = TOP + rows * ROW + 24;
  let o = `<rect width="${SW}" height="${SH}" fill="#e9cfa6"/>`;
  for (let y = 0; y < SH; y += 40) o += `<rect x="${PAD}" y="${y}" width="${SW - PAD * 2}" height="2" fill="#d7b98a"/>`;
  o += `<rect x="0" y="0" width="${PAD}" height="${SH}" fill="#7a4d31"/><rect x="${SW - PAD}" y="0" width="${PAD}" height="${SH}" fill="#7a4d31"/><rect x="2" y="0" width="4" height="${SH}" fill="#a56c44"/><rect x="${SW - PAD + 2}" y="0" width="4" height="${SH}" fill="#a56c44"/>`;
  o += `<rect x="0" y="0" width="${SW}" height="16" fill="#7a4d31"/><rect x="0" y="0" width="${SW}" height="11" fill="#a56c44"/><rect x="18" y="2" width="120" height="3" rx="1.5" fill="#d9a066"/>`;
  for (let r = 0; r < rows; r++) {
    const plankY = TOP + r * ROW + 14 + PH + 8;
    o += `<rect x="${PAD}" y="${plankY + 20}" width="${SW - PAD * 2}" height="9" fill="#3a2415" opacity="0.22"/>`;
    for (let k = 0; k < 2; k++) {
      const i = r * 2 + k, p = POTS[i], cxp = PAD + (SW - PAD * 2) * (0.25 + 0.5 * k), x0 = cxp - PW / 2, bot = p.prof[p.prof.length - 1][0];
      const y0 = plankY - (bot + 3) * SCALE + 1, done = states[i] !== 'empty', ly = plankY + 42;
      o += `<g transform="translate(${f(x0)} ${f(y0)}) scale(${SCALE})">${potGroup(p, states[i], `s${i}`, { shadow: '#3a2415', ink: '#9b7a55' })}</g>`;
      o += `<rect x="${f(cxp - 66)}" y="${ly - 14}" width="132" height="22" rx="8" fill="${states[i] === 'gold' ? '#ffe9a3' : '#fff1d6'}" opacity="${done ? 1 : 0.6}"/><rect x="${f(cxp - 66)}" y="${ly + 5}" width="132" height="3" rx="1.5" fill="#d9a066" opacity="${done ? 1 : 0.6}"/>`
        + `<text x="${f(cxp)}" y="${ly + 2}" text-anchor="middle" font-family="'Baloo 2', sans-serif" font-weight="800" font-size="14" fill="${done ? '#5a3418' : '#9b7a55'}">${p.label}</text>`;
    }
    o += `<rect x="${PAD}" y="${plankY + 8}" width="${SW - PAD * 2}" height="14" fill="#7a4d31"/><rect x="${PAD}" y="${plankY}" width="${SW - PAD * 2}" height="14" fill="#a56c44"/><rect x="${PAD + 10}" y="${plankY + 2}" width="150" height="3" rx="1.5" fill="#d9a066"/>`;
  }
  o += `<rect x="0" y="${SH - 22}" width="${SW}" height="22" fill="#7a4d31"/><rect x="0" y="${SH - 22}" width="${SW}" height="14" fill="#a56c44"/>`;
  emit(file, SW, SH, o, label, label);
}
shelf(['gold', 'gold', 'gold', 'gold', 'fired', 'fired', 'empty', 'empty', 'empty', 'empty'], 'shelf.svg', 'Pottery shelf (sample)');
shelf(Array(10).fill('empty'), 'shelf-empty.svg', 'Pottery shelf (all not fired)');

writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(files, null, 2) + '\n');
console.log(files.length, 'svgs written to', OUT);
