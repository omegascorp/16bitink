# InkFish: mechanics research

Ten "eat smaller to grow" games, researched October 2026, and what InkFish takes from each.

| # | Game | Growth model | Standout mechanic | Taken into InkFish |
|---|---|---|---|---|
| 1 | **Feeding Frenzy** (2004, PC/XBLA) | Meter fills; discrete growth spurts | The moment a former predator becomes food | ✅ 3-tier growth meter per level |
| 2 | **Feeding Frenzy 2** (2006) | Same, 60 levels, 6 characters | Frenzy multiplier up to 6×; *shrink-enemy* power-up | ✅ Frenzy ×1–×5, ✅ Shrink-ink |
| 3 | **Hungry Shark Evolution** (2012, mobile) | Endless; health drains | Hunger timer keeps you moving | ⏳ Endless mode (full game) |
| 4 | **Hungry Shark World** (2016) | Mission based | Super Shoals (eat 100 at once), pets | ⏳ Shoal events, companions |
| 5 | **Feed and Grow: Fish** (2016, Steam) | Sandbox | Unlocking playable species | ⏳ Playable species (full game) |
| 6 | **flOw** (2006) | Segments; dive between layers | Player-chosen difficulty by diving | ⏳ "Descent" mode |
| 7 | **Tasty Planet / Tasty Blue** (2006/2014) | Continuous, huge scale jumps | Camera zooms out as you grow; comic interludes | ✅ Zoom-out camera; ⏳ ink comic panels |
| 8 | **Spore: Cell Stage** (2008) | DNA points | Steal parts from what you eat | ⏳ Trait stealing |
| 9 | **Agar.io** (2015, browser) | Mass | Split-lunge (trade mass for a burst) | ✅ Dash (cooldown instead of mass) |
| 10 | **Big Fish Eat Small Fish clones** (2015–21, mobile) | FF formula | Proves the loop still sells; bar on art/feel is low | Art is our differentiator |

## Design pillars

1. **Readable threat.** Ink weight shows the relationship. Prey and peers use light hatching. Predators get dense cross-hatching, a red wash and an angry brow. The cue is recomputed every frame as you grow.
2. **Growth spurts** (Feeding Frenzy) with a **zoom-out camera** (Tasty Planet).
3. **Keep moving.** Frenzy multiplier decay now; hunger in Endless mode later.
4. **Line boil.** Every sprite cycles three redrawn frames at 8 fps, so the world looks hand-animated.

## Structure: 100 levels on one sloping seabed

- **10 zones × 10 levels**, in depth order:
  - tide pool (0–5 m)
  - seagrass
  - kelp
  - reef
  - shipwreck
  - drop-off
  - twilight zone
  - midnight zone
  - abyssal plain
  - trench (to 11 km)
- **Chapter 1 is free (10 levels).** Chapters 2–10 (90 levels) are paid and served from the server.
- **The level map is a side-view sea chart:**
  - The seabed steps down from the shore, one plateau per zone, and the water darkens with depth.
  - The map shows each chapter as its levels look: sky, an island, a fishing boat and a bird over chapters 1-6; each zone's seabed landmarks (the shipwreck, the whale fall, the black smoker, the volcano) and a few smaller pieces; the zone's jellyfish and two fish that really live there; night with glowing life over chapters 7-10, where map captions switch to pale ink.
  - Locked zones are shown as pencil drafts.
  - Chapter tabs jump between zones.
  - The map grows on its own when a zone is added.
- **A new player fish every chapter (every 10 levels):** inkling, goby, perch fry, butterflyfish, young tuna (at the wreck, where real tuna gather to hunt), mako shark pup, lanternfish, viperfish, stoplight loosejaw, and the hadal snailfish (the deepest fish ever filmed) for the hadal trench. All are drawn in blue ink, so the player always reads as "you". The first level of a chapter announces the new fish. Each handles differently (games/inkfish/src/levels/playerStats.ts): cruising speed, agility, dash and leap height are small multipliers, loosely true to life, and each new fish trades one strength for another (the tuna cruises and leaps best, the deep fish are slow drifters with the hardest lunges), so later chapters never feel like a downgrade. The mako is the first fish with an ability of its own: like every shark it feels the electric field of nearby prey, so every 1.6 s a ripple spreads from it and the edible fish within range flicker with blue sparks for a moment, even in the dark, with sparks at the screen edge for prey out of view (logic/sense.ts, scenes/game/sharkSense.ts). The barracuda, the old chapter 5 fish, now lurks at the wreck as a hunter.
- **Levels are generated from per-chapter recipes** (`games/inkfish/src/levels/generate.ts`).
  - A recipe sets which species appear, the hazard ramps, the growth goal and the final size.
  - The generator produces 10 levels with a smooth ramp, then gives each its own twist (`src/levels/twists.ts`).

