import { addHold, holdEntries } from './hold';
import { addHoldTo, contents, emptyInventory, type Inventory } from './inventory';
import { isSolid, wrapX, type Terrain, type TilePos } from './terrain';

/**
 * The bag left behind (spec, "Dying"): when the suit gives out, or the
 * winch hauls you up, what was in the bag stays where you were, under a
 * little inked flag. One at a time: leaving another bag replaces it.
 */
export interface DroppedBag {
  readonly col: number;
  readonly row: number;
  readonly bag: Inventory;
}

/** Where a bag dropped at (col, row) comes to rest: the open tile on the ground below it, or above it if (col, row) is in rock. */
export function settle(t: Terrain, col: number, row: number): TilePos {
  const x = wrapX(t, col);
  let y = Math.max(0, Math.min(t.height - 1, row));
  while (y > 0 && isSolid(t, x, y)) y--;
  while (y < t.height - 1 && !isSolid(t, x, y + 1)) y++;
  return [x, y];
}

/** Two left bags as one, packed into full stacks by ore, so nothing is lost when a flag moves and it never grows past what's in it. */
export function joinBags(a: Inventory, b: Inventory): Inventory {
  const stack = Math.max(a.stack, b.stack);
  const all = addHold(contents(a), contents(b));
  const slots = holdEntries(all).reduce((n, [, count]) => n + Math.ceil(count / stack), 0);
  return addHoldTo(emptyInventory(slots, stack), all).inv;
}
