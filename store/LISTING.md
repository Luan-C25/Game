# Play Store listing

Copy this straight into Play Console. Character limits are Google's and the
counts below are current; if you edit the text, re-check them.

---

## App name (30 characters max)

```
Colour Jam
```
*10 characters.*

## Short description (80 characters max)

```
Slide the blocks out. No timers, no lives, free hints. Every level is solvable.
```
*78 characters. This is the line most people actually read, so it leads with
the differentiators rather than the genre.*

## Full description (4000 characters max)

```
Slide every block out through a gate of its own colour.

That's the whole game. Blocks block each other, so the order you move them in
is the puzzle. No timers counting down at you. No lives to wait for. No level
you cannot finish.

EVERY LEVEL CAN BE SOLVED — AND WE CAN PROVE IT

Most block puzzles generate a board and hope. We build each one backwards from
a finished position, then check it with a solver before it ever reaches you.
The "par" number next to your move count is a real solution we have on file,
not a guess. If a level could not be beaten, it would never have shipped.

HINTS ARE FREE. ALL OF THEM.

Undo is free and unlimited. Restart is free. Hints are free, and they work out
the next best move from wherever you actually are — not from where the game
wishes you were. Nothing that helps you finish a puzzle costs coins, and
nothing is ever locked behind a purchase.

NO PRESSURE MECHANICS

No countdown timers. No lives or energy to refill. No "you failed" screen. A
puzzle waits exactly as long as you do, and you can put it down mid-level and
come back next week.

ABOUT ADS — OUR PROMISES, IN THE APP

Every promise below is written into the game itself, on the Promises screen:

• No ad will ever interrupt a puzzle you are solving
• No ad will ever play when you finish a level
• No ads at all until after level 10
• After that, at most one ad per four levels, and never twice within three
  minutes
• Hints, undo and restart are always free
• Coins buy themes and nothing else

200 HAND-VERIFIED LEVELS

The difficulty curve climbs and then deliberately levels off. Later puzzles
stay hard, but they never tip over into the unbeatable walls that make people
delete this kind of game.

PLAYS ANYWHERE

Works completely offline. No account, no sign-in, nothing uploaded. Four
themes to unlock with the coins you earn by playing.

BUILT TO BE READABLE

Block colours come from a colour-blind-safe palette, and you can turn on
shapes so colour is never the only thing telling you where a block goes. A
reduce-motion setting stops every animation.
```
*About 2,050 characters.*

---

## Release notes (500 characters max)

```
First release. 200 solver-verified levels, four themes, and no timers or
lives anywhere. Undo, hints and restarts are free and unlimited.
```

## Category and tags

- **Application type:** Game
- **Category:** Puzzle
- **Tags:** Brain games, Puzzle, Casual, Offline games *(Play lets you pick up
  to five; these match what the game actually is)*

## Contact details

- **Email:** required and shown publicly on your listing — consider a dedicated
  address rather than your personal one
- **Website:** optional
- **Phone:** optional, leave blank

## Graphics checklist

| Asset | Requirement | File |
| --- | --- | --- |
| App icon | 512x512 PNG, no transparency | `store/icon-512.png` |
| Feature graphic | 1024x500 PNG | `store/feature-graphic.png` |
| Phone screenshots | 2-8, 1080x1920 | `store/screenshot-*.png` (6 supplied) |

Regenerate all of them with:

```bash
npm run build
node scripts/make-icons.ts
node scripts/make-store-assets.mjs
```
