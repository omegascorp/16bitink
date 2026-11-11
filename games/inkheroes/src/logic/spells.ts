/**
 * Battle spells. Numbers from docs/inkheroes-design.md. Every hero draws on
 * two kinds (the lore, user Nov 3): common magic any civilisation can learn,
 * and the divine powers of its own gods (for Greece, Olympian Favor: Zeus,
 * Athena, Ares and Poseidon). Ids stay as first named, so saves keep them.
 */
export const SPELL_IDS = ['magicArrow', 'bless', 'stoneSkin', 'bloodlust', 'haste', 'slow', 'cure', 'lightningBolt', 'dispel', 'curse', 'ward', 'rebirth', 'tiwaz', 'isa', 'thurisaz'] as const;
export type SpellId = (typeof SPELL_IDS)[number];

/** Who a spell is cast on; `any` is either side's unit. */
export type SpellTarget = 'enemy' | 'friend' | 'any';

/** Common magic, or a civilisation's divine powers. */
export type SpellSchool = 'common' | 'olympian' | 'rites' | 'runes';
export type God = 'zeus' | 'athena' | 'ares' | 'poseidon' | 'set' | 'isis' | 'osiris' | 'tyr' | 'thor' | 'skadi';

/** The spellbook's tabs, in order. */
export const SCHOOLS: readonly { readonly id: SpellSchool; readonly name: string; readonly lore: string }[] = [
  { id: 'common', name: 'Common Magic', lore: 'Spells any hero can learn: speed and slowness, shields, healing, and the breaking of other spells.' },
  { id: 'olympian', name: 'Olympian Favor', lore: 'The gods of Olympus lend their power to those they favor. Zeus hurls lightning, Athena guides every blow, Ares feeds the fury of battle.' },
  { id: 'rites', name: 'Sacred Rites', lore: 'The temple’s old rituals: Set curses the foe, Isis wards the faithful, and Osiris gives back the fallen to one who brings an Ankh.' },
  { id: 'runes', name: 'Rune Magic', lore: 'Runes are carved, not cast for a while: Tyr’s rune grows fiercer as its bearers fall, Thor’s brings lightning down on whoever strikes them, and the ice rune freezes a foe’s answer. A company bears one rune at a time.' },
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
  /** Ankhs the hero spends on it, beside the mana. */
  readonly ankhs?: number;
  readonly says: string;
}

/**
 * `stone` is no spell: a basilisk's strike puts it on a stack, for one lost
 * turn (see battle.ts); `poison`, a scorpion's, counts its target's turns.
 * `curse` comes from the spell or a mummy's strike; `ward` soaks damage.
 */
export type EffectKind = 'bless' | 'stoneSkin' | 'bloodlust' | 'haste' | 'slow' | 'stone' | 'curse' | 'ward' | 'poison' | RuneKind;

/** The Norse runes: carved on a stack, one at a time (a new rune replaces the old). Tiwaz and Thurisaz last the battle; Isa melts (Spell Power rounds). */
export type RuneKind = 'tiwaz' | 'isa' | 'thurisaz';
export const RUNES: readonly RuneKind[] = ['tiwaz', 'isa', 'thurisaz'];
export const isRune = (k: EffectKind): k is RuneKind => (RUNES as readonly string[]).includes(k);

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
  curse: { id: 'curse', name: 'Curse of Set', level: 1, mana: 5, target: 'enemy', school: 'rites', god: 'set', effect: 'curse', says: 'Every blow falls short: always its least damage' },
  ward: { id: 'ward', name: 'Ward of Isis', level: 1, mana: 6, target: 'friend', school: 'rites', god: 'isis', effect: 'ward', perPower: 10, base: 20, says: 'Soaks the next 10 × power + 20 damage' },
  rebirth: { id: 'rebirth', name: 'Rite of Osiris', level: 2, mana: 12, ankhs: 1, target: 'friend', school: 'rites', god: 'osiris', perPower: 30, base: 40, says: 'Brings back 30 × power + 40 health of the fallen, for good; costs an Ankh' },
  tiwaz: { id: 'tiwaz', name: 'Tiwaz, Tyr’s rune', level: 1, mana: 6, target: 'friend', school: 'runes', god: 'tyr', effect: 'tiwaz', says: '+2 Attack, and +1 more each time the company loses creatures (to +6), for the battle' },
  isa: { id: 'isa', name: 'Isa, the ice rune', level: 1, mana: 6, target: 'enemy', school: 'runes', god: 'skadi', effect: 'isa', says: 'The company can’t answer strikes until the ice melts (Spell Power rounds)' },
  thurisaz: { id: 'thurisaz', name: 'Thurisaz, Thor’s rune', level: 2, mana: 10, target: 'friend', school: 'runes', god: 'thor', effect: 'thurisaz', perPower: 5, base: 10, says: 'Each melee strike on the company brings lightning down on the striker: 5 × power + 10 damage, for the battle' },
};

export const BAD_EFFECTS: readonly EffectKind[] = ['slow', 'stone', 'curse', 'poison', 'isa'];
/** Effects that don't wear off with the round: stone lasts until its lost turn, poison counts turns, a ward until it is spent, Tiwaz and Thurisaz the battle. */
export const UNTIMED_EFFECTS: readonly EffectKind[] = ['stone', 'poison', 'ward', 'tiwaz', 'thurisaz'];

/** Tiwaz's Attack when carved, and the most it grows to (a Tiwaz specialist raises the cap). */
export const TIWAZ = { base: 2, cap: 6 } as const;
export const isSpellId = (v: unknown): v is SpellId => typeof v === 'string' && (SPELL_IDS as readonly string[]).includes(v);
