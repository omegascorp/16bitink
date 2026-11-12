# InkTanks: design

A single-player tank war campaign with battle-royale matches. You're a young tank commander, an animal crew, who works up the military ranks from Private to General.

- **Missions:** each level is one, on a land that grows a region at a time. Many play like a battle royale: drop in with bot tanks, loot parts, a storm closes in. Others are raids, escorts, holds and boss hunts.
- **Your tank:** gun, hull and drive, each found as Mk I, II or III.
- **Intel:** enemy tanks drop intel on their technology. Between missions you research it in the workshop and upgrade your own tank for good.

Working name.

Started Nov 12, 2026. Eighth game on 16bit.ink. Branch `feat/inktanks`, folder `games/inktanks`.

## Why this game

- **It wasn't a third eat-and-grow game.** A single-player agar.io was considered first, but InkFish and InkCrab already use that loop.
- **Tanks plus loot is a loop everyone knows.** Battle City and Wii Play Tanks for the tanks, PUBG for drop, loot and storm.
- **The parts system** comes from Warzone 2100, where every unit is a body, a propulsion and a weapon (stats checked in its `data/mp/stats` files). Each part trades something away: heavy hulls are slow, tracks are tough but slow, and anti-tank rockets beat tracks but are weak against light, fast drives.
- **The gap:**
  - diep.io has tank upgrades on a big map, but it's multiplayer.
  - The surviv.io family of 2D battle royales is multiplayer too.
  - The portal tank games are full of ads.
  - A single-player tank battle royale with real part loot and a campaign looks open. Run a fact-check agent before release copy says so.

## Pillars

1. **The tank is the loot.** Every crate can change how you play. Picking up a part is a decision, not a stat bump: swap the Cannon for Rockets and you're suddenly strong against heavies but weak against scouts.
2. **Steal their tech.** Every enemy is carrying technology you want. A Heavy with Rockets on the minimap is a target because of its intel, and what you destroy decides how your tank grows.
3. **No dominant build.** Every part costs something: weight, speed, HP, reload or range. Damage depends on the target's drive, so a counter always exists.
4. **Readable at a glance.** Each gun, hull and drive is recognisable from its silhouette, and a Mk III looks richer than a Mk I. Threats are shown before they land: storm edge, supply-drop smoke, the aim line of a charging Siege.
5. **Never empty driving.** The land grows with the chapter, so early missions are small and dense, and every region is packed with loot, breakable buildings and events. The storm or the mission forces a fight within 5–7 minutes. This is our "no empty walking" rule from earlier games.
6. **No lost progress, no grind.** A lost mission is retried on the spot, and intel collected is kept win or lose. Rank and research only go up. Playing each mission once, with some bonus objectives, pays for everything the next chapter needs.

## Art (decided, Nov 12)

Settled by the art test in `games/inktanks/dev/art-test.html` and the density test in `dev/detail-test.html`.

- **Camera: top-down, GTA 2 style.**
  - Tanks, shots and pickups are flat straight-down sprites, rotated in code.
  - Buildings, walls, trees and rocks show their south facade with the InkHeroes castle projection `(gx, gy) → (gx, gy - z)`.
  - Roofs and canopies fade when a tank is under or behind them.
  - Shadows come from a fixed sun direction, added in code.
- **Density C:**
  - The native view is 960×540 at scale 2 on 1920×1080, the same as InkHeroes battles.
  - A heavy hull is about 76 px long, and part frames are 128×128.
  - The owner picked C over B (640×360 ×3): "10× cooler".
- **Parts come from 3D models, then a paint pass:**
  - Model in `dev/pixel/tank_parts.py` and render straight down with soft ambient occlusion.
  - PixelLab `edit_image` paints them with part-specific prompts.
  - Then the paint is cut back onto the model's outlines, with a match above 0.9.
  - Every hull has the same turret-ring mount point.
  - A flat grey stripe area is tinted with the team colour; the player is ink blue.
  - Direct PixelLab whole-tank images look nice but bake the turret in, so they're rejected.
- **Structures use the castle recipe** in [inkheroes-castles.md](inkheroes-castles.md): model, render, pack, paint and cut. Breakable pieces keep their states (whole 2, cracked 1, breached 0).
- **Ground:**
  - A few painted textures that tile without visible seams, plus scattered decals: tufts, craters, tyre ruts, flowers, puddles.
  - Streamed in chunks around the camera.
  - Never one giant image (an 8×8-screen map at C would need about 130 MB), and never 32 px Wang tiles, which looked blocky.
