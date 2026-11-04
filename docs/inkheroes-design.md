# InkHeroes: design

A turn-based strategy game in ballpoint pen, after Heroes of Might and Magic III (rules read from VCMI, see [inkheroes-research.md](inkheroes-research.md)). Lead a hero across a hand-drawn map, fight for mines and treasure, build up your town one building a day, hire the week's troops and beat each map's goal.

Started Oct 24, 2026. Fifth game on 16bit.ink.

User's choices (Oct 24): the name **InkHeroes**; a **classic fantasy** world close to H3's factions under our own names; **neutral monsters first, then one AI rival** on the last free map; a **campaign of short hand-made maps**, chapter 1 free with one faction, later chapters adding factions.

## Pillars

1. **H3's loop, in short maps.** Explore, fight, take mines, build one thing a day, hire the week's troops. Each map takes 20–40 minutes and has a single clear goal.
2. **H3's battles, phone-sized.** The same damage formula, retaliation, shooters, flyers, morale and luck, on H3's 15 × 11 field where most units take one hex and the big ones two.
3. **Every number shows.** Hovering an attack shows the damage and kills it will do; hovering a monster shows its size word ("a pack of wolves"); a building says what it needs.
4. **No lost evening.** The game saves at the start of every day; losing a battle offers that day again.

## Art direction

