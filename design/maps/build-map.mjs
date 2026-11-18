// Generates the chapter 1 map ("Kiln Meadow") as SVG, plus a phone preview page.
import { writeFileSync, mkdirSync } from 'node:fs';
const OUT = new URL('./', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
mkdirSync(OUT, { recursive: true });

const W = 375, H = 1640;
import { TILES, shade, tint, rnd, f, shadow, tree, bush, rock, flower, tuft, kiln, pot, tileStack, cloud, sign, cottage, star } from './kit.mjs';

/* ---- the road: one winding line from the bottom of the map to the gate at the top ---- */
const Y0 = 1540, Y1 = 218;
const pathX = (y) => 187.5 + 100 * Math.sin(((Y0 - y) / (Y0 - Y1)) * Math.PI * 2 * 2.25 + 0.6);
const road = []; for (let y = H + 10; y >= 96; y -= 4) road.push([pathX(y), y]);
const roadD = 'M' + road.map((p) => f(p[0]) + ' ' + f(p[1])).join(' L');
// 20 level positions, evenly spaced along the road.
const fine = []; for (let y = Y0; y >= Y1; y -= 0.5) fine.push([pathX(y), y]);
const acc = [0]; for (let i = 1; i < fine.length; i++) acc.push(acc[i - 1] + Math.hypot(fine[i][0] - fine[i - 1][0], fine[i][1] - fine[i - 1][1]));
const NODES = Array.from({ length: 20 }, (_, i) => fine[acc.findIndex((v) => v >= (acc[acc.length - 1] * i) / 19)]);

/* ---- the river and where the road bridges it ---- */
const RIVER_Y = 1012, riverY = (x) => RIVER_Y + 24 * Math.sin(x / 58 + 0.4);
const inRiver = (x, y) => Math.abs(y - riverY(x)) < 52;
const nearRoad = (x, y, d) => Math.abs(x - pathX(y)) < d;
const nearNode = (x, y, d) => NODES.some((n) => Math.hypot(n[0] - x, n[1] - y) < d);

/* ---- ground: sky, far hills, and rolling bands of meadow ---- */
function hill(yTop, amp, wave, phase, fill) {
  let d = `M-10 ${H + 10} L-10 ${yTop}`; for (let x = -10; x <= W + 10; x += 12) d += ` L${x} ${f(yTop + amp * Math.sin(x / wave + phase))}`;
  return `<path d="${d} L${W + 10} ${H + 10} Z" fill="${fill}"/>`;
}
let bg = `<rect width="${W}" height="${H}" fill="#bfeaf8"/><circle cx="300" cy="62" r="34" fill="#ffe9a3"/><circle cx="300" cy="62" r="24" fill="#ffd556"/>`
  + cloud(70, 58, 1) + cloud(205, 36, 0.7) + cloud(340, 118, 0.6)
  + hill(150, 16, 70, 1.2, '#a9dcc0') + hill(176, 14, 52, 0.2, '#93d6a0')
  + [['#a4e07a', 208, 10, 64, 0], ['#96d86c', 330, 12, 80, 2], ['#a4e07a', 470, 10, 58, 1], ['#f0d9a4', 600, 9, 90, 3], ['#ecd198', 740, 10, 70, 0.5],
     ['#98d96e', 880, 12, 66, 2.2], ['#a6e17c', 1090, 10, 74, 1], ['#97d86d', 1230, 12, 60, 0], ['#a5e07b', 1380, 10, 84, 2.6], ['#96d76b', 1520, 11, 62, 1.4]]
    .map(([c, y, a, w, p]) => hill(y, a, w, p, c)).join('');

// River: sandy banks, water, a few flat highlights and lily pads.
const band = (half) => { let top = '', bot = ''; for (let x = -12; x <= W + 12; x += 8) { top += ` L${x} ${f(riverY(x) - half)}`; bot = ` L${x} ${f(riverY(x) + half)}` + bot; } return 'M' + top.slice(2) + bot + ' Z'; };
bg += `<path d="${band(46)}" fill="#f3e2b0"/><path d="${band(40)}" fill="#3fa9dd" transform="translate(0 3)"/><path d="${band(38)}" fill="#62c6f0"/>`;
for (const [x, w, dy] of [[30, 34, -14], [96, 22, 12], [150, 30, -20], [262, 26, 16], [318, 36, -12], [220, 18, -4]]) bg += `<rect x="${x}" y="${f(riverY(x) + dy)}" width="${w}" height="4" rx="2" fill="#a8e4fb"/>`;
for (const [x, dy, r] of [[58, 14, 9], [334, 14, 8], [300, -22, 6]]) bg += `<circle cx="${x}" cy="${f(riverY(x) + dy)}" r="${r}" fill="#3f9a4a"/><circle cx="${x - 1}" cy="${f(riverY(x) + dy - 1)}" r="${r - 2}" fill="#59b85f"/><circle cx="${x + 2}" cy="${f(riverY(x) + dy - 2)}" r="${r * 0.36}" fill="#ffb3d1"/>`;

// The road: a darker underside, the sandy bed, then a line of pale glazed pavers.
const roadSvg = `<path d="${roadD}" fill="none" stroke="#c79f62" stroke-width="52" stroke-linecap="round" stroke-linejoin="round" transform="translate(0 5)"/>`
  + `<path d="${roadD}" fill="none" stroke="#f1d9a7" stroke-width="50" stroke-linecap="round" stroke-linejoin="round"/>`
  + `<path d="${roadD}" fill="none" stroke="#e2c287" stroke-width="30" stroke-linejoin="round" stroke-dasharray="17 7" transform="translate(0 2)"/>`
  + `<path d="${roadD}" fill="none" stroke="#fff3d2" stroke-width="30" stroke-linejoin="round" stroke-dasharray="17 7"/>`;

// The bridge, turned to follow the road where it crosses the river.
const bx = pathX(RIVER_Y), ang = (Math.atan2(-8, pathX(RIVER_Y - 4) - pathX(RIVER_Y + 4)) * 180) / Math.PI + 90;
let bridge = `<g transform="translate(${f(bx)} ${RIVER_Y}) rotate(${f(ang)})"><rect x="-33" y="-62" width="66" height="128" rx="8" fill="#8a5a3c"/><rect x="-33" y="-66" width="66" height="128" rx="8" fill="#d9a066"/>`;
for (let y = -52; y < 56; y += 15) bridge += `<rect x="-27" y="${y}" width="54" height="2.500" rx="1.200" fill="#b67d48"/>`;
bridge += `<rect x="-38" y="-70" width="10" height="136" rx="5" fill="#7a4d31"/><rect x="28" y="-70" width="10" height="136" rx="5" fill="#7a4d31"/><rect x="-36" y="-68" width="4" height="132" rx="2" fill="#a56c44"/><rect x="30" y="-68" width="4" height="132" rx="2" fill="#a56c44"/></g>`;

/* ---- scenery, placed clear of the road, the river and the level tiles ---- */
const slot = (y, k) => { const px = pathX(y), c = [px - 124, px + 124, px - 222, px + 222].filter((x) => x > 26 && x < W - 26); return c[k % c.length]; };
const items = [];
const put = (y, k, draw, dx = 0) => items.push([y, draw(slot(y, k) + dx, y)]);
[[1392, 1, 1.05, '#3fae5a'], [1296, 0, 0.85, '#2f9d63'], [1196, 0, 1, '#58bf52'], [1120, 1, 0.9, '#3fae5a'],
 [930, 0, 1, '#2f9d63'], [420, 0, 0.9, '#3fae5a']]
  .forEach(([y, k, s, c]) => put(y, k, (x, yy) => tree(x, yy, s, c)));
[[1340, 0], [1150, 0]].forEach(([y, k]) => put(y, k + 1, (x, yy) => bush(x, yy, 0.9, '#56bf5e'), 0));
[[1236, 1, 0.8], [940, 1, 0.9]].forEach(([y, k, s]) => put(y, k, (x, yy) => rock(x, yy, s), 34));
const at = (x, y, svg) => items.push([y, svg]);
// The start: a cottage, the signpost and a couple of trees.
at(66, 1486, cottage(66, 1486, 1.05, TILES[1])); at(150, 1604, sign(150, 1604, 'Kiln Meadow'));
at(34, 1612, tree(34, 1612, 0.9, '#3fae5a')); at(128, 1452, tree(128, 1452, 0.7, '#58bf52')); at(338, 1612, bush(338, 1612, 1)); at(40, 1380, rock(40, 1380, 0.9));
// The potters' yard, on the clay-coloured ground between the river and the hilltop.
at(104, 822, kiln(104, 822, 1)); at(52, 690, kiln(52, 690, 0.8)); at(304, 652, kiln(304, 652, 0.9));
at(34, 862, pot(34, 856, 1, TILES[1]) + pot(58, 866, 1.1, TILES[5])); at(168, 872, pot(160, 866, 0.9, TILES[2]) + pot(182, 874, 1, TILES[0]));
at(346, 706, pot(338, 700, 1.1, TILES[3]) + pot(358, 708, 0.9, TILES[4])); at(250, 596, tileStack(250, 596, 1.05)); at(178, 790, tileStack(178, 790, 0.9));
// The hilltop: two more cottages below the gate.
at(296, 520, cottage(296, 520, 1, TILES[5])); at(340, 452, tree(340, 452, 0.8, '#2f9d63')); at(236, 470, bush(236, 470, 0.8));
at(74, 330, cottage(74, 330, 0.95, TILES[4])); at(26, 272, tree(26, 272, 0.75, '#58bf52')); at(140, 276, tree(140, 276, 0.7, '#2f9d63')); at(36, 400, bush(36, 400, 0.9)); at(338, 356, rock(338, 356, 0.8));

// Flowers and grass tufts scattered over the meadow bands only.
let scatter = '';
for (let i = 0, placed = 0; i < 900 && placed < 110; i++) {
  const x = 12 + rnd() * (W - 24), y = 226 + rnd() * (H - 250);
  if (nearRoad(x, y, 44) || inRiver(x, y) || nearNode(x, y, 46) || (y > 590 && y < 890)) continue;
  scatter += rnd() < 0.55 ? flower(x, y, ['#ffffff', '#ffd1e6', '#fff2a8', '#ffb8a1', '#d8c9ff'][placed % 5], 0.9 + rnd() * 0.4) : tuft(x, y); placed++;
}
for (let i = 0, placed = 0; i < 300 && placed < 16; i++) { // a few pebbles on the clay yard
  const x = 12 + rnd() * (W - 24), y = 610 + rnd() * 240; if (nearRoad(x, y, 40)) continue;
  scatter += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(3 + rnd() * 3)}" ry="2.500" fill="#d8b77c"/>`; placed++;
}

