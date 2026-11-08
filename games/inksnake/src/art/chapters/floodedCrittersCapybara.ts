import { type Draw, pt } from '../kit';
import type { Pt } from '../pen';
import type { SpriteArt } from '../types';
import { ellipseAt, glaze } from '../critters/preyKit';
import { clumps, fingers, leg, type Leg, type LegKey, makeLeg, paintFur, type Pelt, softShadow, trunkShape } from './barrensCrittersBeast';
import { CAPY, capyHead, type HeadDo, paintCapyHead } from './floodedCrittersCapybaraHead';

/**
 * The capybara from above facing +x: the world's biggest rodent, a blunt
 * barrel about 70 long with no tail at all, in a coarse, sparse coat of
 * reddish-brown hair darker down the back, short legs mostly hidden under
 * it (partly webbed toes, blunt nails), and the big boxy head. It grazes
 * ('graze', head down in the grass), ambles ('walk0', 'walk1'), drinks at
 * the water's edge ('drink', nose to the water) and bolts ('run0' gathered,
 * 'run1' stretched out).
 */
type Pose = 'graze' | 'walk0' | 'walk1' | 'drink' | 'run0' | 'run1';

const C = CAPY;

const PELT: Pelt = { base: C.base, deep: C.deep, light: C.light, hair: (_p, r) => (r < 0.18 ? C.dark : r < 0.32 ? C.deep : r < 0.78 ? C.base : r < 0.92 ? C.warm : C.pale) };
const LEG_PELT: Pelt = { base: C.face, deep: C.dark, light: C.base, hair: (_p, r) => (r < 0.5 ? C.dark : C.base) };

/** The trunk's half width from the neck back to the rump: a barrel, the rump blunt and round, no tail. */
const TRUNK: readonly (readonly [number, number])[] = [[14, 10.5], [8, 14.2], [-2, 16.6], [-16, 17.6], [-28, 17], [-36, 12.5], [-40, 0]];

interface Spec {
  readonly sx: number;
  readonly sy: number;
  readonly bend: number;
  readonly head: Pt;
  readonly act: HeadDo;
  /** Hind +y, hind −y, fore +y, fore −y. */
  readonly legs: readonly [LegKey, LegKey, LegKey, LegKey];
}

const FORE = { fwd: leg(pt(8, 9), pt(12, 13.5), pt(17, 15)), back: leg(pt(6, 9), pt(4, 13.5), pt(1, 16)), mid: leg(pt(7, 9), pt(9, 13.5), pt(10, 15.5)) };
const HIND = { fwd: leg(pt(-26, 11), pt(-22, 15.5), pt(-18, 17.6)), back: leg(pt(-29, 11), pt(-33, 15), pt(-37, 15.5)), mid: leg(pt(-27, 11), pt(-27, 15.5), pt(-25, 17.4)) };

function walk(k: 1 | -1, act: HeadDo, head: Pt): Spec {
  const a = k === 1;
  return {
    sx: 1, sy: 1, bend: 0.9 * k, head, act,
    legs: [a ? HIND.fwd : HIND.back, a ? HIND.back : HIND.fwd, a ? FORE.back : FORE.fwd, a ? FORE.fwd : FORE.back],
  };
}

const SPECS: Readonly<Record<Pose, Spec>> = {
  graze: { ...walk(1, 'graze', pt(19, 1.2)), bend: 0.4, legs: [HIND.mid, HIND.mid, FORE.fwd, FORE.mid] },
  walk0: walk(1, 'up', pt(19, 0.8)),
  walk1: walk(-1, 'up', pt(19, -0.8)),
  drink: { ...walk(1, 'drink', pt(19.5, 0)), bend: 0, legs: [HIND.mid, HIND.mid, FORE.fwd, FORE.fwd] },
  run0: {
    sx: 0.94, sy: 1.04, bend: 0, head: pt(18, 0), act: 'up',
    legs: [leg(pt(-24, 11), pt(-16, 15.5), pt(-9, 15)), leg(pt(-24, 11), pt(-15, 15), pt(-8, 14)), leg(pt(5, 9), pt(1, 13.5), pt(-5, 14.5)), leg(pt(5, 9), pt(2, 13), pt(-4, 13.5))],
  },
  run1: {
    sx: 1.04, sy: 0.95, bend: 0, head: pt(20.5, 0), act: 'up',
    legs: [leg(pt(-30, 11), pt(-37, 14.5), pt(-45, 13)), leg(pt(-30, 11), pt(-36, 14), pt(-44, 11.5)), leg(pt(9, 9), pt(16, 13.5), pt(24, 13.5)), leg(pt(9, 9), pt(15.5, 13), pt(23, 12))],
  },
};

