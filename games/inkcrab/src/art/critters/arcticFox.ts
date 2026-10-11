import { bezier, closed, cub, type Draw, edge, oval, pt, ribbon, shade, skin, TAU, tint } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { limb } from './limb';

/**
 * An Arctic fox (Vulpes lagopus) working the strandline, side-on and facing
 * right, walking with its nose down to the pebbles, following a smell. Built
 * for the cold: compact and round-backed, with short legs, a short muzzle,
 * small rounded ears close to the head, furry feet, and a very big, bushy
 * tail. Its winter coat is white, going greyish-brown over the back and
 * shoulders as it begins to moult towards spring; a black nose, dark eyes
 * and dark claws.
 */
const WHITE = '#e6e8ea';
const COOL = '#b6bdc8';
const MOULT = '#9f978b';
const DARK = '#2a292d';
const CLAW = '#3c3a3e';

/** Where the head sits, and how far it is tipped nose-down. */
const HEAD = { x: 28, up: 17, tilt: 1.02, s: 1 } as const;

/**
 * One short leg stepping by phase `ph`: the hind leg folds forward at the
 * knee and back at the hock; the foreleg comes nearly straight down. Each
 * ends in a round, furry foot with small dark claws.
 */
function leg(d: Draw, hipX: number, hind: boolean, ph: number, far: boolean): void {
  const { pen } = d;
  const g = d.g;
  const step = Math.cos(ph) * 5;
  const lift = Math.max(0, Math.sin(ph)) * 4;
  const sink = far ? 1.5 : 0;
  const foot = pt(hipX + step + (hind ? 1 : 2), g - 2 - lift - sink);
  const hip = pt(hipX + (far ? 2 : 0), g - (hind ? 21 : 20) - sink);
  const joints = hind
    ? [hip, pt(hipX + 4 + step * 0.4, g - 13 - lift - sink), pt(hipX - 2 + step * 0.7, g - 6 - lift * 0.8 - sink), foot]
    : [hip, pt(hipX - 1 + step * 0.3, g - 13 - lift - sink), pt(hipX + 0.5 + step * 0.8, g - 5 - lift * 0.8 - sink), foot];
  limb(d, joints, { widths: hind ? [9, 5.4, 3.6, 3.2] : [7, 4.4, 3.4, 3], wash: far ? COOL : WHITE, far, line: 0.85 });
  // The furry foot: a soft round pad flat on the ground, the claws just showing in front.
  const paw = oval(foot.x + 1.4, foot.y - 0.2, 3.2, 1.9, 14);
  skin(d, paw, far ? COOL : WHITE, 0.6);
  if (far) pen.fill(paw, d.ink, 0.12);
  edge(d, paw, far ? 0.6 : 0.8, far ? 0.55 : 0.95);
  for (const k of [0, 1, 2]) {
    const c = pt(foot.x + 3.8 + k * 0.4, foot.y + 0.6 - k * 0.5);
    pen.hair([pt(c.x - 1, c.y - 0.3), pt(c.x + 0.8, c.y + 0.9)], far ? 0.5 : 0.7, CLAW, far ? 0.5 : 0.9);
  }
}

/** Fur: short strokes raked back and down over a shape, a cool grey with a few of the moult's brown. */
function fur(d: Draw, shape: readonly Pt[], n: number, x0: number, x1: number, y0: number, y1: number, brown = 0): void {
  const { pen } = d;
  pen.clipped(shape, () => {
    for (let i = 0; i < n; i++) {
      const x = x0 + pen.rng() * (x1 - x0);
      const y = y0 + pen.rng() * (y1 - y0);
      const len = 1.8 + pen.rng() * 2;
      const moult = pen.rng() < brown * Math.max(0, (y1 - y) / (y1 - y0));
      pen.hair([pt(x, y), pt(x - len, y + len * 0.4)], 0.45, moult ? MOULT : d.ink, moult ? 0.6 : 0.3);
    }
  });
}

/** Short hairs standing out of a contour, every other point. */
function fluff(d: Draw, shape: readonly Pt[], from = 0, to = shape.length - 1): void {
  for (let i = from; i < to; i += 2) {
    const p = shape[i]!;
    const q = shape[i + 1]!;
    const len = Math.hypot(q.x - p.x, q.y - p.y) || 1;
    const nx = (q.y - p.y) / len;
    const ny = -(q.x - p.x) / len;
    const l = 1.4 + d.pen.rng() * 1.4;
    d.pen.hair([p, pt(p.x - nx * l - ((q.x - p.x) / len) * l * 0.6, p.y - ny * l - ((q.y - p.y) / len) * l * 0.6)], 0.5, d.ink, 0.65);
  }
}

