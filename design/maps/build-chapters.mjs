// Builds the maps and game-screen backgrounds for chapters 2 to 10, plus two
// overview pages covering all ten chapters. Chapter 1 keeps its own scripts.
// Run: node design/maps/build-chapters.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { TILES, shade, tint, rnd, f, shadow, tree, bush, rock, flower, tuft, kiln, pot, tileStack, cloud, cottage, star } from './kit.mjs';
import * as P from './props.mjs';

const OUT = new URL('./', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const W = 375, MAP_H = 1640, BG_H = 812;
const BAND_Y = [208, 330, 470, 600, 740, 880, 1090, 1230, 1380, 1520];
const bandOf = (y) => { let k = -1; BAND_Y.forEach((v, i) => { if (y >= v) k = i; }); return k; };
const wave = (i) => [10 + (i % 3), 58 + ((i * 13) % 40), i * 1.3];
function hill(H, yTop, amp, w, phase, fill) {
  let d = `M-10 ${H + 10} L-10 ${yTop}`; for (let x = -10; x <= W + 10; x += 12) d += ` L${x} ${f(yTop + amp * Math.sin(x / w + phase))}`;
  return `<path d="${d} L${W + 10} ${H + 10} Z" fill="${fill}"/>`;
}
const peak = (x, base, h, w) => `<polygon points="${x - w},${base} ${x},${base - h} ${x + w},${base}" fill="#c3d3ea"/><polygon points="${x},${base - h} ${x + w},${base} ${x + w * 0.2},${base}" fill="#b3c6e2"/>`
  + `<polygon points="${f(x - w * 0.32)},${f(base - h * 0.68)} ${x},${base - h} ${f(x + w * 0.32)},${f(base - h * 0.68)} ${f(x + w * 0.12)},${f(base - h * 0.74)} ${x},${f(base - h * 0.64)} ${f(x - w * 0.14)},${f(base - h * 0.75)}" fill="#ffffff"/>`;
const pebble = (x, y, c) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(3 + rnd() * 3)}" ry="2.500" fill="${c}"/>`;
const tuftC = (x, y, c) => `<path d="M${f(x - 5)} ${f(y)} l2 -7 l2 6 l2 -9 l2 9 l2 -6 l1 7 Z" fill="${c}"/>`;
const glint = (x, y) => `<rect x="${f(x)}" y="${f(y)}" width="${f(12 + rnd() * 14)}" height="3.500" rx="1.700" fill="#a8e4fb"/>`;
const PETALS = ['#ffffff', '#ffd1e6', '#fff2a8', '#ffb8a1', '#d8c9ff'];
const meadow = (x, y, i) => (i % 5 < 3 ? flower(x, y, PETALS[i % 5], 0.9 + rnd() * 0.4) : tuft(x, y));
const SAND_ROAD = { under: '#c79f62', bed: '#f1d9a7', pu: '#e2c287', paver: '#fff3d2' };
const BRIDGE = {
  wood: { under: '#8a5a3c', deck: '#d9a066', plank: '#b67d48', rail: '#7a4d31', railL: '#a56c44', w: 66 },
  rope: { under: '#8a6238', deck: '#c9a06a', plank: '#a8824e', rail: '#d3c7b6', railL: '#f4eee4', w: 54 },
  arch: { under: '#8f2a22', deck: '#d9463a', plank: '#b8322a', rail: '#8f2a22', railL: '#ec6a5e', w: 62 },
};
const T = (c, s = 1) => (x, y) => tree(x, y, s, c);
const pots = (a, b) => (x, y) => pot(x - 12, y, 1.05, TILES[a]) + pot(x + 12, y + 5, 0.9, TILES[b]);

