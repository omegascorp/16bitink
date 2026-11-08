import { bezier, cub, pt, ribbon, TAU } from '../kit';
import type { Pt } from '../pen';
import type { CritterPose } from './poses';
import { bilateralY, ellipseAt } from './tomcatKit';

/**
 * The Old Tomcat's geometry, seen from above facing +x: a heavy, broad
 * trunk with shoulder blades and haunches, a big jowly head with one torn
 * ear, legs reaching out to white paws, and a thick tail with a kink near
 * its tip. Cat units (the drawing scales them up), centred near the trunk.
 */
export type TomPose = CritterPose<'tomcat'>;

/** How the eyes look: hunting (slits), focused (pupils opening), wide, shocked, or squeezed shut. */
export type EyeLook = 'hunt' | 'focus' | 'wide' | 'shock' | 'squeeze';
type EarKind = 'up' | 'fwd' | 'back' | 'flat';

export interface TomLeg {
  readonly limb: Pt[];
  readonly root: Pt;
  readonly joint: Pt;
  readonly paw: Pt[];
  readonly c: Pt;
  readonly ang: number;
  /** Claws out (the pounce). */
  readonly claws: boolean;
  /** The sole turned up, its pads showing (hind feet trailing in the leap). */
  readonly pads: boolean;
  readonly front: boolean;
}

export interface TomEar {
  readonly shape: Pt[];
  readonly inner: Pt[];
  readonly tip: Pt;
  readonly side: 1 | -1;
  /** The bitten notch in a torn ear's outer edge. */
  readonly notch: Pt | null;
}

