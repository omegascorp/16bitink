import { bezier, cub, pt, ribbon, TAU } from '../kit';
import type { Pt } from '../pen';
import { ellipseAt } from '../propsKit';
import { bilateralY } from './chameleonParts';

/**
 * The Barn Cat's geometry, seen from above facing +x: a long low tabby body
 * with shoulder blades and haunches, a round head with ears, legs reaching
 * out to cream paws, and a tail curving away behind. Board units, centred
 * on the frame.
 */
export type CatPose = 'prowl0' | 'prowl1' | 'swat' | 'hurt';

export interface CatLeg {
  readonly limb: Pt[];
  readonly root: Pt;
  readonly joint: Pt;
  readonly paw: Pt[];
  readonly c: Pt;
  readonly ang: number;
  /** Claws out (the swatting paw). */
  readonly claws: boolean;
  readonly front: boolean;
}

export interface CatEar {
  readonly shape: Pt[];
  readonly inner: Pt[];
  readonly tip: Pt;
  readonly side: 1 | -1;
}

export interface Cat {
  readonly body: Pt[];
  readonly head: Pt[];
  readonly headC: Pt;
  readonly ears: readonly CatEar[];
  /** Legs, back to front: the swatting leg last. */
  readonly legs: readonly CatLeg[];
  readonly tail: { shape: Pt[]; spine: Pt[] };
  readonly pose: CatPose;
}

/** A tube along a spine, `w(u)` across, with round caps at both ends. */
export function tube(spine: readonly Pt[], w: (u: number) => number): Pt[] {
  const { top, bot } = ribbon(spine, w);
  const n = spine.length - 1;
  const cap = (c: Pt, from: number, r: number): Pt[] =>
    Array.from({ length: 7 }, (_, i) => {
      const t = from + (Math.PI * (i + 1)) / 8;
      return pt(c.x + Math.cos(t) * r, c.y + Math.sin(t) * r);
    });
  const phiEnd = Math.atan2(spine[n]!.y - spine[n - 1]!.y, spine[n]!.x - spine[n - 1]!.x);
  const phiStart = Math.atan2(spine[1]!.y - spine[0]!.y, spine[1]!.x - spine[0]!.x);
  return [...top, ...cap(spine[n]!, phiEnd - Math.PI / 2, w(1) / 2), ...[...bot].reverse(), ...cap(spine[0]!, phiStart + Math.PI / 2, w(0) / 2)];
}

/**
 * A fur edge: the outline pushed out into small soft tufts, `amp` deep,
 * about every `step` units; deep and spiky when the fur stands on end.
 */
export function tufted(shape: readonly Pt[], amp: number, every: number): Pt[] {
  const n = shape.length;
  let cx = 0;
  let cy = 0;
  for (const p of shape) {
    cx += p.x / n;
    cy += p.y / n;
  }
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const p = shape[i]!;
    const r = Math.hypot(p.x - cx, p.y - cy) || 1;
    // A fixed, uneven rhythm so the tufts vary in depth without randomness.
    const vary = 0.55 + 0.9 * ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1;
    const k = (i % every === 0 ? amp : i % every === Math.floor(every / 2) ? -amp * 0.25 : amp * 0.3) * vary;
    out.push(pt(p.x + ((p.x - cx) / r) * k, p.y + ((p.y - cy) / r) * k));
  }
  return out;
}

/** Resamples a closed outline to about one point per `step` units, so tufts space evenly. */
function resample(shape: readonly Pt[], step: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < shape.length; i++) {
    const a = shape[i]!;
    const b = shape[(i + 1) % shape.length]!;
    const k = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / step));
    for (let j = 0; j < k; j++) out.push(pt(a.x + ((b.x - a.x) * j) / k, a.y + ((b.y - a.y) * j) / k));
  }
  return out;
}

/** The trunk: haunches behind, a slight waist, shoulder blades, the neck. */
function bodyShape(scale: number): Pt[] {
  const half = [
    ...cub(pt(-34, 0), pt(-33.6, 5), pt(-30, 10.6), pt(-22, 12.2), 8),
    ...cub(pt(-22, 12.2), pt(-16, 13), pt(-11, 14.4), pt(-4, 14.2), 6).slice(1),
    ...cub(pt(-4, 14.2), pt(4, 14), pt(11, 12.6), pt(16, 11.4), 6).slice(1),
    ...cub(pt(16, 11.4), pt(21, 10), pt(25, 6), pt(26.5, 0), 6).slice(1),
  ];
  return bilateralY(half).map((p) => pt(p.x * scale, p.y * scale));
}

/** Where a leg roots under the body, where its elbow or knee juts out, and where its paw rests, per pose. */
type LegKey = 'fwd' | 'back' | 'splay';
const FORE: Readonly<Record<LegKey, readonly [Pt, Pt, Pt]>> = {
  fwd: [pt(15, 6), pt(14, 16.5), pt(31.5, 13.5)],
  back: [pt(14, 6), pt(8, 16.5), pt(21, 16)],
  splay: [pt(14, 6), pt(17, 20), pt(27, 27)],
};
const HIND: Readonly<Record<LegKey, readonly [Pt, Pt, Pt]>> = {
  fwd: [pt(-19, 6), pt(-8, 15.5), pt(-12, 19)],
  back: [pt(-21, 6), pt(-15, 16.5), pt(-30, 16)],
  splay: [pt(-20, 6), pt(-23, 20), pt(-31, 27)],
};

