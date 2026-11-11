import { EIRIK, GUNNHILD, HERVOR } from '../logic/roster/norse';
import type { HeroDef, MapDef } from './types';
import { LONG_WINTER_UNLOCKS, lockedIn } from './unlocks';

/**
 * Chapter 3, part 4: Halogaland, the far north where the sun no longer
 * rises (in its own tiles, 40 × 54; longWinter.ts lays it east of Hladir
 * and Uppsala, over the sea there, and north of the Bloodaxe's Kaupang: the
 * land won so far is its west). Gunnhild, Mother of Kings, sings the winter
 * from Bjarkoy, her island in the north-east, and Steigen, in its basin in
 * the south-east; Eirik Bloodaxe rides for her if he lived. The chapter's
 * last part, and its freest, as Othrys and the Delta are: three ways in over
 * the frozen sound (from Hladir, from Uppsala, up the ice from Kaupang's
 * bay), none forced; two neutral towns to race for (Trondenes in the north,
 * Vagar in the south); Mimir's Well at a root of the world tree, where Skoll
 * waits; Angantyr's barrow on the north-west headland, where the draugr
 * keep Tyrfing; the Ram of the Sea-Kings at the old boat sheds on the shore;
 * outer dwellings (a boar pen, a dragon's hoard), learning stones, an Arena,
 * a treasure barrow, and the rest of the Norse town to build.
 * Part of the full game: never imported by the game's client code (it is
 * served from content/paid.ts to owners).
 */

/** A map's hero carries no specialty (the paid maps' check, validate.ts, keeps none): the roster gives it by the hero's id. */
const plain = ({ specialty: _specialty, ...h }: HeroDef): HeroDef => h;

