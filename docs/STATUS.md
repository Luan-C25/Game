# Status — 22 October 2026 — RESUMED, Play route

Where the project stands, and what a cold start needs to know. Sessions run in
an ephemeral container, so this file is the handover.

## Why it was paused, and why it is back

It was paused on 21 September over Play's closed-test rule for personal
accounts: **12 testers for 14 continuous days**, genuine use checked. The
developer account was already paid for, so the Play route is back on, with
testers to be recruited on Reddit. The rule itself is unchanged since it
dropped from 20 to 12 in December 2024.

## Audit against the mobile-game playbook (22 October)

`.claude/skills/mobile-game-dev/` now carries an MIT-licensed playbook from
someone who shipped seven Canvas-in-Capacitor games, including a Block Jam, on
a low-end Android phone. Checking this codebase against it found:

| # | Finding | Severity |
| --- | --- | --- |
| 1 | **Haptics never fire on Android.** `navigator.vibrate` needs the `VIBRATE` permission, which the manifest does not declare, so the setting defaults on and does nothing. `@capacitor/haptics` declares it and gives proper impact styles. | Bug |
| 2 | **The board redraws every frame, forever**, including `shadowBlur` inner shadows on the tray and every gate slot. On a weak GPU that is the jank, heat and battery drain the playbook measured. Static layers belong in a cached offscreen canvas, with redraws only while something moves. | Performance |
| 3 | **`devicePixelRatio` is uncapped.** A 3.5x phone pushes about 3x the pixels of a 2x cap for no visible gain. | Performance |
| 4 | **`getBoundingClientRect()` runs on every pointer event** in `input.ts`. Cache it per gesture. | Minor |
| 5 | **The name collides.** "Color Jam" (`com.mobsmile.colorjam`) and "Color Jam Block Puzzle" — the same mechanic — are already on Play. The display name can change later; the package id `com.tilekiln.colourjam` cannot once uploaded. | Decision |
| 6 | **Edge-to-edge is unverified.** `targetSdk 36` enforces it, and the playbook found Capacitor 8 reporting a 0 px bottom inset on Android 10, putting buttons under the navigation bar. Needs a real-device check. | Risk |
| 7 | **System text size untested.** WebView scales CSS text with the phone's font setting; the menu has not been checked at 1.15x or 1.3x. | Risk |

### Follow-up on the laptop (22 October)

- **1 fixed.** `@capacitor/haptics` replaces `navigator.vibrate`: a light
  impact when a block exits, a success notification on a win.
- **2 fixed.** Tray, floor and gates paint once per level into a cached
  layer; frames are requested only on change and keep running only while
  sparks, confetti or the hint pulse move. Measured at phone size: zero
  frames while idle, and the cached board is pixel-identical to before.
- **3 fixed.** `canvasScale()` in `render.ts` caps the ratio at 2.
- **4 was a misreading, no change.** `getBoundingClientRect()` runs only in
  `toCell()`, which only `onPointerDown` calls; moves work from pointer
  deltas. That is already once per gesture, as the playbook asks.
- **5 settled: the game is now Glazeway**, package id
  `com.tilekiln.glazeway`, store title "Glazeway: Colour Block Puzzle". A Play
  search on 22 October found no app by that name. Menu, manifest, Android
  strings, listing, privacy policy and feature graphic are renamed; the
  internal save key keeps the old name so saves survive.

### On the owner's phone (22 October)

Galaxy S26 Ultra (SM-S948B), Android 17, gesture navigation, debug build over
USB. Samsung's Auto Blocker blocks USB debugging and has to be switched off
first.

- **Drag feel: good.** The owner played levels 1–9: blocks follow the thumb
  smoothly and go where intended, and the exit and win haptics both fire.
- **6 passed.** Read over DevTools, the WebView gets real insets (40 px top,
  15 px bottom), so Capacitor 8's 0 px bug does not occur here; the controls
  clear the gesture bar. Android 10 itself is still untested. The 2x
  resolution cap holds on the 2.81x screen.
- **7 found a bug, fixed.** At the largest system text (font scale 2.0) the
  one-word "Glazeway" title ran off the screen. `fitTitle()` in `main.ts`
  shrinks it in em to fit; re-measured on the phone at 2.0 it fits exactly,
  and the menu's last line ends above the gesture bar. The game, Settings
  and Promises screens were already fine at 2.0 (the long ones scroll).

## Where things are

Branch `claude/game-research-replication-s2an9t`, open as draft **PR #1**
(no CI configured). It holds everything so far: market research, the game,
three presentation passes, the Android project, store assets and the AdMob
ids. `main` has none of it yet.

