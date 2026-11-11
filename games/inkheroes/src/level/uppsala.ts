import { HEID, HERVOR } from '../logic/roster/norse';
import type { HeroDef, MapDef } from './types';
import { LONG_WINTER_UNLOCKS, lockedIn } from './unlocks';

/**
 * Chapter 3, part 2: Uppsala, over the mountains south of Hladir (in its own
 * tiles; longWinter.ts lays it under Hladir, the pass through the fells
 * between). The king's mounds by the old temple have opened and the dead
 * walk. The road comes down from the pass along the frozen river Fyris and
 * crosses the ice to Uppsala's ring fort, where the living hold out and Heid
 * the volva reads the winter (the town opens its gates to Hervor, as Eudora
 * did to Rowan). East of the river stand the three royal mounds, each a
 * tomb that sends out its draugr week after week. South of them is the
 * temple's yard, fells and the sacred grove round it and one gate in from
 * the road: Barrow Kings hold the gate, the Novice's Rune Staff lies on the
 * altar behind them (as chapter 1's first spellbook waited among the
 * Stymphalian Birds), and deeper in, on the temple's steps, Aun the Old,
 * the Yngling king who gave nine sons to Odin for a longer life, holds the
 * temple with the dead of the mounds: the goal. The gray Volva set drops on
 * the way, for Heid. Part of the full game: never imported by the game's
 * client code (it is served from content/paid.ts to owners).
 */

/** A map's hero carries no specialty (the paid maps' check, validate.ts, keeps none): the roster gives it by the hero's id. */
const plain = ({ specialty: _specialty, ...h }: HeroDef): HeroDef => h;

/** Heid, hired at a Tavern of ours from this part on (src/logic/roster/norse.ts has her Thurisaz specialty). */
export const HEID_RECRUIT: HeroDef = plain(HEID);

