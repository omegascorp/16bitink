# InkCrab levels

Level plan for InkCrab: how the 100 levels are organized, and the first ten in detail. It builds on [inkcrab-design.md](inkcrab-design.md); where they differ, this document is newer.

## Structure

100 levels: 10 beaches of 10 levels, like InkFish's 10 chapters. Beach 1 is the free chapter.

- **Every level starts at size 1, in a periwinkle.** A small real sea-snail shell, so the first thing players see reads as a hermit crab. Like InkFish, each level is a whole growth run: eat, fill your shell, find the next one, move in.
- **One goal: grow to the biggest size the level allows.** That is the largest maximum among the level's shells. A growth bar runs from size 1 to the goal with a tick per size, and a dashed mark shows where your current shell stops you.
- **Goals rise through the beach,** from size 3 in level 1 to size 8, the conch, in level 10.
- **Growing gets steeper with size:** 5 + 2 × size + size × (size − 1) / 2 points of food (7 to leave size 1, 10, 14, 19, 25, 32, 40 to leave size 7), so early levels move quickly and the big sizes take real foraging.
- **Food on top, more food below.** Crumbs and sand hoppers sit on the surface and are kept stocked. Underground, food is buried in pockets of one to three, worth more the deeper you dig: lugworms and hoppers near the top (2 points), mole crabs a few tiles down (3), clams deepest (4). Every level buries some (4 in level 1, 10 in level 2, rising to 24 in level 10), and from the middle of the beach on there is more below than on top; each pocket shows as a faint highlighter smudge in the sand. On top of that, every level keeps a few things buried just one or two digs down (4 in level 1, rising to 8 in level 10), never right under the crab; as they're dug up, new ones are planted at random every few seconds, the way surface food reappears.
- **The first levels teach by doing.** A coach shows one hint at a time for the lessons a level lists, only when it's relevant, and an ink arrow points at what the hint is about (at the screen edge when it's off screen). Each lesson ends once the player has done it. Digging is taught as slopes (walk + down + dig), never straight down, since a shaft is the easiest way to get stuck; on every level, a crab stuck down a hole is told how to dig steps out at an angle.
- **3 lives per level.** Being caught by a bigger ghost crab costs a life; you keep your size and shell and get 2.5 s of grace. Losing the last life ends the level.
- **One new thing per level.** Every level teaches one verb or hazard. Later levels combine them.
- **Permanent ids.** Saves are keyed by level id, as in InkFish: never change or reuse one, even when a level is renamed or moved.
- **No timers.** Par time only earns a blot.

The design doc planned a first beach of 6–8 levels. It is now 10, to match InkFish.

## The beach arc

Every beach follows the same ten-slot arc, so new rules arrive one at a time. Later beaches swap their own debut into slots 5–7 and keep the rest.

| Slot | Role |
| --- | --- |
| 1 | Opener: the beach's food and terrain, one swap |
| 2 | A shell up high: dig and build up to it |
| 3 | The beach's hunter debuts: hide |
| 4 | A shell buried: dig for it |
| 5 | A chain of shells across the beach |
| 6 | The beach's sky or ground threat debuts |
| 7 | The tide brings a shell in |
| 8 | Remix of two earlier slots |
| 9 | Storm: the hardest level |
| 10 | Final molt |

## Stars

Three ink blots per level, like InkFish:

1. Finish the level.
2. Finish under par time.
3. Lose no lives.

## Beach 1: Atoll Sketchbook

A temperate sandy beach, dunes on the left and the waterline on the right. Its shells are common sea snails: periwinkle, snail, nerite, top shell, whelk, moon snail, triton, tun and conch.

Every level starts at size 1 in a periwinkle (fits sizes 1–2).

| # | Id | Name | Goal | Shells on the way | New |
| --- | --- | --- | --- | --- | --- |
| 1 | `pen-test` | Pen Test | Size 3 | Snail | Coach: walk and eat, then change shell |
| 2 | `margin-wall` | Margin Wall | Size 4 | Snail, nerite (on a shelf 5 tiles up) | Coach: dig, then drop sand to build up |
| 3 | `ghost-writers` | Ghost Writers | Size 4 | Snail, nerite | Coach: hide from a red ghost crab |
| 4 | `underlined` | Underlined | Size 5 | Snail, top shell (buried 5 deep) | Coach: find a buried shell by its highlighter smudge |
| 5 | `room-to-grow` | Room to Grow | Size 5 | Snail, nerite, top shell | A chain of shells across the beach, with ghost crabs |
| 6 | `shadow-sketch` | Shadow Sketch | Size 5 | Snail, top shell | Hiding in the shell from big hunters |
| 7 | `high-water-mark` | High-Water Mark | Size 6 | Snail, nerite, whelk, moon snail (by the water) | A long climb down to the waterline |
| 8 | `safe-burrow` | Safe Burrow | Size 7 | Snail, top shell, moon snail, triton (buried) | Digging a burrow to swap safely |
| 9 | `storm-tide` | Storm Tide | Size 8 | Snail, top shell, moon snail, triton, conch (dune top) | Climbing the beach shell by shell |
| 10 | `the-final-molt` | The Final Molt | Size 8 | Snail, nerite, whelk, moon snail, tun (buried), conch on the high dune | The whole beach |