**Nov 3, 2026: replaced by pixel art.** The user found the painted ink style didn't suit the game and chose PixelLab-generated pixel art, style B (painterly shading, selective outline, warm light from the left), at 32-bit density. Every screen is a locked native canvas shown only at whole-number zoom. The battle is 960×540 (×2 on 1080p and 1440p, ×4 on 4K) so H3's exact battlefield fits: 15 × 11 hexes of 44 × 52 px with 42 px rows, units at H3's size relative to a hex, two-hex units for the griffin, centaur, Companion and wolf (user, Nov 3). Battle backgrounds are composed at run time from separate parts (`src/scenes/battle/pixelScenery.ts`), never a fixed picture: a dithered sky gradient with cloud sprites, pale mountain ranges, hills and a tree line on the horizon, then ground patches cut from the terrain's ground painting, with tufts, stones and bushes on top (stones and bushes kept off the hex field and the heroes). Placement is hashed from the battle seed and each grid cell, so every battle looks different (the clouds are their own looping strip, 2040 px a loop, drifting right 3 native px a second behind the mountains, smoothly by fractions of a pixel through Phaser's smooth-pixel-art shader so the pixels stay square; user, Nov 3), any screen size is covered (whole-number zoom can show almost twice the world), and a resize only adds scenery at the edges. Parts per terrain: `dev/pixel/parts/<terrain>/scenery.json` → `dev/pixel/scenery.py` → one atlas + `src/art/pixel/scenery.ts` (user, Nov 3). All six terrains have parts; a terrain without them would fall back to a 1408×1056 quilted painting (`dev/pixel/quilt.py`). Fixed paintings were rejected because they ran out on wide screens and looked repetitive. Battle cursors as in Heroes 3 (`src/scenes/pixelCursors.ts`): boot to move, a sword in 8 directions pointing the way the blow comes in, arrow / broken arrow (past 7 hexes, half damage) to shoot, a question mark over a unit with nothing to do to it (click, or right-click any unit, for its stats card) and a wand over a spell's target (user, Nov 3). The battle's interface is pixel art on the same grid (user, Nov 3; `src/scenes/battle/battleHud.ts`): a UI camera at the world's whole zoom draws code-drawn bronze frames (`pixelFrames.ts`), the status line on a dark plate, the turn order as 32 × 32 faces cut 1:1 from each unit's idle frame (`face` in `units.json`; gold rim and arrow for the unit to act, blue ours, red-brown theirs, the right side mirrored, dimmed once waited), Wait / Defend under the left hero and Spell / Auto under the right one (32 px icons over their labels), rising damage numbers, and the cards. Text is Ark Pixel 12 proportional (OFL, cut to Latin, Greek and Cyrillic in `dev/pixel/ui/build_ui.py`), a real font so the battle can be translated, drawn at its design size and snapped to whole pixels; the user preferred the pixel font to smooth serifs and asked for a proper font file over a baked glyph sheet. The unit card is Heroes 3's creature window: name, the unit's idle animation in a scene of this battle's terrain with its count, stat rows with icons (base, then the battle's value in brackets), abilities and spells on it. The spellbook is an open book with a ribbon tab per school, six spells a page (icon, level numeral, name, mana), the school's lore on a free page, the hovered spell's effect under it, and mana and Close ribbons. On a wide screen the world stands on the bottom edge and the spare height is sky (user: no empty ground under the field); a tall one centres it with a bar of faces and buttons below. Every sprite is generated at its final size; nothing is scaled or rotated. The comparison and tests are on https://claude.ai/artifact/MGj5H2bNeRrYkroBbt6dfg. The battle screen moved first; the map, its HUD, the cards and the menu followed (Nov 3); the town keeps the painted art below until its pass. Sources and tools are in `games/inkheroes/dev/pixel/`.

**The map in pixel art (user, Nov 3).** Same pixel size as the battle: a map tile is 48 art px, and the battle's figures stand on it 1:1 (monsters breathe their idle loop, the hero rides with his walk). One whole-number zoom for the map, its HUD, the cards and the menu (`src/scenes/pixelScreen.ts`): about 14 tiles on the screen's short side and never under one CSS pixel (2 on a 1512 × 751 Retina laptop or a phone, 3 on 4K); wheel or pinch steps it one either way, and the view scrolls by whole art pixels. The ground is composed once per map (`src/scenes/map/pixelGround.ts`): each terrain's top-down PixelLab swatch laid in irregular patches so nothing repeats on a grid, borders found by a vote of the neighbouring tiles (corners round off, as in H3) plus a wandering warp, a shade along the lower ground's edge, code-drawn water deepening from foam to blue with ripples, muddy banks, packed-earth roads along road tiles, a dithered fog. Cover (`mapCover.ts`): the battle's own trees and pines a few to a forest tile, mountain ranges in two- and three-tile pieces along each run, boulders, a stone bridge over each crossing. Sites are one PixelLab sprite each (`dev/pixel/map/build_map.py` → `src/art/pixel/map.ts`): the town is a Greek hill town with a temple, mines (gold, sawmill, ore pit, gem pond; mercury, sulfur and crystal borrow the gold mine until redrawn without a ground slab), piles, chest, campfire, mercenary camp, watchtower, windmill, stables, standing stone, shrine; owners fly a code-drawn pennant. PixelLab lesson: a building on "ground" comes out as an isometric block on a slab; "side view, isolated shape with a flat bottom edge and nothing behind it" avoids it. The HUD is the battle's kit: a purse bar with 16 px resource icons, the date, a status plate, the hero's panel (face, level, moves, mana; the army lives on the hero sheet and in towns) End day and Menu buttons (above the panel on a phone), and over those two a list of the player's towns, each with its picture from the map and its name; a tap opens that town. Cards are the battle's pixel card, with laurels (24 px) for a won map. A foe beside the hero is fought from where they stand, with no movement needed (`planPath`, user, Nov 4); in battle a unit beside a foe strikes from its own hex whichever side was aimed at (`strikeChoices`), and only a foe it must walk to offers a choice of sides. The town screen lists the player's towns above the strip, the open one framed in gold, whenever there are two or more; a tap goes straight there, and any Hall, Fort or Guild window hides it. The map's cursor says what a tap would do (`src/logic/mapIntent.ts`), and all of them point up and left (user, Nov 4): the battle's boot where the hero can ride, a steel longsword where the ride ends in a fight (a monster, the tiles it guards, a guarded site, a held town, the rival), a steel gauntlet over what can be taken or entered; the fog, walls and tiles with no way there keep the plain pointer. The ride is one steady pace, about seven tiles a second on any ground, with the gallop at 17 frames a second (`src/scenes/map/ride.ts`): a leg's spare time runs straight into the next tile, the view moves with the rider once past the middle of the screen, and the fog redraws only the part a step reveals, because a whole-map redraw froze the rider at every tile. Generated gallops surge back and forth inside their frames, so `walkLock` in `units.json` holds the body still. The menu composes the battle's grass scenery for the whole screen under a gold pixel wordmark (the font's letters blown up, shaded at the art's pixel), map cards with a PixelLab picture each, and the army mustered on the grass either side; on a narrow screen the maps still to come shrink to one line.

**Theme (Nov 3):** the Crown becomes a Greek faction, the first civilization of the "mythic civilizations" direction: historical troops at the low tiers, creatures of Greek myth above them. Rules, stats and internal ids stay the same; only names and art change.

The painted style (Oct 24, superseded): dark colours and serious drawings, like the original H3. We take its mood, never its art or names. The bar is still a pen line over a professional painting, never a doodle.

- **Light and value.** Warm late-afternoon light from the upper left. Everything is 30–45 % darker than a storybook. Shadows go umber or violet, not grey. Highlights are small and warm. Nothing is pure white.
- **Colour.** Deep old-master colours: olive and emerald greens, umber and ochre earth, ultramarine, oxblood, brass, warm grey stone, walnut wood. The palette is in `src/art/palette.ts`. No pastels, mint or candy colours.
- **Skies.** Ultramarine overhead, warming to amber at the horizon, with volumetric clouds. No outlined white puffs.
- **Line.** Iron-gall umber ink (`INK`), thin. Firmer only on the shadow side.
- **Figures.** People about 7 heads tall, with small stern faces. Steel is dark with sharp glints, and every figure has a warm rim light so it reads on a dark field. Beasts look anatomically real and menacing.
- **Interface.** Tooled leather panels in gilt frames (`src/art/uiArt*.ts`). Buttons are enamel in gilt rims: crimson for the main action, blue for the Crown's, leather for plain ones. Titles are set in Cinzel, body text in EB Garamond.

## The adventure map

- **Tiles:** square, 8-way movement. Diagonal steps cost ×√2 (rounded). A last step that costs more than what's left is still allowed if its straight cost fits (as H3).
- **Ground costs a tile:** grass and dirt 100, rough 125, sand and snow 150, swamp 175. Roads 50. Water, mountains, trees and rocks block.
- **Movement points a day** by the army's slowest unit (H3's table): speed ≤3 → 1500, 4 → 1560, 5 → 1630, 6 → 1700, 7 → 1760, 8 → 1830, 9 → 1900, 10 → 1960, 11+ → 2000. Logistics adds 10/20/30%.
- **Moving:** tap a tile to see the path (filled dots for today, hollow dots for later days), tap it again to go. Tap a monster or a site (anywhere on its picture) to walk next to it. As in H3, the hero never stands on or walks through an object: it stops beside one and picks it up, flags it or attacks it from there. Mines and other building-sized sites also block the tile behind them. A site in a monster's guard zone is fought for first and taken after the win.
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
| Spellbook altar | An altar on map 2: the Novice’s Spellbook and its first spell. Goes once taken |
| Windmill | 3–6 of a rare resource each week |
| Stables | +4 tiles of travel today (once a week) |
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

- **Field:** 15 columns × 11 rows of hexes (H3's playable area), rows staggered; the attacker's army lines up in the left column, the defender's in the right, on H3's loose-formation rows (VCMI's table: 1 stack row 5; 2: 2, 8; 3: 2, 5, 8; 4: 0, 4, 6, 10; 5: 0, 2, 5, 8, 10; 6: 0, 2, 4, 6, 8, 10; 7: 0, 2, 4, 5, 6, 8, 10). 3–7 obstacles (rocks, stumps) in columns 3–11, from the map tile's seed.
- **Turn order:** highest speed first; ties go to the attacker in round 1, then alternate. Each unit may move, attack, **wait** (act again at the end of the round, slowest first) or **defend** (+20% Defense, at least +1, until its next turn).
- **Walking** units go round others and obstacles; **flying** units reach any free hex within their speed.
- **Two-hex units** (Griffin, Centaur, Companion, Wolf, Boar, Hydra; `wide` in `creatures.ts`), as H3/VCMI's double-wide: the unit stands on its head hex and the hex behind it in the same row (the attacker faces right, so its tail is to the left; the defender's to the right). Facing never changes. They start one column in, tail on the edge column. Both hexes must be free and on the field at every step (walkers) or where they land (flyers); speed counts head steps, so a wide unit can't slip through a one-hex gap in a wall that runs along a row. Anyone may strike them from beside either hex, and either hex counts for "an enemy next to a shooter". A wide unit strikes from any spot where its head or its tail touches the target; with only the tail touching it turns round to strike and back after (animation only, VCMI's isToReverse). Shot range counts from the shooter's head to the target's nearest hex. Code: `src/logic/footprint.ts`.
- **Melee:** move next to the target and strike. The target **retaliates** once a round, after the first strike only.
- **Shooting:** shooters fire at any enemy unless an enemy stands next to them; −50% damage beyond 7 hexes; −50% in melee. Ranged hits aren't answered. Shots run out.
- **Damage:** base = (random between min and max) × count. If Attack > Defense: +5% a point, at most +300%. If Defense > Attack: −2.5% a point, at most −70%. Bonuses (Offense or Archery, luck's ×2) add; penalties (range, melee for shooters, Armorer, Shield) multiply. At least 1. Damage kills from the top creature down.
- **Morale:** each point gives a 1-in-24 chance of a second action straight after; each negative point a 2-in-24 chance of losing the turn. Undead have none. Mixing factions costs 1 (2+ factions) or 2 (3+).
- **Luck:** each point gives a 1-in-24 chance of double damage.
- **Spells:** the hero casts one spell a round, in place of nobody's turn (a button). Timed spells last Spell Power rounds (at least 1).
- **Ending:** one side has no units left. The winner gets XP = the sum of the HP of the enemy creatures killed. The losing hero's map is lost (chapter 1 has one hero), and the game offers that day again.
- **Neutral AI:** a shooter shoots the target it can hurt most; otherwise it attacks the reachable enemy with the best (damage dealt − damage taken back); otherwise it walks towards the nearest enemy. A hydra adds up the trade over every stack it would hit from that hex, so it looks for a hex touching more enemies; a basilisk counts the chance of stone in favour of a stack not yet stone. A stack of stone gives no answer, so it counts as a free blow.

## Spells

**Magic lore (user, Nov 3).** Every hero has two kinds of magic. *Common magic*: spells any hero can learn (Haste, Slow, Shield, Healing, Dispel and the like), keeping H3's tactical depth. *Divine powers*: abilities granted by a civilisation's gods, spirits or myths. Greece: **Olympian Favor**, the favor of Zeus (lightning attacks), Athena (formations and defense), Ares (rewards aggressive combat) or Poseidon. Later civilisations: Egypt, *Sacred Rites* (rituals that curse enemies, protect troops or raise the fallen; resurrection needs preparation or a scarce resource); the Norse kingdoms, *Rune Magic* (inscribed runes with lasting bonuses or triggered effects, some stronger as friendly units are wounded or killed); Imperial China, *Celestial Harmony* (elemental forces, barriers and positioning; combining elements adds effects). The spellbook has a ribbon tab per kind. Spell ids are the first names (saves keep them); the table gives the names shown.

**The book gate (user, Nov 4).** Magic isn't locked to a class; it's locked to the spellbook, a real item in its own gear slot. Without one worn a hero has no magic at all: no Spell button in battle, no mana on the map panel, no Spell Power, Knowledge, Mana or Spells on the sheet, and level-ups give only Attack or Defense and offer no magic skills. So map 1 teaches armies and towns with no magic: Rowan starts bookless, and the Mage Guild opens on map 2. There the first book waits on an altar in sight of the north road, nested round by 30 Stymphalian Birds, a stronger group than map 1's ogres. Winning it gives the Novice's Spellbook, Magic Arrow and full mana. Taking the book off takes the magic with it; the spells stay known. Planned with the mage hero: knights read Common Magic only, with little mana; mages start with a book and also read their faction's divine powers. Each map adds one new thing: map 1 armies and towns, map 2 magic, map 3 the rival and war machines.

**Hero archetypes (user, Nov 3).** Two broad kinds, as Might and Magic's: *military* heroes (strong Attack, Defense, leadership and army bonuses; basic spells, little mana) and *mystical* heroes (weaker army bonuses, better spellcasting and the advanced divine powers). Neither may be strictly better: a Spartan general with elite infantry must be able to beat an Egyptian priest with a magically enhanced army.

| Spell (id) | School | Level | Mana | Effect |
|---|---|---|---|---|
| Magic Arrow (magicArrow) | Common | 1 | 5 | 10 × SP + 10 damage to one enemy |
| Haste (haste) | Common | 1 | 6 | +3 speed |
| Slow (slow) | Common | 1 | 6 | −25% speed (an enemy) |
| Shield (stoneSkin) | Common | 1 | 5 | +3 Defense |
| Healing (cure) | Common | 1 | 6 | Heals 5 × SP + 10 and lifts bad spells |
| Dispel (dispel) | Common | 1 | 5 | Lifts every spell from a unit of either side |
| Wisdom of Athena (bless) | Olympian Favor, Athena | 1 | 5 | A friendly unit always deals its maximum damage |
| Fury of Ares (bloodlust) | Olympian Favor, Ares | 1 | 5 | +3 Attack (melee) |
| Thunderbolt of Zeus (lightningBolt) | Olympian Favor, Zeus | 2 | 10 | 25 × SP + 10 damage to one enemy |

## Factions

### The Olympian League (chapter 1)

Greek city-states under the old gods: hoplites and slingers at the bottom, the beasts of myth at the top. (Internal faction id `crown`; the internal unit ids in brackets are unchanged, so saves keep working.)

| Lvl | Unit (id) | Att | Def | Damage | HP | Speed | Growth | Cost | Notes |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Hoplite (spearman) | 4 | 5 | 1–3 | 10 | 4 | 14 | 60 | |
| 2 | Slinger (bowman) | 6 | 3 | 2–3 | 10 | 4 | 9 | 100 | Shoots, 12 shots |
| 3 | Griffin (griffin) | 8 | 8 | 3–6 | 25 | 6 | 7 | 200 | Flies, retaliates twice a round |
| 4 | Minotaur (swordsman) | 10 | 12 | 6–9 | 35 | 5 | 4 | 300 | |
| 5 | Centaur (monk) | 12 | 7 | 10–12 | 30 | 5 | 3 | 400 | Shoots, 12 shots |
| 6 | Companion (lancer) | 15 | 15 | 15–25 | 100 | 7 | 2 | 1000 | Charge: +5% damage a hex moved. Alexander-style heavy cavalry |
| 7 | Titan (seraph) | 20 | 20 | 50 | 200 | 12 | 1 | 3000 + 1 gem | Flies (strides over the field), +1 morale to the army |

Every unit comes in **three levels** (H3 has two): the base unit and two upgrades of it, the same creature better armed. Each dwelling upgrades twice; all three levels hire from the dwelling's one weekly stock, and the Fort hires the best level built. A stack already in the army upgrades in the town (in the Fort, from that unit's card) for the difference in cost; Upgrade all in the Fort does every company in the town at once (the hero's and the garrison's), the strongest first while the purse lasts.

| Line | Level 2 (id) | Att | Def | Damage | HP | Speed | Cost | Level 3 (id) | Att | Def | Damage | HP | Speed | Cost |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Phalangite (spearman2) | 6 | 6 | 2–3 | 12 | 5 | 80 | Spartan (spearman3) | 7 | 8 | 2–4 | 15 | 5 | 100, answers 2 strikes a round |
| 2 | Peltast (bowman2) | 6 | 4 | 2–4 | 10 | 6 | 130, 16 shots | Cretan Archer (bowman3) | 8 | 5 | 3–4 | 12 | 6 | 160, 20 shots |
| 3 | War Griffin (griffin2) | 9 | 9 | 3–6 | 25 | 9 | 240, answers 3 | Golden Griffin (griffin3) | 10 | 10 | 4–7 | 30 | 10 | 290, answers 4 |
| 4 | Minotaur Guard (swordsman2) | 12 | 13 | 6–10 | 40 | 6 | 360 | Minotaur Lord (swordsman3) | 14 | 14 | 7–11 | 45 | 6 | 430, strikes unanswered |
| 5 | Centaur Marksman (monk2) | 12 | 9 | 10–12 | 30 | 7 | 450, 16 shots | Centaur Sage (monk3) | 14 | 10 | 11–13 | 35 | 7 | 520, 20 shots, +1 morale |
| 6 | Royal Companion (lancer2) | 16 | 16 | 20–25 | 100 | 9 | 1200 | Cataphract (lancer3) | 18 | 18 | 22–28 | 120 | 10 | 1500 |
| 7 | Elder Titan (seraph2) | 22 | 22 | 50–55 | 240 | 14 | 3600 + 2 gems | Titan Lord (seraph3) | 26 | 24 | 55–60 | 280 | 16 | 4400 + 3 gems |

Upgrades keep the line's traits (shots, flight, two hexes, charge, the Titan's morale).

