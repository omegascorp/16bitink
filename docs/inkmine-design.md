# InkMine Game — Design Spec

Oct 13, 2026 · @Hayk · rewritten Oct 15, 2026 around an open world (see Decisions)

## Overview

A 2D side-view mining game drawn in ballpoint pen. You're a lone alien prospector for a mining guild, flying a mining ship that carries no weapons. There are no humans anywhere in the game: you, the crew who came before you and everyone you meet are aliens. On a routine jump your lander is pulled through a wormhole into a part of the galaxy no chart covers, and it crash-lands on a small grey moon. The link to the guild is gone. You have an energy drill, a patched-up suit and a wrecked lander, and the only way home is to dig up what the ship needs and fix it.

Each planet is a small open world: one hand-made cross-section of ground you can walk all the way around and dig as deep as your drill allows. Nobody gives you a list of missions. Your suit tells you what's broken and what it needs. Later, the aliens you meet hand you jobs in person, and you can only understand them once you learn their language. Every trip down is still push-your-luck: how deep you go and how full a bag you carry before the drill's cell or your air runs low. There's no money: what you dig is what you build with.

The third 16bit.ink game, after InkFish and InkCrab. It keeps the catalog's model (the first world free, a $4.99 one-time unlock) and its inks (blue for the world, red for danger, highlighter for pickups), but not their level shape: there are no levels, only places.

Design pillars:

1. **Pocket Mine simple.** Every block you drill costs energy, and firedamp in the rock turns a few smart hits into a chain reaction. Dig by pushing into the ground. Anything that needs a manual gets cut.
2. **Every trip counts.** Ore you bring back is yours. Everything is printed from resources, never bought, and every repair or new part opens something you can feel on the next trip.
3. **Big ground, readable ground.** The world is many screens deep. How hard a block is, what's worth digging and what will hurt you all read at a glance from the ink.
4. **Every planet is truly different.** Not one planet with new colours: each has its own shape, mechanic, people, language and reason to be there. No Man's Sky's planets feel like one planet reskinned, and this is the thing we don't take from it.
5. **Understanding is progress.** The alien you meet starts as gestures and strange glyphs. Every word you learn makes them make more sense, until you can talk back.

## Inspiration

Full notes in [inkmine-research.md](inkmine-research.md). What InkMine takes:

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

1. **The wormhole.** A short ink-drawn opening: the jump, the tear, the fall, the crash. You climb out of a smoking, tilted lander on the rim of a crater.
2. **The suit takes stock.** Its systems list what's broken. The printer is the first repair: it takes only copper from the crater walls, and nothing in the first area can hurt you.
3. **The radio.** The lander's radio and dish were broken in the crash. Repaired, it still can't reach the guild, but a call comes in at once (built Oct 17, 2026): a slow voice in knots nobody can read. The radio records it; the dish can't say where it's from, only that it's somewhere over the horizon.
4. **The receiver and the alien.** You print a handheld **receiver** (a suit tool: copper and quartz, no blueprint) and follow the call hot and cold: the HUD's "Next" plate shows its bars, and the suit notes "signal stronger" / "signal weaker" as you walk. There's no arrow while you search, nor while you dig for their silver; it points back to them once the core is waiting. At the outpost on the crater's far rim a Lamplighter meets you. You can't understand a word; they draw in the dust what they want: ten lumps of silver, from deep down, for a drive core.
5. **The hull and the thrusters.** Your suit asks for the parts as you need them. You can repair them in any order, and each one takes ore from deeper down.
6. **The drive core.** It cracked in the wormhole, and nothing you can print will fix it. The Lamplighters make one. As built: you bring them the silver in your bag (they take it from the bag), and once the hull and thrusters are mended they hand the core over; you fit it aboard. Later, when the language is built, the core waits for fluency and their last job as well.
7. **Lift-off.** The lander flies, the galaxy map opens, and the free version ends: "The drive works. Where to?"

**Those who came before.** You aren't the first ship to fall through. The **Aster crew**, prospectors of your own kind, came years ago and never left: their half-buried base, their unfired charges in the rock, their buried time capsules and their logs are scattered across Graphite. The logs are in your language, so they explain things and teach you Lamplighter words they had learned. They also carry the story's slow chill: the Aster crew were reprinted many times.