/* ------------------------------------------------------------------ chapters */
const CHAPTERS = [
  {
    n: 2, id: 'clay-creek', name: 'Clay Creek', sky: '#c9ecf7', sun: [300, 62, 24, '#ffd556', '#ffe9a3'], far: ['#b9dcb0', '#a3d39a'], phase: 2.5,
    bands: ['#a4e07a', '#96d86c', '#e9ad7c', '#de9a68', '#e9ad7c', '#98d96e', '#a6e17c', '#97d86d', '#e6a877', '#dd9866'], road: SAND_ROAD,
    water: { y: 1012, half: 38, bank: '#e9ad7c', deep: '#3fa9dd', fill: '#62c6f0', glint: '#a8e4fb', bridge: 'stones' },
    scatter: (x, y, i, bg) => ((!bg && ((y > 470 && y < 880) || y > 1380)) || (bg && y > 742) ? pebble(x, y, '#c98a5c') : meadow(x, y, i)),
    gate: { a: '#d9764a', d: '#b4552f', l: '#eb9468' },
    decor: [[1500, 0, 34, (x, y) => cottage(x, y, 1, TILES[2])], [1420, 1, 28, T('#3fae5a')], [1340, 0, 20, (x, y) => P.clayMound(x, y, 1)], [1260, 1, 28, T('#58bf52', 0.9)], [1170, 0, 22, (x, y) => P.wheelbarrow(x, y, 1.1)],
      [1100, 1, 22, (x, y) => bush(x, y, 1)], [950, 0, 34, (x, y) => P.waterwheel(x, y, 1)], [935, 1, 12, (x, y) => P.reeds(x, y, 1.1)], [840, 0, 28, (x, y) => P.clayPit(x, y, 1)], [770, 1, 36, (x, y) => kiln(x, y, 0.95)],
      [690, 0, 20, (x, y) => P.clayMound(x, y, 1.1)], [640, 1, 22, pots(1, 5)], [560, 0, 22, (x, y) => P.wheelbarrow(x, y, 1)], [500, 1, 28, (x, y) => P.clayPit(x, y, 0.9)], [420, 0, 28, T('#2f9d63')],
      [360, 1, 34, (x, y) => cottage(x, y, 0.95, TILES[0])], [290, 0, 20, (x, y) => bush(x, y, 0.9)], [270, 1, 24, T('#3fae5a', 0.8)]],
    bgBands: ['#a4e07a', '#a0de76', '#a4e07a', '#98d96e', '#e9ad7c'],
    horizon: [(x, y, s) => tree(x, y, s, '#3fae5a'), (x, y, s) => kiln(x, y, s), (x, y, s) => tree(x, y, s * 0.9, '#2f9d63'), (x, y, s) => cottage(x, y, s, TILES[2]), (x, y, s) => tree(x, y, s, '#58bf52'), (x, y, s) => P.clayMound(x, y, s * 1.4)],
    front: [T('#2f9d63', 0.72), T('#58bf52', 0.7), (x, y) => P.waterwheel(x, y, 0.9), (x, y) => kiln(x, y, 0.8), (x, y) => P.wheelbarrow(x, y, 1.1), (x, y) => P.clayMound(x, y, 1.1), (x, y) => bush(x, y, 0.9), pots(1, 5), (x, y) => rock(x, y, 0.8)],
  },
  {
    n: 3, id: 'sunflower-fields', name: 'Sunflower Fields', sky: '#bfeaf8', sun: [300, 62, 26, '#ffd556', '#ffe9a3'], far: ['#cfe59a', '#bfdc84'], phase: 4.1,
    bands: ['#a8df7a', '#f4d35e', '#eec84e', '#a4e07a', '#f4d35e', '#eec84e', '#9cd96f', '#f4d35e', '#eec84e', '#a4e07a'], road: SAND_ROAD,
    scatter: (x, y, i, bg) => ((bg ? y > 668 && y < 742 : [1, 2, 4, 5, 7, 8].includes(bandOf(y))) ? P.sunflower(x, y, 0.5 + rnd() * 0.2) : meadow(x, y, i)), scatterCount: 190,
    gate: { a: '#fff1d6', d: '#dcc294', l: '#ffffff' },
    decor: [[1500, 0, 36, (x, y) => P.barn(x, y, 1)], [1430, 1, 18, (x, y) => P.hayBale(x, y, 1)], [1350, 0, 28, T('#3fae5a')], [1280, 1, 18, (x, y) => P.scarecrow(x, y, 1.1)], [1200, 0, 22, (x, y) => P.fence(x, y, 1.1)],
      [1120, 1, 34, (x, y) => P.windmill(x, y, 1)], [1040, 0, 18, (x, y) => P.hayBale(x, y, 1.1)], [960, 1, 28, T('#58bf52')], [880, 0, 18, (x, y) => P.scarecrow(x, y, 1.1, TILES[5])], [800, 1, 22, (x, y) => P.fence(x, y, 1.1)],
      [720, 0, 34, (x, y) => cottage(x, y, 1, TILES[0])], [640, 1, 18, (x, y) => P.hayBale(x, y, 1)], [560, 0, 34, (x, y) => P.windmill(x, y, 0.95)], [480, 1, 28, T('#2f9d63', 0.9)], [400, 0, 22, (x, y) => P.fence(x, y, 1)],
      [330, 1, 18, (x, y) => P.hayBale(x, y, 0.9)], [280, 0, 24, T('#3fae5a', 0.8)]],
    bgBands: ['#a8df7a', '#a4e07a', '#a8df7a', '#f4d35e', '#a4e07a'],
    horizon: [(x, y, s) => tree(x, y, s, '#3fae5a'), (x, y, s) => P.windmill(x, y, s * 0.8), (x, y, s) => tree(x, y, s, '#58bf52'), (x, y, s) => P.barn(x, y, s), (x, y, s) => P.hayBale(x, y, s * 1.2), (x, y, s) => tree(x, y, s, '#2f9d63')],
    front: [T('#3fae5a', 0.72), T('#58bf52', 0.7), (x, y) => P.windmill(x, y, 0.82), (x, y) => P.barn(x, y, 0.85), (x, y) => P.hayBale(x, y, 1.1), (x, y) => P.sunflower(x, y, 1.3) + P.sunflower(x + 18, y + 3, 1.1), (x, y) => P.scarecrow(x, y, 1), (x, y) => P.hayBale(x, y, 0.9), (x, y) => P.fence(x - 6, y, 0.9)],
  },
  {
    n: 4, id: 'market-town', name: 'Market Town', sky: '#cfeefb', sun: [300, 62, 24, '#ffd556', '#ffe9a3'], far: ['#c9d8c0', '#b5cbaa'], phase: 1.4,
    bands: ['#a4e07a', '#96d86c', '#e9e2d2', '#ddd5c3', '#e9e2d2', '#ddd5c3', '#e9e2d2', '#98d96e', '#a6e17c', '#97d86d'], road: { under: '#8f8a7e', bed: '#c9c3b5', pu: '#a8a294', paver: '#f7f2e8' },
    scatter: (x, y, i, bg) => ((bg ? y > 330 : y > 470 && y < 1230) ? pebble(x, y, '#cbc2ae') : meadow(x, y, i)),
    gate: { a: '#c3cad1', d: '#8d96a0', l: '#e3e8ee' },
    decor: [[1500, 0, 34, (x, y) => cottage(x, y, 1, TILES[3])], [1430, 1, 28, T('#3fae5a')], [1350, 0, 10, (x, y) => P.lampPost(x, y, 1.1)], [1290, 1, 34, (x, y) => cottage(x, y, 0.95, TILES[1])], [1160, 0, 34, (x, y) => P.stall(x, y, 1, TILES[5])],
      [1080, 1, 34, (x, y) => P.stall(x, y, 1, TILES[1])], [1000, 0, 22, (x, y) => P.crates(x, y, 1)], [930, 1, 38, (x, y) => P.fountain(x, y, 1)], [850, 0, 34, (x, y) => P.stall(x, y, 1, TILES[2])], [770, 1, 28, (x, y) => P.clockTower(x, y, 1)],
      [700, 0, 40, (x, y) => P.bunting(x, y, 0.9)], [620, 1, 22, (x, y) => P.crates(x, y, 1.1)], [560, 0, 34, (x, y) => P.stall(x, y, 1, TILES[3])], [500, 1, 10, (x, y) => P.lampPost(x, y, 1.1)], [420, 0, 34, (x, y) => cottage(x, y, 1, TILES[4])],
      [350, 1, 28, T('#58bf52', 0.9)], [290, 0, 30, (x, y) => cottage(x, y, 0.85, TILES[0])]],
    bgBands: ['#a4e07a', '#e9e2d2', '#e6dece', '#e9e2d2', '#ddd5c3'],
    horizon: [(x, y, s) => cottage(x, y, s, TILES[3]), (x, y, s) => P.clockTower(x, y, s * 0.75), (x, y, s) => cottage(x, y, s, TILES[1]), (x, y, s) => P.stall(x, y, s, TILES[5]), (x, y, s) => tree(x, y, s, '#3fae5a'), (x, y, s) => cottage(x, y, s, TILES[4])],
    front: [(x, y) => P.lampPost(x + 4, y, 1.2), (x, y) => P.lampPost(x - 4, y, 1.2), (x, y) => P.stall(x, y, 0.95, TILES[5]), (x, y) => P.stall(x, y, 0.95, TILES[1]), (x, y) => P.crates(x + 6, y, 1), (x, y) => pot(x, y, 1, TILES[2]), (x, y) => P.fountain(x - 40, y, 0.62), (x, y) => P.crates(x - 30, y, 0.9), (x, y) => bush(x, y, 0.8)],
  },
  {
    n: 5, id: 'seaside-pier', name: 'Seaside Pier', sky: '#bfeaf8', sun: [300, 62, 26, '#ffd556', '#ffe9a3'], far: ['#7fd0f0', '#69c5ec'], phase: 3.2,
    bands: ['#5cc3ee', '#52b9e6', '#5cc3ee', '#52b9e6', '#f8ecc4', '#f6e2b0', '#f1d9a7', '#f6e2b0', '#f1d9a7', '#f6e2b0'], foam: 4, road: { under: '#8a5a3c', bed: '#c98d4e', pu: '#a56c44', paver: '#e3b279' },
    scatter: (x, y, i, bg) => ((bg ? y < 330 : y < 730) ? glint(x, y) : i % 4 === 0 ? P.shell(x, y, 1) : i % 4 === 1 ? P.starfish(x, y, 0.9) : pebble(x, y, '#e3c285')), scatterCount: 90,
    gate: { a: '#e04a3a', d: '#b8322a', l: '#f07a6c' },
    decor: [[1500, 0, 24, (x, y) => P.beachHut(x, y, 1.1, TILES[1])], [1470, 1, 24, (x, y) => P.umbrella(x, y, 1.1, TILES[5])], [1400, 0, 24, (x, y) => P.beachHut(x, y, 1.1, TILES[0])], [1330, 1, 24, (x, y) => P.palm(x, y, 1)],
      [1250, 0, 20, (x, y) => P.sandcastle(x, y, 1.2)], [1180, 1, 24, (x, y) => P.umbrella(x, y, 1.1, TILES[2])], [1100, 0, 24, (x, y) => P.beachHut(x, y, 1.1, TILES[3])], [1020, 1, 24, (x, y) => P.palm(x, y, 1.05)],
      [940, 0, 24, (x, y) => P.umbrella(x, y, 1.1, TILES[0])], [860, 1, 24, (x, y) => P.beachHut(x, y, 1.1, TILES[5])], [800, 0, 24, (x, y) => P.palm(x, y, 0.95)], [660, 0, 22, (x, y) => P.sailboat(x, y, 1.1, TILES[5])],
      [600, 1, 12, (x, y) => P.buoy(x, y, 1.1)], [520, 0, 30, (x, y) => P.lighthouse(x, y, 1.05)], [440, 1, 22, (x, y) => P.sailboat(x, y, 1, TILES[2])], [380, 0, 18, (x, y) => rock(x, y, 0.9)], [320, 1, 12, (x, y) => P.buoy(x, y, 1)],
      [270, 0, 22, (x, y) => P.sailboat(x, y, 0.9, TILES[0])], [700, 2, 18, (x, y) => rock(x, y, 0.9)], [630, 3, 22, (x, y) => P.sailboat(x, y, 0.95, TILES[3])], [560, 2, 12, (x, y) => P.buoy(x, y, 1.1)],
      [480, 3, 18, (x, y) => rock(x, y, 0.8)], [400, 2, 22, (x, y) => P.sailboat(x, y, 1, TILES[1])], [340, 3, 12, (x, y) => P.buoy(x, y, 1)], [300, 1, 18, (x, y) => rock(x, y, 0.7)], [1360, 2, 12, (x, y) => P.starfish(x, y, 1.8)],
      [1140, 2, 20, (x, y) => P.sandcastle(x, y, 1.1)], [980, 2, 24, (x, y) => P.beachHut(x, y, 1.05, TILES[2])]],
    bgBands: ['#5cc3ee', '#f8ecc4', '#f6e2b0', '#f1d9a7', '#f6e2b0'], bgFoam: 1,
    horizon: [(x, y, s) => P.sailboat(x, y, s * 1.2, TILES[5]), (x, y, s) => P.lighthouse(x, y, s * 0.9), (x, y, s) => P.buoy(x, y, s * 1.4), (x, y, s) => P.sailboat(x, y, s * 1.1, TILES[2]), (x, y, s) => P.buoy(x, y, s * 1.4), (x, y, s) => P.sailboat(x, y, s, TILES[0])],
    front: [(x, y) => P.palm(x + 4, y, 0.85), (x, y) => P.palm(x - 8, y, 0.8), (x, y) => P.beachHut(x, y, 1.2, TILES[1]), (x, y) => P.beachHut(x, y, 1.2, TILES[5]), (x, y) => P.umbrella(x + 6, y, 1.1, TILES[2]), (x, y) => P.sandcastle(x, y, 1.1), (x, y) => P.starfish(x, y, 1.6), (x, y) => P.shell(x - 40, y, 1.8), (x, y) => rock(x, y, 0.7)],
  },
  {
    n: 6, id: 'bluegum-forest', name: 'Bluegum Forest', sky: '#bfe6ee', sun: [300, 62, 22, '#fff1c4', '#e3f3ee'], far: ['#7fb8a4', '#5f9f8a'], phase: 5.3,
    bands: ['#6fbf7a', '#63b370', '#6fbf7a', '#5aa968', '#63b370', '#6fbf7a', '#63b370', '#5aa968', '#6fbf7a', '#63b370'], road: { under: '#8a6238', bed: '#c9a06a', pu: '#b08a56', paver: '#ead3a6' },
    water: { y: 900, half: 30, bank: '#8fd08f', deep: '#3fa9dd', fill: '#62c6f0', glint: '#a8e4fb', bridge: 'rope' },
    scatter: (x, y, i) => (i % 4 === 0 ? P.fern(x, y, 1) : i % 4 === 1 ? P.mushroom(x, y, 0.7, i % 8 === 1 ? '#e04a3a' : '#f2a33a') : i % 4 === 2 ? tuftC(x, y, '#3f8f52') : flower(x, y, PETALS[i % 5], 0.9)),
    gate: { a: '#a56c44', d: '#7a4d31', l: '#d9a066' },
    decor: [[1560, 1, 24, (x, y) => P.gumTree(x, y, 1)], [1490, 0, 24, (x, y) => P.gumTree(x, y, 0.9)], [1410, 1, 20, (x, y) => P.log(x, y, 1.1)], [1340, 0, 30, (x, y) => P.treehouse(x, y, 0.9)], [1250, 1, 24, (x, y) => P.gumTree(x, y, 1)],
      [1170, 0, 14, (x, y) => P.mushroom(x, y, 1.7)], [1100, 1, 24, (x, y) => P.gumTree(x, y, 0.95)], [1020, 0, 20, (x, y) => P.log(x, y, 1)], [800, 0, 34, (x, y) => P.waterfall(x, y, 1)], [760, 1, 24, (x, y) => P.gumTree(x, y, 1)],
      [680, 0, 24, (x, y) => P.gumTree(x, y, 0.95)], [600, 1, 20, (x, y) => P.log(x, y, 1.1)], [540, 0, 14, (x, y) => P.mushroom(x, y, 1.7, '#f2a33a')], [470, 1, 30, (x, y) => P.treehouse(x, y, 0.85)], [400, 0, 24, (x, y) => P.gumTree(x, y, 0.9)],
      [330, 1, 24, (x, y) => P.gumTree(x, y, 0.85)], [280, 0, 20, (x, y) => bush(x, y, 0.9, '#3f9a5a')]],
    bgBands: ['#6fbf7a', '#6bbb76', '#6fbf7a', '#63b370', '#5aa968'],
    horizon: [0.9, 1.1, 0.8, 1, 1.15, 0.9].map((k) => (x, y, s) => P.gumTree(x, y, s * k * 0.9)),
    front: [(x, y) => P.gumTree(x, y, 0.68), (x, y) => P.gumTree(x, y, 0.66), (x, y) => P.waterfall(x, y, 0.82), (x, y) => P.log(x, y, 1.2) + P.mushroom(x - 34, y + 6, 1.5), (x, y) => P.fern(x, y, 1.4), (x, y) => P.mushroom(x, y, 1.6, '#f2a33a'), (x, y) => P.log(x - 20, y, 0.9), (x, y) => P.fern(x - 20, y, 1.3), (x, y) => P.mushroom(x, y, 1.3)],
  },
  {
    n: 7, id: 'lantern-gardens', name: 'Lantern Gardens', sky: '#4b3f8f', sun: [300, 62, 22, '#fff6d6', '#7f70c4'], cloudOpacity: 0.22, far: ['#6a5aa8', '#5c4d9a'], phase: 0.2,
    bands: ['#5fae8a', '#55a380', '#5fae8a', '#55a380', '#63b38e', '#55a380', '#5fae8a', '#55a380', '#63b38e', '#55a380'], road: { under: '#5f4f8a', bed: '#9a8bc8', pu: '#8272b5', paver: '#e6defa' },
    water: { y: 1000, half: 42, bank: '#cdbfee', deep: '#3f6fbf', fill: '#5a8fd8', glint: '#a9c8f5', bridge: 'arch', lilies: true },
    scatter: (x, y, i) => (i % 5 < 3 ? flower(x, y, ['#ffd1e6', '#ffffff', '#ffe08a', '#ff9ec4', '#e3d6ff'][i % 5], 0.9 + rnd() * 0.4) : tuftC(x, y, '#3f8f6a')),
    gate: { a: '#d9463a', d: '#a8322a', l: '#ec6a5e' },
    decor: [[1520, 0, 38, (x, y) => P.pavilion(x, y, 0.95)], [1450, 1, 28, (x, y) => P.blossomTree(x, y, 1)], [1370, 0, 38, (x, y) => P.lanternString(x, y, 1)], [1290, 1, 12, (x, y) => P.stoneLamp(x, y, 1.2)], [1220, 0, 28, (x, y) => P.blossomTree(x, y, 0.95, '#ffb3d1')],
      [1140, 1, 28, (x, y) => P.blossomTree(x, y, 0.9)], [900, 0, 12, (x, y) => P.stoneLamp(x, y, 1.2)], [860, 1, 38, (x, y) => P.lanternString(x, y, 1)], [780, 0, 28, (x, y) => P.blossomTree(x, y, 1)], [700, 1, 38, (x, y) => P.pavilion(x, y, 0.9)],
      [620, 0, 12, (x, y) => P.stoneLamp(x, y, 1.2)], [560, 1, 28, (x, y) => P.blossomTree(x, y, 0.95, '#ffb3d1')], [480, 0, 38, (x, y) => P.lanternString(x, y, 0.95)], [410, 1, 28, T('#3f9a7a', 0.9)], [340, 0, 28, (x, y) => P.blossomTree(x, y, 0.85)],
      [280, 1, 12, (x, y) => P.stoneLamp(x, y, 1.1)]],
    bgBands: ['#5fae8a', '#5caa86', '#5fae8a', '#58a682', '#55a380'],
    horizon: [(x, y, s) => P.blossomTree(x, y, s), (x, y, s) => P.pavilion(x, y, s), (x, y, s) => P.blossomTree(x, y, s * 0.9, '#ffb3d1'), (x, y, s) => P.stoneLamp(x, y, s * 1.3), (x, y, s) => P.blossomTree(x, y, s), (x, y, s) => P.stoneLamp(x, y, s * 1.3)],
    front: [(x, y) => P.blossomTree(x, y, 0.72), (x, y) => P.blossomTree(x, y, 0.7, '#ffb3d1'), (x, y) => P.pavilion(x + 4, y, 0.85), (x, y) => P.lanternString(x - 8, y, 0.9), (x, y) => P.stoneLamp(x + 8, y, 1.2), (x, y) => bush(x, y, 0.8, '#3f9a7a'), (x, y) => P.stoneLamp(x - 30, y, 1.1), (x, y) => bush(x - 20, y, 0.8, '#3f9a7a'), (x, y) => rock(x, y, 0.7)],
  },
  {
    n: 8, id: 'snowy-peaks', name: 'Snowy Peaks', sky: '#cfe6f7', sun: [300, 62, 20, '#fff6d6', '#e6f1fa'], far: ['#dbe7f5', '#cddcf0'], peaks: true, phase: 2.0,
    bands: ['#f6f9fd', '#e8f0f8', '#f6f9fd', '#e8f0f8', '#f6f9fd', '#e8f0f8', '#f6f9fd', '#e8f0f8', '#f6f9fd', '#e8f0f8'], road: { under: '#6f8196', bed: '#9fb0c4', pu: '#8799ae', paver: '#eef3f9' },
    water: { y: 1040, half: 40, bank: '#ffffff', deep: '#9fcfe8', fill: '#c4e6f6', glint: '#ffffff', bridge: 'wood' },
    scatter: (x, y, i) => (i % 3 === 0 ? P.snowDrift(x, y, 0.6 + rnd() * 0.5) : i % 3 === 1 ? pebble(x, y, '#c5d3e4') : P.pine(x, y, 0.3, true)), scatterCount: 110,
    gate: { a: '#8a5a3c', d: '#6f452c', l: '#a56c44' }, locked: ['#cdbfae', '#8f7a58'],
    decor: [[1520, 0, 34, (x, y) => P.snowCottage(x, y, 1, TILES[5])], [1450, 1, 20, (x, y) => P.pine(x, y, 1)], [1390, 0, 20, (x, y) => P.pine(x, y, 0.9)], [1310, 1, 15, (x, y) => P.snowman(x, y, 1.1, TILES[5])], [1240, 0, 20, (x, y) => P.pine(x, y, 1.05)],
      [1160, 1, 34, (x, y) => P.snowCottage(x, y, 0.95, TILES[4])], [1110, 0, 20, (x, y) => P.pine(x, y, 1)], [950, 1, 20, (x, y) => P.pine(x, y, 1)], [900, 0, 44, (x, y) => P.cableCar(x, y, 1)], [820, 1, 15, (x, y) => P.snowman(x, y, 1.1, TILES[1])],
      [750, 0, 22, (x, y) => P.pine(x, y, 1.1)], [680, 1, 34, (x, y) => P.snowCottage(x, y, 1, TILES[2])], [600, 0, 20, (x, y) => P.pine(x, y, 1)], [540, 1, 18, (x, y) => rock(x, y, 1)], [470, 0, 44, (x, y) => P.cableCar(x, y, 0.95)],
      [400, 1, 20, (x, y) => P.pine(x, y, 1)], [340, 0, 15, (x, y) => P.snowman(x, y, 1, TILES[3])], [280, 1, 20, (x, y) => P.pine(x, y, 0.9)],
      ...[1480, 1350, 1200, 1060, 860, 720, 560, 430, 310].map((y, i) => [y, 2 + (i % 2), 20, (x, yy) => (i % 3 === 2 ? P.snowDrift(x, yy, 1.6) + P.pine(x + 22, yy + 4, 0.7) : P.pine(x, yy, 0.85 + (i % 3) * 0.15))])],
    bgBands: ['#f6f9fd', '#f1f6fb', '#f6f9fd', '#e8f0f8', '#f6f9fd'],
    horizon: [(x, y, s) => P.pine(x, y, s), (x, y, s) => P.snowCottage(x, y, s, TILES[5]), (x, y, s) => P.pine(x, y, s * 0.9), (x, y, s) => P.pine(x, y, s), (x, y, s) => P.snowCottage(x, y, s, TILES[4]), (x, y, s) => P.pine(x, y, s * 1.1)],
    front: [(x, y) => P.pine(x + 2, y, 0.9), (x, y) => P.pine(x - 2, y, 0.85), (x, y) => P.snowCottage(x + 4, y, 0.9, TILES[5]), (x, y) => P.snowman(x, y, 1.4, TILES[1]), (x, y) => P.pine(x + 8, y, 0.6), (x, y) => P.snowDrift(x, y, 1.4), (x, y) => P.snowDrift(x, y, 1.2), (x, y) => P.pine(x - 26, y, 0.55), (x, y) => rock(x, y, 0.7)],
  },
  {
    n: 9, id: 'glass-desert', name: 'Glass Desert', sky: '#ffe2b0', sun: [300, 62, 26, '#fff6d6', '#ffd98a'], clouds: false, far: ['#f2b377', '#e89c5c'], phase: 3.9,
    bands: ['#f6c98a', '#f0b874', '#f6c98a', '#eeb06a', '#f6c98a', '#f0b874', '#f6c98a', '#eeb06a', '#f6c98a', '#f0b874'], road: { under: '#9c5a34', bed: '#c9774a', pu: '#b0633a', paver: '#f8dfb4' },
    scatter: (x, y, i) => (i % 3 === 0 ? pebble(x, y, '#d99a5a') : i % 3 === 1 ? tuftC(x, y, '#b9a14a') : P.cactus(x, y, 0.32)), scatterCount: 80,
    gate: { a: '#c9673f', d: '#9c4a2a', l: '#e08a5c' },
    decor: [[1520, 0, 30, (x, y) => P.tent(x, y, 1, TILES[5])], [1450, 1, 16, (x, y) => P.cactus(x, y, 1)], [1370, 0, 42, (x, y) => P.oasis(x, y, 1)], [1280, 1, 34, (x, y) => P.rockArch(x, y, 1)], [1200, 0, 16, (x, y) => P.cactus(x, y, 1.1)],
      [1120, 1, 30, (x, y) => P.tent(x, y, 1, TILES[1])], [1040, 0, 44, (x, y) => P.furnace(x - 18, y, 0.9)], [950, 1, 16, (x, y) => P.cactus(x, y, 1)], [880, 0, 20, (x, y) => P.bottles(x, y, 1.1)], [800, 1, 34, (x, y) => P.rockArch(x, y, 0.9)],
      [720, 0, 30, (x, y) => P.tent(x, y, 1, TILES[2])], [650, 1, 22, (x, y) => P.palm(x, y, 1)], [570, 0, 44, (x, y) => P.furnace(x - 18, y, 0.85)], [490, 1, 16, (x, y) => P.cactus(x, y, 1)], [420, 0, 40, (x, y) => P.oasis(x, y, 0.85)],
      [350, 1, 30, (x, y) => P.tent(x, y, 0.95, TILES[3])], [280, 0, 16, (x, y) => P.cactus(x, y, 0.9)]],
    bgBands: ['#f6c98a', '#f4c584', '#f6c98a', '#f0b874', '#eeb06a'],
    horizon: [(x, y, s) => P.cactus(x, y, s * 1.1), (x, y, s) => P.tent(x, y, s, TILES[5]), (x, y, s) => P.rockArch(x, y, s), (x, y, s) => P.cactus(x, y, s), (x, y, s) => P.tent(x, y, s, TILES[1]), (x, y, s) => P.palm(x, y, s * 0.8)],
    front: [(x, y) => P.cactus(x + 4, y, 1.1), (x, y) => P.cactus(x - 6, y, 1), (x, y) => P.furnace(x - 8, y, 0.8), (x, y) => P.tent(x, y, 0.95, TILES[1]), (x, y) => P.cactus(x + 24, y, 0.6), (x, y) => rock(x, y, 0.8), (x, y) => P.bottles(x - 30, y, 1), (x, y) => P.cactus(x - 30, y, 0.7), (x, y) => rock(x, y, 0.7)],
  },
  {
    n: 10, id: 'great-kiln', name: 'The Great Kiln', sky: '#ffd3a0', sun: [70, 70, 30, '#ff9a5a', '#ffc08a'], cloudOpacity: 0.6, far: ['#f0a47c', '#e48e6c'], phase: 1.0, Y1: 305, finale: true,
    bands: ['#e3a071', '#dd9866', '#b9dc74', '#aad369', '#b9dc74', '#aad369', '#b9dc74', '#aad369', '#b9dc74', '#aad369'], road: { under: '#8f4226', bed: '#c9673f', pu: '#b4552f', paver: '#f6d2a6' },
    scatter: (x, y, i, bg) => ((bg ? y > 742 : y < 470) ? pebble(x, y, '#c98a5c') : i % 5 < 3 ? flower(x, y, ['#ffffff', '#ffe08a', '#ffb8a1', '#fff2a8', '#ffd1e6'][i % 5], 0.9 + rnd() * 0.4) : tuftC(x, y, '#6fae3f')),
    decor: [[1520, 0, 34, (x, y) => cottage(x, y, 1, TILES[5])], [1450, 1, 10, (x, y) => P.banner(x, y, 1.1, TILES[0])], [1380, 0, 36, (x, y) => kiln(x, y, 0.9)], [1300, 1, 10, (x, y) => P.brazier(x, y, 1.2)], [1230, 0, 28, T('#58bf52')],
      [1150, 1, 10, (x, y) => P.banner(x, y, 1.1, TILES[1])], [1080, 0, 20, (x, y) => tileStack(x, y, 1.1)], [1000, 1, 34, (x, y) => cottage(x, y, 0.95, TILES[4])], [920, 0, 10, (x, y) => P.brazier(x, y, 1.2)], [850, 1, 36, (x, y) => kiln(x, y, 0.95)],
      [770, 0, 10, (x, y) => P.banner(x, y, 1.1, TILES[2])], [700, 1, 28, T('#3fae5a', 0.9)], [630, 0, 22, pots(3, 0)], [560, 1, 10, (x, y) => P.banner(x, y, 1.1, TILES[3])], [500, 0, 36, (x, y) => kiln(x, y, 0.85)],
      [450, 1, 10, (x, y) => P.brazier(x, y, 1.2)], [410, 0, 10, (x, y) => P.banner(x, y, 1, TILES[4])], [400, 1, 10, (x, y) => P.banner(x, y, 1, TILES[5])]],
    bgBands: ['#b9dc74', '#b5d970', '#b9dc74', '#aad369', '#e3a071'],
    horizon: [(x, y, s) => tree(x, y, s, '#58bf52'), (x, y, s) => kiln(x, y, s), (x, y, s) => P.banner(x, y, s * 0.9, TILES[1]), (x, y, s) => P.greatKiln(x - 62, y, s * 0.55), (x, y, s) => P.banner(x, y, s * 0.9, TILES[3]), (x, y, s) => tree(x, y, s, '#3fae5a')],
    front: [(x, y) => P.banner(x + 4, y, 1.2, TILES[0]), (x, y) => P.banner(x - 14, y, 1.2, TILES[3]), (x, y) => kiln(x, y, 0.86), (x, y) => cottage(x, y, 0.9, TILES[5]), (x, y) => P.brazier(x, y, 1.2), (x, y) => tileStack(x, y, 1), (x, y) => bush(x, y, 0.9), pots(2, 0), (x, y) => P.brazier(x - 6, y, 1.1)],
  },
];