// The gate to chapter 2 at the top of the hill.
const gx = pathX(118), gy = 150;
const gate = shadow(gx, gy + 4, 62, 9)
  + [-1, 1].map((k) => `<rect x="${f(gx + k * 44 - 11)}" y="${gy - 70}" width="22" height="74" rx="5" fill="#b4552f"/><rect x="${f(gx + k * 44 - 11)}" y="${gy - 74}" width="22" height="74" rx="5" fill="#d9764a"/><rect x="${f(gx + k * 44 - 7)}" y="${gy - 68}" width="5" height="26" rx="2.500" fill="#eb9468"/>`).join('')
  + `<path d="M${f(gx - 58)} ${gy - 66} Q${f(gx)} ${gy - 128} ${f(gx + 58)} ${gy - 66} L${f(gx + 58)} ${gy - 82} Q${f(gx)} ${gy - 146} ${f(gx - 58)} ${gy - 82} Z" fill="#b4552f"/>`
  + `<path d="M${f(gx - 58)} ${gy - 70} Q${f(gx)} ${gy - 132} ${f(gx + 58)} ${gy - 70} L${f(gx + 58)} ${gy - 86} Q${f(gx)} ${gy - 150} ${f(gx - 58)} ${gy - 86} Z" fill="#d9764a"/>`
  + TILES.map((c, i) => { const t = (i + 0.5) / 6, x = gx - 44 + t * 88, y = gy - 86 - Math.sin(t * Math.PI) * 31; return `<rect x="${f(x - 6)}" y="${f(y - 5)}" width="12" height="12" rx="3" fill="${shade(c, 0.4)}"/><rect x="${f(x - 6)}" y="${f(y - 7)}" width="12" height="12" rx="3" fill="${c}"/>`; }).join('');

