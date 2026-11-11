// Scenery pieces for chapters 2 to 10. Same rules as kit.mjs: flat shapes only,
// a ground shadow, a darker underside and one highlight. Every piece is drawn
// from its ground point (x, y) upwards, at scale s.
import { TILES, shade, tint, f, shadow, tree, kiln, cottage, star } from './kit.mjs';

const S = (x, y, s) => {
  const X = (v) => f(x + v * s), Y = (v) => f(y + v * s), L = (v) => f(v * s);
  const op = (o) => (o < 1 ? ` opacity="${o}"` : '');
  return {
    X, Y, L,
    r: (dx, dy, w, h, rx, fill, o = 1) => `<rect x="${X(dx)}" y="${Y(dy)}" width="${L(w)}" height="${L(h)}" rx="${L(rx)}" fill="${fill}"${op(o)}/>`,
    rr: (dx, dy, w, h, rx, fill, rot, px, py) => `<rect x="${X(dx)}" y="${Y(dy)}" width="${L(w)}" height="${L(h)}" rx="${L(rx)}" fill="${fill}" transform="rotate(${rot} ${X(px)} ${Y(py)})"/>`,
    c: (dx, dy, r, fill, o = 1) => `<circle cx="${X(dx)}" cy="${Y(dy)}" r="${L(r)}" fill="${fill}"${op(o)}/>`,
    e: (dx, dy, rx, ry, fill, rot = 0) => `<ellipse cx="${X(dx)}" cy="${Y(dy)}" rx="${L(rx)}" ry="${L(ry)}" fill="${fill}"${rot ? ` transform="rotate(${rot} ${X(dx)} ${Y(dy)})"` : ''}/>`,
    p: (pts, fill) => `<polygon points="${pts.map(([a, b]) => X(a) + ',' + Y(b)).join(' ')}" fill="${fill}" stroke="${fill}" stroke-width="${L(2)}" stroke-linejoin="round"/>`,
    l: (x1, y1, x2, y2, w, stroke) => `<line x1="${X(x1)}" y1="${Y(y1)}" x2="${X(x2)}" y2="${Y(y2)}" stroke="${stroke}" stroke-width="${L(w)}" stroke-linecap="round"/>`,
    dome: (dx, dy, rx, ry, fill) => `<path d="M${X(dx - rx)} ${Y(dy)} A${L(rx)} ${L(ry)} 0 0 1 ${X(dx + rx)} ${Y(dy)} Z" fill="${fill}"/>`,
  };
};
const WOOD = '#7a4d31', WOOD2 = '#a56c44', WOOD3 = '#d9a066', CREAM = '#fff1d6', STONE = '#9aa3ad', STONE2 = '#c3cad1', GLASS = '#8fd8f5';

export function signpost(x, y, text) {
  const w = text.length * 8.2 + 24, g = S(x, y, 1);
  return shadow(x, y + 2, 20) + g.r(-3.5, -44, 7, 46, 3, WOOD) + g.r(-w / 2, -58, w, 26, 6, '#8a5a3c') + g.r(-w / 2, -61, w, 26, 6, WOOD3) + g.r(-w / 2 + 5, -57, 26, 3, 1.5, '#ecc08b')
    + `<text x="${f(x)}" y="${f(y - 43)}" text-anchor="middle" font-family="'Baloo 2', sans-serif" font-weight="800" font-size="15" fill="#5a3418">${text}</text>`;
}

