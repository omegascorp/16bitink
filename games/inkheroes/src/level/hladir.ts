import { HERVOR } from '../logic/roster/norse';
import type { MapDef } from './types';
import { LONG_WINTER_UNLOCKS, lockedIn } from './unlocks';

/**
 * Chapter 3, part 1: Hladir, at the head of a frozen fjord (in its own
 * tiles; longWinter.ts places it in the chapter). The third winter with no
 * summer: the fjord's ice runs west from Hladir to the sea, and at its
 * mouth the frost giant Hrimgrimnir sits on the ice with his wolves, so no
 * ship has sailed for three winters. Hervor holds Hladir on the shore
 * where the ice ends. Snow everywhere (Norse heroes walk it as grass),
 * pine forest and fells; the ice ('i') is walked slowly by everyone. Two
 * roads leave the town, west along the north shore and round the fjord's
 * head and west along the south shore; the giant is reached across the ice
 * from either. Part of the full game: never imported by the game's client
 * code (it is served from content/paid.ts to owners).
 */
/** Hervor as the roster has her (src/logic/roster/norse.ts), without her specialty: a map's hero carries none (the paid maps' check, validate.ts, keeps none), and the roster gives it by her id. */
const { specialty: _berserkers, ...hervor } = HERVOR;

export const HLADIR_LAND: MapDef = {
  id: 'hladir',
  name: 'Hladir',
  n: 9,
  brief: 'The frost giant Hrimgrimnir sits on the ice at the fjord’s mouth with his wolves. Raise Hladir’s warriors and drive him off the ice.',
  story: 'part-hladir',
  goal: { kind: 'defeat', target: 'hrimgrimnir', text: 'beat Hrimgrimnir on the ice at the fjord’s mouth' },
  parDays: 21,
  rows: [
    'NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN',
    'NNNNnnnnnnNNNnnnnnnNNnnnnnnnnNNN',
    'NNnnnnpppnnnnnnnpppppppnnnpppnpp',
    'Nnnnxnpppnnnnnnnppnnpppnxnpppnnp',
    'Nnnnnnnnnnnppppnnnnnnpppnnpnpnnp',
    'NnNNnnnnnnnppnpnnnnnnnnnnnnnnnnp',
    'NnnnNnnnnxnnnnnnNNnnnnnnnnnnnnnp',
    'nnnnninnnnnnnnnnnnnnnnnnnnnnxnnp',
    'niiniinnninnnnnnnnnnnnnnnnnnnnpp',
    'iiiiiiiininnninnnnnnnnnnnnnnnnpp',
    'iiiiiiiiiiiiii===========nnnnnnp',
    'iiiiiiiiiiiiiiiininnninn=nnpppnp',
    'iiiiiiiiiiiiiiiiiiiiiinn=nnpppnp',
    'iiiiiiiiiiiiiiiiiiiiiinn=nnnnnpp',
    'iiiiiiiiiiiiiiiiiinnninn=nnnnnpp',
    'iiiiiiiiiiiinininnnnnnnn=nnnnnpp',
    'iiiiiiiiiii==============pppnnnp',
    'niniiiinnnnnnppxnnnnnnxnnpnpnnnp',
    'Nnnnnnnxnnnnnppnnnnnnnnnnnnnnnnp',
    'Nnpppnnnnpppnnnnnnpnppnnnnnnnnnp',
    'Nnpppnnnnnnnnnnnnnppppnnnnnnnnnp',
    'NNnnnnnnnnnnnnnnnnnnnnnnnnnnNNnp',
    'NNNnnNNnNNnnnnnNNNnnnnNNnNNnnnNN',
    'NNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN',
  ],
  town: {
    id: 'hladir-town', name: 'Hladir', x: 24, y: 9, faction: 'norse',
    built: ['villageHall', 'tavern', 'guardhouse'],
    // No Hof yet (it opens in part 2, when Hervor finds her rune staff): its first floor will teach the two level-1 runes and Haste, the second Thurisaz and Slow.
    guild: ['tiwaz', 'isa', 'haste', 'thurisaz', 'slow'],
  },
  hero: { ...hervor, x: 24, y: 10 },
  purse: { gold: 9000, wood: 20, ore: 20, mercury: 3, sulfur: 3, crystal: 3, gems: 3 },
  // What the chapter has opened by its first part (src/level/unlocks.ts): no Hof yet.
  off: lockedIn(LONG_WINTER_UNLOCKS, 1),
  seed: 8192,
  objects: [
    // Mines: a sawmill in the pines north of the town, an ore pit in the fells to its south-east, a gold mine on the far south shore.
    { id: 'hladir-sawmill', kind: 'mine', x: 22, y: 5, resource: 'wood', owner: 'neutral' },
    { id: 'hladir-ore-pit', kind: 'mine', x: 28, y: 15, resource: 'ore', owner: 'neutral' },
    { id: 'hladir-gold-mine', kind: 'mine', x: 12, y: 20, resource: 'gold', owner: 'neutral' },
    // Monsters: wolves and draugr near home, trolls further out (they hit hard, so the berserkers' rage shows), the giant on the ice. Greek gear drops for now (no Norse loot yet).
    { id: 'mill-wolves', kind: 'monster', x: 21, y: 6, creature: 'wolfWinter', count: 5, drop: 'bronzeHelm' },
    { id: 'pit-draugr', kind: 'monster', x: 27, y: 15, creature: 'draugr', count: 7, drop: 'warSandals' },
    { id: 'shore-wolves', kind: 'monster', x: 16, y: 9, creature: 'wolfWinter', count: 10, drop: 'bronzeBracers' },
    { id: 'cairn-draugr', kind: 'monster', x: 19, y: 17, creature: 'draugr', count: 12, drop: 'bronzeGreaves' },
    { id: 'grove-troll', kind: 'monster', x: 13, y: 6, creature: 'troll', count: 2, drop: 'warBelt' },
    { id: 'ice-wolves', kind: 'monster', x: 12, y: 12, creature: 'wolfWinter', count: 8 },
    { id: 'mine-trolls', kind: 'monster', x: 13, y: 21, creature: 'troll', count: 6 },
    { id: 'ness-wolves', kind: 'monster', x: 6, y: 7, creature: 'wolfWinter', count: 12 },
    { id: 'barrow-draugr', kind: 'monster', x: 6, y: 20, creature: 'draugr', count: 15 },
    { id: 'fell-troll', kind: 'monster', x: 3, y: 3, creature: 'troll', count: 5 },
    { id: 'hrimgrimnir', kind: 'monster', x: 3, y: 12, creature: 'frostGiant', count: 1, brood: { creature: 'wolfWinter', count: 44 }, name: 'Hrimgrimnir', line: 'hrimgrimnir', drop: 'bronzeCuirass' },
    // Sites.
    { id: 'hladir-merc-camp', kind: 'mercCamp', x: 27, y: 19 },
    { id: 'hladir-watchtower', kind: 'watchtower', x: 5, y: 4 },
    { id: 'hladir-stone', kind: 'standingStone', x: 16, y: 19 },
    { id: 'hladir-windmill', kind: 'windmill', x: 9, y: 4, resource: 'crystal', amount: 4 },
    // Treasure.
    { id: 'hladir-chest-home', kind: 'chest', x: 29, y: 3, gold: 1000 },
    { id: 'hladir-chest-barrow', kind: 'chest', x: 5, y: 21, gold: 1500 },
    { id: 'hladir-chest-fell', kind: 'chest', x: 2, y: 2, gold: 2000 },
    { id: 'hladir-fire-steading', kind: 'campfire', x: 27, y: 7, gold: 500, resource: 'wood', amount: 5 },
    { id: 'hladir-fire-road', kind: 'campfire', x: 20, y: 15, gold: 600, resource: 'ore', amount: 4 },
    { id: 'hladir-fire-ness', kind: 'campfire', x: 8, y: 6, gold: 500, resource: 'ore', amount: 4 },
    { id: 'hladir-pile-wood-1', kind: 'pile', x: 25, y: 2, resource: 'wood', amount: 7 },
    { id: 'hladir-pile-ore-1', kind: 'pile', x: 29, y: 10, resource: 'ore', amount: 6 },
    { id: 'hladir-pile-gold-1', kind: 'pile', x: 20, y: 8, resource: 'gold', amount: 750 },
    { id: 'hladir-pile-gold-2', kind: 'pile', x: 26, y: 13, resource: 'gold', amount: 500 },
    { id: 'hladir-pile-gold-3', kind: 'pile', x: 9, y: 17, resource: 'gold', amount: 1000 },
    { id: 'hladir-pile-wood-2', kind: 'pile', x: 22, y: 19, resource: 'wood', amount: 8 },
    { id: 'hladir-pile-ore-2', kind: 'pile', x: 7, y: 19, resource: 'ore', amount: 7 },
    { id: 'hladir-pile-crystal', kind: 'pile', x: 14, y: 7, resource: 'crystal', amount: 4 },
    { id: 'hladir-pile-gems', kind: 'pile', x: 1, y: 19, resource: 'gems', amount: 4 },
  ],
};
