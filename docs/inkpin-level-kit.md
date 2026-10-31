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


## Chapter 3: the Desert Tomb (engine pass, Oct 31, 2026)

Everything above still holds. Measured numbers below come from `test/measure-ch3.test.ts` (`MEASURE=1 npx vitest run test/measure-ch3 --silent=false`) and `test/mechanics-ch3.test.ts`.

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
- `breath?: { every, count, max }` (the boss; **not built yet**, see below).
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

### The 'sealed' loss
Lost `'sealed'` when: every plain pin is out and every gate has been pulled at least once; everything but Nib has been still for 1 s (Nib walking doesn't reset it); the goal isn't met; and some `seals` barrier stands (a door not fully open, a cracked wall not broken) with Nib on its far side from `side` (compared with the barrier's midpoint).
- **Don't list a door Nib opens himself by standing on a plate**: with all pins out and him on the wrong side, it seals him even though he could walk onto the plate.
- A level with no `seals` never seals: a shut-out order ends 'stuck' as before.

### Tomb gas (measured)
- `GAS` grains fall up (gravity −0.035, up to 2.5 px/step). Free rise **~300 px/s**: gas crosses a room in a second, so Nib can't outrun it, and gas reaches the roof long before anything else moves.
- Rises through water: 30 gas under 124 px of water were all above the surface 0.88 s after their lid opened. Water falls through gas.
- 100 gas under a flat 300-px ceiling settle **48 px deep** (5 rows: rows ≈ count ÷ ((width − 12) ÷ 10 + 1), 9 px apart, from the ceiling down). A dome's lips must hang deeper than that, or it spills round them.
- A 40-px roof vent (`drain` box in a chimney, plugged by a pin): half of 100 gas gone in 3.0 s, all but 2 in 5.5 s. Gas drifts toward the vent along the ceiling.
- Gas seeps up through a coin heap (sleeping coins never trap it): 40 gas under 80 dropped coins were all out in 1.3 s. Gas goes round a raft: 1 of 30 left under it after 5 s.
- A resting dome counts as settled for the bot within 0.2 s.
- **A closed dome is a diving bell: rising water does not squeeze gas out under its lip.** Water 93 px over the lip of a 160-px dome spilled 0–3 of 60 gas. Gas leaves a dome only upward: through a vent, a flue or a door in its roof, or by burning. (This changes level 22's "the flood squeezes the gas out": make the flood lift the gas pool up a flue or stair whose mouth is in the dome's roof, behind a pin.)
- **Nib**: lost `'gassed'` with ≥ 3 gas grains within 30 px of his centre at once, or any touching him 20 steps in a row. One stray grain is safe. He walks under a resting dome's lip safely (measured with 24 px between the lip and his head): the gas stays above the lip.
- Creatures walk through gas (they don't push it); bodies, rubies and slabs push it aside like water.

### Fire bowls, ignition and blasts (measured)
- A gas grain touching a lit flame (within 18 px of its centre) or any lava (13.5 px) burns 8 steps then is gone; from its 2nd step it lights all gas within 16 px. **120 gas in a 160-px dome burnt out in 0.25 s from one spark.** Gas across a wall or pin (≥ 26 px apart) doesn't catch: the fire follows connection.
- **Blast reach** (each burning grain, any step it burns): a cracked bar breaks when its centre line is within **48 px** (40 + its t 8); Nib is blasted with his centre within **~60 px** (64 measured fine); any guard (boar, salamander, armadillo, frog: fireproof isn't blastproof) within 40 px of its edge; an 'up' ledge within 48 px starts cracking (0.4 s wobble, then falls as before). Only along a line no wall, pin, door or ledge blocks: no blast round a corner. The boss, water, lava, coins, stone, rubies, boulders, rafts, plates, doors, pins and bowls are untouched.
- **Keep Nib ≥ 70 px from any gas that can burn**, and his route ≥ 70 px below a dome that a flame can reach.
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

### Not built yet
- **The boss (level 30)**: `breath` is in LevelDef and the budget, but the Tomb Guardian's breathing, the coffin lid and its tests are a later engine pass. The toad draws (a big warty frog) and stays put as any boss.
- The painterly tomb art: plates, doors, bowls, rubble, gas and the frog are pen-and-ink placeholders; the walls use the temple's stone.

### Design around this (Chapter 3)
- Gas is fast (300 px/s up) and the fire is instant (a dome in 0.25 s): the board's drama is in the order, not in timing.
- A plate's zone is 40 px tall: water weighs at most ~35 in a 100-px pit, and only in a pit.
- Leaking plates leak in under a second with a 30-px grate; use ≤ 12 px.
- Closed domes are diving bells: gas leaves only upward (vents, flues, roof doors) or by burning.
- Floating frogs drift toward the vent before they drop: put the pool or plate under the vent, not under where the frog starts.
- A blast reaches 48 px to a cracked bar's centre line and ~60 px to Nib's centre, through open air only.
- Gas fills hang from their lid: `y1` is the lid's underside, rows go down.
- `seals` must not name a door Nib holds open by standing on its plate.
