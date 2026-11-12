// Builds the glaze finishes, exit effects and shop mock-ups into design/depth/finishes/.
// Design only. Nothing in src/ is touched and nothing imports these files.
// Run: node design/depth/build-finishes.mjs
import { mkdirSync, writeFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TILES, shade, tint, f } from '../maps/kit.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), 'finishes');
mkdirSync(OUT, { recursive: true });
const FONT = `'Baloo 2', 'Trebuchet MS', 'Arial Rounded MT Bold', sans-serif`;
const GLYPHS = ['circle', 'triangle', 'square', 'diamond', 'star', 'hexagon'];
const COLOUR_NAMES = ['Orange', 'Sky', 'Green', 'Pink', 'Blue', 'Vermilion'];
const files = []; // { file, width, height, label, group }
const write = (file, text, width, height, label, group) => {
  writeFileSync(join(OUT, file), text);
  files.push({ file, width, height, label, group });
};

/* Small deterministic generator (mulberry32). In the game, seed it with the block id. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeOut = (p) => 1 - Math.pow(1 - p, 3);

/* ============================================================ glaze finishes */
const FINISHES = ['gloss', 'speckled', 'crackle', 'matte'];
let clipN = 0;

// Crackle template in unit coordinates: one fixed set of hairlines. A tile rotates/flips it by its seed.
const CRACKLE = [
  'M0.06 0.34 L0.30 0.42 L0.46 0.30 L0.72 0.38 L0.94 0.27',
  'M0.46 0.30 L0.53 0.08',
  'M0.30 0.42 L0.26 0.70 L0.52 0.78 L0.62 0.96',
  'M0.72 0.38 L0.66 0.62 L0.90 0.76',
  'M0.26 0.70 L0.06 0.82',
  'M0.52 0.78 L0.78 0.88',
];
function crackleXform(seed) {
  const v = seed % 8; // 4 rotations x mirror
  const rot = v & 3, mir = v >> 2;
  return (x, y) => {
    if (mir) x = 1 - x;
    for (let i = 0; i < rot; i++) [x, y] = [1 - y, x];
    return [x, y];
  };
}
function speckles(seed) {
  const r = rng(seed * 7919 + 13);
  const out = [];
  for (let i = 0; i < 15; i++) {
    out.push({ x: 0.15 + r() * 0.7, y: 0.17 + r() * 0.66, r: 0.016 + r() * 0.02, light: i >= 10 });
  }
  return out;
}

/** One tile as SVG at (x,y) of size s. `seed` stands in for the block id. */
function tileSvg(x, y, s, base, finish, seed, glyph = null) {
  const d = Math.round(s * 0.11), rx = s * 0.18, id = 'c' + clipN++;
  let o = '';
  o += `<rect x="${f(x + d * 0.3)}" y="${f(y + d * 1.25)}" width="${s}" height="${s}" rx="${f(rx)}" fill="#000" opacity="0.30"/>`; // ground shadow
  o += `<rect x="${x}" y="${f(y + d)}" width="${s}" height="${s}" rx="${f(rx)}" fill="${shade(base, 0.44)}"/>`; // underside
  o += `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${f(rx)}" fill="${base}"/>`; // face
  o += `<clipPath id="${id}"><rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${f(rx)}"/></clipPath><g clip-path="url(#${id})">`;
  const pill = (px, py, w, h, c, a) => `<rect x="${f(x + px * s)}" y="${f(y + py * s)}" width="${f(w * s)}" height="${f(h * s)}" rx="${f(h * s / 2)}" fill="${c}" opacity="${a}"/>`;
  if (finish === 'gloss') {
    o += pill(0.13, 0.11, 0.5, 0.14, '#ffffff', 0.55);
  } else if (finish === 'speckled') {
    o += pill(0.13, 0.11, 0.3, 0.1, '#ffffff', 0.32);
    for (const p of speckles(seed)) {
      o += `<circle cx="${f(x + p.x * s)}" cy="${f(y + p.y * s)}" r="${f(Math.max(0.9, p.r * s))}" fill="${p.light ? tint(base, 0.55) : shade(base, 0.32)}" opacity="${p.light ? 0.75 : 0.6}"/>`;
    }
  } else if (finish === 'crackle') {
    o += pill(0.13, 0.11, 0.34, 0.11, '#ffffff', 0.4);
    const tf = crackleXform(seed);
    const dd = CRACKLE.map((seg) => seg.replace(/([ML])([\d.]+) ([\d.]+)/g, (_, c, a, b) => { const [u, v] = tf(+a, +b); return `${c}${f(x + u * s)} ${f(y + v * s)}`; })).join(' ');
    o += `<path d="${dd}" fill="none" stroke="${shade(base, 0.38)}" stroke-width="${f(Math.max(0.8, s * 0.016))}" stroke-linecap="round" stroke-linejoin="round" opacity="0.55"/>`;
  } else {
    // matte: no highlight. A soft inset: dark on the top-left inside edge, light on the bottom-right.
    const sh = Math.max(1.4, s * 0.04);
    o += `<rect x="${f(x + sh)}" y="${f(y + sh)}" width="${s}" height="${s}" rx="${f(rx)}" fill="none" stroke="${shade(base, 0.3)}" stroke-width="${f(sh * 2)}" opacity="0.38"/>`;
    o += `<rect x="${f(x - sh)}" y="${f(y - sh)}" width="${s}" height="${s}" rx="${f(rx)}" fill="none" stroke="${tint(base, 0.35)}" stroke-width="${f(sh * 2)}" opacity="0.3"/>`;
  }
  o += `</g>`;
  if (finish !== 'matte') o += `<rect x="${f(x + 1.5)}" y="${f(y + 1.5)}" width="${s - 3}" height="${s - 3}" rx="${f(rx - 1.5)}" fill="none" stroke="${tint(base, 0.5)}" stroke-width="1" opacity="0.8"/>`; // moulded rim
  o += `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${f(rx)}" fill="none" stroke="${shade(base, 0.58)}" stroke-width="${f(Math.max(1.2, s * 0.025))}" opacity="0.9"/>`; // outline
  if (glyph) o += glyphSvg(glyph, x + s / 2, y + s / 2, s * 0.34, shade(base, 0.5), 0.75);
  return o;
}
function glyphSvg(kind, cx, cy, size, fill, a) {
  const r = size / 2;
  let el;
  if (kind === 'circle') el = `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r * 0.82)}"/>`;
  else if (kind === 'triangle') el = `<path d="M${f(cx)} ${f(cy - r * 0.92)} L${f(cx + r)} ${f(cy + r * 0.78)} L${f(cx - r)} ${f(cy + r * 0.78)}Z"/>`;
  else if (kind === 'square') el = `<rect x="${f(cx - r * 0.74)}" y="${f(cy - r * 0.74)}" width="${f(r * 1.48)}" height="${f(r * 1.48)}"/>`;
  else if (kind === 'diamond') el = `<path d="M${f(cx)} ${f(cy - r)} L${f(cx + r * 0.8)} ${f(cy)} L${f(cx)} ${f(cy + r)} L${f(cx - r * 0.8)} ${f(cy)}Z"/>`;
  else if (kind === 'star') { let p = ''; for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.45 : r, an = -Math.PI / 2 + (i * Math.PI) / 5; p += (i ? 'L' : 'M') + f(cx + Math.cos(an) * rr) + ' ' + f(cy + Math.sin(an) * rr); } el = `<path d="${p}Z"/>`; }
  else { let p = ''; for (let i = 0; i < 6; i++) { const an = (i * Math.PI) / 3; p += (i ? 'L' : 'M') + f(cx + Math.cos(an) * r) + ' ' + f(cy + Math.sin(an) * r); } el = `<path d="${p}Z"/>`; }
  return `<g fill="${fill}" opacity="${a}">${el}</g>`;
}