/* ------------------------------------------------------------------ shared drawing */
function skyAndFar(c, H, map) {
  const [sx, sy, sr, sf, sring] = c.sun;
  let o = `<rect width="${W}" height="${H}" fill="${c.sky}"/>`;
  const sun = (x, y, k) => `<circle cx="${x}" cy="${y}" r="${f(sr * k * 1.4)}" fill="${sring}"/><circle cx="${x}" cy="${y}" r="${f(sr * k)}" fill="${sf}"/>`;
  const clouds = c.clouds === false ? '' : `<g opacity="${c.cloudOpacity ?? 1}">${map ? cloud(70, 58, 1) + cloud(205, 36, 0.7) + cloud(340, 118, 0.6) : cloud(52, 92, 0.6) + cloud(196, 112, 0.5)}</g>`;
  if (map) return o + sun(sx, sy, 1) + clouds + (c.peaks ? peak(60, 190, 120, 78) + peak(196, 190, 150, 92) + peak(322, 190, 110, 74) : '') + hill(H, 150, 16, 70, 1.2, c.far[0]) + hill(H, 176, 14, 52, 0.2, c.far[1]);
  return o + sun(sx > 180 ? 316 : 58, 116, 0.8) + clouds + (c.peaks ? peak(70, 146, 60, 42) + peak(190, 146, 78, 50) + peak(300, 146, 56, 40) : '') + hill(H, 128, 9, 60, 1.2, c.far[0]) + hill(H, 140, 8, 44, 0.2, c.far[1]);
}
const roadSvg = (d, r, w) => `<path d="${d}" fill="none" stroke="${r.under}" stroke-width="${w + 2}" stroke-linecap="round" stroke-linejoin="round" transform="translate(0 5)"/>`
  + `<path d="${d}" fill="none" stroke="${r.bed}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`
  + `<path d="${d}" fill="none" stroke="${r.pu}" stroke-width="${w - 20}" stroke-linejoin="round" stroke-dasharray="17 7" transform="translate(0 2)"/>`
  + `<path d="${d}" fill="none" stroke="${r.paver}" stroke-width="${w - 20}" stroke-linejoin="round" stroke-dasharray="17 7"/>`;
