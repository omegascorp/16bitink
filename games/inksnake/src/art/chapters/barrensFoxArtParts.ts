import { bezier, cub, pt } from '../kit';
import type { Pt } from '../pen';
import { bilateralY, ellipseAt } from '../critters/tomcatKit';
import { tube, tufted } from '../critters/tomcatParts';

/**
 * The Red Fox's geometry, seen from above facing +x: a slim, long trunk,
 * a wedge of a head running out to a narrow muzzle, big pointed ears,
 * thin black-stockinged legs and a long brush of a tail. Board px, centred
 * near the trunk (the drawing shifts it to fit the frame).
 */
export type FoxPose = 'walk0' | 'walk1' | 'crouch' | 'leap' | 'sniff' | 'startle';
export const FOX_POSES: readonly FoxPose[] = ['walk0', 'walk1', 'crouch', 'leap', 'sniff', 'startle'];

/** How the eyes look: keen (narrowed hunter's), fixed (locked on), wide (a fright), soft (curious). */
export type FoxEyes = 'keen' | 'fixed' | 'wide' | 'soft';
type EarKind = 'up' | 'fwd' | 'back' | 'cocked';

export interface FoxLeg {
  readonly limb: Pt[];
  readonly root: Pt;
  readonly joint: Pt;
  readonly paw: Pt[];
  readonly c: Pt;
  readonly ang: number;
  readonly front: boolean;
  /** Folded up under the chest (the pounce): only the paw shows. */
  readonly tucked: boolean;
}

export interface FoxEar {
  readonly shape: Pt[];
  /** The pale fur along the ear's front edge, seen past its black back. */
  readonly rim: Pt[];
  /** The outer and front edges (the base rises out of the crown's fur, unlined). */
  readonly edge: Pt[];
  readonly base: Pt;
  readonly tip: Pt;
  readonly side: 1 | -1;
}

export interface Fox {
  readonly pose: FoxPose;
  readonly body: Pt[];
  readonly sx: number;
  readonly sy: number;
  readonly head: Pt[];
  readonly headC: Pt;
  /** Muzzle length from the head's centre to the nose tip (shorter when the nose dips to the ground). */
  readonly snout: number;
  readonly ears: readonly FoxEar[];
  /** Legs: hind +y, hind -y, fore +y, fore -y. */
  readonly legs: readonly FoxLeg[];
  readonly tail: { readonly shape: Pt[]; readonly spine: Pt[]; readonly w: number; readonly raised: boolean };
  /** 0..1: how far the fur stands on end. */
  readonly puff: number;
  readonly eyes: FoxEyes;
  readonly shift: Pt;
}

/** Resamples a closed outline to about one point per `step` px, so tufts space evenly. */
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

const smoothstep = (t: number): number => {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
};

/** The trunk: neat haunches, a slim waist, a deep chest, the neck running into the head. `hb` widens the haunches. */
function trunk(sx: number, sy: number, hb: number): Pt[] {
  const half = [
    ...cub(pt(-37, 0), pt(-36.6, 6), pt(-33, 10), pt(-26, 10.8), 8),
    ...cub(pt(-26, 10.8), pt(-19, 11.4), pt(-15, 8.2), pt(-9, 8.2), 6).slice(1),
    ...cub(pt(-9, 8.2), pt(-2, 8.2), pt(4, 10.9), pt(11, 10.4), 6).slice(1),
    ...cub(pt(12, 10), pt(18, 9.4), pt(22, 7), pt(25, 5.6), 5).slice(1),
    ...cub(pt(25, 5.6), pt(27, 4.6), pt(29, 3), pt(29, 0), 4).slice(1),
  ];
  const haunch = (x: number): number => 1 + (hb - 1) * smoothstep((-8 - x) / 18);
  return bilateralY(half).map((p) => pt(p.x * sx, p.y * sy * haunch(p.x)));
}