### Stand-ins until the systems exist

Gulls, the tide and the final molt aren't built yet. Until they are:

- **Level 6:** two size-6 ghost crabs stand in for the gull; the lesson (hide when danger comes) is the same.
- **Levels 7 and 9:** the moon snail and conch already lie where the tide would bring them; there is no water yet.
- **Level 10:** it is a run through the whole beach to size 8; the molt and the palm climb come later.

### Creatures and backdrop

- **Sea slater:** slow and timid; it never chases, but a bigger one still catches you on touch. The easy prey of the first levels.
- **Ghost crab:** the all-round walker, from level 3.
- **Tiger beetle:** fast, dashes in bursts and sees far, from level 5. Each level has beetles in a spread of sizes: small ones to chase down and eat (they run, but rest between dashes), big ones that hunt you.

All follow the one rule (bigger catches you, smaller is food) and are inked red when they can catch you.

The levels sit in front of a hand-inked parallax beach. Beach 1 ("Atoll Sketchbook", theme `atoll`) is a Maldives coral island: a sky with a sun, cirrus wisps, heaped cumulus, frigatebirds and a seaplane; the deep blue ocean with swells, far-off palm islands and yachts, the white surf line of the reef with channel buoys, and a turquoise lagoon with coral heads, light patterns on the shallows, water villas (each a little different: one or two thatch tiers, a plunge pool or a ladder, glass doors, shutters, a lantern; mirrored in the water) on a lantern-lit jetty, a moored launch, and boats under way: yachts on the horizon and a small dhoni behind the villas drift across and wrap round, while a big dhoni works back and forth in front of them, all bobbing on the swell; nearest, coconut palms with dead fronds, screwpines on stilt roots, flowering scrub, a hammock, a palm-leaf parasol with loungers, a beach bungalow with a verandah, a beached outrigger canoe, driftwood, a sprouting coconut, shells, crab holes and ripple marks on a bank of white coral sand. The code is in `src/art/backdrop/` (shared helpers in `common.ts`, palms and villas in `tropic.ts`, boats in `boats.ts` (sailing boats are separate sprites moved by `src/scenes/game/backdropView.ts` along lanes from `src/logic/sailing.ts`; villas and the jetty are their own `resort` layer so boats can pass behind them), homes in `homes.ts`, water detail in `water.ts`, shore props in `beach.ts`, layers in `atoll.ts`). The level background is plain paper, without the notebook rules. Each later beach brings its own backdrop theme.

## Beach 2: Dune Sea

A desert running down into a cold ocean, Namib style. Danger comes from above and below, and only real shells wash up (as on every beach).

**What's new:**

- **Dune sand.** The top rows are loose, warm-washed sand with wind ripples. It pours: a loose tile with open space under it drops a row a tick, and one on a slope steeper than 45 degrees slides down a row. Dig into it and it runs back into the hole; dig a shaft and it caves in over you. The packed sand under it holds, so deep tunnels are safe. A level's dunes are poured to rest when it's built, so nothing moves until the crab digs. Sand is still never made or lost (`games/inkcrab/src/logic/dunes.ts`).
- **Kestrel** (sky): patrols high over the beach. Seeing a smaller crab out in the open (nothing over it but sky), it hovers over it with a red dashed shadow on the sand that tightens as its aim settles, then stoops on the spot it marked. The warning lasts 1.8 s. Under a roof of sand you're out of reach, and it gives up after 1.5 s. Hidden in your shell, it stoops anyway: the strike glances off the shell ("tok!") and it flies off for a while. Grow past its size and it ignores you. Being caught costs a life, as with every hunter; no shell damage (`src/logic/birds.ts`).
- **Antlion** (below): waits at the bottom of a 45-degree pit. On the slope, the sand slides you towards the jaws at less than walking speed, so you can walk or jump out. Small antlions are food; fill a big one's pit with sand and it pulls no more.
- **Sandfish** (below): a skink that swims through sand (never rock), weaving up and down. It shows as ripples in the hatching (red when it can catch you) and in full only where it breaks into a tunnel. A bigger one hunts a crab that's down in the sand; it leaves crabs in the open alone. A smaller one never runs, so it can be dug out and eaten.
- **Raven:** walks the dunes and hops up walls a ghost crab would turn back at, but it's too big to follow you into a tunnel.
- **Darkling beetles** are the beach's small prey, in place of sea slaters.
- **Coach lessons:** `sky`, `pit` and `sandfish` speak up when the danger first comes up and end once you've got out of it.

