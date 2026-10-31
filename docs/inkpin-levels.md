# InkPin: the levels

All 100 levels at a glance: 10 ruins with 10 levels each. The ruins, materials, Blots, pins and bosses come from [inkpin-design.md](inkpin-design.md); this page says what each level asks. Names and puzzles are drafts: the solver bot decides the final layouts.

## How movement fits in

Nib walks, jumps (about 55 px), climbs a ledge up to about 44 px and swims. Each ruin adds one new kind of ground, taught on its level 1. The rules:

1. **Movement is part of the puzzle, never a reflex test.** Where Nib stands is a choice like which pin to pull: wait in an alcove while the lava passes, stand on a plate to hold a door, float up on the water you let in.
2. **Every level can be finished with tap-to-go.** No precise jumps and no timed runs. A loss comes from the pin order or where Nib waited, never from a slipped thumb. Bosses act on a beat, but a slow one with a wide window.
3. **The way to the chest needs only walking and the small jump.** Harder movement leads to **bonus gold**: from level 3 of each chapter, most levels have an alcove of coins reached by that ruin's movement. It counts toward the "every treasure" blot and the bank, so casual players never get stuck on it.
4. **One screen, no falling to your death.** Tall levels scroll (level 7 of each chapter), but Nib never dies from a missed jump. He just lands lower and climbs back.

## The arc of a chapter

| Level | Role |
|---|---|
| 1 | **Meet the place:** the ruin's new ground for Nib, with only materials you already know |
| 2 | **The new material,** on its own |
| 3 | **The material at work,** mixed with the old ones |
| 4 | **The new Blot,** on its own |
| 5 | **Loot:** a big pour of gold |
| 6 | **The new pin,** on its own |
| 7 | **Tall:** two screens that scroll, with the ruin's movement |
| 8 | **Remix:** everything in the chapter (some are Escort levels: free a caged animal friend, who follows Nib) |
| 9 | **Lights out:** dark except where Nib's lamp, lava or fire glows |
| 10 | **Boss** |

