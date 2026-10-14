# InkMine Game — Design Spec

Oct 13, 2026 · @Hayk

## Overview

A 2D side-view mining game drawn in ballpoint pen. You're a lone prospector with an energy drill, a lander and a patched-up suit. You fly from planet to planet for a mining guild and dig deep cross-sections of alien ground for the materials each job asks for. Every trip down is push-your-luck: how deep you go and how full a bag you carry before the drill's energy cell runs dry. Every trip back fills the ship's cargo, and each new planet's materials are printed into the gear that carries you further. There's no money: what you dig is what you build with.

The third 16bit.ink game, after InkFish and InkCrab. It keeps their shape: 100 levels on 10 worlds of 10, the first world free, a $4.99 one-time unlock, blue ink for the world, red for danger and highlighter for pickups.

Design pillars:

1. **Pocket Mine simple.** Every block you drill costs energy, and firedamp in the rock turns a few smart hits into a chain reaction. A few numbers to watch (energy, fuel, hearts) and a small bag of slots; dig by pushing into the ground. Anything that needs a manual gets cut.
2. **Every trip counts, every planet levels you up.** Ore you bring back is yours, even on a failed level. Everything is printed from resources, never bought: you find a part's blueprint and dig up the planet's materials to print it, and it always opens something new.
3. **Big ground, readable ground.** Maps are many screens deep. How hard a block is, what's worth digging and what will hurt you all read at a glance from the ink.
4. **Each planet is a new idea.** Every planet has its own biome, native creatures, signature material and one mechanic that changes how you dig.

## Inspiration

Full notes in [inkmine-research.md](inkmine-research.md). What InkMine takes:

