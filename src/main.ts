/**
 * App shell: screens, wiring, and the game loop.
 *
 * The design rules this enforces come straight from what players complain
 * about in the games it answers - so there is no timer, no life, no fail
 * state, no cost attached to undo, hints or restarts, and no ad on the win
 * screen. See src/game/ads.ts for the advertising contract.
 */

import './styles.css';

import { DragController } from './game/input.ts';
import { LEVEL_COUNT, getLevel } from './game/levels.ts';
import { Session } from './game/session.ts';
import { computeViewport, render, type Viewport } from './game/render.ts';
import { THEMES, themeById } from './game/theme.ts';
import { AD_PROMISES, mayShowInterstitial, noopAdProvider } from './game/ads.ts';
import { isMusicEnabled, setMusicEnabled, setSoundEnabled, sfx, unlockAudio } from './game/audio.ts';
import * as store from './game/save.ts';

type ScreenId = 'home' | 'levels' | 'game' | 'themes' | 'settings' | 'promises';

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing element #${id}`);
  return el as T;
};

let saveData = store.load();
let session: Session | null = null;
let currentLevelId = 1;
let viewport: Viewport = { cell: 40, originX: 0, originY: 0, wall: 12 };
let dirty = true;
let hintedBlocks: number[] = [];
let screenStack: ScreenId[] = ['home'];

const canvas = $<HTMLCanvasElement>('board');
const ctx = canvas.getContext('2d');
if (!ctx) throw new Error('canvas 2d context unavailable');

/* ------------------------------------------------------------------ utils */

function persist(): void {
  store.save(saveData);
}

function toast(message: string, ms = 2200): void {
  const el = $('toast');
  el.textContent = message;
  el.hidden = false;
  window.clearTimeout((el as unknown as { _t?: number })._t);
  (el as unknown as { _t?: number })._t = window.setTimeout(() => {
    el.hidden = true;
  }, ms);
}

function buzz(pattern: number | number[]): void {
  if (!saveData.settings.haptics) return;
  navigator.vibrate?.(pattern);
}

function applyTheme(): void {
  document.documentElement.dataset.theme = saveData.settings.theme;
  const theme = themeById(saveData.settings.theme);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.background);
  dirty = true;
}

function showScreen(id: ScreenId, { push = true } = {}): void {
  for (const name of ['home', 'levels', 'game', 'themes', 'settings', 'promises'] as ScreenId[]) {
    $(`screen-${name}`).hidden = name !== id;
  }
  if (push && screenStack[screenStack.length - 1] !== id) screenStack.push(id);
  if (id === 'levels') renderLevelGrid();
  if (id === 'themes') renderThemes();
  if (id === 'home') renderHome();
  if (id === 'game') resizeCanvas();
}

function goBack(): void {
  screenStack.pop();
  const previous = screenStack[screenStack.length - 1] ?? 'home';
  showScreen(previous, { push: false });
}

function confirmAction(title: string, body: string, onYes: () => void): void {
  $('confirm-title').textContent = title;
  $('confirm-body').textContent = body;
  $('overlay-confirm').hidden = false;
  const yes = $<HTMLButtonElement>('confirm-yes');
  const no = $<HTMLButtonElement>('confirm-no');
  const close = (): void => {
    $('overlay-confirm').hidden = true;
    yes.removeEventListener('click', accept);
    no.removeEventListener('click', close);
  };
  const accept = (): void => {
    close();
    onYes();
  };
  yes.addEventListener('click', accept);
  no.addEventListener('click', close);
}

/* ------------------------------------------------------------------ screens */

function renderHome(): void {
  const cleared = Object.keys(saveData.bestMoves).length;
  $('home-progress').textContent =
    cleared === 0
      ? `${LEVEL_COUNT} hand-verified levels. No timers, no lives.`
      : `${cleared} of ${LEVEL_COUNT} levels cleared · ${saveData.coins} coins`;
  $<HTMLButtonElement>('btn-continue').textContent =
    saveData.highestUnlocked > 1 ? `Continue · level ${saveData.highestUnlocked}` : 'Play';
}

