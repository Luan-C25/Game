# Depth update art

Design only. Nothing in `src/` was changed. Open `overview.html` from disk to see everything.
Regenerate: `node design/depth/build-pots.mjs`, `build-characters.mjs`, `build-streaks.mjs`, `build-finishes.mjs`, then `node design/depth/build-overview.mjs`.

Style: flat vector, as the chapter maps (ground shadow, darker underside, one highlight; no gradients, sparkles or textures). Okabe-Ito tile colours never change.

## Pottery shelf: pots and shelf

| File | Size |
|---|---|
| `pots/pot-1-kiln-meadow.svg` | 96 x 120 |
| `pots/pot-1-kiln-meadow-gold.svg` | 96 x 120 |
| `pots/pot-1-kiln-meadow-empty.svg` | 96 x 120 |
| `pots/pot-2-clay-creek.svg` | 96 x 120 |
| `pots/pot-2-clay-creek-gold.svg` | 96 x 120 |
| `pots/pot-2-clay-creek-empty.svg` | 96 x 120 |
| `pots/pot-3-sunflower-fields.svg` | 96 x 120 |
| `pots/pot-3-sunflower-fields-gold.svg` | 96 x 120 |
| `pots/pot-3-sunflower-fields-empty.svg` | 96 x 120 |
| `pots/pot-4-market-town.svg` | 96 x 120 |
| `pots/pot-4-market-town-gold.svg` | 96 x 120 |
| `pots/pot-4-market-town-empty.svg` | 96 x 120 |
| `pots/pot-5-seaside-pier.svg` | 96 x 120 |
| `pots/pot-5-seaside-pier-gold.svg` | 96 x 120 |
| `pots/pot-5-seaside-pier-empty.svg` | 96 x 120 |
| `pots/pot-6-bluegum-forest.svg` | 96 x 120 |
| `pots/pot-6-bluegum-forest-gold.svg` | 96 x 120 |
| `pots/pot-6-bluegum-forest-empty.svg` | 96 x 120 |
| `pots/pot-7-lantern-gardens.svg` | 96 x 120 |
| `pots/pot-7-lantern-gardens-gold.svg` | 96 x 120 |
| `pots/pot-7-lantern-gardens-empty.svg` | 96 x 120 |
| `pots/pot-8-snowy-peaks.svg` | 96 x 120 |
| `pots/pot-8-snowy-peaks-gold.svg` | 96 x 120 |
| `pots/pot-8-snowy-peaks-empty.svg` | 96 x 120 |
| `pots/pot-9-glass-desert.svg` | 96 x 120 |
| `pots/pot-9-glass-desert-gold.svg` | 96 x 120 |
| `pots/pot-9-glass-desert-empty.svg` | 96 x 120 |
| `pots/pot-10-great-kiln.svg` | 96 x 120 |
| `pots/pot-10-great-kiln-gold.svg` | 96 x 120 |
| `pots/pot-10-great-kiln-empty.svg` | 96 x 120 |
| `pots/pot-empty.svg` | 96 x 120 |
| `pots/shelf.svg` | 375 x 1080 |
| `pots/shelf-empty.svg` | 375 x 1080 |


Built by `node design/depth/build-pots.mjs`. Flat vector only: ground shadow, darker underside (right edge and foot), one highlight strip, no gradients.

#### Files (all in design/depth/pots/)

- `pot-N-<slug>.svg`, `pot-N-<slug>-gold.svg`, `pot-N-<slug>-empty.svg` for N = 1 to 10: 96 x 120 each (30 files).
- `pot-empty.svg`: generic not-fired outline, 96 x 120.
- `shelf.svg`: 375 x 1080, sample state (pots 1-4 gold, 5-6 fired, 7-10 empty). 2 pots per row, 5 planks, pots drawn at 1.15x (about 110 wide), chapter name on a plaque under each plank.
- `shelf-empty.svg`: 375 x 1080, all ten not fired.
- `manifest.json`: 33 entries `{file, width, height, label, group:'pots'}`.

#### Design intent