The game is **playable and verified**. Levels 1–3 have been solved end to end
through real drag gestures in a headless browser at phone size, 20 tests pass,
and the build is about 31 kB gzipped plus a 33 kB font, with all 200 levels
included and no runtime dependencies.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # engine rules, solver, and every shipped level
npm run build      # typecheck + production bundle
```

## What is done

- **Engine** — movement and exit rules, a compact breadth-first solver, and a
  generator that builds boards *backwards* from a solved position so an
  unsolvable level cannot exist. 200 levels generated, solved, and
  replay-verified at build time.
- **Game layer** — continuous drag, free unlimited undo/hints/restart, a
  written ad policy enforced by one gate, defensive persistence, synthesised
  audio, four themes.
- **Presentation** — the board as a moulded tray with grooved channels and
  extruded tiles; the menu as juicy capsules with a dominant Play button; the
  header and controls as raised badges, a recessed readout, and caps that
  physically travel.

The reasoning behind each design rule, and the player complaint it answers,
is in [DESIGN.md](./DESIGN.md). The research that picked this game is in
[MARKET-RESEARCH.md](./MARKET-RESEARCH.md).

## Decisions now settled

- **Name:** Glazeway (was Colour Jam).
- **App id:** `com.tilekiln.glazeway`. Permanent once anything is uploaded to
  Play. Future games share the `com.tilekiln.` prefix.
- **Target audience:** 13+. Deliberately *not* child-directed, which keeps the
  app out of Families policy and keeps ad revenue per impression intact.
- **Account type:** personal — so the 12-tester, 14-day closed test applies.
  Testers are being recruited on Reddit.
- **Project licence:** still not chosen. (The bundled font is settled: Baloo 2
  under SIL OFL 1.1, licence text shipped at `public/fonts/OFL.txt`.)

## Android and store: done

- `android/` holds the Capacitor 8 project, targeting **API 36** — mandatory
  for new apps since 31 August 2026 — with the game's own launcher icons at
  every density, an adaptive foreground, and the screen locked to portrait.
- AdMob is wired through `src/game/ads-native.ts`, including the EEA/UK
  consent flow. The real app id and both unit ids are configured; development
  builds still serve Google's test units, enforced by `useTestAds()` rather
  than by remembering to.
- The **rewarded** unit exists but no placement calls `showRewarded()`, so it
  will report zero impressions. That is expected, not a broken integration.
- Release signing reads from `android/keystore.properties`, which is
  git-ignored along with the keystore itself.
- `store/` holds the listing copy, the privacy policy, the 512px icon, the
  1024x500 feature graphic and six 1080x1920 screenshots — all regenerable.

## How far the laptop toolchain got

The repo is cloned on the owner's Windows laptop at
`C:\Users\TEST\Documents\LuanOS\Projects\colourjam`, on this branch. Checked
22 October: Node 25, npm 11, Git 2.49, and the Android SDK at
`%LOCALAPPDATA%\Android\Sdk` (platform 37 only; Gradle fetches 36 itself).
**Capacitor 8 needs JDK 21.** The JDK on `PATH` is 17 (too old) and Android
Studio's bundled one is 25 (too new for Gradle 8.14), so Temurin 21 is needed
and `JAVA_HOME` must point at it for builds. The signing key had not been
generated when work stopped. [PUBLISHING.md](./PUBLISHING.md) carries both bash and PowerShell
forms of every command from that point on.

**First builds done 22 October.** `assembleDebug` and `bundleRelease` both
pass on the laptop with `JAVA_HOME` set to JDK 21 (Gradle fetched platform 36
and build-tools 35 itself). The upload key is `android/glazeway-upload.jks`,
alias `glazeway`; the signed `app-release.aab` is about 6.6 MB, and
`jarsigner -verify` confirms the signature. The merged manifest has the
`VIBRATE` permission.

## Play Console (23 October)

Done by the owner in Play Console, step by step:

- **App created**: "Glazeway: Colour Block Puzzle", `com.tilekiln.glazeway`,
  English (Australia), Game, Free, Play App Signing accepted (Google holds the
  app signing key; `glazeway-upload.jks` is the upload key).
- **Privacy policy** live at https://luan-c25.github.io/glazeway-privacy/ (repo
  `Luan-C25/glazeway-privacy`, a copy of `store/PRIVACY.md`; keep them in step).
  Contact email: luanchild15@gmail.com.
- **App content**: no restricted access; contains ads; content rating
  questionnaire all No; target audience 13–15, 16–17, 18+ only; Data safety as
  in PUBLISHING.md (four AdMob data types); advertising ID used for
  advertising, analytics and fraud prevention; government, financial, health
  and news all No.
- **Store settings**: Puzzle; tags Block puzzle, Sliding puzzle, Logic puzzle,
  Brain teaser, Casual; external marketing on.
- **Main store listing**: text from `store/LISTING.md`, icon, feature graphic
  and six screenshots. No AI translations (the game is English only). Icon and
  feature graphic were labelled AI-generated; screenshots are real captures.
- **Closed testing**: all countries; testers are the Google Groups
  `glazeway-testers@googlegroups.com` (anyone can join, members private) and
  `testers-community@googlegroups.com` (r/TestersCommunity's shared group);
  feedback to luanchild15@gmail.com. Release `1 (1.0)` created from the 23
  October bundle, waiting on Google's review.
- **Not yet asked:** EU trader status. When Play Console asks, check what it
  will display before answering; leaving EU countries out is the fallback if
  it wants the home address shown.

Recruitment posts are drafted in `marketing/reddit-post-v1.0-closed-test.md`,
to go up once the release is approved.

## Next steps

1. ~~Fix findings 1–4 above.~~ Done 22 October, see the follow-up.
2. ~~Settle the name (finding 5).~~ Glazeway, 22 October.
3. ~~Build on the laptop and check findings 6–7 on a real phone.~~ Done 22
   October; signed `app-release.aab` built (rebuild it after any code change).
4. Start the 14-day closed test as early as possible; it is the long pole.
   Set up 23 October; once Google approves release 1, post the Reddit drafts
   and keep 12+ testers opted in for 14 days, then apply for production.
5. Before installing the Play build on the owner's phone, register it as an
   AdMob test device. Rename the AdMob app from Colour Jam to Glazeway.

## Worth knowing before changing things

- `npm run levels -- 200` regenerates the pack. It takes roughly five minutes
  and refuses to write if any level fails verification. Level data is
  deterministic from the level number, so regenerating without changing the
  generator produces identical boards.
- The difficulty curve **plateaus at level 91** on purpose. That is the
  anti-"becomes unbeatable" measure, not an oversight.
- Tile colours are fixed across every theme because they carry the rules. A
  theme restyles the tray, the light and the chrome only.
