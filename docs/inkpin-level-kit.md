# InkPin level kit (engine reference for level agents)

Everything you need from the engine. Don't read src/logic unless this page is wrong; if it is, say so in your report.
All rates are at 120 steps/s: 1 px/step = 120 px/s. Board y grows downward.

## Files
- Level: `games/inkpin/src/level/ch2/<name>.ts`, exporting one `LevelDef`, registered in `src/level/index.ts` (chapter order).
  Shortest real example: `src/level/ch2/pumiceRaft.ts` (96 lines); copy its shape, header comment and style.
- Test: `games/inkpin/test/ch2-<id>.test.ts`; model: `test/ch2-pumice-raft.test.ts` (`play()` from test/solver.ts, `audit()` from test/audit.ts).
- Shared: `T = 8` (wall radius), `PIN_T = 7`, `CH2` from `src/level/common.ts`; kinds `WATER LAVA COIN STONE` from `src/logic/particles`.

## LevelDef in brief
`id, chapter: CH2, ruin: 'volcano', name, goal, tip?` · `rooms` (polygons of open space, art only: outside is rock) · `walls` (capsules `{ax,ay,bx,by,t:T}`) · `bars` (wall indices drawn as stone bars) · `pins` (`{id,ax,ay,bx,by,t:PIN_T,gate?}`; (ax,ay) is the ring end, it slides out that way) · `fills` (`{kind,x0,x1,y1,count}`) · `nib {x,y}` (y = floor top − 24) · `blots` (guards `{x,y,animal,boss?}`; animal is required in chapter 2) · `chest? {x,y}` · `coinsNeeded` · `drains?` · `boulders?` · `ledges? {x0,x1,y}` · `rafts? {x,y}` (centre) · `rubies? {x,y}` · `clear?` (every guard gone too) · `dark?` · `solution` · `stops?` · `torches` · `view {x,y,w,h}`.
Chapter 2 bans vines, seeds, crates, boars and porcupines.

