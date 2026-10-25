import { closed, cub, type Draw, pt } from '../kit';
import type { Pt } from '../pen';
import type { SpriteArt } from '../types';
import { ellipseAt, glaze } from '../critters/preyKit';
import { tube, tufted } from '../critters/tomcatParts';
import { swish } from '../critters/birdKit';
import { along, clumps, fingers, grizzle, leg, type Leg, type LegKey, makeLeg, paintFur, type Pelt, resample, softShadow, trunkShape } from './barrensCrittersBeast';
import { MONGOOSE, MONGOOSE_PELT, mongooseHeadShape, neckRuff, paintMongooseHead } from './savannaCrittersMongooseHead';

/**
 * The banded mongoose, seen from above facing +x: a lithe, low body about
 * 46 nose to rump, grizzled grey-brown, a dozen dark bands across the back
 * from the middle to the tail's root, the rump warmer; short dark legs with
 * long digging claws on the fore feet; a tapering tail, its tip dark. It
 * trots ('walk0', 'walk1'), bounds ('run0' gathered, 'run1' stretched),
 * lunges with its jaws open ('bite') and sits up on its hind legs to look
 * about ('stand': head and shoulders raised to the eye, the body
 * foreshortened over the haunches, the tail flat behind as a prop).
 */
type Pose = 'walk0' | 'walk1' | 'run0' | 'run1' | 'bite' | 'stand';

const M = MONGOOSE;
const LEG_PELT: Pelt = { base: M.leg, deep: M.dark, light: M.base, hair: (_p, r) => grizzle(M.dark, M.leg, M.base, M.warm, 0.16)(r) };

/** The trunk's half width from the neck back to the rump. */
const TRUNK: readonly (readonly [number, number])[] = [[14, 3.3], [9, 4.8], [3, 5.8], [-4, 6.5], [-11, 6.8], [-17, 5.8], [-22, 0]];
/** The sitting-up trunk: short (foreshortened), broad over the haunches. */
const SITTING: readonly (readonly [number, number])[] = [[8, 5.2], [4, 7], [0, 7.6], [-4, 8.4], [-8, 7.8], [-11, 0]];

interface Spec {
  readonly sx: number;
  readonly sy: number;
  readonly bend: number;
  readonly head: Pt;
  /** Hind +y, hind −y, fore +y, fore −y. */
  readonly legs: readonly [LegKey, LegKey, LegKey, LegKey];
  readonly tail: readonly Pt[];
  readonly open: boolean;
}

const FORE = { fwd: leg(pt(7, 3), pt(10, 5.2), pt(14, 5.6)), back: leg(pt(5, 3), pt(3, 5.4), pt(0.5, 6)) };
const HIND = { fwd: leg(pt(-14, 4), pt(-10.5, 7), pt(-7, 7.2)), back: leg(pt(-17, 4), pt(-20, 6.6), pt(-24.5, 6.2)) };

const tailOf = (x: number, sway: number, len: number): Pt[] => cub(pt(x, 0), pt(x - len * 0.33, sway * 0.2), pt(x - len * 0.66, sway * 0.7), pt(x - len, sway), 14);

function walk(k: 1 | -1): Spec {
  const a = k === 1;
  return {
    sx: 1, sy: 1, bend: 0.7 * k, head: pt(15.5, 0.5 * k),
    legs: [a ? HIND.fwd : HIND.back, a ? HIND.back : HIND.fwd, a ? FORE.back : FORE.fwd, a ? FORE.fwd : FORE.back],
    tail: tailOf(-20, 4 * k, 18), open: false,
  };
}

const SPECS: Readonly<Record<Exclude<Pose, 'stand'>, Spec>> = {
  walk0: walk(1),
  walk1: walk(-1),
  run0: {
    sx: 0.9, sy: 1.08, bend: 0, head: pt(14, 0),
    legs: [leg(pt(-12, 4), pt(-5, 7.4), pt(0.5, 6.4)), leg(pt(-12, 4), pt(-4.5, 7), pt(1.5, 5.8)), leg(pt(5, 3), pt(1.5, 5.6), pt(-3, 5.2)), leg(pt(5, 3), pt(2, 5.2), pt(-2, 4.8))],
    tail: tailOf(-19, -1.5, 17), open: false,
  },
  run1: {
    sx: 1.1, sy: 0.92, bend: 0, head: pt(17, 0),
    legs: [leg(pt(-17, 4), pt(-23, 6.2), pt(-29, 5)), leg(pt(-17, 4), pt(-22.5, 5.8), pt(-28, 4.2)), leg(pt(8, 3), pt(14, 5), pt(20.5, 4.4)), leg(pt(8, 3), pt(13.5, 4.6), pt(19.5, 3.6))],
    tail: tailOf(-22, 1, 17), open: false,
  },
  bite: {
    sx: 1.08, sy: 0.95, bend: 0, head: pt(18, 0),
    legs: [leg(pt(-16, 4), pt(-20, 6.8), pt(-26, 6.4)), leg(pt(-16, 4), pt(-20.5, 6.4), pt(-27, 5.4)), leg(pt(8, 3), pt(13, 5.6), pt(17.5, 6.6)), leg(pt(8, 3), pt(12.5, 5.2), pt(17, 5.8))],
    tail: tailOf(-21, -3, 17), open: true,
  },
};

