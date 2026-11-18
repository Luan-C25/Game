// Streak badges, daily gift kiln, gift row, Daily Kiln icon and calendar plate.
// Flat vector only: every object has a ground shadow, a darker underside and one highlight.
// Run: node design/depth/build-streaks.mjs   (writes to design/depth/streaks/)
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { TILES, shade, tint, f, star } from '../maps/kit.mjs';

const out = join(dirname(fileURLToPath(import.meta.url)), 'streaks');
mkdirSync(out, { recursive: true });
const manifest = [];
const FONT = `font-family="'Baloo 2', 'Trebuchet MS', Arial, sans-serif" font-weight="800"`;
const INK = '#5a3418', CLAY = '#e8c9a0', CLAY_D = '#b88f60', CLAY_L = '#f6e2c2', RAW = '#d9c4a4', RAW_D = '#b9a07c';
const SHADOW = '#2f2a24';
const TXT_ON = { '#E69F00': '#3b2414', '#56B4E9': '#143247', '#009E73': '#ffffff', '#CC79A7': '#ffffff', '#0072B2': '#ffffff', '#D55E00': '#ffffff' };

function save(file, w, h, label, body) {
  writeFileSync(join(out, file), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${body}</svg>\n`);
  manifest.push({ file, width: w, height: h, label, group: 'streaks' });
}
const gshadow = (x, y, rx, ry = rx * 0.2) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" fill="${SHADOW}" opacity="0.22"/>`;
const rect = (x, y, w, h, rx, fill, extra = '') => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(rx)}" fill="${fill}"${extra}/>`;
const circ = (x, y, r, fill, extra = '') => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${fill}"${extra}/>`;
const polar = (cx, cy, r, a) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r];

/* ---------- badges ---------- */
const CX = 48, CY = 46;
function bumps(kind, n, r, fill, dy, colours) {
  let o = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2, [x, y] = polar(CX, CY + dy, r, a), c = colours ? colours[i % colours.length] : fill;
    if (kind === 'scallop') o += circ(x, y, 5.4, c);
    else if (kind === 'teeth') {
      const [x1, y1] = polar(CX, CY + dy, r - 3, a - 0.17), [x2, y2] = polar(CX, CY + dy, r - 3, a + 0.17), [x3, y3] = polar(CX, CY + dy, r + 6.5, a);
      o += `<polygon points="${f(x1)},${f(y1)} ${f(x2)},${f(y2)} ${f(x3)},${f(y3)}" fill="${c}" stroke="${c}" stroke-width="2" stroke-linejoin="round"/>`;
    }
  }
  return o;
}
function ringMarks(kind, n, fill) {
  let o = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2, [x, y] = polar(CX, CY, 34.6, a);
    if (kind === 'dots') o += circ(x, y, 1.9, fill);
    else if (kind === 'diamonds') o += `<rect x="${f(x - 2.3)}" y="${f(y - 2.3)}" width="4.6" height="4.6" rx="0.8" fill="${fill}" transform="rotate(${f(45 + (a * 180) / Math.PI)} ${f(x)} ${f(y)})"/>`;
    else if (kind === 'ticks') { const [x1, y1] = polar(CX, CY, 32.6, a), [x2, y2] = polar(CX, CY, 36.4, a); o += `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${fill}" stroke-width="2" stroke-linecap="round"/>`; }
    else if (kind === 'stars') o += star(x, y, 2.9, fill, fill).replace('stroke-width="2"', 'stroke-width="0.6"');
  }
  return o;
}
function badge(o) {
  const { rim, rimD, face, faceD, mark, bump = 'none', bumpN = 0, bumpCols, ring = 'dots', ringN = 12, text, tc, ts, sub, fs, topStar, id } = o;
  let s = gshadow(48, 89, 33, 5);
  // darker underside: whole medallion drawn again, pushed down
  s += (bump !== 'none' ? bumps(bump, bumpN, 38, rimD, 5) : '') + circ(CX, CY + 5, 38, rimD);
  s += (bump !== 'none' ? bumps(bump, bumpN, 38, rim, 0, bumpCols) : '') + circ(CX, CY, 38, rim);
  s += ringMarks(ring, ringN, mark);
  s += circ(CX, CY, 31, faceD) + circ(CX, CY + 0.5, 28.6, face);
  // the one highlight: a short glint along the upper left of the rim
  s += `<path d="M15.5 33 A34 34 0 0 1 33 15.5" fill="none" stroke="#ffffff" stroke-opacity="0.7" stroke-width="3.6" stroke-linecap="round"/>`;
  const ty = sub ? 53 : 57.5, size = fs || (sub ? 30 : 36);
  s += `<text x="48" y="${ty + 2.5}" text-anchor="middle" ${FONT} font-size="${size}" fill="${ts}">${text}</text><text id="${id || 'label'}" x="48" y="${ty}" text-anchor="middle" ${FONT} font-size="${size}" fill="${tc}">${text}</text>`;
  if (sub) s += `<text x="48" y="${ty + 14.5}" text-anchor="middle" ${FONT} font-size="9.5" letter-spacing="1.2" fill="${ts}">${sub}</text><text x="48" y="${ty + 13}" text-anchor="middle" ${FONT} font-size="9.5" letter-spacing="1.2" fill="${tc}">${sub}</text>`;
  if (topStar) s += star(48, 8.5, 8.5, '#ffd556', '#b9831a');
  return s;
}
const METAL = {
  bronze: { rim: '#c98a4e', rimD: '#8a4f25', face: '#e2a35e', faceD: '#a8642f', mark: '#f0c590' },
  silver: { rim: '#b4bec9', rimD: '#7b8794', face: '#d7dde4', faceD: '#98a3af', mark: '#eef2f6' },
  gold: { rim: '#f0b429', rimD: '#b9831a', face: '#ffd567', faceD: '#d79a1c', mark: '#fff0b8' },
};
const day = (n, m, extra) => badge({ ...m, text: String(n), tc: '#fffaf0', ts: shade(m.rimD, 0.05), sub: 'DAYS', ...extra });
save('badge-7.svg', 96, 96, '7 day streak (bronze glaze)', day(7, METAL.bronze, { ring: 'dots', ringN: 7 }));
save('badge-14.svg', 96, 96, '14 day streak (silver glaze)', day(14, METAL.silver, { ring: 'diamonds', ringN: 14, bump: 'teeth', bumpN: 14 }));
save('badge-21.svg', 96, 96, '21 day streak (gold glaze)', day(21, METAL.gold, { ring: 'stars', ringN: 7, bump: 'scallop', bumpN: 14 }));

