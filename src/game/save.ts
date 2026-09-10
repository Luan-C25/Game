/**
 * Progress persistence.
 *
 * Lost progress and a "Remove Ads" purchase that evaporates on reinstall are
 * both common complaints about the games this one answers, so saving is
 * defensive throughout: every read is guarded, an unreadable save degrades to
 * a fresh one instead of throwing, and unknown fields from a newer version
 * are preserved rather than dropped.
 */

const STORAGE_KEY = 'colourjam.save.v1';

export interface Settings {
  sound: boolean;
  music: boolean;
  haptics: boolean;
  /** Adds a distinct glyph to every block, so colour is never the only cue. */
  colourBlindGlyphs: boolean;
  reduceMotion: boolean;
  theme: string;
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
}

export const DEFAULT_SETTINGS: Settings = {
  sound: true,
  music: false,
  haptics: true,
  colourBlindGlyphs: false,
  reduceMotion: false,
  theme: 'sunrise',
};

export function defaultSave(): SaveData {
  return {
    version: 1,
    highestUnlocked: 1,
    bestMoves: {},
    coins: 0,
    unlockedThemes: ['sunrise'],
    adsRemoved: false,
    levelsSinceLastAd: 0,
    lastAdAtMs: 0,
    settings: { ...DEFAULT_SETTINGS },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
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
    colourBlindGlyphs:
      typeof storedSettings.colourBlindGlyphs === 'boolean'
        ? storedSettings.colourBlindGlyphs
        : base.settings.colourBlindGlyphs,
    reduceMotion:
      typeof storedSettings.reduceMotion === 'boolean'
        ? storedSettings.reduceMotion
        : base.settings.reduceMotion,
    theme: typeof storedSettings.theme === 'string' ? storedSettings.theme : base.settings.theme,
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
    unlockedThemes: themes.includes('sunrise') ? themes : ['sunrise', ...themes],
    // A purchase is never silently revoked by a bad read.
    adsRemoved: raw.adsRemoved === true,
    levelsSinceLastAd:
      typeof raw.levelsSinceLastAd === 'number' && raw.levelsSinceLastAd >= 0
        ? Math.floor(raw.levelsSinceLastAd)
        : 0,
    lastAdAtMs: typeof raw.lastAdAtMs === 'number' && raw.lastAdAtMs >= 0 ? raw.lastAdAtMs : 0,
    settings,
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
