import type { Amount } from './resources';

export type Faction = 'crown' | 'neutral' | 'machine';

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
  /** Takes two hexes on the battlefield: its head and the one behind it (H3's double-wide). */
  readonly wide?: boolean;
  /** An upgrade: the line's base unit, and which of its three levels this is (2 or 3; a base unit is 1). */
  readonly line?: CreatureId;
  readonly tier?: 2 | 3;
  /** A war machine bought at the Blacksmith: it never moves, acts by itself, and a side left with only machines has lost. */
  readonly machine?: 'shooter' | 'healer';
  /** A healer's most a turn, HP. */
  readonly heals?: number;
}

const def = <T extends CreatureDef>(c: T): T => c;

/** Every creature, by id. Numbers are in docs/inkheroes-design.md. */
export const CREATURES = {
  spearman: def({ id: 'spearman', name: 'Hoplite', plural: 'Hoplites', faction: 'crown', level: 1, attack: 4, defense: 5, minDmg: 1, maxDmg: 3, hp: 10, speed: 4, growth: 14, cost: { gold: 60 } }),
  bowman: def({ id: 'bowman', name: 'Slinger', plural: 'Slingers', faction: 'crown', level: 2, attack: 6, defense: 3, minDmg: 2, maxDmg: 3, hp: 10, speed: 4, growth: 9, cost: { gold: 100 }, shots: 12 }),
  griffin: def({ id: 'griffin', name: 'Griffin', plural: 'Griffins', faction: 'crown', level: 3, attack: 8, defense: 8, minDmg: 3, maxDmg: 6, hp: 25, speed: 6, growth: 7, cost: { gold: 200 }, flies: true, retaliations: 2, wide: true }),
  swordsman: def({ id: 'swordsman', name: 'Minotaur', plural: 'Minotaurs', faction: 'crown', level: 4, attack: 10, defense: 12, minDmg: 6, maxDmg: 9, hp: 35, speed: 5, growth: 4, cost: { gold: 300 } }),
  monk: def({ id: 'monk', name: 'Centaur', plural: 'Centaurs', faction: 'crown', level: 5, attack: 12, defense: 7, minDmg: 10, maxDmg: 12, hp: 30, speed: 5, growth: 3, cost: { gold: 400 }, shots: 12, wide: true }),
  lancer: def({ id: 'lancer', name: 'Companion', plural: 'Companions', faction: 'crown', level: 6, attack: 15, defense: 15, minDmg: 15, maxDmg: 25, hp: 100, speed: 7, growth: 2, cost: { gold: 1000 }, charge: true, wide: true }),
  seraph: def({ id: 'seraph', name: 'Titan', plural: 'Titans', faction: 'crown', level: 7, attack: 20, defense: 20, minDmg: 50, maxDmg: 50, hp: 200, speed: 12, growth: 1, cost: { gold: 3000, gems: 1 }, flies: true, morale: 1 }),
  // The upgrades: each line's level 2 and level 3, the same unit better armed (docs/inkheroes-design.md).
  spearman2: def({ id: 'spearman2', name: 'Phalangite', plural: 'Phalangites', faction: 'crown', level: 1, attack: 6, defense: 6, minDmg: 2, maxDmg: 3, hp: 12, speed: 5, growth: 14, cost: { gold: 80 }, line: 'spearman', tier: 2 }),
  spearman3: def({ id: 'spearman3', name: 'Spartan', plural: 'Spartans', faction: 'crown', level: 1, attack: 7, defense: 8, minDmg: 2, maxDmg: 4, hp: 15, speed: 5, growth: 14, cost: { gold: 100 }, retaliations: 2, line: 'spearman', tier: 3 }),
  bowman2: def({ id: 'bowman2', name: 'Peltast', plural: 'Peltasts', faction: 'crown', level: 2, attack: 6, defense: 4, minDmg: 2, maxDmg: 4, hp: 10, speed: 6, growth: 9, cost: { gold: 130 }, shots: 16, line: 'bowman', tier: 2 }),
  bowman3: def({ id: 'bowman3', name: 'Cretan Archer', plural: 'Cretan Archers', faction: 'crown', level: 2, attack: 8, defense: 5, minDmg: 3, maxDmg: 4, hp: 12, speed: 6, growth: 9, cost: { gold: 160 }, shots: 20, line: 'bowman', tier: 3 }),
  griffin2: def({ id: 'griffin2', name: 'War Griffin', plural: 'War Griffins', faction: 'crown', level: 3, attack: 9, defense: 9, minDmg: 3, maxDmg: 6, hp: 25, speed: 9, growth: 7, cost: { gold: 240 }, flies: true, retaliations: 3, wide: true, line: 'griffin', tier: 2 }),
  griffin3: def({ id: 'griffin3', name: 'Golden Griffin', plural: 'Golden Griffins', faction: 'crown', level: 3, attack: 10, defense: 10, minDmg: 4, maxDmg: 7, hp: 30, speed: 10, growth: 7, cost: { gold: 290 }, flies: true, retaliations: 4, wide: true, line: 'griffin', tier: 3 }),
  swordsman2: def({ id: 'swordsman2', name: 'Minotaur Guard', plural: 'Minotaur Guards', faction: 'crown', level: 4, attack: 12, defense: 13, minDmg: 6, maxDmg: 10, hp: 40, speed: 6, growth: 4, cost: { gold: 360 }, line: 'swordsman', tier: 2 }),
  swordsman3: def({ id: 'swordsman3', name: 'Minotaur Lord', plural: 'Minotaur Lords', faction: 'crown', level: 4, attack: 14, defense: 14, minDmg: 7, maxDmg: 11, hp: 45, speed: 6, growth: 4, cost: { gold: 430 }, noRetaliation: true, line: 'swordsman', tier: 3 }),
  monk2: def({ id: 'monk2', name: 'Centaur Marksman', plural: 'Centaur Marksmen', faction: 'crown', level: 5, attack: 12, defense: 9, minDmg: 10, maxDmg: 12, hp: 30, speed: 7, growth: 3, cost: { gold: 450 }, shots: 16, wide: true, line: 'monk', tier: 2 }),
  monk3: def({ id: 'monk3', name: 'Centaur Sage', plural: 'Centaur Sages', faction: 'crown', level: 5, attack: 14, defense: 10, minDmg: 11, maxDmg: 13, hp: 35, speed: 7, growth: 3, cost: { gold: 520 }, shots: 20, wide: true, morale: 1, line: 'monk', tier: 3 }),
  lancer2: def({ id: 'lancer2', name: 'Royal Companion', plural: 'Royal Companions', faction: 'crown', level: 6, attack: 16, defense: 16, minDmg: 20, maxDmg: 25, hp: 100, speed: 9, growth: 2, cost: { gold: 1200 }, charge: true, wide: true, line: 'lancer', tier: 2 }),
  lancer3: def({ id: 'lancer3', name: 'Cataphract', plural: 'Cataphracts', faction: 'crown', level: 6, attack: 18, defense: 18, minDmg: 22, maxDmg: 28, hp: 120, speed: 10, growth: 2, cost: { gold: 1500 }, charge: true, wide: true, line: 'lancer', tier: 3 }),
  seraph2: def({ id: 'seraph2', name: 'Elder Titan', plural: 'Elder Titans', faction: 'crown', level: 7, attack: 22, defense: 22, minDmg: 50, maxDmg: 55, hp: 240, speed: 14, growth: 1, cost: { gold: 3600, gems: 2 }, flies: true, morale: 1, line: 'seraph', tier: 2 }),
  seraph3: def({ id: 'seraph3', name: 'Titan Lord', plural: 'Titan Lords', faction: 'crown', level: 7, attack: 26, defense: 24, minDmg: 55, maxDmg: 60, hp: 280, speed: 16, growth: 1, cost: { gold: 4400, gems: 3 }, flies: true, morale: 1, line: 'seraph', tier: 3 }),
  goblin: def({ id: 'goblin', name: 'Satyr', plural: 'Satyrs', faction: 'neutral', level: 1, attack: 4, defense: 2, minDmg: 1, maxDmg: 2, hp: 5, speed: 5, growth: 15, cost: { gold: 40 } }),
  skeleton: def({ id: 'skeleton', name: 'Spartoi', plural: 'Spartoi', faction: 'neutral', level: 1, attack: 5, defense: 4, minDmg: 1, maxDmg: 3, hp: 6, speed: 4, growth: 12, cost: { gold: 60 }, undead: true }),
  wolf: def({ id: 'wolf', name: 'Wolf', plural: 'Wolves', faction: 'neutral', level: 2, attack: 6, defense: 3, minDmg: 2, maxDmg: 4, hp: 10, speed: 7, growth: 8, cost: { gold: 100 }, wide: true }),
  bandit: def({ id: 'bandit', name: 'Brigand', plural: 'Brigands', faction: 'neutral', level: 2, attack: 8, defense: 3, minDmg: 2, maxDmg: 4, hp: 10, speed: 6, growth: 8, cost: { gold: 100 }, noRetaliation: true }),
  // War machines (the Blacksmith's): one each, standing at the back of the hero's side.
  ballista: def({ id: 'ballista', name: 'Ballista', plural: 'Ballistas', faction: 'machine', level: 4, attack: 10, defense: 10, minDmg: 10, maxDmg: 15, hp: 250, speed: 1, growth: 0, cost: { gold: 1500 }, shots: 24, machine: 'shooter', retaliations: 0 }),
  tent: def({ id: 'tent', name: 'First Aid Tent', plural: 'First Aid Tents', faction: 'machine', level: 1, attack: 0, defense: 0, minDmg: 0, maxDmg: 0, hp: 75, speed: 1, growth: 0, cost: { gold: 750 }, machine: 'healer', heals: 25, retaliations: 0 }),
  ogre: def({ id: 'ogre', name: 'Cyclops', plural: 'Cyclopes', faction: 'neutral', level: 4, attack: 13, defense: 7, minDmg: 6, maxDmg: 12, hp: 40, speed: 4, growth: 4, cost: { gold: 300 } }),
} as const;

