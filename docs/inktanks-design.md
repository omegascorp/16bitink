# InkTanks: design

A single-player tank war campaign of 50 hand-made missions. You're a young tank commander, an animal crew, who works up the military ranks from Private to General.

- **Levels, as in our other games:** 5 chapters × 10 levels, picked on a chapter map. Chapter 1 (levels 1–10) is free, chapters 2–5 (levels 11–50) are paid.
- **Every level is a clear mission** with one main objective shown before you start: blow up the fuel depot, get the truck to the village, hold the bridge for 90 seconds. Missions differ from level to level; 13 mission types are mixed through the campaign.
- **Your tank:** gun, hull and drive, each found as Mk I, II or III. Enemies drop their parts when destroyed.
- **Blueprints:** enemy tanks drop blueprints of the parts they carry. Between missions you spend them in the workshop and upgrade your own tank for good. (The player-facing name is **Blueprints**; this doc and the code keep "intel" as the internal term.)

Working name.

Started Nov 12, 2026. Eighth game on 16bit.ink. Branch `feat/inktanks`, folder `games/inktanks`.

**Nov 14 redesign:** the owner didn't like the PUBG mechanics. Gone: the air drop, picking a landing spot, the storm, and last-tank-alive royales. Each level now starts at a set spot with a set mission, on its own map.

## Why this game

- **It wasn't a third eat-and-grow game.** A single-player agar.io was considered first, but InkFish and InkCrab already use that loop.
- **Tanks plus missions is a loop everyone knows.** Battle City and Wii Play Tanks for the tanks, campaign games like Desert Strike and Commandos for hand-made missions.
- **The parts system** comes from Warzone 2100, where every unit is a body, a propulsion and a weapon (stats checked in its `data/mp/stats` files). Each part trades something away: heavy hulls are slow, tracks are tough but slow, and anti-tank rockets beat tracks but are weak against light, fast drives.
- **The gap:**
  - diep.io has tank upgrades, but it's multiplayer and has no missions.
  - The portal tank games are full of ads and are mostly one arena repeated.
  - A tank campaign with real part loot, varied missions and no ads looks open. Run a fact-check agent before release copy says so.

## Pillars

1. **The tank is the loot.** Every crate can change how you play. Picking up a part is a decision, not a stat bump: swap the Cannon for Rockets and you're suddenly strong against heavies but weak against scouts.
2. **Steal their tech.** Every enemy is carrying technology you want. A Heavy with Rockets on the minimap is a target because of its intel, and what you destroy decides how your tank grows.
3. **No dominant build.** Every part costs something: weight, speed, HP, reload or range. Damage depends on the target's drive, so a counter always exists.
4. **Readable at a glance.** Each gun, hull and drive is recognisable from its silhouette, and a Mk III looks richer than a Mk I. Threats are shown before they land: artillery marks, supply-drop smoke, the aim line of a charging Siege.
5. **Never empty driving.** Each level's map is sized to its mission, 2×2 to 4×4 screens, and packed with enemies, crates, breakable buildings and events along the way. A level takes 3–5 minutes. This is our "no empty walking" rule from earlier games.
6. **Every mission is different.** No two levels in a row share a mission type, and each level adds one twist of its own: a new part, terrain, weather or enemy. This is the InkFish playtest lesson ("levels feel the same").
7. **No lost progress, no grind.** A lost mission is retried on the spot, and intel collected is kept win or lose. Rank and research only go up. Playing each mission once, with some bonus objectives, pays for everything the next chapter needs.

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
  - **Rolling frames:** the paint pass paints one frame per drive, so after installing parts (or repainting the truck or fortress treads) run `python3 dev/pixel/rollframes.py`. It rebuilds the -f1/-f2 frames by sliding the tread along the drive; `--check` lists any frame set that doesn't roll.
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

### A mission

