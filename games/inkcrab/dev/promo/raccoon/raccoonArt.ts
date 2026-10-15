import { bezier, closed, cub, type Draw, edge, oval, pt, ribbon, shade, skin, tint } from '../../../src/art/kit';
import type { Pt } from '../../../src/art/pen';
import { PAPER_FILL } from '../../../src/art/palette';
import { limb } from '../../../src/art/critters/limb';

/**
 * The game's raccoon (src/art/critters/raccoon.ts) in a pose the game never
 * needs: crouched at the edge of a tidepool, facing right, rump down and
 * forelegs reaching into the water, hands rubbing together. Same coat, same
 * mask, same pen, so it reads as the kelp beach's raccoon; the forelegs,
 * hands and head are posed every frame (the game draws it walking). Local
 * units, the ground at y 0.
 */
const FUR = '#8d867b';
const BUFF = '#b3a48a';
const DARK = '#2b282b';
const PALE = '#eee8da';
const LEG = '#6f685f';
const PAW = '#3a3536';
const TAIL = '#a49a88';

/** Where the forelegs join the body (near and far), and their two segments' lengths. */
export const SHOULDER = { near: pt(20, -27), far: pt(16, -29) } as const;
const UPPER = 20;
const FORE = 27;
/** Where the head sits on the neck. */
export const NECK = pt(25, -37);
const HEAD_S = 1.1;

export interface RaccoonPose {
  /** Where the hands meet, local units. */
  readonly grip: Pt;
  /** The rubbing stroke, -1 .. 1: the hands slide past each other. */
  readonly rub: number;
  /** Fingers spread to let go, 0 .. 1. */
  readonly open: number;
  /** Head turn, radians: positive tips the nose down (to the water), negative lifts it (looking away). */
  readonly tilt: number;
  /** Tail tip sway, -1 .. 1. */
  readonly sway: number;
  /** Breathing, -1 .. 1. */
  readonly breath: number;
}

/** Elbow of a two-segment leg from `a` reaching for `b`, bent backwards (down and behind), as a raccoon's elbow is. */
function elbow(a: Pt, b: Pt): { readonly elbow: Pt; readonly hand: Pt } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.min(UPPER + FORE - 0.01, Math.max(Math.abs(UPPER - FORE) + 0.01, Math.hypot(dx, dy)));
  const ang = Math.atan2(dy, dx);
  const hand = pt(a.x + Math.cos(ang) * dist, a.y + Math.sin(ang) * dist);
  const cosA = (UPPER * UPPER + dist * dist - FORE * FORE) / (2 * UPPER * dist);
  const bend = Math.acos(Math.max(-1, Math.min(1, cosA)));
  // The elbow swings to the side away from the face: behind and below.
  const e = ang + bend;
  return { elbow: pt(a.x + Math.cos(e) * UPPER, a.y + Math.sin(e) * UPPER), hand };
}

/** A hand: a dark palm with long, spread fingers, each with a small claw, reaching along `dir` (radians). */
function hand(d: Draw, at: Pt, dir: number, open: number, far: boolean): void {
  const { pen } = d;
  const palm = oval(at.x, at.y, 3.2, 2.5, 14);
  skin(d, palm, PAW, far ? 0.95 : 0.85);
  for (const k of [-2, -1, 0, 1, 2]) {
    const a = dir + k * (0.26 + open * 0.2);
    const len = 4.8 - Math.abs(k) * 0.7;
    const root = pt(at.x + Math.cos(a) * 2, at.y + Math.sin(a) * 2);
    const tip = pt(root.x + Math.cos(a + open * 0.3) * len, root.y + Math.sin(a + open * 0.3) * len);
    const mid = pt((root.x + tip.x) / 2 + Math.cos(a + Math.PI / 2) * 0.5, (root.y + tip.y) / 2 + Math.sin(a + Math.PI / 2) * 0.5);
    pen.stroke(bezier(root, mid, tip, 5), far ? 1.3 : 1.5, PAW, far ? 0.8 : 0.95, false);
    pen.dot(tip.x, tip.y, 0.45, d.ink, 0.9);
  }
  edge(d, palm, far ? 0.7 : 0.9, far ? 0.6 : 0.9);
}

