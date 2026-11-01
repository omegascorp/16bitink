# InkPin Chapter 3 status (Nov 1, 2026)

The playable order in `games/inkpin/src/level/index.ts` is levels 21–27. The map reserves slots 28–30 as drafts, counts wins against ten planned tomb levels, and tells a player who finishes level 27 that more levels are being drawn. The built files for 28 The Sun Barge, 29 Lamp in the Tomb, and 30 The Tomb Guardian are in `CHAPTER_3_DRAFTS`; they are not in the playable order.

## Playable levels still needing design work

The full puzzle curve is an explicit failing gate: `cd games/inkpin && npm run test:curve`. The audit and `LAB=<id> AUDIT=1` now fail their tests when a numeric curve target is missed. A passing chapter test or winning hint does not imply that the curve passes.

| Level | Current result | Next design work |
| --- | --- | --- |
| 23 The Blasting Chamber | Largest loss lesson 47%, above the 45% chapter limit. A fresh lab measured its hinted win at 27.6 s; the older 18 s note is stale. | Add a distinct, readable way to lose in wrong orders without breaking the blast and lava step. |
| 24 The Puff Frog | Largest loss lesson 61.1%, above 45%. The hinted route wins in about 47 s and collects all 10 newly placed chest-room coins. | Give S-early orders another genuine outcome or redesign its frog/vent dependency; most wrong orders currently teach `S:gassed`. |
| 26 The Weighing Room | The curve passes, but the hinted win is 19.8 s, below the roughly 25 s design target. | Add meaningful puzzle interaction after playtesting; padding the route with an idle timer would not meet the design goal. |
| 27 The Deep Shaft | Largest loss lesson 46.55%, above 45%. A hopper placement adjustment makes the hinted win collect all 18 coins. | Diversify a few `L:melted` wrong orders while keeping the 27.9 s winning route and its other loss lessons. |

## Draft levels

- **28 The Sun Barge:** the original S pin blocks the obvious S-first pull. Its draft audit also found too many blocked and stuck orders. It should stay out of the playable list until the pin and wrong-order curve are repaired and retested.
- **29 Lamp in the Tomb:** its most recent audit passed the numeric curve and its hinted route wins with 30/30 coins. The hint is 22.5 s, below the design target; it still needs level tests and a playtest before promotion.
- **30 The Tomb Guardian:** after the boss seal timeout correction, a fresh audit reports 2% wins, 8 lessons, 36% largest lesson, 0% stuck and 0% timed-out wrong orders. Its hinted route wins in 60.2 s. It remains a draft while 28–29 are unfinished.

## Engine and UI work completed

- Walk hints use the destination floor as well as horizontal position. Built and draft routes with walks carry measured destination heights. Already-pulled pins in a valid alternative order no longer hold the hint sequence back.
- Level 24 has a coin reward; an empty level cannot earn the every-coin blot.
- The Tomb Guardian's continuously breathing, permanently sealed wrong orders resolve as `sealed` once all pins are done and its fire bowls are out.
- The map shows planned tomb slots 28–30 as numbered drafts and the tally as wins out of ten.

The level-by-level design and historical rounds remain in [inkpin-levels.md](inkpin-levels.md). The engine reference is [inkpin-level-kit.md](inkpin-level-kit.md).