export const HALOGALAND_LAND: MapDef = {
  id: 'halogaland',
  name: 'Halogaland',
  n: 12,
  brief: 'Three ways north over the frozen sound: from Hladir, from Uppsala, up the ice from Kaupang. Gunnhild sings the winter from Bjarkoy and Steigen. Race her for Trondenes and Vagar, then take her towns and beat her: her captains leave with her.',
  story: 'part-halogaland',
  goal: { kind: 'overthrow', target: 'bjarkoy-town', text: 'take Bjarkoy and Steigen, and beat Gunnhild' },
  parDays: 45,
  rows: [
    'NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN',
    'iiiinnNNNNNNNNNNNNNNNNNNNNNnnnnnnnnnnnnN',
    'iiiinnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnN',
    'iiiin=nppppnnpppnnnpppppnnniiiiiiiiiiiiN',
    'iiiin=nppppnnpppnnnpppppnnniiiiiiiiiiiiN',
    'iiiin=nppppnnnnnnnnpppppnnniiinnnnnnnniN',
    'iiiin=NNNNNNNnnnnnnpppppnnniiinnnnnnnniN',
    'iiiin=NnnnnnNnnnnnnnnnnnnnniiinnnnnnnniN',
    'iiiin=NnnnnnnpppnnnnnnnnnnniiinnnnnnnniN',
    'iiiin=NnnnnnNpppnnnnnnnnnnniiinnnnnnnniN',
    'iiiin=NNNNNNNpppnnnnnnnnnn=====nnnnnnniN',
    'iiiin=nnnnnnnnnnnnnnnnnnnn=iiinnnnnnnniN',
    'iiiin=nnnnnppnnnnnnnnnnnnn=iiinnnnnnnniN',
    'iiiin=nnnnnppnnnnxnnnnnnnn=iiinnnnnnnniN',
    'iiiin======================iiinnnnnnnniN',
    'iiiin=nnnnn=nnnnnnnnnnnnxn=iiiiiiiiiiiiN',
    'iiiin=nnxnn=nnnnnnnnnnnnnn=iiiiiiiiiiiiN',
    'iiiin=nnnnn=nnnnnnnnnnnnnn=nnnnnnnnnnnnN',
    'iiiin=nnnnn=nnnnnnnnnnnnnn=nnnnnnnnnnnnN',
    'iiiin=NNNNN=NnNNnnnnnnnnnn=NNNNnnNNNNNNN',
    'iiiin=NNNNN=NnNNnnnnnnnnnn=nnnnnnNNNNNNN',
    'iiiin=nnnnn=nnnnnnnnnnnnnn=nnnpppnnnnnnN',
    'iiiin=nnnnnnnnnnNNNNNNNNNN=nnnpppnnnnnnN',
    'iiiin=ppppnnnnnnNnnnnnnnnN=nnnnnnnnnnnnN',
    'iiiin=ppppnnnnnnNnnnnnnnnN=pppnnnnnnnnnN',
    'iiiin=ppppnnnnnnNnnnnnnnnN=pppnnnnnnnnnN',
    'iiiin=ppppnnnnnnNnnnnnnnnN=nnnnnnnppppnN',
    'iiiin=nnnnnnnnnnNnnnnnnnnN=nnnnnnnppppnN',
    'iiiin=nnnnnnnnnnNnnnnnnnnN=nnnnnnnppppnN',
    'iiiin=nnnnnnnnnn=nnnnnnnnN=nnnnnnnppppnN',
    'iiiin=nnnnnnnnnn=nnnnnnnnN=nnnnnnnnnnnnN',
    'iiiin=nnnnnnnnnn=NNNNNNNNN=nnnnnnnnnnnnN',
    'iiiin=nnnnn======nnnnnnnnn=nnnnnnnnnnnnN',
    'iiiin=nnnnnnnnnnnnnnnnnnnn=nNNNNNnNNNNNN',
    'iiiin=nnnnnnnnnnnnnnnnnnnn=nNnnnnnnnnnnN',
    'iiiin=nnnnppppnnnnnnpppppn=nNnnnnnnnnnnN',
    'iiiin=nnnnppppnnnnnnpppppn=nNnnnnnnnnnnN',
    'iiiin=pppnppppnnnnnnnnnnnn=nNnnnnnnnxnnN',
    'iiiin=pppnnnNNNNnnnnnnxnnn=nNnnnn=nnnnnN',
    'iiiin=pppnnnNNNNnnnnnnnnnn=nNnnnn=nnnnnN',
    'iiiin=nnnxnnnnnnnnnnnnnnnn=nNnnnn=nnnnnN',
    'iiiin=nnnnnnnnnnnnnnnnnnnn=nNpppn=nnnnnN',
    'iiiin=============================nnnnnN',
    'iiiin=nnnnnnnnnnnNNNnnnnnnnnNpppnnnnnnnN',
    'iiiin=nnnnnnnnxnnNNNnnnnnnnnNnnnnnnpppnN',
    'iiiin=nnnnnnnnnnnnnnnnnnnnnnNnnnnnnpppnN',
    'iiiin=pppnnnnnnnnnnnnnnnnnnnNnnnnnnpppnN',
    'iiiin=pppnnnnnnnnnppppnnnnnnNNNNNNNNNNNN',
    'iiiin=pppnnnnnnnnnppppnnnnnnnnnnnnnnnnnN',
    'iiiin=pppnnnnnnnnnppppnnnnnnnnppppnnnnnN',
    'iiiin=nnnnnnnnnnnnppppnnnnxnnnppppnnnnnN',
    'iiiin=nnnppppppnnnnnnnNNNNNnnnppppnnnnnN',
    'iiiin=nnnppppppnnnnnnnNNNNNnnnnnnnnnnnnN',
    'iiiiiiNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN'
  ],
  // Played fresh, the chapter's home is Hladir (longWinter.ts); this is Trondenes, a neutral town both sides race for, by the north road.
  town: {
    id: 'trondenes-town', name: 'Trondenes', x: 8, y: 13, faction: 'norse',
    built: ['villageHall', 'townHall', 'fort', 'tavern', 'meadHall', 'guardhouse', 'archeryRange', 'barracks'],
    guild: ['tiwaz', 'isa', 'haste', 'thurisaz', 'slow'],
    // calibrated by the lord balance runs
    garrison: [{ creature: 'shieldmaiden', count: 50 }, { creature: 'hunter', count: 24 }, { creature: 'dwarf', count: 8 }],
  },
  towns: [
    // Vagar, the fishing market in the south, by the shore road from Kaupang's ice: raced too, from the part's third night.
    {
      id: 'vagar-town', name: 'Vagar', x: 14, y: 41, faction: 'norse', race: true,
      built: ['villageHall', 'townHall', 'fort', 'tavern', 'marketplace', 'blacksmith', 'guardhouse', 'archeryRange', 'griffinTower'],
      guild: ['tiwaz', 'isa', 'haste', 'thurisaz', 'slow'],
      // calibrated by the lord balance runs
      garrison: [{ creature: 'shieldmaiden', count: 40 }, { creature: 'hunter', count: 30 }, { creature: 'berserker', count: 10 }],
    },
    // Gunnhild's: Bjarkoy on its island, the capital (its huscarls stay behind its walls), and Steigen in its basin.
    {
      id: 'bjarkoy-town', name: 'Bjarkoy', x: 33, y: 10, owner: 'rival', faction: 'norse',
      built: ['villageHall', 'townHall', 'cityHall', 'fort', 'citadel', 'castle', 'tavern', 'marketplace', 'mageGuild1', 'mageGuild2', 'blacksmith', 'meadHall', 'storehouse', 'guardhouse', 'guardhouse2', 'archeryRange', 'archeryRange2', 'griffinTower', 'griffinTower2', 'barracks', 'barracks2', 'monastery'],
      guild: ['isa', 'tiwaz', 'slow', 'thurisaz', 'haste'],
      // calibrated by the lord balance runs
      garrison: [{ creature: 'shieldmaiden2', count: 50 }, { creature: 'hunter2', count: 30 }, { creature: 'berserker2', count: 14 }, { creature: 'dwarf2', count: 8 }, { creature: 'warBoar', count: 3 }],
    },
    {
      id: 'steigen-town', name: 'Steigen', x: 33, y: 38, owner: 'rival', faction: 'norse',
      built: ['villageHall', 'townHall', 'fort', 'tavern', 'meadHall', 'guardhouse', 'archeryRange', 'griffinTower', 'barracks'],
      guild: ['isa', 'tiwaz', 'slow'],
      // calibrated by the lord balance runs
      garrison: [{ creature: 'shieldmaiden', count: 40 }, { creature: 'hunter', count: 20 }, { creature: 'berserker', count: 8 }, { creature: 'dwarf', count: 4 }],
    },
  ],
  // Played fresh (nothing won before it), Hervor comes up the ice from Kaupang's bay with about what a rider brings from the Bloodaxe (longWinter.ts places her).
  hero: {
    ...plain(HERVOR), x: 5, y: 51,
    attack: 6, defense: 4, power: 3, knowledge: 3, skills: { offense: 2, leadership: 1 }, spells: ['tiwaz', 'haste', 'isa', 'thurisaz'],
    gear: { book: 'noviceRuneStaff', machine: 'ram' },
    // calibrated by the lord balance runs
    army: [{ creature: 'shieldmaiden2', count: 150 }, { creature: 'hunter2', count: 75 }, { creature: 'berserker2', count: 38 }, { creature: 'dwarf2', count: 18 }, { creature: 'warBoar', count: 9 }, { creature: 'valkyrie', count: 3 }],
  },
  rival: {
    // Wears three purple Allfather pieces (the mystic's set); her base stats are lowered by what they add (src/logic/lord/kit.ts). Beaten, they are ours (spoils), for Heid.
    kit: { gunnhild: { helm: 'allfatherHat', cuirass: 'allfatherCloak', bracers: 'allfatherArmrings' } },
    mind: 'lord',
    hero: {
      ...plain(GUNNHILD), x: 33, y: 10,
      attack: 2, defense: 2, power: 4, knowledge: 5, skills: { wisdom: 2, mysticism: 1 }, spells: ['isa', 'tiwaz', 'thurisaz', 'slow'],
      gear: { book: 'noviceRuneStaff', machine: 'ram2' },
      // calibrated by the lord balance runs
      army: [{ creature: 'shieldmaiden2', count: 35 }, { creature: 'hunter2', count: 18 }, { creature: 'berserker2', count: 9 }, { creature: 'dwarf2', count: 5 }, { creature: 'warBoar', count: 2 }],
    },
    // Eirik, fled north to his queen after the Bloodaxe: her captain if he lived (longWinter.ts, rideOn). Beaten here, he is gone for good.
    captains: [{
      ...plain(EIRIK), x: 33, y: 11,
      attack: 4, defense: 3, power: 1, knowledge: 1, skills: { offense: 2 },
      // calibrated by the lord balance runs
      army: [{ creature: 'shieldmaiden', count: 20 }, { creature: 'hunter', count: 10 }, { creature: 'berserker', count: 5 }, { creature: 'dwarf', count: 2 }, { creature: 'warBoar', count: 1 }],
    }],
    line: 'gunnhild',
    captainLine: 'eirik-returns',
    // What a list-minded rival would build; the lord plans his own (src/logic/lord/), saving for the Dragon's Hoard.
    build: ['tiltyard', 'monastery2', 'seraphSpire', 'guardhouse3', 'archeryRange3', 'griffinTower3', 'barracks3', 'capitol', 'tiltyard2', 'seraphSpire2', 'monastery3', 'tiltyard3', 'seraphSpire3'],
    // calibrated by the lord balance runs
    purse: { gold: 5000, wood: 15, ore: 15, mercury: 6, sulfur: 6, crystal: 6, gems: 6 },
    // Bjarkoy's huscarls stay behind its walls while she rides: storming it is a siege.
    holds: 'bjarkoy-town',
    // She rides with Eirik (or, if he fell, one captain of her Taverns'): two banners, not three.
    heroes: 2,
  },
  purse: { gold: 20000, wood: 25, ore: 25, mercury: 8, sulfur: 8, crystal: 8, gems: 8 },
  // What the chapter has opened by its fourth part (src/level/unlocks.ts): the whole of the Norse tree.
  off: lockedIn(LONG_WINTER_UNLOCKS, 4),
  seed: 12907,
  objects: [
    // Angantyr's barrow on the north-west headland: its yard behind fells, one way in from the east; the draugr keep Tyrfing (hand-placed, never random).
    { id: 'angantyr-barrow', kind: 'bank', x: 9, y: 8, look: 'angantyrBarrow', prize: { gold: 3000, gems: 3 }, item: 'tyrfing', line: 'tyrfing' },
    // calibrated by the lord balance runs (Tyrfing should cost a strong army a real share)
    { id: 'angantyr-draugr', kind: 'monster', x: 11, y: 8, creature: 'barrowKing', count: 8, brood: { creature: 'draugr', count: 70 } },
    // Mimir's Well, the chapter's legendary site, at a root of the world tree inside a ring of fells (one way up, from the south-west); Skoll waits beside it.
    { id: 'mimirs-well', kind: 'sanctum', x: 21, y: 25, look: 'mimirsWell' },
    // calibrated by the lord balance runs (Skoll should cost a strong army 25-40%)
    { id: 'skoll', kind: 'monster', x: 21, y: 26, creature: 'skoll', count: 1, brood: { creature: 'wolfWinter', count: 560 }, name: 'Skoll, the wolf who hunts the sun, and his pack', line: 'skoll' },
    { id: 'well-chest', kind: 'chest', x: 23, y: 29, gold: 2000 },
    { id: 'halo-pile-crystal', kind: 'pile', x: 18, y: 24, resource: 'crystal', amount: 5 },
    // Outer dwellings: the Dragon's Hoard east of the well (the Norse top line, a forge to the lord), the boar pen in the west.
    { id: 'dragon-hoard', kind: 'dwelling', x: 31, y: 26, look: 'dragonHoard', creature: 'dragon', growth: 1, stock: 1, owner: 'neutral' },
    { id: 'hoard-giants', kind: 'monster', x: 31, y: 27, creature: 'frostGiant', count: 3, brood: { creature: 'wolfWinter', count: 22 }, drop: 'jarlByrnie' },
    { id: 'boar-pen', kind: 'dwelling', x: 9, y: 34, look: 'boarPen', creature: 'warBoar', growth: 3, stock: 3, owner: 'neutral' },
    { id: 'halo-pen-trolls', kind: 'monster', x: 8, y: 35, creature: 'troll', count: 7, drop: 'jarlGreaves' },
    // Rarity: the Arena of Heroes south of the well.
    { id: 'halo-arena', kind: 'arena', x: 20, y: 33 },
    { id: 'halo-arena-trolls', kind: 'monster', x: 21, y: 34, creature: 'troll', count: 8, drop: 'jarlBracers' },
    { id: 'halo-stone-north', kind: 'learningStone', x: 18, y: 12 },
    { id: 'halo-stone-south', kind: 'learningStone', x: 22, y: 46 },
    // The treasure barrow in the south-east, below Steigen's basin.
    { id: 'treasure-barrow', kind: 'bank', x: 35, y: 51, look: 'treasureBarrow', prize: { gold: 5000, crystal: 4, gems: 4 }, item: 'shieldOfTyr' },
    { id: 'halo-barrow-kings', kind: 'monster', x: 34, y: 52, creature: 'barrowKing', count: 10 },
    // The Ram of the Sea-Kings: at the old boat sheds on the shore, held by frost giants (the part's prize, as the Serpent held the Ramp of the Pyramid Builders).
    { id: 'naust-giants', kind: 'monster', x: 7, y: 30, creature: 'frostGiant', count: 3, brood: { creature: 'wolfWinter', count: 28 }, drop: 'ram3' },
    // Mines: every kind; Gunnhild's gold on Bjarkoy, her ore and wood in Steigen's basin.
    { id: 'halo-sawmill', kind: 'mine', x: 24, y: 8, resource: 'wood', owner: 'neutral' },
    { id: 'halo-sawmill-wolves', kind: 'monster', x: 24, y: 9, creature: 'wolfWinter', count: 28 },
    { id: 'halo-ore-pit', kind: 'mine', x: 14, y: 17, resource: 'ore', owner: 'neutral' },
    { id: 'halo-pit-draugr', kind: 'monster', x: 15, y: 18, creature: 'draugr', count: 28 },
    { id: 'halo-gold-mine', kind: 'mine', x: 20, y: 19, resource: 'gold', owner: 'neutral' },
    { id: 'halo-gold-trolls', kind: 'monster', x: 21, y: 20, creature: 'troll', count: 6 },
    { id: 'halo-crystal', kind: 'mine', x: 30, y: 30, resource: 'crystal', owner: 'neutral' },
    { id: 'halo-crystal-wolves', kind: 'monster', x: 31, y: 31, creature: 'wolfWinter', count: 38 },
    { id: 'halo-gem-pond', kind: 'mine', x: 12, y: 49, resource: 'gems', owner: 'neutral' },
    { id: 'halo-pond-draugr', kind: 'monster', x: 13, y: 50, creature: 'draugr', count: 33 },
    { id: 'halo-sulfur', kind: 'mine', x: 20, y: 40, resource: 'sulfur', owner: 'neutral' },
    { id: 'halo-sulfur-trolls', kind: 'monster', x: 21, y: 41, creature: 'troll', count: 6 },
    { id: 'halo-lab', kind: 'mine', x: 11, y: 27, resource: 'mercury', owner: 'neutral' },
    { id: 'halo-lab-wolves', kind: 'monster', x: 12, y: 28, creature: 'wolfWinter', count: 33 },
    { id: 'bjarkoy-gold-mine', kind: 'mine', x: 35, y: 7, resource: 'gold', owner: 'rival' },
    { id: 'steigen-ore-pit', kind: 'mine', x: 36, y: 36, resource: 'ore', owner: 'rival' },
    { id: 'steigen-sawmill', kind: 'mine', x: 30, y: 45, resource: 'wood', owner: 'rival' },
    // A barrow (draugr lair) on the road to Steigen: its dead come out week after week.
    { id: 'halo-barrow', kind: 'lair', x: 24, y: 38, creature: 'draugr', count: 20, look: 'tomb' },
    // The ways in: each shore landing has a guard a rider fights (calibrated by the lord balance runs).
    { id: 'halo-shore-draugr', kind: 'monster', x: 5, y: 11, creature: 'draugr', count: 33, drop: 'jarlHelm' },
    { id: 'halo-mid-wolves', kind: 'monster', x: 5, y: 29, creature: 'wolfWinter', count: 33 },
    { id: 'halo-vagar-wolves', kind: 'monster', x: 5, y: 47, creature: 'wolfWinter', count: 38 },
    // Gunnhild's roads to the raced towns are guarded: the causeway road south from Bjarkoy, the Vagar road west from Steigen.
    { id: 'causeway-trolls', kind: 'monster', x: 26, y: 12, creature: 'troll', count: 11, drop: 'jarlBoots' },
    { id: 'steigen-road-draugr', kind: 'monster', x: 24, y: 42, creature: 'draugr', count: 61, drop: 'goldStuddedBelt' },
    { id: 'halo-ridge-draugr', kind: 'monster', x: 11, y: 19, creature: 'draugr', count: 33 },
    { id: 'halo-east-wolves', kind: 'monster', x: 37, y: 24, creature: 'wolfWinter', count: 44 },
    // Sites.
    { id: 'halo-watchtower', kind: 'watchtower', x: 15, y: 6 },
    { id: 'halo-merc-camp', kind: 'mercCamp', x: 19, y: 16 },
    { id: 'halo-stables', kind: 'stables', x: 30, y: 18 },
    { id: 'halo-stone', kind: 'standingStone', x: 36, y: 22 },
    { id: 'halo-shrine', kind: 'shrine', x: 14, y: 30, spell: 'isa' },
    { id: 'steigen-shrine', kind: 'shrine', x: 34, y: 40, spell: 'thurisaz' },
    // Treasure.
    { id: 'halo-chest-north', kind: 'chest', x: 25, y: 2, gold: 2000 },
    { id: 'halo-chest-east', kind: 'chest', x: 37, y: 18, gold: 1500 },
    { id: 'halo-chest-sw', kind: 'chest', x: 7, y: 50, gold: 1500 },
    { id: 'halo-chest-basin', kind: 'chest', x: 38, y: 45, gold: 2000 },
    { id: 'halo-fire-west', kind: 'campfire', x: 13, y: 23, gold: 700, resource: 'wood', amount: 6 },
    { id: 'halo-fire-basin', kind: 'campfire', x: 30, y: 36, gold: 800, resource: 'ore', amount: 6 },
    { id: 'halo-fire-south', kind: 'campfire', x: 17, y: 49, gold: 700, resource: 'mercury', amount: 4 },
    { id: 'halo-pile-gold-1', kind: 'pile', x: 16, y: 2, resource: 'gold', amount: 1500 },
    { id: 'halo-pile-gold-2', kind: 'pile', x: 23, y: 17, resource: 'gold', amount: 1500 },
    { id: 'halo-pile-gold-3', kind: 'pile', x: 10, y: 40, resource: 'gold', amount: 1000 },
    { id: 'halo-pile-gold-4', kind: 'pile', x: 27, y: 49, resource: 'gold', amount: 2000 },
    { id: 'halo-pile-wood-1', kind: 'pile', x: 14, y: 11, resource: 'wood', amount: 8 },
    { id: 'halo-pile-wood-2', kind: 'pile', x: 33, y: 28, resource: 'wood', amount: 8 },
    { id: 'halo-pile-ore-1', kind: 'pile', x: 18, y: 38, resource: 'ore', amount: 8 },
    { id: 'halo-pile-ore-2', kind: 'pile', x: 10, y: 24, resource: 'ore', amount: 7 },
    { id: 'halo-pile-mercury', kind: 'pile', x: 29, y: 15, resource: 'mercury', amount: 5 },
    { id: 'halo-pile-sulfur', kind: 'pile', x: 36, y: 12, resource: 'sulfur', amount: 5 },
    { id: 'halo-pile-gems', kind: 'pile', x: 34, y: 49, resource: 'gems', amount: 5 },
  ],
};
