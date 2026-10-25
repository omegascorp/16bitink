import { createRng } from '../../logic/rng';
import { bezier, closed, type Draw, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { type Coat, furEdge, glaze, hairs, sizeOf } from '../critters/preyKit';
import { onLayer } from '../critters/tomcatKit';
import { tube, tufted } from '../critters/tomcatParts';

/**
 * A furred four-legged animal seen from above facing +x, the raccoon's and
 * the opossum's shared build (after the Old Tomcat's): a trunk from a
 * width profile, legs bending from root through elbow or hock to the paw,
 * a head from a crown and a muzzle, a tail along a spine; then fur painted
 * over layered washes, hair by hair, with a soft broken contour and a
 * soft cast shadow. Board px, light from the upper left.
 */

/** A leg's keys on the +y side: where it roots under the trunk, where its joint juts out, where its paw rests. */
export interface LegKey {
  readonly root: Pt;
  readonly joint: Pt;
  readonly paw: Pt;
}
export const leg = (root: Pt, joint: Pt, paw: Pt): LegKey => ({ root, joint, paw });

export interface Leg {
  readonly limb: Pt[];
  readonly spine: Pt[];
  readonly root: Pt;
  readonly c: Pt;
  readonly ang: number;
  readonly side: 1 | -1;
  readonly front: boolean;
}

/** A leg bending smoothly from its root through the joint to the paw, `w0` across at the root, `w1` at the wrist. */
export function makeLeg(k: LegKey, side: 1 | -1, front: boolean, w0: number, w1: number): Leg {
  const [root, joint, c] = [k.root, k.joint, k.paw].map((p) => pt(p.x, p.y * side)) as [Pt, Pt, Pt];
  const ctl = pt(2 * joint.x - (root.x + c.x) / 2, 2 * joint.y - (root.y + c.y) / 2);
  const spine = bezier(root, ctl, c, 12);
  const limb = tube(spine, (u) => w0 + (w1 - w0) * u + 0.8 * Math.sin(Math.PI * Math.min(1, u * 1.6)));
  const end = spine[spine.length - 2]!;
  return { limb, spine, root, c, ang: Math.atan2(c.y - end.y, c.x - end.x), side, front };
}

/**
 * A trunk from its half width at knots along x (front to back), the ends
 * rounded off; `bend` sways it sideways (+y at the ends), `tuft` roughens its edge.
 */
export function trunkShape(knots: readonly (readonly [number, number])[], bend: number, tuft: number): Pt[] {
  const front = knots[0]![0];
  const back = knots[knots.length - 1]![0];
  const half = (x: number): number => {
    for (let i = 1; i < knots.length; i++) {
      const [x1, w1] = knots[i]!;
      const [x0, w0] = knots[i - 1]!;
      if (x >= x1) {
        const t = (x0 - x) / (x0 - x1);
        if (i === knots.length - 1) return w0 * Math.sqrt(Math.max(0, 1 - t * t));
        return w0 + (w1 - w0) * (1 - Math.cos(Math.PI * t)) * 0.5;
      }
    }
    return 0;
  };
  const mid = (front + back) / 2;
  const sway = (x: number): number => bend * ((x - mid) / ((front - back) / 2)) ** 2;
  const n = 34;
  const xs = Array.from({ length: n + 1 }, (_, i) => front + (back - front) * (1 - Math.cos((Math.PI * i) / n)) / 2);
  const top = xs.map((x) => pt(x, sway(x) + half(x)));
  const bot = [...xs].reverse().slice(1, -1).map((x) => pt(x, sway(x) - half(x)));
  const shape = [...top, ...bot];
  return tuft > 0 ? tufted(resample(shape, 1.6), tuft, 3) : shape;
}

/** Resamples a closed outline to about one point per `step`, so tufts space evenly. */
export function resample(shape: readonly Pt[], step: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < shape.length; i++) {
    const a = shape[i]!;
    const b = shape[(i + 1) % shape.length]!;
    const k = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / step));
    for (let j = 0; j < k; j++) out.push(pt(a.x + ((b.x - a.x) * j) / k, a.y + ((b.y - a.y) * j) / k));
  }
  return out;
}

