import { closed, cub, type Draw, pt } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import type { SpriteArt } from '../types';
import { mix } from '../wash';
import { beadEye, castShadow, type Coat, ellipseAt, furEdge, glaze, hairs, sizeOf } from '../critters/preyKit';
import { forePaw, hindFoot, KRAT, paintTail, sandSpray, shin, zzz } from './dunesCrittersRatParts';

/**
 * The kangaroo rat, seen from above facing +x: a big-headed, buff-orange
 * desert rodent about 28 long, finely ticked dark down the back, a white
 * stripe across each hip, big dark eyes with a white spot by each, small
 * round ears, long whiskers; tiny forepaws, and huge white-topped hind feet
 * it bounds on; a tail longer than its body, striped dark and white and
 * ending in a brush. It sits up on its big feet ('idle'), bounds with its
 * legs stretched out behind ('hop'), turns its back and kicks sand
 * ('kick'), and curls up asleep ('sleep').
 */
type Pose = 'idle' | 'hop' | 'kick' | 'sleep';

const R = KRAT;
const LEN = 28;
const WIDE = 17;

interface Spec {
  readonly sx: number;
  readonly sy: number;
  /** The body's sideways curl (both ends towards +y; a sleeper curls right round). */
  readonly bend: number;
  readonly shift: Pt;
  readonly tail: (b: Frame) => Pt[];
  readonly air: boolean;
  readonly shut: boolean;
}

/** Points on the body: u from rump (0) to nose (1), v across (−1..1). */
interface Frame {
  readonly at: (u: number, v: number) => Pt;
  readonly spine: Pt[];
  readonly half: (u: number) => number;
}

const KNOTS: readonly (readonly [number, number])[] = [
  [0.1, 0.86], [0.22, 1], [0.36, 0.96], [0.5, 0.8], [0.58, 0.74], [0.68, 0.84], [0.77, 0.8], [0.86, 0.6], [0.94, 0.34],
];

/** The half width (share of the widest): a round rump, broad haunches, a short neck, the broad skull and a neat snout. */
function profile(u: number): number {
  if (u <= 0) return 0;
  if (u < 0.1) return 0.86 * Math.sqrt(Math.max(0, 1 - ((0.1 - u) / 0.1) ** 2));
  if (u >= 0.94) return 0.34 * Math.sqrt(Math.max(0, 1 - ((u - 0.94) / 0.06) ** 2));
  for (let i = 1; i < KNOTS.length; i++) {
    const [u1, w1] = KNOTS[i]!;
    const [u0, w0] = KNOTS[i - 1]!;
    if (u <= u1) return w0 + (w1 - w0) * (1 - Math.cos((Math.PI * (u - u0)) / (u1 - u0))) * 0.5;
  }
  return 0;
}

function frameOf(s: Spec): Frame {
  const L = LEN * s.sx;
  const c = (u: number): Pt => pt(s.shift.x - L / 2 + u * L, s.shift.y + s.bend * (2 * u - 1) ** 2);
  const half = (u: number): number => (WIDE / 2) * s.sy * profile(u);
  const at = (u: number, v: number): Pt => {
    const a = c(Math.max(0, u - 0.01));
    const b = c(Math.min(1, u + 0.01));
    const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const p = c(u);
    return pt(p.x - ((b.y - a.y) / l) * v * half(u), p.y + ((b.x - a.x) / l) * v * half(u));
  };
  return { at, half, spine: Array.from({ length: 41 }, (_, i) => c(i / 40)) };
}

function outline(b: Frame, n = 36): Pt[] {
  const us = Array.from({ length: n + 1 }, (_, i) => (1 - Math.cos((Math.PI * i) / n)) / 2);
  return [...[...us].reverse().map((u) => b.at(u, 1)), ...us.slice(1, -1).map((u) => b.at(u, -1))];
}

/** Where a point lies on the body: its u along and v across. */
function locate(b: Frame, p: Pt): { u: number; v: number; ang: number } {
  let best = 0;
  let bd = Infinity;
  b.spine.forEach((q, i) => {
    const dd = (q.x - p.x) ** 2 + (q.y - p.y) ** 2;
    if (dd < bd) [bd, best] = [dd, i];
  });
  const u = best / 40;
  const q = b.spine[best]!;
  const a = b.spine[Math.max(0, best - 1)]!;
  const c = b.spine[Math.min(40, best + 1)]!;
  const ang = Math.atan2(c.y - a.y, c.x - a.x);
  const side = Math.sign((c.x - a.x) * (p.y - q.y) - (c.y - a.y) * (p.x - q.x)) || 1;
  return { u, v: (side * Math.sqrt(bd)) / Math.max(0.6, b.half(u)), ang };
}