/** A fox's head from above: broad behind the ears, white cheek ruffs flaring at the sides, a long slim wedge of muzzle. */
function headShape(C: Pt, snout: number, ruff: number): Pt[] {
  const k = snout / 20;
  const half = [
    ...cub(pt(C.x - 9.4, 0), pt(C.x - 9.4, 4.8), pt(C.x - 6.6, 8.6), pt(C.x - 1.8, 10.4 + ruff * 0.4), 6),
    ...cub(pt(C.x - 1.8, 10.4 + ruff * 0.4), pt(C.x + 1.8, 11.8 + ruff), pt(C.x + 4.6, 10 + ruff * 0.6), pt(C.x + 6.4, 7.4), 5).slice(1),
    ...cub(pt(C.x + 6, 7.2), pt(C.x + 8 * k + 1, 5.2), pt(C.x + 12 * k + 1, 3.6), pt(C.x + 16.5 * k, 2.6), 6).slice(1),
    ...cub(pt(C.x + 16.5 * k, 2.6), pt(C.x + 19 * k, 2.1), pt(C.x + snout + 0.2, 1.3), pt(C.x + snout, 0), 4).slice(1),
  ];
  return bilateralY(half).map((p) => pt(p.x, C.y + p.y));
}

/** The cheeks' outline pushed out into soft tufts (the white ruff), the crown and muzzle kept sleek. */
function ruffed(shape: readonly Pt[], C: Pt, fluff: number): Pt[] {
  return shape.map((p, i) => {
    const dx = p.x - C.x;
    const cheek = Math.exp(-(((dx - 1.5) / 4.2) ** 2)) * Math.min(1, Math.abs(p.y - C.y) / 6);
    const vary = 0.55 + 0.9 * ((((Math.sin(i * 12.9898) * 43758.5453) % 1) + 1) % 1);
    const kk = (i % 3 === 0 ? 1 : i % 3 === 1 ? -0.3 : 0.35) * vary * (0.2 + fluff * 0.9 + 0.75 * cheek);
    const r = Math.hypot(p.x - C.x, p.y - C.y) || 1;
    return pt(p.x + ((p.x - C.x) / r) * kk, p.y + ((p.y - C.y) / r) * kk);
  });
}

interface LegKey {
  readonly root: Pt;
  readonly joint: Pt;
  readonly paw: Pt;
  readonly tucked?: boolean;
}
const L = (root: Pt, joint: Pt, paw: Pt, tucked = false): LegKey => ({ root, joint, paw, tucked });

const FORE = { fwd: L(pt(16, 5), pt(24, 10), pt(31.5, 13.4)), back: L(pt(15, 5), pt(10, 11), pt(4, 14)) };
const HIND = { fwd: L(pt(-24, 6), pt(-18.5, 12), pt(-12, 14.4)), back: L(pt(-27, 6), pt(-35, 12), pt(-43, 13.2)) };

/** A slim leg bending from its root through the joint to the paw. */
function leg(k: LegKey, side: number, front: boolean, w: number): FoxLeg {
  const [root, joint, c] = [k.root, k.joint, k.paw].map((p) => pt(p.x, p.y * side)) as [Pt, Pt, Pt];
  const ctl = pt(2 * joint.x - (root.x + c.x) / 2, 2 * joint.y - (root.y + c.y) / 2);
  const spine = bezier(root, ctl, c, 14);
  const limb = tube(spine, (u) => w * (1 - 0.55 * u) + 0.5 * Math.sin(Math.PI * Math.min(1, u * 1.8)));
  const end = spine[spine.length - 2]!;
  const ang = Math.atan2(c.y - end.y, c.x - end.x);
  const paw = ellipseAt(c.x + Math.cos(ang) * 1, c.y + Math.sin(ang) * 1, 3, 2.1, ang, 18);
  return { limb, root, joint, paw, c, ang, front, tucked: k.tucked ?? false };
}

