# Status — 18 September 2026

Where the project stands at the end of the first working session, and what a
cold start needs to know. Sessions run in an ephemeral container, so this file
is the handover.

## Where things are

Branch `claude/game-research-replication-s2an9t`, open as draft **PR #1**
(clean, mergeable, no CI configured). Six commits: market research, the game,
then three presentation passes.

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

- **App id:** `com.tilekiln.colourjam`. Permanent once anything is uploaded to
  Play. Future games share the `com.tilekiln.` prefix.
- **Target audience:** 13+. Deliberately *not* child-directed, which keeps the
  app out of Families policy and keeps ad revenue per impression intact.
- **Account type:** personal — so the 12-tester, 14-day closed test applies.
- **Project licence:** still not chosen. (The bundled font is settled: Baloo 2
  under SIL OFL 1.1, licence text shipped at `public/fonts/OFL.txt`.)

## Android and store: done

- `android/` holds the Capacitor 8 project, targeting **API 36** — mandatory
  for new apps since 31 August 2026 — with the game's own launcher icons at
  every density, an adaptive foreground, and the screen locked to portrait.
- AdMob is wired through `src/game/ads-native.ts`, including the EEA/UK
  consent flow, and defaults to Google's **test** ad units.
- Release signing reads from `android/keystore.properties`, which is
  git-ignored along with the keystore itself.
- `store/` holds the listing copy, the privacy policy, the 512px icon, the
  1024x500 feature graphic and six 1080x1920 screenshots — all regenerable.

## Next steps, roughly in order

1. **Play it on a real handset.** Drag feel on physical hardware is still the
   one thing no headless check can answer, and it is the mechanic the whole
   game rests on.
2. **Work through [PUBLISHING.md](./PUBLISHING.md)** — account, AdMob ids,
   signing key, bundle, listing, closed test.
3. **Start the 14-day closed test early.** It is the long pole; everything
   else can be finished while it runs.

## Worth knowing before changing things

- `npm run levels -- 200` regenerates the pack. It takes roughly five minutes
  and refuses to write if any level fails verification. Level data is
  deterministic from the level number, so regenerating without changing the
  generator produces identical boards.
- The difficulty curve **plateaus at level 91** on purpose. That is the
  anti-"becomes unbeatable" measure, not an oversight.
- Tile colours are fixed across every theme because they carry the rules. A
  theme restyles the tray, the light and the chrome only.