function finishesSheet() {
  const W = 600, pitch = 80, lx = 24, x0 = 120, y0 = 76, rowP = 94, s = 56;
  const H = y0 + rowP * 4 + 72;
  let o = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#2a323d"/>`;
  o += `<text x="${lx}" y="32" font-family="${FONT}" font-weight="800" font-size="22" fill="#f4efe4">Glaze finishes</text>`;
  o += `<text x="${lx}" y="50" font-family="${FONT}" font-weight="600" font-size="12" fill="#a9b4c0">Four finishes on the six tile colours. The colours never change between rows.</text>`;
  TILES.forEach((c, i) => {
    o += `<text x="${x0 + i * pitch + s / 2}" y="68" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="11" fill="#c9d2dc">${COLOUR_NAMES[i]}</text>`;
  });
  FINISHES.forEach((fin, r) => {
    const y = y0 + r * rowP;
    o += `<rect x="12" y="${y - 10}" width="${W - 24}" height="${rowP - 8}" rx="14" fill="${r % 2 ? '#313a46' : '#2e3742'}"/>`;
    o += `<text x="${lx}" y="${y + s / 2 + 6}" font-family="${FONT}" font-weight="800" font-size="17" fill="#f4efe4">${fin[0].toUpperCase() + fin.slice(1)}</text>`;
    TILES.forEach((c, i) => { o += tileSvg(x0 + i * pitch, y, s, c, fin, 100 + r * 10 + i, GLYPHS[i]); });
  });
  o += `<text x="${lx}" y="${H - 34}" font-family="${FONT}" font-weight="600" font-size="12" fill="#a9b4c0">Each tile has its own fixed seed: patterns differ per tile, never per frame.</text>`;
  o += `<text x="${lx}" y="${H - 16}" font-family="${FONT}" font-weight="600" font-size="12" fill="#a9b4c0">Colour-blind glyphs are drawn last, same size and ink, in every finish.</text>`;
  return o + `</svg>`;
}
write('finishes-sheet.svg', finishesSheet(), 600, 76 + 94 * 4 + 72, 'Four glaze finishes on six tile colours', 'finishes');

/* ============================================================ exit effects */
const GX = 124, GY = 80; // gate exit point in the 160x160 stills

const KILN = { D: 440, puffs: [
  { delay: 0, r0: 3, r1: 14, dx: 16, dy: -10 },
  { delay: 60, r0: 2, r1: 11, dx: 28, dy: -22 },
  { delay: 110, r0: 2, r1: 8, dx: 10, dy: -30 },
] };
function kilnState(t) {
  return KILN.puffs.map((p) => {
    const lp = clamp01((t - p.delay) / (KILN.D - p.delay)), e = easeOut(lp);
    const fade = Math.pow(clamp01((lp - 0.5) / 0.5), 2);
    return { x: GX + p.dx * e, y: GY + p.dy * e, r: p.r0 + (p.r1 - p.r0) * e, a: t < p.delay ? 0 : 0.92 * (1 - fade) };
  });
}
const PETALS = (() => {
  const r = rng(4242), out = [];
  for (let i = 0; i < 9; i++) {
    out.push({ delay: i * 8, ang: -70 + (i / 8) * 140 + (r() - 0.5) * 16, dist: 26 + r() * 12, spin: (r() - 0.5) * 160, rot0: r() * 180 });
  }
  return out;
})();
const PETAL_D = 480;
function petalState(t) {
  return PETALS.map((p) => {
    const lp = clamp01((t - p.delay) / (PETAL_D - p.delay)), e = easeOut(lp);
    const a = Math.PI * p.ang / 180;
    const fade = clamp01((lp - 0.6) / 0.4);
    return { x: GX + Math.cos(a) * p.dist * e, y: GY + Math.sin(a) * p.dist * e + 14 * lp * lp, rot: p.rot0 + p.spin * lp, a: t < p.delay ? 0 : 1 - fade };
  });
}
const SPLASH_D = 420;
const DROPS = (() => {
  const r = rng(777), out = [];
  for (let i = 0; i < 8; i++) out.push({ ang: -165 + (i / 7) * 150 + (r() - 0.5) * 12, v: 30 + r() * 12, r0: i % 3 === 0 ? 4.6 : 3.2 });
  return out;
})();
function splashState(t) {
  const lp = clamp01(t / SPLASH_D), e = easeOut(lp);
  const poolFade = clamp01((lp - 0.6) / 0.4);
  return {
    pool: { rx: 4 + 12 * e, ry: 1.5 + 4 * e, a: 1 - poolFade },
    drops: DROPS.map((d) => {
      const a = Math.PI * d.ang / 180;
      return { x: GX + Math.cos(a) * d.v * lp, y: GY + 6 + Math.sin(a) * d.v * lp + 0.5 * 58 * lp * lp, r: d.r0 * (1 - 0.65 * lp), a: 1 - clamp01((lp - 0.65) / 0.35), big: d.r0 > 4 };
    }),
  };
}

function stillScene(colour, inner, seed) {
  const bg = '#dde9f1';
  let o = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><rect width="160" height="160" fill="${bg}"/>`;
  // Slate tray corner: outer slab with underside, floor, wall, gate opening.
  o += `<rect x="-14" y="28" width="140" height="150" rx="16" fill="#323b49"/>`;
  o += `<rect x="-14" y="22" width="140" height="150" rx="16" fill="#515f73"/>`;
  o += `<rect x="-14" y="22" width="140" height="6" rx="3" fill="#6f7f95" opacity="0.9"/>`;
  o += `<rect x="-6" y="32" width="104" height="132" rx="10" fill="#252c3b"/>`;
  o += `<rect x="96" y="54" width="32" height="52" fill="#252c3b"/>`; // channel through the wall
  o += `<rect x="124" y="58" width="36" height="44" fill="${bg}"/>`;
  // Gate posts in the tile colour.
  const post = (y) => `<rect x="94" y="${y + 3}" width="34" height="12" rx="4" fill="${shade(colour, 0.44)}"/><rect x="94" y="${y}" width="34" height="12" rx="4" fill="${colour}"/><rect x="98" y="${y + 2}" width="14" height="3" rx="1.5" fill="${tint(colour, 0.5)}"/>`;
  o += post(42) + post(106);
  // Tile mid-exit: ground shadow, underside, face, rim, one highlight.
  const s = 38, tx = 70, ty = 61;
  o += `<rect x="${tx + 2}" y="${ty + 7}" width="${s}" height="${s}" rx="7" fill="#000" opacity="0.3"/>`;
  o += `<rect x="${tx}" y="${ty + 4}" width="${s}" height="${s}" rx="7" fill="${shade(colour, 0.44)}"/><rect x="${tx}" y="${ty}" width="${s}" height="${s}" rx="7" fill="${colour}"/>`;
  o += `<rect x="${tx + 1.5}" y="${ty + 1.5}" width="${s - 3}" height="${s - 3}" rx="5.5" fill="none" stroke="${tint(colour, 0.5)}" opacity="0.8"/>`;
  o += `<rect x="${tx + 5}" y="${ty + 4}" width="19" height="5" rx="2.5" fill="#fff" opacity="0.55"/>`;
  o += `<rect x="${tx}" y="${ty}" width="${s}" height="${s}" rx="7" fill="none" stroke="${shade(colour, 0.58)}" stroke-width="1.4" opacity="0.9"/>`;
  return o + inner + `</svg>`;
}
const petalPath = (x, y, rot, c, a) =>
  `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)})" opacity="${f(a)}"><ellipse cx="0" cy="1.4" rx="5.6" ry="3.2" fill="${shade(c, 0.35)}"/><ellipse cx="0" cy="0" rx="5.6" ry="3.2" fill="${tint(c, 0.12)}"/><ellipse cx="-1.4" cy="-0.9" rx="2.2" ry="0.9" fill="${tint(c, 0.6)}"/></g>`;