const RINGS = [['dots', 12], ['diamonds', 10], ['ticks', 24], ['stars', 8], ['dots', 20], ['diamonds', 16]];
const BUMPS = [['none', 0], ['teeth', 12], ['scallop', 10], ['none', 0], ['teeth', 18], ['scallop', 14]];
for (let m = 1; m <= 12; m++) {
  const name = `badge-month-${String(m).padStart(2, '0')}.svg`, c = TILES[(m - 1) % 6], i = (m - 1) % 6;
  if (m < 12) {
    const metal = m <= 6 ? METAL.bronze : METAL.silver;
    save(name, 96, 96, `Month ${m} streak (${m * 30} days)`, badge({
      rim: metal.rim, rimD: metal.rimD, face: c, faceD: shade(c, 0.3), mark: metal.mark, bump: BUMPS[i][0], bumpN: BUMPS[i][1], ring: RINGS[i][0], ringN: RINGS[i][1],
      text: String(m), tc: TXT_ON[c], ts: shade(c, 0.38), sub: m === 1 ? 'MONTH' : 'MONTHS', fs: 30,
    }));
  } else {
    save(name, 96, 96, 'Month 12 streak (1 year, 360 days)', badge({
      ...METAL.gold, face: '#fff1d6', faceD: '#d79a1c', bump: 'scallop', bumpN: 12, bumpCols: TILES, ring: 'stars', ringN: 8, topStar: true,
      text: '1', tc: '#D55E00', ts: '#a8441a', sub: 'YEAR', fs: 32,
    }));
  }
}
// template: placeholder "1y 3m"; the game swaps the text of both <text> nodes (see NOTES-part.md)
save('badge-year-template.svg', 96, 96, 'Year and months streak template (1y 3m placeholder)', badge({
  ...METAL.gold, face: '#7a3a22', faceD: '#d79a1c', bump: 'scallop', bumpN: 12, bumpCols: TILES, ring: 'diamonds', ringN: 12, topStar: true,
  text: '1y 3m', tc: '#ffe9b0', ts: '#3d1c10', fs: 22, id: 'label',
}));
// locked: raw unglazed clay, faint
save('badge-locked.svg', 96, 96, 'Streak badge not yet earned',
  `<g opacity="0.6">${gshadow(48, 89, 33, 5)}${circ(CX, CY + 5, 38, RAW_D)}${circ(CX, CY, 38, RAW)}${ringMarks('dots', 12, RAW_D)}${circ(CX, CY, 31, RAW_D)}${circ(CX, CY + 0.5, 28.6, '#e3d2b6')}`
  + `<path d="M15.5 33 A34 34 0 0 1 33 15.5" fill="none" stroke="#ffffff" stroke-opacity="0.6" stroke-width="3.6" stroke-linecap="round"/>${circ(48, 49, 7, RAW_D, ' opacity="0.7"')}${circ(48, 47.5, 7, '#cdb892')}</g>`);

