import { createRng } from '../../logic/rng';
import { blob } from '../groundKit';
import { bezier, capsule, closed, cub, type Draw, oval, pt, shade, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import type { SpriteArt } from '../types';
import { mix } from '../wash';
import { bilateral, castShadow, ellipseAt, glaze, skinWash } from '../critters/preyKit';
import { bandedLimb, digits } from './barrensCrittersKit';

/**
 * The Indian bullfrog (Hoplobatrachus tigerinus), seen from above facing
 * +x: a big frog about 25 × 16 in the body, olive-yellow and greener on the
 * head, blotched dark olive-brown, with a thin pale yellow stripe down the
 * middle of the back from snout to vent, long glandular ridges down the
 * back, a pointed snout, gold eyes, big eardrums, long hind legs barred
 * dark and fully webbed feet.
 *  - 'sit': at rest, hind legs folded beside it;
 *  - 'hop': stretched long mid-leap, hind legs kicked out behind, hands reaching ahead.
 */
const B = {
  back: '#a5a24e',
  head: '#9aa94e',
  yellow: '#c9b54c',
  deep: '#3f3f18',
  blotch: '#4a4721',
  blotchLit: '#7b7434',
  ridge: '#d9d08a',
  stripe: '#f0e28c',
  belly: '#d9d39a',
  bellyDeep: '#8f8a48',
  gold: '#e1aa3a',
  goldDeep: '#8d5d17',
  pupil: '#141218',
  tymp: '#8a7c3a',
  web: '#8e8a44',
  tip: '#4b4520',
} as const;

type Pose = 'sit' | 'hop';

interface Stretch {
  readonly sx: number;
  readonly sy: number;
  readonly dx: number;
}

const BODY: Readonly<Record<Pose, Stretch>> = {
  sit: { sx: 1, sy: 1, dx: 0 },
  hop: { sx: 1.08, sy: 0.84, dx: 2.6 },
};

const at = (k: Stretch, x: number, y: number): Pt => pt(x * k.sx + k.dx, y * k.sy);

/** The body from above: a pointed snout, the head widening to the shoulders, a long back, a rounded rump. */
function outline(k: Stretch, squeeze = 1): Pt[] {
  return bilateral([
    ...cub(pt(13.2, 0), pt(13, 1.1), pt(11.4, 2.6), pt(9.2, 4.2), 7),
    ...cub(pt(9.2, 4.2), pt(7, 5.8), pt(4, 6.6), pt(1, 7.3), 7).slice(1),
    ...cub(pt(1, 7.3), pt(-2.6, 8), pt(-6.4, 8.1), pt(-9.2, 6.6), 7).slice(1),
    ...cub(pt(-9.2, 6.6), pt(-11.2, 5.4), pt(-12.2, 2.6), pt(-12.2, 0), 6).slice(1),
  ]).map((p) => at(k, p.x * (squeeze < 1 ? 0.985 : 1), p.y * squeeze));
}

/** The dark blotches down the back and flanks (x, y, size): bigger and more elongated over the hips. */
const SPOTS: readonly (readonly [number, number, number])[] = [
  [-7.4, -3, 1.9], [-3.6, 2.8, 1.8], [-8.6, 3.4, 1.4], [-1.6, -4.4, 1.4], [0.8, 2.2, 1.2], [-5, -5.6, 1.1],
  [-10.2, -1.4, 1.1], [2.2, -2.4, 1], [3.6, 4.2, 1], [-4.4, -1.6, 1], [-5.4, 5.8, 1.1], [6.2, -3.4, 0.8],
  [-0.8, 5.8, 0.9], [-9.4, 5.8, 0.9], [6.4, 3.2, 0.7],
];

/** The glandular ridges down the back (from, to on the +y side; mirrored), each short and broken. */
const RIDGES: readonly (readonly [Pt, Pt])[] = [
  [pt(5.4, 1.7), pt(-0.6, 1.9)], [pt(-1.6, 1.9), pt(-7.4, 1.6)], [pt(3.2, 3.6), pt(-2.8, 4.1)],
  [pt(-3.8, 4.2), pt(-8.8, 3.8)], [pt(1.4, 5.6), pt(-3.4, 6.1)], [pt(-4.6, 6.2), pt(-8.4, 5.6)],
];

/** The back: the olive-yellow wash rounded by the light, a greener head, blotches, ridges and the pale stripe. */
function back(d: Draw, k: Stretch, shape: readonly Pt[]): void {
  const { pen } = d;
  const rng = createRng(9101);
  skinWash(d, shape, B.back, B.deep, { at: at(k, -2.5, -3), r: 7 * k.sx }, 0.44);
  pen.clipped(shape, () => {
    glaze(d, at(k, 7.5, 0).x, 0, 5.5 * k.sx, 4.6 * k.sy, 0, B.head, 0.7);
    glaze(d, at(k, -4, 0).x, 0, 7 * k.sx, 3 * k.sy, 0, B.yellow, 0.5);
    glaze(d, at(k, -8, 0).x, 0, 4 * k.sx, 5 * k.sy, 0, '#8f7438', 0.3);
    for (const s of [-1, 1]) glaze(d, at(k, -3, s * 6.6).x, s * 6.6 * k.sy, 8 * k.sx, 2, 0, mix(B.back, B.deep, 0.3), 0.4);
    for (const [x, y, r] of SPOTS) {
      const c = at(k, x, y);
      const b = blob(c, r * 1.25 * k.sx, r * 0.78 * k.sy, rng, 0.38, 14, (rng() - 0.5) * 0.6);
      pen.fill(b, B.blotch, 0.72);
      pen.fill(b.map((p) => pt(c.x + (p.x - c.x) * 0.55 - 0.25, c.y + (p.y - c.y) * 0.55 - 0.25)), B.blotchLit, 0.35);
      pen.hair(closed(b).slice(5, 13), 0.2, d.ink, 0.5);
    }
    // Ridges: a lit line along each, inked on its shadow side.
    for (const s of [-1, 1]) {
      for (const [a, b] of RIDGES) {
        const line = bezier(at(k, a.x, s * a.y), at(k, (a.x + b.x) / 2, s * (a.y + b.y) / 2 + s * 0.25), at(k, b.x, s * b.y), 6);
        pen.hair(line, 0.65, B.ridge, 0.7);
        pen.hair(line.map((p) => pt(p.x + 0.15, p.y + 0.4)), 0.2, d.ink, 0.45);
      }
    }
    // The thin pale stripe from the snout to the vent.
    const stripe = [at(k, 12.4, 0), at(k, 6, 0.05), at(k, 0, -0.08), at(k, -6, 0.05), at(k, -12, 0)];
    pen.hair(stripe, 1.25, B.stripe, 0.55);
    pen.hair(stripe, 0.55, mix(B.stripe, PAPER_FILL, 0.4), 0.9);
    pen.hair(stripe.map((p) => pt(p.x, p.y + 0.6)), 0.18, d.ink, 0.35);
  });
  // Fine grain over the skin.
  pen.clipped(shape, () => {
    for (let i = 0; i < 70; i++) {
      const p = at(k, -12 + rng() * 24, (rng() - 0.5) * 15);
      pen.dot(p.x, p.y, 0.32, rng() < 0.5 ? B.deep : mix(B.ridge, PAPER_FILL, 0.4), 0.35);
    }
  });
}

/** The eardrum behind the eye: a big brown disc with a pale rim and a glint. */
function tympanum(d: Draw, c: Pt, r: number): void {
  const { pen } = d;
  const disc = oval(c.x, c.y, r, r * 0.92, 16);
  pen.fill(disc, B.tymp, 0.9);
  pen.crescent(disc, pt(r * 0.3, r * 0.35), () => pen.fill(disc, B.deep, 0.5));
  pen.hair(bezier(pt(c.x - r * 0.6, c.y - r * 0.2), pt(c.x - r * 0.5, c.y - r * 0.65), pt(c.x - r * 0.05, c.y - r * 0.7), 5), 0.3, PAPER_FILL, 0.6);
  pen.stroke(closed(disc), 0.35, d.ink, 0.85);
}

/** A gold eye bulging on top of the head under an olive lid, a dark horizontal pupil, glints. */
function eye(d: Draw, c: Pt, r: number): void {
  const { pen } = d;
  const lid = oval(c.x, c.y, r * 1.22, r * 1.12, 20);
  pen.fill(lid.map((p) => pt(p.x + 0.5, p.y + 0.8)), d.ink, 0.22);
  skinWash(d, lid, B.head, B.deep, { at: pt(c.x - r * 0.4, c.y - r * 0.5), r: r * 0.8 });
  pen.stroke(closed(lid), 0.45, d.ink, 0.95);
  const ball = oval(c.x + r * 0.05, c.y, r * 0.95, r * 0.9, 20);
  pen.fill(ball, PAPER_FILL, 1);
  pen.fill(ball, B.gold, 0.95);
  pen.clipped(ball, () => {
    pen.crescent(ball, pt(-r * 0.2, -r * 0.3), () => pen.fill(ball, B.goldDeep, 0.6));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      pen.hair([pt(c.x + Math.cos(a) * r * 0.45, c.y + Math.sin(a) * r * 0.42), pt(c.x + Math.cos(a) * r * 0.85, c.y + Math.sin(a) * r * 0.8)], 0.15, B.goldDeep, 0.55);
    }
  });
  pen.fill(ellipseAt(c.x + r * 0.08, c.y, r * 0.62, r * 0.32, 0, 14), B.pupil, 1);
  pen.stroke(closed(ball), 0.4, d.ink, 0.95);
  pen.dot(c.x - r * 0.3, c.y - r * 0.36, Math.max(0.4, r * 0.22), PAPER_FILL, 1);
  pen.dot(c.x + r * 0.38, c.y + r * 0.3, 0.35, PAPER_FILL, 0.7);
}

