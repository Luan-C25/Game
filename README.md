# Colour Jam

A colour-sorting sliding block puzzle for phones and the web. Slide every
block out through a gate of its own colour.

It is a deliberate answer to a specific set of complaints about the
hybrid-casual puzzle games currently at the top of the charts: unbeatable
levels, ads after every round, timers that punish you, and hints you have to
pay for. What each of those complaints turned into is written down in
[docs/DESIGN.md](docs/DESIGN.md), and the research behind them is in
[docs/MARKET-RESEARCH.md](docs/MARKET-RESEARCH.md).

**Picking this up after a break?** [docs/STATUS.md](docs/STATUS.md) has where
things stand. **Shipping it?** [docs/PUBLISHING.md](docs/PUBLISHING.md) is the
step-by-step for Google Play.

**Every level can be solved.** Boards are built backwards from a finished
position and then checked by a solver before they ship. The `par` shown next
to your move count is a real solution held on file, not an estimate.

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
```

```bash
npm test           # engine rules, solver, and the shipped level pack
npm run typecheck  # strict TypeScript, no emit
npm run build      # typecheck + production bundle into dist/
```

The production bundle is about **31 kB gzipped** plus a 33 kB font, including all 200 levels.

## How it fits together

```
src/engine/     the rules, and nothing about presentation
  types.ts      blocks, gates, levels, moves
  board.ts      movement and exit rules; the single source of truth for winning
  solver.ts     breadth-first search over a compact board representation
  generator.ts  reverse construction: boards built backwards from a solved state
  rng.ts        seeded PRNG, so a level number always yields the same board

src/game/       everything the player touches
  levels.ts     access to the pre-verified pack
  session.ts    one attempt at one level: moves, undo, hints, winning
  input.ts      drag handling
  render.ts     canvas renderer
  theme.ts      materials: tray, wells, rims, and the fixed tile palette

public/fonts/  Baloo 2 (SIL OFL 1.1) plus its licence text

android/        the Capacitor Android project (targets API 36)
store/          Play Store listing copy, privacy policy, and generated art
  particles.ts  exit sparks and win confetti
  audio.ts      synthesised sound; no audio files ship
  save.ts       defensive localStorage persistence
  ads.ts        the advertising contract, enforced by one gate

scripts/
  build-levels.ts      generates, solves, and replay-verifies the level pack
  make-icons.ts        writes every PNG icon using only Node's zlib
  make-store-assets.mjs captures the feature graphic and store screenshots
```

The engine has no DOM dependency and is tested on its own. The `test/` suite
runs on Node's built-in test runner with native TypeScript support, so testing
needs no extra dependencies.

## Regenerating the level pack

```bash
npm run levels -- 200   # writes src/game/levels.json
```

Each board is generated, solved, and then its solution is **replayed** to
confirm it wins. The script refuses to write a pack if any level fails, so an
unsolvable level cannot reach the repository. Expect roughly five minutes for
200 levels; the cost is paid once at build time rather than on a phone.

## Publishing to Google Play

The Android project is already scaffolded in `android/`, targets API 36 (the
current Play requirement), carries the game's launcher icons, and is wired for
AdMob with Google's test ad units.

**[docs/PUBLISHING.md](docs/PUBLISHING.md) is the full step-by-step**: account
setup, AdMob ids, signing key, building the bundle, the Data Safety answers,
the 12-tester closed test, and release.

```bash
npm run build          # web app + typecheck
npx cap sync android   # copy the build into the Android project
npx cap open android   # build the signed bundle in Android Studio
```

**Costs.** Google Play charges a **one-off $25** developer registration fee
plus identity verification. A *personal* account must also run a closed test
with **12 testers for 14 days** before public release. Everything else in this
project — engine, tooling, art, sound, hosting — is free.

### Ads

`src/game/ads.ts` holds the advertising *policy* and the single gate every ad
call passes through. `src/game/ads-native.ts` is the AdMob implementation, and
it is selected automatically on a device; the web build uses a no-op stub.

Ad units live in `src/game/ad-units.ts` and **default to Google's test units**.
Requesting real ads from a development build generates invalid traffic, so the
live ids are only used in a production build once they have been filled in.

## Deploying the web build

`dist/` is a static folder. Any free static host works - GitHub Pages,
Cloudflare Pages, Netlify. `vite.config.ts` sets `base: './'` so the same
build runs from a subdirectory or from the `file://` origin Capacitor serves
under, with no rebuild.

## Licence

Not yet chosen for the project itself. The code is original and the tile
palette is the Okabe-Ito colour-blind-safe set.

One third-party asset ships with the build: **Baloo 2**, used for headings and
button labels, under the SIL Open Font License 1.1. The licence text is
included at `public/fonts/OFL.txt` as that licence requires, and it permits
commercial use and bundling. Only the latin subset is included (33 kB, one
variable file covering every weight), and it is served from the build rather
than fetched at runtime so the game still works offline.
