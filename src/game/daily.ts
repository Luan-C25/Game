/**
 * The day clock, the Daily Kiln streak and the daily gift.
 *
 * Everything here is pure: "today" is passed in as a day number, so tests can
 * walk across midnights, missed days and years without touching the clock.
 * A day number counts calendar days in the player's own time zone, so the
 * day turns over at their local midnight.
 */

const MS_PER_DAY = 86_400_000;

/** The local calendar day of `date`, as a whole number of days since 1970. */
export function dayNumber(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / MS_PER_DAY);
}

/** The calendar date of a day number, as [year, month 0-11, day 1-31]. */
export function dayToDate(day: number): [number, number, number] {
  const d = new Date(day * MS_PER_DAY);
  return [d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()];
}

/* ------------------------------------------------------------ Daily Kiln */

/**
 * Daily puzzles use level ids far above the shipped pack, so a daily board
 * can never be mistaken for, or collide with, a numbered level.
 */
export const DAILY_ID_BASE = 100_000;

/**
 * Which numbered level's difficulty each weekday borrows, Monday first:
 * gentler early in the week, the plateau at the weekend.
 */
const WEEKDAY_DIFFICULTY = [45, 55, 65, 75, 85, 91, 91];

export function dailyLevelId(day: number): number {
  return DAILY_ID_BASE + day;
}

export function dailyDifficulty(day: number): number {
  // 1 January 1970 was a Thursday, so day 0 is index 3 counting from Monday.
  return WEEKDAY_DIFFICULTY[(day + 3) % 7];
}

/** Coins for the first clear of each day's puzzle. */
export const DAILY_REWARD = 30;

export interface DailyState {
  /** Every day whose puzzle was cleared, oldest first (kept for the calendar). */
  clearedDays: number[];
  /** Length of the run of consecutive cleared days ending at the last clear. */
  streak: number;
  best: number;
  /** Streak lengths, in days, whose badge has been earned. */
  badges: number[];
}

export function defaultDaily(): DailyState {
  return { clearedDays: [], streak: 0, best: 0, badges: [] };
}

/** The streak as it stands today: a run is still alive until a day is missed. */
export function currentStreak(state: DailyState, today: number): number {
  const last = state.clearedDays[state.clearedDays.length - 1];
  if (last === undefined) return 0;
  return last === today || last === today - 1 ? state.streak : 0;
}

export function clearedToday(state: DailyState, today: number): boolean {
  return state.clearedDays[state.clearedDays.length - 1] === today;
}

/**
 * Streak lengths that earn a badge: 7, 14 and 21 days, then 1 to 11 months
 * of 30 days, 1 year at 365 days, then every 30 days after that with no end.
 */
export function badgeThreshold(index: number): number {
  if (index < 3) return (index + 1) * 7;
  if (index < 14) return (index - 2) * 30;
  if (index === 14) return 365;
  return 365 + (index - 14) * 30;
}

/** Every badge threshold up to and including `days`. */
export function badgesUpTo(days: number): number[] {
  const out: number[] = [];
  for (let i = 0; badgeThreshold(i) <= days; i++) out.push(badgeThreshold(i));
  return out;
}

/** The next badge beyond `days`. */
export function nextBadge(days: number): number {
  let i = 0;
  while (badgeThreshold(i) <= days) i++;
  return badgeThreshold(i);
}

/** "7 days", "3 months", "1 year", "1 year 2 months". */
export function badgeLabel(days: number): string {
  if (days < 30) return `${days} days`;
  if (days < 365) {
    const months = Math.round(days / 30);
    return `${months} ${months === 1 ? 'month' : 'months'}`;
  }
  const extra = Math.round((days - 365) / 30);
  const years = 1 + Math.floor(extra / 12);
  const months = extra % 12;
  const y = `${years} ${years === 1 ? 'year' : 'years'}`;
  return months === 0 ? y : `${y} ${months} ${months === 1 ? 'month' : 'months'}`;
}

export interface DailyClear {
  state: DailyState;
  /** False when today's puzzle had already been cleared. */
  firstToday: boolean;
  /** Badges earned by this clear. */
  newBadges: number[];
}

export function recordDailyClear(state: DailyState, today: number): DailyClear {
  if (clearedToday(state, today)) return { state, firstToday: false, newBadges: [] };
  const streak = currentStreak(state, today) + 1;
  const earned = badgesUpTo(streak).filter((b) => !state.badges.includes(b));
  return {
    firstToday: true,
    newBadges: earned,
    state: {
      // A year and a bit is plenty for the calendar; the streak is stored apart.
      clearedDays: [...state.clearedDays, today].slice(-400),
      streak,
      best: Math.max(state.best, streak),
      badges: [...state.badges, ...earned],
    },
  };
}

/* ------------------------------------------------------------ daily gift */

/** Coins on days 1 to 6; day 7 gives a character instead. */
export const GIFT_COINS = [10, 15, 20, 30, 40, 60];
/** Day 7 once every gift character is owned. */
export const GIFT_DAY7_COINS = 150;

export interface GiftState {
  lastClaimDay: number | null;
  /** The cycle day (1 to 7) of the last claim. */
  lastIndex: number;
}

export function defaultGift(): GiftState {
  return { lastClaimDay: null, lastIndex: 0 };
}

export type GiftStatus =
  | { kind: 'claimed' }
  /** Ready to open; `index` is the cycle day it will pay. */
  | { kind: 'ready'; index: number }
  /** Exactly one day was missed: an ad keeps `keepIndex`, declining starts again at 1. */
  | { kind: 'missed-one'; keepIndex: number };

function nextIndex(index: number): number {
  return (index % 7) + 1;
}

export function giftStatus(state: GiftState, today: number): GiftStatus {
  if (state.lastClaimDay === null) return { kind: 'ready', index: 1 };
  const gap = today - state.lastClaimDay;
  if (gap <= 0) return { kind: 'claimed' };
  if (gap === 1) return { kind: 'ready', index: nextIndex(state.lastIndex) };
  if (gap === 2) return { kind: 'missed-one', keepIndex: nextIndex(state.lastIndex) };
  return { kind: 'ready', index: 1 };
}

/** Claims today's gift at cycle day `index`. */
export function claimGift(today: number, index: number): GiftState {
  return { lastClaimDay: today, lastIndex: index };
}
