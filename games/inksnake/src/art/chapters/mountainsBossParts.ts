import { cub, pt } from '../kit';
import type { Pt } from '../pen';
import { leg, type Leg, type LegKey, makeLeg, trunkShape } from './barrensCrittersBeast';

/**
 * The Wild Boar's geometry, seen from above facing +x: a wedge of a beast,
 * massive in the shoulders and narrowing to the hams, a long head running
 * out to the flat snout disc, small pricked ears, tusks curling out from
 * the snout's sides, short legs on cloven trotters mostly under the body,
 * and a thin tufted tail. Board px, the trunk's middle at the origin.
 */
export type BoarPose = 'walk0' | 'walk1' | 'root' | 'paw' | 'charge0' | 'charge1' | 'dazed' | 'startle';
export const BOAR_POSES: readonly BoarPose[] = ['walk0', 'walk1', 'root', 'paw', 'charge0', 'charge1', 'dazed', 'startle'];

export interface Boar {
  readonly pose: BoarPose;
  readonly body: Pt[];
  readonly sx: number;
  readonly sy: number;
  readonly head: Pt[];
  /** The crown's centre, the head's turn (dazed, it sways), how long the muzzle looks (shorter pointed down). */
  readonly headC: Pt;
  readonly turn: number;
  readonly snout: number;
  readonly ears: readonly { readonly shape: Pt[]; readonly tip: Pt; readonly side: 1 | -1 }[];
  /** Legs: hind +y, hind −y, fore +y, fore −y. */
  readonly legs: readonly Leg[];
  readonly tail: Pt[];
  /** 0..1: how far the bristles of the mane stand up. */
  readonly bristle: number;
  /** The mouth open (squealing). */
  readonly squeal: boolean;
  readonly eyes: 'calm' | 'mean' | 'dizzy' | 'wide';
}

/** The trunk's half width from the neck back to the rump, (x, half) knots: a wedge, heaviest at the shoulders. */
const TRUNK: readonly (readonly [number, number])[] = [[27, 15.5], [19, 22], [8, 23.5], [-6, 21.5], [-20, 17.5], [-31, 13], [-39, 0]];

interface Spec {
  readonly sx: number;
  readonly sy: number;
  readonly bend: number;
  readonly head: Pt;
  readonly turn: number;
  readonly snout: number;
  /** Hind +y, hind −y, fore +y, fore −y. */
  readonly legs: readonly [LegKey, LegKey, LegKey, LegKey];
  readonly tail: readonly Pt[];
  readonly bristle: number;
  readonly squeal: boolean;
  readonly eyes: Boar['eyes'];
  readonly ears: 'up' | 'back' | 'fwd';
}

const FORE = {
  fwd: leg(pt(15, 13), pt(20, 18.5), pt(25, 19)),
  mid: leg(pt(14, 13), pt(15, 19), pt(16, 20)),
  back: leg(pt(13, 13), pt(9, 18.5), pt(5, 19.5)),
};
const HIND = {
  fwd: leg(pt(-22, 12), pt(-17, 17), pt(-13, 17.5)),
  mid: leg(pt(-23, 12), pt(-23, 17), pt(-22, 18)),
  back: leg(pt(-24, 12), pt(-29, 16), pt(-34, 15.5)),
};

const tailAt = (x: number, swing: number, up = 0): Pt[] => cub(pt(x + 3, 0), pt(x - 2, swing * 0.3), pt(x - 5 + up * 1.2, swing * 0.8), pt(x - 9 + up * 2, swing), 10);

function walk(k: 1 | -1): Spec {
  const a = k === 1;
  return {
    sx: 1, sy: 1, bend: 0.8 * k, head: pt(33, 0.8 * k), turn: 0.03 * k, snout: 24,
    legs: [a ? HIND.fwd : HIND.back, a ? HIND.back : HIND.fwd, a ? FORE.back : FORE.fwd, a ? FORE.fwd : FORE.back],
    tail: tailAt(-38, 4 * k), bristle: 0.15, squeal: false, eyes: 'calm', ears: 'up',
  };
}

const SPECS: Readonly<Record<BoarPose, Spec>> = {
  walk0: walk(1),
  walk1: walk(-1),
  root: {
    sx: 1, sy: 1, bend: 0.4, head: pt(36, 0), turn: 0, snout: 17,
    legs: [HIND.mid, HIND.fwd, FORE.mid, FORE.back], tail: tailAt(-38, 6), bristle: 0.3, squeal: false, eyes: 'calm', ears: 'fwd',
  },
  paw: {
    sx: 0.97, sy: 1.04, bend: 0, head: pt(33, 0), turn: 0, snout: 19,
    legs: [HIND.fwd, HIND.mid, leg(pt(14, 13), pt(9, 21), pt(-1, 25)), FORE.fwd], tail: tailAt(-37, -2, 1), bristle: 1, squeal: false, eyes: 'mean', ears: 'back',
  },
  charge0: {
    sx: 0.95, sy: 1.04, bend: 0, head: pt(31, 0), turn: 0, snout: 20,
    legs: [leg(pt(-21, 12), pt(-12, 17), pt(-4, 16.5)), leg(pt(-21, 12), pt(-11, 16.5), pt(-3, 15.5)), leg(pt(13, 13), pt(8, 18), pt(1, 17.5)), leg(pt(13, 13), pt(9, 17.5), pt(2, 16.5))],
    tail: tailAt(-36, 1, 1), bristle: 0.55, squeal: false, eyes: 'mean', ears: 'back',
  },
  charge1: {
    sx: 1.07, sy: 0.95, bend: 0, head: pt(36, 0), turn: 0, snout: 20,
    legs: [leg(pt(-26, 12), pt(-34, 16), pt(-45, 14.5)), leg(pt(-26, 12), pt(-33, 15.5), pt(-44, 13)), leg(pt(16, 13), pt(26, 17), pt(37, 15.5)), leg(pt(16, 13), pt(25, 16.5), pt(36, 14))],
    tail: tailAt(-42, -1, 1), bristle: 0.55, squeal: false, eyes: 'mean', ears: 'back',
  },
  dazed: {
    sx: 1, sy: 1.02, bend: -1.2, head: pt(32, -2.5), turn: -0.22, snout: 22,
    legs: [leg(pt(-22, 12), pt(-21, 19), pt(-19, 21.5)), leg(pt(-23, 12), pt(-26, 18), pt(-28, 20)), leg(pt(14, 13), pt(19, 19.5), pt(23, 22)), leg(pt(14, 13), pt(13, 20), pt(12, 22.5))],
    tail: tailAt(-38, 7), bristle: 0.1, squeal: false, eyes: 'dizzy', ears: 'fwd',
  },
  startle: {
    sx: 0.92, sy: 1.06, bend: 0, head: pt(30, 0), turn: 0, snout: 26,
    legs: [leg(pt(-20, 12), pt(-20, 19), pt(-17, 22)), leg(pt(-20, 12), pt(-21, 19), pt(-18, 22.5)), leg(pt(14, 13), pt(22, 19), pt(29, 21)), leg(pt(14, 13), pt(23, 18.5), pt(30, 20))],
    tail: tailAt(-36, 0, 3), bristle: 1, squeal: true, eyes: 'wide', ears: 'back',
  },
};

