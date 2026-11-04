import type { MapDef } from './types';
import { lockedOn } from './unlocks';

/**
 * Chapter 1's second land: Thornwood, east of Ashford's (see borderMarch.ts,
 * which places it, and its town and hero, in the chapter). Brigands under a
 * cyclops chief have taken Thornwood, the timber town in the forest across
 * the river: the first part with two towns, and a town to take from its
 * garrison. In its own tiles; its `town` (Millbrook) is not used, as the
 * chapter's home town is Ashford.
 */
export const THORNWOOD_LAND: MapDef = {
  id: 'thornwood',
  name: 'Thornwood',
  n: 2,
  intro: [
    'Across the river, brigands and their cyclops chief have taken Thornwood. Its sawmills stand idle and its people hide in the forest.',
    'Raise an army at Millbrook, cross the river, and take Thornwood back from its garrison. Its dwellings will be yours to hire from.',
  ],
  goal: { kind: 'capture', target: 'thornwood-town', text: 'take Thornwood from the brigands' },
  parDays: 28,
  rows: [
    'TMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMP',
    'MMgMgMMgMMMMMgMMgg~~gMgMMMMgMggPgPPPgPPP',
    'Tggggggggggggggggg~~ggTgPgggTPgPPgggPggP',
    'TgggTgggTTgggggggg~~ggggggTgggPgPrrrTPgP',
    'TggRgggggggggggggg~~ggggPTgPPggPrrrrrggP',
    'Tggggggggggggggggg~~gTgggPPPPPPrrrrrrrgP',
    'Tggggggggggggggg==bb=====gggPPgrrrrrrrgP',
    'Tggggggggggggggg=g~~gggg=ggPPPgrrrrrrrgP',
    'TgTggggggggggggg=g~~gggg=gggggTTrrrrrTgP',
    'Tggggggg=ggggggg=gg~~Tgg=ggggggggrrrPTPP',
    'TgTggggg=ggggggg=gg~~ggg=gggPPgPggPggPPP',
    'Tggggggg=ggggggg=gg~~ggg=gggggggggggggPP',
    'TTgggggg=========gg~~ggP=gPgggggggPggPgP',
    'Tggggggg=gTgggggggg~~PTg=PgggggggggggPgP',
    'Tggggggg=ggggggggg~~gggg=gTgggggggggPPPP',
    'TggggRgg=gggggTggg~~gTPP========ggggTggP',
    'Tggggggg=ggdddgggg~~gPPTgggg=gggggggPggP',
    'TTgggggg=gdddddTgg~~gPPPPPgg=gggggggTggP',
    'Tggggggg=gdddddggg~~gggPgggg=gggggTggggP',
    'Tggggggg=gdddddggg~~ggTggggg=TgggPggggPP',
    'Tggggggg=ggdddgggg~~gTg======gTTgPgggPgP',
    'TgTwwwgg=gggggggg~~ggPP=ggggTgPggPPgTgTP',
    'Tgwwwwwg=gggggggg~~gggg=gggggTPgPgwwwggP',
    'Twwwwwww=gggggggg~~gggg=ggggggPggwwwwwgP',
    'Twwwwwww=gTggggggg~~gTg=ggggggPgwwwwwwwP',
    'Twwwwwww=ggggggggg~~ggg=gggggggPwwwwwwwP',
    'Tgwwwwwg==========bb====ggggggPPwwwwwwwP',
    'TggwwwggggRggggggg~~gggggggggPgggwwwwwTP',
    'TggTggggTTggggTggg~~gggTTPgTgPPgPTwwwggP',
    'TggggTggggggTggggg~~gggPggPPPPTTPgggPTPP',
    'TgggggggggTggggggg~~ggPggPTTgPggTPTgggPP',
    'TTTTTTTTTTTTTTTTTTTTPPPPPPPPPPPPPPPPPPPP',
  ],
  town: { id: 'millbrook-town', name: 'Millbrook', x: 8, y: 9, built: ['villageHall', 'fort', 'tavern', 'guardhouse', 'archeryRange'], guild: ['bless', 'stoneSkin', 'slow', 'haste', 'cure'] },
  towns: [
    {
      id: 'thornwood-town', name: 'Thornwood', x: 31, y: 15,
      built: ['villageHall', 'townHall', 'fort', 'tavern', 'guardhouse', 'barracks'],
      guild: ['bless', 'bloodlust', 'slow', 'haste', 'dispel'],
      garrison: [{ creature: 'bandit', count: 18 }, { creature: 'ogre', count: 5 }, { creature: 'bandit', count: 14 }, { creature: 'wolf', count: 12 }],
    },
  ],
  hero: {
    id: 'rowan', name: 'Rowan', heroClass: 'knight', x: 8, y: 10,
    attack: 2, defense: 2, power: 1, knowledge: 1, skills: { leadership: 1 }, spells: ['magicArrow'], hasBook: true,
    army: [{ creature: 'spearman', count: 24 }, { creature: 'bowman', count: 10 }, { creature: 'griffin', count: 3 }],
  },
  purse: { gold: 10000, wood: 20, ore: 20, mercury: 5, sulfur: 5, crystal: 5, gems: 5 },
  // What the campaign has opened by this map (src/level/unlocks.ts).
  off: lockedOn(2),
  seed: 2207,
  objects: [
    // Mines.
    { id: 'sawmill', kind: 'mine', x: 4, y: 6, resource: 'wood', owner: 'neutral' },
    { id: 'ore-pit', kind: 'mine', x: 13, y: 17, resource: 'ore', owner: 'neutral' },
    { id: 'gold-mine', kind: 'mine', x: 35, y: 7, resource: 'gold', owner: 'neutral' },
    // The west: Millbrook's side of the river.
    { id: 'meadow-satyrs', kind: 'monster', x: 12, y: 7, creature: 'goblin', count: 10 },
    { id: 'copse-wolves', kind: 'monster', x: 5, y: 18, creature: 'wolf', count: 8 },
    { id: 'swamp-dead', kind: 'monster', x: 8, y: 23, creature: 'skeleton', count: 12 },
    { id: 'pit-brigands', kind: 'monster', x: 13, y: 20, creature: 'bandit', count: 8 },
    // The crossings.
    { id: 'bridge-wolves', kind: 'monster', x: 21, y: 6, creature: 'wolf', count: 16 },
    { id: 'ford-spartoi', kind: 'monster', x: 21, y: 26, creature: 'skeleton', count: 24 },
    // Thornwood forest.
    { id: 'lane-brigands', kind: 'monster', x: 24, y: 11, creature: 'bandit', count: 16 },
    { id: 'mine-cyclops', kind: 'monster', x: 33, y: 9, creature: 'ogre', count: 5 },
    { id: 'glade-satyrs', kind: 'monster', x: 26, y: 21, creature: 'goblin', count: 30 },
    { id: 'bog-wolves', kind: 'monster', x: 33, y: 23, creature: 'wolf', count: 18 },
    { id: 'gate-brigands', kind: 'monster', x: 28, y: 18, creature: 'bandit', count: 20 },
    // Sites.
    { id: 'stables', kind: 'stables', x: 11, y: 4 },
    { id: 'merc-camp', kind: 'mercCamp', x: 14, y: 24 },
    { id: 'stone', kind: 'standingStone', x: 3, y: 13 },
    { id: 'windmill', kind: 'windmill', x: 25, y: 9, resource: 'crystal', amount: 4 },
    { id: 'shrine', kind: 'shrine', x: 26, y: 24, spell: 'bloodlust' },
    { id: 'watchtower', kind: 'watchtower', x: 36, y: 20 },
    // Treasure.
    { id: 'chest-north', kind: 'chest', x: 3, y: 2, gold: 1000 },
    { id: 'chest-forest', kind: 'chest', x: 38, y: 3, gold: 2000 },
    { id: 'chest-bog', kind: 'chest', x: 36, y: 27, gold: 1500 },
    { id: 'fire-meadow', kind: 'campfire', x: 11, y: 11, gold: 500, resource: 'wood', amount: 5 },
    { id: 'fire-lane', kind: 'campfire', x: 27, y: 13, gold: 700, resource: 'ore', amount: 5 },
    { id: 'pile-wood-1', kind: 'pile', x: 3, y: 9, resource: 'wood', amount: 8 },
    { id: 'pile-ore-1', kind: 'pile', x: 14, y: 3, resource: 'ore', amount: 7 },
    { id: 'pile-gold-1', kind: 'pile', x: 14, y: 9, resource: 'gold', amount: 1000 },
    { id: 'pile-mercury', kind: 'pile', x: 2, y: 28, resource: 'mercury', amount: 4 },
    { id: 'pile-sulfur', kind: 'pile', x: 12, y: 28, resource: 'sulfur', amount: 4 },
    { id: 'pile-gems', kind: 'pile', x: 29, y: 3, resource: 'gems', amount: 5 },
    { id: 'pile-crystal', kind: 'pile', x: 38, y: 12, resource: 'crystal', amount: 4 },
    { id: 'pile-gold-2', kind: 'pile', x: 22, y: 18, resource: 'gold', amount: 1500 },
    { id: 'pile-wood-2', kind: 'pile', x: 29, y: 26, resource: 'wood', amount: 8 },
  ],
};