/** The very bushy tail, carried low behind and curving down towards the ground, fattest in the middle, a soft rounded tip. */
function tail(d: Draw, bob: number): void {
  const { pen } = d;
  const g = d.g + bob;
  const swing = [0, 1, -0.8][d.f]!;
  const spine = cub(pt(-26, g - 36), pt(-40, g - 39), pt(-52, g - 33), pt(-58 + swing, g - 19), 22);
  const body = ribbon(spine, (u) => 10 + Math.sin(Math.min(1, u * 1.1) * Math.PI * 0.85) * 11 - u * 3);
  const end = spine[spine.length - 1]!;
  const shape = [...body.top, ...oval(end.x, end.y, 6.4, 6.4, 14).filter((p) => p.y > end.y - 1), ...[...body.bot].reverse()];
  skin(d, shape, WHITE, 0.55);
  pen.clipped(shape, () => {
    // A cool shadow under the plume, a little of the moult's brown along its top near the root.
    pen.fill(body.bot.map((p, i) => pt((p.x + spine[i]!.x) / 2, (p.y + spine[i]!.y) / 2)).concat([...body.bot].reverse()), COOL, 0.45);
    pen.stroke(body.top.slice(0, 8).map((p) => pt(p.x + 1, p.y + 1.6)), 3, MOULT, 0.35, false);
    // Long soft hairs flowing down the tail.
    for (let i = 0; i < 34; i++) {
      const k = 1 + Math.floor(pen.rng() * (spine.length - 4));
      const p = spine[k]!;
      const q = spine[k + 3]!;
      const off = pen.jitter(7);
      pen.hair([pt(p.x + off * 0.3, p.y - off), pt(q.x + off * 0.3, q.y - off)], 0.4, d.ink, 0.28);
    }
  });
  shade(d, shape, 0.32);
  // Fluffy edge: tufts standing out of the contour.
  for (let k = 2; k < spine.length - 1; k += 2) {
    for (const side of [body.top, body.bot]) {
      const p = side[k]!;
      const m = spine[k]!;
      const l = Math.hypot(p.x - m.x, p.y - m.y) || 1;
      const ux = (p.x - m.x) / l;
      const uy = (p.y - m.y) / l;
      pen.hair([p, pt(p.x + ux * 2 - uy * 1.2, p.y + uy * 2 + ux * 1.2)], 0.5, d.ink, 0.7);
    }
  }
  edge(d, shape, 0.9, 0.8);
}

/** A short, round-tipped ear in the head's own frame, standing from (bx, by), leaning back from the crown. */
function earShape(bx: number, by: number, h: number, w: number): Pt[] {
  const a = -Math.PI / 2 - 0.45;
  const Q = (u: number, v: number): Pt => pt(bx + Math.cos(a) * u - Math.sin(a) * v, by + Math.sin(a) * u + Math.cos(a) * v);
  return [
    ...cub(Q(0, -w / 2), Q(h * 0.5, -w * 0.5), Q(h * 0.9, -w * 0.14), Q(h, 0), 8),
    ...cub(Q(h, 0), Q(h * 0.9, w * 0.14), Q(h * 0.5, w * 0.45), Q(0, w / 2), 8).slice(1),
  ];
}

