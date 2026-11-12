/**
 * Progress persistence.
 *
 * Lost progress and a "Remove Ads" purchase that evaporates on reinstall are
 * both common complaints about the games this one answers, so saving is
 * defensive throughout: every read is guarded, an unreadable save degrades to
 * a fresh one instead of throwing, and unknown fields from a newer version
 * are preserved rather than dropped.
 */

import { defaultDaily, defaultGift, type DailyState, type GiftState } from './daily.ts';

const STORAGE_KEY = 'colourjam.save.v1';

export interface Settings {
  sound: boolean;
  music: boolean;
  haptics: boolean;
  /**
   * Draws a distinct shape on every block and gate, so colour is never the
   * only cue. On by default since 1.0.1, after a tester said players who
   * struggle with yellow, blue and green were locked out. It was stored as
   * `colourBlindGlyphs` (default off) before that; the new name means every
   * existing save picks up the new default instead of its stored "off".
   */
  colourBlindShapes: boolean;
  reduceMotion: boolean;
  theme: string;
  /** Tile finish; an unknown id draws the free default. */
  glaze: string;
  /** Exit effect; an unknown or empty id plays the free default. */
  effect: string;
  /** Character id sitting beside the board, or '' for nobody. */
  companion: string;
}

export interface SaveData {
  version: number;
  highestUnlocked: number;
  /** Best (fewest) move count per completed level. */
  bestMoves: Record<number, number>;
  coins: number;
  unlockedThemes: string[];
  adsRemoved: boolean;
  levelsSinceLastAd: number;
  lastAdAtMs: number;
  settings: Settings;
  daily: DailyState;
  gift: GiftState;
  /** Character ids the player owns. */
  characters: string[];
  /** Potter's Ledger goals already paid out. */
  goalsClaimed: string[];
  /** Blocks flicked out through their gates, for the ledger. */
  flicks: number;
  /** Bought glaze and effect ids; free defaults need no entry. */
  ownedGlazes: string[];
  ownedEffects: string[];
}

export const DEFAULT_SETTINGS: Settings = {
  sound: true,
  music: false,
  haptics: true,
  colourBlindShapes: true,
  reduceMotion: false,
  theme: 'slate',
  glaze: 'gloss',
  effect: '',
  companion: '',
};

export function defaultSave(): SaveData {
  return {
    version: 1,
    highestUnlocked: 1,
    bestMoves: {},
    coins: 0,
    unlockedThemes: ['slate'],
    adsRemoved: false,
    levelsSinceLastAd: 0,
    lastAdAtMs: 0,
    settings: { ...DEFAULT_SETTINGS },
    daily: defaultDaily(),
    gift: defaultGift(),
    characters: [],
    goalsClaimed: [],
    flicks: 0,
    ownedGlazes: [],
    ownedEffects: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

const whole = (v: unknown, min = 0): number | null =>
  typeof v === 'number' && Number.isFinite(v) && v >= min ? Math.floor(v) : null;

const numbers = (v: unknown): number[] =>
  Array.isArray(v) ? v.filter((n): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0) : [];

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((t): t is string => typeof t === 'string') : []);

function reconcileDaily(raw: unknown): DailyState {
  if (!isRecord(raw)) return defaultDaily();
  const clearedDays = [...new Set(numbers(raw.clearedDays))].sort((a, b) => a - b);
  return {
    clearedDays,
    streak: whole(raw.streak) ?? 0,
    best: whole(raw.best) ?? 0,
    badges: [...new Set(numbers(raw.badges))],
  };
}

function reconcileGift(raw: unknown): GiftState {
  if (!isRecord(raw)) return defaultGift();
  const index = whole(raw.lastIndex);
  return {
    lastClaimDay: whole(raw.lastClaimDay),
    lastIndex: index !== null && index <= 7 ? index : 0,
  };
}

/** Merges a stored save over the defaults, discarding only what is invalid. */
export function reconcile(raw: unknown): SaveData {
  const base = defaultSave();
  if (!isRecord(raw)) return base;

  const bestMoves: Record<number, number> = {};
  if (isRecord(raw.bestMoves)) {
    for (const [key, value] of Object.entries(raw.bestMoves)) {
      const id = Number(key);
      if (Number.isInteger(id) && id > 0 && typeof value === 'number' && value > 0) {
        bestMoves[id] = value;
      }
    }
  }

  const storedSettings = isRecord(raw.settings) ? raw.settings : {};
  const settings: Settings = {
    sound: typeof storedSettings.sound === 'boolean' ? storedSettings.sound : base.settings.sound,
    music: typeof storedSettings.music === 'boolean' ? storedSettings.music : base.settings.music,
    haptics: typeof storedSettings.haptics === 'boolean' ? storedSettings.haptics : base.settings.haptics,
    colourBlindShapes:
      typeof storedSettings.colourBlindShapes === 'boolean'
        ? storedSettings.colourBlindShapes
        : base.settings.colourBlindShapes,
    reduceMotion:
      typeof storedSettings.reduceMotion === 'boolean'
        ? storedSettings.reduceMotion
        : base.settings.reduceMotion,
    theme: typeof storedSettings.theme === 'string' ? storedSettings.theme : base.settings.theme,
    glaze: typeof storedSettings.glaze === 'string' ? storedSettings.glaze : base.settings.glaze,
    effect: typeof storedSettings.effect === 'string' ? storedSettings.effect : base.settings.effect,
    companion: typeof storedSettings.companion === 'string' ? storedSettings.companion : base.settings.companion,
  };

  const themes = Array.isArray(raw.unlockedThemes)
    ? raw.unlockedThemes.filter((t): t is string => typeof t === 'string')
    : base.unlockedThemes;

  return {
    version: 1,
    highestUnlocked:
      typeof raw.highestUnlocked === 'number' && raw.highestUnlocked >= 1
        ? Math.floor(raw.highestUnlocked)
        : base.highestUnlocked,
    bestMoves,
    coins: typeof raw.coins === 'number' && raw.coins >= 0 ? Math.floor(raw.coins) : base.coins,
    unlockedThemes: themes.includes('slate') ? themes : ['slate', ...themes],
    // A purchase is never silently revoked by a bad read.
    adsRemoved: raw.adsRemoved === true,
    levelsSinceLastAd:
      typeof raw.levelsSinceLastAd === 'number' && raw.levelsSinceLastAd >= 0
        ? Math.floor(raw.levelsSinceLastAd)
        : 0,
    lastAdAtMs: typeof raw.lastAdAtMs === 'number' && raw.lastAdAtMs >= 0 ? raw.lastAdAtMs : 0,
    settings,
    daily: reconcileDaily(raw.daily),
    gift: reconcileGift(raw.gift),
    // Owned things are never dropped by a bad read of something else.
    characters: [...new Set(strings(raw.characters))],
    goalsClaimed: [...new Set(strings(raw.goalsClaimed))],
    flicks: whole(raw.flicks) ?? 0,
    ownedGlazes: [...new Set(strings(raw.ownedGlazes))],
    ownedEffects: [...new Set(strings(raw.ownedEffects))],
  };
}

export function load(): SaveData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultSave();
    return reconcile(JSON.parse(stored));
  } catch {
    // A private window, cleared site data, or a corrupt entry: start clean
    // rather than failing to boot.
    return defaultSave();
  }
}

export function save(data: SaveData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage can be unavailable or full. The session stays playable; only
    // persistence is lost, and never at the cost of a crash mid-level.
  }
}
