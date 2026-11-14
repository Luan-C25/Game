# The depth update: plan

Owner's choices, 12 November 2026. Research behind it:
`docs/research/RETENTION-RESEARCH.md` (the evidence was thin; most of this
is the owner's call, not measured data).

All of it keeps the standing rules: no timers, lives or energy, hints, undo
and restart stay free, nothing random or gambling-like, ads only where the
player chooses one.

## 1. Daily Kiln (a new puzzle every day)

- One level a day, the same for everyone that day. Generated from the date
  by the existing generator (`generateLevel` with an id outside the shipped
  pack, so it never collides with a level number), at a mid-to-hard
  difficulty that rotates through the week. No timer.
- The day turns over at local midnight.
- **Streak**: clearing the Daily Kiln on consecutive days. Missing a day
  ends the streak; badges already earned are kept forever, and the best
  streak is kept.
- **Streak badges**, each earned once: 7, 14 and 21 days; then 1 month (30
  days), 2 months, 3 months and so on to 12 months (1 year), then every
  month after: 1 year 1 month, 1 year 2 months, with no end.
- Home screen: a Daily Kiln capsule showing today's state and the streak.

## 2. Daily gift (a 7-day cycle)

- Open the kiln once a day. Days 1 to 6 give coins, rising each day. Day 7
  gives a **character** (see 5), in a fixed order, never random.
  Once every gift character is owned, day 7 gives a large coin prize.
- **Missing a day resets the cycle to day 1**, with one exception: if
  exactly one day was missed, the player may watch a rewarded ad to keep
  their place. Declining is one tap and costs nothing else. Two or more
  missed days always reset.
- Claiming never needs an ad. No "double it with an ad" button.
- This is the game's first rewarded ad, so the Promises screen gets its
  line back ("watching an ad is always your choice").

## 3. Potter's Ledger (goals)

A fixed list, each paying coins once. Hints and undo never count against a
goal. First set:

- Per chapter: clear every level; earn 50 stars; earn par (3 stars) on
  every level.
- Flick 100, 500 and 1,000 blocks out through their gates.
- Clear 10, 50 and 100 levels in total.
- Clear the Daily Kiln 1, 10 and 50 times.
- Fill the pottery shelf (see 4).

## 4. Pottery shelf (a collection)

- Clearing every level in a chapter fires that place's pot onto the shelf
  (a Kiln Meadow jug, a Seaside Pier vase, a Lantern Gardens bowl...).
- Earning par on every level in the chapter upgrades it to a gold-glazed
  version.
- Guaranteed, never random. Ten pots, ten gold versions.

## 5. Characters and a bigger shop

- **Characters**: small villagers and animals in the map art's style (a
  potter, a cat, a ferry captain, a lantern keeper...). Owned characters
  appear on the chapter maps beside the road, and one chosen companion sits
  beside the board while playing. Some come from the day-7 gift, the rest
  are bought with coins.
- **Shop sections**: Themes (as now), Characters, Glazes and Effects.
  - Glazes: tile finishes (gloss, speckled, crackle, matte). The tile
    colours stay the fixed Okabe-Ito palette in every finish, because they
    carry the rules.
  - Effects: what happens when a block leaves through its gate (kiln puff,
    petals, sparks of glaze). No random sparkles on the board itself.
- Everything costs coins only. No real-money items in this update.

## Build order

1. Save data and the day clock (one place that decides "today", with tests
   for midnight, missed days and month counting).
2. Daily Kiln and streak badges.
3. Daily gift, then the rewarded ad that restores a missed day.
4. Potter's Ledger.
5. Pottery shelf.
6. Shop sections, characters on the maps and beside the board.

Steps 1 to 4 can be built with placeholder art. The pots, characters,
badges, gift kiln, glaze finishes and effects need a design session first:
the brief is `docs/DEPTH-ART-PROMPT.md`.

Ships as one release after the chapter maps (1.0.2 or 1.1.0).

## Status (12 November 2026)

Built, with the art from `design/depth/` (imported by
`node scripts/import-depth-art.mjs` into `public/depth/`, which also writes
`src/game/characters.ts`):

- Daily Kiln with streak, month calendar and badge art; board generated from
  the date at the weekday's difficulty, over a rotating chapter background.
- Daily gift with the gift kiln art, day-7 friends in the art's order, and
  the opt-in ad that keeps a place after exactly one missed day.
- Potter's Ledger (39 goals), with a dot on the home button when one is ready.
- Pottery shelf: fired when a chapter is cleared, gold when every level
  matches par.
- Shop with Themes, Friends, Glazes and Effects. Owned friends stand on
  their home chapter's map; one can sit beside the board.
- Glaze finishes in `render.ts`, exit effects in `particles.ts`, prices in
  `src/game/cosmetics.ts`.

Played end to end on the phone on 13 November 2026.

## Economy (13 November 2026)

The owner's rule: a player should not be able to buy everything long before
finishing the 200 levels. The first prices let a typical player earn about
10,000 coins by level 200 against a 3,400-coin shop, so everything was
affordable by about level 70. Income was roughly halved and prices raised:

| Source | Before | Now |
| --- | --- | --- |
| Level, first clear | 10 + 5 a star (15 to 25) | 5 + 2 a star (7 to 11) |
| Daily Kiln | 30 | 15 |
| Daily gift days 1 to 6 | 10, 15, 20, 30, 40, 60 | 5, 8, 10, 15, 20, 30 |
| Day 7 once every gift friend is owned | 150 | 75 |
| Goals (39) | about 3,500 in all | about 1,770 in all |

| Shop | Before | Now |
| --- | --- | --- |
| Themes | 100 to 400 (1,650 in all) | 150 to 600 (2,475) |
| Glazes | 150, 175, 200 | 250, 300, 350 |
| Effects | 80, 120 | 150, 200 |
| Friends | 120 to 250 (1,050) | 200 to 450 (1,850) |

A typical player (about 2.5 stars a level, half the par goals, a daily most
days for six weeks) now earns about 4,300 by level 200 against a 5,575-coin
shop, so the last few items land after the levels run out, carried by the
Daily Kiln and gifts. Coins already earned are kept.
