import type { MapDef } from '../level/types';
import { checkGoal, enterTown, ourHeroes, revealAround, townAt, townById, type Adventure } from './adventure';
import { isEmptyArmy } from './army';
import { selectHero, townHeroes, withHero } from './heroes';
import { sightOf, type Hero } from './hero';
import { buildingIn, has, type Town } from './town';

/**
 * The Portal's way between towns (its third level, the Great Portal): a
 * hero of ours in a town with one steps through to another town of ours
 * with one. It takes whatever movement the hero has left (they need some),
 * and they arrive in the place they left (the gate leading an army, the
 * garrison with none), which must be free there; arriving is riding in.
 * Either side's heroes use it under these rules (the lord's on the mirrored
 * map). Its other levels are the shared store (storage.ts) and the weekly
 * mob (portalMob.ts).
 */

/** How far a town's Portal is built: 0 none, 1 the shared store, 2 the weekly mob, 3 the way between towns. */
export const portalLevel = (t: Pick<Town, 'built'>): number => (t.built.includes('portal3') ? 3 : t.built.includes('portal2') ? 2 : t.built.includes('portal') ? 1 : 0);

/** The towns of `from`'s holder a hero there could step through to: every other with a Great Portal, the map's order. */
export const portalTowns = (adv: Adventure, from: Town): Town[] => adv.towns.filter((t) => t.id !== from.id && t.owner === from.owner && has(t, 'portal3'));

/** Our hero `heroId` and the town of ours they stand in. */
function heroAt(adv: Adventure, heroId: string): { hero: Hero; town: Town | undefined } | null {
  const hero = ourHeroes(adv).find((h) => h.id === heroId);
  if (!hero) return null;
  const town = townAt(adv, hero.x, hero.y);
  return { hero, town: town?.owner === 'player' ? town : undefined };
}

/** Why hero `heroId` can't step through to town `toId` now, or null when they can. */
export function cantStepThrough(adv: Adventure, heroId: string, toId: string): string | null {
  const at = heroAt(adv, heroId);
  if (!at) return 'Not here';
  const { hero, town } = at;
  if (!town || !has(town, 'portal3')) return `${hero.name} must be in a town with a ${buildingIn(town ?? {}, 'portal3').name}`;
  const to = townById(adv, toId);
  if (!to || to.id === town.id || to.owner !== 'player') return 'Not a town of yours';
  if (!has(to, 'portal3')) return `${to.name} has no ${buildingIn(to, 'portal3').name}`;
  if (hero.mp <= 0) return `${hero.name} has no movement left today`;
  // They come out where they went in: the gate leading an army, the garrison with none.
  const there = townHeroes(adv, to);
  if (!isEmptyArmy(hero.army) && there.visitor) return `${there.visitor.name} stands in ${to.name}'s gate`;
  if (isEmptyArmy(hero.army) && there.garrison) return `${there.garrison.name} holds ${to.name}'s garrison`;
  return null;
}

/**
 * Hero `heroId` steps through to town `toId`: there, picked, with no
 * movement left, riding in (the temple's Ankhs, the guild's spells, the
 * map's goal). Null when they can't (see cantStepThrough).
 */
export function stepThrough(adv: Adventure, def: MapDef, heroId: string, toId: string): Adventure | null {
  if (cantStepThrough(adv, heroId, toId)) return null;
  const to = townById(adv, toId)!;
  const hero = ourHeroes(adv).find((h) => h.id === heroId)!;
  const moved = selectHero(withHero(adv, { ...hero, x: to.x, y: to.y, mp: 0 }), heroId);
  return checkGoal(enterTown(revealAround(moved, def, to.x, to.y, sightOf(moved.hero))), def);
}