## Steps (`solution`, test orders)
- `'W'`: tap W once things settle (pull it; a gate that's out is pushed back in).
- `'W~1.5'`: tap W 1.5 s after the step before, with no settling or walking in between.
- `'@2060'`: walk Nib to x = 2060, then let things settle. The hint shows "N walk here" on Nib's floor; the bot walks there and visits no stops after it; the audit keeps walks in place (after as many pulls as in the solution). Combine as `'@2060~2'`.
- The bot (test/solver.ts), after each tap: waits ≤ 8 s for things to settle, then sends Nib to each stop in turn (≤ 8 s each). After the last tap it sweeps the stops back and forth (4 × 6.25 s), then leaves. Hint time ≈ the sum of those waits, so long stop lists and things that never settle make it long.

## Numbers
**Nib.** Radius 24. Walks 0.95 px/step (114 px/s). Jump (a player action; the bot never jumps): take-off 2.9 px/step, about 55 px high; swimming, a 0.8× hop. **Real step-up: Nib climbs steps up to 60 px** (the code says 44, but rounded wall caps let more through); 62 px stops him. Use steps ≤ 44 px to climb and ≥ 66 px to block. Chest: reached within 44 px sideways, from 90 px above to 24 px below. Nib swims in water; lava burns him (`burnt`); a guard touching him inks him (`inked`). Stomping needs him falling ≥ 0.4 px/step onto a guard's head; he bounces off at 0.75 of a jump.
**Guards.** Radius 22 (boss 40, needs ≥ 80 px headroom). Walk 0.55 px/step (66 px/s). See Nib within 220 px sideways and 50 px up or down (the boss: 320 px sideways, any height). Blocked for 30 steps, they turn; blocked going for Nib, they pace off for 90 steps. **Salamanders and armadillos climb steps up to 58 px** (60 stops them). Guards never step down into water, not even ~20 px (they turn at its edge), so water can't lure them. A salamander is fireproof and walks into lava as if it were floor (66 px/s on the pool's bottom). An armadillo is spiky: stomping it is `pricked`; lava, water, boulders and slabs beat it.
**Washing.** A guard washes away at 260 water-contact-steps. Measured: 240 water dropped 268 px onto a guard washes it 1.0 s after the pull; 60 water, 1.5 s; 240 water from 88 px, 0.6 s. Any early water washes a guard in about 1–1.5 s anywhere it lands. The boss soaks to 70 and dries 10 per step, so only a column dropped on it at once washes it; a pool filling slowly round it never does (it settles at ~7 contacts/step).
**The boss.** Nib can stand on its back: the boss holds still while he's on it (or bouncing just over it), so he walks off. It never follows him underneath any more.
**Pins.** A pulled pin slides out toward its ring end (ax, ay) by its own length plus its ring's clearance. Another pin or a body in that path blocks it (the audit counts the order 'blocked'), so lay pins so their paths don't cross unless that block is the puzzle. Walls don't: a pin slides through walls it crosses or lies along. A raft docks only in a berth about its own width plus 20 px (~100 px); a wider berth leaves it short.
**Gates.** `tap` pushes a gate that's out, else pulls. A push fails (`gateJammed`, the audit's 'jammed') if Nib, a live guard, a boulder or raft, a ruby or a slab is in the slot, or another pin is in its path; grains in the slot are pushed out to the nearer side. In a 180-wide tank of 240 water: 0.4 s out lets 10–40 grains through; 1.2 s lets 40 more.
**Ledges and slabs.** A ledge cracks once Nib has stood on it and then been off it 10 steps (a jump landing back on it doesn't count); it wobbles 0.4 s (48 steps), then falls level: gravity 0.075, cap 6 px/step (376 px in ~0.85 s); in lava ~60 px/s, in water ~115 px/s. It squashes a creature after ~20 px of fall, or by pressing 6 px into it. It lands ('down') only on walls, pins, set stone or a down slab; on a body it waits, and falls on when the body moves. Liquid trapped under it pops onto its top. Keep a ledge's ends ≥ 1 px clear of walls (a wall corner under an end counts as landing). An 'up' ledge in a gate's slot jams the gate for good. Slab thickness `LEDGE_T * 2` = 16 below `y`.
**Rafts.** Box 80 × 28 (`RAFT_HW 40`, `RAFT_HH 14`). Float about half under, in lava and water; never burn. Take the liquid's mean sideways speed within ~10 steps, capped at 84 px/s. Lava is viscous: a dam surge moves 0.3–0.6 px/step and carries a raft 60–130 px, so long ferries need a sustained pour. Nib, guards, rubies and coins within 8 px above the deck ride it. Liquid runs off the deck. **Coins on a deck now rest, sleep and ride** (no more throwing them off). Lava cooling round a raft (or inside its box) holds it in place: stone never shoves a raft, so it can't be thrown through a wall or the floor any more, and liquid it shoves aside never jumps past a pin or wall (it goes under the raft). Keep banks ≥ 30 px above the lava or the surface by the bank burns Nib as he steps off. Lava within ~150 px of a raft, or a pour landing right behind it, washes over the deck. A raft aground on coins grinds them: they never settle.
**Rubies.** `RUBY_R 9`, worth `RUBY_COINS = 10` toward `coinsNeeded`. Fall up to 6 px/step; sink ~50 px/s in lava, ~85 px/s in water; roll a little and stop. Lava never hurts them; only set stone holds one (liquid and coins don't). Nib takes one he touches, or digs it from up to 130 px below (380 px swimming) if no wall, pin or ledge is between. Drains take them.
**Liquids.** Grain radius 6. Water touching lava turns it to stone; **one water grain sets a whole resting lava pool to stone** (measured: 1 grain, 200-lava pool 540 px wide, all 200 set). There's no metered cooling: if part of the lava must stay hot, keep it apart (a wall, a pin) or flowing. Lava melts coins (`melted`). Set stone is a floor for everything, but it is loose gravel, not a wall: lava that sets inside a tank pours out as gravel when the tank's pin opens (Black Steps uses this).

## Fills and the budget
`fill` packs grains in columns every 10 px from x0 + 6 to x1 − 6 (odd rows shifted 5 px), rows 9 px apart from y1 − 8 upward, until `count` is placed. So a row holds about (x1 − x0 − 12) / 10 + 1, and the top row sits at y1 − 8 − 9 × (rows − 1). A narrow or overfull fill stacks above its tank and starts grains in the rock: keep that top under the ceiling (the lab names any fill that overflows). Fills then pre-settle 3 s before play. **≤ 700 grains in total** (the sum of counts). No grain may start outside the rooms (test/chapter2.test.ts checks).

## Design around this (measured)
- Step-up is 60 px for Nib, 58 for guards: a "too high" step must be ≥ 66 px.
- One water grain freezes a whole resting lava pool; plan cooling by connection, not by amount.
- Resting water never moves sleeping coins, but a pour does: 150 water dropped 280 px onto 60 sleeping coins moved 41 of them, up to 300 px.
- A creature wading in shallow water over a stone bed can spray it up 50–100 px (the level agents saw it; on a flat floor it was 0 px).
- Nib carries water out of a pool as he walks through it: 20 of 40 grains in a shallow pool ended outside it.
- A lava pour splashes: 100 lava falling 450 px rose 55 px over the pool; bigger, taller pours were seen to reach ~170 px. A slab dropping into lava barely splashes.
- Lava creeps down 25–35° slopes at about 30–60 px/s.
- A salamander's edge check reads upward ramps as drops: it walks up 8°, turns back ~60 px up a 15° ramp and at the foot of a 25° one.
- Early water washes a guard in ~1–1.5 s wherever it lands; the boss only to a dropped column.
- A guard climbs a sloped wall from below like a ramp: a sloped low roof doesn't keep a guard (or the boss) in; use a level roof or a ≥ 66 px step.
- Nib dropping ~100 px into a pit can land on the boss's back and wait there safely, so a pit with the boss in it isn't a sure loss.
- A coin fill next to lava came out short after the 3 s pre-settle (12 placed, 8 left in Fire Idol's vault): keep coins clear of lava at the start, check the lab's coin count, and leave a few coins of slack in `coinsNeeded`.
- Settling (what the bot waits for): nothing faster than 0.35 px/step beyond 6 strays. It ignores grains jiggling in place, grains within 24 px of a ruby or a raft (except coins), and lava within 100 px of a live guard. Big deep tanks still churn for good (Salamander Springs' 360 water in a 164 px tank): the bot then waits its 8 s cap at each stop, and the hint time grows.

## Rules
1. Stages depend on each other: at least one real link across stages (one supply needed in two places, a later pour through an earlier room, a pin or slab in one room deciding another).
2. At most ONE pin whose only job is to hold Nib back.
3. From level 4 on, a tempting wrong pin: the most obvious pull is a trap (check the audit's `obvious`).
4. Every wrong order ends in a funny fail (a loss cause), not a silent dead end ('stuck').
5. Audit targets: your chapter's row of "## The difficulty curve" in docs/inkpin-levels.md (win share, lessons, top lesson, late losses, stuck), plus its four reading checks. Chapter 1's looser targets don't apply from chapter 2 on.

6. 2–3 screens wide or two tall; 3–5 stages. The hint wins in about 25–120 s, and its time comes from the puzzle (pours, rides, settling), never from walking: no room or stretch of floor Nib only walks through (players notice). Never pad a level to reach a time. ≤ 700 grains. Levels pre-settle at rest; no grain starts outside the rooms. Follow the existing style for rooms, walls, bars, torches and view. Nib is "he". Guards are animals.
7. Gate pins (levels 6+): the board shows the right moment, never a stopwatch. The winning window is ≥ ~1.5 s wide; the test wins at both ends of it. Encode the push-back with a wait: `['L', 'W', 'W~2', 'G']`.
8. Crumbling ledges: Nib's own steps trigger them, so his route and timing are part of the order. Script the walks with `stops` or `'@x'` steps so the bot walks them as a player would.
9. Fun first: the reader can look at the board, think, and find the order. Losses have a clear, visible reason. A few deep, interlocked stages beat many shallow ones.

**The difficulty curve** (targets per chapter, the reading checks, the sawtooth, how to add depth): `docs/inkpin-levels.md`, section "## The difficulty curve". It is the source of truth; follow it.

## Lab and audit
`cd games/inkpin && LAB=<id> [ORDERS="A,B|B,A"] [BOARD=1] [STEPS=1] [AUDIT=1] npx vitest run test/lab --silent=false --testTimeout=3600000`
Every run prints the hint's result and time, the two obvious orders (nearest pins to Nib first; left to right by pin midpoint; gates pushed back as the solution does) and how they end, the grain count, and any overflowing fill. `AUDIT=1` adds the audit line. One play costs ~4 s of CPU; a full audit takes minutes, so audit at the end.
Audit fields: `winShare, lessons, topLessonShare, stuckShare, blockedShare`, plus `lateLossShare` (share of losses that came on the order's second tap or later; higher means the wrong turns are deeper) and `obvious {nearest, leftToRight}` (how those two orders end). Gate push-backs are sampled at {never, 0.75, 1.5, 3 s} plus the solution's own wait for that gate, and half and twice it.
Run only your own tests (`npx vitest run test/ch2-<id>`) and `npx tsc --noEmit -p .` at the end.
