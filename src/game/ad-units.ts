/**
 * AdMob unit ids.
 *
 * Development and debug builds always serve Google's own public test units.
 * Serving *real* ad units while testing generates invalid traffic, which is
 * the fastest way to get an AdMob account suspended, so useTestAds() makes
 * that impossible rather than merely discouraged.
 *
 * A release build on your own handset, whether installed from a Play test
 * track or by hand, still requests live ads. Register that handset under
 * AdMob -> Settings -> Test devices so it is served test ads anyway.
 *
 * @see https://developers.google.com/admob/android/test-ads
 */

import { Capacitor } from '@capacitor/core';

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
 * Test ads everywhere except a release build with real ids configured.
 *
 * `import.meta.env.PROD` is false for `npm run dev`, but every Android build,
 * debug included, bundles the production web build. `Capacitor.DEBUG` is set
 * by Android from the APK's debuggable flag, so the debug builds installed
 * over USB for testing also get test units; only a release build from Play
 * (or a sideloaded release) requests live ads.
 */
export function useTestAds(): boolean {
  return !import.meta.env.PROD || Capacitor.DEBUG === true || !LIVE_UNITS.interstitial;
}

export function adUnits(): AdUnits {
  if (useTestAds()) return TEST_UNITS;
  return {
    interstitial: LIVE_UNITS.interstitial || TEST_UNITS.interstitial,
    rewarded: LIVE_UNITS.rewarded || TEST_UNITS.rewarded,
  };
}