/* ---------- gift kiln ---------- */
const BR = '#d9764a', BD = '#b4552f', BL = '#eb9468', BK = '#8f4226';
function miniKiln(state) {
  const x = 48, y = 96;
  const dome = (dy, c) => `<path d="M${x - 30} ${y + dy} L${x - 30} ${y - 20 + dy} Q${x - 30} ${y - 54 + dy} ${x} ${y - 54 + dy} Q${x + 30} ${y - 54 + dy} ${x + 30} ${y - 20 + dy} L${x + 30} ${y + dy} Z" fill="${c}"/>`;
  let s = '';
  if (state === 'ready') s += circ(x, y - 22, 46, '#ffd56a', ' opacity="0.16"') + circ(x, y - 22, 36, '#ffd56a', ' opacity="0.2"');
  s += gshadow(x, y + 3, 40, 5) + rect(x - 8, y - 72, 16, 22, 3, BD) + rect(x - 11, y - 76, 22, 7, 3, BK);
  s += dome(4, BD) + dome(0, BR);
  s += `<path d="M${x - 21} ${y - 28} Q${x - 19} ${y - 46} ${x - 4} ${y - 49} Q${x - 14} ${y - 39} ${x - 15} ${y - 28} Z" fill="${BL}"/>`;
  s += [[-20, -14, 12], [6, -14, 14], [-7, -26, 14], [14, -36, 10]].map(([bx, by, bw]) => rect(x + bx, y + by, bw, 2, 1, BD, ' opacity="0.75"')).join('');
  s += rect(x - 34, y - 7, 68, 11, 4, BK);
  const arch = (w, top, fill) => `<path d="M${x - w} ${y - 2} L${x - w} ${y - 16} Q${x - w} ${top} ${x} ${top} Q${x + w} ${top} ${x + w} ${y - 16} L${x + w} ${y - 2} Z" fill="${fill}"/>`;
  if (state === 'closed') {
    s += arch(13, y - 31, '#4a2a1e') + arch(11, y - 29, '#8a8f98') + rect(x - 11, y - 14, 22, 3, 0, '#6e737c') + rect(x - 8, y - 22, 3, 6, 1.5, '#4a2a1e') + circ(x + 5, y - 15, 2.4, '#3a3f4a') + `<path d="M${x - 8} ${y - 24} Q${x - 8} ${y - 27} ${x - 3} ${y - 27.5}" fill="none" stroke="#c3cad1" stroke-width="2" stroke-linecap="round"/>`;
  } else if (state === 'ready') {
    s += arch(13, y - 31, '#5b2414') + arch(10, y - 28, '#ffb347') + arch(6, y - 22, '#ffe08a');
    // door ajar on the right: a narrow slab seen edge-on
    s += `<path d="M${x + 13} ${y - 2} L${x + 21} ${y - 6} L${x + 21} ${y - 25} L${x + 13} ${y - 29} Z" fill="#6e737c"/><path d="M${x + 13} ${y - 2} L${x + 15} ${y - 3} L${x + 15} ${y - 28} L${x + 13} ${y - 29} Z" fill="#8a8f98"/>`;
  } else {
    s += arch(13, y - 31, '#3a1810') + arch(9, y - 26, '#5b2414') + `<path d="M${x - 13} ${y - 2} L${x - 25} ${y - 8} L${x - 25} ${y - 27} L${x - 13} ${y - 29} Z" fill="#6e737c"/><path d="M${x - 25} ${y - 8} L${x - 21} ${y - 6} L${x - 21} ${y - 26} L${x - 25} ${y - 27} Z" fill="#4a4f58"/>`;
  }
  return s;
}
function giftBox(x, y, s, c) {
  const d = shade(c, 0.32), l = tint(c, 0.45);
  return gshadow(x, y + 1, 16 * s, 3 * s) + rect(x - 13 * s, y - 20 * s, 26 * s, 21 * s, 4 * s, d) + rect(x - 13 * s, y - 22 * s, 26 * s, 21 * s, 4 * s, c)
    + rect(x - 3 * s, y - 22 * s, 6 * s, 21 * s, 1, '#fff1d6') + rect(x - 15 * s, y - 29 * s, 30 * s, 9 * s, 3 * s, shade(c, 0.12)) + rect(x - 3 * s, y - 29 * s, 6 * s, 9 * s, 1, '#fff1d6')
    + `<ellipse cx="${f(x - 6 * s)}" cy="${f(y - 33 * s)}" rx="${f(6 * s)}" ry="${f(4 * s)}" fill="#fff1d6" transform="rotate(-25 ${f(x - 6 * s)} ${f(y - 33 * s)})"/><ellipse cx="${f(x + 6 * s)}" cy="${f(y - 33 * s)}" rx="${f(6 * s)}" ry="${f(4 * s)}" fill="#fff1d6" transform="rotate(25 ${f(x + 6 * s)} ${f(y - 33 * s)})"/>`
    + rect(x - 11 * s, y - 20 * s, 5 * s, 2.4 * s, 1.2 * s, l);
}
save('gift-kiln-closed.svg', 96, 110, 'Daily gift kiln, door shut', miniKiln('closed'));
save('gift-kiln-ready.svg', 96, 110, 'Daily gift kiln, ready to open (glowing)', miniKiln('ready'));
save('gift-kiln-open.svg', 96, 110, 'Daily gift kiln, open with a gift out front', miniKiln('open') + giftBox(62, 108, 0.8, TILES[3]));