1. Kiln Meadow: green jug with one handle, cream band, daisy.
2. Clay Creek: squat red-clay pot, waterwheel motif over a wave.
3. Sunflower Fields: tall orange vase, one sunflower on a stem.
4. Market Town: pink urn, cream stripes, scalloped awning band, two handles.
5. Seaside Pier: blue amphora, two neck handles, white wave band.
6. Bluegum Forest: grey-green pot, three gum leaves and a nut.
7. Lantern Gardens: wide red bowl, three hanging lanterns.
8. Snowy Peaks: white lidded jar, snow-scallop lid, pine tree.
9. Glass Desert: pale-blue glass flask, sand fill, cork.
10. The Great Kiln: blue grand urn, finial lid, big handles, kiln-door arch in gold trim.

Gold version: same shape and motif, every colour taken from #E8B730 (light, mid and dark steps). Empty version: dashed outline, faint fill, no motif.

#### Undecided

- Shelf is taller than one screen (1080) so it scrolls; the game must draw its own title and the "x of 10 fired" count.
- Labels are SVG text in Baloo 2; the game may prefer to draw labels itself (then use the pot files only).
- Fired but not gold has no marker besides colour; a small "par" badge on gold slots is not drawn.
- Empty outlines use a warm brown ink tuned for the cream shelf wall; on a dark screen they would need a lighter ink.
- Pots 2 and 7 sit lower and wider than the others on purpose; heights are not normalised.


## Characters

| File | Size |
|---|---|
| `characters/potter-map.svg` | 32 x 40 |
| `characters/potter-side.svg` | 58 x 72 |
| `characters/dog-map.svg` | 32 x 40 |
| `characters/dog-side.svg` | 58 x 72 |
| `characters/duck-map.svg` | 32 x 40 |
| `characters/duck-side.svg` | 58 x 72 |
| `characters/scarecrow-map.svg` | 32 x 40 |
| `characters/scarecrow-side.svg` | 58 x 72 |
| `characters/cat-map.svg` | 32 x 40 |
| `characters/cat-side.svg` | 58 x 72 |
| `characters/kilnmaster-map.svg` | 32 x 40 |
| `characters/kilnmaster-side.svg` | 58 x 72 |
| `characters/stallholder-map.svg` | 32 x 40 |
| `characters/stallholder-side.svg` | 58 x 72 |
| `characters/koala-map.svg` | 32 x 40 |
| `characters/koala-side.svg` | 58 x 72 |
| `characters/ferrycaptain-map.svg` | 32 x 40 |
| `characters/ferrycaptain-side.svg` | 58 x 72 |
| `characters/snowgoat-map.svg` | 32 x 40 |
| `characters/snowgoat-side.svg` | 58 x 72 |
| `characters/lanternkeeper-map.svg` | 32 x 40 |
| `characters/lanternkeeper-side.svg` | 58 x 72 |
| `characters/cameltrader-map.svg` | 32 x 40 |
| `characters/cameltrader-side.svg` | 58 x 72 |


Built by `node design/depth/build-characters.mjs` (uses `../maps/kit.mjs`). Nothing in `src/` or `design/maps/` was touched.

#### Files and sizes

Twelve characters, two SVGs each, 24 in all, plus `characters.json` and `manifest.json`.

- `<id>-map.svg`: viewBox `0 0 32 40`, simplified, ground shadow at the feet.
- `<id>-side.svg`: viewBox `0 0 58 72`, same drawing scaled up with a little extra detail (held items, collars, whiskers, a crow on the scarecrow).

Ids: potter, dog, duck, scarecrow, cat, kilnmaster, stallholder, koala, ferrycaptain, snowgoat, lanternkeeper, cameltrader.

#### Gift (day 7) order

| # | Character | Home chapter |
|---|---|---|
| 1 | Potter | 1 Kiln Meadow |
| 2 | Dog | 1 Kiln Meadow |
| 3 | Duck | 2 Clay Creek |
| 4 | Scarecrow | 3 Sunflower Fields |
| 5 | Cat | 4 Market Town |
| 6 | Kiln Master | 10 The Great Kiln |

