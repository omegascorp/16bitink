import type { MapDef } from '../level/types';
import { gridOf, guardAt, heroInGarrison, heroTown, isSeen, objectCovering, otherHeroAt, planPath, rivalAt, rivalHeroes, townAt, type Adventure } from './adventure';
import type { Hero } from './hero';
import { inGrid } from './map';
import { townFootprint } from './objects';
import { undefended, type Town } from './town';

/** What a tap on a tile would have the hero do: ride there, end up in a fight, or take or enter something (or pick or meet another hero of ours). */
export type MapIntent = 'move' | 'attack' | 'visit';

/** The town of ours whose picture (its gate and all the ground under it) covers the seen tile (x, y): a tap there opens the town. */
export function ownTownPictureAt(adv: Adventure, def: MapDef, x: number, y: number): Town | undefined {
  if (!inGrid(gridOf(def), x, y) || !isSeen(adv, def, x, y)) return undefined;
  return adv.towns.find((t) => t.owner === 'player' && ((t.x === x && t.y === y) || townFootprint(t.x, t.y).some((f) => f.x === x && f.y === y)));
}

/**
 * The town a tap on (x, y) opens at once: one of ours, by any tile of its picture, unless a ride to its gate is already
 * planned (`planEnd` is where the planned path ends), when the tap rides as before.
 */
export function townToEnter(adv: Adventure, def: MapDef, x: number, y: number, planEnd?: { x: number; y: number }): Town | undefined {
  const town = ownTownPictureAt(adv, def, x, y);
  return town && !(planEnd && planEnd.x === town.x && planEnd.y === town.y) ? town : undefined;
}

/** The intent at (x, y), or null where a tap does nothing: the fog, no way there, a hero left in the garrison. */
export function intentAt(adv: Adventure, def: MapDef, x: number, y: number): MapIntent | null {
  if (!inGrid(gridOf(def), x, y) || !isSeen(adv, def, x, y)) return null;
  // Anywhere on the picture of a town of ours: the gauntlet, to go in.
  if (ownTownPictureAt(adv, def, x, y)) return 'visit';
  if (x === adv.hero.x && y === adv.hero.y) return heroTown(adv) ? 'visit' : null;
  // Another hero of ours: picked, or met from beside them.
  if (otherHeroAt(adv, x, y)) return 'visit';
  if (heroInGarrison(adv)) return null;
  // A tap anywhere on an object's picture heads for the object itself.
  const o = objectCovering(adv, x, y);
  const tx = o?.x ?? x;
  const ty = o?.y ?? y;
  if (!planPath(adv, def, tx, ty)) return null;
  if (rivalAt(adv, tx, ty)) return 'attack';
  if (o) return o.kind === 'monster' || guardAt(adv, o.x, o.y) ? 'attack' : 'visit';
  const gate = townAt(adv, x, y);
  if (gate) return gate.owner !== 'player' && !gate.ally && !undefended(gate) ? 'attack' : 'visit';
  return guardAt(adv, x, y) ? 'attack' : 'move';
}

/** The rival's hero standing at (x, y), if any (a lord rides with several): the one a tap there would fight. */
export const rivalHeroAt = (adv: Adventure, x: number, y: number): Hero | undefined => rivalHeroes(adv).find((h) => h.x === x && h.y === y);