/** Each ear's base corners (back, front) and tip, from the head's centre, on the +y side. */
const EAR: Readonly<Record<EarKind, readonly [Pt, Pt, Pt]>> = {
  up: [pt(-7.2, 2.4), pt(-1.4, 6.8), pt(-9.6, 16)],
  fwd: [pt(-6.6, 2.6), pt(-0.4, 6.6), pt(1.8, 16.2)],
  cocked: [pt(-7, 2.6), pt(-0.8, 6.8), pt(-3.6, 16.6)],
  back: [pt(-8, 2.2), pt(-3, 6.4), pt(-18, 9.6)],
};

/** A big pointed ear: its outer edge bowed out, its front edge straighter, the pale rim along the front. */
function ear(side: 1 | -1, kind: EarKind, C: Pt, scale: number): FoxEar {
  const [b0, b1, tip] = EAR[kind].map((p) => pt(C.x + p.x * scale, p.y * scale)) as [Pt, Pt, Pt];
  const outer = cub(b0, pt(b0.x - 2.6, b0.y + 5), pt(tip.x - 1.2, tip.y - 3.6), tip, 10);
  const front = cub(tip, pt(tip.x + 1.6, tip.y - 2.8), pt(b1.x + 1.2, b1.y + 4.2), b1, 8).slice(1);
  const back = bezier(b1, pt((b0.x + b1.x) / 2 - 1.4, (b0.y + b1.y) / 2 - 1.4), b0, 4).slice(1, -1);
  const s = (p: Pt): Pt => pt(p.x, C.y + p.y * side);
  const rimIn = front.map((p, i) => {
    const t = i / (front.length - 1);
    const m = pt((b0.x + b1.x + tip.x) / 3, (b0.y + b1.y + tip.y) / 3);
    const k = 0.18 + 0.12 * Math.sin(Math.PI * t);
    return pt(p.x + (m.x - p.x) * k, p.y + (m.y - p.y) * k);
  });
  const rim = [tip, ...front, ...[...rimIn].reverse()].map(s);
  return { shape: [...outer, ...front, ...back].map(s), rim, edge: [...outer, ...front].map(s), base: s(pt((b0.x + b1.x) / 2, (b0.y + b1.y) / 2)), tip: s(tip), side };
}

interface Spec {
  readonly trunk: readonly [number, number, number];
  readonly puff: number;
  readonly head: Pt;
  readonly snout: number;
  readonly ears: readonly [EarKind, EarKind];
  readonly earScale: number;
  readonly eyes: FoxEyes;
  readonly legs: readonly [LegKey, LegKey, LegKey, LegKey];
  readonly tail: readonly Pt[];
  readonly tailW: number;
  readonly raised?: boolean;
  readonly shift: Pt;
}

function walk(k: 1 | -1): Spec {
  const a = k === 1;
  return {
    trunk: [1, 1, 1], puff: 0, head: pt(36, 0), snout: 20, ears: ['up', 'up'], earScale: 1.15, eyes: 'keen',
    legs: [a ? HIND.back : HIND.fwd, a ? HIND.fwd : HIND.back, a ? FORE.fwd : FORE.back, a ? FORE.back : FORE.fwd],
    // Streaming out level behind, swaying a little to the trot.
    tail: cub(pt(-33, 0), pt(-48, -1.5 * k), pt(-64, 6 * k), pt(-86, 3 * k), 18), tailW: 21, shift: pt(2, 0),
  };
}

