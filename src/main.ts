/**
 * App shell: screens, wiring, and the game loop.
 *
 * The design rules this enforces come straight from what players complain
 * about in the games it answers - so there is no timer, no life, no fail
 * state, no cost attached to undo, hints or restarts, and no ad on the win
 * screen. See src/game/ads.ts for the advertising contract.
 */

import './styles.css';

import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

import { DragController } from './game/input.ts';
import { LEVEL_COUNT, getLevel } from './game/levels.ts';
import { Session } from './game/session.ts';
import {
  blockCentre,
  canvasScale,
  computeViewport,
  invalidateStaticLayer,
  render,
  type Viewport,
} from './game/render.ts';
import { BLOCK_COLOURS, THEMES, themeById } from './game/theme.ts';
import { Particles } from './game/particles.ts';
import { AD_PROMISES, mayShowInterstitial, noopAdProvider, type AdProvider } from './game/ads.ts';
import { admobProvider, adsAvailable, initialiseAds } from './game/ads-native.ts';
import { isMusicEnabled, setMusicEnabled, setSoundEnabled, sfx, unlockAudio } from './game/audio.ts';
import * as store from './game/save.ts';
import { CHAPTERS, CHAPTER_SIZE, backgroundUrl, chapterOf, mapUrl } from './game/chapters.ts';
import { chapterNodesSvg, type NodeInfo } from './game/map-view.ts';
import {
  DAILY_REWARD,
  GIFT_COINS,
  GIFT_DAY7_COINS,
  badgeLabel,
  claimGift,
  clearedToday,
  currentStreak,
  dailyDifficulty,
  dailyLevelId,
  dayNumber,
  dayToDate,
  giftStatus,
  nextBadge,
  recordDailyClear,
} from './game/daily.ts';
import { GOALS, claimable, isDone, type Goal, type GoalStats } from './game/goals.ts';
import {
  CHARACTERS,
  characterById,
  characterMapUrl,
  characterSideUrl,
  nextGiftCharacter,
} from './game/characters.ts';
import { EFFECTS, GLAZES, effectById, glazeById } from './game/cosmetics.ts';
import { generateLevel } from './engine/generator.ts';
import type { Dir, Level } from './engine/types.ts';
import type { Chapter } from './game/chapters.ts';

type ScreenId = 'home' | 'levels' | 'game' | 'themes' | 'settings' | 'promises' | 'daily' | 'goals' | 'shelf';

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing element #${id}`);
  return el as T;
};

let saveData = store.load();
let session: Session | null = null;
let currentLevelId = 1;
let viewport: Viewport = { cell: 40, originX: 0, originY: 0, wall: 12 };
let hintedBlocks: number[] = [];
const particles = new Particles();
/** Seconds of animated time, used by the hint pulse. */
let clock = 0;
let lastFrameMs = 0;
let framePending = false;
let screenStack: ScreenId[] = ['home'];
/** AdMob on a device, a no-op stub on the web build and in tests. */
const ads: AdProvider = adsAvailable() ? admobProvider : noopAdProvider;

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

/**
 * The plugin declares Android's VIBRATE permission, which a bare
 * `navigator.vibrate` silently lacks, and uses the system's own feedback
 * styles. On the web it falls back to `navigator.vibrate` itself.
 */
function buzz(kind: 'exit' | 'win'): void {
  if (!saveData.settings.haptics) return;
  const feedback =
    kind === 'win'
      ? Haptics.notification({ type: NotificationType.Success })
      : Haptics.impact({ style: ImpactStyle.Light });
  // A device without a vibrator is not an error worth surfacing.
  feedback.catch(() => {});
}

/**
 * One theme definition drives both the canvas and the DOM chrome, so a new
 * theme never needs a matching block of CSS written by hand.
 */
function applyTheme(): void {
  const theme = themeById(saveData.settings.theme);
  const root = document.documentElement;
  root.dataset.theme = theme.id;
  root.style.setProperty('--backdrop', theme.backdrop);
  root.style.setProperty('--backdrop-lift', theme.backdropLift);
  root.style.setProperty('--surface', theme.surface);
  root.style.setProperty('--surface-edge', theme.surfaceEdge);
  root.style.setProperty('--line', theme.line);
  root.style.setProperty('--text', theme.text);
  root.style.setProperty('--muted', theme.muted);
  root.style.setProperty('--accent', theme.accent);
  root.style.setProperty('--accent-edge', theme.accentEdge);
  root.style.setProperty('--accent-ink', theme.accentInk);
  root.classList.toggle('still', saveData.settings.reduceMotion);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.backdrop);
}

function showScreen(id: ScreenId, { push = true } = {}): void {
  for (const name of ['home', 'levels', 'game', 'themes', 'settings', 'promises', 'daily', 'goals', 'shelf'] as ScreenId[]) {
    $(`screen-${name}`).hidden = name !== id;
  }
  if (push && screenStack[screenStack.length - 1] !== id) screenStack.push(id);
  if (id === 'levels') renderLevelGrid();
  if (id === 'themes') renderShop();
  if (id === 'shelf') renderShelf();
  if (id === 'daily') renderDaily();
  if (id === 'goals') renderGoals();
  if (id === 'home') {
    renderHome();
    fitTitle();
    maybeShowGift();
  }
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
      ? `${LEVEL_COUNT} solver-checked levels. No timers, no lives.`
      : `${cleared} of ${LEVEL_COUNT} levels cleared · ${saveData.coins} coins`;
  const sub = document.getElementById('home-continue-sub');
  if (sub) sub.textContent = saveData.highestUnlocked > 1 ? `Level ${saveData.highestUnlocked}` : '';
  const day = today();
  const streak = currentStreak(saveData.daily, day);
  $('home-daily-note').textContent = clearedToday(saveData.daily, day)
    ? `${streak}-day streak ✓`
    : streak > 0
      ? `${streak}-day streak`
      : 'New today';
  $('home-goals-dot').hidden = claimable(goalStats(), saveData.goalsClaimed).length === 0;
}

