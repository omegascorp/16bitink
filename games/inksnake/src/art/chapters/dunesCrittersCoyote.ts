import { closed, cub, type Draw, pt } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import type { SpriteArt } from '../types';
import { mix } from '../wash';
import { ellipseAt, glaze } from '../critters/preyKit';
import { tube, tufted } from '../critters/tomcatParts';
import { along, clumps, grizzle, leg, type Leg, type LegKey, makeLeg, paintFur, type Pelt, resample, softShadow, trunkShape } from './barrensCrittersBeast';
import { COYOTE, type CoyoteHead, coyoteHeadShape, paintCoyoteHead } from './dunesCrittersCoyoteHead';

/**
 * The coyote, seen from above facing +x: a lean, long-legged wild dog
 * about 76 from nose to rump, narrow-chested, in a grizzled coat of grey,
 * buff and black-tipped hairs with a darker saddle down the back and
 * shoulders, tawny legs with a dark line down the front of the forelegs,
 * and a bushy tail with a dark spot near its root and a black tip, held
 * low behind. It trots with its legs in diagonal pairs ('walk0', 'walk1'),
 * gallops ('run0' gathered, 'run1' stretched out), and lunges with its jaws
 * open ('bite').
 */
type Pose = 'walk0' | 'walk1' | 'run0' | 'run1' | 'bite';

const K = COYOTE;
const PELT: Pelt = { base: K.base, deep: K.deep, light: K.light, hair: (_p, r) => grizzle(K.dark, K.base, K.light, K.tawny, 0.3)(r) };
const LEG_PELT: Pelt = { base: K.tawny, deep: K.deep, light: K.light, hair: (_p, r) => (r < 0.12 ? K.saddle : r < 0.6 ? K.tawny : r < 0.85 ? K.base : K.cream) };

/** The trunk's half width from the neck back to the rump: lean, a deep chest, a tucked waist. */
const TRUNK: readonly (readonly [number, number])[] = [[20, 5.2], [14, 7.8], [6, 8.6], [-4, 7], [-12, 7.6], [-19, 7.8], [-25, 5.8], [-29, 0]];

interface Spec {
  readonly sx: number;
  readonly sy: number;
  readonly bend: number;
  readonly head: CoyoteHead;
  /** Hind +y, hind −y, fore +y, fore −y. */
  readonly legs: readonly [LegKey, LegKey, LegKey, LegKey];
  readonly tail: readonly Pt[];
  readonly air: boolean;
}

const FORE = { fwd: leg(pt(14, 4.5), pt(21, 8), pt(27.5, 9.6)), back: leg(pt(12, 4.5), pt(7, 7), pt(1, 8)) };
const HIND = { fwd: leg(pt(-18, 5), pt(-12, 7.5), pt(-6, 8.4)), back: leg(pt(-21, 5), pt(-29, 7.5), pt(-37, 8)) };

const head = (x: number, y: number, bite = false): CoyoteHead => ({ C: pt(x, y), snout: bite ? 18.5 : 18, ears: bite ? 'back' : 'up', bite });

function walk(k: 1 | -1): Spec {
  const a = k === 1;
  return {
    sx: 1, sy: 1, bend: 0.7 * k, head: head(26, 0.5 * k), air: false,
    legs: [a ? HIND.fwd : HIND.back, a ? HIND.back : HIND.fwd, a ? FORE.back : FORE.fwd, a ? FORE.fwd : FORE.back],
    tail: cub(pt(-26, 0), pt(-34, 0.5), pt(-42, 3 * k), pt(-54, 4.5 * k), 16),
  };
}

