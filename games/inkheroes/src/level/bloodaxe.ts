import { EIRIK, HERVOR } from '../logic/roster/norse';
import type { HeroDef, MapDef } from './types';
import { LONG_WINTER_UNLOCKS, lockedIn } from './unlocks';

/**
 * Chapter 3, part 3: the Bloodaxe, south of Uppsala over the fells (in its
 * own tiles; longWinter.ts lays it under Uppsala, the pass between). Eirik
 * Bloodaxe, the king who killed his brothers for the crown, rides from
 * Avaldsnes, his ring fort on the western sea, to make himself king of the
 * starving land. Avaldsnes lies in the south-west behind a ridge of fells
 * with two ways in: the coast road's gap in the north and the east gap,
 * where the track runs back up to the Kaupang road. Kaupang, the market
 * town on its frozen bay in the east, holds the last grain ships: from the
 * part's third night Eirik rides for it, and it is fought for, never handed
 * over (as Gebtu). Kaupang has no walls but has a Shipwright, the nearest
 * to Avaldsnes that sells the Ram; Avaldsnes is a ring fort (Citadel), so
 * the Ram is the part's lesson. Goal: Avaldsnes taken and Eirik beaten.
 * The green Raider and Skald sets drop on the way, for Hervor and Heid.
 * Part of the full game: never imported by the game's client code (it is
 * served from content/paid.ts to owners).
 */

/** A map's hero carries no specialty (the paid maps' check, validate.ts, keeps none): the roster gives it by the hero's id. */
const plain = ({ specialty: _specialty, ...h }: HeroDef): HeroDef => h;