/**
 * A head from above round C: a crown of radius R, cheeks bulging at ±`cheekAt`
 * by `cheek`, and a muzzle running out `snout` in front, narrowing to its tip
 * (`taper` higher is narrower).
 */
export function headShape(C: Pt, R: number, cheek: number, cheekAt: number, snout: number, taper: number, n = 48): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const t = (i / n) * TAU - Math.PI;
    const ang = (a: number): number => Math.atan2(Math.sin(t - a), Math.cos(t - a));
    const ch = Math.exp(-(ang(cheekAt) ** 2) / 0.18) + Math.exp(-(ang(-cheekAt) ** 2) / 0.18);
    const m = Math.max(0, Math.cos(t)) ** taper;
    const r = R * (1 + cheek * ch) + snout * m;
    return pt(C.x + Math.cos(t) * r, C.y + Math.sin(t) * r * (1 - 0.25 * m));
  });
}

/** The coat colours of one animal. */
export interface Pelt {
  readonly base: string;
  readonly deep: string;
  readonly light: string;
  readonly hair: (p: Pt, r: number) => string;
}

/** How one furred part is painted. */
export interface FurPart {
  readonly shape: readonly Pt[];
  readonly dir: (p: Pt) => number;
  /** Markings and modelling brushed in wet, before the hairs. */
  readonly wet?: () => void;
  readonly hair?: (p: Pt, r: number) => string;
  /** Painted over the hairs, before the form is modelled (clumps, guard hairs). */
  readonly over?: () => void;
  readonly n: number;
  readonly len: number;
  readonly seed: number;
  readonly tuft?: number;
  readonly line?: number;
}

/**
 * Fur over a part: paper, the base wash, its markings laid in wet, a coat
 * of short pen hairs lying along it, the form modelled (lit upper left,
 * deep lower right, a few inked hairs in the shadow) and a furry contour.
 */
export function paintFur(d: Draw, pelt: Pelt, f: FurPart): void {
  const { pen } = d;
  const s = f.shape;
  const size = sizeOf(s);
  pen.fill(s, PAPER_FILL, 1);
  pen.fill(s, pelt.base, 0.93);
  pen.clipped(s, () => {
    f.wet?.();
  });
  const coat: Coat = { dir: f.dir, color: f.hair ?? pelt.hair };
  hairs(d, s, coat, f.n, f.seed, f.len, Math.max(0.3, Math.min(0.5, size * 0.01)), 0.75);
  if (f.over) pen.clipped(s, f.over);
  pen.clipped(s, () => {
    const xs = s.map((p) => p.x);
    const ys = s.map((p) => p.y);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    glaze(d, cx - size * 0.12, cy - size * 0.16, size * 0.42, size * 0.3, 0, pelt.light, 0.28);
    pen.crescent(s, pt(-size * 0.06, -size * 0.1), () => pen.fill(s, pelt.deep, 0.32));
    pen.crescent(s, pt(-size * 0.025, -size * 0.04), () => pen.fill(s, pelt.deep, 0.18));
  });
  const ink: Coat = { dir: f.dir, color: () => d.ink };
  pen.crescent(s, pt(-size * 0.07, -size * 0.12), () => hairs(d, s, ink, Math.round(f.n * 0.25), f.seed + 5, f.len * 1.05, 0.26, 0.4));
  furEdge(d, s, f.line ?? 0.8, f.seed + 3, 2, f.tuft ?? 1.4, 0.85);
}

/** One soft shadow under all the parts, `off` down and to the right. */
export function softShadow(d: Draw, parts: readonly (readonly Pt[])[], off: Pt, alpha: number, blur: number): void {
  onLayer(d, (l) => parts.forEach((s) => l.pen.fill(s.map((q) => pt(q.x + off.x, q.y + off.y)), d.ink, 1)), alpha, blur);
}

