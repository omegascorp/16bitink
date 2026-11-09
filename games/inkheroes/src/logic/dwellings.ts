import { addTroops, type Army } from './army';
import { creature } from './creatures';
import { DWELLING_NAMES, type MapObject, type Owner } from './objects';
import { affordable, pay, type Purse } from './resources';

/**
 * Outer dwellings (H3's): a creature's home out on the map. Its guard is a
 * monster beside it, fought first as any guarded site's. Then it flies the
 * flag of whoever visited last, fills every Monday with its growth while
 * flagged (unhired creatures stay), and hires its creature at their price.
 * The rival flags them, hires there and takes them back, as mines.
 */

/** The creatures waiting there (a dwelling the map gave no stock has its first week's). */
export const dwellingStock = (o: MapObject): number => o.stock ?? o.growth ?? 0;

/** Its name on the map. */
export const dwellingName = (o: MapObject): string => (o.look && o.look !== 'keep' ? DWELLING_NAMES[o.look] : 'Dwelling');

/** Monday: every flagged dwelling gains its week's growth. */
export function growDwellings(objects: readonly MapObject[]): MapObject[] {
  return objects.map((o) => (o.kind === 'dwelling' && !o.gone && o.owner && o.owner !== 'neutral' ? { ...o, stock: dwellingStock(o) + (o.growth ?? 0) } : o));
}

/** How many `o` can hire into `army` from `p`: its stock, the purse and the army's room permitting. */
export function dwellingHireable(o: MapObject, p: Purse, army: Army): number {
  if (o.kind !== 'dwelling' || !o.creature || !addTroops(army, o.creature, 1)) return 0;
  return Math.min(dwellingStock(o), affordable(p, creature(o.creature).cost));
}

/** Hires `count` (all it can, left out) at dwelling `o` into `army`: the dwelling, purse and army after, and how many came. */
export function hireAtDwelling(o: MapObject, p: Purse, army: Army, count?: number): { dwelling: MapObject; purse: Purse; army: Army; hired: number } {
  const most = dwellingHireable(o, p, army);
  const n = Math.max(0, Math.min(most, count ?? most));
  if (!n) return { dwelling: o, purse: p, army, hired: 0 };
  return { dwelling: { ...o, stock: dwellingStock(o) - n }, purse: pay(p, creature(o.creature!).cost, n), army: addTroops(army, o.creature!, n)!, hired: n };
}

/** `o` flagged by `owner` (a dwelling, or a mine: the same rule). */
export const flagged = (o: MapObject, owner: Owner): MapObject => ({ ...o, owner });
