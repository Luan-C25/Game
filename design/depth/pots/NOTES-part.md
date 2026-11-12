# Pottery shelf art (part)

Built by `node design/depth/build-pots.mjs`. Flat vector only: ground shadow, darker underside (right edge and foot), one highlight strip, no gradients.

## Files (all in design/depth/pots/)

- `pot-N-<slug>.svg`, `pot-N-<slug>-gold.svg`, `pot-N-<slug>-empty.svg` for N = 1 to 10: 96 x 120 each (30 files).
- `pot-empty.svg`: generic not-fired outline, 96 x 120.
- `shelf.svg`: 375 x 1080, sample state (pots 1-4 gold, 5-6 fired, 7-10 empty). 2 pots per row, 5 planks, pots drawn at 1.15x (about 110 wide), chapter name on a plaque under each plank.
- `shelf-empty.svg`: 375 x 1080, all ten not fired.
- `manifest.json`: 33 entries `{file, width, height, label, group:'pots'}`.

## Design intent

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

## Undecided

- Shelf is taller than one screen (1080) so it scrolls; the game must draw its own title and the "x of 10 fired" count.
- Labels are SVG text in Baloo 2; the game may prefer to draw labels itself (then use the pot files only).
- Fired but not gold has no marker besides colour; a small "par" badge on gold slots is not drawn.
- Empty outlines use a warm brown ink tuned for the cream shelf wall; on a dark screen they would need a lighter ink.
- Pots 2 and 7 sit lower and wider than the others on purpose; heights are not normalised.