1. **Briefing:** the commander names the main objective and two bonus objectives, with a picture of the map and the target marked.
2. **Start:** you start at the level's set start point, in the tank you fitted in the workshop. There's no drop and no choosing a spot.
3. **The objective stays on screen:** a short line at the top ("Fuel barrels 1/3"), and an arrow at the screen edge to the next target.
4. **Enemies are placed by the level,** not spawned at random: guards at posts, patrols on routes, waves from marked directions, convoys on roads (see Bots).
5. **Loot along the way:**
   - **Crates** stand where the level puts them, usually off the direct path, as a reward for a detour. They hold Mk I–II parts and repair kits.
   - **Wrecks:** a destroyed tank leaves its best part, to swap in for this level, plus **intel** on all its parts, which you keep (see Intel and the workshop).
6. **Swapping:** drive over a part and its card shows, with the stat change against what you have (green up, red down). Hold swap for 0.5 s and the old part drops where you stand. Swapping a gun resets its reload.
7. **Winning and failing:** the main objective done wins. Your tank destroyed, or a mission fail (the truck lost, the timer out), fails, and you retry on the spot. Intel picked up is kept either way.
8. **Length:** 3–5 minutes.

### Tank stats

These are starting numbers. Balance them with a whole-chapter bot-vs-bot simulation, never by guessing armies (the InkHeroes rule). **Sim-tuned, Nov 12:** HP in play is the table × 2.5 (`HP_SCALE`); at × 1, chapter 1 fights were over in about 30 s.

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

A fourth slot for gear:
- **Armour plate:** +armour, +weight.
- **Radar:** a wider view, enemies show on the minimap when they fire, and Recon is faster.
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

## Tactics (approved Nov 14; Phases A and B built Nov 14)

The owner's playtest: "hard and monotonous: you can't plan anything, you can't get any advantage, your only hope is your reaction." The cause is in the engine: bots see through walls, fights are even (same tanks, no flank damage), cover only delays a fight, and the player has no tool but the gun. Research on Wii Play: Tanks!, Battle City, World of Tanks, Enter the Gungeon and Into the Breach points to one fix: give the player information and tools, so a fight is won before it starts.

### 1. Stealth and sight (Phase A)
- **Walls, buildings and rocks block sight,** not only shots. A bot knows where you are only if it sees you, hears you fire nearby (about 300 px), or is called by an alarm.
- **Alert states, shown over each enemy:** calm (patrols its route, turret forward, sees about 340 px in a 140° cone) → **?** suspicious (heard or glimpsed you: turns and checks the spot for 2 s) → **!** alert (fights, calls the alarm). The player can read every enemy at a glance, as Into the Breach shows every threat.
- **Bushes, crops and roofs** hide a tank that isn't firing; only an enemy within 60 px spots it. Firing reveals you for 2 s, so the plan is: pick a firing spot, shoot, slip back into the bush.
- **Ambush bonus:** a hit on a calm or suspicious enemy does ×2 damage. Stealth pays, and every fight can be opened on your terms.

### 2. Cover you can fight from (Phase A)
- **Low cover:** sandbags, fences, crates, hay bales and low walls. A shot passes over low cover in the first 50 px of its flight. Hug the sandbags and you fire out, while their shots hit the bags.
- **Cover has HP and shows it:** whole, cracked, breached (the art already has states 2/1/0). Breaking cover is a clock the player can see.
- **Bots shoot your cover:** when you're behind breakable cover, one enemy shoots the cover down while others flank. High walls and buildings block shots both ways (no peeking).

### 3. Gadgets: a fourth slot from chapter 1 (Phase B)
Replaces the chapter-2 Kit slot idea. Pick one gadget in the briefing. 2 charges a level, crates can give more. Key G or a third touch button.
- **Mines:** arm after 1 s, trigger when an enemy rolls within 28 px: 90 damage, 40 px splash, and a broken track (×0.5 speed for 3 s). Enemies don't see your mines unless they watched you lay one (Wii Play: Tanks!), so you can lure a chaser over one.
- **Oil slick:** a 60 px patch for 8 s; enemies in it slide at ×0.4 speed and can't turn well. Safe for the player, good for Escort and Hold.
- **Smoke:** a 90 px cloud for 6 s that blocks sight both ways. Breaks line of sight to retreat, repair or cross open ground.
- Later chapters add more: a decoy, a call-in, an EMP.

### 4. Readable danger (Phase A)
- **Big shots are telegraphed:** Cannon and Rockets bots show a thin aim line for 0.4 s before they fire (the Rail already does). Machineguns don't. You dodge by reading, not by twitch.