/* ---------- gift row ---------- */
function coin(x, y, r) {
  return circ(x, y + 1.6, r, '#b9831a') + circ(x, y, r, '#f0b429') + circ(x, y, r * 0.66, '#ffd567') + rect(x - r * 0.12, y - r * 0.38, r * 0.24, r * 0.76, r * 0.12, '#f0b429') + `<path d="M${f(x - r * 0.72)} ${f(y - r * 0.3)} A${f(r * 0.8)} ${f(r * 0.8)} 0 0 1 ${f(x - r * 0.3)} ${f(y - r * 0.72)}" fill="none" stroke="#fff6d0" stroke-width="${f(r * 0.2)}" stroke-linecap="round"/>`;
}
function pouch(x, y, sc, c = '#b98f5a') {
  const d = shade(c, 0.3), l = tint(c, 0.4), r = 13 * sc;
  return gshadow(x, y + 1, 15 * sc, 3 * sc) + circ(x, y - r + 3 * sc, r + 0.5, d) + circ(x, y - r, r + 0.5, c)
    + rect(x - 6 * sc, y - 2 * r - 3 * sc, 12 * sc, 7 * sc, 3 * sc, c) + rect(x - 8 * sc, y - 2 * r + 1 * sc, 16 * sc, 4 * sc, 2 * sc, '#c9673f')
    + `<path d="M${f(x - 7 * sc)} ${f(y - 2 * r - 3 * sc)} l-4 -5 l6 2 l2 -4 l2 4 l6 -2 l-4 5 Z" fill="${c}"/>` + rect(x - 8.5 * sc, y - 1.6 * r, 4 * sc, 9 * sc, 2 * sc, l) + coin(x + 1 * sc, y - r + 2 * sc, 6.5 * sc);
}
function tick(x, y) { return gshadow(x, y + 10, 10, 2) + circ(x, y + 2, 11, '#1f6f3c') + circ(x, y, 11, '#3fae5a') + `<path d="M${x - 5} ${y} l3.6 4 l6.4 -8" fill="none" stroke="#ffffff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`; }
const AMOUNTS = [10, 15, 20, 30, 40, 60];
function slot(i, state) {
  const w = 50, h = 84, x = 19 + i * (w + 5.4), y = 8, cx = x + w / 2;
  const claimed = state === 'claimed', today = state === 'today', locked = state === 'locked';
  const plate = claimed ? '#c5d9b8' : locked ? RAW : CLAY, plateD = claimed ? '#8fb07e' : locked ? RAW_D : CLAY_D;
  const oy = today ? -3 : 0;
  let s = gshadow(cx, y + h + 3, w * 0.5, 3);
  s += rect(x, y + 3, w, h, 11, plateD) + rect(x, y + oy, w, h, 11, plate);
  if (today) s += rect(x - 3, y - 6, w + 6, h + 6, 14, 'none', ` stroke="#D55E00" stroke-width="3"`);
  s += rect(x + 7, y + oy + 4, 14, 3, 1.5, tint(plate, 0.6));
  s += `<text x="${f(cx)}" y="${y + oy + 22}" text-anchor="middle" ${FONT} font-size="11" fill="${INK}" opacity="${locked ? 0.6 : 1}">Day ${i + 1}</text>`;
  s += `<g opacity="${locked ? 0.5 : claimed ? 0.45 : 1}">${pouch(cx, y + oy + 62, 0.62 + i * 0.07)}</g>`;
  s += `<text x="${f(cx)}" y="${y + oy + 79}" text-anchor="middle" ${FONT} font-size="13" fill="${INK}" opacity="${locked ? 0.55 : 1}">+${AMOUNTS[i]}</text>`;
  if (claimed) s += tick(cx + 14, y + 12);
  return s;
}
function day7(state) {
  const x = 16, y = 112, w = 343, h = 128, locked = state === 'locked';
  const g = locked ? '#cdb892' : '#f0b429', gd = locked ? RAW_D : '#b9831a', fill = locked ? RAW : '#ffe9a8';
  let s = gshadow(x + w / 2, y + h + 6, w * 0.46, 5);
  s += rect(x, y + 5, w, h, 18, gd) + rect(x, y, w, h, 18, g) + rect(x + 7, y + 7, w - 14, h - 14, 13, gd) + rect(x + 7, y + 8.5, w - 14, h - 14, 13, fill);
  s += rect(x + 16, y + 14, 24, 3.5, 1.7, '#ffffff', ' opacity="0.7"');
  // glass case with a mystery figure
  const gx = x + 22, gy = y + 20, gw = 104, gh = 98;
  s += `<path d="M${gx} ${gy + gh} L${gx} ${gy + 38} Q${gx} ${gy} ${gx + gw / 2} ${gy} Q${gx + gw} ${gy} ${gx + gw} ${gy + 38} L${gx + gw} ${gy + gh} Z" fill="#6aa6c4"/>`;
  s += `<path d="M${gx + 4} ${gy + gh - 4} L${gx + 4} ${gy + 38} Q${gx + 4} ${gy + 4} ${gx + gw / 2} ${gy + 4} Q${gx + gw - 4} ${gy + 4} ${gx + gw - 4} ${gy + 38} L${gx + gw - 4} ${gy + gh - 4} Z" fill="#bfe8f7"/>`;
  const fx = gx + gw / 2, fy = gy + gh - 4, fc = locked ? '#8d7f6a' : '#3c4a63';
  s += rect(fx - 21, fy - 8, 42, 8, 3, shade(fc, 0.3)) + `<path d="M${fx - 19} ${fy - 8} Q${fx - 19} ${fy - 44} ${fx} ${fy - 44} Q${fx + 19} ${fy - 44} ${fx + 19} ${fy - 8} Z" fill="${fc}"/>` + circ(fx, fy - 56, 15, fc);
  s += `<text x="${fx}" y="${fy - 29}" text-anchor="middle" ${FONT} font-size="30" fill="#bfe8f7">?</text>`;
  s += `<path d="M${gx + 14} ${gy + 52} L${gx + 36} ${gy + 14} L${gx + 46} ${gy + 14} L${gx + 24} ${gy + 52} Z" fill="#ffffff" opacity="0.45"/>`;
  // text side
  s += `<text x="${x + 148}" y="${y + 52}" ${FONT} font-size="30" fill="${INK}" opacity="${locked ? 0.7 : 1}">Day 7</text>`;
  s += `<text x="${x + 148}" y="${y + 76}" ${FONT} font-size="14" fill="${INK}" opacity="${locked ? 0.6 : 0.85}">A new character</text><text x="${x + 148}" y="${y + 94}" ${FONT} font-size="14" fill="${INK}" opacity="${locked ? 0.6 : 0.85}">for your shelf</text>`;
  s += giftBox(x + w - 40, y + h - 16, 0.78, locked ? '#b9a07c' : TILES[3]);
  if (state === 'today') s += rect(x - 3, y - 4, w + 6, h + 14, 21, 'none', ` stroke="#D55E00" stroke-width="3"`);
  return s;
}
function giftRow(claimedN, todayIdx) {
  let s = '';
  for (let i = 0; i < 6; i++) s += slot(i, i < claimedN ? 'claimed' : i === todayIdx ? 'today' : 'locked');
  s += day7(todayIdx === 6 ? 'today' : 'locked');
  return s;
}
save('gift-row.svg', 375, 262, 'Daily gift row, 7 days (day 1 today)', giftRow(0, 0));
save('gift-row-day3.svg', 375, 262, 'Daily gift row, days 1 and 2 claimed, day 3 today', giftRow(2, 2));