**Why you wake at the lander.** The lander's printer takes a scan of you every time you step inside. When you die, it prints you again from that scan. The bag was never part of the scan, so it stays where you fell. This is also why the printer is the first thing you repair. The Aster logs hint that being reprinted again and again isn't quite free ("Fourth time today. It got my markings wrong.").

## The world

Each planet is one hand-made world, a side-view cross-section like InkCrab's beach but much bigger and mostly underground. The surface strip at the top holds the lander, the alien outpost and the sky. Below is ground to dig, as deep as your drill can take you.

- **The world wraps.** Walk far enough east and you come back from the west: you're on a small moon. The join is invisible (InkFish's sea does the same, `logic/ring.ts`), and nothing is ever more than half the world away from the lander.
- **What you dig stays dug.** Tunnels and shafts are saved, so over time the ground near the lander becomes your own network of routes. Ore doesn't grow back. Instead you go deeper as your drill improves, and every layer down holds more and richer ore than the one above.
- **Regions, not levels.** The world is laid out in hand-placed regions (the crash crater, the Aster base, the lead seams, the deep), each with its own ore, creatures and things to find. Harder rock and darker depths gate them, not menus.
- **The survey sheet** in the pause menu shows what you've seen, centred on the lander, with the wrap drawn as the sheet's two edges meeting.

Tiles are 32 px; a 1280 × 720 view shows about 40 × 22 tiles. Sizes to tune in playtests:

| Planet | Around × deep (tiles) | Screens |
| --- | --- | --- |
| Graphite | 256 × 160 (built) | ~6.5 around × 7 deep |
| Later planets | Bigger, each its own shape | Tall on Pumice, mostly sea on Brine, and so on |

The ground is layered in strata that get harder and richer with depth, broken up by caves, pockets of loose rock, the planet's own features and set pieces: the alien outpost, the Aster base, a crashed probe, a creature nest.

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
| Loose rock, boulders (from planet 2) | Round outlines | 1; falls when undermined | 1 | 1 |

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
| Firedamp | Natural: pockets of methane trapped in the rock, the old hazard of coal and graphite mines, mostly by graphite seams | Drilling one opens it: it hisses and bursts 0.7 s later, breaking a 3 × 3 area |
| Old charge | The Aster crew drilled it into the rock and never fired it | A tap on its detonator arms it; 1.4 s later it breaks a 3 × 3 area |
| Line charge | Aster charges on detonating cord along a seam | Breaks its whole row, four tiles each way |
| Each planet's own | Planet 3 on | Spore pockets on Mycel, magma blisters on Ember, fire ice on Rime, and so on |

- **Drawn into the rock, not on it.** Firedamp is an irregular hollow washed pale, with faint red wisps of gas and pressure cracks. Old charges are steel canisters in drilled bore holes, with hazard bands, a detonator lamp and a lead wire along the seam.
- **Red where it can hurt you:** the wisps, the hazard bands, the lamp (slow blink when armed, fast once lit), and the outline of the blast area while anything is lit.
- **Charges open the Aster base.** Its entrance is behind a cave-in that the crew's own charges can clear, but one of their time capsules sits inside the blast. Getting both out is the puzzle.
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

**Recall.** If you're stuck (no energy, no way up), the pause menu's recall winches you up to the lander. It works like dying, without the printing: the bag stays where you were, flagged. The Winch module keeps part of each stack in the bag; only the rest is left under the flag.

**Built (Oct 16, 2026)** (`logic/suit.ts`, `logic/flag.ts`):
- The numbers: the shield refills at half a bar a second, starting 4 s after the last hit. A hit takes a whole bar or, with less than one, a heart; then 2 s of grace. Life support is 100 and lasts 6 minutes outside; empty, a heart goes every 6 s (shield or no shield). One graphite gives the cell 20, one ice gives life support 25. The jetpack charges 30 a second (a starter tank in 2 s) on the ground or a ladder.
- The suit's marks: a heart on odd marks, a shield bar on even ones (Mk 2 has two bars).
- The lander puts everything right the moment you touch it: hearts, shield, air, the cell.
- R feeds the lower gauge there's fuel for; tapping a gauge on the HUD feeds that one.
- Waking: "The printer made you again, from the scan it took the last time you were aboard." Before the printer is mended the suit drags you back instead ("Mend the printer: it can do better than that"). A red beacon arrow points to the bag.
- Not yet: medkits, the survey sheet's flag.

### Inventories: the bag and the cargo