/** One foreleg from the shoulder to the hand, drawn with the game's limb, dark from the wrist. */
function foreleg(d: Draw, shoulder: Pt, target: Pt, open: number, far: boolean): void {
  const { elbow: e, hand: h } = elbow(shoulder, target);
  // The wrist sits a little before the hand along the forearm.
  const wrist = pt(e.x + (h.x - e.x) * 0.8, e.y + (h.y - e.y) * 0.8);
  limb(d, [shoulder, e, wrist], { widths: [9.5, 6, 4.4], wash: LEG, far, line: 0.9 });
  limb(d, [wrist, h], { widths: [4.4, 3.6], wash: PAW, far, line: 0.85 });
  hand(d, h, Math.atan2(h.y - e.y, h.x - e.x), open, far);
}

/** The bushy ringed tail, curled round on the ground behind it, its tip swaying. */
function tail(d: Draw, sway: number): void {
  const { pen } = d;
  const spine = cub(pt(-26, -10), pt(-40, -14), pt(-54, -8), pt(-60, -6 - sway * 3), 20);
  const body = ribbon(spine, (u) => 8.5 + Math.sin(Math.min(1, u * 1.1) * Math.PI * 0.8) * 4 - u * 2);
  const end = spine[spine.length - 1]!;
  const shape = [...body.top, ...oval(end.x, end.y, 4.4, 4.4, 12).filter((p) => p.x < end.x + 1), ...[...body.bot].reverse()];
  skin(d, shape, TAIL, 0.8);
  pen.clipped(shape, () => {
    for (const k of [4, 8, 12, 16]) {
      const a = body.top[k]!;
      const b = body.bot[k]!;
      pen.stroke([pt(a.x + 1, a.y - 1), pt(b.x - 1, b.y + 1)], 4, DARK, 0.8, false);
    }
    pen.fill(oval(end.x - 1, end.y, 6, 6, 12), DARK, 0.85);
  });
  shade(d, shape, 0.35);
  edge(d, shape, 0.9, 0.85);
}

/** Grizzled fur: short strokes raked back and down over a shape, dark and pale (as the game's). */
function grizzle(d: Draw, shape: readonly Pt[], n: number, box: readonly [number, number, number, number]): void {
  const { pen } = d;
  const [x0, x1, y0, y1] = box;
  pen.clipped(shape, () => {
    for (let i = 0; i < n; i++) {
      const x = x0 + pen.rng() * (x1 - x0);
      const y = y0 + pen.rng() * (y1 - y0);
      const len = 2 + pen.rng() * 2;
      const pale = i % 3 === 0;
      pen.hair([pt(x, y), pt(x - len, y + len * 0.45)], pale ? 0.5 : 0.45, pale ? PALE : DARK, pale ? 0.55 : 0.45);
    }
  });
}

/** The crouched body: rump on the ground, back rising to high shoulders, a deep chest over the water. */
function body(d: Draw, breath: number): void {
  const { pen } = d;
  const b = breath * 0.6;
  const shape = [
    ...cub(pt(22, -18), pt(28, -24), pt(28, -34 - b), pt(20, -42 - b), 8),
    ...cub(pt(20, -42 - b), pt(10, -50 - b), pt(-8, -50 - b), pt(-22, -40), 12).slice(1),
    ...cub(pt(-22, -40), pt(-34, -32), pt(-36, -14), pt(-28, -3), 10).slice(1),
    ...cub(pt(-28, -3), pt(-18, 0), pt(0, -2), pt(10, -8), 10).slice(1),
    ...cub(pt(10, -8), pt(15, -12), pt(19, -15), pt(22, -18), 4).slice(1),
  ];
  skin(d, shape, FUR, 0.78);
  pen.clipped(shape, () => {
    tint(d, oval(-6, -22, 22, 9, 18), BUFF, 0.5);
    tint(d, oval(10, -14, 14, 5, 16), PALE, 0.55);
    tint(d, oval(-6, -46, 22, 6, 16), DARK, 0.3);
    pen.hatch(shape, 2.4, 2.4, 0.45, { color: d.ink, alpha: 0.26 });
  });
  grizzle(d, shape, 80, [-34, 26, -50, -4]);
  shade(d, shape, 0.42, true);
  // Fur standing out along the back.
  for (let i = 8; i < 34; i += 2) {
    const p = shape[i]!;
    const q = shape[i + 1]!;
    const len = Math.hypot(q.x - p.x, q.y - p.y) || 1;
    const nx = (q.y - p.y) / len;
    const ny = -(q.x - p.x) / len;
    const l = 1.4 + pen.rng() * 1.2;
    pen.hair([p, pt(p.x - nx * l - ((q.x - p.x) / len) * l * 0.6, p.y - ny * l - ((q.y - p.y) / len) * l * 0.6)], 0.5, d.ink, 0.7);
  }
  edge(d, shape, 1.2);
}