function renderLevelGrid(): void {
  const grid = $('level-grid');
  grid.textContent = '';
  $('levels-coins').textContent = `${saveData.coins} coins`;

  for (let id = 1; id <= LEVEL_COUNT; id++) {
    const button = document.createElement('button');
    button.className = 'level-cell';
    const unlocked = id <= saveData.highestUnlocked;
    button.disabled = !unlocked;

    const number = document.createElement('span');
    number.textContent = String(id);
    button.append(number);

    const best = saveData.bestMoves[id];
    if (best !== undefined) {
      const level = getLevel(id);
      const stars = level ? starsFor(best, level.minMoves) : 1;
      const label = document.createElement('small');
      label.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
      button.append(label);
    }

    if (unlocked) button.addEventListener('click', () => startLevel(id));
    grid.append(button);
  }
}

function renderThemes(): void {
  const list = $('theme-list');
  list.textContent = '';
  $('themes-coins').textContent = `${saveData.coins} coins`;

  for (const theme of THEMES) {
    const row = document.createElement('div');
    row.className = 'theme-row';

    const left = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = theme.name;
    const swatches = document.createElement('div');
    swatches.className = 'swatches';
    for (const colour of [theme.background, theme.boardWall, theme.boardFloor]) {
      const dot = document.createElement('span');
      dot.className = 'swatch';
      dot.style.background = colour;
      swatches.append(dot);
    }
    left.append(name, swatches);

    const action = document.createElement('button');
    action.className = 'btn';
    const owned = saveData.unlockedThemes.includes(theme.id);
    const active = saveData.settings.theme === theme.id;

    if (active) {
      action.textContent = 'In use';
      action.disabled = true;
    } else if (owned) {
      action.textContent = 'Use';
      action.addEventListener('click', () => {
        saveData.settings.theme = theme.id;
        persist();
        applyTheme();
        renderThemes();
      });
    } else {
      // The price is stated plainly on the button that spends it - a
      // confusing "75 coins" button that actually charges you is a documented
      // complaint about the game this answers.
      action.textContent = `Buy for ${theme.price} coins`;
      action.disabled = saveData.coins < theme.price;
      action.addEventListener('click', () => {
        if (saveData.coins < theme.price) return;
        saveData.coins -= theme.price;
        saveData.unlockedThemes.push(theme.id);
        saveData.settings.theme = theme.id;
        persist();
        applyTheme();
        renderThemes();
        toast(`${theme.name} unlocked`);
      });
    }

    row.append(left, action);
    list.append(row);
  }
}

function renderPromises(): void {
  const list = $('promise-list');
  list.textContent = '';
  for (const promise of AD_PROMISES) {
    const item = document.createElement('li');
    item.textContent = promise;
    list.append(item);
  }
}

/* --------------------------------------------------------------------- game */

function starsFor(moves: number, par: number): number {
  if (moves <= par) return 3;
  if (moves <= par + Math.max(2, Math.ceil(par * 0.4))) return 2;
  return 1;
}

function resizeCanvas(): void {
  const wrap = canvas.parentElement;
  if (!wrap || !session) return;
  const rect = wrap.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
  ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

  viewport = computeViewport(session.level, rect.width, rect.height);
  dirty = true;
}

function updateHud(): void {
  if (!session) return;
  $('game-level').textContent = `Level ${currentLevelId}`;
  $('game-moves').textContent =
    `${session.moves} ${session.moves === 1 ? 'move' : 'moves'} · par ${session.par}`;
  $('game-coins').textContent = `${saveData.coins} coins`;
  $<HTMLButtonElement>('btn-undo').disabled = !session.canUndo();
}

