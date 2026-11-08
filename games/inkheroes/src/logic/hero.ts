import { gearBonus, hasSpellbook, withGear, type Gear, type ItemId } from './items';
import { TILE_MP } from './map';
import { armyMorale, slowest, type Army } from './army';
import type { BattleHero } from './battleTypes';
import { rollInt } from './rng';
import { MAX_SKILLS, SKILL_IDS, skillValue, type Rank, type SkillId, type Skills } from './skills';
import type { SpellId } from './spells';
import type { TownFaction } from './creatures';

export type HeroClass = 'knight' | 'cleric';
export type Primary = 'attack' | 'defense' | 'power' | 'knowledge';
export const PRIMARIES: readonly Primary[] = ['attack', 'defense', 'power', 'knowledge'];
export const PRIMARY_NAMES: Readonly<Record<Primary, string>> = { attack: 'Attack', defense: 'Defense', power: 'Spell Power', knowledge: 'Knowledge' };

export interface Hero {
  readonly id: string;
  readonly name: string;
  readonly heroClass: HeroClass;
  readonly x: number;
  readonly y: number;
  readonly attack: number;
  readonly defense: number;
  readonly power: number;
  readonly knowledge: number;
  readonly mana: number;
  readonly xp: number;
  readonly level: number;
  readonly skills: Skills;
  readonly spells: readonly SpellId[];
  readonly army: Army;
  /** Movement points left today. */
  readonly mp: number;
  /** Ids of once-per-hero sites already visited. */
  readonly visited: readonly string[];
  /** What they wear, by slot. */
  readonly gear?: Gear;
  /** Spare pieces carried. */
  readonly bag?: readonly ItemId[];
  /** Which bag they carry them in (`BAGS`): none means the Satchel. */
  readonly pack?: number;
  /** Their people (none: the Greeks'). */
  readonly faction?: TownFaction;
  /** Ankhs carried, for the Rite of Osiris (none: 0). */
  readonly ankhs?: number;
}

interface ClassDef {
  readonly name: string;
  /** Level-up weights for Attack, Defense, Spell Power, Knowledge (percent). */
  readonly weights: readonly [number, number, number, number];
  /** Secondary skills it is offered more often. */
  readonly favours: readonly SkillId[];
}

export const CLASSES: Readonly<Record<HeroClass, ClassDef>> = {
  knight: { name: 'Knight', weights: [35, 45, 10, 10], favours: ['leadership', 'offense', 'armorer', 'archery', 'logistics', 'pathfinding', 'estates'] },
  cleric: { name: 'Cleric', weights: [20, 15, 30, 35], favours: ['wisdom', 'sorcery', 'intelligence', 'mysticism', 'learning', 'leadership'] },
};

/** Experience to reach each level from 1 (H3's table), then ×1.2 a level. */
const XP_TABLE = [0, 1000, 2000, 3200, 4600, 6200, 8000, 10000, 12200, 14700, 17500, 20600, 24320, 28784, 34140];

export function xpForLevel(level: number): number {
  if (level <= XP_TABLE.length) return XP_TABLE[level - 1]!;
  let xp = XP_TABLE[XP_TABLE.length - 1]!;
  let step = xp - XP_TABLE[XP_TABLE.length - 2]!;
  for (let l = XP_TABLE.length + 1; l <= level; l++) {
    step = Math.floor(step * 1.2);
    xp += step;
  }
  return xp;
}

export function levelFor(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  return level;
}

export const maxMana = (h: Hero): number => Math.floor(withGear(h).knowledge * 10 * (1 + skillValue(h.skills, 'intelligence')));

/** `h` with no more mana than they can hold (after a change of gear). */
export const withinMana = (h: Hero): Hero => ({ ...h, mana: Math.min(h.mana, maxMana(h)) });

/** Movement points a day by the army's slowest unit (H3's table), with Logistics. */
const MP_BY_SPEED = [1300, 1360, 1430, 1500, 1560, 1630, 1700, 1760, 1830, 1900, 1960, 2000];

export function dailyMp(h: Hero): number {
  const s = Math.max(3, slowest(h.army));
  return Math.floor(MP_BY_SPEED[Math.min(s, MP_BY_SPEED.length - 1)]! * (1 + skillValue(h.skills, 'logistics'))) + (gearBonus(h).travel ?? 0) * TILE_MP;
}

