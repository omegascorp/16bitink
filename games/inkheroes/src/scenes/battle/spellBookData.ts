import { SCHOOLS, SPELLS, type SpellId, type SpellSchool } from '../../logic/spells';

/**
 * The tabs a hero's book has: Common Magic, and each people's divine powers
 * the hero knows a spell of; with none known, the Olympian tab, as the
 * Greeks' books always had.
 */
export function bookTabs(spells: readonly SpellId[]): (typeof SCHOOLS)[number][] {
  const known = (id: SpellSchool): boolean => spells.some((s) => SPELLS[s].school === id);
  const divine = SCHOOLS.filter((s) => s.id !== 'common' && known(s.id));
  return SCHOOLS.filter((s) => s.id === 'common' || (divine.length ? divine.includes(s) : s.id === 'olympian'));
}

/** A spell's price on its page: the mana, and for a rite the Ankh it spends out of those the hero holds. */
export function costLine(id: SpellId, ankhs: number): string {
  const def = SPELLS[id];
  return def.ankhs ? `${def.mana} mana + ${def.ankhs} Ankh\nAnkhs: ${Math.min(ankhs, 999)}` : `${def.mana} mana`;
}
