import { creature, lineOf, lineUnits, type CreatureId } from './creatures';
import type { SpellId } from './spells';

/**
 * A hero's specialty (docs/inkheroes-design.md, "The Greek heroes"), as
 * each H3 hero has one: a creature line they lead better, a spell they cast
 * better, or gold their estates bring in. It grows with the hero's level.
 */
export type Specialty =
  /** A creature line (its base unit): every level of it gets +1 Attack and +1 Defense, and +1 more per LINE_LEVELS hero levels. */
  | { readonly kind: 'line'; readonly line: CreatureId }
  /** A spell cast better (SPELL_BONUS says how). */
  | { readonly kind: 'spell'; readonly spell: SpecialtySpell }
  /** Gold a day, in the day's income. */
  | { readonly kind: 'gold'; readonly gold: number };

/** The spells a specialty can be in, each with its own bonus. */
export type SpecialtySpell = Extract<SpellId, 'cure' | 'slow' | 'lightningBolt' | 'ward' | 'rebirth' | 'curse'>;

/** A line specialist's +1 Attack and +1 Defense from level 1, and another +1 every this many hero levels. */
export const LINE_LEVELS = 4;
/** A Healing specialist heals this share more. */
export const CURE_SHARE = 0.5;
/** A Slow specialist's Slow lasts a round more every this many levels. */
export const SLOW_LEVELS = 5;
/** A Curse of Set specialist's Curse lasts a round more every this many levels. */
export const CURSE_LEVELS = 5;
/** A Ward of Isis specialist's Ward soaks this share more. */
export const WARD_SHARE = 0.5;
/** A Rite of Osiris specialist's Rite brings back this share more. */
export const REBIRTH_SHARE = 0.5;
/** A Thunderbolt specialist's bolt does this share more damage a hero level. */
export const BOLT_SHARE = 0.05;
/** The gold specialist's gold a day. */
export const SPECIALTY_GOLD = 350;

/** What a hero brings to a battle of their specialty: it and their level. */
export type BattleSpecialty = Specialty & { readonly level: number };

/** A line specialist's Attack and Defense bonus at `level`. */
export const lineBonus = (level: number): number => 1 + Math.floor(Math.max(0, level) / LINE_LEVELS);

/** What a battle hero's specialty adds to `id`'s Attack and Defense (0 off their line). */
export function lineBonusFor(spec: BattleSpecialty | undefined, id: CreatureId): number {
  return spec?.kind === 'line' && lineOf(id) === spec.line ? lineBonus(spec.level) : 0;
}

/** The share a spell specialist adds to `spell`'s amount (healing or damage); 0 for any other. */
export function spellShare(spec: BattleSpecialty | undefined, spell: SpellId): number {
  if (spec?.kind !== 'spell' || spec.spell !== spell) return 0;
  if (spell === 'cure') return CURE_SHARE;
  if (spell === 'ward') return WARD_SHARE;
  if (spell === 'rebirth') return REBIRTH_SHARE;
  if (spell === 'lightningBolt') return BOLT_SHARE * spec.level;
  return 0;
}

/** Rounds a Slow or Curse specialist's spell lasts beyond Spell Power. */
export function extraRounds(spec: BattleSpecialty | undefined, spell: SpellId): number {
  if (spec?.kind !== 'spell' || spec.spell !== spell) return 0;
  if (spell === 'slow') return Math.floor(spec.level / SLOW_LEVELS);
  if (spell === 'curse') return Math.floor(spec.level / CURSE_LEVELS);
  return 0;
}

/** Gold a day the heroes' specialties bring in. */
export const specialtyGold = (heroes: readonly { readonly specialty?: Specialty }[]): number =>
  heroes.reduce((n, h) => n + (h.specialty?.kind === 'gold' ? h.specialty.gold : 0), 0);

/** The specialty's one line, for the hero sheet and the Tavern card. */
export function specialtyText(spec: Specialty, spellName: (s: SpellId) => string): string {
  switch (spec.kind) {
    case 'line': return `${creature(spec.line).plural}: +1 Attack and Defense, +1 more per ${LINE_LEVELS} levels`;
    case 'gold': return `Gold: +${spec.gold} a day`;
    case 'spell':
      if (spec.spell === 'cure') return `${spellName('cure')}: heals ${CURE_SHARE * 100}% more`;
      if (spec.spell === 'slow') return `${spellName('slow')}: lasts a round more per ${SLOW_LEVELS} levels`;
      if (spec.spell === 'curse') return `${spellName('curse')}: lasts a round more per ${CURSE_LEVELS} levels`;
      if (spec.spell === 'ward') return `${spellName('ward')}: soaks ${WARD_SHARE * 100}% more`;
      if (spec.spell === 'rebirth') return `${spellName('rebirth')}: brings back ${REBIRTH_SHARE * 100}% more`;
      return `${spellName(spec.spell)}: +${BOLT_SHARE * 100}% damage per level`;
  }
}

/** The units a line specialty covers (all three levels). */
export const specialtyUnits = (spec: Specialty | undefined): CreatureId[] => (spec?.kind === 'line' ? lineUnits(spec.line) : []);

export function isSpecialty(v: unknown): v is Specialty {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Record<string, unknown>;
  if (s.kind === 'gold') return typeof s.gold === 'number';
  if (s.kind === 'spell') return ['cure', 'slow', 'lightningBolt', 'ward', 'rebirth', 'curse'].includes(s.spell as string);
  return s.kind === 'line' && typeof s.line === 'string';
}
