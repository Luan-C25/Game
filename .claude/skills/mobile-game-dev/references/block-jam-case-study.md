# Bauhaus Blocks: Color Escape (game 08)

Spec: `games/08-block-slide-jam.md`. Engine copied from `quietsudoku/` (Android project, saves, sound and haptics, modal stack, device tools); the look, the rules and every screen were written from scratch.

## Day-one decisions
| Decision | Value | Why |
|---|---|---|
| Name | **Bauhaus Blocks: Color Escape** | The spec's "Block Slide Jam" is taken (**Block Slide Jam : Color puzzle**), and so are **Slide Jam: Block Puzzle** and **Color Block Out**. Free (2026-10-20): Bauhaus Blocks, Primary Jam, Block Atelier, Gallery Jam. Chosen by the owner |
| Package id | `app.bauhausblocks.game` (**final**) | |
| Upload key | not made yet | Make `android/bauhausblocks-upload.jks` + `keystore.properties` before release |
| Style | **Bauhaus** (from the owner's list): the 1923 exhibition poster. Red, yellow, blue and black on off-white; circles, squares, triangles; thick black bars; an asymmetric home composition; Jost (a free Futura) in heavy capitals, some set vertically. Flat: no shadows, no gradients, no rounded corners except true circles | A colour-block puzzle *is* Bauhaus; unlike every earlier game |
| Colour and shape | Every colour has its Kandinsky shape (yellow triangle, red square, blue circle; green half-disc, orange diamond) on blocks and gates | The game never relies on colour alone (colour-blind players) |
| Board | DOM: one element per block moved by `transform`; cells a static CSS grid; gates are coloured stretches of the black rim | Compositor-only motion on the P22 |
| Levels | Pre-built into `www/levels.js` by `tools/make-levels.mjs` with each level's proven-shortest solution | The phone never searches |

## Outside resources used
| Resource | Licence | Use |
|---|---|---|
| **Kenney** Impact Sounds (wood impacts: a block stopping, a bump) and Interface Sounds (a drop for a block leaving, a click, a tick for the dial) | CC0 | All sounds except a short synth triad on a win |
| **Fontsource**: Jost (variable) | OFL | All text |
| **@capacitor/filesystem**, **@capacitor/share** (official) | MIT | Write a poster PNG to the cache, hand it to the share sheet |
| Kandinsky's 1923 Bauhaus questionnaire (yellow triangle, red square, blue circle) | idea | The colour shapes |

## Selling points (approved by the owner 2026-10-20, all four)
- **Calm or timed.** Calm (the default): no clock, stars for moves (3 at par, 2 within 1.5× par). Timed: 30 s + 5 s per par move, a red bar that shrinks by `transform`; when it runs out, +30 s once, start again, or finish it in calm mode.
- **Watch the best way.** Every level ships its shortest solution (A*, proven optimal), so the HUD shows "Best 11" from the start and, after a win, the solution replays itself on the starting board, 520 ms per move, then the card returns.
- **A rewind dial.** A native `<input type=range>` styled as a black bar with a red disc. Dragging it scrubs through the moves made; a new move from an earlier point replaces the undone ones. Restart sits next to it.
- **A poster for every level.** Each cleared level's starting board is drawn as a Bauhaus poster (a disc in the first block's colour, the blocks and gates without the grid, a huge number, "Composition in red and blue") on a canvas; the gallery shows them all, and a tap shares one as a 1080×1350 PNG.

## How it works
- **Rules** (`logic.js`, pure, tested): a swiped block slides until something stops it. At the edge, it leaves if a gate of its colour on that side covers its whole width along that side; otherwise it stops. One-axis blocks (a black bar with arrowheads) only slide along their bar.
- **Solver**: plain breadth-first search was hopeless: with 7 blocks it found nothing within 150,000 states. **A\*** with an admissible bound (1 move per block that could leave in one slide on an empty board, otherwise 2; other blocks can only get in the way of a straight run out) explores only the moves beyond that bound: 4-block levels went from 295 ms to 4 ms, and 7-block levels from 0 of 60 solved to 58 of 60 (median shortest solution 12 moves, 117 ms on average).
- **Generator**: random gates (one or two per colour), walls, and polyomino blocks of 1-4 cells, each coloured after a gate wide enough for it. **Every block must be able to leave on a board with only the walls** (`canLeaveAlone`); without that check a one-axis block could never change rows and almost no level with one was solvable (6 of 60 with 8 blocks; 56 of 60 after).
- **Curation** (`tools/make-levels.mjs`): each slot asks for its board size, colours, blocks, walls and one-axis blocks; a level is kept only if it is solvable, needs enough moves beyond one per block (2 rising to 6, plus 2 or 4 on hard and very hard levels), and a careless player (half the time it takes an exit) rarely clears it within twice the par. The first two levels are pure exits; level 3 needs one extra move.
- **The curve**, measured on the shipped file:

| Levels | Blocks (avg) | Par (avg, max) | One-axis | Walls |
|---|---|---|---|---|
| 1-3 | 4.0 | 4.3, 6 | 0 | 0 |
| 4-20 | 6.1 | 10.4, 18 | 0 | 0 |
| 21-60 | 7.3 | 14.0, 20 | 0.8 | 1.5 |
| 61-150 | 8.8 | 16.8, 27 | 2.0 | 2.0 |
| 151-300 | 9.8 | 18.3, 28 | 3.0 | 2.9 |

  Walls first appear at level 21, one-axis blocks at 31, each with a one-line tip.
- **Parallel build**: each level's seeds come from its number, so 11 worker processes (one level in every 11 each, which balances easy and hard slots) give the same file as a one-by-one build. 300 levels took 509 s; the one-by-one build had reached only 150 in 413 s.

## Measurements (on the phone, font scale 1.15)
| What | Result |
|---|---|
| Idle board | 59.3 fps |
| 6 moves 380 ms apart (slides and exits) | 60 fps (worst frame 17 ms) |
| 8 moves on level 300, the biggest board | 59.8 fps |
| Scrubbing the rewind dial | 60 fps |
| Watching the best way | 59.8 fps |
| `npm test` | 300 levels replay their solution to a clear board; A* re-solves 24 random levels and matches every par (worst 1.8 s); 17.5 s in all |
| 1.3× text | every screen fits after the fixes below |
| Device regression | 8/8 (`node tools/regress.mjs`): level 1 with real swipes, the win saved at once with its poster, a real drag of the rewind dial, watching the best way, timed mode (+30 s once, then calm), resume, back button, sharing a poster |

## Bugs found by looking and testing
- **Blocks with one axis made levels unsolvable** (see Generator). Found because the solve rate fell from 58 of 60 to 6 of 60 when they were switched on.
- **The home poster was laid out in pixels**, so on a 740 px screen the shapes ran over the title and buttons. It is now in proportions of its own box, with the title in the flow at its foot.
- **Vertical text is as tall as it is long**: the "Weimar · Dessau" line in the header made the header 230 px tall and pushed the buttons off a 640 px screen. It is positioned out of the flow now, and shorter.
- **At 1.3× text** the tagline wrapped onto "BLOCKS", "GALLERY" was clipped, and "2 posters" wrapped in the gallery header. All fixed.
- **A one-axis bar on an L-shaped block crossed the empty corner of its box.** It spans only the block's own cells.
- **The store-screenshot crop from Quiet Sudoku cut off this game's buttons**: here the navigation bar is hidden (bottom inset 0), so cropping 96 px off the bottom cut into content. The crop now takes only the status bar (80 px) off the top, then pads the sides to 744×1488 to stay within Play's 2:1 limit. Read the insets before cropping.
- **A wrong test expectation**: I asserted a 2-tall block could leave through a 1-cell gate by moving first; it never can. The test was wrong, not the rule.
- **A sed replacement containing `#home`** broke a `#`-delimited sed command; that edit went through the Edit tool.
- **Empty stray files** again (the `cmd` redirect hook, §5.10): 9 here. Deleted.

## Commands
| Task | Command |
|---|---|
| Logic tests (rules, all 300 levels replayed, 24 re-solved for optimal par) | `npm test` |
| Rebuild the levels (append-only once shipped; about 9 minutes on 11 cores) | `node tools/make-levels.mjs` |
| Desktop screenshot | `node tools/shot.mjs index.html out.png 360 740 "__dbg.start(38)"` |
| Icons, splash, store art | `bash store/make-art.sh` |
| Debug APK onto the phone | `JAVA_HOME=<path to JDK 21> npm run apk`, then `adb install -r android/app/build/outputs/apk/debug/app-debug.apk` |
| Device: errors / eval / FPS / screenshot | `node tools/device.mjs errors`, `eval "<js>"`, `fps "<js>" [ms]`, `shot out.png` |
| Device regression (after every change) | `node tools/regress.mjs` |

## Not done yet (by decision)
- **Monetization**: rewarded +30 s, boosters (hammer, vacuum, freeze), interstitials, coin packs. The +30 s is free once per level for now.
- **A hint in play**: it would need a search from the player's own position, which can take seconds on the P22 for big boards. The rewind dial and the best-way replay cover being stuck.
- **More mechanics** from the spec (ice blocks, layered blocks, keys and locks, colour-changing gates) and a win-streak bonus.
- **A daily level.**
- **The level file is append-only once shipped**: saves point at level numbers.
