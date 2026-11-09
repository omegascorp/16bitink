import { NEFERET } from './recruits';
import type { MapDef } from './types';
import { lockedIn, TWO_LANDS_UNLOCKS } from './unlocks';

/**
 * Chapter 2, part 4: the Delta (in its own tiles; see twoLands.ts, which
 * lays it in the sea north of the Red Land and east of Nekhen, and on east
 * of the Red Land: an L round the land won so far, 80 × 56, the hole its
 * south-west corner, where Abu and the Red Land lie). With Sethi beaten the
 * south is one, but Apepi, a king of the Hyksos, holds the Delta from
 * Avaris and rides for Iunu, where the Benben stone stands. The chapter's
 * last part, and its freest, as Othrys is chapter 1's: three ways in, none
 * forced, two neutral towns to race for, outer dwellings, learning stones,
 * a mastaba, and the rest of Egypt's town to build.
 *
 * The regions: the marshes along the coast in the north-west (the Nile's
 * two branches, Per-Wadjet on its island, fords and bridges), the fields
 * south of the river (Men-nefer, the White Walls, farms and mines), Iunu
 * on its rise in the middle (a ring of mountains with two ways up, the
 * House of the Benben and Ammit on top), and the desert edge in the east
 * (Avaris, Per-Bastet down the desert road, the road from Sinai).
 * Part of the full game: never imported by the game's client code (it is
 * served from content/paid.ts to owners).
 */
