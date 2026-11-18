# Five new themes: notes

Files in this folder:

- `themes.ts`: the five `Theme` objects, same shape as `THEMES` in `src/game/theme.ts`.
- `preview.html`: open it from disk. The board is drawn by a port of `src/game/render.ts`.
- `preview.png`: a screenshot of that page.

Nothing in `src/` was touched. Tile colours are the fixed six.

## How the numbers were checked

All ratios are WCAG 2 contrast ratios, computed by a script from the hex
values in `themes.ts`, not judged by eye.

The six tiles have relative luminance between 0.16 (blue) and 0.43 (orange).
To clear 1.6:1 against all six at once, a floor has to be either very light
(luminance above about 0.72) or very dark (below about 0.08). There is no
mid-tone floor that works, which is why four of these floors are near-white
tints and two are near-black. The fun comes from the tray, backdrop and
buttons instead.

## Rule 1: every tile against the floor (minimum 1.6:1)

| Tile | Citrus | Bubblegum | Seaside | Meadow | Lantern |
|---|---|---|---|---|---|
| Orange `#E69F00` | 2.17 | 2.08 | 5.99 | 2.16 | 8.14 |
| Sky blue `#56B4E9` | 2.22 | 2.13 | 5.85 | 2.21 | 7.94 |
| Green `#009E73` | 3.29 | 3.16 | 3.95 | 3.28 | 5.36 |
| Pink `#CC79A7` | 2.95 | 2.83 | 4.41 | 2.93 | 5.99 |
| Blue `#0072B2` | 4.99 | 4.79 | 2.60 | 4.96 | 3.54 |
| Vermilion `#D55E00` | 3.72 | 3.58 | 3.49 | 3.70 | 4.74 |

**None are under 1.6:1.** The lowest is orange on the Bubblegum floor at 2.08.

## Every tile against the tray (contrast, and hue distance)

The brief says the tray must not be close to a tile in hue and lightness
together. A pair is a problem only if both numbers are small.

| Tile | Citrus | Bubblegum | Seaside | Meadow | Lantern |
|---|---|---|---|---|---|
| Orange | 1.46, 38° | 2.87, 144° | 1.92, 1° | 2.91, 69° | 3.17, 124° |
| Sky blue | 1.49, 122° | 2.81, 56° | 1.97, 159° | 2.84, 91° | 3.09, 76° |
| Green | 2.21, 84° | 1.89, 94° | 2.92, 121° | 1.91, 53° | 2.08, 114° |
| Pink | 1.98, 113° | 2.12, 69° | 2.61, 76° | 2.14, 144° | 2.33, 49° |
| Blue | 3.35, 122° | 1.25, 56° | 4.43, 159° | 1.26, 91° | 1.38, 76° |
| Vermilion | 2.50, 53° | 1.67, 129° | 3.30, 16° | 1.69, 84° | 1.84, 109° |

No pair is close on both. The ones to look at in the preview are listed
under "Not sure about" below.

## Rule 3: text (minimum 4.5:1)

| Pair | Citrus | Bubblegum | Seaside | Meadow | Lantern |
|---|---|---|---|---|---|
| `text` on `surface` | 12.52 | 13.99 | 13.32 | 13.46 | 11.24 |
| `accentInk` on `accent` | 7.40 | 5.47 | 5.66 | 8.95 | 8.61 |
| `text` on `backdrop` | 10.61 | 10.50 | 8.21 | 10.48 | 14.85 |
| `muted` on `backdrop` | 5.11 | 4.99 | 5.17 | 4.93 | 7.75 |
| `muted` on `surface` | 6.03 | 6.65 | 8.40 | 6.33 | 5.86 |

All pass AA. The last three rows were not required, but the Undo, Hint and
Restart labels and the footer line sit straight on the backdrop, so they
were checked too.

## Rule 4: the `dark` flag

Only Lantern has light text (`#fbeedd`) and only Lantern has `dark: true`.

## The themes

### Citrus (100 coins)

