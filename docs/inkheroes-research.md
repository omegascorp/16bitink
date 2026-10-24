# InkHeroes: research

What Heroes of Might and Magic III does, read from the open-source **VCMI** engine (`~/Projects/vcmi`: rules in `config/*.json`, `lib/battle/`, `scripts/damage/damageCalculator.lua`, `docs/`), and what InkHeroes takes from it. Researched October 24, 2026.

VCMI holds the rules but **not** H3's number tables: creature stats, building costs and spell costs are read at runtime from the licensed game files (`DATA/CRTRAITS.TXT`, `BUILDING.TXT`, `SPTRAITS.TXT`). Numbers marked *(memory)* are H3 values from memory, not from a source read during the research. InkHeroes uses its own numbers anyway, under its own names.

## Battles

| Rule | H3 (VCMI) | InkHeroes |
|---|---|---|
| Field | 17 × 11 hexes; the two edge columns hold heroes and war machines (`lib/battle/BattleHex.h`) | **13 × 9**, so hexes stay finger-sized on a phone; heroes stand beside the field |
| Order | Highest speed first; ties go to the attacker in round 1, then alternate. *Wait* moves a stack to the end of the round, slowest first (`CBattleInfoCallback.cpp`) | Same |
| Defend | +20% Defense until its next turn (at least +1) | Same |
| Damage | (random min–max) × count; Attack over Defense **+5% a point (cap +300%)**, Defense over Attack **−2.5% a point (cap −70%)**; bonuses add, penalties multiply; at least 1 (`damageCalculator.lua`, `gameConfig.json`) | Same formula |
| Retaliation | Once a round, after the first strike only; ranged attacks aren't answered | Same |
| Shooters | −50% beyond 10 hexes; can't shoot with an enemy alongside; −50% in melee; limited shots | Same, with the range penalty beyond **7** hexes (smaller field) |
| Flying | Reaches any hex within its speed, over anything | Same |
| Two-hex units | Cavalry, dragons… take 2 hexes | ❌ Every unit takes one hex: simpler to read and to tap |
| Morale | +1/+2/+3 gives a 1/24, 2/24, 3/24 chance of a second action; bad morale 2/24, 4/24, 6/24 to skip | Same chances |
| Luck | 1/24 a point for double damage; bad luck off | Same |
| Tactics phase | Reposition before the fight | ⏳ Later (a skill for chapter 2+) |
| Battle XP | Sum of killed enemies' HP, +500 for a hero | Same |
| Neutral AI | StupidAI: shoot the best target, else hit what gives the best (damage dealt − retaliation taken), else walk to the nearest enemy (`AI/StupidAI`) | Same idea |

## Heroes

- **Primary skills:** Attack, Defense, Spell Power, Knowledge (minimums 0/0/1/1). Mana = 10 × Knowledge; 1 mana back a day, full in a town with a mage guild.
- **Experience to reach a level** (`CHeroHandler.cpp`): 0, 1000, 2000, 3200, 4600, 6200, 8000, 10000, 12200, 14700, 17500, 20600, 24320, 28784, 34140, then ×1.2 a level.
- **Level-up:** +1 to a primary skill (class-weighted), and a choice of 2 secondary skills. Up to 8 secondary skills. Wisdom is guaranteed every 3 (magic) or 6 (might) levels.
- **Secondary skills** (basic / advanced / expert), from `config/skills.json`: Logistics +10/20/30% movement · Pathfinding cuts rough-ground cost 25/50/75 · Archery +10/25/50% · Offense +10/20/30% · Armorer −5/10/15% damage taken · Leadership +1/2/3 morale · Luck +1/2/3 · Wisdom spell level 3/4/5 · Mysticism 2/3/4 mana a day · Intelligence +25/50/100% mana · Sorcery +5/10/15% spell damage · Estates 125/250/500 gold a day · Scouting +1/2/3 sight · Learning +5/10/15% XP · Tactics · Diplomacy · Necromancy, and the four magic schools.
- **Movement points a day** by the army's slowest unit: speed 0→1300 … 3→1500, 4→1560, 5→1630, 6→1700, 7→1760, 8→1830, 9→1900, 10→1960, 11+→2000.
- **Terrain cost a tile** (`config/terrains.json`): dirt and grass 100, rough 125, sand and snow 150, swamp 175, rock impassable. Roads: dirt 75, gravel 65, cobblestone 50. Diagonal steps cost ×√2; a last step that costs more than what's left is still allowed if the straight cost fits.
- **Army:** 7 slots. A hero costs 2500 gold to hire, a spellbook 500.
- **Sight:** radius 5 for heroes and towns.

## The adventure map

