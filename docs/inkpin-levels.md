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
| 2 | Gold Rush | Loot | Gold routing, the first lava | Ramps before hoppers, a trough of pins that lock each other, a trapdoor to leave shut until the gold is picked up, and a lava pit to cool to stone before the gold drops on it |
| 3 | The Rain Cistern | Treasure | The first crate | The boulder plugs the cistern's drain and the rain floats Nib up; a sluice fills a narrow pit (an overflow holds the water at one height) and its crate floats up as the step to a ledge; a hopper over a ramp |
| 4 | The Guard | Treasure | Three ways past a guard | Lava burns the first boar and water cools it to stone (water first freezes the lava in its tank); water washes the second; a crate drops on a porcupine and stays as the step out of its pit |
| 5 | The Gold Vault | Loot | Lava | A moat to bridge with stone before the gold comes, a tank of lava under water that burns a porcupine, a boulder plug, and the vault: water must grow the seed to the chest and wall off the lava before the lava comes, or it burns the seed |
| 6 | Pin Over Pin | Treasure | Pin order, crate barricades | A crate dropped on a porcupine fills its pit as a bridge; a boar's cell door before its water; gold before its ramp; a crate wedged in the way that a trickle of lava burns away, gate shut until it's gone |
| 7 | The Well of Vines | Treasure | Seeds | Two screens tall: one tank waters four seeds on the way down the well; cap the lava over the top seed with stone first, and open the hatch only once the basin seeds have drunk |
| 8 | The Flooded Stair | Loot | Crate rafts | One flood down the stair: it carries a crate into a slot as a bridge, floats another up a well as the step to a ledge, and a third crate drops on a porcupine |
| 9 | Torches Out | Treasure | Lava as light | Lights out: glowing lava cooled into a step, a seed grown in the dark up to a shelf, and lava poured down a shaft onto a porcupine, then cooled with the water above it |
| 10 | The Idol Hall | Boss | The finale | A crate lowered on draining water as a bridge, a lava moat turned to stone before the gold, a seed grown up to the boss hall; then the Great Boar: both tanks into the cistern over it, then open it, and only the whole flood washes it away |

## 2. The Volcano Shrine