/* ---- 2. Clay Creek ---- */
export function waterwheel(x, y, s) {
  const g = S(x, y, s); let o = shadow(x, y + 3, 34 * s) + g.p([[-26, 0], [-4, -34], [4, -34], [-14, 0]], WOOD) + g.p([[26, 0], [4, -34], [-4, -34], [14, 0]], WOOD);
  o += g.c(0, -32, 30, WOOD) + g.c(0, -32, 24, WOOD3) + g.c(0, -32, 19, '#f1d9a7');
  for (let k = 0; k < 4; k++) o += g.rr(-2, -56, 4, 48, 2, WOOD2, k * 45, 0, -32);
  for (let k = 0; k < 8; k++) o += g.rr(-6, -66, 12, 6, 2, '#62c6f0', k * 45 + 22, 0, -32);
  return o + g.c(0, -32, 6, WOOD) + g.c(-1, -33, 2.5, WOOD3);
}
export function wheelbarrow(x, y, s) {
  const g = S(x, y, s);
  return shadow(x, y + 2, 20 * s) + g.l(8, -10, 26, -18, 3, WOOD) + g.c(-14, -6, 7, '#3a3f4a') + g.c(-14, -6, 3, STONE2) + g.e(0, -20, 14, 7, '#c9673f')
    + g.p([[-18, -18], [16, -18], [10, -6], [-10, -6]], shade(TILES[4], 0.3)) + g.p([[-18, -20], [16, -20], [11, -9], [-11, -9]], TILES[4]) + g.r(-13, -19, 10, 2.5, 1.2, tint(TILES[4], 0.5)) + g.r(9, -6, 3, 7, 1.5, WOOD);
}
export function clayPit(x, y, s) {
  const g = S(x, y, s);
  return g.e(0, -2, 30, 12, '#c9764a') + g.e(0, -1, 24, 9, '#a85a35') + g.e(2, 1, 17, 6, '#8f4a2a') + g.l(18, -4, 30, -30, 3, WOOD) + g.p([[14, -2], [22, -2], [22, -12], [14, -12]], STONE);
}
export function clayMound(x, y, s) {
  const g = S(x, y, s);
  return shadow(x, y + 2, 20 * s) + g.dome(-8, 0, 13, 15, '#b4552f') + g.dome(10, 0, 10, 11, '#b4552f') + g.dome(-8, -1, 12, 14, '#d9764a') + g.dome(10, -1, 9, 10, '#d9764a') + g.r(-14, -9, 7, 3, 1.5, '#eb9468');
}
export function reeds(x, y, s) {
  const g = S(x, y, s); let o = '';
  for (const [dx, h] of [[-6, 22], [0, 30], [6, 24]]) o += g.r(dx - 1, -h, 2, h, 1, '#3f9a4a') + g.r(dx - 2, -h - 7, 4, 9, 2, '#8a5a3c');
  return o;
}

/* ---- 3. Sunflower Fields ---- */
export function sunflower(x, y, s) {
  const g = S(x, y, s); let o = g.r(-1.5, -30, 3, 30, 1.5, '#3f9a4a') + g.e(-6, -13, 6, 3, '#4fae52', -30) + g.e(6, -18, 6, 3, '#4fae52', 30);
  for (let k = 0; k < 8; k++) o += g.c(Math.cos((k * Math.PI) / 4) * 8, -36 + Math.sin((k * Math.PI) / 4) * 8, 4.6, '#ffcc33');
  return o + g.c(0, -36, 6, '#7a4a21') + g.c(-1.5, -37.5, 2.4, '#9a6233');
}
export function windmill(x, y, s) {
  const g = S(x, y, s); let o = shadow(x, y + 3, 30 * s) + g.p([[-17, 0], [-10, -62], [10, -62], [17, 0]], '#e9dcc0') + g.p([[5, 0], [4, -62], [10, -62], [17, 0]], '#d4c4a2')
    + g.r(-6, -17, 12, 17, 6, '#8a5a3c') + g.c(0, -40, 4.5, GLASS) + g.p([[-13, -62], [0, -79], [13, -62]], shade(TILES[5], 0.3)) + g.p([[-13, -64], [0, -81], [13, -64]], TILES[5]);
  for (let k = 0; k < 4; k++) o += g.rr(-5, -110, 10, 44, 2, '#ffffff', k * 90 + 24, 0, -66) + g.rr(-1, -110, 2, 44, 1, WOOD2, k * 90 + 24, 0, -66);
  return o + g.c(0, -66, 4.5, WOOD);
}
export function hayBale(x, y, s) {
  const g = S(x, y, s);
  return shadow(x, y + 2, 20 * s) + g.r(-17, -22, 34, 22, 7, '#d9a441') + g.r(-17, -25, 34, 22, 7, '#f2c75a') + g.r(-8, -25, 3, 22, 1.5, '#d9a441') + g.r(6, -25, 3, 22, 1.5, '#d9a441') + g.r(-13, -22, 4, 3, 1.5, '#f9dd8c');
}
export function scarecrow(x, y, s, c = TILES[1]) {
  const g = S(x, y, s);
  return shadow(x, y + 2, 12 * s) + g.r(-2, -44, 4, 44, 2, WOOD) + g.r(-21, -37, 42, 4, 2, WOOD) + g.p([[-12, -38], [12, -38], [9, -17], [-9, -17]], c) + g.c(0, -47, 8, '#f2d9a7')
    + g.p([[-10, -52], [10, -52], [5, -63], [-5, -63]], '#8a5a3c') + g.r(-14, -53, 28, 3, 1.5, '#6f452c') + g.c(-3, -46, 1.2, '#3a2a12') + g.c(3, -46, 1.2, '#3a2a12');
}
export function fence(x, y, s) {
  const g = S(x, y, s); let o = '';
  for (const i of [-1, 0, 1]) o += g.r(i * 17 - 2, -19, 4, 19, 2, WOOD2);
  return o + g.r(-23, -16, 46, 3.5, 1.7, WOOD3) + g.r(-23, -8, 46, 3.5, 1.7, WOOD3);
}
export function barn(x, y, s) {
  const g = S(x, y, s);
  return shadow(x, y + 3, 38 * s) + g.r(-28, -36, 56, 39, 3, '#a8322a') + g.r(-28, -38, 56, 38, 3, '#d9463a') + g.p([[-34, -34], [-20, -57], [20, -57], [34, -34]], '#6f241d') + g.p([[-34, -37], [-20, -60], [20, -60], [34, -37]], '#93352b')
    + g.r(-10, -23, 20, 23, 2, CREAM) + g.l(-8, -21, 8, -2, 2, '#d9463a') + g.l(8, -21, -8, -2, 2, '#d9463a') + g.r(-5, -52, 10, 8, 2, CREAM) + g.r(-24, -34, 12, 3, 1.5, '#ec6a5e');
}

