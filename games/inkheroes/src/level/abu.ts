import type { MapDef } from './types';
import { lockedIn, TWO_LANDS_UNLOCKS } from './unlocks';

/**
 * Chapter 2, part 2: Abu, the fort at the First Cataract (in its own tiles;
 * see twoLands.ts, which places it south of Nekhen so the Nile runs on).
 * With the sluice open the flood comes and the river road south opens. Up
 * it, where the Nile breaks over black granite, Sand Raiders hold Abu, the
 * island fort at the kingdom's southern gate: the chapter's first siege,
 * and so its lesson, Egypt's siege ramp. The road runs down the west bank
 * through palm villages and quarries, desert either side; the cataract's
 * granite belt crosses the river below the island; Abu is reached by one
 * causeway from the west bank (guarded) or the ford above the rapids, from
 * the east bank. Its `town` is Abu itself; the chapter's home is Nekhen.
 * Part of the full game: never imported by the game's client code (it is
 * served from content/paid.ts to owners).
 */
export const ABU_LAND: MapDef = {
  id: 'abu',
  name: 'Abu',
  n: 6,
  brief: 'Take Abu, the island fort at the cataract, back from the raiders. Its walls need a siege ramp from your Workshop. Paser waits at your Tavern: a second hero for 2500 gold.',
  story: 'part-abu',
  goal: { kind: 'capture', target: 'abu-town', text: 'take Abu back from the raiders' },
  parDays: 28,
  rows: [
    'DDDDDDDDDDDg=g=~~~ggggDDDDDDDDDDDDDDDDDD',
    'Dssssssssssg==g~~~ggggsssssssssssssssssD',
    'DssssssssTTg=gg~~~ggggsksssssssssssssssD',
    'DsssssssssTg=gg~~~ggggsssssssssssssssssD',
    'Dssssksssssg=gg~~~gTTgsssssskssssDDDsssD',
    'Dssskskssssg=gg~~~ggTgssssssssssssDssssD',
    'Dssssssksssg=gg~~~ggggsssssssssssssssssD',
    'Dssksssssssg=gg~~~ggggsssssssssssssssssD',
    'Dssssssssssg=gg~~~ggggsssssssksksssssssD',
    'DssssssssssT=gg~~~ggggsssssssssssssssssD',
    'Dssssssssssg=gg~~~ggggsssssskssskssssssD',
    'DssDDDsssssg=gg~~~ggggsssssssskssssssssD',
    'DsssssssTTsg=gg~~~ggggkssssssssssssssssD',
    'DssssssssTsg=gg~~~ggTgsssssssssssssksssD',
    'Dssssssssssg=gg~~~gTggsssssssssssssssssD',
    'Dssssskssssg=Tg~~~ggggsssssssssDDDsssssD',
    'Dssssssssssg=gg~~~ggggsssssssssssssssssD',
    'DsDDssssssgg=~~k~~~~k~k~gggssssssssssssD',
    'Dsssssssssgg=kk~k~kk~k~kgggssksssssssssD',
    'Dsssssssssgg=~~~~~~~~~~~gggssssssssssssD',
    'DssssssDssgg=~~~ggggg~~~gggsssssssssDssD',
    'DsssskssssgT=~~ggggggT~~gggsssssssssDssD',
    'Dsssssssssgg=~~ggggggg~~gTTssssssssssssD',
    'DsssssssssTg=~~ggggggg~~gggssssssssssssD',
    'Dsssssssksgg=~~g=ggggg~~gggssssssssssssD',
    'Dsssssssssgg=bb==ggggg~~gggssssssssssssD',
    'DsssssDDssggg~~gggggg~~~gggsssDDsssssssD',
    'Dsssssssssggg~~~Tgggg~~~gggssssssskssssD',
    'Dsssssssssggg~~~~~ssssssgggssssssssssssD',
    'Dsssssssssggg~~~~~~~~~~~gggssssssssssssD',
    'Dsssssssssggg~~~~~~~~~~~gggssssssssssssD',
    'DDDDDDDDDDDDDDD~~~DDDDDDDDDDDDDDDDDDDDDD',
  ],
  town: {
    id: 'abu-town', name: 'Abu', x: 16, y: 24, faction: 'kemet',
    built: ['villageHall', 'townHall', 'fort', 'tavern', 'guardhouse', 'archeryRange'],
    guild: ['cure', 'stoneSkin', 'haste', 'slow', 'dispel'],
    // Sand Raiders on its tower, Hyenas, Spitting Cobras and Desert Lions behind the walls: set by the bot (docs/inkheroes-design.md, "Part 2: Abu").
    garrison: [{ creature: 'raider', count: 16 }, { creature: 'hyena', count: 22 }, { creature: 'cobra', count: 10 }, { creature: 'lion', count: 3 }, { creature: 'raider', count: 7 }],
  },
  // Played fresh (nothing won before it), Neferet waits at the head of the river road with about what a rider brings.
  hero: {
    id: 'neferet', name: 'Neferet', heroClass: 'cleric', x: 12, y: 3, faction: 'kemet',
    attack: 1, defense: 1, power: 2, knowledge: 3, skills: { wisdom: 1 }, spells: ['curse', 'ward'], gear: { book: 'novicePapyrus' }, ankhs: 2,
    army: [{ creature: 'levy', count: 40 }, { creature: 'nubian', count: 20 }, { creature: 'jackal', count: 10 }, { creature: 'chariot', count: 5 }],
  },
  purse: { gold: 10000, wood: 20, ore: 20, mercury: 5, sulfur: 5, crystal: 5, gems: 5 },
  // What the chapter has opened by its second part (src/level/unlocks.ts).
  off: lockedIn(TWO_LANDS_UNLOCKS, 2),
  seed: 5113,
  objects: [
    // Tombs: a new group each week, in the half toward Abu.
    { id: 'abu-tomb', kind: 'lair', x: 9, y: 20, creature: 'scorpion', count: 8, look: 'tomb' },
    { id: 'sand-tomb', kind: 'lair', x: 8, y: 28, creature: 'cobra', count: 14, look: 'tomb' },
    // Mines: a palm grove's sawmill and a quarry's ore pit on the west bank, a gold mine in the eastern desert.
    { id: 'abu-sawmill', kind: 'mine', x: 8, y: 15, resource: 'wood', owner: 'neutral' },
    { id: 'abu-quarry', kind: 'mine', x: 5, y: 7, resource: 'ore', owner: 'neutral' },
    { id: 'abu-gold-mine', kind: 'mine', x: 31, y: 20, resource: 'gold', owner: 'neutral' },
    // Monsters: the west bank along the river road (the gray Scale set drops there, Paser's side), the desert either side, the causeway to Abu guarded.
    { id: 'village-hyenas', kind: 'monster', x: 10, y: 5, creature: 'hyena', count: 16, drop: 'scaleHelm' },
    { id: 'quarry-cobras', kind: 'monster', x: 6, y: 8, creature: 'cobra', count: 8, drop: 'scaleBracers' },
    { id: 'dune-lions', kind: 'monster', x: 3, y: 13, creature: 'lion', count: 3, drop: 'scaleCoat' },
    { id: 'grove-raiders', kind: 'monster', x: 9, y: 16, creature: 'raider', count: 10, drop: 'captainsSash' },
    { id: 'road-cobras', kind: 'monster', x: 11, y: 19, creature: 'cobra', count: 12, drop: 'scaleGreaves' },
    { id: 'causeway-lions', kind: 'monster', x: 12, y: 25, creature: 'lion', count: 6, drop: 'chariotSandals' },
    { id: 'sand-scorpions', kind: 'monster', x: 4, y: 24, creature: 'scorpion', count: 6 },
    { id: 'chest-scorpions', kind: 'monster', x: 5, y: 28, creature: 'scorpion', count: 8 },
    { id: 'quarry-scorpions', kind: 'monster', x: 30, y: 9, creature: 'scorpion', count: 10 },
    { id: 'rock-lions', kind: 'monster', x: 33, y: 18, creature: 'lion', count: 5 },
    { id: 'sandbar-raiders', kind: 'monster', x: 24, y: 28, creature: 'raider', count: 14 },
    { id: 'desert-cobras', kind: 'monster', x: 29, y: 24, creature: 'cobra', count: 14 },
    { id: 'chest-hyenas', kind: 'monster', x: 35, y: 8, creature: 'hyena', count: 30 },
    // Sites.
    { id: 'abu-merc-camp', kind: 'mercCamp', x: 7, y: 10 },
    { id: 'abu-watchtower', kind: 'watchtower', x: 3, y: 21 },
    { id: 'abu-stone', kind: 'standingStone', x: 10, y: 27 },
    { id: 'abu-windmill', kind: 'windmill', x: 26, y: 6, resource: 'gems', amount: 3 },
    { id: 'abu-shrine', kind: 'shrine', x: 28, y: 14, spell: 'slow' },
    // Treasure.
    { id: 'abu-chest-west', kind: 'chest', x: 4, y: 28, gold: 2000 },
    { id: 'abu-chest-east', kind: 'chest', x: 36, y: 7, gold: 2000 },
    { id: 'abu-fire-north', kind: 'campfire', x: 4, y: 2, gold: 500, resource: 'wood', amount: 5 },
    { id: 'abu-fire-south', kind: 'campfire', x: 8, y: 22, gold: 600, resource: 'ore', amount: 5 },
    { id: 'abu-fire-east', kind: 'campfire', x: 24, y: 3, gold: 700, resource: 'ore', amount: 4 },
    { id: 'abu-pile-wood', kind: 'pile', x: 2, y: 9, resource: 'wood', amount: 8 },
    { id: 'abu-pile-ore', kind: 'pile', x: 6, y: 18, resource: 'ore', amount: 7 },
    { id: 'abu-pile-gold-1', kind: 'pile', x: 10, y: 11, resource: 'gold', amount: 1000 },
    { id: 'abu-pile-gold-2', kind: 'pile', x: 2, y: 25, resource: 'gold', amount: 750 },
    { id: 'abu-pile-gold-3', kind: 'pile', x: 33, y: 25, resource: 'gold', amount: 1500 },
    { id: 'abu-pile-mercury', kind: 'pile', x: 22, y: 9, resource: 'mercury', amount: 4 },
    { id: 'abu-pile-sulfur', kind: 'pile', x: 37, y: 12, resource: 'sulfur', amount: 4 },
    { id: 'abu-pile-crystal', kind: 'pile', x: 27, y: 30, resource: 'crystal', amount: 4 },
    { id: 'abu-pile-gems', kind: 'pile', x: 36, y: 29, resource: 'gems', amount: 4 },
  ],
};
