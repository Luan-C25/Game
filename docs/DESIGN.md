# Design decisions, and the complaints behind them

Every rule below exists because players of *Color Block Jam* and its
neighbours complained about its absence. The research those complaints come
from is in [MARKET-RESEARCH.md](./MARKET-RESEARCH.md); this document maps each
one to the code that answers it, so a future change that quietly reintroduces
the problem is easy to spot in review.

## The complaint-to-fix map

| What players reported | What this game does | Where |
| --- | --- | --- |
| Levels become unbeatable past a point; you are forced to buy coins, and even buying is not enough | Boards are built **backwards from a solved position**, so a winning line exists by construction. Each one is then solved and the solution replayed before it ships. | `src/engine/generator.ts`, `scripts/build-levels.ts` |
| Difficulty climbs until the game stops being playable | The difficulty curve **plateaus at level 91**. Later levels stay hard; they do not keep getting harder. | `profileForLevel` in `src/engine/generator.ts` |
| Timers are too short; the timer keeps running after the board is cleared; ads promised "no timer" | **There is no timer anywhere.** A test asserts the level data contains no timer, life, or countdown field. | `src/game/session.ts`, `test/engine.test.ts` |
| Boosters are cash-only; the watch-an-ad-for-a-hint option was removed | **Undo, hints and restart are free and unlimited**, and never cost coins. Coins buy themes and nothing else. | `src/game/session.ts`, `src/main.ts` |
| Ads after every single round; ads that flip to the store and back until you force-quit | One gate every ad call must pass: never during play, never after a win, nothing before level 10, then at most one per four levels and never twice inside three minutes. | `src/game/ads.ts` |
| Cleared every block but the game said you lost; won with blocks still on the board | Winning is **read off the board itself** - `isSolved` is true exactly when every playable block has left. There is no second opinion that can disagree with the screen. | `src/engine/board.ts` |
| Would not advance after completing a level; 300 coins to "process the win" | Finishing shows a plain **Next level** button. No currency is involved in progressing, ever. | `src/main.ts` |
| Blocks are jerky, get stuck, or do not move when dragged; "phantom pieces" | The block follows the finger continuously, and every intermediate position is a legal board state - a block can never end up between cells. A gesture that changes nothing is discarded rather than counted as a move. | `src/game/input.ts` |
| Lost progress, boosters or coins; "Remove Ads" lost after reinstalling | Saving is defensive: every read is guarded, a corrupt save degrades to a fresh one rather than throwing, and a recorded purchase is never revoked by a bad read. | `src/game/save.ts` |
| Music starts a minute in and ignores the setting | `setMusicEnabled` is the **only** code path that starts or stops music, it is called from the settings toggle alone, and music is off by default. No timer or resume path can start it. | `src/game/audio.ts` |
| A fail-screen button labelled "75 coins" actually spends them | Every button that spends coins says so on the button: "Buy for 300 coins". There is no fail screen at all. | `renderThemes` in `src/main.ts` |
| Only ~10-12 boards, recycled across the run | 200 distinct generated boards, each from its own deterministic seed. | `src/engine/rng.ts`, `src/game/levels.json` |
| Screen overload; daily quests with rewards hidden off-screen | The play screen carries a level number, a move count, and three buttons. There are no quests, no banners, and no pop-ups. | `index.html` |
| A life is deducted for declining an offer | There are no lives and no energy. | - |

Two additions that no complaint asked for but the same audience needs: a
**shapes-on-blocks** option so colour is never the only way to read the board,
and full **offline play** with no account and no network calls.

## Why levels are generated backwards

Generating a random board and then testing it is the obvious approach and it
is the wrong one. Most random boards are unsolvable, so nearly all the work
goes into proving that - and the moment the search budget runs out, you cannot
tell an unsolvable board from a merely hard one. That ambiguity is exactly how
an impossible level reaches a player.

Reverse construction removes the ambiguity. Starting from a won position, each
block is placed at its exit gate and then slid *away* through empty cells.
Replaying those slides in reverse is legal because the same blocks are on the
board at the matching moment in each direction, so the board arrives with a
winning line already attached. The solver is then used for what it is good
at - measuring how *short* the best solution is - rather than for deciding
whether one exists.

## Why the solver can treat an exit as forced

The solver prunes hard: whenever a block can leave the board, it takes that
move and considers nothing else. This is safe rather than merely convenient.
Every block has to exit exactly once, an exit costs one move whatever the
distance, and removing a block only frees space for the others. So an exit can
always be hoisted to the front of an optimal solution without lengthening it,
and the shortest solution found is still genuinely the shortest.

