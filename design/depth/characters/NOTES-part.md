# Characters (part notes)

Built by `node design/depth/build-characters.mjs` (uses `../maps/kit.mjs`). Nothing in `src/` or `design/maps/` was touched.

## Files and sizes

Twelve characters, two SVGs each, 24 in all, plus `characters.json` and `manifest.json`.

- `<id>-map.svg`: viewBox `0 0 32 40`, simplified, ground shadow at the feet.
- `<id>-side.svg`: viewBox `0 0 58 72`, same drawing scaled up with a little extra detail (held items, collars, whiskers, a crow on the scarecrow).

Ids: potter, dog, duck, scarecrow, cat, kilnmaster, stallholder, koala, ferrycaptain, snowgoat, lanternkeeper, cameltrader.

## Gift (day 7) order

| # | Character | Home chapter |
|---|---|---|
| 1 | Potter | 1 Kiln Meadow |
| 2 | Dog | 1 Kiln Meadow |
| 3 | Duck | 2 Clay Creek |
| 4 | Scarecrow | 3 Sunflower Fields |
| 5 | Cat | 4 Market Town |
| 6 | Kiln Master | 10 The Great Kiln |

The first four fit chapters 1 to 3, so new players meet characters that belong where they are playing. The Kiln Master is last as a finale gift for the Great Kiln.

## Shop prices (coins)

Stallholder 120, Koala 140, Ferry Captain 160, Snow-goat 180, Lantern Keeper 200, Camel Trader 250.

Prices sit in the 120 to 250 band, next to themes (100 to 200). They rise roughly with chapter, so later characters cost more, and the more elaborate ones (lantern with glow, camel with pack) sit at the top.

## Undecided

- Names and one-line descriptions are placeholders.
- Whether the Kiln Master should rather be the priciest shop item (about 250) and the gift be something earlier.
- Side versions are standing, not truly sitting; a seated pose per character is not drawn.
- Renders were checked by strict tag-balance parsing only; no visual check was possible (browser panes were unavailable).
