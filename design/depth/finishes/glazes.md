# Glaze finishes for board tiles

Design only. Four finishes for the tile face in render.ts: gloss, speckled, crackle, matte. See finishes-sheet.svg for all four on all six colours.

Every finish is a change to what is drawn on top of the flat base colour inside drawBlock. The base colour is read from blockColour(block.color) exactly as today, and nothing below ever replaces it, blends it towards another hue or adds a gradient. The six Okabe-Ito tile colours stay fixed: #E69F00 #56B4E9 #009E73 #CC79A7 #0072B2 #D55E00.

## What stays the same in every finish

These steps already exist in drawBlock and do not change. Keep them in this order.

1. Contact shadow: black at alpha 0.34, offset by depth * 0.3 and depth * 1.25.
2. Side wall (the darker underside): shade(base, 0.44), drawn at dy + depth.
3. Top face: solid base colour.
4. (Finish layer goes here, clipped to the face.)
5. Cell seams for multi-cell pieces.
6. Rim line: tint(base, 0.5) at alpha 0.85, inset 1.5 px. Skipped for matte, which has its own inset.
7. Hard outline: shade(base, 0.58) at alpha 0.9.
8. Colour-blind glyph, if the setting is on. Always last, always the same size and ink, in every finish.

Today step 4 is the soft vertical-gradient sheen. Gloss replaces it with a flat pill (no gradient, as the style rules say). A finish is a small function that draws step 4 (and for matte, swaps step 6).

## Shared helpers

Seeding. A tile's pattern comes from its block id, never from Math.random and never from the frame. Same tile, same pattern, every frame, every restart of a level.

