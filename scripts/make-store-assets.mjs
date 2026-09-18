/**
 * Captures the Play Store listing assets from the real game and the feature
 * graphic source, so every image in store/ can be regenerated rather than
 * hand-edited.
 *
 *   store/feature-graphic.png   1024x500, required by Play
 *   store/screenshot-*.png      1080x1920 phone screenshots
 *
 * Needs Playwright and a built app:
 *   npm run build && npx playwright install chromium
 *   node scripts/make-store-assets.mjs
 *
 * Deliberately a .mjs script outside the TypeScript build: it is a one-off
 * authoring tool, and Playwright should not become a dependency of the game.
 */

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const store = join(root, 'store');

const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
};

/** Serves the repository so both dist/ and store/ resolve with real URLs. */
function serve(port) {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    let path = normalize(join(root, decodeURIComponent(url.pathname)));
    if (!path.startsWith(root)) {
      res.writeHead(403).end();
      return;
    }
    if (existsSync(path) && (await readFile(path).catch(() => null)) === null) path = join(path, 'index.html');
    try {
      const body = await readFile(path);
      res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE ?? '/opt/node22/lib/node_modules/playwright/index.js'
).then((m) => m.default ?? m);

const PORT = 4319;
const server = await serve(PORT);
const base = `http://127.0.0.1:${PORT}`;
const browser = await chromium.launch();

/* --------------------------------------------------------- feature graphic */

const banner = await browser.newPage({ viewport: { width: 1024, height: 500 } });
await banner.goto(`${base}/store/feature-graphic.html`, { waitUntil: 'networkidle' });
await banner.evaluate(() => document.fonts.ready);
await banner.screenshot({ path: join(store, 'feature-graphic.png') });
console.log('wrote store/feature-graphic.png (1024x500)');
await banner.close();

/* ------------------------------------------------------------- screenshots */

// 360x640 at 3x gives Play's standard 1080x1920 phone screenshot.
const page = await browser.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`${base}/dist/index.html`, { waitUntil: 'networkidle' });

const seed = async (save) => {
  await page.evaluate((s) => {
    localStorage.setItem('colourjam.save.v1', JSON.stringify(s));
  }, save);
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
};

const shot = async (name) => {
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(store, `screenshot-${name}.png`) });
  console.log(`wrote store/screenshot-${name}.png (1080x1920)`);
};

const progressed = {
  version: 1,
  highestUnlocked: 64,
  coins: 640,
  bestMoves: { 1: 5, 2: 4, 3: 6, 4: 7, 5: 5, 6: 8, 7: 6, 8: 7 },
  unlockedThemes: ['slate', 'clay', 'ink', 'porcelain'],
  adsRemoved: false,
  levelsSinceLastAd: 0,
  lastAdAtMs: 0,
  settings: { sound: true, music: false, haptics: true, colourBlindGlyphs: false, reduceMotion: false, theme: 'slate' },
};

await seed(progressed);
await shot('1-menu');

const openLevel = async (n) => {
  await page.click('#btn-levels');
  await page.click(`.level-grid .level-cell:nth-child(${n})`);
  await page.waitForSelector('#screen-game:not([hidden])');
};

await openLevel(3);
await shot('2-early-board');

await page.click('#btn-game-back');
await openLevel(48);
await shot('3-later-board');

// The hint is a differentiator, so show it mid-use.
await page.click('#btn-hint');
await shot('4-free-hint');

await page.click('#btn-game-back');
await page.click('#btn-promises');
await shot('5-promises');

await seed({ ...progressed, settings: { ...progressed.settings, theme: 'clay' } });
await openLevel(48);
await shot('6-clay-theme');

console.log(errors.length ? `console errors: ${errors.join('; ')}` : 'no console errors');

await browser.close();
server.close();