- **Rotation:** the stress test decides between RotSprite (32 steps, pre-computed only for parts in the match) and GPU free rotation.
  - At C the pixels are small, so free rotation may look fine.
  - Precomputing every part costs 100+ MB, which can crash older iPhones.
- **Painterly pixel art**, matching InkHeroes' bar. Never code-drawn final art.

## Rules

### A battle-royale match

The most common mission type; the others reuse these rules (see Missions).

1. **Drop:** the map opens zoomed out, and you tap where to land. Bots pick their own spots, weighted towards loot. A 3-second drop follows. You start in the tank you set up in the workshop, and bots start in their chapter's Mk I–II tanks.
2. **Loot:**
   - **Crates** stand in buildings, villages and ruins. They hold mostly Mk I–II parts and repair kits.
   - **Wrecks:** a destroyed tank leaves its best part, to swap in for this match, plus **intel** on all its parts, which you keep (see Intel and the workshop).
   - **Supply drops** fall during the match. You see red smoke and a parachute with a 10-second warning. They hold a Mk III part and are always contested.
3. **Swapping:** drive over a part and its card shows, with the stat change against what you have (green up, red down). Hold swap for 0.5 s and the old part drops where you stand. Swapping a gun resets its reload.
4. **Storm:** 4–5 phases. The safe circle shrinks towards a random point inside the last circle. Each phase is announced with a timer and a minimap ring. Outside the circle you lose HP per second, more each phase.
5. **Winning:** the last tank alive wins the match. The mission sets what counts as a pass (see Missions).
6. **Length:** 5–7 minutes. The map size, bot count and storm timings are tuned to that.

### Tank stats

These are starting numbers. Balance them with a whole-chapter bot-vs-bot simulation, never by guessing armies (the InkHeroes rule). **Sim-tuned, Nov 12:** HP in play is the table × 2.5 (`HP_SCALE`); at × 1, chapter 1 royales were over in about 30 s.

- A tank's **HP** is hull HP × the drive's HP factor.
- **Speed** is the drive's base speed × the engine factor. The engine factor is the hull's engine power ÷ total weight, clamped to 0.7–1.1, so a heavy gun on a light hull crawls.
- **Damage taken** is max(dmg × counter − armour, dmg × counter × 0.33). Armour splits into kinetic and heat once heat weapons arrive in chapter 3.

| Hull | HP | Armour | Weight | Engine |
|---|---|---|---|---|
| Light | 120 | 3 | 6 | 12 |
| Medium | 200 | 7 | 12 | 16 |
| Heavy | 320 | 12 | 20 | 21 |

| Drive | Base speed (native px/s) | HP factor | Weight | Handling |
|---|---|---|---|---|
| Wheels | 190 | ×1.0 | 2 | Fast turns, skids on sand |
| Half-tracks | 160 | ×1.4 | 4 | Middle in everything |
| Tracks | 130 | ×1.9 | 7 | Turns on the spot, ignores sand and mud |
| Hover (ch3) | 220 | ×0.9 | 3 | Crosses water, drifts |

| Gun | Damage | Fire | Range (px) | Shot | Weight | Notes |
|---|---|---|---|---|---|---|
| Machinegun | 6 | every 0.1 s | 280 | fast tracer | 1 | Shreds light drives |
| Cannon | 40 | every 1.1 s | 360 | shell | 4 | All-rounder, breaks brick |
| Rockets | 2 × 30 | every 2.4 s | 400 | slow rockets, 20 px splash | 3 | Anti-heavy, breaks brick |
| Mortar (ch2) | 45 | every 2.8 s | 200–520 | lobbed over walls, 40 px splash | 5 | Has a minimum range |
| Flamer (ch3) | 5 per tick (heat) | stream | 150 | cone | 2 | Ignores kinetic armour |
| Laser (ch4) | 35 (heat) | every 0.9 s | 480 | instant beam | 3 | No travel time |
| Rail (ch5) | 90 | every 3 s | 640 | pierces walls and tanks | 6 | Charge-up shows an aim line |

**Counters:** damage × this, by the target's drive.

| | Wheels | Half-tracks | Tracks | Hover |
|---|---|---|---|---|
| Machinegun | 1.3 | 0.9 | 0.5 | 1.3 |
| Cannon | 1.0 | 1.0 | 0.9 | 1.0 |
| Rockets | 0.7 | 1.1 | 1.3 | 0.6 |
| Mortar | 0.9 | 1.0 | 0.8 | 1.2 |
| Flamer | 1.1 | 1.0 | 0.9 | 1.3 |

