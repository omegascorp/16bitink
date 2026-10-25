import { closed, cub, type Draw, pt } from '../kit';
import type { Pt } from '../pen';
import type { SpriteArt } from '../types';
import { ellipseAt, glaze, hairs } from '../critters/preyKit';
import { tube, tufted } from '../critters/tomcatParts';
import { along, clumps, fingers, leg, type Leg, type LegKey, makeLeg, paintFur, type Pelt, resample, softShadow, trunkShape } from './barrensCrittersBeast';
import { inside } from './barrensCrittersKit';
import { BADGER, badgerHead, type HeadHold, paintBadgerHead } from './jungleCrittersBadgerHead';

/**
 * The honey badger (Indian ratel, Mellivora capensis indica), seen from
 * above facing +x: a stout, broad, low body about 62 long, black, with the
 * broad silver-white mantle running from its crown right down its back to
 * the tail, so from above it is mostly silver edged black; short black legs,
 * the forefeet armed with long pale digging claws, and a short thick tail.
 * It trundles ('walk0', 'walk1'), lopes ('run0', 'run1'), lunges with its
 * jaws open ('bite'), and stops square, nose lifted to sniff ('stand':
 * it's lost you).
 */
type Pose = 'walk0' | 'walk1' | 'run0' | 'run1' | 'bite' | 'stand';

const B = BADGER;

const PELT: Pelt = { base: B.black, deep: B.deep, light: B.sheen, hair: (_p, r) => (r < 0.55 ? B.black : r < 0.85 ? B.coal : B.sheen) };
const LEG_PELT: Pelt = { base: B.black, deep: B.deep, light: B.sheen, hair: (_p, r) => (r < 0.6 ? B.black : r < 0.9 ? B.coal : B.sheen) };

/** The trunk's half width, neck to rump: broad and flat all along. */
const TRUNK: readonly (readonly [number, number])[] = [[16, 7.6], [9, 11.4], [0, 13.8], [-9, 14.6], [-17, 13.8], [-23, 10.6], [-27.5, 0]];
/** The mantle's half width over the same knots: most of the back. */
const MANTLE = 0.72;
/** Where the mantle's edge frays into the black flank. */
const FRAY = 0.86;

interface Spec {
  readonly sx: number;
  readonly sy: number;
  readonly bend: number;
  readonly head: Pt;
  readonly hold: HeadHold;
  /** Hind +y, hind −y, fore +y, fore −y. */
  readonly legs: readonly [LegKey, LegKey, LegKey, LegKey];
  readonly tail: readonly Pt[];
}

const FORE = { fwd: leg(pt(10, 7), pt(14, 12), pt(20, 13.6)), back: leg(pt(8, 7), pt(5, 12.6), pt(1, 14.2)) };
const HIND = { fwd: leg(pt(-15, 8), pt(-10, 13.6), pt(-5, 15.2)), back: leg(pt(-19, 8), pt(-24, 13.8), pt(-30, 13.8)) };

function walk(k: 1 | -1): Spec {
  const a = k === 1;
  return {
    sx: 1, sy: 1, bend: 0.9 * k, head: pt(23, 0.8 * k), hold: 'level',
    legs: [a ? HIND.fwd : HIND.back, a ? HIND.back : HIND.fwd, a ? FORE.back : FORE.fwd, a ? FORE.fwd : FORE.back],
    tail: cub(pt(-25, 0), pt(-30, -0.5 * k), pt(-34, -1.5 * k), pt(-38, -2.5 * k), 10),
  };
}

const SPECS: Readonly<Record<Pose, Spec>> = {
  walk0: walk(1),
  walk1: walk(-1),
  run0: {
    sx: 0.94, sy: 1.05, bend: 0, head: pt(22, 0), hold: 'level',
    legs: [leg(pt(-14, 8), pt(-7, 14.5), pt(0, 13.5)), leg(pt(-14, 8), pt(-6, 14), pt(1, 12.5)), leg(pt(7, 7), pt(3, 12.5), pt(-3, 12)), leg(pt(7, 7), pt(4, 12), pt(-2, 11))],
    tail: cub(pt(-24, 0), pt(-29, 0), pt(-33, -1.5), pt(-37, -1.5), 10),
  },
  run1: {
    sx: 1.06, sy: 0.93, bend: 0, head: pt(25, 0), hold: 'level',
    legs: [leg(pt(-19, 8), pt(-27, 13), pt(-37, 11.5)), leg(pt(-19, 8), pt(-26, 12.5), pt(-36, 10)), leg(pt(11, 7), pt(19, 11.5), pt(29, 10.5)), leg(pt(11, 7), pt(18, 11), pt(28, 9))],
    tail: cub(pt(-27, 0), pt(-32, 0), pt(-36, 1.5), pt(-40, 1.5), 10),
  },
  bite: {
    sx: 1.04, sy: 0.98, bend: 0, head: pt(25, 0), hold: 'bite',
    legs: [leg(pt(-18, 8), pt(-22, 14), pt(-29, 14.5)), leg(pt(-18, 8), pt(-21, 13.5), pt(-28, 13.5)), leg(pt(11, 7), pt(16, 13), pt(23, 15.5)), leg(pt(11, 7), pt(16, 12.5), pt(24, 14.5))],
    tail: cub(pt(-26, 0), pt(-31, 0.5), pt(-35, 2.5), pt(-39, 3), 10),
  },
  stand: {
    sx: 0.97, sy: 1.02, bend: 0, head: pt(21.5, 0), hold: 'up',
    legs: [leg(pt(-17, 8), pt(-15, 13), pt(-13.5, 15.8)), leg(pt(-17, 8), pt(-15, 13), pt(-13.5, 15.8)), leg(pt(9, 7), pt(11, 11.5), pt(13, 13.4)), leg(pt(9, 7), pt(11, 11.5), pt(13, 13.4))],
    tail: cub(pt(-25, 0), pt(-30, 0), pt(-34, 0.5), pt(-38, 0.5), 10),
  },
};

