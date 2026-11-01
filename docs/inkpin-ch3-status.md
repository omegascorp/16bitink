# InkPin Chapter 3 status (Nov 1, 2026)

All ten tomb levels (21–30) are playable, in `CHAPTER_3` in `games/inkpin/src/level/paid.ts`. Chapters 2–3 are the paid full game: the server sends them only to owners (`/api/content/inkpin`), and `DEV_UNLOCK` on localhost counts as owning it. `CHAPTER_3_DRAFTS` is empty.

## Playable levels still needing design work

The full puzzle curve is an explicit failing gate: `cd games/inkpin && npm run test:curve`. The audit and `LAB=<id> AUDIT=1` now fail their tests when a numeric curve target is missed. A passing chapter test or winning hint does not imply that the curve passes.

| Level | Current result | Next design work |
| --- | --- | --- |
| 23 The Blasting Chamber | Largest loss lesson 47%, above the 45% chapter limit. A fresh lab measured its hinted win at 27.6 s; the older 18 s note is stale. | Add a distinct, readable way to lose in wrong orders without breaking the blast and lava step. |
| 24 The Puff Frog | Lessons 2 (≥ 5) and top lesson 63% (≤ 45%): the wrong orders teach only `T:melted` and `S:gassed`. Its lamp tank was moved into the roof (Nov 1): the tank hung over the chest-room floor and the hint ended 'stuck', and its lava started above the roof. Hint wins in 47.2 s. | Give S-early orders another genuine outcome or redesign its frog/vent dependency. |
| 26 The Weighing Room | The curve passes, but the hinted win is 27.2 s. The cistern's roof was raised (Nov 1) so its water starts inside the room. | Add meaningful puzzle interaction after playtesting. |
| 27 The Deep Shaft | The curve passes (top lesson 45%, at the limit) after the cistern's roof and fill were fixed (Nov 1) so its water starts inside the room. Hint wins in 29.8 s. | Diversify a few `L:melted` wrong orders. |
| 28 The Sun Barge | Promoted Nov 1 below the curve after three rounds (two Sonnet, one Opus escalation). The hint wins in 40.3 s, ROBUST 8/8, no stuck or playing orders, no decoys. Audit: `win 3% lessons 3 top 95% late 76% blocked 35%` FAIL; the nearest-first obvious order is 'blocked'. | K before U melts the gold at once and is the first mistake in 36 of 38 losses; C and G show only at the end ('sealed'). Give C, G and S immediate losses (or make K's melt slower), and give V a frog lesson instead of blocking U's slide (the frog dropped after U lands ~300 px from Nib's route). |
| 29 Lamp in the Tomb | Curve passes (`win 2% lessons 5 top 42% late 85%`), hint 26.8 s, 12 tests. | Pulling A before Nib crosses the crumbling ledge still wins; the design meant 'burnt'. |
| 30 The Tomb Guardian | Curve passes (`win 2% lessons 8 top 36% late 71%`), hint 60.2 s. ROBUST 7/8: the eager player who walks into the coffin as the lid falls is 'crushed' (kept: a visible loss). | Playtest. |

## Engine and UI work completed

- Walk hints use the destination floor as well as horizontal position. Built and draft routes with walks carry measured destination heights. Already-pulled pins in a valid alternative order no longer hold the hint sequence back.
- Level 24 has a coin reward; an empty level cannot earn the every-coin blot.
- The Tomb Guardian's continuously breathing, permanently sealed wrong orders resolve as `sealed` once all pins are done and its fire bowls are out.
- Chapters 2–3 are locked on the map for players who don't own the game ("Unlock" card); level 10's result offers the full game.
- Level 12 (Chapter 2) docks its raft flush in a berth, so its hint wins whatever the delay before a pull (79 idle cases in its test).

The level-by-level design and historical rounds remain in [inkpin-levels.md](inkpin-levels.md). The engine reference is [inkpin-level-kit.md](inkpin-level-kit.md).
