# InkPin: the levels

All 50 levels at a glance: 5 ruins with 10 levels each. The ruins, materials, Blots, pins and bosses come from [inkpin-design.md](inkpin-design.md); this page says what each level asks. Names and puzzles are drafts: the solver bot decides the final layouts.

## How movement fits in

Nib walks, jumps (about 55 px), climbs a ledge up to about 44 px and swims. Each ruin adds one new kind of ground, taught on its level 1. The rules:

1. **Movement is part of the puzzle, never a reflex test.** Where Nib stands is a choice like which pin to pull: wait in an alcove while the lava passes, stand on a plate to hold a door, float up on the water you let in.
2. **Every level can be finished by simply walking.** No precise jumps and no timed runs. A loss comes from the pin order or where Nib waited, never from a slipped thumb. Bosses act on a beat, but a slow one with a wide window.
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

Levels are numbered straight through the game: chapter 2 is levels 11–20, chapter 5 is 41–50. Every level must meet its row before it ships. The audit (test/audit.ts) and the lab (test/lab.test.ts, `AUDIT=1`) print the numbers.

**Later chapters are deeper, not bigger.** Every level stays 2–3 screens wide (or two tall), at most ~700 grains, 3–5 stages, a hint of about 25–120 s (from the puzzle, never from empty floor to walk), and can be finished by simply walking. Bigger boards are harder to read on a phone, slower to simulate and dearer to build, and they add walking, not thinking.

| Chapters | Levels | Pins | What each level asks | Win share (levels 1–3 / 4–10 of the chapter) | Lessons | Top lesson | Late losses |
|---|---|---|---|---|---|---|---|
| 1 | 1–10 | 4–6 | one new thing, with materials already known | ≤ 35% / ≤ 15% | ≥ 3 / ≥ 4 | ≤ 50% | — |
| 2–3 | 11–30 | 5–7 | the new thing working against a second one | ≤ 20% / ≤ 10% | ≥ 4 / ≥ 5 | ≤ 45% | ≥ 50% |
| 4 | 31–40 | 6–7 | two mechanics interlocked in every stage | ≤ 15% / ≤ 8% | ≥ 5 / ≥ 6 | ≤ 40% | ≥ 60% |
| 5 (the finale) | 41–50 | 6–8 | chain pins, and earlier chapters' mechanics as full stages; gates timed off the board are normal; one level per chapter where a single pin does two jobs | ≤ 10% / ≤ 6% | ≥ 6 | ≤ 40% | ≥ 60% |

The lab's CURVE in test/lab.test.ts has the same four rows (`fromChapter` 1, 2, 4, 5).

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
7. **Kept from round 2:** 2–3 screens wide or two tall, 3–5 stages, 60–90 s, at most ~700 grains, every level can be finished by simply walking, washing a guard at most once per level, the boulder-in-a-drain plug only in levels 3, 5 and 10.

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

**Gate pins and simple walking.** A gate's right moment is always shown by the board, never a stopwatch: "when the moat is stone", "when the basin's lip is wet". The window is at least about 1.5 s wide, and the hint says when to tap. A gate can't be pushed back into Nib, a guard or a body.