Ore is kept as resources in two slot inventories (decided with @Hayk on Oct 14, 2026). Each slot holds a stack of one ore, so a varied haul fills the bag faster than a single vein (`logic/inventory.ts`).

| | Slots | Stack | Grows with |
| --- | --- | --- | --- |
| Suit bag | 4 | 10 | The Pack: 2 more slots a mark |
| Cargo hold | 16 | 50 | The Cargo hold module: 6 more slots a level |

- **At the lander** the bag empties into the cargo automatically, the rarest ore first; whatever doesn't fit stays in the bag ("cargo hold full").
- **Locked slots** (Oct 17, 2026): aboard, pick up a stack in the suit bag and press Lock; a locked slot (a padlock on it, in the menu and on the HUD) is never emptied into the cargo. While the Lamplighters wait for their silver, silver in the bag stays there the same way, without locking, until they have it. Moving stacks between the bag and the cargo is aboard: pick one up, then "To cargo" / "To suit bag", or tap a slot on the other tab.
- **Inside the lander** both grids are shown. Tap a stack to pick it up, tap a slot to put it there: into an empty slot, onto the same ore (as much as fits), or swapping. A picked-up stack can be split in half or jettisoned (tap twice).
- **Things you're given or find** (a blueprint, a time capsule, an Aster log, a job item) go in a separate pouch and never take bag space.

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
- **Junk that looks like treasure:** pyrite (fool's gold) on Talus is in no recipe; it only fills slots until you jettison it.

Every ore type has its own highlighter colour and its own glyph shape in the rock (nuggets, crystals, bands), so it reads without colour.

**Graphite's materials:** graphite (signature, and drill fuel), ice (life support, in pockets near the surface and in the crater's shadow), native copper, galena, quartz, and a little silver deep down. The world holds at least three times what chapter 1's repairs and gear need, so the planet is never mined out before the story ends.

## What to do: needs, not missions

There's no mission list and no job board. Things to do come from two places:

**1. The suit's repair list** (built Oct 16, 2026; `logic/repairs.ts`). Your suit lost its link to the guild, so it does the asking. The HUD's "Next" scrap always shows exactly one thing to do, with what's on hand counted ("Repair the printer: native copper 3/6"), and once you have everything, "go aboard". Repairs are done in the lander's damage report: each system the crash broke, what's wrong, its ore ticked off, and a Repair button.

| Repair | Needs | Opens | Real fact for the guide |
| --- | --- | --- | --- |
| Printer | 6 copper | Printing: gear from blueprints, lander modules. Until then the printer sheets say "offline" | Copper is the best cheap conductor |
| Radio (saved id `comms`) | 4 copper, 2 quartz | The call; then the receiver, the Lamplighters, the lexicon | Quartz crystals keep radios on frequency |
| Hull plating | 10 galena, 6 graphite | The six cargo slots the breach put out of use (10 → 16) | Lead shields against radiation |
| Thrusters | 6 silver, 4 quartz | The engines fire; only the core is missing | Silver is the best conductor of electricity |
| Drive core | Can't be printed: the Lamplighters give it for 10 silver once the hull and thrusters are mended | Lift-off: the end of chapter 1 | — |

- **The order:** the printer first, the radio second (the start teaches the game), the hull and thrusters in either order, the core last. A repair whose turn hasn't come says what it's waiting for.
- **The drill in between.** The radio needs quartz, which lies in stone, and the starter drill can't break stone. So after the printer, the goal is the Drill's blueprint, which lies at the foot of the fissure where an earlier crew lost it. A beacon arrow by the prospector points the short way round the world to it, with the distance in metres (No Man's Sky's marker, inked). Then: print the Drill, then the comms.
- **No crafting chain.** No Man's Sky's repairs go through crafted parts (metal plating, a refiner, di-hydrogen jelly); InkMine's take raw ore straight from the cargo, then the bag.
- **The lander shows it.** Each broken system has a wrecked look of its own: a dark, cracked porthole until the printer runs (then its warm glow), the dish hanging by its cable until the radio work, a gash and torn heat-shield tiles until the hull is plated (then a welded patch), and a crumpled, scorched engine bell, smoking, until the thrusters are fixed (dev page `/specimens.html`, "After the crash").
- **The opening card,** shown once: the jump went wrong, the wormhole, the crash, and that the printer wants copper from the crater walls.
- **Taken from No Man's Sky's opening ("Awakenings"):** you start crash-landed, repairs open what the next repair needs, the ship's damage is read from inside it, one part needs a blueprint found somewhere marked, and there's always one objective on screen. Players' main complaint about it, stretches with no prompt, is why the goal is never empty.