### Neutrals (chapter 1)

| Unit | Lvl | Att | Def | Damage | HP | Speed | Notes |
|---|---|---|---|---|---|---|---|
| Satyr (goblin) | 1 | 4 | 2 | 1–2 | 5 | 5 | |
| Spartoi (skeleton) | 1 | 5 | 4 | 1–3 | 6 | 4 | Undead (no morale): skeleton warriors grown from dragon's teeth |
| Wolf (wolf) | 2 | 6 | 3 | 2–4 | 10 | 7 | |
| Brigand (bandit) | 2 | 8 | 3 | 2–4 | 10 | 6 | Strikes unanswered (no retaliation) |
| Cyclops (ogre) | 4 | 13 | 7 | 6–12 | 40 | 4 | |
| Erymanthian Boar (boar) | 3 | 9 | 6 | 3–6 | 24 | 6 | Two hexes. Charges, as the Companion: +5% damage a hex moved. From map 2 |
| Stymphalian Bird (stymphalian) | 2 | 8 | 3 | 2–4 | 8 | 9 | Flies. **Swoop:** after a melee strike and any answer it flies back to the hex it started from, if it lived, isn't stone and the hex is free. From map 2 |
| Basilisk (basilisk) | 3 | 8 | 9 | 3–5 | 22 | 5 | **Petrify 25%:** a melee strike that lands, an answer included, may turn a living target to stone. From map 3 |
| Lernaean Hydra (hydra) | 5 | 13 | 10 | 8–12 | 60 | 5 | Two hexes. **Cleave:** its melee strike hits every enemy stack beside it. **Regen 10:** its top creature heals up to 10 HP as its turn starts. From map 3 |

