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

**Nov 3, 2026: replaced by pixel art.** The user found the painted ink style didn't suit the game and chose PixelLab-generated pixel art, style B (painterly shading, selective outline, warm light from the left), at 32-bit density. Every screen is a locked native canvas shown only at whole-number zoom. The battle is 960×540 (×2 on 1080p and 1440p, ×4 on 4K) so H3's exact battlefield fits: 15 × 11 hexes of 44 × 52 px with 42 px rows, units at H3's size relative to a hex, two-hex units for the griffin, centaur, Companion and wolf (user, Nov 3). Battle backgrounds are composed at run time from separate parts (`src/scenes/battle/pixelScenery.ts`), never a fixed picture: a dithered sky gradient with cloud sprites, pale mountain ranges, hills and a tree line on the horizon, then ground patches cut from the terrain's ground painting, with tufts, stones and bushes on top (stones and bushes kept off the hex field and the heroes). Placement is hashed from the battle seed and each grid cell, so every battle looks different (the clouds are their own looping strip, 2040 px a loop, drifting right 3 native px a second behind the mountains, smoothly by fractions of a pixel through Phaser's smooth-pixel-art shader so the pixels stay square; user, Nov 3), any screen size is covered (whole-number zoom can show almost twice the world), and a resize only adds scenery at the edges. Parts per terrain: `dev/pixel/parts/<terrain>/scenery.json` → `dev/pixel/scenery.py` → one atlas + `src/art/pixel/scenery.ts` (user, Nov 3). All six terrains have parts; a terrain without them would fall back to a 1408×1056 quilted painting (`dev/pixel/quilt.py`). Fixed paintings were rejected because they ran out on wide screens and looked repetitive. Battle cursors as in Heroes 3 (`src/scenes/pixelCursors.ts`): boot to move, a sword in 8 directions pointing the way the blow comes in, arrow / broken arrow (past 7 hexes, half damage) to shoot, a question mark over a unit with nothing to do to it (click, or right-click any unit, for its stats card) and a wand over a spell's target (user, Nov 3). The battle's interface is pixel art on the same grid (user, Nov 3; `src/scenes/battle/battleHud.ts`): a UI camera at the world's whole zoom draws code-drawn bronze frames (`pixelFrames.ts`), the status line on a dark plate, the turn order as 32 × 32 faces cut 1:1 from each unit's idle frame (`face` in `units.json`; gold rim and arrow for the unit to act, blue ours, red-brown theirs, the right side mirrored, dimmed once waited), Wait / Defend under the left hero and Spell / Auto under the right one (32 px icons over their labels), rising damage numbers, and the cards. Text is Ark Pixel 12 proportional (OFL, cut to Latin, Greek and Cyrillic in `dev/pixel/ui/build_ui.py`), a real font so the battle can be translated, drawn at its design size and snapped to whole pixels; the user preferred the pixel font to smooth serifs and asked for a proper font file over a baked glyph sheet. The unit card is Heroes 3's creature window: name, the unit's idle animation in a scene of this battle's terrain with its count, stat rows with icons (base, then the battle's value in brackets), abilities and spells on it. In a town a level 2 or 3 unit's card has a Compare button (`unitCompare.ts`, `unitCompareView.ts`): one column per level of its line from level 1 to the unit tapped (figure, or just the face on a narrow screen; stats, growth, price with rare goods, abilities), every number that rose above the column to its left in green with an arrow, a new ability marked "new:", the tapped column framed in gold (user, Nov 9). The spellbook is an open book with a ribbon tab per school, six spells a page (icon, level numeral, name, mana), the school's lore on a free page, the hovered spell's effect under it, and mana and Close ribbons. On a wide screen the world stands on the bottom edge and the spare height is sky (user: no empty ground under the field); a tall one centres it with a bar of faces and buttons below. Every sprite is generated at its final size; nothing is scaled or rotated. The comparison and tests are on https://claude.ai/artifact/MGj5H2bNeRrYkroBbt6dfg. The battle screen moved first; the map, its HUD, the cards and the menu followed (Nov 3); the town keeps the painted art below until its pass. Sources and tools are in `games/inkheroes/dev/pixel/`.

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

### The Greek heroes (user, Nov 9)

The user: the rival hires more than one hero, so "we need to make different heroes with different skills, all of those should be Greek heroes, that you can later use when you play on a custom map outside of the campaign." So the Olympian League gets a **roster**, as each H3 town has its 16 heroes: data on its own (`src/logic/roster/greek.ts`, keyed by people so Egypt's comes next with Neferet and Paser), never tied to a campaign map. A campaign map still names its story heroes (Rowan, Ianthe, Kassander, Lykaon); a custom map later just says "Greek" and the Taverns hire from the roster.

**Ten heroes, six Knights and four Clerics** (military Knights, mystical Clerics, neither the better). Each has its own face and mounted figure, starting stats and skills, a starting army and a **specialty**:

| Hero | Class | Specialty | Starts with | Who |
|---|---|---|---|---|
| Rowan | Knight | Hoplites: the line 1 companies get +1 Attack and +1 Defense, and +1 more per 4 hero levels (all three levels) | Leadership | The League's captain (campaign hero) |
| Kassander | Knight | Minotaurs, as above for line 4 | Offense | The Black Banner's lord (rival, chapter 1 part 3) |
| Lykaon | Knight | Companions, as above for line 6 | Offense, Leadership | The wolf-king of Arcadia (rival, part 4) |
| Nyktimos | Knight | Griffins, as above for line 3 | Offense | Lykaon's eldest son |
| Atalanta | Knight | Slingers, as above for line 2 | Archery | The huntress of Arcadia, who outran every suitor |
| Peleus | Knight | Gold: +350 gold a day | Leadership, Logistics | King of Phthia, father of Achilles, rich in herds |
| Ianthe | Cleric | Cure: heals 50% more | Wisdom | Athena's priestess (campaign hero) |
| Auge | Cleric | Slow: its effect lasts 1 more round per 5 levels | Wisdom | Athena's priestess at Tegea |
| Kallisto | Cleric | Thunderbolt of Zeus: +5% damage per hero level | Wisdom | Lykaon's daughter, Artemis's huntress |
| Melampus | Cleric | Centaurs, as above for line 5 | Wisdom, Mysticism | The seer who understood the speech of animals |

(Skills named only if the game has them; an agent uses the nearest existing skill and lists what's missing.)

**Rules**
- A hero is in play at most once per game: hired by either side, they're gone from every Tavern.
- **Taverns offer a choice of two** from the roster of the town's people (H3), for both sides, on maps that don't name their own recruits list; a story hero (Rowan, a rival lord) is never offered while they're in play. From Othrys on, chapter 1's Taverns offer the roster (Ianthe stays the part-2 hire, as told).
- Lykaon's captains are hired from the same roster as ours (symmetric): no more `LORD_RECRUITS`.
- A specialty shows on the hero sheet and the Tavern card (one line, with an icon), and the unit card's stats show the bonus.
- Old saves: heroes already in play keep their stats; a hero id the roster doesn't know still loads.

**As built (Nov 9).** The roster is `src/logic/roster/greek.ts`, reached through `rosterOf(people)` (`src/logic/roster/index.ts`; Egypt's list is empty until Neferet and Paser join it). Every skill named exists (no stand-ins). Rowan's and Ianthe's numbers are their first part's (map 1 now spreads `ROWAN`), and Nyktimos keeps the old Lykaon captain's. Mainalos is now **Auge**, Athena's priestess at Tegea (her art came out a priestess), with his numbers; a save with `mainalos` loads her. Kassander and Lykaon are level-1 heroes in the roster (Offense, Offense + Leadership, small armies); their campaign selves in `blackBanner.ts` and `othrys.ts` are untouched. Clerics bring a Novice's Spellbook and their spell (Auge Slow, Kallisto Thunderbolt, Melampus Wisdom of Athena). **Specialties** (`src/logic/specialty.ts`, a `specialty` on `HeroDef` and `Hero`, else the roster's for the id): line = +1 Attack and Defense from level 1 and +1 more per 4 levels (1 + level / 4, rounded down) to the line's three levels, in `attackOf`/`defenseOf`, so the unit card's brackets show it; Healing ×1.5; Thunderbolt +5% a level, added to Sorcery; Slow +1 round per 5 levels; gold +350 a day for either side, on the day card as "Peleus's herds". The hero sheet and the Tavern card show it in one line, with a 24 px stand-in icon (the line's unit face, the spell's icon, the gold icon) until ART paints `pxui-specialty-<hero id>`. **Taverns:** a map with its own `recruits` (Thornwood, the Black Banner, Egypt's; map 1 now says `recruits: []`) hires from that list as before; Othrys has none, so each Tavern of ours shows two cards of its town's people's roster, ranked from the game's seed, the week and the town (a reload offers the same), with no hero in play on either side and none in two Taverns at once. A place hired from fills at once from the pool, so another can be hired the same day once the gate is free (the new hire stands in it). Up to 8 heroes of ours (garrisons too); at 8 the card says so. Lykaon hires from the same pool at the same price, up to `rival.heroes` (3): with nobody riding he takes a line specialist of his town's strongest line, else a runner (Peleus, a Knight with Logistics). On a campaign map the story's villains (every rival lord of the chapter's parts: Kassander, Lykaon) are never offered at our Taverns (`storyVillains`); they stay in the roster for custom maps, and a lord's Taverns may hire them. Hero art falls back by class until ART's lands (a Cleric to Ianthe's, Kassander to the rival's). **Balance re-run (8 seeds, villains barred, line bonus from level 1):** fresh 8 / 0 / 0 (won part day 32 to 67, was 8 / 0 / 0, 38 to 64); ridden on 7 of 8 won the Black Banner, then 4 / 0 / 3 (33 to 68, was 3 / 1 / 3); 12 of 15 won, 80%. Our bot now hires up to 3 roster heroes. Not retuned.

## Battles

- **Field:** 15 columns × 11 rows of hexes (H3's playable area), rows staggered; the attacker's army lines up in the left column, the defender's in the right, on H3's loose-formation rows (VCMI's table: 1 stack row 5; 2: 2, 8; 3: 2, 5, 8; 4: 0, 4, 6, 10; 5: 0, 2, 5, 8, 10; 6: 0, 2, 4, 6, 8, 10; 7: 0, 2, 4, 5, 6, 8, 10). 3–7 obstacles (rocks, stumps) in columns 3–11, from the map tile's seed.
- **Turn order:** highest speed first; ties go to the attacker in round 1, then alternate. Each unit may move, attack, **wait** (act again at the end of the round, slowest first) or **defend** (+20% Defense, at least +1, until its next turn).
- **Walking** units go round others and obstacles; **flying** units reach any free hex within their speed.
- **Two-hex units** (Griffin, Centaur, Companion, Wolf, Boar, Hydra; `wide` in `creatures.ts`), as H3/VCMI's double-wide: the unit stands on its head hex and the hex behind it in the same row (the attacker faces right, so its tail is to the left; the defender's to the right). Facing never changes. They start one column in, tail on the edge column. Both hexes must be free and on the field at every step (walkers) or where they land (flyers); speed counts head steps, so a wide unit can't slip through a one-hex gap in a wall that runs along a row. Anyone may strike them from beside either hex, and either hex counts for "an enemy next to a shooter". A wide unit strikes from any spot where its head or its tail touches the target; with only the tail touching it turns round to strike and back after (animation only, VCMI's isToReverse). Shot range counts from the shooter's head to the target's nearest hex. Code: `src/logic/footprint.ts`.
- **Melee:** move next to the target and strike. The target **retaliates** once a round, after the first strike only.
- **A move that ends beside an enemy (user, Nov 9)** doesn't end the player's turn: the unit may still strike an enemy beside it from where it stands, or Defend, or Wait (which ends the turn as the move would have). It adds no power: the charge counts the hexes walked, the strike is answered as usual, a swooper flies back to where it began, and a shooter there gets no shot. Only the player's moves do this (`hold` on the move, `BattleState.held`); the AI and Auto strike as part of the move as before, and Auto switched on mid-turn strikes or ends it. The status line reads "strike an enemy beside them, or Defend"; the spellbook and strikes at the gate wait. Tests: test/strikeAfterMove.test.ts.
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
- **Walls:** Fort → Citadel (+50% growth, a moat, a 2nd tower place) → Castle (+100% growth, stronger walls, a 3rd tower place). See Sieges.
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
| Fort | 5000, 20 wood, 20 ore | | Walls, a gate, a tower place; needed for dwellings |
| Citadel | 2500, 5 ore | Fort | +50% growth |
| Castle | 5000, 10 wood, 10 ore | Citadel | +100% growth |
| Tavern | 500, 5 wood | | +1 morale when defending the town |
| Blacksmith | 1000, 5 wood | | Sells war machines (from map 2; nothing needs it) |
| Storehouse | 1000, 5 wood | | Keeps 8 pieces of gear for any hero of ours; sells Saddlebags (from map 2) |
| Treasury | 2500, 5 wood, 5 ore | Storehouse | Keeps 20 pieces; sells a Pack Mule (from map 3) |
| Marketplace | 500, 5 wood | | Trade resources (see The Marketplace) |
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

**The campaign opens the town map by map** (`src/level/unlocks.ts`): each map can build what the maps before it opened, and adds more, and nothing open needs a building from a later map. The hall shows the rest greyed, as "Later map". The Blacksmith opens on map 2, ahead of Thornwood, the chapter's first siege: a Catapult earns its price there.

**The town always suggests a building.** `BUILD_PLAN` (Town Hall, Barracks, Archery Range, Citadel, Griffin Tower, Mage Guild, then upgrades and the rest) picks the next step on every map, going through prerequisites and skipping what the map keeps closed. It waits for gold but passes over what the purse has no wood, ore or rare goods for. A plate at the top of the town shows it with a one-tap Build; in the hall it is the first card, framed in gold, with a primary Build button.

| Map | Opens |
|---|---|
| 1 Ashford | Village Hall, Town Hall, Fort, Citadel, Tavern, the Guardhouse, Archery Range, Griffin Tower and Barracks |
| 2 Thornwood | City Hall, Marketplace, both floors of the Mage Guild, Blacksmith (war machines), Storehouse, Stables, Monastery, the first upgrades of lines 1–4 |
| 3 The Black Banner | Castle, Treasury, Tiltyard, Centaur Grove, the second upgrades of lines 1–4 |
| 4 Othrys | Capitol, Royal Tiltyard, Cataphract Lists, Chiron's Cave, Seraph Spire, Elder Spire, Olympus Gate: the rest of the tree |

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

### The Marketplace (Nov 9)

H3's resource market, by VCMI's numbers (`lib/mapObjects/IMarket.cpp`, `config/resources.json`). Each resource has a price (gold 1, wood and ore 250, the four rare 500). A side with `n` Marketplaces trades at (n + 1) / 20 of the worth, at most a half, so the rates get better up to nine: common for common 10, 7, 5, 4, 3, 3, 3, 2, 2 to one; one market sells a wood for 25 gold and a gem for 50, and buys a wood for 2500 gold. `src/logic/market.ts` is pure and the same for either side (`marketOffer`, `maxLots`, `trade`, `marketsOf`), so the lord's planner can call it. In town the Marketplace is a room (tap it in the townscape, or its card in the hall): the seven goods to give in a row, the seven to get under it, each showing its rate, the rate and the number of Marketplaces between, steps of 1 and 10 and Max for the lots, and Trade with what it gives and gets. It fits a 320 px phone (16 px icons) and doubles its icons where there is room.

## Chapter 1: The Border March (free)

Three parts on the Crown's northern border, taught one idea at a time, played as **one land that grows** (user, Nov 4): winning a part opens the next around the hero, who rides straight on with everything won so far (hero, towns and their buildings, mines, purse, day, the land seen). The land is stitched in `src/level/borderMarch.ts` from the three lands (`chapter1.ts`, `thornwood.ts`, `blackBanner.ts`, each in its own tiles): Ashford at the top-left, Thornwood east of the old bridge (the north road runs on into it), the Black Banner south of Thornwood (a forest trail down into Eudora's vale, a road from the south road west of the river through a gap in the trees), open water in the corner between. Each part is the land cut from the top-left corner to what is open by then (32 × 24, 72 × 32, 72 × 68), so tiles keep their places; `src/logic/chapter.ts` `rideOn` adds the part's towns, objects, rival and the Crown's grant (2500 gold and 5 wood and ore for Thornwood; 3000 gold and a little of everything for the Black Banner). **A part must show where it opened (user, Nov 4):** the hero wins a part far from the way on, so a part can name an `opening`: the land along it is seen from the start, and once the part's card is read the view flies along it and home to the hero, with a caption; a tap cuts it short. **It shows where the way starts, not where it leads (user, Nov 8):** the Black Banner's flight stops where the forest trail leaves the trees, and Eudora has to be found. Without that, riding on into the Black Banner changed nothing on screen. Par and the third blot count from the day the part began. Millbrook is gone: Ashford is the home town all chapter. In the Black Banner part Eudora waits, unseen, for whoever reaches it first (see the race below). The menu shows the chapter as one card (the part in play, a line per part with its laurels, Continue / Start the chapter / Start the chapter over). The map menu's "Start <part> again" goes back to the day the part began; a lost day kept from the defeat card comes back to its morning.

| # | Map | Size | Goal | New |
|---|---|---|---|---|
| 1 | **Ashford** | 32 × 24 | Beat the ogre warband holding the old bridge | Moving, fights, piles, mines, the town, building and hiring |
| 2 | **Thornwood** | 40 × 32 | Take the bandits' fort at Thornwood (a garrisoned neutral town) | Taking a town, two towns, a shrine, a windmill |
| 3 | **The Black Banner** | 48 × 36 | Take Korax, the rival lord's town | A rival AI hero with a town, racing for mines; war machines |

Map 1's hero is **Rowan**, a Knight: Attack 2, Defense 2, Spell Power 1, Knowledge 1, basic Leadership, no spellbook. Army: 18 Hoplites, 7 Slingers. Town Ashford: Village Hall, Tavern, Guardhouse, and no walls (user, Nov 8: towers should come later, so the Fort is built, after the troops and before the Citadel it opens; the Guardhouse no longer needs a Fort); its Mage Guild, open from map 2, teaches Wisdom of Athena, Shield and Slow. Off on this map: City Hall, Capitol, Castle, Marketplace, both floors of the Mage Guild, Monastery, Stables, Tiltyard, Seraph Spire. Starting purse: 7500 gold, 15 wood, 15 ore, 3 of each rare. The ogres (8, growing 10% a week) hold the west end of the old bridge; the river can only be crossed there.

Part 2, **Thornwood** (its land 40 × 32, east of Ashford's): Rowan rides on from the old bridge (played fresh, with nothing won before it, he waits on the north road at the forest's edge with 40 Hoplites, 20 Slingers, 8 Griffins and 4 Minotaurs, 10000 gold, 20 wood, 20 ore, 5 of each rare). A river runs down the middle, crossed only by the north bridge (40 wolves) and the south bridge (60 spartoi). East of it is Thornwood forest: a cyclops-guarded gold mine, a crystal windmill, a shrine of Fury of Ares, a watchtower and brigand camps. **Thornwood** town (Village Hall, Town Hall, Fort, Tavern, Guardhouse, Barracks) is held by 28 Brigands, 5 Cyclopes, 8 Wolves and 18 Slingers (who take its tower). Boars and Stymphalian Birds, new on this map, are met from the first screens: west of the river birds at the wood pile and the gold pile, boars at the sawmill, on the road by the campfire and at the ore pit, with satyrs at the standing stone and spartoi at the stables; east of it boars at the windmill and the shrine, birds at the crystal and the forest chest. Taking it wins the map. The Citadel and the second upgrades of lines 1–4 are on; the Castle, Capitol, Tiltyard and Seraph Spire are off. Par 28 days.

Map 3, **The Black Banner** (48 × 36, the last free map, par 35 days): Rowan holds **Eudora** in the south-west (Village and Town Hall, Fort, Citadel, Tavern, Guardhouse, Archery Range, Barracks, Mage Guild; a garrison of 14 Hoplites and 6 Slingers); played fresh he starts there with 70 Hoplites, 36 Slingers, 18 Griffins and 9 Minotaurs, about what a rider brings. **Kassander**, the rival lord, rides out of **Korax** in the north-east with 24 Hoplites, 10 Slingers, 4 Griffins and a Catapult, plus what his head start hired. Korax holds 80 Hoplites, 50 Slingers, 30 Griffins and 12 Minotaurs. **Balance (Nov 4), set by a bot playing the whole chapter on the real rules, so it rests on an army actually earned:** the bot reaches this part around day 22 to 46 with 800 to 1500 in the field, about 2300 more in Ashford's garrison and far more gold than it can spend (recruits, not gold, limit an army). So neutrals run 155 to 620 in strength against map 2's east at 234 to 423, Eudora's vale lightest and the lakelands' prizes and the Black Banner's own lands heaviest, and Korax's garrison is 2.4 times Thornwood's. Over 24 bot games all were won, in 6 to 48 days, and the deciding fight cost 10 to 25% of the army, up to 85% when it came too early. The bot casts no spells, so a person should lose less. Two ridges split the map into Eudora's vale, the lakelands in the middle (the gold mine, the gem pond and the crystal cavern, guarded) and the Black Banner's rough hills; the western ridge has two passes: wolves hold the south one, and the Black Banner's riders cleared the north one, so it is Kassander's road into Eudora's vale, up the forest trail and on to Thornwood and Ashford. New on this map: a small Basilisk group at Eudora's ore pit, more at the sulfur and the alchemist's lab, and Hydras guarding the better prizes (the Thunderbolt shrine, the gems, the lake chest). **Winning takes both, in either order (user, Nov 4): Korax taken and Kassander beaten.** Losing a town is never the end of the map while another stands, Eudora included; only the last town falling loses it.

**Map 3 made harder (user, Nov 8).** The user found the part handed over two towns too easily and Kassander too easy to kill. A probe on the real rules showed why: he opened at 0.7 to 1.2 times Rowan's field army, never attacked (he needs 1.3 times), spent every coin on buildings, Korax's garrison never grew, and Eudora was given away and shown on the opening flight. Now:
- **The race for Eudora.** Ridden on into, Eudora's place isn't shown. From the part's third night Kassander rides for it (through the north pass), and if he gets there first it flies his banner, with its Citadel walls, and has to be stormed. Ridden straight down the trail, Rowan reaches it on the part's third day; three days lost on the way and Kassander has it (`RACE` in rival.ts). The opening's brief and story say both.
- **A head start of three quarters of the days gone by** (was half): about 1140 at day 20, 1560 at day 28 and 2000 at day 36, roughly 1.35 times the army a rider brings, so he hunts Rowan's weaker hero and raids north up the trail.
- **He leaves a lost battle (H3's retreat)** while he has a town to ride to: once his army is down to 60% and the enemy's is twice what he has left, he flees, gives up his army, and is back in his nearest town with no moves left, where he hires again (with no army he stays home). He fights to the end defending his own town, and with no town left he can't run: then the hunt. The battle shows him fleeing and the victory card says so; his fights with monsters work the same way.

**The rival lord** (`src/logic/rival.ts`) plays after the night, by the same rules as the player. **His head start:** a rival who appears when a part opens has been at work too, so the first half of the days gone by are played at home in his town under the normal rules (paid, built, hired). He reaches about 850 at day 22 and 1560 at day 42: close behind a player whenever they arrive, instead of a fixed day-one army. All the days put him at double the player, half keeps the fight even. His head start is three quarters of those days since Nov 8 (see "Map 3 made harder"). His town builds one building a day from his order and hires into his hero when he is home (or into its garrison, keeping 3000 gold for him). His hero rides for what is worth most for the days it takes: piles, chests and mines (ours above all), monsters under 40% of his strength, our town when its garrison (and our hero, if within 12 tiles) is under half his strength, our hero when he is 1.3× stronger, and home to hire (by what he could hire there) or to defend when our hero comes near and is strong. He fights monsters at once (an auto battle). When he attacks our hero, or a town of ours with only its garrison in it, the night's card says so and the player plays the battle. His moves show on tiles the player has seen. Beaten, he is gone for good; his town keeps its garrison. With no town left he is hunted: each night the land round him shows and the day's card says how far and which way he is from the hero, so the hunt can't turn into a search of the fog.

**War machines are gear (user, Nov 5).** A war machine is how a faction deals with walls, and each faction has its own: one War Machine slot on the Gear tab, same rules, a different machine and way of working per faction. (Egypt's might be a ramp its workers build up to the wall.) A machine has a grade like any item, comes to a siege only, works by itself and can't be hit, so it's never lost. The Greeks' is the **Catapult** (Common, 1500 gold: 1 stone a round), the **Bronze Catapult** (Uncommon, 3000 gold: 1 stone, misses 5%, double blow 60%) and the **Syracusan Catapult** (Rare, a prize: 2 stones of the same, left by the hydras at the lake chest on map 3). The Blacksmith sells the first two, one grade a map (user, Nov 8; `MACHINE_UNLOCKS` in `src/level/unlocks.ts`): the Catapult from map 2, for Thornwood's walls, and the Bronze Catapult from map 3, for Korax's. A finer one replaces a lesser, which goes to the bag. The Ballista and First Aid Tent are cut (user, Nov 5): neither did anything about walls and both did little; a save that had one gets its price back in gold.

**Sieges (user, Nov 4).** A town with a Fort is fought behind its walls, in the rules of `src/logic/siege.ts`, on H3's design and VCMI's numbers, with our own wall line for our hex grid. The attacker always has the left and the walls stand on the right, so when the player holds a town they play from the right (`Siege.me`). A town with no Fort is fought in the open.

| Town has | Walls | Also |
|---|---|---|
| Fort | a wall of 2 blows a stretch, a gate of 2 | 1 tower place, the keep |
| Citadel | as the Fort | a moat, a 2nd tower place |
| Castle | 3 blows a stretch | a 3rd tower place |

- **The wall** runs top to bottom in a curve with the gate at its point. Four stretches and the gate can be brought down; the rest can't. Walkers can't pass until one falls; flyers cross. The defender's gate opens for them alone.
- **The Catapult** comes with a hero who owns one. It acts first in the round, by itself, and can't be hit (our rule: in H3 it can be destroyed). Each stone picks a part by VCMI's weights (each wall 50, gate 25, outer tower 10, keep 5), and at Common does nothing 10% of the time, a blow 60%, two blows 30%.
- **With no war machine** an attacker can still storm (user, Nov 5): any company can strike the gate or a tower by hand, 5 strikes to a catapult's blow, so 10 for a whole gate or tower. That's the way in, and the way to reach a company on a tower, slowly and under fire. Only the gate and towers: the walls need a machine.
- **The moat** is the hex before the wall on each row: a walker's move ends on the first it enters and costs the stack 70 HP. The bridge lies down for the defender, and for everyone once the gate falls.
- **Towers are placed by the player, not bought (user, Nov 4).** H3 gives every town the same fixed archers; here the Fort, Citadel and Castle open tower places, and any one-hex shooter can stand on one. Centaurs (two hexes) can't. The tab above the strip in town holds them, by tap or drag, and upgrades reach them too; it shows only once the town has a Fort, headed by a tower icon in the crest's column so its places stand over the army rows' columns (user, Nov 8). A company up there can't be struck, shoots at will with an enemy beside it, has shots that never run out, and takes half damage from shots. When its tower comes down it lands on the ground beside it and fights on. It still holds the field; survivors go back up.
- **Who mans a town nobody places for:** neutral and rival towns send their strongest one-hex shooters up as a battle starts. A garrison of only shooters keeps one company on the ground.
- **Shots over the wall** from outside do half damage while a standing part lies in the line.
- **The garrison's AI** on foot stays behind the walls and never opens its gate to march out; it strikes what comes within them. Flyers go out. Attackers walk the way round the walls; with a Catapult they wait on the near bank while none is open, and without one they make for the gate, then any tower still manned.

**The castle on the field (user, Nov 5).** A real 3D model, built stone by stone in modular parts with whole, cracked and broken states, rendered in the field's own projection and painted by PixelLab: the process, for this and every later faction's castle, is in [inkheroes-castles.md](inkheroes-castles.md). The user rejected two code-drawn castles and two painted 2D layouts before this. The hexes and rules did not change. The gate stands side-on in the line of the wall, as a gatehouse of two square turrets, so its door faces the attacker and can't be seen from the camera; the bridge lowers across the moat when a defender walks through, stays down while anyone stands there, and stays down once the gate falls (user, Nov 5). Battlements face away from the court. The south arm runs a row past the last hex and the south tower stands at its end, its foot allowed off the screen. The keep stands behind the last column, level with the gate, so it hides no one; its steps cover the hex it holds, and the defending hero stands below it (user, Nov 5). A see-through wall along the bottom closes the castle, with figures in the last row showing through it. Walls run into the towers' bodies; the two stretches beside the gate (`wallGateNorth`, `wallGateSouth`) are round towers that crack and fall as a wall does; a breach opens on paving; a tower a town's level gives no place for still stands, unmanned. The town's buildings were tried behind the back wall and floated (user), so it's sky there.

**The hero's sheet in town (user, Nov 8).** Tapping the hero's face twice in the town strip opens the hero's sheet with its Hero and Gear tabs, as on the map.

**The town's buttons (user, Nov 5).** Hall, Fort, then the Guild and the Blacksmith ("Smith") only once built, then Leave (`townButtons` in `src/scenes/town/stripLayout.ts`). Beside the armies they sit in two rows with no hole: the last takes what is left of its row, and five need a third column, which on a screen 663 to 722 wide stacks the strip. Under 173 px of town above the strip, a Guild or Blacksmith room covers the strip instead of hiding its Buy behind it. The Tavern ("Tavern", a wine-cup icon) joins them once built on a map whose Taverns hire heroes (`MapDef.recruits`; map 1 shows no change); with all six, the stacked strip narrows its buttons so the row fits a 320 px phone.

**The Blacksmith's room (user, Nov 5).** A room like the guild's (`src/scenes/town/smithRoom.ts`, both on `townRoom.ts`): the forge painted behind, each machine for sale on a tile with its name and price, the picked one read out below (grade, what it does, what buying it means), and a stand with what the hero brings now and Buy. A hero away from the town sees the wares and can't buy.

**The lesson (user, Nov 5).** Thornwood on map 2 is the chapter's first siege, so the Blacksmith opens on map 2, the build plan moves it up, and the game says it five ways: the part's intro (since Nov 8 the chapter's Thornwood opening is narrated and its brief is short: see "Narration"); a card on riding at any walled town with no machine, saying what walls do, where to buy one and what going without costs, with Not yet and Storm it now; the Blacksmith's own room; the empty War Machine slot on the Gear tab; and in battle, the status line saying to strike the gate by hand.

**Music (user, Nov 5).** Three looping tracks from ElevenLabs Music, no vocals: **map** (chill, also the menu), **townGreek** (lyre and aulos, for the Greek faction's towns; each later faction gets its own) and **battle**. `dev/music/make_loops.py` takes `dev/music/raw/<id>.mp3`, finds where a take best meets its own start by comparing its sound frame by frame, blends the join and writes `src/audio/music/` and `src/audio/tracks.ts`. Each file has half a second of the loop on either side, so what an MP3 encoder adds never reaches the loop points, and `MusicPlayer` loops the decoded track on Web Audio, gap-free, fading 1.2 seconds between tracks and keeping two decoded.

**Sound switches (user, Nov 5).** Music and effects switch off apart, on one Sound card: Menu → Sound on the map, and a small Sound button on the campaign menu, in town and in battle. A switch brings the card straight back so all can be set in one go, and the choice is remembered. A third switch, **Narration** (Nov 8), turns the narrator off (see "Narration"); Music off doesn't turn it off. Music that's off isn't downloaded at all until it's switched on. A player who had muted the old single switch comes back with both off.

**Balance (Nov 5).** A simulation of bot against bot, 20 seeds each, with no spells. Thornwood's first siege needed shooters on its tower, or a slow gate cost nothing, so its garrison is now 16 + 12 Brigands, 5 Cyclopes, 8 Wolves and 18 Slingers. Korax stays at 66 Hoplites, 42 Slingers, 25 Griffins and 10 Minotaurs. Share of army strength lost:

| | No machine | Catapult | Bronze | Syracusan |
|---|---|---|---|---|
| Thornwood | 35% | 28% | 26% | 20% |
| Korax | 36% | 30% | 28% | 22% |

A person, who casts spells, should lose less.

**Several towns.** A map can have more towns than the player's first. Each one is neutral until a hero beats its garrison at the gate (an empty one is just walked into); then it is the player's, with its own buildings, stock and garrison. It pays its income and fills its dwellings every week. The town screen shows the town the hero stands in, else the player's first.

**Storming a town: the gate, then the walls (user, Nov 9).** A town has two places for heroes, its gate (a hero leading their own army) and its garrison (a hero whose companies stand in the garrison row; `townHeroes`, `townGuards`). Anyone storming a town, either side, the player or the rival (Kassander's rules, the lord mind, the AI's auto battles), first fights the hero at the gate, **in the open**: a field battle with no walls, towers, tower units or moat (battle id `gate:<town>`). Losing or fleeing there, the attacker leaves the town as it was. Winning (or with nobody at the gate), he then fights **the garrison behind the walls** as a siege (walls, towers and their units, his war machine), with only what lived through the first battle; the hero in the garrison, if any, commands it (stats, spells, skills; their experience after, and they fall with the town). The town falls only when that second battle is won, or at once if the garrison and towers are empty and no hero stands in it. A beaten gate hero is beaten as anywhere else (the rival's may retreat as before). A night storm with a hero of ours at the gate is two fights the player plays one after the other, with a card between ("Kassander broke through at the gate: now the walls"); the waiting second fight is `rivalFight` (`defend:<town>` for ours, the town's id for his), saved, and an old save's pending `defend:` or `rival` fight with a hero of ours at that gate loads as the gate fight. Both AIs value a town by both battles together (its garrison, towers and the heroes at or near it), and Kassander no longer rides at a hero of ours standing in a town as a lone hero (`test/townAssault.test.ts`).

### Part 4: Othrys, the Titans' mountain (designed Nov 9; user: "let player explore and play more freely in map 4, a real enemy with smarter behavior, finish the first city")

**Why a fourth part.** After the Black Banner the Greek town still had 7 of its 36 buildings closed (Capitol, Royal Tiltyard, Cataphract Lists, Chiron's Cave, Seraph Spire, Elder Spire, Olympus Gate) and 6 of its 21 units out of reach (Royal Companion, Cataphract, Centaur Sage, and the whole Titan line), while the hall promised them "on a later map". No later chapter plays the Greeks, so chapter 1 finishes the city itself. **Rule from now on: a chapter's last part opens the rest of its people's tree**, so every chapter ends with its whole city built (Egypt's Benben Stone and the rest of its lines 5–7 then need a part 7 of their own: noted, not built now).

**Part numbers:** chapter 1 is parts 1–4 (free). Chapter 2 first ran on as parts 5–7; since Nov 9 (user) each chapter counts its own parts, so it reads "Part 1 of 4: Nekhen". Saves and recorded wins are keyed by map ids, never by numbers, so they keep working; anything that counts from `TWO_LANDS_FIRST` moves to 5. The Black Banner stops being the chapter's end: its win tells a part's end (`blackBanner-won`, new line) and rides on; the chapter's ending and "Chapter 1 complete" move to Othrys's win.

**Story.** Kassander served a master. **Lykaon**, the wolf-king of Arcadia, who in the old tales served a feast to Zeus to test him and was cursed for it, has woken the old faith of the Titans. From **Lykosoura**, the oldest city of Arcadia, he rides for **Mount Othrys**, the Titans' seat in the war before the gods, where the Titans' forge still burns. Whoever holds the forge has the Titans' oath. The League sends Rowan south.

**Win:** `overthrow`, every town of Lykaon's taken (Lykosoura and Tegea, and any he took) **and** Lykaon himself beaten (coordinator, Nov 9). His hired captains then leave the field, with a card. Beaten while he still holds a town, Lykaon is back there the next week, hiring again (H3's way), so taking his towns matters. Losing is as before: the last town of ours falls, or every hero of ours is beaten with no town to hire another.

**Opens** (`UNLOCKS[3]`): the whole rest of the tree: Capitol, Royal Tiltyard, Cataphract Lists, Chiron's Cave, Seraph Spire, Elder Spire, Olympus Gate. After this part nothing in the Greek hall says "Later map". The Blacksmith adds nothing new (the Syracusan Catapult stays a prize). The Seraph Spire is the part's clock: Lykaon builds toward it too.

**Finishing the line-3 units.** Every level-3 unit gets one trait of its own, so the third level is a new thing, not only bigger numbers:
- **Cretan Archer:** no distance penalty (full damage at any range; walls still halve).
- **Cataphract:** armoured, shots deal it half damage (on top of the line's charge).
- **Titan Lord:** strikes every enemy beside it (a sweep, as the Hydra's), still flies, still +1 morale.
- (Spartan, Golden Griffin, Minotaur Lord and Centaur Sage keep theirs.) Each trait shows on the unit card like the others.

### The land: free to explore (user: "play more freely")

The biggest part so far, about **56 × 68** joined to the **east** of the chapter's land (the world grows from 72 × 68 to about 128 × 68), so tiles of parts 1–3 keep their places. It is not a corridor: there is **no single way in** and no forced order.
- **Three ways in**, all shown by the `opening` only at their first tiles: east from Korax over a ford, east from Thornwood along a coast road, and a mountain pass from the Black Banner's south-east. Each is guarded differently (a fight, a longer road, a pass with a strong guard), so the player chooses.
- **Regions**, each reachable from at least two sides: the **Thessalian plain** (open grass, farms, mines, the neutral town **Pherai**), the **coast** with the neutral port town **Iolkos** (Jason's harbour), the **Arcadian highlands** (Lykaon's land: Lykosoura and his mines, forests of wolves), and **Mount Othrys** in the middle, high rough ground ringed by mountains with two ways up.
- **Two neutral towns** (Pherai, Iolkos), taken in any order or not at all; Lykaon races for them too (`race`, from the part's 3rd night, but he chooses which, see his mind). Each comes with a Fort, a hall and two dwellings so taking it matters.
- **Things worth a detour** (H3's), new kinds of site:
  - **Learning stone** (`learningStone`): +1000 experience, once per hero.
  - **Outer dwelling** (`dwelling`): a cave or eyrie on the map. Beat its guard once, then it flies your flag and fills every week with its creature (e.g. a Cyclops cave, 3 a week; a griffin cliff, 6 a week) to hire there for their price; the rival flags and hires them too. Lykaon takes them back like mines.
  - **Treasure keep** (`bank`): a ruin with a strong guard and a big prize (gold, rares, a piece of gear): a monster group plus a chest behind it, made from existing pieces if the engine allows.
- **The forge on Othrys's summit**, guarded by **Gigantes** (new neutral **Gigas**, level 7, two hexes, Att 19, Def 16, 30–40 damage, 220 HP, speed 6, throws boulders: a shooter with 4 shots, no melee penalty; growth 1, cost 3500): whoever beats them first holds the forge (an outer dwelling of **Titans**, 1 a week, hired for the Titans' price, so its owner gets Titans before the Seraph Spire), and its gold-quality piece of gear (the chapter's first gold legendary: a fixed prize, no puzzle). Lykaon goes for it once he thinks he can win it; taking it from him is a reason to ride up.
- Neutrals across the land at the Black Banner's top end and above, heaviest round Othrys and Lykosoura; new on this map with the Gigas: none else needed (wolves, cyclopes, hydras, basilisks, stymphalian birds come back). Mines of every kind, piles, chests, campfires, a watchtower, a mercenary camp, stables, a shrine of Thunderbolt of Zeus, standing stones, two learning stones.
- **Par about 45 days** (hidden, as all laurels).

### Lykaon: a real enemy (user: "real enemy with smarter behavior")

Kassander and Sethi are one hero who picks the best thing within reach by value over days, with a head start played at home. Lykaon is a **lord**: he plays the part as a player would, under the same rules and with the same knowledge limits, and the code that drives him can drive either side, so a whole part can be played AI against AI. It's switched on per map (`rival.mind: 'lord'`), so the Black Banner and the Red Land keep their tuned rules until the lord is tried there.

**Fair start:** no head start played in secret. When the part opens he already holds **Lykosoura** (Village and Town Hall, Fort, Citadel, Tavern, Marketplace, Mage Guild 1, Blacksmith, dwellings of lines 1–5 and the first upgrades of 1–4) and **Tegea** (a smaller second town: Village Hall, Fort, Guardhouse, Archery Range), a hero with an army about the size of what a rider brings, and a purse. All numbers come from the balance runs below, never guesses.

**What makes him smarter, each a rule the code checks:**
1. **He knows only what he has seen.** His own fog: his heroes' and towns' sight, and watchtowers he visits. Unseen land is worth exploring, and early days go to scouting toward the neutral towns, mines and Othrys. He remembers what he saw (the last strength he saw of a hero of ours, and where).
2. **Several heroes with jobs.** He hires a second hero at his Tavern by about day 3 and a third once his income allows (the same price and the same pool rules as ours, Greek classes). The **main** hero carries the army; a **runner** flags mines and outer dwellings, gathers piles and carries new recruits from his towns to the main (heroes meet and hand over troops, as ours do). A runner flees from anything stronger.
3. **He builds to a plan, not a list.** Income first (the next hall when it pays back in under ~10 days), growth (Citadel, Castle), the next dwelling up, then upgrades, and he **saves** for a big goal (the Seraph Spire, the Capitol) instead of spending every coin on small things. Same `BUILD_PLAN` logic as the player's suggested build where it fits, so the sides stay symmetric.
4. **He upgrades and hires like a player:** hires the best level built, upgrades stacks in his towns for the difference, buys the best war machine the Blacksmith sells and a spellbook, learns his guild's spells.
5. **He fights with magic.** In any battle where an AI side has a hero with a spellbook and mana, it casts once a round when a spell beats its best other move: Thunderbolt on the stack worth most to kill, Slow on the fastest enemy, Bless, Shield or Haste on his strongest stack, Cure when his stacks are hurt. The same AI plays the player's Auto button. This is in `battleAi`, for every AI side.
6. **He picks his moment.** He attacks where we are weak, not just what is nearest: a town of ours with a thin garrison while our main hero is far (judged by what he has seen and how long ago), a lone second hero, our mines and outer dwellings. He leaves our main hero alone unless he is clearly stronger (as now, about 1.3 times), and **keeps out of its reach** when it is stronger (never ends a day within its day's ride; falls back on a town and gathers).
7. **He defends.** When a hero of ours stronger than a town's garrison comes within two days of it, he brings his main hero home or hires into the garrison; he never leaves Lykosoura empty while we are near.
8. **He retreats from a lost battle** (Kassander's rule) and comes back stronger; with no town left, scouts find him each night (as now).
9. **He races for the neutral towns and Othrys** when he thinks he can win the fight, choosing the one worth most for its distance, not a fixed one.
10. **He tells.** The night's card says what we saw: "Lykaon's riders took the ore pit at Pherai", "A second banner rides out of Tegea", "Lykaon raises the Seraph Spire". Only what our sight saw, plus news of buildings (scouts' word).

### Balance (on the real rules, never guessed numbers)

The lord AI plays the **player's** side too (from what the bot earns riding on through parts 1–3, and from a fresh start), so balance is AI against AI on the real map, many seeds:
- The player's side (lord AI) wins **about 60–80%** of runs within 70 days; a person who casts better and plans should win more.
- Lykaon, left alone, raises the Seraph Spire around **part day 18–25** and the Olympus Gate later: the clock that makes waiting costly.
- He first attacks something of ours (a mine, a dwelling, a town, a hero) by **part day 6–10**.
- Neither neutral town is free: the race is close (within 1–2 days) on a straight ride.
- Othrys's Gigantes cost a strong army 25–40% of its strength.
- Chapter 1's earlier balance tests and chapter 2's stay as they are (the lord is opt-in).

### Lykaon's mind as built (Nov 9)

- **The lord mind** (`src/logic/lord/`, switched on by `rival.mind: 'lord'`): `lordDay` plays one side's whole day, all its heroes and towns, from what that side knows. The rival's side is played on the **mirrored** adventure (`mirror.ts`: his heroes, purse, fog and flags as "ours"), so both sides use the player's own rules (moves, visits, fights, Tavern hires). Kassander and Sethi keep `rival.ts` as it was; their head start is skipped only for a lord.
- **Rules built:** his own fog and memory (`rival.explored`, `rival.memory`: last strength and place of each hero of ours; with no town left, scouts find ours each night); up to 3 heroes (from the Greek roster since Nov 9: the Taverns' two a week, chosen by `lord/recruits.ts`, our price), the second from part day 2, a third at 3000 gold a day; a main hero (the strongest) and runners who flag, scout and carry recruits to him (hand-over keeps the runner's weakest company); a build planner (a hall that pays back within 10 days, then `BUILD_PLANS`, saving 35% of each day's gold for the Seraph Spire, then the Capitol and the Titans' upgrades, never spending the goal's rare goods); hiring the best level, upgrading stacks, the best machine, a spellbook, the guild's spells, a town giving its garrison to a hero when no foe is near, idle gold hired into garrisons; targets by worth over days (weak towns of ours while our heroes can't be back by tomorrow, lone heroes, our mines and dwellings, neutral towns and the forge, unseen towns worth a look); never a day's end in reach of a hero 1.3 times stronger; defend a town a stronger foe draws near; retreat from a lost fight; the night's news (`lord/news.ts`): buildings and towns always, flags only where our sight is.
- **Several rival heroes:** `rival.others` (old saves load: the fields are optional); the one met becomes `rival.hero` (`frontRival`), and a beaten one hands the lead to the next.
- **Spells for every AI side** (`battleCasts.ts`): once a round, when the spell is worth half the active stack's move or it is the round's last chance; none in a fight already won (4 to 1). The balance bot (`test/partBot.ts`) still casts none, so its tables stand; with spells Abu's siege replay costs 19% with no machine (36% without).
- **Old tables, re-run (4 seeds):** the Black Banner and the Red Land rows are as before (Kassander ×0.76 to 2.26 at ride-on, no bot win; Gebtu: rider part day 4 to 5, Sethi 6); Abu's siege 36% / 25% (none / Earth Ramp). The Red Land's race test times out at 5 s with BALANCE_SEEDS (not new).

**Round 2 (Nov 9):** `rival.heroes` on the map (validated, 3 when left out). The win rule above (`checkGoal`, `lordOverthrown`; `rival.fallen` remembers his beaten heroes, `comesBack` in `lord/turn.ts`; saved). The lord rides for a raced town only after the part's third night, as Kassander and Sethi. Both sides now ride *through* a guard they would fight when that is the shorter way (it was a bug that no guarded monster was ever a target: the reach search never stepped from a guard zone onto the monster, which also shut Ashford's heroes in). Idle gold builds a lord's garrison only to 1.5 times the map's (as Kassander's). A weak hero of ours beside his town no longer keeps him off it. Our side's mind in the balance runs plays as a person (`test/lordBot.ts`): fights at 1.5 to 1, a hero riding out takes the garrison along. Map: the ford's guard 24 → 18 Cyclopes; new guards on his roads to the raced towns (100 wolves on the highland road at (10, 47), 70 Stymphalian birds on the coast road at (35, 10)); Pherai's and Iolkos's garrisons cut by a fifth (1200 each); Lykaon starts with 40 Phalangites, 24 Peltasts, 14 War Griffins, 7 Minotaur Guards, 3 Centaurs and 9 of each rare good. The pass's 22 Hydras stay the costly short cut to Lykosoura.

**Round 3 (Nov 9):** H3's elimination on lord maps: a lord with no town has 7 days to take one back; our day card counts it down ("Lykaon has no town: 7 days to take one back or his banner falls"), and on the 7th night he and his captains are gone, which counts as Lykaon beaten (`townless` in `lord/turn.ts`, `rival.homeless`, saved). For our side the loss stays as the doc's rule says: the last town of ours lost is the part lost at once (`checkGoal`), so the count is the lord's only. Lykaon buys the Spire's missing rare goods at his Marketplaces (`src/logic/market.ts`) once the gold for the Spire is in the purse. Our side's mind (`test/lordBot.ts`) commits: once its main hero is stronger than a town of his by the siege margin it rides at it (2.5 times the worth), hires nothing on the way home, stops at a Blacksmith of ours for a better machine; every hero keeps yesterday's target unless something 1.6 times better turns up (both sides: it ended the turning back and forth). Played fresh, our old towns keep their garrisons on the map (ridden on, a town keeps what it had).

**Balance (Nov 9, round 3), AI against AI** (`test/othrysBalance.test.ts`, BALANCE_SEEDS=8, 70 days; ridden on: the bot plays Ashford and Thornwood, the lord mind the Black Banner against Kassander's rules; 7 of 8 won it, rider 469 to 3474 at ride-on):

| Start | Won / lost / stalled | Won on part day | Seraph Spire, in the game (part day) | First strike (part day) | Pherai ours/his (day) | Iolkos ours/his (day) |
|---|---|---|---|---|---|---|
| Fresh | 7 / 0 / 1 | 38 to 68 | 38 to 41 | 10 | 0/8 (10) | 8/0 (13) |
| Ridden on | 4 / 1 / 2 | 47 to 58 | 18 to 40 | 4 to 22 | 2/5 (3 to 9) | 2/5 (5 to 11) |

- **Our side wins 11 of 15 (73%)**: 88% fresh, 57% ridden on. On target on the whole.
- **The race, a straight ride against Lykaon alone** (our heroes back at Ashford): Pherai ours on part day 2 to 5, his on day 6; Iolkos ours on day 3 to 5, his on day 7 or 8. A person wins each by 1 to 5 days.
- **The Gigantes** (our strongest hero, spells on): 19 to 28% of 3200 to 3500 at part day 20 (fresh), 14 to 46% of 2300 to 3900 ridden on; a bigger army loses less (1 to 14% at 4400 or more).
- **First strike:** part day 10 fresh; 4 to 22 ridden on.
- **The Spire, Lykaon left alone:** part day 31 to 33 fresh, 19 to 35 ridden on (or not within 40 days). Late: gold is what holds it back (he saves 35% of each day's gold, `SAVE_SHARE`). Tried: 10 of three rare goods (one bought at the market): no sooner (29 to 31), and our side won less (8 of 15), so it is back to 9 of each.

**Re-run after the gate-then-walls rule and the winning rival keeping only his survivors (Nov 9, 8 seeds):** fresh 8 / 0 / 0 (won part day 38 to 64, Spire 37 to 41, the rest as above); ridden on, 7 of 8 won the Black Banner, then 3 / 1 / 3 (won 37 to 52, first strike 3 to 22, rider 1617 to 2989). The Black Banner probe is unchanged: no bot win (lost 3 / 6 / 6, stalled 5 / 2 / 2 of 8 per style). Not retuned.

**Left for the playtest:** the Spire's day (a mind number, `SAVE_SHARE`, not a map one), the ridden-on start being harder than the fresh one, and the race lead (1 to 5 days, a little wider than 1 to 2). The AI numbers say the part is winnable and that Lykaon fights back; a person's playtest decides the rest.

### Art and words (new)
- **Lykaon** hero art (a wolf-king: grey wolf pelt over bronze, a wolf-head helm, riding a black horse), `HERO_ART.lykaon`; his towns' map look `lykosoura` (dark banners, wolf standard) via `TOWN_LOOKS`.
- **Gigas** unit (huge, bearded, rock in hand, two hexes), idle/walk/attack as the others.
- Map sprites: learning stone, cyclops cave, griffin cliff, the Titans' forge on the summit, treasure keep (ruined shrine).
- The part's menu vignette (Othrys over the Thessalian plain).

**Art as built (Nov 9, 22 PixelLab generations).** Gigas (`gigas`, 160x168 canvas, a thrower: strike frame 2, shot from the raised hand) and Lykaon (`HERO_ART.lykaon`, wolf-head helm, black horse, spear thrust; the gallop's surge is only half locked, the spear tip leaves no room) have idle, walk and attack. Map sprites `learningStone`, `cyclopsCave`, `griffinCliff`, `titanForge`, `keep` and the `lykosoura` town look (the Greek town with black banners; the wolf standard is small) are in `map.ts` via `build_map.py`, with ink stand-ins kept in `src/art/sites/index.ts`. The `othrys` vignette is a mountain with a forge glow over olive groves. The griffin cliff is the game's own griffin pasted onto the nest (a model merge turned it into an eagle); Lykosoura has one big black banner with a pale wolf head on its tallest tower.
- Narration (recorded Nov 9): `part-othrys` (the opening), `blackBanner-won` (the Black Banner's end, riding on), and the chapter's ending moves to Othrys's win with a new last line about the Titans' oath.

### Part 4 as built: the city, the sites and the land (Nov 9)

- **Numbering.** Chapter 1 is parts 1–4. Inside, chapter 2's `n` runs on from 5 (`TWO_LANDS_FIRST`, `soldOn`); on screen it is parts 1–4 since Nov 9 (`partNumber`). Saves and wins are keyed by map id: a save left on the Black Banner's victory card rides on into Othrys, and a recorded Black Banner win opens it (tested). The Black Banner's win now tells `blackBanner-won` and rides on.
- **Narration, written only:** `blackBanner-won`, `part-othrys`, and `othrys-won` (the Titans' oath). `chapter-won` is recorded, so its words stay; `othrys-won` is told on Othrys's victory card just before it (a part's `won` line is now told on a chapter's last part too). To fold the oath into `chapter-won` instead, it must be recorded again.
- **The city.** `UNLOCKS[3]` opens the seven buildings; on part 4 nothing Greek is off and nothing says "Later map". `BUILD_PLAN` runs on to the Capitol, the Titans and the last upgrades. Checked in the browser: the hall offers them, the fully built town draws each, the fort hires Cataphracts, Centaur Sages and Titan Lords.
- **Level-3 traits** are the existing ones: Cretan Archer `noRangePenalty`, Cataphract `shieldWall`, Titan Lord `cleave` (seen hitting two stacks at once in dev/battle.html). New trait `noMeleePenalty` for the Gigas (stats as above, 4 shots, two hexes; stands in as the Cyclops until its art).
- **Sites** (`src/logic/objects.ts`, `visits.ts`, `dwellings.ts`): `learningStone` (+1000 XP, `visitedBy`), `dwelling` (`creature`, `growth`, `stock`, `owner`, `look`; flagged on a visit, a hire card with Hire N / Leave, grows each Monday only while flagged, taken back like a mine), `bank` (`look: 'keep'`, `prize`, `item`; a piece the bag can't take waits inside). Guards are monsters beside them, as for mines. Saved and loaded; the map hover names them. Sprites fall back to borrowed ones while missing.
- **The land** (`src/level/othrys.ts`, 56 × 68, east of the 72 × 68 land: 128 × 68). Coast with Iolkos, the plain with Pherai, Mount Othrys (a ring of mountains, a north and a west way up, the forge on the snowy summit with 8 Gigantes beside it holding the Helm of Kronos, the first Legendary: +2 Attack, +3 Defense, +1 morale), the Arcadian highlands with Lykosoura and Tegea. Ways in: the coast road (light guard, 70 Brigands), the ford east of Korax (24 Cyclopes), the pass (22 Hydras); each alone reaches every region (tested). The opening shows only where each starts (`opening.apart`). 64 objects: 24 monster groups, 10 mines (every kind; 2 Lykaon's), 3 dwellings, 2 learning stones, 1 keep, 4 chests, 12 piles, 3 campfires, a watchtower, a camp, stables, a standing stone and the Thunderbolt shrine. Neutrals 480–930 in strength (the pass's Hydras 1140), the Gigantes about 1590. Par 45.
- **Lykaon** is `rival` with `mind: 'lord'`; riding on brings him in fresh with no head start. His army, purse, his towns' garrisons and the Gigantes' count are placeholders marked for the lord's balance runs. Played fresh, Rowan waits east of Korax with about what a rider brings.
- **Several rival heroes on the map (Nov 9):** every hero of the rival's is drawn, in his own art (else the rival's), on tiles we have seen; the night's one path is split hero by hero where it jumps (`src/scenes/map/rivalRides.ts`) and each rides on his own figure in turn; hover and tap name and fight the hero on that tile (`rivalHeroAt`).
- **A lord gone for good:** when a part brings a new lord, whatever the old one still held (mines, dwellings, towns with their garrisons) turns neutral, ridden on or played fresh (`oldLordGone`, in state; the maps are unchanged).
- **Left:** the lord's balance (LORD); the Gigantes' cost; the oath line recorded.

### The end of the early access (user, Nov 8)

Winning the last part built shows its Victory card, then **Chapter 1 complete** (`chapterDoneCard` in `src/scenes/cards.ts`): the narrator tells the chapter's ending (its words read on the card with narration off), the march in numbers (days, towns held, heroes riding), then chapter 2 (since Nov 8, when part 4 was built): The Two Lands crosses to Egypt, with a new people, Neferet and the Sacred Rites. An owner gets **On to chapter 2** (its saved game, or its start); anyone else reads that it is part of the full game and gets **Full game · <price>** (the host's checkout, counted as the `free_end` offer). Back to the campaign, or More games (the host's exit, to the catalog). Finishing no longer drops the player straight on the chapter card. A later chapter's last part built ends on the same card, titled "Chapter 2: The Two Lands, so far", saying its next parts are being made.

### No laurels on screen

**Laurels are off (Nov 4).** They rewarded rushing and losing nothing, which works against a slow game of building up; they unlocked nothing; and a chapter is one run, so a part can't be replayed for a better score. The game still records them with each win (best laurels and days, for the account's progress and the win event), and the art is kept, so they can come back as something else.

### The chapter card

**Two chapters (Nov 8).** The menu has a card per chapter, each under its own heading ("Chapter II · The Two Lands"), side by side where both fit; on a screen too small for both, one shows (the last with a game in play) with arrows by its heading to the other. Part numbers count within each chapter (user, Nov 9: "the chapter is different anyway"), so chapter 2's card says "Part 1 of 4: Nekhen" and lists its parts 1 to 4, as chapter 1's does. Chapter 2 is the full game's: to a player who doesn't own it, its card shows its parts dim, a short pitch in place of the goal and **Unlock · <price>** (the host's checkout, counted as the `locked` offer); to an owner whose maps failed to load, the error and Try again. Each chapter keeps its own game: Continue and Start the chapter over act on that chapter only.

The menu shows **this game**: each part before the one in play says Won, the one in play says In play, the rest wait dim. What earlier games won doesn't count: after Start over the chapter reads from part 1 again. With no game in play it shows Won throughout only if the whole chapter was won. Continue is the one main button, Start the chapter over a plain one under it.

### Skill icons

Every skill has a 32 px icon, each its own object so none repeats an icon the game already uses (spells, stats, gear). The level-up card puts it at the left of each choice. The hero sheet lists icon, rank and name, and what the skill does, one to a row; under 680 px of screen height it goes two to a row with only the name and rank, since eight rows would not fit.

## Chapter 2: The Two Lands (Egypt, paid)

Nekhen is chapter 2's first part, played as Egypt (user, Nov 8: "Ch. 2 map 1, Egypt"; the roster, Neferet first and the sluice story approved as drafted the same day). As in chapter 1, the chapter is one land that grows over its parts (four since Nov 9), with a fresh hero; gear and progress from chapter 1 don't carry over. Chapter 2 is the first paid content.

Players arrive having won chapter 1, so this chapter doesn't re-teach armies, towns or magic. Each part still adds one new thing: **part 1, the new people and Sacred Rites**; part 2, the siege ramp (Egypt's way past walls); part 3, a rival lord; part 4, a lord's mind and the rest of the city.

### The Two Lands (faction id `kemet`)

The Nile kingdom under its old gods. Soldiers and archers at the bottom, the temple's guardians and sacred beasts at the top. Its strengths are toughness and rites: curses, wards and raising the fallen. It has no early flier (the Bennu at level 7 is its only one), and it is slower than the Greeks but harder to wear down. Art risk (PixelLab, Nov 3): human-animal hybrids fail when the bodies merge (centaur, satyr), but animal heads on human bodies work (the Minotaur). So the Jackal Warrior is safe, the Sphinx is the risk (fallback: a ram-headed sphinx, an animal-animal blend like the Griffin), and the Chariot must be drawn as one two-hex unit, horses and car together.

| Lvl | Unit (id) | Att | Def | Damage | HP | Speed | Growth | Cost | Notes |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Nile Levy (levy) | 4 | 5 | 1–3 | 10 | 4 | 14 | 60 | Spear and hide shield |
| 2 | Nubian Archer (nubian) | 6 | 3 | 2–3 | 10 | 4 | 9 | 100 | Shoots, 12 shots |
| 3 | Jackal Warrior (jackal) | 9 | 6 | 3–6 | 22 | 7 | 7 | 200 | Jackal-headed temple guard. Fast, on foot |
| 4 | War Chariot (chariot) | 10 | 10 | 5–9 | 35 | 8 | 4 | 300 | Three hexes (from Nov 9). Charge (+5% damage a hex moved) |
| 5 | Mummy (mummy) | 11 | 11 | 8–12 | 40 | 4 | 3 | 400 | Undead. **Curse 25%:** a strike that lands may curse the target (it deals its least damage) |
| 6 | Sphinx (sphinx) | 15 | 16 | 15–25 | 110 | 6 | 2 | 1000 | Two hexes. **Guardian:** answers every strike |
| 7 | Bennu (bennu) | 20 | 18 | 40–50 | 180 | 11 | 1 | 3000 + 1 gem | Flies. **Rebirth:** once a battle, when the stack is wiped out it rises again with half its creatures (at least 1) |

| Line | Level 2 (id) | Att | Def | Damage | HP | Speed | Cost | Level 3 (id) | Att | Def | Damage | HP | Speed | Cost |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Khopesh Warrior (levy2) | 6 | 5 | 2–3 | 12 | 5 | 80 | Shardana Guard (levy3) | 7 | 8 | 2–4 | 15 | 5 | 100, **shield wall:** shots against it do half |
| 2 | Medjay Archer (nubian2) | 7 | 4 | 2–4 | 10 | 6 | 130, 16 shots | Bowman of Ta-Seti (nubian3) | 8 | 5 | 3–4 | 12 | 6 | 170, 20 shots, no range penalty |
| 3 | Sentinel of Anubis (jackal2) | 10 | 7 | 3–7 | 25 | 8 | 240 | Hand of Anubis (jackal3) | 11 | 8 | 4–8 | 28 | 8 | 290, strikes unanswered |
| 4 | Royal Chariot (chariot2) | 12 | 11 | 6–10 | 40 | 9 | 360 | Chariot of Horus (chariot3) | 14 | 12 | 7–11 | 45 | 10 | 430 |
| 5 | Royal Mummy (mummy2) | 12 | 12 | 9–13 | 45 | 5 | 450, curse 35% | Pharaoh's Mummy (mummy3) | 14 | 13 | 10–14 | 50 | 5 | 520, curse 50% |
| 6 | Guardian Sphinx (sphinx2) | 16 | 17 | 18–25 | 110 | 7 | 1200 | Great Sphinx (sphinx3) | 18 | 19 | 20–28 | 130 | 8 | 1500 |
| 7 | Golden Bennu (bennu2) | 22 | 20 | 45–55 | 210 | 13 | 3600 + 2 gems | Bennu of Ra (bennu3) | 25 | 22 | 50–60 | 250 | 15 | 4400 + 3 gems, rises with all its creatures |

The numbers follow the Olympian League's level by level so the two armies are about even; the balance bot (bot vs bot on the real rules) settles them before release, as it did for chapter 1.

**Buildings.** Halls, walls, Tavern, Marketplace, Storehouse and Treasury work as the Greeks' under the same ids. The Mage Guild is the **House of Life** (the temple's scriptorium), the Blacksmith the **Workshop** (sells the ramp from part 2), the Stables the **Chariot Road**. The dwellings are Egypt's own:

| Line | Dwelling | First upgrade | Second upgrade |
|---|---|---|---|
| 1 Levies | Levy Camp | Khopesh Hall | Shardana Barracks |
| 2 Archers | Archers' Yard | Medjay Post | Range of Ta-Seti |
| 3 Jackals | Jackal Shrine | Temple of Anubis | Hall of Two Truths |
| 4 Chariots | Chariot Yard | Royal Chariot House | House of Horus |
| 5 Mummies | House of Embalming | Per-Nefer | Valley Tomb |
| 6 Sphinxes | Sphinx Terrace | Avenue of Sphinxes | Great Sphinx Court |
| 7 Bennu | Benben Stone | Obelisk of Heliopolis | Temple of Ra |

Egypt's own building: the **Temple of Osiris** (needs the House of Life) makes one Ankh a week for the hero in town. Egypt's dwellings stand in their own order (see What the engine needs).

### Sacred Rites (Egypt's divine powers)

| Spell (id) | Level | Mana | Effect |
|---|---|---|---|
| Curse of Set (curse) | 1 | 5 | An enemy always deals its least damage (the opposite of Wisdom of Athena; the Mummy's curse is the same effect) |
| Ward of Isis (ward) | 1 | 6 | The next 10 × SP + 20 damage to a friendly stack is soaked |
| Rite of Osiris (rebirth) | 2 | 12 + 1 Ankh | Brings back 30 × SP + 40 HP of a friendly stack's fallen, for good |

Raising the dead "needs preparation or a scarce resource" (lore, Nov 3): the Rite of Osiris costs one **Ankh**, carried by the hero (a count shown in the spellbook, not a town resource). Ankhs come from the Temple of Osiris and from a few map sites. The undead can't be raised or cursed.

### Heroes

- **Neferet**, priestess of Isis (mystical, the chapter's first hero): Attack 1, Defense 1, Spell Power 2, Knowledge 3, basic Wisdom, the Novice's Papyrus (Egypt's spellbook) with Curse of Set and Ward of Isis, 2 Ankhs. Army: 18 Nile Levies, 7 Nubian Archers. Chapter 1 opened with a fighter; this one opens with a mystic.
- **Paser**, a chariot captain (military), hired at a Tavern from part 2, as Ianthe was.

Gear: one gray set of Egypt's own on part 1 (Faience, for the mystic), as fixed drops, as the Bronze set was on map 1.

### Part 1: Nekhen (the map to build first)

32 × 24, on the Upper Nile. The flood didn't come: the great sluice of the canal is held by a **Petsuchos**, the temple's giant crocodile gone wild, with its brood. Neferet holds **Nekhen** (Village Hall, Tavern, Levy Camp). The Nile runs down the land with a green strip each side and desert beyond (the `sand` terrain, already built for battles); the canal crosses it at the sluice. **Goal:** take the sluice back from the Petsuchos. Opens: halls, Fort, Citadel, Tavern, House of Life (level 1), the dwellings of lines 1–4, the Temple of Osiris.

New neutrals (Egypt's lands):

| Unit (id) | Lvl | Att | Def | Damage | HP | Speed | Notes |
|---|---|---|---|---|---|---|---|
| Hyena (hyena) | 1 | 4 | 3 | 1–3 | 7 | 6 | |
| Sand Raider (raider) | 2 | 7 | 3 | 2–4 | 10 | 6 | Shoots, 8 shots |
| Giant Scorpion (scorpion) | 3 | 8 | 9 | 3–6 | 22 | 5 | **Poison:** a strike that lands takes a tenth of its damage again at the start of each of the target's next 3 turns |
| Nile Crocodile (crocodile) | 3 | 9 | 8 | 4–6 | 26 | 4 | Three hexes (from Nov 9). Strikes unanswered |
| Petsuchos (petsuchos) | 6 | 16 | 14 | 15–22 | 120 | 5 | Three hexes and speed 5 (from Nov 9; it was 4). The boss at the sluice. Regen 10 (as the Hydra) |

The story is narrated by the chapter-1 narrator (David), as chapter 1's is.

### What the engine needs (before content)

1. A faction per town and per hero: `BUILDINGS` keeps its ids, and each faction maps the dwelling ids to its own units and names (Greek saves load unchanged).
2. New unit traits: curse on strike, rebirth, guardian (answers every strike), shield wall, no range penalty, poison.
3. The three Sacred Rites and Ankhs.
4. Chapter 2 as a second land in the campaign: a second chapter card, locked behind the full version.
5. Art (PixelLab, the chapter-1 pipeline): 21 units and 5 neutrals with their animations, 21 dwellings, the Egyptian town, the Nekhen map town, two hero faces, desert and floodplain on the map.

**Built (steps 1–3, Nov 8), and where the code had to settle what this section leaves open** (`src/logic/factions.ts`, `battleTraits.ts`; tests in `test/egypt.test.ts`):

- **A town's and a hero's people** come from the map (`faction` on a town or hero; none is Greek), never from the save, so every older save loads as Greek, unchanged. Ankhs are saved on the hero and in a town's temple.
- **Egypt's dwellings stand in their own order** (coordinator, Nov 8; `needs` in `factions.ts`, the Greeks' unchanged): the Archers' Yard and the Jackal Shrine need the Levy Camp; the Chariot Yard needs the Jackal Shrine; the Chariot Road the Chariot Yard; the House of Embalming the House of Life and the Jackal Shrine (Anubis is the embalmers' god); the Sphinx Terrace the House of Embalming; the Benben Stone the Sphinx Terrace and the Temple of Osiris. Upgrades follow the Greek rule (the first needs the dwelling, the second the first and the Citadel, lines 1–4, or the Castle, 5–7). Egypt's build plan follows that order, with the Temple of Osiris right after the House of Life.
- **New neutrals' growth and cost** (for the rival's strength checks; the table gives none): Hyena 14 a week, 50 gold; Sand Raider 8, 110; Giant Scorpion 6, 200; Nile Crocodile 6, 200; Petsuchos 1, 1500.
- **Temple of Osiris** costs 2000 gold, 5 wood, 5 ore (no price was set). Its Ankhs wait in the temple and go to a hero of ours in the town: on entering, or there on a Monday. A new temple has its first Ankh ready, as a new dwelling has its first week.
- **Curse:** a Mummy's lasts 3 rounds (the spell, Spell Power rounds). A curse and Wisdom of Athena put each other out. Healing lifts curse and poison.
- **Poison** (coordinator, Nov 8, in place of the table's tenth of one creature's HP, which barely showed): each tick is a tenth of the damage the poisoning strike dealt (at least 1), at the start of each of the target's next 3 turns, the turns counted and not the rounds (not again on a turn after Wait). So it grows with the scorpion stack. A fresh sting replaces the old poison; the undead are immune; Healing lifts it.
- **Rebirth:** "half its creatures" is half of what the stack had when it was wiped out (the Bennu of Ra: all of them).
- **Ward of Isis** lasts until it has soaked its fill (not Spell Power rounds), and soaks any damage: blows, spells, the moat, poison.
- **Rite of Osiris** is cast on a friendly stack still standing (a stack wiped out has left the field) and raises it no higher than the count it began the battle with. Raised creatures stay after the battle.
- **The spellbook** shows a divine school's tab only when the hero knows one of its spells (a Greek book with none still shows Olympian Favor). The Rite's page shows its Ankh price and the hero's Ankhs.
- **No Egypt art yet:** each unit stands in as a drawn one of the same make and level, tinted sand (`src/scenes/battle/standIns.ts`, the one place); the Temple of Osiris borrows the Mage Guild's picture in the hall and has no plot in the townscape yet; the new spells and the Papyrus borrow icons. The Workshop sold the Greeks' catapults until the ramp (since part 5, it sells only ramps: see "Part 2 as built"). `dev/battle.html?a=levy:20,mummy:4&b=hoplite:20&hero=kemet` stages Egypt against Greece (units by id or shown name).

**Built (step 4 and part 4, Nov 8): chapter 2 in the campaign, and Nekhen.**

- **Chapters** (`src/level/maps.ts`): `CHAPTERS` names each chapter, its parts (`n` runs on through the campaign and decides the chapter; the player reads them counted within it, `partNumber`), whether it is paid, its pitch, its save slot and its ending line. `MAPS` is still chapter 1's three. A part rides on only within its chapter (`nextMap`), so the Black Banner never leads into Nekhen. Chapter 2 is one land like the Border March: `src/level/twoLands.ts` stitches it from `nekhen.ts` (only Nekhen so far, 32 × 24 at the top-left corner), so its later parts are added there and `rideOn` takes the hero into them.
- **Paid, as InkSnake's chapters are:** `content/paid.ts` serves `twoLands.ts`'s parts; the website's registry (`apps/web/src/games/content.server.ts`) now lists InkHeroes. For an owner, boot fetches them (`host.loadContent()`), checks every field and id (`src/level/validate.ts`: a throw on anything off; since the Red Land a rival is checked too: his hero, build order and purse, and the map's storms, `won` line, raced towns and town looks) and installs them; nobody else's game has them. `test/twoLands.test.ts` fails if client code imports `content/paid`, `twoLands` or `nekhen`. In dev, `?unlock` plays as an owner and `?locked` as a player without the game, whatever `DEV_UNLOCK` says (`QUERY='&unlock' node dev/drive.mjs …`).
- **Ending:** with only Nekhen built, its win ended on the chapter card "so far" with `nekhen-won` (see "The end of the early access"). Since Abu, Nekhen rides on into Abu and Abu's win (`abu-won`) is the chapter's ending so far.

### Part 1 as built (Nov 8)

`src/level/nekhen.ts`. The Nile runs down the middle of the land, three tiles wide, with three tiles of floodplain (grass, palm clumps drawn as the map's trees) each side and sand beyond, roughened at the edges, with dunes and boulders; desert dunes close the edges. Two crossings: the **bridge** below Nekhen (the road from the town runs to it) and a **ford** (a sandbar) to the south. On the east bank, at the head of the canal, the **great sluice**: the Petsuchos lies there; the river runs into the canal's head and stops, and the canal's bed runs on east dry (the sluice is shut). Nekhen's gate is at (9, 7) on the west bank, Neferet before it. Par 21 days, as map 1.

- **Neferet** (Cleric) as the design: Attack 1, Defense 1, Power 2, Knowledge 3, basic Wisdom, the Novice's Papyrus, Curse of Set and Ward of Isis, 2 Ankhs, 18 Nile Levies and 7 Nubian Archers. **Nekhen**: Village Hall, Tavern, Levy Camp; its House of Life teaches Healing (which lifts the scorpions' poison), Shield and Haste (Slow and Magic Arrow wait for the second floor). **Purse** 9000 gold, 20 wood, 20 ore, 3 of each rare (map 1: 7500, 15, 15, 3), a little richer since players arrive having won chapter 1.
- **Opens** (`TWO_LANDS_UNLOCKS` in `unlocks.ts`, a list per part like chapter 1's): Village and Town Hall, Fort, Citadel, Tavern, the House of Life's first floor, the Temple of Osiris, and the four lowest dwellings (Levy Camp, Archers' Yard, Jackal Shrine, Chariot Yard). "Halls" was read as map 1's two; the City Hall, Marketplace, Workshop, upgrades and the rest stay off.
- **Neutrals**, light at home and heavier toward the sluice: west bank, 6 Hyenas at the palm-grove sawmill, 5 Sand Raiders at the ore pit, 10 Hyenas holding the bridge's west end, 12 Hyenas in the southern dunes, 10 Sand Raiders at the ford; east bank, 5 Giant Scorpions at the gold mine, 12 Sand Raiders at the far chest (2000 gold), 6 Scorpions at the shrine, 7 Scorpions in the waste, 5 Nile Crocodiles on the road down to the sluice; and **the Petsuchos with its brood of 8 Nile Crocodiles**, one fight: a map monster can now carry a `brood` (a second creature in up to 3 stacks of its own beside it, which never grows; `monsterArmy` in adventure.ts). The design names one Petsuchos, so it is one.
- **Sites:** sawmill, ore pit, gold mine; a Mercenary Camp, a Watchtower and a Standing Stone; a **shrine of the Rite of Osiris** east of the river (Neferet knows two Rites; the third is found); two chests, three campfires, seven piles. No site gives Ankhs yet (no such site exists): Ankhs come from Neferet's two and the Temple.
- **The gray Faience set** (`items.ts`, Neferet's, as the Linen set is Ianthe's), as fixed drops: Faience Diadem (+1 Knowledge) from the grove hyenas, Reed Sandals (+1 Knowledge) from the pit raiders, Faience Bangles (+1 Spell Power) from the bridge hyenas, Faience Anklets (+1 Knowledge) from the dune hyenas, Scarab Girdle (+1 Luck) from the ford raiders, and the Faience Collar (+1 Spell Power) from the Petsuchos. Their icons borrow the Linen set's.
- **Stand-ins (no Egypt art yet):** units as in `standIns.ts`; on the map Nekhen is the Greek town tinted sand, Neferet rides as Rowan (the hero art's fallback), and the desert's dunes and boulders are the map's mountains and rocks on sand (new tiles `D` and `k` in `map.ts`); the menu's picture for Nekhen is Ashford's river, tinted.

**Balance (Nov 8), on the real rules** (`test/partBot.ts`, a bot reusable for every part: it builds the town's plan a building a day, hires all it can at home, rides to the nearest pile, chest, mine, site or monster it is at least `edge` times stronger than, comes home at the start of a week, and takes on the goal at `bossEdge`; every fight is the battle AI on both sides, so no spells; `test/nekhenBalance.test.ts`, `BALANCE_SEEDS=24` for the table). Three styles: a rusher (edge 1.6, the goal at 1.3), a steady player (2, 1.6) and a careful one (2.5, 2). 24 seeds each, all won:

| | Days | The goal's fight cost | Worst first-week fight |
|---|---|---|---|
| Nekhen, rusher | 6 to 12 | 13 to 50% of the army | 4% |
| Nekhen, steady / careful | 12 | 10 to 22% | 8% |
| Map 1 (Ashford), rusher | 5 to 10 | 2 to 33% | 7% |
| Map 1, steady / careful | 10 | 0 to 8% | 7% |

So Nekhen plays about map 1's length (two days longer for a steady player: the sluice is across the river and down the far bank), its goal costs a real share of the army where the ogres hardly do, and the first week near home is as safe as map 1's. Tried and dropped: two Petsuchoi with 6 crocodiles (the bot waited until week 3, day 17, and lost 5%); 9 Sand Raiders on the bridge (lost 23% on day 1: shooters bite at the start); a brood of 10 (steady day 12 at 17 to 35%, but a careful player waited to day 17).

### Part 2: Abu, the fort at the cataract (designed Nov 8; user: "proceed with the next map")

With the sluice open the flood comes, and the river road south opens. Upstream at the First Cataract, where the Nile breaks over black granite, Sand Raiders have taken **Abu**, the island fort that guards the kingdom's southern gate, and with it the river trade. Neferet has to take it back. Like Thornwood on map 2, it is the chapter's first siege, so the new thing is **Egypt's way past walls: the siege ramp**. A second hero, Paser, waits at the Tavern.

**The siege ramp (Egypt's war machine).** Where the Greek catapult breaks walls at random, Egypt's workers raise an earthen ramp against the wall where the player chooses, and the army walks up it. It goes in the War Machine slot like the catapult, comes to sieges only, works by itself and can't be hit.
- **Choosing the place:** at the start of a siege the player taps one of the four stretches of wall (the lit ones; the gate can't take a ramp). A bot or auto battle picks the stretch with the fewest manned towers able to shoot at it, ties to the one nearest the gate.
- **Building:** at the start of each round the ramp grows; when it's done, that stretch's hex can be walked over both ways, as a breach can, and its moat hex is filled (no moat damage there). The wall itself still stands: shots over it are still halved, the towers and gate are untouched, and no tower falls.
- **Grades:** Earth Ramp (Common, 1500 gold: ready at the start of round 3); Brick Ramp (Uncommon, 3000 gold: round 2); Ramp of the Pyramid Builders (Rare, a prize on part 3: round 2, and a second ramp at another stretch on round 3). The Workshop sells the Earth Ramp from part 2 and the Brick Ramp from part 3 (`MACHINE_UNLOCKS`).
- **Against the catapult:** slower to open the first way in than a lucky catapult and never brings down a tower, but sure, aimed where the player wants it (away from the towers' fire), and it crosses the moat. Hand strikes on the gate and towers work as before, so a hero with no machine can still storm.
- **The lesson:** as Thornwood's (the part's narrated intro, the card on riding at a walled town with no machine, the Workshop's room, the empty slot, the status line in battle), with the ramp's words.

**Paser**, a chariot captain (Fighter), hired at any Tavern of ours from part 2 for 2500 gold, once, as Ianthe is in chapter 1: Attack 3, Defense 2, Spell Power 1, Knowledge 1, basic Offense, no book; 15 Nile Levies and 3 War Chariots. His gear is the **gray Scale set** (Attack, Defense, Morale; six pieces like the Bronze set), fixed drops on this part, on the side of the river where he is hired.

**New neutrals:**

| Unit (id) | Lvl | Att | Def | Damage | HP | Speed | Growth / cost | Notes |
|---|---|---|---|---|---|---|---|---|
| Spitting Cobra (cobra) | 2 | 7 | 4 | 2–3 | 9 | 6 | 8, 120 | Shoots, 6 shots. Its spit poisons, as the scorpion's sting (poison now also comes on shots) |
| Desert Lion (lion) | 4 | 12 | 9 | 6–10 | 38 | 7 | 4, 320 | Three hexes (from Nov 9). Charge (+5% damage a hex moved) |

**The land:** about Thornwood's size (40 × 32), added to the two lands' map south of Nekhen's (the Nile runs on down from Nekhen's, so the river joins), `src/level/abu.ts`, stitched in `twoLands.ts` with an `opening` that shows where the way south starts (not Abu itself). The river road runs south along the west bank through palm villages and quarries; the desert either side holds the cobras, lions and raiders; the cataract is a belt of granite rocks across the Nile with Abu on its island, reached by one causeway (guarded) and a ford above the rapids. **Abu** (Village Hall, Town Hall, Fort, Tavern, Levy Camp, Archers' Yard) is held by Sand Raiders (on its towers), Hyenas, Spitting Cobras and Desert Lions; its garrison is set by the bot so the siege costs about what Thornwood's did (no machine about 35%, Earth Ramp about 28%). The Crown's grant equivalent: Pharaoh's grant on riding on (2500 gold, 5 wood and ore). **Opens:** City Hall, Marketplace, the House of Life's second floor, the Workshop (Earth Ramp), Storehouse, Chariot Road, House of Embalming, the first upgrades of lines 1–4. Par 28 days, as Thornwood. Siege castle art: Abu stands behind the Greek castle on the field for now (an Egyptian mudbrick castle by the castles process later).

**Balance** with `test/partBot.ts` riding on from Nekhen (the army a bot actually brings), never guessed numbers; the bot needs to buy and use a ramp, and a no-machine run is kept for the table.

### Part 2 as built (Nov 8)

`src/level/abu.ts`, stitched in `twoLands.ts` at (0, 24), right under Nekhen (the chapter's land is now 40 × 56; Nekhen's own 32 × 24 is unchanged). The Nile runs on from Nekhen's columns 15 to 17 down a straight reach, with the **river road** on the west bank's floodplain; then the river widens at the cataract into a basin: the **granite belt** (boulders in the water, the rapids) crosses it above the island, **Abu** stands on its island (gate at world (16, 48)), the **causeway** (bridge tiles, then road to the gate) runs to it from the west bank, guarded by Desert Lions at its foot, and the **ford** (a sandbar) above the rapids crosses from the island's south tip to the east bank. Palm villages and quarries (a sawmill and an ore pit) line the west bank; desert either side with dunes and boulders; a gold mine, a windmill (gems) and a shrine of Slow in the east. Played fresh, Neferet waits at the head of the river road with 40 Levies, 20 Archers, 10 Jackals and 5 Chariots, 10000 gold, 20 wood and ore, 5 of each rare. The opening ("The river road south, toward the First Cataract") flies from Nekhen's west bank down the first few tiles of the road; Abu itself stays in the fog until found. Par 28 days. Pharaoh's grant: 2500 gold, 5 wood, 5 ore.

- **Abu** (Village Hall, Town Hall, Fort, Tavern, Levy Camp, Archers' Yard, House of Life spells Healing, Shield, Haste, Slow, Dispel): a garrison of 16 + 7 Sand Raiders, 22 Hyenas, 10 Spitting Cobras and 3 Desert Lions; the 16 Raiders go up on the keep (a Fort has one tower place). As the design has it, a Fort and no Citadel, so **Abu has no moat**: the ramp's filling of the moat shows from the first Citadel the player meets.
- **Neutrals** (west bank, each dropping a piece of the Scale set): 16 Hyenas in the north village (Scale Helm), 8 Cobras at the quarry (Scale Bracers), 3 Lions in the dunes (Scale Coat), 10 Raiders in the palm grove by the sawmill (Captain's Sash), 12 Cobras on the road (Scale Greaves), 6 Lions at the causeway's foot (Chariot Sandals); 6 and 8 Scorpions in the western desert (the second by a 2000-gold chest). East bank: 10 Scorpions at the east quarry, 5 Lions on the rocks, 14 Raiders at the ford's east end, 14 Cobras in the desert, 30 Hyenas by a 2000-gold chest.
- **The gray Scale set** (`items.ts`, Paser's): Scale Helm (+1 Defense), Scale Coat (+1 Defense), Scale Bracers (+1 Attack), Captain's Sash (+1 Morale), Scale Greaves (+1 Defense), Chariot Sandals (+1 Attack); icons borrow the Bronze set's.
- **Paser** (`recruits.ts`, `TWO_LANDS_RECRUITS`): a Knight (the Fighter class), Attack 3, Defense 2, Power 1, Knowledge 1, basic Offense, no book, 15 Levies and 3 War Chariots; hired at any Tavern of ours from part 2 (`MapDef.recruits` on Abu), 2500 gold, once. Stand-in art: the hero art falls back to Rowan's until `HERO_ART.paser` is drawn.
- **Opens** (`TWO_LANDS_UNLOCKS[1]`): City Hall, Marketplace, the House of Life's second floor, the Workshop, Storehouse, Chariot Road, House of Embalming and the first upgrades of lines 1–4. The Workshop's wares come per chapter (`TWO_LANDS_MACHINE_UNLOCKS`, read by `soldOn` for chapter 2's parts): the Earth Ramp from part 2, the Brick Ramp from part 3; chapter 1's `MACHINE_UNLOCKS` is unchanged.
- **Ride-on fix:** a town new in a part keeps its people from the map (`rideOn` dropped `faction`, so Abu would have come in Greek).

**The siege ramp as built** (`src/logic/siege.ts`, `battle.ts`, `battleAi.ts`; tests in `test/ramp.test.ts`):
- The ramp is a war machine like the catapult (`machine: 'ramp'`, gear in the War Machine slot): Earth Ramp (gray, 1500), Brick Ramp (green, 3000), Ramp of the Pyramid Builders (blue, 5000 as the Syracusan Catapult's price; a prize on part 3). Its workers are a stack that never shows on the field (drawn as the ramp on the wall) or in the turn order once placed; they act first in round 1.
- **Choosing:** in round 1 the workers' turn waits for the player: the ground before each stretch that can take a ramp is lit (the wall's own hex hides behind the castle), the status line says "Earth Ramp: tap a lit stretch of wall to raise the ramp against it", and a tap on that ground or the stretch begins it (`{ type: 'ramp', part }`). The Pyramid Builders' workers take two taps in the same turn, the second at another stretch. Wait or Defend on that turn raises none. Under Auto, or for a bot, `rampStretch`: the stretch the fewest manned towers can shoot at in full (a tower within 7 hexes of the ramp's foot, the range a shot keeps its strength; the keep reaches all four, each outer tower all but the far end), ties nearest the gate, then the northern.
- **Growing:** a ramp is begun in round 1 at stage 0 and grows a stage at the start of each round; ready by round 3 (Earth: 2 stages), round 2 (Brick, and the Pyramid Builders' first), round 3 (their second). When done, its stretch's hex is open both ways (`wallsAgainst`) and the moat hex before it is filled (`moatFor`); the parts' blows, the gate and the towers are untouched, and `shotOverWall` still counts the stretch, so shots over it are still halved.
- **The AI:** attackers with a ramp wait on the near bank, out of the moat, as near the ramp's foot as they can, and never strike the gate; once it is done they go through it. A ramp opens no tower, so once only a tower's company is left (and nobody on the ground), they strike that tower by hand, as an army with no machine does (without that the bot's sieges stalled on the keep's raiders).
- **Picture:** PixelLab's ramp sprites (`dev/pixel/siege/ramp/`, copied into `src/art/ramp/`; earth for the Earth Ramp, brick for the finer two), three stages, a low heap, half height, then reaching the wall top, on the wall hex in front of its stretch (`src/scenes/battle/rampView.ts`, the one place). Dust and a word ("The workers begin a ramp", "The ramp grows…", "The ramp is ready!") as it is begun and grows.
- **The lesson in the ramp's words** (each people's `siege` words in `factions.ts`): the card on riding at walls with no machine ("A siege ramp rides with you as gear: at the start of the battle you choose a stretch of wall, its workers raise a ramp there that fills the moat, and in a round or two your army walks up it. The Workshop in Nekhen sells them."), with the Earth Ramp's picture; the Workshop's room is titled by the town's people ("Workshop"); the empty slot ("No war machine: buy a siege ramp at a Workshop to get over town walls"); the battle's status line with none ("no siege ramp: strike the gate by hand"). The Greeks' words are unchanged. The strip's button still says "Smith" for both.
- **Battles aren't saved mid-battle**, so a ramp needs no saving; a hero's ramp is saved as any gear.
- **Poison on shots:** a poisoner's shot that lands poisons as its sting does (it always did in the rules; the cobra is the first shooter with it), tested in `ramp.test.ts`.
- **Spitting Cobra and Desert Lion** as the table. Stand-in art until PixelLab's lands.

**Balance (Nov 8), on the real rules:** `test/partBot.ts` plays Nekhen, then rides on into Abu (`rideOnInto`) with the army it earned. For Abu it rides for the goal as soon as it is `bossEdge` times stronger, and until then goes home to hire whatever the day (`goalFirst`: nearest-first, it wandered the land's corners for piles until day 43); it buys the best ramp the Workshop sells whenever home, and its fights at walls are sieges (`autoBattle` now takes the siege). `test/abuBalance.test.ts`, `BALANCE_SEEDS=24`. All 72 runs won:

| | Rides on (day) | Abu's days | Army at the gate | Siege (Earth Ramp) | Other fights |
|---|---|---|---|---|---|
| Rusher (1.6, 1.3) | 6 to 12 | 17 to 18 | 831 to 1049 | 18 to 36% | mean 1%, at most 10% |
| Steady (2, 1.6) | 12 | 17 to 21 | 800 to 2038 | 5 to 43% | mean 1%, at most 7% |
| Careful (2.5, 2) | 12 | 23 | 943 to 1055 | 22 to 32% | mean 1%, at most 8% |

The siege replayed from the same moment, every run, share of army strength lost (Thornwood's, from the Catapult table, beside it):

| | No machine | Earth Ramp | Brick Ramp | Pyramid Builders |
|---|---|---|---|---|
| Abu | 39% | 28% | 24% | 24% |
| Thornwood | 35% | 28% (Catapult) | 26% | 20% |

So Abu's siege costs what Thornwood's did, the Earth Ramp saves about a quarter of it, and the rest of the part costs little (Thornwood's: 0.4% a fight west, 3% east), the siege being the real test. The Pyramid Builders' second ramp adds nothing for the bot over the Brick Ramp's one (it comes a round after the first). Tried and dropped: 20 + 10 Raiders, 30 Hyenas, 12 Cobras and 6 Lions (the bot could only take it after a month of hiring, and then lost 3%); 14 + 6 Raiders, 20 Hyenas, 10 Cobras, 3 Lions (33% / 23%); 4 Lions (a careful player waited to part day 31, past par).

### Part 3: The Red Land (designed Nov 8; user: "proceed with the next map")

The Egyptians called their country Kemet, the Black Land of the Nile's silt, and the desert around it Deshret, the Red Land, the realm of Set. With Abu taken, word comes that **Sethi**, a lord who serves Set, has raised his banner in the Red Land east of the river. From his walled city of **Nubt** (Ombos, "the city of gold", Set's own town) he holds the desert's gold roads and means to rule both lands. This is chapter 2's rival lord, as Kassander is chapter 1's, and the chapter's last part: **winning takes Nubt taken and Sethi beaten**, in either order (the `overthrow` goal).

**What's new: the rival is one of our own people, and the Red Land has storms.**
- **Sethi plays Egypt** (`kemet`), with the same units, buildings and ramps as the player: the sides stay symmetric, as the design wants for multiplayer later. He uses `src/logic/rival.ts` unchanged: a head start of three quarters of the days gone by, hiring and building at home, raiding a weak hero or town, retreating from a lost battle while he has a town (Kassander's rules). He carries an Earth Ramp, so a town of ours with walls isn't safe from him.
- **The race for Gebtu.** Halfway between the Nile and Nubt lies **Gebtu** (Koptos), the caravan town where the gold roads meet: neutral, walled (Fort), with a garrison of Sand Raiders and Desert Lions. Whoever beats its garrison first holds it (Sethi rides for it from the part's third night, as he raced for Eudora). Unlike Eudora it is never handed over: it must be fought for.
- **Set's sandstorms.** Every fourth night a storm crosses the Red Land: the day card says so the morning before ("A storm is rising in the east"), and on the storm day every sand tile costs double to cross, for both sides. Nothing else changes. It makes the desert's distances matter and gives the player a reason to time the march (`stormEvery: 4` on the map, so later maps can reuse it).
- **New neutral: the Serpent of Apep** (apep), level 6, two hexes (three from Nov 9), Att 17, Def 13, 14–20 damage, 110 HP, speed 5, poison (as the scorpion) and Regen 10 (as the Hydra); growth 1, cost 1500. One lies coiled with its brood of Spitting Cobras over the **Ramp of the Pyramid Builders** in a sunken tomb, the part's best prize.
- **Opens** (as the Black Banner opened Korax's tier): Castle, Treasury, the Sphinx Terrace (line 6), Per-Nefer (line 5's first upgrade), the second upgrades of lines 1–4; the Workshop adds the Brick Ramp. The Benben Stone (Bennu) waits for a later chapter, as the Titans do.

**The land:** east of Nekhen's and Abu's (the chapter's land grows from 40 × 56 to about 80 × 56), `src/level/redLand.ts`, stitched in `twoLands.ts`. The Nile's east bank floodplain on its west edge (where the way in starts: the `opening` shows only the start of the desert road, not Gebtu or Nubt), then the Red Land: dunes, rock wadis (the gold roads run along them as roads, so the storms bite less on the road), a gold mine and the gem field in the wadis, the sunken tomb of the Serpent, Gebtu at the crossroads in the middle, and Nubt in the far east behind a ridge with two ways in. Sethi's city: Nubt (Village and Town Hall, Fort, Citadel, the dwellings of lines 1–4, Tavern, Workshop), a strong garrison set by the bot as Korax's was. The Pharaoh's grant on riding on (3000 gold and a little of everything). Par 35 days, as the Black Banner.

**Sethi** (rival hero): a Fighter, Attack 3, Defense 3, Power 1, Knowledge 1, in a red crown of the north with a Set-headed staff, riding a black horse. His army at the start as Kassander's, in Egypt's units (Levies, Archers, Jackals, a few Chariots, an Earth Ramp), plus what his head start hired.

**The ending:** the chapter's narrated ending (as chapter 1's): with Sethi beaten the Red Land and the Black Land answer to one crown, the Two Lands are one. It plays the "Chapter 2 complete" card (as chapter 1's: days, towns, heroes; the next chapter is being made). `abu-won` goes back to being a part's end.

**Balance** with `test/partBot.ts` riding on through Nekhen and Abu with the army it earned (the bot must deal with Sethi: Kassander's probe method, `rideOn` + `endDay` + `rivalTurn`), never guessed numbers. Targets, from the Black Banner: Sethi opens at about 1.35 times the army a rider brings so he hunts a weak second hero; a straight ride wins the race for Gebtu by about 2 days; Nubt's siege is the real test; all three bot styles win; sandstorms add a day or two, not more.

### Part 3 as built (Nov 8)

`src/level/redLand.ts` (id `red-land`: a paid map's id must be lowercase, since a win is recorded by it), stitched in `twoLands.ts` at (40, 24), east of Abu: the chapter's land is now **80 × 56** (the Red Land is 40 × 32; the sea fills the 40 × 24 north-east corner, beside Nekhen, never walked). Nekhen's and Abu's own rows are unchanged; the Red Land opens three tiles of Abu's eastern dunes (world x 39, y 40 to 42) into a pass, so the way in is from **Abu's east bank across the desert**, not a Nile floodplain on the Red Land's own west edge (the river is far west of it). The `opening` ("The desert road east, into the Red Land") flies from Abu's east bank through the pass along the first tiles of the desert road; Gebtu and Nubt stay in the fog. Par 35.

- **The land:** sand with dune clumps and boulders, and rock wadis (rough ground) carrying the **gold roads** (roads, so the storms spare them): the desert road from the pass to **Gebtu** at the crossroads (gate red-local (14, 16)), on north up the wadi to the **gold mine**, south down it to the **gem field** (a gems mine), and east toward the ridge. **Nubt** (gate (34, 16)) lies behind a ridge of dunes (columns 29 and 30) with two ways in, at its north and south ends (rows 2 to 3 and 28 to 29: first set at rows 5 and 25, moved to the ends so a straight rider wins the race, see the balance). Nubt's basin is open sand with its own ore pit and gold mine (Sethi's) and a chest. The **sunken tomb**: a ring of boulders open to the north-west at (22, 25).
- **Sethi** (`rival` on the map, id `sethi`): a Fighter (knight), Attack 3, Defense 3, Power 1, Knowledge 1, basic Offense, Egypt's people, with an Earth Ramp; his start army is 12 Levies, 6 Archers, 3 Jackals and a Chariot (half of Kassander's numbers: his head start does the rest), purse 6000 gold, 15 wood and ore, 3 of each rare. His build order: the upgrades of lines 1 to 4, the House of Life, City Hall, House of Embalming, the second upgrades, Castle, Per-Nefer, the Sphinx Terrace. **Nubt**: Village and Town Hall, Fort, Citadel, Tavern, Workshop and the dwellings of lines 1 to 4; garrison 40 Levies, 24 Archers, 12 Jackals, 6 Chariots; `look: 'nubt'` (its red-bannered map picture, `TOWN_LOOKS` in `src/art/pixel/map.ts`). His hero art is `HERO_ART.sethi` (the rival's art now picks the rival's own id, falling back to Kassander's).
- **The kemet rival** (`rival.ts`, still Kassander's rules): building and hiring go through the town's people, so Nubt builds Egypt's tree and hires Egypt's units. New, for both lords: in a town of his with a Workshop (Blacksmith) he **buys the best war machine it sells on the part** (`soldOn`) that beats his own, keeping 3000 gold to hire with (Korax has no Blacksmith, so Kassander is unchanged); Sethi buys the Brick Ramp during his head start. A town he storms **behind walls is a siege** in his auto battles (`stormSides`: the garrison mans its towers, his ramp's stretch is picked by `rampStretch`), and a town of ours he storms with only its garrison in it was already a siege the player plays. The night's card with no day card to join is titled by the map.
- **The race for Gebtu:** Gebtu (Village Hall, Fort, Tavern, Levy Camp, Archers' Yard; garrison 12 Sand Raiders, 4 Desert Lions, 14 Hyenas) is neutral with `race: true` on the map's town: from the part's third night Sethi rides for it as he did for Eudora (`RACE`), and storms it; it is never handed over (no `waits`), so the player storms it too. Taken by him, the night's card says "Sethi reached Gebtu before you" and a card of its own says it fell.
- **Set's sandstorms:** `stormEvery: 4` on the map: the part's 4th, 8th… days (`stormOn`). On a storm day `terrainView` marks the storm, and `stepCost` doubles sand's cost (before Pathfinding's cut); roads (road to road) cost as ever, and the rival's paths see the same weather. The day card's news says "A storm is rising in the east! …" the morning before and "Set's storm howls across the desert! …" on the day (`STORM_WORDS` in `lines.ts`, read, not narrated); `endDay` takes the map for it. The storm days come from the day and the part's `begun`, so a save keeps them with nothing new saved.
- **The Serpent of Apep** (`apep`) as the table, stand-in art until PixelLab's (the art agent has drawn it); in the tomb with a **brood of 24 Spitting Cobras**, dropping the **Ramp of the Pyramid Builders**.
- **Neutrals:** 30 Hyenas by the pass, 20 Raiders up the north wadi, 10 Lions at the gold mine, 18 Scorpions at the gem field, 20 Cobras at the ore pit, 8 Lions by the north-west chest, 25 Raiders in the south-west, 30 Cobras east of Gebtu, 12 Lions and 30 Raiders at the ridge's ends, 20 Scorpions and 60 Hyenas in Nubt's basin. Sites: watchtower, mercenary camp, standing stone, a shrine of Bloodlust; three chests, two campfires, eight piles.
- **Opens** (`TWO_LANDS_UNLOCKS[2]`): Castle, Treasury, Sphinx Terrace, Per-Nefer, the second upgrades of lines 1 to 4; the Workshop adds the Brick Ramp. **Pharaoh's grant:** 3000 gold, 5 wood and ore, 2 of each rare. Paser is still hired at our Taverns. Played fresh, Neferet comes through the pass with 60 Levies, 30 Archers, 16 Jackals, 8 Chariots and an Earth Ramp, Abu already ours.
- **The chapter's end:** `CHAPTERS.twoLands.ending` is `twoLands-won` ("Sethi falls… the Two Lands are one!"); the card that ends everything built of a chapter is one function for both (`src/scenes/chapterEnd.ts`, `chapterEnd`): "Chapter N complete" when the chapter's last part is built (else "…, so far"), its story unless the narrator told it, days, towns and heroes, then the next chapter (chapter 1 → chapter 2, its words now `ChapterDef.teaser`) or "Chapter 3 is being made, and comes to the full game as a free update." **`abu-won` is a part's end again:** `MapDef.won`, told on Abu's victory card as the chapter rides on (read on the card when it isn't heard); its last sentence now says the lord is "out in the Red Land", not "in the north".
- **Narration:** `part-redLand` (the intro) and `twoLands-won` (recorded Nov 9).

**Balance (Nov 8), on the real rules** (`test/redLandBalance.test.ts`, BALANCE_SEEDS=8; the bot plays Nekhen and Abu, rides on, and the probes start from where it rode on). The probes:

| | Rides on (day) | Rider's army | Sethi at ride-on | Gebtu, straight ride (part day) | Sethi alone takes it | Storms add (ride to Nubt) |
|---|---|---|---|---|---|---|
| Rusher | 23 | 578 to 698 | 969 (×1.39 to 1.68) | 5 | 6 | 0 to 1 day |
| Steady | 28 to 32 | 518 to 1932 | 969 to 1142 (×0.59 to 1.87) | 5 | 6 to 8 | 0 to 1 day |
| Careful | 34 | 687 to 793 | 1142 (×1.44 to 1.66) | 4 | never (he hunts the parked hero) | 0 to 1 day |

So Sethi opens at about 1.4 to 1.7 times the army a rider brings (the doc's 1.35: a little over), under the 1.3 times he needs to ride at the hero once the hero hires at Abu; a straight ride (across Abu's ford, fighting its raiders) takes Gebtu one to three days before he would; storms add a day at most. Tried and dropped: Kassander's start numbers (24/10/6/3: ×1.66 to 1.88); Nubt's ways in at rows 5 and 25 (Sethi tied the rider on day 5); Gebtu's first garrison of 20 Raiders, 6 Lions, 24 Hyenas (the race was lost); Nubt's gold mine neutral (Sethi spent less on buildings and came out stronger, ×1.9 to 2.6); Nubt without its Chariot Yard, and Nubt never hiring into its garrison (Sethi carried it all and hunted the bot).

**The coordinator's decisions on the balance (Nov 8)**, built:
1. **The bot plays as a person would:** in its `wise` mode (the Red Land only, so Nekhen's and Abu's tables stand) it hires at the nearest town of ours where the purse can buy a tenth of its army (Abu, Gebtu once taken), not only Nekhen; it keeps its two lowest lines as a town's garrison only up to a third of its army; and with Sethi near and strong it takes the garrison along behind the walls.
2. **A rival town's garrison grows from its weekly recruits only up to 1.5 times its strength on the map** (`GARRISON_GROWTH` in `rival.ts`, every rival); the rest wait in the dwellings for the lord to hire when he comes home. Checked on chapter 1: Kassander rides on into the Black Banner at 1139, 1564 and 1999 on days 20, 28 and 36, as the doc's numbers, and Korax now stops at 1328 (1.5 times its 885), where before it grew on unchecked; the chapter-1 tests pass unchanged, so the cap applies to every rival. Two fixes came with it: his trip home to hire is now valued by what his army has room for (seven slots: a full army hires nothing, and he went home every day for nothing and never raced for Gebtu), and only for at least 15% of his army (`HIRE_SHARE`), not a day's trickle.
3. **The third lever, his head start, shortened to 0.6 of the days gone by for Sethi** (`rival.headStart` on the map, validated; Kassander keeps 0.75): the first two levers didn't make the bot win.

**After the three levers (24 seeds × 3 styles, Nov 8):**

| | Rides on (day) | Rider | Sethi at ride-on | Gebtu, straight ride / Sethi alone (part day) | Storms add | Bot won | Nubt's siege replayed: Earth / Brick Ramp |
|---|---|---|---|---|---|---|---|
| Rusher | 23 to 28 | 549 to 856 | 796 to 969 (×1.10 to 1.45) | 5 / 6 | 0 to 1 day | 1 of 24 (part day 50) | 13 to 100% / 11 to 100% |
| Steady | 28 to 32 | 483 to 1932 | 969 (×0.50 to 2.01) | 5 / 6 | 0 to 1 day | 0 of 24 | 100% / 27% |
| Careful | 34 | 662 to 802 | 969 (×1.21 to 1.46) | 4 / 6 | 0 to 1 day | 0 of 24 | 100% / 11 to 17% |

Of the 72 runs, 1 won, 48 lost (mostly Sethi beating the bot's hero in the field, or storming a town it left), 23 stalled at 60 days. The race and the storms are on target; Sethi opens at ×1.1 to 1.5 (a little under the ×1.35 to 1.7 asked for with the 0.6 head start); a Brick Ramp makes Nubt's siege cost 11 to 27%, but the bot never buys one (Nekhen's Workshop is two days back) and storms Nubt with its Earth Ramp, which loses. Still to try: the bot buying the Brick Ramp before the siege, and a bot that keeps out of Sethi's reach (he catches it in the open sand).

**Calibration on chapter 1 (coordinator, Nov 8).** The same `wise` bot, with two more moves (before riding at the goal's walls it rides to a Workshop or Blacksmith of ours selling a better machine than its own; it never ends a day within a day's ride of the rival when he is 1.3 times stronger, falling back on its nearest town), plays the Black Banner under today's rules, ridden on from Ashford and Thornwood (`test/blackBannerBalance.test.ts`, only with BALANCE_SEEDS), and the Red Land again. 24 seeds × 3 styles, 60 days:

| | Black Banner (Kassander at ride-on) | Won / lost / stalled | Red Land (Sethi at ride-on) | Won / lost / stalled |
|---|---|---|---|---|
| Rusher | ×0.76 to 2.26 | 0 / 9 / 15 | ×1.10 to 1.45 | 0 / 10 / 14 |
| Steady | ×1.18 to 1.81 | 0 / 15 / 9 | ×0.50 to 2.01 | 0 / 3 / 21 |
| Careful | ×1.10 to 1.47 | 0 / 15 / 9 | ×1.21 to 1.46 | 0 / 11 / 13 |
| All 72 | | **0 / 39 / 33** | | **0 / 24 / 48** |

So the bot doesn't win the Black Banner either since the Nov 8 hardening (its "all won" table is from Nov 4): the bot's tempo, not the Red Land, is what loses. By this measure the Red Land is no harder than the Black Banner (fewer losses, more stalls), so nothing was changed to close a gap. The race (rider part day 4 to 5, Sethi 6) and the storms (0 to 1 day) hold. No run got strong enough to ride at Nubt, so the new machine stop never bought a Brick Ramp in these runs. The Red Land's target is now "about the Black Banner's numbers" (coordinator), and it meets that. Making either part winnable by this bot is a bot question (it hires too slowly and stalls behind walls), not a map one.

**Not met yet: the bot doesn't win the part** (before the coordinator's levers:) In 24 runs (8 seeds × 3 styles, `wise` bot: hires where the purse can buy a tenth of its army early in a week, keeps its two lowest lines as each town's garrison, keeps 6000 gold for hiring before building, falls back on a town when Sethi is near and strong, rides at Nubt while he is away, retakes towns and hunts him) none won in 60 days: 10 lost (Sethi beat the hero in the field or took the last town), the rest stalled. Why: Nubt hires its weekly growth into its garrison whenever Sethi is out (Kassander's rule, 3000 gold kept), so its garrison grows by roughly 500 to 800 a week and passes 5000 by part day 50, while the bot's army grows only when it rides the two days back to Nekhen. The levers left: Nubt's garrison hiring (a cap, or only while he is home), Sethi's head start for this part, Nubt's dwellings, or a bot that lives off Gebtu's and Nubt's dwellings once taken. Needs the user's call before more tuning.

**Sethi on the lord mind (Nov 9), kept.** The trial the Delta's design asks for (`rival.mind: 'lord'` on `red-land`, our side played by the lord mind as on Othrys, `test/redLandLordBalance.test.ts`, BALANCE_SEEDS=16, 70 days; ridden on: the bot plays Nekhen and Abu). Our side wins **24 of 32 (75%)**, so Sethi is a lord now.

| Start | Won / lost / stalled | Won on part day | First strike (part day) | Gebtu ours/his (day) |
|---|---|---|---|---|
| Fresh | 10 / 1 / 5 of 16 | 34 to 68 | 5 to 26 | 16/0 (2) |
| Ridden on (16 of 16 won Abu) | 14 / 0 / 2 of 16 | 19 to 66 | 9 to 25 | 2/14 (6 to 7) |

- **What Egypt needed of the mind:** nothing for the ramps (the Workshop is the `blacksmith` id, `soldOn` sells Egypt's machines), the sieges (the player's own `battleSides`), the storms (paths read `terrainView`) or the race (`race` towns, from the 4th day). Captains come from the kemet roster (Weni, Nebet, Ahmose…); with an empty roster a lord simply hires none. Two fixes, for every lord: a town with a hero of theirs inside is no longer shut to him (the hero is counted in its strength, not as "near"; it deadlocked the Delta), and the House of the Benben is worth what the Titans' forge is (`FORGES` in `lord/targets.ts`).
- **Tuned by measurement:** Sethi's purse 6000 → **4000 gold** (6000: his first night opens him at ×1.92 a rider, over the ×1.8 the probe allows; 1000: 66%, 3000: 88%, 4000: 36 of 48, 75%). He takes Nubt's garrison along on his first day, so he opens at 1076 against riders of 502 to 840 (×1.3 to 2.1). `headStart` stays for the old rules only. **Played fresh**, Nekhen stands as a rider leaves it (the bot's Nekhen at ride-on: halls to City Hall, Citadel, lines 1 to 4 and their upgrades, the House of Life, Workshop, Marketplace, Storehouse), the old land's mines fly our banner, and the purse is 14,000 (a rider's): bare, fresh lost 0 of 8; built 3 of 8, mines 3 of 8, both 13 of 16.
- **The probes** (`redLandBalance.test.ts`): Sethi is measured after his first night (×1.6 a rider on the mean, under ×1.3 once the rider hires at Abu); the race and the storms stand. Taken by a lord, Gebtu's card says "Sethi's banner flies over Gebtu now" (`lord/news.ts`). Nubt's garrison still grows from idle gold only to 1.5 times the map's (the lord's own cap), tested with no captains to ride off with it.
- **Open:** a person's playtest; in the AI runs the ridden-on race goes to Sethi on day 6 to 7 (our lord mind hires at Abu first), while the straight-ride probe still wins it.

### Finishing chapter 2 (designed Nov 9; user: "more heroes in chapter 2 and align with the changes we made in chapter 1 to complete it")

Chapter 1 got a fourth part, Othrys, that finishes the Greek city, a roster of ten Greek heroes, and a lord AI. Chapter 2 gets the same. **Chapter 2 has four parts**: Nekhen 1, Abu 2, the Red Land 3, and the new **part 4, the Delta**. Its Taverns, units and rival follow chapter 1's rules.

**Still closed in Egypt's tree after the Red Land:** Capitol, Avenue and Court of the Sphinxes (`tiltyard2`, `tiltyard3`), the Valley Tomb (`monastery3`), and the Bennu's three (`seraphSpire`, `seraphSpire2`, `seraphSpire3`). Part 4 opens all of them (`TWO_LANDS_UNLOCKS[3]`). The town art for all of them is already drawn (`src/art/pixel/town-kemet/`).

**Level 3 traits.** Each level-3 unit gets one trait of its own, as the Greeks' do. The Shardana Guard, the Bowman of Ta-Seti, the Hand of Anubis and the Bennu of Ra already have theirs. New:
- **Chariot of Horus:** scythed wheels: strikes every enemy beside it (`cleave`).
- **Great Sphinx:** the riddle: a strike that lands may turn its target to stone, 20% (`petrify`).
- **Pharaoh's Mummy:** rewrapped: heals 10 HP at the start of its turn (`regen`, as the Hydra's).

**Units bigger than two hexes (user, Nov 9).** Some units' pictures are wider than the hexes they fill: the Serpent of Apep coils over about three hexes, and the chariots' horses and car pass the second hex. So a unit can now fill **one, two or three hexes** in a row. It uses the same rules as two: it moves, is struck and shoots by any of its hexes, and it needs a free row of three to stand. Each wide unit's size is set from its picture's ground footprint. A unit whose body is wider than about 2.5 hexes takes three. Apep and Ammit take three. The chariots and any others take three if their pictures measure so. This applies to both peoples and to neutrals, and every chapter's balance tests must still pass.

*As built (Nov 9).* `hexes?: 1 | 2 | 3` on the creature def (`wide` still means 2; `sizeOf` in creatures.ts). footprint.ts gives a unit's hexes head first, the body behind it in the row, never wrapping; hex.ts's `reachable`/`route` take the whole body, so walkers need every hex free at each step and flyers on landing. A tap on any hex of the body moves it there (`headsOver`: that hex as the head, then as the middle, then the last). Strikes, answers, cleave, shot distance, the shooter's "enemy beside me", the moat and a swooper's way home all go by every hex. The head lines up two columns in, the last hex on the edge column; behind the walls a three-hex defender whose row runs into a corner tower (rows 0 and 10) stands a row in (`startHex`). Three-hex units never man a tower. The battle scene lights all three hexes, and moves the sprite's feet under the body's middle (its idle strip's alpha bounds, measured in the scene), so it sits evenly on the middle hex. The unit card shows no size, so it is unchanged. Tests: test/threeHexBattle.test.ts.

Measured from the idle and walk frames at the battle's 1:1 scale (a hex is 44 px wide): the median frame's alpha width, and the bottom third's (the ground).

| Unit | Width, hexes | Ground, hexes | Size |
|---|---|---|---|
| Ammit | 4.02 | 3.59 | 3 |
| Serpent of Apep | 3.95 | 3.95 | 3 |
| Petsuchos | 3.77 | 2.59 | 3 |
| Nile Crocodile | 3.07 | 2.86 | 3 |
| War, Royal Chariot, Chariot of Horus | 3.05 | 3.00–3.02 | 3 |
| Desert Lion | 2.91 | 2.64 | 3 |
| Lernaean Hydra | 2.45 | 1.91 | 2 |
| Gigas | 2.45 | 1.39 | 2 |
| Sphinx (all three) | 2.18–2.20 | 2.11–2.20 | 2 |
| Cataphract / Companion / Royal Companion | 2.16 / 2.05 / 2.00 | 1.86–2.05 | 2 |
| Erymanthian Boar | 2.09 | 1.80 | 2 |
| Wolf | 1.95 | 1.30 | 2 |
| Griffins | 1.91–1.95 | 1.61–1.77 | 2 |
| Centaurs | 1.64–1.68 | 1.34–1.39 | 2 |

Balance: every chapter's tests pass at the default seeds. One moved: Nekhen's steady bot on its first seed lost only 8% of its army to the three-hex Petsuchos (the test asks 10). With three hexes it walks into the levies' reach and dies before it strikes. Hit points (130–150), attack, defense and damage didn't change that seed. Speed 5 did. Over 12 seeds, goal fight lost: steady 12–25% (median 16.5; it was 11–25, 18), rush 18–71% (median 42; it was 20–81, 31.5). The one-hex Titans, Catapults, Basilisk and Hyena draw wider than two hexes with wings, arms or tails, but their ground is under two; they stay one hex.

### The Egyptian heroes

As the Greeks', ten heroes, five Knights and five Clerics. Each has a face and a mounted figure, starting stats, skills, a starting army and a specialty (`src/logic/roster/kemet.ts`):

| Hero | Class | Specialty | Starts with | Who |
|---|---|---|---|---|
| Paser | Knight | Chariots (line 4) | Offense | The chariot captain (campaign hero) |
| Sethi | Knight | Jackals (line 3) | Offense | Set's lord at Nubt (rival, part 3) |
| Apepi | Knight | Sphinxes (line 6) | Offense, Leadership | The Hyksos king at Avaris (rival, part 4) |
| Weni | Knight | Levies (line 1) | Leadership | The old general who raised the levies of every nome |
| Ahmose | Knight | Archers (line 2) | Archery | The marine, son of Ebana, who fought at Avaris |
| Neferet | Cleric | Ward of Isis: it soaks 50% more | Wisdom | Isis's priestess (campaign hero) |
| Imhotep | Cleric | Rite of Osiris: it brings back 50% more | Wisdom, Mysticism | The builder of the first pyramid, the healer |
| Tiye | Cleric | Curse of Set: it lasts a round more per 5 levels | Wisdom | The great royal wife, wise in the court's ways |
| Khaemwaset | Cleric | Mummies (line 5) | Wisdom | The prince-priest who restored the old tombs |
| Nebet | Cleric | Gold: +350 gold a day | Wisdom, Logistics | The first woman to be vizier |

Same rules as the Greeks' roster. A hero is in play at most once, and a story hero is never offered while in play. Paser stays the part-6 hire, as told. **From the Red Land on, chapter 2's Taverns offer a choice of two from this roster**, for both sides. A rival lord hires his captains from it.

**As built (Nov 9, ROSTER).** `src/logic/roster/kemet.ts` holds the ten, behind `ROSTERS.kemet`, all `faction: 'kemet'` with Egyptian armies. Neferet is now `NEFERET` in `src/level/recruits.ts` (Nekhen spreads it, so the numbers are one), Paser is `PASER` with the Chariot specialty, Sethi's roster entry takes the Red Land's Attack and Defense with a smaller army and no ramp. Clerics carry a Novice's Papyrus and one spell: Imhotep the Rite (with 2 Ankhs), Tiye the Curse, Khaemwaset the Ward (and a Mummy), Nebet the Ward. **Spell specialties** (`specialty.ts`, `SpecialtySpell` now also `ward`, `rebirth`, `curse`): Ward soaks and the Rite brings back 50% more (through `spellShare`, so `spellAmount` and the ward's `left` carry it). A Curse is timed (Spell Power rounds, like Slow), so the Curse specialist's `extraRounds` adds 1 round per 5 levels, as Slow's. Their one-line texts show on the hero sheet and Tavern card, with the spell's icon as stand-in. The Mummies line and Nebet's gold use the existing kinds. Skills: every one named exists, nothing is missing. **Taverns:** `RED_LAND` no longer has `recruits` (Abu keeps Paser), so its Taverns offer two from the roster to both sides; Sethi (and Apepi, once the Delta stands) are barred from ours as story villains, Neferet is in play. **The Delta must also leave `recruits` out** (CITY). Hero art: `heroArtId` falls back for an Egyptian to Neferet (Cleric) or Paser, then Sethi (Knight), then the Greek stand-ins, until `HERO_ART.<id>` lands.

### Part 4: The Delta (the chapter's last part)

**Story.** With Sethi beaten the south is one. But the north is not. **Apepi**, a king of the Hyksos, the foreign rulers who came over Sinai with horses and took Egypt's gods as their own, rules the Delta from **Avaris**. He named himself after Apep, the serpent of chaos. He rides for **Iunu**, the city of the sun, where the Benben stone stands, the hill the Bennu first landed on. Whoever holds the Benben has the Bennu's flight. The two crowns can only be one if the Delta is too.

**Win:** `overthrow`, Avaris taken and every hero of Apepi's beaten. The chapter's ending, "Chapter 2 complete" and `twoLands-won` (adjusted to the Delta) move to this part's win. The Red Land's win becomes a part's end that rides on (`redLand-won`, new line).

**The land, free to explore, like Othrys.** It is the chapter's biggest part, joined to the land so that tiles of parts 1–3 keep their places. The Delta is the north. If it can't be placed north without moving tiles, it is placed where it fits, and the sea corner beside Nekhen can become its coast. It has **three ways in**, none forced, each guarded differently, and the `opening` shows only their first tiles. Its regions:
- **The marshes:** water, papyrus, islands, fords.
- **The fields:** green, farms, mines.
- **The desert edge:** the road from Sinai.
- **Iunu**, on a rise in the middle.

There are **two neutral towns**, **Men-nefer** (Memphis, the White Walls, a Fort and a hall) and **Per-Wadjet** (Buto, the cobra goddess's town in the marshes). Apepi races for them too. He holds **Avaris** (as Lykosoura: halls, Fort, Citadel, Tavern, Marketplace, House of Life 1, Workshop, lines 1–5 and the first upgrades of 1–4) and **Per-Bastet** (Bubastis, smaller, as Tegea).

**Sites**, as on Othrys:
- Two learning stones.
- **Outer dwellings:**
  - a **crocodile marsh** (Crocodiles, 4 a week)
  - **lion rocks** (Desert Lions, 3 a week)
  - **the House of the Benben** at Iunu. It is guarded by **Ammit**, and holding it makes 1 Bennu a week, so its owner gets Bennu before the Benben Stone.
- A **treasure tomb** (a mastaba: a strong guard and a big prize).
- Its gold-quality piece of gear, the **Crook and Flail**: Legendary, a fixed prize, as the Kronos Helm.

The rest follows Othrys: mines of every kind, piles, chests, a watchtower, a mercenary camp, stables, shrines, standing stones, and neutrals at the Red Land's top end and above. Par is about 45 days.

**New neutral: Ammit**, the Devourer (`ammit`), a crocodile's head on a lion's body and a hippo's hindquarters. Level 7, three hexes, Att 19, Def 17, damage 30–40, 220 HP, speed 7. **Devourer:** no one answers its strikes (`noRetaliation`). Growth 1, cost 3500.

**Apepi is a lord** (`rival.mind: 'lord'`), the same mind as Lykaon's, under the same rules, knowledge limits and balance targets.

**Sethi.** The Red Land's own balance never worked: the bot won 1 of 24. So the Red Land **tries the lord mind on Sethi**, measured with the lord AI playing our side, as Othrys was. It keeps the lord mind if our side wins 60–80%. If not, it keeps the tuned rules and the numbers are reported.

**Balance** as for Othrys: AI against AI on the real rules, fresh and ridden on through parts 1–3. Our side wins 60–80% within 70 days. Apepi raises the Benben Stone around part day 18–25. Ammit costs a strong army 25–40%.

**Art and words.**
- Hero art for Apepi and the five new roster heroes (Weni, Ahmose, Imhotep, Tiye, Khaemwaset, Nebet): six, since Apepi is one.
- The Ammit unit, three hexes wide.
- Map sprites `crocodileMarsh`, `lionRocks`, `benbenHouse`, `mastaba`.
- Avaris's map look `avaris`, as Nubt's.
- The part's menu vignette.
- Narration: `part-delta` and `redLand-won`, with `twoLands-won` adjusted (all recorded Nov 9).
- The design's headings for chapter 2's parts are renumbered 1–4 (first 5–7, then per chapter, user Nov 9).

### Part 4 as built: the Delta's land, sites and the chapter's end (Nov 9)

- **Numbering.** The Delta is chapter 2's part 4 ("Part 1 of 4" on the card; inside, `n` 8 and `last: 8`, campaign-wide, decide the chapter and the Workshop's wares). Since Nov 9 every chapter reads as parts 1, 2, 3, 4 (`partNumber`, `partsIn` in `maps.ts`). The Red Land's win tells `redLand-won` and rides on north. The chapter's ending and "Chapter 2 complete" move to the Delta's win; it has no `won` line of its own, and `twoLands-won` now tells Apepi's fall. `part-delta`, `redLand-won` and `twoLands-won` were recorded on Nov 9. Saves and wins are keyed by id: a Red Land left won rides on, and its recorded win opens the Delta (tested).
- **The city.** `TWO_LANDS_UNLOCKS[3]` opens the seven buildings; nothing of Egypt's is off on part 4. The Workshop adds nothing.
- **Level-3 traits.** Chariot of Horus `cleave`, Great Sphinx `petrify: 0.2`, Pharaoh's Mummy `regen: 10`. Each shows on the unit card and in the upgrade's new traits; the petrify line now gives its chance ("May turn its target to stone (20%)"). **Ammit** (`ammit`) as designed: `hexes: 3`, `noRetaliation`, its own art.
- **Sites.** New dwelling looks `crocodileMarsh` (Crocodiles, 4 a week), `lionRocks` (Desert Lions, 3), `benbenHouse` (1 Bennu, at 3000 gold and a gem). A bank has a look now, `keep` or `mastaba`: the hover, the card and the server's check name it ("Mastaba"; "The tomb stands empty"). **Crook and Flail** (`crookAndFlail`): weapon, Legendary, +3 Attack, +2 Defense, +1 morale; Ammit drops it, as the Gigantes drop the Helm of Kronos. Until ART lands them, the sprites borrow Othrys's (marsh and rocks the cyclops cave, the House the forge, the mastaba the keep), the vignette borrows Nekhen's, tinted green, the item icon the Helm's, and `avaris` falls back to Egypt's town.
- **The land** (`src/level/delta.ts`, 80 × 56, laid at (32, 0): 112 × 56). No room north without moving tiles, so it is an L round the land won so far: the old sea east of Nekhen and north of the Red Land, then on down east of the Red Land. Its hole is Abu's and the Red Land's tiles. The north edge is the sea coast. Regions: the **marshes** (the Nile in from the west, a west branch and an east branch to the sea, Per-Wadjet on its island, two fords and two bridges), the **fields** south of the river (Men-nefer), **Iunu** in the middle (a ring of mountains, a west and a north-east way up, the House of the Benben with 10 Ammits beside it), the **desert edge** in the east (Avaris, the desert road south to Per-Bastet, the road from Sinai). Ways in: from Nekhen's east desert past the White Walls (22 Desert Lions), up the Red Land's north wadi (45 Sand Raiders, the long road), out of Nubt's basin (34 Mummies, the short cut to Per-Bastet). Each alone reaches everything (tested). The opening shows only where each starts. 63 objects: 22 monster groups, 9 mines (every kind; 2 Apepi's), 3 dwellings, 2 learning stones, the mastaba (25 Royal Mummies; 6000 gold, 4 crystal, 4 gems and the Alexandrian Codex), 5 chests, 12 piles, 3 campfires, a watchtower, a camp, stables, a standing stone, two shrines (Ward of Isis, Thunderbolt). Neutrals 390–1080 in strength, Ammit about 1470. Par 45. Apepi's roads to the raced towns are guarded (75 Sand Raiders at the east bridge, 130 Hyenas on the field road).
- **Apepi** is `rival` with `mind: 'lord'`, Avaris and Per-Bastet his, look `avaris`. Played fresh, Neferet waits at the head of the north wadi with about what a rider brings, and Nekhen, Abu, Gebtu and Nubt are ours; Nekhen stands as a rider leaves it, and the old land's mines (Sethi's too) fly our banner (LORD, measured). No recruits of its own: our Taverns offer the roster, never Apepi or Sethi.
- **First guesses for LORD** (copied from Othrys, Greek lines to Egypt's): `DELTA_LAND.rival.hero.army` (40 Khopesh Warriors, 24 Medjay, 14 Sentinels, 7 Royal Chariots, 3 Mummies), `rival.purse` (10,000 gold, 20 wood and ore, 9 of each rare good), the garrisons of `avaris-town`, `per-bastet-town`, `men-nefer-town` and `per-wadjet-town`, `benben-ammit`'s count, the three ways' guards (`walls-lions`, `wadi-head-raiders`, `gate-mummies`) and the road guards (`bridge-raiders`, `field-road-hyenas`), each marked in the file. `src/logic/lord/targets.ts` still values only `titanForge` as the forge: the House of the Benben needs the same.
- **Left:** the art (ART); the three lines recorded.

**Balance (Nov 9), AI against AI** (`test/deltaBalance.test.ts`, BALANCE_SEEDS=16, 70 days; ridden on: the bot plays Nekhen and Abu, the lord mind the Red Land against Sethi, 14 of 16 won it; riders bring **4,000 to 19,600**, about 8,800 in the middle, against Othrys's 1,500 to 3,000):

| Start | Won / lost / stalled | Won on part day | Benben Stone, in the game (part day) | First strike (part day) | Men-nefer ours/his (day) | Per-Wadjet ours/his (day) |
|---|---|---|---|---|---|---|
| Fresh | 14 / 0 / 2 | 32 to 71 | 35 to 50 | 5 | 16/0 (3) | 16/0 (4) |
| Ridden on | 9 / 0 / 5 | 15 to 65 | 27 to 56 | 5 to 15 | 6/8 (3 to 9) | 2/12 (4 to 6) |

- **Our side wins 23 of 30 (77%)**: 88% fresh, 64% ridden on. On target on the whole.
- **The race, a straight ride against Apepi alone:** Men-nefer ours on part day 2 to 5, his on day 6; Per-Wadjet ours on day 2 to 6, his on day 4. Close (within 2 days, Men-nefer up to 4).
- **Ammit** (22 of them, our strongest hero, spells on): 24 to 34% of 7,400 to 8,200 at part day 20 (fresh, 10 seeds); the table above was run with 28, which cost 31 to 81%. 10 cost 2 to 9% of armies of 7,000 or more.
- **The Benben Stone:** Apepi left alone raises it on part day 13 to 15 (he takes our empty towns, so his gold grows fast); in the game, pressed, on day 27 to 56 or not at all. The target 18 to 25 sits between: a mind number (`SAVE_SHARE`), left for the playtest as on Othrys.
- **First strike:** part day 5 fresh (the old land's mines next to the Delta), 5 to 15 ridden on. A little early fresh.
- **Tuned:** Apepi's army ×3 (120 Khopesh Warriors, 72 Medjay, 42 Sentinels, 21 Royal Chariots, 9 Mummies; at CITY's 40/24/14/7/3 riders won 10 of 11 by day 34), Avaris's and Per-Bastet's garrisons ×2 (ridden on, ×2 won 14 of 18, ×3 11 of 18, ×3.5 5 of 11: the rest stalled, idle and threatened hiring making Avaris too strong to storm), Neferet's fresh army ×3.7 (406 Khopesh Warriors, 221 Medjay, 111 Jackals, 56 Chariots, 22 Mummies, about 8,250: ×3.0 won 1 of 12, ×3.6 7 of 12, ×3.8 15 of 16), Ammit 10 → 22. Played fresh, Nekhen stands as a rider leaves it and the old land's mines (Nubt's too, Sethi's before) are ours: as CITY had them, Apepi's purse got Nubt's gold and ore.
- **The lord mind, for Egypt:** the Benben Stone needs the Sphinx Terrace and the Temple of Osiris first, so a lord now builds the step on the way to his big goal before the plan's other buildings, out of the gold above his savings, and keeps its wood for it (`goalStep`, `keepFor` in `lord/build.ts`); before, Apepi spent the wood elsewhere and never raised it. He saves in his capital (`savingTown`: the town with most built), not in the first town of ours he takes. The House of the Benben is a forge (`FORGES`). A town with a hero of the other side inside is no longer shut to a lord (the deadlock that stalled most early Delta runs).
- **Chapter 1, re-run with these mind changes** (Othrys, 16 seeds): 20 of 31 (65%): 13/16 fresh, 7/15 ridden on (the doc's Nov 9 round: 11 of 15). The Seraph Spire in the game: part day 15 to 43 fresh, 16 to 55 ridden on. Saving in the first town (the old rule) gave 17 of 31. Not retuned.
- **Left:** a person's playtest; the Benben day; the fresh first strike. In the balance runs (paid maps not installed) our Taverns can offer Sethi, and Apepi hires Paser and Sethi as captains: `storyVillains` reads the installed parts (ROSTER's).

## The day card

The morning's card is an infographic, built from a report the night leaves on the prompt (older saves keep their text card): the totals with their icons; a bar per source of gold, each town by name, then gold mines and estates, measured against the biggest; the hero's face with the tiles to ride and a mana gauge; on the first day of a week, each town's fresh recruits as faces with counts, lowest level first so the columns line up, and that the wilds have grown; then the rival's news. On a short, wide screen it spreads into two columns.

## Narration

Decided with the user on Nov 8, 2026, after the Black Banner's part card ("it's too much text here, should we make voiceovers and play this in background like we did for inkmine?"): the story is heard, not read on cards that stop play. Ported from InkMine (docs/inkmine-design.md, "Narration"), without its journal, speakers' own voices or star map. The narrator is ElevenLabs' **David - British Storyteller** (voice `BNgbHR0DNeZixGQVzloa`, model eleven_v4), an old British storyteller, picked by the user (`src/narration/script.ts`).

**How it plays** (`src/scenes/NarratorScene.ts`, over every screen and kept through scene changes):
- **A part opens with a short card:** its brief (what the player needs) and the goal, and the story plays in the strip at the same time and goes on after the card closes (`MapDef.brief` and `MapDef.story`; `openingPrompt` in adventure.ts).
- **The strip** names the speaker (and the story's title), shows the subtitles (at most two lines of about 42 characters, the BBC's guideline, timed to the voice by their length), a thin line for how far through, and three icon buttons, drawn by script in the HUD's gilt (`dev/pixel/ui/make_voice_icons.py`, user Nov 8: the text » looked like plain text): pause (play to go on), skip to the end, and an open book for **Read**, which opens the full text on a card and holds the map (and the voice) while it's open. Where it sits: on the map at the bottom left beside the hero's panel when there's room (a laptop), with the status line lifted above it; else under the top bar and the date (a phone); in town under the Sound button, clear of the town strip; anywhere else under the corner buttons; over a card, at the foot (`src/scenes/narrator/stripLayout.ts`).
- **Other story moments have no card at all** while they're heard: a message prompt with a `line` plays in the strip instead of opening a card, and play goes on (`openPrompt` in cards.ts). A line is told only where its words are true: Korax taken while Kassander lives, Kassander fleeing with one town left, beaten with none, Eudora joining or lost; otherwise the old card with its own words.
- **One line at a time,** queued; a line already playing or queued isn't queued again. The music and effects dip to 40% under the voice (`SoundBoard.duck`; the voice has its own track).
- **The voice waits for the browser:** until the first click, tap or key has started sound (`SoundBoard.waitingForGesture`), the line waits at its first subtitle. While its recording is on the way it waits up to 4 s, then the subtitles go on at a reading pace and the voice joins where they are.
- **Narration off** (the Sound card's third switch, remembered), or a browser with no Web Audio: every story shows on its card as before (a part's card with the full story, then the goal) and nothing is fetched. Switched off mid-line, the line moves onto its card.
- **A line with no recording** falls back to its card, and in development the console says so once (`Narration: no recording for "<line>"`).
- **Loading:** a recording is fetched only when it's near, never in the game's loading: a few seconds after start and every 3 s after, the narrator fetches the next two lines (`src/narration/upcoming.ts`: the cards waiting, then what the part tells next). Recordings are kept as mp3 bytes and only the playing one is decoded.

**The lines** (`src/narration/lines.ts`, id → speaker, title and hand-written script; the subtitles and the cards are the script with its [tags] taken out):

| Line | When | Shown on a card when narrated |
|---|---|---|
| `part-ashford` | Part 1 opens | the brief and goal |
| `part-thornwood` | Part 2 opens | the brief and goal |
| `part-blackBanner` | Part 3 opens (recorded Nov 8) | the brief and goal |
| `eudora-joins` | Eudora opens its gates to Rowan | none |
| `eudora-lost` | Kassander reaches Eudora first (the night's card keeps a short note) | none |
| `kassander-flees` | Kassander leaves a lost battle, with one town to run to | none |
| `korax-taken` | Korax falls while Kassander rides | none |
| `kassander-beaten` | Kassander falls with no town left | none |
| `chapter-won` | the chapter's victory card | the victory card, without the story |
| `part-nekhen` | Chapter 2's part 1 opens (recorded Nov 9) | the brief and goal |
| `part-abu` | Part 2 opens: the flood comes, Abu, the ramp's lesson and Paser (recorded Nov 9) | the brief and goal |
| `abu-won` | Part 2 won: told on its victory card as the chapter rides on east (`MapDef.won`; recorded Nov 9) | the victory card, without the story |
| `part-redLand` | Part 3 opens: the Red Land, Sethi and Nubt, the race for Gebtu, Set's storms (recorded Nov 9) | the brief and goal |
| `twoLands-won` | Chapter 2's ending card (`CHAPTERS.twoLands.ending`; recorded Nov 9) | the ending card, without the story |

(`nekhen-won`, Nekhen's ending while it was the last part, was cut when Abu was built, Nov 8: no part of chapter 1 has a won line of its own between parts, and `part-abu` opens on the sluice swinging open. It was never recorded.)

**All 19 lines are recorded (Nov 9):** the last ten (`blackBanner-won`, `part-othrys`, `othrys-won`, and chapter 2's seven) in one take each, about 10,400 credits. The untouched takes are in `dev/narration-audition/raw/`; the game's copies are 64 kbps mono. `abu-won`, `othrys-won` and `redLand-won` dipped 5–6 dB in their quiet middles, so their game copies are evened out with ffmpeg `dynaudnorm=f=300:g=9:m=3:p=0.9` (now within ~4 dB).

**Writing a line:** lively tags (`[warm, storytelling]`, `[grim]`, `[wry]`…), "!" and "…", a change of mood every sentence or two, never [whispers]; the test checks those. `part-blackBanner`'s script must stay word for word what was recorded.

**The recordings** (`games/inkheroes/narration/<line>.mp3`, mono 64 kbps, loudness-normalized, bundled by Vite as their own files). `narration/lines.json` keeps, for each line, the words and the script the voice read, the voice, the model and when (`recorded: null` while still to record). `test/narration.test.ts` keeps CI green before everything is recorded and catches stale takes after:
- always fails on a recording no line tells, a recording whose words no longer match its script (punctuation, spacing and capitals don't count), lines.json out of step with the recordings, or an unrecorded line whose script changed since lines.json was written;
- lists the lines still to record (on stdout) but passes; with `NARRATION_REQUIRED=1` (for release) it fails while any is missing.

**To record** (in `games/inkheroes`):
1. `NARRATION_DUMP=1 npx vitest run test/narration.test.ts` brings `narration/lines.json` up to date and prints the lines still to record; each has `recorded: null` and its `script`.
2. In ElevenLabs, text to speech with voice `BNgbHR0DNeZixGQVzloa` (David - British Storyteller) on `eleven_v4`, paste the line's `script` exactly, tags and all, generate, and pick the best take. Download it as `<line>-raw.mp3`.
3. `ffmpeg -i <line>-raw.mp3 -ac 1 -af loudnorm=I=-17:TP=-1.5:LRA=11 -ar 44100 -b:a 64k narration/<line>.mp3`
4. `NARRATION_DUMP=1 npx vitest run test/narration.test.ts` again: it marks the new files recorded with the date.
5. `npx vitest run` and play the part to hear it.

To record a line again after its words change: change its script in `lines.ts`, delete its mp3, and follow the steps. A new line needs an id in `LineId`, a script in `LINES`, a place where the game tells it (`toldPrompt(id)`, a map's `story`, or `narrator(scene)?.say(id)`), and a place in `upcoming.ts` if it should be fetched ahead.

## Controls

- **Map:** tap a tile to plan a path, tap it again to go. Tap another of your heroes to pick them (beside the picked one: to meet and trade), or tap their face in the HUD. Drag to pan; wheel or pinch to zoom (one whole step either way). Space or End day ends the day. T opens the town; tapping the hero's face brings the view back to the hero. A tap anywhere on the picture of a town of yours opens it at once, whichever hero is picked (unless a ride to its gate is already planned: then it rides); in the town, "Ride here" sends the picked hero there when they are away.
- **Battle:** tap a lit hex to move; tap an enemy to attack it (the side of the enemy you tap is where your unit strikes from; on touch, a first tap shows the damage, a second strikes). W waits, D defends, C opens the spellbook.
- **Pause:** Esc or the ❚❚ button.

## Building status

Oct 24, 2026 (first session): the rules are built and tested (`games/inkheroes/src/logic/`, 36 tests): battles, heroes, the map, towns, saving. Map 1 (Ashford) plays end to end: map → battle → town → victory. Creature, hero and site drawings were made by parallel art passes. Maps 2–3, the rival AI and the website listing are next.

Oct 24 (second session): the town screen is a painted townscape like H3's (`src/art/townscape/`, contract in `types.ts`): the ground is painted once and each building stands in its slot once built (hall, walls and guild upgrade in place), lights up and names itself under the pointer, and opens its panel when tapped (the hall the Build ledger, the walls and dwellings Recruit, the guild its spells). The armies, purse and buttons sit in a strip below. The townscape is painted the first time a town opens. The menu has a painted vista, a title banner and a vignette on each map card (`src/art/menu/`). Preview the art with `dev/art.html` (`?town=start|all`, `?pieces=all`, `?menu=all`).

Oct 24 (third session): the town fills the screen (drag sideways when it's wider than the screen) and its messages show on an ink banner above the strip. Every creature and the hero are animated: each drawer takes a pose (`src/art/creatures/types.ts`: idle 6 frames, walk 6, attack 5 with the blow on frame 2), painted through a rig of joints so the art is unchanged. Boot paints each figure standing; a map paints its figures' idle loops and the hero's gallop, a battle its fighters' poses. `FigureAnim` (scenes/figureAnim.ts) plays them; `gait.ts` adds a light lean and dust on top, and lifts flyers along their arc. Melee blows and shots land on the attack's strike frame; arrows and orbs leave from the points the bowman and monk paintings export. Check the frames with `dev/specimens.html?poses&only=<id>`.

Oct 24 (fourth session): the whole game was repainted dark and serious after H3 (see Art direction). Figures are about 7 heads tall with stern faces, and the interface is leather and gilt in Cinzel and EB Garamond. The shared map ground lives in `src/art/terrainGround.ts` and `terrainBrush.ts`, with water, roads and peaks in their own files.

Nov 8: chapter 2's engine (steps 1–3 of "What the engine needs"): Egypt (`kemet`) with its 21 units, 5 desert neutrals, its building names and the Temple of Osiris, the six new traits, the Sacred Rites and Ankhs; towns and heroes carry a people, older saves load Greek. Art stands in until PixelLab's lands.

Nov 8 (later): step 4 and Nekhen. Chapter 2, The Two Lands, is a second chapter on the menu, the full game's, fetched for owners only and saved in its own slot; its first part, Nekhen, is built and balanced (see "Part 1 as built"). Chapter 1's ending card points on to it. Its two narrated lines (`part-nekhen`, `nekhen-won`) are written and not recorded: their cards show the words meanwhile. Next: Abu and the Red Land (stitched on in `twoLands.ts`), and the art of step 5.

Nov 8 (night): the Red Land built (see "Part 3 as built"): Sethi, a rival lord of Egypt (the rival buys machines at his Workshop and storms walled towns as sieges), the race for Gebtu, Set's sandstorms (`stormEvery`), the Serpent of Apep and its cobra brood over the Ramp of the Pyramid Builders, the land stitched east of Abu (80 × 56), the Brick Ramp on sale, paid maps with a rival validated, and the chapter's end ("Chapter 2 complete", one card for both chapters; `abu-won` a part's end again). Probes met; **the part bot doesn't win it yet** (Nubt's garrison outgrows it): balance waits for the user. `part-redLand` and `twoLands-won` written, not recorded.

Nov 8 (evening): Abu built and balanced (see "Part 2 as built"): Egypt's siege ramp (three grades, chosen stretch, growth, done = walked over and the moat filled), poison on shots, the Spitting Cobra and Desert Lion, Paser at the Tavern, the gray Scale set, Abu stitched south of Nekhen with its opening, the Workshop's ramps, and the lesson in the ramp's words. Its two narrated lines (`part-abu`, `abu-won`) are written and not recorded. Next: the Red Land (a rival lord, the Brick Ramp on sale), and Egypt's art.

## Saving

The adventure is saved in localStorage after every action, and a copy is kept at the start of each day (so a lost battle can replay the day). Progress (maps won, blots) is saved and merged like the other games. **Each chapter has its own game (Nov 8):** chapter 1's stays at `inkheroes.adventure.v1`, so every older save loads unchanged; chapter 2's is `inkheroes.adventure.twoLands.v1` (`ChapterDef.slot` in `src/level/maps.ts`, `adventureKey` in save.ts). A save is only opened with its own chapter's maps, so neither chapter can load the other's game, and a chapter-2 save on a device without the full game is kept, unread, until the maps come.

## Items, the hero sheet and several heroes (planned, user Nov 4)

Built in three stages: the hero sheet, then items, then several heroes. Stage 1's sheet opens from the hero panel on the map (as H3's hero screen): stats, skills, spells, experience and army. Companies are managed the same way on the sheet and in a town: drag one or tap it then a slot to move it (like units merge, others swap), and Split on a picked company opens a slider; the new company stays picked so a tap sends it on. Army portraits are a bigger 1:1 cut of the art, never scaled, sized to the screen (`src/scenes/hud/armySlots.ts`, `src/scenes/town/stripLayout.ts`), up to 60 px.

**Slots: 13, and a small bag that grows (user, Nov 8).** Armor is always part of a set: helm, cuirass, bracers, belt, greaves, boots. Never in a set: weapon, shield, amulet, two rings, spellbook, war machine. A piece's grade shows in the colour of its frame, and in words as Common, Uncommon, Rare, Epic and Legendary. Layout as a classic RPG's paper doll (body in the centre, slots round it, bag below).

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

**Towns come one at a time (user, Nov 4).** Thornwood falls on map 2's last move, so a second town handed over on riding on made two new towns at once. Ridden on into, Eudora holds out as an ally until Rowan reaches it (the trail south takes days), then opens its gates with no fight and its garrison joins him. Since Nov 8 Kassander races Rowan for it from the part's third night (the race above). Played fresh, map 3 still starts in Eudora.

**The Mage Guild is a room (user, Nov 4; `src/scenes/town/guildRoom.ts`).** After Heroes III's: a painted library shown 1:1 and never scaled (768 × 340, cropped on smaller screens), each floor's spells as 64 px paintings with their names (`dev/pixel/ui/spells64/`; the battle's spellbook keeps its 24 px icons), the picked spell read out underneath with its level, mana, effect and whether the hero knows it, and on a stand the book the guild sells, the item itself in its grade's frame, always (user: the guild shows what it sells, never the hero's own book). Buy appears only when a hero without a book is in town. Small screens get smaller tiles only when they must (`guildLayout.ts`).

**Map 2's balance (user, Nov 4).** A chapter is one land, so map 2 is tuned to the army that rides in from map 1 (strength about 1,000: 116 units after three weeks' hiring), not only to a fresh start. Such an army loses about 0.4% a fight in the west and 3% in the east, about 35% over all 23 groups, then about 22% to Thornwood's garrison, so the goal is the real test. A weaker one has to keep building first. Five to fifteen percent a fight was tried and rejected: it needs groups up to 16 times the size, 166 satyrs, and would wipe an army out several times over. Map 3 still has its old numbers.

**Built so far (Nov 4): the gray Bronze set on map 1.** Rowan is a fighter, so map 1 holds one set, and fixed drops so every player meets it the same way: Goblins, Bronze Helm (+1 Defense); Pit wolves, War Sandals (+1 Attack); Graveyard, Bronze Bracers (+1 Attack); Glade wolves, War Belt (+1 Morale); Mill goblins, Bronze Greaves (+1 Defense); the ogres, Bronze Cuirass (+1 Defense), which rides on to map 2. A new piece goes on at once in an empty slot, else into the bag; a full bag leaves it behind. Planned next: weapons, and the gray Leather set. Gear changes the four stats, morale, luck, sight and travel in `src/logic/items.ts`; a stack of travel starts the next morning. The sheet is two tabs on every screen (Hero, Gear), so the gear can be drawn at double size; only the smallest screens fall back to single size (`src/scenes/hud/gearLayout.ts`).

**Bags, the Storehouse and handing gear over (user, Nov 8).** A hero carries spare pieces in a Leather Satchel of 4; a town's Storehouse sells Saddlebags (8, 750 gold) and its Treasury a Pack Mule (12, 2000 gold), per hero (`BAGS` in `items.ts`, `BAG_SHOP` in `storage.ts`). The Gear tab shows the places a bigger bag would add, faint, and says where to buy one. Each town keeps its own store (user's choice over one shared store): the Storehouse holds 8 pieces, the Treasury 20, open to whichever of our heroes stands in the town, garrison or gate. Its room (`src/scenes/town/storeRoom.ts`, the painted storeroom behind) shows the store, then each hero in town with their bag and the next bag for sale; a tap picks a piece and a tap on the other side sends it, into the store, into a bag, or from one hero to the other; a piece handed to a hero with that slot empty is put on at once, and the room says so. Heroes who meet on the map hand pieces over the same way on the meeting card, each bag under its army (`cantGive`/`giveItem`: side by side or in the same town). A drop that a full bag has no room for lies on the ground where the monster stood (an `item` object, drawn as its icon), and is picked up like any site once there is room; it is never lost. Saves from when every bag held 20 get a bag big enough for what they carried. The Storehouse opens on map 2 with the second hero, the Treasury on map 3.

**The gray Linen set (user, Nov 8): the priestess's gear.** Ianthe joins on map 2, so map 2 holds the second gray set, west of the river where she is hired: the meadow satyrs leave the Linen Hood (+1 Knowledge), the copse wolves the Temple Sandals (+1 Knowledge), the swamp dead the Linen Leggings (+1 Knowledge), the pit brigands the Cord Sash (+1 Luck), the road boars the Linen Armbands (+1 Spell Power), and the bridge wolves the Linen Chiton (+1 Spell Power). Whoever wins one gets it; Rowan, already in Bronze, carries it until it's handed over.

**Items last the chapter.** They carry from map to map within it. The next chapter is another faction with a fresh hero: items and progress don't carry over.

**Legendary (gold) items: not in the first run.** Hidden on the map, so finding one takes time and resources: a puzzle leads to the place (it can almost never be found by accident), an action there unlocks it, and a strong enemy has to be beaten for the piece.

**Several heroes** start on **map 2**: the land jumps from 32 × 24 to 72 × 32, home is 40 tiles behind and a hero rides about 15 a day, and the player has learned to run two before the rival on map 3. Two heroes who meet exchange items and troops.

**The second hero (built Nov 8, user asked for hiring).** From part 2 (Thornwood) any Tavern of ours hires **Ianthe**, a Cleric and priestess of Athena (Attack 1, Defense 1, Power 2, Knowledge 2, basic Wisdom, Novice's Spellbook with Bless and Healing, 15 Hoplites and 8 Slingers), for 2500 gold, once. Map 1 has no one to hire: one hero is the whole lesson there. She appears in the town, in its gate (the visiting place), and is picked at once. **A town has two places for heroes, as Heroes III's (user, Nov 8):** the garrison (a hero whose companies all stand in the garrison row) and the gate (a visiting hero with their own army); both stand on the town's tile, and the one in the garrison isn't drawn on the map. Hiring needs the gate free: a hero standing in it moves into the garrison or rides out first, and the Tavern says so. With a hero in each place, moving one to the other row swaps them, the garrison's companies riding out with the one leaving it (`swapTownHeroes`). Each hero's face heads their row in the town strip, and tapping a face twice opens that hero's sheet. Thornwood's intro says she waits. The picked hero is `adv.hero` and the others wait in `adv.others` (`src/logic/heroes.ts`), so every rule about "the hero" works on whichever is picked. All heroes rest at night. Walking into another of ours is a meeting: the two trade companies (each must keep one) and gear. Kassander goes for whichever hero is weak, and the fight is played with that one picked; a town's defence counts every hero of ours within 12 tiles. A hero who loses a battle while another still rides is gone, army and gear; the last one falling loses the map, as before. The list is per map (`MapDef.recruits`), so later chapters can offer more.

**Screens for the second hero (Nov 8).** The Tavern is a room like the Blacksmith (`src/scenes/town/tavernRoom.ts`): the hero for hire standing in their battle art (on a narrow screen their face), name, class, a line about them, the four stats, what they know, the army they bring, and Hire with the price, or why not (dimmed without the gold). The tavern building in the townscape opens it too. Hired with another hero in the gate, the town keeps serving that one and the new hero is picked on leaving; opening a town where a hero of ours stands in the gate, while the picked one is elsewhere, picks that hero. On the map every hero of ours has a figure (`HERO_ART[id]`, falling back to Rowan's); the picked one rides. Tapping another of ours picks them and centres on them; tapping one beside the picked hero (or with a path planned to them) rides over to meet them. The HUD shows a face per hero above the panel's left edge once there are two (the picked one framed in gold, a bar of travel left under each); a tap picks. Meeting opens the trade card (`src/scenes/hud/pixelTradeCard.ts`): both heroes' faces and armies, companies moved, merged, swapped and split as on the sheet and in a town, All to <the other> (each keeps its first company), a refused move saying the hero must keep one. The end-day check asks while any hero can still move.

**The rival is a player like any other.** It wears items, finds them, hires heroes, and a beaten rival drops one. Keep a side's state (heroes, purse, towns) the same for every side and every action a pure function of a side, so multiplayer can be added later. Nothing is built for multiplayer now.

## Not yet

Tactics, random maps.