/** The head, nose down: a round skull with a fluffy cheek ruff, a short, pointed muzzle, small rounded ears. */
function head(d: Draw, bob: number): void {
  const { pen } = d;
  const n = pt(HEAD.x, d.g - HEAD.up + bob);
  const [c, s] = [Math.cos(HEAD.tilt) * HEAD.s, Math.sin(HEAD.tilt) * HEAD.s];
  const P = (x: number, y: number): Pt => pt(n.x + x * c - y * s, n.y + x * s + y * c);
  const map = (pts: readonly Pt[]): Pt[] => pts.map((q) => P(q.x, q.y));
  // The ears, short and rounded, set on the crown and pricked forward over the nose.
  for (const [ex, ey, far] of [[-5, -6.4, true], [-1.4, -8, false]] as const) {
    const ear = map(earShape(ex, ey, far ? 7 : 7.6, 6));
    skin(d, ear, far ? COOL : WHITE, far ? 0.75 : 0.55);
    if (!far) pen.clipped(ear, () => pen.fill(map(oval(ex - 0.6, ey - 2.4, 1.8, 2.6, 10)), MOULT, 0.45));
    edge(d, ear, far ? 0.7 : 0.9, far ? 0.6 : 1);
  }
  const shape = map([
    ...cub(pt(-7, 3), pt(-8.4, -6), pt(-1, -9.4), pt(4, -7.6), 10),
    ...cub(pt(4, -7.6), pt(6, -6.8), pt(7, -4.6), pt(9, -3.8), 5).slice(1),
    ...cub(pt(9, -3.8), pt(12, -2.8), pt(15, -1.6), pt(17.4, -0.8), 6).slice(1),
    ...cub(pt(17.4, -0.8), pt(18.8, -0.2), pt(18.6, 1.8), pt(17, 2), 4).slice(1),
    ...cub(pt(17, 2), pt(12, 2.6), pt(8, 4.4), pt(3, 6.6), 6).slice(1),
    ...cub(pt(3, 6.6), pt(-2, 9), pt(-6.6, 7.4), pt(-7, 3), 8).slice(1),
  ]);
  skin(d, shape, WHITE, 0.55);
  pen.clipped(shape, () => {
    // The moult's grey-brown on the crown, cool shadow under the jaw.
    tint(d, map(oval(-2, -6, 8, 3.6, 12)), MOULT, 0.45);
    tint(d, map(oval(2, 7.4, 9, 2.6, 12)), COOL, 0.6);
    fur(d, shape, 14, n.x - 8, n.x + 4, n.y - 8, n.y + 6, 0.4);
  });
  shade(d, shape, 0.3);
  fluff(d, shape, 0, 10);
  fluff(d, shape, 30, shape.length - 1);
  edge(d, shape, 1.05);
  // The black nose, the mouth line, a dark eye, whiskers.
  const nose = P(17.6, 0.6);
  pen.fill(oval(nose.x, nose.y, 1.7, 1.5, 10), DARK, 0.95);
  pen.dot(nose.x - 0.4, nose.y - 0.6, 0.4, PAPER_FILL, 0.8);
  pen.hair(map(bezier(pt(16.4, 2.2), pt(12, 3), pt(8, 4.4), 5)), 0.55, d.ink, 0.75);
  const eye = P(5.6, -3.4);
  pen.fill(oval(eye.x, eye.y, 1.5, 1.3, 10), DARK, 1);
  pen.dot(eye.x + 0.5, eye.y - 0.5, 0.5, PAPER_FILL, 0.95);
  pen.hair(map(bezier(pt(3.2, -5.2), pt(5.6, -6.2), pt(8, -4.8), 4)), 0.5, d.ink, 0.6);
  for (const a of [-0.4, 0, 0.4]) {
    const w = P(14, 1.6);
    pen.hair([w, pt(w.x + Math.cos(a + 0.6) * 6, w.y + Math.sin(a + 0.6) * 6)], 0.35, d.ink, 0.55);
  }
}

export function arcticFox(d: Draw): void {
  const { pen } = d;
  const g = d.g;
  pen.fill(oval(-4, g - 1, 40, 3, 24), d.ink, 0.1);
  // A steady trot: diagonal pairs (near hind with far fore).
  const ph = -d.f * (TAU / 3);
  const bob = [0, -0.6, 0.3][d.f]!;
  leg(d, -20, true, ph + Math.PI, true);
  leg(d, 13, false, ph, true);
  tail(d, bob);
  const y = (v: number): number => g + v + bob;
  // Body: compact and round-backed, deep in the chest, the shoulders running down into the lowered head.
  const shape = [
    ...cub(pt(16, y(-19)), pt(5, y(-15.5)), pt(-11, y(-15.5)), pt(-21, y(-19)), 12),
    ...cub(pt(-21, y(-19)), pt(-30, y(-21)), pt(-33, y(-31)), pt(-29, y(-38)), 10).slice(1),
    ...cub(pt(-29, y(-38)), pt(-23, y(-45)), pt(-6, y(-46)), pt(6, y(-42)), 12).slice(1),
    ...cub(pt(6, y(-42)), pt(16, y(-39)), pt(26, y(-32)), pt(31, y(-24)), 10).slice(1),
    ...cub(pt(31, y(-24)), pt(30, y(-18)), pt(24, y(-16)), pt(16, y(-19)), 6).slice(1),
  ];
  skin(d, shape, WHITE, 0.5);
  pen.clipped(shape, () => {
    // The spring moult: grey-brown over the back and shoulders; cool shadow under the belly.
    tint(d, oval(-8, y(-43), 22, 5, 18), MOULT, 0.45);
    tint(d, oval(12, y(-38), 9, 4, 12), MOULT, 0.3);
    tint(d, oval(-4, y(-17), 24, 4.5, 16), COOL, 0.55);
    // The coat in soft hatching, following the fur back over the body.
    pen.hatch(shape, 2.6, 2.6, 0.4, { color: d.ink, alpha: 0.18 });
  });
  fur(d, shape, 80, -33, 26, y(-46), y(-16), 0.55);
  shade(d, shape, 0.38, true);
  fluff(d, shape);
  edge(d, shape, 1.15);
  // The shoulder and thigh: a curve of the coat over each.
  pen.hair(bezier(pt(-27, y(-34)), pt(-21, y(-26)), pt(-12, y(-21)), 6), 0.6, d.ink, 0.4);
  pen.hair(bezier(pt(7, y(-36)), pt(13, y(-29)), pt(10, y(-21)), 6), 0.6, d.ink, 0.4);
  leg(d, -17, true, ph, false);
  leg(d, 16, false, ph + Math.PI, false);
  head(d, bob);
}