/* ---------- Daily Kiln icon ---------- */
{
  const x = 30, y = 56;
  const dome = (dy, c) => `<path d="M${x - 22} ${y + dy} L${x - 22} ${y - 14 + dy} Q${x - 22} ${y - 40 + dy} ${x} ${y - 40 + dy} Q${x + 22} ${y - 40 + dy} ${x + 22} ${y - 14 + dy} L${x + 22} ${y + dy} Z" fill="${c}"/>`;
  let s = gshadow(32, 61, 28, 3.2) + rect(x - 4.5, y - 56, 9, 14, 2, BD) + rect(x - 7, y - 59, 14, 5, 2.5, BK) + dome(3, BD) + dome(0, BR)
    + `<path d="M${x - 15} ${y - 20} Q${x - 14} ${y - 33} ${x - 3} ${y - 35} Q${x - 10} ${y - 27} ${x - 10} ${y - 20} Z" fill="${BL}"/>`
    + rect(x - 25, y - 5, 50, 8, 3, BK)
    + `<path d="M${x - 9} ${y - 1} L${x - 9} ${y - 11} Q${x - 9} ${y - 21} ${x} ${y - 21} Q${x + 9} ${y - 21} ${x + 9} ${y - 11} L${x + 9} ${y - 1} Z" fill="#5b2414"/><path d="M${x - 5.5} ${y - 1} L${x - 5.5} ${y - 10} Q${x - 5.5} ${y - 17} ${x} ${y - 17} Q${x + 5.5} ${y - 17} ${x + 5.5} ${y - 10} L${x + 5.5} ${y - 1} Z" fill="#ffb347"/><path d="M${x - 2.5} ${y - 1} Q${x - 3} ${y - 8} ${x} ${y - 12} Q${x + 3} ${y - 7} ${x + 2.5} ${y - 1} Z" fill="#ffe08a"/>`;
  // calendar leaf, top right, with a flame
  const cx = 48, cy = 22;
  s += rect(cx - 14, cy - 12 + 3, 28, 28, 5, '#b8a98c') + rect(cx - 14, cy - 12, 28, 28, 5, '#fff7e6') + rect(cx - 14, cy - 12, 28, 9, 5, '#D55E00') + rect(cx - 14, cy - 7, 28, 4, 0, '#D55E00')
    + rect(cx - 8, cy - 16, 4, 8, 2, '#5a3418') + rect(cx + 4, cy - 16, 4, 8, 2, '#5a3418') + rect(cx - 10, cy - 10, 8, 2, 1, '#ffffff', ' opacity="0.7"')
    + `<path d="M${cx} ${cy + 14} Q${cx - 8} ${cy + 10} ${cx - 6} ${cy + 3} Q${cx - 4} ${cy + 5} ${cx - 3} ${cy + 3} Q${cx - 1} ${cy - 1} ${cx + 1} ${cy - 2} Q${cx + 1} ${cy + 1} ${cx + 4} ${cy + 3} Q${cx + 8} ${cy + 10} ${cx} ${cy + 14} Z" fill="#E69F00"/><path d="M${cx} ${cy + 14} Q${cx - 3.5} ${cy + 12} ${cx - 2.5} ${cy + 8} Q${cx} ${cy + 6} ${cx + 1} ${cy + 4} Q${cx + 4} ${cy + 8} ${cx} ${cy + 14} Z" fill="#ffe08a"/>`;
  save('icon-daily-kiln.svg', 64, 64, 'Daily Kiln home-screen icon', s);
}

