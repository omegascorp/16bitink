import type { MapDef } from './types';
import { lockedOn } from './unlocks';

/**
 * Chapter 1, part 4: Othrys, the Titans' mountain (in its own tiles; see
 * borderMarch.ts, which lays it east of the land won so far). Kassander
 * served a master: Lykaon, the wolf-king of Arcadia, rides from Lykosoura
 * for the Titans' forge on Mount Othrys. The chapter's last part, and its
 * freest: three ways in, four regions each reached from two sides or more,
 * two neutral towns to race for, outer dwellings, learning stones and a
 * treasure keep, and the rest of the Greek town to build.
 *
 * The regions: the coast in the north (Iolkos, Jason's harbour), the
 * Thessalian plain in the west (Pherai), Mount Othrys in the middle (a
 * ring of mountains with two ways up, the forge on its snowy summit) and
 * the Arcadian highlands in the south (Lykaon's Lykosoura and Tegea).
 */
export const OTHRYS_LAND: MapDef = {
  id: 'othrys',
  name: 'Othrys',
  n: 4,
  brief: 'Three ways in: the ford east of Korax, the coast road, the mountain pass. Take Lykosoura and Tegea and beat Lykaon: his captains leave with him.',
  goal: { kind: 'overthrow', target: 'lykosoura-town', text: 'take Lykosoura and Tegea, and beat Lykaon' },
  parDays: 45,
  rows: [
    'M~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~M',
    'M~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~M',
    'M~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~M',
    'M~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~M',
    'MMssssssssssssssssssssssssssss~~~~~~~~~~~~~~~~~ssssssssM',
    'MMPrgggggggggggTgggggggggggggggsssssssssssssssgggggggTgM',
    'MPRgggggggRggggggggggggggggggggggggggggggggggggggggggggM',
    '================gggggggggggggggggggggggggggggggggggggggM',
    'MRrggggggggggggg=ggg=gggggggggggggggggTgggggggggggggggTM',
    'MMRgggggggTPggggg=gg=gggggggggggTggggggggggggggggggggggM',
    'MMrrTggggg=ggggggg====================================gM',
    'MMMrrRgggg=gggggggggggggggggggggTgggg=gggggggggggRggg=gM',
    'MMMRrggggg=TggggggggggggggTgggggggggg=ggPgggggggggggP=gM',
    'MMrrgggggg=gggggggTgggggggggggggggggg=gggggggggRggggg=gM',
    'MRPTTPTTPT=TTPgggTPTTTPTTTggggggggggg=ggggggggggggggg=gM',
    'MrrPPTPTPT=PPTTPTPPPTTPPPTggTgRgggggg=gggggggggggggRg=gM',
    'Mr~~gggggg=ggggggggggggggTggggggggggg=ggggggggggggggg=gM',
    'MM~~gggggg=gggggggggggggggggggggggggg=gggggggRPggTggg=gM',
    'MM~~gggggg=ggTgggggggggggggggggPgMMMM=MMMMggggggggggg=gM',
    'Mr~~RRgggg=gRgggggggggggTgggggggMMMMM=MMMMMgggggggggg=gM',
    'MP~~ggggRg=ggggggggggPgTggggTgMMMMrrr=rRrMMMMPgRgggPg=gM',
    'MM~~ggggdg=gTTgggggggggTgPggPgMMrrrrr=rrrrrMMgggggggg=PM',
    'MM~~ggdddd=ggRgggTgggggggggggMMrrrrrrRrrrrrrMMggggggg=gM',
    'Mr~~ggdddd=gTgggPgggggggggggMMrrgrrrrrrrrrrrrMMgggggg=TM',
    'MM~~gddddd=dggggggTgggggggggMMrgrrrrrrrrrrrrrMMgPgggg=TM',
    'MM~~ggdddd=ggggggggggggggggMMrrrrrrRRrrRrgrrrrMMggggg=gM',
    'MM~~ggdddd=gggTgPggggggggggMMrrrrrrrrnrrrrrrrrMMggggg=gM',
    'MM~~ggggdg=ggggggggggPgggggMMrrrrrrnnnnnrrrrrrMMggggg=gM',
    'MM~~gggggg=ggggggggggggggggMrrrrrrnnnnnnnrrrrrrMggggg=RM',
    'MM~~gggggg=gggggggggPggggggMrrrrrrnnnnnnnrrrrrrMggggg=gM',
    'MR~~gggggg=g=gggggggggggggMMrrrrrrnnnnnnnrrRrRrMMgggg=gM',
    'Mr~~gggggg===gggggggRgggggPMrrrrrrnnnnnnnrrrrrrMggggg=TM',
    'MP~~TgdTgg=ggggggggggggggggMrrrrrrnnnnnnnrrrrrrMggggg=gM',
    'MM~~gdddgg======================rrrnnnnnrgrrrrMMggggR=TM',
    'MM~~dddddg=gggggdddddggggggMMrrrrrgrrnrrrrrrrrMMggggg=gM',
    'MM~~Tdddgg=gggggdddddgggRgTMMrrrrrrrrRrrrrrrrrMMggggg=gM',
    'MM~~ggdggg=ggggdddddddggggggMMrrrrrrRrrrrrgrrMMgggggg=gM',
    'MM~~gggggg=TggggdddddgggggggMMrRrgrgrrRrrrRrrMMgggggg=gM',
    'MM~~gggggg=gggggdddddggggggggMMrrrrrrRrrrrRrMMggggggg=gM',
    'Mr~~gggggg=gggggggdgggggggggggMMrRrrRrrrRrrMMgggggggg=gM',
    '==bb=======gggggggRggggggggggTMMMMrrrrrrrMMMMgTgPgggg=gM',
    '==bbggggPg=ggggggggggggggggRgTggMMMMMMMMMMMggPgRggggg=gM',
    'Mr~~gggggP=ggggggggggggggggggggggMMMMMMMMMggggggggTgg=gM',
    'MM~~gggggg=ggggggggggggggggggggggTgggMgggggggggggggPg=TM',
    'MM~~gggggg=ggggggggggTggggggggggggggggggggggggggggggg=gM',
    'MrTMTTMTTT=PMTTTTTMPPTggMPTTMPTTTMTTMPTMMTMPPMMPMMggg=gM',
    'MMrrPTPTPT=TPTPPPPTPPgggPTTTPPPPPPTTTPPTPTPPTPTTPTggg=gM',
    'MMrgrrrrgr=rrggggrrgrggggggTRggrrgggrTgTgggrrggrgggrg=gM',
    'MMrrgrrrgT=ggrggggggPrggrgrrggggrgrggrgggggggrggrTggr=rM',
    'MMrrrrggrg=ggrrgrrgTPgggrrgrgRrgggggggggrrgggggggggrr=gM',
    'MMPrgrgggr=ggrggggPPPTPrrgggggRrggrgggPggRggggrgrrgrT=gM',
    'MMMrrgggrg=grggrggrPPTggggggrPrgggggrgPPggrggrgrgrrgP=gM',
    'MMMRPPgggr=ggrggggrgPggrrggrggggggrgPPPPPggrg=ggggggg=gM',
    'MMMRPPTPTr=grgrggrrgRgrTrgggggggggrTrPPPgggrg=grrgrrg=rM',
    'MMMrPTTPPT=gggggggggggrgrgrTgRggggggggPggggrg=rrggggg=rM',
    'MMMrrPTPPr=gggggggrgrrrrgggrrgggggrggggrgggrr=gggggrr=gM',
    'MMMRrTPTPr=gggrrrrggrTgggrrgggrggggrgrrggrgrP=gggrgrr=rM',
    'MMMPggPgrg=rggrrgrRrrrgggggrrgggggrrggrrggggg=grggRrg=rM',
    'MMMrgrgggg=ggrrrgrgrrTTrgggggg=rggggrggggrgRg=rggrgrP=gM',
    'MMrrPggrTr=grggggggrgggrrggrrg=ggrggrrggrrggg=rgrgrTg=gM',
    'MMrrgggrrr============================================RM',
    'MrrrrTRgggrr=rrrPggPgggrTrgggrgrgrrgrgrggggggrPPPTPrgggM',
    'MMrgggrggrgg=grPTTgggggggrrrrgrgrggrgrrrrggrPrTPPTPrgggM',
    'MMMMMMMMMrrg=TPPTTTrggrggggggrggrrrrrrggTrgrgPPPTPPTrggM',
    'ssssssssssss=rrPTTggrggrgggrgggrrTgrggrggPrgggTPTPPrgrrM',
    'ssssssssssss=gggPgggggrrgrrggggrrrrggggrgrrgggPTPPTgggrM',
    'MPPPPPPPPPPPPrggggggrrggggrgrrrrggRrggrggrgggrrgPggggrgM',
    'PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP',
  ],
  // Iolkos, the port: in the chapter a neutral town both sides race for (borderMarch.ts; the home town is Ashford).
  town: {
    id: 'iolkos-town', name: 'Iolkos', x: 20, y: 8, built: ['villageHall', 'townHall', 'fort', 'tavern', 'guardhouse', 'archeryRange', 'griffinTower'], guild: ['bless', 'haste', 'cure', 'stoneSkin', 'lightningBolt'],
    // calibrated by the lord balance runs
    garrison: [{ creature: 'bandit', count: 48 }, { creature: 'bowman', count: 32 }, { creature: 'griffin', count: 19 }, { creature: 'stymphalian', count: 40 }],
  },
  towns: [
    // Pherai, the plain's town: both sides race for it (and Iolkos) from the part's third night (Lykaon picks which, src/logic/lord/).
    {
      id: 'pherai-town', name: 'Pherai', x: 12, y: 30, race: true,
      built: ['villageHall', 'townHall', 'fort', 'tavern', 'guardhouse', 'barracks', 'stables'],
      guild: ['slow', 'stoneSkin', 'magicArrow', 'dispel', 'lightningBolt'],
      // calibrated by the lord balance runs: a rider at 1.5 to 1 storms it, Lykaon (at 2 to 1) only after a few days' hiring.
      garrison: [{ creature: 'spearman', count: 60 }, { creature: 'bowman', count: 28 }, { creature: 'ogre', count: 11 }, { creature: 'boar', count: 24 }],
    },
    // Lykaon's: his old city in the highlands, and a smaller second town.
    {
      id: 'lykosoura-town', name: 'Lykosoura', x: 30, y: 58, owner: 'rival', look: 'lykosoura',
      built: ['villageHall', 'townHall', 'fort', 'citadel', 'tavern', 'marketplace', 'mageGuild1', 'blacksmith', 'guardhouse', 'archeryRange', 'griffinTower', 'barracks', 'monastery', 'guardhouse2', 'archeryRange2', 'griffinTower2', 'barracks2'],
      guild: ['bloodlust', 'slow', 'magicArrow', 'haste', 'lightningBolt'],
      // calibrated by the lord balance runs
      garrison: [{ creature: 'spearman2', count: 60 }, { creature: 'bowman2', count: 40 }, { creature: 'griffin2', count: 20 }, { creature: 'swordsman2', count: 10 }, { creature: 'monk', count: 6 }],
    },
    {
      id: 'tegea-town', name: 'Tegea', x: 45, y: 52, owner: 'rival', look: 'lykosoura',
      built: ['villageHall', 'fort', 'guardhouse', 'archeryRange'],
      guild: ['bless', 'slow', 'cure'],
      // calibrated by the lord balance runs
      garrison: [{ creature: 'spearman', count: 40 }, { creature: 'bowman', count: 24 }],
    },
  ],
  // Played fresh, Rowan comes over the ford from Korax (borderMarch.ts places him).
  hero: {
    id: 'rowan', name: 'Rowan', heroClass: 'knight', x: 1, y: 40,
    attack: 4, defense: 4, power: 2, knowledge: 2, skills: { leadership: 1, archery: 1, offense: 1 }, spells: ['magicArrow', 'bless', 'slow'], gear: { book: 'noviceSpellbook', machine: 'catapult2' },
    army: [{ creature: 'spearman2', count: 110 }, { creature: 'bowman2', count: 60 }, { creature: 'griffin', count: 30 }, { creature: 'swordsman', count: 15 }, { creature: 'monk', count: 6 }],
  },
  rival: {
    mind: 'lord',
    hero: {
      id: 'lykaon', name: 'Lykaon', heroClass: 'knight', x: 30, y: 58,
      attack: 6, defense: 5, power: 2, knowledge: 3, skills: { leadership: 2, offense: 1, archery: 1 }, spells: ['magicArrow', 'slow', 'bloodlust'],
      gear: { book: 'noviceSpellbook', machine: 'catapult2' },
      // calibrated by the lord balance runs
      army: [{ creature: 'spearman2', count: 40 }, { creature: 'bowman2', count: 24 }, { creature: 'griffin2', count: 14 }, { creature: 'swordsman2', count: 7 }, { creature: 'monk', count: 3 }],
    },
    // What a list-minded rival would build; the lord plans his own (src/logic/lord/), saving for the Seraph Spire.
    build: ['cityHall', 'stables', 'castle', 'mageGuild2', 'monastery2', 'seraphSpire', 'tiltyard', 'guardhouse3', 'archeryRange3', 'griffinTower3', 'barracks3', 'capitol', 'seraphSpire2', 'tiltyard2', 'monastery3', 'tiltyard3', 'seraphSpire3'],
    // calibrated by the lord balance runs
    purse: { gold: 10000, wood: 20, ore: 20, mercury: 9, sulfur: 9, crystal: 9, gems: 9 },
  },
  purse: { gold: 15000, wood: 25, ore: 25, mercury: 8, sulfur: 8, crystal: 8, gems: 8 },
  // What the campaign has opened by this map (src/level/unlocks.ts): the whole Greek tree.
  off: lockedOn(4),
  seed: 4401,
  objects: [
    // The coast: the road from Thornwood, Iolkos's harbour, the shrine, the sulfur dunes in the east.
    { id: 'coast-brigands', kind: 'monster', x: 8, y: 8, creature: 'bandit', count: 70 },
    { id: 'chest-shore', kind: 'chest', x: 5, y: 5, gold: 1500 },
    { id: 'coast-pile-wood', kind: 'pile', x: 12, y: 6, resource: 'wood', amount: 8 },
    { id: 'coast-sawmill', kind: 'mine', x: 14, y: 12, resource: 'wood', owner: 'neutral' },
    { id: 'coast-sawmill-boars', kind: 'monster', x: 15, y: 13, creature: 'boar', count: 45 },
    { id: 'coast-watchtower', kind: 'watchtower', x: 24, y: 12 },
    { id: 'coast-gem-pond', kind: 'mine', x: 28, y: 7, resource: 'gems', owner: 'neutral' },
    { id: 'pond-birds', kind: 'monster', x: 29, y: 8, creature: 'stymphalian', count: 70 },
    { id: 'fire-coast', kind: 'campfire', x: 30, y: 12, gold: 800, resource: 'wood', amount: 6 },
    { id: 'coast-pile-gold', kind: 'pile', x: 34, y: 8, resource: 'gold', amount: 1500 },
    { id: 'coast-shrine', kind: 'shrine', x: 40, y: 7, spell: 'lightningBolt' },
    { id: 'shrine-birds', kind: 'monster', x: 41, y: 8, creature: 'stymphalian', count: 90 },
    { id: 'coast-pile-ore', kind: 'pile', x: 44, y: 12, resource: 'ore', amount: 8 },
    { id: 'stone-coast', kind: 'learningStone', x: 49, y: 8 },
    { id: 'coast-sulfur-dune', kind: 'mine', x: 50, y: 6, resource: 'sulfur', owner: 'neutral' },
    { id: 'dune-basilisks', kind: 'monster', x: 51, y: 7, creature: 'basilisk', count: 40 },
    // The east road, coast to highlands, past Othrys's eastern wall: the treasure keep and the griffin cliff.
    { id: 'treasure-keep', kind: 'bank', x: 51, y: 24, look: 'keep', prize: { gold: 6000, crystal: 4, gems: 4 }, item: 'alexandrianCodex' },
    { id: 'keep-hydras', kind: 'monster', x: 50, y: 25, creature: 'hydra', count: 18 },
    { id: 'griffin-cliff', kind: 'dwelling', x: 50, y: 36, look: 'griffinCliff', creature: 'griffin', growth: 6, stock: 6, owner: 'neutral' },
    { id: 'cliff-birds', kind: 'monster', x: 51, y: 37, creature: 'stymphalian', count: 85 },
    // The Thessalian plain: the ford from Korax, Pherai, farms and mines, the cyclops cave.
    // Our way to Pherai: a guard a rider fights (calibrated by the lord balance runs).
    { id: 'ford-cyclopes', kind: 'monster', x: 5, y: 41, creature: 'ogre', count: 18 },
    // Lykaon's roads to the raced towns are guarded too: the highland road north to Pherai, the coast road west to Iolkos.
    { id: 'border-wolves', kind: 'monster', x: 10, y: 47, creature: 'wolf', count: 100 },
    { id: 'road-birds', kind: 'monster', x: 35, y: 10, creature: 'stymphalian', count: 70 },
    { id: 'plain-gold-mine', kind: 'mine', x: 6, y: 22, resource: 'gold', owner: 'neutral' },
    { id: 'plain-mine-cyclopes', kind: 'monster', x: 7, y: 23, creature: 'ogre', count: 22 },
    { id: 'plain-pile-wood', kind: 'pile', x: 8, y: 18, resource: 'wood', amount: 8 },
    { id: 'plain-ore-pit', kind: 'mine', x: 16, y: 19, resource: 'ore', owner: 'neutral' },
    { id: 'plain-pit-wolves', kind: 'monster', x: 17, y: 20, creature: 'wolf', count: 75 },
    { id: 'stone-plain', kind: 'standingStone', x: 20, y: 18 },
    { id: 'cyclops-cave', kind: 'dwelling', x: 22, y: 25, look: 'cyclopsCave', creature: 'ogre', growth: 3, stock: 3, owner: 'neutral' },
    { id: 'cave-cyclopes', kind: 'monster', x: 23, y: 26, creature: 'ogre', count: 20 },
    { id: 'field-boars', kind: 'monster', x: 18, y: 27, creature: 'boar', count: 40 },
    { id: 'plain-pile-gold', kind: 'pile', x: 6, y: 28, resource: 'gold', amount: 1500 },
    { id: 'plain-pile-ore', kind: 'pile', x: 18, y: 30, resource: 'ore', amount: 8 },
    { id: 'plain-pile-sulfur', kind: 'pile', x: 22, y: 35, resource: 'sulfur', amount: 5 },
    { id: 'plain-merc-camp', kind: 'mercCamp', x: 6, y: 36 },
    { id: 'fire-plain', kind: 'campfire', x: 14, y: 36, gold: 700, resource: 'mercury', amount: 4 },
    { id: 'plain-crystal-cavern', kind: 'mine', x: 20, y: 41, resource: 'crystal', owner: 'neutral' },
    { id: 'cavern-basilisks', kind: 'monster', x: 21, y: 42, creature: 'basilisk', count: 38 },
    { id: 'plain-stables', kind: 'stables', x: 16, y: 43 },
    { id: 'chest-plain', kind: 'chest', x: 24, y: 43, gold: 2000 },
    { id: 'chest-boars', kind: 'monster', x: 23, y: 44, creature: 'boar', count: 50 },
    // Mount Othrys: the north way up from the coast and the west way from the plain, the Gigantes and the Titans' forge on the summit.
    { id: 'north-way-birds', kind: 'monster', x: 37, y: 20, creature: 'stymphalian', count: 100 },
    { id: 'west-way-cyclopes', kind: 'monster', x: 29, y: 33, creature: 'ogre', count: 30 },
    { id: 'othrys-alchemist', kind: 'mine', x: 32, y: 24, resource: 'mercury', owner: 'neutral' },
    { id: 'lab-hydras', kind: 'monster', x: 33, y: 25, creature: 'hydra', count: 12 },
    { id: 'othrys-pile-mercury', kind: 'pile', x: 42, y: 24, resource: 'mercury', amount: 5 },
    { id: 'titan-forge', kind: 'dwelling', x: 37, y: 28, look: 'titanForge', creature: 'seraph', growth: 1, stock: 1, owner: 'neutral' },
    // calibrated by the lord balance runs (Othrys's Gigantes should cost a strong army 25-40%)
    { id: 'forge-gigantes', kind: 'monster', x: 36, y: 29, creature: 'gigas', count: 8, drop: 'kronosHelm' },
    { id: 'chest-summit', kind: 'chest', x: 42, y: 34, gold: 2000 },
    { id: 'slope-basilisks', kind: 'monster', x: 41, y: 35, creature: 'basilisk', count: 45 },
    { id: 'othrys-pile-gems', kind: 'pile', x: 34, y: 36, resource: 'gems', amount: 6 },
    // The Arcadian highlands: the pass from the Black Banner, wolf woods, Lykaon's mines.
    { id: 'pass-hydras', kind: 'monster', x: 6, y: 64, creature: 'hydra', count: 22 },
    { id: 'highland-chest', kind: 'chest', x: 6, y: 50, gold: 1500 },
    { id: 'highland-chest-wolves', kind: 'monster', x: 7, y: 51, creature: 'wolf', count: 90 },
    { id: 'highland-gold-mine', kind: 'mine', x: 16, y: 52, resource: 'gold', owner: 'neutral' },
    { id: 'mine-wolves', kind: 'monster', x: 17, y: 53, creature: 'wolf', count: 110 },
    { id: 'highland-pile-wood', kind: 'pile', x: 14, y: 57, resource: 'wood', amount: 8 },
    { id: 'woods-wolves', kind: 'monster', x: 22, y: 48, creature: 'wolf', count: 100 },
    { id: 'lykosoura-sawmill', kind: 'mine', x: 24, y: 56, resource: 'wood', owner: 'rival' },
    { id: 'stone-highlands', kind: 'learningStone', x: 20, y: 64 },
    { id: 'fire-highlands', kind: 'campfire', x: 26, y: 63, gold: 600, resource: 'ore', amount: 5 },
    { id: 'arcadia-wolves', kind: 'monster', x: 36, y: 50, creature: 'wolf', count: 120 },
    { id: 'highland-pile-gold', kind: 'pile', x: 40, y: 57, resource: 'gold', amount: 2000 },
    { id: 'lykosoura-ore-pit', kind: 'mine', x: 38, y: 63, resource: 'ore', owner: 'rival' },
    { id: 'highland-pile-crystal', kind: 'pile', x: 48, y: 57, resource: 'crystal', amount: 5 },
  ],
};
