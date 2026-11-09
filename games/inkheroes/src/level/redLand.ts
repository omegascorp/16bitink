import type { MapDef } from './types';
import { lockedIn, TWO_LANDS_UNLOCKS } from './unlocks';

/**
 * Chapter 2, part 3: the Red Land (in its own tiles; see twoLands.ts, which
 * places it east of Abu, through a pass in the dunes of Abu's east bank).
 * Deshret, Set's desert: Sethi, a lord of our own people who serves Set,
 * holds Nubt, the city of gold, in the far east behind a ridge with two ways
 * in (at its north and south ends). The gold roads run along rock wadis and meet at
 * Gebtu, the caravan town in the middle, neutral and walled: both lords race
 * for it from the part's third night, and its garrison must be beaten. A
 * gold mine lies up the north wadi, the gem field down the south one, and
 * the Serpent of Apep lies coiled with its cobras in a sunken tomb over the
 * Ramp of the Pyramid Builders. Every fourth day Set's storm doubles the
 * cost of sand. The chapter's last part: Nubt taken and Sethi beaten.
 * Part of the full game: never imported by the game's client code (it is
 * served from content/paid.ts to owners).
 */
export const RED_LAND_LAND: MapDef = {
  id: 'red-land',
  name: 'The Red Land',
  n: 7,
  brief: 'Sethi of Nubt, a lord who serves Set, rides with our own chariots and ramps. Beat him to Gebtu, the caravan town, take Nubt and bring him down. Every fourth day Set\u2019s storm makes sand cost double: keep to the roads.',
  story: 'part-redLand',
  goal: { kind: 'overthrow', target: 'nubt-town', text: 'take Nubt and beat Sethi' },
  parDays: 35,
  stormEvery: 4,
  rows: [
    'DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD',
    'DssssssssssssssssssssssssssssDDssssssssD',
    'DsssssssssssssssssssssssDDDssssssskssssD',
    'DssssssssssrrrsssssssssssDsssssssssssssD',
    'DssDDDsssssr=rsssssDDDsssssssDDssDDDsssD',
    'DsssDssssssr=rssssssDssssssssDDsssDksksD',
    'Dssssssssssr=rsssssssssssskssDDssssssssD',
    'Dssssssssssr=rsssssssssssssssDDssksssssD',
    'Dssssskssssr=rsssssssssssssssDDssssssssD',
    'DsssssDDDssr=rsssssssssssssssDDssssssssD',
    'DssssssDsssr=rsssssssssDDDsssDDssssssssD',
    'Dssssskssssr=rksssssssssDssssDDskssssssD',
    'DssssssDDDsr=rsssssssssssssssDDssssssssD',
    'DsssssssDssr=rsssssssssssssssDDssssssssD',
    'Dssssssssssr=rsssssssssssssssDDssssssssD',
    'Dssssssssssr=rsssssssssssssssDDssssssssD',
    'rrrrrrrrrrrr=r=rrrrrrrrrrrsssDDssssssssD',
    '===============r=========rsssDDssssssssD',
    'rrrrrrrrrrrr=rrrrrrrrrrrrrsssDDksssssssD',
    'Dssssssssssr=rsssssssssssssssDDssssssssD',
    'Dssssssssssr=rsssssssssssDDDsDDssssssssD',
    'Dssssssssssr=rssssDDDsksssDssDDksssssssD',
    'Dssssssssssr=rsssssDsssssssssDDksssssssD',
    'Dssssssssssr=rsksssssskkkssssDDssssssssD',
    'Dskssskssssr=rsksssskssskssssDDssssssssD',
    'DsssDDDssssr=rsssssskssskksssDDssssssssD',
    'DssssDsssssr=rsssssskssskssssDDssssssssD',
    'Dssssssssskr=rsssssskkkkkssssDDsssDDDssD',
    'DssssssssssrrrsDDDsssssssssssssssssDsssD',
    'DsssssssssssssssDskssssssssssssssssssssD',
    'DssssssssssssssssssssssssssssDDssssssssD',
    'DDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD',
  ],
  // Played fresh, the chapter's home is Nekhen (twoLands.ts); this is Gebtu, the town both race for, never handed over.
  town: {
    id: 'gebtu-town', name: 'Gebtu', x: 14, y: 16, faction: 'kemet',
    built: ['villageHall', 'fort', 'tavern', 'guardhouse', 'archeryRange'],
    guild: ['cure', 'stoneSkin', 'haste', 'slow', 'dispel'],
    garrison: [{ creature: 'raider', count: 12 }, { creature: 'lion', count: 4 }, { creature: 'hyena', count: 14 }],
  },
  towns: [
    {
      id: 'nubt-town', name: 'Nubt', x: 34, y: 16, owner: 'rival', faction: 'kemet', look: 'nubt',
      built: ['villageHall', 'townHall', 'fort', 'citadel', 'tavern', 'blacksmith', 'guardhouse', 'archeryRange', 'griffinTower', 'barracks'],
      guild: ['cure', 'stoneSkin', 'haste', 'slow', 'dispel'],
      garrison: [{ creature: 'levy', count: 40 }, { creature: 'nubian', count: 24 }, { creature: 'jackal', count: 12 }, { creature: 'chariot', count: 6 }],
    },
  ],
  // Played fresh (nothing won before it), Neferet comes through the pass with about what a rider brings.
  hero: {
    id: 'neferet', name: 'Neferet', heroClass: 'cleric', x: 2, y: 17, faction: 'kemet',
    attack: 1, defense: 1, power: 2, knowledge: 3, skills: { wisdom: 1 }, spells: ['curse', 'ward'], gear: { book: 'novicePapyrus', machine: 'ramp' }, ankhs: 2,
    army: [{ creature: 'levy', count: 60 }, { creature: 'nubian', count: 30 }, { creature: 'jackal', count: 16 }, { creature: 'chariot', count: 8 }],
  },
  rival: {
    hero: {
      id: 'sethi', name: 'Sethi', heroClass: 'knight', x: 34, y: 16, faction: 'kemet',
      attack: 3, defense: 3, power: 1, knowledge: 1, skills: { offense: 1 }, spells: [],
      army: [{ creature: 'levy', count: 12 }, { creature: 'nubian', count: 6 }, { creature: 'jackal', count: 3 }, { creature: 'chariot', count: 1 }],
      gear: { machine: 'ramp' },
    },
    // His builds, one a day while his purse allows: troops first, then their growth and upgrades (the part's own unlocks bound it).
    build: ['guardhouse2', 'archeryRange2', 'griffinTower2', 'barracks2', 'mageGuild1', 'cityHall', 'monastery', 'guardhouse3', 'archeryRange3', 'castle', 'griffinTower3', 'barracks3', 'monastery2', 'tiltyard'],
    // 4000 gold as a lord (6000 under the old rules): measured, it opens him at about 1.6 times a rider (Nov 9).
    purse: { gold: 4000, wood: 15, ore: 15, mercury: 3, sulfur: 3, crystal: 3, gems: 3 },
    // A shorter head start than Kassander's 0.75 (coordinator's third lever, Nov 8): his rules' (rival.ts), unused by the lord.
    headStart: 0.6,
    // A lord since Nov 9 (the lord mind's trial won 60 to 80% for our side; the old rules' bot won 1 of 24): he plays from Nubt, its garrison and purse, with no head start.
    mind: 'lord',
  },
  // Played fresh: about what a rider brings from Abu (14,000 gold, measured).
  purse: { gold: 14000, wood: 20, ore: 20, mercury: 5, sulfur: 5, crystal: 5, gems: 5 },
  // What the chapter has opened by its third part (src/level/unlocks.ts).
  off: lockedIn(TWO_LANDS_UNLOCKS, 3),
  seed: 6121,
  objects: [
    // Mines: the gold mine up the north wadi, the gem field down the south one; Nubt's own beyond the ridge.
    { id: 'red-gold-mine', kind: 'mine', x: 12, y: 3, resource: 'gold', owner: 'neutral' },
    { id: 'red-gem-field', kind: 'mine', x: 12, y: 28, resource: 'gems', owner: 'neutral' },
    { id: 'red-ore-pit', kind: 'mine', x: 4, y: 9, resource: 'ore', owner: 'neutral' },
    { id: 'nubt-gold-mine', kind: 'mine', x: 36, y: 22, resource: 'gold', owner: 'rival' },
    { id: 'nubt-ore-pit', kind: 'mine', x: 33, y: 8, resource: 'ore', owner: 'rival' },
    // Monsters: the wadis' raiders and lions on the gold roads, cobras and scorpions in the sand, the Serpent in its tomb.
    { id: 'pass-hyenas', kind: 'monster', x: 7, y: 15, creature: 'hyena', count: 30 },
    { id: 'wadi-raiders', kind: 'monster', x: 12, y: 10, creature: 'raider', count: 20 },
    { id: 'gold-lions', kind: 'monster', x: 12, y: 5, creature: 'lion', count: 10 },
    { id: 'gem-scorpions', kind: 'monster', x: 12, y: 26, creature: 'scorpion', count: 18 },
    { id: 'ore-cobras', kind: 'monster', x: 5, y: 10, creature: 'cobra', count: 20 },
    { id: 'chest-lions', kind: 'monster', x: 4, y: 3, creature: 'lion', count: 8 },
    { id: 'south-raiders', kind: 'monster', x: 6, y: 27, creature: 'raider', count: 25 },
    { id: 'east-cobras', kind: 'monster', x: 21, y: 12, creature: 'cobra', count: 30 },
    { id: 'ridge-lions', kind: 'monster', x: 27, y: 6, creature: 'lion', count: 12 },
    { id: 'gap-raiders', kind: 'monster', x: 27, y: 24, creature: 'raider', count: 30 },
    { id: 'basin-scorpions', kind: 'monster', x: 35, y: 7, creature: 'scorpion', count: 20 },
    { id: 'basin-hyenas', kind: 'monster', x: 36, y: 26, creature: 'hyena', count: 60 },
    { id: 'apep', kind: 'monster', x: 22, y: 25, creature: 'apep', count: 1, brood: { creature: 'cobra', count: 24 }, drop: 'ramp3' },
    // Sites.
    { id: 'red-watchtower', kind: 'watchtower', x: 8, y: 20 },
    { id: 'red-merc-camp', kind: 'mercCamp', x: 20, y: 14 },
    { id: 'red-stone', kind: 'standingStone', x: 25, y: 8 },
    { id: 'red-shrine', kind: 'shrine', x: 17, y: 22, spell: 'bloodlust' },
    // Treasure.
    { id: 'red-chest-north', kind: 'chest', x: 3, y: 2, gold: 2000 },
    { id: 'red-chest-south', kind: 'chest', x: 26, y: 29, gold: 2000 },
    { id: 'red-chest-basin', kind: 'chest', x: 37, y: 30, gold: 1500 },
    { id: 'red-fire-west', kind: 'campfire', x: 6, y: 22, gold: 600, resource: 'ore', amount: 5 },
    { id: 'red-fire-north', kind: 'campfire', x: 24, y: 4, gold: 700, resource: 'wood', amount: 5 },
    { id: 'red-pile-gold-1', kind: 'pile', x: 9, y: 13, resource: 'gold', amount: 1000 },
    { id: 'red-pile-gold-2', kind: 'pile', x: 20, y: 19, resource: 'gold', amount: 1500 },
    { id: 'red-pile-gold-3', kind: 'pile', x: 33, y: 29, resource: 'gold', amount: 1000 },
    { id: 'red-pile-wood', kind: 'pile', x: 3, y: 20, resource: 'wood', amount: 8 },
    { id: 'red-pile-ore', kind: 'pile', x: 18, y: 7, resource: 'ore', amount: 7 },
    { id: 'red-pile-mercury', kind: 'pile', x: 23, y: 21, resource: 'mercury', amount: 4 },
    { id: 'red-pile-sulfur', kind: 'pile', x: 9, y: 29, resource: 'sulfur', amount: 4 },
    { id: 'red-pile-crystal', kind: 'pile', x: 37, y: 3, resource: 'crystal', amount: 4 },
    { id: 'red-pile-gems', kind: 'pile', x: 16, y: 2, resource: 'gems', amount: 4 },
  ],
};