**New ground: crumbling basalt ledges** that fall once Nib steps off them, so routes go one way, and **stone bridges** Nib makes himself by cooling lava. **Material:** lava. **Blot:** the Ember Blot (lava can't hurt it, only water). **Pin:** the gate pin (tap again to push it back in).

| # | Name | Goal | What happens |
|---|---|---|---|
| 1 | Black Steps | Treasure | Crumbling ledges: every ledge Nib leaves falls, so plan the route before walking it |
| 2 | First Fire | Treasure | A lava moat between Nib and the chest; pour water on it and walk across the new stone |
| 3 | The Stone Bridge | Treasure | Cool the lava where Nib needs a floor while keeping the gold away from the rest of it |
| 4 | Ember Blot | Clear | An Ember Blot bathes in lava; only water ends it |
| 5 | The Molten Hoard | Loot | Gold above a river of lava: cool a channel for it first |
| 6 | Just Enough | Treasure | A gate pin: cut the water once the lava is stone, or the rest washes the gold into the drain |
| 7 | The Caldera | Treasure | Two screens down a crater on one-way ledges, pouring your own bridges on the way |
| 8 | Fire and Flood | Loot | Remix: lava, gates, Ember Blots and crumbling ledges |
| 9 | Ember Light | Treasure | Lights out: only the lava glows, and cooling it makes the room darker |
| 10 | The Fire Idol | Boss | The idol pours lava from three mouths in turn; cool each one with just enough water from gate pins |

## 3. The Desert Tomb

**New ground: pressure plates and sand.** A plate opens a stone door while something heavy sits on it: Nib, a coin pile, sand or a boulder. Sand pours and heaps into ramps Nib can walk up. **Material:** tomb gas (rises, Nib can't breathe it; a torch makes it a blast that breaks cracked walls). **Blot:** the Puff Blot (floats on gas). **Pin:** chain pins.

| # | Name | Goal | What happens |
|---|---|---|---|
| 1 | The Sealed Door | Treasure | Nib can hold the door open by standing on its plate, but then he can't go through it. Pour sand on the plate instead |
| 2 | Bad Air | Treasure | Gas rises up the shaft; vent it up the chimney, away from Nib's path |
| 3 | The Blasting Chamber | Treasure | Lead the gas to a torch and the blast breaks the cracked wall to the chest |
| 4 | Puff Blot | Clear | The Puff Blot rides the gas; vent the gas and it sinks into the water |
| 5 | The Burial Gold | Loot | Gold sealed in three chambers; blast them open in an order that doesn't bury the coins |
| 6 | Chained | Treasure | Chain pins: pulling one also pulls its twin across the room |
| 7 | The Deep Shaft | Treasure | Two screens tall: build sand ramps with each pour to climb up to the chest |
| 8 | The Fennec | Escort | Remix: free a fennec fox from a cage with a plate-lock door, and bring it out |
| 9 | Lamp in the Tomb | Treasure | Lights out: the gas glows faintly green, so you see where it is, not where it goes |
| 10 | The Tomb Guardian | Boss | The Guardian breathes gas at Nib; light its breath to bring its own wall down on it |

## 4. The Frozen Monastery

**New ground: ice floors.** Nib slides until something stops him: a wall, an ice block or a pin still in, so pins become stoppers. Frozen pools are floors to walk on. **Material:** ice (frost freezes still water into blocks; lava melts them). **Blot:** the Frost Blot (frozen solid, so water does nothing until it's thawed). **Pin:** the lock pin (a falling key opens it).

| # | Name | Goal | What happens |
|---|---|---|---|
| 1 | The Bell Court | Treasure | Ice floors: pull pins in the order that stops Nib's slide by the chest, not past it |
| 2 | Frost | Treasure | Frost freezes the pool into a block that slides into the gap and becomes Nib's floor |
| 3 | Thaw | Treasure | Lava melts the ice wall but also the floor; pick which melts first |
| 4 | Frost Blot | Clear | Thaw the Frost Blot with a little lava, then wash it away |
| 5 | The Monks' Treasury | Loot | The coins slide on ice too; sweep the room in one long slide to catch them |
| 6 | The Key | Treasure | A lock pin: drop the key down the right shaft to open it |
| 7 | The Icefall | Treasure | Two screens of icy slopes and frozen pools; slide down from ledge to ledge |
| 8 | The Snow Monkey | Escort | Remix: free a snow monkey frozen into the ice, without melting the floor under Nib |
| 9 | Candle Hall | Treasure | Lights out: candles melt the ice near them, and the dark ice is still slippery |
| 10 | The Ice Wyrm | Boss | The Wyrm freezes every pool on its breath; pull between breaths |

## 5. The Alchemist's Ruin

**New ground: wooden scaffolds** that acid eats, so Nib drops down through holes you open (routes go down, one way). **Material:** acid (eats wood, stone, Blots and Nib; water dilutes it). **Blot:** the Sponge Blot (soaks up water and grows; only acid or lava shrinks it). **Pin:** the spring pin (snaps back in after 2 seconds).

| # | Name | Goal | What happens |
|---|---|---|---|
| 1 | The Fallen Tower | Treasure | Scaffolds and trapdoors: Nib can drop down but never climb back, so go down in the right order |
| 2 | Green Drops | Treasure | Acid eats the wooden floor under the chest and drops it to Nib |
| 3 | Dilute | Treasure | Thin the acid with water until it's safe for Nib to wade through |
| 4 | Sponge Blot | Clear | The Sponge Blot drinks the water and grows; shrink it with acid |
| 5 | The Gold Flasks | Loot | Acid can't eat gold: let it cut channels for the coins to run to Nib |
| 6 | Spring Loaded | Treasure | A spring pin lets only a short pour through, just enough for the job |
| 7 | The Tower Stair | Treasure | Two screens: climb up while the acid you release eats the stair behind you |
| 8 | The Owl | Escort | Remix: free the alchemist's owl from a cage of wood, without the acid reaching it |
| 9 | Glow Flasks | Treasure | Lights out: only the bubbling flasks glow |
| 10 | The Cauldron Blot | Boss | It boils over in waves of three colours; send each wave the material it fears |

## 6. The Clockwork Citadel

**New ground: lifts and trapdoors** moved by weight and pins, never by timers. Nib rides a lift; his own weight sends it down, and water or coins in the other bucket bring it up. **Material:** mechanisms (water wheels, scales, counterweights). **Blot:** the Clockwork Blot (marches on a beat). **Pin:** the turn pin (a platform swings a quarter turn).

| # | Name | Goal | What happens |
|---|---|---|---|
| 1 | The Gatehouse | Treasure | A counterweight lift: fill its other bucket with water to lift Nib to the chest |
| 2 | The Water Wheel | Treasure | Water turning the wheel opens the gate, for as long as it flows |
| 3 | Balance | Treasure | Scales: put just enough weight on one pan to raise Nib on the other |
| 4 | Clockwork Blot | Clear | It marches on a beat; drop a boulder where it will be |
| 5 | The Mint | Loot | Coins ride a wheel of buckets up to Nib's level, and a wrong pull spills them |
| 6 | Quarter Turn | Treasure | A turn pin swings a platform and tips everything on it, Nib included if he's standing there |
| 7 | The Great Shaft | Treasure | Two screens of lifts; each one needs the right weight |
| 8 | The Brass Bird | Escort | Remix: free a wind-up bird from a gearbox cage, then ride out together |
| 9 | Night Shift | Treasure | Lights out: lamps on the lifts light the shaft as they move |
| 10 | The Pendulum | Boss | A giant pendulum swings through the shaft; pull on the right swing |

## 7. The Lost City in the Canopy

**New ground: vines you grow and leaf platforms** that bend down under weight (Nib, water or coins) and spring back. **Material:** seeds (water grows vines into bridges and ladders; fire burns them). **Blot:** the Thorn Blot (water and boulders bounce off; only fire works). **Pin:** the weight pin (pulls itself once enough weight piles on its plate).

| # | Name | Goal | What happens |
|---|---|---|---|
| 1 | The Treetop Gate | Treasure | Leaf platforms: Nib's weight lowers a leaf to the next branch; a pour of water lowers it further |
| 2 | Green Shoots | Treasure | Water a seed and it grows into a ladder up to the chest |
| 3 | Burn the Bridge | Treasure | Grow one vine to cross, then burn it so the Blot can't follow |
| 4 | Thorn Blot | Clear | Only fire ends a Thorn Blot, and fire also burns your vines |
| 5 | The Canopy Coffers | Loot | Gold rains through the branches; catch it on leaves that bend toward Nib |
| 6 | Heavy | Treasure | A weight pin pops out by itself once enough coins land on its plate |
| 7 | The Great Tree | Treasure | Two screens: grow a ladder up the trunk, one watering at a time |
| 8 | The Tree Frog | Escort | Remix: free a tree frog from a thorn cage, without burning its branch |
| 9 | Fireflies | Treasure | Lights out: fireflies light the room and scatter from water |
| 10 | The Snapweed | Boss | A giant plant that eats Blots; wash every Blot into its mouth before it turns to Nib |

## 8. The Sea Cave of the Pirate King

**New ground: tides and floating barrels.** Sea-gate pins raise or lower the water in a room, and Nib floats up with it to reach high decks; barrels float as rafts. **Material:** bombs and powder kegs. **Blot:** the Shell Blot (only a blast cracks it). **Pin:** the fuse pin (burns away when a flame reaches it; water puts the fuse out).

| # | Name | Goal | What happens |
|---|---|---|---|
| 1 | Low Tide | Treasure | Open the sea gate, the cave floods, and Nib floats up to the deck where the chest is |
| 2 | Powder | Treasure | A bomb's blast breaks the wall and pushes everything, including the coins |
| 3 | The Wreck | Treasure | Douse one fuse and light another to blow the right hole in the hull |
| 4 | Shell Blot | Clear | Only a blast cracks a Shell Blot; get the bomb to it, not to Nib |
| 5 | The Pirate King's Chest | Loot | Barrels of gold float in on the tide; break them where Nib can gather the coins |
| 6 | Slow Fuse | Treasure | A fuse pin burns away when the flame reaches it, unless the water gets there first |
| 7 | The Mast | Treasure | Two screens up a sunken mast: raise the tide room by room to float Nib to the crow's nest |
| 8 | The Parrot | Escort | Remix: free the Pirate King's parrot from its cage on a sinking deck |
| 9 | Lantern Below Decks | Treasure | Lights out: lit by a swinging lantern and the sparks of fuses |
| 10 | The Kraken Blot | Boss | Its tentacles push pins back in; blast the tentacles first |

## 9. The Cloud Fortress

**New ground: wind.** Fans, switched by pins, push Nib sideways and carry him over a gap while they blow. **Material:** balloons and wind (balloons lift, fans blow grains and gas sideways). **Blot:** the Bat Blot (flies over gaps; only falling water or a blast brings it down). **Pin:** the balloon pin.

| # | Name | Goal | What happens |
|---|---|---|---|
| 1 | The Windy Wall | Treasure | A fan carries Nib over the gap while it blows; pull the pin that stops it once he's over |
| 2 | Up and Away | Treasure | A balloon lifts a crate (or Nib) to the ledge above |
| 3 | Crosswind | Treasure | The fan blows the water sideways into the room the Blot is in |
| 4 | Bat Blot | Clear | The Bat Blot flies over the gap; drop the water on it as it passes |
| 5 | The Sky Vault | Loot | Fans blow the pouring gold away from the edge of the fortress and toward Nib |
| 6 | Tied Down | Treasure | A balloon pin: pull it and the balloon lifts the cage it's tied to |
| 7 | The Tower Above the Clouds | Treasure | Two screens up, from balloon to balloon |
| 8 | The Mountain Goat | Escort | Remix: free a mountain goat from a tower cage and float it down |
| 9 | Night Sky | Treasure | Lights out: lightning flashes show the room for an instant |
| 10 | The Thunderhead | Boss | Its lightning strikes the tallest metal thing on its beat; lead it with keys and coins |

## 10. The Dragon's Hoard

**New ground: all of it.** Each level remixes two earlier ruins on the way down to the hoard. **Material:** everything. **Blot:** every Blot. **Pin:** every pin.

| # | Name | Goal | What happens |
|---|---|---|---|
| 1 | The Last Page | Treasure | The Atlas page opens the mountain door: vines, ledges and lifts |
| 2 | Fire and Ice | Treasure | Volcano and Monastery: lava, ice floors and crumbling ledges |
| 3 | Powder and Gas | Treasure | Tomb and Sea Cave: blasts, tides and plates |
| 4 | The Ink Guard | Clear | One of every Blot, each needing its own material |
| 5 | The Hoard | Loot | The biggest pour of gold in the game, through every kind of room |
| 6 | Every Pin | Treasure | Gate, chain, lock, spring, turn, weight, fuse and balloon pins in one puzzle |
| 7 | The Long Climb | Treasure | Three screens tall: up through every kind of ground |
| 8 | The Atlas Friends | Escort | Remix: free all the friends from earlier chapters, who were caught again |
| 9 | Dragon's Breath | Treasure | Lights out: only the dragon's distant fire lights the vault |
| 10 | The Ink Dragon | Boss | Three screens tall: it breathes fire down the vault on a rhythm as Nib climbs to the hoard |

## What each ruin needs built

| Ruin | New engine work |
|---|---|
| 1 | Vines to climb, seeds that grow vines, floating crates, boulders, the drain, dark levels, wide and tall levels, the boss (built) |
| 2 | Crumbling ledges, gate pins |
| 3 | Pressure plates and doors, sand, gas, blasts, cracked walls, chain pins |
| 4 | Ice floors and sliding, ice blocks, frost, keys and lock pins |
| 5 | Wooden platforms, acid, spring pins |
| 6 | Lifts, scales, water wheels, trapdoors, turn pins |
| 7 | Bending leaves, fire, weight pins (seeds are built in ruin 1; here they grow sideways and bridge gaps) |
| 8 | Sea gates and tides, bombs and fuses, fuse pins (floating crates are built in ruin 1; barrels add rolling) |
| 9 | Fans, balloons, flying Blots, balloon pins |
| 10 | Three-screen levels |