function foamLine(yTop, i) {
  const [a, w, p] = wave(i); let d = ''; for (let x = -10; x <= W + 10; x += 12) d += `${x === -10 ? 'M' : ' L'}${x} ${f(yTop + a * Math.sin(x / w + p))}`;
  return `<path d="${d}" fill="none" stroke="#ffffff" stroke-width="7" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#bfeaf8" stroke-width="3" transform="translate(0 -7)"/>`;
}
function gateSvg(gx, gy, g) {
  return shadow(gx, gy + 4, 62, 9)
    + [-1, 1].map((k) => `<rect x="${f(gx + k * 44 - 11)}" y="${gy - 70}" width="22" height="74" rx="5" fill="${g.d}"/><rect x="${f(gx + k * 44 - 11)}" y="${gy - 74}" width="22" height="74" rx="5" fill="${g.a}"/><rect x="${f(gx + k * 44 - 7)}" y="${gy - 68}" width="5" height="26" rx="2.500" fill="${g.l}"/>`).join('')
    + `<path d="M${f(gx - 58)} ${gy - 66} Q${f(gx)} ${gy - 128} ${f(gx + 58)} ${gy - 66} L${f(gx + 58)} ${gy - 82} Q${f(gx)} ${gy - 146} ${f(gx - 58)} ${gy - 82} Z" fill="${g.d}"/>`
    + `<path d="M${f(gx - 58)} ${gy - 70} Q${f(gx)} ${gy - 132} ${f(gx + 58)} ${gy - 70} L${f(gx + 58)} ${gy - 86} Q${f(gx)} ${gy - 150} ${f(gx - 58)} ${gy - 86} Z" fill="${g.a}"/>`
    + TILES.map((c, i) => { const t = (i + 0.5) / 6, x = gx - 44 + t * 88, y = gy - 86 - Math.sin(t * Math.PI) * 31; return `<rect x="${f(x - 6)}" y="${f(y - 5)}" width="12" height="12" rx="3" fill="${shade(c, 0.4)}"/><rect x="${f(x - 6)}" y="${f(y - 7)}" width="12" height="12" rx="3" fill="${c}"/>`; }).join('');
}