export const DELTA_LAND: MapDef = {
  id: 'delta',
  name: 'The Delta',
  n: 8,
  brief: 'Three ways in: past the White Walls from Nekhen, up the Red Land\u2019s north wadi, the desert road behind Nubt. Take Avaris and Per-Bastet and beat Apepi: his captains leave with him.',
  story: 'part-delta',
  goal: { kind: 'overthrow', target: 'avaris-town', text: 'take Avaris and Per-Bastet, and beat Apepi' },
  parDays: 45,
  rows: [
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~s~~ss~~~~s~ss~~~~~~ss~~s~~~~~~s~~s~~~~~~~~~~~s~~s~s~~~~~~~~~~s~~s~~~~~s~~~s~~~~',
    'Dwswwsww~~wwswsswswwwswswwsssswswsww~~~~swswswsswwwswswssDsssksssssssssssssssssD',
    'Dgggwwwg~~wwwwwTggwggwwgggwwwwggw~~~~gwwgTgggggggggwggggTTssgggggggggggsssssDssD',
    'Dggwwwgwwwggggwgggwgggwwggwwwgg~~~~wwgggggwggwggggggTwwggggggggggggggggggkkssssD',
    'Dggwwwww~~wwggTwggggggggwwggwwwwwwwwwgwggwwgwgwwwwggggggTggggggggggsggggggsssDsD',
    'Dgwwgwgwg~~gggwgggggggggwg~~~~gwgwgwgg====================gggggTTgsssgggggssssDD',
    'Dwggggwwg~~gggggggw=gwg~~~~TwwgwTgwww=gwgwgwgggwTwTg=wwggg=ggggggssssssggggDsssD',
    'Dgggggwwg~~www=======bbbb============ggwwgrrwrwrwwgg=gggggg=gggggssssssggggssDsD',
    'Dwwwwggwg~~ggg=gwg~~~~wwgwgTgwgwwwgT=ggggrgMMMMMMMrr=ggggggg=ggggg=sgggggggDsDsD',
    'Dggwwwwgw~~ggg=w~~~~wwgwwTTwwggwwwg=wggrrMMMMMMMMMMr=rgggTggg======g=gggggsDsssD',
    '~~~~w~~~~~~gg~b~~ggggggggggggggggg=ggggrMMMrrrRrrrM=rrrgggggTgggTgggT=gggsssDssD',
    '~~~~w~~~~~~~~~bggggggggggggggggggg=gggggMMrgrrrrrr=MMrrgggggsTggggggTg=ggssssssD',
    'DTgggggggTgggg=gggTgTggggggTTgggTg=ggggMMrrrrrgRRrrrMMggggsssgggggggTg=ssssssssD',
    'DgggggggTggggT=gggggggggTggggggggg=gRgRMMrrrrrgrrrrrMMgrgggDsssssssDss=ssssssssD',
    'DggdddgggTTggg=gggggggggggRggggTTg=RgggMMrrrrrgrrRrrMMggggssDsssssssss=ssskssssD',
    'Dggddggggggddg=gTggggggggddddggggg=ggrrrrrrrrrrrrrrrMMrrggssssssssssss=ssssssssD',
    'Dggggggggggddd=gTggggggggddddggggg=ggg====rgrrrrrgrrMMgrgggsssssssssss=sksDssssD',
    'Dggggg=ggggggg=gggddddTgggggTgggTg=Tg=TrMMrgrrrrrrrMMgrgggssksssssssss=ssssssssD',
    'Dg===================================TgrMMMrgrrRrRMMMgrgggsssksssDssss=sDsssDDsD',
    's=gggTTggdgdddgggdddgggg=dgddddddggggggrgMMMMMMMMMMMgggggggsssksssssss=sDsssssDD',
    'sggRggTggdddddTTTdddgdTg=ggTgddddggTgggggrgMMMMMMMgrggggggssssDsssksss=sssDssssD',
    'DDDDDDDDDDDDDDDDDDDDDDDDssDDDDDDDDDDDDDDDDDDDDDDDDskssksssssDkssssDssk=sssssDssD',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~DsssssDssssssssssssssD=ksssssssD',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~DsssssssssDDsssDssssss=sDssDsskD',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~DssssskDsssssksksDDsDs=sssssssDD',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~DDDDDDDDDDDDDsDsssssss=ssssksssD',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~DDssssDssssksssDssskDD=kssssssDD',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~DsDsssssssksDsssssssDs=ssssssssD',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~DsskssssssssssDssDssss=========D',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~DsDsssssssssssssssssss=ssDsssDDD',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ssssssssssssssssssssss=ssskssssD',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~s========sssskssDsssss=ssssssssD',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~DssssssDs=ssssssssssss=sssssssDD',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~Dsskssssss=ssDsssksskk=sssDsssDD',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~Dssssssssss=sssssDssss=DsDDssssD',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~DDssssssssss=sssssssss=ssssskssD',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~DssDssssssks=sssssssss=DsssssssD',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~Dsssssksssss===sskssss=sssssssDD',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~DkssDsssssssss=========ssssssssD',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~DksssssDDDsssksssskDsDDssDsssssD',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~DskssssDDssssDsssssDDssssssskssD',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~DsssssssDkssDDsssssssssssssDsDsD',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~DsssssssDsDksDDssssDsssDsssssssD',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~DsskssssDsssssssDDDDDDDDDDDDDDsD',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~DsssDsssDssssssssDssssDssssksDsD',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~DsssssssDssssksDssssssssssssDssD',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~DssssssDDDsssDDsksssksDssDsssssD',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~DsssssssDsDsssskssssssssksssssDD',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~DsssDsssDssskkssssksssssskDsssDD',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~DkssssssDsssssDssssssDsssssssssD',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~DsssssssDsssssssDssssssssssssDsD',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~DsssDssDssssssDDsssksDsssssssskD',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~DDsssssssssssssDsksssDDsssssDssD',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD',
  ],
  // Men-nefer, the White Walls: in the chapter a neutral town both sides race for (twoLands.ts; the home town is Nekhen).
  town: {
    id: 'men-nefer-town', name: 'Men-nefer', x: 6, y: 18, faction: 'kemet',
    built: ['villageHall', 'townHall', 'fort', 'tavern', 'guardhouse', 'archeryRange', 'griffinTower'],
    guild: ['cure', 'stoneSkin', 'haste', 'slow', 'dispel'],
    // calibrated by the lord balance runs
    garrison: [{ creature: 'levy', count: 60 }, { creature: 'nubian', count: 28 }, { creature: 'jackal', count: 16 }, { creature: 'lion', count: 10 }],
  },
  towns: [
    // Per-Wadjet, the cobra goddess's town in the marshes: both sides race for it (and Men-nefer) from the part's third night.
    {
      id: 'per-wadjet-town', name: 'Per-Wadjet', x: 19, y: 7, faction: 'kemet', race: true,
      built: ['villageHall', 'townHall', 'fort', 'tavern', 'guardhouse', 'barracks', 'stables'],
      guild: ['ward', 'slow', 'magicArrow', 'cure', 'lightningBolt'],
      // calibrated by the lord balance runs
      garrison: [{ creature: 'raider', count: 48 }, { creature: 'nubian', count: 24 }, { creature: 'chariot', count: 8 }, { creature: 'cobra', count: 40 }],
    },
    // Apepi's: Avaris, the Hyksos' city at the desert edge, and Per-Bastet, a smaller town down the desert road.
    {
      id: 'avaris-town', name: 'Avaris', x: 66, y: 9, owner: 'rival', faction: 'kemet', look: 'avaris',
      built: ['villageHall', 'townHall', 'fort', 'citadel', 'tavern', 'marketplace', 'mageGuild1', 'blacksmith', 'guardhouse', 'archeryRange', 'griffinTower', 'barracks', 'monastery', 'guardhouse2', 'archeryRange2', 'griffinTower2', 'barracks2'],
      guild: ['curse', 'slow', 'magicArrow', 'haste', 'bloodlust'],
      // calibrated by the lord balance runs
      garrison: [{ creature: 'levy2', count: 120 }, { creature: 'nubian2', count: 80 }, { creature: 'jackal2', count: 40 }, { creature: 'chariot2', count: 20 }, { creature: 'mummy', count: 12 }],
    },
    {
      id: 'per-bastet-town', name: 'Per-Bastet', x: 62, y: 38, owner: 'rival', faction: 'kemet', look: 'avaris',
      built: ['villageHall', 'fort', 'guardhouse', 'archeryRange'],
      guild: ['cure', 'slow', 'curse'],
      // calibrated by the lord balance runs
      garrison: [{ creature: 'levy', count: 80 }, { creature: 'nubian', count: 48 }],
    },
  ],
  // Played fresh, Neferet comes up the Red Land's north wadi with about what a rider brings (twoLands.ts places her): the lord balance runs' riders bring 5000 to 19,600, about 8800 in the middle (Nov 9).
  hero: {
    ...NEFERET, x: 25, y: 22,
    attack: 2, defense: 2, power: 4, knowledge: 4, skills: { wisdom: 2, leadership: 1 }, spells: ['curse', 'ward', 'rebirth', 'slow'],
    gear: { book: 'novicePapyrus', machine: 'ramp2' }, ankhs: 3,
    army: [{ creature: 'levy2', count: 406 }, { creature: 'nubian2', count: 221 }, { creature: 'jackal', count: 111 }, { creature: 'chariot', count: 56 }, { creature: 'mummy', count: 22 }],
  },
  rival: {
    // Wears 2 blue, 2 green and 1 purple piece; his base stats are lowered by what they add (src/logic/lord/kit.ts).
    kit: { apepi: { weapon: 'electrumKhopesh', shield: 'kushiteShield', helm: 'medjayHelm', amulet: 'ankhAmulet', cuirass: 'falconCuirass' } },
    mind: 'lord',
    hero: {
      id: 'apepi', name: 'Apepi', heroClass: 'knight', x: 66, y: 9, faction: 'kemet',
      attack: 6, defense: 5, power: 2, knowledge: 3, skills: { offense: 2, leadership: 1, archery: 1 }, spells: ['curse', 'slow', 'bloodlust'],
      gear: { book: 'novicePapyrus', machine: 'ramp2' },
      // calibrated by the lord balance runs
      army: [{ creature: 'levy2', count: 120 }, { creature: 'nubian2', count: 72 }, { creature: 'jackal2', count: 42 }, { creature: 'chariot2', count: 21 }, { creature: 'mummy', count: 9 }],
    },
    // What a list-minded rival would build; the lord plans his own (src/logic/lord/), saving for the Benben Stone.
    build: ['cityHall', 'stables', 'castle', 'mageGuild2', 'monastery2', 'seraphSpire', 'tiltyard', 'guardhouse3', 'archeryRange3', 'griffinTower3', 'barracks3', 'capitol', 'seraphSpire2', 'tiltyard2', 'monastery3', 'tiltyard3', 'seraphSpire3'],
    // calibrated by the lord balance runs
    purse: { gold: 10000, wood: 20, ore: 20, mercury: 9, sulfur: 9, crystal: 9, gems: 9 },
  },
  purse: { gold: 15000, wood: 25, ore: 25, mercury: 8, sulfur: 8, crystal: 8, gems: 8 },
  // What the chapter has opened by its fourth part (src/level/unlocks.ts): the whole of Egypt's tree.
  off: lockedIn(TWO_LANDS_UNLOCKS, 4),
  seed: 8801,
  objects: [
    // Tombs: a new group each week, in the east toward Avaris and Per-Bastet.
    { id: 'iunu-tomb', kind: 'lair', x: 56, y: 14, creature: 'cobra', count: 65, look: 'tomb' },
    { id: 'dune-tomb', kind: 'lair', x: 66, y: 17, creature: 'scorpion', count: 36, look: 'tomb' },
    // The marshes: the west strip over the ford, Per-Wadjet’s island between the branches, the gem pond by the shore.
    { id: 'crocodile-marsh', kind: 'dwelling', x: 4, y: 8, look: 'crocodileMarsh', creature: 'crocodile', growth: 4, stock: 4, owner: 'neutral' },
    { id: 'marsh-crocodiles', kind: 'monster', x: 5, y: 9, creature: 'crocodile', count: 30 },
    { id: 'delta-chest-reeds', kind: 'chest', x: 2, y: 5, gold: 1500 },
    { id: 'delta-pile-wood-reeds', kind: 'pile', x: 6, y: 10, resource: 'wood', amount: 8 },
    { id: 'wadjet-shrine', kind: 'shrine', x: 12, y: 5, spell: 'ward' },
    { id: 'shrine-cobras', kind: 'monster', x: 13, y: 6, creature: 'cobra', count: 70 },
    { id: 'stone-marsh', kind: 'learningStone', x: 12, y: 10 },
    { id: 'delta-fire-marsh', kind: 'campfire', x: 11, y: 8, gold: 700, resource: 'wood', amount: 6 },
    { id: 'delta-pile-gold-isle', kind: 'pile', x: 16, y: 4, resource: 'gold', amount: 1500 },
    { id: 'delta-gem-pond', kind: 'mine', x: 25, y: 5, resource: 'gems', owner: 'neutral' },
    { id: 'pond-crocodiles', kind: 'monster', x: 26, y: 6, creature: 'crocodile', count: 32 },
    // Apepi’s roads to the raced towns are guarded: the coast road west over the branch, the field road south.
    { id: 'bridge-raiders', kind: 'monster', x: 30, y: 10, creature: 'raider', count: 75 },
    { id: 'field-road-hyenas', kind: 'monster', x: 35, y: 14, creature: 'hyena', count: 130 },
    // The fields: in from Nekhen past the White Walls, up from the Red Land’s wadi; farms, mines, the camp.
    // Our way to Men-nefer: a guard a rider fights (calibrated by the lord balance runs).
    { id: 'walls-lions', kind: 'monster', x: 2, y: 22, creature: 'lion', count: 22 },
    { id: 'delta-fire-fields', kind: 'campfire', x: 3, y: 15, gold: 600, resource: 'ore', amount: 5 },
    { id: 'delta-pile-ore-fields', kind: 'pile', x: 10, y: 21, resource: 'ore', amount: 8 },
    { id: 'delta-gold-mine', kind: 'mine', x: 12, y: 16, resource: 'gold', owner: 'neutral' },
    { id: 'field-mine-lions', kind: 'monster', x: 13, y: 17, creature: 'lion', count: 20 },
    { id: 'delta-merc-camp', kind: 'mercCamp', x: 18, y: 16 },
    { id: 'delta-watchtower', kind: 'watchtower', x: 22, y: 15 },
    { id: 'delta-sawmill', kind: 'mine', x: 20, y: 22, resource: 'wood', owner: 'neutral' },
    { id: 'palm-hyenas', kind: 'monster', x: 21, y: 21, creature: 'hyena', count: 110 },
    // The wadi's head (way 2): a light guard, but the long road round to everything.
    { id: 'wadi-head-raiders', kind: 'monster', x: 26, y: 21, creature: 'raider', count: 45 },
    { id: 'delta-pile-gold-fields', kind: 'pile', x: 28, y: 22, resource: 'gold', amount: 1500 },
    { id: 'delta-ore-pit', kind: 'mine', x: 28, y: 16, resource: 'ore', owner: 'neutral' },
    { id: 'pit-scorpions', kind: 'monster', x: 29, y: 17, creature: 'scorpion', count: 36 },
    { id: 'delta-stables', kind: 'stables', x: 31, y: 18 },
    { id: 'delta-pile-mercury', kind: 'pile', x: 33, y: 15, resource: 'mercury', amount: 5 },
    { id: 'delta-stone', kind: 'standingStone', x: 37, y: 14 },
    { id: 'delta-chest-fields', kind: 'chest', x: 37, y: 22, gold: 2000 },
    { id: 'field-chest-lions', kind: 'monster', x: 36, y: 21, creature: 'lion', count: 24 },
    // Iunu on its rise: the west way up and the north-east one, Ammit at the House of the Benben.
    { id: 'iunu-west-scorpions', kind: 'monster', x: 37, y: 16, creature: 'scorpion', count: 40 },
    { id: 'iunu-north-cobras', kind: 'monster', x: 53, y: 9, creature: 'cobra', count: 80 },
    { id: 'iunu-lab', kind: 'mine', x: 43, y: 19, resource: 'mercury', owner: 'neutral' },
    { id: 'lab-scorpions', kind: 'monster', x: 44, y: 20, creature: 'scorpion', count: 34 },
    { id: 'benben-house', kind: 'dwelling', x: 46, y: 15, look: 'benbenHouse', creature: 'bennu', growth: 1, stock: 1, owner: 'neutral' },
    // calibrated by the lord balance runs (Ammit should cost a strong army 25-40%)
    { id: 'benben-ammit', kind: 'monster', x: 46, y: 16, creature: 'ammit', count: 22, drop: 'crookAndFlail' },
    { id: 'iunu-chest', kind: 'chest', x: 43, y: 13, gold: 2000 },
    { id: 'iunu-pile-gems', kind: 'pile', x: 49, y: 18, resource: 'gems', amount: 6 },
    // The north shore east of the branch: the crystal cavern, the sun shrine.
    { id: 'delta-crystal-cavern', kind: 'mine', x: 44, y: 5, resource: 'crystal', owner: 'neutral' },
    { id: 'cavern-crocodiles', kind: 'monster', x: 45, y: 6, creature: 'crocodile', count: 34 },
    { id: 'sun-shrine', kind: 'shrine', x: 40, y: 5, spell: 'lightningBolt' },
    { id: 'delta-pile-wood-shore', kind: 'pile', x: 48, y: 4, resource: 'wood', amount: 8 },
    // The desert edge: Avaris and its mines, the mastaba, the road from Sinai, Per-Bastet, the lion rocks.
    { id: 'avaris-sawmill', kind: 'mine', x: 60, y: 14, resource: 'wood', owner: 'rival' },
    { id: 'avaris-ore-pit', kind: 'mine', x: 73, y: 13, resource: 'ore', owner: 'rival' },
    { id: 'delta-pile-gold-east', kind: 'pile', x: 75, y: 20, resource: 'gold', amount: 2000 },
    { id: 'mastaba', kind: 'bank', x: 58, y: 20, look: 'mastaba', prize: { gold: 6000, crystal: 4, gems: 4 }, item: 'alexandrianCodex' },
    { id: 'mastaba-mummies', kind: 'monster', x: 57, y: 21, creature: 'mummy2', count: 25 },
    { id: 'delta-sulfur-dune', kind: 'mine', x: 64, y: 27, resource: 'sulfur', owner: 'neutral' },
    { id: 'dune-scorpions', kind: 'monster', x: 65, y: 28, creature: 'scorpion', count: 38 },
    { id: 'delta-pile-sulfur', kind: 'pile', x: 58, y: 30, resource: 'sulfur', amount: 5 },
    { id: 'sinai-raiders', kind: 'monster', x: 74, y: 31, creature: 'raider', count: 70 },
    { id: 'delta-chest-sinai', kind: 'chest', x: 77, y: 33, gold: 1500 },
    // Way 3, out of Nubt's basin: the costly short cut to Per-Bastet.
    { id: 'gate-mummies', kind: 'monster', x: 50, y: 34, creature: 'mummy', count: 34 },
    { id: 'lion-rocks', kind: 'dwelling', x: 53, y: 40, look: 'lionRocks', creature: 'lion', growth: 3, stock: 3, owner: 'neutral' },
    { id: 'rocks-lions', kind: 'monster', x: 54, y: 41, creature: 'lion', count: 22 },
    { id: 'delta-pile-ore-east', kind: 'pile', x: 62, y: 47, resource: 'ore', amount: 8 },
    { id: 'stone-desert', kind: 'learningStone', x: 66, y: 49 },
    { id: 'delta-fire-desert', kind: 'campfire', x: 60, y: 51, gold: 800, resource: 'mercury', amount: 4 },
    { id: 'delta-pile-crystal', kind: 'pile', x: 71, y: 50, resource: 'crystal', amount: 5 },
    { id: 'delta-chest-dunes', kind: 'chest', x: 76, y: 52, gold: 2000 },
    { id: 'dunes-hyenas', kind: 'monster', x: 75, y: 51, creature: 'hyena', count: 120 },
    { id: 'delta-pile-gems-east', kind: 'pile', x: 52, y: 51, resource: 'gems', amount: 5 },
  ],
};