const kilnColour = TILES[0], petalColour = TILES[3], splashColour = TILES[1];
{
  let i = '';
  for (const p of kilnState(180)) {
    if (p.a <= 0) continue;
    i += `<circle cx="${f(p.x)}" cy="${f(p.y + 2.5)}" r="${f(p.r)}" fill="#b9c4cf" opacity="${f(p.a)}"/><circle cx="${f(p.x)}" cy="${f(p.y)}" r="${f(p.r)}" fill="#ffffff" opacity="${f(p.a)}"/>`;
  }
  write('effect-kiln-puff.svg', stillScene(kilnColour, i), 160, 160, 'Exit effect: kiln puff, peak frame (180 ms)', 'effects');
}
{
  let i = '';
  for (const p of petalState(220)) if (p.a > 0) i += petalPath(p.x, p.y, p.rot, petalColour, p.a);
  write('effect-petals.svg', stillScene(petalColour, i), 160, 160, 'Exit effect: petals, peak frame (220 ms)', 'effects');
}
{
  const st = splashState(150);
  let i = `<ellipse cx="${GX}" cy="${GY + 6 + 3}" rx="${f(st.pool.rx)}" ry="${f(st.pool.ry)}" fill="${shade(splashColour, 0.4)}" opacity="${f(st.pool.a)}"/><ellipse cx="${GX}" cy="${GY + 6}" rx="${f(st.pool.rx)}" ry="${f(st.pool.ry)}" fill="${splashColour}" opacity="${f(st.pool.a)}"/>`;
  for (const d of st.drops) {
    i += `<circle cx="${f(d.x)}" cy="${f(d.y + 1.4)}" r="${f(d.r)}" fill="${shade(splashColour, 0.4)}" opacity="${f(d.a)}"/><circle cx="${f(d.x)}" cy="${f(d.y)}" r="${f(d.r)}" fill="${splashColour}" opacity="${f(d.a)}"/>`;
    if (d.big) i += `<circle cx="${f(d.x - d.r * 0.35)}" cy="${f(d.y - d.r * 0.35)}" r="${f(d.r * 0.32)}" fill="${tint(splashColour, 0.65)}" opacity="${f(d.a)}"/>`;
  }
  write('effect-glaze-splash.svg', stillScene(splashColour, i), 160, 160, 'Exit effect: glaze splash, peak frame (150 ms)', 'effects');
}

/* ============================================================ shop mock-ups */
const SHOP_INK = '#3d2f52', SHOP_MUTED = '#8a7a9c', PAPER = '#fff3dc';
const SECTION = [
  { name: 'Themes', c: '#3f93e0' },
  { name: 'Characters', c: '#ef7d3a' },
  { name: 'Glazes', c: '#2db37a' },
  { name: 'Effects', c: '#a65bd1' },
];
const txt = (x, y, s, w, fill, str, anchor = 'start', extra = '') => `<text x="${f(x)}" y="${f(y)}" text-anchor="${anchor}" font-family="${FONT}" font-weight="${w}" font-size="${s}" fill="${fill}" ${extra}>${str}</text>`;

function coin(cx, cy, r) {
  return `<circle cx="${f(cx)}" cy="${f(cy + r * 0.14)}" r="${f(r)}" fill="#b87a0b"/><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="#f7c63b"/><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r * 0.68)}" fill="none" stroke="#d99a14" stroke-width="${f(r * 0.16)}"/><rect x="${f(cx - r * 0.4)}" y="${f(cy - r * 0.62)}" width="${f(r * 0.5)}" height="${f(r * 0.2)}" rx="${f(r * 0.1)}" fill="#fff3b8"/>`;
}
/** Glossy capsule: deep underside, body, one highlight pill, outlined label. */
function capsule(x, y, w, h, c, label, size, o = {}) {
  const depth = o.depth ?? Math.round(h * 0.18);
  let s = `<rect x="${x}" y="${y + depth}" width="${w}" height="${h}" rx="${h / 2}" fill="${shade(c, 0.38)}"/>`;
  s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${c}"/>`;
  s += `<rect x="${f(x + h * 0.45)}" y="${f(y + h * 0.1)}" width="${f(w - h * 0.9)}" height="${f(h * 0.2)}" rx="${f(h * 0.1)}" fill="#fff" opacity="0.38"/>`;
  if (label) s += txt(o.tx ?? x + w / 2, y + h * 0.66, size, 800, '#ffffff', label, o.anchor ?? 'middle', `stroke="${shade(c, 0.4)}" stroke-width="${f(size * 0.2)}" stroke-linejoin="round" paint-order="stroke"`);
  return s;
}
function pill(x, y, w, h, state, price) {
  if (state === 'equipped') {
    return capsule(x, y, w, h, '#2db37a', 'Equipped', 12, { depth: 3 }).replace('<rect', `<rect`) ;
  }
  if (state === 'owned') {
    return `<rect x="${x}" y="${y + 3}" width="${w}" height="${h}" rx="${h / 2}" fill="#b9cfc0"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="#dcefe2"/>`
      + `<path d="M${x + 14} ${y + h / 2} l3.6 3.8 l7 -7.6" fill="none" stroke="#2a8a5c" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`
      + txt(x + w / 2 + 9, y + h * 0.7, 12, 800, '#2a6e4d', 'Owned', 'middle');
  }
  if (state === 'gift') {
    return capsule(x, y, w, h, '#a65bd1', 'Day 7 gift', 11, { depth: 3 });
  }
  return `<rect x="${x}" y="${y + 3}" width="${w}" height="${h}" rx="${h / 2}" fill="#d09a1d"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="#ffd54f"/>`
    + `<rect x="${f(x + 12)}" y="${f(y + 2.5)}" width="${w - 24}" height="3.5" rx="1.7" fill="#fff" opacity="0.5"/>`
    + coin(x + 15, y + h / 2, 7.5) + txt(x + w / 2 + 9, y + h * 0.7, 13, 800, '#5a3a06', price, 'middle');
}