**2. Jobs handed to you.** The Lamplighters give you jobs in person: they walk up, or you find them at their outpost. Before you share any words, a job is a picture they draw in the dust (an ore glyph and a downward arrow, a broken probe and a pointing hand). As you understand more, the same jobs come in words. Jobs pay in what you can't easily dig yet: blueprints, rare ore, Lamplighter writings full of new words, and finally the core.

| Kind | Example on Graphite |
| --- | --- |
| Bring | Bring them quartz from below the grey band |
| Sample | Drill a core sample from a marked deep spot |
| Salvage | Find their listening probe, lost when a lead worm dragged it under |
| Mark | Plant their listening stakes at three spots across the world |
| Clear | Drive the lead worms out of their deep post |
| Open | Get into the Aster base (old charges) |

The old mission code (haul, hunt, core sample, salvage, survey, clear, demolition) becomes these jobs and the repair list. There are no blots: progress is the lander's repairs and the lexicon.

## The Lamplighters

Graphite's only people, and the first race you meet. A working name: it's what the Aster crew called them. You learn what they call themselves when you become fluent.

- **Who they are:** tall, thin and slow, in sealed suits of layered cloth, each carrying a lantern, because their home world is dark. They're drawn in blue: they're never a danger.
- **Why they're on Graphite:** they don't live here. They came to mine it, as you did, and keep a small mining outpost on the crater's far rim. They've seen ships fall through the wormhole before, and they deal only with those who learn to talk with them. That's why they won't just hand over a core.
- **They have the weapons.** Your ship is a mining ship and carries none. Weapon blueprints come only from the Lamplighters: hand weapons for you first, and later weapons for the ship (see Weapons).
- **Their outpost** is a handful of domes and a lantern mast. It has inscriptions on its walls, a Lamplighter who gives jobs, and later a second one you can only talk to at level 3.
- **Their writing** is knotted lines strung on a cord, which suits the pen art: each word is a small knot shape, easy to tell apart.

## Learning the language

Lamplighter speech appears as knot glyphs in a speech bubble. Every word you know is written over its glyph in your own handwriting, so a sentence fills in as you learn: first "… **ore** … **deep** …", much later the whole line.

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
| Aster logs | The Aster base, and with lost Aster equipment out in the world | Many words: the crew had learned some already, and wrote glossaries in the margins |
| Time capsules | Buried in the rock, highlighter-marked like ore | Many words, plus a piece of the Aster story |

Reading anything is pushing into it, like drilling: the drill never hurts a person or a text.

**Each race has its own language.** On later planets the radio learns each new language from scratch, so meeting a new people always starts with gestures again.

## Gear: blueprints, materials, the printer

Every planet has its own set of gear, the best you can have there, built from that planet's materials. Gear is unlocked, never just bought: the point is the moment a new piece arrives and the world opens up.

**Six pieces**, each with a mark per planet (Mk 1 on Graphite up to Mk 10 on Cardia). You start with a Mk 0 starter set.

| Piece | What a new mark gives |
| --- | --- |
| Drill | Breaks the planet's stone (table above), costs less on everything, hits creatures harder |
| Cell | More drill energy |
| Pack | Two more bag slots |
| Suit | A stronger shield; one more heart on alternate marks; on later planets, better hazard protection |
| Helmet | Wider lamp light; from Mk 2, a scanner ping that shows ore through rock |
| Jetpack | A bigger tank and a faster climb |

**Printing a piece takes its blueprint and the planet's materials** (cargo first, then the bag). Graphite's Mk 1 recipes (`logic/blueprints.ts`):

| Piece | Materials | Gives (`logic/marks.ts`) | Blueprint from |
| --- | --- | --- | --- |
| Cell | 4 graphite, 6 copper | Energy 100 → 140 | The Lamplighters' first job |
| Drill | 6 graphite, 4 galena | Breaks Graphite's stone | The Aster base |
| Pack | 3 graphite, 8 copper | Bag 4 → 6 slots | A vault near the crash site |
| Helmet | 4 graphite, 2 quartz | Lamp 4.5 → 6 tiles | A Lamplighter job |
| Jetpack | 5 graphite, 3 silver | Fuel 6 → 9 s, faster climb | A deep vault |
| Suit | 8 graphite, 3 quartz | Shield up, hearts 3 → 4 | A Lamplighter job at level 3 |

