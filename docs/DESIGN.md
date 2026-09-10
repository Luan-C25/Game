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

## What is deliberately absent

No timers. No lives or energy. No fail state. No streaks or daily login
rewards. No "your progress will be lost" interstitial. No account, no
telemetry, no network calls at runtime. No ad that plays without the player
choosing it, apart from the interstitial described above.

The monetisation this leaves is narrow on purpose: cosmetic themes, optional
rewarded ads for coins, and a one-off Remove Ads purchase. That is a smaller
surface than the games it competes with. It is also the entire pitch.