/** The short thick tail: black at the sides, the mantle's silver running down its top, a tufted tip. */
function paintTail(d: Draw, spine: readonly Pt[]): Pt[] {
  const n = spine.length - 1;
  const w = (u: number): number => 7 * (1 - 0.45 * u) + 1.2 * Math.sin(Math.PI * Math.min(1, u * 1.5));
  const shape = tufted(resample(tube(spine, w), 1.4), 1, 3);
  paintFur(d, PELT, {
    shape,
    dir: (p) => along(spine, p).ang + Math.PI,
    wet: () => {
      for (let i = 0; i <= n * 0.75; i++) glaze(d, spine[i]!.x, spine[i]!.y, 3, 1.8, along(spine, spine[i]!).ang, B.silver, 0.6);
    },
    hair: (p, r) => {
      const { i } = along(spine, p);
      const q = spine[i]!;
      const off = Math.hypot(p.x - q.x, p.y - q.y) / (w(i / n) / 2);
      return off < 0.4 && i < n * 0.75 ? (r < 0.6 ? B.silver : B.grey) : PELT.hair(p, r);
    },
    n: 220, len: 2.4, seed: 9301, tuft: 1.4, line: 0.7,
  });
  return shape;
}

/** A broad black foot; the forefoot armed with long pale claws, the hind one with short ones. */
function foot(d: Draw, l: Leg): void {
  const { pen } = d;
  const u = pt(Math.cos(l.ang), Math.sin(l.ang));
  const sole = ellipseAt(l.c.x + u.x * 1.4, l.c.y + u.y * 1.4, l.front ? 2.6 : 3.2, 2.4, l.ang, 14);
  pen.fill(sole, B.pad, 1);
  pen.clipped(sole, () => glaze(d, l.c.x - 0.4, l.c.y - 0.6, 1.8, 1.2, 0, B.sheen, 0.6));
  pen.stroke(closed(sole), 0.45, d.ink, 0.9, false);
  const base = pt(l.c.x + u.x * 2.8, l.c.y + u.y * 2.8);
  const lens = l.front ? [1.4, 1.8, 2, 1.8, 1.4] : [1.2, 1.5, 1.6, 1.5, 1.2];
  fingers(d, base, l.ang, 1.5, lens, 1.05, B.coal, B.claw);
  const claw = l.front ? 3.4 : 1.4;
  lens.forEach((len, i) => {
    const a = l.ang + (i / (lens.length - 1) - 0.5) * 1.5;
    const tip = pt(base.x + Math.cos(a) * len, base.y + Math.sin(a) * len);
    const end = pt(tip.x + Math.cos(a + l.side * 0.15) * claw, tip.y + Math.sin(a + l.side * 0.15) * claw);
    const mid = pt((tip.x + end.x) / 2 + Math.cos(a + 1.57) * 0.25 * l.side, (tip.y + end.y) / 2 + Math.sin(a + 1.57) * 0.25 * l.side);
    pen.hair([tip, mid, end], l.front ? 0.75 : 0.55, B.clawDeep, 0.95);
    pen.hair([tip, mid, end], l.front ? 0.4 : 0.3, B.claw, 1);
  });
}

function paintLeg(d: Draw, l: Leg, k: number): void {
  paintFur(d, LEG_PELT, { shape: l.limb, dir: (p) => Math.atan2(l.c.y - p.y, l.c.x - p.x), n: 150, len: 2, seed: 9320 + k, tuft: 1, line: 0.65 });
  foot(d, l);
}