Map 1 meets the first five; every map after it brings new neutrals that fight differently. Growth and cost (they have no dwelling yet; the numbers set their strength for the rival): Boar 6 a week, 180 gold; Bird 8, 120; Basilisk 6, 200; Hydra 3, 600.

- **Cleave:** the blows all land first, target first, then each stack struck that still can answers once, as its retaliations allow; the answers stop if they kill the hydra. Its own retaliation is one blow, at the striker alone.
- **Regen:** once a round (not again after a wait); never over full, never raises the dead; no regrowth on a turn lost to stone.
- **Stone:** a stack effect (`stone`) that lasts until the stack's next turn, which it loses. A stone stack doesn't answer strikes and doesn't swoop; a second stone is still one lost turn. Healing and Dispel lift it.

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
| City Hall | 5000 | Town Hall, Marketplace, Mage Guild 1 | 2000 gold a day |
| Capitol | 10000 | City Hall, Castle | 4000 gold a day |
| Fort | 5000, 20 wood, 20 ore | | Walls; needed for dwellings |
| Citadel | 2500, 5 ore | Fort | +50% growth |
| Castle | 5000, 10 wood, 10 ore | Citadel | +100% growth |
| Tavern | 500, 5 wood | | +1 morale when defending the town |
| Blacksmith | 1000, 5 wood | | Sells war machines (from map 3; nothing needs it) |
| Marketplace | 500, 5 wood | | Trade resources |
| Mage Guild 1 | 2000, 5 wood, 5 ore | | 3 level-1 spells, a spellbook for 500 |
| Mage Guild 2 | 1000, 5 wood, 5 ore, 4 each rare | Mage Guild 1 | 2 level-2 spells |
| Guardhouse (Hoplites) | 1000, 5 ore | Fort | |
| Archery Range (Slingers) | 1000, 5 wood, 5 ore | Guardhouse | |
| Griffin Tower | 1000, 5 ore | Barracks | |
| Barracks (Minotaurs) | 2000, 5 ore | Guardhouse | |
| Monastery (Centaurs) | 3000, 5 wood, 5 ore, 2 each rare | Mage Guild 1, Barracks | |
| Stables | 2000, 10 wood | Barracks | A hero who starts the day here travels 4 tiles further (8 by road) |
| Tiltyard (Companions) | 5000, 20 wood | Stables | |
| Seraph Spire (Titans) | 20000, 10 each rare | Monastery | |