That is what makes `par` an honest number: it is a real solution we have on
file, not an estimate.

## Presentation

The game commits to one physical idea: **glazed ceramic tiles seated in a
slate tray, with the exits cut as metal-rimmed channels through the frame.**
Every visual decision follows from that, which is what stops the board looking
like a set of coloured rectangles that happen to be arranged in a grid.

The look is built from geometry, not from gradients:

- A tile has a **real extruded side face** - a solid darker slab drawn beneath
  it - rather than a vertical gradient pretending to be depth.
- Its top is **one smooth, solid colour** under a broad low-contrast sheen,
  with a crisp inset rim just inside the edge for moulded thickness. No
  speckle and no sparkle: the satisfaction comes from weight and shadow.
- The floor is a **continuous moulded plate with rounded grooves channelled
  between its pads**, each groove carrying a lit lower wall. Both tones are
  derived from the floor colour, so a groove always reads as a recess in that
  surface rather than a line drawn on top of it.
- The frame **casts an inner shadow down into the tray**, which is what makes
  the tiles read as sitting inside a physical object rather than floating on
  a picture of one.
- Exits are **cut clean through the frame**: a dark slot with its own inner
  shadow, a painted lip seated below the frame's top face, and a solid
  moulded arrow debossed into that lip pointing out of the tray.
- Crates are **embossed obstacle pieces** - raised ribs, each with a lit edge
  and a shaded one - so they never read as something you could move.
- A block is one merged silhouette with **seams scored between its cells**, so
  it reads as a single piece while still showing how many squares it covers.

The game screen's furniture is moulded from the same device: the level and
coin readouts are **raised badges** with a lit top edge and a hard base, the
move count is a **readout sunk into the frame**, and the controls are **caps
that physically travel** when pressed. The primary action is a wider pill in
the accent colour so it never reads as a third identical utility, and each
label sits beneath its cap rather than on it.

The same language carries into the chrome: solid fills, hard dark outlines, a
real bottom edge that a press sinks into. No blurred drop shadows, no gradient
text, no glows.

The backdrop is deliberately quiet - one soft light from above and nothing
else. Anything more competes with the board, which is the only thing on screen
that should be loud.

Two limits keep the styling from working against the player:

- **Tile colours never change with the theme.** A theme restyles the tray, the
  light and the chrome, because the tile hues carry the rules. They come from
  the Okabe-Ito palette, which stays distinguishable under the common forms of
  colour blindness, and the shapes-on-tiles setting adds a second cue on top.
- **Motion is a setting.** "Reduce motion" stops the animation clock, which
  freezes the rim shimmer and the hint pulse, and disables particles. The
  OS-level `prefers-reduced-motion` hint is honoured separately in CSS.

Themes are defined once, in `src/game/theme.ts`, as materials rather than
palettes - there are separate entries for a bevel, a recess and a rim - and
they drive both the canvas and the DOM chrome through CSS custom properties,
so adding one never means writing matching CSS by hand.

### The menu is a different room

The main menu deliberately breaks from the board's material. It is the shop
window - the first thing anyone sees and the screen that has to sell the game
in a second - so it goes bright and toy-like where the board stays restrained:
moulded capsules with a glossy cap and a thick coloured underside that a press
physically sinks into, a chunky rounded wordmark with a crisp outline and a
slab of extrusion, and a warm backdrop it keeps across every theme.

Hierarchy carries the weight there. **Play** is roughly twice the height of
anything else and the only saturated capsule on the screen; Levels and Themes
sit tight beneath it as a softer pastel pair, with Settings and Promises
quieter again below. Nothing on that screen is the same size as anything else,
which is what stops it reading as a stack of identical rectangles.

Headings and button labels across the whole app use Baloo 2, a rounded display
face bundled with the build. Body copy and small print stay on the system font,
which is more legible at small sizes.

## What is deliberately absent

No timers. No lives or energy. No fail state. No streaks or daily login
rewards. No "your progress will be lost" interstitial. No account, no
telemetry, no network calls at runtime. No ad that plays without the player
choosing it, apart from the interstitial described above.

The monetisation this leaves is narrow on purpose: cosmetic themes, optional
rewarded ads for coins, and a one-off Remove Ads purchase. That is a smaller
surface than the games it competes with. It is also the entire pitch.
