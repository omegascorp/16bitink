import type { MapDef } from '../level/types';
import { gridOf, guardAt, heroInGarrison, heroTown, isSeen, objectCovering, otherHeroAt, planPath, rivalAt, rivalHeroes, townAt, type Adventure } from './adventure';
import type { Hero } from './hero';
import { inGrid } from './map';
import { isLying, roomFor } from './lying';
import { townFootprint } from './objects';
import { undefended, type Town } from './town';

/**
 * What a tap on a tile would have the hero do: ride there, end up in a
 * fight, or take or enter something (or pick or meet another hero of ours);
 * on a town of ours, ride in through its gate (`enter`) or open its screen
 * where the hero is (`open`).
 */
export type MapIntent = 'move' | 'attack' | 'visit' | 'enter' | 'open';

/** The two halves of a town of ours' picture: the gate's row and below are the hero's way in, the rest opens the town. */
export type TownPart = 'gate' | 'top';

/** The town of ours whose picture (its gate and all the ground under it) covers the seen tile (x, y): a tap there opens the town. */
export function ownTownPictureAt(adv: Adventure, def: MapDef, x: number, y: number): Town | undefined {
  if (!inGrid(gridOf(def), x, y) || !isSeen(adv, def, x, y)) return undefined;
  return adv.towns.find((t) => t.owner === 'player' && ((t.x === x && t.y === y) || townFootprint(t.x, t.y).some((f) => f.x === x && f.y === y)));
}

/** Which half of a town of ours' picture covers (x, y): the gate and the ground of its row and below (`gate`), or the walls and roofs above (`top`). */
export function ownTownPartAt(adv: Adventure, def: MapDef, x: number, y: number): { town: Town; part: TownPart } | undefined {
  const town = ownTownPictureAt(adv, def, x, y);
  return town ? { town, part: y >= town.y ? 'gate' : 'top' } : undefined;
}

/** Whether the picked hero stands at `town`'s gate (in it, as heroTown has it). */
const atGate = (adv: Adventure, town: Town): boolean => heroTown(adv)?.id === town.id;

/** What a tap on a town of ours does: open its screen (the top, or the gate with the hero at it), plan the ride to its gate, or ride the planned one in. */
export type TownTap = { readonly kind: 'open' | 'plan' | 'ride'; readonly town: Town };

/**
 * A tap on (x, y) over a town of ours (undefined: not one). The top opens
 * the town where the hero is; the gate half plans the ride to the gate, and
 * a second tap (the plan already ends there, `planEnd`) rides in, arriving
 * as a visit. With the hero at the gate already, either half opens it.
 */
export function townTap(adv: Adventure, def: MapDef, x: number, y: number, planEnd?: { x: number; y: number }): TownTap | undefined {
  const at = ownTownPartAt(adv, def, x, y);
  if (!at) return undefined;
  const { town, part } = at;
  if (part === 'top' || atGate(adv, town)) return { kind: 'open', town };
  return { kind: planEnd && planEnd.x === town.x && planEnd.y === town.y ? 'ride' : 'plan', town };
}

/** The town a tap on (x, y) opens at once: one of ours, by the top of its picture, or by any of it with the hero at its gate. */
export function townToEnter(adv: Adventure, def: MapDef, x: number, y: number): Town | undefined {
  const t = townTap(adv, def, x, y);
  return t?.kind === 'open' ? t.town : undefined;
}

/** The status line over a town of ours: "Ride into Eudora" on the gate half, "Open Eudora" on the top (or with the hero at the gate). */
export function townWords(adv: Adventure, def: MapDef, x: number, y: number): string | undefined {
  const t = townTap(adv, def, x, y);
  return t && (t.kind === 'open' ? `Open ${t.town.name}` : `Ride into ${t.town.name}`);
}

/** The intent at (x, y), or null where a tap does nothing: the fog, no way there, a hero left in the garrison. */
export function intentAt(adv: Adventure, def: MapDef, x: number, y: number): MapIntent | null {
  if (!inGrid(gridOf(def), x, y) || !isSeen(adv, def, x, y)) return null;
  // A town of ours: its top opens it; its gate half is the way in (with no way there, nothing).
  const town = townTap(adv, def, x, y);
  if (town) return town.kind === 'open' ? 'open' : !heroInGarrison(adv) && planPath(adv, def, town.town.x, town.town.y) ? 'enter' : null;
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
  if (o?.kind === 'monster' || (o && guardAt(adv, o.x, o.y))) return 'attack';
  // A piece lying on the ground is ridden onto: taken with room in the bag, else just a ride over it (src/logic/lying.ts).
  if (o) return isLying(o) && !roomFor(adv.hero, o.item!) ? 'move' : 'visit';
  const gate = townAt(adv, x, y);
  if (gate) return gate.owner !== 'player' && !gate.ally && !undefended(gate) ? 'attack' : 'visit';
  return guardAt(adv, x, y) ? 'attack' : 'move';
}

/** The rival's hero standing at (x, y), if any (a lord rides with several): the one a tap there would fight. */
export const rivalHeroAt = (adv: Adventure, x: number, y: number): Hero | undefined => rivalHeroes(adv).find((h) => h.x === x && h.y === y);
