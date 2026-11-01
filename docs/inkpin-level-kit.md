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
**Pins.** A pulled pin slides out toward its ring end (ax, ay) by its own length plus its ring's clearance. Another pin **still in, lying in that path**, blocks it (the audit counts the order 'blocked'); bodies never block a pull. A pulled pin is gone at once, so two pins whose slide paths merely cross (each body clear of the other's path) never block each other, in either order (`test/mechanics-ch3.test.ts`, "pins that cross"; level 24's W and F). Two pins facing each other on one line, each lying in the other's path, can never come out. Lay a pin in another's path only when that block is the puzzle. Walls don't: a pin slides through walls it crosses or lies along. A raft docks only in a berth about its own width plus 20 px (~100 px); a wider berth leaves it short.
**Gates.** `tap` pushes a gate that's out, else pulls. A push fails (`gateJammed`, the audit's 'jammed') if Nib, a live guard, a boulder or raft, a ruby or a slab is in the slot, or another pin is in its path; grains in the slot are pushed out to the nearer side. In a 180-wide tank of 240 water: 0.4 s out lets 10–40 grains through; 1.2 s lets 40 more.
**Ledges and slabs.** A ledge cracks once Nib has stood on it and then been off it 10 steps (a jump landing back on it doesn't count); it wobbles 0.4 s (48 steps), then falls level: gravity 0.075, cap 6 px/step (376 px in ~0.85 s); in lava ~60 px/s, in water ~115 px/s. It squashes a creature after ~20 px of fall, or by pressing 6 px into it. It lands ('down') only on walls, pins, set stone or a down slab; on a body it waits, and falls on when the body moves. Liquid trapped under it pops onto its top. Keep a ledge's ends ≥ 1 px clear of walls (a wall corner under an end counts as landing). An 'up' ledge in a gate's slot jams the gate for good. Slab thickness `LEDGE_T * 2` = 16 below `y`.
**Rafts.** Box 80 × 28 (`RAFT_HW 40`, `RAFT_HH 14`). Float about half under, in lava and water; never burn. Take the liquid's mean sideways speed within ~10 steps, capped at 84 px/s. Lava is viscous: a dam surge moves 0.3–0.6 px/step and carries a raft 60–130 px, so long ferries need a sustained pour. Nib, guards, rubies and coins within 8 px above the deck ride it. Liquid runs off the deck. **Coins on a deck now rest, sleep and ride** (no more throwing them off). Lava cooling round a raft (or inside its box) holds it in place: stone never shoves a raft, so it can't be thrown through a wall or the floor any more, and liquid it shoves aside never jumps past a pin or wall (it goes under the raft). Keep banks ≥ 30 px above the lava or the surface by the bank burns Nib as he steps off. Lava within ~150 px of a raft, or a pour landing right behind it, washes over the deck. A raft aground on coins grinds them: they never settle.
- **Docking a raft at a post (Nov 1, level 12).** A raft carried by a pour into an open pool stops wherever the slosh leaves it (level 12's first build: 398–438 px across idle delays, chaotic), and a rider who walks to the post can end with his centre past the deck's end and slip off the corner into the lava when the raft moves. A berth fixes it: the raft's cave a step (~100 px) above the dock, the dock a raft's width + 20 px between the step and the post. The pour carries the raft down into it and it docks flush against the post on every idle delay (468 of 468 max, 40 of 40 delays). Too much lava (the pool rejoined over the step) lets lava in the 20-px gap behind the raft rise past the deck and run along it at ~5 px/step into a rider at the far end (burnt); level 12 holds at 110 cave lava (104 and 118 each lose a few idle cases), so treat that gap as the weak spot.
- Two engine rules were tried and dropped (they changed Fire and Flood's hint to a loss, and outcomes in the Ruby Hoard, the Stone Bridge and the Sun Barge): deck liquid losing any speed toward the deck's far end, and Nib waiting at a moving raft's front end instead of outwalking it into lava. The engine's raft rules are unchanged.
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

6. **Size: as big as Chapters 1–2** — the view at least ~1300 px wide (2–3 screens), or ~1000 px tall for a tall level; Chapter 1 runs 1600–2200 wide, Chapter 2 1300–2100. Never shrink a board to make it easier to tune: Chapter 3's first builds shrank to 620–840 px and the user noticed ("the levels are shrinking"). No empty space means filling the board with stages, not making it smaller. 3–5 stages. The hint wins in about 25–120 s, and its time comes from the puzzle (pours, rides, settling), never from walking: no room or stretch of floor Nib only walks through (players notice). Never pad a level to reach a time. ≤ 700 grains. Levels pre-settle at rest; no grain starts outside the rooms. Follow the existing style for rooms, walls, bars, torches and view. Nib is "he". Guards are animals.
7. Gate pins (levels 6+): the board shows the right moment, never a stopwatch. The winning window is ≥ ~1.5 s wide; the test wins at both ends of it. Encode the push-back with a wait: `['L', 'W', 'W~2', 'G']`.
8. Crumbling ledges: Nib's own steps trigger them, so his route and timing are part of the order. Script the walks with `stops` or `'@x'` steps so the bot walks them as a player would.
9. Fun first: the reader can look at the board, think, and find the order. Losses have a clear, visible reason. A few deep, interlocked stages beat many shallow ones.

**The difficulty curve** (targets per chapter, the reading checks, the sawtooth, how to add depth): `docs/inkpin-levels.md`, section "## The difficulty curve". It is the source of truth; follow it.

## Lab and audit
`cd games/inkpin && LAB=<id> [ORDERS="A,B|B,A"] [BOARD=1] [STEPS=1] [AUDIT=1] npx vitest run test/lab --silent=false --testTimeout=3600000`
Every run prints the hint's result and time, the two obvious orders (nearest pins to Nib first; left to right by pin midpoint; gates pushed back as the solution does) and how they end, the grain count, and any overflowing fill. `AUDIT=1` adds the audit line. One play costs ~4 s of CPU; a full audit takes minutes, so audit at the end.
Audit fields: `winShare, lessons, topLessonShare, stuckShare, blockedShare`, plus `lateLossShare` (share of losses that came on the order's second tap or later; higher means the wrong turns are deeper) and `obvious {nearest, leftToRight}` (how those two orders end). Gate push-backs are sampled at {never, 0.75, 1.5, 3 s} plus the solution's own wait for that gate, and half and twice it.
Run only your own tests (`npx vitest run test/ch2-<id>`) and `npx tsc --noEmit -p .` at the end.


## Chapter 3: the Desert Tomb (engine pass, Oct 31, 2026)

Everything above still holds. Measured numbers below come from `test/measure-ch3.test.ts` (`MEASURE=1 npx vitest run test/measure-ch3 --silent=false`), `test/mechanics-ch3.test.ts`, `test/boss-ch3.test.ts` and `test/patterns-ch3.test.ts` (the worked boards below; `--silent=false` prints their times).

### Files
- Level: `games/inkpin/src/level/ch3/<name>.ts`, `chapter: CH3`, `ruin: 'tomb'`, registered in `CHAPTER_3` in `src/level/index.ts` (Level 21… numbers run on by themselves). Test: `test/ch3-<id>.test.ts`, shaped like the ch2 ones. `test/chapter3.test.ts` checks every ch3 level (rooms, budget with `breath.max`, cracked walls in `bars`, seals and doors naming real things).
- **Shortest example to copy: `src/level/ch3/sampler.ts`** (the engine sampler: a plate under a boulder, a door, a gas pit, a dome with a puffed frog, two fire bowls, a cracked bar, seals). It is in no chapter; play it at the dev page with `?sample=tomb`.
- Small test rooms: `test/tomb-room.ts` (`tombRoom`, `vent`).

### New LevelDef fields
- `plates?: { id, x0, x1, y, need? }[]`: a plate's top is `y` (the floor's top); it weighs its zone x0..x1 by y − 40..y. `need` defaults to 25.
- `doors?: { id, ax, ay, bx, by, t: T, plate, invert? }[]`: a capsule like a pin; open = slid toward (ax, ay) by its own length (into the rock, or along a wall). Open while its plate is down (`invert`: while it's up). Doors start where their plate puts them at the start (before the 3 s pre-settle).
- `seals?: { door?: id; wall?: index; side: 'left'|'right'|'up'|'down' }[]`: `side` is the goal's side of the barrier.
- `braziers?: { x, y }[]`: a fire bowl standing on the floor at y; its flame is a circle at (x, y − 34), r 12. All start lit.
- `cracked?: number[]`: wall indices a blast breaks; each must also be in `bars`.
- `breath?: { every, count, max }`: the Tomb Guardian's breath (level 30, see "The Tomb Guardian" below). Always set it on the boss level: the engine defaults to `{ every: 5, count: 24, max: 120 }` without it, but the budget test only counts a `breath` you write.
- `fills` with `kind: GAS`: `y1` is the **underside of the lid** (the pin or ceiling above it); rows pack **downward** from y1 + 8, 9 px apart, same columns as other fills. A gas fill needs a lid or ceiling above it, or it rises during the pre-settle.
- New loss causes: `'gassed'`, `'blasted'`, `'sealed'`. New guard end: `'blasted'`. Guard animals `'frog'` (rain frog) and `'toad'` (boss only).
- Chapter 3 bans vines, seeds, crates, boars and porcupines, like Chapter 2.

### Plates and doors (measured)
- Weights: water, lava, coin or stone grain 1 (centre in the zone), gas 0, ruby 3, Nib or a guard standing in it 30 (a puffed frog 0), the boss 100, a boulder 40, a raft 20 (its deck cargo counts by its own grains), a down slab over half the span 40. Down at ≥ `need`; up after 30 steps (0.25 s) below it.
- **The zone is only 40 px tall: a 100-px pit holds at most ~34–40 water of weight**, however much more you pour. 25 water in a 100-px pit: 25; 40: 33; 60: 34. Plan `need` ≤ 30 for water.
- Open floor: water runs off. 25/40/60 water dropped ~280 px onto a 100-px plate on open floor peak at 25/37/38 and settle to 5–6: the plate goes down for a moment, then up. **Water holds a plate only in a pit.**
- First grain to plate down: 0.07–0.09 s.
- **Leaking plates are fast.** A pit with a grate (a `drain` box at the pit floor): 40 water over a 30-px grate: down 0.82 s after the pull, up 0.25 s later; 80 water over 30 px: up 0.28 s later; 60 over a 12-px grate: 0.44 s; 80 over 12 px: 0.72 s, and its door shut again 1.55 s after the plate went down. For "a few seconds", use a grate ≤ 12 px and keep the pour coming (a gate), or a deeper supply.
- A boulder rolled off a ledge at walking speed into a 100-px pit stopped 24 px past the pit's middle: weight 40.
- A raft aground on a plate: 20; with 20 coins on its deck: 32. A raft alone needs `need: 20`.
- A frog dropped on a plate: 30 (down). Nib alone: 30.
- Doors open at 2 px/step and shut at 1: 60 px: 0.24 s open / 0.49 s shut; 80: 0.33 / 0.66; 120: 0.49 / 0.99. With Nib walking off a plate, the plate is up 0.53 s after he starts walking (his walk off + 0.25 s hold).
- A 100-px door in front of a 180-px tank of 240 water: Nib on its plate 0.5 s let 149 grains through; 1 s, 169 (it shuts 1.5 s after he steps off). **A door is not a fine meter**; use a gate pin to meter.
- A shutting door waits for Nib, a live guard, a boulder or raft, a ruby or a slab in its way (`waiting`), and goes on when it's clear. Grains in its path are pushed aside. An opening door waits on a pin still in its path (event `doorBlocked`).
- A door is a seg for everything (gas too). Blasts don't break doors.
- **A door closes slowly** (~1.1 s for a 132-px door, 1 px/step), so a plate on Nib's own route lets him step off it and slip under before it shuts. **A plate Nib must not hold has to be out of his reach**: a closet whose wall comes right down to the floor, or a ≥ 66-px step (pattern 1 below).
- Doors start where their plates put them *before* the 3 s pre-settle. A fill that only settles onto a plate during the pre-settle opens its door in the first moments of play (0.42 s for 50 water in a pit): size it to lie in the zone at the start if the door must start open.
- A pin lying across a pit's floor (a grate's plug) lifts the water out of the 40-px zone: 50 water over such a pin weigh only ~26. Use `need: 20` there.
- A drain box swallows coins (and rubies) like water; a boulder resting in a pit can plug the pit's grate (the box counts as plugged when the boulder's circle reaches into it; level 21's boulder in the corner of its pit did).
- **Coin plates (level 25).** Coins from a broken bar pour slowly through a 36-px slot: 6–7 s to weigh a plate (`need: 12`). On an open floor the coins roll off and the plate doesn't hold; a pit with a 30-px lip (Nib steps over it) holds it.
- Stone from a set lava pool is loose gravel and swells ~19 px as it sets: size the lava to leave a bridge near the floor. Too little leaves a standing pool on top that never settles.

### The 'sealed' loss
Lost `'sealed'` when: every plain pin is out and every gate has been pulled at least once; the board has come to rest (below); the goal isn't met; and some `seals` barrier stands (a door not fully open, a cracked wall not broken) with Nib on its far side from `side` (compared with the barrier's midpoint).
- **At rest** (src/logic/seal.ts, Nov 1, 2026) is either of:
  - **calm for 1 s**: no boulder, ruby, ledge or door moving, no plate going up or down, no gas burning or flowing, no guard falling or washing, no puffed frog adrift, and at most 6 stray grains moving;
  - **a 5 s lull**, for boards where a few grains churn for good: the same, but up to 24 grains may move, as long as none is heading anywhere (averaged velocity under 0.35 px/step; lava creeping toward Nib or a trickle toward a plate is no lull).
  - A pull or a push starts both over. Nib walking never counts.
- **Live guards' own motion never counts for the seal**: a guard pacing (and the grains it shoves within 24 px of its edge), and a puffed frog floating still with its gas staying round it (6+ grains, not thinning), are at rest. A frog drifting, or whose gas is thinning (its vent is open), is still on its way, and so is any guard falling or in water. (The bot's own settle check is unchanged: it still waits on puffed frogs.)
- A blasted or washed frog is no longer `puffed`.
- **Don't list a door Nib opens himself by standing on a plate**: with all pins out and him on the wrong side, it seals him even though he could walk onto the plate.
- A level with no `seals` never seals: a shut-out order ends 'stuck' as before.

### Tomb gas (measured)
- `GAS` grains fall up (gravity −0.035, up to 2.5 px/step). Free rise **~300 px/s**: gas crosses a room in a second, so Nib can't outrun it, and gas reaches the roof long before anything else moves.
- Rises through water: 30 gas under 124 px of water were all above the surface 0.88 s after their lid opened. Water falls through gas.
- 100 gas under a flat 300-px ceiling settle **48 px deep** (5 rows: rows ≈ count ÷ ((width − 12) ÷ 10 + 1), 9 px apart, from the ceiling down). A dome's lips must hang deeper than that, or it spills round them.
- A 40-px roof vent (`drain` box in a chimney, plugged by a pin): half of 100 gas gone in 3.0 s, all but 2 in 5.5 s. A 60-px vent: half in 2.2 s, all but 2 in 4.1 s. Gas drifts toward the vent along the ceiling. Level 22: a 40-px vent was too slow for its winning order at 110 gas; 60 px worked.
- **A gas pool under a flat ceiling spreads about 5 px per grain, two rows deep, centred where its column arrives**, not to a single layer across the whole roof: 30 gas covered ~140 px, 60 ~290 px, 100 ~510 px (deepest centre 18 px under the ceiling). Anything that must reach the gas (a bowl, a frog) has to be inside that width, or the dome has to be narrow enough that the gas fills it to the wall.
- A dome or gallery spills gas back down only if its capacity is clearly below the gas count (level 22: 110 gas into a ~35-gas gallery).
- Gas rising past any pocket with a roof (the underside of a vat's floor pin, a shelf) fills it: level 23 lost ~10 of 72 grains under its lava vat.
- An emptied chamber over a roof slot is such a pocket: level 25's burial boxes, once their gold had fallen through, took 40–90 gas each. Count them out of the gas that reaches the bowl.
- Gas seeps up through a coin heap (sleeping coins never trap it): 40 gas under 80 dropped coins were all out in 1.3 s. Gas goes round a raft: 1 of 30 left under it after 5 s.
- A resting dome counts as settled for the bot within 0.2 s.
- **The settle check waits for the tomb (third engine pass, Nov 1).** The bot and the audit move on once the board is settled, and up to 6 moving grains used to count as settled. In chapter 3 it now also stays busy while any gas burns, while any gas grain is going somewhere (its averaged speed over ~10 steps above 0.6 px/step, 72 px/s: rising, or at the front of a pool creeping along a roof, where those few grains are all the pool's movement), and while a rain frog is puffed (floating, drifting toward a vent, waiting to drop), falling, or in water washing away. A deep gas mass pressed under its lid (level 25's well) churns slower than that for good and still settles. Measured: 5 gas let up from a floor pit counted as settled 0.26 s after the pull (still in the pit; the bot moved on), now 2.38 s, with all 5 under the roof; 80 gas from a 100-px pit, 3.23 s both before and after. A frog dropped from a vented dome: busy until it lands (before, settled while it fell). Lab lines: levels 21, 24 and 25 unchanged; level 22's hint 15.5 → 15.6 s (walk-only 21% → 24%), level 23's 18.0 → 20.0 s. Chapters 1–2 have no gas or frogs and are unchanged. Tests: `test/mechanics-ch3.test.ts`, "the settle check waits for the tomb".
- **Settling with drains and boulders (second engine pass).** Draining was never the problem: 80 water poured into a 100-px pit over a 32-px grate settles in 2.6 s, over a 12-px grate in 3.4 s. What kept level 21 from settling was **a boulder resting in a water pit**: grains wedged under it bounced between it and the floor at 7–8 px/step and stirred the pool for good, so the bot waited its 8 s cap at every stop. From chapter 3 on (any level with a `ruin` other than the jungle), grains a resting boulder pushes out lose their speed into it: a boulder in an 80- or 130-water pit now settles in 2.2–3.1 s. Level 21's hint went from 94.6 s to 23.0 s. Chapters 1–2 are unchanged (chapter 2 has no boulders; the jungle keeps the old rule).
- **A closed dome is a diving bell: rising water does not squeeze gas out under its lip.** Water 93 px over the lip of a 160-px dome spilled 0–3 of 60 gas. Gas leaves a dome only upward: through a vent, a flue or a door in its roof, or by burning. (This changes level 22's "the flood squeezes the gas out": make the flood lift the gas pool up a flue or stair whose mouth is in the dome's roof, behind a pin.)
- **Nib**: lost `'gassed'` with ≥ 3 gas grains within 30 px of his centre at once, or any touching him 20 steps in a row. One stray grain is safe. He walks under a resting dome's lip safely (measured with 24 px between the lip and his head): the gas stays above the lip.
- Creatures walk through gas (they don't push it); bodies, rubies and slabs push it aside like water.

### Fire bowls, ignition and blasts (measured)
- **A flame lights gas whose centre is within 24 px of the flame's centre** (`IGNITE_REACH`: the flame's 12 px plus a grain's width; it was 18, touching, before the second pass). Lava lights gas it touches (13.5 px). A burning grain burns 8 steps then is gone; from its 2nd step it lights all gas within 16 px. **120 gas in a 160-px dome burnt out in 0.25 s from one spark.** Gas across a wall or pin (≥ 26 px apart) doesn't catch: the fire follows connection. Water touching the flame (18 px) douses it first: a doused bowl lights nothing, even gas already in reach.
- **Where a bowl lights (measured):**
  - *Beside a rising column:* gas rises dead straight (no sideways spread), so the flame's centre must be within **24 px of the column's outermost grain centres** (~18 px out from the column's wall face). 30 px out it never lit.
  - *Under a pool:* with one row of gas, the flame's centre must be ≤ **24 px** under the ceiling's underside; with two rows, ≤ **36 px**; 42 px never lit.
  - *On a shelf in the gas's way:* the shelf turns the gas round its end, so the bowl must stand **at the shelf's tip** (the shelf's end ≤ 4 px past the flame's centre). A shelf reaching 8 px or more past the flame: never lit. Level 23's "bowl on a mid-column shelf" is this.
  - The column takes ~1 s to rise 300 px past a bowl, then lights at once.
- **Level 23's mystery, solved (a rule, not a bug).** With 30–60 water in a wider, taller tank the far bowl stayed lit and all 72 gas were there, unburnt: water doesn't damp gas or douse a far bowl. The water in the well pushed the rising column sideways; ~10 grains caught under the lava vat's floor pin, and the other ~62 pooled two rows deep over x 500–840 (5 px per grain) and stopped short of the far bowl at x 858, whose flame sat right at the pool's end. With 18 water the column hit the roof nearer the bowl and it lit. Put the far bowl well inside the pool's width from where the column arrives, or end the dome with a wall just past the bowl so the gas has to reach it.
- **Blast reach** (each burning grain, any step it burns): a cracked bar breaks when its centre line is within **48 px** (40 + its t 8); Nib is blasted with his centre within **~60 px** (64 measured fine); any guard (boar, salamander, armadillo, frog: fireproof isn't blastproof) within 40 px of its edge; an 'up' ledge within 48 px starts cracking (0.4 s wobble, then falls as before). Only along a line no wall, pin, door or ledge blocks: no blast round a corner. The boss, water, lava, coins, stone, rubies, boulders, rafts, plates, doors, pins and bowls are untouched.
- **Keep Nib ≥ 70 px from any gas that can burn**, and his route ≥ 70 px below a dome that a flame can reach.
- **Fire runs down a connected column, not down a trickle (third engine pass, measured).** Lit at its top, a column out of a mouth ≥ 40 px wide burns whole, on down into the gas left in its pit: 60 gas from a 40-px pit, 120 from a 100-px pit, and level 25's well with its gate left open (the front runs down the stream at ~360 px/s and takes the whole well). Gas let out through a narrow slot rises as a trickle of separate puffs, and the fire stops at the first gap over 16 px: 90 gas let out of a tank through a 30-px slot, 71 burnt (19 left in the tank's corners); 20 px, 38 burnt (gaps up to 78 px); 14 px, 13 burnt (gaps up to 159 px). That is level 25's "burns down to ~0.53 of the column". The engine stays as it is (bridging those gaps would light gas a player sees as apart): give the gas a mouth ≥ 40 px where the fire must run back to the source, and a slot ≤ 20 px where the source must not burn.
- Dousing: one water grain touching a lit flame puts it out for good (the grain is used up, steam, event `doused`). 3 water dropped 210 px onto a bowl doused it in 0.65 s. Lava and coins don't affect a bowl.
- A gas dome just clear of a flame (2 rows above a flame 30 px below the ceiling) lights the moment more gas deepens it (the sampler does this).
- Dark levels: a lit bowl lights ~220 px; gas glows faintly (~30 px); burning gas flashes.

### The rain frog (measured)
- A guard with a boar's rules (r 22, stompable, washes at 260, burns in lava, squashed by slabs and boulders, blasted). With ≥ 6 gas within 30 px it puffs (`frogPuff`) on that step, stops walking and floats up at up to 0.8 px/step: **79 px/s** measured, drifting with the gas round it; it's held under ceilings, pins, ledges and doors (it rested at 22 px under a ceiling). Puffed it weighs nothing and still inks Nib on touch.
- With < 2 gas within 30 px for 30 steps it goes flat (`frogDrop`) and falls like any creature.
- **Vent to drop: 6.0 s** for a 120-gas dome over a 40-px vent, and the frog **drifted 101 px toward the vent** while it waited (it drops near the vent, not where it floated). Its fall drifted another 44 px. Dropped ~180 px into a 45-px pool, it washed 1.2 s after the drop.
- **A frog only rides gas that pools under a roof.** In a rising column the gas (300 px/s) outruns it (96 px/s): it puffs, falls behind, goes flat and drops back. Start floating frogs inside a resting dome.
- An unpuffed frog walks through thin gas (< 6 grains near).

### Lab: new lines and their targets
Every lab run now also prints (for every level; the old lines are unchanged):
- `obvious, route order`: the pins in the order the hint's walk first comes within 150 px of each (in y on tall levels). **Must lose.**
- `drop-one: decoys [...] trap [...]`: a pin whose taps you can leave out of the solution and still win is a decoy (**target: none**); the one allowed trap is a pin no win uses.
- `walk-only: X s of the hint's Y s (Z%) … longest stretch S s`: Nib walking while nothing else moves. **Target ≤ 20%, no stretch over 3 s.**
- A `WARNING` when gas comes within 40 px of a decorative torch during the hint.
- With `AUDIT=1`: `dead ends: stuck X% … playing Y% …` (settled dead ends vs timeouts still moving, with the first five orders of each; **target 0 for both**; the audit line's `stuck` is still the two together) and `deepest wrong orders` (the three losses at the latest tap, with tap, cause and time).
- `ROBUST=1`: the solution with the default stops, the stops reversed, each `~t` wait at ±25% and each `'@x'` walk at ±40 px. A win only some give is fragile.
- The grain total adds the boss's `breath.max`. The board map (`BOARD=1`) draws `o` gas, `%` cracked walls, `P` plates, `|` doors, `F` flames.
- The audit counts 'gassed', 'blasted' and 'sealed' as lessons like any loss.

### The Tomb Guardian (the boss, level 30)
- `blots: [{ x, y, animal: 'toad', boss: true }]`: radius 40 (≥ 80 px headroom), **stays in its coffin** (never walks; it only turns to face Nib). Nib touching it is `inked`, as with any guard. Plus `breath: { every, count, max }` on the level (written out; see above).
- **The beat** starts at the first pull: it breathes at first pull + `every`, + 2·`every`, … (5, 10, 15 s with the defaults). While Nib is out of its sight (**≥ 320 px sideways**, any height) it holds that breath and the beat keeps time. **Its throat swells for the 1 s before each breath** (the tell; `world.breathSwell`, 0..1; the placeholder art puffs the whole toad up 12%).
- **A breath**: `count` gas grains from its edge toward Nib's centre, in rows of 4 (10 px apart, fanned ±20°) every 6 steps (24 grains in 0.3 s), at 1.5 px/step; then they rise like any gas. Event `breath`.
- **The cap**: never more than `max` breath grains in play; burnt and vented ones free up room. Measured (every 2 s, count 24, max 50, nothing burning): 24, 24, then 2, then none.
- **Where it pools**: Nib on the floor beside the coffin, a 200-px lid (a ledge) 150 px above the mouth: all 24 grains within 30 px under the lid **1.47 s** after the breath, two rows deep, **on Nib's side** of the lid (x 321..433 of a lid at 300..500, the toad at 400). The breath leans toward Nib before it rises.
- **The lid**: a blast cracks an 'up' ledge within 48 px (0.4 s wobble, then it falls). Measured: the lid fell ~110 px onto the toad **0.84 s after the blast** and beat it (`stomped`: the slab squash already beats the boss, nothing was added; the Fire Idol still passes). A slab lands on any wall under it: a bowl's shelf inside the coffin must stand clear of the lid's fall (the test's lid is x 330..500 with the bowl's shelf at 291..312, its bowl at the shelf's tip, the flame 22 px under the lid and beside the lid's end, where the breath spills up past it).
- **Lava at its mouth** (a cup on Nib's side) lights each breath as it comes out: it burns low, and the lid 150 px up stays up. That's a wrong order with a reason. Lava touching the toad's body scorches it like any guard: keep the cup ≥ 10 px off it.
- Gas and blasts never hurt it. Water washes it only as a dropped column (the boss's soak).
- Tests: `test/boss-ch3.test.ts` (`MEASURE=1` prints the numbers above).

### How each mechanic reads on a board
Worked boards from `test/patterns-ch3.test.ts`, each tested with these numbers (room 40..760 × 300..900, floor top 892, door D a 100-px door at x 600 that plate A holds open).
1. **A plate Nib must not touch.** Plate A (x 56..150) sits in a closet whose wall comes right down to the floor (x 160, y 650..892); a boulder on pin B (y 712, 180 px up) drops into it. Nib can walk up to the closet wall all day and the plate weighs 0. Pull B: the boulder is on the plate 0.53 s later (weight 40) and the door is fully open 0.41 s after that. Never put such a plate on Nib's route: he steps off it and the slow door lets him through.
2. **A door that seals Nib in.** Plate A (need 20) is the floor of a 100-px pit holding 50 water; pin G lies across the pit floor plugging a 12-px grate. Door D stands between Nib (held by pin S) and the chest; `seals: [{ door: 'D', side: 'right' }]`. S first: he walks through. G first: the pit leaks, the plate goes up 1.5 s later and the door is shut 0.82 s after that; pulling S then ends `'sealed'` 1.0 s later (all pins out, board still). No `seals` entry, and the same order would end 'stuck'.
3. **Gas vented top-down.** 100 gas under a 300-px dome whose lips hang 50 px (the gas is 48 px deep); a chimney in its roof with a drain box 40..90 px up, plugged by pin V across the gap. Pull V: a 40-px vent empties half the dome in 3.0 s and all but 2 in 5.5 s; a 60-px vent, 2.2 s and 4.1 s. Nothing spills under the lips. Nib can stand under the dome's lip the whole time.
4. **A bowl lights a gas pocket and breaks a cracked bar.** A 300-px dome from a lip at x 400 to a cracked bar at x 700 (in `bars` and `cracked`); a bowl at the tip of a 32-px shelf off the bar, its flame centre 22 px under the ceiling; pin G is the lid of a 100-px gas pit in the floor holding 60 gas (7 rows hanging from the lid: keep the pit ≥ 80 px deep, or the fill starts in the rock). Pull G: the gas rises, spreads two rows deep and reaches the flame 2.6 s later; the bar breaks 0.07 s after that. Nib 300 px away on the floor is safe.
5. **A frog dropped onto a plate.** A puffed frog floats at x 300 in 120 gas under a 300-px dome (x 250..550) with a 40-px roof vent at x 380..420. Plate A is the floor of a 200-px pit, 60 px deep, right under the vent. Pull V: the frog drifts to the vent (x ~400) while the gas leaves, drops 6.0 s after the pull, lands in the pit 0.7 s later, and can't walk out: weight 30, the door stays open. **On an open floor it lands, walks off the plate and the door shuts again**: a frog's plate needs a pit. Into water instead: a pool under the vent washes it ~1.2 s after it drops.

### Level notes from the first builds (levels 21–23)
- With no `stops`, the bot walks Nib toward the chest after every tap (so he can be standing on a trapdoor pin before it's pulled). Set `stops: []` and script the walks with `'@x'` steps when that matters.
- The first draft of level 21 waited ~24 s per pull on a boulder churning its pit (fixed: see settling above).
- For levels with `seals`, the bot and the audit wait at least 6 s after the last step for 'sealed' (1 s of calm, or a 5 s lull), and on while the board still moves, up to 20 s. Before Nov 1, 2026 they left too soon and counted sealed orders 'stuck'; re-audit any level measured before then.
- A seal only covers the barrier it names: once that wall is blasted or that door opens, `sealedOut` is false, and a Nib trapped some other way (a dry pit he can't climb out of) ends 'stuck'. Level 24's G,B,U,S,A,W is this: G breaks bar 43, then Nib drops into frog 2's dry pool and can't get out.
- Level 23's blast depended on where the gas column hit the roof (see the mystery above): check a blast level's win at both ends of its fills and tanks, and with `ROBUST=1`.

### Design around this (Chapter 3)
- Gas is fast (300 px/s up) and the fire is instant (a dome in 0.25 s): the board's drama is in the order, not in timing.
- A plate's zone is 40 px tall: water weighs at most ~35 in a 100-px pit, and only in a pit.
- Leaking plates leak in under a second with a 30-px grate; use ≤ 12 px.
- Closed domes are diving bells: gas leaves only upward (vents, flues, roof doors) or by burning.
- Floating frogs drift toward the vent before they drop: put the pool or plate under the vent, not under where the frog starts.
- A blast reaches 48 px to a cracked bar's centre line and ~60 px to Nib's centre, through open air only.
- Gas fills hang from their lid: `y1` is the lid's underside, rows go down.
- `seals` must not name a door Nib holds open by standing on its plate.
- A flame reaches 24 px: beside a column it must nearly touch the gas; under a pool, ≤ 24 px below the ceiling (one row) or ≤ 36 (two). A bowl on a shelf stands at the shelf's tip.
- Gas pools ~5 px wide per grain, two rows deep, where its column lands: a far bowl past that never lights.
- A frog dropped on a plate walks off it unless the plate is in a pit (60 px deep held it).
- Plates Nib mustn't hold go in a closet or behind a ≥ 66-px step: a slow door lets him slip through otherwise.
- The boss's breath leans toward Nib and pools on his side of the lid; put the bowl (or the trap) there, clear of the lid's fall.
- Drains swallow lava too (150 lava fell to 85 in ~5 s through a 30-px grate), not only water, coins and rubies.
- One spark doesn't always burn a whole pool: in a 300-px dome with the flame 22 px under the roof, the edge lit 63 px short of a cracked bar and the bar held. Keep the dome narrow (≤ ~250 px for 60 gas) and the flame where the pool reaches before it lights (30 px under the roof worked).
- A gate can't meter a small tank: 18 water left a full-width gate in ~0.5 s (the gate numbers above are for 240 water).
- One spare water grain anywhere in a pit sets all the lava poured into it later: a pit can't keep water for a second job.
- 'sealed' fires only once the board is at rest (see 'The sealed loss'): water trapped under new stone, or a puddle round Nib, keeps more than 24 grains churning or heading somewhere, and the audit can count that order 'stuck'. Leave little spare water, and run spills away from Nib.
- Steps need headroom: Nib can't climb even a 34-px step if a ceiling or ceiling corner is within ~60 px above his head (43 px failed, ≥ 60 climbed).
- A puffed frog stays puffed 1–2 s or more after its pocket vents, and the bot's settle check ignores it, so the next pull fires while it still floats; under a chimney it can float up and stay puffed for good. A frog can't carry a pin order between two quick pulls.
- A gas gallery in front of a vault needs the vault's ceiling lower than its own (a lip): with matching ceilings the gas spreads into the vault when the door opens and thins below lethal.
- Pins set in a flue's side walls slide up through the roof line; keep them short and low, or the roof-vent pin blocks them.
- A gentle lava pour (a 22-px spout) doesn't splash: unset lava reaches past its pit only when the vat holds more than the pit.
- A flame's 18-px douse reach counts from the water's real position after the pre-settle, which a tank wall's face shifts by up to 6 px: measure in the lab, don't trust the fill's x.
- A frog climbs a 20-px step but not a 30-px one, so a 30-px pit keeps it. A roaming floor frog wanders out of a shallow dip: a 40-px pen keeps it in place.
- The bot's walks stop dead when Nib's climb probe (a circle of his radius one step-up, ~60 px, above him) touches a wall end or a pin: every approach to a pit or stair, and every gas cup, lip or shelf over a riser, must clear that circle.
- Stair treads must be ≥ 55 px wide; narrower, Nib straddles two risers and sticks.
- A 60-px lip right behind an open door can't be climbed: the door's lower end sits where Nib's head goes. Nib (60 px) and salamanders (58 px) climb nearly the same step, so a lip can't keep a salamander in and let Nib through.
- A guard behind a door that starts open walks out before it shuts (a crypt behind an inverse door): start guards where they can't reach the doorway, or keep that door shut at the start.
- Coins falling through gas push it down and out, even under a hanging lip; a pin parked in open space traps gas under it, so a lid pin's slide path must be clear of the gas.
- Gas creeps along a nearly flat roof at ~25 px/s on a 7° slope; give gas roofs a real slope or a short run.
- Water stalls on wide flat set stone: 120–160 of 150–200 grains stayed on a 340–520-px moat or ledge (the bot hit its 8 s cap). A flood dropped ~120 px onto lava digs a crater in the setting gravel that holds the water.
- A set moat hardens outward from where the water enters, over a few seconds: Nib following ~3 s after the pour burned ~500 px away.
- A door must reach the floor: one ending 14 px above it lets water under.
- Coins left where Nib can't collect them (on a plate, on moat stone) still count as in play, so the order ends 'stuck', not 'drained'.
- 8 water on a 12° slope crawl ~74 px/s; 16 water about twice as fast. Lava creeps too slowly down a long slope to carry it far.
- 250 lava over a 102 × 84 well left the stone churning for good (the bot waited 8 s every time); 220 settled.
- A far bowl's place is sensitive: 10–20 px decides whether the burning pool reaches a cracked bar. Measure it with the lab.
- Water splashes ≥ 70 px off a shelf: put a bowl you mean to douse in a walled basin.
- The ground line is at y = 292: rooms above it draw as the temple's top against the sky.
- Headroom for a step is more than it looks: a 44-px riser needed ~76 px of clear ceiling above Nib's head (68 px failed), and his climb probe also catches a ceiling corner ~30 px to his side.
- An `'@x'` walk ends when Nib lands after a long fall (a 260-px shaft): split the walk at the drop (`'@x1'`, then `'@x2'`).
- A pin whose end grazes a door's path (even 3 px) holds the door shut; nothing visible happens. Keep pin ends clear of every door slot.
- The lab loads drafts (levels in CHAPTER_3_DRAFTS) as well as listed levels.
- A blast needs gas next to the cracked bar: a bowl lights the gas front ~24 px ahead of the flame, but with no gas between the flame and the bar, a bar 43–46 px away held. Let the gas pool by the bar first. A wall overlapping a cracked bar's end seemed to shield it.
- A door whose opening path crosses a pin waits on that pin (`doorBlocked`): route door slides clear of every pin.
- A frog floats up into a vent pocket wider than itself and plugs it: a 24-px vent works.
- A pocket above a dome (a shaft under a pin) keeps its gas after the dome vents.
- Nib dropping onto a frog stomps it, and the bounce lifts him out of a 70-px pit.
- Puffed frogs keep the settle check busy, so every tap before their vents open waits the bot's full 8 s.
- Since Nov 1, 2026, a door moving or a bar breaking wakes the sleeping grains, as a pull does: gold on a cracked bar or a trapdoor falls when it goes. (Before, it hung there until the next pull anywhere; the "coins pour through a 36-px slot in 6–7 s" figure above was measured with taps keeping them awake. Re-measure pours.)
- Lava drains fast: ~92 lava through a 12-px grate in ~6 s; a plug over a lava basin drained ~60 in ~6 s.
- Water under set lava rises up through the stone: "water first, lava on top" doesn't keep the water low.
- Water let out first, with lava landing on it, is mostly used up setting it (39 of 60 gone): water you want left over must come after the lava.
- A plug under set stone doesn't drain it: the stone bridges the hole.
- A cistern whose floor is level with the stone drains slowly (the levels even out): raise its floor above the stone.
- Plate symbols are chosen by the art (ankh first, then scarab, eye, feather, by order in `plates`), not by the doc's names: name plates in the header by their symbol on screen. (Sun and moon were dropped on Nov 1, 2026: players read them as light.) A plate is drawn as a stone slab set in the floor, its symbol carved and painted in its tint, with weight notches either side that light as weight lands (all lit = down); its doors have the same symbol cut in their face, an inverse door's struck through in red. Only pins are gold with a ring. A tap on a plate or door shakes it and lights its groove; the HUD then says once per level that plates open with weight.
- A cracked bar can't be a basin's back wall: once it breaks, the water runs out. A 16-px lip doesn't hold water dropped ~70 px; 32 px does.
- A salamander dropped into a shallow pan doesn't reliably wash: give it a pool.
- Tips name plates by what the player sees: the ankh, the scarab, the struck-through ankh (inverse door), not the doc's names.
- Switchback stairs don't work: a 44-px step needs ~124 px of headroom near a turn, more than the flight above leaves. Use one diagonal stair, or a shaft Nib drops down.