/** A leg bending smoothly from its root through the joint to the paw, `w` across at the root. */
function leg(spec: readonly [Pt, Pt, Pt], side: number, front: boolean, claws: boolean, w: number): CatLeg {
  const [root, joint, c] = spec.map((p) => pt(p.x, p.y * side)) as [Pt, Pt, Pt];
  const ctl = pt(2 * joint.x - (root.x + c.x) / 2, 2 * joint.y - (root.y + c.y) / 2);
  const spine = bezier(root, ctl, c, 14);
  const limb = tube(spine, (u) => w * (1 - 0.42 * u) + 1.2 * Math.sin(Math.PI * Math.min(1, u * 1.6)));
  const end = spine[spine.length - 2]!;
  const ang = Math.atan2(c.y - end.y, c.x - end.x);
  const paw = ellipseAt(c.x + Math.cos(ang) * 1.2, c.y + Math.sin(ang) * 1.2, claws ? 4.8 : 4, claws ? 4.2 : 3, ang, 20);
  return { limb, root, joint, paw, c, ang, claws, front };
}

/** An ear: a rounded triangle from its base on the head to the tip, with the pale inside showing along its front edge. */
function ear(side: 1 | -1, back: boolean, fluff: number): CatEar {
  const s = (p: Pt): Pt => pt(p.x, p.y * side);
  const [b0, b1, tip] = back ? [pt(23.5, 4), pt(30.5, 8.6), pt(17.5, 17)] : [pt(24.5, 5), pt(32.6, 8.4), pt(28.6, 19.6 + fluff)];
  const mid = pt((b0.x + b1.x) / 2, (b0.y + b1.y) / 2);
  const shape = [b0, ...cub(b0, pt(b0.x - 0.6, b0.y + 5), pt(tip.x - 1.6, tip.y - 2), tip, 6).slice(1), ...cub(tip, pt(tip.x + 1.4, tip.y - 1.6), pt(b1.x + 1, b1.y + 2.6), b1, 6).slice(1)].map(s);
  // The pale inside shows as a sliver along the front edge, from near the base to near the tip.
  const along = (t: number, k: number): Pt => {
    const p = pt(b1.x + (tip.x - b1.x) * t, b1.y + (tip.y - b1.y) * t);
    return pt(p.x + (mid.x - p.x) * k, p.y + (mid.y - p.y) * k);
  };
  const ts = [0.2, 0.4, 0.6, 0.8, 0.93];
  const inner = [...ts.map((t) => along(t, 0.08)), ...[...ts].reverse().map((t) => along(t, 0.08 + 0.55 * (1 - t)))].map(s);
  return { shape, inner, tip: s(tip), side };
}

/** The tail's spine per pose: an S-curve behind that swishes from side to side, lashing when it swats. */
function tailSpine(pose: CatPose): Pt[] {
  const k = pose === 'prowl1' ? -1 : 1;
  if (pose === 'hurt') return cub(pt(-30, 0), pt(-44, -2), pt(-54, -12), pt(-64, -8), 18);
  if (pose === 'swat') return cub(pt(-30, 0), pt(-46, 2), pt(-48, 22), pt(-63, 20), 18);
  return cub(pt(-30, 0), pt(-44, 0), pt(-48, 18 * k), pt(-64, 11 * k), 18);
}

/** The cat's whole geometry for a pose. */
export function cat(pose: CatPose): Cat {
  const hurt = pose === 'hurt';
  const swat = pose === 'swat';
  const a = pose !== 'prowl1';
  const pick = (fwd: boolean): LegKey => (hurt ? 'splay' : fwd ? 'fwd' : 'back');
  const legs: CatLeg[] = [
    leg(HIND[pick(!a)], 1, false, false, 9.5),
    leg(HIND[pick(a)], -1, false, false, 9.5),
    leg(FORE[pick(a)], 1, true, false, 8),
    swat ? leg([pt(15, 6), pt(27, 16.5), pt(51, 15)], -1, true, true, 8.6) : leg(FORE[pick(!a)], -1, true, false, 8),
  ];
  const fluff = hurt ? 1 : 0;
  const scale = 1 + fluff * 0.1;
  const body = tufted(resample(bodyShape(scale), 2.2), hurt ? 2.6 : 0.6, 3);
  const headC = pt(32, 0);
  const headOval = Array.from({ length: 40 }, (_, i) => {
    const t = (i / 40) * TAU;
    // Broad cheeks, a little narrower at the brow, the muzzle rounding out in front.
    const r = 12.6 * scale * (1 + 0.08 * Math.cos(2 * t) + 0.05 * Math.max(0, Math.cos(t)) ** 3);
    return pt(headC.x + Math.cos(t) * r * 0.98, Math.sin(t) * r);
  });
  const head = tufted(resample(headOval, 2), hurt ? 2.2 : 0.5, hurt ? 3 : 5);
  const ears = ([1, -1] as const).map((side) => ear(side, swat, fluff));
  const spine = tailSpine(pose);
  const w = (u: number): number => (hurt ? 13 - 3 * u : 8 - 2.2 * u);
  const tail = { shape: hurt ? tufted(resample(tube(spine, w), 2), 2.2, 3) : tube(spine, w), spine };
  return { body, head, headC, ears, legs, tail, pose };
}
