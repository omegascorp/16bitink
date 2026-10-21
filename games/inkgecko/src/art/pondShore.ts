import type { GroundKeep } from './keep';
import { pt, TAU } from './kit';
import type { Pt } from './pen';

/**
 * The pond's shoreline: where the flagstone terrace meets the water. It is
 * a star-shaped loop round the middle of the board, a squarish superellipse
 * with bays of water at the corners, pushed outwards wherever a level's
 * grooves or the gecko's pads need dry ground, so the water and its coping
 * always keep clear of them. Board coordinates.
 */

/** What the pond must leave dry on a level: the shared GroundKeep (grooves' centre lines and the gecko's pads). */
export type PondKeep = GroundKeep;

/** Nothing to keep dry: the pond's own shape. */
export const KEEP_NOTHING: PondKeep = { grooves: [], pads: [] };

/** How square the terrace is (a superellipse exponent) and how far it reaches, in shares of the half board. */
const SQUARENESS = 4.2;
const REACH_X = 0.95;
const REACH_Y = 1.1;
/** Bays of water reaching in, as [direction, depth, width] in the board's own (stretched) angles. */
const BAYS: readonly (readonly [number, number, number])[] = [
  [0.62, 0.25, 0.4],
  [Math.PI + 0.68, 0.2, 0.38],
  [-0.7, 0.14, 0.32],
  [Math.PI - 0.62, 0.12, 0.3],
];
/** Deepest the coping stones reach in from the shoreline (see pond.ts). */
const COPING_DEPTH = 27;
/** Shoreline clearance from a groove's centre: TRACK_W / 2 + 26 to the water, plus the coping's depth. */
const GROOVE_CLEAR = 20 + 26 + COPING_DEPTH;
/** Shoreline clearance from a pad's centre: PAD_R · 1.3 + 20 to the water, plus the coping's depth. */
const PAD_CLEAR = 58 * 1.3 + 20 + COPING_DEPTH;
/** Directions the shoreline is worked out in. */
const BINS = 720;
/** Use every SAMPLE-th groove point (they come every ~4 units). */
const SAMPLE = 3;
/** Smoothing of a bulge in the shoreline, in bins: box-blur half width (run twice), after widening by twice that. */
const BLUR = 7;
/** Keep points this far inside the base shoreline (as a share of it) cannot reach the water. */
const DEEP_INSIDE = 0.5;

/** The base terrace's radius in direction phi, in shares of the reach. */
function baseRadius(phi: number): number {
  const c = Math.abs(Math.cos(phi));
  const s = Math.abs(Math.sin(phi));
  let r = (c ** SQUARENESS + s ** SQUARENESS) ** (-1 / SQUARENESS);
  for (const [a, depth, width] of BAYS) {
    const da = Math.atan2(Math.sin(phi - a), Math.cos(phi - a));
    r *= 1 - depth * Math.exp(-((da / width) ** 2));
  }
  return r * (1 + 0.014 * Math.sin(phi * 7 + 1.3) + 0.009 * Math.sin(phi * 13 + 0.4) + 0.005 * Math.sin(phi * 23 + 2));
}

/** A level's shoreline: the board it is for and its radius in each of BINS directions. */
interface Shore {
  readonly w: number;
  readonly h: number;
  readonly radius: Float64Array;
}

const cache = new WeakMap<PondKeep, Shore>();

/** Max over ±k bins, wrapping round. */
function widen(a: Float64Array, k: number): Float64Array {
  return a.map((_, i) => {
    let m = 0;
    for (let j = -k; j <= k; j++) m = Math.max(m, a[(i + j + BINS) % BINS]!);
    return m;
  });
}

/** Mean over ±k bins, wrapping round. */
function blur(a: Float64Array, k: number): Float64Array {
  return a.map((_, i) => {
    let s = 0;
    for (let j = -k; j <= k; j++) s += a[(i + j + BINS) % BINS]!;
    return s / (2 * k + 1);
  });
}