~~~
function rng(seed) {            // mulberry32
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
~~~

Cache. Compute each tile's pattern once, when the level loads, as plain numbers in unit coordinates (0 to 1 across the tile face): a small array of speckles, or a transform choice for crackle. Store it in a Map keyed by block id. Each frame the draw code scales those numbers by the block's pixel bounds. A block covering several cells uses the bounds of the whole piece, so the pattern stretches with the piece; for pieces longer than two cells, tile the pattern per cell (loop over blockCells) so dots do not smear.

A finish is chosen from the save (equippedGlaze). Crates ignore the finish and keep their ribs.

The face path is face() from drawBlock; b is bounds (x, y, w, h); cell is the cell size; k = cell / 56 is a scale factor so numbers below hold at any board size.

## 1. Gloss (default, free)

Crisp, glassy, one highlight.

- Fill: the flat base colour, as today.
- Rim/underside offsets: as today. depth = max(3, round(cell * 0.11)), underside shade 0.44.
- Highlight shape: one flat pill, white at alpha 0.55, no gradient. Position: x = b.x + 0.13 * b.w, y = b.y + 0.11 * b.h, width 0.5 * b.w, height 0.14 * b.h, fully rounded ends.
- Nothing else on the face.

~~~
// step 4, gloss
ctx.save();
face(); ctx.clip();
const hx = b.x + 0.13 * b.w, hy = b.y + 0.11 * b.h;
const hw = 0.5 * b.w, hh = 0.14 * b.h;
ctx.fillStyle = 'rgba(255,255,255,0.55)';
ctx.beginPath();
ctx.roundRect(hx, hy, hw, hh, hh / 2);   // fallback: two arcs and a rect for older WebViews
ctx.fill();
ctx.restore();
~~~

Cost: one clipped path fill. Cheaper than today's createLinearGradient per tile per frame, so gloss is a small saving.

Colour: white over the base at 0.55 alpha is confined to a 14 percent strip at the top. The other 86 percent of the face is the exact base colour.

## 2. Speckled

A fired-clay look: tiny flecks, like a glaze with iron in it.

- Fill: the flat base colour.
- Rim/underside offsets: as today.
- Highlight: one small satin pill, white alpha 0.32, 0.3 wide by 0.1 high at the same top-left origin. Smaller than gloss so the flecks read first.
- Speckles: 15 per cell. The first 10 are dark: shade(base, 0.32) at alpha 0.6. The last 5 are light: tint(base, 0.55) at alpha 0.75. Radius is (0.016 + r * 0.02) * cell, at least 0.9 px. Positions are in the inner 70 percent of the face: x = 0.15 + r * 0.7, y = 0.17 + r * 0.66, so no fleck touches the rim.

Pattern precompute, once per block:

~~~
function makeSpeckles(blockId) {
  const r = rng(blockId * 7919 + 13);
  const list = [];
  for (let i = 0; i < 15; i++) {
    list.push({ x: 0.15 + r() * 0.7, y: 0.17 + r() * 0.66, r: 0.016 + r() * 0.02, light: i >= 10 });
  }
  return list;
}
~~~

Per frame:

~~~
// step 4, speckled (face already clipped)
drawPill(b, 0.13, 0.11, 0.3, 0.1, 'rgba(255,255,255,0.32)');
const sp = speckleCache.get(block.id);
// batch by colour: two fills, not fifteen
ctx.fillStyle = darkFleck;            // shade(base, 0.32), computed once per colour, with alpha baked in
ctx.beginPath();
for (const p of sp) if (!p.light) { const px = b.x + p.x * b.w, py = b.y + p.y * b.h; ctx.moveTo(px + rr, py); ctx.arc(px, py, Math.max(0.9, p.r * cell), 0, TAU); }
ctx.fill();
ctx.fillStyle = lightFleck;           // tint(base, 0.55)
ctx.beginPath();
for (const p of sp) if (p.light) { /* same, light ones */ }
ctx.fill();
~~~

Colour: flecks cover under 6 percent of the face and are the same hue, only darker or lighter by a fixed amount. The majority of the face remains the exact base colour.

## 3. Crackle

Fine hairline cracks, like old crazed glaze.

- Fill: the flat base colour.
- Rim/underside offsets: as today.
- Highlight: one pill, white alpha 0.4, 0.34 wide by 0.11 high.
- Cracks: one fixed set of 6 thin hairline polylines in unit coordinates (the CRACKLE array in build-finishes.mjs holds exactly these). Stroke shade(base, 0.38) at alpha 0.55, width max(0.8, cell * 0.016), round caps and joins. Clip to the face so no crack passes the edge.
- Variety without randomness: each block picks one of 8 variants, seed % 8, which is 4 rotations times an optional mirror of the same template. Neighbouring tiles look different, but no path is generated at runtime.

~~~
const CRACKLE = [
  [[0.06,0.34],[0.30,0.42],[0.46,0.30],[0.72,0.38],[0.94,0.27]],
  [[0.46,0.30],[0.53,0.08]],
  [[0.30,0.42],[0.26,0.70],[0.52,0.78],[0.62,0.96]],
  [[0.72,0.38],[0.66,0.62],[0.90,0.76]],
  [[0.26,0.70],[0.06,0.82]],
  [[0.52,0.78],[0.78,0.88]],
];
function variantPoint(v, x, y) {      // v = block.id % 8
  if (v >> 2) x = 1 - x;              // mirror
  for (let i = 0; i < (v & 3); i++) { const t = x; x = 1 - y; y = t; }   // rotate 90 degrees
  return [x, y];
}

// step 4, crackle (face already clipped)
drawPill(b, 0.13, 0.11, 0.34, 0.11, 'rgba(255,255,255,0.4)');
ctx.strokeStyle = crackColour;        // shade(base, 0.38) with alpha 0.55
ctx.lineWidth = Math.max(0.8, cell * 0.016);
ctx.lineCap = 'round'; ctx.lineJoin = 'round';
ctx.beginPath();
for (const line of CRACKLE) {
  for (let i = 0; i < line.length; i++) {
    const q = variantPoint(v, line[i][0], line[i][1]);
    const px = b.x + q[0] * b.w, py = b.y + q[1] * b.h;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
}
ctx.stroke();                          // one stroke call for all six lines
~~~

Cost: 6 polylines, about 20 points, one stroke. Cache the point list per block (or per variant, then offset by bounds) so no per-frame trig or allocation.

Colour: the stroke is 1 px and at most 4 percent of the face, same hue family, darker by a fixed amount.

## 4. Matte

No shine. Reads as unglazed, soft-fired clay.

- Fill: the flat base colour.
- Highlight: none.
- Rim: the usual bright rim line is skipped. Instead a soft inset: a dark band on the top-left inside edge and a light band on the bottom-right inside edge, as if the face were pressed in a little.
- Underside offsets: as today (depth and shade 0.44), so the tile still stands proud of the tray.
- Inset widths: sh = max(1.4, cell * 0.04). Dark: shade(base, 0.3) at alpha 0.38. Light: tint(base, 0.35) at alpha 0.3. Both strokes are 2 * sh wide and clipped to the face, so only the inner half shows.

~~~
// step 4 and 6, matte (face already clipped)
const sh = Math.max(1.4, cell * 0.04);
ctx.lineWidth = sh * 2;
ctx.strokeStyle = darkInset;           // shade(base, 0.3), alpha 0.38
strokeFaceOffset(+sh, +sh);            // the face path shifted down-right: shadow lands top-left
ctx.strokeStyle = lightInset;          // tint(base, 0.35), alpha 0.3
strokeFaceOffset(-sh, -sh);            // shifted up-left: light lands bottom-right
// no rim line, no highlight
~~~

Where strokeFaceOffset(ox, oy) calls blockPath(ctx, block, vp, dx + ox, dy + oy, inset) then ctx.stroke().

Cost: two clipped strokes, no gradients.

Colour: the inset bands are 1 to 2 px of a fixed lighter and darker step of the same colour.

## Performance notes for low-end Android

- No gradients and no shadowBlur anywhere in the finish layer. Everything is a flat fill or a hairline stroke, which is the cheapest thing a WebView canvas does. The existing sheen gradient goes away.
- Batch by colour: speckles in two fills, cracks in one stroke. Never one draw call per fleck.
- Precompute per-block patterns on level load and keep them in a Map. Per frame there is no rng call, no allocation, no string building. Cache the derived colour strings (shade/tint results) per colour, not per tile.
- One clip per tile (reuse the clip already made for the sheen) and do all finish drawing inside it.
- Stills: tiles that are not moving do not need redrawing at 60 fps. If the renderer already caches a static layer, keep blocks out of it as now; if blocks are redrawn on idle frames, consider an offscreen sprite per (colour, finish, shape) at the board's pixel size. A level has at most a few dozen blocks, so the memory is small, and a drawImage per block replaces about 20 path ops. Seeds then apply per colour and shape rather than per block, which is fine for speckled and crackle.
- Speckle count is the only knob: 15 per cell is the default; a low-end flag can use 8 and skip the light flecks.
- Reduced motion has no effect: finishes are static.

## How colour is preserved

- Base fill: always blockColour(block.color), exact hex, unmodified.
- Every overlay is a fixed tint or shade of that same colour, or white at low alpha, covering a small fraction of the face.
- Outline, underside, rim and glyph already derive from the base colour with fixed factors, so they carry the same hue in every finish.
- The finish never depends on the colour index, so no finish can be mistaken for a colour cue.

## Colour-blind distinguishability

Distinguishing the six tiles must never depend on the finish.

- The glyph (circle, triangle, square, diamond, star, hexagon) is drawn last, at the same size and ink, in every finish. Speckles and cracks are drawn under it and are far lower contrast, so they cannot hide it.
- Patterns are identical for every colour. A speckled orange tile and a speckled blue tile differ only by hue, lightness and glyph, never by pattern, so the pattern cannot be read as a colour code.
- The finish does not change lightness meaningfully. The highlight pill sits in the top 25 percent and the flecks are small, so the Okabe-Ito lightness differences, which are what colour-blind players rely on, survive.
- Matte has no highlight at all, which makes it the calmest option for players who find glints distracting.
- Recommendation: glyphs on by default (already on the parked list), because speckled and crackle slightly reduce the face area available for a shape-free read.
- Check before shipping: run finishes-sheet.svg through a deuteranopia and protanopia simulation and confirm the six columns still separate.