/** A fully webbed hind foot from the ankle: long toes fanned round `ang`, the web stretched right out between them. */
function foot(d: Draw, ankle: Pt, ang: number, spread: number, lens: readonly number[]): void {
  const { pen } = d;
  const n = lens.length;
  const tips = lens.map((l, i) => {
    const a = ang + (i / (n - 1) - 0.5) * spread;
    return pt(ankle.x + Math.cos(a) * l, ankle.y + Math.sin(a) * l);
  });
  const web: Pt[] = [ankle];
  tips.forEach((t, i) => {
    web.push(t);
    const next = tips[i + 1];
    if (next) {
      const mid = pt((t.x + next.x) / 2, (t.y + next.y) / 2);
      web.push(pt(ankle.x + (mid.x - ankle.x) * 0.82, ankle.y + (mid.y - ankle.y) * 0.82));
    }
  });
  pen.fill(web.map((p) => pt(p.x + 0.5, p.y + 0.8)), d.ink, 0.12);
  pen.fill(web, PAPER_FILL, 0.8);
  pen.fill(web, B.web, 0.75);
  pen.clipped(web, () => {
    glaze(d, ankle.x, ankle.y, 3.5, 2.2, ang, B.deep, 0.45);
    glaze(d, ankle.x + Math.cos(ang) * 3.5, ankle.y + Math.sin(ang) * 3.5, 2.5, 2, ang, mix(B.web, PAPER_FILL, 0.5), 0.4);
  });
  pen.stroke(closed(web), 0.3, d.ink, 0.75, false);
  for (const t of tips) {
    const toe = capsule(ankle, t, 0.9, 0.5);
    skinWash(d, toe, B.back, B.deep);
    pen.stroke(closed(toe), 0.28, d.ink, 0.9, false);
    pen.dot(t.x, t.y, 0.32, B.tip, 0.9);
  }
}