/** The coat: black, the silver mantle over the back (coarse, grizzled with grey and a few dark hairs), lit along its top. */
function paintBody(d: Draw, s: Spec, shape: readonly Pt[], mantle: readonly Pt[], fray: readonly Pt[]): void {
  const lie = (p: Pt): number => Math.atan2(p.y * 0.05, -1) + Math.sign(p.y) * Math.min(0.9, Math.abs(p.y) / 22) + Math.PI;
  const onMantle = (p: Pt): boolean => inside(mantle, p);
  const onFray = (p: Pt): boolean => inside(fray, p);
  paintFur(d, PELT, {
    shape,
    dir: lie,
    wet: () => {
      d.pen.fill(fray, B.grey, 0.45);
      d.pen.fill(mantle, B.silver, 0.95);
      glaze(d, -2 * s.sx, -3 * s.sy, 22 * s.sx, 6 * s.sy, 0, B.white, 0.6);
      glaze(d, -8 * s.sx, 4 * s.sy, 18 * s.sx, 5 * s.sy, 0, B.grey, 0.4);
      glaze(d, 4 * s.sx, 0, 12 * s.sx, 5 * s.sy, 0, B.warm, 0.2);
    },
    hair: (p, r) => {
      if (onMantle(p)) return r < 0.08 ? B.coal : r < 0.3 ? B.grey : r < 0.7 ? B.white : r < 0.93 ? B.silver : B.warm;
      if (onFray(p)) return r < 0.45 ? B.grey : r < 0.6 ? B.silver : PELT.hair(p, r);
      return PELT.hair(p, r);
    },
    over: () => clumps(d, shape, lie, 200, 9303, 3.8, B.grey, B.white, (p) => (onMantle(p) ? 0.35 : onFray(p) ? 0.6 : 0.9)),
    n: 1300, len: 3, seed: 9302, tuft: 1.5, line: 0.9,
  });
}

function draw(d: Draw, pose: Pose): void {
  const s = SPECS[pose];
  const knots = TRUNK.map(([x, w]) => [x * s.sx, w * s.sy] as const);
  const trunk = trunkShape(knots, s.bend, 0.8);
  const mantle = trunkShape(knots.map(([x, w], i) => [i === 0 ? x + 3 : x, w * MANTLE] as const), s.bend, 0.6);
  const fray = trunkShape(knots.map(([x, w], i) => [i === 0 ? x + 3 : x, w * FRAY] as const), s.bend, 1);
  const legs = s.legs.map((k, i) => makeLeg(k, i % 2 === 0 ? 1 : -1, i >= 2, i >= 2 ? 5.4 : 6.2, i >= 2 ? 3.6 : 4));
  const head = badgerHead(s.head, s.hold);
  const spine = s.tail as Pt[];
  d.pen.ctx.translate(2, 0);
  const air = pose === 'run1';
  softShadow(d, [tube(spine, () => 7), trunk, head, ...legs.map((l) => l.limb)], air ? pt(4, 6) : pt(2.2, 3.2), air ? 0.13 : 0.19, 1.4);
  paintTail(d, spine);
  legs.forEach((l, i) => paintLeg(d, l, i));
  paintBody(d, s, trunk, mantle, fray);
  d.pen.clipped(trunk, () => d.pen.fill(head.map((q) => pt(q.x + 1.4, q.y + 2.2)), B.deep, 0.3));
  paintBadgerHead(d, s.head, s.hold);
  neck(d, s.head);
  if (pose === 'stand') sniff(d, pt(s.head.x + 13.5, s.head.y));
}

/** The mantle running on over the nape to the crown: silver hairs laid across the join of head and body. */
function neck(d: Draw, C: Pt): void {
  const { pen } = d;
  const patch = ellipseAt(C.x - 7.4, C.y, 3.6, 5.2, 0, 18);
  pen.fill(patch, B.silver, 0.85);
  pen.clipped(patch, () => glaze(d, C.x - 7.4, C.y - 1, 3, 3.5, 0, B.white, 0.6));
  hairs(d, ellipseAt(C.x - 7.4, C.y, 4.4, 5.6, 0, 18), { dir: (p) => Math.PI + (p.y - C.y) * 0.08, color: (_p, r) => (r < 0.25 ? B.grey : r < 0.8 ? B.white : B.silver) }, 90, 9310, 2.4, 0.35, 0.8);
}

/** Little marks of sniffing round the lifted nose. */
function sniff(d: Draw, n: Pt): void {
  for (const [a, r] of [[-0.7, 4], [0, 4.6], [0.7, 4]] as const) {
    const c = pt(n.x + Math.cos(a) * r, n.y + Math.sin(a) * r);
    const t = pt(-Math.sin(a), Math.cos(a));
    d.pen.hair([pt(c.x - t.x * 1.1, c.y - t.y * 1.1), pt(c.x + Math.cos(a) * 0.4, c.y + Math.sin(a) * 0.4), pt(c.x + t.x * 1.1, c.y + t.y * 1.1)], 0.45, d.ink, 0.6);
  }
}

export const HONEY_BADGER_ART: SpriteArt<Pose> = {
  frame: 116,
  res: 2,
  poses: ['walk0', 'walk1', 'run0', 'run1', 'bite', 'stand'],
  draw,
};
