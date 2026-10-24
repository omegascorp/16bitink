/** Battle spells. Numbers from docs/inkheroes-design.md. */
export const SPELL_IDS = ['magicArrow', 'bless', 'stoneSkin', 'bloodlust', 'haste', 'slow', 'cure', 'lightningBolt'] as const;
export type SpellId = (typeof SPELL_IDS)[number];

export type SpellTarget = 'enemy' | 'friend';

export interface SpellDef {
  readonly id: SpellId;
  readonly name: string;
  readonly level: number;
  readonly mana: number;
  readonly target: SpellTarget;
  /** Damage or healing: per point of Spell Power, plus a base. */
  readonly perPower?: number;
  readonly base?: number;
  /** A timed effect it puts on its target. */
  readonly effect?: EffectKind;
  readonly says: string;
}

export type EffectKind = 'bless' | 'stoneSkin' | 'bloodlust' | 'haste' | 'slow';

export const SPELLS: Readonly<Record<SpellId, SpellDef>> = {
  magicArrow: { id: 'magicArrow', name: 'Magic Arrow', level: 1, mana: 5, target: 'enemy', perPower: 10, base: 10, says: 'A bolt of ink: 10 × power + 10 damage' },
  bless: { id: 'bless', name: 'Bless', level: 1, mana: 5, target: 'friend', effect: 'bless', says: 'Always deals its most damage' },
  stoneSkin: { id: 'stoneSkin', name: 'Stone Skin', level: 1, mana: 5, target: 'friend', effect: 'stoneSkin', says: '+3 Defense' },
  bloodlust: { id: 'bloodlust', name: 'Bloodlust', level: 1, mana: 5, target: 'friend', effect: 'bloodlust', says: '+3 Attack in melee' },
  haste: { id: 'haste', name: 'Haste', level: 1, mana: 6, target: 'friend', effect: 'haste', says: '+3 speed' },
  slow: { id: 'slow', name: 'Slow', level: 1, mana: 6, target: 'enemy', effect: 'slow', says: '−25% speed' },
  cure: { id: 'cure', name: 'Cure', level: 1, mana: 6, target: 'friend', perPower: 5, base: 10, says: 'Heals 5 × power + 10 and lifts bad spells' },
  lightningBolt: { id: 'lightningBolt', name: 'Lightning Bolt', level: 2, mana: 10, target: 'enemy', perPower: 25, base: 10, says: 'A crack of lightning: 25 × power + 10 damage' },
};

export const BAD_EFFECTS: readonly EffectKind[] = ['slow'];
export const isSpellId = (v: unknown): v is SpellId => typeof v === 'string' && (SPELL_IDS as readonly string[]).includes(v);
