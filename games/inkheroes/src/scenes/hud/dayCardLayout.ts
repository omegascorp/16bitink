import { SLOT, SLOT_GAP } from '../battle/pixelFrames';

/** The shortest a gold bar is drawn, so a small source still shows. */
const MIN_BAR = 2;
/** The room the two columns need, UI pixels. */
const COLUMNS_MIN_W = 480;

/** A gold bar's length: its share of the biggest source. */
export function barLength(gold: number, top: number, room: number): number {
  return gold > 0 ? Math.max(MIN_BAR, Math.round((gold / top) * room)) : 0;
}

/** Things `widths` wide laid on rows `room` wide, `gap` apart, each row centred; their index and left edge. */
export function centredRows(widths: readonly number[], room: number, gap: number): { i: number; x: number }[][] {
  const rows: number[][] = [];
  let used = 0;
  widths.forEach((w, i) => {
    const last = rows[rows.length - 1];
    if (last && used + gap + w <= room) {
      last.push(i);
      used += gap + w;
    } else {
      rows.push([i]);
      used = w;
    }
  });
  return rows.map((row) => {
    let x = Math.floor((room - (row.reduce((n, i) => n + widths[i]!, 0) + gap * (row.length - 1))) / 2);
    return row.map((i) => {
      const at = { i, x };
      x += widths[i]! + gap;
      return at;
    });
  });
}

/** How big a town's recruit faces are drawn: full size unless its `most` dwellings wouldn't fit beside the name. */
export function faceSlot(room: number, nameW: number, most: number): number {
  return Math.min(SLOT, Math.floor((room - nameW + SLOT_GAP) / Math.max(1, most)) - SLOT_GAP);
}

/** Whether a card this tall must spread into two columns to fit the screen. */
export function needsColumns(height: number, screen: { readonly w: number; readonly h: number }): boolean {
  return height > screen.h - 4 && screen.w >= COLUMNS_MIN_W;
}
