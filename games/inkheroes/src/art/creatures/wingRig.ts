import { pt, ribbon, type Draw } from '../kit';
import type { Pt } from '../pen';
import { dab } from './crownElitePaint';
import type { WingSpec } from './wings';

/**
 * Posing for the winged figures (griffin, seraph). A figure's whole pose is
 * one plain record of numbers and points (a rig); a motion is a few such
 * records, its key poses, spaced evenly through t. `keyed` eases through
 * them on a Catmull-Rom curve, so a six-frame loop flows instead of
 * stopping at each key. Rigid parts are drawn inside a transform (`within`)
 * so their painting stays exactly as drawn; points that must meet across
 * parts (a hip and its leg) go through the same transform (`place`).
 */

/** A rigid move: turn by `rot` (radians, screen) about `pivot`, then shift by (x, y). */
export interface Xf {
  readonly pivot: Pt;
  readonly rot: number;
  readonly x: number;
  readonly y: number;
}

export const still = (pivot: Pt): Xf => ({ pivot, rot: 0, x: 0, y: 0 });

/** Where a point drawn in the part's own space lands. */
export function place(xf: Xf, p: Pt): Pt {
  const [c, s] = [Math.cos(xf.rot), Math.sin(xf.rot)];
  const [dx, dy] = [p.x - xf.pivot.x, p.y - xf.pivot.y];
  return pt(xf.pivot.x + dx * c - dy * s + xf.x, xf.pivot.y + dx * s + dy * c + xf.y);
}

/** Runs `draw` with the canvas moved by `xf`: everything it paints moves as one piece. */
export function within(d: Draw, xf: Xf, draw: () => void): void {
  const { ctx } = d.pen;
  ctx.save();
  ctx.translate(xf.pivot.x + xf.x, xf.pivot.y + xf.y);
  ctx.rotate(xf.rot);
  ctx.translate(-xf.pivot.x, -xf.pivot.y);
  draw();
  ctx.restore();
}

/** Weighted sum of like-shaped records: numbers (and points) blend; anything else is the first's. */
function blend<T>(trees: readonly T[], w: readonly number[]): T {
  const first = trees[0] as unknown;
  if (typeof first === 'number') return trees.reduce((s, v, i) => s + (v as unknown as number) * w[i]!, 0) as unknown as T;
  if (Array.isArray(first)) return first.map((_, k) => blend(trees.map((t) => (t as unknown as unknown[])[k]), w)) as unknown as T;
  if (first && typeof first === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(first)) out[key] = blend(trees.map((t) => (t as Record<string, unknown>)[key]), w);
    return out as T;
  }
  return first as T;
}

/**
 * The pose at t between evenly spaced keys: a loop's keys sit at i / n and
 * wrap; a one-shot's at i / (n − 1), held at both ends.
 */
export function keyed<T>(keys: readonly T[], t: number, loop: boolean): T {
  const n = keys.length;
  const span = loop ? n : n - 1;
  const u = Math.max(0, Math.min(span, (loop ? ((t % 1) + 1) % 1 : Math.max(0, Math.min(1, t))) * span));
  const i = Math.min(span - 1, Math.floor(u));
  const s = u - i;
  const at = (k: number): T => keys[loop ? ((k % n) + n) % n : Math.max(0, Math.min(n - 1, k))]!;
  const [s2, s3] = [s * s, s * s * s];
  const w = [(-s3 + 2 * s2 - s) / 2, (3 * s3 - 5 * s2 + 2) / 2, (-3 * s3 + 4 * s2 + s) / 2, (s3 - s2) / 2];
  return blend([at(i - 1), at(i), at(i + 1), at(i + 2)], w);
}

/** 1 at `centre`, falling to 0 at `width` away: an effect that flashes up round one moment. */
export const bump = (t: number, centre: number, width: number): number => Math.max(0, 1 - Math.abs(t - centre) / width);

/** The bones and feather fans of a wing pose, without its colours. */
export type WingKey = Pick<WingSpec, 'shoulder' | 'elbow' | 'wrist' | 'hand' | 'primaries' | 'secondaries'>;

/** A wing key dressed in a wing's colours. */
export const dress = (key: WingKey, look: Omit<WingSpec, keyof WingKey>): WingSpec => ({ ...look, ...key });

/** Breathing for a resting wing: the hand and the fan lift by `k` (about −1..1). */
export function flex(key: WingKey, k: number): WingKey {
  const lift = (p: Pt, m: number): Pt => pt(p.x - k * m * 0.4, p.y - k * m);
  return {
    ...key,
    elbow: lift(key.elbow, 0.5),
    wrist: lift(key.wrist, 1.1),
    hand: lift(key.hand, 1.6),
    primaries: { ...key.primaries, a0: key.primaries.a0 + k * 0.03, a1: key.primaries.a1 + k * 0.07 },
    secondaries: { ...key.secondaries, a: key.secondaries.a - k * 0.04 },
  };
}

/**
 * A motion streak along an arc about `c` from angle a0 to a1 (the way the
 * stroke travels): a pale wash swelling to `w` and tapering to the tail,
 * its outer edge picked out in a fine line. Painted over the figure.
 */
export function swoosh(d: Draw, c: Pt, r: number, a0: number, a1: number, w: number, colour: string, alpha: number): void {
  const spine = Array.from({ length: 18 }, (_, i) => {
    const a = a1 + ((a0 - a1) * i) / 17;
    return pt(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r);
  });
  const band = ribbon(spine, (u) => w * Math.sin(Math.PI * Math.min(1, 0.12 + u * 0.95)) * (1 - u * 0.55));
  dab(d, band.shape, colour, alpha, 0.5);
  const outer = a1 > a0 ? band.top : band.bot;
  d.pen.hair(outer.slice(1, -4), 0.3, d.ink, alpha * 0.7);
}

const wrap = (a: number): number => a - Math.PI * 2 * Math.round(a / (Math.PI * 2));

export interface FarOpts {
  /** How much the far wing is narrowed across (it is seen edge-on). */
  readonly sx?: number;
  /** Extra turn of the feather fans, radians. */
  readonly turn?: number;
  /** Feather length factor. */
  readonly len?: number;
  /** Feather counts. */
  readonly np: number;
  readonly ns: number;
}

/**
 * The far wing's pose from the near one's: rooted at its own `shoulder`,
 * narrowed across as it turns away from us, fans turned a little more
 * upright, feathers a little shorter and fewer.
 */
export function farOf(key: WingKey, shoulder: Pt, o: FarOpts): WingKey {
  const [sx, turn, len] = [o.sx ?? 0.62, o.turn ?? 0.25, o.len ?? 0.84];
  const P = (p: Pt): Pt => pt(shoulder.x + (p.x - key.shoulder.x) * sx, shoulder.y + (p.y - key.shoulder.y) * 0.98);
  const A = (a: number): number => a + wrap(Math.atan2(Math.sin(a), Math.cos(a) * 0.75) - a) + turn;
  const { primaries: pr, secondaries: se } = key;
  return {
    shoulder, elbow: P(key.elbow), wrist: P(key.wrist), hand: P(key.hand),
    primaries: { n: o.np, a0: A(pr.a0), a1: A(pr.a1), l0: pr.l0 * len, l1: pr.l1 * len },
    secondaries: { n: o.ns, a: A(se.a), l0: se.l0 * len * 0.92, l1: se.l1 * len * 0.85 },
  };
}
