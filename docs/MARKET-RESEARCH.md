# Market Research: Replication Targets (Sept 2026)

Goal: find a currently-trending, high-retention mobile game that a solo dev can rebuild
with $0 tooling, ship to Google Play + web, and **improve** by fixing the things its own
players complain about.

## Scoring criteria

| Criterion | Why it matters |
|---|---|
| Proven demand (downloads/DAU) | De-risks the concept; no market education needed |
| Proven monetisation | Ads + IAP already validated in this exact loop |
| Mechanic is 2D + logic-driven | Buildable by one dev with free tooling, no 3D art pipeline |
| Loud, specific negative reviews | The improvement thesis writes itself |
| Broad age appeal | "All ages" requirement; also cheaper ad inventory |

---

## Candidate 1 — Color Block Jam  (PRIMARY RECOMMENDATION)

- **Developer:** Rollic Games (Zynga → Take-Two)
- **Play Store package:** `com.GybeGames.ColorBlockJam`
- **Store rating:** ~4.1★ from ~325K reviews
- **Scale:** passed **$100M bookings**; ~3M daily players within 4 months of launch;
  reported **~10% D90 retention** (exceptional for casual). Sensor Tower (Mar 2026):
  ~800K downloads and ~$6M revenue in a single month.
- **Mechanic:** grid of coloured multi-cell blocks inside a walled box. The walls have
  coloured exit gates. Slide a block straight out through a gate of its own colour.
  Blocks block each other → it becomes a sliding-order logic puzzle. Later layers add
  ice-encased blocks, chains, keys/locks, bombs, and move/time limits.

**Documented player complaints (our improvement list):**
1. Interstitial ads after *every* round; some ads bounce to the store and back in a loop
   until the app must be force-closed.
2. **Unsolvable levels** — players report levels that cannot be cleared without spending
   boosters/coins; "Level 230 is literally impossible."
3. Punishing timers and fast-fuse bombs that feel arbitrary rather than skilful.
4. **Level repetition** — reports of only ~10–12 board templates recycled across progression.
5. A "Failed Level Pack" IAP that is deliberately surfaced at peak frustration.

**Replication verdict: 100% confident.** Pure 2D grid + axis-aligned sliding + collision.
No physics engine, no 3D, no art pipeline — every block can be drawn as rounded vector
shapes in code. This is the lowest-risk / highest-return option on the list.

---

## Candidate 2 — Pixel Flow!  (Highest upside, highest effort)

- **Developer:** Loom Games (Scopely bought a majority stake on the back of this game)
- **Play Store package:** `com.loomgames.pixelflow`
- **Scale:** released late 2025; 10M+ players; reported **$108M+ grossing**; the only casual
  title launched in a 12-month window to break the US monthly top-20 grossing chart;
  seven-figure daily revenue within ~3 months.
- **Mechanic:** a conveyor belt runs across the screen. You tap a coloured character to
  send it onto the belt; it fires N shots (its ammo count) at pixel cubes of its own colour.
  Spent characters exit or fall into one of 5 holding slots. The belt has a capacity limit —
  overfill it and you stall. Tap → flow → repeat.

**Documented player complaints:**
1. Hard-tier levels described as **impossible without paying**; boosters cannot be earned
   by watching ads, only bought with real money → catch-22 (you need boosters to win, and
   winning is the only free way to get boosters).
2. Excessive unskippable ads, deliberately ramped up after ~level 20; ads fire after every
   level even when the player *declines* a reward.
3. Billing complaints (one report of a $44 charge vs $3 expected) and loss of "No Ads"
   entitlement after reinstall.
4. Stability: recent builds reported stuck on the loading screen.

**Replication verdict: confident, but ~2–3× the build effort** of Candidate 1 — it needs a
timeline/queue simulation, projectile timing, and much more careful level tuning. The
slot-management layer is genuinely novel, which is exactly why it is printing money and why
the clone field is still thin.

---

## Candidate 3 — Screwdom / the "nuts & bolts" genre  (Easiest, most saturated)

- **Developer:** iKame Games. Packages: `com.ig.screwdom`, `com.ig.screw.puzzle.nuts.botls`
- **Scale:** reported **$45M+** grossing. The genre is enormous — dozens of near-identical
  titles (`com.tangle.nuts.bolts`, `com.nuts.bolts.screw.master.puzzle.pin`,
  `com.woodscrew.nuts.bolts.unscrew`, and many more).
- **Mechanic:** unscrew coloured screws from overlapping plates and sort them into trays
  that hold three matching screws. Full trays clear. ASMR click/clack sound design.