/* ---- 4. Market Town ---- */
export function stall(x, y, s, c = TILES[5]) {
  const g = S(x, y, s); let o = shadow(x, y + 3, 32 * s) + g.r(-25, -46, 4, 46, 2, WOOD) + g.r(21, -46, 4, 46, 2, WOOD) + g.r(-27, -19, 54, 20, 3, WOOD2) + g.r(-29, -23, 58, 6, 3, WOOD3);
  [TILES[0], TILES[5], TILES[2], TILES[3]].forEach((k, i) => { o += g.c(-17 + i * 11, -27, 5, k); });
  o += g.r(-31, -60, 62, 5, 2.5, shade(c, 0.35));
  for (let i = 0; i < 6; i++) { const k = i % 2 ? '#ffffff' : c; o += g.r(-30 + i * 10, -56, 10.4, 13, 0, k) + g.c(-25 + i * 10, -43, 5.2, k); }
  return o;
}
export function fountain(x, y, s) {
  const g = S(x, y, s);
  return shadow(x, y + 5, 38 * s) + g.e(0, -5, 35, 13, '#8d96a0') + g.e(0, -9, 35, 13, STONE2) + g.e(0, -10, 29, 9, '#3fa9dd') + g.e(0, -11, 28, 8, '#62c6f0') + g.r(-4, -36, 8, 27, 3, '#aab2bb')
    + g.e(0, -36, 15, 5.5, STONE) + g.e(0, -38, 15, 5, STONE2) + g.e(0, -39, 11, 3.2, GLASS) + g.r(-1.5, -55, 3, 16, 1.5, '#ffffff', 0.9) + g.c(-10, -30, 2.5, '#ffffff', 0.9) + g.c(10, -30, 2.5, '#ffffff', 0.9) + g.c(-16, -19, 2, '#ffffff', 0.9) + g.c(16, -19, 2, '#ffffff', 0.9);
}
export function clockTower(x, y, s, c = TILES[4]) {
  const g = S(x, y, s);
  return shadow(x, y + 3, 26 * s) + g.r(-15, -84, 30, 87, 3, '#dcc294') + g.r(-15, -86, 30, 86, 3, CREAM) + g.r(7, -86, 8, 86, 3, '#f1dfbd') + g.p([[-19, -84], [0, -110], [19, -84]], shade(c, 0.35)) + g.p([[-19, -87], [0, -113], [19, -87]], c)
    + g.c(0, -66, 11.5, '#8a5a3c') + g.c(0, -66, 9.5, '#ffffff') + g.l(0, -66, 0, -73, 1.8, '#3a2a12') + g.l(0, -66, 5, -64, 1.8, '#3a2a12') + g.r(-6, -19, 12, 19, 6, '#8a5a3c') + g.r(-4, -46, 8, 11, 4, GLASS);
}
export function crates(x, y, s) {
  const g = S(x, y, s), box = (dx, dy, w) => g.r(dx, dy - w + 2, w, w, 2, WOOD2) + g.r(dx, dy - w, w, w - 1, 2, WOOD3) + g.r(dx + 2, dy - w + 4, w - 4, 2, 1, WOOD2) + g.r(dx + 2, dy - 6, w - 4, 2, 1, WOOD2);
  return shadow(x, y + 2, 22 * s) + box(-19, 0, 18) + box(2, 0, 16) + box(-9, -18, 16) + g.c(-1, -38, 5, TILES[2]) + g.c(10, -19, 4.5, TILES[0]);
}
export function bunting(x, y, s) {
  const g = S(x, y, s); let o = g.r(-46, -52, 3, 52, 1.5, WOOD) + g.r(43, -52, 3, 52, 1.5, WOOD)
    + `<path d="M${g.X(-44)} ${g.Y(-50)} Q${g.X(0)} ${g.Y(-26)} ${g.X(44)} ${g.Y(-50)}" fill="none" stroke="${WOOD}" stroke-width="${g.L(1.5)}"/>`;
  TILES.forEach((c, i) => { const t = (i + 0.5) / 6, px = -44 + 88 * t, py = -50 + 24 * 2 * t * (1 - t) * 2; o += g.p([[px - 5, py], [px + 5, py], [px, py + 11]], c); });
  return o;
}
export function lampPost(x, y, s) {
  const g = S(x, y, s);
  return shadow(x, y + 1, 8 * s) + g.r(-1.7, -42, 3.4, 42, 1.7, '#3a3f4a') + g.r(-4, -4, 8, 4, 2, '#3a3f4a') + g.c(0, -45, 6, '#ffe08a') + g.c(-1.5, -46.5, 2, '#fff6d6') + g.r(-6, -53, 12, 3.5, 1.7, '#3a3f4a');
}

