# Status — 10 September 2026

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

## Open decisions — these need the owner, not the code

1. **App id** is still the placeholder `com.example.colourjam` in
   `capacitor.config.json`. Needs a real one before any Play upload.
2. **Project licence** not chosen. (The bundled font is settled: Baloo 2 under
   SIL OFL 1.1, licence text shipped at `public/fonts/OFL.txt`.)
3. **Google Play account type.** A personal account requires a closed test
   with 12 testers for 14 days before public release; an organisation account
   does not. This is a scheduling decision worth making early.

## Next steps, roughly in order

1. **Play it on a real handset.** Drag feel on physical hardware is the one
   thing the headless checks cannot answer, and it is the mechanic the whole
   game rests on.
2. **Wrap for Android** — `npx cap add android`, which needs the Android SDK.
   The native project is deliberately not committed. See the README.
3. **Wire ads and purchases.** Both are stubbed behind small interfaces in
   `src/game/ads.ts` and the two Settings call sites; swapping in AdMob and
   Play Billing should not touch game logic, and the ad policy travels with
   the provider.
4. **Store listing** — screenshots, description, and the honest hooks the
   research pointed at: no timers, no lives, free hints, every level provably
   solvable.

## Worth knowing before changing things

- `npm run levels -- 200` regenerates the pack. It takes roughly five minutes
  and refuses to write if any level fails verification. Level data is
  deterministic from the level number, so regenerating without changing the
  generator produces identical boards.
- The difficulty curve **plateaus at level 91** on purpose. That is the
  anti-"becomes unbeatable" measure, not an oversight.
- Tile colours are fixed across every theme because they carry the rules. A
  theme restyles the tray, the light and the chrome only.