function coatOf(b: Frame): Coat {
  return {
    dir: (p) => {
      const l = locate(b, p);
      return l.ang + Math.PI - l.v * 0.5;
    },
    color: (p, r) => {
      const { u, v } = locate(b, p);
      const av = Math.abs(v);
      // The white hip stripe, slanting back across each haunch towards the tail.
      if (av > 0.55 && Math.abs(u - (0.1 + (av - 0.55) * 0.5)) < 0.085) return r < 0.8 ? R.white : R.pale;
      if (av > 0.86) return r < 0.5 ? R.pale : R.fur;
      if (av < 0.42 && u < 0.9) return r < 0.22 ? R.tick : r < 0.62 ? R.back : r < 0.9 ? R.fur : R.warm;
      return r < 0.1 ? R.tick : r < 0.68 ? R.fur : r < 0.86 ? R.warm : R.pale;
    },
  };
}

function paintBody(d: Draw, b: Frame, shape: readonly Pt[]): void {
  const { pen } = d;
  const size = sizeOf(shape);
  const g = (u: number, v: number, rx: number, ry: number, col: string, a: number): void => {
    const p = b.at(u, v);
    glaze(d, p.x, p.y, rx, ry, 0, col, a);
  };
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, R.fur, 0.9);
  pen.clipped(shape, () => {
    g(0.4, 0, LEN * 0.36, b.half(0.4) * 0.6, R.back, 0.6);
    g(0.5, -0.3, LEN * 0.2, b.half(0.5) * 0.4, R.warm, 0.4);
    for (const s of [-1, 1]) {
      pen.hair([b.at(0.3, s * 0.62), b.at(0.2, s * 0.82), b.at(0.1, s * 0.9)], 1.5, R.white, 0.85);
      g(0.82, s * 0.36, 1.3, 1, R.white, 0.85);
      g(0.92, s * 0.5, 1.6, 1.1, R.deep, 0.5);
      g(0.6, s * 0.62, 1.4, 1.1, R.white, 0.7);
    }
    g(0.95, 0, 2.6, 2, mix(R.pale, PAPER_FILL, 0.3), 0.6);
  });
  hairs(d, shape, coatOf(b), 900, 5401, 1.6, 0.28, 0.6);
  pen.clipped(shape, () => {
    for (const s of [-1, 1]) {
      pen.hair([b.at(0.32, s * 0.98), b.at(0.24, s * 0.8), b.at(0.12, s * 0.6)], 1.3, R.white, 0.6);
      pen.hair([b.at(0.3, s * 1.02), b.at(0.215, s * 0.84), b.at(0.1, s * 0.66)], 0.3, R.deep, 0.35);
    }
    g(0.42, -0.4, LEN * 0.24, b.half(0.42) * 0.4, PAPER_FILL, 0.3);
    g(0.76, -0.3, LEN * 0.1, b.half(0.76) * 0.4, PAPER_FILL, 0.25);
    pen.crescent(shape, pt(-size * 0.06, -size * 0.11), () => pen.fill(shape, R.deep, 0.34));
    pen.crescent(shape, pt(-size * 0.025, -size * 0.05), () => pen.fill(shape, R.deep, 0.2));
  });
  const ink: Coat = { dir: coatOf(b).dir, color: () => d.ink };
  pen.crescent(shape, pt(-size * 0.07, -size * 0.13), () => hairs(d, shape, ink, 300, 5406, 1.7, 0.2, 0.45));
  furEdge(d, shape, 0.6, 5407, 1, 1, 0.88);
}

function ear(d: Draw, c: Pt, s: number): void {
  const { pen } = d;
  const rim = ellipseAt(c.x, c.y, 2, 2.3, s * 0.4, 18);
  castShadow(d, rim, pt(0.6, 0.9), 0.22);
  pen.fill(rim, PAPER_FILL, 1);
  pen.fill(rim, R.fur, 0.9);
  const inner = ellipseAt(c.x + 0.15, c.y + s * 0.2, 1.25, 1.55, s * 0.4, 16);
  pen.fill(inner, mix(R.pink, R.deep, 0.35), 0.8);
  pen.clipped(inner, () => pen.crescent(inner, pt(-0.3, -0.45), () => pen.fill(inner, R.deep, 0.5)));
  pen.stroke(closed(rim), 0.45, d.ink, 0.9);
}

