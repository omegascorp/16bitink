import { closed, cub, type Draw, pt } from '../kit';
import type { Pt } from '../pen';
import type { SpriteArt } from '../types';
import { ellipseAt, glaze } from '../critters/preyKit';
import { tube, tufted } from '../critters/tomcatParts';
import { along, clumps, fingers, grizzle, headShape, leg, type Leg, type LegKey, makeLeg, paintFur, type Pelt, resample, softShadow, trunkShape } from './barrensCrittersBeast';
import { paintRaccoonHead, RACCOON } from './barrensCrittersRaccoonHead';

/**
 * The raccoon, seen from above facing +x: a stout, hunched body about 66
 * long, broadest at the haunches, in a grizzled grey coat darker down the
 * back; the black bandit's mask between white brows and a white muzzle,
 * white-rimmed ears; dark legs ending in long-fingered, hand-like paws; and
 * a bushy tail ringed black. It ambles ('walk0', 'walk1'), reaches both
 * hands out for a snake's tail ('grab'), and bounds away ('run0' gathered,
 * 'run1' stretched out).
 */
type Pose = 'walk0' | 'walk1' | 'grab' | 'run0' | 'run1';

const R = RACCOON;
/** The head is drawn in its own units and scaled up this much: a raccoon's head is big and broad. */
const HEAD_K = 1.16;

const PELT: Pelt = { base: R.base, deep: R.deep, light: R.light, hair: (_p, r) => grizzle(R.dark, R.base, R.pale, R.warm, 0.3)(r) };
const LEG_PELT: Pelt = { base: R.leg, deep: R.dark, light: R.base, hair: (_p, r) => grizzle(R.dark, R.leg, R.base, R.warm, 0.18)(r) };

/** The trunk's half width from the neck back to the rump: heaviest at the haunches. */
const TRUNK: readonly (readonly [number, number])[] = [[17, 6.8], [11, 9.6], [3, 12], [-6, 14.4], [-14, 15.2], [-21, 12.8], [-28, 0]];

interface Spec {
  readonly sx: number;
  readonly sy: number;
  readonly bend: number;
  readonly head: Pt;
  /** Hind +y, hind −y, fore +y, fore −y. */
  readonly legs: readonly [LegKey, LegKey, LegKey, LegKey];
  readonly tail: readonly Pt[];
  /** Hands spread wide, reaching (the grab). */
  readonly reach: boolean;
}

const FORE = { fwd: leg(pt(11, 6), pt(15, 10.5), pt(23.5, 12)), back: leg(pt(9, 6), pt(6, 11.5), pt(2, 13)) };
const HIND = { fwd: leg(pt(-14, 7), pt(-9, 13), pt(-4, 14.5)), back: leg(pt(-18, 7), pt(-23, 12.5), pt(-31, 12.5)) };

function walk(k: 1 | -1): Spec {
  const a = k === 1;
  return {
    sx: 1, sy: 1, bend: 0.8 * k, head: pt(24, 0.6 * k),
    legs: [a ? HIND.fwd : HIND.back, a ? HIND.back : HIND.fwd, a ? FORE.back : FORE.fwd, a ? FORE.fwd : FORE.back],
    tail: cub(pt(-24, 0), pt(-34, 0.5), pt(-43, 5 * k), pt(-53, 7 * k), 16), reach: false,
  };
}

const SPECS: Readonly<Record<Pose, Spec>> = {
  walk0: walk(1),
  walk1: walk(-1),
  grab: {
    sx: 1.05, sy: 0.97, bend: 0, head: pt(27, 0),
    legs: [leg(pt(-18, 7), pt(-20, 16), pt(-28, 15)), leg(pt(-18, 7), pt(-21, 15.5), pt(-29, 13.5)), leg(pt(12, 6), pt(25, 12.5), pt(42, 8.5)), leg(pt(12, 6), pt(24, 12), pt(43, 7))],
    tail: cub(pt(-25, 0), pt(-36, -1), pt(-44, -4), pt(-54, -2), 16), reach: true,
  },
  run0: {
    sx: 0.93, sy: 1.06, bend: 0, head: pt(23, 0),
    legs: [leg(pt(-15, 7), pt(-7, 15.5), pt(1, 13.5)), leg(pt(-15, 7), pt(-6, 15), pt(2, 12.5)), leg(pt(8, 6), pt(3, 12.5), pt(-3, 11.5)), leg(pt(8, 6), pt(4, 12), pt(-2, 10.5))],
    tail: cub(pt(-23, 0), pt(-34, 0), pt(-43, -2), pt(-52, -1), 16), reach: false,
  },
  run1: {
    sx: 1.07, sy: 0.92, bend: 0, head: pt(26, 0),
    legs: [leg(pt(-19, 7), pt(-29, 13), pt(-41, 11)), leg(pt(-19, 7), pt(-28, 12.5), pt(-40, 9.5)), leg(pt(12, 6), pt(23, 11), pt(35, 9.5)), leg(pt(12, 6), pt(22, 10.5), pt(34, 8))],
    tail: cub(pt(-27, 0), pt(-38, 0), pt(-46, 2), pt(-55, 1), 16), reach: false,
  },
};