The first four fit chapters 1 to 3, so new players meet characters that belong where they are playing. The Kiln Master is last as a finale gift for the Great Kiln.

#### Shop prices (coins)

Stallholder 120, Koala 140, Ferry Captain 160, Snow-goat 180, Lantern Keeper 200, Camel Trader 250.

Prices sit in the 120 to 250 band, next to themes (100 to 200). They rise roughly with chapter, so later characters cost more, and the more elaborate ones (lantern with glow, camel with pack) sit at the top.

#### Undecided

- Names and one-line descriptions are placeholders.
- Whether the Kiln Master should rather be the priciest shop item (about 250) and the gift be something earlier.
- Side versions are standing, not truly sitting; a seated pose per character is not drawn.
- Renders were checked by strict tag-balance parsing only; no visual check was possible (browser panes were unavailable).


## Streak badges, gift kiln, Daily Kiln

| File | Size |
|---|---|
| `streaks/badge-7.svg` | 96 x 96 |
| `streaks/badge-14.svg` | 96 x 96 |
| `streaks/badge-21.svg` | 96 x 96 |
| `streaks/badge-month-01.svg` | 96 x 96 |
| `streaks/badge-month-02.svg` | 96 x 96 |
| `streaks/badge-month-03.svg` | 96 x 96 |
| `streaks/badge-month-04.svg` | 96 x 96 |
| `streaks/badge-month-05.svg` | 96 x 96 |
| `streaks/badge-month-06.svg` | 96 x 96 |
| `streaks/badge-month-07.svg` | 96 x 96 |
| `streaks/badge-month-08.svg` | 96 x 96 |
| `streaks/badge-month-09.svg` | 96 x 96 |
| `streaks/badge-month-10.svg` | 96 x 96 |
| `streaks/badge-month-11.svg` | 96 x 96 |
| `streaks/badge-month-12.svg` | 96 x 96 |
| `streaks/badge-year-template.svg` | 96 x 96 |
| `streaks/badge-locked.svg` | 96 x 96 |
| `streaks/gift-kiln-closed.svg` | 96 x 110 |
| `streaks/gift-kiln-ready.svg` | 96 x 110 |
| `streaks/gift-kiln-open.svg` | 96 x 110 |
| `streaks/gift-row.svg` | 375 x 262 |
| `streaks/gift-row-day3.svg` | 375 x 262 |
| `streaks/icon-daily-kiln.svg` | 64 x 64 |
| `streaks/calendar-plate.svg` | 375 x 412 |
| `streaks/calendar-plate-empty.svg` | 375 x 412 |


Design only. Built by `design/depth/build-streaks.mjs` (run `node design/depth/build-streaks.mjs`). Nothing in `src/` was touched. Flat vector, a ground shadow, a darker underside and one highlight on every object. Text uses `'Baloo 2'` weight 800 with sans fallback. `manifest.json` lists every SVG.

#### Files and sizes

| File | Size | What |
|---|---|---|
| badge-7, badge-14, badge-21 | 96x96 | Bronze, silver, gold glazed medallions (rim styles: dots, teeth and diamonds, scallops and stars) |
| badge-month-01 to 11 | 96x96 | Tile-colour face cycling through the six colours, bronze rim for months 1 to 6, silver for 7 to 11, rim motif changes each month |
| badge-month-12 | 96x96 | One year: gold rim with 12 knobs in the six tile colours, star on top, cream face |
| badge-year-template | 96x96 | Same grand frame, dark clay face, placeholder text `1y 3m` |
| badge-locked | 96x96 | Raw unglazed clay, faint, no numeral |
| gift-kiln-closed / ready / open | 96x110 | Door shut; glowing with door ajar; door wide with a wrapped gift out front |
| gift-row, gift-row-day3 | 375x262 | Days 1 to 6 in a row of coin pouches (+10, 15, 20, 30, 40, 60), Day 7 as a big gold-rimmed card with a "?" figure behind glass. Day3 variant: days 1 and 2 ticked, day 3 ringed, rest locked |
| icon-daily-kiln | 64x64 | Kiln plus a calendar leaf with a flame |
| calendar-plate, calendar-plate-empty | 375x412 | November 2026 (Monday first, 1st under Sun). Sample: 1 to 11 cleared, 9 missed, 12 ringed as today |