/* ---- thumbnails, drawn inside a box (bx, by, bw, bh) ---- */
const THEME_THUMBS = {
  Slate: ['#20263a', '#515f73', '#252c3b'], Citrus: ['#ffe9a3', '#b2df55', '#fffbe8'], Meadow: ['#d3eab0', '#2f6a24', '#f8fcea'],
  Clay: ['#ddcdba', '#b98a68', '#e5d8c8'], Bubblegum: ['#ffcfe0', '#6a45c2', '#fff3f7'], Seaside: ['#93d3ec', '#fbecc8', '#f5fbff'],
};
function themeThumb(bx, by, bw, bh, name) {
  const [bd, tray, floor] = THEME_THUMBS[name];
  const cx = bx + bw / 2, tw = bw - 30, th = bh - 14, tx = cx - tw / 2, ty = by + 7;
  let o = `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="12" fill="${bd}"/>`;
  o += `<rect x="${f(tx)}" y="${ty + 4}" width="${tw}" height="${th}" rx="9" fill="${shade(tray, 0.4)}"/><rect x="${f(tx)}" y="${ty}" width="${tw}" height="${th}" rx="9" fill="${tray}"/><rect x="${f(tx + 5)}" y="${ty + 5}" width="${tw - 10}" height="${th - 10}" rx="5" fill="${floor}"/>`;
  [[0, 0], [1, 1], [2, 2]].forEach(([i, k]) => {
    const w = 15, x = tx + 11 + i * 20, y = ty + th / 2 - 8 + (i === 1 ? 4 : -2);
    o += `<rect x="${f(x)}" y="${y + 3}" width="${w}" height="${w - 3}" rx="3.5" fill="${shade(TILES[k], 0.44)}"/><rect x="${f(x)}" y="${y}" width="${w}" height="${w - 3}" rx="3.5" fill="${TILES[k]}"/>`;
  });
  return o;
}
function charThumb(bx, by, bw, bh, kind) {
  const cx = bx + bw / 2, base = by + bh - 8;
  const bgs = { potter: '#cfe7c4', cat: '#ffe0b8', captain: '#c9e4f4', keeper: '#e1d4f2', baker: '#ffd9d3', fox: '#f6ddb6' };
  let o = `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="12" fill="${bgs[kind]}"/><ellipse cx="${cx}" cy="${base + 1}" rx="22" ry="5" fill="#2f5d2a" opacity="0.22"/>`;
  const skin = '#f2c9a0', skinD = '#d9a97c';
  const person = (body, hat, extra = '') => {
    let p = `<rect x="${cx - 13}" y="${base - 30}" width="26" height="30" rx="11" fill="${shade(body, 0.3)}"/><rect x="${cx - 13}" y="${base - 33}" width="26" height="30" rx="11" fill="${body}"/>`;
    p += `<circle cx="${cx}" cy="${base - 41}" r="12" fill="${skinD}"/><circle cx="${cx}" cy="${base - 43}" r="12" fill="${skin}"/>`;
    p += `<circle cx="${cx - 4}" cy="${base - 43}" r="1.5" fill="#4a3426"/><circle cx="${cx + 4}" cy="${base - 43}" r="1.5" fill="#4a3426"/>`;
    return p + hat + extra;
  };
  if (kind === 'potter') o += person('#d9764a', `<rect x="${cx - 17}" y="${base - 55}" width="34" height="7" rx="3.5" fill="#8a5a3c"/><rect x="${cx - 10}" y="${base - 64}" width="20" height="12" rx="5" fill="#b98f5a"/>`, `<rect x="${cx - 8}" y="${base - 22}" width="16" height="22" rx="5" fill="#fff1d6"/>`);
  if (kind === 'captain') o += person('#2f6fa3', `<rect x="${cx - 13}" y="${base - 56}" width="26" height="10" rx="5" fill="#1d4366"/><rect x="${cx - 16}" y="${base - 49}" width="32" height="5" rx="2.5" fill="#102a44"/>`);
  if (kind === 'keeper') o += person('#6e4b95', `<rect x="${cx - 12}" y="${base - 56}" width="24" height="9" rx="4.5" fill="#4a3070"/>`, `<rect x="${cx + 18}" y="${base - 40}" width="3" height="40" rx="1.5" fill="#7a4d31"/><rect x="${cx + 13}" y="${base - 54}" width="13" height="15" rx="4" fill="#8f4226"/><rect x="${cx + 15}" y="${base - 52}" width="9" height="11" rx="3" fill="#ffd566"/>`);
  if (kind === 'baker') o += person('#ffffff', `<circle cx="${cx - 7}" cy="${base - 58}" r="7" fill="#ffffff"/><circle cx="${cx + 7}" cy="${base - 58}" r="7" fill="#ffffff"/><rect x="${cx - 12}" y="${base - 58}" width="24" height="9" rx="3" fill="#ffffff"/><rect x="${cx - 12}" y="${base - 52}" width="24" height="3" rx="1.5" fill="#d9dde2"/>`);
  if (kind === 'cat' || kind === 'fox') {
    const c = kind === 'cat' ? '#8a8f9c' : '#e0742e', d = shade(c, 0.3);
    o += `<path d="M${cx + 14} ${base - 6} q20 -4 14 -26" fill="none" stroke="${d}" stroke-width="7" stroke-linecap="round"/><path d="M${cx + 14} ${base - 9} q20 -4 14 -26" fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round"/>`;
    o += `<rect x="${cx - 14}" y="${base - 28}" width="28" height="28" rx="12" fill="${d}"/><rect x="${cx - 14}" y="${base - 31}" width="28" height="28" rx="12" fill="${c}"/>`;
    o += `<path d="M${cx - 14} ${base - 43} L${cx - 11} ${base - 58} L${cx - 2} ${base - 47}Z M${cx + 14} ${base - 43} L${cx + 11} ${base - 58} L${cx + 2} ${base - 47}Z" fill="${c}"/>`;
    o += `<ellipse cx="${cx}" cy="${base - 38}" rx="15" ry="13" fill="${d}"/><ellipse cx="${cx}" cy="${base - 40}" rx="15" ry="13" fill="${c}"/>`;
    o += `<circle cx="${cx - 5}" cy="${base - 41}" r="1.7" fill="#2b2b33"/><circle cx="${cx + 5}" cy="${base - 41}" r="1.7" fill="#2b2b33"/>`;
    if (kind === 'fox') o += `<path d="M${cx - 9} ${base - 36} Q${cx} ${base - 28} ${cx + 9} ${base - 36} Q${cx} ${base - 33} ${cx - 9} ${base - 36}Z" fill="#fff3e0"/>`;
  }
  return o;
}
function glazeThumb(bx, by, bw, bh, fin, k) {
  const s = 36;
  return `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="12" fill="#2e3742"/>` + tileSvg(Math.round(bx + (bw - s) / 2), by + 12, s, TILES[k], fin, 200 + k, GLYPHS[k]);
}
function effectThumb(bx, by, bw, bh, kind) {
  const cx = bx + bw / 2, cy = by + bh / 2;
  let o = `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="12" fill="#515f73"/><rect x="${bx}" y="${by + bh - 10}" width="${bw}" height="10" rx="5" fill="#323b49" opacity="0.5"/>`;
  if (kind === 'plain') {
    o += `<rect x="${cx - 12}" y="${cy - 10}" width="24" height="24" rx="5" fill="${shade(TILES[4], 0.44)}"/><rect x="${cx - 12}" y="${cy - 14}" width="24" height="24" rx="5" fill="${TILES[4]}" opacity="0.55"/><rect x="${cx - 6}" y="${cy - 10}" width="12" height="4" rx="2" fill="#fff" opacity="0.4"/>`;
  } else if (kind === 'puff') {
    [[-14, 6, 10], [2, -4, 13], [18, -12, 8]].forEach(([dx, dy, r]) => { o += `<circle cx="${cx + dx}" cy="${cy + dy + 2.5}" r="${r}" fill="#b9c4cf"/><circle cx="${cx + dx}" cy="${cy + dy}" r="${r}" fill="#fff"/>`; });
  } else if (kind === 'petals') {
    [[-18, 8, -30], [-6, -6, 40], [8, 8, 100], [18, -8, 150], [2, 18, 20]].forEach(([dx, dy, rot]) => { o += petalPath(cx + dx, cy + dy, rot, TILES[3], 1); });
  } else {
    o += `<ellipse cx="${cx}" cy="${cy + 17}" rx="14" ry="4.5" fill="${shade(TILES[1], 0.4)}"/><ellipse cx="${cx}" cy="${cy + 15}" rx="14" ry="4.5" fill="${TILES[1]}"/>`;
    [[-16, -6, 4], [-8, -16, 5], [4, -18, 3.2], [14, -8, 4.6], [20, 4, 3]].forEach(([dx, dy, r]) => { o += `<circle cx="${cx + dx}" cy="${cy + dy + 1.4}" r="${r}" fill="${shade(TILES[1], 0.4)}"/><circle cx="${cx + dx}" cy="${cy + dy}" r="${r}" fill="${TILES[1]}"/>`; });
  }
  return o;
}

