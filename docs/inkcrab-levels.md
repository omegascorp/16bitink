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

**What moves in the backdrops** (every beach): each sky's clouds are their own `clouds` layer, drifting on the wind (gently over the atoll, dunes and mangroves, briskly over the rock pools), while the sun stays put. Birds, the seaplane and the mangrove fisherman are movers (`src/art/backdrop/movers.ts`): sprites on their layer moving along lanes like the boats, repeating every tile. Birds beat their wings out of step with each other in a flock (frigatebirds barely, gliding), rise and fall a little as they fly, and turn to face the way they go. The atoll has its frigatebirds and the seaplane; the dunes their terns and a kestrel hanging on the wind; the rock pools their gulls, some beating against the wind; the mangroves a skein of ibis, three egrets, a brahminy kite and the fisherman. The kite, side-on like the rest, wheels in wide circles with a lazy wingbeat, turning to face the way it's going round. The fisherman drifts a little in his sampan, bobbing, and lifts and dips his rod. The result and celebration screens leave out the sky and its clouds.

## Beach 2: Dune Sea

A desert running down into a cold ocean, Namib style. Danger comes from above and below, and only real shells wash up (as on every beach).

**What's new:**

- **Dune sand.** The top rows are loose, warm-washed sand with wind ripples. It pours: a loose tile with open space under it drops a row a tick, and one on a slope steeper than 45 degrees slides down a row. Dig into it and it runs back into the hole; dig a shaft and it caves in over you. The packed sand under it holds, so deep tunnels are safe. A level's dunes are poured to rest when it's built, so nothing moves until the crab digs. Sand is still never made or lost (`games/inkcrab/src/logic/dunes.ts`).
- **Kestrel** (sky): patrols high over the beach. Seeing a smaller crab out in the open (nothing over it but sky), it hovers over it with a red dashed shadow on the sand that tightens as its aim settles, then stoops on the spot it marked. The warning lasts 1.8 s. Under a roof of sand you're out of reach, and it gives up after 1.5 s. Hidden in your shell, it stoops anyway: the strike glances off the shell ("tok!") and it flies off for a while. Grow past its size and it ignores you. Being caught costs a life, as with every hunter; no shell damage (`src/logic/birds.ts`).
- **Antlion** (below): waits at the bottom of a 45-degree pit, facing a crab it sees. On the slope, the sand slides you towards the jaws at less than walking speed, so you can walk or jump out. Its jaws reach up to wherever a crab comes to rest in the funnel, so it catches (or, when smaller, is eaten by) crabs too wide to reach the one-tile bottom. The pull is the antlion's doing: a pit with no antlion in it (eaten, until another moves in) is still and doesn't slide you. Fill a big one's pit with sand and it pulls no more either.
- **Moving sand is drawn** (`src/scenes/game/sandFxView.ts`): grains and dust where dune sand pours; grains always trickling down pit walls; a stream of grains and dust from under a crab the slope is carrying in, the crab tipped down the slope; and sand the antlion flicks up at it. Pouring sand stops at anything dug up, so uncovered food stays uncovered.
- **Sandfish** (below): a skink that swims through sand (never rock), weaving up and down. It shows as ripples in the hatching (red when it can catch you) and in full only where it breaks into a tunnel. A bigger one hunts a crab that's down in the sand; it leaves crabs in the open alone. A smaller one never runs, so it can be dug out and eaten.
- **Raven:** walks the dunes, hops up walls a ghost crab would turn back at, goes down into pits and dips it can hop back out of and leaps narrow gaps, but it's too big to follow you into a tunnel. Ravens stay a size under the level's goal, so a full-grown crab can eat one.
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

## Beach 3: Tide Pool Notes

