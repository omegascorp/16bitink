import type { Rng } from '../logic/rng';
import type { Pt } from './pen';

/**
 * What a level's ground must leave clear, and how far any spot is from it.
 * Every place paints its big or raised things (pots, staging, trunks,
 * boulders, ladders, the rill) only where they keep well away from the
 * grooves the marbles roll in and the pads the gecko sits on.
 */

/** What a ground must leave clear on a level: its tracks' centre lines (every ~4 units) and the gecko's pads. */
export interface GroundKeep {
  readonly grooves: readonly (readonly Pt[])[];
  readonly pads: readonly Pt[];
  /** The ruins' standing columns (centre and radius), painted by the ground itself; others keep clear of them. */
  readonly pillars?: readonly { readonly x: number; readonly y: number; readonly r: number }[];
}

/** Nothing to keep clear: a place's own layout. */
export const KEEP_NOTHING: GroundKeep = { grooves: [], pads: [] };

/** Half a groove's width (TRACK_W / 2 in placesArt.ts). */
const GROOVE_HALF = 20;
/** How far a big feature's edge keeps from a groove's centre line. */
export const GROOVE_CLEAR = GROOVE_HALF + 30;
/** How far a big feature's edge keeps from a pad's centre. */
export const PAD_CLEAR = 90;
/** The room field's cell, board units, and the most room it reports. */
const CELL = 8;
const CAP = 220;
/** Margin round the board the field covers (features may hang off the edge). */
const MARGIN = 80;
/** Use every SAMPLE-th groove point (they come every ~4 units). */
const SAMPLE = 3;

/**
 * How much room a feature centred at (x, y) has: its radius may be up to
 * this and still keep GROOVE_CLEAR from every groove and PAD_CLEAR from every
 * pad (negative where even a point would be too close). At most CAP.
 */
export type Room = (x: number, y: number) => number;

interface Field {
  readonly w: number;
  readonly h: number;
  readonly cols: number;
  readonly rows: number;
  readonly v: Float32Array;
}

const cache = new WeakMap<GroundKeep, Field>();

/** Lowers the field round p to (distance − clear). */
function press(f: Field, p: Pt, clear: number): void {
  const reach = CAP + clear;
  const cx = (p.x + MARGIN) / CELL;
  const cy = (p.y + MARGIN) / CELL;
  const k = Math.ceil(reach / CELL);
  const i0 = Math.max(0, Math.floor(cx - k));
  const i1 = Math.min(f.cols - 1, Math.ceil(cx + k));
  const j0 = Math.max(0, Math.floor(cy - k));
  const j1 = Math.min(f.rows - 1, Math.ceil(cy + k));
  for (let j = j0; j <= j1; j++) {
    const dy = (j + 0.5) * CELL - MARGIN - p.y;
    for (let i = i0; i <= i1; i++) {
      const dx = (i + 0.5) * CELL - MARGIN - p.x;
      const r = Math.sqrt(dx * dx + dy * dy) - clear;
      const at = j * f.cols + i;
      if (r < f.v[at]!) f.v[at] = r;
    }
  }
}

function fieldOf(keep: GroundKeep, w: number, h: number): Field {
  const hit = cache.get(keep);
  if (hit && hit.w === w && hit.h === h) return hit;
  const cols = Math.ceil((w + MARGIN * 2) / CELL);
  const rows = Math.ceil((h + MARGIN * 2) / CELL);
  const f: Field = { w, h, cols, rows, v: new Float32Array(cols * rows).fill(CAP) };
  const near = (p: Pt): boolean => p.x > -MARGIN - CAP - GROOVE_CLEAR && p.x < w + MARGIN + CAP + GROOVE_CLEAR && p.y > -MARGIN - CAP - GROOVE_CLEAR && p.y < h + MARGIN + CAP + GROOVE_CLEAR;
  for (const g of keep.grooves) {
    for (let i = 0; i < g.length; i += SAMPLE) if (near(g[i]!)) press(f, g[i]!, GROOVE_CLEAR);
    if (g.length > 0) press(f, g[g.length - 1]!, GROOVE_CLEAR);
  }
  for (const p of keep.pads) press(f, p, PAD_CLEAR);
  cache.set(keep, f);
  return f;
}

/** The room function for a w × h board laid out for `keep`; worked out once per `keep` object. */
export function roomOf(keep: GroundKeep, w: number, h: number): Room {
  const f = fieldOf(keep, w, h);
  // A cell's value is exact at its centre; allow for the rest of the cell.
  const slack = CELL * 0.75;
  return (x, y) => {
    const i = Math.floor((x + MARGIN) / CELL);
    const j = Math.floor((y + MARGIN) / CELL);
    if (i < 0 || j < 0 || i >= f.cols || j >= f.rows) return CAP;
    return f.v[j * f.cols + i]! - slack;
  };
}

/** Whether every point of a footprint keeps clear (room at least `r` at each). */
export function fits(room: Room, footprint: readonly Pt[], r = 0): boolean {
  return footprint.every((p) => room(p.x, p.y) >= r);
}

/** A disc already taken by something painted. */
export interface Taken {
  readonly x: number;
  readonly y: number;
  readonly r: number;
}

/**
 * A random spot in the box (x0, y0)–(x1, y1) with room for radius r that
 * keeps `gap` from everything in `taken`, or null after `tries`.
 */
export function spotFor(rng: Rng, room: Room, box: readonly [number, number, number, number], r: number, taken: readonly Taken[] = [], gap = 0, tries = 30): Pt | null {
  const [x0, y0, x1, y1] = box;
  for (let k = 0; k < tries; k++) {
    const p = { x: x0 + rng() * (x1 - x0), y: y0 + rng() * (y1 - y0) };
    if (room(p.x, p.y) < r) continue;
    if (taken.some((t) => Math.hypot(t.x - p.x, t.y - p.y) < t.r + r + gap)) continue;
    return p;
  }
  return null;
}
