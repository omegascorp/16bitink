# InkCrab Game — Design Spec

Oct 5, 2026 · @Hayk

## Overview

A 2D side-view game where you play a hermit crab that eats, grows, and trades up through ever-bigger shells on a beach cross-section, drawn in ballpoint pen. It follows a fish-eat-fish game but replaces "bigger is always safer" with "growth needs a shell, and swapping is risky."

Design pillars:

1. **Shells are the hook.** Every system feeds finding, fighting for, or swapping shells. Anything that competes with that gets cut.
2. **Relaxed, not stressful.** No deadlines in normal levels, soft failure, readable danger.
3. **Systemic play inside clear goals.** Each level has a goal; how you reach it comes from digging, tide, gravity, and other crabs.
4. **A naturalist's notebook.** Ballpoint art on paper, with the shell collection as a field journal.

## Camera and world

Side view, like an ant farm: each level is a cross-section of one beach, one to a few screens wide. No large scrolling world.

| Zone | What's there | Main danger |
| --- | --- | --- |
| Dunes (left) | Palm trees, coconuts, dry sand, buried shells | Gulls diving from above |
| Beach (middle) | Food, washed-up shells, most rival crabs | Gulls at low tide, fish at high tide |
| Tidepools and seabed (right) | Rare shells, rich food, rocks and coral | Fish, octopus in crevices |
| Underground (below all) | Diggable sand, deeper buried shells and food, burrows | Flooding tunnels at high tide |

Crabs walk sideways, which reads naturally in side view.

## Core loop

You grow until your shell is full, then you must find a bigger one and risk a swap to keep growing.

1. **Forage.** Eat food on the surface, dig up buried food, eat smaller creatures. A growth meter fills.
2. **Hit the cap.** Each shell has a maximum body size. Once you've grown to fill it, you stop growing: food you eat then is wasted ("shell full!"). There is no other penalty; you just can't progress until you upgrade.
3. **Find a bigger shell.** Dig one up, grab one the tide washed in, steal one from a crab, or catch one from a vacancy chain.
4. **Swap.** About one second where you're out of your shell and defenseless. You choose the moment: behind cover, inside a sand wall, in a burrow, or in the open.
5. **Grow into it.** Moving in doesn't make you bigger: the new shell gives you room, and you eat your way into it. So even the biggest shell on a level leaves a size still to grow before you win.
6. Repeat at the new size, against bigger predators and rarer shells.

(Until 2026-10-11 food eaten while capped was banked and burst into growth on moving house; the user asked for growth to stop at a full shell, as first designed.)

The cap must be obvious at a glance: full meter, crab visibly filling the shell opening, a small "stuck" animation when it eats while capped.

## Shells

Every shell has four properties; abilities are optional and come later.

| Property | Effect |
| --- | --- |
| Size | The body-size range it fits; its maximum is your growth cap |
| Weight | Heavier is slower to walk, climb, and dig, and sinks faster in water |
| Durability | Hits crack it; a broken shell drops you out naked |
| Ability (optional, later) | One passive or active effect, e.g. faster digging or a stronger retract |

Shell sources: real shells only, the kinds hermit crabs live in (periwinkle, whelk, conch, and so on; each beach has its own, see inkcrab-levels.md). No litter or other man-made objects. Shells appear buried at depth (deeper is rarer), washed in by high tide, worn by rival crabs, and dropped from vacancy chains.

Cracked shells give a reason to upgrade even when not capped. Shells also roll downhill and sink in water, so a wanted shell can end up somewhere dangerous.

## Rivals, stealing, vacancy chains

Other hermit crabs compete with you for shells, and the vacancy chain is the game's signature mechanic.

**Rival crabs** forage, grow, and swap shells by the same rules as you. They head for good shells when the tide brings them in, so waiting has a cost.

**Stealing.** Flip a crab that's smaller than you, pry it out, and take its shell. Bigger crabs can do the same to you.

**Vacancy chains.** When a crab moves into a new shell, nearby smaller crabs line up by size and each takes the next shell up, as real hermit crabs do. In side view this reads as a literal line of crabs from biggest to smallest. Players can use it:

- Drop your old shell to pull crabs away from a spot.
- Plant a big shell to start a chain and grab the one you want mid-chain.
- Mission goal: trigger a chain of 5+ crabs.

## Tide

The tide is a rhythm that changes the beach every few minutes, never a deadline. The water line visibly rises and falls across the screen.

|  | Low tide | High tide |
| --- | --- | --- |
| Water | Recedes; tidepools exposed | Covers the lower beach, floods open tunnels |
| Threats | Gulls hunt the exposed beach | Fish and octopus move in |
| Opportunities | Easier foraging, exposed shells | New shells and food wash up |
| Sand building | Stays | Placed sand below the water line washes away |

The tide is the main reason to keep moving: good shells arrive with it, and rivals go for them too.

## Digging, building, climbing, gravity

Sand is a tile-based terrain you can dig and place, Terraria-style, but limited so it stays a tactic, not base-building.

**Digging.** Remove sand tiles in any direction. Uncovers buried shells and food; deeper is rarer. Creates tunnels and burrows. A burrow is a safe place to swap shells.

**Placing sand.** The crab carries one clump at a time. Uses: a short wall during a swap, blocking a tunnel, a trap or pit for smaller crabs. The tide erases placed sand below the water line, so nothing is permanent.

**Climbing.** Palm trees, rock walls, and coral are climbable. Heavy shells climb slower. Height is safe from fish but exposed to gulls. Knocking down coconuts gives food.