**Tiers:** Mk II is +20% and Mk III +40% on the part's main stat. Main stats: gun damage, hull HP, drive speed. Art shows the tier through plating, rivets, extras and wear, never only colour.

### The Kit slot (from chapter 2)

A fourth slot, PUBG's backpack, vest and scope:
- **Armour plate:** +armour, +weight.
- **Radar:** a wider view, and enemies show on the minimap when they fire.
- **Cargo rack:** carry 3 repair kits instead of 1.
- **Smoke:** a cover cloud, 20 s cooldown.
- **Mines:** drop up to 3.

### Consumables

- **Repair kit:** +40% HP over 2 s, and you can't fire while it works.
- **Shield:** blocks 3 hits or 6 s.
- **Smoke grenade:** one-off smoke cover.

### Vision and cover

- You see about one screen around you. Bushes and tall crops hide a tank that isn't firing, and roofs hide tanks inside.
- Firing reveals you on enemy minimaps for 2 s.

### Terrain

- Brick walls, fences and sheds break in 2–3 hits. Houses lose walls, not whole.
- Tracks and Heavy hulls flatten fences and small trees by driving through them. Rocks and big trees are solid.
- Water stops ground drives, and bridges are choke points.
- Sand slows Wheels by 30%. Mud slows everything except Tracks by 20%.

## Bots

The same parts and rules as the player. They're the hardest code, so they're built and measured first.

- **States:** loot (head for the best-value crate in reach) → rotate (move into the next circle early or late, by personality) → fight (when a target is in range and the fight looks winnable on HP, drive and counter) → flee and repair (low HP).
- **Loot sense:** bots value parts by a simple score and prefer counters to the tank that last hit them.
- **Difficulty per chapter:** aim error, reaction time, how well they kite (retreat while firing), focus fire, and how greedy they are about supply drops.
- **Personalities** from a small set: camper, hunter, looter, coward.
- **Movement:** a coarse navigation grid plus flow fields to the safe zone. Local steering avoids rocks and other tanks.
- **Crews are animals** (badgers, boars, weasels, crows, otters…). They show in the kill feed and on the result screen, never as people. Names use plain A–Z letters.

## Story frame

After the old world, its tank depots lie scattered across the land, and rival animal clans fight over them in the Scrap Wars:
- **Boars:** heavy, slow tanks.
- **Weasels:** fast scouts.
- **Crows:** they loot everything.

You're a young badger commander in the Ink Brigade. Clans fight each other as well as you, which is why most missions are free-for-all. Each clan's tanks have their own stripe colour and favourite parts, so you can see whose tech is in front of you.

The commander who briefs you is an old animal officer, named in the chapter 1 content pass. Names use plain A–Z letters.

## The growing land

**A chapter is one land that grows a region at a time,** as InkHeroes chapters do.
- Mission 1 plays on a small, dense piece: about 2×2 screens and 5 bots.
- Each mission opens the next region: a village, a river with bridges, woods, a quarry. By the boss mission the chapter's whole land is open: about 7×7 screens and 16 bots.
- **A new region always shows where it opened.** The drop map pans to it, unveils it from paper, and the mission briefing points there. The storm's first circle covers the whole open land, and the region is where the mission happens.
- Earlier regions stay. Replaying a mission uses the land as it was then, so mission 1 stays small.
- Bot count, loot and storm timings scale with the open area, so the density per screen stays the same. That keeps the "never empty driving" pillar as maps grow.

## Missions

Every level is a mission with a short briefing, one **main objective** and two **bonus objectives**.
- **Medals:** each objective done earns a medal (up to 3 per mission). Medals only add up. A mission can be replayed any time for missed ones, and a replay keeps the medals you already have.
- **Passing:** you pass by completing the main objective. A failed mission restarts on the spot.

| Type | Main objective | Notes |
|---|---|---|
| **Royale** | Finish top N, or win | The battle-royale rules above. N tightens through the chapter |
| **Raid** | Destroy targets: a fuel depot, a radar mast, a convoy | Targets are 3D-modelled breakable structures. The storm is optional |
| **Escort** | Bring a supply truck to a point | The truck follows a road. Bots hunt it, not only you |
| **Hold** | Hold a hilltop or a bridge for N seconds | Waves arrive from marked directions |
| **Ace hunt** | Destroy a named enemy ace and take its intel | Aces carry rare tech (prototype parts) found nowhere else |
| **Salvage** | Find a crashed prototype, take it, and get it to the pick-up | Carrying it slows you and shows you on every minimap |
| **Fortress** | Destroy the chapter's land fortress | Level 10 of each chapter. A huge multi-part tank with breakable turrets |