const SPECS: Readonly<Record<FoxPose, Spec>> = {
  walk0: walk(1),
  walk1: walk(-1),
  crouch: {
    trunk: [0.9, 1.1, 1.16], puff: 0, head: pt(33.5, 0), snout: 19.5, ears: ['fwd', 'fwd'], earScale: 1.2, eyes: 'fixed',
    // Low and gathered: hind feet drawn up under the haunches, forepaws together in front, ready to spring.
    legs: [L(pt(-24, 5), pt(-29, 12.4), pt(-19, 13.6)), L(pt(-24, 5), pt(-29, 12.6), pt(-19.5, 13.4)), L(pt(16, 5), pt(22, 9.6), pt(30, 12)), L(pt(16, 5), pt(22, 9.4), pt(30.5, 11.6))],
    tail: cub(pt(-31, 0), pt(-46, 0.6), pt(-64, 1.5), pt(-84, 0.6), 18), tailW: 20, shift: pt(3, 0),
  },
  leap: {
    trunk: [1.12, 0.92, 0.9], puff: 0.1, head: pt(40, 0), snout: 15, ears: ['fwd', 'fwd'], earScale: 1.12, eyes: 'fixed',
    // The mouser's dive: stretched, forepaws folded to the chest, hind legs trailing straight back, the brush a rudder.
    legs: [L(pt(-32, 5), pt(-43, 10), pt(-53, 11.4)), L(pt(-32, 5), pt(-43, 10.4), pt(-52, 12)), L(pt(17, 4.5), pt(25, 9.2), pt(27.5, 7.4), true), L(pt(17, 4.5), pt(25, 9.2), pt(28, 7.2), true)],
    tail: cub(pt(-37, 0), pt(-52, 0), pt(-68, -0.5), pt(-88, 0), 18), tailW: 18, shift: pt(1, 0),
  },
  sniff: {
    trunk: [0.96, 1, 1.05], puff: 0, head: pt(34, 0), snout: 13.5, ears: ['fwd', 'cocked'], earScale: 1.18, eyes: 'soft',
    legs: [L(pt(-26, 5), pt(-28, 12), pt(-22, 13.6)), L(pt(-26, 5), pt(-28.5, 12), pt(-21, 13.8)), L(pt(15, 5), pt(20, 11.6), pt(27, 11.8)), L(pt(15, 5), pt(19, 11.8), pt(24, 12.4))],
    // Held up high and curious, seen foreshortened from above: it curls up and over to one side.
    tail: cub(pt(-32, 0), pt(-47, -2), pt(-60, -12), pt(-55, -26), 18), tailW: 23, raised: true, shift: pt(5, 4),
  },
  startle: {
    trunk: [0.9, 1.15, 1.1], puff: 1, head: pt(32, 0), snout: 18.5, ears: ['back', 'back'], earScale: 1.12, eyes: 'wide',
    // Springing back off all four feet, splayed, the brush bottled out.
    legs: [L(pt(-24, 5), pt(-30, 15), pt(-40, 19)), L(pt(-24, 5), pt(-31, 15), pt(-41, 18)), L(pt(13, 5), pt(18, 15), pt(26, 19)), L(pt(13, 5), pt(19, 15), pt(27, 18))],
    tail: cub(pt(-31, 0), pt(-46, 2), pt(-62, -8), pt(-78, -16), 18), tailW: 30, shift: pt(5, 1),
  },
};

/** The fox's whole geometry for a pose. */
export function fox(pose: FoxPose): Fox {
  const s = SPECS[pose];
  const [sx, sy, hb] = s.trunk;
  const fluff = s.puff;
  const body = tufted(resample(trunk(sx, sy, hb), fluff > 0.5 ? 1.4 : 2.2), 0.5 + fluff * 1.1, 3);
  const C = s.head;
  const head = ruffed(resample(headShape(C, s.snout, fluff), 1.4), C, fluff);
  const ears = [ear(-1, s.ears[0], C, s.earScale), ear(1, s.ears[1], C, s.earScale)];
  const legs = s.legs.map((k, i) => leg(k, i % 2 === 0 ? 1 : -1, i >= 2, i >= 2 ? 4.6 : 6));
  const spine = s.tail;
  // A narrow root swelling to a full brush, rounding at the tip.
  const w = (u: number): number => s.tailW * (0.34 + 0.66 * Math.exp(-(((u - 0.52) / 0.38) ** 2))) * (1 - 0.45 * smoothstep((u - 0.78) / 0.22));
  const shape = tufted(resample(tube(spine, w), 1.5), fluff > 0.5 ? 2.6 : 1.3, 3);
  return { pose, body, sx, sy, head, headC: C, snout: s.snout, ears, legs, tail: { shape, spine: [...spine], w: s.tailW, raised: s.raised ?? false }, puff: fluff, eyes: s.eyes, shift: s.shift };
}