/* ---- 5. Seaside Pier ---- */
export function beachHut(x, y, s, c = TILES[1]) {
  const g = S(x, y, s); let o = shadow(x, y + 3, 22 * s);
  for (let i = 0; i < 5; i++) o += g.r(-15 + i * 6, -34, 6.3, 36, 0, i % 2 ? '#ffffff' : c);
  return o + g.p([[-19, -31], [0, -49], [19, -31]], shade(c, 0.45)) + g.p([[-19, -34], [0, -52], [19, -34]], shade(c, 0.22)) + g.r(-5, -19, 10, 21, 2, shade(c, 0.5)) + g.c(2.5, -8, 1.2, '#ffd556') + g.r(-10, 0, 20, 3.5, 1.5, WOOD3);
}
export function lighthouse(x, y, s) {
  const g = S(x, y, s);
  return g.e(0, 2, 30, 10, '#6f7882') + g.e(0, -1, 28, 9, STONE) + g.p([[-12, -3], [-8, -70], [8, -70], [12, -3]], '#ffffff') + g.p([[4, -3], [3, -70], [8, -70], [12, -3]], '#e3e8ee')
    + g.p([[-11.2, -16], [-10.2, -32], [10.2, -32], [11.2, -16]], '#e04a3a') + g.p([[-9.5, -46], [-8.6, -60], [8.6, -60], [9.5, -46]], '#e04a3a') + g.r(-11, -75, 22, 5, 2, '#3a3f4a') + g.r(-7, -87, 14, 12, 2, '#ffe08a')
    + g.r(-1, -87, 2, 12, 0, '#3a3f4a') + g.p([[-9, -87], [0, -98], [9, -87]], '#e04a3a') + g.r(-4, -14, 8, 11, 4, '#3a3f4a');
}
export function sailboat(x, y, s, c = TILES[5]) {
  const g = S(x, y, s);
  return g.r(-24, 1, 16, 2.6, 1.3, '#a8e4fb') + g.r(10, 3, 16, 2.6, 1.3, '#a8e4fb') + g.p([[-18, -8], [18, -8], [12, 0], [-12, 0]], '#8a5a3c') + g.r(-19, -11, 38, 4, 2, WOOD3) + g.r(-1, -46, 2, 37, 1, WOOD)
    + g.p([[2, -44], [2, -13], [19, -13]], '#ffffff') + g.p([[-2, -39], [-2, -13], [-15, -13]], c);
}
export function umbrella(x, y, s, c = TILES[5]) {
  const g = S(x, y, s);
  return shadow(x, y + 2, 20 * s) + g.r(8, -4, 20, 8, 2, tint(c, 0.55)) + g.r(8, -4, 20, 3, 1.5, '#ffffff') + g.r(-1, -34, 2, 34, 1, WOOD) + g.dome(0, -29, 23, 19, shade(c, 0.25)) + g.dome(0, -31, 23, 19, c) + g.dome(0, -31, 9, 19, '#ffffff') + g.c(0, -51, 2, WOOD);
}
export function shell(x, y, s) { const g = S(x, y, s); return g.dome(0, 0, 6, 7, '#ff9db8') + g.dome(0, 0, 4, 5, '#ffd0de') + g.r(-0.6, -6, 1.2, 6, 0.6, '#ff9db8'); }
export function starfish(x, y, s) { return star(x, y - 5 * s, 6.5 * s, '#ff8a5c', '#d9603a'); }
export function palm(x, y, s) {
  const g = S(x, y, s); let o = shadow(x, y + 2, 18 * s);
  for (let i = 0; i < 5; i++) o += g.r(-3.5 + i * 1.6, -13 * (i + 1), 7, 14, 3.5, i % 2 ? '#a9794c' : '#b98a5a');
  const tx = 7, ty = -66;
  for (const a of [200, 160, 235, 305, 340, 270]) o += g.e(tx + Math.cos((a * Math.PI) / 180) * 15, ty + Math.sin((a * Math.PI) / 180) * 12, 18, 6, a % 2 ? '#3fae5a' : '#2f9d63', a);
  return o + g.c(tx - 3, ty + 4, 3.2, WOOD) + g.c(tx + 4, ty + 5, 3.2, WOOD);
}
export function sandcastle(x, y, s) {
  const g = S(x, y, s);
  return shadow(x, y + 2, 18 * s) + g.r(-13, -12, 26, 12, 2, '#e3c285') + g.r(-15, -22, 9, 22, 2, '#f1d9a7') + g.r(6, -22, 9, 22, 2, '#f1d9a7') + g.r(-5, -19, 10, 9, 2, '#f1d9a7') + g.r(-3, -8, 6, 8, 3, '#b98f5a')
    + g.l(0, -19, 0, -31, 1.5, WOOD) + g.p([[1, -31], [9, -28], [1, -25]], TILES[5]);
}
export function buoy(x, y, s) { const g = S(x, y, s); return g.e(0, 1, 10, 3, '#a8e4fb') + g.dome(0, 0, 7, 9, '#e04a3a') + g.r(-7, -4, 14, 3, 0, '#ffffff') + g.r(-1, -16, 2, 8, 1, '#3a3f4a') + g.c(0, -17, 2.2, '#ffd556'); }