/** How strongly a point of the back lies in one of its dark bands, 0..1. */
function banded(p: Pt, s: { sx: number; sy: number }, half: number): number {
  const x = p.x / s.sx + 0.05 * (p.y / s.sy) ** 2;
  if (x > 3 || x < -21) return 0;
  const u = (((x + 21) / 2.2) % 1 + 1) % 1;
  const fade = Math.max(0, 1 - Math.max(0, Math.abs(p.y) / (half * s.sy) - 0.45) / 0.5);
  return u < 0.42 ? fade * (x > -1 ? (3 - x) / 4 : 1) : 0;
}

/** The tail: grizzled, tapering, its fur lying back along it, the last third darkening to a black tip. */
function paintTail(d: Draw, spine: readonly Pt[]): Pt[] {
  const n = spine.length - 1;
  const shape = tufted(resample(tube(spine, (u) => 5 * (1 - 0.7 * u)), 1.2), 0.6, 3);
  paintFur(d, MONGOOSE_PELT, {
    shape,
    dir: (p) => along(spine, p).ang + Math.PI,
    wet: () => {
      for (let i = Math.round(n * 0.62); i <= n; i++) glaze(d, spine[i]!.x, spine[i]!.y, 2.6, 2, 0, M.dark, 0.55 + 0.4 * (i / n));
    },
    hair: (p, r) => {
      const u = along(spine, p).i / n;
      return u > 0.7 ? (r < 0.8 ? M.dark : M.deep) : grizzle(M.dark, M.base, M.pale, M.warm, 0.3)(r);
    },
    n: 260, len: 1.7, seed: 7831, tuft: 0.8, line: 0.6,
  });
  return shape;
}

/** A forefoot with long pale digging claws, or a hind foot's longer sole. */
function foot(d: Draw, l: Leg): void {
  const u = pt(Math.cos(l.ang), Math.sin(l.ang));
  const sole = ellipseAt(l.c.x + u.x * 0.7, l.c.y + u.y * 0.7, l.front ? 1.3 : 2, 1.2, l.ang, 12);
  d.pen.fill(sole, M.paw, 1);
  fingers(d, pt(l.c.x + u.x * (l.front ? 1.6 : 2.4), l.c.y + u.y * (l.front ? 1.6 : 2.4)), l.ang, 1.1, l.front ? [1.4, 1.8, 1.9, 1.7] : [1.1, 1.4, 1.5, 1.3], 0.6, M.paw, M.claw);
  d.pen.clipped(sole, () => glaze(d, l.c.x - 0.3, l.c.y - 0.4, 1, 0.7, 0, M.pawLit, 0.6));
  d.pen.stroke(closed(sole), 0.3, d.ink, 0.9, false);
}

function paintLeg(d: Draw, l: Leg, k: number): void {
  paintFur(d, LEG_PELT, { shape: l.limb, dir: (p) => Math.atan2(l.c.y - p.y, l.c.x - p.x), n: 60, len: 1.1, seed: 7840 + k, tuft: 0.5, line: 0.5 });
  foot(d, l);
}

/** The trunk: grizzled, banded dark across the back, warmer over the rump, paler low on the flanks. */
function paintBody(d: Draw, s: { sx: number; sy: number }, shape: readonly Pt[], half: number): void {
  const lie = (p: Pt): number => Math.PI + Math.sign(p.y) * Math.min(0.8, Math.abs(p.y) / 12);
  paintFur(d, MONGOOSE_PELT, {
    shape,
    dir: lie,
    wet: () => {
      glaze(d, -14 * s.sx, 0, 9 * s.sx, 5 * s.sy, 0, M.rufous, 0.45);
      glaze(d, -4 * s.sx, 0, 16 * s.sx, 3.6 * s.sy, 0, M.deep, 0.3);
      for (const side of [-1, 1]) glaze(d, -4 * s.sx, side * 6 * s.sy, 14 * s.sx, 1.8, 0, M.pale, 0.45);
      // The bands, laid in wet across the back, bowing back a little at the flanks.
      for (let x = -20.5; x < 2.5; x += 2.2) {
        const across = Array.from({ length: 9 }, (_, i) => {
          const y = (i / 8 - 0.5) * 2 * half * 0.82;
          return pt((x - 0.05 * y * y + 0.4) * s.sx, y * s.sy);
        });
        d.pen.stroke(across, 1.05 * s.sx, M.band, x > -1 ? 0.35 : 0.6, false);
      }
    },
    hair: (p, r) => {
      if (r < banded(p, s, half) * 0.95) return r < 0.7 ? M.band : M.dark;
      const v = Math.max(0, 1 - Math.abs(p.y) / (5 * s.sy));
      return r < 0.1 + 0.2 * v ? M.dark : r < 0.45 ? M.pale : r < 0.9 ? M.base : M.warm;
    },
    over: () => {
      clumps(d, shape, lie, 90, 7833, 2, M.dark, M.pale, (p) => 0.3 + 0.6 * banded(p, s, half));
      // The bands brought up again over the coat, softly, so they read at a glance.
      for (let x = -20.5; x < 2.5; x += 2.2) {
        const across = Array.from({ length: 9 }, (_, i) => {
          const y = (i / 8 - 0.5) * 2 * half * 0.78;
          return pt((x - 0.05 * y * y + 0.4) * s.sx, y * s.sy);
        });
        d.pen.stroke(across, 0.9 * s.sx, M.band, x > -1 ? 0.2 : 0.42, false);
      }
    },
    n: 760, len: 1.8, seed: 7832, tuft: 0.9, line: 0.7,
  });
}