/** The bushy tail: rings of black and buff-grey, a black tip, its fur lying back along it. */
function paintTail(d: Draw, spine: readonly Pt[]): Pt[] {
  const n = spine.length - 1;
  const w = (u: number): number => 9.5 * (1 - 0.25 * u) + 1.5 * Math.sin(Math.PI * Math.min(1, u * 1.4));
  const shape = tufted(resample(tube(spine, w), 1.5), 1.1, 3);
  const ringOf = (p: Pt): boolean => {
    const u = along(spine, p).i / n;
    return u > 0.9 || (u > 0.1 && ((u - 0.1) * 6.2) % 1 > 0.55);
  };
  paintFur(d, PELT, {
    shape,
    dir: (p) => along(spine, p).ang + Math.PI,
    wet: () => {
      for (let i = 2; i <= n; i++) {
        const u = i / n;
        if (!(u > 0.9 || (u > 0.1 && ((u - 0.1) * 6.2) % 1 > 0.55))) continue;
        const p = spine[i]!;
        const ang = along(spine, p).ang;
        glaze(d, p.x, p.y, 2.6, 7.5, ang, R.dark, 0.9);
      }
      for (let i = 1; i < n; i++) {
        const u = i / n;
        if (u > 0.1 && ((u - 0.1) * 6.2) % 1 < 0.45) glaze(d, spine[i]!.x, spine[i]!.y, 2.4, 6, along(spine, spine[i]!).ang, R.buff, 0.45);
      }
    },
    hair: (p, r) => (ringOf(p) ? (r < 0.75 ? R.dark : R.deep) : r < 0.2 ? R.deep : r < 0.55 ? R.buff : r < 0.85 ? R.base : R.pale),
    n: 560, len: 3.2, seed: 7301, tuft: 1.6,
  });
  return shape;
}

/** A hand-like forepaw: a dark palm and five long fingers, spread wide when it reaches. */
function hand(d: Draw, l: Leg, reach: boolean): void {
  const u = pt(Math.cos(l.ang), Math.sin(l.ang));
  const palm = ellipseAt(l.c.x + u.x * 1.2, l.c.y + u.y * 1.2, 2.2, 2.1, l.ang, 14);
  const base = pt(l.c.x + u.x * 2.4, l.c.y + u.y * 2.4);
  d.pen.fill(palm, R.paw, 1);
  fingers(d, base, l.ang - l.side * 0.08, reach ? 2.2 : 1.5, reach ? [3.2, 4.2, 4.6, 4.2, 3.4] : [2.6, 3.4, 3.7, 3.4, 2.8], 1.05, R.finger, R.claw);
  d.pen.clipped(palm, () => glaze(d, l.c.x - 0.4, l.c.y - 0.6, 1.8, 1.2, 0, R.pawLit, 0.6));
  d.pen.stroke(closed(palm), 0.45, d.ink, 0.9, false);
}

/** A hind foot, flat on the ground: a long dark sole and five short toes. */
function foot(d: Draw, l: Leg): void {
  const u = pt(Math.cos(l.ang), Math.sin(l.ang));
  const sole = ellipseAt(l.c.x + u.x * 1.8, l.c.y + u.y * 1.8, 3.8, 2.2, l.ang, 16);
  d.pen.fill(sole, R.paw, 1);
  fingers(d, pt(l.c.x + u.x * 4.6, l.c.y + u.y * 4.6), l.ang, 1.4, [1.8, 2.4, 2.6, 2.4, 1.9], 1.05, R.finger, R.claw);
  d.pen.clipped(sole, () => glaze(d, l.c.x + u.x - 0.4, l.c.y + u.y - 0.6, 2.6, 1.2, l.ang, R.pawLit, 0.55));
  d.pen.stroke(closed(sole), 0.45, d.ink, 0.9, false);
}

