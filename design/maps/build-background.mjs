// Draws the chapter 1 game-screen background ("Kiln Meadow") and a preview of it behind the board.
// Run: node design/maps/build-background.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { TILES, rnd, f, tree, bush, rock, flower, tuft, kiln, pot, tileStack, cloud, cottage } from './kit.mjs';

const OUT = new URL('./', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const W = 375, H = 812;

/* The board sits roughly at y 160 to 495 and the buttons at y 540 to 640, so the
   scenery lives in two places only: a far horizon peeking between the header and
   the board, and a foreground along the bottom. The middle stays plain meadow. */
function hill(yTop, amp, wave, phase, fill) {
  let d = `M-10 ${H + 10} L-10 ${yTop}`; for (let x = -10; x <= W + 10; x += 12) d += ` L${x} ${f(yTop + amp * Math.sin(x / wave + phase))}`;
  return `<path d="${d} L${W + 10} ${H + 10} Z" fill="${fill}"/>`;
}
let art = `<rect width="${W}" height="${H}" fill="#bfeaf8"/><circle cx="316" cy="118" r="26" fill="#ffe9a3"/><circle cx="316" cy="118" r="18" fill="#ffd556"/>`
  + cloud(52, 92, 0.6) + cloud(196, 112, 0.5)
  + hill(128, 9, 60, 1.2, '#a9dcc0') + hill(140, 8, 44, 0.2, '#93d6a0');
// Far horizon: a tiny village, small because it is a long way off.
art += tree(26, 158, 0.42, '#3fae5a') + kiln(70, 158, 0.42) + tree(112, 156, 0.36, '#2f9d63') + cottage(250, 158, 0.42, TILES[5]) + tree(292, 158, 0.4, '#58bf52') + cottage(340, 160, 0.38, TILES[1]);
art += hill(156, 6, 70, 0, '#a4e07a') + hill(330, 7, 90, 2, '#a0de76') + hill(520, 7, 80, 1, '#a4e07a') + hill(668, 9, 62, 2.4, '#98d96e') + hill(742, 8, 70, 0.6, '#a6e17c');

// A road leaving the bottom of the screen, as on the map.
const road = 'M96 836 C132 742 244 778 400 706';
art += `<path d="${road}" fill="none" stroke="#c79f62" stroke-width="46" stroke-linecap="round" transform="translate(0 5)"/><path d="${road}" fill="none" stroke="#f1d9a7" stroke-width="44" stroke-linecap="round"/>`
  + `<path d="${road}" fill="none" stroke="#e2c287" stroke-width="26" stroke-dasharray="16 7" transform="translate(0 2)"/><path d="${road}" fill="none" stroke="#fff3d2" stroke-width="26" stroke-dasharray="16 7"/>`;

// Flowers and tufts: down the two side margins and across the foreground, never behind the board.
let scatter = '';
for (let i = 0, placed = 0; i < 1200 && placed < 60; i++) {
  const x = 6 + rnd() * (W - 12), y = 172 + rnd() * (H - 180);
  const behindBoard = x > 22 && x < 353 && y < 664;
  const onRoad = y > 690 && Math.abs(y - (800 - (x - 96) * 0.31)) < 38;
  if (behindBoard || onRoad) continue;
  scatter += rnd() < 0.6 ? flower(x, y, ['#ffffff', '#ffd1e6', '#fff2a8', '#ffb8a1', '#d8c9ff'][placed % 5], 0.9 + rnd() * 0.4) : tuft(x, y); placed++;
}
// Foreground, back to front.
const fg = [
  [700, tree(14, 700, 0.72, '#2f9d63')], [694, tree(360, 694, 0.7, '#58bf52')],
  [742, kiln(58, 742, 0.86)], [730, cottage(322, 730, 0.9, TILES[4])],
  [766, pot(112, 762, 1, TILES[1]) + pot(134, 770, 0.9, TILES[5])], [800, tileStack(30, 806, 1)],
  [796, bush(262, 800, 0.9)], [804, pot(300, 804, 1, TILES[2]) + pot(322, 808, 0.85, TILES[0])], [806, rock(358, 806, 0.8)],
].sort((a, b) => a[0] - b[0]).map((i) => i[1]).join('');
art += scatter + fg;

const svgOpen = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`;
writeFileSync(OUT + 'chapter-1-background.svg', `${svgOpen}<!-- Glazeway chapter 1 game-screen background. The middle is left plain for the board. -->${art}</svg>\n`);

/* ---- preview: the real board renderer (the port in design/themes/preview.html) on top of the background ---- */
const themesPage = readFileSync(OUT + '../themes/preview.html', 'utf8').replace(/\r\n/g, '\n');
const between = (a, b) => themesPage.slice(themesPage.indexOf(a), themesPage.indexOf(b));
const renderer = between('const TILES = [', '/* ---- page ---- */');
const shipped = JSON.parse(between('const THEMES = ', '\nconst TILES').slice('const THEMES = '.length).replace(/;\s*$/, ''));
const slate = { id: 'slate', name: 'Slate', dark: true, backdrop: '#20263a', backdropLift: '#2f3852', tray: '#515f73', trayEdge: '#2b3342', trayLip: '#71819a', floor: '#252c3b', channel: '#12151f', rim: '#aab6c8', crate: '#77839a', surface: '#39435a', surfaceEdge: '#1e2432', line: '#4d5a72', text: '#eef2f7', muted: '#a3adbb', accent: '#e8a33d', accentEdge: '#a86f18', accentInk: '#2a2110' };
const themes = [slate, shipped.find((t) => t.id === 'citrus'), shipped.find((t) => t.id === 'bubblegum')];

writeFileSync(OUT + 'background-preview.html', `<!doctype html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<title>Glazeway: chapter 1 game background</title>
<style>
  /* Preview of the chapter 1 background behind the board. Open straight from disk. Not game code. */
  @font-face { font-family: 'Baloo 2'; src: url('../../public/fonts/baloo2.woff2') format('woff2'); font-weight: 400 800; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 28px 32px 36px; background: #ecebe7; color: #26262a; font-family: 'Baloo 2', 'Trebuchet MS', sans-serif; width: max-content; }
  h1 { margin: 0; font-size: 26px; font-weight: 800; }
  .lede { margin: 2px 0 22px; font-size: 15px; font-weight: 500; color: #5c5c63; max-width: 1180px; }
  .row { display: flex; gap: 30px; align-items: flex-start; }
  .cap { font-size: 13px; font-weight: 700; color: #6a6a72; margin-top: 8px; width: 375px; }
  .phone { position: relative; width: 375px; height: 812px; overflow: hidden; border-radius: 26px; outline: 2px solid rgba(0,0,0,0.2); color: var(--text); }
  .phone > svg.bg { position: absolute; left: 0; top: 0; }
  .phone canvas { position: absolute; left: 0; top: 150px; width: 375px; height: 350px; }
  .chip { position: absolute; display: flex; align-items: center; justify-content: center; background: var(--surface); border: 3px solid var(--surface-edge); box-shadow: 0 6px 0 var(--surface-edge); font-weight: 800; }
  .chip svg { display: block; fill: none; stroke: currentColor; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
  .back { left: 16px; top: 16px; width: 46px; height: 46px; border-radius: 13px; }
  .level { left: 108px; top: 20px; width: 100px; height: 40px; border-radius: 20px; gap: 9px; font-size: 21px; }
  .level small { font-size: 10px; letter-spacing: 0.16em; color: var(--muted); font-weight: 700; }
  .coins { left: 251px; top: 20px; width: 108px; height: 40px; border-radius: 20px; gap: 9px; font-size: 21px; }
  .coin { width: 21px; height: 21px; border-radius: 50%; background: #f2b632; border: 3px solid #b97a12; box-shadow: inset 0 -3px 0 #d9951c; }
  .moves { position: absolute; left: 121px; top: 75px; width: 133px; height: 31px; border-radius: 16px; display: flex; align-items: center; justify-content: center; background: var(--surface-edge); color: var(--on-edge); font-weight: 700; font-size: 14px; }
  .btn { top: 547px; width: 86px; height: 54px; border-radius: 16px; } .undo { left: 18px; } .restart { left: 271px; }
  .hint { left: 121px; top: 538px; width: 133px; height: 68px; border-radius: 34px; background: var(--accent); border-color: var(--accent-edge); color: var(--accent-ink); box-shadow: 0 8px 0 var(--accent-edge); }
  /* Labels now sit on their own small plates, because they can no longer rely on a plain backdrop. */
  .label { position: absolute; top: 616px; height: 22px; padding: 0 10px; border-radius: 11px; background: var(--surface); border: 2px solid var(--surface-edge); font-weight: 700; font-size: 12.500px; line-height: 18px; color: var(--text); transform: translateX(-50%); }
  .full { width: 375px; border-radius: 26px; overflow: hidden; outline: 2px solid rgba(0,0,0,0.2); } .full svg { display: block; }
</style>
</head>
<body>
<h1>Chapter 1 game screen: Kiln Meadow behind the board</h1>
<p class="lede">The background belongs to the chapter and never changes. The board, tiles and buttons belong to the theme the player has picked. Three themes are shown on the same background, then the background by itself.</p>
<div class="row" id="row"></div>
<template id="bg">${svgOpen.replace('<svg ', '<svg class="bg" ')}${art}</svg></template>
<script>
const THEMES = ${JSON.stringify(themes)};
${renderer}
const ICON = {
  back: '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
  undo: '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3"/></svg>',
  hint: '<svg width="30" height="30" viewBox="0 0 24 24"><path d="M9 17h6M10 21h4M12 3a6 6 0 0 0-3.500 10.900c.6.5 1 1.200 1 2V17h5v-1.100c0-.8.4-1.500 1-2A6 6 0 0 0 12 3z"/></svg>',
  restart: '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.300-5.700M20 4v5h-5"/></svg>',
};
const lum = (hex) => { const [r, g, b] = channels(hex).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const bg = document.getElementById('bg').innerHTML, row = document.getElementById('row');
for (const t of THEMES) {
  const col = document.createElement('div');
  col.innerHTML = \`<div class="phone" style="--surface:\${t.surface};--surface-edge:\${t.surfaceEdge};--text:\${t.text};--muted:\${t.muted};--accent:\${t.accent};--accent-edge:\${t.accentEdge};--accent-ink:\${t.accentInk};--on-edge:\${lum(t.surfaceEdge) > 0.3 ? t.text : t.muted}">
    \${bg}
    <div class="chip back">\${ICON.back}</div><div class="chip level"><small>LEVEL</small>12</div><div class="chip coins"><span class="coin"></span>640</div>
    <div class="moves">3 moves · par 6</div><canvas></canvas>
    <div class="chip btn undo">\${ICON.undo}</div><div class="chip hint">\${ICON.hint}</div><div class="chip btn restart">\${ICON.restart}</div>
    <div class="label" style="left:61px">Undo</div><div class="label" style="left:187.500px">Hint</div><div class="label" style="left:314px">Restart</div>
  </div><div class="cap">\${t.name} theme on the Kiln Meadow background.</div>\`;
  row.append(col);
  const canvas = col.querySelector('canvas'), dpr = 2; canvas.width = 375 * dpr; canvas.height = 350 * dpr;
  const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawTray(ctx, LEVEL, VP, t); drawFloor(ctx, LEVEL, VP, t); drawGates(ctx, LEVEL, VP, t);
  for (const block of LEVEL.blocks) drawBlock(ctx, block, VP, t);
}
const last = document.createElement('div');
last.innerHTML = '<div class="full">' + bg + '</div><div class="cap">The background by itself. The plain middle is where the board goes.</div>';
row.append(last);
</script>
</body>
</html>
`);
console.log('background ok');