Every mark is an even step, never an exponential curve.

**The good moment:** you find a blueprint, see in pencil what it needs, go and dig it up, and the printer inks the part in. Every new piece changes something you feel on the very next trip: stone you couldn't break, a vault you couldn't reach, a cave too dark to read.

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

Every planet has its own native creatures, invented but built from a few behaviours, so a new planet is new drawings more than new code.

| Behaviour | Example |
| --- | --- |
| Walker | Paces a tunnel floor, turns at walls |
| Burrower | Moves through soil, leaving a tunnel; shows as wriggling hatch before it breaks out |
| Dropper | Clings to a cave ceiling, drops when you pass under |
| Flyer | Drifts through open caves toward you |
| Spitter | Sits still, shoots on a visible wind-up |
| Mimic | Looks like a boulder or an ore glint until you're close |

- **Few and readable.** Pocket Mine 3's fans complained that monsters crowded out the mining, so they're kept to their regions, and the crash site has none. A creature notices you within about 4 tiles and shows it with a red "!" before it moves.
- **Red ink means it can hurt you.** Harmless grazers are drawn in blue.
- **They live below the ground,** more of them and fiercer the deeper you go. That is what stops you going deeper, more than the rock does.
- **The drill is a tool, not a weapon.** It can knock a small shallow creature back, but going deeper needs a weapon (below). Blasts, falling boulders and hazards hurt creatures too, so the terrain is still a weapon.
- **No loot.** Creatures drop nothing; a reason to clear them comes from a job.
- **Each planet's giant** lives in its deepest region. On Graphite, the **Grinder**, a giant rock worm, has made the Lamplighters' deep post unsafe; the last job takes you past it.

## Weapons

Your ship is a mining ship: it has no weapons, and you start with none. Weapon blueprints come from the local aliens, as job rewards or in trade, and are printed from ore like everything else.

- **Hand weapons** come first, from the Lamplighters on Graphite. They're the gate to the deep: each mark lets you hold your own against the creatures of the next band down.
- **Ship weapons** come later, from the races of the paid planets, once the lander flies.
- **Drawn in blue.** Your weapon is drawn in blue like the rest of your gear; red stays for danger.

To design: the weapons themselves (how they fire, their marks), and how the depth bands match them.

## The ten planets

Each planet is its own world, with its own shape, people and language, and adds one mechanic while keeping everything before it. Who lives on planets 2–10 is to design, one planet at a time.

| # | Planet | Biome | New mechanic | Given gear | Creatures | Giant | Signature material |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Graphite | Grey cratered moon | The basics: drilling, ore, firedamp, the life system, repairs, the first language | Starter set | Dust ticks (walker), lead worms (burrower) | The Grinder, a giant rock worm | Graphite, pencil lead |
| 2 | Talus | Red mesas and dry gullies | Gravity: loose rock and boulders fall when you dig under them, and crush creatures | Blasting charges | Boulder beetles (mimic), sand skates (burrower) | The Rockslide, which sheds boulders as it walks | Hematite, "blood ore" |
| 3 | Brine | Island crust over a flooded underworld | Water and air: breaking into an aquifer floods the tunnels; you swim, and underwater air drains fast, refilled by bubble capsules (Mr. Driller) | Rebreather | Cave lampreys (swimmer), bubble jellies (flyer) | The Leviathan, in an underground sea | Brine pearls |
| 4 | Mycel | Fungal jungle | Growth: fungus slowly grows back over tunnels; cap mushrooms bounce you; spore pockets catch fire from a blast | Spore filter | Puffballs (spitter), snap tendrils (dropper) | The Mother Mycel, a heart you mine your way around | Amber with alien insects in it |
| 5 | Pumice | Light, porous moon | Low gravity: long floaty jumps, slow falls, drifting rubble | To decide | Drift moths (flyer), regolith hoppers (walker) | The Grazer, a floating giant | Helium-3 |
| 6 | Rime | Ice world | Ice: slippery floors, frozen blocks only the lance melts; cold as a hazard | Thermal lance | Frost mites (swarm walker), ice wyrms (burrower) | The Hoarfrost, a giant ice spider | Fire ice (methane clathrate) |
| 7 | Ember | Volcanic world | Lava: flows like water, burns; lava meeting water turns to obsidian; heat as a hazard | Coolant foam | Magma slugs (burning trails), cinder bats (flyer) | The Salamander | Diamonds, in kimberlite pipes |
| 8 | Prism | Crystal caverns | Resonance: hit a crystal and every touching crystal of its colour shatters at once | Tuning fork | Shardlings (hurt only while glowing), refractors (beams bounce off crystal) | The Crystal Queen | Singing quartz |
| 9 | Umbra | Dark side of a tidally locked world | Darkness: only your lamp, flares and glowing minerals give light | Flares | Lurkers (strike from the dark), glow lures (mimic ore glints) | The Listener, which hunts by the sound of digging | Willemite, which glows green |
| 10 | Cardia | A living planet | Heartbeat: every few seconds a beat shakes the ground; every earlier mechanic returns | — | Antibodies (chasers), veins that pump fluid | The Heart | Heartstone |