### Level twists

Every level is won by growing to full size. Most twists add a task or a rule on top of that; the opener and "One life" only change how you grow. Every chapter follows the same arc, so each new idea arrives on its own:

| Level | Twist | What changes |
|---|---|---|
| 1 | Feeding time | Plain: just grow |
| 2 | Ink bottles | Also catch ink bottles sinking from the surface, two at a time; one that reaches the seabed smashes and another follows |
| 3 | Strong current | Everything drifts left or right |
| 4 | Marked fish | Also eat 3 fish circled in red; they flee and are only edible after your first growth |
| 5 | School rush | Grow before the clock runs out, with a dense school of prey |
| 6 | Hook storm / Jelly bloom | Hooks every 4 s; below the drop-off, where hooks can't reach, a jellyfish swarm instead |
| 7 | One life | A single hit ends the level, with extra predators |
| 8 | Remix | Two twists paired, a different pair in each chapter (never the dark) |
| 9 | Lights out | You only see a small circle around you |
| 10 | The giant, lights out | A boss version of the chapter's biggest predator hunts you in the dark; grow, then eat it. Its red ring shows through the dark |

The dark is the hardest twist, so it closes every chapter: on its own, then for the giant. Off-screen goals get a red arrow at the screen edge. Each level opens with an intro card, and the map shows a small icon per twist (the giant is a crosshair, marked fish a cluster of small circles).
  - Hand-tune any level with `overrides`.
- **Fishing hooks stop below the drop-off**, since fishing lines don't reach that deep.

### Adding content

- **More levels in a zone:** raise `LEVELS_PER_CHAPTER`, or override per chapter later.
- **A new zone:** append it to `levels/zones.ts` and add its recipe to `content/paid.ts`.
- **A new species:** add it to `levels/species.ts` (name, behaviour, speed, spiky/hunter), draw its anatomy in the matching `art/fish/species/*.ts` file (review it at `/specimens.html?group=<file>`), and add it to a chapter recipe with a `debut` level.

### Species (65)

Each zone has its own residents, and new ones arrive mid-chapter: the intro card says "New fish: lionfish. Venomous spines. Do not touch." A level only draws textures for the fish it uses.

| Chapter | Residents (new ones debut level by level) | Giant |
|---|---|---|
| 1 Tide pool | minnow, perch, blenny, puffer, sculpin, pike | striped bass |
| 2 Seagrass | sand lance, wrasse, pipefish, filefish, mullet | tarpon |
| 3 Kelp | sardine, garibaldi, kelpfish, rockfish, sheephead, eel | lingcod |
| 4 Reef | chromis, clownfish, angelfish, parrotfish, boxfish, triggerfish, lionfish | goliath grouper |
| 5 Wreck | herring, snapper, cod, scorpionfish, jack, barracuda, moray | reef shark |
| 6 Drop-off | anchovy, mackerel, flying fish, needlefish, bonito, mahi-mahi | swordfish |
| 7 Twilight | bristlemouth, pearleye, barreleye, sabertooth, dragonfish, coelacanth (rare) | oarfish |
| 8 Midnight | bigscale, whalefish, fangtooth, black dragonfish, gulper eel | sleeper shark |
| 9 Abyss | rattail, tripodfish, lizardfish, halosaur, cusk-eel | goblin shark |
| 10 Trench | blobfish, snipe eel, ghost shark, anglerfish | giant squid |

