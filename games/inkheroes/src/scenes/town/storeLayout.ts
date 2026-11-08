import { ITEM_CELL, itemCols } from '../hud/itemGrid';
import { ROOM } from './guildLayout';

/** The room's parts, UI pixels. */
export const STORE = {
  pad: 8,
  gap: 6,
  head: 28,
  line: 15,
  /** Inside a plate, round its contents. */
  inset: 6,
  /** The bag's own picture beside its places. */
  bag: ITEM_CELL,
  /** The next bag up: its picture, name and price. */
  buy: { w: 150, h: 40 },
  /** The line at the foot: the picked piece, or what to do. */
  foot: 40,
} as const;

/** Where everything goes, from the window's top-left. */
export interface StoreLayout {
  readonly w: number;
  readonly h: number;
  readonly store: { readonly y: number; readonly h: number; readonly cols: number };
  readonly heroes: readonly { readonly y: number; readonly h: number; readonly cols: number; readonly buyBelow: boolean }[];
  readonly foot: { readonly y: number };
}

const rowsOf = (count: number, cols: number): number => Math.max(1, Math.ceil(count / Math.max(1, cols)));
const cellsH = (count: number, cols: number): number => rowsOf(count, cols) * (ITEM_CELL + 2) - 2;

/** The room for a store of `room` places and heroes with bags of `bags` places, in `area`. */
export function storeLayout(area: { w: number; h: number }, room: number, bags: readonly number[]): StoreLayout {
  const { pad, gap, head, line, inset, buy } = STORE;
  const w = Math.min(ROOM.w, area.w);
  const inner = w - pad * 2 - inset * 2;
  // As few rows as fit, each as full as the next: 20 places go 10 and 10, not 19 and 1.
  const storeRows = rowsOf(room, itemCols(inner));
  const storeCols = Math.ceil(room / storeRows);
  let y = head;
  const storeH = inset + line + 3 + cellsH(room, storeCols) + inset;
  const store = { y, h: storeH, cols: storeCols };
  y += storeH + gap;
  const heroes = bags.map((n) => {
    // The bag's places beside its picture, and the next bag up at the right while there's room for a few places beside it.
    const beside = inner - STORE.bag - 4 - buy.w - gap;
    const buyBelow = itemCols(beside) < Math.min(n, 4);
    const cols = itemCols(buyBelow ? inner - STORE.bag - 4 : beside);
    const body = Math.max(cellsH(n, cols), buyBelow ? 0 : buy.h);
    const h = inset + line + 3 + body + (buyBelow ? gap + buy.h : 0) + inset;
    const row = { y, h, cols, buyBelow };
    y += h + gap;
    return row;
  });
  const foot = { y };
  return { w, h: y + STORE.foot + pad, store, heroes, foot };
}