A lime tray on a lemon backdrop, with a cream floor and a mint Hint button:
the lemonade-stand one, and the brightest of the five. It works because the
lime sits at a hue none of the tiles use (between orange and green, 38° and
84° away) and is lighter than every tile, so even the orange gate reads as a
darker, warmer bar on it. The cream floor keeps the same warmth as the
backdrop without drifting towards the orange tile.

### Bubblegum (150 coins)

Pink everywhere except the board: a bubblegum backdrop, a blush floor, a
hot-pink Hint button, and a grape tray. The tray is grape and not pink on
purpose. A pink tray would sit on top of the pink tile (`#CC79A7`), so the
pink lives in the places tiles never touch, and the grape gives the tray a
dark, saturated frame that makes the pale floor and the tiles pop.

### Seaside (150 coins)

A shell-white tray around a deep-sea floor, on a sky-blue backdrop, with a
coral Hint button like a life ring. It is the only light theme with a dark
floor, so it feels different in the hand from the other four, and it has the
strongest tile contrast of the light themes (2.60 to 5.99). The sky backdrop
is close to the sky tile, but the backdrop never touches a tile: the tray
and floor are always in between.

### Meadow (100 coins)

A hedge-green tray, a daisy-white floor with a faint green cast, a
spring-leaf backdrop and a sunflower Hint button. The tray green is a
yellow-leaning leaf green, 53° of hue away from the teal-leaning green tile
and clearly darker than it (1.91:1), so the two greens do not merge.

### Lantern (200 coins)

The cosy evening one: a plum tray on an aubergine backdrop, a near-black
floor, cream text and an amber Hint button, like a lamp in a dark room. It
is priced highest because the current dark themes are the popular kind and
this is the most distinct from them: Slate and Ink are both cold blue-greys,
this is warm.

## Not sure about

1. **Blue tile against the dark trays.** Blue against the Bubblegum, Meadow
   and Lantern trays is 1.25, 1.26 and 1.38:1. The hues are far apart (56° to
   91°) so they do not look alike, but in lightness alone they are close. In
   play a tile only meets the tray across the floor's dark lip, and a gate
   sits inside its own dark channel, so I think it is fine. Look at the blue
   gate on the bottom edge of those three trays in the preview to judge.
2. **Orange against the Seaside tray.** Same hue (1° apart) but the tray is
   much lighter (1.92:1). The orange gate on the right edge of the Seaside
   preview is the test.
3. **Citrus is the gentlest tray.** Lime on lemon is 1.28:1, and lime against
   the cream floor is 1.49:1. The tray's dark underside and the floor's inner
   shadow do the separating. If it looks washed out on a real phone in
   daylight, darken `tray` to about `#9fd03f`.
4. **Grooves on the light floors.** The renderer derives the groove colour
   from the floor (36% darker). On the four light floors orange and sky blue
   are only about 1.15:1 against the groove itself. That is the same as Warm
   Clay and Porcelain today, and grooves are thin lines that tiles cover, so
   I left it.
5. **Warm Clay only just clears the 1.6 bar.** By the same sums the existing
   Clay floor `#e5d8c8` is 1.61:1 against orange and 1.65:1 against sky
   blue. It passes, but all five new themes have more room than it does.
   The other three existing floors are comfortably clear (lowest 1.99).
6. **The tile sheen.** `render.ts` paints a soft white fade on each tile face
   and `styles.css` paints the backdrop as a radial fade from `backdropLift`.
   The preview copies both because they are what the game does today. The
   themes themselves add no gradients: every field is one flat colour.
7. **`rim` is only used as a picker swatch** (`main.ts`), not by the board
   renderer, so it was chosen to look right as the fourth swatch.
8. **Prices** are 100, 150, 150, 100, 200. If these become one theme per
   chapter they would probably be unlocked by progress, not bought.
9. **The preview chrome is approximate.** Button sizes and positions were
   measured off the store screenshots, not taken from `styles.css`, and the
   icons are stand-ins. The colours are exact.