**Gravity and simulation.** Shells roll down slopes and sink in water. Unsupported sand collapses. Water fills open tunnels at high tide. Keep the simulation simple: tile-based sand and water fill, not particle physics.

## Predators and failure

Danger is readable and failure is a setback, not a restart.

| Predator | When | Warning | Counter |
| --- | --- | --- | --- |
| Gull | Low tide, open sand and treetops | Shadow grows before the dive | Retract, hide under cover, dig in |
| Fish | High tide, underwater | Visible approach through water | Get to shallow water or into rocks |
| Octopus | Tidepools, crevices | Tentacle tip shows first | Avoid crevices, out-size it |
| Bigger rival crab | Anytime | Size is visible | Avoid, or wall it off |

Predators scale with level progress, not with your size, so staying small isn't safe forever.

**Soft failure.** When caught, you lose your shell and drop one size, then respawn at your last burrow. No game over in normal levels.

## Game structure

Mission-driven levels with systemic play inside them. Each level is one beach with a layout, tide timing, predator mix, and one goal; the player chooses how to reach it.

| Goal type | Example |
| --- | --- |
| Grow | Reach size 5 |
| Claim | Get the conch buried under the dune |
| Escort | Get a small crab into a safe shell |
| Survive | Make it through a storm tide that floods everything below a line |
| Chain | Trigger a vacancy chain of 5+ crabs |
| Final molt | Last level of each beach (see Progression) |

No timers in normal levels. Optional star ratings reward speed or extra objectives for players who want pressure. A few clearly marked challenge levels may have a clock.

**Endless mode** comes after launch: an infinite beach, tides keep coming, see how big you get. It reuses every system.

## Progression and the final molt

Within a beach you go from a tiny crab in a periwinkle to a giant in a conch; across beaches you build a shell collection.

**Final molt.** The last level of each beach. Like a real coconut crab, you outgrow shells entirely: your body hardens, you no longer need a shell, and you can climb any palm and smash coconuts. It's the payoff for a game spent worrying about shells. Goal: take the golden coconut from the top of the tallest palm.

**Meta progression:**

- Each new shell type is added to the field journal.
- New beaches unlock with different layouts, hazards, and shells.
- Star ratings per level for replay.

No stat upgrades or currencies at first. Add them only if playtests show players need longer-term goals.

## Art direction

Ballpoint pen on paper, like a naturalist's field notebook. Readability rules come before any asset is drawn.

| Color | Used for | Never used for |
| --- | --- | --- |
| Blue ballpoint | The world, the player, rivals, terrain | — |
| Red ballpoint | Danger only: predators, warning shadows, your body when naked | Anything friendly or decorative |
| Highlighter | Things you can pick up: food, shells, buried items | Terrain or creatures |

Texture carries terrain: solid sand is densely hatched, dug space is blank paper, water is horizontal wavy lines.

**Technical:** diggable sand needs engine-generated hatching (a hatch texture masked by terrain state, with procedurally inked edges where you dig). This is the hardest art problem; solve it in the first prototype.

**Animation:** boiling lines (2–3 slightly redrawn variants looping) on everything, so static art feels hand-drawn and characters need fewer frames.

**UI:** lined or graph paper background, margin notes and ink smudges. The shell collection is a field journal where each shell is drawn and labeled.

## Controls

Keep actions few and context-sensitive; side view has more verbs than top-down, which is the main risk on mobile.

| Action | Keyboard / gamepad | Touch |
| --- | --- | --- |
| Move, climb | Arrows or stick (climb when against a climbable surface) | Virtual stick |
| Dig / place sand | One button, aimed by direction held | Tap a tile next to the crab |
| Retract into shell | Hold one button | Hold a button |
| Interact (swap, steal, eat) | One context button | Tap the target |

Open question: target platform (PC, web, mobile) is not decided. Mobile changes how dig aiming works.

## Out of scope

These were considered and cut because they compete with the shell loop or blow up the scope.

| Idea | Decision | Reason |
| --- | --- | --- |
| Tree cutting, crafting | Cut | Turns it into a survival-crafting game; crabs don't cut trees |
| Permanent base-building | Cut | Removes danger; tide erasing sand is deliberate |
| Large scrolling world | Cut | Single-screen levels keep it an arcade game |
| Multiplayer / .io | Not planned | Side view doesn't suit it |
| Shell throwing | Later, maybe | Adds combat complexity before the core is proven |
| Cramped-shell penalties | Replaced | By the growth cap |

## Build order and risks

Prototype the systems in one goal-less test beach first; if messing around isn't fun, missions won't fix it.

1. Movement, eating, growth cap, shell swap with the defenseless moment. Plus the hatched-sand rendering.
2. Digging and placing sand on a tile grid; buried shells and food.
3. Tide cycle: water fill, washed-up shells, sand erosion.
4. Predators with warnings, soft failure, burrow respawn.
5. Rival crabs, stealing, vacancy chains.
6. Climbing, coconuts, gravity on shells.
7. Wrap in missions; first beach of 6–8 levels ending in the final molt.
8. Field journal, stars, more beaches. Endless mode after launch.

| Risk | Mitigation |
| --- | --- |
| Growth cap unclear to players | Test the cap visuals in step 1 with people who haven't heard the design |
| Hand-drawn style can't render diggable terrain | Solve procedural hatching in step 1, before any asset work |
| No deadline makes it aimless | Tide-delivered opportunities and level goals; watch for players idling at the cap |
| Too many systems for one game | Cut anything that playtesters ignore; shells stay central |
| AI pathfinding through changing terrain | Keep rival AI simple; tile grid makes recalculation cheap |