/* ---- 6. Bluegum Forest ---- */
export function gumTree(x, y, s, extra = '') {
  const g = S(x, y, s);
  return shadow(x, y + 2, 22 * s) + g.r(-5, -84, 10, 84, 5, '#e6ddd0') + g.r(1, -84, 4, 84, 2, '#d3c7b6') + g.r(-3, -60, 3.5, 10, 1.7, '#cbbda9') + g.r(-2, -32, 3, 8, 1.5, '#cbbda9') + g.l(0, -64, 15, -78, 4, '#e6ddd0') + extra
    + g.e(0, -94, 31, 21, '#2f7a66') + g.e(-19, -82, 18, 13, '#2f7a66') + g.e(21, -80, 17, 12, '#2f7a66') + g.e(0, -99, 30, 20, '#3d8f7a') + g.e(-19, -87, 17, 12, '#3d8f7a') + g.e(21, -85, 16, 11, '#3d8f7a') + g.e(-8, -106, 12, 7, '#6fb89f');
}
export function mushroom(x, y, s, c = '#e04a3a') {
  const g = S(x, y, s);
  return g.r(-3, -10, 6, 11, 3, CREAM) + g.dome(0, -8, 11, 11, shade(c, 0.25)) + g.dome(0, -9, 11, 11, c) + g.c(-4, -14, 2, '#ffffff') + g.c(4, -12, 1.6, '#ffffff') + g.c(0, -17, 1.4, '#ffffff');
}
export function log(x, y, s) {
  const g = S(x, y, s);
  return shadow(x, y + 2, 22 * s) + g.r(-21, -13, 42, 14, 7, '#6f452c') + g.r(-21, -16, 42, 14, 7, WOOD2) + g.c(15, -9, 7, '#e3b279') + g.c(15, -9, 4.2, '#c98d4e') + g.c(15, -9, 1.6, '#8a5a3c') + g.r(-15, -17, 15, 4, 2, '#59b85f');
}
export function treehouse(x, y, s) {
  const g = S(x, y, s);
  const hut = g.r(-24, -50, 48, 5, 2, WOOD2) + g.r(-15, -73, 30, 24, 3, WOOD3) + g.p([[-19, -72], [0, -88], [19, -72]], shade(TILES[5], 0.3)) + g.p([[-19, -74], [0, -90], [19, -74]], TILES[5]) + g.r(-4, -67, 8, 8, 2, GLASS)
    + g.l(-18, -46, -18, 0, 2, WOOD) + g.l(-10, -46, -10, 0, 2, WOOD) + [-8, -18, -28, -38].map((d) => g.l(-18, d, -10, d, 2, WOOD)).join('');
  return gumTree(x, y, s * 1.15) + hut;
}
export function waterfall(x, y, s) {
  const g = S(x, y, s);
  return shadow(x, y + 5, 36 * s) + g.p([[-30, 0], [-26, -70], [-8, -83], [14, -79], [30, -60], [32, 0]], '#6f7882') + g.p([[-25, -3], [-22, -66], [-8, -77], [2, -73], [2, -3]], STONE) + g.r(-11, -76, 17, 76, 6, GLASS) + g.r(-7, -72, 3, 62, 1.5, '#ffffff', 0.85)
    + g.r(1, -66, 2.5, 52, 1.2, '#ffffff', 0.85) + g.e(-2, 3, 28, 9, '#3fa9dd') + g.e(-2, 1, 26, 8, '#62c6f0') + g.c(-11, 0, 5, '#ffffff') + g.c(-2, 2, 6, '#ffffff') + g.c(7, 0, 5, '#ffffff') + g.c(19, -68, 8, '#59b85f') + g.c(24, -60, 5, '#59b85f');
}
export function fern(x, y, s) {
  const g = S(x, y, s); let o = '';
  for (const a of [200, 235, 270, 305, 340]) o += g.e(Math.cos((a * Math.PI) / 180) * 9, -2 + Math.sin((a * Math.PI) / 180) * 9, 10, 3.2, a % 2 ? '#2f8f5a' : '#3fa26a', a);
  return o;
}

