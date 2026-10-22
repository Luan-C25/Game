# Colour Jam

A colour-sorting sliding-block puzzle (a Color Block Jam remake) for Android
first, then the web. TypeScript + Vite, Canvas rendering, wrapped for Android
with Capacitor 8. Goal: publish on Google Play and earn ad revenue, at $0 cost.

## Read first

- `docs/STATUS.md`: where things stand, the latest audit findings, next steps.
- `docs/PUBLISHING.md`: the Play release steps, with bash and PowerShell forms.
- `docs/DESIGN.md`: every design rule, and the player complaint behind it.
- `docs/MARKET-RESEARCH.md`: why this game was picked.
- `.claude/skills/mobile-game-dev/`: a vendored playbook for Canvas-in-Capacitor
  games on low-end Android. Follow it; `references/` has a Block Jam case study.

## Commands

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # rules, solver, all 200 shipped levels replayed
npm run typecheck
npm run build        # typecheck + production bundle into dist/
npx cap sync android # copy the web build into the Android project
```

Run `npm test` and `npm run typecheck` before every commit.

## The owner

- Not a professional developer. Give exact copy-paste steps, one at a time,
  and explain errors plainly.
- Works on **Windows in PowerShell**: commands go on one line (a trailing `\`
  is not a line continuation), and Gradle is `.\gradlew`, not `./gradlew`.
- Repo is at `C:\Users\TEST\colourjam`; Android Studio and the JDK are installed.
- Will recruit the 12 closed-test testers on Reddit. Their
  `writing-reddit-launch-posts` skill is for those posts.

## Decisions already made (don't relitigate)

- **Audience 13+**, not child-directed. This keeps the app out of Families
  policy and keeps ad revenue up. COPPA / under-age ad flags stay off.
- **Personal Play developer account**, so the 12-tester / 14-day closed test
  applies.
- **Package id `com.tilekiln.colourjam`**: no personal name, and `com.tilekiln.`
  is the namespace for future games. Permanent after the first upload.
- **Monetisation**: interstitials under the strict `AD_POLICY` in
  `src/game/ads.ts`, plus opt-in rewarded ads. No timers, lives, energy or
  paid hints; free unlimited undo and hints are the pitch.
- **Difficulty plateaus at level 91** on purpose, against "levels become
  unbeatable" complaints.

## Look and feel: the owner's standing preferences

- They rejected an earlier pass as "way too much like it was made by AI". The
  tells were gradients standing in for depth, generic soft cards and
  identical stacked buttons. Build depth from real geometry: extruded sides,
  inset rims, grooves.
- **Board**: a premium, tactile physical toy (glazed tiles in a moulded slate
  tray). **No random sparkles, stars or messy textures.**
- **Menu**: "juicy, bubble-gummy": glossy capsules with deep 3D undersides, a
  chunky rounded display font (Baloo 2), and a Play button twice the size of
  anything else.
- Tile colours are the Okabe-Ito palette and stay **fixed across every
  theme**, because they carry the rules. Themes restyle only the tray, light
  and chrome.

## Hard rules

- **Never commit** `android/keystore.properties`, `*.jks` or `*.keystore`.
  They are git-ignored; keep it that way. Losing the upload key is recoverable
  through Play App Signing, but leaking it is not.
- **Never request live ads in development.** `useTestAds()` in
  `src/game/ad-units.ts` serves Google's test units outside production builds.
  Don't weaken it. Before sideloading a *release* build, the owner's phone must
  be registered as an AdMob test device.
- **Don't hand-edit `src/game/levels.json`.** Regenerate it with
  `npm run levels -- 200`. Once shipped, saves point at level numbers, so the
  pack is append-only.
- Tests run under Node 22's built-in TypeScript stripping, so **no TS
  parameter properties** (`constructor(private x)`) and no enums in code that
  tests import.
- One source of truth for winning: `src/engine/board.ts`.

## Git

Work continues on branch `claude/game-research-replication-s2an9t` (draft
PR #1 on `luan-c25/game`). Commit in small, verified steps with descriptive
messages, and push when a step is complete.

## Open decisions (ask the owner)

1. **The name.** "Color Jam" and "Color Jam Block Puzzle" (the same mechanic)
   already exist on Play. Settle it before the first upload.
2. **Project licence**: not chosen yet.

## Parked ideas (not started)

- From the Block Jam case study: replay the optimal solution after a win (the
  par solution is already known), real CC0 sounds (Kenney) instead of
  synthesised ones, colour-blind shapes on by default, a shareable image of
  each cleared level.
- A rewarded-ad placement: the unit is configured, but nothing calls
  `showRewarded()` yet.
- A parallel web release: CrazyGames (non-exclusive, Basic Launch needs no
  SDK) and self-hosting with AdSense H5 Games Ads. Needs a desktop/landscape
  layout first.