/** Where a pose puts the legs (for +y; mirrored for −y). */
interface Legs {
  readonly hip: Pt;
  readonly knee: Pt;
  readonly ankle: Pt;
  readonly toes: number;
  readonly spread: number;
  readonly lens: readonly number[];
  readonly shoulder: Pt;
  readonly wrist: Pt;
  readonly fingers: number;
}

const LEGS: Readonly<Record<Pose, Legs>> = {
  sit: {
    hip: pt(-8.4, 5.2), knee: pt(0.4, 9.4), ankle: pt(-7.6, 10.4), toes: Math.PI - 0.15, spread: 1.25, lens: [3.4, 4.6, 5.8, 4.8, 3.5],
    shoulder: pt(3.4, 5.6), wrist: pt(6.6, 8.2), fingers: 0.35,
  },
  hop: {
    hip: pt(-5.2, 3.4), knee: pt(-11.4, 6.2), ankle: pt(-17.4, 5), toes: Math.PI - 0.06, spread: 0.95, lens: [3.6, 4.8, 5.8, 4.9, 3.7],
    shoulder: pt(9.2, 3.4), wrist: pt(16.4, 4.6), fingers: 0.05,
  },
};

const mirror = (p: Pt, s: number): Pt => pt(p.x, p.y * s);