/* ---- 7. Lantern Gardens ---- */
export function lanternString(x, y, s) {
  const g = S(x, y, s); let o = g.r(-42, -58, 3, 58, 1.5, '#5a3b2a') + g.r(39, -58, 3, 58, 1.5, '#5a3b2a')
    + `<path d="M${g.X(-40)} ${g.Y(-56)} Q${g.X(0)} ${g.Y(-36)} ${g.X(40)} ${g.Y(-56)}" fill="none" stroke="#5a3b2a" stroke-width="${g.L(1.5)}"/>`;
  ['#ff6b5a', '#ffc94d', '#ff8fb3', '#ffa24d'].forEach((c, i) => { const t = (i + 0.5) / 4, px = -40 + 80 * t, py = -56 + 40 * t * (1 - t) * 2; o += g.r(px - 3, py, 6, 3, 1, '#5a3b2a') + g.r(px - 6, py + 2.5, 12, 15, 6, c) + g.r(px - 3.5, py + 5.5, 2.5, 8, 1.2, tint(c, 0.55)); });
  return o;
}
export function stoneLamp(x, y, s) {
  const g = S(x, y, s);
  return shadow(x, y + 2, 13 * s) + g.r(-9, -5, 18, 6, 2, '#8d96a0') + g.r(-3.5, -25, 7, 21, 2, STONE) + g.r(-9, -38, 18, 14, 3, '#aab2bb') + g.r(-4.5, -35, 9, 8, 2, '#ffe08a') + g.p([[-13, -37], [0, -47], [13, -37]], '#6f7882') + g.c(0, -49, 2.5, '#6f7882');
}
export function pavilion(x, y, s) {
  const g = S(x, y, s);
  return shadow(x, y + 4, 40 * s) + g.r(-30, -5, 60, 8, 2, STONE) + g.r(-17, -32, 34, 28, 2, CREAM) + g.r(-6, -22, 12, 18, 2, '#8a5a3c') + g.r(-24, -34, 5, 30, 2, '#c0392b') + g.r(19, -34, 5, 30, 2, '#c0392b')
    + g.p([[-40, -31], [-27, -45], [27, -45], [40, -31]], '#8f2a22') + g.p([[-40, -34], [-27, -48], [27, -48], [40, -34]], '#d9463a') + g.r(-12, -60, 24, 13, 2, CREAM) + g.p([[-25, -58], [-14, -70], [14, -70], [25, -58]], '#8f2a22')
    + g.p([[-25, -61], [-14, -73], [14, -73], [25, -61]], '#d9463a') + g.c(0, -76, 3.2, '#ffd556') + g.r(-22, -46, 12, 2.5, 1.2, '#ec6a5e');
}
export const blossomTree = (x, y, s, c = '#ff9ec4') => tree(x, y, s, c);

