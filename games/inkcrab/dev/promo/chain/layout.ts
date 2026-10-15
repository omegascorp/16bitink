import { type ShellKind, shellPx } from '../../../src/logic/shells';

/**
 * Where the queue stands: a snaking line, like a bank queue, in three rows
 * down the frame. It starts top left at the big empty shell (slot 0), runs
 * right along the first row, turns down and back left along the second,
 * then right again along the third, from the biggest crab (slot 1) to the
 * smallest (slot 7). Each crab faces the way the line moves, towards the
 * shell ahead: left on rows one and three, right on row two. Rope-and-post
 * barriers stand between the rows.
 */

/** Shell size in each slot, and its kind: Wreck Cove's whelks and conchs (beach 7, the game's vacancy-chain beach) and a few more of the game's. */
export const SLOT_SIZES = [8, 7, 6, 5, 4, 3, 2, 1] as const;
export const SLOT_KINDS: readonly ShellKind[] = ['horseconch', 'lightningwhelk', 'tulip', 'murex', 'figshell', 'nassa', 'nerite', 'periwinkle'];
export const SLOTS = SLOT_SIZES.length;

/** Screen px per world px (the game's size units, see shellPx). */
export const Z = 7;
/** A shell's width on screen for a size. */
export const widthOf = (size: number): number => shellPx(size) * Z;

/** Room left in front of each shell for its crab's claws, as a share of its width. */
const REACH = 0.4;
const GAP = 8;

export interface Row {
  readonly slots: readonly number[];
  /** Screen y of the sand the row stands on. */
  readonly y: number;
  /** The way its crabs face: towards the head of the line. */
  readonly facing: 1 | -1;
  /** Where its first slot starts: from the left edge (facing left) or the right edge (facing right). */
  readonly inset: number;
}

export const ROWS: readonly Row[] = [
  { slots: [0, 1], y: 748, facing: -1, inset: 30 },
  { slots: [2, 3, 4], y: 925, facing: 1, inset: 30 },
  { slots: [5, 6, 7], y: 1080, facing: -1, inset: 60 },
];

/** Each slot's row. */
export const SLOT_ROW: readonly number[] = Array.from({ length: SLOTS }, (_, s) => ROWS.findIndex((r) => r.slots.includes(s)));
export const SLOT_Y: readonly number[] = SLOT_ROW.map((r) => ROWS[r]!.y);
export const SLOT_FACING: readonly (1 | -1)[] = SLOT_ROW.map((r) => ROWS[r]!.facing);

/** Screen x of each slot's shell middle: each shell with its crab's reach in front of it, laid along its row from the row's start. */
export const SLOT_X: readonly number[] = (() => {
  const xs: number[] = Array.from({ length: SLOTS }, () => 0);
  for (const row of ROWS) {
    const dir = -row.facing;
    let x = row.facing === -1 ? row.inset : 1080 - row.inset;
    for (const s of row.slots) {
      const w = widthOf(SLOT_SIZES[s]!);
      x += dir * w * REACH;
      xs[s] = x + (dir * w) / 2;
      x += dir * (w + GAP);
    }
  }
  return xs;
})();

/** Roughly the top of a slot's shell: where hop arcs and labels point. */
export const shellTop = (slot: number): { readonly x: number; readonly y: number } => ({ x: SLOT_X[slot]!, y: SLOT_Y[slot]! - widthOf(SLOT_SIZES[slot]!) * 0.5 });

/** A crab running in from off the right edge comes along the last row. */
export const OFF_RIGHT_X = 1200;

/**
 * The lane the line follows, on the sand just in front of each row, turning
 * outside the rows' ends: the path of the size ruler, from the biggest crab
 * to the smallest.
 */
export function lanePath(): { readonly x: number; readonly y: number }[] {
  const [r0, r1, r2] = ROWS as [Row, Row, Row];
  const d = 12;
  const head = SLOT_X[1]! - widthOf(SLOT_SIZES[1]) * 0.75;
  const tail = SLOT_X[SLOTS - 1]! + widthOf(SLOT_SIZES[SLOTS - 1]!) * 0.7;
  return [
    { x: head, y: r0.y + d },
    { x: 1052, y: r0.y + d },
    { x: 1052, y: r1.y + d },
    { x: 34, y: r1.y + d },
    { x: 34, y: r2.y + d },
    { x: tail, y: r2.y + d },
  ];
}

/** The queue barriers: a rope on posts in front of the first two rows, open at the end where the line turns. */
export const ROPES: readonly { readonly y: number; readonly posts: readonly number[] }[] = [
  { y: ROWS[0]!.y + 46, posts: [40, 330, 620] },
  { y: ROWS[1]!.y + 46, posts: [330, 685, 1040] },
];