function face(d: Draw, b: Frame, shut: boolean): void {
  const { pen } = d;
  for (const s of [-1, 1]) {
    ear(d, b.at(0.63, s * 0.84), s);
    const e = b.at(0.8, s * 0.7);
    if (shut) {
      pen.hair([b.at(0.77, s * 0.58), b.at(0.8, s * 0.76), b.at(0.84, s * 0.66)], 0.5, d.ink, 0.9);
      pen.hair([b.at(0.79, s * 0.8), pt(b.at(0.79, s * 0.8).x - 0.4, b.at(0.79, s * 0.8).y + s * 0.8)], 0.3, d.ink, 0.7);
    } else {
      glaze(d, e.x, e.y, 2.6, 2.1, 0, R.deep, 0.5);
      beadEye(d, e, 1.55);
    }
  }
  const tip = b.at(1, 0);
  const nose = ellipseAt(tip.x - 0.6, tip.y, 0.9, 1.05, 0, 12);
  pen.fill(nose, R.pink, 1);
  pen.dot(tip.x - 0.8, tip.y - 0.4, 0.3, PAPER_FILL, 0.9);
  pen.hair(closed(nose), 0.3, d.ink, 0.85);
  for (const s of [-1, 1]) {
    const root = b.at(0.93, s * 0.5);
    for (const [a, l] of [[0.2, 9.5], [0.55, 9], [0.95, 8], [1.35, 6.5]] as const) {
      const ang = Math.atan2(b.at(1, 0).y - b.at(0.9, 0).y, b.at(1, 0).x - b.at(0.9, 0).x) + s * a;
      const end = pt(root.x + Math.cos(ang) * l, root.y + Math.sin(ang) * l);
      const mid = pt(root.x + Math.cos(ang - s * 0.15) * l * 0.55, root.y + Math.sin(ang - s * 0.15) * l * 0.55);
      pen.hair([root, mid, end], 0.2, d.ink, 0.5);
    }
  }
}

/** Tails, from the rump, built on the body. */
const rumpOf = (b: Frame): Pt => b.at(0.02, 0);
const SPECS: Readonly<Record<Pose, Spec>> = {
  idle: {
    sx: 0.86, sy: 1.1, bend: 0, shift: pt(10, -4), air: false, shut: false,
    tail: (b) => {
      const r = rumpOf(b);
      return cub(r, pt(r.x - 14, r.y + 1), pt(r.x - 22, r.y + 12), pt(r.x - 12, r.y + 24), 30);
    },
  },
  hop: {
    sx: 1.16, sy: 0.9, bend: 0, shift: pt(14, -3), air: true, shut: false,
    tail: (b) => {
      const r = rumpOf(b);
      return cub(r, pt(r.x - 14, r.y + 0.5), pt(r.x - 24, r.y + 7), pt(r.x - 38, r.y + 6), 30);
    },
  },
  kick: {
    sx: 1.02, sy: 0.98, bend: 0, shift: pt(16, 0), air: false, shut: false,
    tail: (b) => {
      const r = rumpOf(b);
      return cub(r, pt(r.x - 8, r.y - 2), pt(r.x - 12, r.y - 14), pt(r.x - 4, r.y - 26), 30);
    },
  },
  sleep: {
    sx: 0.9, sy: 1.12, bend: 7, shift: pt(3, -5), air: false, shut: true,
    tail: (b) => {
      const r = rumpOf(b);
      const n = b.at(0.96, 0);
      return cub(r, pt(r.x - 6, r.y + 8), pt(r.x + 4, r.y + 18), pt(n.x + 2, n.y + 9), 30);
    },
  },
};

function feet(d: Draw, b: Frame, pose: Pose): void {
  for (const s of [-1, 1]) {
    if (pose === 'idle') {
      hindFoot(d, b.at(0.06, s * 1.05), s * 0.2, 13, s);
      forePaw(d, b.at(0.9, s * 0.42), s * 0.3);
    } else if (pose === 'hop') {
      const heel = b.at(-0.12, s * 0.5);
      shin(d, b.at(0.12, s * 0.62), heel);
      hindFoot(d, heel, Math.PI - s * 0.08, 13.5, s);
    } else if (pose === 'kick') {
      const heel = b.at(-0.06, s * 0.95);
      shin(d, b.at(0.12, s * 0.7), heel);
      hindFoot(d, heel, Math.PI - s * 0.55, 13, s);
      forePaw(d, b.at(0.93, s * 0.44), s * 0.25);
    } else {
      hindFoot(d, b.at(0.3, s * 0.6), s < 0 ? -0.35 : 0.3, 9, s);
    }
  }
}

function draw(d: Draw, pose: Pose): void {
  const s = SPECS[pose];
  const b = frameOf(s);
  const shape = outline(b);
  const tail = s.tail(b);
  const lift = s.air ? pt(4.5, 6.5) : pt(1.2, 1.9);
  castShadow(d, shape.map((p) => pt(p.x + lift.x, p.y + lift.y)), pt(0, 0), s.air ? 0.1 : 0.17);
  if (pose === 'kick') sandSpray(d, b.at(-0.25, 0), 1.5, 26);
  paintTail(d, tail, lift);
  feet(d, b, pose);
  paintBody(d, b, shape);
  face(d, b, s.shut);
  if (pose === 'sleep') zzz(d, pt(b.at(0.85, 0).x + 4, b.at(0.85, 0).y - 12));
}

export const KANGAROO_RAT_ART: SpriteArt<Pose> = {
  frame: 88,
  res: 3,
  poses: ['idle', 'hop', 'kick', 'sleep'],
  draw,
};