function card(x, y, w, h, thumb, name, state, price) {
  const equipped = state === 'equipped';
  let o = `<rect x="${x}" y="${y + 5}" width="${w}" height="${h}" rx="18" fill="${equipped ? '#7fcfa8' : '#e4cfa6'}"/>`;
  o += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="#fffaf0"${equipped ? ' stroke="#2db37a" stroke-width="3"' : ''}/>`;
  o += thumb(x + 8, y + 8, w - 16, 72);
  o += txt(x + w / 2, y + 99, 15, 800, SHOP_INK, name, 'middle');
  o += pill(x + (w - 108) / 2, y + h - 30, 108, 22, state, price);
  return o;
}
function header(x, y, w, sec, count, icon) {
  let o = capsule(x, y, w, 52, sec.c, sec.name, 22, { tx: x + 64, anchor: 'start', depth: 8 });
  o += `<circle cx="${x + 32}" cy="${y + 26}" r="17" fill="${shade(sec.c, 0.3)}"/><circle cx="${x + 32}" cy="${y + 24}" r="17" fill="#fff" opacity="0.92"/>` + icon(x + 32, y + 24);
  o += txt(x + w - 20, y + 33, 13, 700, '#ffffff', count, 'end', `stroke="${shade(sec.c, 0.4)}" stroke-width="2.6" stroke-linejoin="round" paint-order="stroke"`);
  return o;
}
const ICONS = {
  Themes: (x, y) => `<rect x="${x - 10}" y="${y - 8}" width="20" height="16" rx="4" fill="#3f93e0"/><rect x="${x - 6}" y="${y - 4}" width="12" height="8" rx="2" fill="#fffbe8"/>`,
  Characters: (x, y) => `<circle cx="${x}" cy="${y - 4}" r="6" fill="#ef7d3a"/><rect x="${x - 9}" y="${y + 3}" width="18" height="8" rx="4" fill="#ef7d3a"/>`,
  Glazes: (x, y) => `<rect x="${x - 9}" y="${y - 7}" width="18" height="16" rx="4" fill="#1f7f55"/><rect x="${x - 9}" y="${y - 9}" width="18" height="16" rx="4" fill="#2db37a"/><rect x="${x - 5}" y="${y - 6}" width="9" height="3" rx="1.5" fill="#fff" opacity="0.7"/>`,
  Effects: (x, y) => `<circle cx="${x - 4}" cy="${y + 3}" r="5.5" fill="#a65bd1"/><circle cx="${x + 4}" cy="${y - 3}" r="7" fill="#a65bd1"/>`,
};

const ITEMS = {
  Themes: [['Slate', 'equipped'], ['Citrus', 'price', '100'], ['Meadow', 'price', '100'], ['Clay', 'owned'], ['Bubblegum', 'price', '150'], ['Seaside', 'price', '200']],
  Characters: [['Potter', 'equipped', null, 'potter'], ['Cat', 'owned', null, 'cat'], ['Ferry captain', 'price', '120', 'captain'], ['Lantern keeper', 'price', '150', 'keeper'], ['Baker', 'gift', null, 'baker'], ['Fox', 'price', '200', 'fox']],
  Glazes: [['Gloss', 'equipped', null, 'gloss'], ['Speckled', 'price', '150', 'speckled'], ['Crackle', 'price', '200', 'crackle'], ['Matte', 'owned', null, 'matte']],
  Effects: [['Plain fade', 'owned', null, 'plain'], ['Kiln puff', 'equipped', null, 'puff'], ['Petals', 'price', '80', 'petals'], ['Glaze splash', 'price', '120', 'splash']],
};
function thumbFor(sec, it, idx) {
  if (sec === 'Themes') return (bx, by, bw, bh) => themeThumb(bx, by, bw, bh, it[0]);
  if (sec === 'Characters') return (bx, by, bw, bh) => charThumb(bx, by, bw, bh, it[3]);
  if (sec === 'Glazes') return (bx, by, bw, bh) => glazeThumb(bx, by, bw, bh, it[3], [0, 1, 2, 4][idx] ?? 0);
  return (bx, by, bw, bh) => effectThumb(bx, by, bw, bh, it[3]);
}
function grid(sec, x0, y0) {
  let o = '';
  ITEMS[sec].forEach((it, i) => {
    const cx = x0 + (i % 2) * 180, cy = y0 + Math.floor(i / 2) * 150;
    o += card(cx, cy, 163, 136, thumbFor(sec, it, i), it[0], it[1], it[2]);
  });
  return { svg: o, h: Math.ceil(ITEMS[sec].length / 2) * 150 - 14 };
}
function topBar(W) {
  let o = `<rect x="16" y="${34 + 5}" width="44" height="44" rx="22" fill="#a04f1f"/><rect x="16" y="34" width="44" height="44" rx="22" fill="#ef7d3a"/><rect x="26" y="38" width="24" height="8" rx="4" fill="#fff" opacity="0.38"/><path d="M41 47 l-8 9 l8 9" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;
  o += txt(W / 2, 66, 32, 800, SHOP_INK, 'Shop', 'middle');
  o += `<rect x="${W - 130}" y="${34 + 4}" width="114" height="40" rx="20" fill="#d09a1d"/><rect x="${W - 130}" y="34" width="114" height="40" rx="20" fill="#ffd54f"/><rect x="${W - 112}" y="37" width="78" height="6" rx="3" fill="#fff" opacity="0.5"/>` + coin(W - 108, 54, 11) + txt(W - 30, 62, 20, 800, '#5a3a06', '1,240', 'end');
  return o;
}
function statusBar(W) { return txt(24, 22, 13, 700, SHOP_INK, '9:41') + `<rect x="${W - 54}" y="11" width="30" height="12" rx="4" fill="none" stroke="${SHOP_INK}" stroke-width="1.6"/><rect x="${W - 51}" y="14" width="20" height="6" rx="2" fill="${SHOP_INK}"/>`; }

function shopScreen() {
  const W = 375, H = 812;
  let o = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="${PAPER}"/>`;
  o += statusBar(W) + topBar(W);
  // Section tabs: four glossy capsules; the active one stands tall in full colour.
  const tw = 80, gap = 7.7;
  SECTION.forEach((sec, i) => {
    const x = 16 + i * (tw + gap), active = i === 0;
    const c = active ? sec.c : tint(sec.c, 0.55);
    o += capsule(x, active ? 98 : 102, tw, active ? 44 : 38, c, sec.name, 12.5, { depth: active ? 8 : 5 }).replace(/fill="#ffffff" (text-anchor|stroke)/, active ? 'fill="#ffffff" $1' : `fill="${shade(sec.c, 0.45)}" $1`).replace(/stroke="[^"]*" stroke-width="[^"]*"/, active ? '$&' : 'stroke="none" stroke-width="0"');
  });
  o += txt(16, 182, 20, 800, SHOP_INK, 'Themes') + txt(W - 16, 182, 13, 700, SHOP_MUTED, '6 items', 'end');
  const g = grid('Themes', 16, 196);
  o += g.svg;
  o += txt(W / 2, 196 + g.h + 34, 12, 700, SHOP_MUTED, 'Everything costs coins. No real-money items.', 'middle');
  o += capsule(88, 722, 200, 50, '#ef7d3a', 'Back to map', 18, { depth: 8 });
  return o + `</svg>`;
}
write('shop-mockup.svg', shopScreen(), 375, 812, 'Shop screen mock-up (375x812)', 'shop');

function shopScroll() {
  const W = 375;
  let y = 100, body = '';
  for (const sec of SECTION) {
    body += header(16, y, 343, sec, ITEMS[sec.name].length + ' items', ICONS[sec.name]);
    const g = grid(sec.name, 16, y + 52 + 22);
    body += g.svg;
    y += 52 + 22 + g.h + 30;
  }
  const H = y + 20;
  let o = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="${PAPER}"/>`;
  o += statusBar(W) + topBar(W) + body;
  o += txt(W / 2, H - 14, 12, 700, SHOP_MUTED, 'Everything costs coins. No real-money items.', 'middle');
  return { svg: o + `</svg>`, H };
}
{ const s = shopScroll(); write('shop-mockup-scroll.svg', s.svg, 375, s.H, 'Shop as one scrolling page, four sections stacked', 'shop'); }

/* ============================================================ markdown */
const fmt = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
function frameTable(times, cols, fn) {
  let t = '| t (ms) | ' + cols.join(' | ') + ' |\n|---|' + cols.map(() => '---').join('|') + '|\n';
  for (const ms of times) t += `| ${ms} | ${fn(ms).join(' | ')} |\n`;
  return t;
}
const kilnTable = frameTable([0, 60, 120, 180, 240, 320, 440], ['puff A radius / alpha', 'puff B radius / alpha', 'puff C radius / alpha'],
  (t) => kilnState(t).map((p) => (p.a <= 0 && t < 1 ? 'not started' : `${fmt(p.r)} px / ${p.a.toFixed(2)}`)));
const petalList = PETALS.map((p, i) => `| ${i + 1} | ${p.delay} | ${p.ang.toFixed(0)} | ${p.dist.toFixed(0)} | ${p.rot0.toFixed(0)} | ${p.spin.toFixed(0)} |`).join('\n');
const petalTable = frameTable([0, 80, 160, 240, 320, 400, 480], ['petals visible', 'mean distance from gate (px)', 'mean alpha'],
  (t) => { const s = petalState(t).filter((p) => p.a > 0); const d = s.reduce((a, p) => a + Math.hypot(p.x - GX, p.y - GY), 0) / Math.max(1, s.length); const a = s.reduce((q, p) => q + p.a, 0) / Math.max(1, s.length); return [String(s.length), d.toFixed(1), a.toFixed(2)]; });
const dropList = DROPS.map((d, i) => `| ${i + 1} | ${d.ang.toFixed(0)} | ${d.v.toFixed(0)} | ${d.r0} |`).join('\n');
const splashTable = frameTable([0, 60, 120, 180, 240, 330, 420], ['pool rx / ry (px)', 'pool alpha', 'drop alpha', 'drop radius, small / big (px)'],
  (t) => { const s = splashState(t); return [`${s.pool.rx.toFixed(1)} / ${s.pool.ry.toFixed(1)}`, s.pool.a.toFixed(2), s.drops[1].a.toFixed(2), `${s.drops[1].r.toFixed(1)} / ${s.drops[0].r.toFixed(1)}`]; });