**Documented player complaints:**
1. Pervasive intrusive ads, including **mid-level** interruptions, plus ad-triggered crashes
   and progress resets.
2. Heavy paywall from ~level 50 that players openly call "rigged."
3. **The watch-an-ad-for-a-hint option was removed** — help now costs in-game currency only.
4. Freezes after using several helpers in a row.

**Replication verdict: 100% confident — it's the simplest of the three.** But the genre is
the most crowded, organic discovery is close to zero, and ASMR audio polish is the whole
product. Best treated as a *secondary mode* inside a bigger app, not a standalone bet.

---

## Also considered, and why not

- **Block Blast!** (HungryStudio, `~18M downloads/month`, 70M DAU / 300M MAU, #1 on Google
  Play downloads). Trivial to replicate — and that is exactly the problem: hundreds of
  identical 8×8 block-drop clones already exist (e.g. BlockPuz at 50M+ installs). No
  differentiation available. Viable only as a bundled bonus mode.
- **Match-3 (Candy Crush / Royal Match)**: economically out of reach — those games win on
  content volume and user-acquisition spend, not mechanics.

---

## Market context

- Hybrid-casual was the **only** casual segment to grow IAP revenue in 2025 (+20%, to $4.2B).
- Casual D7 retention has declined steadily since 2022; hybrid-casual now outperforms plain
  casual on D7. A modern hypercasual title needs **D30 ≥ 5%** to be viable.
- Conveyor-belt and block-jam mechanics are the fastest-growing puzzle sub-genres of 2026.
- Puzzle is crowded at the top but "wide open for new mechanics" — a fresh take on a proven
  loop beats the thousandth match-3.

---

## Proposed differentiation (applies to whichever we pick)

Every complaint above is a design decision we can simply invert:

1. **Every level provably solvable.** Levels are generated then verified by an automated
   solver that must find a win inside the stated move budget, with a recorded solution
   path. This is a headline store-listing claim none of the incumbents can make.
2. **Ad contract, stated in-game.** Never mid-level. Never after a win. Interstitials only
   on a fail-continue, hard-capped, with a guaranteed minimum gap. Rewarded ads are always
   opt-in.
3. **Every booster earnable by ad or play.** No booster is cash-only, ever. This directly
   removes the catch-22 that Pixel Flow players are furious about.
4. **No fake scarcity.** No timers on puzzle levels unless the level is explicitly a
   timed-mode level the player chose to enter.
5. **Procedural + hand-curated levels** on a tuned difficulty curve, so boards never feel
   recycled.
6. **Fully offline.** No forced login, no network required to play.
7. **"No Ads" purchase is restorable forever** and honoured across reinstalls.

## Free tech stack

| Layer | Choice | Cost |
|---|---|---|
| Language/engine | TypeScript + Phaser 3 (MIT) or raw Canvas | $0 |
| Build | Vite | $0 |
| Android wrapper | Capacitor (MIT) → signed AAB | $0 |
| Ads | Google AdMob via Capacitor community plugin | $0 (revenue share) |
| IAP | Google Play Billing via Capacitor plugin | $0 (revenue share) |
| Art | Procedural vector shapes drawn in code; CC0 assets where needed | $0 |
| Audio | CC0 SFX libraries | $0 |
| Web hosting | GitHub Pages / Netlify / Cloudflare Pages free tier | $0 |
| Save data | Local storage; optional cloud sync on a free tier later | $0 |

**Unavoidable non-zero costs:** Google Play developer registration **$25 one-time** +
identity verification. Personal accounts must additionally run a **closed test with 12
testers for 14 days** before public release (organization accounts are exempt). Apple's
App Store, if we ever go there, is $99/year — out of scope for now.

## Sources

- FoxData, Global Mobile Game Rankings July 2026
- Gamigion, Top Grossing Hypercasual Puzzles 2026 / Color Block Jam IAP scaling
- Gamesforum (Global Games Forum), Color Block Jam: The Art of Monetization in Stages
- Deconstructor of Fun, Pixel Flow: The Publisher's Dream; State of Mobile 2026
- PocketGamer.biz, How Rollic scored a $100m hybridcasual hit
- Appfigures, Color Block Jam Crosses $25M
- Apple App Store + Google Play user reviews (Pixel Flow, Color Block Jam, Screwdom)
- AppBrain popular/trending Android puzzle charts, Sept 2026
- Google Play Console Help — registration fee and closed-testing requirements
