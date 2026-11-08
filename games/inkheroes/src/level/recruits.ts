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