Goals are from the design doc: **Treasure** (the chest's relic and the coin target, the default), **Loot**, **Clear**, **Escort** and **Boss**.

## The difficulty curve

Levels are numbered straight through the game: chapter 2 is levels 11–20, chapter 10 is 91–100. Every level must meet its row before it ships. The audit (test/audit.ts) and the lab (test/lab.test.ts, `AUDIT=1`) print the numbers.

**Later chapters are deeper, not bigger.** Every level stays 2–3 screens wide (or two tall), at most ~700 grains, 3–5 stages, a hint of about 25–120 s (from the puzzle, never from empty floor to walk), and can be finished with tap-to-go. Bigger boards are harder to read on a phone, slower to simulate and dearer to build, and they add walking, not thinking.

| Chapters | Levels | Pins | What each level asks | Win share (levels 1–3 / 4–10 of the chapter) | Lessons | Top lesson | Late losses |
|---|---|---|---|---|---|---|---|
| 1 | 1–10 | 4–6 | one new thing, with materials already known | ≤ 35% / ≤ 15% | ≥ 3 / ≥ 4 | ≤ 50% | — |
| 2–3 | 11–30 | 5–7 | the new thing working against a second one | ≤ 20% / ≤ 10% | ≥ 4 / ≥ 5 | ≤ 45% | ≥ 50% |
| 4–6 | 31–60 | 6–7 | two mechanics interlocked in every stage | ≤ 15% / ≤ 8% | ≥ 5 / ≥ 6 | ≤ 40% | ≥ 60% |
| 7–10 | 61–100 | 6–8 | earlier chapters' mechanics as full stages; gates timed off the board are normal; one level per chapter where a single pin does two jobs | ≤ 10% / ≤ 6% | ≥ 6 | ≤ 40% | ≥ 60% |

Stuck (all pins out, nothing happens) is at most 10% everywhere. **Late losses** are the losses that come from the second pull or later. A level that mostly loses on the first pull teaches its answer at once.

**The reading checks** (from chapter 2 on). The audit plays random orders, but a person reads the board. Chapter 2 met its audit targets, and its first playtest (Oct 31, 2026) still finished all ten levels with one mistake. So every level must also pass these:
1. **The obvious orders lose.** Pulling the pin nearest Nib first, and pulling left to right, both lose. The lab prints both.
2. **Every pin has more than one visible effect,** or its timing depends on another room. A pin whose one job is plain from the board is a free step.
3. **At least one wrong order looks right until late:** it gets through two or more stages before it fails.
4. **The winning order isn't the order of the rooms.** Somewhere the player must act in a room ahead of Nib, or come back to an earlier one.

**The sawtooth inside a chapter.**
- Level 1 is a breather, easier than the boss before it, but still at its chapter's row.
- Levels 4–7 build up.
- Level 8 (the remix) is the hardest normal level.
- Level 9 changes how you see the board.
- Level 10, the boss, is the chapter's peak.

**Ways to add depth without size:**
- a second tempting wrong pin
- one supply needed in two places (cool the moat *and* wash the guard with one tank)
- a pin whose right moment is shown in another room
- a loss that looks like a win until late
- a gate used twice
- a body (raft, slab, boulder) that has a job in two stages

**Not this:**
- more rooms
- more grains
- pins that only hold Nib back (at most one per level)
- a tighter stopwatch
- hidden information the board doesn't show

**Hard, but not blocking.** Hearts (a loss winds back one pull), free hints and instant restarts keep every level finishable. The "first try" ink blot (no restart, no hint, no heart lost) is where the real challenge lives, so it grows harder as the levels deepen.

## 1. The Jungle Temple (free)

**Built** (games/inkpin/src/level; each level has its own test, test/wide-<id>.test.ts, where the solver bot plays its hint to a win and its tempting wrong orders to the losses they're meant to be).

Every level is 2–3 screens wide or two screens tall, with 3–5 puzzle stages (about 60–90 s to play), at most ~700 grains for phones. Each level has its own signature idea, and no two stages in a level use the same trick. The boulder-in-a-drain plug appears only in levels 3, 5 and 10; washing a guard with water at most once per level.

**New ground: hanging vines and ledges.** Tap a vine to climb to that spot; tap a floor to step off (keys: up/down on a vine). **Material:** water, lava (melts gold, burns Nib, guards, vines and crates; water turns it to stone), coins, boulders (roll, plug drains, squash what they land on), **seeds** (water grows a seed into a climbable vine), **crates** (float on water and ride its current, a flat top to stand on, squash what they land on, burn in lava), drains. **Guards:** the boar (stomp, wash, burn or squash it), the porcupine (spiky: never stomp it), and the Great Boar boss. A guard that can't get at Nib paces off and comes back to glare. **Pin:** plain pins, and pins that block each other.

| # | Name | Goal | Signature | What happens |
|---|---|---|---|---|
| 1 | The Door | Treasure | The first seed | Tutorial, can't be lost: the door, gold rain from a hopper, a seed watered into the vine up a wall too tall to climb, and a deep door to the chest |
| 2 | Gold Rush | Loot | Gold routing, the first lava | A ramp to pull before its hopper, a trough of pins that lock each other (curb, then trough, then hopper), a trapdoor to leave shut until its gold is picked up (a vine leads back up the shaft), and a lava pit to cool to stone before the last hopper's gold drops on it |
| 3 | The Rain Cistern | Treasure | The first crate, one tank of rain | The rain does every job: the boulder rolls out to plug the drain before the rain floats Nib (and the gold) out of the cistern; the sluice then washes away the porcupine in its tunnel (open it with Nib still down there and it walks in); drop the crate into the pit before Nib goes down, and the water floats it up as the step to the ledge; the overflow grows the vine to the chest |
| 4 | The Guard | Treasure | Three ways past a guard | The big water tank over the first boar is the trap: lava first burns the boar, then the water cools it to stone and waits in the hall; the dam sends it on to wash the second boar, and only then Nib's gate (pinned shut by the lava's pin) opens; a crate drops on a porcupine and stays as the step out of its pit |
| 5 | The Gold Vault | Loot | Lava with two jobs, the pen floor | A boulder over the spot where Nib waits rolls into the drain dip before the gold pours; a porcupine's pen floor drops it into a lava pit, and the pit's door sends that lava down the chute to the vault, so water the hoard and the seed first or it melts the gold; Nib follows the lava down |
| 6 | Pin Over Pin | Treasure | Pins that block across rooms | Each pin is jammed by one in the next room: the cell's water by the lava tank hanging past the drop, the porcupine's gate by the gold shelf in the chest's room. Lift the drain's lid before the lava (or it pools at the gate, seeps onto the gold and burns Nib), wash the boar in its cell before opening it, drop the gold before the gate, and burn the crate barricade with its lava trickle before Nib gets there |
| 7 | The Well of Vines | Treasure | Seeds, one tank | Two screens tall: cap the lava with its cup, then pull the long pin that holds it, since that same pin tips both of the tank's taps down a drop to the first vine (and Nib climbs into a dry porcupine). Then let the cistern into the sump to wash the porcupine and water the seeds, and only then open the hatch to the first vine |
| 8 | The Flooded Stair | Loot | Crate rafts, the boulder run | One flood down the stair wedges a crate in a slot as the bridge and floats another up a well as the step; a boulder runs down its track, a shaft and a trapdoor onto a porcupine, so drop it before Nib waits under it; the lava tank over the porcupine is a trap that melts the gold |
| 9 | Torches Out | Treasure | Lava as light, the pen floor | Lights out: drop the porcupine from its pen into the glowing sump (after letting its gold out), then cool the sump to stone and drop into the dark; past the gate, water the gold pit before its lava lamp, which washes its porcupine and turns the lamp into a stone step to the chest; a seed grown by a lava bowl's glow |
| 10 | The Idol Hall | Boss | Save the water | The great tank over the lava moat is the only flood: its side door sends it down the aqueduct to the Great Boar's cistern, and only the well's last water goes on the moat and the seed. The floor pin first spends it all and the boar wins. The moat's gold after the stone, a crate dropped into the tunnel's slot as a bridge, then the cistern opened on the boar all at once |

### Round 3: puzzle depth (Oct 30, 2026)

**What the review found.** The levels are long, but each stage is a 1–2 pin puzzle, and most of them are the same one: deal with the danger, then open Nib's gate. Once a player learns "gate pin last", most stages solve themselves. The stages don't affect each other, so a 90-second level is 3–5 small puzzles in a row. Four tricks are each used in 3–4 levels: the stacked lava-then-water tank over a guard (4, 5, 9), a crate dropped on a porcupine (4, 6, 8), a lava moat cooled to stone before the gold (2, 5, 9, 10) and a ramp before the hopper (2, 3, 6). The difficulty runs backwards: levels 2, 5 and 6 have 10–12 pins, then the Remix (8) has 3 and Lights out (9) has 4.

**The audit** (`AUDIT=all pnpm test audit`, test/audit.ts) plays every pull order of a level with up to 5 pins, or 60 sampled orders above that, like the solver's eager player. It reports the win share and the **lessons**: each loss is counted as "the pin pulled just before it" plus its cause. Few lessons, or one lesson behind most losses, means the level teaches one thing.

| Level | Pins | Wins | Lessons | Biggest lesson | Notes |
|---|---|---|---|---|---|
| 1 The Door | 4 | 100% | 0 | — | The tutorial, can't be lost (on purpose) |
| 2 Gold Rush | 10 | 2% | 7 | 32% | Good spread, but harsh for level 2 |
| 3 The Rain Cistern | 5 | 8% | 2 | 67% | 32% of orders end stuck (nothing happens) |
| 4 The Guard | 6 | 7% | 5 | 78% | Most losses: gate G opened too early |
| 5 The Gold Vault | 12 | 2% | 11 | 15% | Hard and varied, but nearly every loss is "burnt" |
| 6 Pin Over Pin | 11 | 8% | 4 | 55% | Most losses: Nib's door onto the porcupine pit |
| 7 The Well of Vines | 5 | 1% | 2 | 92% | Nearly every loss: Nib's door too early; 21% stuck |
| 8 The Flooded Stair | 3 | 67% | 2 | 50% | Pull at random and you usually win |
| 9 Torches Out | 4 | 4% | 5 | 30% | Few pins; its trick repeats levels 4 and 5 |
| 10 The Idol Hall | 9 | 7% | 4 | 74% | Most losses: the gold melts; 35% stuck |

(Baseline on Oct 30, 2026, before round 3. Win share is of the orders whose pins could all come out.)

**After round 3** (Oct 31, 2026): every level meets the targets below.

| Level | Pins | Wins | Lessons | Biggest lesson | Stuck |
|---|---|---|---|---|---|
| 2 Gold Rush | 9 | 5% | 6 | 43% | 0% |
| 3 The Rain Cistern | 4 | 4% | 5 | 48% | 0% |
| 4 The Guard | 5 | 7% | 6 | 36% | 0% |
| 5 The Gold Vault | 6 | 2% | 5 | 33% | 2% |
| 6 Pin Over Pin | 8 | 8% | 6 | 27% | 0% |
| 7 The Well of Vines | 7 | 3% | 7 | 31% | 0% |
| 8 The Flooded Stair | 8 | 10% | 10 | 35% | 0% |
| 9 Torches Out | 7 | 5% | 8 | 33% | 0% |
| 10 The Idol Hall | 6 | 5% | 4 | 32% | 0% |

The audit's player is eager: after every pull it walks Nib on along the level, so it loses more often than a patient player. Low win shares on levels 2–3 mostly mean "don't walk under the boulder yet", not that the order is hard to find. Playtest whether levels 3, 5 and 7 feel too hard.

**Known follow-ups from round 3**
- Engine: sinking stone can push water grains past a pin (The Guard works around it by sitting its water tank right on the lava); a vine that finishes growing after Nib reaches its foot isn't climbed by a tap until tapped again; water creeps on gentle slopes, so channels need about 12°; guards never dry off, so stray drops slowly wash one.
- The Idol Hall: opening the cistern within about 2.5 s of the flood reaching it lets the boar live (a timing loss, though the filling is in plain view).
- The Flooded Stair has a pin that is never pulled in a winning order (the lava tank), a first for the game.
- Art: the new aqueducts, chutes, baffles and cisterns are drawn as plain stone bars; they need their own look so the routes read at a glance.

**Rules for round 3**

1. **Stages depend on each other** (level 3 on). At least one link in every level: one supply needed in two places, a later stage's pour that passes through an earlier room, or a pin in one room that blocks a pin in another.
2. **At most one "Nib's gate" pin per level** (a pin whose only job is to hold Nib back). Where Nib waits, or what he stands on, does that job instead.
3. **Each trick in at most two levels.** Seeds are Nib's ground in this ruin and can appear more often, but each time with a twist (shared water, lava nearby, in the dark).
4. **A tempting wrong pin** from level 4 on: the most obvious pull (the big tank over the danger, the pin nearest Nib) is a trap.
5. **Every wrong order ends in a funny fail,** never a silent dead end where nothing happens.
6. **Targets** (from the audit): win share at most 35% on levels 2–3 and at most 15% from level 4; at least 3 lessons on levels 2–3 and at least 4 from level 4; no lesson behind more than half the losses; at most 10% of orders stuck.
7. **Kept from round 2:** 2–3 screens wide or two tall, 3–5 stages, 60–90 s, at most ~700 grains, every level can be finished with tap-to-go, washing a guard at most once per level, the boulder-in-a-drain plug only in levels 3, 5 and 10.

**Tricks and where they live**

| Trick | Levels |
|---|---|
| Stacked tank over a guard: lava first, then the water cools it | 4 |
| A crate dropped on a porcupine fills its pit | 4 |
| A lava moat cooled to stone before the gold | 2, 10 |
| A ramp before the hopper | 2 |
| A crate floats up as a step | 3, 8 |
| A crate settles in a slot as a bridge | 8, 10 |
| A boulder plugs a drain | 3, 5, 10 |
| Lava burns a crate barricade | 6 |
| **New: the pen floor.** A guard paces a pin-floored pen; pull the floor and it drops into lava, deep water or a sealed pit | 5, 9 |
| **New: one source, two jobs.** A ramp or a blocking pin decides where a pour goes, and one tank is just enough for both jobs if they come in the right order | 3, 7, 10 |
| **New: the boulder run.** A boulder rolls along floors you open for it and squashes a guard at the end, and Nib stays out of its way | 8 |
| **New: pins that block across rooms.** A pin in a late room blocks one in an early room, so the order spans the whole level | 6 |
| **New: save it for later.** Spending a tank early leaves too little for the end | 10 |
| **New: read it, then cool it.** Lava is the only light, so cooling it darkens the room you still have to cross | 9 |

**The plan, level by level**

| # | Level | Change |
|---|---|---|
| 1 | The Door | Unchanged: the tutorial can't be lost |
| 2 | Gold Rush | Light: hit the targets, keep its tricks (ramps, the trough, the trapdoor, the first lava) |
| 3 | The Rain Cistern | Fix the dead end (an early sluice now ends in a fail); replace the ramp-and-hopper stage; make the rain's second job matter |
| 4 | The Guard | One gate instead of two; tie the stages together (the second boar's water is also what the first stage needs) |
| 5 | The Gold Vault | Replace the moat and the stacked tank with the pen floor and lava with two jobs; keep the boulder plug and the vault |
| 6 | Pin Over Pin | Crossed pins across the whole level; drop the crate-on-porcupine and the ramp; keep the lava-burnt barricade |
| 7 | The Well of Vines | One tank for four seeds, with just enough water, a way to waste it and a tempting first pull; 7+ pins |
| 8 | The Flooded Stair | Rebuild as the real remix: the flood carries crates (step, bridge), a boulder run, lava; 8+ pins |
| 9 | Torches Out | Rebuild around the dark: read the room, then cool the lava that lights it; the pen floor; a seed in the dark; 7+ pins |
| 10 | The Idol Hall | Save the water: the boss needs every drop, so the approach is solved without spending it (or by routing it on to the boss) |

## 2. The Volcano Shrine

**Redesigned (Oct 31, 2026).** Chapter 1 already teaches lava (it melts gold, burns Nib, guards and crates, and water cools it to stone), so the old plan, with lava as the new material, would have been the jungle again in black stone. The Volcano Shrine now changes all four things a chapter can change, and leaves the jungle's tools behind: no vines, seeds, crates, boars or porcupines.

| | Chapter 1, the Jungle Temple | Chapter 2, the Volcano Shrine |
|---|---|---|
| **Ground** | Vines and ledges: routes go both ways | **Crumbling basalt ledges:** a ledge cracks and falls once Nib steps off it. Routes go one way, Nib's own steps become triggers like pins, and the fallen slab is a tool (it squashes a guard, plugs a channel or lies as a step below) |
| **Materials** | Water, lava as a danger, coins, boulders, seeds, crates | **Pumice rafts** float on lava (and water) and never burn: Nib rides them across lava rivers, and they ferry gold. **Fire rubies** are gems that lava can't hurt, so they go through the lava while the gold must go round it. **Lava as a builder:** pour it where Nib needs a floor, then cool it into a bridge or a stair |
| **Guards** | The boar (stomp it) and the porcupine (spiky); lava, water or a crate beats either | **The salamander:** fireproof. It wades through lava to get at Nib, so lava no longer solves a guard; only water, a boulder or a falling slab does, and the same scarce water also has to cool the lava. **The armadillo:** armoured (never stomp it), but lava, water and falling stone beat it. Boss: **the Old Salamander** in the Fire Idol's bath |
| **Pin** | Plain pins, pins that block pins | **The gate pin:** tap it again to push it back in. Puzzles ask *how much* as well as *which first*: cut the water once the lava is stone, share one tank between two jobs, switch a pour from one channel to another |
| **Puzzle types** | Which order; where Nib waits | **How much** (gates), **which way** (one-way ledges, so plan the route before walking it), **build it** (pour your own floor), **ferry it** (rafts across lava) |

**Gate pins and tap-to-go.** A gate's right moment is always shown by the board, never a stopwatch: "when the moat is stone", "when the basin's lip is wet". The window is at least about 1.5 s wide, and the hint says when to tap. A gate can't be pushed back into Nib, a guard or a body.

**Rules** (round 3's rules carry over: stages depend on each other, at most one gate holding only Nib, a tempting wrong pin from level 4, every wrong order ends in a funny fail, the audit targets, 2–3 screens, 3–5 stages, 60–90 s, at most ~700 grains, tap-to-go):

1. A Chapter 2 level's signature is one of this chapter's ideas; Chapter 1's tricks may appear only as a supporting stage, at most one per level.
2. Washing a guard with water at most twice per level (salamanders need water, so once is too few for this chapter), and never twice the same way.
3. Each trick in the table below lives only in the levels it lists.

| Trick | Levels |
|---|---|
| A one-way route: plan the walk, because every ledge Nib leaves falls | 1, 7 |
| The slab as a tool: drop a ledge (by stepping off it) to squash a guard, plug a channel or make a step below | 1, 8 |
| The raft ferry: lava must flow to bring the raft to Nib, then carry him over | 2, 8 |
| Raft cargo: a raft carries the gold (or a guard) across the lava | 3, 5 |
| Pour your own floor: lead lava into a gap, then cool it into a bridge or a stair | 3, 7 |
| The fireproof guard: the salamander crosses lava to reach Nib; only water stops it | 4, 9, 10 |
| Rubies through the fire, gold around it | 5 |
| Meter the water with a gate: just enough to cool, not enough to wash the gold away | 6, 10 |
| The switch: a gate pushed back in sends the next pour down another channel | 6, 8 |
| Living light: a glowing salamander is the light in the dark, so wash it last | 9 |

| # | Name | Goal | Signature | What happens |
|---|---|---|---|---|
| 11 | Black Steps | Treasure | Crumbling ledges | Meet the place, with only Chapter 1's materials: Nib crosses two black ledges that fall behind him. Five pins: the gold (C) must pour while the first ledge is up (after, it goes down the crack), and the lid's hopper (H) before Nib crosses the lid (after, its gold goes down the shaft's crack). The lid's slab shuts the hole in the seat: lava (V) poured before it melts the cellar's gold. The water tank (W) sits over the lava tank: lava first, then water, makes the black stone step out of the pen; water first sets the lava in its tank and the armadillo lives. The gate (G) is also the pen's wall: early it frees the armadillo, on hot lava it lets the lava out round Nib. Win: C, walk, H, walk, V, W, G, walk (~33 s). **Audit (2026-10-31): win 1%, 9 lessons, top 35%, late losses 80%, stuck 0%; obvious orders lose — PASS** |
| 12 | The Pumice Raft | Treasure | Rafts on lava, raft cargo | A lava river between Nib and the chest, and a raft moored upstream: let the lava run to bring the raft to Nib's bank, drop the gold hopper onto it while it is docked (too early or too late and the lava melts it), ride it over, and cool the river from the tank on Nib's shelf only once he's off. The dam also holds Nib on his shelf, so any pull before it drops him onto the surge; the obvious first pull, that tank, is the trap. A last hopper by the vault door drops its gold behind Nib on his way to the chest |
| 13 | The Stone Bridge | Treasure | Pour your own floor | Nib needs a floor across a gap: lead a tank of lava into it and cool it there, while the raft ferries the gold over the rest of the lava, which must stay hot to carry it. A sluice at the river's end (narrower than the raft) lets the lava on to scorch the hall's armadillo, and the hall's gold must wait until the lava has come and gone (5 pins; audit 2% wins, 13 lessons, 59% late losses) |
| 14 | Salamander Springs | Clear | The fireproof guard | Salamanders bathe in lava pools, and lava doesn't trouble them. One cistern washes all three, through three outlets at three heights, and an outlet only gets the water above it: pull a low one first and it steals the shares above. So the cistern is emptied from the top down, which starts at the far spring (top tap E), then the great spring in front of Nib's gate (spout W), and comes back to the salamander behind him last (bottom tap D). The obvious pull, lava on the back salamander, is only a warm bath: it wades across and sloshes the lava onto Nib. Hint E, W, D, K, G |
| 15 | The Ruby Hoard | Loot | Rubies through the fire | Fire rubies and gold in one hopper: split them, rubies straight through the lava river, gold onto a raft and round; the hopper's left door R spills the water onto the landing to wash the armadillo and must go before the water (and after the gold has gone); lava poured before the water loses; an armadillo guards the landing |
| 16 | Just Enough | Treasure | The gate pin | Cut the water once the moat is stone (a window of about 2–6 s), or the rest washes the shelf's gold into the drain; two hoppers wait on it (the nearest one melts in the hot moat). The same tank's second job is the far well: the side door sends the rest of the water there, but it is not enough to float Nib, so a lava vat tipped into that water builds the last step; the vat's lava is hot until the water cools it, so the well's gold must not fall on it |
| 17 | The Caldera | Treasure | Two screens down | A crater two screens deep on one-way ledges: pour a stair of stone for the way down (no vines here), and choose which ledges fall where. Seven pins: the shelf tank T must be pulled first, ahead of Nib, to wash the chest's guard; two gold hoppers (K, J) both wait for the lake tank W |
| 18 | Fire and Flood | Loot | Remix | Gates, rafts, salamanders, ledges and rubies: a slab dropped to dam the lava, a gate that switches the flood, a raft that carries the hoard (8 pins; audit 2% wins, 6 lessons, 25% top, 69% late losses; hint 105 s with the two hoppers pulled first) |
| 19 | Ember Light | Treasure | Living light | Lights out: salamanders glow like embers, so the guard is the lamp. Use its light to cross, and wash it only last; the rubies glint where the lava has been. Two tanks over the bath: the wash is small and leaves it hot, the second finishes it to stone; the gold bowl sits in the lava's reach |
| 20 | The Fire Idol | Boss | Meter it, save it | The Old Salamander bathes in the Fire Idol's lava bowl, and one crown of water has three jobs. Meter it through the gate (A) to cool the three mouths beside Nib's jaws (shut it once the third steams); drop the flood (F) into the throat, where pin K holds it until it spills through a side pipe onto the vault's lava moat; then K drops the rest on the boss at once (only a column washes it). K before F washes the boss but leaves the moat hot (Nib burns at the very end); a gate left open too long leaves too little to reach the pipe. Nib drops into the pit (the boss can't climb out), so K must come before the last jaw. Gold on the third jaw, under the third mouth in the hall, in the hall and in the vault: every coin is needed |

## 3. The Desert Tomb

**Redesigned (Oct 31, 2026).** A pharaoh's tomb under the dunes: warm sandstone, painted walls of animal gods, sealed burial chambers, and the old fire channels the builders fed from the volcano's vents (so lava, rafts, rubies and salamanders come along from Chapter 2). The mood is hushed and close: low ceilings, green air in the domes, doors that grind shut. Chapter 2 was too easy because each pin had one job you could read from the board. The tomb's two new ideas are chosen so that most pins do two things at once, and the obvious reading of the board is wrong:

- **Pressure plates and stone doors** (the new ground). A carved sun-disc plate in the floor holds its door open while enough weight sits on it: Nib, a guard, water, gold, stone, a boulder, a raft or a slab. Some doors work the other way: they drop shut while their plate is weighed. Nib's own step is a pull, and the gold he needs is weight he takes away. A barrier that shuts Nib out ends the level as **'sealed'**, never as a silent dead end.
- **Tomb gas and fire** (the new material). Green gas rises instead of falling, pools under ceilings and in domes, and leaves through vents in the roof. Nib can't breathe it (**'gassed'**). A flame (a fire bowl, or any lava) lights all the gas that touches it, and the flash (**'blasted'**) breaks cracked walls, cracks ledges and beats any guard, Nib included. Water puts a fire bowl out for good. So water now has a third job (cool, wash, douse), and lava has a new one: it's a spark.

Dropped from the old plan (Oct 31, 2026): sand ramps, chain pins and the fennec escort. At most two new mechanics per chapter, and the ones that stayed make every pin do more. The design doc's chain pins move to a later chapter or out (see the open questions in [inkpin-ch3-engine.md](inkpin-ch3-engine.md)).

| | Chapter 2, the Volcano Shrine | Chapter 3, the Desert Tomb |
|---|---|---|
| **Ground** | Crumbling ledges: routes go one way | **Plates and doors:** where Nib stands opens or shuts a door. The weight you need is often the thing you came for |
| **Material** | Rafts, rubies, lava as a builder | **Tomb gas:** falls up. A pin *under* a pocket frees it, not the one above. Water rising in a room squeezes gas out of its dome |
| **Fire** | Lava burns | **Fire bowls and blasts:** a flame lights the gas, and the blast is a tool (cracked walls, ledges) and a danger. Water douses a bowl; lava is a spark you don't want in the wrong room |
| **Guards** | Salamander (fireproof), armadillo (armoured) | **The rain frog:** a round little desert frog that puffs up in gas and floats on it, out of reach. It drops where the gas leaves: into water (washed), onto a plate (weight), onto Nib (inked). Salamanders and armadillos still patrol the fire channels: fireproof isn't blastproof. Boss: **the Tomb Guardian**, an old toad in a painted coffin who puffs gas at Nib on a beat |
| **Pin** | The gate pin (how much) | No new pin. Gates come back to meter water onto a plate and gas into a flue |
| **Puzzle types** | How much, which way, build it, ferry it | **Weigh it** (what holds the plate, and for how long), **which way is up** (gas), **light it or douse it**, **where the frog lands** |

Chapter 3 shares chapter 2's row of the curve (5–7 pins; win ≤ 20% / ≤ 10%; lessons ≥ 4 / ≥ 5; top ≤ 45%; late losses ≥ 50%; stuck ≤ 10%) and all four reading checks. Level 21 is the breather but still at the row, 28 is the hardest normal level, and 30 is the peak. Level 26 is the chapter's one level where a single pin does two jobs.

**Rules** (on top of round 3's rules and the kit's):
1. A level's signature is plates or gas and fire. Chapter 1–2 mechanics come in as layers: at most two per level, and each must have a job in the puzzle.
2. Every door or cracked wall between Nib and the chest carries `seals`, so a wrong order ends 'sealed', not 'stuck'.
3. No level asks Nib to outrun gas. Gas is released only where Nib isn't, and its route is visible: domes, flues and vents painted as such.
4. A plate under Nib's route is a pull. Script his walks with `'@x'` steps, as with Chapter 2's ledges.
5. No empty floor. Every stretch of floor holds a plate, a pit, a pour's landing, a guard or a fire bowl's gutter, and the walk between stages is at most ~300 px. Rooms are stacked or nested, not strung out.
6. Decorative wall torches stay out of the gas's reach (the lab warns). In this ruin, every fire the gas can touch is a real fire bowl.
7. Bonus gold (from level 23): alcoves reached with the small jump from a body the level parks on a plate (the boulder, the slab, the barge), so the weight is also a step.
8. Each trick below lives only in the levels it lists.

| Trick | Levels |
|---|---|
| The gold you need is the weight: taking it off the plate shuts the door | 21, 26 |
| A body as the weight: a boulder, slab, frog or raft on a plate | 21, 23, 24, 28 |
| A leaking plate: water runs off through its grate, so the door shuts by itself a few seconds later | 21, 26 |
| Water squeezes gas: a rising pool pushes the gas out of its dome | 22 |
| Vent first: open the roof vent before you free the gas, or it pools where Nib must go | 22, 27 |
| Douse one fire, keep the other: one gated tank and two bowls | 23, 29 |
| Lava as the wrong spark | 23, 25, 30 |
| The blast drops a ledge: its slab lands on a plate, or blocks the way | 23, 27, 28 |
| Frogs drop where the gas leaves | 24, 28 |
| Gold opens the next chamber | 25 |
| One plate, two doors (one opens as the other shuts) | 26, 27 |
| One pin, two jobs: a lid with gold above it and gas below | 26 |
| Gas glows, fire is the light | 29 |
| Light the breath under the lid | 30 |

| # | Name | Goal | Mechanics | Puzzle |
|---|---|---|---|---|
| 21 | The Sealed Door | Treasure | Plates and doors (new); a boulder, lava, water, an armadillo | The vault door rises only while its sunken plate is weighed down, and Nib can't stand on it and also walk through. The gold hopper over the plate (C) is the nearest pull and the trap: its coins open the door at once, but Nib must take them, and with the plate bare the door drops behind him ('sealed', after he has walked and collected). Drop the boulder (B, high on the far side) into the plate's pit first. That opens the door on the vault's armadillo, so the tank (W) comes next: it cools the lava moat Nib must cross, and its overflow runs through the open door and washes the guard. The tank first (as left to right does) cools the moat too, but its water pools in the pit, opens the door until it leaks away through the grate, and lets the armadillo out alive ('inked', late). Five pins with Nib's shelf pin (S) and the vault hopper (V), whose gold must wait until the flood has passed or it's swept down the grate |
| 22 | Bad Air | Treasure | Tomb gas (new): rises, pools in domes, leaves by roof vents; a plate, water | A pocket of gas sleeps in the crypt's dome, over the floor Nib must cross, and the vault door beyond opens only while the crypt's floor plate is under water. Flooding the crypt (W) is the obvious pull and loses late: the rising water squeezes the gas out under the dome's lip and up the stair to Nib ('gassed'). So the gas goes out first, up through the gallery above: the gallery's roof vent (T) before the dome's chimney pin (V), or it pools under the gallery ceiling round the gold (G), and Nib walks into it to collect. Five pins with Nib's shelf pin (S). Things fall and gas rises, so the pin that frees the gas is the one at the top of its dome, and the order runs up the board while Nib's route runs down |
| 23 | The Blasting Chamber | Treasure | Fire bowls and blasts (new), cracked walls; gas; a gate; lava; a ledge | Only a blast breaks the cracked wall to the chest: lead the crypt's gas (G) up its flue to the fire bowl beside the wall. On the way it passes a second bowl under Nib's stair, which would light it beside him ('blasted'). So the tank's gate (W) douses that bowl first and is pushed back in when its steam shows. Left open, the overflow runs down the gutter and drowns the wall's bowl too, and the gas drifts out harmlessly ('sealed'). The lava vat (L) is the tempting spark, but now it lights the gas in the crypt, far from the wall. It's needed last, poured into the broken wall's sill and cooled by the rest of the tank into Nib's step up. The blast also cracks the ledge the gold sits on, whose slab lands on the vault plate and opens the gold's door (6 pins with S and the gold door's hopper) |
| 24 | The Puff Frog | Clear | The rain frog (new guard); gas; a plate; water; a cracked wall | Two rain frogs float puffed up in the hall's gas dome, out of reach, and a third paces by the chest. Vent the dome's left chimney (A) first: the frog over the plate deflates and drops onto it, and its weight opens the sluice. The cistern (W) then runs through to wash it and the floor frog, and fills the pool under the dome's right half. The right chimney (B) goes last, and that frog drops into the pool. The fire bowl's cover (F) is the tempting pull: a blast takes both floating frogs at once, but it also breaks the cracked bar that walls the cistern, its water runs to the drain, and the floor frog is left alive (late). B first drops its frog on the dry floor beside Nib ('inked') |
| 25 | The Burial Gold | Loot | Blasts, cracked walls, plates and doors; a gate on the gas; lava | Gold lies sealed in three burial chambers behind cracked bars, with one gas well at the foot of a shared flue and the fire bowl at its head. A door on a plate shuts each chamber's branch of the flue. Each chamber's gold, blasted free, falls onto the plate that opens the next branch, so the order is set by where the gold lands, and it starts with the middle chamber, not the nearest or the first room. The well's lid is a gate (G): let out one puff per blast and push it back in when the board shows the gas at the bowl. Let the whole well out at once and it all burns in one blast, so the chambers still behind shut doors keep their gold for good ('sealed', the target out of reach). The lava channel under the bottom chamber is the tempting spark (L): it lights the gas low, breaks the bottom chamber first, and drops its gold into the lava ('melted', the target lost) |
| 26 | The Weighing Room | Treasure | One plate, two doors (an inverse door); the single pin with two jobs; gas; a fire bowl; a salamander; water | The pan of the tomb's great scale is a plate with two doors. Weighed, it opens the gallery door to the chest and drops the crypt door shut; bare, the reverse. One pin (P) is both the floor of a gold hopper and the lid of a gas well below it: one pull drops the gold onto the pan (gallery open, crypt shut) and sends the gas up into the shut crypt. There the fire bowl burns it and the blast takes the crypt's salamander, so Nib can then lift the gold off the pan, walk into the opened crypt for its rubies, and weigh the pan again with the tank (W). Weighing the pan first with W, the obvious reading, looks right through two stages: the water's overflow douses the crypt's bowl, and when the leaking pan lifts, the crypt door rises on unburnt gas ('gassed', late) |
| 27 | The Deep Shaft | Treasure | Tall: two screens; gas up a shaft; crumbling ledges (ch2); an inverse door; lava and water | A shaft two screens tall: the chest at the top, a gas well at the bottom beside Nib, the roof vent (V) shut. Nib shelters in an alcove whose door drops shut while he stands on its plate (`'@x'`), while the gas (G) rises past him and out through the vent. The vent must already be open, or the gas pools under the roof over the chest. The way up is one-way crumbling ledges and a stair of lava (L) cooled by the tank (W). Lava poured while gas is still in the shaft lights the whole column: the blast cracks every ledge above, and the first slab lands on the alcove's plate and seals Nib in ('sealed'). The obvious first pull, the well beside Nib, gasses him before he's in the alcove |
| 28 | The Sun Barge | Treasure | Remix: plates, gas, the rain frog, a fire bowl, a pumice raft, a gate, a ledge | The tomb's sun barge (a pumice raft) floats in a canal over the vault's plate. Drain the canal through its gate (W) and the barge settles on the plate, and the barge with the gold on its deck is the weight that holds the vault door open while Nib walks through. Before that, the rain frog floating in the gas over the canal must come down into the water (vent V while the canal is full), and the gold hopper (C) must drop onto the barge while it's at the berth. Drained first, the frog lands on the dry barge beside the gold and inks Nib when he boards (late); the gate left open drains the berth too, and the barge settles short of the plate. The fire bowl's cover (F) is the short cut that tempts: the blast takes the frog, but it cracks Nib's gangway ledge, whose slab drops into the gate's slot and jams it ('sealed' behind a full canal). 7 pins |
| 29 | Lamp in the Tomb | Treasure | Lights out: gas glows green; fire bowls are the light; a gate; a ledge | Lights out: only the fire bowls and Nib's lamp light the tomb, and the gas glows faintly green, so you see where it is, not where it will go. Pocket A must burn at the lower bowl, to break the cracked floor into the treasury below, but only after Nib has walked off the ledge above it, or the flash reaches him. Pocket B must reach no fire on its way to the roof vent, so the upper bowl, which is the gallery's only light, must be doused first with a short tap of the gate (W). Poured long, the same water runs on down and puts out the lower bowl that A needs. Douse the upper bowl and the gallery goes dark: B is read by its glow alone |
| 30 | The Tomb Guardian | Boss | The Old Toad: gas breath on a beat; its coffin lid on cracked bars; a fire bowl; an inverse door; lava | The Tomb Guardian, an old toad in a painted coffin, puffs a cloud of gas at Nib every few seconds (its throat swells first), and the cloud rises to the roof. Its coffin lid hangs above it on cracked bars: light its breath under the lid and the blast breaks the bars, the lid falls, and the toad is shut in. First shelter Nib behind the inverse door, by weighing its plate with the gold hopper, so Nib needn't stand on it. Next douse the bowl by his shelf (W), or the next puff lights beside him. Then uncover the bowl under the lid (F) once a puff has pooled there. The lava vat (L) is the obvious spark: it lights the breath at the toad's mouth, too low to reach the bars, and the flash runs along the roof to Nib's shelf ('blasted') |

## 4. The Frozen Monastery

**New ground: ice floors.** Nib slides until something stops him: a wall, an ice block or a pin still in, so pins become stoppers. Frozen pools are floors to walk on. **Material:** ice (frost freezes still water into blocks; lava melts them). **Blot:** the Frost Blot (frozen solid, so water does nothing until it's thawed). **Pin:** the lock pin (a falling key opens it).

| # | Name | Goal | What happens |
|---|---|---|---|
| 31 | The Bell Court | Treasure | Ice floors: pull pins in the order that stops Nib's slide by the chest, not past it |
| 32 | Frost | Treasure | Frost freezes the pool into a block that slides into the gap and becomes Nib's floor |
| 33 | Thaw | Treasure | Lava melts the ice wall but also the floor; pick which melts first |
| 34 | Frost Blot | Clear | Thaw the Frost Blot with a little lava, then wash it away |
| 35 | The Monks' Treasury | Loot | The coins slide on ice too; sweep the room in one long slide to catch them |
| 36 | The Key | Treasure | A lock pin: drop the key down the right shaft to open it |
| 37 | The Icefall | Treasure | Two screens of icy slopes and frozen pools; slide down from ledge to ledge |
| 38 | The Snow Monkey | Escort | Remix: free a snow monkey frozen into the ice, without melting the floor under Nib |
| 39 | Candle Hall | Treasure | Lights out: candles melt the ice near them, and the dark ice is still slippery |
| 40 | The Ice Wyrm | Boss | The Wyrm freezes every pool on its breath; pull between breaths |

## 5. The Alchemist's Ruin

**New ground: wooden scaffolds** that acid eats, so Nib drops down through holes you open (routes go down, one way). **Material:** acid (eats wood, stone, Blots and Nib; water dilutes it). **Blot:** the Sponge Blot (soaks up water and grows; only acid or lava shrinks it). **Pin:** the spring pin (snaps back in after 2 seconds).

| # | Name | Goal | What happens |
|---|---|---|---|
| 41 | The Fallen Tower | Treasure | Scaffolds and trapdoors: Nib can drop down but never climb back, so go down in the right order |
| 42 | Green Drops | Treasure | Acid eats the wooden floor under the chest and drops it to Nib |
| 43 | Dilute | Treasure | Thin the acid with water until it's safe for Nib to wade through |
| 44 | Sponge Blot | Clear | The Sponge Blot drinks the water and grows; shrink it with acid |
| 45 | The Gold Flasks | Loot | Acid can't eat gold: let it cut channels for the coins to run to Nib |
| 46 | Spring Loaded | Treasure | A spring pin lets only a short pour through, just enough for the job |
| 47 | The Tower Stair | Treasure | Two screens: climb up while the acid you release eats the stair behind you |
| 48 | The Owl | Escort | Remix: free the alchemist's owl from a cage of wood, without the acid reaching it |
| 49 | Glow Flasks | Treasure | Lights out: only the bubbling flasks glow |
| 50 | The Cauldron Blot | Boss | It boils over in waves of three colours; send each wave the material it fears |

## 6. The Clockwork Citadel

**New ground: lifts and trapdoors** moved by weight and pins, never by timers. Nib rides a lift; his own weight sends it down, and water or coins in the other bucket bring it up. **Material:** mechanisms (water wheels, scales, counterweights). **Blot:** the Clockwork Blot (marches on a beat). **Pin:** the turn pin (a platform swings a quarter turn).

| # | Name | Goal | What happens |
|---|---|---|---|
| 51 | The Gatehouse | Treasure | A counterweight lift: fill its other bucket with water to lift Nib to the chest |
| 52 | The Water Wheel | Treasure | Water turning the wheel opens the gate, for as long as it flows |
| 53 | Balance | Treasure | Scales: put just enough weight on one pan to raise Nib on the other |
| 54 | Clockwork Blot | Clear | It marches on a beat; drop a boulder where it will be |
| 55 | The Mint | Loot | Coins ride a wheel of buckets up to Nib's level, and a wrong pull spills them |
| 56 | Quarter Turn | Treasure | A turn pin swings a platform and tips everything on it, Nib included if he's standing there |
| 57 | The Great Shaft | Treasure | Two screens of lifts; each one needs the right weight |
| 58 | The Brass Bird | Escort | Remix: free a wind-up bird from a gearbox cage, then ride out together |
| 59 | Night Shift | Treasure | Lights out: lamps on the lifts light the shaft as they move |
| 60 | The Pendulum | Boss | A giant pendulum swings through the shaft; pull on the right swing |

## 7. The Lost City in the Canopy

**New ground: vines you grow and leaf platforms** that bend down under weight (Nib, water or coins) and spring back. **Material:** seeds (water grows vines into bridges and ladders; fire burns them). **Blot:** the Thorn Blot (water and boulders bounce off; only fire works). **Pin:** the weight pin (pulls itself once enough weight piles on its plate).

| # | Name | Goal | What happens |
|---|---|---|---|
| 61 | The Treetop Gate | Treasure | Leaf platforms: Nib's weight lowers a leaf to the next branch; a pour of water lowers it further |
| 62 | Green Shoots | Treasure | Water a seed and it grows into a ladder up to the chest |
| 63 | Burn the Bridge | Treasure | Grow one vine to cross, then burn it so the Blot can't follow |
| 64 | Thorn Blot | Clear | Only fire ends a Thorn Blot, and fire also burns your vines |
| 65 | The Canopy Coffers | Loot | Gold rains through the branches; catch it on leaves that bend toward Nib |
| 66 | Heavy | Treasure | A weight pin pops out by itself once enough coins land on its plate |
| 67 | The Great Tree | Treasure | Two screens: grow a ladder up the trunk, one watering at a time |
| 68 | The Tree Frog | Escort | Remix: free a tree frog from a thorn cage, without burning its branch |
| 69 | Fireflies | Treasure | Lights out: fireflies light the room and scatter from water |
| 70 | The Snapweed | Boss | A giant plant that eats Blots; wash every Blot into its mouth before it turns to Nib |

## 8. The Sea Cave of the Pirate King

**New ground: tides and floating barrels.** Sea-gate pins raise or lower the water in a room, and Nib floats up with it to reach high decks; barrels float as rafts. **Material:** bombs and powder kegs. **Blot:** the Shell Blot (only a blast cracks it). **Pin:** the fuse pin (burns away when a flame reaches it; water puts the fuse out).

| # | Name | Goal | What happens |
|---|---|---|---|
| 71 | Low Tide | Treasure | Open the sea gate, the cave floods, and Nib floats up to the deck where the chest is |
| 72 | Powder | Treasure | A bomb's blast breaks the wall and pushes everything, including the coins |
| 73 | The Wreck | Treasure | Douse one fuse and light another to blow the right hole in the hull |
| 74 | Shell Blot | Clear | Only a blast cracks a Shell Blot; get the bomb to it, not to Nib |
| 75 | The Pirate King's Chest | Loot | Barrels of gold float in on the tide; break them where Nib can gather the coins |
| 76 | Slow Fuse | Treasure | A fuse pin burns away when the flame reaches it, unless the water gets there first |
| 77 | The Mast | Treasure | Two screens up a sunken mast: raise the tide room by room to float Nib to the crow's nest |
| 78 | The Parrot | Escort | Remix: free the Pirate King's parrot from its cage on a sinking deck |
| 79 | Lantern Below Decks | Treasure | Lights out: lit by a swinging lantern and the sparks of fuses |
| 80 | The Kraken Blot | Boss | Its tentacles push pins back in; blast the tentacles first |

## 9. The Cloud Fortress

**New ground: wind.** Fans, switched by pins, push Nib sideways and carry him over a gap while they blow. **Material:** balloons and wind (balloons lift, fans blow grains and gas sideways). **Blot:** the Bat Blot (flies over gaps; only falling water or a blast brings it down). **Pin:** the balloon pin.

| # | Name | Goal | What happens |
|---|---|---|---|
| 81 | The Windy Wall | Treasure | A fan carries Nib over the gap while it blows; pull the pin that stops it once he's over |
| 82 | Up and Away | Treasure | A balloon lifts a crate (or Nib) to the ledge above |
| 83 | Crosswind | Treasure | The fan blows the water sideways into the room the Blot is in |
| 84 | Bat Blot | Clear | The Bat Blot flies over the gap; drop the water on it as it passes |
| 85 | The Sky Vault | Loot | Fans blow the pouring gold away from the edge of the fortress and toward Nib |
| 86 | Tied Down | Treasure | A balloon pin: pull it and the balloon lifts the cage it's tied to |
| 87 | The Tower Above the Clouds | Treasure | Two screens up, from balloon to balloon |
| 88 | The Mountain Goat | Escort | Remix: free a mountain goat from a tower cage and float it down |
| 89 | Night Sky | Treasure | Lights out: lightning flashes show the room for an instant |
| 90 | The Thunderhead | Boss | Its lightning strikes the tallest metal thing on its beat; lead it with keys and coins |

## 10. The Dragon's Hoard

**New ground: all of it.** Each level remixes two earlier ruins on the way down to the hoard. **Material:** everything. **Blot:** every Blot. **Pin:** every pin.

| # | Name | Goal | What happens |
|---|---|---|---|
| 91 | The Last Page | Treasure | The Atlas page opens the mountain door: vines, ledges and lifts |
| 92 | Fire and Ice | Treasure | Volcano and Monastery: lava, ice floors and crumbling ledges |
| 93 | Powder and Gas | Treasure | Tomb and Sea Cave: blasts, tides and plates |
| 94 | The Ink Guard | Clear | One of every Blot, each needing its own material |
| 95 | The Hoard | Loot | The biggest pour of gold in the game, through every kind of room |
| 96 | Every Pin | Treasure | Gate, chain, lock, spring, turn, weight, fuse and balloon pins in one puzzle |
| 97 | The Long Climb | Treasure | Three screens tall: up through every kind of ground |
| 98 | The Atlas Friends | Escort | Remix: free all the friends from earlier chapters, who were caught again |
| 99 | Dragon's Breath | Treasure | Lights out: only the dragon's distant fire lights the vault |
| 100 | The Ink Dragon | Boss | Three screens tall: it breathes fire down the vault on a rhythm as Nib climbs to the hoard |

## What each ruin needs built

| Ruin | New engine work |
|---|---|
| 1 | Vines to climb, seeds that grow vines, floating crates, boulders, the drain, dark levels, wide and tall levels, the boss (built) |
| 2 | Crumbling ledges and slabs, gate pins, pumice rafts, fire rubies, the salamander (fireproof) and armadillo, the Clear goal, basalt art |
| 3 | Pressure plates and stone doors (inverse doors, the 'sealed' loss), tomb gas (rises, roof vents, 'gassed'), fire bowls and blasts (cracked walls, ledges cracked by a blast, 'blasted'), the rain frog (floats on gas), the Tomb Guardian's gas breath, sandstone art. Contract: [inkpin-ch3-engine.md](inkpin-ch3-engine.md). Sand, chain pins and Escort dropped (Oct 31, 2026) |
| 4 | Ice floors and sliding, ice blocks, frost, keys and lock pins |
| 5 | Wooden platforms, acid, spring pins |
| 6 | Lifts, scales, water wheels, trapdoors, turn pins |
| 7 | Bending leaves, fire, weight pins (seeds are built in ruin 1; here they grow sideways and bridge gaps) |
| 8 | Sea gates and tides, bombs and fuses, fuse pins (floating crates are built in ruin 1; barrels add rolling) |
| 9 | Fans, balloons, flying Blots, balloon pins |
| 10 | Three-screen levels |