function frame(): void {
  if (dirty && session && !$('screen-game').hidden) {
    render(ctx!, session.level, viewport, {
      theme: themeById(saveData.settings.theme),
      glyphs: saveData.settings.colourBlindGlyphs,
      drag: drag.visual,
      highlight: hintedBlocks,
    });
    dirty = false;
  }
  requestAnimationFrame(frame);
}

const drag = new DragController(
  canvas,
  () => session!,
  () => viewport,
  {
    onChange: () => {
      dirty = true;
      updateHud();
    },
    onPickUp: () => {
      hintedBlocks = [];
      sfx.pick();
    },
    onBlocked: () => sfx.blocked(),
    onBlockExited: () => {
      sfx.exit();
      buzz(18);
      window.setTimeout(checkComplete, 0);
    },
  },
);

function checkComplete(): void {
  if (!session || !session.isComplete()) return;

  const stars = session.stars();
  const moves = session.moves;
  const previousBest = saveData.bestMoves[currentLevelId];
  const firstClear = previousBest === undefined;

  if (firstClear || moves < previousBest) saveData.bestMoves[currentLevelId] = moves;
  if (currentLevelId >= saveData.highestUnlocked && currentLevelId < LEVEL_COUNT) {
    saveData.highestUnlocked = currentLevelId + 1;
  }

  let reward = 0;
  if (firstClear) {
    reward = 10 + stars * 5;
    saveData.coins += reward;
  }
  saveData.levelsSinceLastAd++;
  persist();

  sfx.win();
  buzz([12, 40, 18]);

  $('win-title').textContent = currentLevelId >= LEVEL_COUNT ? 'Final level complete' : 'Level complete';
  $('win-stars').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
  $('win-detail').textContent =
    moves <= session.par
      ? `Solved in ${moves} moves — that matches par.`
      : `Solved in ${moves} moves. Par is ${session.par}.`;
  $('win-reward').textContent = firstClear ? `+${reward} coins` : 'Already cleared — no new coins.';

  const next = $<HTMLButtonElement>('btn-next');
  next.hidden = currentLevelId >= LEVEL_COUNT;
  $('overlay-win').hidden = false;
  // Deliberately no ad here. See AD_POLICY.neverAfterWin.
}

function startLevel(id: number): void {
  const level = getLevel(id);
  if (!level) {
    toast('That level is not in this pack yet.');
    return;
  }
  currentLevelId = id;
  session = new Session(level);
  hintedBlocks = [];
  drag.cancel();
  $('overlay-win').hidden = true;
  showScreen('game');
  updateHud();
  resizeCanvas();
}

function leaveLevel(): void {
  const now = Date.now();
  const shouldAd = mayShowInterstitial(
    {
      adsRemoved: saveData.adsRemoved,
      levelsSinceLastAd: saveData.levelsSinceLastAd,
      lastAdAtMs: saveData.lastAdAtMs,
    },
    'returning-to-menu',
    currentLevelId,
    now,
  );

  if (shouldAd) {
    saveData.levelsSinceLastAd = 0;
    saveData.lastAdAtMs = now;
    persist();
    void noopAdProvider.showInterstitial();
  }

  session = null;
  drag.cancel();
  $('overlay-win').hidden = true;
  screenStack = ['home'];
  showScreen('home', { push: false });
}

function showHint(): void {
  if (!session) return;
  const outcome = session.hint();

  if (outcome.kind === 'already-solved') return;

  if (outcome.kind === 'unavailable') {
    // Never a dead end: the player is offered a way back to solid ground
    // rather than being told to buy something.
    toast('That position is a tough one to read. Undo a move and try again.');
    return;
  }

  hintedBlocks = [outcome.move.blockId];
  dirty = true;
  const arrows = { up: 'up', down: 'down', left: 'left', right: 'right' } as const;
  toast(`Try sliding the highlighted block ${arrows[outcome.move.dir]}.`);
  sfx.tap();
}

/* ------------------------------------------------------------------ wiring */

