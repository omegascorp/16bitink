# Inkfish: mechanics research

Ten "eat smaller to grow" games, researched October 2026, and what Inkfish takes from each.

| # | Game | Growth model | Standout mechanic | Taken into Inkfish |
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

## What's built (free Chapter 1, 5 levels)

- Steering by mouse, finger or keyboard, with inertia. Dash: Space, Shift, right-click or the touch button.
- Edibility by size ratio: prey < 0.9× your size, predator > 1.1×. Spawns are biased so ~60% are prey.
- Species behaviours:
  - minnow flees
  - perch cruises
  - puffer inflates to 1.7× when you approach (a timing puzzle)
  - pike chases
  - angler ambush-lunges
  - eel sine-patrols
- Hazards: jellyfish stun you; fishing hooks are telegraphed by a dotted pencil line, then drop. Hooks are instant hurt.
- Power-ups: Quick Quill (speed) and Shrink-ink (nearby fish shrink to 0.5× for 5 s).
- 3 lives with invulnerability blinks, a par-time ink-blot rating (1–3), and best scores saved locally.
- The demo ends on a cliffhanger screen with an unlock CTA. Locked chapters show as "pencil drafts".

## What's paid (full game)

- **Built:** Chapters 2–4 (10 levels), served from the server only to owners.
- **Planned, ordered by value/effort:**
  1. Bosses at the end of each chapter (giant eel: eat the prey it spits out)
  2. Endless mode with a hunger drain and a daily-seed leaderboard
  3. Playable species with different stats
  4. Trait stealing (spines, glow lure, poison)
  5. Abyss darkness/lantern mechanic
  6. Ink comic panels between chapters
  7. Cosmetic pen styles (fountain, brush, sepia)

**Do not gate:** core mechanics (frenzy, dash, the first two power-ups). **Never add:** consumable boosts or energy timers. They clash with the premium, handmade identity.