| Game | Taken into InkMine |
| --- | --- |
| **Pocket Mine 1–3** | One meter spent per hit as the only run limit (here the drill's energy), so every hit is a decision; explosions that chain (here firedamp and old charges, each there for a reason); a clear goal per mine |
| **SteamWorld Dig 2** | Areas gated by tools (each planet's gear); hand-made treasure vaults inside a bigger map; death costs carried ore, never cash |
| **Motherload / Super Motherload** | Cargo-limited round trips and the "turn back now?" call; underground outposts (relay posts); a bonus for mining a whole vein |
| **Mr. Driller** | Air with refill capsules (Brine); falling blocks as threat and tool (Talus); colour-linked groups (Prism) |
| **Deep Rock Galactic** | A main objective plus optional side objectives for bonus rewards (contracts) |
| **No Man's Sky** | Slot inventories on the suit and the ship, stacks of one resource per slot, and every part crafted from resources |
| **Terraria** | Tool tier as a readable gate: "you need a better drill for this rock" |
| **Spelunky** | A guaranteed main path, with optional treasure walled off behind harder rock |
| **Gold Miner** | A clear pass/fail goal per level; a shop between levels paid with earned cash |
| **A Game About Digging a Hole** | Four or five upgrade lines are enough |

Avoided, because players complain about them in these games: energy to start a run, paid revives, random card hands and paid reshuffles, real-time timers, exponential upgrade prices, losing cash on death, and monsters crowding out the mining (Pocket Mine 3).

## Camera and world

Side view, an ant-farm cross-section of one dig site, like InkCrab's beach but much bigger and mostly underground. The surface strip at the top holds the lander and the planet's sky; everything below is ground to dig.

Maps are far bigger than Pocket Mine's narrow shaft and grow through the game. Tiles are 32 px, so a 1280 × 720 view shows about 40 × 22 tiles.

| Where | Size (tiles, wide × deep) | Screens |
| --- | --- | --- |
| Planet 1, level 1 | 48 × 64 | ~1 × 3 |
| Planet 1, level 9 | 96 × 160 | ~2.5 × 7 |
| Planet 5, level 9 | 150 × 280 | ~4 × 13 |
| Planet 10, level 9 | 200 × 400 | 5 × 18 |

The ground is layered in strata that get harder and richer with depth, broken up by caves, pockets of loose rock, the planet's own features (aquifers, lava, crystal clusters) and a few set pieces: alien ruins, a crashed probe, a creature nest. The camera follows the prospector; a survey sheet in the pause menu shows the parts of the map you've seen.

## Core loop

A level is a series of trips from the lander down and back.

1. **Land.** The intro card shows the mission and two optional contracts.
2. **Dig down.** Push into the ground to dig. Pick up ore as you break it out.
3. **Watch the gauges.** Every block costs energy; flying costs jetpack fuel; the bag fills; creatures and hazards cost hearts.
4. **Turn back.** When the bag is full, the cell is nearly flat or the fuel to fly home is running low, head back to the lander or a relay post.
5. **Bank.** The bag empties into the ship's cargo (as much as fits), the cell is recharged and the tank refuelled. Ore in the cargo is safe whatever happens next.
6. **Finish the mission,** then lift off from the lander. The result card shows what went into the cargo, what the guild took, what it and the clients paid (in resources), and any blueprint you found.
7. **Print gear and lander modules** on the ship, sort the cargo, then pick the next landing site.

Trips get longer as the maps grow, which is what relay posts and the mobility upgrades are for.

## Digging and blocks

The prospector carries an **energy drill**: a futuristic mining tool powered by an energy cell, not a pickaxe. Push against a block to drill it: walking into a wall drills sideways, holding down while standing drills down, holding up drills up. No separate dig button. Holding keeps it going, a block every fraction of a second.

**Every block costs energy**, as every tap costs pick in Pocket Mine. Walking, jumping and looking around are free, so there's no clock: you can stop and plan. When the cell is flat the drill stops and you have to go back to recharge.

**Each planet's ground comes in three grades**, and what a grade costs depends on your drill's mark (Mk):

| Ground on planet N | Inked as | Drill Mk N−1 (what you land with) | Drill Mk N (built there) | Drill Mk N+1 (the next planet's) |
| --- | --- | --- | --- | --- |
| Soil | Light stipple | 2 energy | 1 | 1 |
| Stone | Cross-hatch | Too hard | 2 | 1 |
| Deep rock | Dense cross-hatch, heavy outline | Too hard | Too hard | 2 |
| Bedrock, ruin walls | Solid ink | Never | Never | Never |
| Loose rock, boulders (from planet 2) | Round outlines | 1; falls when undermined | 1 | 1 |

- **Landing on a new planet, your drill is a step behind.** Soil costs double and stone won't budge, so early levels follow soil and caves. Building that planet's drill (level 4) opens up the stone, which is the "now I can go anywhere" moment.
- **Deep rock waits for the next planet's drill.** It guards vaults and rich veins, so old planets are worth a revisit with better gear. The main path never needs it.
- **Too hard** blocks make the drill skid with a whine and a "too hard" note, and cost nothing. Blocks your drill can't break yet are drawn with a heavier outline, so you can see it before you try.
- **A flat cell** can't drill until it's recharged at the lander or a relay. Walk back up your own tunnels, or recall: the lander winches you up, but the bag is dropped and lost. You can never get stuck for good.
- **No fall damage.**
- **Diagonals cut staircases:** each step is one dig of two blocks, the diagonal one and the one joining it to you (overhead going up, ahead going down), costing both. Stop anywhere and the tunnel is still joined up, never a hole touching it only at a corner. Walking and the one-tile step-up carry you along it, and a drop onto the next stair is quick. Where open tiles do touch only at a corner (caves, blasts), the ground is drawn with the two openings joined, so it reads as one passage; InkCrab draws its sand the same way.
- **Ore sits in the rock** as a highlighter-marked vein. Breaking an ore block drops one piece of ore that flies into your bag. Breaking a whole vein in one go pays a **vein bonus** when banked.

### Firedamp and old charges

Anything that blows is in the rock for a reason; there are no crates lying about. (Changed after the first playtest, Oct 13, 2026: bomb crates in the ground made no sense.) Blasts break soil and stone without spending energy and set off whatever else they reach, so a few well-placed hits can still clear half a cave.

| What | Where it comes from | Effect |
| --- | --- | --- |
| Firedamp | Natural: pockets of methane trapped in the rock, the old hazard of coal and graphite mines. The level builder scatters them in little clusters, mostly by graphite seams | Drilling one opens it: it hisses and bursts 0.7 s later, breaking a 3 × 3 area |
| Old charge | An earlier crew drilled it into the rock and never fired it. Only where a level places one, for a reason (below) | A tap on its detonator arms it; 1.4 s later it breaks a 3 × 3 area |
| Line charge | Charges on detonating cord along a seam, left the same way | Breaks its whole row, four tiles each way |
| Each planet's own | Planet 3 on | Tied to the planet: spore pockets on Mycel, magma blisters on Ember, fire ice on Rime, and so on |

- **Drawn into the rock, not on it.** Firedamp is part of the ground drawing: an irregular hollow washed pale, with faint red wisps of gas and pressure cracks running off it. Old charges are steel canisters lying in drilled bore holes, with hazard bands, a detonator lamp and a lead wire off along the seam. Neither falls; both keep the rock's grade around them.
- **Red where it can hurt you:** the wisps, the hazard bands, the lamp (it blinks slowly while armed, fast once lit), and the outline of the blast area while anything is lit.
- **Missions and contracts use the charges.** *Demolition:* fire the old charges to blast open a cave-in and reach what's behind it. *Careful hands* (contract): get the ore out without setting off any charge, because the old relay or a fossil sits in the blast.
- **Your own charges:** the gadget is a blasting charge you place, then step clear.

## The suit: energy, fuel, bag, hearts

Four numbers, all on the HUD.

| | Starts at | What it does | Refills |
| --- | --- | --- | --- |
| **Energy** | 100 | Drilling spends it. At zero you can't drill | Lander, relay posts |
| **Fuel** | 6 s of flight | The jetpack burns it while you hold jump in the air. At zero you can only jump | Lander, relay posts |
| **Bag** | 4 slots, stacks of 10 | A slot inventory (below). A piece flies in only if its ore has a stack with room or there's an empty slot; otherwise it stays where it dropped | The lander moves it into the cargo |
| **Hearts** | 3 | A creature, a falling boulder or a hazard costs one, then 2 s of grace | Only by finishing the level |

Mission items (a core sample, a probe's black box, a blueprint, a specimen) go in a separate pouch and never take bag space.

**Losing the last heart fails the level.** You keep everything in the cargo and lose what's in the bag. That keeps a bad run from feeling wasted, the way a Pocket Mine run always pays out.

### Inventories: the bag and the cargo

Ore is kept as resources in two slot inventories, No Man's Sky style (decided with @Hayk on Oct 14, 2026; it replaces the earlier "the bag is a count" and selling ore for credits). Each slot holds a stack of one ore, so a varied haul fills the bag faster than a single vein (`logic/inventory.ts`).

| | Slots | Stack | Grows with |
| --- | --- | --- | --- |
| Suit bag | 4 | 10 | The Pack: 2 more slots a mark |
| Ship cargo | 16 | 50 | The Cargo hold module: 6 more slots a level |

- **At the lander** the bag empties into the cargo automatically, the rarest ore first; whatever doesn't fit stays in the bag ("cargo hold full").
- **On the ship** both grids are shown. Tap a stack to pick it up, tap a slot in either grid to put it there: into an empty slot, onto the same ore (as much as fits), or swapping with a different ore. A picked-up stack can be split in half or jettisoned (tap twice). "Stow the bag" moves everything that fits into the cargo.
- **The bag carries over** between landings: what didn't fit comes back down with you.
- **The recall winch** keeps a share of every stack (half, then all).

No air meter in normal play. Air appears only on Brine, as that planet's mechanic.

## Getting around

Big maps need a way back up. Mobility grows through the game:

| From | Move |
| --- | --- |
| Start | Walk, jump one tile, climb a one-tile step automatically |
| Start | Jetpack: hold jump in the air to fly. It burns fuel from its own tank, refilled at the lander and relays, so the way home is part of the push-your-luck. You can drill while hovering: up through a roof, or into a wall. Better Jetpack marks hold more fuel and climb faster |
| Any time | Ladder gadget: a placed ladder you climb, for when the tank is dry |

Changed after the first playtest (Oct 13, 2026): a careless shaft was a trap with only ladders and recall to get out. Wall climbing was tried, then swapped for the jetpack at @Hayk's request; the jetpack moved from planet 5's gear to the starter set.

**Relay posts.** Bigger maps have relay posts built into the rock at depth. Touch one to switch it on. From then on it banks your bag, recharges your cell and has a lift tube straight to the lander and to every other relay you've switched on. The relay gadget lets you build your own anywhere you stand. Relays turn a long map into a set of shorter trips without making the deep part free. Each map also hides a vault or two, small hand-made treasure rooms walled in by harder rock, off the main path.

## Ore and materials

Ore is real minerals, so the field guide can teach real facts, as the fish and shell guides do.

- **Common ore** is shared across planets and climbs in value with depth: native copper, galena (lead), hematite (iron), silver, gold, platinum.
- **Gems** are rare, single blocks: quartz, garnet, beryl, ruby, sapphire, diamond.
- **Each planet has a signature material,** the one the guild sent you for. It shows up in that planet's missions and nowhere else, and it's the main ingredient of that planet's gear.
- **Kept, never sold.** Banked ore stays in the ship's cargo as a resource to print with. The guild takes only what a mission asks for; extra signature material is yours.
- **Junk that looks like treasure:** pyrite (fool's gold) on Talus is in no recipe; it only fills slots until you jettison it. A small joke and an early lesson about reading veins.

Every ore type has its own highlighter colour and its own glyph shape in the rock (nuggets, crystals, bands), so it reads without colour.

## Missions and contracts

**The mission** is the level's goal; finishing it and lifting off wins the level. Mission items count once they're banked.

| Mission | Goal |
| --- | --- |
| Haul | Bank a set number of pieces of ore, or a set number of one ore |
| Hunt | Bank N pieces of the planet's signature material |
| Core sample | Reach a marked depth, drill the core and bring it up |
| Salvage | Find something lost (a probe, a cargo pod, an old miner's pick) and bring it up |
| Survey | Plant survey stakes at marked spots spread across the map |
| Clear | Destroy the creature nests |
| Demolition | Fire an earlier crew's charges to blast open a cave-in and reach what's behind it |
| The giant | Defeat the planet's giant (level 10 of every planet) |

**Contracts** are optional side jobs from other clients, shown on the intro card under the mission. They pay resources, often the rare ones that are hard to dig yet (deep quartz and silver on Graphite), and are what makes a level worth replaying.

- **Planet 1:** each level has two fixed contracts, so new players learn what they are.
- **From planet 2:** the contracts board offers three and you pick two before landing. From planet 5 it offers four. Each level's board is fixed, so everyone sees the same offers. Picking is a real choice: a bounty suits a map rich in firedamp, a deep record suits a good cell.
- **Each contract pays once.** Replaying a level to take the ones you skipped pays them too.

| Contract | Example |
| --- | --- |
| Order | Bank 8 silver |
| Specimen | Bring back the fossil hidden somewhere on the map |
| Bounty | Defeat 5 dust ticks |
| Deep record | Reach 180 m |
| Clean job | Lose no hearts |
| Careful hands | Set off none of the old charges (something you need sits in their blast) |
| Rush | Lift off under par time |

**Ink blots (stars):** one for the mission and one for each of the two contracts you took, so three per level. A level's blots are the mission plus every contract ever paid there, so replaying for a skipped contract adds its blot.

**What pays when.** Banked ore is always yours, even on a failed landing. The mission's pay, the contracts and a mission's blueprint come only with a won lift-off. A reward that doesn't fit in the cargo waits with the guild and arrives once there's room. A blueprint banked from the pouch is yours whatever happens next. Lifting off before the mission is done ("leave early", press lift-off twice) counts as a landing that wasn't won. Contracts about how a landing went (clean job, careful hands, rush) are judged at lift-off and show struck through in red the moment they're lost. This replaces InkFish and InkCrab's par-time blot. A mining game is about exploring a big map, and a clock would fight that; "Rush" is there as a contract for players who want it.

## Gear: blueprints, materials, the fabricator

Every planet has its own set of gear, the best you can have there, and you build it from that planet's materials. Gear is unlocked, never just bought: the point is the moment a new piece arrives and the planet opens up.

**Six pieces**, each with a mark per planet (Mk 1 on Graphite up to Mk 10 on Cardia). You start with a Mk 0 starter set.

| Piece | What a new mark gives |
| --- | --- |
| Drill | Breaks the planet's stone (table above), costs less on everything, hits creatures harder |
| Cell | More energy per trip |
| Pack | Two more bag slots |
| Suit | One more heart on alternate marks; fewer hearts lost to the planet's hazard |
| Helmet | Wider lamp light; from Mk 2, a scanner ping that shows ore through rock |
| Jetpack | A bigger fuel tank and a faster climb |

**Printing a piece takes two things** (resources come from the cargo first, then the bag):

1. **Its blueprint.** Found or earned on the planet, never bought. When you pick one up, the HUD flashes and the result card shows it as a pencil drawing with its recipe.
2. **The planet's materials:** its signature material plus one of its ores or gems, for example *Cell Mk 1: 4 graphite, 3 quartz*. Hunting the planet for them is the point of being there.

Graphite's Mk 1 recipes (`logic/blueprints.ts`), each graphite plus an ore the levels that hand out the blueprint are rich in:

| Piece | Materials | Gives (`logic/marks.ts`) |
| --- | --- | --- |
| Cell | 4 graphite, 6 copper | Energy 100 → 140 |
| Pack | 3 graphite, 8 copper | Bag 4 → 6 slots |
| Drill | 6 graphite, 4 galena | Breaks Graphite's stone |
| Helmet | 4 graphite, 2 quartz | Lamp 4.5 → 6 tiles |
| Jetpack | 5 graphite, 3 silver | Fuel 6 → 9 s, faster climb |
| Suit | 8 graphite, 3 quartz | Hearts 3 → 4 |

Every mark is an even step (energy +40, bag +2 slots, fuel +3 s, lamp +1.5 tiles, a heart every odd mark), never an exponential curve.

A mission that hands out a blueprint names it and its recipe on the intro card, so its materials get banked on the same landing: level 4's card says the drill needs 6 graphite and 4 galena, and its map is rich in both along the way down.

**Where blueprints come from** on every planet:

| Piece | Source | Needed for the main path? |
| --- | --- | --- |
| Cell | Reward for the slot 2 mission (the hunt) | No, but it's the first quick win |
| Drill | Reward for the slot 4 mission (the core sample) | Yes: from slot 5 on the main path runs through stone |
| Pack, Helmet, Jetpack, Suit | One in the vault of each of slots 3, 5, 7 and 9 | No: they make the planet easier and the optional riches reachable |

**The good moment:** you find a blueprint, see in pencil what it needs, go and dig it up, and the fabricator inks the part in on the ship's sheet. Every new piece changes something you can feel on the very next landing: stone you couldn't break, a vault you couldn't reach, a cave too dark to read.

**Rules that keep it from turning into grind:**

- **The main path never needs more than its missions give.** The drill's blueprint and enough of its materials come from levels before the ones that need it, and mission maps carry spare signature material.
- **Gear never gets worse.** A new mark beats the old one at everything; there are no trade-offs to puzzle over.
- **Planet gear is given, not built.** The thing a planet's mechanic needs (rebreather, thermal lance, coolant foam) is handed over in its first level.
- **No money at all.** Everything is printed from resources. Replaying a level yields its ore again, but contracts pay only once.

## Gadgets

Up to three gadget slots, filled on the ship before landing and printed from resources. One button uses the selected gadget.

| Gadget | From | Use |
| --- | --- | --- |
| Ladder | Planet 1 | Place a climbable ladder |
| Blasting charge | Planet 2 | A charge you set in the rock: place it, then step clear |
| Relay | Planet 3 | Build your own relay post |
| Flare | Planet 9 | A light you throw that burns for a while |

Planet gear like coolant foam and the tuning fork works the same way but is free and doesn't take a slot.

## Creatures

Every planet has its own native aliens, invented but built from a few behaviours, so a new planet is new drawings more than new code.

| Behaviour | Example |
| --- | --- |
| Walker | Paces a tunnel floor, turns at walls |
| Burrower | Moves through soil, leaving a tunnel; shows as wriggling hatch before it breaks out |
| Dropper | Clings to a cave ceiling, drops when you pass under |
| Flyer | Drifts through open caves toward you |
| Spitter | Sits still, shoots on a visible wind-up |
| Mimic | Looks like a boulder or an ore glint until you're close |

- **Few and readable.** Pocket Mine 3's fans complained that monsters crowded out the mining, so a map has only a handful, and none at all in Graphite's first two levels. A creature notices you within about 4 tiles and shows it with a red "!" before it moves.
- **Red ink means it can hurt you.** Harmless grazers are drawn in blue.
- **The drill fights.** Drilling into a creature hits it (and costs energy, like any block); small ones take one hit, bigger ones two to four. A better drill hits harder. Blasts, falling boulders and the planet's hazards hurt creatures too, so the terrain is a weapon.
- **Bounties:** creatures drop nothing to sell. Their only reward is a bounty contract.
- **The giant** of each planet is its level 10 boss: one big native creature with a readable attack pattern, fought in an arena cave.

## The ten planets

Each planet adds one mechanic and keeps everything before it.

| # | Planet | Biome | New mechanic | Given gear | Creatures | Giant | Signature material |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Graphite | Grey cratered moon | The basics: drilling, energy, ore, firedamp, lander, relays, blueprints | Starter set, ladders | Dust ticks (walker), lead worms (burrower) | The Grinder, a giant rock worm | Graphite, pencil lead |
| 2 | Talus | Red mesas and dry gullies | Gravity: loose rock and boulders fall when you dig under them, and crush creatures | Blasting charges | Boulder beetles (mimic), sand skates (burrower) | The Rockslide, which sheds boulders as it walks | Hematite, "blood ore" |
| 3 | Brine | Island crust over a flooded underworld | Water and air: breaking into an aquifer floods the tunnels; you swim, and underwater an air meter drains, refilled by bubble capsules in the rock (Mr. Driller) | Rebreather, relays | Cave lampreys (swimmer), bubble jellies (flyer) | The Leviathan, in an underground sea | Brine pearls |
| 4 | Mycel | Fungal jungle | Growth: fungus slowly grows back over tunnels you dug; cap mushrooms bounce you; spore pockets fill a cave with spores that catch fire from a blast | Spore filter | Puffballs (spitter), snap tendrils (dropper) | The Mother Mycel, a heart you mine your way around | Amber with alien insects in it |
| 5 | Pumice | Light, porous moon | Low gravity: long floaty jumps, slow falls, drifting rubble; a tank of fuel goes much further | To decide (it was the jetpack) | Drift moths (flyer), regolith hoppers (walker) | The Grazer, a floating giant | Helium-3 |
| 6 | Rime | Ice world | Ice: slippery floors, frozen blocks that only the lance melts, meltwater that freezes again behind you | Thermal lance | Frost mites (swarm walker), ice wyrms (burrower) | The Hoarfrost, a giant ice spider | Fire ice (methane clathrate) |
| 7 | Ember | Volcanic world | Lava: flows like water, burns; lava meeting water turns to obsidian | Coolant foam | Magma slugs (leave burning trails), cinder bats (flyer) | The Salamander | Diamonds, in kimberlite pipes |
| 8 | Prism | Crystal caverns | Resonance: hit a crystal and every touching crystal of its colour shatters at once, for one hit: big payouts, flying shards | Tuning fork | Shardlings (can only be hurt while glowing), refractors (spitter, beams bounce off crystal) | The Crystal Queen | Singing quartz |
| 9 | Umbra | The dark side of a tidally locked world | Darkness: only your lamp, flares and glowing minerals give light; creatures hunt in the dark and flee light | Flares | Lurkers (strike from the dark), glow lures (mimic ore glints) | The Listener, which hunts by the sound of digging | Willemite, which glows green |
| 10 | Cardia | A living planet | Heartbeat: every few seconds a beat shakes the ground, loose rock falls and creatures stir; every earlier mechanic returns | — | Antibodies (chasers), veins that pump fluid | The Heart | Heartstone |

Order follows difficulty and dependency: water (3) before lava (7) so lava-meets-water reads; low gravity (5) arrives as maps get tall; darkness (9) is the hardest, as in InkFish's lights-out levels.

## The planet arc

Every planet follows the same ten-slot arc, like InkCrab's beaches, so each idea arrives on its own.

| Slot | Mission | Role | Blueprint |
| --- | --- | --- | --- |
| 1 | Haul | Landfall: the planet's mechanic, gently, in soil and caves; its gear is handed over | — |
| 2 | Hunt | The signature material | Cell (mission reward) |
| 3 | Haul | The first native creature debuts | One in the vault |
| 4 | Core sample | A deep dig to a core in stone | Drill (mission reward) |
| 5 | Salvage | Something lost in a cave; the new drill opens the stone | One in the vault |
| 6 | Clear | The second creature debuts, in nests | — |
| 7 | Survey | The widest map: stakes spread far apart | One in the vault |
| 8 | Remix | Two earlier missions at once | — |
| 9 | Deep strike | The biggest map; hunt + core sample | One in the vault |
| 10 | The giant | Boss arena at the bottom of the map | — (the giant pays the planet's biggest reward) |

## Planet 1: Graphite (free)

A grey moon of soft dark rock, pocked with craters, with a ringed planet hanging in its sky. The ground is easy and the creatures are few: this planet teaches the game. Ores: graphite, native copper, galena, quartz, a little silver deep down.

| # | Id | Name | Mission | New |
| --- | --- | --- | --- | --- |
| 1 | `first-strike` | First Strike | Haul 5 copper | Coach: drill by pushing, pick up ore, bank at the lander |
| 2 | `lead-lines` | Lead Lines | Hunt 3 graphite | Energy per block; stone too hard for the starter drill; the bag filling up; the first firedamp, by a graphite seam. Blueprint: Cell Mk 1 (graphite really is used in battery anodes) |
| 3 | `tick-marks` | Tick Marks | Haul 25 pieces of ore | Dust ticks; hitting with the drill; hearts; the first vault (Pack Mk 1) |
| 4 | `core-sample` | Core Sample | Core from 60 m | The cell running low; the first relay post; recall. Blueprint: Drill Mk 1 |
| 5 | `lost-probe` | Lost Probe | Salvage the survey probe | Stone opens up with the new drill; caves; ladders; vault (Helmet Mk 1) |
| 6 | `wormholes` | Wormholes | Clear 2 lead worm nests | Burrowers |
| 7 | `field-notes` | Field Notes | Survey: 4 stakes | A wide map; building your own route; vault (Jetpack Mk 1, a bigger tank) |
| 8 | `pencil-pusher` | Pencil Pusher | Hunt 5 graphite + core from 90 m | Remix |
| 9 | `deep-draft` | Deep Draft | Hunt 6 graphite + core from 140 m | The biggest map so far; vault (Suit Mk 1) |
| 10 | `the-grinder` | The Grinder | Defeat the Grinder | Boss: it tunnels, surfaces, and you dodge and hit its head |

Graphite is easier than the rest: you land with the starter drill, but its soil costs the normal 1 energy, so the first levels teach drilling before they teach saving energy. Numbers to tune in playtests: the bag's 4 slots and the recipes' sizes.

## Level map: the star chart

The level select is an astronomer's chart scrolling sideways, pen and watercolour like the other games' maps: orbits drawn with a compass, constellations, star sizes by magnitude, comets with hatched tails.

- **Each planet is drawn big,** with its own look (Graphite's craters, Brine's ocean swirls, Umbra's half-lit disc), and its ten landing sites are numbered rings across its face joined by a dotted flight path.
- **The ship** sits at the next landing site; a dashed route links each planet's last site to the next planet.
- **Level states** work as in InkFish and InkCrab: played sites inked with their blots, the next one ringed in red with its name and mission on a paper scrap, later ones in pencil. Unbuilt planets are pencil drafts marked "uncharted".
- **Tabs 1–10** at the bottom jump between planets.

## The ship

Between levels, a notebook page rather than a place you walk around:

- **The fabricator sheet:** an exploded technical drawing of the prospector and the drill, each part labelled with its mark. A blueprint you've found is drawn in pencil beside its part, with its recipe ticked off as the cargo fills; printing it inks it in. Pencil for what you could have, ink for what you've made: the same language as the level map.
- **Gadget slots:** three pockets to fill before landing.
- **Contracts board:** the next level's offers, pinned up; from planet 2, pick two.

## Art direction

Ballpoint pen on paper, with the same three-ink rule as InkFish and InkCrab.

| Ink | Used for | Never used for |
| --- | --- | --- |
| Blue ballpoint | The world, the prospector, the lander, harmless creatures | — |
| Red ballpoint | Danger only: hostile creatures, hazards that hurt, a blast radius | Ore or anything friendly |
| Highlighter | Things you can take: ore, gems, air capsules, mission items | Rock or creatures |

- **Hatching shows hardness** (table above), the way ink weight shows threat in InkFish. You read the ground before you dig it.
- **Dug space is blank paper** with a faint back-wall hatch, so tunnels read as tunnels and not sky.
- **Each planet has its own watercolour washes** under the ink (InkCrab's per-beach ground styles): Graphite grey, Talus rust, Brine teal, Mycel violet, Ember black and orange, Rime pale blue.
- **Depth darkens slowly** under a grey wash, so the lamp matters more the deeper you go; on Umbra it's the only light.
- **Boiling lines** on everything (three redrawn frames), as in the other games.
- **The prospector and the lander** are below.

HUD, on paper scraps at the screen edges:

```
 ♥ ♥ ♥        ENERGY ▓▓▓▓▓▓░░░ 52        [Cu 7][Gr 3][  ][  ]        −84 m
 Mission: hunt 3 graphite (1/3)            ☐ Order: 8 silver   ☐ Deep record: 120 m
```

## The prospector's look

A small person in a suit, helmet and pack with a drill in hand, in blue like every "you" in the catalog. You can see them inside the helmet: a round face, a tuft of hair, eyes that look where the drill points. The art is in `games/inkmine/src/art/prospector/`, one file per part, and every look in every pose is on the dev page `/specimens.html`.

**The character changes with the gear.** Each piece shows on the character in three looks, by its mark, and each changes on its own, so a half-upgraded prospector looks it (`logic/gear.ts`):

| Piece | Mk 0–3: prospector | Mk 4–7: guild contractor | Mk 8–10: deep-space |
| --- | --- | --- | --- |
| Suit | Patched work suit: stitched patches, a zip and chest pocket, a tool pouch, lace-up boots | A chest plate with the guild's stamp (a pick over a star), a domed shoulder plate, knee pads, steel toecaps | Overlapping armour plates, jointed knees, a forearm guard, sealed boots |
| Helmet | Glass fishbowl on a bolted collar, a clip-on lamp, a stub antenna | The fishbowl in a protective cage, twin lamps, a radio with a whip antenna and an ear-piece | A hard shell with a wide tinted visor (the face shows through, just), a lamp strip and a sensor fin |
| Jetpack | A battery cell and a dented fuel can strapped together, one nozzle | A framed pack with twin tanks, two nozzles, a pressure dial and a fin | A sealed pod with vents and a gimballed nozzle |
| Drill | A hand drill: pistol grip, vented housing, fluted cone bit, power cable from the cell | A heavy drill: finned housing, fore-grip, coolant canister, a bigger bit with carbide teeth | A plasma lance: heat-sink rings and three prongs round an emitter, arcing as it cuts; no cable |

Poses: idle, walk, drilling sideways, down and up, on a ladder, and flying (legs trailing, the flame at the nozzle).

## The lander

The prospector's ship, refitted as the game goes on, with the same three looks as the gear. The look follows the hull refit you've bought (below), not the planet:

| Hull refit | Look | What's on it |
| --- | --- | --- |
| None | The tin can | A dented can on spindly legs with shock absorbers, a row of heat-shield tiles, one engine with a scorch mark under it, a riveted porthole, a hatch with a window and a ladder down, an RCS quad, a dish and a pennant, a spare fuel tank strapped to a leg, a weld patch |
| 1 | Refitted | Braced legs, a cargo pod clamped on, a solar wing on a hinged arm, a floodlight mast, a bigger dish, the guild's painted band |
| 2 | The deep hauler | A wider hull with a cockpit window, twin engines, a radiator rack and a loading crane |

Every look has the **ore hopper** on its right side, where the prospector tips the bag in to bank it, a few lumps of the last load on its lip in highlighter.

### Lander modules

The ship's own upgrades, printed from resources like everything else (decided with @Hayk on Oct 14, 2026; at first they were bought with credits). Recipes are fixed and the steps gentle. The hull refit caps the rest: each module takes one level more than the hull's refit, so a refit opens the next row (`logic/ship.ts`).

| Module | Levels | Materials per level | What each level gives |
| --- | --- | --- | --- |
| Cargo hold | 3 | 12 copper + 6 galena; 20 copper + 10 galena + 4 silver; 24 galena + 10 silver + 4 quartz | 22, 28, 34 cargo slots |
| Winch | 2 | 8 galena + 6 copper; 16 galena + 4 silver | Recall keeps half of each stack, then the whole bag |
| Ladder rack | 3 | 8 copper; 14 copper + 4 galena; 20 copper + 4 silver | 4 ladders each landing, then 6, 8, 10 |
| Hull refit | 2 | 30 copper + 20 galena + 10 graphite + 4 quartz; 40 galena + 20 silver + 12 quartz + 20 graphite | The lander's look (refitted, the deep hauler) and the next row of upgrades |

## Controls

| Action | Keyboard / gamepad | Touch |
| --- | --- | --- |
| Move, dig | Arrows / stick; push into a block to dig it | Virtual stick |
| Jump, jetpack | Space / A (hold in the air to fly) | Jump button (hold to fly) |
| Gadget | E / X; Q / LB to switch | Gadget button; tap the icon to switch |
| Survey sheet, pause | Tab / Start | Map button |

Digging by pushing is what keeps touch play to one stick and two buttons.

## Field guide

As in the other games, a guide unlocks entries the first time you meet them, in two parts:

- **Minerals:** every real ore and gem, with real facts (hardness, where it forms, what it's used for).
- **Xenobiology notebook:** the invented creatures, drawn as specimen sketches with a naturalist's made-up notes, clearly fiction.

## Content and monetization

Same model as InkFish and InkCrab:

- Planet 1 (10 levels) is free; planets 2–10 are a $4.99 one-time purchase.
- Paid planets are server-only content served after the entitlement check (`content/` entry, `/api/content/inkmine`).
- The bag, the cargo and built gear are saved with progress. There's no in-game money, and nothing is ever sold for real money except the unlock: no currency packs, no energy, no boosts.

## Levels: laid out like the other games

Each planet's levels live in one file (`planet1.ts` … `planet10.ts`), one short definition per level, the way InkCrab's `beach1.ts` … `beach10.ts` work: a few lines each that say what matters, and a builder that carves the full map from them with a fixed seed (InkCrab's `carve.ts`).

- **A level definition** gives its id, name, seed and size; the surface profile and the lander's spot; where the strata change; the hand-placed parts: caves, relays, old charges, the vault, mission objects, contract specimens, the boss arena; and how many of each ore and creature to scatter.
- **The builder** fills the rest from the planet's style: soil, stone and deep rock bands, ore veins by depth, small caves and loose rock, the planet's features (aquifers, fungus, lava, crystal clusters).
- **A level test** checks every map: the mission is reachable with the gear the player is expected to have by then, relays are within one cell's charge of each other, and no mission object or blueprint sits in deep rock or bedrock.
- **Permanent ids**, as in the other games: never change or reuse one.

## Tech: what to reuse

InkCrab already has much of the engine this needs:

| Need | InkCrab code |
| --- | --- |
| Tile ground, digging | `logic/terrain.ts`, `logic/dig.ts` |
| Chunked ground rendering | the sand renderer and `art/sand.ts` |
| Falling sand and rock | `logic/sandfall.ts`, `logic/dunes.ts` |
| Flooding water | `logic/water.ts` |
| Ice underfoot | `ICE.grip` in `logic/sim.ts` |
| Darkness | `logic/moon.ts` |
| Coach hints, missions, result cards, saves | `logic/coach.ts`, `logic/mission.ts`, `logic/resultCard.ts`, `logic/save.ts` |
| Synth sound | `audio/synth.ts` |
| Chunk-baked level map | `scenes/map/chartView.ts` |

New: the economy, blueprints and the fabricator sheet, the bigger level builder, creatures that fight back, relays, lava and crystal resonance, the star chart.

Three games now share a pen kit (strokes, paper, boil), synth audio and the level-map plumbing. Copy what InkMine needs into `games/inkmine` first; extract a shared package once InkMine's versions settle, rather than refactoring two shipped games up front.

## Out of scope

| Idea | Decision | Reason |
| --- | --- | --- |
| Crafting trees | Cut | One recipe per piece, built in one click from raw materials; no intermediate parts |
| Collectible card upgrades, random rewards | Cut | Pocket Mine 3's card grind is what this avoids |
| Real-time energy timers, paid boosts, currency packs | Never | Clashes with the premium, one-purchase model |
| Base-building | Cut | Relays are the only thing you build |
| Fall damage, timers in normal levels | Cut | Energy is the only limit; Rush contracts are opt-in |
| Inventory management beyond two grids | Cut | The bag and the cargo are slot grids (No Man's Sky style); no weight, no item durability, no crafting sub-parts |
| Endless shaft | After launch | A daily-seed endless dig reusing the builder |
| Multiplayer | Not planned | |

## Build order

Prototype the loop in one goal-less test mine first: if digging and coming back isn't fun on its own, missions won't fix it.

**Built so far (Oct 14, 2026):** Graphite levels 1–5 are playable from the landing-site chart, with steps 3, 5 and 6 built for them:
- Level definitions (`level/planet1.ts`) carved by the builder, with hand-placed rooms, fissures, vaults (walled in harder rock, a soil plug or firedamp as the way in) and items; a reachability test (`level/reach.ts`) checks every item with the drill the main path expects, and that levels 3 and 5 need their firedamp and new drill.
- Missions (haul, hunt, core sample, salvage) and the contracts that don't need creatures (order, specimen, deep record, clean job, careful hands, rush); mission items in the rock or lying loose, a pouch that never fills, banked at the lander; lift-off.
- The bag and the cargo as slot inventories, the six Mk 1 blueprints and the printer, lander modules printed from resources, result cards, saves (local only so far).
- The helmet lamp: the ground darkens with depth, and the lamp's reach grows with the helmet's mark.
- A plain landing-site chart standing in for the star chart.

Not yet: creatures (levels 6 and 10, bounties), relays, the contracts board for planet 2 on, the coach, sound, touch controls, account sync of the profile.

Built earlier (Oct 13, 2026), steps 1 and 2 as a test mine on Graphite (`games/inkmine`, `pnpm --filter @16bitink/inkmine dev`):
- Walking, jumping and drilling by pushing, with diagonal stairs and slopes; the jetpack and its fuel.
- Energy per block by grade and drill mark.
- The ground drawn in three grades, with heavier outlines on rock the drill can't break. Only chunks near the camera exist.
- Five ores as highlighter glyphs; loose pieces fly into the bag.
- The lander, which banks the bag and recharges the cell.
- Recall, ladders, hearts.
- Firedamp pockets by the graphite seams and an earlier crew's unfired charges, chaining and showing their blast area in red.
- The prospector in three looks per gear piece and the lander in three refits (dev page `/specimens.html`).
- The Graphite sky.

Not yet: touch controls, sound, creatures.

1. Walk, jump, drill by pushing, energy per block, the three grades and drill marks, the hatched ground renderer at the big map size, the camera.
2. Ore in the bag, the lander, banking, recall, hearts; firedamp and old charges.
3. The level builder from a level definition and seed, with the reachability test; Graphite's style.
4. Two creatures (walker, burrower) and fighting with the drill.
5. The bag and cargo inventories, blueprints and the printer (Cell and Drill first), result cards, relays, vaults.
6. Missions, contracts (then the contract board), blots, the coach; Graphite's 10 levels and the Grinder.
7. The star chart; add InkMine to the catalog with the free planet.
8. Planets 2–10, one at a time, each with its mechanic, gear, creatures, giant and guide entries.

## Decisions

Settled with @Hayk on Oct 13, 2026:

- **The run limit** is the drill's energy cell: every block costs energy, and when it's flat you go back to recharge. Upgradeable (the Cell).
- **Blots:** the mission plus contracts; from planet 2 you choose your contracts.
- **Gear** is per planet: find the blueprint, hunt the planet's materials, build it.
- **The planets** stay as listed.
- **Levels** are laid out like InkCrab's: a short definition per level, carved by a builder.
- **Blots:** the mission plus two contracts (three blots). **Six gear pieces** per planet. **Shared code:** copy from InkCrab now, extract a package later.

Settled with @Hayk on Oct 14, 2026:

- **The ship** is upgraded with lander modules (above); the hull refit sets its look.
- **No money:** ore is kept as resources, and gear and modules are printed from them. The suit and ship carry No Man's Sky style slot inventories: stacks, the ship's bigger; auto-transfer at the lander and sorting on the ship; missions and contracts pay resources plus blueprints; slots grow with printed upgrades (the Pack, the Cargo hold).
- **Build order:** Graphite 1–5 and the economy first; creatures and levels 6–10 next.

## Open questions

- **Pumice's gear.** The jetpack was planet 5's given gear; it's now in the starter set, so low gravity needs another piece (or none).