function paintLeg(d: Draw, l: Leg, k: number, reach: boolean): void {
  paintFur(d, LEG_PELT, { shape: l.limb, dir: (p) => Math.atan2(l.c.y - p.y, l.c.x - p.x), n: 130, len: 2, seed: 7320 + k, tuft: 0.9, line: 0.65 });
  if (l.front) hand(d, l, reach);
  else foot(d, l);
}

/** The trunk: grizzled grey, darker and browner down the back, paler low on the flanks. */
function paintBody(d: Draw, s: Spec, shape: readonly Pt[]): void {
  const lie = (p: Pt): number => Math.atan2(p.y * 0.05, -1) + Math.sign(p.y) * Math.min(0.9, Math.abs(p.y) / 22) + Math.PI;
  paintFur(d, PELT, {
    shape,
    dir: lie,
    wet: () => {
      glaze(d, -6 * s.sx, 0, 26 * s.sx, 7.5 * s.sy, 0, R.dark, 0.6);
      glaze(d, 10 * s.sx, 0, 9 * s.sx, 7 * s.sy, 0, R.warm, 0.4);
      for (const side of [-1, 1]) glaze(d, -8 * s.sx, side * 12.5 * s.sy, 18 * s.sx, 3.5, 0, R.pale, 0.55);
      // Haunches and shoulders rounding under the coat.
      for (const side of [-1, 1]) {
        glaze(d, -15 * s.sx - 1, side * 8 * s.sy - 1.2, 7, 4.5, side * 0.3, R.light, side < 0 ? 0.4 : 0.2);
        glaze(d, 8 * s.sx - 1, side * 6.5 * s.sy - 1, 5, 3.5, side * 0.3, R.light, side < 0 ? 0.35 : 0.18);
      }
    },
    hair: (p, r) => {
      // Darker hairs down the spine, more pale tips on the lit flank.
      const v = Math.max(0, 1 - Math.abs(p.y) / (10 * s.sy));
      const dark = 0.08 + 0.5 * v;
      const pale = (0.08 + 0.26 * (1 - v)) * (p.y < 0 ? 1.25 : 0.8);
      return r < dark ? R.dark : r < dark + pale ? R.pale : r < 0.93 ? R.base : R.warm;
    },
    over: () => clumps(d, shape, lie, 190, 7303, 3.6, R.dark, R.pale, (p) => 0.35 + 0.5 * Math.max(0, 1 - Math.abs(p.y) / (9 * s.sy))),
    n: 1200, len: 3.4, seed: 7302, tuft: 1.6, line: 0.85,
  });
}

function draw(d: Draw, pose: Pose): void {
  const s = SPECS[pose];
  const trunk = trunkShape(TRUNK.map(([x, w]) => [x * s.sx, w * s.sy] as const), s.bend, 0.7);
  const legs = s.legs.map((k, i) => makeLeg(k, i % 2 === 0 ? 1 : -1, i >= 2, i >= 2 ? 4.4 : 5.4, i >= 2 ? 2.8 : 3.2));
  const C = s.head;
  const headAt = (q: Pt): Pt => pt(C.x + (q.x - C.x) * HEAD_K, C.y + (q.y - C.y) * HEAD_K);
  const headRaw = headShape(C, 8.2, 0.24, 1.9, 6.4, 4.5);
  const head = headRaw.map(headAt);
  const tailSpine = s.tail as Pt[];
  const tailShape = tube(tailSpine, () => 10);
  d.pen.ctx.translate(3, 0);
  const air = pose === 'run1';
  softShadow(d, [tailShape, trunk, head, ...legs.map((l) => l.limb)], air ? pt(4, 6) : pt(2.2, 3.2), air ? 0.12 : 0.17, 1.4);
  paintTail(d, tailSpine);
  legs.forEach((l, i) => paintLeg(d, l, i, s.reach));
  paintBody(d, s, trunk);
  // The head's shadow on the shoulders.
  d.pen.clipped(trunk, () => d.pen.fill(head.map((q) => pt(q.x + 1.4, q.y + 2.2)), R.deep, 0.35));
  const { ctx } = d.pen;
  ctx.save();
  ctx.translate(C.x, C.y);
  ctx.scale(HEAD_K, HEAD_K);
  ctx.translate(-C.x, -C.y);
  paintRaccoonHead(d, C, headRaw, s.reach);
  ctx.restore();
}

export const RACCOON_ART: SpriteArt<Pose> = {
  frame: 120,
  res: 2,
  poses: ['walk0', 'walk1', 'grab', 'run0', 'run1'],
  draw,
};
