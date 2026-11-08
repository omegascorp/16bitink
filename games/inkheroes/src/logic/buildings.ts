import type { CreatureId } from './creatures';
import { ROAD_COST, STABLES_MP, tilesOf } from './map';
import type { Amount } from './resources';

export const BUILDING_IDS = [
  'villageHall', 'townHall', 'cityHall', 'capitol', 'fort', 'citadel', 'castle', 'tavern', 'blacksmith', 'marketplace', 'mageGuild1', 'mageGuild2',
  'guardhouse', 'archeryRange', 'griffinTower', 'barracks', 'monastery', 'stables', 'tiltyard', 'seraphSpire',
  'guardhouse2', 'guardhouse3', 'archeryRange2', 'archeryRange3', 'griffinTower2', 'griffinTower3', 'barracks2', 'barracks3',
  'monastery2', 'monastery3', 'tiltyard2', 'tiltyard3', 'seraphSpire2', 'seraphSpire3',
] as const;
export type BuildingId = (typeof BUILDING_IDS)[number];

export interface BuildingDef {
  readonly name: string;
  readonly cost: Amount;
  readonly needs: readonly BuildingId[];
  readonly says: string;
  /** The unit it hires (an upgraded dwelling hires its line's upgrade, from the line's one stock). */
  readonly dwelling?: CreatureId;
  /** Gold a day (halls replace each other's income: the best counts). */
  readonly income?: number;
  /** Extra weekly growth for every dwelling (fraction of base). */
  readonly growth?: number;
  /** Movement points it adds to a hero's day. */
  readonly travel?: number;
}