/**
 * Shrinks the wordmark to fit when the phone's text size is turned up:
 * WebView scales CSS text with the system font setting, and one word cannot
 * wrap, so at the largest setting it ran off the screen. The size is set in
 * em because WebView would scale a px size a second time.
 */
function fitTitle(): void {
  const title = document.querySelector<HTMLElement>('.brand h1');
  const word = title?.querySelector('span');
  const box = title?.parentElement;
  if (!title || !word || !box || box.clientWidth === 0) return;

  title.style.fontSize = '';
  // Room for the outline and the slight tilt.
  const room = box.clientWidth - 12;
  const inherited = parseFloat(getComputedStyle(box).fontSize);

  // Glyph widths do not scale exactly with size, so a second pass trims the
  // last few pixels the first one leaves.
  for (let pass = 0; pass < 2 && word.offsetWidth > room; pass++) {
    const own = parseFloat(getComputedStyle(title).fontSize);
    title.style.fontSize = `${((own * room) / word.offsetWidth / inherited).toFixed(3)}em`;
  }
}

/**
 * The level select is one chapter's illustrated map at a time, opened on the
 * chapter holding the next level. Testers found 200 numbered tiles "an
 * endless grid of squares". Chapters are places, not gates: nothing is
 * locked behind one, a level opens when the one before it is cleared.
 */
let shownChapter = 0;

function chapterIndexFor(levelId: number): number {
  return CHAPTERS.indexOf(chapterOf(levelId));
}

function renderLevelGrid(): void {
  $('levels-coins').textContent = `${saveData.coins} coins`;
  shownChapter = chapterIndexFor(Math.min(saveData.highestUnlocked, LEVEL_COUNT));
  renderChapter();
}

function renderChapter(): void {
  const chapter = CHAPTERS[shownChapter];
  const first = (chapter.n - 1) * CHAPTER_SIZE + 1;

  let stars = 0;
  const nodes: NodeInfo[] = chapter.nodes.map((_, i) => {
    const level = first + i;
    const best = saveData.bestMoves[level];
    if (best !== undefined) {
      const data = getLevel(level);
      const earned = data ? starsFor(best, data.minMoves) : 1;
      stars += earned;
      return { level, state: 'done', stars: earned };
    }
    if (level > saveData.highestUnlocked || level > LEVEL_COUNT) return { level, state: 'locked', stars: 0 };
    return { level, state: level === saveData.highestUnlocked ? 'now' : 'open', stars: 0 };
  });

  $('chapter-title').textContent = chapter.name;
  $('chapter-num').textContent = `Chapter ${chapter.n}`;
  $('chapter-stars').textContent = `★ ${stars} / ${CHAPTER_SIZE * 3}`;
  $<HTMLButtonElement>('chapter-prev').disabled = shownChapter === 0;
  $<HTMLButtonElement>('chapter-next').disabled = shownChapter === CHAPTERS.length - 1;

  const art = $<HTMLImageElement>('map-art');
  const url = mapUrl(chapter);
  if (art.getAttribute('src') !== url) art.src = url;

  placeFriends(chapter);

  const svg = $('map-nodes');
  svg.setAttribute('viewBox', `0 0 ${chapter.width} ${chapter.height}`);
  svg.innerHTML = chapterNodesSvg(chapter, nodes);

  const hits = $('map-hits');
  hits.textContent = '';
  let focus: number | null = null;
  nodes.forEach((node, i) => {
    if (node.state === 'locked') return;
    const [x, y] = chapter.nodes[i];
    const hit = document.createElement('button');
    hit.className = 'map-hit';
    hit.style.left = `${(x / chapter.width) * 100}%`;
    hit.style.top = `${(y / chapter.height) * 100}%`;
    hit.setAttribute(
      'aria-label',
      node.state === 'done' ? `Level ${node.level}, ${node.stars} of 3 stars` : `Level ${node.level}`,
    );
    hit.addEventListener('click', () => startLevel(node.level));
    hits.append(hit);
    if (node.state === 'now') focus = y;
  });

  const scroller = $('map-scroll');
  const map = $('map');
  const place = (): void => {
    const scale = map.clientHeight / chapter.height;
    // The road runs bottom to top: with no next level here, show the start
    // of the chapter if it is ahead of the player, the end if it is behind.
    const target =
      focus ?? (first > saveData.highestUnlocked ? chapter.nodes[0][1] : chapter.nodes[CHAPTER_SIZE - 1][1]);
    scroller.scrollTop = target * scale - scroller.clientHeight / 2;
  };
  requestAnimationFrame(place);
}

function stepChapter(delta: number): void {
  const next = shownChapter + delta;
  if (next < 0 || next >= CHAPTERS.length) return;
  shownChapter = next;
  renderChapter();
}