export const BLOODAXE_LAND: MapDef = {
  id: 'bloodaxe',
  name: 'The Bloodaxe',
  n: 11,
  brief: 'Eirik Bloodaxe rides from Avaldsnes to make himself king of the starving land. Beat him to Kaupang, the market town with the last grain ships, then take Avaldsnes and bring him down. Its ring fort has walls: Kaupang’s Shipwright sells the Ram that breaks its gate.',
  story: 'part-bloodaxe',
  goal: { kind: 'overthrow', target: 'avaldsnes-town', text: 'take Avaldsnes and beat Eirik Bloodaxe' },
  parDays: 35,
  rows: [
    'NNNNNNNNNNNNNNNNNNnnNNNNNNNNNNNNNNNNNNNN',
    'Nnnnnnnnnnnnnnnnnnn=nnnnnnnnnnnnnnnNNNNN',
    'Nnpppppnnnnnnnnnnnn=nnnnpppppnpppnnNNNNN',
    'Nnpppppnpppnnnnxxnn=nnnnpppppnpppniiiiiN',
    'Nnpppppnpppnnnnnnnn=nnnnpppppnnnnniiiiiN',
    'Nnpppppnnnnnnnnnnnn=nnnnnnnnnnnnnnniiiiN',
    'Nnnnnnnnnnnnnnnnnnn=nnnnnnnnnnnnnnniiiiN',
    'Nnnnnnnxnnnnpppnnnn=nnnnnnnnnnnnnnniiiiN',
    'Nnnnnnnnnnnnpppnnnn=nnnnnnnnnnnnnnniiiiN',
    'Nnppppnnnnnnnnnnnnn=nnnnnnxnnnnnnnniiiiN',
    'Nnppppnnnnnnnnnnnnn============nnnniiiiN',
    'Nnppppnnnnnnnnnnnnn=nnnnnnnn=nnnnnniiiiN',
    'Nnnnnnnnnnnxnnnnnnn=nnnnnnNN=nnnnxniiiiN',
    'NnnnnnNNnnnnnnnnnnn=nnppppnn=nnnnnniiiiN',
    '~~nnnnnnn===========nnppppnn=nnnnnniiiiN',
    '~~~nnnnnn=nnnnnnnnnnnnppppnn=nnpppniiiiN',
    '~~nNNNnnn=nnnNNNnnnnnnnnnnnn=nnpppniiiiN',
    '~~NNNNNNN=nNNNNNNnnnnnnnnnnn=nnpppniiiiN',
    '~~nnnnnnn=nnnnnnNnnnnnnnxnnn=nnpppniiiiN',
    '~~nnnnnnn=nnnppnNnnnnnnnnnnn=nnnnnniiiiN',
    '~~nnnnnnn=nnnppnNnnppppnnnnn=nnnnnniiiiN',
    '~~nnnnnnn=nnnppnNnnppppnnnnn=nnnnnnniiiN',
    '~~nnnnnnn=nnnnnnNNnnnnnnnnnp=pppnnnniiiN',
    '~~nnnnnnn=nnnnnnNNnnnnnnnnnp=pppnnnniiiN',
    '~~nnnnnnn=nnxnnnNNnnnnnnnnnn=nnnnnnniiiN',
    '~~nn=nnnn=nnnnnnNnnnnnnnnnnn=nnnnnnnnnnN',
    '~~nn======nnnnnnNnnnxnnnnnnn=xnnnnnnnnnN',
    '~~nnnxnnnn===================nnnpppnnnnN',
    '~~nnnnnnnnnnnnnnnnnnnnppppnnnnnnpppnxnnN',
    '~~~nnnnnnnnnpppnNnnnnnppppnnnnnnpppnnnnN',
    '~~~nnnnnnnnnnnnnNnnnnnnnnnnnnnnnnnnnnnnN',
    'NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN',
  ],
  // Played fresh, the chapter's home is Hladir (longWinter.ts); this is Kaupang, the market town both race for, never handed over. No walls (it never had any), but a Shipwright: the Ram is sold here.
  town: {
    id: 'kaupang-town', name: 'Kaupang', x: 30, y: 9, faction: 'norse',
    built: ['villageHall', 'tavern', 'marketplace', 'blacksmith', 'guardhouse', 'archeryRange'],
    guild: ['tiwaz', 'isa', 'haste', 'thurisaz', 'slow'],
    garrison: [{ creature: 'shieldmaiden', count: 30 }, { creature: 'hunter', count: 16 }, { creature: 'dwarf', count: 4 }],
  },
  towns: [
    {
      // Eirik's ring fort on the western sea: timber and earth walls (a Citadel), a Shipwright of his own.
      id: 'avaldsnes-town', name: 'Avaldsnes', x: 4, y: 24, owner: 'rival', faction: 'norse',
      built: ['villageHall', 'townHall', 'fort', 'citadel', 'tavern', 'blacksmith', 'meadHall', 'guardhouse', 'archeryRange', 'griffinTower', 'barracks'],
      guild: ['tiwaz', 'isa', 'haste', 'thurisaz', 'slow'],
      garrison: [{ creature: 'shieldmaiden', count: 50 }, { creature: 'hunter', count: 30 }, { creature: 'berserker', count: 14 }, { creature: 'dwarf', count: 8 }],
    },
  ],
  // Played fresh (nothing won before it), Hervor comes down from the pass with about what a rider brings from Uppsala.
  hero: {
    ...plain(HERVOR), x: 19, y: 1,
    attack: 4, defense: 3, power: 2, knowledge: 2, spells: ['tiwaz', 'haste'], gear: { book: 'noviceRuneStaff' },
    army: [{ creature: 'shieldmaiden', count: 90 }, { creature: 'hunter', count: 45 }, { creature: 'berserker', count: 24 }, { creature: 'dwarf', count: 12 }, { creature: 'warBoar', count: 4 }],
  },
  rival: {
    // Wears 3 green Raider pieces, as Sethi wore Egypt's; his base stats are lowered by what they add (src/logic/lord/kit.ts).
    kit: { eirik: { weapon: 'seax', helm: 'raiderHelm', cuirass: 'raiderMail' } },
    hero: {
      ...plain(EIRIK), x: 4, y: 24,
      attack: 3, defense: 3, power: 1, knowledge: 1,
      army: [{ creature: 'shieldmaiden', count: 60 }, { creature: 'hunter', count: 24 }, { creature: 'berserker', count: 12 }, { creature: 'dwarf', count: 6 }, { creature: 'warBoar', count: 2 }],
    },
    // His builds, one a day while his purse allows: troops first, then their growth and upgrades (the part's own unlocks bound it).
    build: ['guardhouse2', 'archeryRange2', 'griffinTower2', 'barracks2', 'mageGuild1', 'cityHall', 'monastery', 'guardhouse3', 'archeryRange3', 'castle', 'griffinTower3', 'barracks3', 'monastery2', 'tiltyard'],
    purse: { gold: 3000, wood: 15, ore: 15, mercury: 3, sulfur: 3, crystal: 3, gems: 3 },
    // He rides alone: the jarls kneel, but none rides for him.
    heroes: 1,
    // A lord, as Sethi since Nov 9 and Apepi: he plays from Avaldsnes, its garrison and purse, with no head start.
    mind: 'lord',
    // Avaldsnes's huscarls stay behind its walls while he rides: storming it is a siege, his Ram or not.
    holds: 'avaldsnes-town',
  },
  // Played fresh: about what a rider brings from Uppsala.
  purse: { gold: 14000, wood: 20, ore: 20, mercury: 5, sulfur: 5, crystal: 5, gems: 5 },
  // What the chapter has opened by its third part (src/level/unlocks.ts): the Shipwright and its Ram, the Castle, the Shield Hall and the rest.
  off: lockedIn(LONG_WINTER_UNLOCKS, 3),
  seed: 11264,
  objects: [
    // A barrow on the way to Avaldsnes: its draugr come out week after week.
    { id: 'bloodaxe-barrow', kind: 'lair', x: 21, y: 29, creature: 'draugr', count: 10, look: 'tomb' },
    // Mines: a sawmill in the north-west pines, an ore pit by the west woods, a gold mine on the fells' edge, crystal by the bay; Eirik's own behind his ridge.
    { id: 'bloodaxe-sawmill', kind: 'mine', x: 7, y: 4, resource: 'wood', owner: 'neutral' },
    { id: 'bloodaxe-ore-pit', kind: 'mine', x: 3, y: 7, resource: 'ore', owner: 'neutral' },
    { id: 'bloodaxe-gold-mine', kind: 'mine', x: 23, y: 6, resource: 'gold', owner: 'neutral' },
    { id: 'bloodaxe-crystal', kind: 'mine', x: 33, y: 25, resource: 'crystal', owner: 'neutral' },
    { id: 'avaldsnes-gold-mine', kind: 'mine', x: 11, y: 20, resource: 'gold', owner: 'rival' },
    { id: 'avaldsnes-ore-pit', kind: 'mine', x: 6, y: 29, resource: 'ore', owner: 'rival' },
    // Monsters: wolves and draugr on the roads near the pass, trolls in the woods, the dead and a frost giant's kin toward Avaldsnes. The green Raider set drops on the way for Hervor, two Skald pieces for Heid.
    { id: 'bloodaxe-pass-wolves', kind: 'monster', x: 19, y: 4, creature: 'wolfWinter', count: 24, drop: 'raiderBracers' },
    { id: 'crossroads-draugr', kind: 'monster', x: 19, y: 12, creature: 'draugr', count: 30, drop: 'oarsmanBelt' },
    { id: 'sawmill-trolls', kind: 'monster', x: 8, y: 5, creature: 'troll', count: 7 },
    { id: 'ore-draugr', kind: 'monster', x: 4, y: 8, creature: 'draugr', count: 26 },
    { id: 'gold-trolls', kind: 'monster', x: 23, y: 7, creature: 'troll', count: 9, drop: 'skaldCap' },
    { id: 'bay-wolves', kind: 'monster', x: 36, y: 15, creature: 'wolfWinter', count: 40 },
    { id: 'crystal-wolves', kind: 'monster', x: 32, y: 25, creature: 'wolfWinter', count: 45, drop: 'sagaSash' },
    { id: 'coast-gap-trolls', kind: 'monster', x: 9, y: 15, creature: 'troll', count: 10, drop: 'raiderGreaves' },
    { id: 'east-gap-draugr', kind: 'monster', x: 18, y: 27, creature: 'draugr', count: 50, drop: 'longshipBoots' },
    { id: 'fell-giants', kind: 'monster', x: 25, y: 24, creature: 'frostGiant', count: 2, brood: { creature: 'wolfWinter', count: 20 } },
    { id: 'basin-draugr', kind: 'monster', x: 13, y: 23, creature: 'draugr', count: 40 },
    // Sites.
    { id: 'bloodaxe-watchtower', kind: 'watchtower', x: 14, y: 2 },
    { id: 'bloodaxe-merc-camp', kind: 'mercCamp', x: 24, y: 11 },
    { id: 'bloodaxe-stone', kind: 'standingStone', x: 5, y: 14 },
    { id: 'bloodaxe-shrine', kind: 'shrine', x: 32, y: 20, spell: 'thurisaz' },
    // Treasure.
    { id: 'bloodaxe-chest-west', kind: 'chest', x: 1, y: 12, gold: 2000 },
    { id: 'bloodaxe-chest-giants', kind: 'chest', x: 26, y: 25, gold: 2000 },
    { id: 'bloodaxe-chest-basin', kind: 'chest', x: 14, y: 30, gold: 1500 },
    { id: 'bloodaxe-fire-pass', kind: 'campfire', x: 17, y: 5, gold: 600, resource: 'wood', amount: 5 },
    { id: 'bloodaxe-fire-woods', kind: 'campfire', x: 25, y: 19, gold: 700, resource: 'ore', amount: 5 },
    { id: 'bloodaxe-fire-bay', kind: 'campfire', x: 33, y: 14, gold: 700, resource: 'wood', amount: 5 },
    { id: 'bloodaxe-pile-gold-1', kind: 'pile', x: 12, y: 10, resource: 'gold', amount: 1000 },
    { id: 'bloodaxe-pile-gold-2', kind: 'pile', x: 30, y: 13, resource: 'gold', amount: 1500 },
    { id: 'bloodaxe-pile-gold-3', kind: 'pile', x: 22, y: 25, resource: 'gold', amount: 1000 },
    { id: 'bloodaxe-pile-wood', kind: 'pile', x: 10, y: 8, resource: 'wood', amount: 8 },
    { id: 'bloodaxe-pile-ore', kind: 'pile', x: 26, y: 15, resource: 'ore', amount: 7 },
    { id: 'bloodaxe-pile-mercury', kind: 'pile', x: 21, y: 18, resource: 'mercury', amount: 4 },
    { id: 'bloodaxe-pile-sulfur', kind: 'pile', x: 7, y: 19, resource: 'sulfur', amount: 4 },
    { id: 'bloodaxe-pile-crystal', kind: 'pile', x: 37, y: 26, resource: 'crystal', amount: 4 },
    { id: 'bloodaxe-pile-gems', kind: 'pile', x: 30, y: 29, resource: 'gems', amount: 4 },
  ],
};
