# Retention and depth research for Glazeway

Date: 12 November 2026. Method: web searches plus two article fetches. Evidence was thinner than hoped: review sites were mostly automated aggregators, and several named games (Monument Valley, Two Dots, Nonogram.com, Mini Metro, Islanders, Wordscapes, Good Sudoku) returned nothing specific. Items marked (inferred) are my judgement or general knowledge, not seen on a page.

## 1. Direct competitors

- Color Block Jam (Rollic): a "No More Ads" purchase at $1.99 and a 24 hour cooldown on a daily reward; reviewer says the reward screen text is cut off. https://www.gamigion.com/?p=30530
- Color Block Jam: an audit site (AI-generated, low trust) says post-update ad frequency caused churn complaints and that a daily challenge system drives retention. https://blog.insightrackr.com/en/docs/ColorBlockjamIntelligence and https://marlvel.ai/api/llm/apps/games/color-block-jam
- Water Sort clones: the dominant complaint is excessive ads; praise is for the relaxing, "therapeutic" pace. https://kimola.com/reports/unlock-insights-water-sort-puzzle-user-feedback-report-app-store-us-153352
- Nuts and Bolts clones: mixed reception; liked graphics, disliked monetisation; time-limited seasonal quests frustrate players who cannot continue. https://gamebrain.co/game/nuts-bolts-3d-screw-master and https://marlvel.ai/apps/nuts-bolts-3d/reviews
- Tangle Master 3D: 100M+ downloads, uses limited moves per level. https://justuseapp.com/en/app/1512799121/tangle-master-3d/reviews
- Takeaway: the genre competes on ad load. A calm, fair, low-ad game is itself the differentiator (inferred).

## 2. Calm and mid-core puzzle games

- Daily puzzle with monthly trophy track (bronze/silver/gold) and monthly completion badges: seen on Sudoku-style apps, not confirmed on Sudoku.com itself. https://apps.apple.com/app/id834107022 and https://www.exophase.com/game/microsoft-sudoku-xbox-2/achievements/
- Streaks: most apps reset on a missed day but keep the best streak; "Sudoku a Day" sends reminders to keep the streak alive. https://apps.apple.com/app/sudoku-a-day/id6743453284
- Royal Match: seasonal collections made endlessly repeatable; leaderboard events now paired with a finite personal achievement track so non-winners still earn. Coin rewards from levels were cut about 30% to offset. https://naavik.co/digest/live-ops-trends-powering-mobile-puzzle/
- Daily jackpot replaces plain login bonuses: needs a win in core play, solvable in one session. Same Naavik page.
- Daily missions are an "appointment mechanic"; plain login gifts are "passive". Toy Blast, Candy Crush, Royal Match examples. https://www.deconstructoroffun.com/blog/2024/9/23/daily-missions-in-puzzles-why-should-we-see-them-more-often
- Collectibles give "a long-term goal without requiring complex progression" (summary of a LiveOps guide, search snippet). https://appmagic.rocks/blog/mechanicsfor2026
- Not found: Monument Valley, Two Dots, Nonogram.com, Islanders, Mini Metro specifics. (From general knowledge, inferred: premium titles retain on content and polish, not meta.)

## 3. Cosmetic shop ideas

No source I fetched ranked shop items by player demand. All below are inferred from the genre, fitted to the theme:
- Glaze finishes per tile (gloss, matte, crackle, speckle), shape overlays kept colour-safe.
- Tray materials (slate, oak, terracotta), board lighting presets.
- Exit/clear effects (kiln glow, steam puff, bell chime).
- Music or ambient packs (workshop, rain on the kiln roof).
- Map decorations per chapter (a pot shelf in Kiln Meadow, lanterns in Lantern Gardens).
- Profile stamps or potter's marks for a stats page.
- Constraint: tile colours must stay fixed (Okabe-Ito), so skins change finish and edge, never hue.

## 4. Retention evidence and dark patterns

- GameAnalytics Q1 2024 medians: D1 22.91%, D7 4.2%, D28 0.85%; puzzle has the highest D7 of any genre. https://gamedevreports.substack.com/p/gameanalytics-benchmarks-in-mobile
- 2026 summary: median D1 about 22%, D7 about 4%, top 10% D7 about 12%. https://investgame.net/wp-content/uploads/2026/01/2026-01-20-Mobile_retention_benchmarks_2026.pdf
- Casual puzzle ranges of 30-40% D1, 10-20% D7, 3-7% D30 appear on uncited blogs; treat as rough. https://blog.playio.co/retention-by-game-genre
- I found no measured lift figures for daily rewards or streaks.
- Dark patterns: a University of Bremen study of 1,496 mobile games found about 90% contained some dark pattern. https://arxiv.org/html/2412.05039v1
- Streak warnings and guilt-worded opt-outs are called manipulative. https://www.pocketgamer.biz/feature/78594/prevent-ui-ux-dark-patterns-f2p-mobile-games/ and https://better-internet-for-kids.europa.eu/en/dark-patterns
- Nothing specific found on "watch ad to double reward"; common sense says make the base reward complete and the ad optional (inferred).

## Ranked candidate features

1. Chapter completion stars and per-level par/"perfect" marks: gives replay value, uses existing par solution. Risk: none.
2. Achievements list (about 30, calm, e.g. "clear a chapter without hints"): cheap, permanent. Risk: avoid achievements that punish hint use.
3. Daily puzzle (one fixed level per day, same for everyone): the best-evidenced habit driver. Risk: no timer; make it replayable later.
4. Monthly potter's badge for finishing dailies (keep partial progress, no loss on a miss): Sudoku-style. Risk: none if misses cost nothing.
5. Daily login gift with no streak reset (calendar fills, never empties): simple. Risk: guilt if it resets, so never reset.
6. Glaze finish skins for tiles (fixed hues): main new shop line. Risk: must not alter colour readability.
7. Tray and lighting sets, kiln-clear effects: more shop depth. Risk: low.
8. Map decorations earned by chapter progress, bought with coins: a gentle decorating meta. Risk: keep it finite, no timed unlocks.
9. Collection book of pottery pieces, one per chapter cleared plus bonus finds: completionist goal. Risk: guaranteed, never random drops (loot box rule).
10. Optional rewarded ad for a coin bonus after a win: standard. Risk: base reward must stay complete.
11. Ambient music packs: low effort once audio exists. Risk: low.
12. Weekly mini goals ("clear 5 levels in any chapter"), no leaderboard: an appointment mechanic. Risk: no expiry penalty; carry over.

Avoid: streak-loss warnings, timed seasonal quests (a stated complaint in Nuts and Bolts clones), mystery boxes, and paid streak freezes.