function drawMoving(d: Draw, pose: Exclude<Pose, 'stand'>): void {
  const s = SPECS[pose];
  const trunk = trunkShape(TRUNK.map(([x, w]) => [x * s.sx, w * s.sy] as const), s.bend, 0.5);
  const legs = s.legs.map((k, i) => makeLeg(k, i % 2 === 0 ? 1 : -1, i >= 2, i >= 2 ? 2.2 : 2.7, 1.4));
  const head = mongooseHeadShape(s.head);
  const air = pose === 'run1' || pose === 'bite';
  d.pen.ctx.translate(2, 0);
  softShadow(d, [tube(s.tail as Pt[], () => 4), trunk, head, ...legs.map((l) => l.limb)], air ? pt(2.6, 4) : pt(1.4, 2.2), air ? 0.13 : 0.18, 1);
  if (pose === 'bite' || pose === 'run1') {
    for (const k of [-1, 1]) swish(d, pt(-26, k * 9), Math.PI, 9, k * 0.8, 0.45);
  }
  paintTail(d, s.tail);
  legs.forEach((l, i) => paintLeg(d, l, i));
  paintBody(d, s, trunk, 7.4);
  d.pen.clipped(trunk, () => d.pen.fill(head.map((q) => pt(q.x + 0.8, q.y + 1.3)), M.deep, 0.3));
  paintMongooseHead(d, s.head, s.open);
  neckRuff(d, s.head);
}

/**
 * Sitting up: the haunches and hind feet on the ground, the tail flat
 * behind, the chest and head raised (nearer the eye, so a little bigger),
 * forepaws tucked under the chin, and a long shadow thrown down-right.
 */
function drawStand(d: Draw): void {
  const s = { sx: 1, sy: 1 };
  const trunk = trunkShape(SITTING, 0, 0.5);
  const tail = tailOf(-9, 6, 18);
  const hind = [1, -1].map((side) => makeLeg(leg(pt(-5, 5), pt(-2, 8.6), pt(2.5, 9)), side as 1 | -1, false, 3, 1.6));
  const C = pt(9, 0);
  const K = 1.3;
  const { ctx } = d.pen;
  ctx.translate(2, 0);
  // Upright, it throws a long shadow down and to the right.
  softShadow(d, [ellipseAt(5, 6, 13, 6, 0.95, 20), trunk, ...hind.map((l) => l.limb)], pt(2, 3), 0.15, 1.8);
  paintTail(d, tail);
  hind.forEach((l, i) => paintLeg(d, l, i));
  paintBody(d, s, trunk, 8.4);
  // The raised chest catches the light: paler, softly round, the forepaws tucked under the chin.
  d.pen.clipped(trunk, () => glaze(d, 4, -1.5, 6, 5, 0, M.light, 0.35));
  for (const side of [-1, 1]) {
    const paw = ellipseAt(C.x + 3.2, side * 2.6, 1.5, 1.1, side * 0.5, 12);
    d.pen.fill(paw, M.paw, 1);
    d.pen.stroke(closed(paw), 0.3, d.ink, 0.9, false);
  }
  ctx.save();
  ctx.translate(C.x, C.y);
  ctx.scale(K, K);
  ctx.translate(-C.x, -C.y);
  paintMongooseHead(d, C, false);
  neckRuff(d, C);
  ctx.restore();
}

export const MONGOOSE_ART: SpriteArt<Pose> = {
  frame: 80,
  res: 2,
  poses: ['walk0', 'walk1', 'run0', 'run1', 'bite', 'stand'],
  draw: (d, pose) => (pose === 'stand' ? drawStand(d) : drawMoving(d, pose)),
};