/** The near haunch, folded under it, and its long flat hind foot on the ground. */
function haunch(d: Draw): void {
  const { pen } = d;
  const thigh = oval(-14, -13, 13, 10, 20);
  skin(d, thigh, FUR, 0.6);
  grizzle(d, thigh, 16, [-27, -1, -23, -3]);
  shade(d, thigh, 0.35);
  pen.hair(thigh.slice(1, 12), 0.9, d.ink, 0.8);
  const foot = [...cub(pt(-10, -1), pt(-9, -5), pt(0, -5), pt(3, -2.4), 8), ...cub(pt(3, -2.4), pt(4, -0.6), pt(-4, 0.4), pt(-10, -1), 6).slice(1)];
  skin(d, foot, PAW, 0.85);
  edge(d, foot, 0.8, 0.9);
  for (const k of [-1, 0, 1]) pen.stroke(bezier(pt(2.5, -2 + k * 0.9), pt(4.5, -2.4 + k * 0.9), pt(6, -0.6 + k * 0.5), 4), 1.1, PAW, 0.95, false);
}

/** The head (the game's, turned by `tilt` about the neck): the black mask, pale brow and muzzle, round ears. */
function head(d: Draw, tilt: number): void {
  const { pen } = d;
  const n = NECK;
  const [c, s] = [Math.cos(tilt) * HEAD_S, Math.sin(tilt) * HEAD_S];
  const P = (x: number, y: number): Pt => pt(n.x + x * c - y * s, n.y + x * s + y * c);
  const map = (pts: readonly Pt[]): Pt[] => pts.map((q) => P(q.x, q.y));
  for (const [ex, ey, far] of [[-5.5, -5, true], [-2.5, -7.5, false]] as const) {
    const b = P(ex, ey);
    const ear = [...cub(pt(b.x - 3.6, b.y + 1.5), pt(b.x - 4.6, b.y - 6), pt(b.x + 1.6, b.y - 8.4), pt(b.x + 3.6, b.y + 0.5), 10), pt(b.x, b.y + 2.5)];
    skin(d, ear, far ? DARK : FUR, far ? 0.6 : 0.8);
    if (!far) {
      pen.clipped(ear, () => pen.fill(oval(b.x - 0.4, b.y - 1.6, 2, 3.6, 10), DARK, 0.65));
      pen.stroke(cub(pt(b.x - 3.4, b.y), pt(b.x - 4, b.y - 5.5), pt(b.x + 1.2, b.y - 7.6), pt(b.x + 3.2, b.y - 0.6), 10), 1.2, PALE, 0.9, false);
    }
    edge(d, ear, far ? 0.7 : 0.9, far ? 0.6 : 1);
  }
  const shape = map([
    ...cub(pt(-8, 3), pt(-8, -6), pt(2, -9.5), pt(8, -6), 10),
    ...cub(pt(8, -6), pt(12, -4), pt(16, -1.4), pt(18.6, 0.4), 6).slice(1),
    ...cub(pt(18.6, 0.4), pt(20, 1.2), pt(19.8, 3.2), pt(17.8, 3.2), 4).slice(1),
    ...cub(pt(17.8, 3.2), pt(12, 4.6), pt(6, 7.4), pt(0, 8.4), 8).slice(1),
    ...cub(pt(0, 8.4), pt(-5, 8.6), pt(-8, 6), pt(-8, 3), 6).slice(1),
  ]);
  skin(d, shape, FUR, 0.8);
  pen.clipped(shape, () => {
    tint(d, map(oval(15.5, 1.8, 4.6, 2.8, 12)), PALE, 0.9);
    tint(d, map(oval(2, 6.6, 5, 2, 12)), PALE, 0.6);
    tint(d, map(oval(-2, -4, 7, 4, 12)), DARK, 0.25);
    pen.stroke(map(bezier(pt(-3, -5.6), pt(4, -6.4), pt(11.5, -3.6), 6)), 2.2, PALE, 0.85, false);
    const mask = map([pt(-6, 1.6), pt(-1, -3.4), pt(5, -4.2), pt(11, -2.8), pt(13, -0.6), pt(10, 1.6), pt(4, 2), pt(-2, 4.4), pt(-6.4, 4.6)]);
    pen.fill(mask, DARK, 0.88);
    pen.stroke(map([pt(4, -6.8), pt(10, -4.2), pt(15.5, -1.6)]), 1.1, DARK, 0.7, false);
  });
  grizzle(d, shape, 18, [n.x - 8, n.x + 2, n.y - 8, n.y + 4]);
  shade(d, shape, 0.32);
  edge(d, shape, 1.1);
  const nose = P(18.8, 1.6);
  pen.fill(oval(nose.x, nose.y, 1.6, 1.4, 10), DARK, 0.95);
  pen.hair(map(bezier(pt(17.6, 3), pt(13, 3.8), pt(9, 4.6), 5)), 0.55, d.ink, 0.75);
  const eye = P(6.6, -1.6);
  pen.dot(eye.x, eye.y, 1.3, d.ink, 1);
  pen.dot(eye.x + 0.5, eye.y - 0.5, 0.5, PAPER_FILL, 0.95);
  pen.hair(closed(oval(eye.x, eye.y, 1.8, 1.6, 10)), 0.35, PAPER_FILL, 0.5);
  for (const a of [-0.4, 0, 0.4]) {
    const w = P(14.5, 2.4);
    pen.hair([w, pt(w.x + Math.cos(a + 0.5 + tilt) * 6, w.y + Math.sin(a + 0.5 + tilt) * 6)], 0.35, d.ink, 0.6);
  }
}