- **Resources:** wood, ore, mercury, sulfur, crystal, gems, gold. Mines a day: sawmill 2 wood, ore pit 2 ore, the rare four 1 each, gold mine 1000. Piles: wood and ore 5–10, rare 3–6, gold 500–1000.
- **Treasure chest:** 32% 1000 gold or 500 XP, 32% 1500 or 1000, 31% 2000 or 1500, ~5% an artifact.
- **Once per hero:** Mercenary Camp +1 Attack, Star Axis +1 Spell Power, Arena +2 Attack or +2 Defense, Learning Stone +1000 XP, Tree of Knowledge +1 level.
- **Weekly:** Windmill (rare resources), Water Wheel (gold). **Visits:** Stables, Fountain of Fortune, Temple, Rally Flag, Oasis.
- **Wandering monsters:** size words for counts: Few 1–4, Several 5–9, Pack 10–19, Lots 20–49, Horde 50–99, Throng 100–249, Swarm 250–499, Zounds 500–999, Legion 1000+. They guard the 8 tiles around them. Weaker ones may join or flee, by army strength ratio and Diplomacy (`CGCreature.cpp`). They grow 10% a week.
- **Time:** 7-day weeks, 4-week months. Dwellings refill weekly.

## Towns (H3's Castle)

- **One building a day.** Income by hall: Village Hall 500, Town Hall 1000 (needs Tavern), City Hall 2000 (needs Mage Guild 1, Marketplace, Blacksmith), Capitol 4000 (needs Castle).
- **Walls:** Fort → Citadel (+50% growth) → Castle (+100% growth).
- **Dwelling tree:** level 1 needs the Fort; level 2 ← 1; level 4 ← Blacksmith + 1; level 3 ← 4; level 5 ← Mage Guild 1 + 4; Stables ← 4; level 6 ← Stables; level 7 ← 5. Each upgrade needs its base dwelling.
- **Castle units:** Pikeman, Archer (shoots, 12 shots), Griffin (flies, 2 retaliations), Swordsman, Monk (shoots), Cavalier (jousting +5% damage a hex moved), Angel (flies, +1 morale). Stats *(memory)*: Pikeman 4/5, 1–3, 10 HP, speed 4, 14 a week, 60 gold · Archer 6/3, 2–3, 10 HP, 4, 9, 100 · Griffin 8/8, 3–6, 25 HP, 6, 7, 200 · Swordsman 10/12, 6–9, 35 HP, 5, 4, 300 · Monk 12/7, 10–12, 30 HP, 5, 3, 400 · Cavalier 15/15, 15–25, 100 HP, 7, 2, 1000 · Angel 20/20, 50, 200 HP, 12, 1, 3000 + 1 gem.
- **Building costs** *(memory)*: Fort 5000 + 20 wood + 20 ore · Tavern 500 + 5 wood · Blacksmith 1000 + 5 wood · Marketplace 500 + 5 wood · Mage Guild 1: 2000 + 5 wood + 5 ore · Town Hall 2500 · City Hall 5000 · level 1 dwelling 1000 + 5 ore · level 2: 1000 + 5 wood + 5 ore · level 3: 1000 + 5 ore · level 4: 2000 + 5 ore.

## Magic

- Four schools (Air, Fire, Earth, Water); one hero spell a battle round; heroes learn spell levels 1–2, Wisdom raises it.
- Timed spells last Spell Power rounds. Effects (`config/spells/`): Haste +3 speed · Slow −25% speed · Bless max damage · Curse min damage · Bloodlust +3 Attack · Stone Skin +3 Defense · Weakness −3 Attack · Shield −15% melee damage taken · Cure heals and removes bad effects.
- *(memory)* Magic Arrow 5 mana, 10 × SP + 10 damage · Lightning Bolt 10 mana, 25 × SP + 10 · Cure 6 mana, heals 5 × SP + 10 · Haste, Slow, Bless, Stone Skin 5–6 mana.

## The adventure AI

VCMI's **Nullkiller** ranks goals each pass (capture objects, build, buy army, gather army, recruit hero, defend) and runs the best. InkHeroes' one rival (chapter 1's last map) can follow the same shape at a small scale: take the nearest worthwhile object or weaker monster, go home to hire the week's units, attack the player when its army is stronger.

## What InkHeroes takes

- ✅ The H3 loop: explore → fight neutrals for mines and treasure → build one thing a day → hire the week's units → beat the map's goal.
- ✅ H3's battle rules and damage formula, on a smaller field, with one-hex units.
- ✅ Heroes that level up with a choice of two skills.
- ✅ Weekly growth, mines, piles, chests, once-per-hero sites.
- ⏳ Later: two-hex units, tactics, artifacts with a paper doll, the marketplace, siege walls, several heroes, random maps.
- ❌ Not taken: H3's names (factions, creatures, heroes, places), its art, its music.