const SPECS: Readonly<Record<Pose, Spec>> = {
  walk0: walk(1),
  walk1: walk(-1),
  run0: {
    sx: 0.92, sy: 1.05, bend: 0, head: head(24, 0), air: false,
    legs: [leg(pt(-16, 5), pt(-8, 8.5), pt(1, 8.6)), leg(pt(-16, 5), pt(-7, 8.2), pt(2, 8)), leg(pt(10, 4.5), pt(4, 7.6), pt(-4, 8)), leg(pt(10, 4.5), pt(5, 7.3), pt(-3, 7.4))],
    tail: cub(pt(-25, 0), pt(-34, 0), pt(-42, -2), pt(-52, -1), 16),
  },
  run1: {
    sx: 1.08, sy: 0.93, bend: 0, head: head(28, 0), air: true,
    legs: [leg(pt(-20, 5), pt(-32, 8), pt(-44, 7.5)), leg(pt(-20, 5), pt(-31, 7.6), pt(-43, 6.6)), leg(pt(13, 4.5), pt(26, 9), pt(37, 10.4)), leg(pt(13, 4.5), pt(25, 8.6), pt(36, 9.6))],
    tail: cub(pt(-29, 0), pt(-38, 0), pt(-46, 2), pt(-56, 1), 16),
  },
  bite: {
    sx: 1.06, sy: 0.96, bend: 0, head: head(27, 0, true), air: false,
    legs: [leg(pt(-20, 5), pt(-29, 8.5), pt(-38, 9.2)), leg(pt(-20, 5), pt(-28, 8.2), pt(-37, 8.4)), leg(pt(13, 4.5), pt(23, 9), pt(32, 10.8)), leg(pt(13, 4.5), pt(22, 8.7), pt(31, 10))],
    tail: cub(pt(-28, 0), pt(-37, -0.5), pt(-45, -3), pt(-55, -2.5), 16),
  },
};

/** The bushy tail: grizzled, a dark spot near its root, darkening to a black tip, the fur lying back along it. */
function paintTail(d: Draw, spine: readonly Pt[]): Pt[] {
  const n = spine.length - 1;
  const w = (u: number): number => 4.5 + 6 * Math.sin(Math.PI * Math.min(1, 0.15 + u * 0.85)) ** 0.7;
  const shape = tufted(resample(tube(spine, w), 1.5), 0.8, 3);
  const u = (p: Pt): number => along(spine, p).i / n;
  paintFur(d, PELT, {
    shape,
    dir: (p) => along(spine, p).ang + Math.PI,
    wet: () => {
      const spot = spine[Math.round(n * 0.18)]!;
      glaze(d, spot.x, spot.y, 3, 2.2, 0, K.dark, 0.8);
      for (let i = Math.round(n * 0.78); i <= n; i++) glaze(d, spine[i]!.x, spine[i]!.y, 3.4, 4.2, 0, K.dark, 0.5);
      for (let i = 2; i < n * 0.75; i += 2) glaze(d, spine[i]!.x, spine[i]!.y, 3, 2, 0, K.saddle, 0.35);
      for (const s of [-1, 1]) glaze(d, spine[Math.round(n * 0.5)]!.x, spine[Math.round(n * 0.5)]!.y + s * 4, 10, 2, 0, K.tawny, 0.35);
    },
    hair: (p, r) => {
      const t = u(p);
      if (t > 0.84) return r < 0.8 ? K.dark : K.deep;
      if (Math.abs(t - 0.18) < 0.06) return r < 0.6 ? K.dark : K.saddle;
      return grizzle(K.dark, K.base, K.light, K.tawny, 0.28)(r);
    },
    n: 520, len: 3.2, seed: 6501, tuft: 1.6,
  });
  return shape;
}

/** A neat dog's paw: four toe pads showing as knuckles, claws at the front. */
function paw(d: Draw, l: Leg): void {
  const { pen } = d;
  const u = pt(Math.cos(l.ang), Math.sin(l.ang));
  const v = pt(-u.y, u.x);
  const c = pt(l.c.x + u.x * 1.2, l.c.y + u.y * 1.2);
  const p = ellipseAt(c.x, c.y, 2.9, 1.75, l.ang, 16);
  pen.fill(p, PAPER_FILL, 1);
  pen.fill(p, mix(K.tawny, K.deep, 0.25), 0.95);
  pen.clipped(p, () => {
    glaze(d, c.x - 0.6, c.y - 0.8, 1.8, 1.2, l.ang, K.light, 0.5);
    pen.crescent(p, pt(-0.5, -0.8), () => pen.fill(p, K.deep, 0.5));
  });
  for (const o of [-1.05, -0.35, 0.35, 1.05]) {
    const b = pt(c.x + u.x * 1.4 + v.x * o, c.y + u.y * 1.4 + v.y * o);
    pen.hair([pt(b.x - u.x * 1.2, b.y - u.y * 1.2), b], 0.25, d.ink, 0.6);
    pen.hair([b, pt(b.x + u.x * 1.1, b.y + u.y * 1.1)], 0.35, K.dark, 0.9);
  }
  pen.stroke(closed(p), 0.5, d.ink, 0.9, false);
}

