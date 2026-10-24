import type { CreatureId } from './creatures';
import type { Amount } from './resources';

export const BUILDING_IDS = [
  'villageHall', 'townHall', 'cityHall', 'capitol', 'fort', 'citadel', 'castle', 'tavern', 'blacksmith', 'marketplace', 'mageGuild1', 'mageGuild2',
  'guardhouse', 'archeryRange', 'griffinTower', 'barracks', 'monastery', 'stables', 'tiltyard', 'seraphSpire',
] as const;
export type BuildingId = (typeof BUILDING_IDS)[number];

export interface BuildingDef {
  readonly name: string;
  readonly cost: Amount;
  readonly needs: readonly BuildingId[];
  readonly says: string;
  readonly dwelling?: CreatureId;
  /** Gold a day (halls replace each other's income: the best counts). */
  readonly income?: number;
  /** Extra weekly growth for every dwelling (fraction of base). */
  readonly growth?: number;
}

/** The Crown's buildings. Numbers in docs/inkheroes-design.md. */
export const BUILDINGS: Readonly<Record<BuildingId, BuildingDef>> = {
  villageHall: { name: 'Village Hall', cost: {}, needs: [], says: '500 gold a day', income: 500 },
  townHall: { name: 'Town Hall', cost: { gold: 2500 }, needs: ['villageHall', 'tavern'], says: '1000 gold a day', income: 1000 },
  cityHall: { name: 'City Hall', cost: { gold: 5000 }, needs: ['townHall', 'marketplace', 'blacksmith', 'mageGuild1'], says: '2000 gold a day', income: 2000 },
  capitol: { name: 'Capitol', cost: { gold: 10000 }, needs: ['cityHall', 'castle'], says: '4000 gold a day', income: 4000 },
  fort: { name: 'Fort', cost: { gold: 5000, wood: 20, ore: 20 }, needs: [], says: 'Walls, and room for dwellings' },
  citadel: { name: 'Citadel', cost: { gold: 2500, ore: 5 }, needs: ['fort'], says: '+50% growth for every dwelling', growth: 0.5 },
  castle: { name: 'Castle', cost: { gold: 5000, wood: 10, ore: 10 }, needs: ['citadel'], says: '+100% growth for every dwelling', growth: 0.5 },
  tavern: { name: 'Tavern', cost: { gold: 500, wood: 5 }, needs: [], says: '+1 morale when defending the town' },
  blacksmith: { name: 'Blacksmith', cost: { gold: 1000, wood: 5 }, needs: [], says: 'Forges arms for the Barracks' },
  marketplace: { name: 'Marketplace', cost: { gold: 500, wood: 5 }, needs: [], says: 'Trade resources' },
  mageGuild1: { name: 'Mage Guild', cost: { gold: 2000, wood: 5, ore: 5 }, needs: [], says: 'Teaches 3 level-1 spells; sells a spellbook' },
  mageGuild2: { name: 'Mage Guild, 2nd floor', cost: { gold: 1000, wood: 5, ore: 5, mercury: 4, sulfur: 4, crystal: 4, gems: 4 }, needs: ['mageGuild1'], says: 'Teaches 2 level-2 spells' },
  guardhouse: { name: 'Guardhouse', cost: { gold: 1000, ore: 5 }, needs: ['fort'], says: 'Hires Spearmen', dwelling: 'spearman' },
  archeryRange: { name: 'Archery Range', cost: { gold: 1000, wood: 5, ore: 5 }, needs: ['guardhouse'], says: 'Hires Bowmen', dwelling: 'bowman' },
  griffinTower: { name: 'Griffin Tower', cost: { gold: 1000, ore: 5 }, needs: ['barracks'], says: 'Hires Griffins', dwelling: 'griffin' },
  barracks: { name: 'Barracks', cost: { gold: 2000, ore: 5 }, needs: ['guardhouse', 'blacksmith'], says: 'Hires Swordsmen', dwelling: 'swordsman' },
  monastery: { name: 'Monastery', cost: { gold: 3000, wood: 5, ore: 5, mercury: 2, sulfur: 2, crystal: 2, gems: 2 }, needs: ['mageGuild1', 'barracks'], says: 'Hires Monks', dwelling: 'monk' },
  stables: { name: 'Stables', cost: { gold: 2000, wood: 10 }, needs: ['barracks'], says: '+400 movement for a hero leaving town' },
  tiltyard: { name: 'Tiltyard', cost: { gold: 5000, wood: 20 }, needs: ['stables'], says: 'Hires Lancers', dwelling: 'lancer' },
  seraphSpire: { name: 'Seraph Spire', cost: { gold: 20000, mercury: 10, sulfur: 10, crystal: 10, gems: 10 }, needs: ['monastery'], says: 'Hires Seraphs', dwelling: 'seraph' },
};

export const isBuildingId = (v: unknown): v is BuildingId => typeof v === 'string' && (BUILDING_IDS as readonly string[]).includes(v);
