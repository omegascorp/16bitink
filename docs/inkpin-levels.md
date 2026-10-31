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
| 11 | Black Steps | Treasure | Crumbling ledges | Meet the place, with only Chapter 1's materials: Nib picks his way down a cliff of ledges that fall behind him. One ledge's slab must land in the channel below (to hold back the water the gold rides on), and the ledge the gold crosses must still be up when it pours |
| 12 | The Pumice Raft | Treasure | Rafts on lava | A lava river between Nib and the chest, and a raft moored upstream: let the lava run to carry the raft to Nib's bank, ride it over, and cool the river behind him only once he's off |
| 13 | The Stone Bridge | Treasure | Pour your own floor | Nib needs a floor across a gap: lead a tank of lava into it and cool it there, while the raft ferries the gold over the rest of the lava, which must stay hot to carry it |
| 14 | Salamander Springs | Clear | The fireproof guard | Salamanders bathe in lava pools, and lava doesn't trouble them. Wash every one away with one tank that also has to cool the pool between Nib and the last one; the obvious pull, lava on a salamander, just gives it a warm bath |
| 15 | The Ruby Hoard | Loot | Rubies through the fire | Fire rubies and gold in one hopper: split them, rubies straight through the lava river, gold onto a raft and round; an armadillo guards the landing |
| 16 | Just Enough | Treasure | The gate pin | Cut the water once the moat is stone, or the rest washes the gold into the drain; the same tank's second job is the far pool, so push the gate back in and send the rest down the other channel |
| 17 | The Caldera | Treasure | Two screens down | A crater two screens deep on one-way ledges: pour a stair of stone for the way down (no vines here), and choose which ledges fall where |
| 18 | Fire and Flood | Loot | Remix | Gates, rafts, salamanders, ledges and rubies: a slab dropped to dam the lava, a gate that switches the flood, a raft that carries the hoard |
| 19 | Ember Light | Treasure | Living light | Lights out: salamanders glow like embers, so the guard is the lamp. Use its light to cross, and wash it only last; the rubies glint where the lava has been |
| 20 | The Fire Idol | Boss | Meter it, save it | The Old Salamander bathes in the Fire Idol's lava bowl, fed by three mouths; meter the water through gates to cool each mouth, and keep enough of the flood for the boss |

## 3. The Desert Tomb

**New ground: pressure plates and sand.** A plate opens a stone door while something heavy sits on it: Nib, a coin pile, sand or a boulder. Sand pours and heaps into ramps Nib can walk up. **Material:** tomb gas (rises, Nib can't breathe it; a torch makes it a blast that breaks cracked walls). **Blot:** the Puff Blot (floats on gas). **Pin:** chain pins.

| # | Name | Goal | What happens |
|---|---|---|---|
| 21 | The Sealed Door | Treasure | Nib can hold the door open by standing on its plate, but then he can't go through it. Pour sand on the plate instead |
| 22 | Bad Air | Treasure | Gas rises up the shaft; vent it up the chimney, away from Nib's path |
| 23 | The Blasting Chamber | Treasure | Lead the gas to a torch and the blast breaks the cracked wall to the chest |
| 24 | Puff Blot | Clear | The Puff Blot rides the gas; vent the gas and it sinks into the water |
| 25 | The Burial Gold | Loot | Gold sealed in three chambers; blast them open in an order that doesn't bury the coins |
| 26 | Chained | Treasure | Chain pins: pulling one also pulls its twin across the room |
| 27 | The Deep Shaft | Treasure | Two screens tall: build sand ramps with each pour to climb up to the chest |
| 28 | The Fennec | Escort | Remix: free a fennec fox from a cage with a plate-lock door, and bring it out |
| 29 | Lamp in the Tomb | Treasure | Lights out: the gas glows faintly green, so you see where it is, not where it goes |
| 30 | The Tomb Guardian | Boss | The Guardian breathes gas at Nib; light its breath to bring its own wall down on it |

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
| 3 | Pressure plates and doors, sand, gas, blasts, cracked walls, chain pins |
| 4 | Ice floors and sliding, ice blocks, frost, keys and lock pins |
| 5 | Wooden platforms, acid, spring pins |
| 6 | Lifts, scales, water wheels, trapdoors, turn pins |
| 7 | Bending leaves, fire, weight pins (seeds are built in ruin 1; here they grow sideways and bridge gaps) |
| 8 | Sea gates and tides, bombs and fuses, fuse pins (floating crates are built in ruin 1; barrels add rolling) |
| 9 | Fans, balloons, flying Blots, balloon pins |
| 10 | Three-screen levels |
