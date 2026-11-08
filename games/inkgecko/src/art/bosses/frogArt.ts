import { bezier, closed, cub, type Draw, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { glaze } from '../propsKit';
import { bilateral, blotches, eye, foot, FROG, hand, limb, sac, skinWash, swirl, tympanum, warts } from './frogParts';
import type { BossArt } from './types';

/**
 * The Bullfrog, chapter 2's boss, seen from above facing +x on its lily
 * pad (the pad is painted on the board beneath): a broad olive body
 * mottled dark, a greener head with gold-ringed eyes bulging on top and
 * big eardrums behind them, the pale belly showing at its flanks, banded
 * legs and webbed hind feet.
 *  - 'sit': at rest, hind legs folded beside it;
 *  - 'croak': the same with two pale vocal sacs ballooned out at the sides of its head;
 *  - 'leap': mid-hop, stretched long, hind legs straight back, hands reaching ahead;
 *  - 'hurt': sitting with its eyes screwed shut and dizzy swirls round its head.
 */
const FRAME = 130;

/** How the body is stretched for a pose: x and y scales, then a shift forward. */
interface Stretch {
  readonly sx: number;
  readonly sy: number;
  readonly dx: number;
}

const SIT: Stretch = { sx: 1, sy: 1, dx: 0 };
const LEAP: Stretch = { sx: 1.06, sy: 0.8, dx: 12 };

const at = (k: Stretch, x: number, y: number): Pt => pt(x * k.sx + k.dx, y * k.sy);

/** The body from above: a broad rounded snout, wide shoulders, a rounded rump. */
function outline(k: Stretch, squeeze = 1): Pt[] {
  return bilateral([
    ...cub(pt(37, 0), pt(37, 5), pt(34.5, 9.5), pt(29, 13), 7),
    ...cub(pt(29, 13), pt(21, 17.5), pt(11, 21.5), pt(1, 22.5), 7).slice(1),
    ...cub(pt(1, 22.5), pt(-9, 23.5), pt(-19, 26), pt(-27, 21), 7).slice(1),
    ...cub(pt(-27, 21), pt(-33, 16), pt(-35, 7), pt(-35, 0), 6).slice(1),
  ]).map((p) => at(k, p.x * (squeeze < 1 ? 0.985 : 1), p.y * squeeze));
}

const SPOTS: readonly (readonly [number, number, number])[] = [
  [-20, -8, 4.6], [-12, 7, 5], [-25, 9, 3.6], [-6, -13, 3.8], [-1, 3, 3], [-15, -17, 3],
  [-29, -3, 3], [4, -6, 2.5], [6, 10, 2.6], [-9, -3, 2.7], [-15, 17, 2.8], [-3, 16, 2.4], [2, -16, 2.2],
];

/** The body: pale belly round the edge, the olive back over it, a greener head, mottling, warts, the eardrums, fold and nostrils. */
function trunk(d: Draw, k: Stretch): void {
  const { pen } = d;
  const body = outline(k);
  const back = outline(k, 0.87);
  skinWash(d, body, FROG.belly, FROG.bellyDeep);
  skinWash(d, back, FROG.back, FROG.deep, { at: at(k, -8, -9), r: 20 * k.sx });
  pen.clipped(back, () => {
    glaze(d, k.dx + 22 * k.sx, 0, 16 * k.sx, 15 * k.sy, 0, FROG.head, 0.75);
    blotches(d, back, SPOTS.map(([x, y, r]) => [x * k.sx + k.dx, y * k.sy, r] as const), 77);
  });
  warts(d, back, 260, 78);
  pen.hair(closed(back).slice(0, 12), 0.45, d.ink, 0.5);
  pen.hair(closed(back).slice(-12), 0.45, d.ink, 0.5);
  for (const s of [-1, 1]) {
    tympanum(d, at(k, 4, s * 16.5), 4.6 * Math.min(1, k.sy * 1.1));
    const fold = bezier(at(k, 11, s * 16), at(k, 1, s * 10), at(k, -9, s * 19.5), 10);
    pen.hair(fold, 1.3, PAPER_FILL, 0.4);
    pen.hair(fold.map((p) => pt(p.x + 0.5, p.y + 0.7)), 0.5, d.ink, 0.6);
    pen.dot(at(k, 33, 0).x, s * 3.4 * k.sy, 0.75, FROG.deep, 0.95);
  }
  pen.stroke(closed(body), 1.3, d.ink, 0.95);
}

/** Leg placings for a pose: hip, knee, ankle and the foot's heading per side (for +y; mirrored for −y). */
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

const SIT_LEGS: Legs = {
  hip: pt(-25, 19), knee: pt(-3, 33), ankle: pt(-25, 38.5), toes: Math.PI - 0.3, spread: 1.2, lens: [10, 13.5, 17, 14.5, 10.5],
  shoulder: pt(9, 18), wrist: pt(19, 27), fingers: 0.3,
};
const LEAP_LEGS: Legs = {
  hip: pt(-15, 10.5), knee: pt(-33, 14), ankle: pt(-49, 14.5), toes: Math.PI - 0.1, spread: 0.75, lens: [9, 11.5, 14, 12, 9.5],
  shoulder: pt(27, 11), wrist: pt(50, 14), fingers: 0.05,
};

const mirror = (p: Pt, s: number): Pt => pt(p.x, p.y * s);

/** Both hind legs (folded or stretched) and both arms, under the body. */
function legs(d: Draw, l: Legs): void {
  for (const s of [-1, 1]) {
    foot(d, mirror(l.ankle, s), s * l.toes, l.spread, l.lens);
    limb(d, mirror(l.hip, s), mirror(l.knee, s), 13, 9, 2);
    limb(d, mirror(l.knee, s), mirror(l.ankle, s), 8.5, 5.4, 2);
    limb(d, mirror(l.shoulder, s), mirror(l.wrist, s), 6.4, 4.6, 1);
    hand(d, mirror(l.wrist, s), s * l.fingers, 1.5, [5, 6.6, 6.2, 4.6]);
  }
}

/** Eyes on top of the head, open or screwed shut. */
function eyes(d: Draw, k: Stretch, shut: boolean): void {
  for (const s of [-1, 1]) eye(d, at(k, 17, s * 13), 5.4, shut);
}

/** Dizzy marks: a dashed orbit round the head and swirls riding it. */
function daze(d: Draw): void {
  const { pen } = d;
  const ring = Array.from({ length: 49 }, (_, i) => {
    const a = (i / 48) * TAU;
    return pt(15 + Math.cos(a) * 15, Math.sin(a) * 25);
  });
  for (let i = 0; i < ring.length - 3; i += 4) {
    pen.hair(ring.slice(i, i + 3), 2, PAPER_FILL, 0.6);
    pen.hair(ring.slice(i, i + 3), 0.8, d.ink, 0.85);
  }
  swirl(d, pt(2, -22), 5, 0.4);
  swirl(d, pt(29, 17), 4.6, 2.2);
  swirl(d, pt(27, -19), 3.8, 4);
}

function drawSit(d: Draw, pose: string): void {
  d.pen.fill(outline(SIT).map((p) => pt(p.x + 2.6, p.y + 4)), d.ink, 0.2);
  legs(d, SIT_LEGS);
  if (pose === 'croak') for (const s of [-1, 1]) sac(d, pt(22, s * 24), 12.5, 11);
  trunk(d, SIT);
  eyes(d, SIT, pose === 'hurt');
  if (pose === 'hurt') daze(d);
}

function drawLeap(d: Draw): void {
  d.pen.fill(outline(LEAP).map((p) => pt(p.x + 6, p.y + 10)), d.ink, 0.13);
  legs(d, LEAP_LEGS);
  trunk(d, LEAP);
  eyes(d, LEAP, false);
}

function draw(d: Draw, pose: string): void {
  if (pose === 'leap') drawLeap(d);
  else drawSit(d, pose);
}

export const FROG_ART: BossArt = { frame: FRAME, res: 3, poses: ['sit', 'croak', 'leap', 'hurt'], draw };
