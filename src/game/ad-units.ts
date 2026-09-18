/**
 * AdMob unit ids.
 *
 * The values below are Google's own public test units. They must stay the
 * default: serving *real* ad units during development generates invalid
 * traffic, which is the fastest way to get an AdMob account suspended.
 *
 * To go live, paste the real ids from your AdMob account into LIVE_UNITS and
 * set the app id in android/app/src/main/AndroidManifest.xml. Nothing else
 * needs to change.
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
 * Your real units. Leave empty until the AdMob account exists - an empty
 * string here falls back to the test unit rather than making a malformed
 * request.
 */
export const LIVE_UNITS: AdUnits = {
  interstitial: '',
  rewarded: '',
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