**Rules** (round 3's rules carry over: stages depend on each other, at most one gate holding only Nib, a tempting wrong pin from level 4, every wrong order ends in a funny fail, the audit targets, 2–3 screens, 3–5 stages, 60–90 s, at most ~700 grains, simple walking):

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
| 12 | The Pumice Raft | Treasure | Rafts on lava, raft cargo | A lava river between Nib and the chest, and a raft moored upstream in a cave a step above the dock: let the lava pour down to bring the raft into its berth (a raft's width between the step and the post, so it docks flush against the post however the pour sloshes), drop the gold hopper onto it while it is docked (too early or too late and the lava melts it), ride it over, and cool the river from the tank on Nib's shelf only once he's off. The dam also holds Nib on his shelf; a pull before it of the post, the vault door or the tank loses, and the obvious first pull, that tank, is the trap. A lava gutter cuts the vault floor before the chest, and the vault's own water tank (Y) sets it: pulled before Nib reaches the gutter (in the hint, 1.5 s after the door, as he walks in) he crosses on stone; later or never, he walks into the lava (burnt). Hint D, G, M, W, X, Y~1.5, 28.3 s, walk-only 17%; wins with any idle before any pull |
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

- **Pressure plates and stone doors** (the new ground). A carved plate in the floor holds its door open while enough weight sits on it: Nib, a guard, water, gold, stone, a boulder, a raft or a slab. Some doors work the other way: they drop shut while their plate is weighed. Nib's own step is a pull, and the gold he needs is weight he takes away. A barrier that shuts Nib out ends the level as **'sealed'**, never as a silent dead end.
- **Tomb gas and fire** (the new material). Green gas rises instead of falling, pools under ceilings and in domes, and leaves through vents in the roof. Nib can't breathe it (**'gassed'**). A flame (a fire bowl, or any lava) lights all the gas that touches it, and the flash (**'blasted'**) breaks cracked walls, cracks ledges and beats any guard, Nib included. Water puts a fire bowl out for good. So water now has a third job (cool, wash, douse), and lava has a new one: it's a spark.

**How a plate reads.** Every plate is a stone slab set in its floor with a symbol carved and painted into it (ankh, scarab, eye, feather, in the order of `plates`) and weight notches either side that light as weight lands (all lit: it is down, and it sinks). A carved groove runs from it to each door it works, which has the same symbol cut into its face, and a bead of light runs along the groove whenever the plate goes down or up. An inverse door (open while its plate is bare) has its symbol struck through in red. A tap on a plate or a door shakes it and lights its groove, and the first time on a level the HUD says plates open with weight. Nothing on a plate or a door is gold or ringed: only pins are. (Nov 1, 2026: the gold symbol discs read as extra pins, and the sun and moon read as light.) A level may have several plates, each with its own symbol. (The user couldn't tell what level 21's plate and doors were; this is the fix.)

Dropped from the old plan (Oct 31, 2026): sand ramps, chain pins and the fennec escort. At most two new mechanics per chapter, and the ones that stayed make every pin do more. Chain pins move to Chapter 5, and Escort to Chapter 4, where the remix levels first need it (user, Oct 31, 2026).

| | Chapter 2, the Volcano Shrine | Chapter 3, the Desert Tomb |
|---|---|---|
| **Ground** | Crumbling ledges: routes go one way | **Plates and doors:** where Nib stands opens or shuts a door. The weight you need is often the thing you came for |
| **Material** | Rafts, rubies, lava as a builder | **Tomb gas:** falls up. A pin *under* a pocket frees it, not the one above. A closed dome holds its gas: it leaves only upward, through a vent or flue, or by burning |
| **Fire** | Lava burns | **Fire bowls and blasts:** a flame lights the gas, and the blast is a tool (cracked walls, ledges) and a danger. Water douses a bowl; lava is a spark you don't want in the wrong room |
| **Guards** | Salamander (fireproof), armadillo (armoured) | **The rain frog:** a round little desert frog that puffs up in gas and floats on it, out of reach. Vent its dome and it drops under the vent: into water (washed), into a plate's pit (weight), or on the dry floor, where it hops to Nib (inked). Salamanders still patrol the fire channels: fireproof isn't blastproof. Boss: **the Tomb Guardian**, an old toad in a painted coffin who puffs gas at Nib on a beat |
| **Pin** | The gate pin (how much) | No new pin, and no gates: a gate can't meter gas, and a small tank empties through it in half a second |
| **Puzzle types** | How much, which way, build it, ferry it | **Weigh it** (what holds the plate, and for how long), **which way is up** (gas), **light it or douse it**, **where the frog lands** |

Chapter 3 shares chapter 2's row of the curve (5–7 pins; win ≤ 20% / ≤ 10%; lessons ≥ 4 / ≥ 5; top ≤ 45%; late losses ≥ 50%; stuck ≤ 10%) and all four reading checks. Level 21 is the breather but still at the row, 28 is the hardest normal level, and 30 is the peak. Level 26 is the chapter's one level where a single pin does two jobs.

**Rebuilt rows (Nov 1, 2026).** The first drafts of 24–26 and 30 missed their targets because their rows chained timed mechanics the engine can't carry (frogs dropping in order, gas metered by a gate over several puffs, breath drifting to a gap), and every board was too small (620–840 px wide). Levels 21–23 passed because they were built from the kit's tested patterns. The rows below use only those:
- **The building blocks** (kit, "How each mechanic reads on a board"): a plate in a closet Nib can't reach, weighed by a boulder, gold or water in a pit; a door that seals Nib in; gas vented from the top down through a roof vent; a fire bowl at a shelf's tip lighting pooled gas, so the blast breaks a cracked bar or cracks a ledge; a lava step set by water. Chapters 1–2 come in as layers: water, lava, stone, boulders, ledges, rafts, rubies, salamanders.
- **A frog is one clear moment:** vent its dome and it drops under the vent, into a pit or a pool. The toad's breath pools under its lid on Nib's side, as in the kit's boss tests. No timing chains.
- **Full size:** every board ≥ ~1300 px wide (27 is tall: ≥ ~1000 high), 3–5 stages that fill it, no empty floor. Levels 21–23 keep their idea and passing design, with stages added.
- **Pins:** 5–6 on 21–23, 6–7 from 24. Every pin has its own visible effect and its own way to lose, and every win uses it (no decoys). At most one named trap per level, and **a trap must lose wherever it falls in the order**: a vent or a bowl's cover pulled after its gas is gone does nothing, so it would be a decoy. Losses are spread over gassed, sealed, blasted, burnt, melted, drained, inked and stomped.

**Rules** (on top of round 3's rules and the kit's):
1. A level's signature is plates or gas and fire. Chapter 1–2 mechanics come in as layers, and each must have a job in the puzzle.
2. Every door or cracked wall between Nib and the chest carries `seals`, so a wrong order ends 'sealed', not 'stuck'.
3. No level asks Nib to outrun gas. Gas is released only where Nib isn't, and its route is visible: domes, flues and vents painted as such.
4. A plate under Nib's route is a pull. Script his walks with `'@x'` steps, as with Chapter 2's ledges. A plate Nib must not hold sits in a closet or behind a ≥ 66-px step.
5. No empty floor. Every stretch of floor holds a plate, a pit, a pour's landing, a guard or a fire bowl's gutter, and the walk between stages is at most ~300 px. Rooms are stacked or nested, not strung out.
6. Decorative wall torches stay out of the gas's reach (the lab warns). In this ruin, every fire the gas can touch is a real fire bowl.
7. Bonus gold (from level 23): alcoves reached with the small jump from a body the level parks on a plate (the boulder, the lid, the barge), so the weight is also a step.
8. Each trick below lives only in the levels it lists.

| Trick | Levels |
|---|---|
| The gold you need is the weight: taking it off the plate shuts the door | 21, 26 |
| A body as the weight: a boulder, frog, lid or raft on a plate | 21, 24, 27, 28, 30 |
| Open the way up first: a vent or hatch before the gas | 22, 26 |
| Douse one fire, keep the other | 23, 29 |
| Water that douses on its way: the flood must come after the blast | 24, 28, 29, 30 |
| Frogs drop where the gas leaves: into a pit or a pool | 24, 28, 30 |
| Gold opens the next chamber | 25 |
| Lava as the wrong spark: lava by a gas column lights it low | 25, 27 |
| One plate, two doors (one opens as the other shuts) | 26 |
| One pin, two jobs: a lid with gold above it and gas below | 26 |
| The blast cracks a ledge | 27 |
| Rubies before the water, gold after | 28 |
| Gas glows, fire is the light | 29 |
| Light the breath under the lid | 30 |

| # | Name | Goal | Puzzle | Pins and their losses | Patterns |
|---|---|---|---|---|---|
| 21 | The Sealed Door | Treasure | Four stages on 1320 × 620: Nib's ledge over the lava moat, the two-bay closet hung over the moat, the sill under the tank with the vault door D, and the lava dip and the vault with its drain. The closet's whole floor is the ankh plate, with nothing lying over it: the gold bay's slot (plugged by G) sits beside the plate, and the divider stops short of it. Grooves run from it to the two ankh doors it holds up: D and the hatch H in the boulder's shaft. C's gold drips into the bay, piles over the slot and onto the plate's end, and both doors rise. B's boulder drops through the open hatch and becomes the weight for good. W's tank hangs over a 30-px sill in front of D: its flood runs on through the open door, sets the dip and leaves down the vault's drain, and the rest runs back off the sill into the moat and sets it. (A flood dropped onto the lava dug a crater and stalled.) V's hopper hangs over the moat's far end, so its gold lies on Nib's road to the chest. The tempting pull is G right after C: the gold hangs right over Nib's road and both doors are up, but taking it lifts the plate, both doors drop, and the boulder lands on the shut hatch ('sealed'). Hint C, B, W, walk, G, V, walk (26 s) | **C** the hopper's narrow spout: after G its coins drip straight through the slot ('sealed'). **B** the boulder: after G it waits on the shut hatch ('sealed'). **W** the tank over the sill: before C the shut door holds the flood, which runs back off the sill and down the sill's grate, and the dip stays hot ('burnt' on the walk in). **G** the slot's plug: before W its gold falls in the moat ('melted'); before B, 'sealed'. **V** the hopper over the moat's far end: before W its gold falls in the hot moat ('melted'). 5 pins, no trap | Closet plate weighed by gold, then a boulder (1); a door that seals (2); two lava steps set by one tank; a grate and a drain |
| 22 | Bad Air | Treasure | Four stages on 1350 × 600 (built Nov 1, 2026): the cistern F over Nib's ledge, the hall over the gas pit, the low gallery at the top of the stairs, and the vault below it, reached down a shaft and through the ankh door. The ankh plate is the floor of a pit of 140 gas under the slot lid G; straight above it is a narrow 60-px flue with its roof vent V, and the hall's ceiling slopes up from the flue's mouth into the gallery. F's flood (260 water) falls down the flue, through the open slot onto the plate, and the door rises; the pit's overflow runs down a steep culvert under the stairs and comes out under the door onto the vault's shelf and off its edge into the grate, so the vault's gold (K) waits until the flood has gone. Changed from the row: the overflow goes under the door (a culvert), not through it, so the doorway stays dry and a shut-out Nib is sealed cleanly. Hint V, G, walk, F, walk (Nib waits at the top of the stairs while it pours), down the shaft, K, walk: 24.9 s. Audit: win 1%, 14 lessons, top 34%, late 100%, dead ends 0 | **V** the flue's roof vent: after G, 'gassed'. **G** the slot lid: before V, 'gassed' on the stairs. **F** the flood: before G it lands on the lid and runs off to the hall's grate and the culvert ('sealed'). **K** the vault hopper: before F, the overflow sweeps its gold off the shelf into the grate ('drained'). **P** (the trap) the plug in the pit's floor: gas never goes down; it drains the flood, the plate lifts and the door drops ('sealed'). 5 pins | Gas vented top-down (3); a plate in a pit weighed by water, a door that seals (2); a drain |
| 23 | The Blasting Chamber | Treasure (playable; top lesson 47%) | Four stages on ~1300 × 770, laid out wide: the armadillo's gallery where Nib starts (his first gold on the floor, an armadillo in a 70-px pen under tank T), Nib's shelf over the well's mouth with W's small tank under the lava vat's spout and the gold hopper K beside it, the narrow (~190-px) dome running right to the cracked bar, and the vault behind it. T washes the armadillo out and fills the pen so Nib can swim across to S. W douses the near bowl and its water waits on the well's lid; G's gas rises past the dead bowl and lights at the far bowl in its basin 30 px under the roof: the blast breaks the bar. L's lava sets on the waiting water into a stone floor across the mouth, then K drops its gold onto it. The trap X is the cistern over the far bowl: the basin's floor is a plate, and its water drops the vault door (an inverse door, open while the basin is dry), so X loses wherever it falls before S; pulled before G it also puts the far bowl out. Hint W, G, T, walk, L, K, S, walk | **T** the armadillo's tank: Nib's walk before it ends 'pricked'. **W** the tank under the vat: after G, the gas lights low in the mouth ('sealed'). **G** the well's lid: before W, the same. **L** the vat: with no water under it the lava stays hot and brims over ('melted', or 'burnt' under S onto Nib's shelf, 8 px lower than the far floor). **K** the hopper over the mouth: before the stone, its gold lands in the lava ('melted'). **S** Nib's stop at the shelf's end. **X** (the trap) the basin plate shuts the vault door ('sealed'). 7 pins | A guard washed out of a pen; bowl under pooled gas breaks a cracked bar (4); douse one bowl, keep the other; a lava step set by water; a plate that shuts a door (2) |
| 24 | The Puff Frog | Treasure | Built (Nov 1, 2026), ~1340 × 880, every target passes. Five stages: the plate dome over frog 1's pit (right), the cistern and its doorstep grate, the dam's well over Nib's pit and the gallery (with the inverse door E and an overflow pocket past an 18-px lip), and under the gallery the crypt: the frog dome (frog 2, vent B, a 120-px pool whose floor is the plate Q) and the bowl's dome (frog 3, the bowl under the pipe, G's gas pit beside the cracked bar, the lamp T in the roof over G's sloping lid). G's gas pools along the roof to the bowl; the blast takes frog 3 and the bar. A drops frog 1 onto its plate and the sluice D opens; W floods through D into the pit (washing frog 1) and on to the well; U pours it through Nib's pit, along the gallery through E, down the pipe onto the bowl and across the crypt into the pool and the open gas pit; B drops frog 2 into the full pool (washed); S drops Nib into the crypt and he swims the pool and the pit to the gold and the chest. Hint G, A, W, U, B, S, walk (45.7 s) | **T** before G: the oil runs down the lid, through the slot under the bar, onto the gold ('melted'; the left-to-right pull). **B** before the flood: frog 2 lands on the dry Q (a frog weighs 30, water never more than ~19, need 24), E shuts, the dam's water stays in Nib's pit and runs off at the pocket's grate, the pool stays dry; Nib stomps the frog in it and can't climb out ('sealed' on E). **S** before B: through the gas ('gassed', the nearest pull); before the flood, the same dry pool. **A** after W: the flood leaks at the doorstep ('sealed'). **G** after the flood: the bowl is doused, but T after G lights the gas with its falling oil (a second use of the trap). 7 pins, T the trap. Audit: win 2%, lessons 8, top 44% (T:melted), stuck 0%, late 64% | A frog vented onto a plate in a pit (5); a frog's weight shutting an inverse door (new); a frog vented into a pool (5); bowl under pooled gas breaks a cracked bar (4); lava lights gas (kit) |
| 25 | The Burial Gold | Loot | **Built Nov 1, 2026 (in CHAPTER_3).** Four stages on 1300 × 860: three burial chambers in the hall's roof over the sloped middle dome, the gas trench under the hall floor (the vat L beside it, the cistern W under the ankh pit), and the gutter room below with the hoard bin, the basin and Nib's niche. The middle chamber's floor is a cracked bar at the top of the dome's roof. G frees the trench's gas, which runs up to the bowl at the shelf's tip, and the blast breaks the bar. The gold then cascades by itself in about 6 s: the middle gold weighs the ankh pit, which opens the left chamber's floor; that gold weighs the scarab pit, which opens the right chamber, and the hoard drops into bin K. Nib never reaches the plates. L's lava fills the emptied trench, and W's water stands on its stone, runs out of the spillway and down the gutter, and sets the basin's lava. K pours the hoard into the basin, and S lets Nib down on the dry side of the sill under the eye door. Changed from the row: the gap is the trench itself; the stone is lava then water (water first is used up under the lava and never reaches the spillway); P is a gold hopper over the eye closet, not the ankh pit's plug (that one did nothing once its gold had gone). Hint G, L, W, K, S, walk (32 s) | **G** the trench's lid. **L** before G: the lava waits on the lid and the gas lights coming up through it ('sealed'). **W** before L: the basin stays hot and the hoard melts ('melted'). **K** before the basin is set: 'melted'. **S** Nib's floor: out early he lands dry, but walking in before the basin is set burns him ('burnt'). **P** (the trap, "more gold"): its gold weighs the eye closet and the inverse eye door drops between Nib and the hoard ('sealed'), wherever it falls. 6 pins. Audit: win 3%, lessons 9, top 33%, late losses 100%, stuck 0%; nearest first 'sealed', left to right 'melted' | Bowl at a shelf's tip breaks a cracked bar (4); coin plates in pits, doors as chamber floors; an inverse door that seals (2); a lava step set by water |
| 26 | The Weighing Room | Treasure | Four stages on 1370 × 810 (built Nov 1, 2026): the cistern W and its basin with the sluice C, the scale hall (the pan P along its floor, Nib's nook over it on pin S, the gold bin and gas cup on X, K's hopper at the pan's far end), the shaft up to the crypt, and the vault behind the crypt's cracked bar. The pan's grooves run to the vault door A (open while the pan is weighed) and the sluice C (its ankh struck through, open while it's bare). X is the bin's floor and the cup's lid: one pull drops the gold into the pan and sends the gas up the sloped roof and the shaft, through the hatch H into the crypt, where the bowl in its basin by the bar lights it: the blast takes the salamander (penned behind a curb) and breaks the bar. W goes first, while C is open: its water weighs the pan, A rises and C shuts behind it (the rest drains down the basin's grate), and the water keeps the pan down while Nib drops in (S) and swims through the gold. Changed from the row: (1) S is Nib's floor over the pan, not a blast stop: out before W, he weighs the dry pan himself and the water never comes in. (2) H before X is now forced by a cracked nook beside the hatch: gas held under a shut H leaks out of it and the bar stands. W and H stay interchangeable (the salamander dropped through H to make them ordered, but its washing in the pan's thin water wasn't reliable). (3) The trap D is the little cistern over the bowl, not the pan's drain plug: a plug at the pan's end let water out too slowly to lose late, and every audit order with D early but a gold pin last ended stuck. The bowl stands in a basin whose floor is plate Q, and Q holds the chest's inverse door E, so D loses wherever it falls. Hint W, H, S, X, walk, K, walk (19.8 s). **Audit (Nov 1, 2026, after the 'sealed' lull and door-wake engine fixes): win 2%, 6 lessons, top 24%, stuck 0%, playing 0%, late losses 100%; obvious orders (nearest, left to right, route) all lose 'sealed'; no decoys; walk-only 20%, longest 1.7 s — PASS** | **W** the cistern: after X or K, C is shut and the water drains down the basin's grate; the pan lifts when Nib takes the gold ('sealed'). **H** the hatch: after X, the gas leaks out of the cracked nook and the bar stands ('sealed'). **X** two jobs, gold and gas: before W, 'sealed' (the tempting pull). **K** the second hopper: before W, the same weighing ('sealed'). **S** Nib's floor: before W, he weighs the dry pan ('sealed'). **D** (the trap) the little cistern over the bowl: before X it puts the bowl out; any time it fills the bowl's basin Q and the chest's door E drops ('sealed'). 6 pins | A plate in a pit weighed by water, then gold; one plate, two doors (one inverse); a second plate under a fire bowl; bowl in a basin under pooled gas, with a salamander layer |
| 27 | The Deep Shaft | Treasure | Tall: 1060 × 1000 (draft, src/level/ch3/deepShaft.ts). Nib's shelter by the gas well at the foot; one long stair climbs the shaft (2D with no bot jumps: a switchback stair can't be climbed, so one diagonal flight sets the height); the shaft's sloping roof carries the gas up to the fire bowl by the vault's cracked bar. B drops the boulder onto a cracked chute in the roof that rolls it into the eye closet; its plate drops the eye door at the stair's head. G frees the well: the gas runs up under the roof, pools by the bar and lights at the bowl; the bar and the chute break. S, the stone across the shelter's doorway, holds Nib (and any brimming lava) back. X's cistern over the bowl then runs down the stair into the pit; L's vat (90 lava, more than the pit holds) sets on that water into the step out of the pit; K's gold drops onto the stone. Hint B, G, S, X, walk, L, K, walk, walk (26.9 s) | **B** after G: the chute is gone, the boulder drops through the roof and rolls down the stair onto Nib ('crushed') or the eye door stays up ('sealed'). **X** before G (the tempting first pull): the bowl is doused, the gas pools unlit, the bar stands ('sealed'). **L** before X: the lava brims hot down the stair onto Nib ('burnt'); before G it runs down onto the well's lid and lights the gas low ('sealed'). **K** before L: 'melted'. **S**: holds Nib back only (the one allowed); the row's 'blasted' for S early didn't work: the well has emptied up the long roof before the gas lights, so the fire never runs back down to the shelter. Crumbling ledges and the vat's window in the shaft were dropped. 6 pins, no trap | Bowl under a pool by a cracked bar; a blast cracks a boulder's chute; closet plate weighed by a boulder; a lava step set by water |
| 28 | The Sun Barge | Treasure | Remix, the hardest normal level (redesigned Nov 2, 2026, round 4; every target passes). Four stages on 1310 × 720: the frog's bell over the canal, the berth, the bowl crypt, and the vault. A rain frog floats puffed in a low gas bell over the canal's shallow west shelf, on Nib's way; V vents it. The bell's west lip is the ankh door E, Nib's gangway door. U, the dam, lets the canal into the berth (88 px across, so the sun barge, a pumice raft, docks within 8 px); the surge spills down the east pipe and sets the vault's lava gutter, and leaks out of 14-px slots at the berth's feet, the west one onto the crypt's bowl. C's gold on the docked barge makes the weight on the ankh plate that opens both ankh doors (E and the trapdoor D in the canal's bed). G lights the crypt's gas at the bowl and the blast breaks the cracked bar, so it must come before the leak douses the bowl. K drops the vault's gold into the gutter; S is the post standing in the gutter across Nib's way, its head the plug of a little cistern that also sets the gutter. Hint V, G, U, C~6, K, S, @440, @1215 (37.1 s, walk-only 16%, ROBUST 8/8). Audit: win 8%, lessons 9, top 33% (K:melted), late 84%, stuck/playing 0, blocked 0; both obvious orders end 'sealed' | **V** the frog's bell: after U the frog lands on the dry shelf and waits on Nib's way ('inked'); never pulled, it inks him as he walks under the bell. **G** the crypt's gas pit: after U, the leak douses the bowl and the bar stands ('sealed'). **U** the dam: before G it douses the bowl, before V it leaves the frog dry. **C** the barge's gold: before U it falls into the empty berth and out of the grate under the hopper; the doors stay shut ('sealed'). **K** the vault's gold: before both U and S it falls into the hot gutter ('melted'). **S** the gutter post and cistern plug: Nib's stop, and the other way to set the gutter. 6 pins, no trap | A frog vented into a pool (5); bowl at a shelf's tip breaks a cracked bar (4); a body as the weight (the raft and its gold) on a plate in a pit, doors that seal (2); a lava step set by water from either of two sources; Chapter 2's raft ferry |
| 29 | Lamp in the Tomb | Treasure | Lights out. Three floors on ~1300 × 1000, dark but for the two fire bowls, the treasury's lava and Nib's lamp; the gas glows faint green. Top floor: Nib waits in the gallery, lit by the upper bowl, which stands beside the flue from gas pit B, and B's lid is also the trapdoor down; W douses that bowl first, the gallery goes dark, and you read B's gas by its glow as it rises up the flue and out. Middle floor: Nib crosses a crumbling ledge over pocket A's dome, and only once it has fallen behind him does A send its gas to the lower bowl, whose blast breaks the cracked floor into the treasury. Bottom floor: the lava is the treasury's light; C's cistern sets it only after the blast (before, its water lies on the cracked floor and douses the lower bowl), and then K drops the gold onto the stone. The tempting pull is T, the lava vat that "lights the treasury": its 60 lava grains run onto the raised floor ('burnt' wherever it is pulled before K, 'melted' after K). B's pit holds 150 gas, so Nib waits in the gallery for it to clear. Hint (26.8 s; audit: win 2%, lessons 5, top 42%, stuck 0%, late losses 85%, PASS) W, B, walk down and across the ledge, A, C, K, walk | **W** douses the upper bowl: after B, the gas lights round Nib in the gallery ('blasted'). **B** the gas pit's lid and the trapdoor: before W, the same; Nib dropping in before its gas has gone, 'gassed'. **A** pocket A's lid: while Nib is still on the ledge, 'blasted'. **C** the treasury cistern: before A, 'sealed' (above); never, Nib drops into the lava ('burnt'). **K** the treasury hopper: before C, its gold falls into hot lava ('melted'). **T** (the trap): 'burnt' before K, 'melted' after it. **C** before **A**: 'sealed' once every pin is used. 6 pins | Douse one bowl, keep the other; bowl at a shelf's tip breaks a cracked floor (4); gas leaves upward through a flue; a lava step set by water; Chapter 2's crumbling ledges |
| 30 | The Tomb Guardian | Boss | **Rebuilt Nov 1, 2026 (draft; re-audited Nov 1 after the boss seal-timeout fix).** Four stages on 1300 × 460: Nib's antechamber over the lava moat (M's tank, C's hopper, Nib on S with a post at its end), the nook with its low roof, the coffin hall (the toad under the stone lid; the bowl's cover F flush with the lid's left end, the bowl on a shelf above it; W's tank over both; a thick cracked lip between the nook and the coffin), and the vault (the ankh door over a sill, the frog's 20-px dip under the frog dome, the chest floor). The toad breathes every 5 s from the first pull while Nib is in sight (320 px); the breath leans toward him and pools under the lid and F. M sets the moat, C drops the gold on the bridge, F opens the cover, S drops Nib, and he walks into the nook: the next breath rises past the bowl and lights, the blast cracks the lid and breaks the lip, and the lid stomps the toad and lands on the ankh plate. W's flood fills the coffin, lid and water raise the ankh door, and the overflow fills the dip; U drops the frog into it (washed). Nib drops into the coffin, swims out under the door and takes the chest (`clear`: toad and frog). `breath: { every: 5, count: 24, max: 48 }`: one breath fits under the lid, the second spills under the lip into the nook's roof. Changed from the row: (1) the lip is a thick cracked bar (t 22) so Nib can't stand within 76 px of the lit gas, and it is the seal Nib must get past; (2) the plate is the ankh (the art's first symbol); (3) W's 'wash the toad' sometimes does wash it, but the lid never falls ('sealed'). Hint M, C, F, S, walk, W~5, U, walk (60 s). Audit: win 2%, lessons 8, top 36%, late 71%, stuck 0%, playing 0% (the seal timeout now ends the floating-toad orders as 'sealed'), 0 grains outside the rooms (433/700 with the breath cap). Hint 60.2 s. Robust 7/8 still: the eager player who walks into the coffin on the default stops is crushed under the falling lid (the other 7 shifted-timing variants win). Obvious orders all lose 'burnt'; no decoys; walk-only 1% | **M** the moat tank: S before it, 'burnt'. **C** the gold: before M, 'melted'. **S** Nib's floor: before M, 'burnt' (the nearest, leftmost and route-first pin). **F** the cover: left in past the second breath, the spill gasses Nib in the nook ('gassed'); any time before then works. **W** the flood: before the blast it douses the bowl; the lip and the door stand ('sealed'). **U** the frog's vent: before W the frog drops into the dry dip, hops out onto the chest floor and inks Nib ('inked'). 6 pins, no trap | The kit's boss tests (the breath pooled on Nib's side, the bowl at the shelf's tip, the blast cracks the lid, the slab beats the toad); a plate weighed by a slab and water, a door and a cracked lip that seal (2); a frog vented into a pool (5); a lava step set by water |

## 4. The Frozen Monastery

**New ground: ice floors.** This is also where the **Escort** goal is built: level 38, the Snow Monkey, is the first Escort. Nib slides until something stops him: a wall, an ice block or a pin still in, so pins become stoppers. Frozen pools are floors to walk on. **Material:** ice (frost freezes still water into blocks; lava melts them). **Blot:** the Frost Blot (frozen solid, so water does nothing until it's thawed). **Pin:** the lock pin (a falling key opens it).

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


## 5. The Dragon's Hoard

**New ground: the deep vault.** Each level remixes two or three earlier ruins (chapters 1–4) as full stages on the way down to the hoard, and every level stays 2–3 screens wide or two tall: deeper, not bigger, with no empty floor. **Material:** everything from chapters 1–4. **Blot:** every Blot from chapters 1–4. **Pin:** the **chain pin**, the only new one. Two pins sit on one chain: pull either and both come out. A chain links rooms far apart, so one pull changes two places. It is introduced gradually: one chain in level 41, a chain against a wrong pin in 42, a chain that must be pulled early in 43, and from 45 on chains work beside the gate and lock pins.

| # | Name | Goal | What happens |
|---|---|---|---|
| 41 | The Last Page | Treasure | The Atlas page opens the mountain door. One chain pin: pulling it opens a gate below and lets a tank pour into the seeds above, so the vines grow while Nib is still down there |
| 42 | Fire and Ice | Treasure | Volcano and Monastery: lava, ice floors and crumbling ledges. A chain ties the lava vat's pin to the frost tank's, so the pin that melts one path freezes another |
| 43 | Powder and Plates | Treasure | Tomb: blasts, gas, plates and doors. A chain links the roof vent to the door Nib shelters behind; pull it too early and he is sealed in, too late and he is gassed |
| 44 | The Ink Guard | Clear | One of every guard from chapters 1–4 (boar, porcupine, salamander, armadillo, rain frog and the monastery's guard), each beaten by its own material. One chain pin sends a single pour to two guards in different rooms |
| 45 | The Hoard | Loot | The biggest pour of gold in the game, through every kind of room. Two hoppers far apart hang on one chain, so one pull starts both streams |
| 46 | Chain Gang | Treasure | Gate, lock and chain pins in one puzzle. Two chains cross each other's rooms, so the order of pulls matters more than which pin is which |
| 47 | The Long Climb | Treasure | Two screens tall: up through every kind of ground, with a chain pin at the bottom that changes a ledge at the top |
| 48 | The Atlas Friends | Escort | Remix: free the snow monkey from level 38, caught again by the dragon's keepers, and a fennec kit caged beside it (a desert fox cub, the Desert Tomb's lost friend). Each cage hangs on a chain pin, so freeing one can drop or lift the other's floor |
| 49 | Dragon's Breath | Treasure | Lights out: only the dragon's distant fire lights the vault |
| 50 | The Ink Dragon | Boss | Two screens tall: it breathes fire down the vault on a rhythm as Nib climbs to the hoard; a chain pin lets one pull put out the fire in two places |

## Idea bank (cut Oct 31, 2026)

The user's new default for level games is 10 free + 40 paid, so ruins 5–9 of the old plan were cut. Their ideas wait here for a sequel or a future game.

- **The Alchemist's Ruin:** wooden scaffolds, acid, Sponge Blot, spring pins. Best idea: the Gold Flasks, where acid can't eat gold, so it cuts channels for the coins to run to Nib.
- **The Clockwork Citadel:** lifts, scales, water wheels, trapdoors, turn pins. Best idea: the Great Shaft, two screens of lifts where each one needs the right weight.
- **The Lost City in the Canopy:** bending leaves, seeds that grow sideways, fire, weight pins. Best idea: Heavy, a weight pin that pops out by itself once enough coins land on its plate.
- **The Sea Cave of the Pirate King:** tides, barrels, bombs, fuse pins. Best idea: the Mast, where you raise the tide room by room to float Nib up a sunken mast.
- **The Cloud Fortress:** fans, wind, balloons, flying Blots, balloon pins. Best idea: Tied Down, a balloon pin that lifts the cage it is tied to.

## What each ruin needs built

| Ruin | New engine work |
|---|---|
| 1 | Vines to climb, seeds that grow vines, floating crates, boulders, the drain, dark levels, wide and tall levels, the boss (built) |
| 2 | Crumbling ledges and slabs, gate pins, pumice rafts, fire rubies, the salamander (fireproof) and armadillo, the Clear goal, basalt art |
| 3 | Pressure plates and stone doors (inverse doors, the 'sealed' loss), tomb gas (rises, roof vents, 'gassed'), fire bowls and blasts (cracked walls, ledges cracked by a blast, 'blasted'), the rain frog (floats on gas), the Tomb Guardian's gas breath, sandstone art. Contract: [inkpin-ch3-engine.md](inkpin-ch3-engine.md). Sand dropped; chain pins moved to ruin 5 and Escort to ruin 4 (Oct 31, 2026) |
| 4 | Ice floors and sliding, ice blocks, frost, keys and lock pins, the Escort goal (a freed animal friend who follows Nib; first used by level 38) |
| 5 | Chain pins (two pins on one chain: pull either and both come out; a chain links rooms far apart, so one pull changes two places), the dragon boss, the Escort follow-up (level 48 frees friends from earlier chapters, who were caught again) |
