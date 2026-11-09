import type { HeroDef } from '../../level/types';

/**
 * The heroes a lord's Taverns hire when the map names none (Greek classes,
 * the player's price and pool rules: each one once). Lykaon's own: his sons
 * in the old tales. x and y are where they stand when hired.
 */
export const LORD_RECRUITS: readonly HeroDef[] = [
  { id: 'nyktimos', name: 'Nyktimos', heroClass: 'knight', x: 0, y: 0, attack: 2, defense: 1, power: 1, knowledge: 1, skills: { offense: 1 }, spells: [], army: [{ creature: 'spearman', count: 10 }, { creature: 'bowman', count: 4 }] },
  { id: 'mainalos', name: 'Mainalos', heroClass: 'cleric', x: 0, y: 0, attack: 1, defense: 1, power: 2, knowledge: 2, skills: { wisdom: 1 }, spells: [], army: [{ creature: 'spearman', count: 8 }, { creature: 'bowman', count: 5 }] },
];
