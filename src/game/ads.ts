/**
 * The advertising contract.
 *
 * These constants are the product, not an implementation detail. The
 * complaints this game is answering are overwhelmingly about ads that
 * interrupt play, fire after a win, or appear after every single round - so
 * the policy is written down in one place, shown to the player verbatim on
 * the Promises screen, and enforced by a single gate that every ad call has
 * to pass through.
 */

export const AD_POLICY = {
  /** No ad ever interrupts a puzzle in progress. */
  neverDuringPlay: true,
  /** No ad ever plays on the win screen. Finishing a level is never taxed. */
  neverAfterWin: true,
  /** Nothing at all until the player has had a proper run at the game. */
  firstAdAfterLevel: 10,
  /** Levels that must be completed between two interstitials. */
  levelsBetweenAds: 4,
  /** Wall-clock spacing between two interstitials. */
  secondsBetweenAds: 180,
  /** Rewarded ads are always opt-in, and declining costs nothing. */
  rewardedAlwaysOptIn: true,
  /**
   * No booster, hint or undo is ever cash-only. Hints and undo are free and
   * unlimited; ads only ever buy cosmetics.
   */
  everyHelpFreeOfCharge: true,
} as const;

/** Plain-language version of the above, rendered on the Promises screen. */
export const AD_PROMISES: string[] = [
  'No ad will ever interrupt a puzzle you are solving.',
  'No ad will ever play when you finish a level.',
  'No ads at all until after level 10.',
  'After that, at most one ad per four levels, and never twice within three minutes.',
  'Hints, undo and restart are free, unlimited, and never cost coins.',
  'Watching an ad is always your choice, and saying no costs you nothing.',
  'Coins buy themes. They are never required to finish a level.',
  'Remove Ads is a one-off purchase and is restored whenever you reinstall.',
];

export interface AdState {
  adsRemoved: boolean;
  levelsSinceLastAd: number;
  lastAdAtMs: number;
}

/** Where in the flow an ad is being considered. */
export type AdMoment = 'level-complete' | 'returning-to-menu' | 'level-start';

/**
 * The single gate. Anything that wants to show an interstitial asks here
 * first, so the policy cannot be bypassed by adding a call site.
 */
export function mayShowInterstitial(state: AdState, moment: AdMoment, levelId: number, nowMs: number): boolean {
  if (state.adsRemoved) return false;

  // The two moments the policy rules out outright.
  if (moment === 'level-start' && AD_POLICY.neverDuringPlay) return false;
  if (moment === 'level-complete' && AD_POLICY.neverAfterWin) return false;

  if (levelId <= AD_POLICY.firstAdAfterLevel) return false;
  if (state.levelsSinceLastAd < AD_POLICY.levelsBetweenAds) return false;
  if (nowMs - state.lastAdAtMs < AD_POLICY.secondsBetweenAds * 1000) return false;

  return true;
}

export interface AdProvider {
  showInterstitial(): Promise<void>;
  showRewarded(): Promise<boolean>;
}

/**
 * Stand-in used on the web build and in tests. A native build swaps in an
 * AdMob-backed provider; because every call already goes through
 * `mayShowInterstitial`, the policy travels with it unchanged.
 */
export const noopAdProvider: AdProvider = {
  async showInterstitial() {
    /* no ad network on the web build */
  },
  async showRewarded() {
    // Nothing to watch, so the reward is granted rather than withheld.
    return true;
  },
};
