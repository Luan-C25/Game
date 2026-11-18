# Streaks, daily gift and Daily Kiln art

Design only. Built by `design/depth/build-streaks.mjs` (run `node design/depth/build-streaks.mjs`). Nothing in `src/` was touched. Flat vector, a ground shadow, a darker underside and one highlight on every object. Text uses `'Baloo 2'` weight 800 with sans fallback. `manifest.json` lists every SVG.

## Files and sizes

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

## Streak length to badge

- 7, 14, 21 days: `badge-7`, `badge-14`, `badge-21`.
- 30, 60, 90 ... 360 days = months 1 to 12: `badge-month-NN`. Month 12 (360 days) is the one-year badge.
- Anything longer: `badge-year-template` (1 year 1 month onward).
- Not yet earned: `badge-locked`.

## Composing the year template

The text is two `<text>` nodes holding `1y 3m`: a dark shadow copy first, then the light copy with `id="label"`. The game builds the string, `1y` when months is 0, otherwise `${years}y ${months}m` (for example `1y 3m`, `2y 11m`), and sets it on both nodes. Font size 22 fits up to `10y 11m`; drop to 18 beyond that. If the SVG is used as an image rather than inline, regenerate it from the script with the string instead.

## Undecided

- Days 7, 14 and 21 reuse metals that months 1 to 11 also use (bronze, silver), told apart by the "DAYS" versus "MONTHS" label and the face colour. Check they read apart on a phone.
- Gift amounts (10 to 60) are placeholders for the economy.
- Day 7 card text says "A new character for your shelf"; the later coin-prize version (all characters owned) is not drawn.
- Missed days in the calendar are a darker dimple with an underline; future days are plain dimples.
- Not visually checked in a browser (the preview pane was hidden); all 25 SVGs parse as strict XML.