**The campaign opens the town map by map** (`src/level/unlocks.ts`): each map can build what the maps before it opened, and adds more, and nothing open needs a building from a later map. The hall shows the rest greyed, as "Later map". The Blacksmith waits for map 3: war machines matter once battles get hard (the rival hero), and an early building that only unlocks another one teaches nothing.

**The town always suggests a building.** `BUILD_PLAN` (Town Hall, Barracks, Archery Range, Citadel, Griffin Tower, Mage Guild, then upgrades and the rest) picks the next step on every map, going through prerequisites and skipping what the map keeps closed. It waits for gold but passes over what the purse has no wood, ore or rare goods for. A plate at the top of the town shows it with a one-tap Build; in the hall it is the first card, framed in gold, with a primary Build button.

| Map | Opens |
|---|---|
| 1 Ashford | Village Hall, Town Hall, Fort, Citadel, Tavern, the Guardhouse, Archery Range, Griffin Tower and Barracks |
| 2 Thornwood | City Hall, Marketplace, both floors of the Mage Guild, Stables, Monastery, the first upgrades of lines 1–4 |
| 3 The Black Banner | Castle, Blacksmith (war machines), Tiltyard, Centaur Grove, the second upgrades of lines 1–4 |
| Later | Capitol, Seraph Spire, the rest of the upgrades of lines 5–7 |

**The upgrade tree.** Each dwelling upgrades twice. The first upgrade needs the dwelling (and any support named); the second needs the first and the Citadel (lines 1–4) or the Castle (lines 5–7).

| Line | Dwelling | Upgrade (needs) | Second upgrade (needs) |
|---|---|---|---|
| 1 Hoplites | Guardhouse | Phalanx Yard: 1000, 5 ore | Agoge: 2000, 5 ore (Citadel) |
| 2 Slingers | Archery Range | Peltast Camp: 1000, 5 wood | Cretan Range: 2000, 5 wood, 5 ore (Citadel) |
| 3 Griffins | Griffin Tower | Griffin Aerie: 1000, 5 ore | Golden Aerie: 3000, 5 ore, 2 crystal (Citadel) |
| 4 Minotaurs | Barracks | Labyrinth: 2000, 5 ore, 2 crystal | Great Labyrinth: 3000, 10 ore, 3 crystal (Citadel) |
| 5 Centaurs | Monastery | Centaur Grove: 2000, 5 wood, 2 each rare (Mage Guild 2nd floor) | Chiron's Cave: 4000, 5 wood, 3 each rare (Castle) |
| 6 Companions | Tiltyard | Royal Tiltyard: 4000, 10 wood | Cataphract Lists: 6000, 10 wood, 10 ore, 5 crystal (Castle) |
| 7 Titans | Seraph Spire | Elder Spire: 15000, 5 each rare (Mage Guild 2nd floor) | Olympus Gate: 25000, 10 each rare (Castle) |

In the townscape an upgraded dwelling stands in its own place in the city, replacing the one before it.

## Chapter 1: The Border March (free)

