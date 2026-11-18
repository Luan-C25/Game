/**
 * Captures Play Store screenshots from the real game running on a phone.
 *
 * The phone's own screen is 1080x2340, taller than Play's 2:1 limit, so the
 * WebView is told to lay out at 360x640 CSS pixels (9:16) and the first
 * screencast frame is saved. On the Galaxy used for 1.1.0 that frame is
 * 886x1574, which Play accepts. Nothing on the phone is changed: the override
 * is cleared before the script exits.
 *
 * Needs a debug build running on a phone plugged in over USB:
 *   adb forward tcp:9223 localabstract:webview_devtools_remote_<pid>
 *   node scripts/phone-screenshots.mjs <name> "<js to run first>"
 *
 * Writes store/screenshot-<name>.png. The script runs against the live
 * game, so the screenshot shows real progress, real coins and real art.
 */

import { writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const [name, setup = ''] = process.argv.slice(2);
if (!name) {
  console.error('usage: node scripts/phone-screenshots.mjs <name> "<js to run first>"');
  process.exit(1);
}

const store = join(dirname(fileURLToPath(import.meta.url)), '..', 'store');
const pages = await (await fetch('http://localhost:9223/json')).json();
const page = pages.find((p) => p.type === 'page') ?? pages[0];
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve) => ws.addEventListener('open', resolve));

let nextId = 1;
const pending = new Map();
ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data);
  const done = pending.get(msg.id);
  if (!done) return;
  pending.delete(msg.id);
  if (msg.error) done.reject(new Error(msg.error.message));
  else done.resolve(msg.result);
});
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

await send('Emulation.setDeviceMetricsOverride', { width: 360, height: 640, deviceScaleFactor: 3, mobile: true });
// Let the layout settle at the new size before the scene is set up.
await send('Runtime.evaluate', { expression: 'dispatchEvent(new Event("resize"))' });
await wait(600);
if (setup) {
  const result = await send('Runtime.evaluate', { expression: setup, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? 'setup failed');
}
await wait(1200);

// Page.captureScreenshot hangs on Android WebView when nothing is moving, so
// take the first screencast frame instead, nudging one repaint to produce it.
const frame = new Promise((resolve) => {
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method === 'Page.screencastFrame') resolve(msg.params);
  });
});
await send('Page.enable');
await send('Page.startScreencast', { format: 'png', maxWidth: 1080, maxHeight: 1920, everyNthFrame: 1 });
await send('Runtime.evaluate', {
  expression: 'document.body.style.opacity = "0.999"; setTimeout(() => (document.body.style.opacity = ""), 200)',
});
const shot = await frame;
await send('Page.stopScreencast');
const file = join(store, `screenshot-${name}.png`);
await writeFile(file, Buffer.from(shot.data, 'base64'));
await send('Emulation.clearDeviceMetricsOverride');
await send('Runtime.evaluate', { expression: 'dispatchEvent(new Event("resize"))' });
console.log(`wrote store/screenshot-${name}.png`);
ws.close();
process.exit(0);
