# Exit effects: a block leaves through its gate

Design only. Three effects for the moment a block slides out of its gate: kiln puff, petals, glaze splash. The stills are effect-kiln-puff.svg, effect-petals.svg and effect-glaze-splash.svg (160 x 160, a slate tray corner with a gate and a tile mid-exit).

Shared rules:

- Calm. Under 0.5 s: puff 440 ms, petals 480 ms, splash 420 ms.
- No screen shake, no camera movement, no flash, no full-screen overlay.
- Nothing random per frame. Every particle's launch values come from a seeded generator, seeded with the block id when the exit starts, and the frame position is a pure function of time since the exit began. Same block, same exit.
- Flat shapes only: each particle is a flat fill with a darker underside copy offset 1.4 to 2.5 px down, plus at most one highlight dot on the large ones. No blur, no gradients, no star shapes, no sparkle glints.
- The gate is where the block leaves. The origin of every effect is the gate mouth: gateX, gateY, the middle of the opening on the outer wall line, in canvas pixels.
- Sizes below are for a 56 px cell. Multiply every length by k = cell / 56.
- Effects draw after the board and tiles in the same frame, so a particle can sit over the tray edge. They are cheap: at most 9 particles, 2 draw calls each.
- Reduced motion: skip the animation and draw nothing (the block simply leaves). Optionally hold the peak frame for 120 ms.
- Colour: kiln puff is neutral white and pale slate, so it works on every theme. Petals and splash take the leaving block's own tile colour (blockColour, unmodified), with the underside at shade 0.35 to 0.4 and the highlight at tint 0.6.

The effect runs on a time value t in milliseconds since the block crossed the gate line. A spawned list lives in a small array: { startTime, gateX, gateY, colour, seed, kind }. It is removed when t exceeds the effect length.

## Helpers

~~~
function easeOut(p) { return 1 - Math.pow(1 - p, 3); }
function clamp01(v) { return Math.max(0, Math.min(1, v)); }
// rng(seed) is the mulberry32 function from glazes.md
~~~

## 1. Kiln puff (default, free)

Three flat round puffs, like smoke from a kiln chimney, drifting up and out from the gate while growing and thinning. White face, pale slate underside so they read on light and dark themes.

Particles: 3. No randomness needed; the three puffs are fixed offsets. Palette: face #ffffff, underside #b9c4cf (offset 2.5 px down). Peak alpha 0.92.

| puff | start delay (ms) | radius start to end (px) | drift end (dx, dy) px |
|---|---|---|---|
| A | 0 | 3 to 14 | (16, -10) |
| B | 60 | 2 to 11 | (28, -22) |
| C | 110 | 2 to 8 | (10, -30) |

Per puff, local progress lp = clamp01((t - delay) / (440 - delay)) and e = easeOut(lp). Radius = r0 + (r1 - r0) * e. Position = gate + (dx, dy) * e. Alpha = 0.92 * (1 - fadeP), where fadeP = clamp01((lp - 0.5) / 0.5) squared, so it holds for the first half and thins in the second.

Frame by frame (computed from the same formulas as the still):

| t (ms) | puff A radius / alpha | puff B radius / alpha | puff C radius / alpha |
|---|---|---|---|
| 0 | 3 px / 0.92 | not started | not started |
| 60 | 6.9 px / 0.92 | 2 px / 0.92 | 2 px / 0.00 |
| 120 | 9.8 px / 0.92 | 5.6 px / 0.92 | 2.5 px / 0.92 |
| 180 | 11.7 px / 0.92 | 8.1 px / 0.92 | 5.1 px / 0.92 |
| 240 | 13.0 px / 0.91 | 9.7 px / 0.92 | 6.7 px / 0.92 |
| 320 | 13.8 px / 0.73 | 10.7 px / 0.80 | 7.7 px / 0.85 |
| 440 | 14 px / 0.00 | 11 px / 0.00 | 8 px / 0.00 |

Peak frame: 180 ms (effect-kiln-puff.svg). All three puffs are visible, A is near full size, C is still growing.

Pseudo-code:

~~~
function drawKilnPuff(ctx, fx, t, k) {
  const D = 440;
  for (const p of KILN_PUFFS) {              // the table above
    const lp = clamp01((t - p.delay) / (D - p.delay));
    if (t < p.delay) continue;
    const e = easeOut(lp);
    const fade = Math.pow(clamp01((lp - 0.5) / 0.5), 2);
    const a = 0.92 * (1 - fade);
    if (a <= 0.01) continue;
    const x = fx.gateX + p.dx * e * k;
    const y = fx.gateY + p.dy * e * k;
    const r = (p.r0 + (p.r1 - p.r0) * e) * k;
    ctx.globalAlpha = a;
    ctx.fillStyle = '#b9c4cf';               // underside
    ctx.beginPath(); ctx.arc(x, y + 2.5 * k, r, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
}
~~~

Cost: 6 arcs. Trivial.

## 2. Petals

Nine small petals fan out of the gate in the leaving block's own colour, turn slowly and drop a little as they fade. Think of a handful of petals tossed, not confetti: flat, slow, all one colour.

Particles: 9. Palette: face tint(colour, 0.12), underside shade(colour, 0.35) offset 1.4 px down, one highlight ellipse tint(colour, 0.6). Shape: ellipse 5.6 by 3.2 px, rotated.

Launch values come from rng(blockId) once, in this order per petal: angle jitter, distance, spin, starting rotation. (The still uses seed 4242 so the picture is reproducible.)

- Delay: petal i starts at i * 8 ms (0 to 64 ms).
- Direction: angle = -70 + (i / 8) * 140 degrees plus jitter of up to 8 degrees either way. That is a rightward fan; rotate the whole fan to point away from the gate for gates on other sides (angle += gate outward angle).
- Travel: distance 26 to 38 px, eased out. Gravity: an extra 14 px downward by the end, y += 14 * lp * lp.
- Spin: rotation = rot0 + spin * lp, spin within plus or minus 80 degrees.
- Alpha: 1 until lp = 0.6, then linear to 0 at lp = 1.
- Duration: 480 ms.

Seeded launch values used by the still (angle in degrees, distance in px, rotation start, spin):

| petal | delay (ms) | angle | distance | start rotation | spin |
|---|---|---|---|---|---|
| 1 | 0 | -69 | 29 | 91 | 69 |
| 2 | 8 | -50 | 29 | 72 | -38 |
| 3 | 16 | -37 | 33 | 136 | 37 |
| 4 | 24 | -16 | 38 | 135 | -26 |
| 5 | 32 | 6 | 28 | 19 | 23 |
| 6 | 40 | 12 | 29 | 38 | -60 |
| 7 | 48 | 29 | 28 | 77 | -8 |
| 8 | 56 | 54 | 32 | 65 | 68 |
| 9 | 64 | 64 | 36 | 119 | -67 |

Frame by frame:

| t (ms) | petals visible | mean distance from gate (px) | mean alpha |
|---|---|---|---|
| 0 | 1 | 0.0 | 1.00 |
| 80 | 9 | 8.6 | 1.00 |
| 160 | 9 | 19.7 | 1.00 |
| 240 | 9 | 26.4 | 1.00 |
| 320 | 9 | 30.1 | 0.89 |
| 400 | 9 | 32.0 | 0.45 |
| 480 | 0 | 0.0 | 0.00 |

Peak frame: 220 ms (effect-petals.svg). All nine are out and fully opaque, still fanned.

Pseudo-code:

~~~
function drawPetals(ctx, fx, t, k) {
  const D = 480;
  for (const p of fx.petals) {               // built once at spawn from rng(fx.seed)
    if (t < p.delay) continue;
    const lp = clamp01((t - p.delay) / (D - p.delay));
    const e = easeOut(lp);
    const a = 1 - clamp01((lp - 0.6) / 0.4);
    if (a <= 0.01) continue;
    const ang = p.angle * Math.PI / 180;
    const x = fx.gateX + Math.cos(ang) * p.dist * e * k;
    const y = fx.gateY + Math.sin(ang) * p.dist * e * k + 14 * lp * lp * k;
    ctx.save();
    ctx.translate(x, y); ctx.rotate((p.rot0 + p.spin * lp) * Math.PI / 180);
    ctx.globalAlpha = a;
    ctx.fillStyle = fx.petalUnder;            // shade(colour, 0.35), cached at spawn
    ctx.beginPath(); ctx.ellipse(0, 1.4 * k, 5.6 * k, 3.2 * k, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = fx.petalFace;             // tint(colour, 0.12)
    ctx.beginPath(); ctx.ellipse(0, 0, 5.6 * k, 3.2 * k, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = fx.petalGlint;            // tint(colour, 0.6)
    ctx.beginPath(); ctx.ellipse(-1.4 * k, -0.9 * k, 2.2 * k, 0.9 * k, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
}
~~~

Cost: 27 ellipse fills at most. Cache the three colour strings at spawn. A save/restore per petal is fine at this count.

## 3. Glaze splash

The block's glaze is poured out at the gate: a flat pool spreads on the lip and eight drops arc up and over, shrinking as they fall. Colour is the leaving block's colour.

Particles: 1 pool plus 8 drops. Palette: face colour (exact), underside shade(colour, 0.4) offset 1.4 px down (3 px for the pool), highlight dot tint(colour, 0.65) on the three large drops only.

- Pool: an ellipse centred 6 px below the gate point. rx grows 4 to 16, ry 1.5 to 5.5, eased out. Alpha holds to lp = 0.6 then fades to 0.
- Drops: launched in an upward fan, angle -165 to -15 degrees (8 drops, spaced evenly, plus jitter up to 6 degrees), speed 30 to 42 px over the effect, with a gravity term of 0.5 * 58 * lp * lp px. Position = gate + (cos, sin) * speed * lp + (0, 6 + gravity). Large drops (every third) start at 4.6 px, small ones at 3.2 px. Radius shrinks to 35 percent of its start by the end. Alpha holds to lp = 0.65 then fades to 0.
- Duration: 420 ms. Linear time for the drops (it reads as flung), eased for the pool.

Seeded launch values used by the still (seed 777):

| drop | angle | speed | start radius |
|---|---|---|---|
| 1 | -163 | 30 | 4.6 |
| 2 | -147 | 31 | 3.2 |
| 3 | -121 | 35 | 3.2 |
| 4 | -104 | 39 | 4.6 |
| 5 | -78 | 39 | 3.2 |
| 6 | -55 | 40 | 3.2 |
| 7 | -41 | 38 | 4.6 |
| 8 | -14 | 41 | 3.2 |

Frame by frame (drop figures are for drop 2, small, and drop 1, large):

| t (ms) | pool rx / ry (px) | pool alpha | drop alpha | drop radius, small / big (px) |
|---|---|---|---|---|
| 0 | 4.0 / 1.5 | 1.00 | 1.00 | 3.2 / 4.6 |
| 60 | 8.4 / 3.0 | 1.00 | 1.00 | 2.9 / 4.2 |
| 120 | 11.6 / 4.0 | 1.00 | 1.00 | 2.6 / 3.7 |
| 180 | 13.8 / 4.8 | 1.00 | 1.00 | 2.3 / 3.3 |
| 240 | 15.1 / 5.2 | 1.00 | 1.00 | 2.0 / 2.9 |
| 330 | 15.9 / 5.5 | 0.54 | 0.61 | 1.6 / 2.3 |
| 420 | 16.0 / 5.5 | 0.00 | 0.00 | 1.1 / 1.6 |

Peak frame: 150 ms (effect-glaze-splash.svg). The pool is mid-spread and every drop is near its apex.

Pseudo-code:

~~~
function drawGlazeSplash(ctx, fx, t, k) {
  const D = 420;
  const lp = clamp01(t / D), e = easeOut(lp);
  const poolA = 1 - clamp01((lp - 0.6) / 0.4);
  const rx = (4 + 12 * e) * k, ry = (1.5 + 4 * e) * k;
  ctx.globalAlpha = poolA;
  ctx.fillStyle = fx.under;                   // shade(colour, 0.4)
  ctx.beginPath(); ctx.ellipse(fx.gateX, fx.gateY + 9 * k, rx, ry, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = fx.colour;
  ctx.beginPath(); ctx.ellipse(fx.gateX, fx.gateY + 6 * k, rx, ry, 0, 0, TAU); ctx.fill();
  for (const d of fx.drops) {                 // built once at spawn from rng(fx.seed)
    const a = Math.PI * d.angle / 180;
    const x = fx.gateX + Math.cos(a) * d.speed * lp * k;
    const y = fx.gateY + (6 + Math.sin(a) * d.speed * lp + 0.5 * 58 * lp * lp) * k;
    const r = d.r0 * (1 - 0.65 * lp) * k;
    const da = 1 - clamp01((lp - 0.65) / 0.35);
    if (da <= 0.01) continue;
    ctx.globalAlpha = da;
    ctx.fillStyle = fx.under;
    ctx.beginPath(); ctx.arc(x, y + 1.4 * k, r, 0, TAU); ctx.fill();
    ctx.fillStyle = fx.colour;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    if (d.r0 > 4) { ctx.fillStyle = fx.glint; ctx.beginPath(); ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.32, 0, TAU); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
}
~~~

Cost: 18 arcs and 2 ellipses at most.

## Wiring notes

- Spawn once, when the block's last cell crosses the gate line: push { kind, startTime: now, gateX, gateY, colour, seed: block.id, ... } and build the petal or drop arrays from rng(seed). Do not allocate in the frame loop.
- Gates on other sides: rotate the fan. The tables assume the gate faces right; add the gate's outward angle to every angle, and rotate the drift vectors of the kiln puff the same way.
- Use the game's clock, not wall time, so pausing the game pauses the effect.
- Sound: the existing exit sound is enough. No new audio.
- Do not run an effect during a level-complete celebration if one already plays; the celebration owns the screen.
