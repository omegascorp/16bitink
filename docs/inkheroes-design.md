# InkHeroes: design

A turn-based strategy game in ballpoint pen, after Heroes of Might and Magic III (rules read from VCMI, see [inkheroes-research.md](inkheroes-research.md)). Lead a hero across a hand-drawn map, fight for mines and treasure, build up your town one building a day, hire the week's troops and beat each map's goal.

Started Oct 24, 2026. Fifth game on 16bit.ink.

User's choices (Oct 24): the name **InkHeroes**; a **classic fantasy** world close to H3's factions under our own names; **neutral monsters first, then one AI rival** on the last free map; a **campaign of short hand-made maps**, chapter 1 free with one faction, later chapters adding factions.

## Pillars

1. **H3's loop, in short maps.** Explore, fight, take mines, build one thing a day, hire the week's troops. Each map takes 20–40 minutes and has a single clear goal.
2. **H3's battles, phone-sized.** The same damage formula, retaliation, shooters, flyers, morale and luck, on a 13 × 9 field where every unit takes one hex.
3. **Every number shows.** Hovering an attack shows the damage and kills it will do; hovering a monster shows its size word ("a pack of wolves"); a building says what it needs.
4. **No lost evening.** The game saves at the start of every day; losing a battle offers that day again.

## The adventure map

- **Tiles:** square, 8-way movement. Diagonal steps cost ×√2 (rounded). A last step that costs more than what's left is still allowed if its straight cost fits (as H3).
- **Ground costs a tile:** grass and dirt 100, rough 125, sand and snow 150, swamp 175. Roads 50. Water, mountains, trees and rocks block.
- **Movement points a day** by the army's slowest unit (H3's table): speed ≤3 → 1500, 4 → 1560, 5 → 1630, 6 → 1700, 7 → 1760, 8 → 1830, 9 → 1900, 10 → 1960, 11+ → 2000. Logistics adds 10/20/30%.
- **Moving:** tap a tile to see the path (filled dots for today, hollow dots for later days), tap it again to go. Tap a monster or a site to walk next to it and step in.
- **Fog:** the map starts hidden; heroes see 5 tiles round them (Scouting +1/2/3), towns 5.
- **Monsters** guard the 8 tiles around them: stepping onto one of those tiles starts the fight. They grow 10% a week. They show a size word for their count: a few (1–4), several (5–9), a pack (10–19), lots (20–49), a horde (50–99), a throng (100–249), a swarm (250–499), zounds (500–999), a legion (1000+).
- **Time:** End Day. 7-day weeks; every Monday (day 1 of a week) the town's dwellings fill up again.

### Resources

Gold, wood, ore, mercury, sulfur, crystal, gems. Mines a day: sawmill 2 wood, ore pit 2 ore, the rare four 1 each, gold mine 1000. A mine flies its owner's flag once a hero steps in.

### Map sites

| Site | Effect |
|---|---|
| Pile | Gold 500–1000, wood or ore 5–10, a rare 3–6 |
| Treasure chest | Choose gold or experience: 1000 gold / 500 XP, 1500 / 1000, or 2000 / 1500 |
| Campfire | 400–600 gold and 4–6 of one resource |
| Mercenary camp | +1 Attack (once per hero) |
| Old watchtower | +1 Defense (once per hero) |
| Standing stone | +1000 experience (once per hero) |
| Wayside shrine | Teaches a spell (needs a spellbook) |
| Windmill | 3–6 of a rare resource each week |
| Stables | +400 movement today and a free day's rest for horses (once a week) |
| Mine | Daily income once taken |

## Heroes

