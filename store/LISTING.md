# Play Store listing

Copy this straight into Play Console. Character limits are Google's and the
counts below are current; if you edit the text, re-check them.

---

## App name (30 characters max)

```
Glazeway: Colour Block Puzzle
```
*29 characters. "Glazeway" is the brand; the rest is what people search for.
Checked on Google Play (Australia) on 22 October 2026: no app called
Glazeway.*

## Short description (80 characters max)

```
Slide colour blocks out through matching gates. 200 levels and a daily puzzle.
```
*78 characters. It says what the game is, then gives two reasons to pick it
that the feature graphic does not already say (Google recommends the two do
not repeat each other, as they can appear side by side). No "free": Play counts it as a
price word in the short description and stops promoting the app (flagged 13
November 2026).*

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
puzzle waits exactly as long as you do, and every level you clear is saved, so
you can stop whenever you like.

ABOUT ADS — OUR PROMISES, IN THE APP

Every promise below is written into the game itself, on the Promises screen:

• No ad will ever interrupt a puzzle you are solving
• No ad will ever play when you finish a level
• No ads at all until after level 10
• After that, at most one ad per four levels, and never twice within three
  minutes
• The only ad you can choose to watch keeps your daily gift streak after one
  missed day, and saying no costs nothing else
• Hints, undo and restart are always free
• Coins buy themes, friends, glazes and effects, never anything you need to
  finish a level

SOMETHING NEW EVERY DAY

The Daily Kiln is a fresh puzzle each day, the same for everyone, with streak
badges from 7 days all the way past a year. Open the kiln once a day for a
gift, and on day 7 a new friend moves into the village. The Potter's Ledger
has 39 goals that pay coins, and every chapter you finish fires a pot for your
shelf, glazed gold if you match par on every level.

200 SOLVER-CHECKED LEVELS

The difficulty curve climbs and then deliberately levels off. Later puzzles
stay hard, but they never tip over into the unbeatable walls that make people
delete this kind of game.

PLAYS ANYWHERE

Works completely offline. No account, no sign-in, nothing uploaded. Themes,
village friends, tile glazes and exit effects to unlock with the coins you
earn by playing.

BUILT TO BE READABLE

Block colours come from a colour-blind-safe palette, and you can turn on
shapes so colour is never the only thing telling you where a block goes. A
reduce-motion setting stops every animation.
```
*About 2,690 characters. Every claim here was checked against the code on 13
November 2026; re-check when a feature changes.*

---

## Release notes (500 characters max)

```
New: the Daily Kiln, a fresh puzzle every day with streak badges. A daily
gift with a new friend on day 7. The Potter's Ledger, 39 goals that pay
coins. A pottery shelf with a pot for every chapter. A bigger shop with
friends, tile glazes and exit effects. Chapter maps with scenery behind the
board, friendlier music, and a Levels button on the win screen.
```

## Category and tags

- **Application type:** Game
- **Category:** Puzzle
- **Tags:** Brain games, Puzzle, Casual, Offline games *(Play lets you pick up
  to five; these match what the game actually is)*

## Contact details

- **Email:** `luanchild15@gmail.com` (shown publicly on the listing; also the
  privacy policy's contact)
- **Privacy policy:** `https://luan-c25.github.io/glazeway-privacy/`
- **Website:** optional
- **Phone:** optional, leave blank

## Graphics checklist

| Asset | Requirement | File |
| --- | --- | --- |
| App icon | 512x512 PNG, no transparency | `store/icon-512.png` |
| Feature graphic | 1024x500 PNG | `store/feature-graphic.png` |
| Phone screenshots | 2-8, 9:16 | `store/screenshot-*.png` (8 supplied, 886x1574) |

Regenerate all of them with:

```bash
npm run build
node scripts/make-icons.ts
node scripts/make-store-assets.mjs
```

The 1.1.0 screenshots were captured from the game on a phone instead, so
they show real progress, friends and art: see the notes at the top of
`scripts/phone-screenshots.mjs`. `make-store-assets.mjs` still makes the
feature graphic, but its screenshot list is the old 1.0 set.
