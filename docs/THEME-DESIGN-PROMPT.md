# Prompt: friendlier themes for Glazeway

Paste everything below the line into a new Claude Code session opened on
`C:\Users\TEST\Documents\LuanOS\Projects\colourjam`.

---

You are designing new colour themes for Glazeway, an Android sliding-block
puzzle (TypeScript + Canvas, in this repo). Another session is editing the game
code at the same time, so **only create files inside `design/themes/`. Do not
edit anything in `src/`, do not commit, and do not switch branches.**

## Read first

- `CLAUDE.md`: the owner's look-and-feel rules. They matter more than anything
  else here.
- `src/game/theme.ts`: the `Theme` interface and the four current themes
  (Slate, Warm Clay, Ink, Porcelain). Every field there is a colour the
  renderer uses, and the comments say what each one paints.
- `src/game/render.ts`: how the tray, floor, gates and blocks are drawn from
  those fields.
- `store/screenshot-2-early-board.png` and `store/screenshot-6-clay-theme.png`:
  what the board looks like now.

## The brief

Testers liked the game but the owner finds the current themes a bit dull:
four muted greys and browns. Design **five new themes that feel fun and
friendly**: brighter, warmer, more playful, like a well-made toy. Some ideas
to try (swap any of them for better ones): a sunny citrus/mint tray, a soft
bubblegum pink, a sky-blue seaside, a leafy garden green, a cosy evening
dark theme with a warm accent. Later these may become one theme per chapter
of 20 levels, so give each one a short, friendly name that could also be a
chapter name.

## Hard rules

1. **The six tile colours never change** (`BLOCK_COLOURS` in theme.ts: orange
   `#E69F00`, sky blue `#56B4E9`, green `#009E73`, pink `#CC79A7`, blue
   `#0072B2`, vermilion `#D55E00`). They carry the rules. Every theme must
   keep all six clearly readable against its floor and tray, so the tray and
   floor must not be close to any tile colour in hue *and* lightness. Check
   this, don't eyeball it: give the contrast ratio of each tile colour against
   the floor and report any under 1.6:1.
2. **No gradients standing in for depth, no sparkles, stars, glitter, noise or
   messy textures.** Depth comes from the geometry the renderer already draws
   (the extruded tray, the inset floor, the grooves), which is why a theme is
   a set of flat colours. The owner rejected an earlier design as "way too
   much like it was made by AI" for exactly those tells.
3. Text (`text` on `surface`, `accentInk` on `accent`) must pass WCAG AA:
   4.5:1. Give the ratios.
4. `dark` must be true only when `text` is light.

## What to deliver, all in `design/themes/`

1. `themes.ts`: the five themes as `Theme` objects in exactly the shape of
   `THEMES` in `src/game/theme.ts`, with every field filled in, plus a
   suggested coin `price` for each (current prices are 0, 250 and 400; testers
   said 250 felt steep, so stay at 100 to 200).
2. `preview.html`: one standalone page (no build step, open it straight from
   disk) showing each theme at phone size, 375 by 812, side by side. Each
   preview needs:
   - the backdrop
   - a 5 by 5 tray with its floor, grooves, two gates and three blocks in
     different tile colours
   - the Undo, Hint and Restart buttons in that theme's chrome colours
   Copy the proportions from the screenshots. It doesn't need to be pixel
   exact; it needs to show the colours honestly.
3. `preview.png`: a screenshot of that page (use Playwright or the browser
   tool).
4. `NOTES.md`: one paragraph per theme on the mood and why the colours work,
   the contrast ratios from rules 1 and 3, and anything you weren't sure about.

When you're done, reply with the path to `preview.png` and a two-line summary
per theme, so the owner can pick which ones go into the game.