Shells: desert snail (1–3), turban (2–5), olive (3–6), murex (4–7), helmet (5–8), plus the nerite in the first and last levels.

| # | Id | Name | Goal | Shells | New |
| --- | --- | --- | --- | --- | --- |
| 11 | `shifting-sands` | Shifting Sands | Size 4 | Desert snail, nerite (buried) | Dune sand pours |
| 12 | `dune-crest` | Dune Crest | Size 5 | Desert snail, turban (on a mesa) | Build up: placed sand doesn't pour |
| 13 | `kestrel-shadow` | Kestrel Shadow | Size 5 | Desert snail, turban | Kestrel debuts (coach: sky) |
| 14 | `under-the-dune` | Under the Dune | Size 6 | Desert snail, turban, olive (7 deep) | Dig through loose sand to a buried shell |
| 15 | `antlion-alley` | Antlion Alley | Size 6 | Desert snail, turban, olive | Antlion pits (coach: pit) |
| 16 | `sandfish-shallows` | Sandfish Shallows | Size 6 | Desert snail, turban (buried), olive | Sandfish debut (coach: sandfish), kestrel above |
| 17 | `raven-ridge` | Raven Ridge | Size 7 | Desert snail, turban, olive, murex (by the sea) | Ravens, pits, kestrel |
| 18 | `mirage` | Mirage | Size 7 | Desert snail, turban, olive, murex (buried between pits) | Remix: pits, sandfish, kestrel |
| 19 | `sandstorm` | Sandstorm | Size 8 | Desert snail, turban, olive, murex, helmet (dune top) | Storm: deep loose sand, two kestrels, everything |
| 20 | `the-great-dune` | The Great Dune | Size 8 | Every Dune Sea shell, helmet on the Great Dune | The whole beach |

Backdrop theme `dunes` (`src/art/backdrop/dunes.ts`, props in `desert.ts`): a hazy apricot sky with mackerel cloud, kestrels and terns; the cold grey-green Atlantic with a fog bank, long surf lines, a ruined lighthouse and a trawler aground; giant star dunes with knife-edge crests, a camel line and gemsbok; nearest, a wind-rippled bank with camelthorn trees, welwitschia, a signpost, bleached whale ribs and 4x4 tracks.

Beach 2 comes with the full game: without it, the map's Play button on its levels offers the unlock. For local testing, `DEV_UNLOCK=true` (and `DEV_ALL_LEVELS=true`) work for InkCrab's dev server as they do for InkFish's, from the environment or `apps/web/.env`.

## Beaches 3–10

Each beach is its own biome: its own creatures, shells, backdrop theme and island on the map. Each later beach adds one new idea in slots 5–7 and keeps the arc. The biomes are set (`games/inkcrab/src/level/biomes.ts`). The order changed when Beach 2 was built: climbing and the tide each belong to one beach, not all of them, so the Dune Sea (which needs neither) moved up to 2, the tide to the rock pools (3) and climbing to the mangrove forest (4). The new ideas are a first sketch, to be decided beach by beach:

| Beach | Biome | Setting | New |
| --- | --- | --- | --- |
| 1 | Atoll Sketchbook | Maldives coral island, palms, turquoise lagoon | (the basics; built) |
| 2 | Dune Sea | Desert dunes running into the ocean | Sky and burrow hunters, pouring sand (built) |
| 3 | Tide Pool Notes | Granite shelves and rock pools | The tide: fish at high tide, octopus in crevices |
| 4 | Mangrove Margins | Mudflats and tangled stilt roots | Climbing the roots; mud that slows you |
| 5 | Ash & Basalt | Black sand under a smoking volcano | Hot sand at midday; shade to cross |
| 6 | Fog & Kelp | Cold coast, kelp beds, a lighthouse | Fog that hides what's coming; kelp washed up as cover |
| 7 | Wreck Cove | Driftwood and an old ship on the rocks | Rival hermit crabs; stealing from smaller crabs |
| 8 | Monsoon Harbour | Stilt houses, nets, fishing boats | Nets and boats as cover; monsoon rain |
| 9 | Frost Shingle | Pebbles, ice floes, a cold wind | Vacancy chains |
| 10 | Moonlit Bay | Night beach, glowing tide | Darkness, glowing plankton; the last final molt |

