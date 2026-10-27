# InkPin: design

The pin puzzle from the mobile ads, made into a whole game. Nib, a raccoon who explores ancient ruins, goes after the treasure of ten lost ruins. Water, lava, gold and ink monsters wait behind golden pins, and you pull them in the right order so Nib gets the treasure and gets out. There are no menus to manage, no town to build and no ads: 100 pin puzzles, a new material in each chapter.

Started Oct 27, 2026. Seventh game on 16bit.ink. Why this format won is in [game-ideas.md](game-ideas.md#1-the-real-game-from-the-fake-ads-current-direction).

## The name: InkPin

- **It says what you do.** People search for "pin puzzle" and "pull the pin game", and the name answers both.
- **It fits the catalog:** InkFish, InkCrab, InkMine, InkGecko, InkSnake. One syllable after "Ink".
- **It's free to use.** On Oct 27, 2026 no game called InkPin showed up on the App Store, Steam or the web. The nearest names are *INKS.*, a pinball painting game, and InkPinned, a tattoo app.
- **It stays clear of "Pull the Pin",** which Popcore claims as a trademark. Our page text says "pin puzzle".

Runners-up: **InkHeist**, which has no conflicts but is darker in tone, and **InkKeep**. InkVault is already the name of an App Store app.

## Why this game

- **Players already know it from the ads.** The ads made pin pulling famous, and the games behind them barely have it: Homescapes was banned in the UK in 2020 because its pin puzzles were under 1% of the game.
- **The free versions are drowning in ads.** Pull the Pin has 100M+ installs, and reviews complain of an ad every few seconds. Removing the ads costs $2.99–$4.99, the same as our whole game.
- **Nobody sells a deep one.** *Those Games* ($9.99) has a pin mode among five shallow minigames. A whole game of pin puzzles that grows deeper every chapter doesn't exist.
- **Flowing liquids suit pen and ink.** Watercolour water, red-orange lava and ochre gold pour through ballpoint rooms.

## Pillars

1. **Pins first.** Every level is a pin puzzle, from the first minute to the last. You also move Nib, but movement is part of the puzzle (where Nib waits, what he stands on), never a reflex test: every level can be finished with tap-to-go, and harder movement only leads to bonus gold. The movement rules are in [inkpin-levels.md](inkpin-levels.md#how-movement-fits-in).
2. **Real flow, same every time.** Everything that pours or falls is simulated, with a fixed step and no randomness. A level always plays out the same on every device, so a loss comes from your order and timing, never from luck.
3. **Order and amount.** The ad puzzles only ask which pin comes first. Ours also ask how much. Gate pins can be pushed back in to cut a flow mid-pour, so "just enough water to cool the lava without washing the gold away" is a puzzle.
4. **Read it, then pull.** Each level fits on one screen (the tall levels scroll), and every material always does the same thing. A careful player can solve it in their head first, and the "first try" blot rewards that.
5. **Failing is funny and fast.** Nib ends up sooty, inky or chased off in a puff of dust, never hurt, and one tap restarts the level in under a second.

## The legend

Nib found the **Ink Atlas**, an old explorer's map of ten lost ruins, each with a treasure vault. When Nib opened it the ink got loose: every Blot is a drop of the Atlas's ink, sitting in the ruins and guarding the gold. Each ruin holds a page of the Atlas, and the last page leads to the Dragon's Hoard.

## Nib

The hero is **Nib**, a raccoon who explores ruins. Raccoons love shiny things, and they're happy in water. Nib wears a red headband, an olive field vest with a strap across it and a leather backpack with a coil of rope on top, and carries a lamp. The name is a pen nib.

**You move Nib** (changed Oct 27, 2026; Nib used to walk by itself as in the ads). Nib can go back and forth and jump, so levels can ask Nib to wait on a ledge while lava passes, fetch something and come back, or sweep a room for gold. The prototype has two control schemes to compare:
- **Tap to go:** tap the floor and Nib walks there and stops; tap Nib to jump.
- **Joystick:** arrow keys (or A/D) and Space to jump on a keyboard; on a phone, drag anywhere off the pins to walk, and a round button jumps.

A switch under the level's goal flips between them and remembers the choice. The jump is about 55 px: it clears a lip or a small gap, never a pit wall.

**When a level fails, Nib is funny, not hurt.** Nib jumps out of its fur, the backpack and lamp go flying, and coins spill out of the pack. Nib's eyes go huge and googly, with a mark for the cause: soot and smoke after lava, Blot-ink splats and a tongue out after a Blot, tears after the gold melts, dizzy spirals when stuck. The camera zooms in on Nib so the face reads even on a phone.

**Our own explorer.** The look is the classic adventure explorer, never a copy of a famous one: no braid, no twin pistols. "Tomb Raider" and "Lara Croft" are trademarks, so they never go in our titles, art or ads; our copy says "ruin explorer".

- **Water is safe for Nib.** Nib gets soggy and keeps going, and floats on deep water.
- **Lava, fire, acid, gas and Blots are not.** Any of them touching Nib ends the level.
- **Falling things:** a boulder or a bomb landing on Nib ends the level. Coins and gems landing on Nib are welcome.
- Nib climbs a ledge up to about 44 px and jumps about 55 px, never a pit wall. Each ruin adds one new kind of ground (vines, crumbling ledges, ice floors, lifts, tides, wind…), listed in [inkpin-levels.md](inkpin-levels.md).

## Guards

The enemies are **guards**: grumpy animals that watch over each ruin's treasure (changed Oct 27, 2026; they used to be walking ink blots). The Jungle Temple's guard is a stout little **boar**. Each guard patrols its room, turning at walls and edges, and goes for Nib once he's close and on its level. One touch ends the level.

**Nib can stomp them**, as in the old platformers: landing on a guard's head squashes it flat with a boing, and it puffs away while Nib bounces off. Guards with **spikes** can't be stomped; landing on one ends the level, so it needs water, lava or a boulder. Each ruin's new guard (the "new Blot" in the tables below and in [inkpin-levels.md](inkpin-levels.md)) will become an animal of that ruin, some round and stompable, some spiky. That redesign is still to do.

| How a guard is beaten | What happens |
|---|---|
| A stomp (not spiky guards) | It squashes flat with a boing and puffs away; Nib bounces off |
| Water | It gets soaked, squeals and is swept off in a splash. Most guards need about their own size in water |
| Lava or fire | Its bottom gets singed and it rockets off in a puff of smoke |
| A boulder or a bomb | It's flattened like a stomp |
| Acid (chapter 5) | It flees, fizzing |

Cartoon only, as everywhere on 16bit.ink: no blood and nothing gross. A beaten guard always just squashes or runs off in a puff.

## Rules

- **Board:** a cut-away room drawn on paper, 720 × 1280 and upright, because pin puzzles are shafts and chambers stacked on top of each other. On a phone held upright it fills the screen. On a computer it sits in the middle of the page, with the level's name, blots and buttons in the margins. Tall levels scroll, and you can drag the board to look before you pull.
- **Pins:** golden pins with a ring on the end. Tap a pin, or drag it out the way its ring points, and it slides out. Whatever it held starts to fall at once.
- **Materials** are simulated as grains (water, lava, gold, sand, gas, acid) and solid bodies (boulders, gems, bombs, keys, ice blocks, Nib and the Blots). Every material's behaviour is in the next table, and none of them ever changes it.
- **Mixing:**
  - Water and lava make stone, with a puff of steam. One part water turns one part lava to stone, and whatever lava is left over keeps flowing.
  - A flame meeting gas makes a blast that breaks cracked walls.
  - Lava melts ice, and frost freezes still water.
  - Water dilutes acid until it's harmless.
  - Water makes seeds grow, and fire burns vines.
- **Treasure:** coins pour like grains, and gems fall as single pieces. They count once they reach Nib's sack or the chest beside Nib. Treasure lost in lava, down a drain or off the board is gone.
- **Failing:** Nib is touched by lava, fire, acid, gas or a Blot, or crushed by a falling boulder. Some goals fail in other ways too: a Loot level fails when too little treasure is left to reach its target. Nib shows the cause in a cartoon pose, then the restart button appears.
- **Restart:** one tap or R, under a second. There are no lives or energy to spend.
- **Hints:** free and unlimited. A hint shows the next pin with a number. After three failures in a row the hint button wiggles. A level finished with a hint can't earn the "first try" blot.
- **Ink blots (stars):**
  1. **Done:** Nib is safe and the goal is met.
  2. **Every treasure:** all the gems, and 95 of every 100 coins. A few always splash.
  3. **First try:** no restarts and no hints. Chapter 1 asks for this from level 3 on.

## Treasure and the bank

Every level has two kinds of treasure, and Nib takes both himself:
- **Gold coins** pour and spill like the liquids. Nib picks up every coin he walks into, so after the pins are pulled the player walks Nib back and forth to gather what fell. Coins that melt in lava or drop out of reach are lost.
- **The chest** holds the level's relic (in the Jungle Temple, a little golden idol). Nib opens it by walking up to it, and the idol jumps into his pack.

A level is won when Nib has the relic **and** the level's coin target. Meeting the target doesn't end the level: a "Leave with N coins" button appears (Enter on a keyboard), and Nib can stay to pick up the rest of the gold. The level ends when Nib leaves or no gold is left. No gold is ever out of reach: Nib digs out coins that slipped between stones or sank to the bottom of a pool, and kicks aside lava that set into a lump or a wall. Everything Nib carries out of a won level goes into the **bank**, which the result card shows (kept in the browser for now).

### What the treasure is for (to decide)

The game has no ads and nothing to buy with money, so the gold can't be an in-game currency for anything paid. Options:

1. **Nib's camp and museum (recommended, with 2).** Each ruin's relics go on the shelves of Nib's explorer camp, which fills up as the Ink Atlas does. Gold restores the camp bit by bit (tent, then hut, then museum), a tiny joke on the house-renovation games the pin ads come from.
2. **Explorer gear, for looks only.** Gold buys hats, outfits, lamps and backpacks for Nib. Cosmetic only, so a level is never easier because you have more gold.
3. **Helpers in puzzles** (an extra rewind, a peek through a wall). Not recommended: hints are already free, and buying help works against the "first try" blot.
4. **Nothing to spend on:** the bank is just a score, a running total across the ten ruins.

## Goals

| Goal | What it asks |
|---|---|
| Treasure | Take the chest's relic and the coin target (the default) |
| Loot | Bring at least the target amount of coins home (the meter is a sack along the top) |
| Clear | End every Blot before Nib goes |
| Escort | Free a caged friend too (a pet, a lost miner), who then follows Nib |
| Boss | The chapter's big Blot, which acts on a beat, so pulls must be timed |

## Pins

**Pins block pins** (added Oct 27, 2026). A pin slides out past its ring by its own length, and if another pin still in is in that path, it can't come out: it jolts, clunks, and the pin in its way lights up. Pull the blocking pin first. Pins only ever block each other; rock and walls never do. This makes crossed pins a puzzle of their own: which pin is free to move first.

Each chapter brings one new kind of pin, taught on its own on level 6.

| Chapter | Pin | What it does |
|---|---|---|
| 1 | **Plain pin** | Pull it once and it's gone. |
| 2 | **Gate pin** | Tap it again to push it back in. It cuts a flow mid-pour, so amounts become the puzzle. |
| 3 | **Chain pins** | Two pins on one chain: pull either one and both come out. |
| 4 | **Lock pin** | It won't move until a key falls into its lock. Keys fall like gems. |
| 5 | **Spring pin** | It snaps back in after 2 seconds, so only some of a flow gets through. |
| 6 | **Turn pin** | Pulling it lets a platform swing a quarter turn, which tips whatever is on it. |
| 7 | **Weight pin** | It pulls itself out when enough weight piles on its plate: water, coins or a boulder. |
| 8 | **Fuse pin** | It holds until a flame reaches it, then burns away. Water puts the fuse out. |
| 9 | **Balloon pin** | It holds a balloon down. Pull it, and the balloon lifts whatever is tied to it. |
| 10 | All of them | — |

## Chapters

A different ancient ruin each chapter, each with its treasure vault, a new material, a new Blot and a boss. Chapter 1 is free. Chapters 2–10 are the full game, and the server sends their levels to owners only, as in InkGecko.

| # | Ruin | New material (level 2) | New Blot (level 4) | Boss |
|---|---|---|---|---|
| 1 | **The Jungle Temple**: stone blocks, moss, vines, carved glyphs, torches | Water, gold coins, boulders | **Blot:** patrols its room and goes for Nib on sight | **The Big Blot**, which fills the idol hall's floor; flood it with every drop at once while Nib waits up high |
| 2 | **The Volcano Shrine**: black basalt, a fire idol, rivers of lava below | **Lava:** water turns it to stone, which builds floors and plugs holes | **Ember Blot:** lava can't hurt it, only water | **The Fire Idol**, which pours lava from three mouths in turn; cool each one with just enough water from gate pins |
| 3 | **The Desert Tomb**: sandstone, sealed burial chambers, painted walls | **Tomb gas:** green, rises instead of falling, and Nib can't breathe it. A torch turns it into a blast that breaks cracked walls | **Puff Blot:** floats up on gas | **The Tomb Guardian**, a Blot in a stone coffin that breathes gas at Nib; light its breath to bring its own wall down on it |
| 4 | **The Frozen Monastery**: a mountain monastery under the ice, prayer bells, icicles | **Ice:** frost freezes still water into blocks that slide and push; lava melts them back | **Frost Blot:** frozen solid, so water does nothing until it's thawed | **The Ice Wyrm**, which freezes every pool on its beat; time pulls between its breaths |
| 5 | **The Alchemist's Ruin**: a tumbled tower of glass, copper and bubbling flasks | **Acid:** eats wood, stone and Blots (and Nib); water dilutes it | **Sponge Blot:** soaks up water and grows; only acid or lava shrinks it | **The Cauldron Blot**, which boils over in waves of three colours; send each wave the material it fears |
| 6 | **The Clockwork Citadel**: bronze gears, chains and water wheels of a lost engineering city | **Mechanisms:** water wheels open gates, scales tip under weight, counterweights lift floors | **Clockwork Blot:** marches on a fixed beat, so you can predict it | **The Pendulum**, which swings through the shaft; pull on the right swing |
| 7 | **The Lost City in the Canopy**: a stepped city swallowed by giant trees | **Seeds:** water grows vines into bridges and ladders; fire burns them | **Thorn Blot:** water and boulders bounce off it; only fire works | **The Snapweed**, a giant plant that eats Blots; wash every Blot into its mouth before it turns to Nib |
| 8 | **The Sea Cave of the Pirate King**: a wrecked galleon inside a sea cave | **Bombs and powder kegs:** a flame lights the fuse, the blast pushes everything and breaks walls; water puts fuses out | **Shell Blot:** armoured; only a blast cracks it | **The Kraken Blot**, whose tentacles push pins back in; blast the tentacles first |
| 9 | **The Cloud Fortress**: a ruined fortress on a peak above the clouds | **Balloons and wind:** balloons lift, fans blow grains and gas sideways | **Bat Blot:** flies over gaps; only falling water or a blast brings it down | **The Thunderhead**, a storm cloud whose lightning strikes the tallest metal thing on its beat; lead it with keys and coins |
| 10 | **The Dragon's Hoard**: the lost city under the mountain, where the Atlas's last page leads | Everything, in the biggest rooms | Every Blot | **The Ink Dragon**, three screens tall, made of the Atlas's last ink, which breathes fire on a rhythm down the vault as Nib climbs to the hoard |

## Level structure

Each chapter has 10 levels on the same arc, so each new idea arrives on its own and then mixes with the old ones. Every level has one goal and one twist, and the tenth is the boss.

| Level | Role | Twist |
|---|---|---|
| 1 | Meet the place | The ruin's new ground for Nib (vines, ice floors, lifts…), with only materials you already know |
| 2 | The new material | Taught on its own |
| 3 | The material at work | The new material mixed with the old ones |
| 4 | The new Blot | Taught on its own |
| 5 | Loot | Lots of gold; the goal is the treasure |
| 6 | The new pin | Taught on its own |
| 7 | Tall | A level two screens tall that scrolls |
| 8 | Remix | Everything in the chapter at once |
| 9 | Lights out | Dark except where Nib's lantern, lava or fire glows, so look before you pull |
| 10 | Boss | The chapter's big Blot, on a beat |

## The levels

Every level of all ten ruins, with what it asks and the new ground each ruin brings, is in [inkpin-levels.md](inkpin-levels.md). Chapter 1, the Jungle Temple, is free and teaches the basics the ads made famous, then goes deeper than any ad by level 8.

## The prototype (Oct 27, 2026)

All ten levels of Chapter 1 ([inkpin-levels.md](inkpin-levels.md)) in `games/inkpin` on branch `feat/inkpin`, playable on desktop and phones (`pnpm --filter @16bitink/inkpin dev`, port 5203; `?level=7` opens a level, and the dev page opens them all). Winning a level opens the next one; progress is kept in the browser. The first one built, **The Gold Vault** (level 5), is described below.

- **The puzzle:**
  - Four pins: water, lava, the coins (which sit above the lava) and the gate in front of Nib.
  - With Nib walking by himself, 5 of the 24 pull orders won: water and lava first, in either order, then coins and gate. The tests now play each order like an eager player who sends Nib to the chest after every pull; most orders still lose. Over 40 random pull timings of the winning orders, Nib always reached the chest and collected 279.6 of the 280 coins on average.
  - Every other order fails for a clear reason: the Blot gets Nib, Nib walks into the lava, or the coins drop into the lava and melt.
- **What the simulation learned:**
  - Water touching lava makes stone. New stone is heavy gravel that sinks and spreads, then sets solid once still, so it always ends as a level floor.
  - Lava that has come to rest against stone freezes too, so a whole pool cools once water reaches it, while lava still pouring doesn't, so there are no stone waterfalls.
  - Coins at rest fall asleep and hold their place until something disturbs them.
  - Lava is thick: it rises at most 1 px a step, so stone sinking through it can't fling it up a wall and over a ledge.
  - Levels settle for 3 seconds (off screen) before they start, so they open at rest.
- **What Chapter 1 added:**
  - Vines: tap one to climb to that spot. Boulders: they roll, sink through water and coins, plug a drain dip and squash a guard (or Nib) they fall on. Drains: anything that reaches one is gone, so a level can be lost to "down the drain".
  - Swimming, Nib dives for the gold under it, however deep the pool.
  - Mario-style stomps make a guard under a drop easy prey, so a guard Nib could fall on is a porcupine (spiky) where the level needs it to stay a threat.
  - The boss soaks up water but dries as it goes, and the hall drains, so only the whole flood at once washes it away; the tests check it falls to the flood at any pull timing.
  - A dark level is night over the rooms with light cut out round Nib's lamp, torches, pin rings and lava. A level taller than one screen opens on its bottom, then the camera follows Nib.

## Controls

- **Touch, mouse and keyboard:**
  - **Pull a pin:** tap or click it, or drag it out. With a keyboard, each pin shows a number, and the number key pulls it.
  - **Push a gate pin back in** (chapter 2 on): tap it again.
  - **Look around a tall level:** the camera follows Nib (a look at the bottom first). Dragging or scrolling the board is still to build.
  - **Climb a vine:** tap the spot on it; with keys, up and down next to it.
- **Restart:** R or ↺. **Hint:** H or the ? button.
- **Pause:** Esc, P or ❚❚. **Sound:** M or ♪.

## The map

The Ink Atlas itself, open on the table: ten ruins drawn on old paper with a dotted trail between them, from the Jungle Temple to the Dragon's Hoard. Each level is a lit window. Chapters not built yet are pencil drafts, and the full game's chapters are painted but locked until bought.

## Art

The house ballpoint notebook style: blue ink lines, watercolour washes on paper, painterly rather than doodled (see [art-pipeline.md](art-pipeline.md)). Rooms are seen side-on, in cut-away.

- **Liquids:** each liquid's grains are drawn into one layer, blurred and cut at a threshold so they merge into a smooth body, then given a pen outline and a watercolour fill: blue water, orange-red lava with a darker crust, green gas that's semi-transparent, pale acid. This is the look that has to sell the game in a short.
- **Pins:** gold with an ink outline and a shine. A pulled pin flies out with a little spin and fades.
- **Nib and Blots:** baked sprites in the line-boil frames, with poses for waiting, walking, cheering, soggy, sooty and inked.
- **Ruins:** each level's rooms painted once onto a board texture, in that ruin's stone (dressed blocks and moss in the Jungle Temple, basalt in the Volcano Shrine, sandstone in the Desert Tomb…), with carvings, vines, cobwebs and torch brackets. Torch flames flicker on top with a warm glow.
- **Around the board:** the rock, sky and ground repeat as seamless tiles across the whole screen, so a wide screen shows more of the world and never bare paper. Each ruin has its own: jungle ferns above the Jungle Temple, dunes over the Desert Tomb, snow over the Frozen Monastery.

## Sound

Synthesized, as in the other games:
- the pins: a bright "shink" when one comes out, and a click when a gate pin goes back
- the liquids: a water glug that follows how much is flowing, a lava bubble, a steam hiss when the two meet
- the rest: a coin cascade, a Blot squelch, a blast thump, Nib's little cheer and yelp
- a bed for each ruin: jungle birds and drips in the temple, rumbling in the volcano, wind in the tomb

## Building it

- **Simulation:** our own grain simulation on a grid, at a fixed 120 steps a second with no randomness, so the same pulls always give the same result. Solid bodies run in the same fixed step. Phaser 4 draws, as in the other games.
- **A level is data:** walls, pins and their kinds, materials, Nib, Blots and the goal. A dev-only editor scene places them and exports the data.
- **The solver bot checks every level:**
  - It tries every pull order, waiting for things to settle between pulls; 7 pins give 5,040 orders.
  - On gate and spring levels it also tries pulls at set moments.
  - Every level must have at least one winning order.
  - From chapter 1 level 4 on, most orders must lose, so no level can be won by pulling at random.
  - `test/levels.test.ts` runs it on every level and prints how many orders win.
- **Biggest risk: the simulation.** Thousands of grains at 120 steps a second on a cheap phone. Build and measure it before anything else.

## Selling it

- **Free and paid:** chapter 1 (10 levels) is free. The other 9 chapters are a $4.99 one-time purchase, with no ads and nothing else to buy. Hints are free.
- **Search page:** "The pin puzzle from the ads, without the ads", in the "games like" pattern ([seo-playbook.md](seo-playbook.md)). Brand names (Homescapes, Hero Wars) appear only in its text, as comparisons, never in our title, art or ads.
- **Shorts:** the ads' own hook ("which pin first?") with the real game and a funny fail. The obvious pin is wrong, then the right order plays. Every frame is real gameplay, which is the opposite of the ads that got banned.

## Open questions

- Should gate pins come in chapter 2 (with lava, where amounts matter most) or later?
- Release date: after InkSnake (Sun Nov 1). InkHeroes is still on its branch.
