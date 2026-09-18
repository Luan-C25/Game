/**
 * AdMob-backed ad provider for the Android build.
 *
 * The game's advertising *policy* lives in ads.ts and is enforced there; this
 * file only knows how to put an ad on screen once that policy has already
 * said yes. Swapping ad networks should never require touching the policy.
 *
 * Two things here are legal requirements rather than preferences:
 *
 * - **Consent.** In the EEA and UK, Google's User Messaging Platform has to
 *   run *before* any ad request. `canRequestAds` is the gate; if it is false
 *   we simply never show an ad rather than showing one anyway.
 * - **Content rating.** The game is rated for 13+, so ads are capped at the
 *   Teen rating. It is not child-directed, so the COPPA and under-age-of-
 *   consent flags are deliberately left off - setting them would cut revenue
 *   for an audience the app does not target.
 */

import { AdMob, AdmobConsentStatus, MaxAdContentRating } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

import type { AdProvider } from './ads.ts';
import { adUnits, useTestAds } from './ad-units.ts';

let ready = false;
let mayRequestAds = false;

/**
 * Runs the consent flow and starts the SDK. Safe to call more than once and
 * safe to call on the web, where it does nothing.
 */
export async function initialiseAds(): Promise<void> {
  if (ready || !Capacitor.isNativePlatform()) return;

  try {
    const consent = await AdMob.requestConsentInfo();

    if (consent.isConsentFormAvailable && consent.status === AdmobConsentStatus.REQUIRED) {
      const result = await AdMob.showConsentForm();
      mayRequestAds = result.canRequestAds;
    } else {
      mayRequestAds = consent.canRequestAds;
    }

    await AdMob.initialize({
      initializeForTesting: useTestAds(),
      maxAdContentRating: MaxAdContentRating.Teen,
    });

    ready = true;
  } catch (error) {
    // A failed consent or init must never block play. The game simply runs
    // without ads until the next launch.
    console.warn('AdMob unavailable; continuing without ads', error);
    mayRequestAds = false;
  }
}

export const admobProvider: AdProvider = {
  async showInterstitial(): Promise<void> {
    if (!ready || !mayRequestAds) return;
    try {
      await AdMob.prepareInterstitial({ adId: adUnits().interstitial, isTesting: useTestAds() });
      await AdMob.showInterstitial();
    } catch (error) {
      // A missed ad is not worth interrupting anyone over.
      console.warn('interstitial failed', error);
    }
  },

  async showRewarded(): Promise<boolean> {
    if (!ready || !mayRequestAds) {
      // Nothing could be shown, so the reward is granted rather than withheld:
      // the player opted in and should not be punished for our plumbing.
      return true;
    }
    try {
      await AdMob.prepareRewardVideoAd({ adId: adUnits().rewarded, isTesting: useTestAds() });
      const reward = await AdMob.showRewardVideoAd();
      return Boolean(reward);
    } catch (error) {
      console.warn('rewarded ad failed', error);
      return true;
    }
  },
};

/** True when the native ad provider should be used instead of the stub. */
export function adsAvailable(): boolean {
  return Capacitor.isNativePlatform();
}