const art = bg + roadSvg + bridge + scatter + gate + items.sort((a, b) => a[0] - b[0]).map((i) => i[1]).join('');

/* ---- level tiles: glazed when cleared, raised and ringed when current, raw clay when locked ---- */
const STARS = [3, 3, 2, 3, 1, 3, 2, 2, 3, 3, 2]; // demo save: 11 cleared (27 of 60 stars), level 12 is next
function node(i, x, y) {
  const n = i + 1, state = i < STARS.length ? 'done' : i === STARS.length ? 'now' : 'locked';
  const c = state === 'locked' ? '#d9c7a8' : TILES[i % 6], edge = state === 'locked' ? '#a8926e' : shade(c, 0.45), s = state === 'now' ? 56 : 46, lift = state === 'now' ? 8 : 6;
  let o = `<ellipse cx="${f(x)}" cy="${f(y + s / 2 + lift)}" rx="${s * 0.52}" ry="7" fill="#3a2a12" opacity="0.25"/>`;
  if (state === 'now') o += `<rect x="${f(x - s / 2 - 6)}" y="${f(y - s / 2 - 6)}" width="${s + 12}" height="${s + 12 + lift}" rx="19" fill="#ffffff"/>`;
  o += `<rect x="${f(x - s / 2)}" y="${f(y - s / 2 + lift)}" width="${s}" height="${s}" rx="14" fill="${edge}"/><rect x="${f(x - s / 2)}" y="${f(y - s / 2)}" width="${s}" height="${s}" rx="14" fill="${c}"/>`
    + `<rect x="${f(x - s / 2 + 3)}" y="${f(y - s / 2 + 3)}" width="${s - 6}" height="${s - 6}" rx="11" fill="none" stroke="${tint(c, state === 'locked' ? 0.35 : 0.4)}" stroke-width="2"/>`
    + `<rect x="${f(x - s / 2 + 9)}" y="${f(y - s / 2 + 8)}" width="${f(s * 0.36)}" height="5" rx="2.500" fill="${tint(c, 0.55)}"/>`;
  o += `<text x="${f(x)}" y="${f(y + (state === 'now' ? 11 : 9))}" text-anchor="middle" font-family="'Baloo 2', sans-serif" font-weight="800" font-size="${state === 'now' ? 30 : 24}" fill="${state === 'locked' ? '#8f7a58' : '#ffffff'}"${state === 'locked' ? '' : ` stroke="${shade(c, 0.6)}" stroke-width="4" paint-order="stroke" stroke-linejoin="round"`}>${n}</text>`;
  if (state === 'done') o += [0, 1, 2].map((k) => star(x - 15 + k * 15, y - s / 2 - 9 - (k === 1 ? 4 : 0), 8, k < STARS[i] ? '#ffd23f' : '#fff6dc', k < STARS[i] ? '#a86f00' : '#b9a57c')).join('');
  if (state === 'now') o += `<g class="pin"><path d="M${f(x)} ${f(y - s / 2 - 12)} l-11 -15 a13 13 0 1 1 22 0 Z" fill="#b3261e"/><path d="M${f(x)} ${f(y - s / 2 - 15)} l-11 -15 a13 13 0 1 1 22 0 Z" fill="#ff5a4d"/><circle cx="${f(x)}" cy="${f(y - s / 2 - 38)}" r="5.500" fill="#ffffff"/></g>`;
  return `<g data-level="${n}" data-state="${state}">${o}</g>`;
}
const nodes = NODES.map((p, i) => node(i, p[0], p[1])).reverse().join('');