type ShopTab = 'themes' | 'characters' | 'glazes' | 'effects';
let shopTab: ShopTab = 'themes';

const SHOP_LEADS: Record<ShopTab, string> = {
  themes: 'Themes restyle the tray and the light. The tile colours never change, because they carry the rules.',
  characters: 'Friends who live along the chapter roads. Pick one to keep you company beside the board.',
  glazes: 'A finish for every tile. The colours stay exactly the same in every glaze.',
  effects: 'What happens when a block slides out through its gate.',
};

/** One shop row: a picture or swatches on the left, a single action on the right. */
function shopRow(art: HTMLElement | null, title: string, blurb: string, action: HTMLButtonElement): HTMLElement {
  const row = document.createElement('div');
  row.className = 'theme-row';
  const left = document.createElement('div');
  left.className = 'shop-item';
  if (art) left.append(art);
  const text = document.createElement('div');
  const name = document.createElement('strong');
  name.textContent = title;
  text.append(name);
  if (blurb) {
    const small = document.createElement('small');
    small.textContent = blurb;
    text.append(small);
  }
  left.append(text);
  row.append(left, action);
  return row;
}

/**
 * The action button for a cosmetic: in use, use it, or buy it. The price is
 * stated plainly on the button that spends it - a confusing "75 coins"
 * button that actually charges you is a documented complaint about the game
 * this answers.
 */
function shopAction(opts: {
  owned: boolean;
  active: boolean;
  price: number;
  activeLabel?: string;
  onUse: () => void;
  onBuy: () => void;
}): HTMLButtonElement {
  const action = document.createElement('button');
  action.className = 'btn';
  if (opts.active) {
    action.textContent = opts.activeLabel ?? 'In use';
    action.disabled = true;
  } else if (opts.owned) {
    action.textContent = 'Use';
    action.addEventListener('click', opts.onUse);
  } else {
    action.textContent = `Buy for ${opts.price} coins`;
    action.disabled = saveData.coins < opts.price;
    action.addEventListener('click', () => {
      if (saveData.coins < opts.price) return;
      saveData.coins -= opts.price;
      opts.onBuy();
    });
  }
  return action;
}

