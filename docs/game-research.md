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
  - Locked zones are shown as pencil drafts.
  - Chapter tabs jump between zones.
  - The map grows on its own when a zone is added.
- **A new player fish every chapter (every 10 levels):** inkling, goby, perch fry, butterflyfish, barracuda, young tuna, lanternfish, hatchetfish, viperfish, and the hadal snailfish (the deepest fish ever filmed) for the hadal trench. All are drawn in blue ink, so the player always reads as "you". The first level of a chapter announces the new fish.
- **Levels are generated from per-chapter recipes** (`games/inkfish/src/levels/generate.ts`).
  - A recipe sets which species appear, the hazard ramps, the growth goal and the final size.
  - The generator produces 10 levels with a smooth ramp, then gives each its own twist (`src/levels/twists.ts`).

### Level twists

Every level is won by growing to full size. Most twists add a task or a rule on top of that; the opener and "One life" only change how you grow. Every chapter follows the same arc, so each new idea arrives on its own:

| Level | Twist | What changes |
|---|---|---|
| 1 | Feeding time | Plain: just grow |
| 2 | Ink drops | Also collect every ink drop scattered across the level |
| 3 | Strong current | Everything drifts left or right |
| 4 | Marked fish | Also eat 3 fish circled in red; they flee and are only edible after your first growth |
| 5 | School rush | Grow before the clock runs out, with a dense school of prey |
| 6 | Hook storm / Jelly bloom | Hooks every 4 s; below the drop-off, where hooks can't reach, a jellyfish swarm instead |
| 7 | Lights out | You only see a small circle around you |
| 8 | One life | A single hit ends the level, with extra predators |
| 9 | Remix | A goal twist plus a rule twist, a different pair in each chapter |
| 10 | The giant | A boss version of the chapter's biggest predator hunts you; grow, then eat it |

Off-screen goals get a red arrow at the screen edge. Each level opens with an intro card, and the map shows a small icon per twist.
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
| 5 Wreck | herring, snapper, cod, scorpionfish, jack, moray, angler | reef shark |
| 6 Drop-off | anchovy, mackerel, flying fish, needlefish, bonito, mahi-mahi | swordfish |
| 7 Twilight | bristlemouth, pearleye, barreleye, sabertooth, dragonfish | oarfish |
| 8 Midnight | bigscale, whalefish, fangtooth, black dragonfish, gulper eel | sleeper shark |
| 9 Abyss | rattail, tripodfish, lizardfish, halosaur, cusk-eel | goblin shark |
| 10 Trench | blobfish, snipe eel, ghost shark | coelacanth |

Giants are their own species, appear only once (as the chapter's final boss), and are the biggest fish on that level: every other spawn is capped below them.

## Core mechanics (built)

- Steering by mouse, finger or keyboard, with inertia. Dash: Space, Shift, right-click or the touch button.
- Edibility by size ratio: prey < 0.9× your size, predator > 1.1×. Spawns are biased so ~60% are prey.
- Species behaviours (each species has one): school (flees), cruise, chase, lunge (ambush), wave (eel S-curves), puff (inflates to 1.7× when you approach), hover (drifts in place). Spiky species (puffer, lionfish, scorpionfish, filefish, rockfish, ghost shark) prick instead of bite.
- Hazards: jellyfish stun you; fishing hooks are telegraphed by a dotted pencil line, then drop. A hooked fish is reeled up by the mouth: with lives left you lose one and thrash free near the surface, on your last life you're hauled out of the water.
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
  | 45 | Message in a bottle | Treasure points |
  | 67 | Glow stick | Bigger circle of light, only in lights-out levels |
- 3 lives with invulnerability blinks, a par-time ink-blot rating (1–3), and best scores saved locally.

## Planned for the full game

1. Abilities per player fish (barracuda burst speed, lanternfish light in the dark zones)
2. Endless mode with a hunger drain and a daily-seed leaderboard
3. Trait stealing
6. Ink comic panels between zones
7. Cosmetic pen styles

**Do not gate:** core mechanics (frenzy, dash, the first two power-ups). **Never add:** consumable boosts or energy timers. They clash with the premium, handmade identity.