A cold granite coast: a few rows of sand over granite (so there's only so far to dig), rock shelves, and pools cut into the rock. Its idea is the tide.

**What's new:**

- **The tide** (`games/inkcrab/src/logic/tide.ts`, `water.ts`, `shore.ts`). A steady rhythm, never a deadline: each level sets a low-water row, a high-water row and a period (56–74 s); levels start at low water. The sea comes in from the right-hand edge and floods every open tile below the tide line it can reach, tunnels included. As it goes out, water that can run back down to the sea (never uphill) drains; what a hollow of rock or sand holds stays: a **rock pool**. Water left above the sea trickles into any hole dug beside or under it. Sand put down in the sea slumps flat, a row a tick (never lost). The pools start full.
- **Water is safe, just slow:** under water the crab walks at 60% speed and sinks gently. Jump is a swim stroke: each press kicks it up about 1.3 tiles, standing or not, so it can paddle up out of any pool; a stroke at the surface carries it up and out (80% of its jump on land) onto the rim. Never drowned, never harmed.
- **Each high water brings things in:** food along the strandline (where the high water meets the sand), and, on some levels, shells in order, one a tide (`tideBrings`).
- **Tide clock** in the HUD (top right): a round gauge filling and emptying with the tide, an arrow for which way it's going, and "high in 23s" / "low in 40s". A dashed pencil line across the level marks high water.
- **Fish:** blennies (small, quick) and sculpins (big-headed, slower) swim only in water: in the pools, and in the sea as it comes in. A bigger one goes for a smaller crab in the water; smaller ones are food. Left high and dry by the tide, a fish flops where it lands, slower and slower; after 4 s out of the water it dies and is food worth as much as catching it (a fish lying on its side, a cross for an eye). One left in sand dies at once and is buried food: dig it up and eat it.
- **Octopus** (in the rock): lives in a crevice in a pool wall and never leaves it. When a smaller crab comes within about 3 tiles, it stretches an arm out after it (a wriggling, tapering arm with suckers, red when it can catch you); the arm tip catches. Hiding in the shell makes it lose interest. Small octopuses are food at the den.
- **Gull:** walks the exposed shore at low water and hops up rocks; it keeps out of the water and can't reach a crab under it. As the tide comes in the gulls take off and fly away; as it goes out they fly in from the sky and land on dry ground (in the air they can't catch you).
- **Shore crabs** are the small prey.
- **Coach lessons:** `tide` (while the first tide comes in, until you've been in the water) and `octopus` (while an arm reaches for you).

Shells: flat periwinkle (1–3), dog whelk (2–4), painted top shell (2–5), necklace shell (3–6), frog shell (4–7), knobbed whelk (5–8).

| # | Id | Name | Goal | Shells | New |
| --- | --- | --- | --- | --- | --- |
| 21 | `first-tide` | First Tide | Size 4 | Flat periwinkle, dog whelk | The tide (coach: tide) |
| 22 | `rock-shelf` | Rock Shelf | Size 5 | Flat periwinkle, painted top (on a granite shelf) | Build up: rock won't dig |
| 23 | `blenny-pool` | Blenny Pool | Size 5 | Flat periwinkle, painted top | Fish in the pools (coach: hide) |
| 24 | `strandline` | Strandline | Size 6 | Flat periwinkle, painted top, necklace (buried below the tide line) | Dig at low water |
| 25 | `pool-chain` | Pool Chain | Size 6 | Flat periwinkle, dog whelk, painted top, necklace | A chain of pools; gulls at low water |
| 26 | `octopus-garden` | Octopus Garden | Size 6 | Flat periwinkle, painted top, necklace | Octopuses (coach: octopus) |
| 27 | `the-tide-brings` | The Tide Brings | Size 7 | Flat periwinkle, dog whelk, painted top; the tide brings a necklace, then a frog shell | Shells washed in |
| 28 | `low-water` | Low Water | Size 7 | …, frog shell (buried by the big pool) | Remix: gulls, sculpins, octopuses |
| 29 | `spring-tide` | Spring Tide | Size 8 | …, knobbed whelk (on the rocks) | Storm: a higher, faster tide |
| 30 | `the-last-pool` | The Last Pool | Size 8 | Every rock-pool shell, knobbed whelk on the far headland | The whole beach |

Backdrop theme `rockpool` (`src/art/backdrop/rockpool.ts`; granite, coast and shore-life helpers in `granite.ts`, `coast.ts`, `shoreLife.ts`): a breezy sky with cumulus and gulls; a slate-blue sea with whitecaps, headlands, a lighthouse and a coastguard cottage; jointed granite cliffs and sea stacks with nesting kittiwakes and sea pinks, a fishing village on a hill, a slipway, a moored crabber and a stone quay; nearest, a lichened granite shelf at low tide with bladderwrack, kelp, barnacles, limpets, mussels, anemones, a starfish and a willow crab pot. Pools are walled and floored with rock; their rim is the lower of their two sides. Water is drawn as a wash over paper (so the backdrop doesn't show through), with wavy ink lines and a firmer surface line; the dashed high-water mark shows only across open air.

## Beach 4: Mangrove Margins

A mangrove creek at low water: red mangroves standing on arching prop roots over a grey mudflat. Its idea is climbing.

**What's new:**

- **Mangrove roots** (`games/inkcrab/src/logic/roots.ts`, grown in `src/level/mangrove.ts`). Each tree (`trees: [col, height, spread]`) is a two-tile trunk standing on stilt roots, with prop roots arching down to the mud on both sides, near-level branches at the top and halfway up, and leafy crowns. Roots aren't sand tiles: they sit in their own layer, never change and never hold sand. Nothing is stopped by them. The crab, and anything that can't climb, walks straight through under a tree.
- **Climbing:** among the roots (or within a quarter tile of one), holding up takes hold. Then the crab climbs whichever way it's steered at 85% of its walking pace (a heavy shell slows it here too), and hangs on with no gravity when let be. Jump lets go with a hop; hiding in the shell or moving house lets go and drops it. Climbing out of the top of the tangle sets it on the root it climbed. The tops of roots are ledges: anything falling lands on them, the crab walks along branches, and holding down drops through. Shells and some food (45% of surface food, where a column has roots) sit up on the roots. A level puts a shell up a tree with depth `-1` (on the highest root in that column).
- **Mud** (`mud: [from, to, rows]`, thinning out at either end). Slow going on top (75% of walking pace, 85% of the jump height) but quick to dig (half the time). Dug mud is carried like sand and put down as sand. Sand (mud included) is still never made or lost. So the roots are the fast way across, and the safe one from the mud's hunters.
- **Mudskippers** skip across the mud in quick bursts after small crabs, resting between them. They can't climb.
- **Heron** (a striated heron, moving `wade`): stalks the open mud at a slow walk towards a smaller crab it can see. Within reach of its bill (3.5 tiles from the base of its neck) it freezes to take aim for 1 s, following the crab with its eye, then stabs at where it last saw it. The stab holds out a moment, then draws back, and the heron stalks on for 2.5 s before it can strike again. Only the bill catches: walking in among its legs is safe. Among the roots the crab is out of its reach. A stab on a crab hidden in its shell glances off ("tok!"). The view draws its neck, head and bill stretched out over a headless body drawing (`src/scenes/game/crittersView.ts`).
- **Tree crabs** (moving `climb`): walkers on the mud. Touching a root they take hold and climb about the tangle in any direction, after a smaller crab they see (and away from a bigger one). They let go only to drop on a crab right below them, out of the tangle.
- **Fiddler crabs** are the small prey.
- **Coach lessons:** `climb` speaks near the roots, pointing at a shell up in them, until the crab has climbed two tiles. `heron` speaks while a heron takes aim at you.
- **Easing (2026-10-10, after the first playtest found the later levels near impossible):** mud and climbing got faster, mudskippers slower with longer rests, herons shorter-billed, slower to strike and blind to a crab among their legs, tree crabs slower climbers with shorter sight; levels 37–40 have fewer and smaller hunters (one heron at most) and more food.

Shells: mangrove periwinkle (1–3; it lives up on the roots), river nerite (2–4), mud creeper (3–6), telescope snail (4–7), mud whelk (5–8).

| # | Id | Name | Goal | Shells | New |
| --- | --- | --- | --- | --- | --- |
| 31 | `knee-deep` | Knee Deep | Size 4 | Mangrove periwinkle (on the roots), river nerite | Mud and climbing (coach: climb) |
| 32 | `the-canopy` | The Canopy | Size 4 | Mangrove periwinkle, river nerite (up a tall tree) | Climb to the top and along a branch |
| 33 | `mudskipper-flats` | Mudskipper Flats | Size 6 | Mangrove periwinkle, river nerite (on the roots), mud creeper | Mudskippers (coach: hide) |
| 34 | `sunk-in-mud` | Sunk in the Mud | Size 6 | …, mud creeper (buried 4 deep in mud) | Dig the mud (coach: buried) |
| 35 | `root-to-root` | Root to Root | Size 6 | Mangrove periwinkle, river nerite, mud creeper, all on the roots | A row of trees to cross by the branches |
| 36 | `heron-watch` | Heron Watch | Size 6 | Mangrove periwinkle, river nerite (on the roots), mud creeper | The heron (coach: heron) |
| 37 | `tree-crabs` | Tree Crabs | Size 7 | …, telescope snail (high in an old tree) | Tree crabs climb after you |
| 38 | `the-tangle` | The Tangle | Size 7 | …, telescope snail (buried between two trees) | Remix: heron, mudskippers, tree crabs |
| 39 | `mangrove-maze` | Mangrove Maze | Size 8 | …, mud whelk (on the tallest tree) | Storm: deep mud, a big heron, everything |
| 40 | `the-old-mangrove` | The Old Mangrove | Size 8 | Every mangrove shell, mud whelk on top of the old mangrove | The whole beach |

Roots are drawn along the curves they were grown on (`src/art/roots.ts`, in static chunks by `src/scenes/game/rootsView.ts`, behind the sand so they run down into the mud). They are tapering ribbons of bark, crusted with oysters near the mud, under dense crowns of glossy leaves. Mud is a dark wash over the sand with glints of sky along its top (`src/art/sand.ts`).

Backdrop theme `mangrove` (`src/art/backdrop/mangrove.ts`; trees in `mangroveTrees.ts`, the far shore and boats in `estuary.ts`, birds and mud in `mudLife.ts`): a hazy, humid sky with towering cumulus, ibis, egrets and a brahminy kite; a still olive river mouth under misty hills, a village on stilts, a kelong and a sampan, with longtail boats running up and down; a wall of red mangroves on prop roots with nipa palms, a grey heron and an egret at the creek mouth and a boardwalk winding into the trees; nearest, a glistening mudflat cut by creeks, with pencil roots, crab burrows, fallen leaves, propagules, a half-sunk dugout and a bamboo crab trap. The nearest layer has no small creatures, so the level's own fiddlers and mudskippers are never mistaken for scenery.

## Beach 5: Ash & Basalt

Black volcanic sand under a smoking volcano, Galápagos style, with basalt columns standing out of it. Its idea is steam. (The first sketch was hot sand you'd have to cross in the shade; that's a timer that hurts, which the game avoids, so steam vents replaced it.)

**What's new:**

- **Steam vents** (`games/inkcrab/src/logic/vents.ts`; `vents: [col, height, period, offset]`). A shaft a tile wide and two deep, walled and floored with rock, blowing on a steady rhythm. It hisses for 1.3 s (the warning: quick spurts of steam), then blows for 0.7 s: a column of steam that throws everything over it (the crab, walking creatures, loose food) up to `height` tiles over its rim, once a blow. A small crab that has dropped into the shaft goes just as high. Steam never harms, hidden in the shell or not; in the air the crab steers as usual. It's the way up onto the basalt columns, where the shells are, and a way out from under a hunter. Sand dropped into the shaft plugs it, and it stays quiet until it's dug out.
- **Basalt columns** (`columns: [col, width, height]`): rock standing out of the sand, drawn jointed into columns.
- **Black sand** (`ground: 'black'`): the beach's sand, rock and grains are drawn dark (`BLACK_SAND` in `src/art/palette.ts`, threaded through `src/art/sand.ts`).
- **Sally Lightfoot crabs:** fast young ones, mottled sooty black on the lava (never red, so the red danger ink stands out), that hop up the rock after smaller crabs.
- **Galápagos hawk** (sky): the kestrel's behaviour with its own drawing. It hovers with a red shadow tightening on the sand, then stoops; get under rock or sand, or hide (the stoop glances off).
- **Lava lizards** are the small prey.
- **Coach lesson:** `vent` points at a nearby vent until the crab has been thrown by one. The `sky` lesson no longer names the kestrel, so it fits the hawk too.
- **Gentler from the start:** after the Beach 4 playtest, hunters here are few and always under the goal size, with at most one hawk.
- **Easing (2026-10-10, after a playtest found level 50 too hard):** the finale has two Sally Lightfoots instead of three (sizes 2–4 and 6, no size 7), a size-6 hawk instead of 7, a fifth lava lizard, more food (20 surface, 32 buried, 13 shallow) and par 980 s. It also got a starter patch (`food.start: 10`): ten extra things to eat in the 14 columns past the start, half on the surface and half a dig or two down, enough to reach about size 3 before going near the hunters. Any level can use it; it isn't stocked again.

Shells: drupe (1–3), horn shell (2–4), spindle (3–6), bonnet (4–7), harp (5–8).

| # | Id | Name | Goal | Shells | New |
| --- | --- | --- | --- | --- | --- |
| 41 | `black-sand` | Black Sand | Size 4 | Drupe, horn shell (on a column) | Steam vents (coach: vent) |
| 42 | `organ-pipes` | Organ Pipes | Size 6 | Drupe, horn shell, spindle (on the tall column) | Vents of different strengths |
| 43 | `sally-lightfoot` | Sally Lightfoot | Size 6 | Drupe, horn shell, spindle | Sally Lightfoot crabs (coach: hide) |
| 44 | `under-the-ash` | Under the Ash | Size 6 | …, spindle (buried 4 deep) | Dig; plug a vent in the way (coach: buried) |
| 45 | `vent-field` | Vent Field | Size 7 | …, bonnet (on the last column) | A chain of vents and columns |
| 46 | `hawk-island` | Hawk Island | Size 7 | …, bonnet (on a column) | The hawk (coach: sky) |
| 47 | `fumarole-ridge` | Fumarole Ridge | Size 7 | …, bonnet (on the high column) | Remix: vents, Sally Lightfoots, hawk |
| 48 | `lava-tubes` | Lava Tubes | Size 7 | …, bonnet (buried among lava boulders) | Remix: digging among rocks and vents |
| 49 | `eruption` | Eruption | Size 8 | …, harp (on the tallest column) | Storm: the vents blow fast and high |
| 50 | `the-summit-vent` | The Summit Vent | Size 8 | Every basalt shell, harp on the great column | The whole beach |

Vents are drawn by `src/scenes/game/ventsView.ts`: a sulphur crust round each mouth, a lazy wisp when quiet, spurts while it hisses, a billowing column as it blows; nothing while plugged. "whoosh!" floats up when the crab is thrown.

Backdrop theme `basalt` (`src/art/backdrop/basalt.ts`; landforms in `lava.ts`, plants and animals in `galapagos.ts`): a hard, bright equatorial sky with a small fierce sun; drifting fair-weather cumulus and rags of volcanic haze; the deep blue Pacific under a broad Galápagos shield volcano with a smoking summit, lava flows and cinder cones, low islands and an expedition yacht; dark basalt cliffs in columnar joints with cactus and palo santo on top, a sea arch, a steaming lava field and a tuff cone, white surf on the rocks; nearest, black rock and sand with ropy pahoehoe, a heap of big marine iguanas, a sleeping sea lion, sesuvium, a rock pool, a sulphur-crusted vent and driftwood. Movers: frigatebirds wheeling overhead, boobies and brown pelicans flying low over the water, all side-on. The nearest layer has no small creatures.

## Beaches 6–10

Each beach is its own biome: its own creatures, shells, backdrop theme and island on the map. Beaches 1–5 are built (above). Each later beach adds one new idea in slots 5–7 and keeps the arc. The biomes are set (`games/inkcrab/src/level/biomes.ts`). The order changed when Beach 2 was built: climbing and the tide each belong to one beach, not all of them, so the Dune Sea (which needs neither) moved up to 2, the tide to the rock pools (3) and climbing to the mangrove forest (4). The new ideas are a first sketch, to be decided beach by beach:

| Beach | Biome | Setting | New |
| --- | --- | --- | --- |
| 1 | Atoll Sketchbook | Maldives coral island, palms, turquoise lagoon | (the basics; built) |
| 2 | Dune Sea | Desert dunes running into the ocean | Sky and burrow hunters, pouring sand (built) |
| 3 | Tide Pool Notes | Granite shelves and rock pools | The tide, fish, octopuses, gulls (built) |
| 4 | Mangrove Margins | Mudflats and tangled stilt roots | Climbing the roots, mud that slows you; mudskippers, herons, tree crabs (built) |
| 5 | Ash & Basalt | Black sand under a smoking volcano | Steam vents that throw you up onto basalt columns; Sally Lightfoot crabs, a hawk (built) |
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
| 3 Tide Pools | Flat periwinkle, dog whelk, painted top shell, necklace shell, frog shell, knobbed whelk (built) |
| 4 Mangrove | Mangrove periwinkle, river nerite, mud creeper, telescope snail, mud whelk (built) |
| 5 Basalt | Drupe, horn shell, spindle, bonnet, harp (built) |
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

Built: walking, jumping, eating, the growth cap and bank, thirty real shells, moving house, digging and placing sand with a carry limit, buried items, ghost crabs, hiding, and the level system (level data in `games/inkcrab/src/level/beach1.ts` to `beach5.ts`, lives, win and loss, intro and result cards, the level map, saved progress). After a loss, the result card shows what actually caught the crab (a bird hovering over the shell) with a tip about getting away from it. All fifty levels are playable; Beach 1 still uses the stand-ins above. Beach 2 added dune sand, the kestrel, antlion pits, sandfish and ravens; Beach 3 the tide, fish, octopuses and gulls; Beach 4 mangrove roots to climb, mud, mudskippers, herons and tree crabs; Beach 5 steam vents, basalt columns, black sand, Sally Lightfoot crabs and a hawk.

Still to build, replacing the stand-ins:

1. **Gull:** the kestrel's code (`src/logic/birds.ts`) can stand in for it: a bird species for level 6.
2. **Tide on Beach 1:** the tide is built (Beach 3); Beach 1's levels 7 and 9 could use it in place of their stand-ins.
3. **Final molt.** For level 10 of each beach. (Climbing belongs to the mangrove beach.)
4. **Account progress:** progress is saved per browser; syncing it to the player's account (the SDK's `progress` store) is not done yet.

## Open questions

- Hand-built layouts or generated ones? InkFish generates 100 levels from 10 chapter recipes. Beach layouts matter more here (the buried shell, the high shelf), so Beach 1 should probably be hand-built, with later beaches generated from recipes plus hand-placed key shells.
- What does the final molt look like when it repeats every beach? It might need a different finale per beach.
