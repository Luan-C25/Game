/**
 * AdMob unit ids.
 *
 * Development always serves Google's own public test units. Serving *real* ad
 * units during development generates invalid traffic, which is the fastest way
 * to get an AdMob account suspended, so useTestAds() makes that impossible
 * rather than merely discouraged.
 *
 * Note that a release build you install on your own handset by hand is still a
 * release build, and will request live ads. Register that handset under AdMob
 * -> Settings -> Test devices so it is served test ads anyway.
 *
 * @see https://developers.google.com/admob/android/test-ads
 */

export interface AdUnits {
  interstitial: string;
  rewarded: string;
}

/** Google's public test units. Always safe; never earn anything. */
export const TEST_UNITS: AdUnits = {
  interstitial: 'ca-app-pub-3940256099942544/1033173712',
  rewarded: 'ca-app-pub-3940256099942544/5224354917',
};

/**
 * The real units for this app.
 *
 * The rewarded unit is configured but not yet reachable: no placement in the
 * game calls showRewarded(), so it will report zero impressions until an
 * opt-in reward button exists. That is expected, not a misconfiguration.
 */
export const LIVE_UNITS: AdUnits = {
  interstitial: 'ca-app-pub-5852720871132319/8787295239',
  rewarded: 'ca-app-pub-5852720871132319/5147433120',
};

/**
 * Test ads everywhere except a production build with real ids configured.
 * `import.meta.env.PROD` is false for `npm run dev`, so a development session
 * can never accidentally request a live ad.
 */
export function useTestAds(): boolean {
  return !import.meta.env.PROD || !LIVE_UNITS.interstitial;
}

export function adUnits(): AdUnits {
  if (useTestAds()) return TEST_UNITS;
  return {
    interstitial: LIVE_UNITS.interstitial || TEST_UNITS.interstitial,
    rewarded: LIVE_UNITS.rewarded || TEST_UNITS.rewarded,
  };
}
