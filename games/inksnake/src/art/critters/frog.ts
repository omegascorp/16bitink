import { bezier, closed, cub, type Draw, pt, shade } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import type { SpriteArt } from '../types';
import { CRITTER_POSES, type CritterPose } from './poses';
import { blotches, eye, foot, FROG_INK as F, hand, limb, tympanum, warts } from './preyFrogParts';
import { bilateral, castShadow, glaze, skinWash } from './preyKit';

/**
 * The frog: a little green frog seen from above facing +x, about 22 long
 * and 15 wide in the body (17 with its folded legs): a bright green back
 * spotted darker, pale ridges running down it, gold eyes bulging on top,
 * eardrums behind them, banded legs and webbed hind feet.
 *  - 'sit': at rest, hind legs folded beside it;
 *  - 'hop': stretched long mid-hop, hind legs straight back, hands reaching ahead.
 */
interface Stretch {
  readonly sx: number;
  readonly sy: number;
  readonly dx: number;
}

const SIT: Stretch = { sx: 1, sy: 1, dx: 0 };
const HOP: Stretch = { sx: 1.06, sy: 0.84, dx: 3 };

const at = (k: Stretch, x: number, y: number): Pt => pt(x * k.sx + k.dx, y * k.sy);

/** The body from above: a rounded snout, the head widening to the shoulders, a rounded rump. */
function outline(k: Stretch, squeeze = 1): Pt[] {
  return bilateral([
    ...cub(pt(11.5, 0), pt(11.5, 1.7), pt(10.6, 3.2), pt(8.9, 4.3), 7),
    ...cub(pt(8.9, 4.3), pt(6.4, 5.8), pt(3.3, 7), pt(0.3, 7.2), 7).slice(1),
    ...cub(pt(0.3, 7.2), pt(-2.8, 7.5), pt(-5.9, 8.2), pt(-8.4, 6.6), 7).slice(1),
    ...cub(pt(-8.4, 6.6), pt(-10.2, 5.1), pt(-10.8, 2.2), pt(-10.8, 0), 6).slice(1),
  ]).map((p) => at(k, p.x * (squeeze < 1 ? 0.985 : 1), p.y * squeeze * 0.92));
}

const SPOTS: readonly (readonly [number, number, number])[] = [
  [-6.2, -2.6, 1.6], [-3.7, 2.3, 1.7], [-7.8, 2.9, 1.2], [-1.9, -4, 1.3], [-0.3, 1, 1.1], [-4.6, -5.2, 1],
  [-9, -1, 1], [1.2, -1.9, 0.9], [1.9, 3.2, 0.9], [-2.8, -1, 0.9], [-4.6, 5.2, 0.95], [5.2, 0, 0.7],
];

/** The body: pale belly round the edge, the green back over it, a brighter head, spots, ridges, eardrums and nostrils. */
function trunk(d: Draw, k: Stretch): void {
  const { pen } = d;
  const body = outline(k);
  const back = outline(k, 0.86);
  skinWash(d, body, F.belly, F.bellyDeep);
  skinWash(d, back, F.back, F.deep, { at: at(k, -2.5, -3), r: 7 * k.sx });
  pen.clipped(back, () => {
    glaze(d, k.dx + 7 * k.sx, 0, 5.2 * k.sx, 4.8 * k.sy, 0, F.head, 0.75);
    blotches(d, back, SPOTS.map(([x, y, r]) => [x * k.sx + k.dx, y * k.sy, r] as const), 77);
  });
  warts(d, back, 60, 78);
  for (const s of [-1, 1]) {
    // A pale ridge down each side of the back, lit along its top and inked beneath.
    const ridge = bezier(at(k, 3, s * 3.9), at(k, -3, s * 4.6), at(k, -8.6, s * 3.2), 10);
    pen.hair(ridge, 0.8, F.fold, 0.75);
    pen.hair(ridge.map((p) => pt(p.x + 0.2, p.y + 0.35)), 0.25, d.ink, 0.5);
    tympanum(d, at(k, 1.3, s * 5.4), 1.05 * Math.min(1, k.sy * 1.1));
    pen.dot(at(k, 10.4, 0).x, s * 1.1 * k.sy, 0.4, F.deep, 0.95);
  }
  // The mouth's line round the snout.
  pen.hair(closed(body).slice(2, 9), 0.25, d.ink, 0.45);
  pen.hair(closed(body).slice(-9, -2), 0.25, d.ink, 0.45);
  shade(d, back, 0.22);
  pen.stroke(closed(body), 0.5, d.ink, 0.95);
  pen.clipped(body, () => glaze(d, at(k, 6, -2.5).x, at(k, 6, -2.5).y, 3, 1.6, -0.3, PAPER_FILL, 0.35));
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
  hip: pt(-7.2, 5), knee: pt(0.2, 8.7), ankle: pt(-6.6, 9.6), toes: Math.PI - 0.12, spread: 1.05, lens: [2.6, 3.5, 4.4, 3.7, 2.7],
  shoulder: pt(2.8, 5.2), wrist: pt(5.8, 7.4), fingers: 0.35,
};
const HOP_LEGS: Legs = {
  hip: pt(-4.6, 3.4), knee: pt(-10, 5.9), ankle: pt(-15.4, 4.9), toes: Math.PI - 0.06, spread: 0.8, lens: [2.8, 3.6, 4.4, 3.7, 2.9],
  shoulder: pt(8.4, 3.4), wrist: pt(15.4, 4.4), fingers: 0.05,
};

const mirror = (p: Pt, s: number): Pt => pt(p.x, p.y * s);

/** Both hind legs (folded or stretched) and both arms, under the body. */
function legs(d: Draw, l: Legs): void {
  for (const s of [-1, 1]) {
    foot(d, mirror(l.ankle, s), s * l.toes, l.spread, l.lens);
    limb(d, mirror(l.knee, s), mirror(l.ankle, s), 2.6, 1.6, 2);
    limb(d, mirror(l.hip, s), mirror(l.knee, s), 4.2, 2.9, 2);
    limb(d, mirror(l.shoulder, s), mirror(l.wrist, s), 2, 1.45, 1);
    hand(d, mirror(l.wrist, s), s * l.fingers, 1.5, [1.5, 2, 1.9, 1.4]);
  }
}

function drawPose(d: Draw, k: Stretch, l: Legs, shadow: Pt, alpha: number): void {
  castShadow(d, outline(k), shadow, alpha);
  legs(d, l);
  trunk(d, k);
  for (const s of [-1, 1]) eye(d, at(k, 5, s * 4.3), 2.1);
}

export const FROG: SpriteArt<CritterPose<'frog'>> = {
  frame: 52,
  res: 3,
  poses: CRITTER_POSES.frog,
  draw: (d, pose) => (pose === 'hop' ? drawPose(d, HOP, HOP_LEGS, pt(2, 3.2), 0.13) : drawPose(d, SIT, SIT_LEGS, pt(0.9, 1.3), 0.2)),
};