### 5. Flanking (Phase C)
- **Side hits ×1.3, rear hits ×1.6,** by the hit angle against the target's hull. Heavy turrets turn slowly, so getting behind a Heavy is a real plan. A "Rear hit!" popup teaches it.

### 6. Levels built for plans (Phase C)
- The briefing map shows enemy positions and patrol routes (recon), as Door Kickers does.
- Every level has 2–3 approaches: an open road, a covered flank, a bush line. Sandbag lines near objectives.
- Enemy types per level act differently (turret, patrol, mine-layer, rusher), so each level reads as a small puzzle (Wii Play: Tanks!).

### Phases
- **Phase A (engine, biggest lever), done Nov 14:** sight blocked by walls, alert states and icons, the ambush bonus, low cover, cover HP, bots shooting cover, telegraphed big shots. Retune chapter 1 with the lab after (still to do).
- **Phase B, done Nov 14 (sounds still to do):** the gadget slot (mines, oil, smoke), their art, a gadget pick in the briefing.
- **Phase C:** flank damage, recon on the briefing map, chapter 1 levels re-laid for 2–3 approaches.

### As built (Nov 14)
Code: `src/logic/bots/perception.ts` (sight, hiding, the shot line), `bots/awareness.ts` (alert states, hearing), `bots/brain.ts` and `bots/control.ts` (cover shooting, the telegraph, mine avoidance), `bots/playerBot.ts` (the sim's stand-in), `match/gadgets.ts` and `match/gadgetUse.ts`, `match/combat.ts` (ambush, low cover); the view in `src/render/alertView.ts`, `render/gadgetView.ts`, the aim line in `render/fx.ts`, the HUD and briefing picker. Tests: `test/tactics.test.ts`, `test/gadgets.test.ts`.
- **Sight:** walls, buildings, rocks, gates and smoke block it; low cover, bushes, fences and small trees don't. The player's view is the screen, so this only limits bots.
- **Alert states** as the doc says, with these numbers: calm sees its role's sight (guard 340, patrol 380, turret 400 px) in a 140° cone round the turret; a calm guard or turret sweeps its turret ±40° round its post's heading, so a gap opens now and then. A glimpse (or a shot heard within 300 px) makes it **?**: it stops and turns to the spot. Still in sight **0.6 s** after the glimpse: **!** (spotted). Not seen again for **2 s**: calm. An alert bot sees all round to 440 px and calms back to ? after **8 s** without seeing anyone, then checks where it last saw you. Hit, or called by the alarm: alert at once. Waves, hunters and boss turrets are always alert. Only alert bots raise the alarm.
- **Hiding:** bushes, crops, roofs and smoke hide a tank that hasn't fired for 2 s; an enemy within **60 px** (was 100) still spots it.
- **Ambush ×2** on any player hit (shell, splash, mine) on a calm or suspicious enemy; the hit alerts it, so a Machinegun burst gets ×2 once. The HUD pops "Ambush ×2".
- **Low cover:** a `low` structure flag. Sandbags (H and V, 120 HP, any gun breaks them), hay bales (60 HP), crates (40 HP, flattenable) and fences. A shot passes over low cover for its first 50 px of flight (about 70 px from the tank's centre); high cover blocks both ways. Levels 1 and 4 have sandbag lines near their objectives.
- **Bots shoot cover:** one bot per target (COVER_SHOOTERS = 1) shoots breakable cover in the way, aimed where it last saw you, for up to 6 s; the others flank. A bot that loses you behind a wall drives to where it last saw you; it never shoots at where it can't see.
- **Telegraph:** Cannon and Rockets bots lock their turret and show a thin red aim line for **0.4 s**, then fire along it (it doesn't track you during the hold). This cuts their fire rate a little (a tuning pass follows). Machineguns and the player don't telegraph.
- **Gadgets:** 2 charges a level, up to 4 from crates (12% of rolled crates that aren't kits hold a charge), one use per 0.6 s, key G or the big phone button. The pick is saved (`SaveData.gadget`, default mines). Mines: arm 1 s, 28 px trigger for enemies only, 90 damage (raw, not through armour), 40 px splash at half to other enemies, broken track ×0.5 for 3 s; only bots that saw it laid steer round it. Oil: 60 px, 8 s, enemies at ×0.4 speed and ×0.35 turning; the player is safe in it. Smoke: 90 px, 6 s, blocks sight both ways and hides a tank inside.

## Bots

The same parts and rules as the player. They're the hardest code, so they're built and measured first.

- **Roles, set by the level:**
  - **Guard:** stays near its post and fights what comes in range.
  - **Patrol:** drives a route, and turns to fight when it sees you.
  - **Wave:** arrives from a marked direction and heads for the objective (the hold zone, the truck).
  - **Convoy:** follows a road to an exit; it only shoots back.
  - **Hunter:** comes after you wherever you are.
  - **Runner:** flees to an exit (Chase missions).
  - **Turret:** doesn't move.
- **Alarm:** a guard that's hit or sees you calls the guards near it. Sneaking past or picking off one at a time is a real choice. *(Engine, Nov 14: patrols and turrets raise it too, called guards and patrols within 420 px answer, and a called bot that then sees you calls again.)*
- **Fighting:** when a target is in range, bots fight with the parts they carry, kite if they outrange you, and back off to repair at low HP. *(Engine, Nov 14: enemies carry no repair kit unless the level gives one, so most fight to the end; with a kit each, chapter 1 fights doubled in length.)*
- **Difficulty per chapter:** aim error, reaction time, how well they kite (retreat while firing) and focus fire.
- **Movement:** a coarse navigation grid plus flow fields to the role's goal. Local steering avoids rocks and other tanks.
- **Crews are animals** (badgers, boars, weasels, crows, otters…). They show in the kill feed and on the result screen, never as people. Names use plain A–Z letters.

## Story frame

After the old world, its tank depots lie scattered across the land, and rival animal clans fight over them in the Scrap Wars:
- **Boars:** heavy, slow tanks.
- **Weasels:** fast scouts.
- **Crows:** they loot everything.

You're a young badger commander in the Ink Brigade. Each chapter has a main rival clan, and in some levels the clans fight each other as well as you. Each clan's tanks have their own stripe colour and favourite parts, so you can see whose tech is in front of you.

The commander who briefs you is an old animal officer, named in the chapter 1 content pass. Names use plain A–Z letters.

## Levels and the chapter map

- **The chapter map:** each chapter is one painted land, shown as the level select, like InkCrab's beach map. The 10 levels are spots on it with a path between them, and the medals earned show on each spot.
- **Each level plays on its own map,** a slice of that land sized to the mission (2×2 to 4×4 screens), built from the chapter's ground set and structures.
- **Levels unlock in order.** Any open level can be replayed for missed medals.
- **Level numbers run on:** chapter 2's first level is Level 11 in the HUD, the map, cards and docs.

## Missions

Every level has a short briefing, one **main objective** and two **bonus objectives**.
- **Medals:** each objective done earns a medal (up to 3 per level). Medals only add up, and a replay keeps the medals you already have.
- **Passing:** you pass by completing the main objective. A failed mission restarts on the spot.

| Type | Main objective | What makes it play differently |
|---|---|---|
| **Assault** | Destroy every enemy tank in the area | Guards and patrols around a camp; the alarm decides how many you fight at once |
| **Raid** | Destroy marked targets: fuel barrels, a radar mast, pipeline valves | Targets are breakable structures; some levels add a timer |
| **Escort** | Get a supply truck to a point | The truck follows a road; enemies hunt it, not only you |
| **Hold** | Hold a zone for N seconds | Waves arrive from marked directions |
| **Ace** | Destroy a named enemy ace | Aces carry rare tech (prototype parts) found nowhere else |
| **Rescue** | Break the cages and bring the captured crews home | Freed crews follow you on foot or in a truck; they can be hit (they stay down while enemies are close, and enemies don't aim at them: losing one fails) |
| **Ambush** | Stop a convoy before it leaves the map | Pick where to cut it off; it doesn't wait for you |
| **Salvage** | Take a crashed prototype to the pick-up | Carrying it slows you and every enemy comes for it |
| **Breakout** | Reach the exit before the timer | A gauntlet: artillery marks, hazards, a race against time |
| **Recon** | Get close to 3 marked spots without being seen | Bushes, reeds and roofs hide you; being seen calls reinforcements, not a fail |
| **Capture** | Take 3 flags and hold them all at once | Enemies try to retake them, so you keep moving |
| **Chase** | Catch a fleeing courier before it reaches its base | A faster enemy; cut corners, use shortcuts |
| **Fortress** | Destroy the chapter's boss | Level 10 of every chapter. A huge multi-part tank with breakable turrets |

Bonus objectives are written per level and shown in the briefing. Examples: destroy 5 tanks, win without a repair kit, finish under 3 minutes, never set off the alarm, keep the truck above half HP, destroy a Heavy with Rockets.

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
- **The workshop screen:** your tank in the middle, a tab per slot, and a card per family showing "Cannon blueprints: [icon] 9" with the blueprint icon (the blue sheet the enemies drop) on every amount and cost, never a bare number. A one-line explanation sits under the title. Buttons are bright when you can pay, dimmed with "need 3 more" when short of that part's blueprints, and locked with the rank name ("needs Sergeant") when the rank gates them. Blueprints are per part: Cannon blueprints only buy Cannon upgrades. A badge on every Workshop button (map, briefing, results) counts the upgrades you can afford now. Something new to look forward to, never a streak.

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
| Corporal | Level 3 | Carry 2 repair kits |
| Sergeant | Level 6 | Mk II in the workshop |
| Staff Sergeant | Level 10 | **Call-in:** one supply drop per level, a Mk III part at a spot you choose |
| Lieutenant | Level 15 | Mk III in the workshop, the Kit slot |
| Captain | Chapter 2 end | **A wingman:** one allied bot tank with its own animal crew |
| Major | Chapter 3 | **Call-in:** one artillery strike per level |
| Colonel | Chapter 4 | A second wingman |
| Brigadier | Chapter 5, mid-chapter | Prototype parts from aces can go in the workshop |
| General | The final fortress | Gold insignia, the ending |

The rank badge shows on the commander's portrait, in the HUD and on the result screen, with a short promotion ceremony when you rise.

## The 50 levels

- 5 chapters × 10 levels: chapter 1 (levels 1–10) is free, chapters 2–5 (levels 11–50) are paid, as in our other new games.
- No two levels in a row share a mission type, including across chapters. Each type turns up 3–5 times in the campaign, every time with a different twist.
- Each chapter brings new parts, new terrain and a main rival clan. Chapters 2–5 are drafts: design each in full before building it.

### Chapter 1: Meadowlands (free)

A farm valley. Rival: the Boars. Families in chapter 1: Machinegun, Cannon, Rockets; Light, Medium, Heavy; Wheels, Half-tracks, Tracks, with enemies on Mk I–II. Your first tank is a Light hull on Wheels with a Machinegun. Cannon, Medium and Half-tracks are unlocked by the intel from levels 1–2.

| Level | Name | Mission | Main objective | Teaches |
|---|---|---|---|---|
| 1 | First Tracks | Assault | Destroy the 4 Boar scouts on the farm | Drive, aim, shoot, swap a part, intel |
| 2 | Barn Raid | Raid | Blow up the Boars' 3 fuel barrel stacks | Breakable targets, the workshop after |
| 3 | Milk Run | Escort | Get the supply truck to the village | Protecting, roofs, close fights |
| 4 | Hold the Bridge | Hold | Hold the river bridge for 90 s | Waves, water, choke points |
| 5 | Weasel Ace | Ace | Destroy Sly, a Weasel ace on Mk II Wheels, in the woods | Counters (Machinegun beats Wheels), rare intel |
| 6 | The Old Mill | Rescue | Free 3 otter crews and bring them to the truck | Being followed, Sergeant rank |
| 7 | Cut the Convoy | Ambush | Stop 3 Boar trucks before they leave the valley road | Interception, picking your spot |
| 8 | Wreck in the Rails | Salvage | Get the crashed prototype from the rail yard to the pick-up | Being hunted, cover |
| 9 | Through the Pass | Breakout | Reach the fort gate in 3 minutes through the guarded pass | Artillery marks, pace |
| 10 | The Old Fort | Fortress | Destroy the Boar land fortress | The chapter boss, Staff Sergeant |

### Chapter 2: Dust Flats (paid, draft)

Desert, canyons and an oil town. Rival: the Crows. New: Mortar, the Kit slot, Recon intel. Twist: sandstorms cut vision, dunes slow Wheels.

| Level | Name | Mission | Main objective | Twist |
|---|---|---|---|---|
| 11 | Sand in the Tracks | Assault | Clear the Crow camp on the oil town's edge | Mortars lob over walls |
| 12 | Eyes on the Canyon | Recon | Scout 3 Crow camps unseen | The Radar kit |
| 13 | Pipeline | Raid | Blow 4 pipeline valves in 3 minutes | Timer |
| 14 | Water Truck | Escort | Get the water truck across the flats | A sandstorm mid-route |
| 15 | The Wells | Capture | Hold all 3 wells at once | Crows retake them |
| 16 | Dune Runner | Chase | Catch the Weasel courier before the canyon | Dunes slow Wheels; pick a drive |
| 17 | Rook's Mesa | Ace | Destroy Rook, a Crow ace with a Mk III Mortar | Getting under a mortar's minimum range |
| 18 | Oil Town Siege | Hold | Defend the town square through 4 waves | Mortar waves |
| 19 | Crow Prison | Rescue | Free the Ink scouts from the Crow prison | The alarm |
| 20 | The Sand Crawler | Fortress | Destroy the sand crawler | Boss |

### Chapter 3: Mirefen (paid, draft)

Swamp and stilt villages. Rival: the Weasels. New: Hover, Flamer. Twist: water everywhere, so Hover routes and mud.

| Level | Name | Mission | Main objective | Twist |
|---|---|---|---|---|
| 21 | Hover Trials | Breakout | Cross the marsh before the tide comes in | Hover |
| 22 | Stilt Village | Assault | Clear the stilt village | Flamers in close quarters |
| 23 | The Barge | Escort | Get the supply barge up the river | Enemies on both banks |
| 24 | Reed Watch | Recon | Mark 3 Weasel positions | Reeds hide you |
| 25 | Break the Dams | Raid | Break 3 dams | Floods change the routes |
| 26 | Mud Islands | Capture | Hold 3 islands at once | Hover against mud |
| 27 | Grim | Ace | Destroy Grim, a Hover ace with a Flamer | A fast close-range duel |
| 28 | Sunken Prototype | Salvage | Raise the prototype and get it out | Slow in water |
| 29 | Last Lock | Ambush | Sink the barge convoy before the lock | Timing on water |
| 30 | The Ironclad | Fortress | Destroy the paddle-wheel ironclad | Boss |

### Chapter 4: Frostridge (paid, draft)

Snow and a frozen lake. Rival: all three clans, pushed north. New: Laser. Twist: ice skids every drive, blizzards.

| Level | Name | Mission | Main objective | Twist |
|---|---|---|---|---|
| 31 | Thin Ice | Breakout | Cross the frozen lake | Ice cracks under Heavies |
| 32 | Snowed In | Rescue | Dig out 3 stranded crews | Break snowdrifts |
| 33 | Laser Lab | Raid | Destroy the lab's 3 generators | Laser loot |
| 34 | Blizzard Pass | Escort | Get the truck through the pass | Blizzard vision |
| 35 | Ridge Line | Capture | Hold 3 ridges at once | High ground |
| 36 | Ermine | Ace | Destroy Ermine, a Laser ace | Instant beams, dodge by cover |
| 37 | Avalanche | Hold | Hold the pass for 2 minutes | Shoot the cliffs to bury waves |
| 38 | Signal Run | Chase | Catch the signal courier on the ice | Skidding at speed |
| 39 | Tracking the Train | Recon | Mark the rail-gun train's 3 depots | Sets up level 40 |
| 40 | The Rail-Gun Train | Fortress | Destroy the rail-gun train | Boss |

### Chapter 5: Ashfall (paid, draft)

Volcanic land and a ruined city. Rival: the Iron Hive, the clans' old masters. New: Rail. Twist: lava vents, collapsing buildings.

| Level | Name | Mission | Main objective | Twist |
|---|---|---|---|---|
| 41 | Ash Rain | Assault | Clear the city gate | Rail guns pierce walls |
| 42 | Lava Fields | Breakout | Cross the vents | Vents erupt on a rhythm |
| 43 | Hive Scouts | Recon | Scout 3 Hive works | Collapsing cover |
| 44 | Bridges of Fire | Raid | Blow 3 bridges before the column crosses | Timer |
| 45 | The Last Convoy | Escort | Get the Ink Brigade's convoy into the city | Buildings fall on the road |
| 46 | Three Clans | Capture | Hold the city's 3 squares | The clans fight each other too |
| 47 | Old Rivals | Ace | Destroy Sly, Rook and Grim together | Every counter at once |
| 48 | Hive Cells | Rescue | Free the clan prisoners | The clans join you |
| 49 | The Long Night | Hold | Hold the Brigade camp for 3 minutes | Every enemy type |
| 50 | The Iron Hive | Fortress | Destroy the Iron Hive | The final fortress, General |

## Controls

- **Desktop:** WASD or arrows drive in the direction pressed (diagonals too). The hull turns that way and rolls once it lines up, as the left stick does. The mouse aims the turret, clicking or holding fires, E swaps and Q uses a repair kit.
- **Phone:**
  - The left thumbstick drives, steering towards where you point.
  - The right thumbstick aims, and fires while held past the dead zone.
  - The swap button only shows on a part. The repair button sits by the right stick.
  - Bigger buttons, only essential UI, and the HUD kept clear of the sticks (see the mobile rule).
- **HUD:** pickups read "+5 [blueprint icon] blueprints (Cannon, Wheels)", and the first time a player ever picks blueprints up a tip says to spend them in the Workshop (saved, so once per player). The results list blueprints per family with part icons and highlight "Upgrade ready: Cannon Mk II". The objective line top centre with an edge arrow to the next target, the minimap top right, HP and part icons bottom centre, and the timer top right when a level has one.

## Performance budget

- 60 FPS on a mid-range phone with 30 tanks, shots and particles on screen. The stress test proves this before content starts.
- Memory under about 250 MB on iPhone Safari: ground streamed in chunks, part rotations only for parts in the match.
- Download: the first load under about 5 MB, with later chapters' art loaded when they open.

## Build phases

Phase 1 (engine, art test, density test, stress test) is done, with the battle-royale rules. The redesign reworks it:

1. **Engine rework (one Opus agent), done Nov 14:** levels as data, roles, alarm, all 13 objectives, the lab (`npm run lab`), and chapter 1's 10 levels as first drafts. Content agents work from `docs/inktanks-level-kit.md`.
   - Remove the drop map, the storm, Royale, and land regions that grow per mission.
   - Add level layouts in `src/content`: map size and slice of the chapter land, start point, enemy placements with roles and routes, crates, targets, objective and bonuses.
   - Rework bots from loot/rotate/fight/flee to the level roles (guard, patrol, wave, convoy, hunter, runner, turret) and the alarm.
   - Keep and adapt Raid, Escort, Hold, Ace, Salvage and Fortress. Add Assault, Rescue, Ambush, Breakout, Recon, Capture and Chase, all pure logic with tests.
   - The headless sim plays every level with a player bot and reports pass rate, time and medals, for tuning; the no-grind check runs over the whole chapter.
2. **Art for chapter 1 (in parallel):** every chapter 1 part at Mk I–III with clan stripe masks; the Meadowlands ground set and structures (houses, barns, walls, fences, trees, rocks, bridge, crates, fuel barrels, the radar mast, cages, the truck, the rail yard, flags); the fortress boss; the chapter map.
3. **Screens:** chapter map, mission briefing, workshop, rank and promotion, results with medals and intel.
4. **Chapter 1 content:** the 10 levels, tuned from the sim. Then the owner's playtest.
5. **Release:** game-sdk integration, the site page, itch build, promo shorts.
6. **Chapters 2–5**, one at a time, each designed in full first.
