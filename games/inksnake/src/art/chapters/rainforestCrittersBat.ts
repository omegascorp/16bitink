import { createRng } from '../../logic/rng';
import { bezier, closed, type Draw, pt } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import type { SpriteArt } from '../types';
import { mix } from '../wash';
import { bilateral, ellipseAt, furEdge, glaze, hairs, skinWash } from '../critters/preyKit';

/**
 * A small insect-eating bat, seen from above facing +x: a furry warm-brown
 * body about 11 long with big rounded ears, and wings of thin dark membrane
 * stretched between long finger bones, a claw at each thumb, the trailing
 * edge scalloped between the fingers, a tail membrane between its legs.
 *  - 'fly1': the downstroke, wings spread full (span about 50);
 *  - 'fly0': the upstroke, wings raised, so seen foreshortened from above;
 *  - 'swoop': dipping low after insects, wings half folded and swept back.
 */
const B = {
  fur: '#7b5b43',
  furDeep: '#3a2a20',
  furLit: '#b08a66',
  membrane: '#2f2422',
  membraneLit: '#9a7a68',
  bone: '#a88a76',
  ear: '#5e4436',
  earIn: '#b98a78',
} as const;

type Pose = 'fly0' | 'fly1' | 'swoop';

/** The +y wing, spread: shoulder, elbow, wrist, the tips of fingers 3, 4 and 5, the foot. */
const SPREAD = {
  shoulder: pt(2, 2.4),
  elbow: pt(-2.2, 8),
  wrist: pt(3, 13.6),
  d3: pt(-3.4, 25.8),
  d4: pt(-10.4, 19.2),
  d5: pt(-10.6, 11),
  foot: pt(-7, 3.2),
};

type WingPts = typeof SPREAD;

/** How a pose moves the spread wing's points: the span squeezed, the tips swept forward or back. */
const POSE: Readonly<Record<Pose, (p: Pt) => Pt>> = {
  fly1: (p) => p,
  fly0: (p) => pt(p.x + p.y * 0.16 - 1, p.y * 0.58 + 1),
  swoop: (p) => pt(p.x - Math.max(0, p.y - 4) * 0.42, p.y * 0.72 + 0.6),
};

function wingOf(pose: Pose): WingPts {
  const f = POSE[pose];
  return Object.fromEntries(Object.entries(SPREAD).map(([k, p]) => [k, f(p)])) as WingPts;
}

/** The membrane's outline: the leading edge out along the arm and fingers, then scalloped back between the fingertips to the foot. */
function membrane(w: WingPts): Pt[] {
  const sag = (a: Pt, b: Pt, k: number): Pt[] => {
    const m = pt((a.x + b.x) / 2, (a.y + b.y) / 2);
    const l = Math.hypot(b.x - a.x, b.y - a.y);
    const n = pt(-(b.y - a.y) / l, (b.x - a.x) / l);
    return bezier(a, pt(m.x + n.x * l * k, m.y + n.y * l * k), b, 8);
  };
  const front = [pt(w.shoulder.x + 1.2, w.shoulder.y), pt((w.shoulder.x + w.wrist.x) / 2 + 2, (w.shoulder.y + w.wrist.y) / 2), w.wrist];
  return [
    ...front,
    ...sag(w.wrist, w.d3, -0.04).slice(1),
    ...sag(w.d3, w.d4, 0.2).slice(1),
    ...sag(w.d4, w.d5, 0.2).slice(1),
    ...sag(w.d5, w.foot, 0.18).slice(1),
    w.shoulder,
  ];
}

/** One wing: the dark membrane, lighter where thin, veined; the finger bones over it; the thumb's claw. */
function wing(d: Draw, w: WingPts, side: number, dark: number): void {
  const { pen } = d;
  const m = (p: Pt): Pt => pt(p.x, p.y * side);
  const mw = Object.fromEntries(Object.entries(w).map(([k, p]) => [k, m(p)])) as WingPts;
  const shape = membrane(mw);
  pen.fill(shape, PAPER_FILL, 0.6);
  pen.fill(shape, B.membrane, 0.86 + dark * 0.08);
  pen.clipped(shape, () => {
    // Thin membrane lets the light through between the fingers.
    for (const [a, b] of [[mw.d3, mw.d4], [mw.d4, mw.d5]] as const) {
      const c = pt((a.x + b.x + mw.wrist.x) / 3, (a.y + b.y + mw.wrist.y) / 3);
      glaze(d, c.x, c.y, 6, 3.4, Math.atan2(b.y - a.y, b.x - a.x), B.membraneLit, 0.5 - dark * 0.2);
    }
    pen.crescent(shape, pt(-1.2, -side * 1.6), () => pen.fill(shape, '#1d1615', 0.35));
    // Fine creases across the membrane, radiating from the body.
    const rng = createRng(7601 + side);
    for (let i = 0; i < 9; i++) {
      const t = 0.15 + i * 0.09;
      const a = pt(mw.shoulder.x - 2 + rng(), mw.shoulder.y);
      const tip = [mw.d3, mw.d4, mw.d5][i % 3]!;
      pen.hair([pt(a.x + (tip.x - a.x) * t, a.y + (tip.y - a.y) * t), pt(a.x + (tip.x - a.x) * (t + 0.25), a.y + (tip.y - a.y) * (t + 0.25))], 0.14, B.membraneLit, 0.35);
    }
  });
  pen.stroke(closed(shape), 0.4, d.ink, 0.9, false);
  // Bones: arm and forearm, then the fingers from the wrist.
  const bone = (pts: Pt[], wd: number): void => {
    pen.hair(pts, wd + 0.25, d.ink, 0.8);
    pen.hair(pts, wd, B.bone, 0.9);
  };
  bone([mw.shoulder, mw.elbow, mw.wrist], 0.75);
  for (const tip of [mw.d3, mw.d4, mw.d5]) {
    const mid = pt(mw.wrist.x + (tip.x - mw.wrist.x) * 0.55 + side * 0, mw.wrist.y + (tip.y - mw.wrist.y) * 0.55);
    bone([mw.wrist, mid, tip], 0.42);
    pen.dot(mid.x, mid.y, 0.32, B.bone, 0.9);
  }
  // The thumb: a little hooked claw at the wrist, pointing forward.
  pen.hair([mw.wrist, pt(mw.wrist.x + 1.6, mw.wrist.y - side * 0.2), pt(mw.wrist.x + 2.1, mw.wrist.y - side * 0.7)], 0.45, d.ink, 0.95);
  // The hind foot's tiny toes at the membrane's back corner.
  for (const k of [-0.5, 0, 0.5]) pen.hair([mw.foot, pt(mw.foot.x - 1.2, mw.foot.y + side * (0.5 + k * 0.4))], 0.22, d.ink, 0.8);
}

