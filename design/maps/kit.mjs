// Shared drawing kit for the chapter maps and game-screen backgrounds.
// Flat shapes only: each object has a ground shadow, a darker underside and one highlight.
const TILES = ['#E69F00', '#56B4E9', '#009E73', '#CC79A7', '#0072B2', '#D55E00'];
const ch = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex = (r, g, b) => '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const shade = (h, a) => hex(...ch(h).map((v) => v * (1 - a)));
const tint = (h, a) => hex(...ch(h).map((v) => v + (255 - v) * a));
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const f = (n) => Number(n.toFixed(1));

/* ---- drawing kit: flat shapes, each with a shadow, a darker underside and one highlight ---- */
const shadow = (x, y, rx, ry = rx * 0.32) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}" fill="#2f5d2a" opacity="0.22"/>`;
function tree(x, y, s, c = '#3fae5a') {
  const d = shade(c, 0.22), l = tint(c, 0.28);
  return shadow(x, y, 26 * s)
    + `<rect x="${f(x - 5 * s)}" y="${f(y - 30 * s)}" width="${f(10 * s)}" height="${f(30 * s)}" rx="${f(4 * s)}" fill="#8a5a3c"/><rect x="${f(x + 1 * s)}" y="${f(y - 30 * s)}" width="${f(4 * s)}" height="${f(30 * s)}" rx="${f(2 * s)}" fill="#6f452c"/>`
    + `<circle cx="${f(x)}" cy="${f(y - 44 * s)}" r="${f(27 * s)}" fill="${d}"/><circle cx="${f(x - 16 * s)}" cy="${f(y - 36 * s)}" r="${f(18 * s)}" fill="${d}"/><circle cx="${f(x + 17 * s)}" cy="${f(y - 37 * s)}" r="${f(17 * s)}" fill="${d}"/>`
    + `<circle cx="${f(x)}" cy="${f(y - 50 * s)}" r="${f(26 * s)}" fill="${c}"/><circle cx="${f(x - 16 * s)}" cy="${f(y - 42 * s)}" r="${f(17 * s)}" fill="${c}"/><circle cx="${f(x + 17 * s)}" cy="${f(y - 43 * s)}" r="${f(16 * s)}" fill="${c}"/>`
    + `<circle cx="${f(x - 8 * s)}" cy="${f(y - 58 * s)}" r="${f(11 * s)}" fill="${l}"/><circle cx="${f(x + 12 * s)}" cy="${f(y - 50 * s)}" r="${f(6 * s)}" fill="${l}"/>`;
}
function bush(x, y, s, c = '#56bf5e') {
  const d = shade(c, 0.2), l = tint(c, 0.3);
  return shadow(x, y + 2, 22 * s) + `<circle cx="${f(x - 12 * s)}" cy="${f(y - 8 * s)}" r="${f(12 * s)}" fill="${d}"/><circle cx="${f(x + 12 * s)}" cy="${f(y - 8 * s)}" r="${f(11 * s)}" fill="${d}"/><circle cx="${f(x)}" cy="${f(y - 12 * s)}" r="${f(15 * s)}" fill="${d}"/>`
    + `<circle cx="${f(x - 12 * s)}" cy="${f(y - 12 * s)}" r="${f(11 * s)}" fill="${c}"/><circle cx="${f(x + 12 * s)}" cy="${f(y - 12 * s)}" r="${f(10 * s)}" fill="${c}"/><circle cx="${f(x)}" cy="${f(y - 16 * s)}" r="${f(14 * s)}" fill="${c}"/><circle cx="${f(x - 4 * s)}" cy="${f(y - 21 * s)}" r="${f(6 * s)}" fill="${l}"/>`;
}
function rock(x, y, s) {
  return shadow(x, y + 2, 17 * s) + `<path d="M${f(x - 16 * s)} ${f(y)} Q${f(x - 18 * s)} ${f(y - 16 * s)} ${f(x - 4 * s)} ${f(y - 19 * s)} Q${f(x + 14 * s)} ${f(y - 22 * s)} ${f(x + 17 * s)} ${f(y - 4 * s)} Q${f(x + 18 * s)} ${f(y + 3 * s)} ${f(x)} ${f(y + 3 * s)} Q${f(x - 15 * s)} ${f(y + 4 * s)} ${f(x - 16 * s)} ${f(y)} Z" fill="#9aa3ad"/>`
    + `<path d="M${f(x - 11 * s)} ${f(y - 9 * s)} Q${f(x - 8 * s)} ${f(y - 16 * s)} ${f(x + 2 * s)} ${f(y - 16 * s)} Q${f(x - 2 * s)} ${f(y - 10 * s)} ${f(x - 11 * s)} ${f(y - 9 * s)} Z" fill="#c3cad1"/>`;
}
function flower(x, y, c, s = 1) {
  let o = `<rect x="${f(x - 1)}" y="${f(y)}" width="2" height="${f(7 * s)}" rx="1" fill="#3f9a4a"/>`;
  for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2 - 1.57; o += `<circle cx="${f(x + Math.cos(a) * 3.6 * s)}" cy="${f(y + Math.sin(a) * 3.6 * s)}" r="${f(2.8 * s)}" fill="${c}"/>`; }
  return o + `<circle cx="${f(x)}" cy="${f(y)}" r="${f(2.2 * s)}" fill="#fff3c4"/>`;
}
function tuft(x, y) { return `<path d="M${f(x - 5)} ${f(y)} l2 -7 l2 6 l2 -9 l2 9 l2 -6 l1 7 Z" fill="#4fae52"/>`; }
function kiln(x, y, s) {
  // A beehive kiln: brick dome, arched firebox, stubby chimney and two flat puffs of smoke.
  const b = '#d9764a', d = '#b4552f', l = '#eb9468';
  const dome = (dy, c) => `<path d="M${f(x - 34 * s)} ${f(y + dy)} L${f(x - 34 * s)} ${f(y - 22 * s + dy)} Q${f(x - 34 * s)} ${f(y - 62 * s + dy)} ${f(x)} ${f(y - 62 * s + dy)} Q${f(x + 34 * s)} ${f(y - 62 * s + dy)} ${f(x + 34 * s)} ${f(y - 22 * s + dy)} L${f(x + 34 * s)} ${f(y + dy)} Z" fill="${c}"/>`;
  return shadow(x, y + 3, 42 * s)
    + `<rect x="${f(x - 9 * s)}" y="${f(y - 80 * s)}" width="${f(18 * s)}" height="${f(24 * s)}" rx="${f(3 * s)}" fill="${d}"/><rect x="${f(x - 12 * s)}" y="${f(y - 84 * s)}" width="${f(24 * s)}" height="${f(8 * s)}" rx="${f(3 * s)}" fill="#8f4226"/>`
    + `<circle cx="${f(x + 6 * s)}" cy="${f(y - 96 * s)}" r="${f(8 * s)}" fill="#ffffff" opacity="0.85"/><circle cx="${f(x + 15 * s)}" cy="${f(y - 110 * s)}" r="${f(11 * s)}" fill="#ffffff" opacity="0.7"/><circle cx="${f(x + 30 * s)}" cy="${f(y - 122 * s)}" r="${f(7 * s)}" fill="#ffffff" opacity="0.5"/>`
    + dome(4 * s, d) + dome(0, b)
    + `<path d="M${f(x - 24 * s)} ${f(y - 30 * s)} Q${f(x - 22 * s)} ${f(y - 52 * s)} ${f(x - 4 * s)} ${f(y - 55 * s)} Q${f(x - 16 * s)} ${f(y - 44 * s)} ${f(x - 17 * s)} ${f(y - 30 * s)} Z" fill="${l}"/>`
    + [[-22, -14, 14], [6, -14, 16], [-8, -28, 16], [16, -40, 12], [-26, -40, 10]].map(([bx, by, bw]) => `<rect x="${f(x + bx * s)}" y="${f(y + by * s)}" width="${f(bw * s)}" height="${f(2.2 * s)}" rx="1" fill="${d}" opacity="0.75"/>`).join('')
    + `<rect x="${f(x - 38 * s)}" y="${f(y - 8 * s)}" width="${f(76 * s)}" height="${f(12 * s)}" rx="${f(4 * s)}" fill="#8f4226"/>`
    + `<path d="M${f(x - 13 * s)} ${f(y - 2 * s)} L${f(x - 13 * s)} ${f(y - 18 * s)} Q${f(x - 13 * s)} ${f(y - 32 * s)} ${f(x)} ${f(y - 32 * s)} Q${f(x + 13 * s)} ${f(y - 32 * s)} ${f(x + 13 * s)} ${f(y - 18 * s)} L${f(x + 13 * s)} ${f(y - 2 * s)} Z" fill="#5b2414"/>`
    + `<path d="M${f(x - 8 * s)} ${f(y - 2 * s)} L${f(x - 8 * s)} ${f(y - 15 * s)} Q${f(x - 8 * s)} ${f(y - 25 * s)} ${f(x)} ${f(y - 25 * s)} Q${f(x + 8 * s)} ${f(y - 25 * s)} ${f(x + 8 * s)} ${f(y - 15 * s)} L${f(x + 8 * s)} ${f(y - 2 * s)} Z" fill="#ffb347"/>`
    + `<path d="M${f(x - 4 * s)} ${f(y - 2 * s)} Q${f(x - 5 * s)} ${f(y - 13 * s)} ${f(x)} ${f(y - 18 * s)} Q${f(x + 5 * s)} ${f(y - 11 * s)} ${f(x + 4 * s)} ${f(y - 2 * s)} Z" fill="#ffe08a"/>`;
}
function pot(x, y, s, c) {
  const d = shade(c, 0.28), l = tint(c, 0.45);
  return shadow(x, y + 1, 12 * s) + `<ellipse cx="${f(x)}" cy="${f(y - 11 * s)}" rx="${f(11 * s)}" ry="${f(12 * s)}" fill="${d}"/><ellipse cx="${f(x - 1 * s)}" cy="${f(y - 12 * s)}" rx="${f(10 * s)}" ry="${f(11.5 * s)}" fill="${c}"/>`
    + `<rect x="${f(x - 6 * s)}" y="${f(y - 28 * s)}" width="${f(12 * s)}" height="${f(8 * s)}" rx="${f(2 * s)}" fill="${c}"/><rect x="${f(x - 8 * s)}" y="${f(y - 31 * s)}" width="${f(16 * s)}" height="${f(5 * s)}" rx="${f(2.5 * s)}" fill="${d}"/>`
    + `<rect x="${f(x - 7 * s)}" y="${f(y - 19 * s)}" width="${f(3.5 * s)}" height="${f(9 * s)}" rx="${f(1.7 * s)}" fill="${l}"/>`;
}
function tileStack(x, y, s) {
  let o = shadow(x, y + 2, 20 * s);
  [[-9, 0, 0], [9, 0, 1], [0, -9, 2], [-9, -18, 3], [9, -18, 4], [0, -27, 5]].forEach(([dx, dy, k]) => {
    const c = TILES[k]; o += `<rect x="${f(x + dx * s - 8.5 * s)}" y="${f(y + dy * s - 9 * s)}" width="${f(17 * s)}" height="${f(11 * s)}" rx="${f(3 * s)}" fill="${shade(c, 0.4)}"/><rect x="${f(x + dx * s - 8.5 * s)}" y="${f(y + dy * s - 12 * s)}" width="${f(17 * s)}" height="${f(11 * s)}" rx="${f(3 * s)}" fill="${c}"/><rect x="${f(x + dx * s - 5.5 * s)}" y="${f(y + dy * s - 10 * s)}" width="${f(7 * s)}" height="${f(2.4 * s)}" rx="1.2" fill="${tint(c, 0.5)}"/>`; });
  return o;
}
function cloud(x, y, s) { return `<g fill="#ffffff"><circle cx="${f(x - 18 * s)}" cy="${f(y)}" r="${f(13 * s)}"/><circle cx="${f(x)}" cy="${f(y - 8 * s)}" r="${f(18 * s)}"/><circle cx="${f(x + 20 * s)}" cy="${f(y)}" r="${f(14 * s)}"/><rect x="${f(x - 30 * s)}" y="${f(y - 2 * s)}" width="${f(62 * s)}" height="${f(15 * s)}" rx="${f(7.5 * s)}"/></g>`; }
function sign(x, y, text) {
  return shadow(x, y + 2, 20) + `<rect x="${f(x - 3.5)}" y="${f(y - 44)}" width="7" height="46" rx="3" fill="#7a4d31"/>`
    + `<rect x="${f(x - 44)}" y="${f(y - 58)}" width="88" height="26" rx="6" fill="#8a5a3c"/><rect x="${f(x - 44)}" y="${f(y - 61)}" width="88" height="26" rx="6" fill="#d9a066"/><rect x="${f(x - 39)}" y="${f(y - 57)}" width="30" height="3" rx="1.5" fill="#ecc08b"/>`
    + `<text x="${f(x)}" y="${f(y - 43)}" text-anchor="middle" font-family="'Baloo 2', sans-serif" font-weight="800" font-size="13" fill="#5a3418">${text}</text>`;
}
function cottage(x, y, s, roof) {
  // A potter's cottage with a glazed-tile roof in one of the six tile colours.
  const rd = shade(roof, 0.35), rl = tint(roof, 0.4);
  return shadow(x, y + 3, 34 * s)
    + `<rect x="${f(x + 10 * s)}" y="${f(y - 66 * s)}" width="${f(10 * s)}" height="${f(20 * s)}" rx="${f(2 * s)}" fill="#b4552f"/>`
    + `<rect x="${f(x - 25 * s)}" y="${f(y - 30 * s)}" width="${f(50 * s)}" height="${f(33 * s)}" rx="${f(4 * s)}" fill="#dcc294"/><rect x="${f(x - 25 * s)}" y="${f(y - 32 * s)}" width="${f(50 * s)}" height="${f(32 * s)}" rx="${f(4 * s)}" fill="#fff1d6"/>`
    + `<path d="M${f(x - 34 * s)} ${f(y - 27 * s)} L${f(x - 16 * s)} ${f(y - 58 * s)} L${f(x + 16 * s)} ${f(y - 58 * s)} L${f(x + 34 * s)} ${f(y - 27 * s)} Z" fill="${rd}"/>`
    + `<path d="M${f(x - 34 * s)} ${f(y - 31 * s)} L${f(x - 16 * s)} ${f(y - 62 * s)} L${f(x + 16 * s)} ${f(y - 62 * s)} L${f(x + 34 * s)} ${f(y - 31 * s)} Z" fill="${roof}"/>`
    + [[-22, -40, 44], [-17, -49, 34]].map(([dx, dy, w]) => `<rect x="${f(x + dx * s)}" y="${f(y + dy * s)}" width="${f(w * s)}" height="${f(2.2 * s)}" rx="1" fill="${rd}" opacity="0.8"/>`).join('')
    + `<rect x="${f(x - 12 * s)}" y="${f(y - 59 * s)}" width="${f(14 * s)}" height="${f(3 * s)}" rx="1.500" fill="${rl}"/>`
    + `<path d="M${f(x - 17 * s)} ${f(y)} L${f(x - 17 * s)} ${f(y - 14 * s)} Q${f(x - 17 * s)} ${f(y - 21 * s)} ${f(x - 10.5 * s)} ${f(y - 21 * s)} Q${f(x - 4 * s)} ${f(y - 21 * s)} ${f(x - 4 * s)} ${f(y - 14 * s)} L${f(x - 4 * s)} ${f(y)} Z" fill="#8a5a3c"/><circle cx="${f(x - 7 * s)}" cy="${f(y - 9 * s)}" r="${f(1.5 * s)}" fill="#ffd556"/>`
    + `<rect x="${f(x + 4 * s)}" y="${f(y - 22 * s)}" width="${f(15 * s)}" height="${f(13 * s)}" rx="${f(3 * s)}" fill="#b98f5a"/><rect x="${f(x + 6 * s)}" y="${f(y - 20 * s)}" width="${f(11 * s)}" height="${f(9 * s)}" rx="${f(2 * s)}" fill="#8fd8f5"/>`;
}
const star = (cx, cy, r, fill, stroke) => { let d = ''; for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.46 : r, a = -Math.PI / 2 + (i * Math.PI) / 5; d += (i ? 'L' : 'M') + f(cx + Math.cos(a) * rr) + ' ' + f(cy + Math.sin(a) * rr); } return `<path d="${d}Z" fill="${fill}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/>`; };

export { TILES, shade, tint, rnd, f, shadow, tree, bush, rock, flower, tuft, kiln, pot, tileStack, cloud, sign, cottage, star };