#### Streak length to badge

- 7, 14, 21 days: `badge-7`, `badge-14`, `badge-21`.
- 30, 60, 90 ... 360 days = months 1 to 12: `badge-month-NN`. Month 12 (360 days) is the one-year badge.
- Anything longer: `badge-year-template` (1 year 1 month onward).
- Not yet earned: `badge-locked`.

#### Composing the year template

The text is two `<text>` nodes holding `1y 3m`: a dark shadow copy first, then the light copy with `id="label"`. The game builds the string, `1y` when months is 0, otherwise `${years}y ${months}m` (for example `1y 3m`, `2y 11m`), and sets it on both nodes. Font size 22 fits up to `10y 11m`; drop to 18 beyond that. If the SVG is used as an image rather than inline, regenerate it from the script with the string instead.

#### Undecided

- Days 7, 14 and 21 reuse metals that months 1 to 11 also use (bronze, silver), told apart by the "DAYS" versus "MONTHS" label and the face colour. Check they read apart on a phone.
- Gift amounts (10 to 60) are placeholders for the economy.
- Day 7 card text says "A new character for your shelf"; the later coin-prize version (all characters owned) is not drawn.
- Missed days in the calendar are a darker dimple with an underline; future days are plain dimples.
- Not visually checked in a browser (the preview pane was hidden); all 25 SVGs parse as strict XML.


## Glazes, exit effects, shop

| File | Size |
|---|---|
| `finishes/finishes-sheet.svg` | 600 x 524 |
| `finishes/effect-kiln-puff.svg` | 160 x 160 |
| `finishes/effect-petals.svg` | 160 x 160 |
| `finishes/effect-glaze-splash.svg` | 160 x 160 |
| `finishes/shop-mockup.svg` | 375 x 812 |
| `finishes/shop-mockup-scroll.svg` | 375 x 1980 |
| `finishes/glazes.md` | notes |
| `finishes/effects.md` | notes |
| `finishes/NOTES-part.md` | notes |


Design only. Nothing in src/ or design/maps/ was changed. Rebuild everything with: node design/depth/build-finishes.mjs

#### Files

| File | Size (px) | On disk | Group |
|---|---|---|---|
| finishes-sheet.svg | 600 x 524 | 29,919 bytes | finishes |
| effect-kiln-puff.svg | 160 x 160 | 1,849 bytes | effects |
| effect-petals.svg | 160 x 160 | 3,653 bytes | effects |
| effect-glaze-splash.svg | 160 x 160 | 2,826 bytes | effects |
| shop-mockup.svg | 375 x 812 | 14,480 bytes | shop |
| shop-mockup-scroll.svg | 375 x 1980 | 40,904 bytes | shop |
| glazes.md | text | 11,634 bytes | finishes |
| effects.md | text | 11,572 bytes | effects |
| manifest.json | list | see disk | n/a |
| NOTES-part.md | text | see disk | finishes |

#### Not decided

- Price points. Shop prices (glazes 150 to 200, effects 80 to 120, characters 120 to 200, themes 100 to 200) are placeholders for the economy pass.
- Which finish and effect are free defaults. The mock-ups assume gloss and kiln puff are free and equipped at first; plain fade is shown as an extra owned effect.
- Whether glyphs turn on by default. Recommended, because speckled and crackle give the face a little more visual noise.
- Whether the crackle and speckle patterns should be generated per block or cached as sprites per colour and shape (see glazes.md, performance notes). Per block is the simplest.
- Gates on the other three sides: the effect tables assume the gate faces right and say how to rotate them. Not drawn as stills.
- The shop mock-ups use Baloo 2 with a sans fallback. Text is live SVG text, so a viewer without the font falls back to Trebuchet or similar. For export to PNG, install Baloo 2 first.
- Item names beyond the brief (Baker, Fox, Plain fade) are placeholders.
- The finishes are drawn on the tile face only; the crate (obstacle) keeps its ribs and ignores the finish.


