# InkPin Chapter 3 engine contract (the Desert Tomb)

For the one Opus engine agent (step 2 of [agent-orchestration.md](agent-orchestration.md)). The levels this serves are in [inkpin-levels.md](inkpin-levels.md#3-the-desert-tomb). Build the sim, measure it, write the numbers into [inkpin-level-kit.md](inkpin-level-kit.md), and keep Chapters 1–2 passing. No content agent starts until this is done.

**Two new mechanics, nothing else:** (A) pressure plates and stone doors, (B) tomb gas and fire. Two creatures ride on them: the rain frog (a guard) and the Tomb Guardian (the boss). Sand, chain pins and Escort are out of scope.

**Scope and order.** Work top to bottom. If the budget runs short, stop after item 9 and leave 10–12 to a second pass: the content agents can start levels 21–29 with items 1–9, and only level 30 needs item 10. Art is placeholder only (flat shapes in the right colours and sizes, so levels can be read in the browser). The painterly sandstone, gas and frog art is a separate art pass.

**Hard limits for every item:**
- ≤ 700 grains per level, counting the boss's breath cap
- deterministic: same level, same orders, same result
- 120 steps/s
- no change to how water, lava, coins, stone, boulders, rafts, rubies, ledges, gates or guards behave on boards without the new parts. Every Chapter 1–2 test passes unchanged, and the ch2 levels' lab lines (win share, lessons, obvious orders) print the same as before the pass.

---

## 1. Plumbing

- `Ruin` gains `'tomb'`. `GuardAnimal` gains `'frog'` (the rain frog) and `'toad'` (the boss only). `CH3` goes in `src/level/common.ts`. Levels live in `src/level/ch3/`.
- `LossCause` gains `'gassed' | 'blasted' | 'sealed'`. `BlotEnd` gains `'blasted'`. Each gets a loss line and a placeholder pose:
  - gassed: Nib coughing, green-faced
  - blasted: soot-faced, hat smoking
  - sealed: Nib knocking on the shut door, then sitting down with a sigh
- New `WorldEvent`s: `plateDown, plateUp, doorOpen, doorShut, ignite, blast, wallBroken, doused, frogPuff, frogDrop, breath`.
- All new state goes in `save()`/`load()`: plates, doors, broken walls, bowls, gas grains, burning grains, frog puff state and the boss's breath timer. Hearts wind back through it.
- `test/chapter3.test.ts`, like chapter2's: every grain starts inside the rooms, the fills fit, the budget is ≤ 700 counting `breathMax`, and every cracked wall index is also in `bars`.

## 2. Pressure plates

**Sim.** A new list `plates?: { id, x0, x1, y, need? }[]`. A plate is a carved slab flush with the floor whose top is `y`. It isn't a seg (the floor wall under it carries things). It weighs everything in its zone, x0..x1 by y − 40..y, every step:

| Thing | Weight |
|---|---|
| a water, lava, coin or stone grain whose centre is in the zone | 1 |
| a gas grain | 0 |
| a ruby | 3 |
| Nib, if he's standing in the zone | 30 |
| a guard, if it's standing in the zone (a puffed frog floats, so 0) | 30 |
| the boss | 100 |
| a boulder whose centre is over the span and whose bottom is in the zone | 40 |
| a raft whose centre is over the span and whose bottom is in the zone (its deck cargo counts on its own, by the rows above) | 20 |
| a down slab overlapping at least half the plate's span | 40 |

**Behaviour.** A plate goes *down* when the weight is ≥ `need` (default 25: Nib alone, or 25 grains). It goes *up* once the weight has been < `need` for 30 steps in a row. The hysteresis stops it flickering as a pour lands. It shows: the plate sinks 4 px and its sun glyph lights.

**Interactions:**
- Water on a plate stays only if the plate is in a closed pit. A pit may have a grate (an ordinary `drain` under its lip): water leaks out and the plate goes up by itself (a "leaking plate").
- Lava on a plate weighs the same, and once water sets it, the stone weighs it down for good.
- Coins weigh until Nib collects them, which is the point.
- Gas never weighs.

**Measure for the kit:**
- the weight of 25, 40 and 60 water poured onto a 100-px plate in an open floor (how much stays) and in a pit
- the time from the first grain to plate-down
- how long a plate stays down with 40 water in a pit over a 30-px grate
- where a boulder rolling at walking speed stops in a 100-px pit
- the weight a raft adds when aground, with and without 20 coins on deck

## 3. Stone doors

**Sim.** A new list `doors?: { id, ax, ay, bx, by, t, plate, invert?: boolean }[]`. A door is a capsule seg, like a pin. Open means slid toward its ring end (ax, ay) by its own length, into rock. Usually that's up into the ceiling; a trapdoor slides sideways. A door is open while its plate is down, or while it's up if `invert` is set. A plate may drive several doors; a door has one plate.

**Behaviour:**
- Speeds: it opens at 2 px/step and closes at 1 px/step (an 80-px door: 0.33 s to open, 0.67 s to shut). Both are visible, and neither is a reflex test.
- Closing never crushes. If Nib, a live guard, a boulder or raft, a ruby or a slab is in the door's path, the door stops and waits, then goes on once the path is clear. Grains in the path are pushed to the nearer side (reuse `clearSlot` from gates.ts).
- Opening waits on a pin that's still in its path, as pins block pins. The lab names it like a 'blocked' pin.

**Interactions:** a door is a seg for everything: grains (gas included), creatures, bodies, rubies and slabs. A blast doesn't break doors. A falling slab lands on a shut door's top like on a wall.

**Measure:** open and close times for 60, 80 and 120-px doors; how many grains of a full 180-px water tank pass while a door that opens and shuts again is open for 1 s.

## 4. The 'sealed' loss

The cure for silent dead ends. A new list `seals?: { door?: string; wall?: number; side: 'left' | 'right' | 'up' | 'down' }[]`. Each entry is a barrier between Nib and his goal, and `side` is the goal's side. The level is lost as `'sealed'` when all of these hold:
- every pin is out (or every gate is in its final state)
- the world has been settled for 1 s
- the goal isn't met
- some sealing barrier still stands (a door that isn't open, or a cracked wall that isn't broken)
- Nib is on the far side of it from the goal (compared with the barrier's midpoint)

A Loot level marks the cracked walls of chambers it needs. Test it with a level where a wrong order shuts the vault: it must end 'sealed', never 'stuck' or 'playing'.

## 5. Tomb gas

**Sim.** A new grain kind `GAS = 5`. It's the existing liquid with gravity reversed: `GAS_GRAVITY = −0.035`, `KEEP 0.99`, `FRICTION 0.02`, `MASS 0.4`. A liquid with lower mass rises through a heavier one, so gas bubbles up through water, lava and coins by the existing mass rule. It spreads under ceilings as water spreads on floors: it pools in domes and under pins and ledges, and spills out round a dome's lower lip when pushed. Cap its upward speed at 2.5 px/step.

A gas fill is held from above: for `kind: GAS`, `y1` is the underside of the lid (the pin above it), and rows pack downward from y1 + 8. Fills pre-settle as before.

**Interactions:**
- **Walls, pins, doors, ledges, set stone, bodies:** solid. Gas pools beneath them.
- **Drains:** take gas too. A drain box in a roof is a *vent*, painted as a chimney mouth.
- **Water:** each passes through the other by mass. A rising pool pushes gas up and out of its dome, so the gas spills round the lip when the water reaches it. Gas doesn't hurt water.
- **Lava:** a lava grain touching a gas grain lights it (item 6). The lava itself is unchanged.
- **Coins and rubies:** they fall through gas, and gas rises through a heap, sleeping coins included. Make sure gas can't be trapped forever under a sleeping heap: gas pushing up on a sleeping coin may swap with it without waking the heap. Coins and rubies aren't hurt.
- **Nib:** lost `'gassed'` when ≥ 3 gas grains touch him at once (within NIB_R + GRAIN_R), or any gas touches him for 20 steps in a row. One stray grain brushing past doesn't kill him.
- **Guards:** unharmed. They walk through gas. The frog floats on it (item 8).
- **Settling:** gas resting under a ceiling must count as settled for the bot (it jiggles the way water does on a floor). Check that a gas dome doesn't keep the bot waiting its 8 s cap.

**Measure:**
- rise speed in open air, and through 100 px of water
- time for 100 gas grains to leave by a 40-px roof vent
- rows per dome width (like the kit's fill rule)
- how much rising water it takes to spill a 160-px dome
- the gassed threshold in practice: how close Nib can walk under a resting dome's lip
- how gas behaves under a raft and under a sleeping coin heap

## 6. Fire bowls, ignition and blasts

**Sim:**
- A new list `braziers?: { x, y }[]`: a fire bowl in a wall niche, standing on the floor at y. Its flame is a circle at (x, y − 34) with r 12. It's scenery: Nib, guards and bodies pass in front, and it hurts nobody by itself. It only touches grains.
- `cracked?: number[]` lists the wall indices a blast can break. They must be bars, so the room behind is already open space.

**Behaviour:**
- **Ignition.** A gas grain touching a lit bowl's flame, or a lava grain, starts burning. A burning grain burns for 8 steps, then is gone. From its 2nd step it lights every gas grain within 16 px. So all the gas connected to the spark burns as a fast, visible front (~8 px/step, about 1,000 px/s), and gas cut off by a wall, pin or door doesn't. Don't add a metered rule: as with water and lava, it's all about connection.
- **Blast.** Each burning grain reaches 40 px (BLAST_R), but only along a line not blocked by a wall, pin, door or ledge. The one exception is the cracked bar being tested, which the line may touch. Within reach:
  - A cracked wall breaks: it leaves `segs` and its art goes to rubble (`wallBroken`).
  - An 'up' ledge starts cracking (`CRACK_STEPS`, then falls) as if Nib had stepped off it.
  - Nib is lost `'blasted'`.
  - Any guard goes `'blasted'`: boar, porcupine, salamander, armadillo and frog alike. Fireproof isn't blastproof.
  - The boss is unharmed.
  - Water, lava, coins, stone, rubies, boulders, rafts, plates, doors, pins and bowls are unaffected. There's no impulse, so outcomes stay readable and not fragile.
- **Dousing.** A water grain touching a lit flame puts it out for good. The grain is used up, with steam (`doused`). Lava and coins don't affect a bowl. A doused bowl shows an empty, smoking bowl and lights nothing.
- **Light.** In `dark` levels a lit bowl lights a radius of ~220 px, and a doused bowl none. Burning gas flashes the room for its 8 steps. Gas glows faintly by itself, at ~0.25 of a bowl's light and ~30 px round each grain.

**Measure:**
- the time for a 160-px dome of 120 gas to burn out from one spark
- BLAST_R at the edges: the farthest cracked bar and the farthest Nib a blast reaches
- whether a blast reaches round a corner, which it must not
- how many water grains it takes to douse a bowl from a pour 200 px above it, and how long that takes
- how far a ledge's slab falls after a blast cracks it, including the delay

## 7. Tests for items 2–6 (test/mechanics-ch3.test.ts)

**Plates:**
- Nib, 25 water, a boulder, a raft aground and a slab each hold a door open.
- 10 water doesn't.
- The hysteresis holds through a pour.
- A leaking pit's door shuts again, and you print when.
- Lava cooled to stone on a plate holds it for good.
- Collecting coins off a plate shuts the door.

**Doors:**
- An inverse door shuts while its plate is down.
- A closing door waits for Nib and for a boulder, and pushes grains aside.
- A pin in its path holds it shut.
- A shut door holds back water and gas.

**Sealed:**
- A wrong order ends 'sealed', not 'stuck' or 'playing'.
- No 'sealed' while a pin is still in.

**Gas:**
- It rises and pools under a ceiling, and leaves by a roof vent.
- It bubbles up through a pool, and water poured on it falls through.
- It escapes from under a sleeping coin heap within 2 s.
- It gasses Nib, but a single stray grain doesn't.
- Rising water spills a dome.
- A resting dome counts as settled for the bot.

**Fire:**
- A lava pour into gas lights it.
- A bowl lights gas that reaches it.
- The whole connected pocket burns, and a pocket behind a wall doesn't.
- A doused bowl lights nothing.
- A blast breaks a cracked bar within reach, but not one behind a wall.
- It cracks an up ledge.
- It beats each guard animal, the salamander included, and blasts Nib.
- It leaves coins, rubies, rafts and the boss untouched.

**Save and load:** a round trip mid-blast and mid-door gives the same result as playing straight through.

## 8. The rain frog (guard, `animal: 'frog'`)

**Sim:** a guard (radius 22) with a boar's rules. It's stompable, washes at 260 contacts, burns in lava, is squashed by slabs and boulders, and a blast beats it. It also has a puff state.

**Behaviour:**
- **Puffing up.** When ≥ 6 gas grains are within r + 8, it puffs up (`frogPuff`). It stops walking and rises at up to 0.8 px/step, taking the mean sideways speed of the gas within 40 px. It collides with segs, so it's held under ceilings, pins, ledges and doors, and it rides in its pocket. A puffed frog still inks Nib on touch. Draw it as a round, smiling ball.
- **Deflating.** With < 2 gas grains near for 30 steps, it deflates (`frogDrop`) and falls as a creature (Nib's gravity). It lands:
  - on Nib: inked
  - in water: washes as usual
  - in lava: scorched
  - on a plate: weight 30
  - on a floor: walks and hunts as a boar does

**Measure:**
- rise speed in a gas column
- the delay from the vent opening to the drop, for a 120-gas dome over a 40-px vent
- the drop's sideways drift
- how long a frog dropped 200 px into a pool takes to wash

**Tests:**
- It puffs up in gas, rises and is held under a pin.
- It drops when the gas is vented, and drops when the gas is burnt, though the blast beats it if it's in reach.
- It washes in a pool.
- It weighs a plate down.
- It inks Nib when it lands on him.
- An unpuffed frog walks through thin gas (< 6 grains) without floating.

## 9. Lab and audit changes (what Chapter 2 showed)

Chapter 2 passed its audits and was still too easy, and workers gamed what the lab didn't print. Add to test/lab.test.ts and test/audit.ts. Each prints one line, and the brief's targets refer to them.

1. **Route order** (reading check 4). This is a third obvious order: the pins in the order Nib's hint walk first comes within 150 px (in x, or y on tall levels) of each pin's midpoint. Print how it ends, next to nearest-first and left to right.
2. **Drop-one** (decoys). For each pin, play the solution with that pin's taps left out. If it still wins, the pin is a decoy. Print `decoys: [ids]`; the one allowed trap is the pin no win uses, and drop-one marks it `trap`.
3. **Deepest wrong orders** (reading check 3). From the audit sample, print the three losing orders whose loss came at the latest tap, with tap index, cause and time.
4. **Walk-only time** (empty space). This is the hint's seconds during which Nib walks and nothing else moves (no grain faster than the settle speed, no body, slab or door moving). Print it with its share of the hint time. The brief's target is ≤ 20%, and no single walk-only stretch may be over 3 s (Level 12 had 1,800 px of it).
5. **Stuck and playing.** Print `stuckShare` and a new `playingShare` (the audit's timeouts) separately, and the first five orders of each. The target for both is 0 (they become 'sealed' or a real loss).
6. **Robustness** (`ROBUST=1`). Replay the solution:
   - with the default stops (the chest)
   - with the stops reversed
   - with each `~t` wait at ±25%
   - with each `'@x'` walk at ±40 px

   Print each outcome. A win that only one of them gives is fragile.
7. **Torch check.** Warn if a gas grain comes within 40 px of a decorative `torches` entry during the hint.
8. **New losses.** The audit counts 'gassed', 'blasted' and 'sealed' as lessons like any loss. The grain count printed includes `breathMax`.

Keep each addition cheap: drop-one is N plays, robustness ~8 plays, and the rest read the runs the lab already makes.

---

## 10. The Tomb Guardian (boss, level 30)

**Sim:** a boss guard (`boss: true, animal: 'toad'`, radius 40) that stays in its coffin (it doesn't walk), plus `breath?: { every: number; count: number; max: number }` on the level (defaults 5 s, 24, 120).

**Behaviour:**
- While Nib is within its sight (320 px, any height), it breathes every `every` seconds, on a beat that starts at the first pull. Its throat swells for 1 s first, as a visible tell.
- It breathes out `count` gas grains from its mouth toward Nib (speed ~1.5 px/step, spread ±20°). They then rise like any gas.
- It never has more than `max` breath grains in play; burnt or vented ones free up room.
- Gas and blasts don't hurt it.
- A slab falling ≥ 40 px onto it beats it (the coffin lid shuts it in). Check that the existing squash in world.ts already beats the boss this way. If not, add it, and confirm the Fire Idol (level 20) still passes.

**Measure:** where a puff pools under a 200-px lid 150 px above the mouth, and how long that takes; the lid's fall time after a blast cracks its ledge.

**Tests:**
- It breathes on the beat, holds when Nib is out of sight, and keeps to the cap.
- A lit bowl near the pooled breath cracks the lid's ledge, and the lid beats the boss.
- Lava at its mouth lights the breath there, and the lid stays up.

## 11. Small engine fixes from Chapter 2 (only if Chapter 2's tests and lab lines stay the same)

1. **Churning tanks.** Big deep tanks (Salamander Springs' 360 water) never settle, so the bot waits its 8 s cap at every stop and hint times swell. Let the settle check ignore water grains that have stayed within 12 px of where they were 60 steps ago. Apply it only if the ch2 tests pass unchanged; otherwise write down why in the kit and leave it.
2. **Step-up.** The code says 44 px, but Nib really climbs 60 because of rounded wall caps. Don't change it, as levels are tuned to 60. Correct the comment in the code and keep the kit's numbers.

## 12. Kit update (the last step)

Add a "Chapter 3" block to inkpin-level-kit.md:
- the files (`src/level/ch3/`, `CH3`, ruin `'tomb'`)
- the new LevelDef fields (`plates, doors, seals, braziers, cracked, breath`, and `kind: GAS` fills with `y1` as the lid)
- every number measured above
- the new loss causes
- the lab's new lines and their targets (route order, decoys, deepest wrong, walk-only ≤ 20% and ≤ 3 s per stretch, stuck/playing 0, robust)

Then the "Design around this" bullets for what surprised you. Chapter 3 bans vines, seeds, crates, boars and porcupines, as Chapter 2 did. Report the measured numbers and any rule you had to bend.

---

## Open questions for the user

1. **Chain pins.** They're dropped from Chapter 3 to keep to two new mechanics. Do they move to a later chapter, or out? inkpin-design.md's pin table still lists them for chapter 3.
2. **Escort.** Level 28 is now a Treasure remix, because Escort (a caged friend who follows Nib) isn't built, and it would be a third new mechanic. Should the fennec come back in a later chapter's engine pass?
3. **The rain frog.** It's a real Namib desert frog that puffs up round. It stands in for the design doc's "Puff Blot", and a big old toad is the boss. Is that the right animal, and the right look?