function renderShop(): void {
  const list = $('theme-list');
  list.textContent = '';
  $('themes-coins').textContent = `${saveData.coins} coins`;
  $('shop-lead').textContent = SHOP_LEADS[shopTab];
  for (const tab of document.querySelectorAll<HTMLButtonElement>('.shop-tab')) {
    const on = tab.dataset.tab === shopTab;
    tab.classList.toggle('on', on);
    tab.setAttribute('aria-selected', String(on));
  }
  const done = (message?: string): void => {
    persist();
    renderShop();
    if (message) toast(message);
  };

  if (shopTab === 'themes') {
    for (const theme of THEMES) {
      const swatches = document.createElement('div');
      swatches.className = 'swatches';
      for (const colour of [theme.backdrop, theme.tray, theme.floor, theme.rim]) {
        const dot = document.createElement('span');
        dot.className = 'swatch';
        dot.style.background = colour;
        swatches.append(dot);
      }
      const use = (): void => {
        saveData.settings.theme = theme.id;
        applyTheme();
      };
      const action = shopAction({
        owned: saveData.unlockedThemes.includes(theme.id),
        active: saveData.settings.theme === theme.id,
        price: theme.price,
        onUse: () => {
          use();
          done();
        },
        onBuy: () => {
          saveData.unlockedThemes.push(theme.id);
          use();
          done(`${theme.name} unlocked`);
        },
      });
      list.append(shopRow(swatches, theme.name, '', action));
    }
    return;
  }

  if (shopTab === 'characters') {
    for (const c of CHARACTERS) {
      const art = document.createElement('img');
      art.className = 'shop-figure';
      art.src = characterSideUrl(c.id);
      art.alt = '';
      const owned = saveData.characters.includes(c.id);
      const active = saveData.settings.companion === c.id;
      let action: HTMLButtonElement;
      if (!owned && c.price === 0) {
        // Gift friends are never sold; they arrive on day 7 of the daily gift.
        action = document.createElement('button');
        action.className = 'btn';
        action.textContent = 'Day 7 gift';
        action.disabled = true;
      } else if (active) {
        // Tapping the companion again sends them back to their map.
        action = document.createElement('button');
        action.className = 'btn btn-primary';
        action.textContent = 'Beside you';
        action.addEventListener('click', () => {
          saveData.settings.companion = '';
          done();
        });
      } else {
        action = shopAction({
          owned,
          active: false,
          price: c.price,
          onUse: () => {
            saveData.settings.companion = c.id;
            done();
          },
          onBuy: () => {
            saveData.characters.push(c.id);
            saveData.settings.companion = c.id;
            done(`${c.name} moved in`);
          },
        });
        if (owned) action.textContent = 'Bring along';
      }
      const blurb = owned || c.price > 0 ? c.blurb : `${c.blurb} Arrives with a day 7 gift.`;
      list.append(shopRow(art, c.name, blurb, action));
    }
    return;
  }

  const items = shopTab === 'glazes' ? GLAZES : EFFECTS;
  const ownedList = shopTab === 'glazes' ? saveData.ownedGlazes : saveData.ownedEffects;
  const current = shopTab === 'glazes' ? glazeById(saveData.settings.glaze).id : effectById(saveData.settings.effect).id;
  for (const item of items) {
    const select = (): void => {
      if (shopTab === 'glazes') {
        saveData.settings.glaze = item.id;
        invalidateStaticLayer();
      } else {
        saveData.settings.effect = item.id;
      }
    };
    const action = shopAction({
      owned: item.price === 0 || ownedList.includes(item.id),
      active: current === item.id,
      price: item.price,
      onUse: () => {
        select();
        done();
      },
      onBuy: () => {
        ownedList.push(item.id);
        select();
        done(`${item.name} unlocked`);
      },
    });
    list.append(shopRow(null, item.name, item.blurb, action));
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

/* ---------------------------------------------------------------- Daily Kiln */

/** The day being played when the board is a Daily Kiln, otherwise null. */
let dailyDay: number | null = null;
const dailyBoards = new Map<number, Level>();

function today(): number {
  return dayNumber(new Date());
}

function dailyBoard(day: number): Level {
  let level = dailyBoards.get(day);
  if (!level) {
    level = generateLevel(dailyLevelId(day), { profileLevel: dailyDifficulty(day) });
    dailyBoards.set(day, level);
  }
  return level;
}

function startDaily(): void {
  const day = today();
  const go = (): void => {
    dailyDay = day;
    beginSession(dailyBoard(day), CHAPTERS[day % CHAPTERS.length]);
  };
  if (dailyBoards.has(day)) {
    go();
  } else {
    // Building the board takes a moment on a slow phone; say so first.
    toast('Firing today’s kiln…', 1200);
    window.setTimeout(go, 60);
  }
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function renderDaily(): void {
  const day = today();
  const state = saveData.daily;
  const streak = currentStreak(state, day);
  const done = clearedToday(state, day);
  $('daily-coins').textContent = `${saveData.coins} coins`;
  $('daily-streak').textContent = String(streak);
  $('daily-status').textContent = done
    ? 'Today’s kiln is fired. A new puzzle is ready at midnight.'
    : streak > 0
      ? `Clear today’s puzzle to make it ${streak + 1} days in a row.`
      : `Clear a puzzle every day to build a streak. +${DAILY_REWARD} coins a day.`;
  $('btn-daily-play').textContent = done ? 'Play it again' : 'Play today’s kiln';

  // This month as a tray of tiles: fired days glazed, today ringed.
  const [year, month] = dayToDate(day);
  $('daily-month').textContent = `${MONTHS[month]} ${year}`;
  const firstOfMonth = dayNumber(new Date(year, month, 1));
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const lead = (firstOfMonth + 3) % 7; // Monday first
  const cleared = new Set(state.clearedDays);
  const calendar = $('daily-calendar');
  calendar.textContent = '';
  for (const name of ['M', 'T', 'W', 'T', 'F', 'S', 'S']) {
    const head = document.createElement('span');
    head.className = 'cal-head';
    head.textContent = name;
    calendar.append(head);
  }
  for (let i = 0; i < lead; i++) calendar.append(document.createElement('span'));
  for (let d = 0; d < daysInMonth; d++) {
    const n = firstOfMonth + d;
    const cell = document.createElement('span');
    cell.className = 'cal-day';
    if (cleared.has(n)) cell.classList.add('fired');
    if (n === day) cell.classList.add('today');
    if (n > day) cell.classList.add('ahead');
    cell.textContent = String(d + 1);
    calendar.append(cell);
  }

  // Earned badges, then the next one to aim for.
  const badges = $('daily-badges');
  badges.textContent = '';
  const medal = (days: number, earned: boolean, note?: string): void => {
    const el = document.createElement('div');
    el.className = earned ? 'badge earned' : 'badge';
    const face = badgeFace(days, earned);
    const label = document.createElement('small');
    label.textContent = note ?? badgeLabel(days);
    el.append(face, label);
    badges.append(el);
  };
  for (const b of [...state.badges].sort((a, c) => a - c)) medal(b, true);
  const highest = state.badges.length ? Math.max(...state.badges) : 0;
  const next = nextBadge(Math.max(streak, highest));
  medal(next, false, `${badgeLabel(next)}: ${next - streak} to go`);
  $('daily-best').textContent =
    state.best > 0
      ? `Best streak: ${state.best} ${state.best === 1 ? 'day' : 'days'}. Badges are yours to keep.`
      : 'Badges are yours to keep, even if a streak ends.';
}

/* ---------------------------------------------------------- Potter's Ledger */

function goalStats(): GoalStats {
  return {
    bestMoves: saveData.bestMoves,
    parFor: (id) => getLevel(id)?.minMoves ?? null,
    flicks: saveData.flicks,
    dailyClears: saveData.daily.clearedDays.length,
  };
}

function renderGoals(): void {
  $('goals-coins').textContent = `${saveData.coins} coins`;
  const stats = goalStats();
  const list = $('goal-list');
  list.textContent = '';
  // Ready to claim first, then in progress, then finished.
  const rank = (g: Goal): number => (saveData.goalsClaimed.includes(g.id) ? 2 : isDone(g, stats) ? 0 : 1);
  const ordered = GOALS.map((g, i) => ({ g, i })).sort((a, b) => rank(a.g) - rank(b.g) || a.i - b.i);
  for (const { g } of ordered) {
    const { current, target } = g.progress(stats);
    const claimed = saveData.goalsClaimed.includes(g.id);
    const row = document.createElement('div');
    row.className = 'goal';
    if (claimed) row.classList.add('claimed');

    const text = document.createElement('div');
    text.className = 'goal-text';
    const title = document.createElement('strong');
    title.textContent = g.title;
    const count = document.createElement('small');
    count.textContent = claimed ? 'Done' : `${current} / ${target}`;
    const groove = document.createElement('div');
    groove.className = 'goal-groove';
    const fill = document.createElement('div');
    fill.style.width = `${Math.min(100, (current / target) * 100)}%`;
    groove.append(fill);
    text.append(title, count, groove);

    const action = document.createElement('button');
    action.className = 'btn goal-claim';
    if (claimed) {
      action.textContent = '✓';
      action.disabled = true;
    } else if (current >= target) {
      action.classList.add('btn-primary');
      action.textContent = `+${g.reward}`;
      action.addEventListener('click', () => {
        if (saveData.goalsClaimed.includes(g.id)) return;
        saveData.goalsClaimed.push(g.id);
        saveData.coins += g.reward;
        persist();
        sfx.win();
        toast(`+${g.reward} coins`);
        renderGoals();
      });
    } else {
      action.textContent = String(g.reward);
      action.disabled = true;
    }
    action.setAttribute('aria-label', `${g.reward} coins`);
    row.append(text, action);
    list.append(row);
  }
}

/* ---------------------------------------------------------------- daily gift */

/** The day the gift card was last put in front of the player, so it shows once. */
let giftShownDay: number | null = null;

function giftLabel(index: number): string {
  if (index < 7) return String(GIFT_COINS[index - 1]);
  return nextGiftCharacter(saveData.characters) ? 'Friend' : String(GIFT_DAY7_COINS);
}

function renderGiftRow(current: number, done: boolean): void {
  const row = $('gift-row');
  row.textContent = '';
  for (let i = 1; i <= 7; i++) {
    const slot = document.createElement('div');
    slot.className = 'gift-slot';
    if (i === 7) slot.classList.add('big');
    if (i < current || (done && i === current)) slot.classList.add('opened');
    if (i === current && !done) slot.classList.add('now');
    const day = document.createElement('small');
    day.textContent = `Day ${i}`;
    const prize = document.createElement('strong');
    prize.textContent = giftLabel(i);
    slot.append(day, prize);
    row.append(slot);
  }
}

function showGiftReady(index: number): void {
  $<HTMLImageElement>('gift-kiln').src = depthUrl('gift-kiln-ready.svg');
  renderGiftRow(index, false);
  $('gift-body').textContent =
    index === 7
      ? 'Day 7: someone new is waiting by the kiln.'
      : `Day ${index} of 7. Come back tomorrow for day ${index + 1}.`;
  $('gift-reward').textContent = '';
  $('gift-keep').hidden = true;
  $('gift-restart').hidden = true;
  $('gift-close').hidden = true;
  const open = $<HTMLButtonElement>('gift-open');
  open.hidden = false;
  open.onclick = () => {
    const day = today();
    if (giftStatus(saveData.gift, day).kind === 'claimed') return;
    saveData.gift = claimGift(day, index);
    let message: string;
    if (index === 7) {
      const friend = nextGiftCharacter(saveData.characters);
      if (friend) {
        saveData.characters.push(friend.id);
        message = `${friend.name} joined you! ${friend.blurb}`;
      } else {
        saveData.coins += GIFT_DAY7_COINS;
        message = `+${GIFT_DAY7_COINS} coins`;
      }
    } else {
      saveData.coins += GIFT_COINS[index - 1];
      message = `+${GIFT_COINS[index - 1]} coins`;
    }
    persist();
    sfx.win();
    renderGiftRow(index, true);
    $<HTMLImageElement>('gift-kiln').src = depthUrl('gift-kiln-open.svg');
    $('gift-reward').textContent = message;
    open.hidden = true;
    $('gift-close').hidden = false;
    renderHome();
  };
}

function showGift(): void {
  const day = today();
  const status = giftStatus(saveData.gift, day);
  if (status.kind === 'claimed') return;
  giftShownDay = day;
  $('overlay-gift').hidden = false;

  if (status.kind === 'ready') {
    showGiftReady(status.index);
    return;
  }

  // Exactly one day missed: the player chooses. Declining costs nothing more.
  const keep = status.keepIndex;
  $<HTMLImageElement>('gift-kiln').src = depthUrl('gift-kiln-closed.svg');
  renderGiftRow(keep, false);
  $('gift-body').textContent = `You missed a day. Watch an ad to keep your place on day ${keep}, or start again from day 1.`;
  $('gift-reward').textContent = '';
  $('gift-open').hidden = true;
  $('gift-close').hidden = true;
  const keepBtn = $<HTMLButtonElement>('gift-keep');
  keepBtn.hidden = false;
  keepBtn.textContent = `Watch an ad to keep day ${keep}`;
  keepBtn.onclick = async () => {
    keepBtn.disabled = true;
    const watched = saveData.adsRemoved ? true : await ads.showRewarded();
    keepBtn.disabled = false;
    if (watched) showGiftReady(keep);
    else toast('The ad did not finish, so your place was not kept.');
  };
  const restart = $<HTMLButtonElement>('gift-restart');
  restart.hidden = false;
  restart.onclick = () => showGiftReady(1);
}

/** Puts the gift in front of the player once a day, on the home screen. */
function maybeShowGift(): void {
  const day = today();
  if (giftShownDay === day) return;
  showGift();
}

/* ------------------------------------------------------------- win helpers */

function celebrate(): void {
  sfx.win();
  buzz('win');
  if (!saveData.settings.reduceMotion) {
    particles.celebrate(canvas.width / canvasScale(), BLOCK_COLOURS);
    requestDraw();
  }
}

function fillStars(stars: number): void {
  const starRow = $('win-stars');
  starRow.textContent = '';
  for (let i = 0; i < 3; i++) {
    const star = document.createElement('span');
    const earned = i < stars;
    star.className = earned ? 'star earned' : 'star';
    star.textContent = earned ? '★' : '☆';
    star.style.animationDelay = `${140 + i * 160}ms`;
    starRow.append(star);
  }
}

function completeDaily(day: number, stars: number, moves: number): void {
  const result = recordDailyClear(saveData.daily, day);
  saveData.daily = result.state;
  const reward = result.firstToday ? DAILY_REWARD : 0;
  saveData.coins += reward;
  saveData.levelsSinceLastAd++;
  persist();
  celebrate();

  const streak = result.state.streak;
  $('win-title').textContent = 'Daily Kiln fired';
  fillStars(stars);
  $('win-detail').textContent = result.firstToday
    ? `Solved in ${moves} moves. ${streak} ${streak === 1 ? 'day' : 'days'} in a row.`
    : `Solved in ${moves} moves. Par is ${session?.par ?? moves}.`;
  const latest = result.newBadges[result.newBadges.length - 1];
  const badge = latest ? ` New badge: ${badgeLabel(latest)}!` : '';
  $('win-reward').textContent = result.firstToday ? `+${reward} coins.${badge}` : 'Already fired today. No new coins.';
  $<HTMLButtonElement>('btn-next').hidden = true;

  const wonSession = session;
  const reveal = saveData.settings.reduceMotion ? 0 : 1100;
  window.setTimeout(() => {
    if (session === wonSession && session?.isComplete()) $('overlay-win').hidden = false;
  }, reveal);
}

/* ------------------------------------------------------------ pottery shelf */

const depthUrl = (file: string): string => `${import.meta.env.BASE_URL}depth/${file}`;

/** How far a chapter has got: 'empty', 'fired' (every level cleared) or 'gold' (par on every level). */
function potState(chapter: Chapter): 'empty' | 'fired' | 'gold' {
  const first = (chapter.n - 1) * CHAPTER_SIZE + 1;
  let stars = 0;
  for (let id = first; id < first + CHAPTER_SIZE; id++) {
    const best = saveData.bestMoves[id];
    if (best === undefined) return 'empty';
    const level = getLevel(id);
    stars += level ? starsFor(best, level.minMoves) : 1;
  }
  return stars === CHAPTER_SIZE * 3 ? 'gold' : 'fired';
}

function renderShelf(): void {
  const shelf = $('shelf');
  shelf.textContent = '';
  let fired = 0;
  let gold = 0;
  for (const chapter of CHAPTERS) {
    const state = potState(chapter);
    if (state !== 'empty') fired++;
    if (state === 'gold') gold++;
    const slot = document.createElement('figure');
    slot.className = `shelf-slot ${state}`;
    const pot = document.createElement('img');
    pot.src = depthUrl(`pot-${chapter.n}-${chapter.slug}${state === 'empty' ? '-empty' : state === 'gold' ? '-gold' : ''}.svg`);
    pot.alt = '';
    const plaque = document.createElement('figcaption');
    plaque.textContent = chapter.name;
    const note = document.createElement('small');
    note.textContent =
      state === 'gold' ? 'Gold glaze' : state === 'fired' ? 'Par on every level for gold' : 'Clear every level to fire';
    plaque.append(note);
    slot.append(pot, plaque);
    slot.setAttribute(
      'aria-label',
      `${chapter.name}: ${state === 'empty' ? 'not fired yet' : state === 'gold' ? 'gold glaze' : 'fired'}`,
    );
    shelf.append(slot);
  }
  $('shelf-count').textContent = `${fired} of ${CHAPTERS.length} fired · ${gold} gold`;
}

/* ----------------------------------------------------------- streak badges */

/** The medallion for a streak length, as the badge art names it. */
function badgeArt(days: number): { file: string; label: string | null } {
  if (days < 30) return { file: `badge-${days}.svg`, label: null };
  if (days <= 365) {
    const month = days === 365 ? 12 : Math.round(days / 30);
    return { file: `badge-month-${String(month).padStart(2, '0')}.svg`, label: null };
  }
  const extra = Math.round((days - 365) / 30);
  const years = 1 + Math.floor(extra / 12);
  const months = extra % 12;
  return { file: 'badge-year.svg', label: months === 0 ? `${years}y` : `${years}y ${months}m` };
}

function badgeFace(days: number, earned: boolean): HTMLElement {
  const face = document.createElement('span');
  face.className = 'badge-face';
  const img = document.createElement('img');
  img.alt = '';
  const art = badgeArt(days);
  img.src = depthUrl(earned ? art.file : 'badge-locked.svg');
  face.append(img);
  if (earned && art.label) {
    const label = document.createElement('span');
    label.className = 'badge-year-label';
    label.textContent = art.label;
    face.append(label);
  }
  return face;
}

/* ------------------------------------------------ characters on the maps */

/** Owned friends stand beside the road in their home chapter. */
function placeFriends(chapter: Chapter): void {
  const layer = $('map-friends');
  layer.textContent = '';
  const here = CHARACTERS.filter((c) => c.homeChapter === chapter.n && saveData.characters.includes(c.id));
  here.forEach((c, i) => {
    // Spread them along the road, standing on the open side of a tile.
    const [x, y] = chapter.nodes[Math.min(CHAPTER_SIZE - 1, 3 + i * 7)];
    const side = x < chapter.width / 2 ? 1 : -1;
    const img = document.createElement('img');
    img.className = 'map-friend';
    img.src = characterMapUrl(c.id);
    img.alt = c.name;
    img.style.left = `${((x + side * 46) / chapter.width) * 100}%`;
    img.style.top = `${((y + 8) / chapter.height) * 100}%`;
    layer.append(img);
  });
}

/** The chosen companion beside the board, or nobody. */
function placeCompanion(): void {
  const img = $<HTMLImageElement>('companion');
  const id = saveData.settings.companion;
  const friend = id && saveData.characters.includes(id) ? characterById(id) : undefined;
  img.hidden = !friend;
  if (friend) {
    const url = characterSideUrl(friend.id);
    if (img.getAttribute('src') !== url) img.src = url;
    img.alt = `${friend.name} keeps you company`;
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

  const dpr = canvasScale();
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
  ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

  viewport = computeViewport(session.level, rect.width, rect.height);
  requestDraw();
}

function updateHud(): void {
  if (!session) return;
  if (dailyDay !== null) {
    const [, month, date] = dayToDate(dailyDay);
    $('game-level-cap').textContent = 'Daily';
    $('game-level').textContent = `${date} ${MONTHS[month].slice(0, 3)}`;
  } else {
    $('game-level-cap').textContent = 'Level';
    $('game-level').textContent = String(currentLevelId);
  }
  $('game-moves').textContent =
    `${session.moves} ${session.moves === 1 ? 'move' : 'moves'} · par ${session.par}`;
  $('game-coins').textContent = String(saveData.coins);
  $<HTMLButtonElement>('btn-undo').disabled = !session.canUndo();
}

/**
 * Asks for one frame. There is no permanent loop: the board is repainted when
 * something on it changes, and keeps animating only while something moves.
 */
function requestDraw(): void {
  if (framePending) return;
  framePending = true;
  requestAnimationFrame(frame);
}

function frame(nowMs: number): void {
  framePending = false;
  if (!session || $('screen-game').hidden) {
    lastFrameMs = 0;
    return;
  }

  const dt = lastFrameMs === 0 ? 0 : Math.min(0.05, (nowMs - lastFrameMs) / 1000);
  lastFrameMs = nowMs;

  // Motion is a setting, not a given: with it off the clock stops, which
  // freezes the hint glow, and no effects run.
  if (!saveData.settings.reduceMotion) {
    clock += dt;
    particles.update(dt);
  } else {
    particles.clear();
  }

  render(ctx!, session.level, viewport, {
    theme: themeById(saveData.settings.theme),
    glyphs: saveData.settings.colourBlindShapes,
    glaze: glazeById(saveData.settings.glaze).id,
    time: clock,
    reduceMotion: saveData.settings.reduceMotion,
    drag: drag.visual,
    highlight: hintedBlocks,
    particles,
  });

  const moving = !saveData.settings.reduceMotion && (particles.count > 0 || hintedBlocks.length > 0);
  if (moving) requestDraw();
  else lastFrameMs = 0;
}

const drag = new DragController(
  canvas,
  () => session!,
  () => viewport,
  {
    onChange: () => {
      updateHud();
      requestDraw();
    },
    onPickUp: () => {
      hintedBlocks = [];
      sfx.pick();
    },
    onBeforeExit: (blockId: number, dir: Dir) => {
      // Spawn the burst while the block is still on the board, so the sparks
      // start from where the player last saw it.
      const block = session?.level.blocks.find((b) => b.id === blockId);
      if (!block || saveData.settings.reduceMotion) return;
      const centre = blockCentre(block, viewport);
      const out = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } }[dir];
      particles.exitEffect(centre.x, centre.y, blockColourFor(block.color), effectById(saveData.settings.effect).id, out, block.id, viewport.cell);
    },
    onBlocked: () => sfx.blocked(),
    reduceMotion: () => saveData.settings.reduceMotion,
    onFlicked: () => {
      saveData.flicks++;
      persist();
    },
    onBlockExited: () => {
      sfx.exit();
      buzz('exit');
      window.setTimeout(checkComplete, 0);
    },
  },
);

function checkComplete(): void {
  if (!session || !session.isComplete()) return;

  const stars = session.stars();
  const moves = session.moves;
  if (dailyDay !== null) {
    completeDaily(dailyDay, stars, moves);
    return;
  }
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
  buzz('win');
  if (!saveData.settings.reduceMotion) {
    particles.celebrate(canvas.width / canvasScale(), BLOCK_COLOURS);
    requestDraw();
  }

  $('win-title').textContent = currentLevelId >= LEVEL_COUNT ? 'Final level complete' : 'Level complete';
  const starRow = $('win-stars');
  starRow.textContent = '';
  for (let i = 0; i < 3; i++) {
    const star = document.createElement('span');
    const earned = i < stars;
    star.className = earned ? 'star earned' : 'star';
    star.textContent = earned ? '★' : '☆';
    star.style.animationDelay = `${140 + i * 160}ms`;
    starRow.append(star);
  }
  $('win-detail').textContent =
    moves <= session.par
      ? `Solved in ${moves} moves — that matches par.`
      : `Solved in ${moves} moves. Par is ${session.par}.`;
  $('win-reward').textContent = firstClear ? `+${reward} coins` : 'Already cleared — no new coins.';

  const next = $<HTMLButtonElement>('btn-next');
  next.hidden = currentLevelId >= LEVEL_COUNT;

  // A short beat so the confetti and the cleared board are visible before the
  // card covers them. Deliberately no ad here - see AD_POLICY.neverAfterWin.
  const wonLevel = currentLevelId;
  // 620 ms read as rushed to a tester ("let me look at my clean board for a
  // split second"), so the board now stays clear for just over a second.
  const reveal = saveData.settings.reduceMotion ? 0 : 1100;
  window.setTimeout(() => {
    // The player may have left in the meantime; do not yank them back.
    if (session?.isComplete() && currentLevelId === wonLevel) $('overlay-win').hidden = false;
  }, reveal);
}

function startLevel(id: number): void {
  const level = getLevel(id);
  if (!level) {
    toast('That level is not in this pack yet.');
    return;
  }
  currentLevelId = id;
  dailyDay = null;
  beginSession(level, chapterOf(id));
}

/** Puts a board on screen over a chapter's scenery, so the map's places carry on into play. */
function beginSession(level: Level, chapter: Chapter): void {
  // Made absolute: a relative url() in a custom property resolves against the
  // stylesheet that uses it, which in the build is assets/, not the page.
  const background = new URL(backgroundUrl(chapter), document.baseURI).href;
  $('screen-game').style.setProperty('--chapter-bg', `url("${background}")`);
  session = new Session(level);
  placeCompanion();
  hintedBlocks = [];
  particles.clear();
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
    dailyDay !== null ? saveData.highestUnlocked : currentLevelId,
    now,
  );

  if (shouldAd) {
    saveData.levelsSinceLastAd = 0;
    saveData.lastAdAtMs = now;
    persist();
    void ads.showInterstitial();
  }

  session = null;
  dailyDay = null;
  particles.clear();
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
  requestDraw();
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
    });
  };

  bind('set-sound', 'sound', setSoundEnabled);
  bind('set-music', 'music', setMusicEnabled);
  bind('set-haptics', 'haptics');
  bind('set-glyphs', 'colourBlindShapes');
  bind('set-motion', 'reduceMotion', () => applyTheme());

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
  $('btn-daily').addEventListener('click', () => showScreen('daily'));
  $('btn-goals').addEventListener('click', () => showScreen('goals'));
  $('btn-shelf').addEventListener('click', () => showScreen('shelf'));
  for (const tab of document.querySelectorAll<HTMLButtonElement>('.shop-tab')) {
    tab.addEventListener('click', () => {
      shopTab = tab.dataset.tab as ShopTab;
      renderShop();
    });
  }
  $<HTMLImageElement>('home-daily-icon').src = depthUrl('icon-daily-kiln.svg');
  $('btn-daily-play').addEventListener('click', startDaily);
  $('gift-close').addEventListener('click', () => {
    $('overlay-gift').hidden = true;
  });
  $('btn-themes').addEventListener('click', () => showScreen('themes'));
  $('btn-settings').addEventListener('click', () => showScreen('settings'));
  $('btn-promises').addEventListener('click', () => showScreen('promises'));
  $('chapter-prev').addEventListener('click', () => stepChapter(-1));
  $('chapter-next').addEventListener('click', () => stepChapter(1));

  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-back]')) {
    button.addEventListener('click', goBack);
  }

  $('btn-game-back').addEventListener('click', leaveLevel);
  $('btn-undo').addEventListener('click', () => {
    if (session?.undo()) {
      hintedBlocks = [];
      updateHud();
      requestDraw();
      sfx.tap();
    }
  });
  $('btn-hint').addEventListener('click', showHint);
  $('btn-restart').addEventListener('click', () => {
    if (!session) return;
    session.restart();
    hintedBlocks = [];
    particles.clear();
    updateHud();
    requestDraw();
  });

  $('btn-next').addEventListener('click', () => {
    $('overlay-win').hidden = true;
    startLevel(Math.min(currentLevelId + 1, LEVEL_COUNT));
  });
  $('btn-replay').addEventListener('click', () => {
    $('overlay-win').hidden = true;
    if (dailyDay !== null) startDaily();
    else startLevel(currentLevelId);
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

  // Consent and SDK start-up run in the background: nothing about the first
  // puzzle should wait on an ad network.
  void initialiseAds();

  drag.attach();
  window.addEventListener('resize', resizeCanvas);
  window.addEventListener('resize', fitTitle);
  // The display font changes the word's width, so measure again once it loads.
  void document.fonts.ready.then(fitTitle);
  window.addEventListener('orientationchange', () => window.setTimeout(resizeCanvas, 120));
  document.addEventListener('pointerdown', unlockAudio, { once: true });
  // Nothing redraws on its own any more, so repaint on return in case the
  // system dropped the canvas contents while the app was in the background.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    invalidateStaticLayer();
    requestDraw();
  });

  exposeTestHook();
}

/** Block hue lookup, kept here so the effects layer stays theme-agnostic. */
function blockColourFor(index: number): string {
  return BLOCK_COLOURS[((index % BLOCK_COLOURS.length) + BLOCK_COLOURS.length) % BLOCK_COLOURS.length];
}

boot();
