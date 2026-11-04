/** A skill's icon, the height of its row and the space between two side by side, UI pixels. */
export const SKILL_ICON = 32;
const ROW_H = SKILL_ICON + 2;
const CELL_GAP = 8;

/** Where each of `count` skills sits in a space `w` wide: one to a row with room for its words, or two to a row. */
export function skillGrid(count: number, w: number, wordy: boolean): { readonly cells: readonly { readonly x: number; readonly y: number }[]; readonly h: number } {
  const across = wordy ? 1 : 2;
  const cellW = Math.floor((w - CELL_GAP * (across - 1)) / across);
  return {
    cells: Array.from({ length: count }, (_, i) => ({ x: (i % across) * (cellW + CELL_GAP), y: Math.floor(i / across) * ROW_H })),
    h: Math.ceil(count / across) * ROW_H,
  };
}