/* Level tiles: glazed when cleared, raised and ringed when current, raw clay when locked. */
const STARS = [3, 3, 2, 3, 1, 3, 2, 2, 3, 3, 2];
function nodeSvg(i, x, y, first, locked = ['#d9c7a8', '#a8926e']) {
  const n = first + i, state = i < STARS.length ? 'done' : i === STARS.length ? 'now' : 'locked';
  const c = state === 'locked' ? locked[0] : TILES[i % 6], edge = state === 'locked' ? locked[1] : shade(c, 0.45), s = state === 'now' ? 56 : 46, lift = state === 'now' ? 8 : 6, wide = n > 99;
  let o = `<ellipse cx="${f(x)}" cy="${f(y + s / 2 + lift)}" rx="${s * 0.52}" ry="7" fill="#3a2a12" opacity="0.25"/>`;
  if (state === 'now') o += `<rect x="${f(x - s / 2 - 6)}" y="${f(y - s / 2 - 6)}" width="${s + 12}" height="${s + 12 + lift}" rx="19" fill="#ffffff"/>`;
  o += `<rect x="${f(x - s / 2)}" y="${f(y - s / 2 + lift)}" width="${s}" height="${s}" rx="14" fill="${edge}"/><rect x="${f(x - s / 2)}" y="${f(y - s / 2)}" width="${s}" height="${s}" rx="14" fill="${c}"/>`
    + `<rect x="${f(x - s / 2 + 3)}" y="${f(y - s / 2 + 3)}" width="${s - 6}" height="${s - 6}" rx="11" fill="none" stroke="${tint(c, state === 'locked' ? 0.35 : 0.4)}" stroke-width="2"/>`
    + `<rect x="${f(x - s / 2 + 9)}" y="${f(y - s / 2 + 8)}" width="${f(s * 0.36)}" height="5" rx="2.500" fill="${tint(c, 0.55)}"/>`;
  const size = (state === 'now' ? 30 : 24) - (wide ? 5 : 0);
  o += `<text x="${f(x)}" y="${f(y + size * 0.37)}" text-anchor="middle" font-family="'Baloo 2', sans-serif" font-weight="800" font-size="${size}" fill="${state === 'locked' ? shade(locked[1], 0.15) : '#ffffff'}"${state === 'locked' ? '' : ` stroke="${shade(c, 0.6)}" stroke-width="4" paint-order="stroke" stroke-linejoin="round"`}>${n}</text>`;
  if (state === 'done') o += [0, 1, 2].map((k) => star(x - 15 + k * 15, y - s / 2 - 9 - (k === 1 ? 4 : 0), 8, k < STARS[i] ? '#ffd23f' : '#fff6dc', k < STARS[i] ? '#a86f00' : '#b9a57c')).join('');
  if (state === 'now') o += `<g class="pin"><path d="M${f(x)} ${f(y - s / 2 - 12)} l-11 -15 a13 13 0 1 1 22 0 Z" fill="#b3261e"/><path d="M${f(x)} ${f(y - s / 2 - 15)} l-11 -15 a13 13 0 1 1 22 0 Z" fill="#ff5a4d"/><circle cx="${f(x)}" cy="${f(y - s / 2 - 38)}" r="5.500" fill="#ffffff"/></g>`;
  return o;
}
const nodesSvg = (pts, first, locked) => pts.map((p, i) => nodeSvg(i, p[0], p[1], first, locked)).reverse().join('');