/** The radius (in shares of the reach) the shoreline must have in each direction to keep `clear` units from p. */
function demand(need: Float64Array, p: Pt, clear: number, w: number, h: number): void {
  const ax = (w / 2) * REACH_X;
  const ay = (h / 2) * REACH_Y;
  const dx = p.x - w / 2;
  const dy = p.y - h / 2;
  if (p.x < -clear || p.x > w + clear || p.y < -clear || p.y > h + clear) return;
  const phiP = Math.atan2(dy / ay, dx / ax);
  if (Math.hypot(dx / ax, dy / ay) < DEEP_INSIDE * baseRadius(phiP)) return;
  const dist = Math.hypot(dx, dy);
  // Board angles are squeezed in the stretched space; look wide enough either way.
  const win = Math.min(Math.PI / 2, 3 * Math.asin(Math.min(1, clear / Math.max(dist, 1))));
  const i0 = Math.floor(((phiP - win) / TAU) * BINS);
  const i1 = Math.ceil(((phiP + win) / TAU) * BINS);
  for (let i = i0; i <= i1; i++) {
    const phi = (i / BINS) * TAU;
    const vx = Math.cos(phi) * ax;
    const vy = Math.sin(phi) * ay;
    const len = Math.hypot(vx, vy);
    const t0 = (dx * vx + dy * vy) / len;
    const off = Math.abs(dx * vy - dy * vx) / len;
    if (t0 <= 0 || off >= clear) continue;
    const k = ((i % BINS) + BINS) % BINS;
    need[k] = Math.max(need[k]!, (t0 + Math.sqrt(clear * clear - off * off)) / len);
  }
}

/** The shoreline for a level, worked out once per `keep`. */
function shoreOf(w: number, h: number, keep: PondKeep): Shore {
  const hit = cache.get(keep);
  if (hit && hit.w === w && hit.h === h) return hit;
  const need = new Float64Array(BINS);
  for (const g of keep.grooves) {
    for (let i = 0; i < g.length; i += SAMPLE) demand(need, g[i]!, GROOVE_CLEAR, w, h);
    if (g.length > 0) demand(need, g[g.length - 1]!, GROOVE_CLEAR, w, h);
  }
  for (const p of keep.pads) demand(need, p, PAD_CLEAR, w, h);
  const bulge = blur(blur(widen(need, BLUR * 2), BLUR), BLUR);
  const radius = bulge.map((b, i) => {
    const a = baseRadius((i / BINS) * TAU);
    // A smooth max, so a bulge meets the shore without a crease.
    return (a + b + Math.sqrt((a - b) ** 2 + 0.0016)) / 2;
  });
  const shore = { w, h, radius };
  cache.set(keep, shore);
  return shore;
}

/** The shoreline's radius in direction phi (stretched angle), in shares of the reach. */
function radiusAt(s: Shore, phi: number): number {
  const f = ((((phi / TAU) * BINS) % BINS) + BINS) % BINS;
  const i = Math.floor(f);
  const t = f - i;
  return s.radius[i % BINS]! * (1 - t) + s.radius[(i + 1) % BINS]! * t;
}

/**
 * Where (x, y) lies relative to the pond side on a w × h board laid out for
 * `keep`: below 1 on the terrace (0 in the middle), 1 at the shoreline under
 * the coping, above 1 out in the water. Worked out once per `keep` object.
 */
export function pondReach(x: number, y: number, w: number, h: number, keep: PondKeep): number {
  const s = shoreOf(w, h, keep);
  const u = (x - w / 2) / ((w / 2) * REACH_X);
  const v = (y - h / 2) / ((h / 2) * REACH_Y);
  return Math.hypot(u, v) / radiusAt(s, Math.atan2(v, u));
}

/** The shoreline as a closed loop (first point not repeated), resampled about every `step` units. */
export function shoreline(w: number, h: number, keep: PondKeep, step: number): Pt[] {
  const s = shoreOf(w, h, keep);
  const n = BINS * 2;
  const raw = Array.from({ length: n }, (_, i) => {
    const phi = (i / n) * TAU;
    const r = radiusAt(s, phi);
    return pt(w / 2 + Math.cos(phi) * r * (w / 2) * REACH_X, h / 2 + Math.sin(phi) * r * (h / 2) * REACH_Y);
  });
  const out: Pt[] = [raw[0]!];
  let acc = 0;
  for (let i = 1; i < raw.length; i++) {
    acc += Math.hypot(raw[i]!.x - raw[i - 1]!.x, raw[i]!.y - raw[i - 1]!.y);
    if (acc >= step) {
      out.push(raw[i]!);
      acc = 0;
    }
  }
  return out;
}
