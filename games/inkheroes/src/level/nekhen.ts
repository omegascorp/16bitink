import { NEFERET } from './recruits';
import type { MapDef } from './types';
import { lockedIn, TWO_LANDS_UNLOCKS } from './unlocks';

/**
 * Chapter 2, part 1: Nekhen, on the Upper Nile (in its own tiles; see
 * twoLands.ts, which places it in the chapter). The flood didn't come:
 * the canal's great sluice is held by the Petsuchos, the temple's giant
 * crocodile gone wild, with its brood. Neferet holds Nekhen on the west
 * bank. The Nile runs down the land, crossed at the bridge by the town and
 * the ford to the south; green floodplain each side, desert beyond, and
 * the canal's dry bed running east from the sluice.
 * Part of the full game: never imported by the game's client code (it is
 * served from content/paid.ts to owners).
 */
export const NEKHEN_LAND: MapDef = {
  id: 'nekhen',
  name: 'Nekhen',
  n: 5,
  brief: 'The Petsuchos holds the great sluice, and the flood is late. Raise an army in Nekhen, cross the Nile and take the sluice back.',
  story: 'part-nekhen',
  goal: { kind: 'defeat', target: 'petsuchos', text: 'take the great sluice back from the Petsuchos' },
  parDays: 21,
  rows: [
    'DDDDDDDDDDDDTTg~~~gTTDDDDDDDDDDD',
    'DsssssssssssTgg~~~gggrsssssssssD',
    'DsDDDskssssTggg~~~ggTsDDDssssssD',
    'DsDssssssssrggg~~~TggssssssssssD',
    'Dsssssssssssggg~~~gggssssssssssD',
    'Dsssssssssssggg~~~gggrsssssssssD',
    'Dssssssssssrggg~~~gggssssssksssD',
    'Dsssssssssssggg~~~gggskssssssssD',
    'Dksssssss=ssggg~~~gTgssssssssssD',
    'Dss=======srggg~~~gggrssssssDDDD',
    'Dss=sssss=sggg~~~gggsssssssssssD',
    'Dss=sssss=====bbb===sssDDDsssssD',
    'DsDsssssssrggg~~~gg=sssssssssksD',
    'DsDssssssssggg~~~gg=rsssssssssDD',
    'Dssskssssssggg~~~gT=ssssssssssDD',
    'Dsssssssssrggg~~~gg=sksssssssssD',
    'Dsssssssssssggg~~~g=TssssssssssD',
    'DsskssssssssTgg~~~g=grsssssDDDsD',
    'DssssssssssTggg~~~g=gssksssssssD',
    'DsssssskssssgggsssgggssssssssssD',
    'Dsssssssssssggg~~~gggssrsrsrsrsD',
    'DssssDDDsssrggg~~~~~ddddddddddsD',
    'DsssssssssksTgg~~~TggsrsrkrsrssD',
    'DDDDDDDDDDDDTTg~~~gTTDDDDDDDDDDD',
  ],
  town: {
    id: 'nekhen-town', name: 'Nekhen', x: 9, y: 7, faction: 'kemet',
    built: ['villageHall', 'tavern', 'guardhouse'],
    // The House of Life's first floor teaches the first three: Healing lifts the scorpions' poison.
    guild: ['cure', 'stoneSkin', 'haste', 'slow', 'magicArrow'],
  },
  hero: { ...NEFERET, x: 9, y: 8 },
  purse: { gold: 9000, wood: 20, ore: 20, mercury: 3, sulfur: 3, crystal: 3, gems: 3 },
  // What the chapter has opened by its first part (src/level/unlocks.ts).
  off: lockedIn(TWO_LANDS_UNLOCKS, 1),
  seed: 4096,
  objects: [
    // Mines: a palm grove's sawmill and an ore pit on the west bank, a gold mine in the eastern desert.
    { id: 'nekhen-sawmill', kind: 'mine', x: 11, y: 14, resource: 'wood', owner: 'neutral' },
    { id: 'nekhen-ore-pit', kind: 'mine', x: 5, y: 12, resource: 'ore', owner: 'neutral' },
    { id: 'nekhen-gold-mine', kind: 'mine', x: 25, y: 6, resource: 'gold', owner: 'neutral' },
    // Monsters: light on the west bank, heavier east of the river and toward the sluice. The gray Faience set drops along the way.
    { id: 'grove-hyenas', kind: 'monster', x: 12, y: 15, creature: 'hyena', count: 6, drop: 'faienceDiadem' },
    { id: 'pit-raiders', kind: 'monster', x: 6, y: 13, creature: 'raider', count: 5, drop: 'reedSandals' },
    { id: 'dune-hyenas', kind: 'monster', x: 8, y: 18, creature: 'hyena', count: 12, drop: 'faienceAnklets' },
    { id: 'bridge-hyenas', kind: 'monster', x: 13, y: 11, creature: 'hyena', count: 10, drop: 'faienceBangles' },
    { id: 'ford-raiders', kind: 'monster', x: 13, y: 19, creature: 'raider', count: 10, drop: 'scarabGirdle' },
    { id: 'mine-scorpions', kind: 'monster', x: 25, y: 7, creature: 'scorpion', count: 5 },
    { id: 'chest-raiders', kind: 'monster', x: 28, y: 4, creature: 'raider', count: 12 },
    { id: 'shrine-scorpions', kind: 'monster', x: 26, y: 15, creature: 'scorpion', count: 6 },
    { id: 'waste-scorpions', kind: 'monster', x: 24, y: 13, creature: 'scorpion', count: 7 },
    { id: 'road-crocodiles', kind: 'monster', x: 19, y: 18, creature: 'crocodile', count: 5 },
    { id: 'petsuchos', kind: 'monster', x: 20, y: 21, creature: 'petsuchos', count: 1, brood: { creature: 'crocodile', count: 8 }, drop: 'faienceCollar' },
    // Sites.
    { id: 'nekhen-merc-camp', kind: 'mercCamp', x: 23, y: 4 },
    { id: 'nekhen-watchtower', kind: 'watchtower', x: 3, y: 21 },
    { id: 'nekhen-stone', kind: 'standingStone', x: 8, y: 15 },
    { id: 'osiris-shrine', kind: 'shrine', x: 27, y: 14, spell: 'rebirth' },
    // Treasure.
    { id: 'nekhen-chest-west', kind: 'chest', x: 2, y: 19, gold: 1000 },
    { id: 'nekhen-chest-east', kind: 'chest', x: 29, y: 3, gold: 2000 },
    { id: 'nekhen-fire-north', kind: 'campfire', x: 8, y: 2, gold: 500, resource: 'ore', amount: 4 },
    { id: 'nekhen-fire-dunes', kind: 'campfire', x: 6, y: 16, gold: 500, resource: 'wood', amount: 5 },
    { id: 'nekhen-fire-east', kind: 'campfire', x: 22, y: 9, gold: 600, resource: 'ore', amount: 4 },
    { id: 'nekhen-pile-wood-1', kind: 'pile', x: 6, y: 4, resource: 'wood', amount: 7 },
    { id: 'nekhen-pile-ore-1', kind: 'pile', x: 3, y: 6, resource: 'ore', amount: 6 },
    { id: 'nekhen-pile-gold-1', kind: 'pile', x: 13, y: 2, resource: 'gold', amount: 750 },
    { id: 'nekhen-pile-gold-2', kind: 'pile', x: 2, y: 10, resource: 'gold', amount: 500 },
    { id: 'nekhen-pile-gold-3', kind: 'pile', x: 22, y: 13, resource: 'gold', amount: 1000 },
    { id: 'nekhen-pile-wood-2', kind: 'pile', x: 28, y: 19, resource: 'wood', amount: 8 },
    { id: 'nekhen-pile-ore-2', kind: 'pile', x: 24, y: 16, resource: 'ore', amount: 7 },
  ],
};