Three parts on the Crown's northern border, taught one idea at a time, played as **one land that grows** (user, Nov 4): winning a part opens the next around the hero, who rides straight on with everything won so far (hero, towns and their buildings, mines, purse, day, the land seen). The land is stitched in `src/level/borderMarch.ts` from the three lands (`chapter1.ts`, `thornwood.ts`, `blackBanner.ts`, each in its own tiles): Ashford at the top-left, Thornwood east of the old bridge (the north road runs on into it), the Black Banner south of Thornwood (a forest trail down into Eudora's vale, a road from the south road west of the river through a gap in the trees), open water in the corner between. Each part is the land cut from the top-left corner to what is open by then (32 × 24, 72 × 32, 72 × 68), so tiles keep their places; `src/logic/chapter.ts` `rideOn` adds the part's towns, objects, rival and the Crown's grant (2500 gold and 5 wood and ore for Thornwood; 3000 gold and a little of everything for the Black Banner). **A part must show where it opened (user, Nov 4):** the hero wins a part far from the way on, so a part can name an `opening`: the land along it is seen from the start, and once the part's card is read the view flies along it to the new town and home to the hero, with a caption; a tap cuts it short. Without that, riding on into the Black Banner changed nothing on screen. Par and the third blot count from the day the part began. Millbrook is gone: Ashford is the home town all chapter. In the Black Banner part Eudora opens its gates and is the player's from the start. The menu shows the chapter as one card (the part in play, a line per part with its laurels, Continue / Start the chapter / Start the chapter over). The map menu's "Start <part> again" goes back to the day the part began; a lost day kept from the defeat card comes back to its morning.

| # | Map | Size | Goal | New |
|---|---|---|---|---|
| 1 | **Ashford** | 32 × 24 | Beat the ogre warband holding the old bridge | Moving, fights, piles, mines, the town, building and hiring |
| 2 | **Thornwood** | 40 × 32 | Take the bandits' fort at Thornwood (a garrisoned neutral town) | Taking a town, two towns, a shrine, a windmill |
| 3 | **The Black Banner** | 48 × 36 | Take Korax, the rival lord's town | A rival AI hero with a town, racing for mines; war machines |

Map 1's hero is **Rowan**, a Knight: Attack 2, Defense 2, Spell Power 1, Knowledge 1, basic Leadership, no spellbook. Army: 18 Hoplites, 7 Slingers. Town Ashford: Village Hall, Fort, Tavern, Guardhouse; its Mage Guild, open from map 2, teaches Wisdom of Athena, Shield and Slow. Off on this map: City Hall, Capitol, Castle, Marketplace, both floors of the Mage Guild, Monastery, Stables, Tiltyard, Seraph Spire. Starting purse: 7500 gold, 15 wood, 15 ore, 3 of each rare. The ogres (8, growing 10% a week) hold the west end of the old bridge; the river can only be crossed there.

Part 2, **Thornwood** (its land 40 × 32, east of Ashford's): Rowan rides on from the old bridge (played fresh, with nothing won before it, he waits on the north road at the forest's edge with 40 Hoplites, 20 Slingers, 8 Griffins and 4 Minotaurs, 10000 gold, 20 wood, 20 ore, 5 of each rare). A river runs down the middle, crossed only by the north bridge (40 wolves) and the south bridge (60 spartoi). East of it is Thornwood forest: a cyclops-guarded gold mine, a crystal windmill, a shrine of Fury of Ares, a watchtower and brigand camps. **Thornwood** town (Village Hall, Town Hall, Fort, Tavern, Guardhouse, Barracks) is held by 48 Brigands, 8 Cyclopes and 18 Wolves. Boars and Stymphalian Birds, new on this map, are met from the first screens: west of the river birds at the wood pile and the gold pile, boars at the sawmill, on the road by the campfire and at the ore pit, with satyrs at the standing stone and spartoi at the stables; east of it boars at the windmill and the shrine, birds at the crystal and the forest chest. Taking it wins the map. The Citadel and the second upgrades of lines 1–4 are on; the Castle, Capitol, Tiltyard and Seraph Spire are off. Par 28 days.

Map 3, **The Black Banner** (48 × 36, the last free map, par 35 days): Rowan holds **Eudora** in the south-west (Village and Town Hall, Fort, Citadel, Tavern, Guardhouse, Archery Range, Barracks, Mage Guild; a garrison of 14 Hoplites and 6 Slingers); played fresh he starts there with 70 Hoplites, 36 Slingers, 18 Griffins and 9 Minotaurs, about what a rider brings. **Kassander**, the rival lord, rides out of **Korax** in the north-east with 24 Hoplites, 10 Slingers, 4 Griffins and a Ballista, plus what his head start hired. Korax holds 80 Hoplites, 50 Slingers, 30 Griffins and 12 Minotaurs. **Balance (Nov 4), set by a bot playing the whole chapter on the real rules, so it rests on an army actually earned:** the bot reaches this part around day 22 to 46 with 800 to 1500 in the field, about 2300 more in Ashford's garrison and far more gold than it can spend (recruits, not gold, limit an army). So neutrals run 155 to 620 in strength against map 2's east at 234 to 423, Eudora's vale lightest and the lakelands' prizes and the Black Banner's own lands heaviest, and Korax's garrison is 2.4 times Thornwood's. Over 24 bot games all were won, in 6 to 48 days, and the deciding fight cost 10 to 25% of the army, up to 85% when it came too early. The bot casts no spells, so a person should lose less. Two ridges split the map into Eudora's vale, the lakelands in the middle (the gold mine, the gem pond and the crystal cavern, guarded) and the Black Banner's rough hills; the western ridge's two passes are held by brigands and wolves. New on this map: a small Basilisk group at Eudora's ore pit, more at the sulfur and the alchemist's lab, and Hydras guarding the better prizes (the Thunderbolt shrine, the gems, the lake chest). **Winning takes both, in either order (user, Nov 4): Korax taken and Kassander beaten.** Losing a town is never the end of the map while another stands, Eudora included; only the last town falling loses it.

