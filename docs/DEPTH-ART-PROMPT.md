# Prompt for a design session: art for the depth update

Paste everything below the line into a new Claude session opened in
`C:\Users\TEST\Documents\LuanOS\Projects\colourjam`.

---

You're designing art for Glazeway, a colour-sorting sliding-block puzzle
game for Android. Read these first: `CLAUDE.md` (look and feel rules),
`docs/DEPTH-UPDATE.md` (the features this art is for), and
`design/maps/NOTES.md` plus `design/maps/kit.mjs` and `props.mjs` (the
chapter-map art style, which everything here must match).

Style: the same flat vector style as the chapter maps. Flat shapes only;
each object has a ground shadow, a darker underside and one highlight. No
gradients, sparkles or textures. Chunky, friendly, readable at small sizes
on a phone. Tile colours are the Okabe-Ito six and never change.

Make these as SVG, written by a script in `design/depth/` the way
`design/maps/build-chapters.mjs` writes the maps, so the game can reuse them:

1. **Ten pots for the pottery shelf**, one per chapter, each shaped and
   glazed after its place (Kiln Meadow, Clay Creek, Sunflower Fields,
   Market Town, Seaside Pier, Bluegum Forest, Lantern Gardens, Snowy Peaks,
   Glass Desert, The Great Kiln). Each also in a gold-glazed version, and
   an empty "not fired yet" outline. About 96 by 120.
2. **The shelf itself**: a wooden shelf unit holding ten pots, for a phone
   screen 375 wide, scrolling if needed.
3. **Twelve characters**: small villagers and animals who live along the
   chapter roads (for example a potter, a cat, a dog, a ferry captain, a
   lantern keeper, a snow-goat, a camel trader, a kiln master). Each in two
   sizes: about 40 tall for standing on a map, about 72 tall for sitting
   beside the board. Give each a name and a one-line description in a JSON
   file. Mark which six are day-7 gift characters and which six are sold
   in the shop, with suggested coin prices (themes cost 100 to 200).
4. **Streak badges**: a family of round fired-clay medallions. Distinct
   ones for 7, 14 and 21 days, and for 1 to 12 months, plus a design that
   can carry any number for "1 year N months" onwards. Also a locked look.
5. **Daily gift kiln**: a small kiln in closed, glowing (ready) and open
   states, and a 7-day row of gift slots with day 7 visibly special.
6. **Daily Kiln**: an icon for the home screen capsule, and a monthly
   calendar plate where each cleared day is a fired tile.
7. **Four glaze finishes** for the board tiles (gloss, speckled, crackle,
   matte), shown on all six colours, as notes on how to draw each in a 2D
   canvas (the board is drawn in `src/game/render.ts`), not just pictures.
8. **Three exit effects** for a block leaving through its gate (kiln puff,
   petals, glaze splash), as short frame-by-frame descriptions plus a still
   of the peak frame. Calm, under half a second, no screen shake.
9. **Shop layout**: a mock-up of the shop with four sections (Themes,
   Characters, Glazes, Effects) in the menu's "juicy, bubble-gummy" capsule
   style from `CLAUDE.md`.

Put an overview page (`design/depth/overview.html`) showing everything, and
a `NOTES.md` listing files, sizes and anything left undecided. Don't change
anything in `src/`.