export const sightOf = (h: Hero): number => 5 + skillValue(h.skills, 'scouting') + (gearBonus(h).sight ?? 0);

/** Experience after Learning. */
export const gainedXp = (h: Hero, xp: number): number => Math.floor(xp * (1 + skillValue(h.skills, 'learning')));

export function toBattleHero(h: Hero): BattleHero {
  const geared = withGear(h);
  const worn = gearBonus(h);
  return {
    name: h.name, attack: geared.attack, defense: geared.defense, power: geared.power, mana: h.mana,
    spells: hasSpellbook(h) ? h.spells : [], skills: h.skills, ...(h.ankhs ? { ankhs: h.ankhs } : {}),
    morale: skillValue(h.skills, 'leadership') + (worn.morale ?? 0), luck: skillValue(h.skills, 'luck') + (worn.luck ?? 0),
    ...(h.faction ? { faction: h.faction } : {}),
  };
}

/** Morale shown on the hero card: Leadership plus the army's make-up. */
export const heroMorale = (h: Hero): number => Math.max(-3, Math.min(3, skillValue(h.skills, 'leadership') + armyMorale(h.army)));

/** What only matters to a hero with a spellbook. */
const MAGIC_PRIMARIES: readonly Primary[] = ['power', 'knowledge'];
const MAGIC_SKILLS: readonly SkillId[] = ['wisdom', 'intelligence', 'mysticism', 'sorcery'];

/** What a level-up offers: the primary skill it raises and up to two secondary skills to choose from. */
export interface LevelUp {
  readonly level: number;
  readonly primary: Primary;
  readonly choices: readonly SkillId[];
}

/** Rolls the next level-up for a hero due one (xp past its level), or null. */
export function nextLevelUp(h: Hero, seed: number): { offer: LevelUp; seed: number } | null {
  if (levelFor(h.xp) <= h.level) return null;
  const cls = CLASSES[h.heroClass];
  // Without a spellbook nothing feeds magic: the rolls fall on Attack and Defense, the offers on the other skills.
  const book = hasSpellbook(h);
  const weights = cls.weights.map((w, i) => (book || !MAGIC_PRIMARIES.includes(PRIMARIES[i]!) ? w : 0));
  const p = rollInt(seed, 1, weights.reduce((a, b) => a + b, 0));
  let acc = 0;
  const primary = PRIMARIES.find((_, i) => (acc += weights[i]!) >= p.value) ?? 'attack';
  let s = p.seed;
  const offered = SKILL_IDS.filter((id) => book || !MAGIC_SKILLS.includes(id));
  const upgrades = offered.filter((id) => h.skills[id] && h.skills[id]! < 3);
  const held = SKILL_IDS.filter((id) => h.skills[id]).length;
  const fresh = held < MAX_SKILLS ? offered.filter((id) => !h.skills[id]) : [];
  const pick = (pool: readonly SkillId[]): SkillId | null => {
    if (pool.length === 0) return null;
    // Favoured skills are three times as likely.
    const weighted = pool.flatMap((id) => (cls.favours.includes(id) ? [id, id, id] : [id]));
    const r = rollInt(s, 0, weighted.length - 1);
    s = r.seed;
    return weighted[r.value]!;
  };
  const first = pick(upgrades.length ? upgrades : fresh);
  const second = pick((upgrades.length ? fresh : fresh.filter((id) => id !== first)).filter((id) => id !== first));
  const choices = [first, second].filter((x): x is SkillId => x !== null);
  return { offer: { level: h.level + 1, primary, choices }, seed: s };
}

/** The hero after taking a level-up (and the chosen skill, if any). */
export function applyLevelUp(h: Hero, offer: LevelUp, skill: SkillId | null): Hero {
  const raised = { ...h, level: offer.level, [offer.primary]: h[offer.primary] + 1 };
  if (!skill || !offer.choices.includes(skill)) return raised;
  const rank = Math.min(3, (h.skills[skill] ?? 0) + 1) as Rank;
  return { ...raised, skills: { ...h.skills, [skill]: rank } };
}