/* ------------------------------------------------------------------ map */
function buildMap(c) {
  const H = MAP_H, Y0 = 1540, Y1 = c.Y1 ?? 218, turns = c.turns ?? 2.25, topY = c.finale ? 258 : 96;
  const pathX = (y) => 187.5 + 100 * Math.sin(((Y0 - y) / (Y0 - Y1)) * Math.PI * 2 * turns + c.phase);
  const road = []; for (let y = H + 10; y >= topY; y -= 4) road.push([pathX(y), y]);
  const roadD = 'M' + road.map((p) => f(p[0]) + ' ' + f(p[1])).join(' L');
  const fine = []; for (let y = Y0; y >= Y1; y -= 0.5) fine.push([pathX(y), y]);
  const acc = [0]; for (let i = 1; i < fine.length; i++) acc.push(acc[i - 1] + Math.hypot(fine[i][0] - fine[i - 1][0], fine[i][1] - fine[i - 1][1]));
  const NODES = Array.from({ length: 20 }, (_, i) => fine[acc.findIndex((v) => v >= (acc[acc.length - 1] * i) / 19)]);
  const w = c.water, riverY = w ? (x) => w.y + 24 * Math.sin(x / 58 + 0.4) : null;
  const inWater = (x, y, pad) => !!w && Math.abs(y - riverY(x)) < w.half + pad;

  let art = skyAndFar(c, H, true) + c.bands.map((col, i) => hill(H, BAND_Y[i], ...wave(i), col)).join('');
  if (c.foam !== undefined) art += foamLine(BAND_Y[c.foam], c.foam);
  if (w) {
    const band = (half) => { let top = '', bot = ''; for (let x = -12; x <= W + 12; x += 8) { top += ` L${x} ${f(riverY(x) - half)}`; bot = ` L${x} ${f(riverY(x) + half)}` + bot; } return 'M' + top.slice(2) + bot + ' Z'; };
    art += `<path d="${band(w.half + 8)}" fill="${w.bank}"/><path d="${band(w.half + 2)}" fill="${w.deep}" transform="translate(0 3)"/><path d="${band(w.half)}" fill="${w.fill}"/>`;
    for (const [x, gw, dy] of [[30, 34, -14], [96, 22, 12], [150, 30, -20], [262, 26, 16], [318, 36, -12], [220, 18, -4]]) art += `<rect x="${x}" y="${f(riverY(x) + dy * (w.half / 38))}" width="${gw}" height="4" rx="2" fill="${w.glint}"/>`;
    if (w.lilies) for (const [x, dy, r] of [[58, 14, 9], [334, 14, 8], [300, -22, 6], [120, -18, 7]]) art += `<circle cx="${x}" cy="${f(riverY(x) + dy)}" r="${r}" fill="#3f9a4a"/><circle cx="${x - 1}" cy="${f(riverY(x) + dy - 1)}" r="${r - 2}" fill="#59b85f"/><circle cx="${x + 2}" cy="${f(riverY(x) + dy - 2)}" r="${f(r * 0.36)}" fill="#ffb3d1"/>`;
  }
  art += roadSvg(roadD, c.road, 50);
  if (w) {
    const bx = pathX(w.y), by = riverY(bx), ang = (Math.atan2(-8, pathX(w.y - 4) - pathX(w.y + 4)) * 180) / Math.PI + 90, len = w.half * 2 + 52;
    if (w.bridge === 'stones') {
      art += `<g transform="translate(${f(bx)} ${f(by)}) rotate(${f(ang)})"><rect x="-30" y="${-len / 2 + 10}" width="60" height="${len - 20}" fill="${w.fill}"/>`
        + [-2, -1, 0, 1, 2].map((k) => `<ellipse cx="${k % 2 ? 5 : -4}" cy="${k * 23 + 3}" rx="15" ry="12" fill="#7f8a94"/><ellipse cx="${k % 2 ? 5 : -4}" cy="${k * 23}" rx="15" ry="12" fill="#c3cad1"/><ellipse cx="${k % 2 ? 1 : -8}" cy="${k * 23 - 4}" rx="6" ry="3" fill="#e3e8ee"/>`).join('') + '</g>';
    } else {
      const b = BRIDGE[w.bridge], hw = b.w / 2;
      let g = `<g transform="translate(${f(bx)} ${f(by)}) rotate(${f(ang)})"><rect x="${-hw}" y="${-len / 2 + 2}" width="${b.w}" height="${len}" rx="8" fill="${b.under}"/><rect x="${-hw}" y="${-len / 2 - 2}" width="${b.w}" height="${len}" rx="8" fill="${b.deck}"/>`;
      for (let y = -len / 2 + 12; y < len / 2 - 8; y += 15) g += `<rect x="${-hw + 6}" y="${y}" width="${b.w - 12}" height="2.500" rx="1.200" fill="${b.plank}"/>`;
      art += g + `<rect x="${-hw - 5}" y="${-len / 2 - 6}" width="10" height="${len + 8}" rx="5" fill="${b.rail}"/><rect x="${hw - 5}" y="${-len / 2 - 6}" width="10" height="${len + 8}" rx="5" fill="${b.rail}"/><rect x="${-hw - 3}" y="${-len / 2 - 4}" width="4" height="${len + 4}" rx="2" fill="${b.railL}"/><rect x="${hw - 3}" y="${-len / 2 - 4}" width="4" height="${len + 4}" rx="2" fill="${b.railL}"/></g>`;
    }
  }

  // What must stay clear: level tiles, and the gate or the Great Kiln.
  const gx = pathX(118), gy = 150, fx = Math.max(104, Math.min(271, pathX(262)));
  const placed = NODES.map((p) => [p[0], p[1] - 8, 35]);
  placed.push(c.finale ? [fx, 170, 112] : [gx, gy - 60, 68]);
  const clearOf = (x, y, d) => placed.every((q) => Math.hypot(q[0] - x, q[1] - y) > q[2] + d);

  let scatter = '';
  for (let i = 0, n = 0; i < 1600 && n < (c.scatterCount ?? 110); i++) {
    const x = 12 + rnd() * (W - 24), y = 226 + rnd() * (H - 250);
    if (Math.abs(x - pathX(y)) < 44 || inWater(x, y, 16) || !clearOf(x, y, 10)) continue;
    scatter += c.scatter(x, y, n, false); n++;
  }
  art += scatter + (c.finale ? '' : gateSvg(gx, gy, c.gate));

  // Scenery finds its own spot beside the road: the nearest free place to where it was asked for.
  const items = c.finale ? [[268, P.greatKiln(fx, 268, 0.92)]] : [];
  const OFFS = [-124, 124, -178, 178, -232, 232];
  const place = (y, k, r, draw, halfW = r * 0.7) => {
    for (const dy of [0, -22, 22, -44, 44, -66, 66, -88, 88]) for (let j = 0; j < 6; j++) {
      const yy = y + dy, x = pathX(yy) + OFFS[(k + j) % 6];
      if (x < halfW + 4 || x > W - halfW - 4 || yy > H - 14) continue;
      if (Math.abs(x - pathX(yy)) < r + 32 || Math.abs(x - pathX(yy - r * 1.3)) < r * 0.8 + 30) continue;
      if (inWater(x, yy, 10 + r * 0.4)) continue;
      if (!placed.every((q) => Math.hypot(q[0] - x, q[1] - (yy - r * 0.7)) > (q[2] + r) * 0.9)) continue;
      placed.push([x, yy - r * 0.7, r]); items.push([yy, draw(x, yy)]); return;
    }
    console.warn(`  chapter ${c.n}: no room for an item near y ${y}`);
  };
  // The signpost is wide, so it hugs whichever screen edge is further from the road.
  const half = (c.name.length * 8.2 + 24) / 2;
  sign: for (const yy of [1600, 1578, 1556, 1620, 1534]) {
    for (const x of [half + 6, W - half - 6].sort((a, b) => Math.abs(b - pathX(yy)) - Math.abs(a - pathX(yy)))) {
      if (Math.abs(x - pathX(yy)) < half + 24 || Math.abs(x - pathX(yy - 50)) < half + 18) continue;
      if (NODES.some((p) => Math.abs(p[0] - x) < half + 28 && p[1] > yy - 96 && p[1] < yy + 30)) continue;
      placed.push([x - half / 2, yy - 40, 36], [x + half / 2, yy - 40, 36]); items.push([yy, P.signpost(x, yy, c.name)]); break sign;
    }
  }
  c.decor.forEach(([y, k, r, draw]) => place(y, k, r, draw));
  art += items.sort((a, b) => a[0] - b[0]).map((i) => i[1]).join('');
  return { art, NODES };
}