**The rival lord** (`src/logic/rival.ts`) plays after the night, by the same rules as the player. **His head start:** a rival who appears when a part opens has been at work too, so the first half of the days gone by are played at home in his town under the normal rules (paid, built, hired). He reaches about 850 at day 22 and 1560 at day 42: close behind a player whenever they arrive, instead of a fixed day-one army. All the days put him at double the player, half keeps the fight even. His town builds one building a day from his order and hires into his hero when he is home (or into its garrison, keeping 3000 gold for him). His hero rides for what is worth most for the days it takes: piles, chests and mines (ours above all), monsters under 40% of his strength, our town when its garrison (and our hero, if within 12 tiles) is under half his strength, our hero when he is 1.3× stronger, and home to hire (by what he could hire there) or to defend when our hero comes near and is strong. He fights monsters at once (an auto battle). When he attacks our hero, or a town of ours with only its garrison in it, the night's card says so and the player plays the battle. His moves show on tiles the player has seen. Beaten, he is gone for good; his town keeps its garrison. With no town left he is hunted: each night the land round him shows and the day's card says how far and which way he is from the hero, so the hunt can't turn into a search of the fog.

**War machines** (the Blacksmith, from map 3): a **Ballista** (1500 gold: 250 HP, Attack 10, 10–15 damage, 24 shots, shoots even with an enemy beside it) and a **First Aid Tent** (750 gold: 75 HP, heals the most wounded top creature of its side by 13–25 a round), one of each per hero. They stand at the back of their side, act by themselves, never answer a strike, and a side with only machines left has lost. A machine destroyed in battle is gone.

**Several towns.** A map can have more towns than the player's first. Each one is neutral until a hero beats its garrison at the gate (an empty one is just walked into); then it is the player's, with its own buildings, stock and garrison. It pays its income and fills its dwellings every week. The town screen shows the town the hero stands in, else the player's first.

### No laurels on screen

**Laurels are off (Nov 4).** They rewarded rushing and losing nothing, which works against a slow game of building up; they unlocked nothing; and a chapter is one run, so a part can't be replayed for a better score. The game still records them with each win (best laurels and days, for the account's progress and the win event), and the art is kept, so they can come back as something else.

### The chapter card

The menu shows **this game**: each part before the one in play says Won, the one in play says In play, the rest wait dim. What earlier games won doesn't count: after Start over the chapter reads from part 1 again. With no game in play it shows Won throughout only if the whole chapter was won. Continue is the one main button, Start the chapter over a plain one under it.

### Skill icons

Every skill has a 32 px icon, each its own object so none repeats an icon the game already uses (spells, stats, gear). The level-up card puts it at the left of each choice. The hero sheet lists icon, rank and name, and what the skill does, one to a row; under 680 px of screen height it goes two to a row with only the name and rank, since eight rows would not fit.

## The day card

The morning's card is an infographic, built from a report the night leaves on the prompt (older saves keep their text card): the totals with their icons; a bar per source of gold, each town by name, then gold mines and estates, measured against the biggest; the hero's face with the tiles to ride and a mana gauge; on the first day of a week, each town's fresh recruits as faces with counts, lowest level first so the columns line up, and that the wilds have grown; then the rival's news. On a short, wide screen it spreads into two columns.

## Controls

- **Map:** tap a tile to plan a path, tap it again to go. Drag to pan; wheel or pinch to zoom (one whole step either way). Space or End day ends the day. T opens the town; tapping the hero's face brings the view back to the hero.
- **Battle:** tap a lit hex to move; tap an enemy to attack it (the side of the enemy you tap is where your unit strikes from; on touch, a first tap shows the damage, a second strikes). W waits, D defends, C opens the spellbook.
- **Pause:** Esc or the ❚❚ button.

## Building status

Oct 24, 2026 (first session): the rules are built and tested (`games/inkheroes/src/logic/`, 36 tests): battles, heroes, the map, towns, saving. Map 1 (Ashford) plays end to end: map → battle → town → victory. Creature, hero and site drawings were made by parallel art passes. Maps 2–3, the rival AI and the website listing are next.

Oct 24 (second session): the town screen is a painted townscape like H3's (`src/art/townscape/`, contract in `types.ts`): the ground is painted once and each building stands in its slot once built (hall, walls and guild upgrade in place), lights up and names itself under the pointer, and opens its panel when tapped (the hall the Build ledger, the walls and dwellings Recruit, the guild its spells). The armies, purse and buttons sit in a strip below. The townscape is painted the first time a town opens. The menu has a painted vista, a title banner and a vignette on each map card (`src/art/menu/`). Preview the art with `dev/art.html` (`?town=start|all`, `?pieces=all`, `?menu=all`).

Oct 24 (third session): the town fills the screen (drag sideways when it's wider than the screen) and its messages show on an ink banner above the strip. Every creature and the hero are animated: each drawer takes a pose (`src/art/creatures/types.ts`: idle 6 frames, walk 6, attack 5 with the blow on frame 2), painted through a rig of joints so the art is unchanged. Boot paints each figure standing; a map paints its figures' idle loops and the hero's gallop, a battle its fighters' poses. `FigureAnim` (scenes/figureAnim.ts) plays them; `gait.ts` adds a light lean and dust on top, and lifts flyers along their arc. Melee blows and shots land on the attack's strike frame; arrows and orbs leave from the points the bowman and monk paintings export. Check the frames with `dev/specimens.html?poses&only=<id>`.

Oct 24 (fourth session): the whole game was repainted dark and serious after H3 (see Art direction). Figures are about 7 heads tall with stern faces, and the interface is leather and gilt in Cinzel and EB Garamond. The shared map ground lives in `src/art/terrainGround.ts` and `terrainBrush.ts`, with water, roads and peaks in their own files.

## Saving

The adventure is saved in localStorage after every action, and a copy is kept at the start of each day (so a lost battle can replay the day). Progress (maps won, blots) is saved and merged like the other games.

## Items, the hero sheet and several heroes (planned, user Nov 4)

Built in three stages: the hero sheet, then items, then several heroes. Stage 1's sheet opens from the hero panel on the map (as H3's hero screen): stats, skills, spells, experience and army. Companies are managed the same way on the sheet and in a town: drag one or tap it then a slot to move it (like units merge, others swap), and Split on a picked company opens a slider; the new company stays picked so a tap sends it on. Army portraits are a bigger 1:1 cut of the art, never scaled, sized to the screen (`src/scenes/hud/armySlots.ts`, `src/scenes/town/stripLayout.ts`), up to 60 px.