Giants are their own species, appear only once (as the chapter's final boss), and are the biggest fish on that level: every other spawn is capped below them.

The giant squid, the last giant of the game, is the only one that isn't a fish, and it fights differently:
- **Drawn in parts:** a pen-drawn body (mantle and head, with the hit shape), plus eight arms and two feeding tentacles. Each limb is a pen-drawn strip bent along a curve every frame (Phaser `Rope`), with flapping fins and a pupil that follows the player.
- **Arm poses:** the poses (fanned, writhing, streamlined, striking) live in `art/squidPose.ts`. The live rig and the guide portrait use the same poses.
- **Behaviour:**
  - It drifts, then stalks the player arms-first.
  - It strikes in three steps: a wind-up (it draws back and flares its arms, the tell to dodge), then its tentacles shoot out at where the player was, and their clubs cost a life if they touch.
  - After a strike it jets away backwards and leaves a sepia ink cloud.
  - Once the player is full size it flees in inking bursts and has to be chased down.

## Core mechanics (built)

- Sound: every effect is synthesized live with the Web Audio API (audio/synth.ts), no audio files: gulps pitched by the size of the meal, dash whoosh, growth chime, hurt thud, jellyfish buzz, hook clink and reel ratchet, splashes, bird squawks, item sounds, combo sparkle, win and lose jingles, pencil-tick button clicks. Sounds away from the player are panned and fade with distance off screen; repeats are throttled. Audio starts on the first click or key press, pauses with a hidden tab, and the HUD's note button (or M) mutes it, remembered in storage.

- Steering by mouse, finger or keyboard, with inertia. Dash: Space, Shift, a mouse click or the touch button.
- Leaping: in chapters 1-6 (open sky), dash up into the surface to leap out in an arc you can't steer. In the air nothing in the water can reach you and chasers lose track of you. Deeper chapters have no sky.
- Birds (chapters 1-6): dragonflies, terns, gulls, pelicans and gannets follow the same size rule as fish. Smaller birds are snacks you leap for; bigger ones cast a shadow on the water, hover, then plunge in after you (and grab other fish too). A bird can carry you off: "Snatched!".
- Fish guide (from the map): one page per chapter, a card for every creature. A creature unlocks the first time it swims or flies into view (saved in `seen`); its card gives real-life figures (length, weight, lifespan, speed, depth, range, diet) and one fact. Progress shows per chapter: a bar under the map's Fish guide button, a bar under each page title and a ring around each chapter tab (blue while filling, green when complete).
- Skyline (chapters 1-6): each level plans its own horizon from the zone's landmarks (rocks, lighthouses, palm islands, dunes, headlands, a distant volcano), scrolling slower than the water so it reads as far off. Chapters 7-10 show no surface at all.
- Deep zones (chapters 7-10): a layer of night falls over the scenery, deep blue at twilight to black in the trench. Only living light shines through: fish photophores and lures glow, glowing jellies pulse, the seabed has glowing sea pens (Umbellula) and bamboo coral, and some levels have an erupting seamount with lava in its cracks. Marine snow drifts down, and a soft light travels with the player. The HUD turns pale to read on the dark.
- Edibility by size ratio: prey < 0.9× your size, predator > 1.1×. Spawns are biased so ~60% are prey.
- Species behaviours (each species has one): school (flees), cruise, chase, lunge (ambush), wave (eel S-curves), puff (inflates to 1.7× when you approach), hover (drifts in place). Spiky species (puffer, lionfish, scorpionfish, filefish, rockfish, ghost shark) prick instead of bite.
- Jellyfish: one real species per zone (moon jelly, compass jelly, sea nettle, box jelly, lion's mane, mauve stinger, comb jelly, Atolla, crown jelly, a hadal Crossota), with about a quarter drifting down from the zone above. Sizes stay within 0.8-1.3x of the standard sting; box jellies swim across the screen, comb jellies glide. All ten are in the fish guide.
- Hazards: jellyfish stun you; fishing hooks come from boats: in sunlit chapters (1-6) a boat sails in first, then a dotted pencil line shows where its hook will drop. A hooked fish is reeled up by the mouth: with lives left you lose one and thrash free near the surface, on your last life you're hauled out of the water.
- Hazards hit everyone, not just the player: jellyfish stun enemies (a stung predator can't bite, so luring hunters into jellies is a tactic), hooks catch and reel off any fish, and hunters (flagged per species) eat fish under 70% of their size when they bump into them.
- Falling items: human-made things sink from the surface and rest on the seabed for a while. Eat one to use it. A level drops at most 2 helpful kinds and 1 harmful kind, and the intro card shows which (`src/levels/items.ts`). New items unlock as you progress:

  | Level | Item | Effect |
  |---|---|---|
  | 1 | Energy drink can | Speed boost |
  | 3 | Bag of chum | A school of small prey rushes in |
  | 5 | Plastic bag (harmful) | Looks like a jellyfish; makes you sick: slower, loses some growth |
  | 8 | Battery | Shocks fish nearby; stunned fish up to 1.6× your size can be eaten |
  | 12 | Tin can | Shield: absorbs the next bite, spike or hook |
  | 16 | Six-pack rings (harmful) | Tangled: slower, no dash |
  | 22 | Rubber duck | Decoy: hunters chase it instead of you |
  | 27 | Firecracker | Knocks out fish around you; they float belly-up and anyone can eat them |
  | 35 | Spinner lure (harmful) | Hides a hook: costs a life ("Snagged!") |
  | 45 | Fish food | Instant growth: 15% of the level's growth goal |
  | 67 | Glow stick | Bigger circle of light, only in lights-out levels |
- 3 lives with invulnerability blinks, a par-time ink-blot rating (1–3), and best scores saved locally.

## Planned for the full game

1. Abilities for more player fish (the mako has its sense; lanternfish light in the dark zones could be next)
2. Endless mode with a hunger drain and a daily-seed leaderboard
3. Trait stealing
6. Ink comic panels between zones
7. Cosmetic pen styles

**Do not gate:** core mechanics (frenzy, dash, the first two power-ups). **Never add:** consumable boosts or energy timers. They clash with the premium, handmade identity.