export interface Tom {
  readonly pose: TomPose;
  readonly body: Pt[];
  /** The trunk's length and width factors (its stripes and markings follow them). */
  readonly sx: number;
  readonly sy: number;
  readonly head: Pt[];
  readonly headC: Pt;
  /** The head's turn about its centre, radians (a dazed head lolls). */
  readonly tilt: number;
  readonly ears: readonly TomEar[];
  /** Legs: hind +y, hind -y, fore +y, fore -y. */
  readonly legs: readonly TomLeg[];
  readonly tail: { readonly shape: Pt[]; readonly spine: Pt[]; readonly kinkAt: number };
  /** 0..1: how far the fur stands on end. */
  readonly puff: number;
  readonly eyes: EyeLook;
  /** Moves the whole drawing in the frame (cat units). */
  readonly shift: Pt;
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
 * about every `every` points; deep and spiky when the fur stands on end.
 */
export function tufted(shape: readonly Pt[], amp: number, every: number): Pt[] {
  const n = shape.length;
  let cx = 0;
  let cy = 0;
  for (const p of shape) {
    cx += p.x / n;
    cy += p.y / n;
  }
  return shape.map((p, i) => {
    const r = Math.hypot(p.x - cx, p.y - cy) || 1;
    // A fixed, uneven rhythm so the tufts vary in depth without randomness.
    const vary = 0.55 + 0.9 * ((((Math.sin(i * 12.9898) * 43758.5453) % 1) + 1) % 1);
    const k = (i % every === 0 ? amp : i % every === Math.floor(every / 2) ? -amp * 0.25 : amp * 0.3) * vary;
    return pt(p.x + ((p.x - cx) / r) * k, p.y + ((p.y - cy) / r) * k);
  });
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

const smoothstep = (t: number): number => {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
};

/** The trunk: broad haunches behind, a heavy middle, big shoulders, the neck. `hb` spreads the haunches (gathered or sitting). */
function trunk(sx: number, sy: number, hb: number): Pt[] {
  const half = [
    ...cub(pt(-35, 0), pt(-34.6, 6), pt(-31, 12.2), pt(-22, 13.8), 8),
    ...cub(pt(-22, 13.8), pt(-15, 14.6), pt(-10, 15.8), pt(-3, 15.6), 6).slice(1),
    ...cub(pt(-3, 15.6), pt(5, 15.4), pt(11, 14.2), pt(16, 12.8), 6).slice(1),
    ...cub(pt(16, 12.8), pt(21, 11.4), pt(25, 7), pt(26.5, 0), 6).slice(1),
  ];
  const haunch = (x: number): number => 1 + (hb - 1) * smoothstep((-6 - x) / 18);
  return bilateralY(half).map((p) => pt(p.x * sx, p.y * sy * haunch(p.x)));
}

/** A broad tom's head: wide jowls at the front corners, a little flat across the brow, the muzzle rounding out in front. */
function headShape(C: Pt, R: number): Pt[] {
  const jowl = (t: number): number => [1.15, -1.15].reduce((s, a) => s + Math.exp(-(Math.atan2(Math.sin(t - a), Math.cos(t - a)) ** 2) / 0.16), 0);
  return Array.from({ length: 44 }, (_, i) => {
    const t = (i / 44) * TAU;
    const r = R * (1 + 0.02 * Math.cos(2 * t) + 0.05 * Math.max(0, Math.cos(t)) ** 3 + 0.13 * jowl(t));
    return pt(C.x + Math.cos(t) * r * 0.95, C.y + Math.sin(t) * r * 1.03);
  });
}

/** The head's outline with soft tufts: a ruff of longer fur at the jowls, barely any over the crown. */
function ruffed(shape: readonly Pt[], C: Pt, fluff: number): Pt[] {
  return shape.map((p, i) => {
    const a = Math.atan2(p.y - C.y, p.x - C.x);
    const cheek = Math.exp(-(((Math.abs(a) - 1.75) / 0.55) ** 2));
    const vary = 0.55 + 0.9 * ((((Math.sin(i * 12.9898) * 43758.5453) % 1) + 1) % 1);
    const k = (i % 3 === 0 ? 1 : i % 3 === 1 ? -0.25 : 0.3) * vary * (fluff + 1.3 * cheek);
    const r = Math.hypot(p.x - C.x, p.y - C.y) || 1;
    return pt(p.x + ((p.x - C.x) / r) * k, p.y + ((p.y - C.y) / r) * k);
  });
}

/** A leg's keys on the +y side: where it roots under the trunk, where its elbow or hock juts out, where its paw rests. */
interface LegKey {
  readonly root: Pt;
  readonly joint: Pt;
  readonly paw: Pt;
  readonly claws?: boolean;
  readonly pads?: boolean;
}
const L = (root: Pt, joint: Pt, paw: Pt, o: { claws?: boolean; pads?: boolean } = {}): LegKey => ({ root, joint, paw, ...o });

const FORE = { fwd: L(pt(15, 6.5), pt(14, 17.5), pt(32, 14.5)), back: L(pt(14, 6.5), pt(8, 17.5), pt(21, 17)) };
const HIND = { fwd: L(pt(-19, 6.5), pt(-8, 16.5), pt(-12, 20)), back: L(pt(-21, 6.5), pt(-15, 17.5), pt(-30, 17)) };

/** A leg bending smoothly from its root through the joint to the paw, `w` across at the root. */
function leg(k: LegKey, side: number, front: boolean, w: number): TomLeg {
  const [root, joint, c] = [k.root, k.joint, k.paw].map((p) => pt(p.x, p.y * side)) as [Pt, Pt, Pt];
  const ctl = pt(2 * joint.x - (root.x + c.x) / 2, 2 * joint.y - (root.y + c.y) / 2);
  const spine = bezier(root, ctl, c, 14);
  const limb = tube(spine, (u) => w * (1 - 0.42 * u) + 1.3 * Math.sin(Math.PI * Math.min(1, u * 1.6)));
  const end = spine[spine.length - 2]!;
  const ang = Math.atan2(c.y - end.y, c.x - end.x);
  const claws = k.claws ?? false;
  const paw = ellipseAt(c.x + Math.cos(ang) * 1.2, c.y + Math.sin(ang) * 1.2, claws ? 4.8 : 4.1, claws ? 4.2 : 3.1, ang, 20);
  return { limb, root, joint, paw, c, ang, claws, pads: k.pads ?? false, front };
}

/** Each ear's base corners and tip, from the head's centre, on the +y side. */
const EAR: Readonly<Record<EarKind, readonly [Pt, Pt, Pt]>> = {
  up: [pt(-9.6, 8.4), pt(1.2, 11.6), pt(-4.6, 22.6)],
  fwd: [pt(-9, 8.4), pt(1.8, 11.2), pt(0.6, 22.2)],
  back: [pt(-10.4, 7.4), pt(-1.2, 11.8), pt(-16.5, 19.6)],
  flat: [pt(-11, 8.4), pt(-1.8, 12.6), pt(-14.5, 23)],
};

/** An ear: a rounded triangle from its base to the tip, the pale inside along its front edge; a torn one has a notch bitten from its outer edge. */
function ear(side: 1 | -1, kind: EarKind, C: Pt, R: number, torn: boolean): TomEar {
  const k = R / 13.2;
  const [b0, b1, tip] = EAR[kind].map((p) => pt(C.x + p.x * k, p.y * k)) as [Pt, Pt, Pt];
  let outer = cub(b0, pt(b0.x - 1.4, b0.y + 6), pt(tip.x - 3, tip.y - 1.2), tip, 10);
  let notch: Pt | null = null;
  if (torn) {
    // A V bitten out of the outer edge, a little ragged.
    const g = pt((b0.x + b1.x + tip.x) / 3, (b0.y + b1.y + tip.y) / 3);
    const m = pt((outer[5]!.x + outer[8]!.x) / 2, (outer[5]!.y + outer[8]!.y) / 2);
    const l = Math.hypot(g.x - m.x, g.y - m.y) || 1;
    notch = pt(m.x + ((g.x - m.x) / l) * 3.6, m.y + ((g.y - m.y) / l) * 3.6);
    const rag = pt((outer[5]!.x + notch.x) / 2 + 0.5, (outer[5]!.y + notch.y) / 2 + 0.3);
    outer = [...outer.slice(0, 6), rag, notch, ...outer.slice(8)];
  }
  const front = cub(tip, pt(tip.x + 2.2, tip.y - 0.6), pt(b1.x + 1.6, b1.y + 3.4), b1, 7).slice(1);
  const s = (p: Pt): Pt => pt(p.x, C.y + p.y * side);
  const mid = pt((b0.x + b1.x) / 2, (b0.y + b1.y) / 2);
  const along = (t: number, k: number): Pt => {
    const p = pt(b1.x + (tip.x - b1.x) * t, b1.y + (tip.y - b1.y) * t);
    return pt(p.x + (mid.x - p.x) * k, p.y + (mid.y - p.y) * k);
  };
  const ts = [0.2, 0.4, 0.6, 0.8, 0.93];
  const inner = [...ts.map((t) => along(t, 0.08)), ...[...ts].reverse().map((t) => along(t, 0.08 + 0.55 * (1 - t)))].map(s);
  return { shape: [...outer, ...front].map(s), inner, tip: s(tip), side, notch: notch ? s(notch) : null };
}

/** The tail's spine with its old kink: the last few units bent sharply by `bend`, then easing straight. */
function kinked(spine: readonly Pt[], bend: number, len: number): Pt[] {
  const n = spine.length - 1;
  const e = spine[n]!;
  const p = spine[n - 1]!;
  const a0 = Math.atan2(e.y - p.y, e.x - p.x);
  const out = [...spine];
  let q = e;
  for (let i = 1; i <= 5; i++) {
    const a = a0 + bend * (1 - (0.2 * (i - 1)) / 4);
    q = pt(q.x + (Math.cos(a) * len) / 5, q.y + (Math.sin(a) * len) / 5);
    out.push(q);
  }
  return out;
}

interface Spec {
  readonly trunk: readonly [number, number, number];
  readonly puff: number;
  readonly head: Pt;
  readonly R: number;
  readonly tilt: number;
  /** The torn (-y) ear's set, then the other's. */
  readonly ears: readonly [EarKind, EarKind];
  readonly eyes: EyeLook;
  readonly legs: readonly [LegKey, LegKey, LegKey, LegKey];
  readonly tail: readonly Pt[];
  readonly tailW: number;
  readonly kink: number;
  readonly shift: Pt;
}

function walk(k: 1 | -1): Spec {
  const a = k === 1;
  return {
    trunk: [1, 1, 1], puff: 0, head: pt(33, 0), R: 14, tilt: 0, ears: ['up', 'up'], eyes: 'hunt',
    legs: [a ? HIND.back : HIND.fwd, a ? HIND.fwd : HIND.back, a ? FORE.fwd : FORE.back, a ? FORE.back : FORE.fwd],
    tail: cub(pt(-31, 0), pt(-43, 0), pt(-47, 15 * k), pt(-52, 21 * k), 16), tailW: 11, kink: 0.75 * k, shift: pt(-1.5, 0),
  };
}

const SPECS: Readonly<Record<TomPose, (f: number) => Spec>> = {
  walk0: () => walk(1),
  walk1: () => walk(-1),
  crouch: (f) => ({
    trunk: [0.93, 1.08, 1.22], puff: 0, head: pt(31, 0), R: 14, tilt: 0, ears: ['fwd', 'fwd'], eyes: 'focus',
    legs: [L(pt(-19, 6.5), pt(-28, 16.5), pt(-13, 19.5)), L(pt(-19, 6.5), pt(-28, 16.5), pt(-13, 19.5)), L(pt(15, 6), pt(21, 15.5), pt(42, 8.6)), L(pt(15, 6), pt(21, 15), pt(41, 8))],
    // The tip of the tail flicks from side to side with each boil frame: the tell before the pounce.
    tail: cub(pt(-31, 0), pt(-42, 1), pt(-48, 3), pt(-54, 2), 16), tailW: 11, kink: [-1.25, -0.45, -1.75][f] ?? -1.25, shift: pt(-2, 0),
  }),
  leap: () => ({
    trunk: [1.16, 0.9, 0.95], puff: 0.1, head: pt(38, 0), R: 13.4, tilt: 0, ears: ['back', 'back'], eyes: 'wide',
    legs: [L(pt(-24, 6), pt(-37, 12.5), pt(-52, 10.5), { pads: true }), L(pt(-24, 6), pt(-36, 13.5), pt(-51, 12.5), { pads: true }), L(pt(17, 6), pt(33, 13), pt(57, 10), { claws: true }), L(pt(17, 6), pt(32, 12.5), pt(55, 8.5), { claws: true })],
    tail: cub(pt(-37, 0), pt(-47, -2), pt(-51, -12), pt(-53, -21), 16), tailW: 10.5, kink: 0.55, shift: pt(-2.5, 0),
  }),
  dazed: () => ({
    trunk: [0.76, 1.06, 1.3], puff: 0.2, head: pt(26.5, -1), R: 14, tilt: 0.42, ears: ['back', 'up'], eyes: 'squeeze',
    // Plonked down off balance: forelegs splayed out in front, hind feet poking out by the haunches, the tail limp behind.
    legs: [L(pt(-14, 8), pt(-15, 21), pt(-3, 23.5)), L(pt(-14, 8), pt(-16, 20), pt(-5, 22.5)), L(pt(13, 6), pt(22, 14.5), pt(32, 21)), L(pt(13, 6), pt(24, 11.5), pt(35, 14.5))],
    tail: cub(pt(-25, 2), pt(-36, 6), pt(-44, 15), pt(-50, 24), 16), tailW: 11, kink: -0.8, shift: pt(-2, -2),
  }),
  startle: () => ({
    trunk: [0.86, 1.12, 1.05], puff: 1, head: pt(29, 0), R: 14.4, tilt: 0, ears: ['flat', 'flat'], eyes: 'shock',
    legs: [L(pt(-18, 6.5), pt(-22, 21), pt(-30, 28)), L(pt(-18, 6.5), pt(-23, 21), pt(-31, 27)), L(pt(12, 6.5), pt(16, 21), pt(25, 28)), L(pt(12, 6.5), pt(17, 21), pt(26, 27))],
    tail: cub(pt(-26, 0), pt(-42, 1), pt(-52, -12), pt(-49, -26), 16), tailW: 17, kink: 0.45, shift: pt(-1, 1),
  }),
};

/** The tomcat's whole geometry for a pose (`f` the boil frame: the crouching tail tip flicks with it). */
export function tom(pose: TomPose, f: number): Tom {
  const s = SPECS[pose](f);
  const [sx, sy, hb] = s.trunk;
  const fluff = s.puff;
  const body = tufted(resample(trunk(sx, sy, hb), fluff > 0.5 ? 1.4 : 2.2), 0.6 + fluff * 0.9, 3);
  const C = s.head;
  const head = ruffed(resample(headShape(C, s.R * (1 + fluff * 0.06)), 1.6), C, 0.3 + fluff * 1);
  const ears = [ear(-1, s.ears[0], C, s.R, true), ear(1, s.ears[1], C, s.R, false)];
  const legs = s.legs.map((k, i) => leg(k, i % 2 === 0 ? 1 : -1, i >= 2, i >= 2 ? 9 : 10.5));
  const base = s.tail;
  const spine = kinked(base, s.kink, 10);
  const kinkAt = (base.length - 1) / (spine.length - 1);
  // Thick at the root, a knot at the old break, rounding to the tip.
  const w = (u: number): number => s.tailW * (1 - 0.3 * u) + 1.4 * Math.exp(-(((u - kinkAt) / 0.05) ** 2));
  const shape = fluff > 0.5 ? tufted(resample(tube(spine, w), 1.5), 1.8, 3) : tube(spine, w);
  return { pose, body, sx, sy, head, headC: C, tilt: s.tilt, ears, legs, tail: { shape, spine, kinkAt }, puff: fluff, eyes: s.eyes, shift: s.shift };
}