/** A small pointed ear standing off the crown on the +y side (mirrored for the other), pricked up, laid back, or cocked forward. */
function ear(c: Pt, side: 1 | -1, kind: Spec['ears']): { shape: Pt[]; tip: Pt; side: 1 | -1 } {
  const base = pt(c.x - 3, c.y + side * 10);
  const ang = (kind === 'back' ? Math.PI * 0.86 : kind === 'fwd' ? Math.PI * 0.58 : Math.PI * 0.72) * side;
  const len = kind === 'back' ? 12 : 10.5;
  const dir = pt(Math.cos(ang), Math.sin(ang));
  const n = pt(-dir.y, dir.x);
  const tip = pt(base.x + dir.x * len, base.y + dir.y * len);
  const w = 4.8;
  const shape = [
    ...cub(pt(base.x + n.x * w, base.y + n.y * w), pt(base.x + n.x * w + dir.x * len * 0.5, base.y + n.y * w + dir.y * len * 0.5), pt(tip.x + n.x * 1.2, tip.y + n.y * 1.2), tip, 7),
    ...cub(tip, pt(tip.x - n.x * 1.2, tip.y - n.y * 1.2), pt(base.x - n.x * w + dir.x * len * 0.5, base.y - n.y * w + dir.y * len * 0.5), pt(base.x - n.x * w, base.y - n.y * w), 7).slice(1),
  ];
  return { shape, tip, side };
}

/** Corner-cutting: a polygon's corners rounded off, `n` times. */
function chaikin(poly: readonly Pt[], n: number): Pt[] {
  let p = [...poly];
  for (let k = 0; k < n; k++) {
    p = p.flatMap((a, i) => {
      const b = p[(i + 1) % p.length]!;
      return [pt(a.x * 0.75 + b.x * 0.25, a.y * 0.75 + b.y * 0.25), pt(a.x * 0.25 + b.x * 0.75, a.y * 0.25 + b.y * 0.75)];
    });
  }
  return p;
}

/**
 * The head from above: a long wedge, the crown broad with heavy jowls,
 * narrowing down the long snout to the flat disc at its tip, `snout` long
 * from the crown (12.5 + snout from the crown's centre to the tip).
 */
function headOutline(C: Pt, snout: number): Pt[] {
  const L = 12.5 + snout;
  const half: readonly (readonly [number, number])[] = [[L, 0], [L - 0.4, 3.6], [L - 1.6, 4.9], [L - 7, 5.6], [L * 0.62, 7.4], [11, 11.2], [4, 13.6], [-3, 13.4], [-8.5, 11], [-11.5, 6], [-12.5, 0]];
  const top = half.map(([x, y]) => pt(C.x + x, C.y + y));
  const bot = [...half].reverse().slice(1, -1).map(([x, y]) => pt(C.x + x, C.y - y));
  return chaikin([...top, ...bot], 3);
}

/** The whole boar in one pose. */
export function boar(pose: BoarPose): Boar {
  const s = SPECS[pose];
  const body = trunkShape(TRUNK.map(([x, w]) => [x * s.sx, w * s.sy] as const), s.bend, 0.9);
  const legs = s.legs.map((k, i) => makeLeg(k, i % 2 === 0 ? 1 : -1, i >= 2, i >= 2 ? 7.4 : 8.6, i >= 2 ? 4.4 : 4.8));
  const C = s.head;
  const raw = headOutline(C, s.snout);
  const cs = Math.cos(s.turn);
  const sn = Math.sin(s.turn);
  const turn = (p: Pt): Pt => pt(C.x + (p.x - C.x) * cs - (p.y - C.y) * sn, C.y + (p.x - C.x) * sn + (p.y - C.y) * cs);
  const ears = ([1, -1] as const).map((side) => {
    const e = ear(C, side, s.ears);
    return { shape: e.shape.map(turn), tip: turn(e.tip), side };
  });
  return {
    pose, body, sx: s.sx, sy: s.sy, head: raw.map(turn), headC: C, turn: s.turn, snout: s.snout, ears, legs,
    tail: [...s.tail], bristle: s.bristle, squeal: s.squeal, eyes: s.eyes,
  };
}