const GLAZES_MD = `# Glaze finishes for board tiles

Design only. Four finishes for the tile face in render.ts: gloss, speckled, crackle, matte. See finishes-sheet.svg for all four on all six colours.

Every finish is a change to what is drawn on top of the flat base colour inside drawBlock. The base colour is read from blockColour(block.color) exactly as today, and nothing below ever replaces it, blends it towards another hue or adds a gradient. The six Okabe-Ito tile colours stay fixed: #E69F00 #56B4E9 #009E73 #CC79A7 #0072B2 #D55E00.

## What stays the same in every finish

These steps already exist in drawBlock and do not change. Keep them in this order.

1. Contact shadow: black at alpha 0.34, offset by depth * 0.3 and depth * 1.25.
2. Side wall (the darker underside): shade(base, 0.44), drawn at dy + depth.
3. Top face: solid base colour.
4. (Finish layer goes here, clipped to the face.)
5. Cell seams for multi-cell pieces.
6. Rim line: tint(base, 0.5) at alpha 0.85, inset 1.5 px. Skipped for matte, which has its own inset.
7. Hard outline: shade(base, 0.58) at alpha 0.9.
8. Colour-blind glyph, if the setting is on. Always last, always the same size and ink, in every finish.

Today step 4 is the soft vertical-gradient sheen. Gloss replaces it with a flat pill (no gradient, as the style rules say). A finish is a small function that draws step 4 (and for matte, swaps step 6).

## Shared helpers

Seeding. A tile's pattern comes from its block id, never from Math.random and never from the frame. Same tile, same pattern, every frame, every restart of a level.

~~~
function rng(seed) {            // mulberry32
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
~~~

Cache. Compute each tile's pattern once, when the level loads, as plain numbers in unit coordinates (0 to 1 across the tile face): a small array of speckles, or a transform choice for crackle. Store it in a Map keyed by block id. Each frame the draw code scales those numbers by the block's pixel bounds. A block covering several cells uses the bounds of the whole piece, so the pattern stretches with the piece; for pieces longer than two cells, tile the pattern per cell (loop over blockCells) so dots do not smear.

A finish is chosen from the save (equippedGlaze). Crates ignore the finish and keep their ribs.

The face path is face() from drawBlock; b is bounds (x, y, w, h); cell is the cell size; k = cell / 56 is a scale factor so numbers below hold at any board size.

## 1. Gloss (default, free)

Crisp, glassy, one highlight.

- Fill: the flat base colour, as today.
- Rim/underside offsets: as today. depth = max(3, round(cell * 0.11)), underside shade 0.44.
- Highlight shape: one flat pill, white at alpha 0.55, no gradient. Position: x = b.x + 0.13 * b.w, y = b.y + 0.11 * b.h, width 0.5 * b.w, height 0.14 * b.h, fully rounded ends.
- Nothing else on the face.

~~~
// step 4, gloss
ctx.save();
face(); ctx.clip();
const hx = b.x + 0.13 * b.w, hy = b.y + 0.11 * b.h;
const hw = 0.5 * b.w, hh = 0.14 * b.h;
ctx.fillStyle = 'rgba(255,255,255,0.55)';
ctx.beginPath();
ctx.roundRect(hx, hy, hw, hh, hh / 2);   // fallback: two arcs and a rect for older WebViews
ctx.fill();
ctx.restore();
~~~

Cost: one clipped path fill. Cheaper than today's createLinearGradient per tile per frame, so gloss is a small saving.

Colour: white over the base at 0.55 alpha is confined to a 14 percent strip at the top. The other 86 percent of the face is the exact base colour.

## 2. Speckled

A fired-clay look: tiny flecks, like a glaze with iron in it.

- Fill: the flat base colour.
- Rim/underside offsets: as today.
- Highlight: one small satin pill, white alpha 0.32, 0.3 wide by 0.1 high at the same top-left origin. Smaller than gloss so the flecks read first.
- Speckles: 15 per cell. The first 10 are dark: shade(base, 0.32) at alpha 0.6. The last 5 are light: tint(base, 0.55) at alpha 0.75. Radius is (0.016 + r * 0.02) * cell, at least 0.9 px. Positions are in the inner 70 percent of the face: x = 0.15 + r * 0.7, y = 0.17 + r * 0.66, so no fleck touches the rim.

Pattern precompute, once per block:

~~~
function makeSpeckles(blockId) {
  const r = rng(blockId * 7919 + 13);
  const list = [];
  for (let i = 0; i < 15; i++) {
    list.push({ x: 0.15 + r() * 0.7, y: 0.17 + r() * 0.66, r: 0.016 + r() * 0.02, light: i >= 10 });
  }
  return list;
}
~~~

Per frame:

~~~
// step 4, speckled (face already clipped)
drawPill(b, 0.13, 0.11, 0.3, 0.1, 'rgba(255,255,255,0.32)');
const sp = speckleCache.get(block.id);
// batch by colour: two fills, not fifteen
ctx.fillStyle = darkFleck;            // shade(base, 0.32), computed once per colour, with alpha baked in
ctx.beginPath();
for (const p of sp) if (!p.light) { const px = b.x + p.x * b.w, py = b.y + p.y * b.h; ctx.moveTo(px + rr, py); ctx.arc(px, py, Math.max(0.9, p.r * cell), 0, TAU); }
ctx.fill();
ctx.fillStyle = lightFleck;           // tint(base, 0.55)
ctx.beginPath();
for (const p of sp) if (p.light) { /* same, light ones */ }
ctx.fill();
~~~

Colour: flecks cover under 6 percent of the face and are the same hue, only darker or lighter by a fixed amount. The majority of the face remains the exact base colour.

## 3. Crackle

Fine hairline cracks, like old crazed glaze.

- Fill: the flat base colour.
- Rim/underside offsets: as today.
- Highlight: one pill, white alpha 0.4, 0.34 wide by 0.11 high.
- Cracks: one fixed set of 6 thin hairline polylines in unit coordinates (the CRACKLE array in build-finishes.mjs holds exactly these). Stroke shade(base, 0.38) at alpha 0.55, width max(0.8, cell * 0.016), round caps and joins. Clip to the face so no crack passes the edge.
- Variety without randomness: each block picks one of 8 variants, seed % 8, which is 4 rotations times an optional mirror of the same template. Neighbouring tiles look different, but no path is generated at runtime.

~~~
const CRACKLE = [
  [[0.06,0.34],[0.30,0.42],[0.46,0.30],[0.72,0.38],[0.94,0.27]],
  [[0.46,0.30],[0.53,0.08]],
  [[0.30,0.42],[0.26,0.70],[0.52,0.78],[0.62,0.96]],
  [[0.72,0.38],[0.66,0.62],[0.90,0.76]],
  [[0.26,0.70],[0.06,0.82]],
  [[0.52,0.78],[0.78,0.88]],
];
function variantPoint(v, x, y) {      // v = block.id % 8
  if (v >> 2) x = 1 - x;              // mirror
  for (let i = 0; i < (v & 3); i++) { const t = x; x = 1 - y; y = t; }   // rotate 90 degrees
  return [x, y];
}

// step 4, crackle (face already clipped)
drawPill(b, 0.13, 0.11, 0.34, 0.11, 'rgba(255,255,255,0.4)');
ctx.strokeStyle = crackColour;        // shade(base, 0.38) with alpha 0.55
ctx.lineWidth = Math.max(0.8, cell * 0.016);
ctx.lineCap = 'round'; ctx.lineJoin = 'round';
ctx.beginPath();
for (const line of CRACKLE) {
  for (let i = 0; i < line.length; i++) {
    const q = variantPoint(v, line[i][0], line[i][1]);
    const px = b.x + q[0] * b.w, py = b.y + q[1] * b.h;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
}
ctx.stroke();                          // one stroke call for all six lines
~~~

Cost: 6 polylines, about 20 points, one stroke. Cache the point list per block (or per variant, then offset by bounds) so no per-frame trig or allocation.

Colour: the stroke is 1 px and at most 4 percent of the face, same hue family, darker by a fixed amount.

## 4. Matte

No shine. Reads as unglazed, soft-fired clay.

- Fill: the flat base colour.
- Highlight: none.
- Rim: the usual bright rim line is skipped. Instead a soft inset: a dark band on the top-left inside edge and a light band on the bottom-right inside edge, as if the face were pressed in a little.
- Underside offsets: as today (depth and shade 0.44), so the tile still stands proud of the tray.
- Inset widths: sh = max(1.4, cell * 0.04). Dark: shade(base, 0.3) at alpha 0.38. Light: tint(base, 0.35) at alpha 0.3. Both strokes are 2 * sh wide and clipped to the face, so only the inner half shows.

~~~
// step 4 and 6, matte (face already clipped)
const sh = Math.max(1.4, cell * 0.04);
ctx.lineWidth = sh * 2;
ctx.strokeStyle = darkInset;           // shade(base, 0.3), alpha 0.38
strokeFaceOffset(+sh, +sh);            // the face path shifted down-right: shadow lands top-left
ctx.strokeStyle = lightInset;          // tint(base, 0.35), alpha 0.3
strokeFaceOffset(-sh, -sh);            // shifted up-left: light lands bottom-right
// no rim line, no highlight
~~~

Where strokeFaceOffset(ox, oy) calls blockPath(ctx, block, vp, dx + ox, dy + oy, inset) then ctx.stroke().

Cost: two clipped strokes, no gradients.

Colour: the inset bands are 1 to 2 px of a fixed lighter and darker step of the same colour.

## Performance notes for low-end Android

- No gradients and no shadowBlur anywhere in the finish layer. Everything is a flat fill or a hairline stroke, which is the cheapest thing a WebView canvas does. The existing sheen gradient goes away.
- Batch by colour: speckles in two fills, cracks in one stroke. Never one draw call per fleck.
- Precompute per-block patterns on level load and keep them in a Map. Per frame there is no rng call, no allocation, no string building. Cache the derived colour strings (shade/tint results) per colour, not per tile.
- One clip per tile (reuse the clip already made for the sheen) and do all finish drawing inside it.
- Stills: tiles that are not moving do not need redrawing at 60 fps. If the renderer already caches a static layer, keep blocks out of it as now; if blocks are redrawn on idle frames, consider an offscreen sprite per (colour, finish, shape) at the board's pixel size. A level has at most a few dozen blocks, so the memory is small, and a drawImage per block replaces about 20 path ops. Seeds then apply per colour and shape rather than per block, which is fine for speckled and crackle.
- Speckle count is the only knob: 15 per cell is the default; a low-end flag can use 8 and skip the light flecks.
- Reduced motion has no effect: finishes are static.

## How colour is preserved

- Base fill: always blockColour(block.color), exact hex, unmodified.
- Every overlay is a fixed tint or shade of that same colour, or white at low alpha, covering a small fraction of the face.
- Outline, underside, rim and glyph already derive from the base colour with fixed factors, so they carry the same hue in every finish.
- The finish never depends on the colour index, so no finish can be mistaken for a colour cue.

## Colour-blind distinguishability

Distinguishing the six tiles must never depend on the finish.

- The glyph (circle, triangle, square, diamond, star, hexagon) is drawn last, at the same size and ink, in every finish. Speckles and cracks are drawn under it and are far lower contrast, so they cannot hide it.
- Patterns are identical for every colour. A speckled orange tile and a speckled blue tile differ only by hue, lightness and glyph, never by pattern, so the pattern cannot be read as a colour code.
- The finish does not change lightness meaningfully. The highlight pill sits in the top 25 percent and the flecks are small, so the Okabe-Ito lightness differences, which are what colour-blind players rely on, survive.
- Matte has no highlight at all, which makes it the calmest option for players who find glints distracting.
- Recommendation: glyphs on by default (already on the parked list), because speckled and crackle slightly reduce the face area available for a shape-free read.
- Check before shipping: run finishes-sheet.svg through a deuteranopia and protanopia simulation and confirm the six columns still separate.
`;

