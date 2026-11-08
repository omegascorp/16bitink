import { closed, cub, type Draw, pt, ribbon } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import type { SpriteArt } from '../types';
import { mix } from '../wash';
import { ellipseAt, glaze } from '../critters/preyKit';
import { clumps, fingers, leg, type Leg, type LegKey, makeLeg, paintFur, type Pelt, softShadow, trunkShape } from './barrensCrittersBeast';
import { OPOSSUM, opossumHead, paintOpossumHead } from './barrensCrittersOpossumHead';

/**
 * The Virginia opossum, seen from above facing +x: a long, low body about
 * 64 long in a shaggy grizzled grey coat shot with long white guard hairs,
 * a white pointed face, dark legs ending in pale pink feet (the hind ones
 * with a thumb), and a long bare tail, dark at the root and pink after,
 * its tip curling. It ambles ('walk0', 'walk1'), runs ('run0', 'run1'),
 * and lunges with its jaws agape ('bite').
 */
type Pose = 'walk0' | 'walk1' | 'run0' | 'run1' | 'bite';

const O = OPOSSUM;

const PELT: Pelt = {
  base: O.base, deep: O.deep, light: O.light,
  hair: (_p, r) => (r < 0.14 ? O.dark : r < 0.3 ? O.deep : r < 0.62 ? O.base : r < 0.9 ? O.pale : O.warm),
};
const LEG_PELT: Pelt = { base: O.leg, deep: O.dark, light: O.base, hair: (_p, r) => (r < 0.55 ? O.dark : r < 0.85 ? O.leg : O.base) };

/** The trunk's half width, neck to rump: long and low, fullest behind. */
const TRUNK: readonly (readonly [number, number])[] = [[15, 6.2], [8, 9.4], [0, 11.4], [-9, 12.8], [-17, 12.6], [-23, 10], [-28.5, 0]];

interface Spec {
  readonly sx: number;
  readonly sy: number;
  readonly bend: number;
  readonly head: Pt;
  readonly legs: readonly [LegKey, LegKey, LegKey, LegKey];
  /** The tail from the rump, ending in a curl to the `curl` side. */
  readonly tail: readonly Pt[];
  readonly curl: number;
}

const FORE = { fwd: leg(pt(9, 5.5), pt(13, 9.5), pt(20, 10.6)), back: leg(pt(7, 5.5), pt(4, 10), pt(0, 11.8)) };
const HIND = { fwd: leg(pt(-15, 6.5), pt(-10, 11.5), pt(-5, 13.2)), back: leg(pt(-19, 6.5), pt(-24, 11.2), pt(-31, 11.4)) };

function walk(k: 1 | -1): Spec {
  const a = k === 1;
  return {
    sx: 1, sy: 1, bend: 0.8 * k, head: pt(21, 0.8 * k),
    legs: [a ? HIND.fwd : HIND.back, a ? HIND.back : HIND.fwd, a ? FORE.back : FORE.fwd, a ? FORE.fwd : FORE.back],
    tail: cub(pt(-25, 0), pt(-34, -1 * k), pt(-42, -6 * k), pt(-50, -6 * k), 16), curl: -k,
  };
}