function paintLeg(d: Draw, l: Leg, k: number): void {
  paintFur(d, LEG_PELT, {
    shape: l.limb,
    dir: (p) => Math.atan2(l.c.y - p.y, l.c.x - p.x),
    wet: () => {
      // The dark line down the front of a foreleg.
      if (l.front) d.pen.hair(l.spine.slice(3, -2).map((p) => pt(p.x + 0.5, p.y - l.side * 0.9)), 1.1, K.saddle, 0.7);
    },
    n: 130, len: 1.9, seed: 6520 + k, tuft: 0.8, line: 0.6,
  });
  paw(d, l);
}

/** The trunk: grizzled, the darker saddle down the back and over the shoulders, paler low on the flanks. */
function paintBody(d: Draw, s: Spec, shape: readonly Pt[]): void {
  const lie = (p: Pt): number => Math.atan2(p.y * 0.05, -1) + Math.sign(p.y) * Math.min(0.85, Math.abs(p.y) / 18) + Math.PI;
  paintFur(d, PELT, {
    shape,
    dir: lie,
    wet: () => {
      glaze(d, -4 * s.sx, 0, 24 * s.sx, 5.5 * s.sy, 0, K.saddle, 0.7);
      glaze(d, 11 * s.sx, 0, 6 * s.sx, 9 * s.sy, 0, K.saddle, 0.45);
      for (const side of [-1, 1]) {
        glaze(d, -6 * s.sx, side * 7 * s.sy, 20 * s.sx, 2.8, 0, K.tawny, 0.6);
        glaze(d, 4 * s.sx, side * 8.6 * s.sy, 8 * s.sx, 2, 0, K.cream, 0.45);
        glaze(d, -18 * s.sx - 1, side * 5.5 * s.sy - 1, 6, 3.6, side * 0.3, K.light, side < 0 ? 0.4 : 0.18);
        glaze(d, 10 * s.sx - 1, side * 5 * s.sy - 1, 4.6, 3, side * 0.3, K.light, side < 0 ? 0.35 : 0.16);
      }
    },
    hair: (p, r) => {
      const v = Math.max(0, 1 - Math.abs(p.y) / (6.5 * s.sy));
      const dark = 0.06 + 0.4 * v;
      return r < dark ? K.dark : r < dark + 0.24 * (1 - v * 0.5) ? K.light : r < 0.88 ? K.base : K.tawny;
    },
    over: () => clumps(d, shape, lie, 100, 6503, 3, K.dark, K.light, (p) => 0.2 + 0.5 * Math.max(0, 1 - Math.abs(p.y) / (6 * s.sy))),
    n: 1100, len: 3, seed: 6502, tuft: 1.3, line: 0.8,
  });
}

/** A gallop's flying stretch: a whoosh of air past its flanks. */
function whoosh(d: Draw): void {
  for (const side of [-1, 1]) {
    for (const [y, x0, len, a] of [[13, -10, 18, 0.45], [15.5, -22, 14, 0.32]] as const) {
      const p = pt(x0, side * y);
      d.pen.hair([p, pt(p.x - len * 0.5, p.y + side * 0.5), pt(p.x - len, p.y + side * 1.4)], 0.6, d.ink, a);
    }
  }
}

function draw(d: Draw, pose: Pose): void {
  const s = SPECS[pose];
  const trunk = trunkShape(TRUNK.map(([x, w]) => [x * s.sx, w * s.sy] as const), s.bend, 0.45);
  const legs = s.legs.map((k, i) => makeLeg(k, i % 2 === 0 ? 1 : -1, i >= 2, i >= 2 ? 3.6 : 4.6, i >= 2 ? 2.1 : 2.4));
  const headOutline = coyoteHeadShape(s.head);
  d.pen.ctx.translate(5, 0);
  softShadow(d, [tube(s.tail as Pt[], () => 9), trunk, headOutline, ...legs.map((l) => l.limb)], s.air ? pt(4, 6) : pt(2.2, 3.2), s.air ? 0.12 : 0.17, 1.4);
  if (s.air) whoosh(d);
  paintTail(d, s.tail);
  legs.forEach((l, i) => paintLeg(d, l, i));
  paintBody(d, s, trunk);
  d.pen.clipped(trunk, () => d.pen.fill(headOutline.map((q) => pt(q.x + 1.4, q.y + 2.2)), K.deep, 0.35));
  paintCoyoteHead(d, s.head, headOutline);
}

export const COYOTE_ART: SpriteArt<Pose> = {
  frame: 120,
  res: 2,
  poses: ['walk0', 'walk1', 'run0', 'run1', 'bite'],
  draw,
};
