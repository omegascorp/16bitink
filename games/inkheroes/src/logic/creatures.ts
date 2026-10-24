import type { Amount } from './resources';

export type Faction = 'crown' | 'neutral';

export interface CreatureDef {
  readonly id: CreatureId;
  readonly name: string;
  readonly plural: string;
  readonly faction: Faction;
  readonly level: number;
  readonly attack: number;
  readonly defense: number;
  readonly minDmg: number;
  readonly maxDmg: number;
  readonly hp: number;
  readonly speed: number;
  /** Units a week from its town dwelling. */
  readonly growth: number;
  readonly cost: Amount;
  /** Shooters only: arrows per battle. */
  readonly shots?: number;
  readonly flies?: boolean;
  /** No morale, immune to mind spells. */
  readonly undead?: boolean;
  /** Its strikes are never answered. */
  readonly noRetaliation?: boolean;
  /** Answers this many strikes a round (default 1). */
  readonly retaliations?: number;
  /** +5% damage for each hex moved before a melee strike. */
  readonly charge?: boolean;
  /** Raises its own army's morale. */
  readonly morale?: number;
}

const def = <T extends CreatureDef>(c: T): T => c;

/** Every creature, by id. Numbers are in docs/inkheroes-design.md. */
export const CREATURES = {
  spearman: def({ id: 'spearman', name: 'Spearman', plural: 'Spearmen', faction: 'crown', level: 1, attack: 4, defense: 5, minDmg: 1, maxDmg: 3, hp: 10, speed: 4, growth: 14, cost: { gold: 60 } }),
  bowman: def({ id: 'bowman', name: 'Bowman', plural: 'Bowmen', faction: 'crown', level: 2, attack: 6, defense: 3, minDmg: 2, maxDmg: 3, hp: 10, speed: 4, growth: 9, cost: { gold: 100 }, shots: 12 }),
  griffin: def({ id: 'griffin', name: 'Griffin', plural: 'Griffins', faction: 'crown', level: 3, attack: 8, defense: 8, minDmg: 3, maxDmg: 6, hp: 25, speed: 6, growth: 7, cost: { gold: 200 }, flies: true, retaliations: 2 }),
  swordsman: def({ id: 'swordsman', name: 'Swordsman', plural: 'Swordsmen', faction: 'crown', level: 4, attack: 10, defense: 12, minDmg: 6, maxDmg: 9, hp: 35, speed: 5, growth: 4, cost: { gold: 300 } }),
  monk: def({ id: 'monk', name: 'Monk', plural: 'Monks', faction: 'crown', level: 5, attack: 12, defense: 7, minDmg: 10, maxDmg: 12, hp: 30, speed: 5, growth: 3, cost: { gold: 400 }, shots: 12 }),
  lancer: def({ id: 'lancer', name: 'Lancer', plural: 'Lancers', faction: 'crown', level: 6, attack: 15, defense: 15, minDmg: 15, maxDmg: 25, hp: 100, speed: 7, growth: 2, cost: { gold: 1000 }, charge: true }),
  seraph: def({ id: 'seraph', name: 'Seraph', plural: 'Seraphs', faction: 'crown', level: 7, attack: 20, defense: 20, minDmg: 50, maxDmg: 50, hp: 200, speed: 12, growth: 1, cost: { gold: 3000, gems: 1 }, flies: true, morale: 1 }),
  goblin: def({ id: 'goblin', name: 'Goblin', plural: 'Goblins', faction: 'neutral', level: 1, attack: 4, defense: 2, minDmg: 1, maxDmg: 2, hp: 5, speed: 5, growth: 15, cost: { gold: 40 } }),
  skeleton: def({ id: 'skeleton', name: 'Skeleton', plural: 'Skeletons', faction: 'neutral', level: 1, attack: 5, defense: 4, minDmg: 1, maxDmg: 3, hp: 6, speed: 4, growth: 12, cost: { gold: 60 }, undead: true }),
  wolf: def({ id: 'wolf', name: 'Wolf', plural: 'Wolves', faction: 'neutral', level: 2, attack: 6, defense: 3, minDmg: 2, maxDmg: 4, hp: 10, speed: 7, growth: 8, cost: { gold: 100 } }),
  bandit: def({ id: 'bandit', name: 'Bandit', plural: 'Bandits', faction: 'neutral', level: 2, attack: 8, defense: 3, minDmg: 2, maxDmg: 4, hp: 10, speed: 6, growth: 8, cost: { gold: 100 }, noRetaliation: true }),
  ogre: def({ id: 'ogre', name: 'Ogre', plural: 'Ogres', faction: 'neutral', level: 4, attack: 13, defense: 7, minDmg: 6, maxDmg: 12, hp: 40, speed: 4, growth: 4, cost: { gold: 300 } }),
} as const;

export type CreatureId = 'spearman' | 'bowman' | 'griffin' | 'swordsman' | 'monk' | 'lancer' | 'seraph' | 'goblin' | 'skeleton' | 'wolf' | 'bandit' | 'ogre';
export const CREATURE_IDS = Object.keys(CREATURES) as CreatureId[];

export const creature = (id: CreatureId): CreatureDef => CREATURES[id];
export const isCreatureId = (v: unknown): v is CreatureId => typeof v === 'string' && (CREATURE_IDS as string[]).includes(v);

/** The size words for a map monster's count, H3 style. */
const SIZE_WORDS: readonly (readonly [number, string])[] = [
  [1000, 'a legion of'], [500, 'zounds of'], [250, 'a swarm of'], [100, 'a throng of'], [50, 'a horde of'], [20, 'lots of'], [10, 'a pack of'], [5, 'several'], [1, 'a few'],
];

/** "a pack of Wolves": how a map monster reads before you fight it. */
export function sizeWord(count: number): string {
  return (SIZE_WORDS.find(([min]) => count >= min) ?? SIZE_WORDS[SIZE_WORDS.length - 1]!)[1];
}

/** A rough fighting strength, for the AI and for monsters' join/flee checks. */
export function strengthOf(id: CreatureId, count: number): number {
  const c = creature(id);
  const dmg = (c.minDmg + c.maxDmg) / 2;
  return count * Math.sqrt(c.hp * dmg * (1 + (c.attack + c.defense) / 20)) * (c.shots ? 1.3 : 1) * (c.flies ? 1.15 : 1);
}