export type CreatureId =
  | 'spearman' | 'bowman' | 'griffin' | 'swordsman' | 'monk' | 'lancer' | 'seraph'
  | 'spearman2' | 'spearman3' | 'bowman2' | 'bowman3' | 'griffin2' | 'griffin3' | 'swordsman2' | 'swordsman3'
  | 'monk2' | 'monk3' | 'lancer2' | 'lancer3' | 'seraph2' | 'seraph3'
  | 'goblin' | 'skeleton' | 'wolf' | 'bandit' | 'ogre'
  | 'ballista' | 'tent';
export const CREATURE_IDS = Object.keys(CREATURES) as CreatureId[];

export const creature = (id: CreatureId): CreatureDef => CREATURES[id];
/** The war machines, in the order they stand. */
export const MACHINES = ['ballista', 'tent'] as const satisfies readonly CreatureId[];
export type MachineId = (typeof MACHINES)[number];
export const isMachine = (id: CreatureId): boolean => !!creature(id).machine;
export const isCreatureId = (v: unknown): v is CreatureId => typeof v === 'string' && (CREATURE_IDS as string[]).includes(v);

/** The base unit of `id`'s line (itself for a base unit). */
export const lineOf = (id: CreatureId): CreatureId => creature(id).line ?? id;
/** Which of its line's three levels `id` is: 1 (base), 2 or 3. */
export const tierOf = (id: CreatureId): 1 | 2 | 3 => creature(id).tier ?? 1;
/** A line's units, base first: [base] for a unit without upgrades. */
export const lineUnits = (base: CreatureId): CreatureId[] =>
  [base, ...CREATURE_IDS.filter((c) => creature(c).line === base).sort((a, b) => tierOf(a) - tierOf(b))];

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