Bonus objectives come from a pool and are shown in the briefing. Examples: destroy 5 tanks, win without a repair kit, take no storm damage, finish with Light hulls only, collect 10 intel, destroy a Heavy with Rockets.

## Intel and the workshop

This is the owner's "pick up technology from the enemies and upgrade your own tank".

**In the mission:**
- A destroyed enemy drops **intel** for each part it carries, worth 2 for Mk I, 3 for Mk II and 5 for Mk III (sim-tuned: at 1/2/4 the no-grind check passed on 2 of 4 seeds). Aces drop much more, plus their prototype.
- Intel is counted per **part family**: Machinegun, Cannon, Rockets, Light hull, Medium hull, Heavy hull, Wheels, Half-tracks, Tracks, and later Mortar, Hover and the others.
- **Recon (chapter 2+):** staying within range of an enemy for 3 s without being seen gives 1 intel on its parts. With the Radar kit it takes 1.5 s.
- **Target choice:** enemies in view show their part icons, small and next to the tank. You pick targets by the tech you want: a Heavy with Rockets is worth hunting if you're short on rocket intel.
- **Intel is kept whatever happens**, win or lose. Loot parts are only for the mission; intel is what you keep.

**Between missions, in the workshop:**
- **Unlock a family** (3 intel): you can now fit it in your starting tank. Before that, a family exists for you only as loot inside missions.
- **Raise its Mk** for your starting tank. Mk II costs 8 and needs Sergeant; Mk III costs 20 and needs Lieutenant.
- **Research lines**, like Warzone 2100's research, 3 steps per line at 5, 10 and 15 intel, each step +8%:
  - guns: Damage, Reload
  - hulls: Armour, HP
  - drives: Speed, Grip (turning, and sand and mud penalties)
  - Research applies to that family whether it's in your starting tank or swapped in from loot.
- **Fitting your starting tank** is free and can change every mission.
- **The workshop screen:** your tank in the middle, three slots around it, and each family's intel bar filling up. Something new to look forward to, never a streak.

**Balance:**
- Bots in later chapters field higher Mk tiers and their own research levels, so the counter race holds and research never trivialises a chapter.
- **No-grind check:** the whole-chapter bot sim plays each mission once and completes about half the bonus objectives. It must afford a sensible setup for the next chapter: a Mk II gun with 2 research steps, and its counter family unlocked.

## Military ranks

You start as a Private. **Rank XP:**
- main objective: 100
- each bonus objective: 50
- each tank destroyed: 10
- first win of a mission: 25

Rank only goes up. It never gates a mission or a chapter; it gates perks. The thresholds are set so that playing each mission once reaches each rank by the mission shown. The first ranks sit at 400, 850, 1450 and 2300 XP (sim, Nov 12). Retries still pay kill XP, so in the sim ranks came about 2–3 missions early; to be fixed.

| Rank | Reached about | Unlocks |
|---|---|---|
| Private | Start | The workshop, 1 repair kit |
| Corporal | Chapter 1, mission 3 | Carry 2 repair kits |
| Sergeant | Mission 6 | Mk II in the workshop |
| Staff Sergeant | Mission 10 | **Call-in:** one supply drop per mission, at a spot you choose |
| Lieutenant | Chapter 2, mission 5 | Mk III in the workshop, the Kit slot |
| Captain | Chapter 2 end | **A wingman:** one allied bot tank with its own animal crew |
| Major | Chapter 3 | **Call-in:** one artillery strike per mission |
| Colonel | Chapter 4 | A second wingman |
| Brigadier | Chapter 5, mid-chapter | Prototype parts from aces can go in the workshop |
| General | The final fortress | Gold insignia, the ending |

The rank badge shows on the commander's portrait, in the HUD and on the result screen, with a short promotion ceremony when you rise.

## Levels

- 5 chapters × 10 missions. Chapter 1 is free and chapters 2–5 are paid, as in our other new games. Level numbers run on: chapter 2's first mission is Level 11.
- Each chapter mixes mission types: no two in a row of the same type, and Royale about half the time. This keeps missions from feeling the same, the InkFish playtest lesson.

### Chapter 1: Meadowlands (free)

The land grows from a farm to the whole valley. Families in chapter 1: Machinegun, Cannon, Rockets; Light, Medium, Heavy; Wheels, Half-tracks, Tracks, with bots on Mk I–II and supply drops at Mk III. Your first starting tank is a Light hull on Wheels with a Machinegun. Cannon, Medium and Half-tracks are unlocked by the intel from missions 1–2.