- **Primary skills:** Attack, Defense, Spell Power, Knowledge. Attack and Defense add to every unit in the army; mana = 10 × Knowledge. One mana back a day, full after a night in a town with a mage guild.
- **Experience to reach each level:** 0, 1000, 2000, 3200, 4600, 6200, 8000, 10000, 12200, 14700, 17500, 20600, 24320, 28784, 34140, then ×1.2 a level (H3's table).
- **Level-up:** +1 to a primary skill (by class weights), then a choice of two secondary skills (a new one or the next rank of one held). Up to 8 secondary skills, 3 ranks each.
- **Army:** 7 slots. Units of the same kind merge.
- **Secondary skills** (basic / advanced / expert):
  - Logistics: +10 / 20 / 30% movement
  - Pathfinding: rough ground costs 25 / 50 / 75% less of its extra
  - Offense: +10 / 20 / 30% melee damage
  - Archery: +10 / 25 / 50% ranged damage
  - Armorer: −5 / 10 / 15% damage taken
  - Leadership: +1 / 2 / 3 morale
  - Luck: +1 / 2 / 3 luck
  - Wisdom: learn spells up to level 3 / 4 / 5
  - Intelligence: +25 / 50 / 100% mana
  - Mysticism: 2 / 3 / 4 mana back a day
  - Sorcery: +5 / 10 / 15% spell damage
  - Estates: 125 / 250 / 500 gold a day
  - Scouting: +1 / 2 / 3 sight
  - Learning: +5 / 10 / 15% experience

### Classes

| Class | Faction | Leans | Level-up weights A / D / SP / K |
|---|---|---|---|
| Knight | Crown | might | 35 / 45 / 10 / 10 |
| Cleric | Crown | magic | 20 / 15 / 30 / 35 |

## Battles

- **Field:** 13 columns × 9 rows of hexes, rows staggered; the attacker's army lines up in the left column, the defender's in the right. 2–5 obstacles (rocks, stumps) in the middle columns, from the map tile's seed.
- **Turn order:** highest speed first; ties go to the attacker in round 1, then alternate. Each unit may move, attack, **wait** (act again at the end of the round, slowest first) or **defend** (+20% Defense, at least +1, until its next turn).
- **Walking** units go round others and obstacles; **flying** units reach any free hex within their speed.
- **Melee:** move next to the target and strike. The target **retaliates** once a round, after the first strike only.
- **Shooting:** shooters fire at any enemy unless an enemy stands next to them; −50% damage beyond 7 hexes; −50% in melee. Ranged hits aren't answered. Shots run out.
- **Damage:** base = (random between min and max) × count. If Attack > Defense: +5% a point, at most +300%. If Defense > Attack: −2.5% a point, at most −70%. Bonuses (Offense or Archery, luck's ×2) add; penalties (range, melee for shooters, Armorer, Shield) multiply. At least 1. Damage kills from the top creature down.
- **Morale:** each point gives a 1-in-24 chance of a second action straight after; each negative point a 2-in-24 chance of losing the turn. Undead have none. Mixing factions costs 1 (2+ factions) or 2 (3+).
- **Luck:** each point gives a 1-in-24 chance of double damage.
- **Spells:** the hero casts one spell a round, in place of nobody's turn (a button). Timed spells last Spell Power rounds (at least 1).
- **Ending:** one side has no units left. The winner gets XP = the sum of the HP of the enemy creatures killed. The losing hero's map is lost (chapter 1 has one hero), and the game offers that day again.
- **Neutral AI:** a shooter shoots the target it can hurt most; otherwise it attacks the reachable enemy with the best (damage dealt − damage taken back); otherwise it walks towards the nearest enemy.

## Spells

| Spell | Level | Mana | Effect |
|---|---|---|---|
| Magic Arrow | 1 | 5 | 10 × SP + 10 damage to one enemy |
| Bless | 1 | 5 | A friendly unit always deals its maximum damage |
| Stone Skin | 1 | 5 | +3 Defense |
| Bloodlust | 1 | 5 | +3 Attack (melee) |
| Haste | 1 | 6 | +3 speed |
| Slow | 1 | 6 | −25% speed (an enemy) |
| Cure | 1 | 6 | Heals 5 × SP + 10 and lifts bad spells |
| Lightning Bolt | 2 | 10 | 25 × SP + 10 damage to one enemy |

## Factions

### The Crown (chapter 1)

A walled hill town of knights, archers and griffin riders.

| Lvl | Unit | Att | Def | Damage | HP | Speed | Growth | Cost | Notes |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Spearman | 4 | 5 | 1–3 | 10 | 4 | 14 | 60 | |
| 2 | Bowman | 6 | 3 | 2–3 | 10 | 4 | 9 | 100 | Shoots, 12 shots |
| 3 | Griffin | 8 | 8 | 3–6 | 25 | 6 | 7 | 200 | Flies, retaliates twice a round |
| 4 | Swordsman | 10 | 12 | 6–9 | 35 | 5 | 4 | 300 | |
| 5 | Monk | 12 | 7 | 10–12 | 30 | 5 | 3 | 400 | Shoots, 12 shots |
| 6 | Lancer | 15 | 15 | 15–25 | 100 | 7 | 2 | 1000 | Charge: +5% damage a hex moved |
| 7 | Seraph | 20 | 20 | 50 | 200 | 12 | 1 | 3000 + 1 gem | Flies, +1 morale to the army |

Upgrades come in a later chapter.

### Neutrals (chapter 1)

| Unit | Lvl | Att | Def | Damage | HP | Speed | Notes |
|---|---|---|---|---|---|---|---|
| Goblin | 1 | 4 | 2 | 1–2 | 5 | 5 | |
| Skeleton | 1 | 5 | 4 | 1–3 | 6 | 4 | Undead (no morale) |
| Wolf | 2 | 6 | 3 | 2–4 | 10 | 7 | |
| Bandit | 2 | 8 | 3 | 2–4 | 10 | 6 | Strikes unanswered (no retaliation) |
| Ogre | 4 | 13 | 7 | 6–12 | 40 | 4 | |

A map monster splits into about √count stacks in battle, at most 4 (4 goblins make 2 stacks, 10 wolves 3).

## Towns

- **One building a day.** Some buildings are off on a map (shown greyed, "not on this map").
- **Income:** Village Hall 500, Town Hall 1000, City Hall 2000, Capitol 4000.
- **Walls:** Fort → Citadel (+50% growth) → Castle (+100% growth).
- **Dwellings** fill up with a week's growth every Monday; unhired units carry over.
- **Hiring:** units go to the visiting hero's army, or to the town's garrison when no hero is there. A hero in town can swap units with the garrison.
- **Mage guild:** level 1 teaches 3 level-1 spells, level 2 teaches 2 level-2 spells (from the map's list); a hero with a spellbook learns them on entering.

### The Crown's buildings

| Building | Cost | Needs | Does |
|---|---|---|---|
| Village Hall | (built) | | 500 gold a day |
| Town Hall | 2500 | Tavern | 1000 gold a day |
| City Hall | 5000 | Town Hall, Marketplace, Blacksmith, Mage Guild 1 | 2000 gold a day |
| Capitol | 10000 | City Hall, Castle | 4000 gold a day |
| Fort | 5000, 20 wood, 20 ore | | Walls; needed for dwellings |
| Citadel | 2500, 5 ore | Fort | +50% growth |
| Castle | 5000, 10 wood, 10 ore | Citadel | +100% growth |
| Tavern | 500, 5 wood | | +1 morale when defending the town |
| Blacksmith | 1000, 5 wood | | (sells war machines, later) |
| Marketplace | 500, 5 wood | | Trade resources |
| Mage Guild 1 | 2000, 5 wood, 5 ore | | 3 level-1 spells, a spellbook for 500 |
| Mage Guild 2 | 1000, 5 wood, 5 ore, 4 each rare | Mage Guild 1 | 2 level-2 spells |
| Guardhouse (Spearmen) | 1000, 5 ore | Fort | |
| Archery Range (Bowmen) | 1000, 5 wood, 5 ore | Guardhouse | |
| Griffin Tower | 1000, 5 ore | Barracks | |
| Barracks (Swordsmen) | 2000, 5 ore | Guardhouse, Blacksmith | |
| Monastery (Monks) | 3000, 5 wood, 5 ore, 2 each rare | Mage Guild 1, Barracks | |
| Stables | 2000, 10 wood | Barracks | +400 movement for a hero leaving town |
| Tiltyard (Lancers) | 5000, 20 wood | Stables | |
| Seraph Spire | 20000, 10 each rare | Monastery | |

## Chapter 1: The Border March (free)

Three short maps on the Crown's northern border, taught one idea at a time.

| # | Map | Size | Goal | New |
|---|---|---|---|---|
| 1 | **Ashford** | 32 × 24 | Beat the ogre warband holding the old bridge | Moving, fights, piles, mines, the town, building and hiring |
| 2 | **Thornwood** | 40 × 32 | Take the bandits' fort at Thornwood (a garrisoned neutral town) | Taking a town, two towns, a shrine, a windmill |
| 3 | **The Black Banner** | 48 × 36 | Beat the rival lord and take his town | A rival AI hero with a town, racing for mines |

Map 1's hero is **Rowan**, a Knight: Attack 2, Defense 2, Spell Power 1, Knowledge 1, basic Leadership, a spellbook with Magic Arrow. Army: 18 Spearmen, 7 Bowmen. Town Ashford: Village Hall, Fort, Tavern, Guardhouse; its Mage Guild teaches Bless, Stone Skin and Slow. Off on this map: City Hall, Capitol, Castle, Marketplace, the guild's 2nd floor, Monastery, Stables, Tiltyard, Seraph Spire. Starting purse: 7500 gold, 15 wood, 15 ore, 3 of each rare. The ogres (8, growing 10% a week) hold the west end of the old bridge; the river can only be crossed there.

### Ink blots (stars)

One for winning the map, one for winning within its par days, one for losing no unit stack (no slot wiped out).

## Controls

- **Map:** tap a tile to plan a path, tap it again to go. Drag to pan; wheel or pinch to zoom. Space or the hourglass ends the day. T opens the town.
- **Battle:** tap a lit hex to move; tap an enemy to attack it (the side of the enemy you tap is where your unit strikes from; on touch, a first tap shows the damage, a second strikes). W waits, D defends, C opens the spellbook.
- **Pause:** Esc or the ❚❚ button.

## Building status

Oct 24, 2026 (first session): the rules are built and tested (`games/inkheroes/src/logic/`, 36 tests): battles, heroes, the map, towns, saving. Map 1 (Ashford) plays end to end: map → battle → town → victory. Creature, hero and site drawings were made by parallel art passes. Maps 2–3, the rival AI and the website listing are next.

Oct 24 (second session): the town screen is a painted townscape like H3's (`src/art/townscape/`, contract in `types.ts`): the ground is painted once and each building stands in its slot once built (hall, walls and guild upgrade in place), lights up and names itself under the pointer, and opens its panel when tapped (the hall the Build ledger, the walls and dwellings Recruit, the guild its spells). The armies, purse and buttons sit in a strip below. The townscape is painted the first time a town opens. The menu has a painted vista, a title banner and a vignette on each map card (`src/art/menu/`). Preview the art with `dev/art.html` (`?town=start|all`, `?pieces=all`, `?menu=all`).

Oct 24 (third session): the town fills the screen (drag sideways when it's wider than the screen) and its messages show on an ink banner above the strip. Every creature and the hero are animated: each drawer takes a pose (`src/art/creatures/types.ts`: idle 6 frames, walk 6, attack 5 with the blow on frame 2), painted through a rig of joints so the art is unchanged. Boot paints each figure standing; a map paints its figures' idle loops and the hero's gallop, a battle its fighters' poses. `FigureAnim` (scenes/figureAnim.ts) plays them; `gait.ts` adds a light lean and dust on top, and lifts flyers along their arc. Melee blows and shots land on the attack's strike frame; arrows and orbs leave from the points the bowman and monk paintings export. Check the frames with `dev/specimens.html?poses&only=<id>`.

## Saving

The adventure is saved in localStorage after every action, and a copy is kept at the start of each day (so a lost battle can replay the day). Progress (maps won, blots) is saved and merged like the other games.

## Not yet

Taking towns (the "capture" goal has no code path yet: map 2 needs it), several heroes and the tavern’s hire, artifacts, the marketplace's trade, upgrades, two-hex units, tactics, sieges with walls, the rival AI (map 3), random maps.