/* ---- 8. Snowy Peaks ---- */
export function pine(x, y, s, snow = true) {
  const g = S(x, y, s);
  return shadow(x, y + 2, 18 * s) + g.r(-3, -12, 6, 13, 2, WOOD) + g.p([[-22, -10], [0, -40], [22, -10]], '#2a6f52') + g.p([[-17, -30], [0, -56], [17, -30]], '#2f7d5a') + g.p([[-12, -48], [0, -70], [12, -48]], '#35896a')
    + (snow ? g.p([[-7, -58], [0, -70], [7, -58], [3, -60], [0, -57], [-3, -60]], '#ffffff') + g.p([[-9, -41], [0, -56], [9, -41], [4, -44], [0, -40], [-4, -44]], '#ffffff') + g.p([[-12, -23], [0, -40], [12, -23], [6, -26], [0, -22], [-6, -26]], '#ffffff') : '');
}
export function snowman(x, y, s, c = TILES[5]) {
  const g = S(x, y, s);
  return shadow(x, y + 2, 15 * s) + g.c(0, -11, 12.5, '#cfdcea') + g.c(-0.5, -12, 11.5, '#ffffff') + g.c(0, -29, 9, '#cfdcea') + g.c(-0.5, -30, 8.2, '#ffffff') + g.r(-9, -25, 18, 4.5, 2, c) + g.r(4, -24, 4, 11, 2, c)
    + g.r(-6, -46, 12, 10, 2, '#3a3f4a') + g.r(-10, -38, 20, 3.2, 1.6, '#3a3f4a') + g.p([[0, -31], [9, -29.5], [0, -28]], '#ff8a3d') + g.c(-3, -33, 1.2, '#3a3f4a') + g.c(3, -33, 1.2, '#3a3f4a') + g.c(0, -16, 1.3, '#3a3f4a') + g.c(0, -10, 1.3, '#3a3f4a');
}
export function cableCar(x, y, s) {
  const g = S(x, y, s);
  return shadow(x, y + 2, 12 * s) + g.r(-3, -80, 6, 80, 2, '#6b7480') + g.r(-22, -82, 44, 4, 2, '#6b7480') + g.l(-44, -72, 44, -90, 1.5, '#3a3f4a') + g.l(16, -85, 16, -68, 1.5, '#3a3f4a') + g.r(5, -66, 23, 19, 4, '#b8322a')
    + g.r(5, -68, 23, 18, 4, '#e04a3a') + g.r(8, -64, 7, 7, 2, GLASS) + g.r(17, -64, 7, 7, 2, GLASS);
}
export function snowCottage(x, y, s, c = TILES[4]) {
  const g = S(x, y, s);
  return cottage(x, y, s, '#f4f8fc') + g.c(17, -74, 5, '#ffffff', 0.9) + g.c(23, -85, 7, '#ffffff', 0.75) + g.c(33, -94, 4.5, '#ffffff', 0.6) + g.r(-25, -32, 50, 4, 2, c);
}
export function snowDrift(x, y, s) { const g = S(x, y, s); return g.dome(0, 2, 16, 9, '#d5e2f2') + g.dome(-1, 0, 15, 8, '#ffffff'); }