function bindSettings(): void {
  const bind = (id: string, key: keyof store.Settings, onChange?: (value: boolean) => void): void => {
    const input = $<HTMLInputElement>(id);
    input.checked = saveData.settings[key] as boolean;
    input.addEventListener('change', () => {
      (saveData.settings[key] as boolean) = input.checked;
      persist();
      onChange?.(input.checked);
      dirty = true;
    });
  };

  bind('set-sound', 'sound', setSoundEnabled);
  bind('set-music', 'music', setMusicEnabled);
  bind('set-haptics', 'haptics');
  bind('set-glyphs', 'colourBlindGlyphs');
  bind('set-motion', 'reduceMotion');

  $('btn-remove-ads').addEventListener('click', () => {
    toast('Remove Ads is a store purchase, available in the Android build.');
  });

  $('btn-restore').addEventListener('click', () => {
    // On the web build there is nothing to restore; the native build asks the
    // store. Either way a purchase is never lost silently.
    toast(saveData.adsRemoved ? 'Remove Ads is already active.' : 'No purchases found on this device.');
  });

  $('btn-reset').addEventListener('click', () => {
    confirmAction('Reset progress?', 'This clears every level, star and coin on this device. It cannot be undone.', () => {
      saveData = store.defaultSave();
      persist();
      applyTheme();
      renderHome();
      toast('Progress reset.');
    });
  });
}

function bindNavigation(): void {
  $('btn-continue').addEventListener('click', () => startLevel(saveData.highestUnlocked));
  $('btn-levels').addEventListener('click', () => showScreen('levels'));
  $('btn-themes').addEventListener('click', () => showScreen('themes'));
  $('btn-settings').addEventListener('click', () => showScreen('settings'));
  $('btn-promises').addEventListener('click', () => showScreen('promises'));

  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-back]')) {
    button.addEventListener('click', goBack);
  }

  $('btn-game-back').addEventListener('click', leaveLevel);
  $('btn-undo').addEventListener('click', () => {
    if (session?.undo()) {
      hintedBlocks = [];
      dirty = true;
      updateHud();
      sfx.tap();
    }
  });
  $('btn-hint').addEventListener('click', showHint);
  $('btn-restart').addEventListener('click', () => {
    if (!session) return;
    session.restart();
    hintedBlocks = [];
    dirty = true;
    updateHud();
  });

  $('btn-next').addEventListener('click', () => {
    $('overlay-win').hidden = true;
    startLevel(Math.min(currentLevelId + 1, LEVEL_COUNT));
  });
  $('btn-replay').addEventListener('click', () => {
    $('overlay-win').hidden = true;
    startLevel(currentLevelId);
  });
  $('btn-win-menu').addEventListener('click', leaveLevel);
}

/**
 * Read-only view of the live board, used by the end-to-end test to drive a
 * real solution through real drag gestures. It exposes nothing that cannot
 * already be seen on screen and offers no way to change the game state.
 */
function exposeTestHook(): void {
  Object.defineProperty(window, '__colourJam', {
    value: {
      snapshot: () => ({
        levelId: currentLevelId,
        viewport: { ...viewport },
        moves: session?.moves ?? 0,
        complete: session?.isComplete() ?? false,
        blocks: session?.level.blocks.map((b) => ({
          id: b.id,
          exited: b.exited,
          kind: b.kind,
          pos: { ...b.pos },
          shape: b.shape.map((c) => ({ ...c })),
        })),
      }),
    },
    writable: false,
  });
}

function boot(): void {
  applyTheme();
  setSoundEnabled(saveData.settings.sound);
  if (saveData.settings.music && !isMusicEnabled()) setMusicEnabled(true);

  bindNavigation();
  bindSettings();
  renderPromises();
  renderHome();
  showScreen('home', { push: false });

  drag.attach();
  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('orientationchange', () => window.setTimeout(resizeCanvas, 120));
  document.addEventListener('pointerdown', unlockAudio, { once: true });

  exposeTestHook();
  requestAnimationFrame(frame);
}

boot();