/* ------------------------------------------------------------------ game-screen background */
function buildBg(c) {
  const H = BG_H;
  let art = skyAndFar(c, H, false);
  [26, 70, 112, 250, 292, 340].forEach((x, i) => { art += c.horizon[i](x, 158, 0.42); });
  [156, 330, 520, 668, 742].forEach((y, i) => { art += hill(H, y, 6 + (i % 3), 62 + i * 9, i * 1.1, c.bgBands[i]); });
  if (c.bgFoam !== undefined) art += foamLine([156, 330, 520, 668, 742][c.bgFoam] + 2, 2);
  art += roadSvg('M96 836 C132 742 244 778 400 706', c.road, 44);
  for (let i = 0, n = 0; i < 1400 && n < 56; i++) {
    const x = 6 + rnd() * (W - 12), y = 172 + rnd() * (H - 180);
    if ((x > 22 && x < 353 && y < 664) || (y > 690 && Math.abs(y - (800 - (x - 96) * 0.31)) < 38)) continue;
    art += c.scatter(x, y, n, true); n++;
  }
  const spots = [[14, 700], [360, 694], [58, 742], [322, 730], [118, 768], [30, 806], [262, 800], [306, 806], [358, 806]];
  return art + spots.map(([x, y], i) => [y, c.front[i](x, y)]).sort((a, b) => a[0] - b[0]).map((i) => i[1]).join('');
}