Order follows difficulty and dependency: water (3) before lava (7) so lava-meets-water reads; darkness (9) is the hardest.

**What makes a planet unique** (a checklist for designing each one): its world has its own shape, not just new colours; one mechanic that changes how you dig; its own people with their own language, wants and look; its own fuels for the drill and life support; and a reason, in the story, to be there.

## Graphite (chapter 1, free)

A grey moon of soft dark rock, pocked with craters, with a ringed planet hanging in its sky.

| Region | Where | What's there | Opens with |
| --- | --- | --- | --- |
| The crash site | Surface and soil under the lander | Copper, ice; no creatures; a vault (Pack) | Start |
| The crater rim | Surface, far side | The Lamplighter outpost, inscriptions | Walking over |
| The lead seams | Soil and the first stone, near the lander | Graphite seams, firedamp, dust ticks | Start; stone with the Drill |
| The Aster base | Half-buried under the old workings | Old charges, logs, a time capsule in the blast, the Drill blueprint | Clearing the cave-in |
| The grey band | Stone, mid-depth | Galena, quartz, lead worms, standing stones | The Drill |
| The deep | Deepest stone | Silver, the Lamplighters' deep post, a vault (Jetpack), the Grinder | The Drill, a good cell, routes back |
| Below | Deep rock | Rich veins and a vault, for a later drill | A return visit after chapter 1 |

Graphite's existing levels 1–5 (`level/planet1.ts`) become the first regions: their rooms, fissures, vaults and items move into one world definition.

## Inside the lander and the pause screen

There's no result screen and no level select in chapter 1.

- **Inside the lander** (L at the lander), laid out like No Man's Sky's inventory (ShipScene, Oct 17, 2026): a **Suit** and a **Ship** tab (tap, or Q / E). Each tab has a Technology plate of big slots with a drawn picture of what's fitted (`art/techArt.ts`), its Mk or level, and a corner flag (verdigris: an upgrade ready to print; madder: broken), then a separate Storage plate (the suit bag; the cargo). The suit's slots are the six gear pieces; the ship's are its Systems (the crash repairs, drawn broken until mended) and its Modules. Beside them stand the prospector or the lander, over a detail card for the slot in focus with its next step, its ore ticked off, and Print / Repair. A stack picked up on one tab can be put down on the other, or sent across with "To cargo" / "To suit bag". Back down is at the top right.
- **The pause screen:** the survey sheet, the repair list, the field guide (with the lexicon and the logs), and recall.
- **After chapter 1:** the star chart becomes the galaxy map you fly between planets on (paid version).

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

A small alien in a suit, helmet and pack with a drill in hand, in blue like every "you" in the catalog. You can see them inside the helmet, with eyes that look where the drill points. They are no human: a broad, smooth head in cool mint, darker markings dappled over the crown (the ones the printer gets wrong), big dark eyes set forward, no nose, a small mouth, and lilac frills sweeping back from behind the jaw. The work suit is cobalt cloth with ochre leather (boots, gloves, belt, pouch) and an ochre fuel can and drill, so the figure reads at a glance against the grey rock. The art is in `games/inkmine/src/art/prospector/`, one file per part, and every look in every pose is on the dev page `/specimens.html`.

**The character changes with the gear.** Each piece shows on the character in three looks, by its mark, and each changes on its own (`logic/gear.ts`):

