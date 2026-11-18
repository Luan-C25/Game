# Glaze finishes, exit effects and shop: part notes

Design only. Nothing in src/ or design/maps/ was changed. Rebuild everything with: node design/depth/build-finishes.mjs

## Files

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

## Not decided

- Price points. Shop prices (glazes 150 to 200, effects 80 to 120, characters 120 to 200, themes 100 to 200) are placeholders for the economy pass.
- Which finish and effect are free defaults. The mock-ups assume gloss and kiln puff are free and equipped at first; plain fade is shown as an extra owned effect.
- Whether glyphs turn on by default. Recommended, because speckled and crackle give the face a little more visual noise.
- Whether the crackle and speckle patterns should be generated per block or cached as sprites per colour and shape (see glazes.md, performance notes). Per block is the simplest.
- Gates on the other three sides: the effect tables assume the gate faces right and say how to rotate them. Not drawn as stills.
- The shop mock-ups use Baloo 2 with a sans fallback. Text is live SVG text, so a viewer without the font falls back to Trebuchet or similar. For export to PNG, install Baloo 2 first.
- Item names beyond the brief (Baker, Fox, Plain fade) are placeholders.
- The finishes are drawn on the tile face only; the crate (obstacle) keeps its ribs and ignores the finish.
