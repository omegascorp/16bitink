import type { Pt } from '../sprites';

/**
 * Where the snake crawls, world units (1 unit = 1 screen px at frame 1): a
 * serpentine that repeats. Row 0 is the hen's row: the hen's nose is at u = 0
 * and her body lies along u > 0, on a line sloping down to the left. Past her
 * the path turns up and back to the right, then up and left again onto the
 * next hen's row. One period on, everything is the same, moved by DRIFT, so
 * the head can crawl forward for the whole loop and come round to frame 1.
 *
 * u runs the way the snake travels: the head at h, the body at h − d.
 */
export const TILT = (14 * Math.PI) / 180;
const ROW = Math.PI - TILT;
const BACK = 2 * Math.PI - (8 * Math.PI) / 180;
/** The straight before the nose. */
const LEAD = 120;
const LENGTHS = { row: 1300, turn: 1000, back: 300 } as const;
export const PERIOD = LENGTHS.row + LENGTHS.turn + LENGTHS.back + LENGTHS.turn;
const STEP = 4;

const ease = (u: number): number => u * u * (3 - 2 * u);

/** Direction of travel at `s` along one period, from the start of the row. */
function headingOf(s: number): number {
  const { row, turn, back } = LENGTHS;
  if (s < row) return ROW;
  if (s < row + turn) return ROW + (BACK - ROW) * ease((s - row) / turn);
  if (s < row + turn + back) return BACK;
  return BACK + (ROW - BACK) * ease((s - row - turn - back) / turn);
}

interface Table {
  readonly x: readonly number[];
  readonly y: readonly number[];
}

function build(): Table {
  const n = Math.ceil(PERIOD / STEP);
  const x = [0];
  const y = [0];
  for (let i = 0; i < n; i++) {
    const h = headingOf((i + 0.5) * STEP);
    x.push(x[i]! + Math.cos(h) * STEP);
    y.push(y[i]! + Math.sin(h) * STEP);
  }
  // Measured from the nose, which sits LEAD along the row.
  const dx = Math.cos(ROW) * LEAD;
  const dy = Math.sin(ROW) * LEAD;
  return { x: x.map((v) => v - dx), y: y.map((v) => v - dy) };
}

const TABLE = build();
const LAST = Math.ceil(PERIOD / STEP);
const STRETCH = PERIOD / (LAST * STEP);

/** What one period moves the path by. */
export const DRIFT: Pt = { x: TABLE.x[LAST]! - TABLE.x[0]!, y: TABLE.y[LAST]! - TABLE.y[0]! };

export interface PathPoint extends Pt {
  readonly heading: number;
}

/** The path at u (any u: it repeats, moved by DRIFT each period). */
export function pathAt(u: number): PathPoint {
  const s = u + LEAD;
  const n = Math.floor(s / PERIOD);
  const local = s - n * PERIOD;
  const f = local / (STEP * STRETCH);
  const i = Math.min(LAST - 1, Math.floor(f));
  const k = f - i;
  return {
    x: TABLE.x[i]! + (TABLE.x[i + 1]! - TABLE.x[i]!) * k + n * DRIFT.x,
    y: TABLE.y[i]! + (TABLE.y[i + 1]! - TABLE.y[i]!) * k + n * DRIFT.y,
    heading: headingOf(local),
  };
}