/** The angle along a spine at the point nearest p, and that point's index. */
export function along(spine: readonly Pt[], p: Pt): { ang: number; i: number } {
  let best = 0;
  let bd = Infinity;
  spine.forEach((s, i) => {
    const dd = (s.x - p.x) ** 2 + (s.y - p.y) ** 2;
    if (dd < bd) [bd, best] = [dd, i];
  });
  const n = spine.length - 1;
  const a = spine[Math.max(0, best - 1)]!;
  const b = spine[Math.min(n, best + 1)]!;
  return { ang: Math.atan2(b.y - a.y, b.x - a.x), i: best };
}

/** Grizzled fur: each hair dark, mid or pale-tipped by chance, `pale` the share of pale tips. */
export function grizzle(deep: string, mid: string, pale: string, warm: string, paleShare = 0.3): (r: number) => string {
  return (r) => (r < 0.16 ? deep : r < 0.16 + paleShare ? pale : r < 0.86 ? mid : warm);
}

/** Fingers or toes fanned from `base` round `ang`, each a slim dark tube with a claw. */
export function fingers(d: Draw, base: Pt, ang: number, spread: number, lens: readonly number[], w: number, skin: string, claw: string): void {
  const { pen } = d;
  const rng = createRng(Math.round(base.x * 31 + base.y * 7));
  lens.forEach((l, i) => {
    const a = ang + (lens.length > 1 ? (i / (lens.length - 1) - 0.5) * spread : 0) + (rng() - 0.5) * 0.08;
    const mid = pt(base.x + Math.cos(a) * l * 0.55, base.y + Math.sin(a) * l * 0.55);
    const tip = pt(base.x + Math.cos(a) * l, base.y + Math.sin(a) * l);
    const f = tube([base, mid, tip], (u) => w * (1 - 0.35 * u));
    pen.fill(f, skin, 1);
    pen.clipped(f, () => pen.fill(f.map((p) => pt(p.x - w * 0.25, p.y - w * 0.35)), mix(skin, PAPER_FILL, 0.3), 0.5));
    pen.stroke(closed(f), 0.35, d.ink, 0.9, false);
    pen.hair([tip, pt(tip.x + Math.cos(a) * w * 0.9, tip.y + Math.sin(a) * w * 0.9)], w * 0.35, claw, 0.95);
  });
}

/**
 * Clumps in a grizzled coat: short strokes of hair, dark and pale by turns,
 * scattered over a shape and lying along its coat, so the fur reads in locks
 * rather than as an even grain.
 */
export function clumps(d: Draw, shape: readonly Pt[], dir: (p: Pt) => number, n: number, seed: number, len: number, dark: string, pale: string, keep: (p: Pt) => number = () => 1): void {
  const rng = createRng(seed);
  const xs = shape.map((p) => p.x);
  const ys = shape.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  for (let i = 0; i < n; i++) {
    const c = pt(x0 + rng() * (x1 - x0), y0 + rng() * (y1 - y0));
    const k = keep(c);
    const isDark = rng() < k;
    const a = dir(c);
    const l = len * (0.6 + rng() * 0.6);
    const u = pt(Math.cos(a), Math.sin(a));
    const v = pt(-u.y, u.x);
    // A lock: a few hairs from a common root, splaying a little to a point.
    for (let j = 0; j < 3; j++) {
      const o = (j - 1) * 0.3;
      const from = pt(c.x + v.x * o, c.y + v.y * o);
      const to = pt(c.x + u.x * l + v.x * o * 0.3, c.y + u.y * l + v.y * o * 0.3);
      d.pen.hair([from, pt((from.x + to.x) / 2 + v.x * 0.2, (from.y + to.y) / 2 + v.y * 0.2), to], 0.3, isDark ? dark : pale, (isDark ? 0.55 : 0.65) * (0.7 + rng() * 0.3));
    }
  }
}