const SPECS: Readonly<Record<Pose, Spec>> = {
  walk0: walk(1),
  walk1: walk(-1),
  run0: {
    sx: 0.94, sy: 1.05, bend: 0, head: pt(20, 0),
    legs: [leg(pt(-14, 6.5), pt(-7, 12.5), pt(0, 11.5)), leg(pt(-14, 6.5), pt(-6, 12), pt(1, 10.5)), leg(pt(7, 5.5), pt(3, 10.5), pt(-3, 10)), leg(pt(7, 5.5), pt(4, 10), pt(-2, 9)), ],
    tail: cub(pt(-24, 0), pt(-34, 0), pt(-43, 2), pt(-51, 1), 16), curl: 1,
  },
  run1: {
    sx: 1.06, sy: 0.93, bend: 0, head: pt(23, 0),
    legs: [leg(pt(-19, 6.5), pt(-28, 11), pt(-39, 9.5)), leg(pt(-19, 6.5), pt(-27, 10.5), pt(-38, 8)), leg(pt(10, 5.5), pt(19, 9.5), pt(30, 8.5)), leg(pt(10, 5.5), pt(18, 9), pt(29, 7))],
    tail: cub(pt(-27, 0), pt(-37, 0), pt(-45, -2), pt(-53, -1), 16), curl: -1,
  },
  bite: {
    sx: 1.03, sy: 0.98, bend: 0, head: pt(23, 0),
    legs: [leg(pt(-18, 6.5), pt(-22, 12), pt(-29, 12.5)), leg(pt(-18, 6.5), pt(-21, 11.5), pt(-28, 11.5)), leg(pt(10, 5.5), pt(15, 11), pt(21, 14)), leg(pt(10, 5.5), pt(15, 10.5), pt(22, 13))],
    tail: cub(pt(-26, 0), pt(-35, 1), pt(-43, 5), pt(-50, 4), 16), curl: 1,
  },
};

/** The spine with its tip curled round, prehensile, to one side. */
function curled(spine: readonly Pt[], side: number): Pt[] {
  const n = spine.length - 1;
  const e = spine[n]!;
  const p = spine[n - 1]!;
  let a = Math.atan2(e.y - p.y, e.x - p.x);
  let q = e;
  const out = [...spine];
  for (let i = 0; i < 9; i++) {
    a += side * 0.42;
    q = pt(q.x + Math.cos(a) * 1.25, q.y + Math.sin(a) * 1.25);
    out.push(q);
  }
  return out;
}

/** The bare tail: furred grey at the root, then dark, paling to pink, ringed with fine scales, a few bristles. */
function paintTail(d: Draw, spine: readonly Pt[]): Pt[] {
  const { pen } = d;
  const n = spine.length - 1;
  const w = (u: number): number => 5.6 * (1 - 0.8 * u) + 0.4;
  const { shape, top, bot } = ribbon(spine, w);
  pen.fill(shape, PAPER_FILL, 1);
  // Colour along it: segment by segment from the dark root to the pink.
  for (let i = 0; i < n; i++) {
    const u = i / n;
    const seg = [top[i]!, top[i + 1]!, bot[i + 1]!, bot[i]!];
    const c = u < 0.38 ? mix(O.tailBase, O.tail, Math.max(0, (u - 0.18) / 0.2) ** 1.5) : O.tail;
    pen.fill(seg, c, 1);
  }
  pen.clipped(shape, () => {
    pen.crescent(shape, pt(-0.8, -1.2), () => pen.fill(shape, O.tailDeep, 0.5));
    pen.hair(spine.map((p, i) => pt((p.x + top[i]!.x) / 2 - 0.1, (p.y + top[i]!.y) / 2 - 0.2)), 0.6, PAPER_FILL, 0.45);
    for (let i = 3; i < n - 1; i++) {
      const a = top[i]!;
      const b = bot[i]!;
      const m = pt((a.x + b.x) / 2 - (b.y - a.y) * 0.15, (a.y + b.y) / 2 + (b.x - a.x) * 0.15);
      pen.hair([a, m, b], 0.18, i / n < 0.35 ? '#1d1a19' : O.tailDeep, 0.55);
    }
  });
  pen.stroke(closed(shape), 0.55, d.ink, 0.9, false);
  return shape;
}