/** The tail membrane: a dark fan between the feet, the tail's bone down its middle. */
function tail(d: Draw, w: WingPts, pose: Pose): void {
  const { pen } = d;
  const tip = pt(pose === 'swoop' ? -14.5 : -13, 0);
  const shape = [pt(-5.5, w.foot.y * 0.7), ...bezier(w.foot, pt(-10.5, w.foot.y * 0.75), tip, 6), ...bezier(tip, pt(-10.5, -w.foot.y * 0.75), pt(w.foot.x, -w.foot.y), 6).slice(1), pt(-5.5, -w.foot.y * 0.7)];
  pen.fill(shape, B.membrane, 0.9);
  pen.clipped(shape, () => glaze(d, -9, 0, 3, 2.5, 0, B.membraneLit, 0.3));
  pen.stroke(closed(shape), 0.35, d.ink, 0.85, false);
  pen.hair([pt(-6, 0), pt(-9.5, 0), tip], 0.35, B.bone, 0.75);
}

/** The furry body and head: a coat of fine hairs, lit along the top, the big rounded ears, bead eyes, a pug snout. */
function body(d: Draw): void {
  const { pen } = d;
  const trunk = bilateral([pt(9.2, 0), pt(8.6, 1.8), pt(6.6, 2.9), pt(4.6, 3), pt(2.6, 3.4), pt(-1, 3.6), pt(-4.4, 3.1), pt(-6.6, 1.9), pt(-7.2, 0)]);
  for (const s of [-1, 1]) {
    const ear = ellipseAt(7.6, s * 3.1, 2.9, 1.45, s * 0.75, 14);
    skinWash(d, ear, B.ear, B.furDeep);
    pen.clipped(ear, () => glaze(d, 7.8, s * 3.2, 1.9, 0.7, s * 0.75, B.earIn, 0.6));
    pen.stroke(closed(ear), 0.3, d.ink, 0.9, false);
  }
  skinWash(d, trunk, B.fur, B.furDeep, { at: pt(1, -1.2), r: 4 }, 0.45);
  const coat = { dir: (p: Pt) => Math.PI + p.y * 0.12, color: (_p: Pt, r: number) => (r < 0.35 ? B.furLit : r < 0.7 ? mix(B.fur, B.furDeep, 0.4) : B.furDeep) };
  hairs(d, trunk, coat, 90, 7611, 1.1, 0.22, 0.7);
  pen.clipped(trunk, () => {
    glaze(d, 6.6, 0, 2.2, 2, 0, mix(B.fur, B.furLit, 0.4), 0.5);
    pen.crescent(trunk, pt(-0.8, -1.1), () => pen.fill(trunk, B.furDeep, 0.3));
  });
  furEdge(d, trunk, 0.4, 7621, 2, 0.6);
  // The face: a short snout, nostrils, bead eyes between the ears.
  pen.hair([pt(9, -0.9), pt(9.6, 0), pt(9, 0.9)], 0.3, d.ink, 0.8);
  for (const s of [-1, 1]) {
    pen.dot(9.1, s * 0.45, 0.22, d.ink, 0.9);
    pen.dot(7.4, s * 1.5, 0.5, '#151319', 1);
    pen.dot(7.25, s * 1.5 - 0.2, 0.16, PAPER_FILL, 0.9);
  }
}

function draw(d: Draw, pose: Pose): void {
  const w = wingOf(pose);
  const dark = pose === 'fly0' ? 1 : 0;
  tail(d, w, pose);
  for (const s of [-1, 1]) wing(d, w, s, dark);
  body(d);
}

export const BAT_ART: SpriteArt<Pose> = {
  frame: 60,
  res: 2,
  poses: ['fly0', 'fly1', 'swoop'],
  draw,
};