/** The legs: thick thighs and shins barred dark, webbed feet, slim arms with blunt fingers. */
function legs(d: Draw, l: Legs): void {
  for (const s of [-1, 1]) {
    foot(d, mirror(l.ankle, s), s * l.toes, l.spread, l.lens);
    bandedLimb(d, mirror(l.knee, s), mirror(l.ankle, s), 2.8, 1.7, B.back, B.deep, B.blotch, 3, 0.45);
    bandedLimb(d, mirror(l.hip, s), mirror(l.knee, s), 4.6, 3.1, B.back, B.deep, B.blotch, 3, 0.45);
    bandedLimb(d, mirror(l.shoulder, s), mirror(l.wrist, s), 2.2, 1.5, B.back, B.deep, B.blotch, 1, 0.4);
    digits(d, mirror(l.wrist, s), s * l.fingers, 1.5, [1.6, 2.2, 2, 1.5], 0.85, B.back, B.deep, B.tip);
  }
}

function draw(d: Draw, pose: Pose): void {
  const { pen } = d;
  const k = BODY[pose];
  const body = outline(k);
  const air = pose === 'hop';
  castShadow(d, body, air ? pt(2.2, 3.4) : pt(0.9, 1.3), air ? 0.13 : 0.2);
  legs(d, LEGS[pose]);
  // The pale throat and belly show round the very edge.
  skinWash(d, body, B.belly, B.bellyDeep);
  const top = outline(k, 0.93);
  back(d, k, top);
  for (const s of [-1, 1]) {
    tympanum(d, at(k, 2.2, s * 5.1), 1.3 * Math.min(1, k.sy * 1.1));
    const n = at(k, 11.6, s * 1.1);
    pen.dot(n.x, n.y, 0.38, B.deep, 0.95);
  }
  // The mouth's line round the snout.
  pen.hair(closed(body).slice(2, 9), 0.25, d.ink, 0.45);
  pen.hair(closed(body).slice(-9, -2), 0.25, d.ink, 0.45);
  shade(d, top, 0.2);
  pen.stroke(closed(body), 0.55, d.ink, 0.95);
  // The sheen of wet skin.
  pen.clipped(body, () => {
    glaze(d, at(k, 6.5, -2.6).x, at(k, 6.5, -2.6).y, 3, 1.5, -0.3, PAPER_FILL, 0.35);
    glaze(d, at(k, -4.5, -2.8).x, at(k, -4.5, -2.8).y, 3.4, 1.4, -0.2, PAPER_FILL, 0.22);
  });
  for (const s of [-1, 1]) eye(d, at(k, 5.6, s * 4.1), 2.05);
}

export const BULLFROG_ART: SpriteArt<Pose> = {
  frame: 50,
  res: 3,
  poses: ['sit', 'hop'],
  draw,
};