/** The Crown's buildings. Numbers in docs/inkheroes-design.md. */
export const BUILDINGS: Readonly<Record<BuildingId, BuildingDef>> = {
  villageHall: { name: 'Village Hall', cost: {}, needs: [], says: '500 gold a day', income: 500 },
  townHall: { name: 'Town Hall', cost: { gold: 2500 }, needs: ['villageHall', 'tavern'], says: '1000 gold a day', income: 1000 },
  cityHall: { name: 'City Hall', cost: { gold: 5000 }, needs: ['townHall', 'marketplace', 'mageGuild1'], says: '2000 gold a day', income: 2000 },
  capitol: { name: 'Capitol', cost: { gold: 10000 }, needs: ['cityHall', 'castle'], says: '4000 gold a day', income: 4000 },
  fort: { name: 'Fort', cost: { gold: 5000, wood: 20, ore: 20 }, needs: [], says: 'Walls, a gate and a tower to man' },
  citadel: { name: 'Citadel', cost: { gold: 2500, ore: 5 }, needs: ['fort'], says: '+50% growth for every dwelling, a moat and a second tower', growth: 0.5 },
  castle: { name: 'Castle', cost: { gold: 5000, wood: 10, ore: 10 }, needs: ['citadel'], says: '+100% growth for every dwelling, stronger walls and a third tower', growth: 0.5 },
  tavern: { name: 'Tavern', cost: { gold: 500, wood: 5 }, needs: [], says: '+1 morale when defending the town' },
  blacksmith: { name: 'Blacksmith', cost: { gold: 1000, wood: 5 }, needs: [], says: 'Sells war machines, which break town walls' },
  marketplace: { name: 'Marketplace', cost: { gold: 500, wood: 5 }, needs: [], says: 'Trade resources' },
  mageGuild1: { name: 'Mage Guild', cost: { gold: 2000, wood: 5, ore: 5 }, needs: [], says: 'Teaches 3 level-1 spells; sells a spellbook' },
  mageGuild2: { name: 'Mage Guild, 2nd floor', cost: { gold: 1000, wood: 5, ore: 5, mercury: 4, sulfur: 4, crystal: 4, gems: 4 }, needs: ['mageGuild1'], says: 'Teaches 2 level-2 spells' },
  guardhouse: { name: 'Guardhouse', cost: { gold: 1000, ore: 5 }, needs: [], says: 'Hires Hoplites', dwelling: 'spearman' },
  archeryRange: { name: 'Archery Range', cost: { gold: 1000, wood: 5, ore: 5 }, needs: ['guardhouse'], says: 'Hires Slingers', dwelling: 'bowman' },
  griffinTower: { name: 'Griffin Tower', cost: { gold: 1000, ore: 5 }, needs: ['barracks'], says: 'Hires Griffins', dwelling: 'griffin' },
  barracks: { name: 'Barracks', cost: { gold: 2000, ore: 5 }, needs: ['guardhouse'], says: 'Hires Minotaurs', dwelling: 'swordsman' },
  monastery: { name: 'Monastery', cost: { gold: 3000, wood: 5, ore: 5, mercury: 2, sulfur: 2, crystal: 2, gems: 2 }, needs: ['mageGuild1', 'barracks'], says: 'Hires Centaurs', dwelling: 'monk' },
  stables: { name: 'Stables', cost: { gold: 2000, wood: 10 }, needs: ['barracks'], says: `A hero who starts the day here travels ${tilesOf(STABLES_MP)} tiles further (${STABLES_MP / ROAD_COST} by road)`, travel: STABLES_MP },
  tiltyard: { name: 'Tiltyard', cost: { gold: 5000, wood: 20 }, needs: ['stables'], says: 'Hires Companions', dwelling: 'lancer' },
  seraphSpire: { name: 'Seraph Spire', cost: { gold: 20000, mercury: 10, sulfur: 10, crystal: 10, gems: 10 }, needs: ['monastery'], says: 'Hires Titans', dwelling: 'seraph' },
  // The upgrade tree: a first upgrade needs its dwelling (and a support), a second the first and the Citadel (lines 1-4) or the Castle (5-7).
  guardhouse2: { name: 'Phalanx Yard', cost: { gold: 1000, ore: 5 }, needs: ['guardhouse'], says: 'Hires Phalangites', dwelling: 'spearman2' },
  guardhouse3: { name: 'Agoge', cost: { gold: 2000, ore: 5 }, needs: ['guardhouse2', 'citadel'], says: 'Hires Spartans', dwelling: 'spearman3' },
  archeryRange2: { name: 'Peltast Camp', cost: { gold: 1000, wood: 5 }, needs: ['archeryRange'], says: 'Hires Peltasts', dwelling: 'bowman2' },
  archeryRange3: { name: 'Cretan Range', cost: { gold: 2000, wood: 5, ore: 5 }, needs: ['archeryRange2', 'citadel'], says: 'Hires Cretan Archers', dwelling: 'bowman3' },
  griffinTower2: { name: 'Griffin Aerie', cost: { gold: 1000, ore: 5 }, needs: ['griffinTower'], says: 'Hires War Griffins', dwelling: 'griffin2' },
  griffinTower3: { name: 'Golden Aerie', cost: { gold: 3000, ore: 5, crystal: 2 }, needs: ['griffinTower2', 'citadel'], says: 'Hires Golden Griffins', dwelling: 'griffin3' },
  barracks2: { name: 'Labyrinth', cost: { gold: 2000, ore: 5, crystal: 2 }, needs: ['barracks'], says: 'Hires Minotaur Guards', dwelling: 'swordsman2' },
  barracks3: { name: 'Great Labyrinth', cost: { gold: 3000, ore: 10, crystal: 3 }, needs: ['barracks2', 'citadel'], says: 'Hires Minotaur Lords', dwelling: 'swordsman3' },
  monastery2: { name: 'Centaur Grove', cost: { gold: 2000, wood: 5, mercury: 2, sulfur: 2, crystal: 2, gems: 2 }, needs: ['monastery', 'mageGuild2'], says: 'Hires Centaur Marksmen', dwelling: 'monk2' },
  monastery3: { name: 'Chiron’s Cave', cost: { gold: 4000, wood: 5, mercury: 3, sulfur: 3, crystal: 3, gems: 3 }, needs: ['monastery2', 'castle'], says: 'Hires Centaur Sages', dwelling: 'monk3' },
  tiltyard2: { name: 'Royal Tiltyard', cost: { gold: 4000, wood: 10 }, needs: ['tiltyard'], says: 'Hires Royal Companions', dwelling: 'lancer2' },
  tiltyard3: { name: 'Cataphract Lists', cost: { gold: 6000, wood: 10, ore: 10, crystal: 5 }, needs: ['tiltyard2', 'castle'], says: 'Hires Cataphracts', dwelling: 'lancer3' },
  seraphSpire2: { name: 'Elder Spire', cost: { gold: 15000, mercury: 5, sulfur: 5, crystal: 5, gems: 5 }, needs: ['seraphSpire', 'mageGuild2'], says: 'Hires Elder Titans', dwelling: 'seraph2' },
  seraphSpire3: { name: 'Olympus Gate', cost: { gold: 25000, mercury: 10, sulfur: 10, crystal: 10, gems: 10 }, needs: ['seraphSpire2', 'castle'], says: 'Hires Titan Lords', dwelling: 'seraph3' },
};

export const isBuildingId = (v: unknown): v is BuildingId => typeof v === 'string' && (BUILDING_IDS as readonly string[]).includes(v);
