# InkPin Chapter 3 status (Nov 1, 2026)

All ten tomb levels (21–30) are playable, in `CHAPTER_3` in `games/inkpin/src/level/paid.ts`. Chapters 2–3 are the paid full game: the server sends them only to owners (`/api/content/inkpin`), and `DEV_UNLOCK` on localhost counts as owning it. `CHAPTER_3_DRAFTS` is empty.

## Playable levels still needing design work

The full puzzle curve is an explicit failing gate: `cd games/inkpin && npm run test:curve`. The audit and `LAB=<id> AUDIT=1` now fail their tests when a numeric curve target is missed. A passing chapter test or winning hint does not imply that the curve passes.

| Level | Current result | Next design work |
| --- | --- | --- |
| 23 The Blasting Chamber | Largest loss lesson 47%, above the 45% chapter limit. A fresh lab measured its hinted win at 27.6 s; the older 18 s note is stale. | Add a distinct, readable way to lose in wrong orders without breaking the blast and lava step. |
| 24 The Puff Frog | Passes (Nov 1, round 2 redesign): win 2%, lessons 8, top 44% (T:melted), stuck 0%, late 64%; hint 45.7 s, walk-only 2%. The lamp now hangs over the gas pit's sloping lid (oil reaches the gold through a slot under the bar only while the lid is in); frog 2's pool floor is a plate whose inverse door in the gallery stops the flood when a dry frog lands on it. | Top lesson has 1 point of margin. Robust 3/4 (default stops: Nib climbs out of his pit and plugs the pipe, as before). A, W, U, T, G… times out (outside the sample). |
| 26 The Weighing Room | The curve passes, but the hinted win is 27.2 s. The cistern's roof was raised (Nov 1) so its water starts inside the room. | Add meaningful puzzle interaction after playtesting. |
| 27 The Deep Shaft | The curve passes (top lesson 45%, at the limit) after the cistern's roof and fill were fixed (Nov 1) so its water starts inside the room. Hint wins in 29.8 s. | Diversify a few `L:melted` wrong orders. |
| 28 The Sun Barge | Passes (Nov 2, round 4 Opus redesign): `win 8% lessons 9 top 33% late 84%`, stuck/playing 0, blocked 0, both obvious orders 'sealed', no decoys; hint 37.1 s, walk-only 16%, ROBUST 8/8. The frog now floats in a low bell on Nib's way (V vents it into the full canal), the ankh plate opens a second door (E, his gangway door), and S is a post in the gutter whose head plugs a cistern, so K is only lost before both U and S. | Win share has 2 points of margin (5 of 60 sampled orders). C, G and U mistakes show their cause at once (gold out of the grate, steam on the bowl) but end 'sealed' only once all pins are out. |
| 29 Lamp in the Tomb | Curve passes (`win 2% lessons 5 top 42% late 85%`), hint 26.8 s, 12 tests. | Pulling A before Nib crosses the crumbling ledge still wins; the design meant 'burnt'. |
| 30 The Tomb Guardian | Curve passes (`win 2% lessons 8 top 36% late 71%`), hint 60.2 s. ROBUST 7/8: the eager player who walks into the coffin as the lid falls is 'crushed' (kept: a visible loss). | Playtest. |

## Engine and UI work completed

- Walk hints use the destination floor as well as horizontal position. Built and draft routes with walks carry measured destination heights. Already-pulled pins in a valid alternative order no longer hold the hint sequence back.
- Level 24 has a coin reward; an empty level cannot earn the every-coin blot.
- The Tomb Guardian's continuously breathing, permanently sealed wrong orders resolve as `sealed` once all pins are done and its fire bowls are out.
- Chapters 2–3 are locked on the map for players who don't own the game ("Unlock" card); level 10's result offers the full game.
- Level 12 (Chapter 2) docks its raft flush in a berth, so its hint wins whatever the delay before a pull (79 idle cases in its test).

The level-by-level design and historical rounds remain in [inkpin-levels.md](inkpin-levels.md). The engine reference is [inkpin-level-kit.md](inkpin-level-kit.md).