export const UPPSALA_LAND: MapDef = {
  id: 'uppsala',
  name: 'Uppsala',
  n: 10,
  brief: 'The king’s mounds at Uppsala have opened and the dead walk. Win the Novice’s Rune Staff from the Barrow Kings at the temple’s gate, then drive Aun the Old out of the temple. Heid the volva waits at your Tavern: a second hero for 2500 gold.',
  story: 'part-uppsala',
  goal: { kind: 'defeat', target: 'aun', text: 'free the temple at Uppsala from Aun the Old' },
  parDays: 28,
  rows: [
    'NNNNNNNNNNNNNNNNNNNnnNNNNNNNNNNN',
    'NNNNNNNNNNNNNNNNNNnnnnNNNNNNNNNN',
    'NNNNNNNNNNNNNNNNnnn=nnnnNNNNNNNN',
    'NNNnnNNnnNNNnNNnnnn=nnnnnNNnNNNn',
    'NNnnnnnnnnNnnnnniin=nnnnnnnNNnnn',
    'Nnpppppnnnnnnppniin=nnnnNNNNNNNp',
    'Nnppnppnnnnnnppniin=nnnnNnnnnNNp',
    'Nnpppnpnnnnnnnnniin=nnnnNnnnnNNp',
    'Nnpnpnpnnnnnnnnniin=nnxnNnnnnNNp',
    'Nnnnnnnnnnnnnnnxiin======nnnnnnp',
    'Nnnnnnnnnnnnnnnniin=nnnnNnnnnnnp',
    'NnnNnnnNnnnnnnnniin=nnnnNnnnnnnp',
    'NnnNnnnNnnnnnnnniin=nnnnpppppppp',
    'Nnnnnxnnnn=nnnnnnii=nnnnxnnnnnnp',
    'Nnnnnnnnnn=nnnnnnii=nnnnnnnnnnnp',
    'Nnpppnnnnn==========nnnnNNnnnnnp',
    'Nnpnpnnnnnnnnnnnnii=nnnnnnnnnnnp',
    'Nnpppnnnnnnnnnnnnii=nnnnnnnxnnpp',
    'Nnnnnnnnnnnxnnnnnii=nnnnnnnnnnpp',
    'Nnnnnnnnnnnnnnnnnii=nnnnnnnnpppp',
    'Nnnnnnnnnnnnppnnnii=nnnnnnnnpnpp',
    'NnNnnnnnnnnnppnniin=nnnnnnnnpppp',
    'NnNnnnppppnnppnniinnnnnnnnnnnnpp',
    'Nnnnnnpnppnnnnnniinnxnnnnnnnnnpp',
    'NnnnnnpnppnnnnnniinnnnnnnnnnNNnp',
    'NnnnxnnnnnnnnnNNiinnnNnnnnnnnnnp',
    'Nnnnnnnnxnnnnnnniinnnnnnnnnnnnnp',
    'NnnNNnnNNnnnNNNniinnNNNNnnnnnNNp',
    'NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN',
    'NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN',
  ],
  // Uppsala's ring fort: the living hold out behind its palisade, and its Hof (the Norse Mage Guild) already stands. longWinter.ts sets it waiting for Hervor.
  town: {
    id: 'uppsala-town', name: 'Uppsala', x: 10, y: 12, faction: 'norse',
    built: ['villageHall', 'tavern', 'mageGuild1', 'guardhouse', 'archeryRange'],
    guild: ['tiwaz', 'isa', 'haste', 'thurisaz', 'slow'],
    garrison: [{ creature: 'shieldmaiden', count: 10 }],
  },
  // Played fresh (nothing won before it), Hervor waits at the top of the pass with about what a rider brings from Hladir.
  hero: {
    ...plain(HERVOR), x: 19, y: 1,
    attack: 3, defense: 3, power: 1, knowledge: 2,
    army: [{ creature: 'shieldmaiden', count: 60 }, { creature: 'hunter', count: 30 }, { creature: 'berserker', count: 16 }, { creature: 'dwarf', count: 8 }],
  },
  purse: { gold: 10000, wood: 20, ore: 20, mercury: 5, sulfur: 5, crystal: 5, gems: 5 },
  // What the chapter has opened by its second part (src/level/unlocks.ts): the Hof's two floors, the Boar Pen and the rest.
  off: lockedIn(LONG_WINTER_UNLOCKS, 2),
  seed: 8192,
  objects: [
    // The king's mounds: three tombs in a row east of the river, south of the temple, each sending out its draugr week after week.
    { id: 'mound-west', kind: 'lair', x: 21, y: 18, creature: 'draugr', count: 8, look: 'tomb' },
    { id: 'mound-middle', kind: 'lair', x: 24, y: 18, creature: 'draugr', count: 8, look: 'tomb' },
    { id: 'mound-east', kind: 'lair', x: 27, y: 18, creature: 'draugr', count: 8, look: 'tomb' },
    // Mines: a sawmill in the north-west grove, an ore pit in the west woods, a gold mine beyond the mounds.
    { id: 'uppsala-sawmill', kind: 'mine', x: 4, y: 6, resource: 'wood', owner: 'neutral' },
    { id: 'uppsala-ore-pit', kind: 'mine', x: 5, y: 18, resource: 'ore', owner: 'neutral' },
    { id: 'uppsala-gold-mine', kind: 'mine', x: 27, y: 22, resource: 'gold', owner: 'neutral' },
    // Monsters: wolves below the pass and draugr at the ford near home, trolls in the woods, more of the dead out by the mounds. The gray Volva set drops on the way, for Heid.
    { id: 'pass-wolves', kind: 'monster', x: 19, y: 5, creature: 'wolfWinter', count: 16, drop: 'volvaHood' },
    { id: 'ford-draugr', kind: 'monster', x: 14, y: 15, creature: 'draugr', count: 20, drop: 'seidrCord' },
    { id: 'grove-trolls', kind: 'monster', x: 5, y: 7, creature: 'troll', count: 6, drop: 'volvaWraps' },
    { id: 'woods-trolls', kind: 'monster', x: 6, y: 18, creature: 'troll', count: 7 },
    { id: 'mound-draugr', kind: 'monster', x: 26, y: 22, creature: 'draugr', count: 35, drop: 'volvaLeggings' },
    { id: 'grove-wolves', kind: 'monster', x: 27, y: 25, creature: 'wolfWinter', count: 30 },
    { id: 'river-wolves', kind: 'monster', x: 17, y: 24, creature: 'wolfWinter', count: 28 },
    { id: 'clump-trolls', kind: 'monster', x: 7, y: 24, creature: 'troll', count: 9 },
    // The temple's gate, off the road below the pass: Barrow Kings hold it, and the Novice's Rune Staff lies on the altar behind them.
    { id: 'altar-kings', kind: 'monster', x: 24, y: 9, creature: 'barrowKing', count: 10, drop: 'volvaCloak' },
    { id: 'altar-staff', kind: 'spellbook', x: 26, y: 9, item: 'noviceRuneStaff', spell: 'tiwaz' },
    // The temple itself, in its yard just behind the gate's kings: a site 3 × 3 tiles (25–27, 6–8) with its door at (26, 8), the altar at its door and Aun on the steps beside it. A hero visits it for +1 Power, once.
    { id: 'uppsala-temple', kind: 'temple', x: 26, y: 8, look: 'uppsalaTemple' },
    // Aun the Old on the temple's steps, with the dead of the mounds: the goal.
    { id: 'aun', kind: 'monster', x: 29, y: 10, creature: 'barrowKing', count: 8, brood: { creature: 'draugr', count: 100 }, name: 'Aun the Old', line: 'aun', drop: 'barkShoes' },
    // Sites.
    { id: 'uppsala-merc-camp', kind: 'mercCamp', x: 8, y: 19 },
    { id: 'uppsala-watchtower', kind: 'watchtower', x: 12, y: 3 },
    { id: 'uppsala-shrine', kind: 'shrine', x: 22, y: 6, spell: 'isa' },
    { id: 'uppsala-stone', kind: 'standingStone', x: 28, y: 7 },
    { id: 'uppsala-windmill', kind: 'windmill', x: 3, y: 25, resource: 'gems', amount: 3 },
    // Treasure.
    { id: 'uppsala-chest-grove', kind: 'chest', x: 28, y: 26, gold: 1500 },
    { id: 'uppsala-chest-clump', kind: 'chest', x: 7, y: 23, gold: 2000 },
    { id: 'uppsala-chest-river', kind: 'chest', x: 19, y: 26, gold: 1500 },
    { id: 'uppsala-fire-pass', kind: 'campfire', x: 21, y: 4, gold: 500, resource: 'wood', amount: 5 },
    { id: 'uppsala-fire-road', kind: 'campfire', x: 12, y: 17, gold: 600, resource: 'ore', amount: 4 },
    { id: 'uppsala-fire-mounds', kind: 'campfire', x: 23, y: 21, gold: 700, resource: 'ore', amount: 5 },
    { id: 'uppsala-pile-wood', kind: 'pile', x: 8, y: 6, resource: 'wood', amount: 7 },
    { id: 'uppsala-pile-ore', kind: 'pile', x: 13, y: 9, resource: 'ore', amount: 6 },
    { id: 'uppsala-pile-gold-1', kind: 'pile', x: 21, y: 16, resource: 'gold', amount: 750 },
    { id: 'uppsala-pile-gold-2', kind: 'pile', x: 6, y: 13, resource: 'gold', amount: 1000 },
    { id: 'uppsala-pile-gold-3', kind: 'pile', x: 29, y: 15, resource: 'gold', amount: 1000 },
    { id: 'uppsala-pile-crystal', kind: 'pile', x: 15, y: 22, resource: 'crystal', amount: 4 },
    { id: 'uppsala-pile-mercury', kind: 'pile', x: 10, y: 26, resource: 'mercury', amount: 4 },
    { id: 'uppsala-pile-sulfur', kind: 'pile', x: 26, y: 15, resource: 'sulfur', amount: 4 },
    { id: 'uppsala-pile-gems', kind: 'pile', x: 30, y: 13, resource: 'gems', amount: 4 },
  ],
};