/** A pale pink foot: five splayed toes (the hind foot's thumb set apart, pointing in). */
function foot(d: Draw, l: Leg): void {
  const u = pt(Math.cos(l.ang), Math.sin(l.ang));
  const sole = ellipseAt(l.c.x + u.x * 1.2, l.c.y + u.y * 1.2, l.front ? 2 : 2.8, 1.9, l.ang, 14);
  d.pen.fill(sole, O.foot, 1);
  d.pen.clipped(sole, () => d.pen.crescent(sole, pt(-0.4, -0.6), () => d.pen.fill(sole, O.footDeep, 0.6)));
  d.pen.stroke(closed(sole), 0.4, d.ink, 0.9, false);
  const base = pt(l.c.x + u.x * (l.front ? 2.2 : 3), l.c.y + u.y * (l.front ? 2.2 : 3));
  if (l.front) fingers(d, base, l.ang, 2, [1.8, 2.3, 2.5, 2.3, 1.8], 0.9, O.foot, O.deep);
  else {
    fingers(d, base, l.ang + l.side * 0.15, 1.3, [2, 2.4, 2.4, 2], 0.95, O.foot, O.deep);
    // The thumb, clawless, turned in towards the body.
    fingers(d, pt(l.c.x, l.c.y), l.ang - l.side * 1.6, 0, [2.2], 1, O.foot, O.foot);
  }
}

function paintLeg(d: Draw, l: Leg, k: number): void {
  paintFur(d, LEG_PELT, { shape: l.limb, dir: (p) => Math.atan2(l.c.y - p.y, l.c.x - p.x), n: 110, len: 1.9, seed: 8320 + k, tuft: 0.9, line: 0.6 });
  foot(d, l);
}

/** The coat: grizzled grey, darker over the shoulders and down to the legs, long white guard hairs over all. */
function paintBody(d: Draw, s: Spec, shape: readonly Pt[]): void {
  const lie = (p: Pt): number => Math.atan2(p.y * 0.05, -1) + Math.sign(p.y) * Math.min(0.9, Math.abs(p.y) / 22) + Math.PI;
  paintFur(d, PELT, {
    shape,
    dir: lie,
    wet: () => {
      glaze(d, -6 * s.sx, 0, 22 * s.sx, 6 * s.sy, 0, O.deep, 0.35);
      glaze(d, 8 * s.sx, 0, 8 * s.sx, 9 * s.sy, 0, O.deep, 0.3);
      for (const side of [-1, 1]) glaze(d, -6 * s.sx, side * 11 * s.sy, 18 * s.sx, 3, 0, O.deep, 0.35);
      glaze(d, -10 * s.sx, -4 * s.sy, 14 * s.sx, 5, 0, O.light, 0.5);
    },
    over: () => clumps(d, shape, lie, 170, 8303, 4.8, O.dark, O.white, (p) => 0.3 + 0.3 * Math.min(1, Math.abs(p.y) / 10)),
    n: 1150, len: 3.4, seed: 8302, tuft: 1.9, line: 0.8,
  });
}

function draw(d: Draw, pose: Pose): void {
  const s = SPECS[pose];
  d.pen.ctx.translate(3, 0);
  const trunk = trunkShape(TRUNK.map(([x, w]) => [x * s.sx, w * s.sy] as const), s.bend, 0.9);
  const legs = s.legs.map((k, i) => makeLeg(k, i % 2 === 0 ? 1 : -1, i >= 2, i >= 2 ? 4 : 4.8, i >= 2 ? 2.4 : 2.8));
  const head = opossumHead(s.head, pose === 'bite');
  const spine = curled(s.tail, s.curl);
  const air = pose === 'run1';
  softShadow(d, [ribbon(spine, () => 4).shape, trunk, head, ...legs.map((l) => l.limb)], air ? pt(4, 6) : pt(2.2, 3.2), air ? 0.12 : 0.17, 1.4);
  paintTail(d, spine);
  legs.forEach((l, i) => paintLeg(d, l, i));
  paintBody(d, s, trunk);
  d.pen.clipped(trunk, () => d.pen.fill(head.map((q) => pt(q.x + 1.4, q.y + 2.2)), O.deep, 0.3));
  paintOpossumHead(d, s.head, pose === 'bite');
}

export const OPOSSUM_ART: SpriteArt<Pose> = {
  frame: 120,
  res: 2,
  poses: ['walk0', 'walk1', 'run0', 'run1', 'bite'],
  draw,
};