/** A dark foot: partly webbed toes with blunt, hoof-like nails (four in front, three behind). */
function foot(d: Draw, l: Leg): void {
  const u = pt(Math.cos(l.ang), Math.sin(l.ang));
  const sole = ellipseAt(l.c.x + u.x * 1.4, l.c.y + u.y * 1.4, 2.8, 2.4, l.ang, 14);
  d.pen.fill(sole, C.foot, 1);
  d.pen.stroke([...sole, sole[0]!], 0.45, d.ink, 0.9, false);
  const base = pt(l.c.x + u.x * 2.6, l.c.y + u.y * 2.6);
  fingers(d, base, l.ang, l.front ? 1.3 : 1, l.front ? [2.4, 2.8, 2.8, 2.3] : [2.8, 3.2, 2.7], 1.5, C.foot, C.nail);
}

function paintLeg(d: Draw, l: Leg, k: number): void {
  paintFur(d, LEG_PELT, { shape: l.limb, dir: (p) => Math.atan2(l.c.y - p.y, l.c.x - p.x), n: 140, len: 2.2, seed: 9220 + k, tuft: 1, line: 0.65 });
  foot(d, l);
}

/** The coarse coat: the hair lying back, darker along the spine, rough and sparse enough to show the skin's tone between. */
function paintBody(d: Draw, s: Spec, shape: readonly Pt[]): void {
  const lie = (p: Pt): number => Math.PI + Math.sign(p.y) * Math.min(0.85, Math.abs(p.y) / 24) * (p.x > -30 ? 1 : 2.2);
  paintFur(d, PELT, {
    shape,
    dir: lie,
    wet: () => {
      glaze(d, -12 * s.sx, 0, 28 * s.sx, 8 * s.sy, 0, C.deep, 0.45);
      glaze(d, -14 * s.sx, -6 * s.sy, 16 * s.sx, 6, -0.1, C.light, 0.45);
      for (const side of [-1, 1]) glaze(d, -10 * s.sx, side * 17 * s.sy, 22 * s.sx, 3.5, 0, C.warm, 0.5);
      // Shoulders and haunches rounding under the coat.
      for (const side of [-1, 1]) {
        glaze(d, -28 * s.sx, side * 9 * s.sy - 1.5, 8, 6, side * 0.3, C.light, side < 0 ? 0.35 : 0.15);
        glaze(d, 4 * s.sx, side * 9 * s.sy - 1.2, 6, 5, side * 0.3, C.light, side < 0 ? 0.3 : 0.12);
      }
    },
    hair: (p, r) => {
      const v = Math.max(0, 1 - Math.abs(p.y) / (14 * s.sy));
      return r < 0.1 + 0.35 * v ? C.dark : PELT.hair(p, r);
    },
    over: () => clumps(d, shape, lie, 230, 9203, 5.2, C.dark, C.pale, (p) => 0.4 + 0.45 * Math.max(0, 1 - Math.abs(p.y) / (13 * s.sy))),
    n: 1500, len: 3.6, seed: 9202, tuft: 1.3, line: 0.9,
  });
}

function draw(d: Draw, pose: Pose): void {
  const s = SPECS[pose];
  d.pen.ctx.translate(1, 0);
  const trunk = trunkShape(TRUNK.map(([x, w]) => [x * s.sx, w * s.sy] as const), s.bend, 1);
  const legs = s.legs.map((k, i) => makeLeg(k, i % 2 === 0 ? 1 : -1, i >= 2, i >= 2 ? 6 : 7, i >= 2 ? 4 : 4.4));
  const head = capyHead(s.head, s.act);
  const air = pose === 'run1';
  softShadow(d, [trunk, head, ...legs.map((l) => l.limb)], air ? pt(4.5, 6.5) : pt(2.6, 3.8), air ? 0.13 : 0.18, 1.6);
  legs.forEach((l, i) => paintLeg(d, l, i));
  paintBody(d, s, trunk);
  // The head's shadow on the shoulders.
  d.pen.clipped(trunk, () => d.pen.fill(head.map((q) => pt(q.x + 1.6, q.y + 2.4)), C.deep, 0.35));
  paintCapyHead(d, s.head, s.act);
}

export const CAPYBARA_ART: SpriteArt<Pose> = { frame: 110, res: 2, poses: ['graze', 'walk0', 'walk1', 'drink', 'run0', 'run1'], draw };
