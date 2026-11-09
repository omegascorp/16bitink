import type { HeroDef } from './types';

/**
 * The heroes a Tavern hires in the Border March. Rowan is a Knight, a
 * fighter; the second is a Cleric, so the chapter's two heroes play the
 * Olympian League's two ways (military and mystical, neither the better).
 * Where they stand is set when they are hired.
 */
export const IANTHE: HeroDef = {
  id: 'ianthe', name: 'Ianthe', heroClass: 'cleric', x: 0, y: 0,
  attack: 1, defense: 1, power: 2, knowledge: 2, skills: { wisdom: 1 }, spells: ['bless', 'cure'], gear: { book: 'noviceSpellbook' },
  army: [{ creature: 'spearman', count: 15 }, { creature: 'bowman', count: 8 }],
  blurb: 'A priestess of Athena, quick with a blessing and a cure.',
};

/** From part 2 on (the land grows too big for one hero to cover): one more hero for the chapter. */
export const BORDER_RECRUITS: readonly HeroDef[] = [IANTHE];

/**
 * Neferet as the Two Lands open (Nekhen places her): Isis's priestess, who
 * curses and wards and, with an Ankh, raises the fallen. The Egyptian
 * roster's Cleric, with the numbers of her first part.
 */
export const NEFERET: HeroDef = {
  id: 'neferet', name: 'Neferet', heroClass: 'cleric', x: 0, y: 0, faction: 'kemet',
  attack: 1, defense: 1, power: 2, knowledge: 3, skills: { wisdom: 1 }, spells: ['curse', 'ward'], gear: { book: 'novicePapyrus' }, ankhs: 2,
  army: [{ creature: 'levy', count: 18 }, { creature: 'nubian', count: 7 }],
  blurb: "Isis's priestess of Nekhen, whose rites curse a foe and ward a friend.",
};

/**
 * The Two Lands' second hero, hired from part 2 (Abu): Paser, a chariot
 * captain, the fighter beside Neferet the mystic. No art of his own yet
 * (the hero art falls back to the player's, as Neferet's did).
 */
export const PASER: HeroDef = {
  id: 'paser', name: 'Paser', heroClass: 'knight', x: 0, y: 0, faction: 'kemet',
  attack: 3, defense: 2, power: 1, knowledge: 1, skills: { offense: 1 }, spells: [],
  army: [{ creature: 'levy', count: 15 }, { creature: 'chariot', count: 3 }],
  blurb: 'A chariot captain of the southern road, first into any breach.',
};

/** From part 2 (Abu) on: the chapter's second hero. */
export const TWO_LANDS_RECRUITS: readonly HeroDef[] = [PASER];