const EFFECTS_MD = `# Exit effects: a block leaves through its gate

Design only. Three effects for the moment a block slides out of its gate: kiln puff, petals, glaze splash. The stills are effect-kiln-puff.svg, effect-petals.svg and effect-glaze-splash.svg (160 x 160, a slate tray corner with a gate and a tile mid-exit).

Shared rules:

- Calm. Under 0.5 s: puff 440 ms, petals 480 ms, splash 420 ms.
- No screen shake, no camera movement, no flash, no full-screen overlay.
- Nothing random per frame. Every particle's launch values come from a seeded generator, seeded with the block id when the exit starts, and the frame position is a pure function of time since the exit began. Same block, same exit.
- Flat shapes only: each particle is a flat fill with a darker underside copy offset 1.4 to 2.5 px down, plus at most one highlight dot on the large ones. No blur, no gradients, no star shapes, no sparkle glints.
- The gate is where the block leaves. The origin of every effect is the gate mouth: gateX, gateY, the middle of the opening on the outer wall line, in canvas pixels.
- Sizes below are for a 56 px cell. Multiply every length by k = cell / 56.
- Effects draw after the board and tiles in the same frame, so a particle can sit over the tray edge. They are cheap: at most 9 particles, 2 draw calls each.
- Reduced motion: skip the animation and draw nothing (the block simply leaves). Optionally hold the peak frame for 120 ms.
- Colour: kiln puff is neutral white and pale slate, so it works on every theme. Petals and splash take the leaving block's own tile colour (blockColour, unmodified), with the underside at shade 0.35 to 0.4 and the highlight at tint 0.6.

The effect runs on a time value t in milliseconds since the block crossed the gate line. A spawned list lives in a small array: { startTime, gateX, gateY, colour, seed, kind }. It is removed when t exceeds the effect length.

## Helpers

~~~
function easeOut(p) { return 1 - Math.pow(1 - p, 3); }
function clamp01(v) { return Math.max(0, Math.min(1, v)); }
// rng(seed) is the mulberry32 function from glazes.md
~~~

## 1. Kiln puff (default, free)

Three flat round puffs, like smoke from a kiln chimney, drifting up and out from the gate while growing and thinning. White face, pale slate underside so they read on light and dark themes.

Particles: 3. No randomness needed; the three puffs are fixed offsets. Palette: face #ffffff, underside #b9c4cf (offset 2.5 px down). Peak alpha 0.92.

| puff | start delay (ms) | radius start to end (px) | drift end (dx, dy) px |
|---|---|---|---|
| A | 0 | 3 to 14 | (16, -10) |
| B | 60 | 2 to 11 | (28, -22) |
| C | 110 | 2 to 8 | (10, -30) |

Per puff, local progress lp = clamp01((t - delay) / (440 - delay)) and e = easeOut(lp). Radius = r0 + (r1 - r0) * e. Position = gate + (dx, dy) * e. Alpha = 0.92 * (1 - fadeP), where fadeP = clamp01((lp - 0.5) / 0.5) squared, so it holds for the first half and thins in the second.

Frame by frame (computed from the same formulas as the still):

${kilnTable}
Peak frame: 180 ms (effect-kiln-puff.svg). All three puffs are visible, A is near full size, C is still growing.

Pseudo-code:

~~~
function drawKilnPuff(ctx, fx, t, k) {
  const D = 440;
  for (const p of KILN_PUFFS) {              // the table above
    const lp = clamp01((t - p.delay) / (D - p.delay));
    if (t < p.delay) continue;
    const e = easeOut(lp);
    const fade = Math.pow(clamp01((lp - 0.5) / 0.5), 2);
    const a = 0.92 * (1 - fade);
    if (a <= 0.01) continue;
    const x = fx.gateX + p.dx * e * k;
    const y = fx.gateY + p.dy * e * k;
    const r = (p.r0 + (p.r1 - p.r0) * e) * k;
    ctx.globalAlpha = a;
    ctx.fillStyle = '#b9c4cf';               // underside
    ctx.beginPath(); ctx.arc(x, y + 2.5 * k, r, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
}
~~~

Cost: 6 arcs. Trivial.

## 2. Petals

Nine small petals fan out of the gate in the leaving block's own colour, turn slowly and drop a little as they fade. Think of a handful of petals tossed, not confetti: flat, slow, all one colour.

Particles: 9. Palette: face tint(colour, 0.12), underside shade(colour, 0.35) offset 1.4 px down, one highlight ellipse tint(colour, 0.6). Shape: ellipse 5.6 by 3.2 px, rotated.

Launch values come from rng(blockId) once, in this order per petal: angle jitter, distance, spin, starting rotation. (The still uses seed 4242 so the picture is reproducible.)

- Delay: petal i starts at i * 8 ms (0 to 64 ms).
- Direction: angle = -70 + (i / 8) * 140 degrees plus jitter of up to 8 degrees either way. That is a rightward fan; rotate the whole fan to point away from the gate for gates on other sides (angle += gate outward angle).
- Travel: distance 26 to 38 px, eased out. Gravity: an extra 14 px downward by the end, y += 14 * lp * lp.
- Spin: rotation = rot0 + spin * lp, spin within plus or minus 80 degrees.
- Alpha: 1 until lp = 0.6, then linear to 0 at lp = 1.
- Duration: 480 ms.

Seeded launch values used by the still (angle in degrees, distance in px, rotation start, spin):

| petal | delay (ms) | angle | distance | start rotation | spin |
|---|---|---|---|---|---|
${petalList}

Frame by frame:

${petalTable}
Peak frame: 220 ms (effect-petals.svg). All nine are out and fully opaque, still fanned.

Pseudo-code:

~~~
function drawPetals(ctx, fx, t, k) {
  const D = 480;
  for (const p of fx.petals) {               // built once at spawn from rng(fx.seed)
    if (t < p.delay) continue;
    const lp = clamp01((t - p.delay) / (D - p.delay));
    const e = easeOut(lp);
    const a = 1 - clamp01((lp - 0.6) / 0.4);
    if (a <= 0.01) continue;
    const ang = p.angle * Math.PI / 180;
    const x = fx.gateX + Math.cos(ang) * p.dist * e * k;
    const y = fx.gateY + Math.sin(ang) * p.dist * e * k + 14 * lp * lp * k;
    ctx.save();
    ctx.translate(x, y); ctx.rotate((p.rot0 + p.spin * lp) * Math.PI / 180);
    ctx.globalAlpha = a;
    ctx.fillStyle = fx.petalUnder;            // shade(colour, 0.35), cached at spawn
    ctx.beginPath(); ctx.ellipse(0, 1.4 * k, 5.6 * k, 3.2 * k, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = fx.petalFace;             // tint(colour, 0.12)
    ctx.beginPath(); ctx.ellipse(0, 0, 5.6 * k, 3.2 * k, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = fx.petalGlint;            // tint(colour, 0.6)
    ctx.beginPath(); ctx.ellipse(-1.4 * k, -0.9 * k, 2.2 * k, 0.9 * k, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
}
~~~

Cost: 27 ellipse fills at most. Cache the three colour strings at spawn. A save/restore per petal is fine at this count.

## 3. Glaze splash

The block's glaze is poured out at the gate: a flat pool spreads on the lip and eight drops arc up and over, shrinking as they fall. Colour is the leaving block's colour.

Particles: 1 pool plus 8 drops. Palette: face colour (exact), underside shade(colour, 0.4) offset 1.4 px down (3 px for the pool), highlight dot tint(colour, 0.65) on the three large drops only.

- Pool: an ellipse centred 6 px below the gate point. rx grows 4 to 16, ry 1.5 to 5.5, eased out. Alpha holds to lp = 0.6 then fades to 0.
- Drops: launched in an upward fan, angle -165 to -15 degrees (8 drops, spaced evenly, plus jitter up to 6 degrees), speed 30 to 42 px over the effect, with a gravity term of 0.5 * 58 * lp * lp px. Position = gate + (cos, sin) * speed * lp + (0, 6 + gravity). Large drops (every third) start at 4.6 px, small ones at 3.2 px. Radius shrinks to 35 percent of its start by the end. Alpha holds to lp = 0.65 then fades to 0.
- Duration: 420 ms. Linear time for the drops (it reads as flung), eased for the pool.

Seeded launch values used by the still (seed 777):

| drop | angle | speed | start radius |
|---|---|---|---|
${dropList}

Frame by frame (drop figures are for drop 2, small, and drop 1, large):

${splashTable}
Peak frame: 150 ms (effect-glaze-splash.svg). The pool is mid-spread and every drop is near its apex.

Pseudo-code:

~~~
function drawGlazeSplash(ctx, fx, t, k) {
  const D = 420;
  const lp = clamp01(t / D), e = easeOut(lp);
  const poolA = 1 - clamp01((lp - 0.6) / 0.4);
  const rx = (4 + 12 * e) * k, ry = (1.5 + 4 * e) * k;
  ctx.globalAlpha = poolA;
  ctx.fillStyle = fx.under;                   // shade(colour, 0.4)
  ctx.beginPath(); ctx.ellipse(fx.gateX, fx.gateY + 9 * k, rx, ry, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = fx.colour;
  ctx.beginPath(); ctx.ellipse(fx.gateX, fx.gateY + 6 * k, rx, ry, 0, 0, TAU); ctx.fill();
  for (const d of fx.drops) {                 // built once at spawn from rng(fx.seed)
    const a = Math.PI * d.angle / 180;
    const x = fx.gateX + Math.cos(a) * d.speed * lp * k;
    const y = fx.gateY + (6 + Math.sin(a) * d.speed * lp + 0.5 * 58 * lp * lp) * k;
    const r = d.r0 * (1 - 0.65 * lp) * k;
    const da = 1 - clamp01((lp - 0.65) / 0.35);
    if (da <= 0.01) continue;
    ctx.globalAlpha = da;
    ctx.fillStyle = fx.under;
    ctx.beginPath(); ctx.arc(x, y + 1.4 * k, r, 0, TAU); ctx.fill();
    ctx.fillStyle = fx.colour;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    if (d.r0 > 4) { ctx.fillStyle = fx.glint; ctx.beginPath(); ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.32, 0, TAU); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
}
~~~

Cost: 18 arcs and 2 ellipses at most.

## Wiring notes

- Spawn once, when the block's last cell crosses the gate line: push { kind, startTime: now, gateX, gateY, colour, seed: block.id, ... } and build the petal or drop arrays from rng(seed). Do not allocate in the frame loop.
- Gates on other sides: rotate the fan. The tables assume the gate faces right; add the gate's outward angle to every angle, and rotate the drift vectors of the kiln puff the same way.
- Use the game's clock, not wall time, so pausing the game pauses the effect.
- Sound: the existing exit sound is enough. No new audio.
- Do not run an effect during a level-complete celebration if one already plays; the celebration owns the screen.
`;