| Level | Name | Region opens | Mission | Teaches |
|---|---|---|---|---|
| 1 | First Drop | The farm (2×2 screens, 5 bots) | Royale: top 3 | Drop, drive, shoot, swap a part, intel |
| 2 | Barn Raid | The orchard | Raid: blow up the Boars' fuel barrels | Breakable targets, the workshop after |
| 3 | Bridges | The river and two bridges | Royale: top 3 | Water, choke points, the storm forcing a crossing |
| 4 | Milk Run | The village road | Escort: the supply truck to the village | Protecting, roofs, close fights |
| 5 | Weasel Ace | The woods | Ace hunt: Sly, a Weasel ace on Mk II Wheels | Target choice, rare intel |
| 6 | Airdrop | The quarry | Royale: top 3, with two supply drops | Contested Mk III, Sergeant rank |
| 7 | Hold the Hill | The hilltop radar | Hold: the hill for 90 s | Waves, positioning |
| 8 | Wreck in the Rails | The rail yard | Salvage: a crashed prototype to the pick-up | Being hunted, cover |
| 9 | Valley Brawl | The airfield (whole valley but the fort) | Royale: win | Everything |
| 10 | The Old Fort | The fort (the full land, 7×7, 16 bots) | Fortress: destroy the Boar land fortress | The chapter boss, Staff Sergeant |

### Later chapters (draft, design each before building it)

| Ch | Land | New parts | New terrain or twist | Boss |
|---|---|---|---|---|
| 2 | Dust Flats (desert, canyons, an oil town) | Mortar, the Kit slot | Sandstorms cut vision, dunes slow Wheels | A sand crawler fortress |
| 3 | Mirefen (swamp, stilt villages) | Hover, Flamer | Water everywhere, so Hover routes and mud | A paddle-wheel ironclad |
| 4 | Frostridge (snow, frozen lake) | Laser | Ice skids every drive, blizzards | A rail-gun train |
| 5 | Ashfall (volcanic, ruined city) | Rail | Lava vents, collapsing buildings | The Iron Hive, a final fortress |

## Controls

- **Desktop:** WASD or arrows drive. A and D turn the hull, W and S go forward and back. The mouse aims the turret, clicking or holding fires, E swaps and Q uses a repair kit.
- **Phone:**
  - The left thumbstick drives, steering towards where you point.
  - The right thumbstick aims, and fires while held past the dead zone.
  - The swap button only shows on a part. The repair button sits by the right stick.
  - Bigger buttons, only essential UI, and the HUD kept clear of the sticks (see the mobile rule).
- **HUD:** the minimap and storm timer top right, HP and part icons bottom centre, the kill feed top left, and tanks left on the counter top right.

## Performance budget

- 60 FPS on a mid-range phone with 30 tanks, shots and particles on screen. The stress test proves this before content starts.
- Memory under about 250 MB on iPhone Safari: ground streamed in chunks, part rotations only for parts in the match.
- Download: the first load under about 5 MB, with later chapters' art loaded when they open.

## Build phases

1. **Engine (one Opus agent):**
   - Pure logic in `src/logic`, covered by tests: parts and stats, damage and counters, storm, loot and swap, intel drops, the workshop (unlocks, Mk, research), rank XP, the mission types and objectives, and the growing land (regions opened per level).
   - Bots as pure logic too.
   - A headless sim plays a mission bot-vs-bot, and the whole chapter for the no-grind check.
   - The mission scene: chunked ground, region reveal, HUD, minimap, twin-stick touch controls.
   - The stress test: 30 tanks, FPS counter, RotSprite vs free rotation.
   - Placeholder art is the density C test parts.
2. **Art for chapter 1 (one Opus agent, in parallel):**
   - Every chapter 1 part at Mk I–III, with clan stripe masks.
   - The Meadowlands ground set and structures: houses, barns, walls, fences, trees, rocks, bridge, crates, supply drop, fuel barrels, the radar mast, the truck and the rail yard.
   - The fortress boss.
   - A manifest the engine loads.
3. **Screens:** workshop, rank and promotion, mission briefing, drop map, results with medals and intel.
4. **Chapter 1 content:** the Meadowlands land with its 10 regions and 10 missions, tuned from the sim. Then the owner's playtest.
5. **Release:** game-sdk integration, the site page, itch build, promo shorts.
6. **Chapters 2–5**, one at a time.
