/**
 * Battle spells. Numbers from docs/inkheroes-design.md. Every hero draws on
 * two kinds (the lore, user Nov 3): common magic any civilisation can learn,
 * and the divine powers of its own gods (for Greece, Olympian Favor: Zeus,
 * Athena, Ares and Poseidon). Ids stay as first named, so saves keep them.
 */
export const SPELL_IDS = ['magicArrow', 'bless', 'stoneSkin', 'bloodlust', 'haste', 'slow', 'cure', 'lightningBolt', 'dispel'] as const;
export type SpellId = (typeof SPELL_IDS)[number];

/** Who a spell is cast on; `any` is either side's unit. */
export type SpellTarget = 'enemy' | 'friend' | 'any';

/** Common magic, or a civilisation's divine powers. */
export type SpellSchool = 'common' | 'olympian';
export type God = 'zeus' | 'athena' | 'ares' | 'poseidon';

/** The spellbook's tabs, in order. */
export const SCHOOLS: readonly { readonly id: SpellSchool; readonly name: string; readonly lore: string }[] = [
  { id: 'common', name: 'Common Magic', lore: 'Spells any hero can learn: speed and slowness, shields, healing, and the breaking of other spells.' },
  { id: 'olympian', name: 'Olympian Favor', lore: 'The gods of Olympus lend their power to those they favor. Zeus hurls lightning, Athena guides every blow, Ares feeds the fury of battle.' },
];

export interface SpellDef {
  readonly id: SpellId;
  readonly name: string;
  readonly level: number;
  readonly mana: number;
  readonly target: SpellTarget;
  readonly school: SpellSchool;
  /** The god who grants a divine power. */
  readonly god?: God;
  /** Damage or healing: per point of Spell Power, plus a base. */
  readonly perPower?: number;
  readonly base?: number;
  /** A timed effect it puts on its target. */
  readonly effect?: EffectKind;
  readonly says: string;
}

/** `stone` is no spell: a basilisk's strike puts it on a stack, for one lost turn (see battle.ts). */
export type EffectKind = 'bless' | 'stoneSkin' | 'bloodlust' | 'haste' | 'slow' | 'stone';

export const SPELLS: Readonly<Record<SpellId, SpellDef>> = {
  magicArrow: { id: 'magicArrow', name: 'Magic Arrow', level: 1, mana: 5, target: 'enemy', school: 'common', perPower: 10, base: 10, says: 'A bolt of force: 10 × power + 10 damage' },
  haste: { id: 'haste', name: 'Haste', level: 1, mana: 6, target: 'friend', school: 'common', effect: 'haste', says: '+3 speed' },
  slow: { id: 'slow', name: 'Slow', level: 1, mana: 6, target: 'enemy', school: 'common', effect: 'slow', says: '−25% speed' },
  stoneSkin: { id: 'stoneSkin', name: 'Shield', level: 1, mana: 5, target: 'friend', school: 'common', effect: 'stoneSkin', says: '+3 Defense' },
  cure: { id: 'cure', name: 'Healing', level: 1, mana: 6, target: 'friend', school: 'common', perPower: 5, base: 10, says: 'Heals 5 × power + 10 and lifts bad spells' },
  dispel: { id: 'dispel', name: 'Dispel', level: 1, mana: 5, target: 'any', school: 'common', says: 'Lifts every spell from a unit, good or bad' },
  lightningBolt: { id: 'lightningBolt', name: 'Thunderbolt of Zeus', level: 2, mana: 10, target: 'enemy', school: 'olympian', god: 'zeus', perPower: 25, base: 10, says: 'Zeus strikes: 25 × power + 10 damage' },
  bless: { id: 'bless', name: 'Wisdom of Athena', level: 1, mana: 5, target: 'friend', school: 'olympian', god: 'athena', effect: 'bless', says: 'Every blow lands true: always its most damage' },
  bloodlust: { id: 'bloodlust', name: 'Fury of Ares', level: 1, mana: 5, target: 'friend', school: 'olympian', god: 'ares', effect: 'bloodlust', says: '+3 Attack in melee' },
};

export const BAD_EFFECTS: readonly EffectKind[] = ['slow', 'stone'];
export const isSpellId = (v: unknown): v is SpellId => typeof v === 'string' && (SPELL_IDS as readonly string[]).includes(v);
