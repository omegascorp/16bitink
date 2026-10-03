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
- **The player fish changes about every two zones:**
  - Inkling: tide pool, seagrass
  - perch fry: kelp, reef
  - barracuda: wreck, drop-off
  - lanternfish: twilight to trench
  - All of them are drawn in blue ink, so the player always reads as "you".
- **Levels are generated from per-chapter recipes** (`games/inkfish/src/levels/generate.ts`).
  - A recipe sets which species appear, the hazard ramps, the growth goal and the final size.
  - The generator produces 10 levels with a smooth ramp, a "school rush" at level 5 and a harder finale.
  - Hand-tune any level with `overrides`.
- **Fishing hooks stop below the drop-off**, since fishing lines don't reach that deep.

### Adding content

- **More levels in a zone:** raise `LEVELS_PER_CHAPTER`, or override per chapter later.
- **A new zone:** append it to `levels/zones.ts` and add its recipe to `content/paid.ts`.
- **The bottleneck is enemy variety.** Six species across 100 levels will feel repetitive. Next species to draw:
  - deep zones: hatchetfish, gulper eel, giant squid
  - reef: clownfish, grouper
  - shark bosses for chapter finales

## Core mechanics (built)

- Steering by mouse, finger or keyboard, with inertia. Dash: Space, Shift, right-click or the touch button.
- Edibility by size ratio: prey < 0.9× your size, predator > 1.1×. Spawns are biased so ~60% are prey.
- Species behaviours:
  - minnow flees
  - perch cruises
  - puffer inflates to 1.7× when you approach (a timing puzzle)
  - pike chases
  - angler ambush-lunges
  - eel sine-patrols
- Hazards: jellyfish stun you; fishing hooks are telegraphed by a dotted pencil line, then drop. A hooked fish is reeled up by the mouth: with lives left you lose one and thrash free near the surface, on your last life you're hauled out of the water.
- Hazards hit everyone, not just the player: jellyfish stun enemies (a stung predator can't bite, so luring hunters into jellies is a tactic), hooks catch and reel off any fish, and hunters (perch, pike, angler, eel) eat fish under 70% of their size when they bump into them.
- Power-ups: Quick Quill (speed) and Shrink-ink (nearby fish shrink to 0.5× for 5 s).
- 3 lives with invulnerability blinks, a par-time ink-blot rating (1–3), and best scores saved locally.

## Planned for the full game

1. More enemy species (above)
2. Chapter-finale bosses
3. Abilities per player fish (barracuda burst speed, lanternfish light in the dark zones)
4. Endless mode with a hunger drain and a daily-seed leaderboard
5. Trait stealing
6. Ink comic panels between zones
7. Cosmetic pen styles

**Do not gate:** core mechanics (frenzy, dash, the first two power-ups). **Never add:** consumable boosts or energy timers. They clash with the premium, handmade identity.
