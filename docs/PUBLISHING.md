# Publishing to Google Play

Everything you need to do, in order, for the first release. Written for a
**personal** developer account and a **13+** content rating — the two choices
that shape this path.

The code side is already done: the Android project exists, targets API 36,
carries the right icons, and is wired for ads. What is left is mostly account
admin, one build, and a two-week wait.

---

## Before you start

| Thing | Value |
| --- | --- |
| App id (permanent once uploaded) | `com.tilekiln.colourjam` |
| App name | Colour Jam |
| Target audience | 13 and over |
| Account type | Personal |

**Install Android Studio on your laptop**, not your phone — it is a desktop
program (Windows, macOS, Linux). Your phone is only used for testing, plugged
in over USB. Get it from https://developer.android.com/studio and let it
install the Android SDK when it offers.

---

## Step 1 — Create the Play developer account

1. Go to https://play.google.com/console and sign in with the Google account
   you want to own this — it is painful to move an app later, so pick one you
   will keep.
2. Choose **Personal** account type.
3. Pay the **$25 one-off** registration fee.
4. Complete identity verification. You will need a government ID, and it can
   take a couple of days.

Start this first: verification runs in the background while you do everything
else.

## Step 2 — AdMob ids — done

The account exists and the ids are already wired in:

| What | Value | Where it lives |
| --- | --- | --- |
| App ID | `ca-app-pub-5852720871132319~2774752359` | `android/app/src/main/AndroidManifest.xml` |
| Interstitial unit | `ca-app-pub-5852720871132319/8787295239` | `src/game/ad-units.ts` (`LIVE_UNITS`) |
| Rewarded unit | not created | — |

The rewarded unit is absent on purpose: the game has no rewarded placement, so
nothing calls `showRewarded()`. Add the id to `LIVE_UNITS.rewarded` at the same
time as the opt-in reward UI, not before.

An App ID that is under review still issues ad ids and still lets the app
build; what review gates is *fill*. Expect "no fill" in the logs until it
clears, and note that the message is indistinguishable from a genuine no-fill,
so it is not a useful signal either way.

### Keeping your own taps out of the numbers

Development builds cannot request live ads — `useTestAds()` is keyed off
`import.meta.env.PROD`, so `npm run dev` is always test ads. A **release** build
installed on your own phone is a different matter: it requests real ads, and
tapping one is invalid traffic against your own account.

Before you sideload a release build, add that handset under **AdMob → Settings
→ Test devices**. It is then served test ads even from a release build. Your
closed-test testers do not need this — real people using the app normally is
exactly what the account is for.

## Step 3 — Create your signing key

This key proves future updates come from you. Lose it and you can recover via
Play App Signing; leak it and someone else can impersonate your releases.

From the project root:

```bash
keytool -genkey -v -keystore android/colourjam-upload.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias colourjam
```

It asks for a password and some name/organisation fields — the fields do not
matter much, the password does.

Then create `android/keystore.properties`:

```properties
storeFile=colourjam-upload.jks
storePassword=<the password you just set>
keyAlias=colourjam
keyPassword=<the same password, unless you set a different key password>
```

Both files are already in `.gitignore` and must **never** be committed. Back
them up somewhere private — a password manager is ideal.

## Step 4 — Build the release bundle

```bash
npm install
npm run build          # web app + typecheck
npx cap sync android   # copy the web build into the Android project
```

Then either open the project in Android Studio:

```bash
npx cap open android
```

…and use **Build → Generate Signed Bundle / APK → Android App Bundle**, or do
it from the command line:

```bash
cd android && ./gradlew bundleRelease
```

The bundle lands at `android/app/build/outputs/bundle/release/app-release.aab`.

> First build downloads a lot of Gradle and SDK components. Expect it to take
> a while and to need a few GB of disk.

## Step 5 — Test it on your own phone first

Do this before uploading anything.

1. On your phone: **Settings → About phone →** tap **Build number** seven
   times to enable Developer options.
2. In **Developer options**, turn on **USB debugging**.
3. Plug the phone into the laptop and accept the prompt.
4. In Android Studio, pick your phone from the device dropdown and press Run.