/** Where the nose tip is, for a tilt (food is lifted to it). */
export function noseAt(tilt: number): Pt {
  const [c, s] = [Math.cos(tilt) * HEAD_S, Math.sin(tilt) * HEAD_S];
  return pt(NECK.x + 18.8 * c - 1.6 * s, NECK.y + 18.8 * s + 1.6 * c);
}

/** Where each hand is for a pose: the grip split by the rubbing stroke. */
export function handsOf(p: RaccoonPose): { readonly near: Pt; readonly far: Pt } {
  const slide = p.rub * 2.6;
  const spread = 1.6 + p.open * 3;
  return {
    near: pt(p.grip.x + slide - spread * 0.3, p.grip.y + spread * 0.5 - p.rub * 0.6),
    far: pt(p.grip.x - slide + spread * 0.3, p.grip.y - spread * 0.5 + p.rub * 0.6),
  };
}

/**
 * The whole raccoon, back to front: tail, far foreleg, body, haunch, head,
 * then what it holds (`held`, drawn at the grip, between its hands) and the
 * near foreleg over it.
 */
export function drawRaccoon(d: Draw, p: RaccoonPose, held: (grip: Pt) => void): void {
  const { pen } = d;
  pen.fill(oval(-8, -0.5, 34, 2.6, 24), d.ink, 0.12);
  const hands = handsOf(p);
  tail(d, p.sway);
  foreleg(d, SHOULDER.far, hands.far, p.open, true);
  body(d, p.breath);
  haunch(d);
  head(d, p.tilt);
  held(p.grip);
  foreleg(d, SHOULDER.near, hands.near, p.open, false);
}