**Slots: 12, and a 20-item bag.** Armor is always part of a set: helm, cuirass, bracers, belt, greaves, boots. Never in a set: weapon, shield, amulet, two rings, spellbook. A piece's grade shows in the colour of its frame, and in words as Common, Uncommon, Rare, Epic and Legendary. Layout as a classic RPG's paper doll (body in the centre, slots round it, bag below).

| Quality | Share of drops | Each piece gives | Set bonus |
|---|---|---|---|
| Gray | 50% | +1 to one stat | None |
| Green | 30% | +1, plus a small perk | At 2, 4 and 6 pieces |
| Blue | 14% | +2 | At 2, 4 and 6 pieces |
| Purple | 6% | +3 | At 2, 4 and 6 pieces |
| Gold (legendary) | Hidden, never a drop | +3, plus a unique power | At 2, 4 and 6 pieces |

A set has one fixed colour, all six pieces share it: two sets a colour, Greek themes. Boots carry movement, belts the army (morale, troops).

**Where items come from.** About 1 monster group in 2 drops one (stronger groups better ones), and chests and the rival do too: about 35 items a chapter. Drops are fixed by the map's seed, so replaying a day can't reroll them. A drop leans to a piece missing from a set already started. Spare items sell at the Marketplace.

**Spellbooks (user, Nov 4).** Three grades so far, as the table's gray, green and blue: Novice's Spellbook (+1 Knowledge), the altar on map 2 or 500 gold at any Mage Guild; Oracle's Spellbook (+1 Knowledge, +1 Spell Power), left by the 50 birds at Thornwood's forest chest in the far east of map 2, the book the mage hero will want (user: the first book shouldn't be green); Alexandrian Codex (+2 Knowledge, +1 Spell Power), left by the hydras at the Thunderbolt shrine on map 3. A second book goes in the bag and is worn from the Gear tab. Purple and gold wait for later chapters. A hero saved when the book was only a flag has the Novice's Spellbook.

**Towns come one at a time (user, Nov 4).** Thornwood falls on map 2's last move, so a second town handed over on riding on made two new towns at once. Ridden on into, Eudora holds out as an ally until Rowan reaches it (the trail south takes days), then opens its gates with no fight and its garrison joins him; Kassander leaves it alone until then, as he does every neutral town. Played fresh, map 3 still starts in Eudora.

**The Mage Guild is a room (user, Nov 4; `src/scenes/town/guildRoom.ts`).** After Heroes III's: a painted library shown 1:1 and never scaled (768 × 340, cropped on smaller screens), each floor's spells as 64 px paintings with their names (`dev/pixel/ui/spells64/`; the battle's spellbook keeps its 24 px icons), the picked spell read out underneath with its level, mana, effect and whether the hero knows it, and on a stand the book the guild sells, the item itself in its grade's frame, always (user: the guild shows what it sells, never the hero's own book). Buy appears only when a hero without a book is in town. Small screens get smaller tiles only when they must (`guildLayout.ts`).

**Map 2's balance (user, Nov 4).** A chapter is one land, so map 2 is tuned to the army that rides in from map 1 (strength about 1,000: 116 units after three weeks' hiring), not only to a fresh start. Such an army loses about 0.4% a fight in the west and 3% in the east, about 35% over all 23 groups, then about 22% to Thornwood's garrison, so the goal is the real test. A weaker one has to keep building first. Five to fifteen percent a fight was tried and rejected: it needs groups up to 16 times the size, 166 satyrs, and would wipe an army out several times over. Map 3 still has its old numbers.

**Built so far (Nov 4): the gray Bronze set on map 1.** Rowan is a fighter, so map 1 holds one set, and fixed drops so every player meets it the same way: Goblins, Bronze Helm (+1 Defense); Pit wolves, War Sandals (+1 Attack); Graveyard, Bronze Bracers (+1 Attack); Glade wolves, War Belt (+1 Morale); Mill goblins, Bronze Greaves (+1 Defense); the ogres, Bronze Cuirass (+1 Defense), which rides on to map 2. A new piece goes on at once in an empty slot, else into the bag; a full bag leaves it behind. Planned next: the gray Leather set and weapons on map 2, and the gray Linen set with the second hero. Gear changes the four stats, morale, luck, sight and travel in `src/logic/items.ts`; a stack of travel starts the next morning. The sheet is two tabs on every screen (Hero, Gear), so the gear can be drawn at double size; only the smallest screens fall back to single size (`src/scenes/hud/gearLayout.ts`).

**Items last the chapter.** They carry from map to map within it. The next chapter is another faction with a fresh hero: items and progress don't carry over.

**Legendary (gold) items: not in the first run.** Hidden on the map, so finding one takes time and resources: a puzzle leads to the place (it can almost never be found by accident), an action there unlocks it, and a strong enemy has to be beaten for the piece.

**Several heroes** start on **map 2**: the land jumps from 32 × 24 to 72 × 32, home is 40 tiles behind and a hero rides about 15 a day, and the player has learned to run two before the rival on map 3. Two heroes who meet exchange items and troops.

**The rival is a player like any other.** It wears items, finds them, hires heroes, and a beaten rival drops one. Keep a side's state (heroes, purse, towns) the same for every side and every action a pure function of a side, so multiplayer can be added later. Nothing is built for multiplayer now.

## Not yet

The marketplace's trade, tactics, sieges with walls, random maps.
