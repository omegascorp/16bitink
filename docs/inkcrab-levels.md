# InkCrab levels

Level plan for InkCrab: how the 100 levels are organized, and the first ten in detail. It builds on [inkcrab-design.md](inkcrab-design.md); where they differ, this document is newer.

## Structure

100 levels: 10 beaches of 10 levels, like InkFish's 10 chapters. Beach 1 is the free chapter.

- **Every level starts at size 1, in a periwinkle.** A small real sea-snail shell, so the first thing players see reads as a hermit crab. Like InkFish, each level is a whole growth run: eat, fill your shell, find the next one, move in.
- **One goal: grow to the biggest size the level allows.** That is the largest maximum among the level's shells. A growth bar runs from size 1 to the goal with a tick per size, and a dashed mark shows where your current shell stops you.
- **Goals rise through the beach,** from size 3 in level 1 to size 8, the conch, in level 10.
- **Growing gets steeper with size:** 5 + 2 × size + size × (size − 1) / 2 points of food (7 to leave size 1, 10, 14, 19, 25, 32, 40 to leave size 7), so early levels move quickly and the big sizes take real foraging.
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

## Beach 1: Driftline Sketchbook

A temperate sandy beach, dunes on the left and the waterline on the right. Trash shells (bottle cap, light bulb, tin can, jam jar) and the common natural ones (periwinkle, snail, whelk, moon snail, conch).

Every level starts at size 1 in a periwinkle (fits sizes 1–2).

| # | Id | Name | Goal | Shells on the way | New |
| --- | --- | --- | --- | --- | --- |
| 1 | `pen-test` | Pen Test | Size 3 | Snail | Coach: walk and eat, then change shell |
| 2 | `margin-wall` | Margin Wall | Size 4 | Snail, light bulb (on a shelf 5 tiles up) | Coach: dig, then drop sand to build up |
| 3 | `ghost-writers` | Ghost Writers | Size 4 | Snail, light bulb | Coach: hide from a red ghost crab |
| 4 | `underlined` | Underlined | Size 5 | Snail, tin can (buried 5 deep) | Coach: find a buried shell by its highlighter smudge |
| 5 | `room-to-grow` | Room to Grow | Size 5 | Snail, light bulb, tin can | A chain of shells across the beach, with ghost crabs |
| 6 | `shadow-sketch` | Shadow Sketch | Size 5 | Snail, tin can | Hiding in the shell from big hunters |
| 7 | `high-water-mark` | High-Water Mark | Size 6 | Snail, light bulb, whelk, moon snail (by the water) | A long climb down to the waterline |
| 8 | `safe-burrow` | Safe Burrow | Size 7 | Snail, tin can, moon snail, jam jar (buried) | Digging a burrow to swap safely |
| 9 | `storm-tide` | Storm Tide | Size 8 | Snail, tin can, moon snail, jam jar, conch (dune top) | Climbing the beach shell by shell |
| 10 | `the-final-molt` | The Final Molt | Size 8 | Snail, light bulb, whelk, moon snail, coconut half (buried), conch on the high dune | The whole beach |

### Stand-ins until the systems exist

Gulls, the tide and the final molt aren't built yet. Until they are:

- **Level 6:** two size-6 ghost crabs stand in for the gull; the lesson (hide when danger comes) is the same.
- **Levels 7 and 9:** the moon snail and conch already lie where the tide would bring them; there is no water yet.
- **Level 10:** it is a run through the whole beach to size 8; the molt and the palm climb come later.

## Beaches 2–10

Each later beach adds one new idea in slots 5–7, keeps the arc, and brings its own shells. A first sketch, to be decided beach by beach:

| Beach | Setting | New |
| --- | --- | --- |
| 2 | Dune grass | Rival hermit crabs; stealing from smaller crabs |
| 3 | Pebble cove | Vacancy chains |
| 4 | Tidepools | Fish at high tide, octopus in crevices |
| 5 | Mangrove | Roots to climb, mud that slows you |
| 6 | Harbor | Trash shells everywhere; human litter as cover |
| 7 | Black sand | Hot sand at midday; shade to cross |
| 8 | Storm beach | Frequent storm tides |
| 9 | Night beach | Darkness, glowing plankton |
| 10 | Coconut atoll | Palms everywhere; the last final molt |

## What exists, what to build

Built: walking, jumping, eating, the growth cap and bank, nine shells, moving house, digging and placing sand with a carry limit, buried items, ghost crabs, hiding, and the level system (level data in `games/inkcrab/src/level/beach1.ts`, lives, win and loss, intro and result cards, level select, saved progress). All ten levels are playable with the stand-ins above.

Still to build, replacing the stand-ins:

1. **Gull:** shadow warning, dive, respects hiding. For level 6.
2. **Tide:** water fill, flooding tunnels, washing away placed sand, shells washing in, storm tide. For levels 7 and 9.
3. **Climbing, palms, coconuts, final molt.** For level 10.
4. **Account progress:** progress is saved per browser; syncing it to the player's account (the SDK's `progress` store) is not done yet.

## Open questions

- Hand-built layouts or generated ones? InkFish generates 100 levels from 10 chapter recipes. Beach layouts matter more here (the buried shell, the high shelf), so Beach 1 should probably be hand-built, with later beaches generated from recipes plus hand-placed key shells.
- What does the final molt look like when it repeats every beach? It might need a different finale per beach.
