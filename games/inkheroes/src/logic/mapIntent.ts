import type { MapDef } from '../level/types';
import { gridOf, guardAt, heroInGarrison, heroTown, isSeen, objectCovering, planPath, rivalAt, townAt, type Adventure } from './adventure';
import { isEmptyArmy } from './army';
import { inGrid } from './map';

/** What a tap on a tile would have the hero do: ride there, end up in a fight, or take or enter something. */
export type MapIntent = 'move' | 'attack' | 'visit';

/** The intent at (x, y), or null where a tap does nothing: the fog, no way there, a hero left in the garrison. */
export function intentAt(adv: Adventure, def: MapDef, x: number, y: number): MapIntent | null {
  if (!inGrid(gridOf(def), x, y) || !isSeen(adv, def, x, y)) return null;
  if (x === adv.hero.x && y === adv.hero.y) return heroTown(adv) ? 'visit' : null;
  if (heroInGarrison(adv)) return null;
  // A tap anywhere on an object's picture heads for the object itself.
  const o = objectCovering(adv, x, y);
  const tx = o?.x ?? x;
  const ty = o?.y ?? y;
  if (!planPath(adv, def, tx, ty)) return null;
  if (rivalAt(adv, tx, ty)) return 'attack';
  if (o) return o.kind === 'monster' || guardAt(adv, o.x, o.y) ? 'attack' : 'visit';
  const gate = townAt(adv, x, y);
  if (gate) return gate.owner !== 'player' && !gate.ally && !isEmptyArmy(gate.garrison) ? 'attack' : 'visit';
  return guardAt(adv, x, y) ? 'attack' : 'move';
}