write('glazes.md', GLAZES_MD, null, null, 'Glaze finishes: drawing instructions', 'finishes');
write('effects.md', EFFECTS_MD, null, null, 'Exit effects: frames and canvas code', 'effects');

/* ============================================================ notes + manifest */
const sizeOf = (fl) => `${statSync(join(OUT, fl)).size.toLocaleString('en-AU')} bytes`;
const rows = files.map((x) => `| ${x.file} | ${x.width ? x.width + ' x ' + x.height : 'text'} | ${sizeOf(x.file)} | ${x.group} |`).join('\n');
const NOTES = `# Glaze finishes, exit effects and shop: part notes

Design only. Nothing in src/ or design/maps/ was changed. Rebuild everything with: node design/depth/build-finishes.mjs

## Files

| File | Size (px) | On disk | Group |
|---|---|---|---|
${rows}
| manifest.json | list | see disk | n/a |
| NOTES-part.md | text | see disk | finishes |

## Not decided

- Price points. Shop prices (glazes 150 to 200, effects 80 to 120, characters 120 to 200, themes 100 to 200) are placeholders for the economy pass.
- Which finish and effect are free defaults. The mock-ups assume gloss and kiln puff are free and equipped at first; plain fade is shown as an extra owned effect.
- Whether glyphs turn on by default. Recommended, because speckled and crackle give the face a little more visual noise.
- Whether the crackle and speckle patterns should be generated per block or cached as sprites per colour and shape (see glazes.md, performance notes). Per block is the simplest.
- Gates on the other three sides: the effect tables assume the gate faces right and say how to rotate them. Not drawn as stills.
- The shop mock-ups use Baloo 2 with a sans fallback. Text is live SVG text, so a viewer without the font falls back to Trebuchet or similar. For export to PNG, install Baloo 2 first.
- Item names beyond the brief (Baker, Fox, Plain fade) are placeholders.
- The finishes are drawn on the tile face only; the crate (obstacle) keeps its ribs and ignores the finish.
`;
writeFileSync(join(OUT, 'NOTES-part.md'), NOTES);
files.push({ file: 'NOTES-part.md', width: null, height: null, label: 'Part notes: files, sizes, undecided items', group: 'finishes' });
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(files, null, 2) + '\n');
console.log('wrote', files.length, 'files to', OUT);
