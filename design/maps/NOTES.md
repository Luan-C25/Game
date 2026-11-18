# Chapter maps and game-screen backgrounds

Design only. Nothing in `src/` was changed and nothing imports these files.

## The ten chapters

Each chapter is 20 levels and 60 stars. The gate at the top of one map leads
to the next; chapter 10 ends at the Great Kiln instead of a gate.

| # | Name | Levels | Setting |
|---|---|---|---|
| 1 | Kiln Meadow | 1 to 20 | Potters' village in a meadow, river and wooden bridge |
| 2 | Clay Creek | 21 to 40 | Red clay banks, waterwheel, clay pits, stepping stones |
| 3 | Sunflower Fields | 41 to 60 | Yellow fields, windmills, a barn, hay bales, scarecrows |
| 4 | Market Town | 61 to 80 | Cobbled square, striped stalls, fountain, clock tower |
| 5 | Seaside Pier | 81 to 100 | Beach huts and palms, then a boardwalk out over the sea |
| 6 | Bluegum Forest | 101 to 120 | Tall gum trees, treehouses, a waterfall, a rope bridge |
| 7 | Lantern Gardens | 121 to 140 | Dusk garden, lantern strings, blossom trees, red bridge |
| 8 | Snowy Peaks | 141 to 160 | Snow, pines, cottages, cable cars, a frozen river |
| 9 | Glass Desert | 161 to 180 | Dunes, cactuses, oases, tents, glass furnaces |
| 10 | The Great Kiln | 181 to 200 | Sunset road lined with banners, up to the Great Kiln |

## Files

For every chapter `N`:

- `chapter-N-<name>.svg`: the map art, 375 by 1640. Scenery only, no level
  tiles, so the game can draw tiles and stars itself from the save.
- `chapter-N-nodes.json`: where the 20 level tiles sit on that art.
- `chapter-N-background.svg`: the game-screen background, 375 by 812.

Overviews, open from disk:

- `all-maps.html` and `all-maps.png`: all ten maps with level tiles on.
  Add `?from=4&count=3` to the address to look at a few at full size.
- `all-backgrounds.html` and `all-backgrounds.png`: all ten backgrounds
  behind the board, in the Slate theme.
- `preview.html`, `background-preview.html` and their images: the original
  chapter 1 close-ups (the background one shows three themes).

Scripts:

- `kit.mjs` and `props.mjs`: the drawing kit (trees, kilns, cottages, and the
  pieces for each setting).
- `build-map.mjs` and `build-background.mjs`: chapter 1.
- `build-chapters.mjs`: chapters 2 to 10 and both overviews. Run it with
  `node design/maps/build-chapters.mjs`. Each chapter is one block of
  settings near the top: colours, the road, and a list of scenery.

All the map and background art together is about 1.2 MB as files, and far less once zipped
inside the app.

## How the maps work

- **Level tiles** are glazed tiles in the game's six tile colours, in order,
  so every map looks like the game. Cleared tiles carry their three stars.
  The next level is bigger, ringed in white, with a pin that bobs. Locked
  levels are raw clay.
- **Scenery places itself.** Each piece asks for a spot beside the road and
  the script finds the nearest free one that is clear of the road, the
  water, the level tiles and other scenery. That is why nothing was placed
  by hand in chapters 2 to 10, and why adding a piece is one line.
- **Themes stay separate.** The map art and backgrounds never change with
  the theme. Headers, buttons, the board and the tiles do.
- **Style**: flat shapes only. Each object has a ground shadow, a darker
  underside and one highlight. No gradients, sparkles or texture.
- **Why vector art and not a Blender render**: it stays sharp on any phone,
  it is small, and the pieces can be animated later (smoke, water, lantern
  sway, the pin).

## How the backgrounds work

- Scenery sits in two places only: a far horizon between the header and the
  board, and a foreground along the bottom. The middle is plain ground so
  the board stays the loudest thing on screen.
- The Undo, Hint and Restart labels move onto small theme-coloured plates,
  because theme text colours cannot be trusted on a picture. The "free and
  unlimited" footer line has no place on this screen and would have to go.

## Things to look at

1. **Theme and background clashes.** A theme's tray can be close in colour
   to a chapter's ground: Citrus (lime) on the green chapters, Seaside
   (shell white) and Porcelain on Snowy Peaks, Warm Clay on Glass Desert
   and Clay Creek. The tray's dark underside keeps it readable, but these
   are the weakest pairings. A thin dark outline or a soft plate under the
   board would fix all of them at once.
2. **Lantern Gardens is the only dark chapter.** Light themes look bright
   on it. That may be fine, or it may want its own slightly dimmed board.
3. **Level 200** sits right at the foot of the Great Kiln's steps, slightly
   overlapping them. It reads as arriving, but it is the one tile that
   touches scenery.
4. **The stepping stones** in Clay Creek are mostly hidden under levels 28
   and 29 in the demo. They show better when those tiles are locked.
5. **Three-digit numbers** (levels 100 to 200) use a smaller number on the
   tile so they fit.

## Not decided yet

1. Does the map replace the level grid, or sit beside it? Ten maps end to
   end is about 16,000 px of scrolling. Opening on the current chapter with
   arrows to the next and previous one may be nicer.
2. Whether chapters are locked until the one before is finished. Today
   chapters are headings only and nothing is locked behind them.
3. Building any of this into the game. Nothing has been started.
