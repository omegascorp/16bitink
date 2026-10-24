import type { MapDef } from './types';

/**
 * Chapter 1, map 1: Ashford. Rowan holds a small hill town on the Crown's
 * border; an ogre warband has taken the old bridge on the north road.
 * A tutorial in one map: moving, a first fight, piles and mines, building
 * and hiring, then the warband.
 */
export const ASHFORD: MapDef = {
  id: 'ashford',
  name: 'Ashford',
  n: 1,
  intro: [
    'Ogres have taken the old bridge on the north road, and no cart has crossed it in a week.',
    'Ashford is small, but its people are stubborn. Hold the town, raise an army, and clear the bridge.',
  ],
  goal: { kind: 'defeat', target: 'ogres', text: 'beat the ogre warband at the old bridge' },
  parDays: 21,
  rows: [
    'TTMMMMMMMMMMMMMMMMMMMMMMM~~MMMMM',
    'TTMMggMMMggMMMggMMMggMMMg~~ggggP',
    'TggggggggggggggRggggggggg~~grrgP',
    'TgggggggggggggggggTTTTggg~~grrPP',
    'TTggggggggggggggggTgTTggg~~grrgP',
    'TTggggggggggggggggTgTTgg~~~ggggP',
    'Tggggg=gggggRgggggggTggg~~~gggPP',
    'Tggggg=ggggggggggggggggg~~~ggggP',
    'TTgggg========gggggggggg~~~ggggP',
    'TTgggggggTTgT=ggTgTgTggRg~~gggPP',
    'TgTTTggggTgTT=gTTggTTgggg~~ggggP',
    'TgTTTgggggggg=ggggggggggg~~ggggP',
    'TTTTTgggggggg============bb=====',
    'TTgggggggRggg=ggggggggggg~~ggggP',
    'Tgggggggggggg=ggggggggggg~~ggggP',
    'Tggwggggggggg=gggrRrrRrrg~~gggPP',
    'TTwwwwwwggggg=gggrrrrrRrg~~ggggP',
    'TTwwwwwwggddddgggrrrrrrrg~~ggggP',
    'Tgwwwwwwwgddddgggrrrrrrrg~~gggPP',
    'TgwwwwwwggddddgggrrrrrrRg~~ggggP',
    'TTwwwwwwgggggggggrrrrrrrg~~ggggP',
    'TTgggggggggggggggRrrRrrrg~~gggPP',
    'TggTggTggTggTggTggTggTggT~~ggggP',
    'TTTTTTTTTTTTTTTTTTTTTTTTT~~TTTTT',
  ],
  town: { id: 'ashford-town', name: 'Ashford', x: 6, y: 5, built: ['villageHall', 'fort', 'tavern', 'guardhouse'], guild: ['bless', 'stoneSkin', 'slow'] },
  hero: {
    id: 'rowan', name: 'Rowan', heroClass: 'knight', x: 6, y: 6,
    attack: 2, defense: 2, power: 1, knowledge: 1, skills: { leadership: 1 }, spells: ['magicArrow'], hasBook: true,
    army: [{ creature: 'spearman', count: 18 }, { creature: 'bowman', count: 7 }],
  },
  purse: { gold: 7500, wood: 15, ore: 15, mercury: 3, sulfur: 3, crystal: 3, gems: 3 },
  off: ['cityHall', 'capitol', 'castle', 'marketplace', 'mageGuild2', 'monastery', 'stables', 'tiltyard', 'seraphSpire'],
  seed: 1024,
  objects: [
    // Mines.
    { id: 'sawmill', kind: 'mine', x: 10, y: 6, resource: 'wood', owner: 'neutral' },
    { id: 'ore-pit', kind: 'mine', x: 3, y: 14, resource: 'ore', owner: 'neutral' },
    { id: 'gold-mine', kind: 'mine', x: 20, y: 18, resource: 'gold', owner: 'neutral' },
    // Monsters.
    { id: 'goblins', kind: 'monster', x: 11, y: 7, creature: 'goblin', count: 4 },
    { id: 'pit-wolves', kind: 'monster', x: 4, y: 13, creature: 'wolf', count: 10 },
    { id: 'graveyard', kind: 'monster', x: 12, y: 17, creature: 'skeleton', count: 8 },
    { id: 'mine-bandits', kind: 'monster', x: 19, y: 17, creature: 'bandit', count: 9 },
    { id: 'glade-wolves', kind: 'monster', x: 19, y: 7, creature: 'wolf', count: 6 },
    { id: 'mill-goblins', kind: 'monster', x: 16, y: 15, creature: 'goblin', count: 14 },
    { id: 'road-bandits', kind: 'monster', x: 18, y: 12, creature: 'bandit', count: 12 },
    { id: 'tower-wolves', kind: 'monster', x: 21, y: 13, creature: 'wolf', count: 6 },
    { id: 'ogres', kind: 'monster', x: 24, y: 12, creature: 'ogre', count: 8 },
    // Sites.
    { id: 'merc-camp', kind: 'mercCamp', x: 16, y: 4 },
    { id: 'watchtower', kind: 'watchtower', x: 22, y: 14 },
    { id: 'stone', kind: 'standingStone', x: 11, y: 18 },
    { id: 'shrine', kind: 'shrine', x: 8, y: 12, spell: 'haste' },
    { id: 'windmill', kind: 'windmill', x: 15, y: 15, resource: 'crystal', amount: 4 },
    { id: 'stables', kind: 'stables', x: 17, y: 7 },
    // Treasure.
    { id: 'chest-glade', kind: 'chest', x: 19, y: 4, gold: 1500 },
    { id: 'chest-swamp', kind: 'chest', x: 3, y: 20, gold: 1000 },
    { id: 'chest-east', kind: 'chest', x: 29, y: 6, gold: 2000 },
    { id: 'fire-north', kind: 'campfire', x: 8, y: 2, gold: 500, resource: 'wood', amount: 5 },
    { id: 'fire-road', kind: 'campfire', x: 16, y: 13, gold: 600, resource: 'ore', amount: 4 },
    { id: 'pile-wood-1', kind: 'pile', x: 3, y: 7, resource: 'wood', amount: 7 },
    { id: 'pile-ore-1', kind: 'pile', x: 9, y: 4, resource: 'ore', amount: 6 },
    { id: 'pile-gold-1', kind: 'pile', x: 14, y: 6, resource: 'gold', amount: 750 },
    { id: 'pile-gems', kind: 'pile', x: 28, y: 3, resource: 'gems', amount: 5 },
    { id: 'pile-crystal', kind: 'pile', x: 23, y: 7, resource: 'crystal', amount: 4 },
    { id: 'pile-mercury', kind: 'pile', x: 7, y: 19, resource: 'mercury', amount: 4 },
    { id: 'pile-sulfur', kind: 'pile', x: 22, y: 20, resource: 'sulfur', amount: 4 },
    { id: 'pile-wood-2', kind: 'pile', x: 16, y: 19, resource: 'wood', amount: 8 },
    { id: 'pile-ore-2', kind: 'pile', x: 20, y: 13, resource: 'ore', amount: 7 },
    { id: 'pile-gold-2', kind: 'pile', x: 28, y: 15, resource: 'gold', amount: 1000 },
  ],
};