const svgOpen = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`;
writeFileSync(OUT + 'chapter-1-kiln-meadow.svg', `${svgOpen}<!-- Glazeway chapter 1 map art (levels 1 to 20). Scenery only: level tiles are drawn by the game. -->${art}</svg>\n`);
writeFileSync(OUT + 'chapter-1-nodes.json', JSON.stringify({ width: W, height: H, levels: NODES.map((p, i) => ({ level: i + 1, x: f(p[0]), y: f(p[1]) })) }, null, 2) + '\n');

const cur = NODES[STARS.length], scroll = Math.max(0, Math.min(H - 812, cur[1] - 470));
const total = STARS.reduce((a, b) => a + b, 0);
const map = `${svgOpen}${art}${nodes}</svg>`;
const hud = `
  <div class="hud">
    <div class="chip back"><svg width="24" height="24" viewBox="0 0 24 24"><path d="M19 12H5M11 6l-6 6 6 6"/></svg></div>
    <div class="chip title"><small>CHAPTER 1 ?? LEVELS 1 TO 20</small>Kiln Meadow</div>
    <div class="chip stars"><svg width="20" height="20" viewBox="0 0 20 20">${star(10, 10.5, 8.5, '#ffd23f', '#a86f00')}</svg>${total}<i>/60</i></div>
  </div>
  <div class="bar"><div style="width:${(STARS.length / 20) * 100}%"></div></div>`;
writeFileSync(OUT + 'preview.html', `<!doctype html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<title>Glazeway: chapter 1 map</title>
<style>
  /* Preview of the chapter 1 level map. Open straight from disk. Not game code. */
  @font-face { font-family: 'Baloo 2'; src: url('../../public/fonts/baloo2.woff2') format('woff2'); font-weight: 400 800; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 28px 32px 36px; background: #ecebe7; color: #26262a; font-family: 'Baloo 2', 'Trebuchet MS', sans-serif; width: max-content; }
  h1 { margin: 0; font-size: 26px; font-weight: 800; }
  .lede { margin: 2px 0 22px; font-size: 15px; font-weight: 500; color: #5c5c63; max-width: 1180px; }
  .row { display: flex; gap: 30px; align-items: flex-start; }
  .cap { font-size: 13px; font-weight: 700; color: #6a6a72; margin-top: 8px; width: 375px; }
  .phone { position: relative; width: 375px; height: 812px; overflow: hidden; border-radius: 26px; outline: 2px solid rgba(0,0,0,0.2); }
  .phone > svg { position: absolute; left: 0; }
  .full { width: 375px; border-radius: 14px; overflow: hidden; outline: 2px solid rgba(0,0,0,0.2); }
  .full svg { display: block; }
  /* The header uses the player's theme colours (Slate shown), so a bought theme still skins it. */
  .hud { position: absolute; left: 0; right: 0; top: 0; padding: 14px 14px 0; display: flex; gap: 8px; }
  .chip { display: flex; align-items: center; justify-content: center; height: 48px; background: #39435a; border: 3px solid #1e2432; border-radius: 16px; box-shadow: 0 5px 0 #1e2432; color: #eef2f7; font-weight: 800; }
  .back { width: 48px; } .back svg { fill: none; stroke: currentColor; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
  .title { flex: 1; flex-direction: column; font-size: 19px; line-height: 1.05; }
  .title small { font-size: 9.500px; letter-spacing: 0.14em; color: #a3adbb; font-weight: 700; }
  .stars { width: 92px; gap: 5px; font-size: 19px; } .stars i { font-style: normal; font-size: 13px; color: #a3adbb; margin-left: -3px; }
  .bar { position: absolute; left: 70px; right: 114px; top: 72px; height: 10px; border-radius: 5px; background: #1e2432; border: 2px solid #1e2432; }
  .bar div { height: 100%; border-radius: 3px; background: #e8a33d; }
  .pin { animation: bob 0.9s ease-in-out infinite alternate; }
  @keyframes bob { to { transform: translateY(-5px); } }
  @media (prefers-reduced-motion: reduce) { .pin { animation: none; } }
</style>
</head>
<body>
<h1>Chapter 1: Kiln Meadow</h1>
<p class="lede">Levels 1 to 20, 60 stars. The road starts at the bottom and climbs to the gate for chapter 2. Shown with a demo save: 11 levels cleared, 27 stars, level 12 next. The map art never changes with the theme; the header on top of it does.</p>
<div class="row">
  <div><div class="phone"><svg style="top:${-(H - 812)}px" ${map.slice(4)}${hud}</div><div class="cap">Opening the chapter: the start of the road.</div></div>
  <div><div class="phone"><svg style="top:${-f(scroll)}px" ${map.slice(4)}${hud}</div><div class="cap">Scrolled to the current level, 12, in the potters' yard.</div></div>
  <div><div class="phone"><svg style="top:0px" ${map.slice(4)}${hud}</div><div class="cap">The top: level 20 and the gate to chapter 2.</div></div>
  <div><div class="full">${map}</div><div class="cap">The whole map, 375 by ${H}.</div></div>
</div>
</body>
</html>
`);
console.log('ok', NODES.length, 'nodes; scroll', scroll);

