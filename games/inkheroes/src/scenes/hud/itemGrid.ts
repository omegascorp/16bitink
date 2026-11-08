/** The size of a grid of gear places (pure, so layouts can be tested without Phaser). */

/** A piece's place in a bag or a store: its 64 px icon at half size in a frame. */
export const ITEM_CELL = 36;
export const ITEM_GAP = 2;
export const ITEM_STEP = ITEM_CELL + ITEM_GAP;

/** How wide and tall `count` cells are in rows of `cols`. */
export function itemCellsSize(count: number, cols: number): { w: number; h: number } {
  const across = Math.max(1, Math.min(count, cols));
  return { w: across * ITEM_STEP - ITEM_GAP, h: Math.max(1, Math.ceil(count / across)) * ITEM_STEP - ITEM_GAP };
}

/** The most cells a row `w` wide holds. */
export const itemCols = (w: number): number => Math.max(1, Math.floor((w + ITEM_GAP) / ITEM_STEP));
