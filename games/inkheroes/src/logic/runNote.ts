import { ourHeroes, playerTowns, type Adventure } from './adventure';

/**
 * How far a part has got, in the game's own words, for the site's funnel
 * ("stuck at"). The site groups players by this exact text, so it holds only
 * coarse, stable things: the day, towns we own, heroes we have. Never gold.
 * e.g. "day 5 · 2 towns · 2 heroes".
 */
export function progressNote(adv: Adventure): string {
  const towns = playerTowns(adv).length;
  const heroes = ourHeroes(adv).length;
  return `day ${adv.day} · ${towns} ${towns === 1 ? 'town' : 'towns'} · ${heroes} ${heroes === 1 ? 'hero' : 'heroes'}`;
}