/* ------------------------------------------------------------------ write everything */
const open = (H, cls = '') => `<svg xmlns="http://www.w3.org/2000/svg"${cls} viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`;
const inner = (file) => readFileSync(OUT + file, 'utf8').replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const all = [{ n: 1, name: 'Kiln Meadow', art: inner('chapter-1-kiln-meadow.svg'), bg: inner('chapter-1-background.svg'), NODES: JSON.parse(readFileSync(OUT + 'chapter-1-nodes.json', 'utf8')).levels.map((l) => [l.x, l.y]) }];
for (const c of CHAPTERS) {
  const { art, NODES } = buildMap(c), bg = buildBg(c);
  writeFileSync(OUT + `chapter-${c.n}-${c.id}.svg`, `${open(MAP_H)}<!-- Glazeway chapter ${c.n} map art (levels ${c.n * 20 - 19} to ${c.n * 20}). Scenery only: level tiles are drawn by the game. -->${art}</svg>\n`);
  writeFileSync(OUT + `chapter-${c.n}-nodes.json`, JSON.stringify({ width: W, height: MAP_H, levels: NODES.map((p, i) => ({ level: c.n * 20 - 19 + i, x: f(p[0]), y: f(p[1]) })) }, null, 2) + '\n');
  writeFileSync(OUT + `chapter-${c.n}-background.svg`, `${open(BG_H)}<!-- Glazeway chapter ${c.n} game-screen background. The middle is left plain for the board. -->${bg}</svg>\n`);
  all.push({ n: c.n, name: c.name, art, bg, NODES, locked: c.locked });
  console.log(`chapter ${c.n} ${c.name}: ok`);
}

const HEAD = (title) => `<!doctype html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>
  /* Overview of all ten chapters. Open straight from disk. Not game code. */
  @font-face { font-family: 'Baloo 2'; src: url('../../public/fonts/baloo2.woff2') format('woff2'); font-weight: 400 800; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 28px 32px 36px; background: #ecebe7; color: #26262a; font-family: 'Baloo 2', 'Trebuchet MS', sans-serif; width: max-content; }
  h1 { margin: 0; font-size: 34px; font-weight: 800; }
  .lede { margin: 2px 0 22px; font-size: 19px; font-weight: 500; color: #5c5c63; }
  .row { display: flex; gap: 26px; align-items: flex-start; }
  h2 { margin: 0 0 8px; font-size: 26px; font-weight: 800; line-height: 1; } h2 small { font-size: 16px; color: #6a6a72; font-weight: 700; margin-left: 8px; }
  .full { width: 375px; border-radius: 16px; overflow: hidden; outline: 2px solid rgba(0,0,0,0.2); } .full svg { display: block; }
  .phone { position: relative; width: 375px; height: 812px; overflow: hidden; border-radius: 26px; outline: 2px solid rgba(0,0,0,0.2); color: #eef2f7; }
  .phone > svg { position: absolute; left: 0; top: 0; }
  .phone canvas { position: absolute; left: 0; top: 150px; width: 375px; height: 350px; }
  .chip { position: absolute; display: flex; align-items: center; justify-content: center; background: #39435a; border: 3px solid #1e2432; box-shadow: 0 6px 0 #1e2432; font-weight: 800; }
  .chip svg { display: block; fill: none; stroke: currentColor; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
  .back { left: 16px; top: 16px; width: 46px; height: 46px; border-radius: 13px; }
  .level { left: 104px; top: 20px; width: 108px; height: 40px; border-radius: 20px; gap: 9px; font-size: 21px; } .level small { font-size: 10px; letter-spacing: 0.16em; color: #a3adbb; font-weight: 700; }
  .coins { left: 251px; top: 20px; width: 108px; height: 40px; border-radius: 20px; gap: 9px; font-size: 21px; }
  .coin { width: 21px; height: 21px; border-radius: 50%; background: #f2b632; border: 3px solid #b97a12; box-shadow: inset 0 -3px 0 #d9951c; }
  .moves { position: absolute; left: 121px; top: 75px; width: 133px; height: 31px; border-radius: 16px; display: flex; align-items: center; justify-content: center; background: #1e2432; color: #a3adbb; font-weight: 700; font-size: 14px; }
  .btn { top: 547px; width: 86px; height: 54px; border-radius: 16px; } .undo { left: 18px; } .restart { left: 271px; }
  .hint { left: 121px; top: 538px; width: 133px; height: 68px; border-radius: 34px; background: #e8a33d; border-color: #a86f18; color: #2a2110; box-shadow: 0 8px 0 #a86f18; }
  .label { position: absolute; top: 616px; height: 22px; padding: 0 10px; border-radius: 11px; background: #39435a; border: 2px solid #1e2432; font-weight: 700; font-size: 12.500px; line-height: 18px; transform: translateX(-50%); }
</style>
</head>
<body>`;
writeFileSync(OUT + 'all-maps.html', `${HEAD('Glazeway: all ten chapter maps')}
<h1>The Glazeway: all ten chapter maps</h1>
<p class="lede">Each map is 375 by ${MAP_H} and holds 20 levels. All are shown with the same demo progress (11 cleared, the 12th next) so every tile state is visible.</p>
<div class="row">${all.map((c) => `<div class="col"><h2>${c.n}. ${c.name}<small>${c.n * 20 - 19} to ${c.n * 20}</small></h2><div class="full">${open(MAP_H)}${c.art}${nodesSvg(c.NODES, c.n * 20 - 19, c.locked)}</svg></div></div>`).join('')}</div>
<script>
// Add ?from=4&count=3 to the address to show only some chapters (used for close-up checks).
const q = new URLSearchParams(location.search), from = Number(q.get('from') || 1), count = Number(q.get('count') || 10);
document.querySelectorAll('.col').forEach((el, i) => { if (i + 1 < from || i + 1 >= from + count) el.style.display = 'none'; });
</script>
</body>
</html>
`);

const themesPage = readFileSync(OUT + '../themes/preview.html', 'utf8').replace(/\r\n/g, '\n');
const renderer = themesPage.slice(themesPage.indexOf('const TILES = ['), themesPage.indexOf('/* ---- page ---- */'));
const IC = {
  back: '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
  undo: '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3"/></svg>',
  hint: '<svg width="30" height="30" viewBox="0 0 24 24"><path d="M9 17h6M10 21h4M12 3a6 6 0 0 0-3.500 10.900c.6.5 1 1.200 1 2V17h5v-1.100c0-.8.4-1.500 1-2A6 6 0 0 0 12 3z"/></svg>',
  restart: '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.300-5.700M20 4v5h-5"/></svg>',
};
const phone = (c) => `<div><h2>${c.n}. ${c.name}</h2><div class="phone">${open(BG_H)}${c.bg}</svg>
  <div class="chip back">${IC.back}</div><div class="chip level"><small>LEVEL</small>${c.n * 20 - 8}</div><div class="chip coins"><span class="coin"></span>640</div><div class="moves">3 moves · par 6</div><canvas></canvas>
  <div class="chip btn undo">${IC.undo}</div><div class="chip hint">${IC.hint}</div><div class="chip btn restart">${IC.restart}</div>
  <div class="label" style="left:61px">Undo</div><div class="label" style="left:187.500px">Hint</div><div class="label" style="left:314px">Restart</div></div></div>`;
writeFileSync(OUT + 'all-backgrounds.html', `${HEAD('Glazeway: all ten game-screen backgrounds')}
<h1>The Glazeway: all ten game-screen backgrounds</h1>
<p class="lede">Each chapter's background behind the board, shown with the default Slate theme. The board, tiles and buttons follow whichever theme the player has picked.</p>
<div class="row" style="margin-bottom:34px">${all.slice(0, 5).map(phone).join('')}</div>
<div class="row">${all.slice(5).map(phone).join('')}</div>
<script>
const SLATE = { id: 'slate', tray: '#515f73', trayEdge: '#2b3342', trayLip: '#71819a', floor: '#252c3b', channel: '#12151f', crate: '#77839a' };
${renderer}
for (const canvas of document.querySelectorAll('canvas')) {
  const dpr = 2; canvas.width = 375 * dpr; canvas.height = 350 * dpr;
  const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawTray(ctx, LEVEL, VP, SLATE); drawFloor(ctx, LEVEL, VP, SLATE); drawGates(ctx, LEVEL, VP, SLATE);
  for (const block of LEVEL.blocks) drawBlock(ctx, block, VP, SLATE);
}
</script>
</body>
</html>
`);
console.log('overviews ok');