Play several levels. What you are checking is the thing no automated test can
tell us: **does dragging a block feel right under a real thumb?** Everything
else has been verified in a browser; this has not.

## Step 6 — Host the privacy policy

Play will not accept the listing without a working public URL.

`store/PRIVACY.md` is written and ready — replace `<YOUR-CONTACT-EMAIL>` with
a real address first. The easiest free host is GitHub Pages:

1. Put the file in a public repository as `index.md`
2. **Settings → Pages →** deploy from the `main` branch
3. Use the resulting `https://<you>.github.io/<repo>/` URL in Play Console

## Step 7 — Create the app in Play Console

**All apps → Create app.** Name it Colour Jam, pick English, choose **Game**
and **Free**.

Then work through the **Dashboard** tasks. The answers you need:

| Question | Answer |
| --- | --- |
| Privacy policy | The URL from step 6 |
| App access | All functionality available without restrictions |
| Ads | **Yes**, the app contains ads |
| Content rating | Complete the questionnaire — no violence, no user content, no data sharing. It will come back at roughly PEGI 3 / ESRB Everyone |
| Target audience | **13+**. Do not tick any age band below 13, or Families policy applies and ad revenue drops |
| News app | No |
| Data safety | See the next section |
| Government app | No |
| Financial features | None |

### Data safety answers

These must be truthful, and for this app they are unusually simple because the
game itself collects nothing. The only data collected is by the AdMob SDK.

- **Does your app collect or share any of the required user data types?** Yes
- **Data type:** Device or other IDs → *Advertising ID*
- **Collected or shared?** Both collected and shared
- **Processed ephemerally?** No
- **Required or optional?** Required
- **Purpose:** Advertising or marketing
- **Is data encrypted in transit?** Yes
- **Can users request deletion?** Yes — via device advertising ID reset

Everything else — name, email, location, photos, files, contacts, app
activity, crash logs — is **not collected**. The game stores progress only in
local storage on the device, and Play does not count on-device-only storage as
collection.

## Step 8 — Fill in the store listing

Everything is written for you in `store/LISTING.md`: app name, short
description, full description, release notes, category and tags. Copy and
paste.

Upload the graphics from `store/`:

- `icon-512.png` — app icon
- `feature-graphic.png` — feature graphic
- `screenshot-1-menu.png` through `screenshot-6-clay-theme.png` — phone
  screenshots

## Step 9 — The closed test (the two-week part)

Because this is a personal account, you must run a closed test with **12
testers, opted in continuously for 14 days**, before you can apply for
production access.

1. **Testing → Closed testing → Create track**
2. Upload the `.aab` from step 4
3. Create an email list with **at least 12 Gmail addresses**
4. Share the opt-in link with them

Things that make this fail, all of which are avoidable:

- **Fewer than 12** testers at any point. Get 14 or 15 — people drop out.
- **The clock restarts** if someone leaves the list. Do not edit the list once
  the count is running.
- **Testers who never open the app.** Since 2026 Google checks for genuine
  use, so a friend who accepts and forgets does not count. Ask them to
  actually play a few levels, more than once across the fortnight.
- **Wrong Google account.** They must opt in with the same account signed into
  their Play Store.

After 14 continuous days, **Dashboard → Apply for production access**. Review
is usually hours to a few days.

## Step 10 — Release to production

1. **Production → Create new release**
2. Upload the same (or a newer) `.aab`
3. Paste the release notes from `store/LISTING.md`
4. Roll out — consider a staged rollout at 20% for the first day

First reviews often take a few days. After that, updates are usually much
faster.

---

## Updating later

Bump `versionCode` (must increase every upload) and `versionName` in
`android/app/build.gradle`, then:

```bash
npm run build && npx cap sync android && cd android && ./gradlew bundleRelease
```

Play rejects a bundle whose `versionCode` is not higher than the last one — it
is the single most common upload error.

## Things worth knowing

- **API level.** Google required API 36 from 31 August 2026 and this project
  targets it. The requirement moves roughly every August; when it does, the
  fix is normally upgrading Capacitor.
- **The app id is permanent.** `com.tilekiln.colourjam` cannot be changed once
  anything is uploaded. Future games go under the same `com.tilekiln.` prefix.
- **Keep the keystore.** Backed up, private, and not in git.