| Piece | Mk 0–3: prospector | Mk 4–7: guild contractor | Mk 8–10: deep-space |
| --- | --- | --- | --- |
| Suit | Patched work suit: stitched patches, a zip and chest pocket, a tool pouch, lace-up boots | A chest plate with the guild's stamp (a pick over a star), a domed shoulder plate, knee pads, steel toecaps | Overlapping armour plates, jointed knees, a forearm guard, sealed boots |
| Helmet | Glass fishbowl on a bolted collar, a clip-on lamp, a stub antenna (cracked until the radio repair) | The fishbowl in a protective cage, twin lamps, a radio with a whip antenna and an ear-piece | A hard shell with a wide tinted visor, a lamp strip and a sensor fin |
| Jetpack | A battery cell and a dented fuel can strapped together, one nozzle | A framed pack with twin tanks, two nozzles, a pressure dial and a fin | A sealed pod with vents and a gimballed nozzle |
| Drill | A hand drill: pistol grip, vented housing, fluted cone bit, power cable from the cell | A heavy drill: finned housing, fore-grip, coolant canister, carbide teeth | A plasma lance: heat-sink rings and three prongs round an emitter; no cable |

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
| Feed a gauge | R / Y feeds whichever of drill and air is lower (and has fuel in the bag) | Tap the gauge |
| Pause | Esc or P / Start | Map button |

Pushing to dig, talk and read keeps touch play to one stick and two buttons.

## Field guide

As in the other games, entries unlock the first time you meet them:

- **Minerals:** every real ore and gem, with real facts (hardness, where it forms, what it's used for).
- **Xenobiology notebook:** the invented creatures, drawn as specimen sketches with made-up notes, clearly fiction.
- **Lexicon:** every Lamplighter word you know, its knot glyph beside your handwriting.
- **Logs:** the Aster crew's logs and time capsules, in the order you found them.

## Content and monetization

Same model as InkFish and InkCrab:

- Chapter 1 (Graphite) is free and ends at lift-off; planets 2–10 are a $4.99 one-time purchase.
- Paid planets are server-only content served after the entitlement check (`content/` entry, `/api/content/inkmine`).
- Nothing is ever sold for real money except the unlock: no currency packs, no energy, no boosts.

## Worlds: how they're made

Each planet is one file (`planet1.ts` … `planet10.ts`) holding one world definition, carved by a builder with a fixed seed, as InkCrab's beaches are.

- **A world definition** gives its size, seed, surface profile and the lander's spot; where the strata change; its regions; and the hand-placed parts: caves, vaults, the outpost, the Aster base, old charges, texts, blueprints, job items, the giant's arena; and how much of each ore and creature to scatter per region.
- **The builder** fills the rest, so the ground meets itself at the wrap's join.
- **A world test** checks: every repair and job item is reachable with the gear expected by then; enough of every material exists (three times what the story needs); enough words exist for each level; nothing needed sits in deep rock or bedrock.
- **The save** holds what changed, not the world (below).
- **Permanent ids** for regions, items, texts and words: never change or reuse one.

## Saving and loading

A world is never stored. Loading carves it again from its seed and lays the save's changes on top. Measured with the builder: 10 ms for Graphite (256 × 160), 38 ms for a 600 × 500 world. The ground is drawn only near the camera, so nothing slows down as worlds get bigger.

**Two saves, kept apart:**

| Save | Key | Holds |
| --- | --- | --- |
| Profile | `inkmine.profile.v3` | The bag, the cargo, gear marks, blueprints found, lander modules (`logic/save.ts`) |
| One per world | `inkmine.world.<id>.v1` | The world's version; dug tiles and ladders, each one bit a tile; ids of items banked for good (`logic/worldSave.ts`) |

The world save also keeps the bag left under its flag (a tile index and the inventory). Later: texts read, words known, jobs.

- **Only what changed.** A tile counts as dug when the builder made it ground and it's open now, whether drilled or blown out. The bit masks are packed as run lengths (LEB128 varints, base64): a few hours of tunnels on Graphite take a few KB, far inside the account limit of 64 KB per game. Big paid worlds will need that limit raised.
- **When it saves:** on banking at the lander, on banking something found, every 30 s of play while anything changed, going aboard, the suit giving out, and when the tab is hidden or the page closes. Packing is synchronous, so the last save gets written even while the page is closing.
- **Loading** starts the prospector at the lander. Items still in the pouch when the game closed weren't banked, so they're back where they were found.
- **Untrusted.** A mask that isn't exactly the world's size, a malformed run, unknown item ids: the world save is ignored rather than half-applied, and a broken profile falls back field by field.
- **Merging two devices** (when account sync arrives): digging only ever removes rock on Graphite, so dug masks merge by OR, and taken items and words by union. Inventories and gear come from the newer save. Talus (falling rock) and Mycel (regrowth) move tiles, so they'll need more than a dug mask.
- **Shipped worlds change only by adding.** The save says "this tile is open", never what was there. If a released world's layout moves, old tunnels open into different rock; that's harmless but odd, so bump the world's `version` and prefer adding over moving. Items are saved by id, so they survive changes.
- **The roof.** The ground's first surface is taken from the carved ground, before the save, so a shaft dug in an earlier session still reads as inside the planet, not sky.

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
2. ~~**The life system:** shield, hearts, life support, feeding gauges from the bag, the self-charging jetpack, dying, the dropped bag, recall~~ (done Oct 16, 2026; water ice added to Graphite, world version 2). The pause card is the start of the pause screen: Resume and Recall.
3. ~~**The repair list** in place of missions; the wrecked lander and its repair stages; inside the lander in place of the result screen and chart~~ (done Oct 16, 2026, before step 2). Not yet: lift-off at the end (it waits for the Lamplighters and the core).
4. **The Lamplighters:** ~~the call, the receiver, the outpost, the first job by picture, the core for silver~~ (done Oct 17, 2026); still to come: speech with word-by-word translation, the lexicon, texts and Aster logs.
5. **Creatures** (dust ticks, lead worms) and fighting with the drill.
6. **The rest of Graphite:** the Aster base, the grey band, the deep, the Grinder; the drive core and lift-off; the opening and the ending.
7. Coach hints, sound, touch controls, account sync; add InkMine to the catalog with chapter 1 free.
8. The galaxy map and planets 2–10, one at a time, each with its people.

## Decisions

Settled with @Hayk on Oct 13, 2026:

- **The run limit** is the drill's energy cell: every block costs energy. Upgradeable (the Cell).
- **Gear** is per planet: find the blueprint, hunt the planet's materials, build it. **Six pieces** per planet.
- **The planets** stay as listed.
- **Shared code:** copy from InkCrab now, extract a package later.

Settled with @Hayk on Oct 14, 2026:

- **No money:** ore is kept as resources; gear and modules are printed from them. No Man's Sky style slot inventories on the suit and ship.

Settled with @Hayk on Oct 15, 2026 (replacing the 100 levels, missions, contracts and blots):

- **Open worlds.** Each planet is a small open world, hand-made and truly different from the others. Graphite wraps around.
- **The story start:** a wormhole, a crash, the link to the guild lost; you begin by repairing the lander, which doesn't fly until the end of chapter 1. Lift-off ends the free version.
- **Free version = Graphite only;** other planets are paid.
- **No linear missions:** the suit asks for what's needed; jobs are handed over in person, not from a board.
- **One race on Graphite**, the Lamplighters, whose language you learn through the radio: levels of understanding, from talking and from found texts (their inscriptions, Aster logs, time capsules).
- **Tunnels stay dug;** you go deeper over time. The lift is the shortcut home.
- **Life system from No Man's Sky;** dying reprints you at the lander, and the bag waits where you fell.
- **Drill energy and life support are refilled from raw materials** you carry.
- **No humans:** you are an alien, and so is the earlier crew. The local race came to Graphite to mine it.
- **No weapons at the start:** the lander is a mining ship. Weapon blueprints (hand weapons, later ship weapons) come from the local aliens.
- **Creatures live below the ground,** and weapons are what let you go deeper.
- **No result screen,** only the pause screen.

## Open questions

- **The Lamplighters' look and name** are a first draft.
- **The prospector's alien look:** the drawing inside the helmet reads as human.
- **Weapons:** how they work, their marks, and which depth band each one opens.
- **Graphite's size** (256 × 160 built) and how long chapter 1 runs; repair amounts and gauge drain rates.
- **Catalog progress** without blots: probably repairs done and words known.
- **Pumice's gear.** The jetpack was planet 5's given gear; it's now in the starter set.
- **Who lives on planets 2–10.**