## Shells

Only real shells, the kinds hermit crabs actually live in: no litter or other man-made objects, and no coconut halves. Each beach brings about five of its own, chosen so their size ranges climb from 1 to 8 and their outlines differ at a glance. Ten beaches of real sea and land snail shells:

| Beach | Shells (smallest first) |
| --- | --- |
| 1 Atoll | Periwinkle, snail, nerite, top shell, whelk, moon snail, triton, tun, conch (built) |
| 2 Dune Sea | Desert snail, turban, olive, murex, helmet (built) |
| 3 Tide Pools | Flat periwinkle, dog whelk, painted top shell, necklace shell, frog shell |
| 4 Mangrove | Mangrove periwinkle, river nerite, mud creeper, telescope snail, mud whelk |
| 5 Basalt | Drupe, horn shell, spindle, bonnet, harp |
| 6 Fog & Kelp | Black turban, kelp snail, Kellet's whelk, Oregon triton, wavy turban |
| 7 Wreck Cove | Nassa, fig shell, tulip shell, lightning whelk, horse conch |
| 8 Monsoon Harbour | Auger, babylon, cone, spider conch, Indian volute |
| 9 Frost Shingle | Wentletrap, Arctic moon snail, Neptune whelk, Arctic whelk, Iceland whelk |
| 10 Moonlit Bay | Tiger moon snail, giant tun, horned helmet, triton's trumpet, baler |

Shells keep a weight (heavier is slower and jumps lower) and a durability value that nothing uses: being caught costs a life and never damages the shell.

## Level map

Level select is a beachcomber's chart seen from above, scrolling sideways. Each beach is an island in its biome's colours, with landmark sketches (palms and water villas; mangroves; rock pools and a starfish; a volcano and basalt columns; pines, kelp and a lighthouse; dunes and an oasis; a wreck; stilt houses, boats and nets; ice floes and pebbles; a moonlit, glowing shore). Its ten levels sit along the sand as numbered rings joined by crab tracks. A dashed sea route with a small sailboat links each island's last level to the next island's first. A compass rose sits in the water before the first island.

- **Level states:** played levels are tinted with their blots under them; the next level has a red ring, the hermit crab bobbing over it, and its name, goal and a Play button below; levels further on are pencil. Played stretches of track are inked, the way ahead is pencil. Hovering a level shows its name.
- **Unbuilt beaches** are drawn in full but washed back to a pencil draft, marked "uncharted · coming soon", with pencil rings numbered 11–100.
- **Getting around:** drag, scroll or use the arrow keys; tabs 1–10 at the bottom jump between islands, and the caption above them names the island in view.
- **Code:** layout (pure, tested) in `games/inkcrab/src/scenes/map/layout.ts`; the chart is drawn in `src/art/map/` and baked in 1024 px chunks around the camera, freed when far away (`chartView.ts`), so the long chart never sits in memory whole.

## What exists, what to build

Built: walking, jumping, eating, the growth cap and bank, fourteen real shells, moving house, digging and placing sand with a carry limit, buried items, ghost crabs, hiding, and the level system (level data in `games/inkcrab/src/level/beach1.ts` and `beach2.ts`, lives, win and loss, intro and result cards, the level map, saved progress). All twenty levels are playable; Beach 1 still uses the stand-ins above. Beach 2 added dune sand, the kestrel, antlion pits, sandfish and ravens.

Still to build, replacing the stand-ins:

1. **Gull:** the kestrel's code (`src/logic/birds.ts`) can stand in for it: a bird species for level 6.
2. **Tide:** water fill, flooding tunnels, washing away placed sand, shells washing in, storm tide. For levels 7 and 9.
3. **Final molt.** For level 10 of each beach. (Climbing belongs to the mangrove beach.)
4. **Account progress:** progress is saved per browser; syncing it to the player's account (the SDK's `progress` store) is not done yet.

## Open questions

- Hand-built layouts or generated ones? InkFish generates 100 levels from 10 chapter recipes. Beach layouts matter more here (the buried shell, the high shelf), so Beach 1 should probably be hand-built, with later beaches generated from recipes plus hand-placed key shells.
- What does the final molt look like when it repeats every beach? It might need a different finale per beach.