/* ---------- calendar plate ---------- */
function calendar(cleared, missed, today) {
  const W = 375, H = 412, px = 12, gx = 26, gw = 323, cw = gw / 7, gy = 106, rh = 46;
  let s = gshadow(W / 2, H - 6, 170, 6) + rect(px, 10, W - 2 * px, H - 22, 26, CLAY_D) + rect(px, 4, W - 2 * px, H - 22, 26, CLAY) + rect(px + 7, 11, W - 2 * px - 14, H - 36, 20, CLAY_D, ' opacity="0.35"') + rect(px + 7, 12.5, W - 2 * px - 14, H - 36, 20, CLAY_L);
  s += rect(px + 18, 14, 40, 3.5, 1.7, '#ffffff', ' opacity="0.8"');
  s += `<text x="${W / 2}" y="54" text-anchor="middle" ${FONT} font-size="26" fill="${INK}">November 2026</text>`;
  ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach((d, i) => { s += `<text x="${f(gx + cw * i + cw / 2)}" y="88" text-anchor="middle" ${FONT} font-size="12" fill="${INK}" opacity="0.75">${d}</text>`; });
  s += rect(gx, 94, gw, 2.5, 1.2, CLAY_D, ' opacity="0.6"');
  for (let d = 1; d <= 30; d++) {
    const idx = d - 1 + 6, col = idx % 7, row = Math.floor(idx / 7), cx = gx + cw * col + cw / 2, cy = gy + row * rh + 20, t = 38;
    const isC = cleared.includes(d), isM = missed.includes(d);
    if (isC) {
      const c = TILES[(d - 1) % 6];
      s += rect(cx - t / 2, cy - t / 2 + 3, t, t, 9, shade(c, 0.4)) + rect(cx - t / 2, cy - t / 2, t, t, 9, c) + rect(cx - t / 2 + 5, cy - t / 2 + 4, 12, 3, 1.5, tint(c, 0.55))
        + `<text x="${f(cx)}" y="${f(cy + 7)}" text-anchor="middle" ${FONT} font-size="17" fill="${TXT_ON[c]}">${d}</text>`;
    } else {
      // raw clay dimple: pressed in, lip at the bottom catches the light
      s += rect(cx - t / 2, cy - t / 2 + 1.5, t, t, 9, '#ffffff', ' opacity="0.55"') + rect(cx - t / 2, cy - t / 2, t, t, 9, isM ? '#b79c78' : RAW_D) + rect(cx - t / 2 + 1.5, cy - t / 2 + 2.5, t - 3, t - 3, 8, isM ? '#cdb492' : RAW)
        + `<text x="${f(cx)}" y="${f(cy + 6.5)}" text-anchor="middle" ${FONT} font-size="15" fill="${isM ? '#8a5a3c' : '#a8906c'}">${d}</text>`;
      if (isM) s += `<path d="M${f(cx - 9)} ${f(cy + 12)} L${f(cx + 9)} ${f(cy + 12)}" stroke="#8a5a3c" stroke-width="2" stroke-linecap="round" opacity="0.6"/>`;
    }
    if (d === today) s += rect(cx - t / 2 - 3.5, cy - t / 2 - 3.5, t + 7, t + 7, 12, 'none', ` stroke="#D55E00" stroke-width="3"`);
  }
  return s;
}
const CLEARED = [1, 2, 3, 4, 5, 6, 7, 8, 10, 11];
save('calendar-plate.svg', 375, 412, 'Monthly calendar plate, November 2026 sample', calendar(CLEARED, [9], 12));
save('calendar-plate-empty.svg', 375, 412, 'Monthly calendar plate, empty month', calendar([], [], 0));

writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(manifest.length + ' files written to ' + out);