/* ---- 9. Glass Desert ---- */
export function cactus(x, y, s) {
  const g = S(x, y, s), c = '#3f9a5a', d = '#2f7d48';
  return shadow(x, y + 2, 15 * s) + g.r(-19, -32, 8, 17, 4, d) + g.r(-19, -23, 15, 8, 4, d) + g.r(11, -38, 8, 19, 4, d) + g.r(4, -27, 15, 8, 4, d) + g.r(-6, -46, 12, 46, 6, d) + g.r(-7, -47, 12, 46, 6, c)
    + g.r(-20, -33, 8, 17, 4, c) + g.r(-20, -24, 15, 8, 4, c) + g.r(10, -39, 8, 19, 4, c) + g.r(3, -28, 15, 8, 4, c) + g.r(-4, -42, 2.5, 30, 1.2, '#63b97a') + g.c(-1, -49, 3.6, '#ff8fb3');
}
export function tent(x, y, s, c = TILES[5]) {
  const g = S(x, y, s);
  return shadow(x, y + 3, 32 * s) + g.p([[-29, 0], [0, -45], [29, 0]], c) + g.p([[-16, 0], [0, -45], [-6, 0]], '#ffffff') + g.p([[16, 0], [0, -45], [6, 0]], '#ffffff') + g.p([[-7, 0], [0, -23], [7, 0]], shade(c, 0.6))
    + g.r(-1, -55, 2, 11, 1, WOOD) + g.p([[1, -55], [11, -51], [1, -47]], TILES[0]);
}
export function bottles(x, y, s) {
  const g = S(x, y, s), b = (dx, h, c) => g.r(dx - 5.5, -h, 11, h, 4, c, 0.9) + g.r(dx - 2, -h - 8, 4, 9, 2, c, 0.9) + g.r(dx - 3.5, -h + 3, 2.2, h - 8, 1.1, '#ffffff', 0.6);
  return shadow(x, y + 2, 20 * s) + b(-13, 20, TILES[1]) + b(0, 27, TILES[2]) + b(13, 17, TILES[3]);
}
export function furnace(x, y, s) { return kiln(x, y, s) + bottles(x + 46 * s, y + 4 * s, s * 0.9); }
export function oasis(x, y, s) {
  const g = S(x, y, s);
  return g.e(0, 0, 42, 15, '#f6e2b0') + g.e(0, 0, 34, 11, '#3fa9dd') + g.e(0, -2, 33, 10, '#62c6f0') + g.r(-12, -4, 13, 2.6, 1.3, '#a8e4fb') + g.r(6, 1, 10, 2.6, 1.3, '#a8e4fb') + palm(x - 34 * s, y - 2 * s, 0.85 * s) + palm(x + 30 * s, y - 5 * s, 0.7 * s);
}
export function rockArch(x, y, s) {
  const g = S(x, y, s);
  return shadow(x, y + 3, 36 * s) + g.p([[-32, 0], [-28, -40], [-10, -57], [14, -55], [30, -36], [32, 0], [18, 0], [16, -26], [4, -36], [-8, -34], [-16, -22], [-16, 0]], '#c9673f') + g.p([[-27, -38], [-10, -54], [6, -53], [-8, -47], [-20, -35]], '#e08a5c');
}

/* ---- 10. The Great Kiln ---- */
export function banner(x, y, s, c = TILES[5]) {
  const g = S(x, y, s);
  return shadow(x, y + 1, 8 * s) + g.r(-1.5, -58, 3, 58, 1.5, WOOD) + g.p([[2, -56], [23, -52], [15, -46], [23, -40], [2, -36]], c) + g.r(4, -54, 8, 2.5, 1.2, tint(c, 0.5)) + g.c(0, -60, 3.2, '#ffd556');
}
export function brazier(x, y, s) {
  const g = S(x, y, s);
  return shadow(x, y + 1, 10 * s) + g.r(-2, -18, 4, 18, 2, '#3a3f4a') + g.r(-7, -3, 14, 4, 2, '#3a3f4a') + g.p([[-6, -26], [-2, -39], [0, -33], [4, -43], [7, -26]], '#ff8a3d') + g.p([[-3, -26], [0, -35], [3, -26]], '#ffe08a') + g.p([[-10, -26], [10, -26], [6, -16], [-6, -16]], '#4a505c');
}
export function greatKiln(x, y, s) {
  const g = S(x, y, s);
  return shadow(x, y + 5, 100 * s, 14 * s) + g.r(-92, -18, 184, 24, 6, '#8f4226') + g.r(-92, -24, 184, 24, 6, '#b4552f') + g.r(-84, -20, 40, 3, 1.5, '#d9764a') + g.r(-72, -42, 144, 24, 6, '#8f4226') + g.r(-72, -48, 144, 24, 6, '#c9673f') + g.r(-64, -44, 34, 3, 1.5, '#eb9468')
    + kiln(x, y - 46 * s, 2.05 * s) + g.c(-42, -104, 8, '#5b2414') + g.c(-42, -104, 5.5, '#ffb347') + g.c(42, -104, 8, '#5b2414') + g.c(42, -104, 5.5, '#ffb347') + g.c(0, -140, 8, '#5b2414') + g.c(0, -140, 5.5, '#ffb347')
    + banner(x - 82 * s, y - 24 * s, s, TILES[1]) + banner(x + 82 * s, y - 24 * s, s, TILES[3]) + banner(x - 62 * s, y - 48 * s, s * 0.9, TILES[0]) + banner(x + 62 * s, y - 48 * s, s * 0.9, TILES[2]);
}
