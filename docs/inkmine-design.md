# InkMine Game — Design Spec

Oct 13, 2026 · @Hayk · rewritten Oct 15, 2026 around an open world (see Decisions)

## Overview

A 2D side-view mining game drawn in ballpoint pen. You're a lone alien prospector for a mining guild, flying a mining ship that carries no weapons, with a lander to go down to the ground. There are no humans anywhere in the game: you, the crew who came before you and everyone you meet are aliens. On a jump your ship falls into a wild wormhole, a natural one that your people never charted or steadied, and being unstable it tears the ship apart on the way through. Before its systems die it brakes into orbit and sends you down in the lander for what it will need, and the lander crash-lands on a small grey moon in a part of the universe your species has never seen. The link to the guild is gone, and so is part of your memory: you don't know where you are, which star is home, or any language spoken around you. You have an energy drill, a patched-up suit and a wrecked lander. The goal of the whole game is to find where home is in the sky and gather enough to get there; the first step is to dig up what the ship needs and fix it.

Each planet is a small open world: one hand-made cross-section of ground you can walk all the way around and dig as deep as your drill allows. Nobody gives you a list of missions. Your suit tells you what's broken and what it needs. Later, the aliens you meet hand you jobs in person, and you can only understand them once you learn their language. Every trip down is still push-your-luck: how deep you go and how full a bag you carry before the drill's cell or your air runs low. There's no money: what you dig is what you build with.

The third 16bit.ink game, after InkFish and InkCrab. It keeps the catalog's model (the first world free, a $4.99 one-time unlock) and its inks (blue for the world, red for danger, highlighter for pickups), but not their level shape: there are no levels, only places.

Design pillars:

1. **Pocket Mine simple.** Every block you drill costs energy, and firedamp in the rock turns a few smart hits into a chain reaction. Dig by pushing into the ground. Anything that needs a manual gets cut.
2. **Every trip counts.** Ore you bring back is yours. Everything is printed from resources, never bought, and every repair or new part opens something you can feel on the next trip.
3. **Big ground, readable ground.** The world is many screens deep. How hard a block is, what's worth digging and what will hurt you all read at a glance from the ink.
4. **Every planet is truly different.** Not one planet with new colours: each has its own shape, mechanic, people, language and reason to be there. No Man's Sky's planets feel like one planet reskinned, and this is the thing we don't take from it.
5. **Understanding is progress.** The alien you meet starts as gestures and strange glyphs. Every word you learn makes them make more sense, until you can talk back.

## Inspiration

Full notes in [inkmine-research.md](inkmine-research.md). The science behind the creatures, plants and races (convergent evolution, alien intelligence, chemistries other than carbon and water) is in [inkmine-xenobiology.md](inkmine-xenobiology.md). What InkMine takes:

| Game | Taken into InkMine |
| --- | --- |
| **Pocket Mine 1–3** | One meter spent per hit (here the drill's energy), so every hit is a decision; explosions that chain (firedamp and old charges, each there for a reason) |
| **No Man's Sky** | The opening: crash-landed, repair your ship from what you find. Slot inventories, stacks of one resource per slot, every part crafted from resources. Its life system: a shield that recovers, health under it, life support refilled from what you mine, a jetpack that recharges on the ground. Waking at your ship and walking back to where you fell for your things. Alien words learned one at a time |
| **SteamWorld Dig 2** | Areas gated by tools; hand-made treasure vaults inside a bigger map |
| **Motherload / Super Motherload** | Cargo-limited round trips and the "turn back now?" call |
| **Heaven's Vault, Chants of Sennaar** | An alien language you come to read, word by word. InkMine's version is lighter: understanding comes from finding things and talking, not from solving puzzles |
| **Outer Wilds** | Logs left by those who came before, read in any order, that slowly explain where you are |
| **Mr. Driller** | Air with refill capsules (Brine); falling blocks as threat and tool (Talus); colour-linked groups (Prism) |
| **Terraria** | Tool tier as a readable gate: "you need a better drill for this rock" |
| **A Game About Digging a Hole** | Four or five upgrade lines are enough |

Avoided, because players complain about them: energy to start a run, paid revives, random card hands, real-time timers, exponential upgrade prices, monsters crowding out the mining (Pocket Mine 3), and planets that feel the same (No Man's Sky).

## Story: chapter 1

Graphite is chapter 1, and the free version. It ends the moment the lander flies.

1. **The wormhole.** A short ink-drawn opening: the jump, the wild wormhole, the tear; the ship braking into orbit, dark, and sending you down in the lander; the fall, the crash. You climb out of a smoking, tilted lander on the rim of a crater, and the memory of the way back is gone. Your ship is up there somewhere, and the lander has to fly to reach it (Oct 17, 2026).
2. **The suit takes stock.** Its systems list what's broken. The printer is the first repair: it takes only copper from the crater walls, and nothing in the first area can hurt you.
3. **The hull and the thrusters.** Your suit asks for the parts as you need them. You can repair them in any order, and each one takes ore from deeper down: the hull's from the soil, the thrusters' silver from the stone, past the stone drill.
4. **The radio, last before the core** (order changed Oct 17, 2026). The lander's radio and dish were broken in the crash. Repaired, it still can't reach the guild, but a call comes in at once: a slow voice nobody understands. The radio records it; the dish can't say where it's from, only that it's somewhere over the horizon.
5. **The receiver and the alien.** You print a handheld **receiver** (a suit tool: copper and quartz, no blueprint) and follow the call hot and cold: the HUD's "Next" plate shows its bars, and the suit notes "signal stronger" / "signal weaker" as you walk. There's no arrow while you search, nor while you dig for their silver; it points back to them once the core is waiting. At the outpost on the crater's far rim a Lamplighter meets you. You can't understand a word; they draw in the dust what they want: ten lumps of silver, from deep down, for a drive core.
6. **The drive core.** It cracked in the wormhole, and nothing you can print will fix it. The Lamplighters make one. As built: you bring them the silver in your bag (they take it from the bag) and, your lander whole by then, they hand the core over; you fit it aboard. (A save from before the reorder that paid with the lander still broken waits for the hull and thrusters, as before.) Later, when the language is built, the core waits for fluency and their last job as well.
7. **Fuel.** The lander's tank split in the crash. Fuel is hydrogen and oxygen split from water ice, as real moon bases plan to fuel their rockets: the Lander tab's fuel panel has the tank's bar and a Refill button that turns the ice on hand into fuel, one lump a unit (built Oct 17, 2026; `logic/fuel.ts`). The tank holds 12. Graphite has no air to brake in, so landing burns as much as the climb: 6 up, 6 down, and Lift off waits for both, so you can't strand yourself in orbit. Ice also feeds life support, so the two pull on the same ore.
8. **Lift-off, and your starship** (built Oct 17, 2026). With the core in and a full tank, **Lift off** climbs to the starship in orbit and docks. It's cold and dark: the wormhole burnt out its power, cracked its telescope's mirror, split its tank and killed its engine, and its jump drive is burnt black. Without the telescope there's no star map yet.
9. **Back down for its parts.** The ship's repairs take Graphite's ore, mended aboard only, so you land (Land, top right, burns 6), dig, fill the lander's cargo, refuel and climb again. Ore can be stowed in the ship's own hold. The HUD's "Next" leads the way ("Mend your ship's power: native copper 3/10 · native silver 0/4, carried up in the lander").
10. **First light.** With the ship's power and telescope mended, the telescope sees again and the **star map** opens on the first star system: the grey moon turns out to be one of three moons round the ringed giant.
11. **The first trip, and the end of the demo.** With the ship's tank and engine mended and the tank filled, the star map's Mycel card has **Set course**. Without the full game the demo ends there on the star map, with an offer to unlock it, and a finished demo opens on the star map from then on; with it, the ship flies on to Mycel (see "Mycel").

**The way home** (@Hayk, Oct 17, 2026). Your people travel only through wormholes they have found, charted and steadied. This one was wild: natural, unprepared and unstable, so it wrecked the ship and took part of your memory. You're somewhere your species has never been, and you don't know where. The goal across all chapters is two things: **find where home is in the sky**, and **have enough to travel there**. Chapter 1 gets you back to your ship and flying again, and its telescope shows a system no chart you remember has.

Proposed, to decide:

- **Science behind it.** Wormholes are allowed by general relativity, but a wormhole you can pass through would need exotic matter to hold it open, and without it one would collapse (Morris & Thorne, 1988). That's exactly what "steadied" means for your people, and why a wild one nearly kills you.
- **Finding home: a pulsar map.** Pulsars are dead stars that flash at exact, unchanging rates, so a few of them can pin down a star's place in the galaxy. The Pioneer plaques and the Voyager records carry such a map to the Sun, made of 14 pulsars. Your people could carry one too. The lost memory means you can't read it until you rebuild it: each new planet's sky, an alien star chart or a recovered memory adds a pulsar, until home is pinned on the galaxy map.
- **Memory comes back in pieces,** found like the old crew's logs: a smell in a cave, a song on the radio. Which pieces the wormhole took, and which the printer gets wrong each time it reprints you, can stay quietly unclear.
- **Getting there** is the endgame's big build: the drive, fuel and supplies for the trip, or steadying a wormhole yourself, the way your people do.

**Those who came before.** You aren't the first ship to fall through. An **old crew**, prospectors of your own kind, came years ago and never left: their half-buried base, their unfired charges in the rock, their buried time capsules and their logs are scattered across Graphite. The logs are in your language, so they explain things and teach you Lamplighter words they had learned. They also carry the story's slow chill: the old crew were reprinted many times.

**Other peoples fell through too** (Oct 17, 2026). Each species builds in its own way, so their ships and their technology look nothing like yours, and their broken gear is something the suit can study and rebuild in your own form (see Gear). The first you find is **the Aster**, on Mycel: see "The Aster". (Until Oct 17 the doc called Graphite's old crew "the Aster crew"; the name now belongs to the aliens.)

**Why you wake at the lander.** The lander's printer takes a scan of you every time you step inside. When you die, it prints you again from that scan. The bag was never part of the scan, so it stays where you fell. This is also why the printer is the first thing you repair. The old crew's logs hint that being reprinted again and again isn't quite free ("Fourth time today. It got my markings wrong.").

## The world

Each planet is one hand-made world, a side-view cross-section like InkCrab's beach but much bigger and mostly underground. The surface strip at the top holds the lander, the alien outpost and the sky. Below is ground to dig, as deep as your drill can take you.

- **The world wraps.** Walk far enough east and you come back from the west: you're on a small moon. The join is invisible (InkFish's sea does the same, `logic/ring.ts`), and nothing is ever more than half the world away from the lander.
- **What you dig stays dug.** Tunnels and shafts are saved, so over time the ground near the lander becomes your own network of routes. Ore doesn't grow back. Instead you go deeper as your drill improves, and every layer down holds more and richer ore than the one above.
- **Regions, not levels.** The world is laid out in hand-placed regions (the crash crater, the old crew's base, the lead seams, the deep), each with its own ore, creatures and things to find. Harder rock and darker depths gate them, not menus.
- **The survey sheet** in the pause menu shows what you've seen, centred on the lander, with the wrap drawn as the sheet's two edges meeting.

Tiles are 32 px; a 1280 × 720 view shows about 40 × 22 tiles. Sizes to tune in playtests:

| Planet | Around × deep (tiles) | Screens |
| --- | --- | --- |
| Graphite | 256 × 160 (built) | ~6.5 around × 7 deep |
| Later planets | Bigger, each its own shape | Tall on Pumice, mostly sea on Brine, and so on |

The ground is layered in strata that get harder and richer with depth, broken up by caves, pockets of loose rock, the planet's own features and set pieces: the alien outpost, the old crew's base, a crashed probe, a creature nest.

## Core loop

1. **Know what you need.** The repair list (or a job you were handed) says what to bring back, and the suit hints where it runs ("galena runs below the grey band").
2. **Dig down.** Push into the ground to dig. Pick up ore as you break it out.
3. **Watch the gauges.** Every block costs drill energy, life support drains slowly, and the bag fills. Creatures and hazards eat your shield, then your health.
4. **Refill or turn back.** Feed the drill and the life support from ore you carry, or head home when the bag is full.
5. **Bank at the lander.** The bag empties into the cargo hold, and the lander tops up everything else.
6. **Repair and print.** Inside the lander: repair the next part, print gear, sort the cargo.
7. **Go back out,** a little deeper, along the routes you've built.

## Digging and blocks

The prospector carries an **energy drill**: a futuristic mining tool powered by an energy cell, not a pickaxe. Push against a block to drill it: walking into a wall drills sideways, holding down while standing drills down, holding up drills up. No separate dig button. Holding keeps it going, a block every fraction of a second.

**Every block costs energy**, as every tap costs pick in Pocket Mine. Walking, jumping and looking around are free, so there's no clock: you can stop and plan.

**Each planet's ground comes in three grades**, and what a grade costs depends on your drill's mark (Mk):

| Ground on planet N | Inked as | Drill Mk N−1 (what you arrive with) | Drill Mk N (built there) | Drill Mk N+1 (the next planet's) |
| --- | --- | --- | --- | --- |
| Soil | Light stipple | 2 energy | 1 | 1 |
| Stone | Cross-hatch | Too hard | 2 | 1 |
| Deep rock | Dense cross-hatch, heavy outline | Too hard | Too hard | 2 |
| Bedrock, ruin walls | Solid ink | Never | Never | Never |
| Loose rock, boulders (from Talus) | Round outlines | 1; falls when undermined | 1 | 1 |

- **Arriving on a new planet, your drill is a step behind.** Soil costs double and stone won't budge, so you start out following soil and caves. Building that planet's drill opens up the stone: the "now I can go anywhere" moment. On Graphite you start with the Mk 0 starter drill, but its soil costs the normal 1 energy, so the start teaches drilling before it teaches saving energy.
- **Deep rock waits for the next planet's drill.** It guards vaults and rich veins, so Graphite is worth a visit later with better gear. Chapter 1 never needs it.
- **Too hard** blocks make the drill skid with a whine and a "too hard" note, and cost nothing. Blocks your drill can't break yet are drawn with a heavier outline, so you can see it before you try.
- **No fall damage.**
- **Diagonals cut staircases:** each step is one dig of two blocks, the diagonal one and the one joining it to you (overhead going up, ahead going down), costing both. Stop anywhere and the tunnel is still joined up, never a hole touching it only at a corner. Where open tiles do touch only at a corner (caves, blasts), the ground is drawn with the two openings joined, so it reads as one passage.
- **Ore sits in the rock** as a highlighter-marked vein. Breaking an ore block drops one piece that flies into your bag.

### Firedamp and old charges

Anything that blows is in the rock for a reason. Blasts break soil and stone without spending energy and set off whatever else they reach, so a few well-placed hits can still clear half a cave.

| What | Where it comes from | Effect |
| --- | --- | --- |
| Firedamp | Natural: pockets of methane trapped in the rock, the old hazard of coal and graphite mines, mostly by graphite seams. On Graphite the gas is alive in origin: microbe mats (rock film) on warm cave walls breathe it out (Oct 17, 2026, see [inkmine-xenobiology.md](inkmine-xenobiology.md)) | Drilling one opens it: it hisses and bursts 0.7 s later, breaking a 3 × 3 area |
| Old charge | The old crew drilled it into the rock and never fired it | A tap on its detonator arms it; 1.4 s later it breaks a 3 × 3 area |
| Line charge | The old crew's charges on detonating cord along a seam | Breaks its whole row, four tiles each way |
| Each planet's own | Planet 3 on | Spore pockets on Mycel, magma blisters on Ember, fire ice on Rime, and so on |

- **Drawn into the rock, not on it.** Firedamp is an irregular hollow washed pale, with faint red wisps of gas and pressure cracks. Old charges are steel canisters in drilled bore holes, with hazard bands, a detonator lamp and a lead wire along the seam.
- **Red where it can hurt you:** the wisps, the hazard bands, the lamp (slow blink when armed, fast once lit), and the outline of the blast area while anything is lit.
- **Charges open the old crew's base.** Its entrance is behind a cave-in that the crew's own charges can clear, but one of their time capsules sits inside the blast. Getting both out is the puzzle.
- **Your own charges:** the gadget is a blasting charge you place, then step clear.

## The suit: staying alive

Life works the No Man's Sky way, adapted to a pen-drawn phone screen. Five gauges, plus the bag:

| | Starts at | What it does | Refills |
| --- | --- | --- | --- |
| **Shield** | 1 bar | Takes hits before your health does | By itself, 4 s after the last hit |
| **Health** | 3 hearts | A creature, a falling boulder or a hazard costs one once the shield is down, then 2 s of grace | At the lander, or with a medkit (a printed gadget). Never by itself |
| **Life support** | 100 | Drains slowly while you're outside (about 6 minutes from full). At zero you start losing hearts | At the lander, or feed it ice from the bag |
| **Drill energy** | 100 | Drilling spends it. At zero you can't drill | At the lander, or feed it graphite from the bag |
| **Jetpack** | 6 s of flight | Burns while you hold jump in the air | By itself whenever you stand on ground |
| **Bag** | 4 slots, stacks of 10 | A slot inventory (below) | The lander moves it into the cargo |

- **Feeding a gauge** from the bag is one tap on the gauge (or a key): it takes one piece of the right ore at a time. On Graphite, graphite feeds the drill (graphite really is used in battery anodes) and ice feeds life support (water ice in shadowed craters is how real moon bases plan to make air). So graphite is both fuel and what you build with, and you choose which.
- **The jetpack recharging on the ground** means any shaft with ledges to stop on can be climbed. A careless straight shaft still traps you: dig ledges as you go, or recall.
- **Hazard protection** is a sixth gauge that exists only on planets that need it: heat on Ember, cold on Rime. Graphite has none, to keep the free planet simple.
- **The jetpack gauge shows only while you fly**, beside the prospector, so the HUD stays small.

**Dying.** At zero hearts the screen inks over and you wake at the lander, printed again (see Story). Your bag stays where you fell, marked on the survey sheet and in the world with a little inked flag. Walk back and touch it to get everything back. There is one flag at a time: die again before you reach it and the flag moves to where you fell, carrying the old bag with the new (decided Oct 16, 2026, after review: losing the first bag on the way back to it felt cruel). The cargo hold is always safe.

**Recall.** If you're stuck (no energy, no way up), Recall on the inventory page (L or Esc) winches you up to the lander. It works like dying, without the printing: the bag stays where you were, flagged. The Winch module keeps part of each stack in the bag; only the rest is left under the flag.

**Built (Oct 16, 2026)** (`logic/suit.ts`, `logic/flag.ts`):
- The numbers: the shield refills at half a bar a second, starting 4 s after the last hit. A hit takes a whole bar or, with less than one, a heart; then 2 s of grace. Life support is 100 and lasts 6 minutes outside; empty, a heart goes every 6 s (shield or no shield). One graphite gives the cell 35, one ice gives life support 40 (raised from 20 and 25 on Oct 17, 2026, with more fuel veins on both worlds: fuel had become a hunt). The jetpack charges 30 a second (a starter tank in 2 s) on the ground or a ladder.
- The suit's marks: a heart on odd marks, a shield bar on even ones (Mk 2 has two bars).
- The lander puts everything right the moment you touch it: hearts, shield and the jetpack for free; air and the cell from its **stores** (built Oct 17, 2026; `logic/stores.ts`). An air tank and a battery, 600 units each to start (six starter suits' worth), shown in the Lander tab's Supplies panel under its fuel. Refill buttons turn ice (40 a lump) and graphite (35 a lump) on hand into air and charge (on Mycel, water, and lignite or caps' carbon); the battery also charges itself slowly from the lander's panels (0.5 a second), so it can't stay flat, and ice lies near the surface all round, so the tank can't either. Run short and the suit is only part filled, with a note. The **Supply tanks** module makes both 1,200, then 2,000. The aim is an errand every few trips, not every one; the jetpack stays free, since it's how you move, not a budget. (Decided Oct 17, 2026: with everything free at the lander, nothing you brought home mattered; now ice, graphite, fuel and the stores pull on the same ores.)
- The inventory's Life support panel (L or Esc away from the lander, or the Bag button) feeds either gauge from the bag; tapping a gauge on the HUD feeds that one. There's no feed key (R was dropped Oct 17, 2026: it wasn't clear what it did).
- Waking: "The printer made you again, from the scan it took the last time you were aboard." Before the printer is mended the suit drags you back instead ("Mend the printer: it can do better than that"). A red beacon arrow points to the bag.
- Not yet: medkits, the survey sheet's flag.

### Inventories: the bag and the cargo

Ore is kept as resources in two slot inventories (decided with @Hayk on Oct 14, 2026). Each slot holds a stack of one ore, so a varied haul fills the bag faster than a single vein (`logic/inventory.ts`).

| | Slots | Stack | Grows with |
| --- | --- | --- | --- |
| Suit bag | 4 | 10 | The Pack: 2 more slots a mark |
| Cargo hold | 16 | 50 | The Cargo hold module: 6 more slots a level |

- **At the lander** the bag empties into the cargo automatically, the rarest ore first; whatever doesn't fit stays in the bag ("cargo hold full").
- **Locked slots** (Oct 17, 2026): aboard, pick up a stack in the suit bag and press Lock; a locked slot (a padlock on it, in the menu and on the HUD) is never emptied into the cargo. While the Lamplighters wait for their silver, silver in the bag stays there the same way, without locking, until they have it. Moving stacks between the bag and the cargo is aboard: pick one up, then "To cargo" / "To suit bag", or tap a slot on the other tab. A picked-up stack takes the detail card's place on the right (Oct 17, 2026): the ore drawn big, how many are in the stack and on hand, where it sits (locked, or kept for the Lamplighters), real facts about the mineral, what it fuels, and what it's still needed for, each ticked once enough is on hand (`logic/needs.ts`). Only one thing is selected at a time: tapping a technology slot puts the stack down and shows that slot's card, picking up a stack lets the slot go, and tapping the selected slot or stack again leaves the right side empty (there's no Put down button). Far from the lander, L or Esc opens the same page over the paused world (Oct 17, 2026), and it doubles as the pause menu with Recall on it: the suit bag can still be sorted, split, locked and dropped, but the cargo and the lander are look-only (a cargo stack shows its card, nothing moves into or out of the cargo) and Print / Repair read "At the lander", since printing takes the lander's printer. The page is titled Inventory there, and on the Ship tab a note over the lander says you're far from it and must come back to print, repair or move the cargo. Back, L or Esc closes it, and play carries on where it stopped (the world is paused while it's open).
- **Inside the lander** both grids are shown. Tap a stack to pick it up, tap a slot to put it there: into an empty slot, onto the same ore (as much as fits), or swapping. A picked-up stack can be split in half or dropped (tap twice).
- **Things you're given or find** (a time capsule, an old crew's log, a job item) go in a separate pouch and never take bag space. Broken parts aren't carried: they're studied and taken apart where they lie (see Gear).

## Getting around

The world is big and tunnels stay dug, so shortcuts home are something you build.

| Move | How |
| --- | --- |
| Walk, jump, step up | Walk, jump one tile, climb a one-tile step automatically |
| Jetpack | Hold jump in the air to fly. You can drill while hovering: up through a roof, or into a wall. Recharges whenever you stand on ground |
| The lift | A lander module: a cable lift you hang down one shaft of your choice, from the lander's winch. Ride it both ways. Later levels of the module make it longer |

The lift is what makes the world's depth manageable: every trip down leaves the next one shorter. There are no ladders to place (taken out Oct 17, 2026); ladders an older save left in the world still hang and can be climbed.

## Ore and materials

Ore is real minerals, so the field guide can teach real facts, as the fish and shell guides do.

- **Common ore** is shared across planets and climbs in value with depth: native copper, galena (lead), hematite (iron), silver, gold, platinum.
- **Gems** are rare, single blocks: quartz, garnet, beryl, ruby, sapphire, diamond.
- **Each planet has a signature material,** found nowhere else and the main ingredient of that planet's gear.
- **Each planet has its own fuels** for the drill and life support, so feeding them is part of learning the planet.
- **Junk that looks like treasure:** pyrite (fool's gold) on Talus is in no recipe; it only fills slots until you drop it.

Every ore is painted in its real colour (copper's orange, galena's lead grey, graphite's black, rose quartz's pink, silver's white metal, ice's pale blue), with a highlighter swipe of a matching tint behind it to spot it on grey ground, and its own glyph shape in the rock (nuggets, cubes, flakes, prisms, wires), so it reads without colour. (Until Oct 17, 2026 the glyphs were painted in arbitrary highlighter hues, which made silver green.)

**Graphite's materials:** graphite (signature, and drill fuel), ice (life support, in pockets near the surface and in the crater's shadow), native copper, galena, quartz, and a little silver deep down. The world holds at least three times what chapter 1's repairs and gear need, so the planet is never mined out before the story ends.

## What to do: needs, not missions

There's no mission list and no job board. Things to do come from two places:

**1. The suit's repair list** (built Oct 16, 2026; `logic/repairs.ts`). Your suit lost its link to the guild, so it does the asking. The HUD's "Next" scrap always shows exactly one thing to do, with what's on hand counted ("Repair the printer: native copper 3/6"), and once you have everything, "go aboard". Repairs are done in the lander's damage report: each system the crash broke, what's wrong, its ore ticked off, and a Repair button.

| Repair | Needs | Opens | Real fact for the guide |
| --- | --- | --- | --- |
| Printer | 6 copper | Printing: gear from blueprints, lander modules. Until then the printer sheets say "offline" | Copper is the best cheap conductor |
| Radio (saved id `comms`) | 4 copper, 2 quartz | The call; then the receiver, the Lamplighters, the lexicon | Quartz crystals keep radios on frequency |
| Hull plating | 10 graphite, 3 galena | The six cargo slots the breach put out of use (10 → 16) | Graphite fibres make light, stiff panels; lead only seals the seams. A lead hull would be heavy, and cosmic rays hitting it spray more radiation |
| Thrusters | 6 copper, 6 silver, 2 graphite | The engines fire; only the core is missing | Rocket chambers are lined with copper and a little silver, which pulls the heat away before the wall melts; the nozzle throat is graphite |
| Drive core | Can't be printed: the Lamplighters give it for 10 silver once the hull and thrusters are mended | With a full enough tank, lift-off to the ship: the end of chapter 1 | — |

- **The order:** the printer first, the hull and thrusters in either order, the radio last before the core (its call leads to the Lamplighters, who make the core), the core last, then fuel for the climb (not a repair: a tank you refill, see "Story: chapter 1"). A repair whose turn hasn't come says what it's waiting for.
- **The drill in between.** The radio needs quartz, which lies in stone, and the starter drill can't break stone. So after the printer, the goal is a broken drill to study, which lies at the foot of the fissure where an earlier crew lost it. A beacon arrow by the prospector points the short way round the world to it, with the distance in metres (No Man's Sky's marker, inked). Then: print the Drill, then the comms.
- **No crafting chain.** No Man's Sky's repairs go through crafted parts (metal plating, a refiner, di-hydrogen jelly); InkMine's take raw ore straight from the cargo, then the bag.
- **The lander shows it.** Each broken system has a wrecked look of its own: a dark, cracked porthole until the printer runs (then its warm glow), the dish hanging by its cable until the radio work, a gash and torn heat-shield tiles until the hull is plated (then a welded patch), and a crumpled, scorched engine bell, smoking, until the thrusters are fixed (dev page `/specimens.html`, "After the crash").
- **The opening card,** shown once: the jump went wrong, the wormhole, the crash, and that the printer wants copper from the crater walls.
- **Taken from No Man's Sky's opening ("Awakenings"):** you start crash-landed, repairs open what the next repair needs, the ship's damage is read from inside it, one part needs a blueprint found somewhere marked, and there's always one objective on screen. Players' main complaint about it, stretches with no prompt, is why the goal is never empty.

**2. Jobs handed to you.** The Lamplighters give you jobs in person: they walk up, or you find them at their outpost. Before you share any words, a job is a picture they draw in the dust (an ore glyph and a downward arrow, a broken probe and a pointing hand). As you understand more, the same jobs come in words. Jobs pay in what you can't easily dig yet: blueprints, rare ore, Lamplighter writings full of new words, and finally the core.

| Kind | Example on Graphite |
| --- | --- |
| Bring | Bring them quartz from below the grey band |
| Sample | Drill a core sample from a marked deep spot |
| Salvage | Find their listening probe, lost down a fissure in the deep |
| Mark | Plant their listening stakes at three spots across the world |
| Clear | Dig out their deep post after a cave-in |
| Open | Get into the old crew's base (old charges) |

The old mission code (haul, hunt, core sample, salvage, survey, clear, demolition) becomes these jobs and the repair list. There are no blots: progress is the lander's repairs and the lexicon.

## The Lamplighters

Graphite's only people, and the first race you meet. A working name: it's what the old crew called them. You learn what they call themselves when you become fluent.

- **Who they are:** tall, thin and slow, in sealed suits of layered cloth, each carrying a lantern, because their home world is dark. They're drawn in blue: they're never a danger.
- **Why they're on Graphite:** they don't live here. They came to mine it, as you did, and keep a small mining outpost on the crater's far rim. They've seen ships fall through the wormhole before, and they deal only with those who learn to talk with them. That's why they won't just hand over a core.
- **They have the weapons.** Your ship is a mining ship and carries none. Weapon blueprints come only from the Lamplighters: hand weapons for you first, and later weapons for the ship (see Weapons).
- **Their outpost** is a handful of domes and a lantern mast. It has inscriptions on its walls, a Lamplighter who gives jobs, and later a second one you can only talk to at level 3.
- **Their writing** is knotted lines strung on a cord, which suits the pen art: each word is a small knot shape, easy to tell apart.

## Learning the language

Lamplighter speech appears as the suit's recording of their voice (Oct 17, 2026): an inked sound trace, one swelling burst per word with quiet between, long low waves for a slow, low voice (`scenes/kit/voice.ts`). You hear speech, you don't read it, so speech is never drawn as writing. Every word you know is written over its burst in your own handwriting, so a sentence fills in as you learn: first "… **ore** … **deep** …", much later the whole line. The knot glyphs are their writing only: inscriptions, writings, the lexicon.

| Level | Words known | What it gives |
| --- | --- | --- |
| 0 · Strangers | 0 | Glyphs only. They talk with gestures and pictures in the dust |
| 1 · Words | 10 | Nouns: ore names, "danger", "ship", "deep", "you" |
| 2 · Phrases | 25 | Short sentences: you understand what a job asks |
| 3 · Talk | 40 | You can answer: two or three short replies to choose from, which can ask about things and teach more words |
| 4 · Fluent | 55 | Their stories, their name for themselves, their best blueprints, and the drive core (with their last job) |

Graphite has about 70 words to learn and needs 55, so you never have to find everything. Progress toward the next level shows as a thin bar on the radio entry in the pause menu.

**Where words come from:**

| Source | Where | Worth |
| --- | --- | --- |
| Talking | Every conversation with a Lamplighter | A word or two |
| Inscriptions | The outpost's walls, standing stones out in the world | A few words each |
| Lamplighter writings | Given as job rewards | Several words |
| the old crew's logs | The old crew's base, and with their lost equipment out in the world | Many words: the crew had learned some already, and wrote glossaries in the margins |
| Time capsules | Buried in the rock, highlighter-marked like ore | Many words, plus a piece of the old crew's story |

Reading anything is pushing into it, like drilling: the drill never hurts a person or a text.

**Each race has its own language.** On later planets the radio learns each new language from scratch, so meeting a new people always starts with gestures again.

## Gear: blueprints, materials, the printer

Every planet has its own set of gear, the best you can have there, built from that planet's materials. Gear is unlocked, never just bought: the point is the moment a new piece arrives and the world opens up.

**Six pieces**, each with a mark per planet (Mk 1 on Graphite up to Mk 10 on Cardia). You start with a Mk 0 starter set.

**Blueprints come from broken parts** (Oct 17, 2026). No blueprints lie about the world, since nobody would leave a drawing in a cave. What lies about is broken gear: a split drill, a cracked cell, a torn pack, left behind by the old crew, the Aster and others who fell through before you. Each is drawn as the piece it was, tipped over and half sunk in dust (`art/wreckArt.ts`). Walk into one and the suit **studies it and takes it apart** in one go:

- **A design you don't have** is learnt on the spot ("Drill Mk 1 design learnt!"). The suit records it, so there's nothing to carry home.
- **A design you know** teaches nothing ("Cell Mk 1: nothing new"). Parts repeat, so you'll meet these.
- **Either way it's salvage:** half of each material the part takes to print (at least one of each, `salvageOf` in `logic/blueprints.ts`) spills out as ore and flies to the bag. So a repeat is still worth the walk.
- **It's gone for good** afterwards; the world save lists it as taken.
- One buried in rock shows through with the pulsing highlighter ring until you dig it out. The beacon points at a part with the design the current goal needs.

Graphite has five, one per Mk 1 design but the Suit's (a Lamplighter job gives that), and two repeats: a second cell in the cave east of the crash and a second drill in the cave under the old charges.

| Piece | What a new mark gives |
| --- | --- |
| Drill | Breaks the planet's stone (table above), costs less on everything, hits creatures harder |
| Cell | More drill energy |
| Pack | Two more bag slots |
| Suit | A stronger shield; one more heart on alternate marks; on later planets, better hazard protection |
| Helmet | Wider lamp light; from Mk 2, a scanner ping that shows ore through rock |
| Jetpack | A bigger tank and a faster climb |

**Printing a piece takes its blueprint and the planet's materials** (cargo first, then the bag). Every recipe uses what the part would really be made of (realism pass, Oct 17, 2026, in [inkmine-research.md](inkmine-research.md)): the cell is a graphite anode on copper foil, the pack a carbon frame with copper fittings, the drill copper windings with graphite brushes and diamond grit, the helmet a fused-quartz visor, the jetpack a graphite nozzle with silver joints, the suit glass-fibre cloth. Graphite's Mk 1 recipes (`logic/blueprints.ts`):

| Piece | Materials | Gives (`logic/marks.ts`) | Blueprint from |
| --- | --- | --- | --- |
| Cell | 4 graphite, 6 copper | Energy 100 → 140 | The Lamplighters' first job |
| Drill | 6 graphite, 4 copper | Breaks Graphite's stone | The old crew's base |
| Pack | 6 graphite, 2 copper | Bag 4 → 6 slots | A vault near the crash site |
| Helmet | 4 graphite, 2 quartz | Lamp 4.5 → 6 tiles | A Lamplighter job |
| Jetpack | 5 graphite, 3 silver | Fuel 6 → 9 s, faster climb | A deep vault |
| Suit | 8 graphite, 3 quartz | Shield up, hearts 3 → 4 | A Lamplighter job at level 3 |

Every mark is an even step, never an exponential curve.

**Marks can be skipped** (Oct 17, 2026, @Hayk): a Mk 2 design found on Mycel prints over a Mk 0, whether or not Graphite's Mk 1 was ever found. The slot shows the best mark you've found above what you wear (`nextMark` in `logic/blueprints.ts`).

**The good moment:** you find a broken part and learn its design, see in pencil what it needs, go and dig it up, and the printer inks the part in. Every new piece changes something you feel on the very next trip: stone you couldn't break, a vault you couldn't reach, a cave too dark to read.

**Rules that keep it from turning into grind:**

- **The story never needs more than the world gives.** The drill's blueprint and its materials are reachable without it.
- **Gear never gets worse.** A new mark beats the old one at everything.
- **Planet gear is given, not built.** The thing a planet's mechanic needs (rebreather, thermal lance, coolant foam) is handed over early, by that planet's people.
- **No money at all.** Everything is printed from resources.

## Gadgets

Up to three gadget slots, filled inside the lander and printed from resources. One button uses the selected gadget.

| Gadget | From | Use |
| --- | --- | --- |
| Medkit | Graphite | Restore one heart |
| Blasting charge | Talus | A charge you set in the rock: place it, then step clear |
| Flare | Umbra | A light you throw that burns for a while |

## Creatures

Every planet has its own native creatures, invented but built from a few behaviours, so a new planet is new drawings more than new code. They follow the rules in [inkmine-xenobiology.md](inkmine-xenobiology.md): each starts from a shape evolution keeps repeating (crab, worm, wing, glow lure…) and gets a reason to exist from its planet's energy source (proposed Oct 17, 2026, not yet accepted).

| Behaviour | Example |
| --- | --- |
| Walker | Paces a tunnel floor, turns at walls |
| Burrower | Moves through soil, leaving a tunnel; shows as wriggling hatch before it breaks out |
| Dropper | Clings to a cave ceiling, drops when you pass under |
| Flyer | Drifts through open caves toward you |
| Spitter | Sits still, shoots on a visible wind-up |
| Mimic | Looks like a boulder or an ore glint until you're close |

- **None on Graphite** (decided Oct 17, 2026, @Hayk): it's a bare rock moon, no flora and no fauna (only microbes in the deep, which breathe out its firedamp). That keeps the free chapter simple and needs no weapons. Creatures start on Mycel.
- **Few and readable.** Pocket Mine 3's fans complained that monsters crowded out the mining, so they're kept to their regions, and the landing site has none. A creature notices you within about 4 tiles and shows it with a red "!" before it moves.
- **Red ink means it can hurt you.** Harmless grazers are drawn in blue.
- **They live below the ground,** more of them and fiercer the deeper you go. That is what stops you going deeper, more than the rock does.
- **The drill is a tool, not a weapon.** Going deeper needs a weapon (below). Blasts hurt creatures too, so the terrain is still a weapon.
- **No loot.** Creatures drop nothing; a reason to clear them comes from a job.
- **Never saved.** They're placed fresh from the world's rules on every landing (`placeCreatures`, on the ground as carved, so in the same spots each time): what you burst grows back.
- **Each planet's giant** lives in its deepest region. Mycel's is the **Mother Mycel**; Brine's is the **Leviathan**.

**Built on Mycel (Oct 17, 2026)** (`logic/creatures.ts`, `logic/fauna.ts`, drawn by `scenes/game/faunaView.ts`, art in `art/creatures/`):

| Creature | Behaviour | Where | What it does |
| --- | --- | --- | --- |
| Puffball | Spitter | Cave floors: round the wreck in the peat (none near the lander), and all through the limestone | Notices you within 5 tiles (if nothing's in the way), a red "!", swells for 0.7 s, then spits a clot of spores in an arc: a hit (shield, then a heart) and 6 air. A pulse bursts it; bursting close by costs 6 air too. Rests 2.4 s between spits |
| Snap tendril | Dropper | Cave ceilings in the limestone only, where the floor is within 5 tiles | When you pass under it, a "!" for 0.3 s, then it whips down. Catching you, it holds you where you are (no walking or drilling) and squeezes, a hit every 1.2 s, until you struggle free (jump three times) or shoot it (a shot makes it let go, a second severs it) |
| Grazer | Harmless, blue ink | The surface among the caps, away from the lander | Crawls along eating caps, stepping up and down a tile, turning at walls and drops. Shot, it curls up for 3 s and comes to no harm |
| The Mother Mycel | Giant | Her chamber deep in the limestone east of the wreck (10 × 7 tiles) | Can't be hurt (a pulse leaves no mark). Every 4 s she beats: a red wave of spores spreads out, costing 10 air to anyone within 7 tiles of her. Touching her is a hit and throws you off. You mine your way around her |

What you kill leaves pieces where it was, picked up like ore (`SPOILS` in `logic/creatures.ts`). A puffball leaves carbon and water, since it's cap flesh round a sac of water. A tendril leaves carbon and amber: it's a resinous root, so it's the deep stone's reward. Grazers and the Mother leave nothing, since neither can be killed. A blast kills the same way a pulse does.

**Built on Brine (Oct 18, 2026)** (`logic/seaFauna.ts`, the crab with the grazer's walk in `logic/fauna.ts`; art in `art/creatures/` and `art/brineFauna.ts`). None round the lander, under the Landing Isle, or in the Tidesingers' reef:

| Creature | Behaviour | Where | What it does |
| --- | --- | --- | --- |
| Shore crab | Harmless walker, blue ink | The islands (away from the lander) and the seabed | Walks the ground as a grazer does; shot, it tucks in for 3 s. Brine's crab-form, salt-crusted |
| Bubble jelly | Flyer, water only | The open sea east of the Landing Isle, and the flooded caves | Hangs in the water, bobbing. Notices a swimmer within 5 tiles (a "!"), then drifts after them at 0.9 tiles/s, only through water. A sting is a hit and 4 air; then it backs off and rests 2 s. It gives up when you leave the water. Left dry, it bursts. A pulse bursts it |
| Rasp eel | Lunger | Burrows in the walls of flooded caves, deeper ones more | Waits in its burrow facing out; when something is in front of it on its row, within 4 tiles, a "!", then it lunges out and bites (a hit) and pulls back in to rest. A pulse sends it back in; a second kills it. Its teeth are capped with magnetite, as a real chiton's are |
| The Leviathan | Giant | Asleep at the west end of its cave, 83–92 m down under the reef (10 × 4 tiles) | Can't be hurt. Noise wakes it: each tile drilled within 10 tiles of it, a blast within 18, a pulse, swimming within 3 tiles of it; it settles again in the quiet. At half a measure it stirs ("something huge stirs below…"); at a full one it wakes, stirs 1.6 s, then sweeps its cave back and forth for 12 s. Touching it, awake, is a hit and throws you; touching it asleep wakes it. Then it swims home and sleeps |

A jelly leaves water and halite (it's mostly salt water); a rasp eel leaves magnetite. Crabs and the Leviathan leave nothing.

## Weapons

Your ship is a mining ship: it has no weapons, and you start with none. Graphite has nothing to fight, so you need none there. Weapons come from other peoples' technology: studied from what they left, or given in trade, and printed from ore like everything else.

- **The pulse** (built Oct 17, 2026, `logic/pulse.ts`), your first weapon, is the Aster's. Their broken wrist resonator lies in the open just east of their wreck on Mycel; studying it gives its design, and the printer builds it your way from Mycel's peat ores (3 pyrite, 2 malachite, 2 lignite: it's a tool, beside the receiver). The goal after the wreck is to study it and print it, before the drill, since Mycel's stone is where its creatures live. It throws a ring of force in a straight line: the way you face, or up or down while you hold them; held by a tendril, straight at it. It carries 7 tiles, rock stops it, it never breaks the ground, a shot costs 2 of the cell, and it fires every 0.45 s. F fires it; on a touch screen a Pulse button appears over Jump. You wear it as a bracer on the front wrist.
- **Later marks and weapons** come from the peoples met later, each built in their own way.
- **Ship weapons** come later still, from the races of the paid planets.
- **Drawn in blue.** Your weapon is drawn in blue like the rest of your gear; red stays for danger.

## Your starship and travel

Decided with @Hayk on Oct 17, 2026; the starship, its repairs, its hold and the first trip are built (`logic/starship.ts`, the Starship tab, the star map's Set course). Trips between Graphite and Mycel are built (`logic/travel.ts`, Oct 17, 2026): 6 units each way, set on the star map aboard, landing on the world the ship circles. Travel past them (launch windows, bigger tanks) is designed, not built.

**The starship flies between worlds; the lander goes down and up.** It circles the world you're on; the lander climbs to it and lands again, burning its own fuel each way.

**The starship's systems,** mended aboard only, with ore carried up in the lander (or stowed in its hold):

| System | Needs | Opens | Real fact for the guide |
| --- | --- | --- | --- |
| Power | 10 copper, 4 silver | The lights and systems; the others can be mended after it | Silver carries electricity better than any other metal; spacecraft wire their power contacts with it |
| Telescope | 4 quartz, 2 silver | The star map ("First light") | Big telescope mirrors are glass under a film of silver or aluminium far thinner than a hair; quartz glass barely changes shape with heat |
| Fuel tank | 12 graphite, 3 copper | The tank, level 1 (10 units): enough for a sister moon | Big rocket tanks are wound with carbon fibre over a thin liner: as strong as steel and far lighter |
| Engine | 8 graphite, 4 silver, 3 quartz | Flying between worlds | Ion engines push charged gas through grids; graphite grids last longest, as the beam barely wears carbon away |
| Jump drive | Can't be mended here | The way home, the endgame | — |

**Its picture shows what's broken** (`art/starship/`, Oct 17, 2026), as the lander's wreck does: dark windows and lights until the power's back, a dented telescope with its lid hanging bent and glass drifting off it, the carbon-wound tank split and frosted in its truss, the ion thrusters' grids cracked and their insulators chipped (blue in the grids once mended and powered). The jump ring stays burnt black and torn. It's drawn side on: three ion thrusters behind a power bay with radiator wings, the ring round the waist, the tank in an open truss, the faceted hold with its doors, the docking collar, the dish and sensor mast and three ore pods, the crew's drum with its portholes and the telescope on its back, and the bridge in the nose. The star map and the story cards use the same drawing, small. The Starship tab's slots draw each system up close in the same style (`art/starship/systems.ts`), broken or mended to match: the power cabinet sooted, its breakers tripped and a cable burnt through; the telescope's mirror cracked and its lid bent; the tank split and frosted, its gauge at nothing; the thruster's grid cracked and cold, then blue in every hole; the jump ring torn.

`test/world.test.ts` checks Graphite holds half again over everything chapter 1 takes (gear, both ships' repairs and the trade) within the Drill Mk 1's reach.

**The starship's hold:** 24 slots of 50, on the Starship tab. Docked, stacks move between it and the lander's cargo ("Unload the lander's cargo here"), and repairs aboard draw on it. On the ground it can be looked at, not touched.

**How far the ship can go is set by its tank, not a rule.** Each trip has a fuel cost; if the tank can hold it, the ship can make it. Printing a bigger tank (a module) reaches the next ring of worlds. Level 1 reaches the sister moons (the first trip, to Mycel, burns 6 of 10).

**What a trip costs depends on timing** (to build). Every world moves on its true orbit on a game clock. Between two orbits, a trip costs least at its launch window and more the further you are from it (up to about 3×), as real mission planners find. So with a tank that's only just big enough you wait for the window; with a bigger one you can go early and pay more. Rough costs from Graphite at the window (estimates for the cheapest transfer between the orbits, before the giants' gravity, which adds a flat amount):

| Trip | Rough cost (km/s) | Tank level |
| --- | --- | --- |
| Mycel, Cardia (sister moons) | ~1–2, window always open | 1 |
| Brine | ~4 | 2 |
| Talus | ~9 | 3 |
| Indigo's moons | ~10.5 | 3 |
| Prism, Ember, Rime | More, or a chain of shorter trips | 4+ |

Windows come round every few days for sister moons, and from minutes to about two hours of play for the planets (Indigo to Rime is the longest), with the clock at about 26 game days a minute of play. **The clock runs only while you play** (the spec rules out real-time timers), and a **Wait** button on the map skips to the window for a cost in supplies.

**Fuel:** water ice for now, for the lander and the starship. Long starship trips later need a rarer fuel from another world (@Hayk, Oct 17, 2026).

## The first star system

Built Oct 17, 2026 (`logic/starSystem.ts`, the star map in `scenes/SystemScene.ts`), by the life rules in [inkmine-xenobiology.md](inkmine-xenobiology.md): plants and animals only in the habitable zone, on worlds big enough to hold air; life under a crust only on a giant's moon, where tides keep water liquid; everything else dead; carbon and water in this system; one breathable world. `test/starSystem.test.ts` holds the data to those rules.

**The star** is an orange dwarf (luminosity 0.45 of the Sun's, mass 0.78). Orange dwarfs are what researchers rank as the best hosts for life: long-lived, steady, and much calmer than red dwarfs, whose flares blast their planets (Cuntz & Guinan, 2016). The game calls it "the orange star": the prospector doesn't know its name.

**The zones.** The habitable zone runs from 0.50 to 1.19 AU (the wide "recent Venus" to "early Mars" edges of Kopparapu et al., 2013, scaled by the star's brightness). Water freezes past the snow line, about 1.8 AU, where ice giants form. AU and Earth masses are the docs' units only: the game never names Earth.

| From the star | World | Kind | Mass (Earth = 1) | Air | Chapter |
| --- | --- | --- | --- | --- | --- |
| 0.12 AU | **Ember** | Dead: one face always to the star, its night side molten | 0.6 | Carbon dioxide, sulfur gases | 6 |
| 0.30 AU | **Prism** | Dead: too small to keep air; glints like glass | 0.07 | None | 5 |
| 0.56 AU | **Talus** | Living, sparse: the zone's warm edge, losing its water | 0.45 | Thin carbon dioxide | 4 |
| 0.78 AU | **Brine** | Living: nearly all sea, purple with life | 1.1 | Nitrogen, carbon dioxide | 3 |
| 1.05 AU | **Sepia** | Ringed gas giant, not landed on. It formed farther out and drifted in, as many real giants do, bringing its icy moons, which is why Graphite has ice | 95 | — | — |
| ↳ moon | **Graphite** | Underground: too small for air, kneaded warm by Sepia's tides | 0.03 | None | 1 |
| ↳ moon | **Mycel** | Living: green under a spore haze | 0.3 | Thick carbon dioxide, spores | 2 |
| ↳ moon | **Cardia** | Living: the living planet | 0.5 | Rich in oxygen: **breathable** | 10 |
| 3.4 AU | **Indigo** | Ice giant, not landed on, past the snow line | 15 | — | — |
| ↳ moon | **Umbra** | Under ice: an ocean kept liquid by Indigo's tides; plumes from the cracks | 0.015 | None above the ice | 9 |
| ↳ moon | **Pumice** | Dead: so porous it would float on water, like Saturn's moon Hyperion (density 0.54 g/cm³, over 40% empty space; Thomas et al., 2007) | 0.0001 | None | 7 |
| 9 AU | **Rime** | Dead: alone, no giant to knead it, frozen to the core | 0.004 | A trace of nitrogen frost | 8 |

That's 4 living worlds, 2 with life under a crust, 4 dead and 2 giants. Two ice worlds with opposite fates: Umbra kept an ocean because Indigo squeezes it; Rime froze solid. In Graphite's sky, Sepia hangs over the horizon with Mycel (green) and Cardia (red) beside it: worlds you can't reach yet, from the start.

**Your ship** circles Graphite. It came out of the wormhole broken and braked into orbit round the nearest ground before its systems failed. The ship flies between worlds; the lander goes down to them. Getting its jump drive back is the long game (see "The way home", and "Your starship and travel" below).

**The star map** is drawn from the ship's telescope: the star's disc at the left edge, the worlds along a line by distance on a log scale (or the inner four would sit on top of each other), the habitable zone washed in highlighter, the snow line dashed, each giant's moons hanging from it, and your ship by Graphite. On a phone held upright it runs down the page. Tap a world for its card: what kind it is, its air, the scan ("carbon · water"), what the telescope sees, and whether you've been. Every world's line is something real instruments could tell from orbit (air from its light, plumes, a night side's glow), so the map never knows more than the ship could.

**Chapters follow the tank, not distance from the star.** Each chapter's world is the next one the starship's tank reaches from where you are: Graphite's sister moon Mycel first, then the next planets in and out.

## The ten planets

Each planet is its own world, with its own shape, people and language, and adds one mechanic while keeping everything before it. Who lives on planets 2–10 is to design, one planet at a time.

| # | Planet | Biome | New mechanic | Given gear | Creatures | Giant | Signature material |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Graphite | Grey cratered moon | The basics: drilling, ore, firedamp, the life system, repairs, the first language | Starter set | None: a bare rock (Oct 17, 2026) | None | Graphite, pencil lead |
| 2 | Mycel | Fungal jungle | Growth: fungus slowly grows back over tunnels; cap mushrooms bounce you; spore pockets catch fire from a blast | Spore filter | Puffballs (spitter), snap tendrils (dropper) | The Mother Mycel, a heart you mine your way around | Amber with alien insects in it |
| 3 | Brine | Island crust over a flooded underworld | Water and air: breaking into an aquifer floods the tunnels; you swim, and underwater air drains fast, refilled by bubble capsules (Mr. Driller) | Rebreather | Rasp eels (lunger), bubble jellies (flyer), shore crabs (harmless) | The Leviathan, asleep in a flooded cave | Brine pearls |
| 4 | Talus | Red mesas and dry gullies | Gravity: loose rock and boulders fall when you dig under them, and crush creatures | Blasting charges | Boulder beetles (mimic), sand skates (burrower) | The Rockslide, which sheds boulders as it walks | Hematite, "blood ore" |
| 5 | Prism | Crystal caverns | Resonance: hit a crystal and every touching crystal of its colour shatters at once | Tuning fork | Shardlings (hurt only while glowing), refractors (beams bounce off crystal) | The Crystal Queen | Singing quartz |
| 6 | Ember | Volcanic world | Lava: flows like water, burns; lava meeting water turns to obsidian; heat as a hazard | Coolant foam | Magma slugs (burning trails), cinder bats (flyer) | The Salamander | Diamonds, in kimberlite pipes |
| 7 | Pumice | Light, porous moon | Low gravity: long floaty jumps, slow falls, drifting rubble | To decide | Drift moths (flyer), regolith hoppers (walker) | The Grazer, a floating giant | Helium-3 |
| 8 | Rime | Ice world | Ice: slippery floors, frozen blocks only the lance melts; cold as a hazard | Thermal lance | Frost mites (swarm walker), ice wyrms (burrower) | The Hoarfrost, a giant ice spider | Fire ice (methane clathrate) |
| 9 | Umbra | An ocean under an ice shell (was: the dark side of a tidally locked world) | Darkness: only your lamp, flares and glowing minerals give light | Flares | Lurkers (strike from the dark), glow lures (mimic ore glints) | The Listener, which hunts by the sound of digging | Willemite, which glows green |
| 10 | Cardia | A living planet | Heartbeat: every few seconds a beat shakes the ground; every earlier mechanic returns | — | Antibodies (chasers), veins that pump fluid | The Heart | Heartstone |

Order follows the starship's tank (Oct 17, 2026): the cheapest trips first, so each chapter's world is the next one a bigger tank reaches (see "Your starship and travel"). It still keeps the dependencies: water (Brine, 3) before lava (Ember, 6) so lava-meets-water reads; darkness (Umbra, 9) is the hardest; Cardia, the sister moon you could see from the start and the one world you can breathe on, is last.

**What makes a planet unique** (a checklist for designing each one): its world has its own shape, not just new colours; one mechanic that changes how you dig; its own people with their own language, wants and look; its own fuels for the drill and life support; and a reason, in the story, to be there.

## Graphite (chapter 1, free)

A grey moon of soft dark rock, pocked with craters, with a ringed planet hanging in its sky.

**Why its ore lies where it does** (realism pass, Oct 17, 2026, in [inkmine-research.md](inkmine-research.md)). Graphite is a small Mercury: when it was young and molten, graphite was the only mineral light enough to float, so it set as a crust at the top, which is why its seams lie near the surface. Its crust is dark and low in silica, so clear quartz grows only in veins in the stone. It once had groundwater, warmed by the ringed planet's tides: native copper formed near that old water table, galena below it, and the water that's left is ice in the shadowed crater and the cold ground. Native silver is most common near the surface in real ore bodies, but deep veins exist; here it's kept deep, as the ore that pulls you down. The depths are compressed (real ore zones span hundreds of metres to kilometres; Graphite is 160 m deep), but the order is real.

| Region | Where | What's there | Opens with |
| --- | --- | --- | --- |
| The crash site | Surface and soil under the lander | Copper, ice; no creatures; a vault (Pack) | Start |
| The crater rim | Surface, far side | The Lamplighter outpost, inscriptions | Walking over |
| The lead seams | Soil and the first stone, near the lander | Graphite seams, firedamp | Start; stone with the Drill |
| The old crew's base | Half-buried under the old workings | Old charges, logs, a time capsule in the blast, a broken drill to study | Clearing the cave-in |
| The grey band | Stone, mid-depth | Galena, quartz, standing stones | The Drill |
| The deep | Deepest stone | Silver, the Lamplighters' deep post, a vault (Jetpack) | The Drill, a good cell, routes back |
| Below | Deep rock | Rich veins and a vault, for a later drill | A return visit after chapter 1 |

Graphite's existing levels 1–5 (`level/planet1.ts`) become the first regions: their rooms, fissures, vaults and items move into one world definition.

## Mycel (chapter 2, the full game)

Built Oct 17, 2026, as the first step of chapter 2: travel there, its world, its ores, its Mk 2 gear, two of its three mechanics, its creatures and the Mother Mycel (see Creatures), the Aster's pulse (see Weapons), and the chapter's ending, the Aster's camp (see "The ending"). Still to come: fungus growing back over tunnels, and the spore filter.

Graphite's sister moon round the ringed giant, big enough to hold air: a fungal jungle under a thick haze of carbon dioxide and spores. Green from space and in its sky; violet underground, its soil peat of fungal matter, its stone limestone. The Aster's lander lies wrecked in the coal swamp, its crew's gear thrown round it, each broken piece a Mk 2 design to study.

**Why you go: a distress call** (Oct 17, 2026). The moment the starship's power is mended over Graphite, its radio picks up the Aster's beacon (a "Distress call" card, beat `distress`): not words but a pattern of pulses, with a picture folded in, an eight-pointed star falling into a green circle. Nobody needs a language for that. The dish puts it on Mycel, and the pulses' own count says it has been calling for years. It's the reason to fly there before you know anything else about the moon, and it runs through the cards that follow: the star map's Mycel card says the call comes from there, the course card and the orbit card mention it, and the demo-end card offers it as the hook.

**Following it down.** On landing, the goal is "Follow the Aster's distress call with the receiver": the same hot-and-cold bars as the Lamplighters' call, now pointing at the wreck, 100 tiles east of the lander (faint, one bar, at the lander; static if you set off west). Walking up to it on the ground opens "The Aster lander" card (beat `asterFound`): no one inside for years, and pictures scratched into the shell for whoever came, showing the pod falling, its pieces flying out round it and sinking into the ground, and small figures walking away east. Then the HUD leads to their resonator lying just east of the wreck (study it, print the pulse), then their drill, and the rest of their gear, all round the wreck. The beacon arrow points to the nearest part whose design isn't learnt yet.

**Getting there.** With the ship whole and 6 units in its tank, Set course on the star map's Mycel card flies there (the "Course set for Mycel" card, "the end of chapter 1"), and the ship's page opens docked over Mycel with an "In orbit over Mycel" card. Land goes down; the first landing has its own card ("a green moon, alive"). Without the full game the same button ends the demo with an offer to unlock it (the demo-end card's Unlock button calls the host's checkout).

**Its fuels** (`logic/worlds.ts`): water, liquid here, for life support and both tanks (split as ice is on Graphite), and lignite or carbon for the cell (a carbon fuel cell burns either). A gauge can take more than one fuel: the main one is named, and feeding takes whichever is in the bag, main first; the battery refills the same way. Ice and graphite aren't found there. The lander's stores refill from the world you're on.

**Its ores** (`logic/ore.ts`, ids 7–13): malachite (copper carbonate, banded green), pyrite (iron sulfide, brassy cubes), calcite (limestone's crystal, clear rhombs), amber (fossil resin with tiny fliers in it, the signature material), lignite, water, and carbon, which never lies in the rock: it comes off caps. Each has its own glyph (`art/oreArt.ts`; carbon's is porous char with the gills still showing).

**The Mk 2 set** (`logic/blueprints.ts`):

| Piece | Materials | What it's made of |
| --- | --- | --- |
| Cell | 5 pyrite, 3 malachite | A pyrite cathode on a copper collector, as real lithium–iron disulfide cells are built |
| Pack | 5 lignite, 2 amber | Coal-pitch carbon fibre bound in amber resin |
| Drill | 6 pyrite, 4 malachite | An iron bit with copper windings |
| Helmet | 4 calcite, 2 amber | An optical calcite visor under an amber filter |
| Jetpack | 5 lignite, 3 pyrite | A carbon nozzle pressed from lignite, on iron joints |
| Suit | 6 calcite, 3 amber | Mineral wool spun from calcite (as rock wool is from limestone), bound in amber |

**A step behind.** You arrive with Graphite's Mk 1 drill: Mycel's peat costs 2 a block and its stone won't break, so the way in is the peat and the caves until its drill is printed. The HUD leads: follow the distress call to the wreck, find the Aster's broken drill near it (beacon), print it, then study the rest of their gear ("Mk 2 designs 2/6"), then follow the crew's trail to their camp (see "The ending").

**Its mechanics:**
- **Caps** (`TILE.cap`): solid, soft as soil to drill, standing on the surface (the cap forest) and on cave floors. Jump off one and it throws you about five tiles up; land on one from a fall and it gives back half the speed, so you settle in a bounce or two; hold down and it doesn't bounce you. **Drilled, a cap gives two pieces** (Oct 17, 2026, `CAP_YIELD` in `logic/mine.ts`): carbon, its flesh charred by the drill's heat, for the cell, and water for the air. That's real: a fungus is about nine parts water, and the rest is mostly chitin, which chars to nearly pure carbon, the fuel a direct carbon fuel cell burns. **They look nothing like a mushroom at home** (`art/mycelGround.ts`): a swollen, see-through bladder of water, veined inside with a waterline sloshing in it, drawn up to a crown of fleshy horns, standing on three root-legs that curl out to the ground, with fine threads hanging from its belly, each tipped with a bead of light. The giant ones on the horizon are the same bladders on tall stalks.
- **Spore pockets** (volatile 4): hollows of dry spores in the peat. Drilled, they only puff, a choking cloud that costs 12 air; a blast reaching one sets the dust alight and it bursts like firedamp. Firedamp here gathers by lignite seams.

**Regions** (`content/planet2.ts`, 240 × 144, the lander at column 40):

| Region | Where | What's there | Opens with |
| --- | --- | --- | --- |
| The landing glade | Round the lander | Water and a little lignite close under the peat | Start |
| The cap forest | Columns 60–120 | Caps along the surface, on the walk to the wreck | Start |
| The coal swamp | 120–170 | Lignite seams and firedamp; the Aster lander at column 140, a furrow ploughed west of it | Start |
| Round the wreck, in the peat | 127–163 | The broken Drill west along the furrow, the Pack in the hollow under the wreck, the Cell in a cave east among spore pockets, a second drill past it | Start |
| Under the wreck, in the stone | 128–150, 36–74 m | The Helmet down a sinkhole sealed in limestone, the Suit in a grotto, the Jetpack deep in the amber (stone walls, a soil door) | Mycel's drill |

Every part lies within 25 columns of the wreck (decided Oct 17, 2026: spread round the whole moon, the search had no shape; the call leads you to the wreck and the wreck is where you search).

**Its look:** a violet ground style; a hazy day sky, green-grey overhead and warm at the horizon, the orange star a soft disc, Sepia huge and faded with Graphite and Cardia beside it, spores drifting as specks of light (`art/mycelSky.ts`); three ranges of fungal forest along the horizon, giant caps and bare trunks, the far ones lost in the haze; caps and spore pockets drawn into the ground (`art/mycelGround.ts`).

**The Aster lander** (`art/asterWreckArt.ts`, drawn in the world by `scenes/game/crashView.ts`, the world's `crash` column): a ribbed ceramic pod like a seed head on claw legs, tipped forward on a folded leg, split open, a fan of petal thrusters under it, torn petals in the furrow, threads of fungus climbing it, its beacon a glass bead on the crown that flashes teal.

`test/world.test.ts` checks Mycel as it checks Graphite (fuels near the lander, every design reachable with its drill, three times the Mk 2 set's materials), that its drill and twice its materials are within reach of Graphite's drill while its stone vaults aren't, and that every part lies round the wreck, which lies within the receiver's range of the lander.

### The ending: the Aster's camp

Decided with @Hayk on Oct 17, 2026: one of the crew is alive, asleep, and waking it points the way to the next world.

1. **The trail** (goal `trail`). Once the six Mk 2 designs are studied, the receiver picks out a second, fainter signal under the beacon's pulses, slow as a heartbeat, and the HUD says to follow it. It's the same hot-and-cold bars as before. It leads east, 74 columns past the wreck, to a shaft the crew dug down into the peat, its mouth grown over with a skin of peat since. When the bars say "right here", the beacon arrow points down at the camp, and one tile of drilling opens the shaft.
2. **The camp** (beat `asterCamp`, the card "The Aster camp"). At the bottom is a cave they sealed against the spores with amber resin. Three woven-cord bedrolls lie in it, empty. Pictures scratched in their plum ink on the wall show what happened: they built a small craft from the lander's petals, three of them flew off in it towards a blue world, and one lay down in a pod to wait. That pod is in the corner, its glass glowing a weak teal, and the suit reads its cell as nearly flat. This is why the beacon kept calling.
3. **The charge** (goal `wake`, `WAKE` in `logic/story.ts`). The pod's cell is a glass prism on a pyrite cathode, as all of theirs are. It needs 6 pyrite and 4 calcite, carried in the bag. Those ores stay in the bag at the lander until the pod has them, as the Lamplighters' silver did. Walking in with them, the pod takes them.
4. **The last of the Aster** (beat `asterWoken`, the card "The last of the Aster"). The pod's petals open and its sleeper unfolds: the first alien you meet who is a castaway like you. It speaks in flashes of light from the glass on its crown, the same pulses as the distress call. It scratches the story again in the peat: three of its crew, the craft, the blue world. It's **Brine**, the sea world on the star map. They promised to call back and never did. It taps your suit, then the blue world.
5. **The end of chapter 2** (goal `brine`). The HUD says the crew flew to Brine years ago and never called back, and asks you to fit the tank the Aster drew, which is how chapter 3 begins (see "Brine"). The star map's Brine card says the Aster crew flew there. The Aster stays at its camp, by its open pod, keeping the beacon going in case they come back. Walking in again, its crown flashes at you.

The camp's cave is at column 214, depth 12–16, with the shaft at column 209 (`content/planet2.ts`, world version 2). `scenes/game/campSite.ts` draws the camp, the pod and the Aster; the cards are in `scenes/hud/campCards.ts`; the pictures are in `art/aster/camp.ts`.

### The Aster

Another people who fell through the wormhole, years before you, and the first aliens you find. "The Aster" is your name for them, for the eight-pointed star they sign everything with; nobody yet knows what they call themselves, and their writing (rosettes of strokes round a centre, in a dark plum ink) can't be read. On Mycel you find their lander, their gear and pictures of the crew walking east, and at the end of that trail, the last of them, asleep (see "The ending").

**Their bodies** (Oct 17, 2026, `art/aster/camp.ts`): nothing like yours. Small, about two-thirds of your height. A ribbed, seed-shaped shell like their lander, bone-white glazed with lilac, on six thin jointed legs splayed round it. Two long, fine forelimbs end in three digits. They have no head: a ring of small eyes runs round the top of the shell, and on the crown, under a faceted glass dome, is a hexagonal organ that glows teal. They talk in pulses of its light, which is why their distress call is pulses. They're drawn in blue ink: never a danger.

**Their design language** (`art/aster/style.ts`), nothing like the guild's: things look grown more than built. Glazed ceramic, bone-white with lilac glaze pooled low, ribbed like a shell and arranged round a centre; joints lashed with dark red cord where ours are riveted; hexagonal glass with a cool teal glow where power runs; their star on everything. No rivets, no straight panel seams, none of the guild's cobalt and enamel.

**Their gear** (`art/aster/gear.ts`), as it lies broken on Mycel: a coring drill that cuts a ring with a crown of eight teeth; a cell that's a hexagonal glass prism with charge glowing in it; a pack like a lashed clam shell; a helmet of faceted glass on a ribbed collar with their star for a crest; a jetpack that's a fan of four petal nozzles round a glass heart; a suit of overlapping shell bands over woven cord. Studying one gives a Mk 2 blueprint, but the printer builds it your way, in your shape, borrowing their ideas (see "The prospector's look", Mk 2). Every species met later builds in its own way like this, and its technology can be studied the same way.

## Brine (chapter 3, the full game)

Decided with @Hayk on Oct 17, 2026: the three Aster crew who flew to Brine are alive. Their craft sank in the sea, and Brine's own people, an ocean people, pulled them out. They live with them now and can't leave. The ocean people can't make fire, so they can't get metal: they ask you for it and pay in knowledge. The starship's bigger tank, the one Brine needs, comes from the woken Aster. This first step builds the spine: the tank and the trip, Brine's world, ores and water, swimming, the Mk 3 gear and the story up to the crew's craft flying again. @Hayk asked for a longer story and a bigger world than Mycel's.

Finished on Oct 18, 2026, with @Hayk's choices: the crew go home **by way of the deep** (their craft's drive crystal lies by the Leviathan; fetched, they fly home to Mycel, the four Aster meet again, and their star chart points to Talus, chapter 4); the Leviathan **sleeps and is avoided** (noise wakes it); the Tidesingers' language waits for a **game-wide language system**, built later for the Lamplighters and the Tidesingers together. Built: Brine's creatures (`logic/seaFauna.ts`, art in `art/creatures/` and `art/brineFauna.ts`), the Leviathan and its cave, the crystal, the flight home and the reunion (`scenes/game/storySites.ts`, which holds every story place's visits now). `test/seaFauna.test.ts` and `test/brineEnd.test.ts` check it.

Built Oct 18, 2026 (`content/planet3.ts`, `logic/water.ts`, the reef and craft in `scenes/game/brineSites.ts`, their cards in `scenes/hud/brineCards.ts`, the art in `art/tidesinger/`, `art/asterCraftArt.ts` and `art/brineSky.ts`); `test/brine.test.ts`, `test/water.test.ts` and the Brine part of `test/world.test.ts` check it.

A sea world in the habitable zone, a little bigger than the prospector's own (1.1 masses), with air of nitrogen and carbon dioxide. Its sea is purple: the microbes floating in it catch light with retinal, as Earth's first ones may have, and make no oxygen ("Purple Earth", DasSarma and Schwieterman, 2018). Islands of salt-crusted basalt stand out of it; under them and under the seabed the rock is full of water.

### The story

**On Mycel: the Aster's tank.** Woken, the last of the Aster scratches one more picture in the peat: its crew's craft, and the tank they built for it from the lander's petals, a long jar wound in fibre. Your ship's tank holds 10, enough for a sister moon; Brine needs 14. The suit records the drawing as a design (`aster-tank`), and the Starship tab gets an **Aster tank** slot: 10 lignite (pitch carbon fibre), 4 amber (the resin) and 4 calcite (a ceramic liner), fitted aboard. It doubles the tank to 20. Real big rocket tanks are carbon fibre wound over a thin liner. Then fill it, and set course for Brine on the star map.

1. **Fit the Aster's tank** (goal `brine`, the step that was "the end" of chapter 2).
2. **Fill the ship's tank** for Brine (14 units of water).
3. **Set course for Brine.** The trip burns 14 either way, from Mycel or Graphite. The orbit card: a purple sea, islands; on the reef east of the biggest island the telescope picks out something bright, glazed lilac, half under water.
4. **Land** on the Landing Isle. The first-landing card: the lander can only come down on rock; everything else is sea.
5. **The craft** (goal `craft`). The beacon arrow points to the bright thing on the reef: you swim out to it. Reaching it opens "The Aster craft" card (beat `craftFound`): empty, flooded to the roof, its radio drowned. Radio waves die within a metre or two of seawater (real: submarines can only hear the slowest radio waves), which is why the crew never called back. Scratched inside: the craft sinking, three small figures swimming, and great wide shapes rising under them and carrying them down.
6. **The song** (goal `song`). Radio is dead in the sea, but sound isn't: it carries for hundreds of kilometres in water (real: whale song crosses ocean basins in the deep sound channel). With your helmet under water the suit hears a song, slow and huge, and gives it as bars, hot and cold, like the receiver; out of the water it hears nothing. It leads east and down, through a cave in the seabed, to the reef where the ocean people live.
7. **The Tidesingers** (beat `reefMet`). Your name for them, for the song. They meet you at the mouth of their reef and won't let you past. One draws in the sand what they want: copper, from inside the rock they can't break. Behind them, through the water, a pale dome glows with three small shapes in it.
8. **Copper for the Tidesingers** (goal `reefTrade`): 8 native copper, carried in the bag and kept there at the lander until they have it. Native copper needs no fire: people on Earth hammered it cold into tools 7,000 years ago. Paying (beat `reefPaid`), they show you how they bore stone: a copper tube spun on wet sand, which is how the Egyptians drilled granite. That is the **Drill Mk 3** design. Then they lead you in (beat `crewMet`, "The Aster crew"): an air bell under the reef, held up by the Tidesingers, who carry air down to it in bladders as a diving bell spider does. The three Aster are in it, thin and tired. They learnt from the Tidesingers to scrub breath with salt, and draw it for you: the **rebreather** design.
9. **Print the Drill Mk 3** (goal `print:drill-3`). Brine's basalt won't break for Mycel's drill.
10. **Print the rebreather** (goal `rebreather`, a tool: 4 halite, 3 copper). Real rebreathers scrub the carbon dioxide from your breath with soda lime, made from salt, and recycle the rest, so how deep you are stops mattering (see "Water and air").
11. **The drowned village** (goal `explore:3`). The Tidesingers' old village lies under the shelf west of the reef, flooded and given up long ago. Their broken tools lie in it, each a Mk 3 design ("Mk 3 designs 2/6"): stone, shell and glass, no metal anywhere.
12. **Raise the craft** (goal `raise`). The crew want to go home, or at least to go on. Their craft has to come up first: its hull is cracked. Bring the crew 10 magnetite from the basalt for the patch (kept in the bag), and the Tidesingers fill bladders under it and float it up (beat `craftRaised`, the card "Up from the reef"). Real salvors raise wrecks with lift bags.
13. **A new heart for the craft** (goal `heart`). Its cell drowned. Their cells are glass prisms on a cathode; on Brine that means 6 manganese nodule and 4 brine pearl, carried to the craft, now floating over the reef (beat `craftMended`, "The craft's heart").
14. **The drive crystal** (goal `crystal`). The craft hums but won't rise: its drive crystal, the glass that turns the cell's power into lift, fell out through the split keel and down a crack in the reef into the Leviathan's cave (the card "The craft's heart" now ends on the crew's drawing of it). The beacon points to it. Dig down quietly from its end of the cave and swim to it (beat `crystalFound`, the card "The drive crystal"): touching it takes it.
15. **Bring it to the craft** (goal `flight`). The crew slot it in and fly home to Mycel (beat `craftFlown`, the card "Home"). The craft is gone from Brine.
16. **Back to Mycel**: fill the ship's tank (14) and set course (goals `tripFuel:mycel`, `course:mycel`; the course card follows the crew's light home).
17. **The reunion** (goal `reunion`). The crew's craft stands landed among the caps over their camp; in the camp all four Aster are together (beat `asterReunion`, the card "Four again"). They give you their star chart, with a course drawn in to Talus, nearer the star, and point at the wormhole's mark: whatever they saw at Talus matters for the way home. The star map's Talus card says chapter 4 goes there.
18. **The end of chapter 3** (goal `brineEnd`).

### Water and air

Brine's new mechanic is water (`logic/water.ts`).

- **The sea** fills every open tile below sea level that it can reach. It never runs out, so a tunnel dug up into the seabed floods for good, as far as it runs below sea level.
- **Water in the rock** lies in sealed pockets and big flooded caves (aquifers). Break into one and its water runs out into whatever is lower, until both stand at one level, as water does in joined pipes. It never climbs over a rise: a pocket opened from above stays put. Real water behaves like this; the flood takes a few seconds, so you can get out of its way. Air trapped at the top of a cave stays as air.
- **Saved:** where the water stands is saved with the world, one bit a tile.
- **Swimming.** In water you sink slowly; jump swims up, and at the surface it lifts you out onto a ledge. You can drill while swimming. The jetpack doesn't fire under water.
- **Air under water.** The deeper you are, the faster the suit uses air: one more time over for every 10 m of water above your head, up to four times. That's real: a diver's air goes twice as fast at 10 m and three times as fast at 20 m, as the water's weight squeezes each breath. The **rebreather** recycles your breath, so with it depth doesn't matter. Air trapped in caves is somewhere to breathe normally.

### The world

Brine is 384 tiles round and 200 deep (Graphite 256 × 160, Mycel 240 × 144). Islands stand two metres out of the sea; between them the seabed lies 6 to 20 m down. Sediment (soil) runs to about 22 m under the seabed, basalt (stone) to about 110 m, then deep rock.

| Region | Where | What's there | Opens with |
| --- | --- | --- | --- |
| The Landing Isle | Columns 24–76, the lander at 48 | Fresh water under the island (an island's rain floats on the sea water under it as a lens), halite beds, native copper washed into the sediment | Start |
| The drowned village | The shelf, 90–132 | The Tidesingers' old homes under the seabed, flooded; their broken tools (Mk 3 designs): three in the homes, two in cellars walled in basalt | Swimming; the Mk 3 drill for the cellars |
| The reef | 140–162 | The Aster craft, sunk on its top | Swimming |
| The Tidesingers' reef | 196–222, 30–40 m down | Their home, flooded, reached through a cave in the seabed; the air bell with the crew | The song |
| The pearl banks | 240–300 | Old shell beds deep in the sediment and in the basalt: brine pearls | Mk 3 drill for most |
| Salt Isle | 300–340 | A second island: halite and fresh water | Swimming |
| The Leviathan's cave | 158–193, 83–92 m down, under the reef | The biggest flooded cave: the Leviathan asleep at its west end, the craft's drive crystal at its east end, 18 tiles past it, so you can dig down to it out of earshot | The Mk 3 drill, the rebreather (it's 10 m of water deep) |
| The underworld | Deep, all round | More flooded caves in the basalt, water pockets everywhere, jellies and rasp eels | Mk 3 drill |

**Its fuels:** fresh water for the air and both tanks, and manganese nodules for the cell. Real alkaline batteries have a manganese dioxide cathode, and manganese nodules cover real abyssal seabeds.

**Its ores** (ids 14–17), with native copper and water: manganese nodules (black, lumpy, in the sediment of the seabed), halite (rock salt in pink cubes, beds under the islands), magnetite (black iron oxide, magnetic, through the basalt) and brine pearls (the signature: nacre from old shell beds).

**The Mk 3 set:**

| Piece | Materials | What it's made of |
| --- | --- | --- |
| Cell | 5 halite, 3 nodule | A sodium-ion cell (sodium from salt) with a manganese oxide cathode, as real ones are built |
| Pack | 4 copper, 2 pearl | A copper-wire net, which real fish farms use as it stays clean in the sea, with nacre toggles |
| Drill | 5 copper, 4 nodule | A copper tube crown fed with sand, on manganese steel, the steel real rock crushers are made of |
| Helmet | 4 halite, 2 pearl | A rock-salt visor: salt crystal lets heat light through, so real infrared instruments use it |
| Jetpack | 5 magnetite, 3 copper | An iron pump with copper windings |
| Suit | 4 magnetite, 3 pearl | Nacre plates, the toughest natural ceramic, over an iron mesh |

The drill and its materials lie in the sediment, within reach of Mycel's drill.

### The Tidesingers

A sea people, clever, who never had fire: under water nothing burns, so they never smelted metal. What they make is stone, shell, glass and woven fibre. They need copper, and they can't dig it out of the basalt. They're ray-shaped: a broad, flat body that flies through the water on two wide wings, with two long lobes in front that unroll into hands (real manta rays unroll lobes like these to feed, and have the biggest brains of any fish). Their eyes sit on the wing's leading edge. They talk in long, low songs, the same song the suit follows. Drawn in blue: never a danger. Their language is for later.

## Inside the lander and the pause screen

There's no result screen and no level select in chapter 1.

- **Inside the lander** (L at the lander), laid out like No Man's Sky's inventory (ShipScene, Oct 17, 2026): a **Suit** and a **Ship** tab (tap, or Q / E). Each tab has a Technology plate of big slots with a drawn picture of what's fitted (`art/techArt.ts`), its Mk or level, and a corner flag (verdigris: an upgrade ready to print; madder: broken), then a separate Storage plate (the suit bag; the cargo). The suit's slots are the six gear pieces; the ship's are its Systems (the crash repairs, drawn broken until mended) and its Modules. Beside them stand the prospector or the lander, over a detail card for the slot in focus with its next step, its ore ticked off, and Print / Repair. A stack picked up on one tab can be put down on the other, or sent across with "To cargo" / "To suit bag". Back down is at the top right.
- **The pause screen is the inventory** (Oct 17, 2026): L, Esc or P away from the lander opens the Inventory page over the paused world, and the same keys close it. Recall is on it, top centre, with a note on what it costs. There's no separate pause card any more. Still to come on it: the survey sheet, the repair list and the field guide (with the lexicon and the logs).
- **Three tabs: Suit, Lander, Starship** (Oct 17, 2026). The Starship tab appears the first time you fly up to it: its systems, its hold, and its fuel panel. Aboard, the page is titled "Your starship" and its way out is **Land**.
- **The fuel panels:** the Lander tab's (the lander's tank, Refill, Lift off), under the cargo, and the Starship tab's (its tank, Refill, Star map), under its picture. Far from the lander they're look-only. Docked, the lander fills through the ship's tank, so its Refill waits until that tank is mended (on the ground it splits its own ice).
- **After chapter 1:** the star map ("The first star system") is where you choose the next world, and later the galaxy map past it (paid version).

## Art direction

**The bar (Oct 16, 2026, from @Hayk):** pen-drawn, but finished like a professional painting, never a doodle. That means an ink-and-watercolour illustration: deliberate line weight, washes that pool and granulate, light and depth. It applies to the interface too.

Ink and colour keep the three-ink rule from InkFish and InkCrab:

| Ink | Used for | Never used for |
| --- | --- | --- |
| Blue-black ink | The world, the prospector, the lander, the Lamplighters, harmless creatures, the interface's rules and headings | — |
| Madder red | Danger and loss only: hostile creatures, hazards that hurt, a blast radius, hearts, a low gauge | Ore or anything friendly |
| Highlighter | Things you can take: ore, gems, time capsules, logs, job items | Rock, creatures or people |

**The world** (`art/ground.ts`, `art/groundPaint.ts`, `art/skyArt.ts`):
- **Each grade is a watercolour wash** (`washTile`): seamless 256 px tiles that vary like real pigment, with granulation and faint blooms. Hatching in the open rock is light, and grows denser with hardness.
- **Light comes from above.** Every face open to the sky has a lit lip. Every ceiling's underside sits in a hatched core shadow with a heavier ink line, and casts a soft shadow on the back wall of the hollow under it. Washes are blurred at their edges; hatching stays crisp.
- **Depth:** the first metres under the surface are warm and sunlit; the deep is cooler and darker, so the lamp matters more further down.
- **Dug space is pale paper** with a faint back-wall wash, so tunnels read as tunnels, not sky.
- **The sky** is a night wash: an airless moon's sky is black even by day. It is indigo above and a warm glow at the horizon, with stars left as bare paper. A ringed planet and two small moons are painted as washed spheres with hatched night sides. Crater rims (`art/ridgeArt.ts`) sit in three ranges of aerial perspective, each nearer one darker, warmer and more firmly inked. Every peak is blocked in as a landscape painter would: the lit slope warm, the far side in cool indigo shadow cut by a spur from the summit, gullies scored into the lit faces, faint strata, a bright lip on the crest and dust hazing the foot.
- **The ground's dressing** (`art/surfaceArt.ts`): soft strata bands that wrap with the world, faint cobbles set in the rock (never firm enough to read as rock you can't drill), and stones half sunk in the dust along the open surface, each with its shadow. Ore sits in a darkened pocket, its crystals modelled in light and shade, marked with one curved highlighter stroke.
- **Sprites are painted, not filled** (`art/paint.ts`): each part gets a body colour, light rolling in from the upper left, a soft core shadow with light bounced back into its edge, pigment pooled at the wash's rim, a little hatching in the shadow, and a fine pen line. Metal and glass get a crisper terminator and a gleam.
- **Sprites get the scene's light and one silhouette** (`textures.ts`): warm from the upper left, cool to the lower right, a rim of light on the lit edges, then a single ink outline round the whole figure that swells on the shadow side. Interior lines stay fine, so the line weight has a hierarchy instead of every part being outlined the same. What's round a figure (the lander's shadow, smoke, a floodlight's glow) is painted after, so it isn't outlined.
- **Each planet has its own washes:** Graphite grey, Talus rust, Brine teal, Mycel violet, Ember black and orange, Rime pale blue.
- **Alien writing** is drawn in a darker, steadier ink than your handwriting, so the two never mix up.
- **Boiling lines** on the sprites (three redrawn frames), as in the other games.

**The interface** is a naturalist's field journal (`scenes/kit/`):
- **Plates:** laid paper with fibres and foxed edges, a firm outer rule and a fine inner one with its corners cut round a printer's lozenge, and a soft shadow. Each heading is in spaced capitals with a rule running off it.
- **Type:** EB Garamond for everything printed (headings, labels, running text, italic asides). Caveat is kept for what the prospector writes: notes in the world, news, the beacon.
- **Gauges:** sunk channels filled with a wash to their level (cerulean for air, gamboge for the cell, madder when low), ticked in tenths under a glassy rule, each with an engraved emblem.
- **Hearts** are washed in madder and **shield bars** are heater shields in steel blue; a part-charged bar fills from the bottom.
- **Buttons** are plaques: the main action washed in ink with paper-coloured capitals, a lesser one on paper, a loss in madder, and nothing-to-do faded.
- **Inventory slots** are wells pressed into the paper, each stack on a wash of its ore's colour.

## The prospector's look

A small alien in a suit, helmet and pack with a drill in hand, in blue like every "you" in the catalog. You can see them inside the helmet, with eyes that look where the drill points. They are no human: a broad, smooth head in cool mint, darker markings dappled over the crown (the ones the printer gets wrong), big dark eyes set forward, no nose, a small mouth, and lilac frills sweeping back from behind the jaw. The work suit is cobalt cloth with ochre leather (boots, gloves, belt, pouch) and an ochre fuel can and drill, so the figure reads at a glance against the grey rock. The art is in `games/inkmine/src/art/prospector/`, one file per part, and every mark of every piece, and the prospector at several loadouts and in every pose, is on the dev page `/specimens.html`.

**The character changes with the gear.** Every mark of every piece looks its own, on the character, in its lander slot and as a broken part in the world (`logic/gear.ts`, `art/prospector/`). The shape comes in three families, so progress shows in big steps:

| Piece | Mk 0–3: prospector | Mk 4–7: guild contractor | Mk 8–10: deep-space |
| --- | --- | --- | --- |
| Suit | Work suit: cloth, a belt, boots | A chest plate with the guild's stamp (a pick over a star), a domed shoulder plate, knee pads, capped toes | Overlapping armour plates, jointed knees, a forearm guard, sealed boots |
| Helmet | Glass fishbowl on a bolted collar, a lamp on the front (cracked until the radio repair) | The fishbowl in a protective cage, twin lamps, a radio with a whip antenna and an ear-piece | A hard shell with a wide tinted visor, a lamp strip and a sensor fin |
| Jetpack | A fuel can strapped on, one nozzle | A framed pack with twin tanks, two nozzles, a pressure dial and a fin | A sealed pod with vents and a gimballed nozzle |
| Cell | A tall battery with a charge window, on the back in front of the jetpack | A riveted box with a round charge gauge | A slim cartridge with a ring of light |
| Pack | A bag at the hip, a size up each mark | A stiff case on a frame | A hard sample canister with a lit band |
| Drill | A hand drill: pistol grip, housing, fluted cone bit, power cable from the cell | A heavy drill: finned housing, fore-grip, coolant canister, carbide teeth | A plasma lance: heat-sink rings and three prongs round an emitter; no cable |

Within a family, each mark is printed from its planet's materials (`art/prospector/marks.ts`) and has its own touches:

| Mark | Materials | Its own touches |
| --- | --- | --- |
| Mk 0, starter | Cobalt cloth, ochre leather, steel | Stitched patches, a zip and chest pocket, laced boots, a dented ochre can and drill, a small leather pouch, gamboge charge |
| Mk 1, Graphite | Carbon black and charcoal, copper, silver, quartz | Charcoal twill quilted across with copper piping, copper cuffs and toecaps; a copper hoop round a clear quartz bowl, a copper-wound antenna; copper terminals on a black cell, copper-orange charge; a black can with silver bands; a black drill with its copper windings showing and diamond grit on the bit; a carbon satchel on a copper frame |
| Mk 2, Mycel | Calcite wool, amber, malachite, pyrite brass, lignite | Our shape rebuilt with the Aster's ideas (their gear is what the suit learnt it from): ribbed shell-like plates, dark cord lashings instead of rivets, small hexagonal windows glowing teal, the eight-pointed star. A cream padded suit bound in amber, a ribbed malachite chest plate; an amber filter shade over the bowl pinned on a brass star, a malachite filter canister; a brass cell under a ribbed cap, its charge in three hexagonal windows; a ribbed lignite bottle with a brass dome; a malachite drill with a brass handle and an iron bit; a lignite bag bound in amber |
| Mk 3, Brine | Teal oilskin, brine pearl | Pearl buttons, a rope belt, waders, a snorkel up the helmet, a water jet on the drill, a net bag |
| Mk 4, Talus | Hematite red-brown, desert khaki | A dust scarf, a dust brim on the cage, rust |
| Mk 5, Prism | Clear and violet quartz | Facets, crystals set in the plate, the dial and the cage's crest, crystal lenses |
| Mk 6, Ember | Obsidian, diamond | Seams and fins glowing orange, a diamond stud, a heat shield over the cage |
| Mk 7, Pumice | Pale porous stone, helium-3 | Pores, rose helium-3 bands and a bottle on the helmet |
| Mk 8, Rime | Ice blue | Frost along the edges, fire-ice light |
| Mk 9, Umbra | Deep navy | Willemite seams glowing green |
| Mk 10, Cardia | Heartstone gold, deep red | A heartstone on the chest, the brow, the lance and the pod |

A broken part in the world is drawn at its blueprint's mark. Mycel's broken parts are the Aster's own equipment, not ours (`art/aster/gear.ts`).

Poses: idle, walk, drilling sideways, down and up, on a ladder, flying, and talking (a hand raised, the helmet tilted).

## The lander

The prospector's ship. In chapter 1 you watch it come back together: every repair shows on it.

| Stage | Look |
| --- | --- |
| The wreck | The tin can with a torn heat shield and a jagged gash (the hatch hanging open until the hull is plated), a crumpled bell still smoking, the dish snapped and hanging by its cable, the porthole dark and cracked. Not yet drawn: the tilt on a buckled leg |
| Repaired, one part at a time | The printer's glow in the porthole; the dish back up (radio); welded hull plates (hull); a clean engine bell (thrusters) |
| The tin can | Fully repaired, ready to fly: an enamelled, weathered can with a domed top on a descent stage wrapped in crinkled gold foil, four spindly legs, heat-shield tiles, one heat-tinted engine bell, a riveted porthole, a hatch with a ladder, RCS quads, a dish and a cobalt pennant |
| Refitted, the deep hauler | Later hull refits, as before: braced legs and a cargo pod, then a wider hull with twin engines and a crane |

Every look has the **ore hopper** on its right side, where the prospector tips the bag in to bank it.

### Lander modules

The ship's own upgrades, printed from resources like everything else (`logic/ship.ts`).

| Module | What each level gives |
| --- | --- |
| Cargo hold | More cargo slots (22, 28, 34) |
| Lift | A cable lift down one shaft from the lander; each level makes it longer |
| Hull refit | The lander's look and the next row of upgrades (after chapter 1) |

The ladder rack is gone (ladders can't be placed), and recall is free (it costs you a trip back for the bag).

## Controls

| Action | Keyboard / gamepad | Touch |
| --- | --- | --- |
| Move, dig, talk, read | Arrows / stick; push into a block to dig it, into a person or a text to talk or read | Virtual stick |
| Jump, jetpack | Space / A (hold in the air to fly) | Jump button (hold to fly) |
| Gadget | E / X; Q / LB to switch | Gadget button; tap the icon to switch |
| Feed a gauge | The inventory's Feed buttons, or click the gauge | The inventory's Feed buttons, or tap the gauge |
| Inventory and pause (aboard at the lander) | L, Esc or P / Start; the same keys close it | Bag button (says Aboard at the lander) |

Pushing to dig, talk and read keeps touch play to one stick and two buttons (built Oct 17, 2026, `scenes/hud/touchPad.ts`): the stick appears wherever the left thumb lands in the lower left; Jump and Bag sit bottom right. They show on a touch screen and hide once a key is pressed.

## Field guide

As in the other games, entries unlock the first time you meet them:

- **Minerals:** every real ore and gem, with real facts (hardness, where it forms, what it's used for).
- **Xenobiology notebook:** the invented creatures, drawn as specimen sketches. Proposed (Oct 17, 2026): each entry is invented but grounded in real science, with a scan line ("Carbon · water · chemical energy"), its convergent shape and its air, and a note in the prospector's voice that never mentions Earth (see [inkmine-xenobiology.md](inkmine-xenobiology.md)).
- **Lexicon:** every Lamplighter word you know, its knot glyph beside your handwriting.
- **Logs:** the old crew's logs and time capsules, in the order you found them.

## Content and monetization

Same model as InkFish and InkCrab:

- Chapter 1 (Graphite) is free and ends at lift-off; planets 2–10 are a $4.99 one-time purchase.
- Paid planets are server-only content served after the entitlement check (`content/` entry, `/api/content/inkmine`). Built Oct 17, 2026, as InkCrab's: Mycel's world is `content/planet2.ts` and Brine's `content/planet3.ts` (Oct 18, 2026), registered in the site's `content.server.ts`; an owner's game fetches it at boot and checks it (`level/validate.ts`) before installing it (`level/planets.ts`). Only the ground and where things lie in it are server-side: Mycel's art, ores, Mk 2 recipes and story text ship with the game, as saves keep only ores and blueprints they know. `test/paywall.test.ts` checks no client code imports the paid planets. The dev page plays as an owner with `DEV_UNLOCK=true`. On sale from Oct 18, 2026 at $4.99 (Stripe lookup key `inkmine_full`, created by `apps/web/scripts/stripe-setup.mjs`): the full game is Mycel and Brine, and later worlds come as free updates, as the terms promise.
- Nothing is ever sold for real money except the unlock: no currency packs, no energy, no boosts.

## Worlds: how they're made

Each planet is one file (`planet1.ts` … `planet10.ts`) holding one world definition, carved by a builder with a fixed seed, as InkCrab's beaches are.

- **A world definition** gives its size, seed, surface profile and the lander's spot; where the strata change; its regions; and the hand-placed parts: caves, vaults, the outpost, the old crew's base, old charges, texts, broken parts (each teaching a design), job items, the giant's arena; and how much of each ore and creature to scatter per region.
- **The builder** fills the rest, so the ground meets itself at the wrap's join.
- **A world test** checks: every repair and job item is reachable with the gear expected by then; enough of every material exists (three times what the story needs); enough words exist for each level; nothing needed sits in deep rock or bedrock.
- **The save** holds what changed, not the world (below).
- **Permanent ids** for regions, items, texts and words: never change or reuse one.

## Saving and loading

A world is never stored. Loading carves it again from its seed and lays the save's changes on top. Measured with the builder: 10 ms for Graphite (256 × 160), 38 ms for a 600 × 500 world. The ground is drawn only near the camera, so nothing slows down as worlds get bigger.

**Two saves, kept apart:**

| Save | Key | Holds |
| --- | --- | --- |
| Profile | `inkmine.profile.v3` | The bag, the cargo, gear marks, blueprints found, lander modules, the world you're at and the worlds you've landed on, play time and the goal last reported to the stats (`logic/save.ts`) |
| One per world | `inkmine.world.<id>.v1` | The world's version; dug tiles and ladders, each one bit a tile; ids of items banked for good (`logic/worldSave.ts`) |

The world save also keeps the bag left under its flag (a tile index and the inventory). Later: texts read, words known, jobs.

- **Only what changed.** A tile counts as dug when the builder made it ground and it's open now, whether drilled or blown out. The bit masks are packed as run lengths (LEB128 varints, base64): a few hours of tunnels on Graphite take a few KB, far inside the account limit of 64 KB per game. Big paid worlds will need that limit raised.
- **When it saves:** on banking at the lander, on banking something found, every 30 s of play while anything changed, going aboard, the suit giving out, and when the tab is hidden or the page closes. Packing is synchronous, so the last save gets written even while the page is closing.
- **Loading** starts the prospector at the lander. Items still in the pouch when the game closed weren't banked, so they're back where they were found.
- **Untrusted.** A mask that isn't exactly the world's size, a malformed run, unknown item ids: the world save is ignored rather than half-applied, and a broken profile falls back field by field.
- **Merging two devices** (when account sync arrives): digging only ever removes rock on Graphite, so dug masks merge by OR, and taken items and words by union. Inventories and gear come from the newer save. Talus (falling rock) and Mycel (regrowth) move tiles, so they'll need more than a dug mask.
- **Shipped worlds change only by adding.** The save says "this tile is open", never what was there. If a released world's layout moves, old tunnels open into different rock; that's harmless but odd, so bump the world's `version` and prefer adding over moving. Items are saved by id, so they survive changes.
- **The roof.** The ground's first surface is taken from the carved ground, before the save, so a shaft dug in an earlier session still reads as inside the planet, not sky.

## Stats: goals as levels

InkMine has no levels, so the site's level funnel follows the goal chain instead (`logic/progress.ts`). Each goal is one step, numbered in the order a player meets it, from "Repair the printer" (1) to "The end of chapter 3" (47). Brine's steps (31–47) were added after chapter 2's; step 30, `brine`, was chapter 2's end and is now "Fit the Aster's tank". Brine's last five (crystal, flight, the trip to Mycel, the reunion) were put in before its end step on Oct 18, 2026, before Brine was ever on sale, so no player had reached them; from now on, steps are only appended. The funnel needs no changes on the site.

- **A step starts** when it becomes the goal, and again at the start of each session, so "Tries" counts the sittings a goal took.
- **A step is beaten** when the goal moves past it. Its time is play time, counted only while the game is on screen and kept in the profile (`stats.played`), so a goal spread over three evenings counts all three.
- **Steps gone straight past** (the drill studied before the hull was mended, a tank already full) start and are beaten at once, at 0 seconds, so no step has fewer players than the one after it.
- **"Fly to Mycel (paid)"** is the buy: how many beat it is how many bought the full game. The last step is beaten as soon as it's reached, as it ends the story so far.
- **Saves from before the stats** pick up at their current goal without reporting the ones they passed.
- **Add steps only at the end.** The funnel groups by step number, so a goal inserted into Graphite's part renumbers every step after it, and stats recorded before the change no longer line up. New chapters' goals go after Brine's.

## Tech: what to reuse

| Need | Where |
| --- | --- |
| Tile ground, digging, chunked rendering | InkMine's own `logic/terrain.ts`, `scenes/game/groundView.ts` (already scales to big maps) |
| The wrap | InkFish's `logic/ring.ts` |
| Falling sand and rock | InkCrab's `logic/sandfall.ts`, `logic/dunes.ts` |
| Flooding water | InkCrab's `logic/water.ts` |
| Ice underfoot | `ICE.grip` in InkCrab's `logic/sim.ts` |
| Darkness | InkCrab's `logic/moon.ts` |
| Synth sound | InkCrab's `audio/synth.ts` |

New: the open-world save, the wrap in a tile grid, the life system, the repair list, people, dialogue and the lexicon, creatures that fight back, the galaxy map.

Copy what InkMine needs into `games/inkmine` first; extract a shared package once InkMine's versions settle.

## Out of scope

| Idea | Decision | Reason |
| --- | --- | --- |
| Procedural planets | Never | Hand-made worlds are the point: every planet unique |
| Mission lists, job boards | Cut | Needs come from the repair list and from people, in person |
| Dialogue trees | Cut | At most two or three short replies |
| Language puzzles | Cut | Understanding comes from finding and talking |
| Crafting trees | Cut | One recipe per piece, from raw materials |
| Collectible card upgrades, random rewards | Cut | Pocket Mine 3's card grind is what this avoids |
| Real-time energy timers, paid boosts, currency packs | Never | Clashes with the one-purchase model |
| Base-building | Cut | The lift is the only thing you build in the world |
| Fall damage | Cut | |
| Multiplayer | Not planned | |

## Build order

**Built Oct 15, 2026 (step 1, one world):**
- Graphite is one world 256 tiles round and 160 deep (`level/planet1.ts`) that wraps: the grid folds columns, the sim keeps everything folded, the carver's noise repeats round the ring, and the views draw each thing at its copy nearest the camera (`scenes/game/ring.ts`). The sky layers tile.
- Its regions are levels 1–5's hand-made parts placed round the ring: the crash site with the Pack's firedamp vault, the fissure down to the Drill's blueprint, the Helmet's deep-rock vault, the old charges' cave, the lead seams with the Cell's cave, and a deep vault with the Jetpack. A world test (`test/world.test.ts`) checks every item is reachable with its drill and the planet holds three times its gear's materials.
- The saves above, autosaving.
- Missions, contracts, blots, the result card and the level chart are gone. The game starts on the planet; L at the lander goes aboard (inventory and printer), and "Back down" returns.
- Not yet from step 1: the survey sheet.

**Built before (Oct 14, 2026):** on Graphite, before the open-world rewrite:
- Walking, jumping and drilling by pushing, with diagonal stairs; the jetpack; energy per block by grade and drill mark.
- The ground in three grades, chunk-rendered near the camera; ores as highlighter glyphs; the lander banking the bag; recall; hearts.
- Firedamp and old charges, chaining, with their blast area in red.
- Levels 1–5 carved by the builder, with rooms, fissures, vaults and items, and a reachability test (`level/reach.ts`).
- Missions and contracts, the bag and cargo inventories, the six Mk 1 blueprints and the printer, lander modules, result cards, local saves.
- The helmet lamp and depth darkness; the prospector in three looks per piece and the lander in three refits (`/specimens.html`); the Graphite sky.

**Next, for chapter 1:**

1. **One world:** ~~merge levels 1–5 into a single wrapping Graphite world; the open-world save~~ (done); the survey sheet centred on the lander.
2. ~~**The life system:** shield, hearts, life support, feeding gauges from the bag, the self-charging jetpack, dying, the dropped bag, recall~~ (done Oct 16, 2026; water ice added to Graphite, world version 2). The pause card was the start of the pause screen (Resume and Recall); since Oct 17, 2026 the inventory is the pause screen, with Recall on it.
3. ~~**The repair list** in place of missions; the wrecked lander and its repair stages; inside the lander in place of the result screen and chart~~ (done Oct 16, 2026, before step 2). Not yet: lift-off at the end (it waits for the Lamplighters and the core).
4. **The Lamplighters:** ~~the call, the receiver, the outpost, the first job by picture, the core for silver~~ (done Oct 17, 2026); still to come: speech with word-by-word translation, the lexicon, texts and the old crew's logs.
5. ~~**Creatures**~~: none on Graphite (Oct 17, 2026). Built on Mycel instead, with the Aster's pulse (see Creatures, Weapons).
6. **The rest of Graphite:** the old crew's base, the grey band, the deep; the drive core and lift-off; the opening and the ending.
7. Coach hints, sound, touch controls, account sync; add InkMine to the catalog with chapter 1 free. Sound and touch built Oct 17, 2026: calm synthesized ambience after No Man's Sky (a drone that darkens with depth, a warmer hum aboard, a sparse starry one on the map) and soft event sounds, all Web Audio with no files (`src/audio/`); M or the ♪ button mutes, saved.
8. ~~The first star system and its map~~ (done Oct 17, 2026: fuel, lift-off, docking, the starship's repairs and hold, first light, the first trip, the end of the demo). Mycel's first step built the same day (see "Mycel"), and Brine on Oct 18, 2026 (see "Brine"; the Tidesingers' language waits for the game-wide language system); next, the game clock, moving orbits and trip costs by launch window; then planets 2–10, one at a time, each with its people, and the galaxy map past this system.

## Decisions

Settled with @Hayk on Oct 13, 2026:

- **The run limit** is the drill's energy cell: every block costs energy. Upgradeable (the Cell).
- **Gear** is per planet: find the blueprint, hunt the planet's materials, build it. **Six pieces** per planet. (Since Oct 17, 2026, a blueprint is learnt by studying a broken part, not picked up.)
- **The planets** stay as listed.
- **Shared code:** copy from InkCrab now, extract a package later.

Settled with @Hayk on Oct 14, 2026:

- **No money:** ore is kept as resources; gear and modules are printed from them. No Man's Sky style slot inventories on the suit and ship.

Settled with @Hayk on Oct 15, 2026 (replacing the 100 levels, missions, contracts and blots):

- **Open worlds.** Each planet is a small open world, hand-made and truly different from the others. Graphite wraps around.
- **The story start:** a wormhole, a crash, the link to the guild lost; you begin by repairing the lander, which doesn't fly until the end of chapter 1. Lift-off ends the free version.
- **The wild wormhole and the way home** (Oct 17, 2026): the wormhole was natural, not steadied by your people, so it wrecked the ship and took part of your memory. You're in a part of the universe unknown to your species and understand none of its languages. The goal is to find home in the sky and gather enough to travel there.
- **Free version = Graphite only;** other planets are paid.
- **No linear missions:** the suit asks for what's needed; jobs are handed over in person, not from a board.
- **One race on Graphite**, the Lamplighters, whose language you learn through the radio: levels of understanding, from talking and from found texts (their inscriptions, the old crew's logs, time capsules).
- **Tunnels stay dug;** you go deeper over time. The lift is the shortcut home.
- **Life system from No Man's Sky;** dying reprints you at the lander, and the bag waits where you fell.
- **Drill energy and life support are refilled from raw materials** you carry.
- **No humans:** you are an alien, and so is the earlier crew. The local race came to Graphite to mine it.
- **No weapons at the start:** the lander is a mining ship. Weapon blueprints (hand weapons, later ship weapons) come from the local aliens.
- **Creatures live below the ground,** and weapons are what let you go deeper.
- **No result screen,** only the pause screen.

Settled with @Hayk on Oct 17, 2026:

- **Your ship is in orbit.** Chapter 1 ends when the repaired, fuelled lander flies up to it; the moon you crashed on is a satellite of a giant planet.
- **The first star system follows the life rules** (see "The first star system"). The layout built is the one proposed in [inkmine-xenobiology.md](inkmine-xenobiology.md) section 7, with names for the giants (Sepia, Indigo) and Pumice made Indigo's moon; it's built, so change it now if it's wrong.
- **Fuel is a tank with a bar,** refilled from ice aboard, not a one-off repair.
- **Travel** (see "Your starship and travel"): the starship travels and the lander goes down and up; its tank decides how far you can go, and bigger tanks are upgrades; ice now, a rarer fuel later; trips cost least at their launch window. The starship has its own tab, systems to mend (the telescope too, so the star map isn't there at first) and a hold. Chapter 1 ends with it mended and the first trip set, on the star map, as the end of the demo; the chapter order follows the tank (Mycel 2nd, Brine 3rd, Talus 4th, Prism, Ember, Pumice, Rime, Umbra, Cardia last).

## Open questions

- **The Lamplighters' look and name** are a first draft.
- **The prospector's alien look:** the drawing inside the helmet reads as human. @Hayk wants them much more different, not necessarily humanoid; concepts in [inkmine-xenobiology.md](inkmine-xenobiology.md) section 5.
- **Weapons:** how they work, their marks, and which depth band each one opens.
- **Graphite's size** (256 × 160 built) and how long chapter 1 runs; repair amounts and gauge drain rates.
- **Catalog progress** without blots: probably repairs done and words known.
- **Pumice's gear.** The jetpack was planet 5's given gear; it's now in the starter set.
- **Who lives on planets 2–10.**
- **The way home:** the pulsar map, memory fragments, and what the final journey needs (see "The way home").
- **Life rules** ([inkmine-xenobiology.md](inkmine-xenobiology.md)). Decided Oct 17, 2026: plants and animals only in the habitable zone, with life under ice the exception; crabs on some worlds; carbon + water most common, other chemistries in later systems; almost no air breathable for the prospector, with one or two twist worlds; the grit crab and rock-film food web on Graphite. Built Oct 17, 2026, to confirm: the first system's layout (4 living, 2 under ice or underground, 4 dead, with Umbra as an under-ice moon; see "The first star system"). Still proposed: creatures on dead worlds, a non-humanoid prospector (the tidewalker), Cardia as the breathable twist.
