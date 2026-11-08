import { createRng, type Rng } from '../../logic/rng';
import { polar } from '../groundKit';
import { closed, cub, type Draw, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import type { SpriteArt } from '../types';
import { ellipseAt, glaze, model, rimLight, shadowOf } from './birdKit';
import { CROW_PAINT, crowPlumage, foldedOutlines, foldedWing, openWings, paintFolded, paintOpen } from './birdCrowParts';
import { CRITTER_POSES, type CritterPose } from './poses';

/**
 * The American crow, seen from above facing +x: glossy blue-black with a
 * violet sheen, a heavy black bill with its tuft of nasal bristles, the
 * wings folded along the back to the squared tail. 'stand' has its toes
 * peeping out by the chest; 'hop' lifts the wings off the back mid-hop;
 * 'peck' thrusts the head forward and down (the bill foreshortened, the
 * tail tipped up); 'fly0' spreads the wings wide (span about 95), 'fly1'
 * raises them, swept and foreshortened, so the two alternate as a beat.
 */
type CrowPose = CritterPose<'crow'>;

const SEED = 4407;

/** The body: an egg, fullest at the shoulders, narrowing to the tail. */
function egg(cx: number, rx: number, ry: number): Pt[] {
  return Array.from({ length: 40 }, (_, i) => {
    const a = (i / 40) * TAU;
    const c = Math.cos(a);
    return pt(cx + c * rx, Math.sin(a) * ry * (1 - 0.32 * Math.max(0, -c) ** 1.5));
  });
}

interface Head {
  readonly c: Pt;
  readonly rx: number;
  readonly ry: number;
  /** Bill base and tip x (the bill lies along y = 0). */
  readonly bill: readonly [number, number];
  readonly billW: number;
}

const HEAD: Head = { c: pt(16.5, 0), rx: 7, ry: 6.3, bill: [21, 30.5], billW: 2.9 };
/** Pecking: the head thrust forward and down, the bill pointing at the ground so it looks short. */
const PECK_HEAD: Head = { c: pt(21.5, 0), rx: 6.6, ry: 6.1, bill: [26, 31], billW: 3.1 };

function billShape(h: Head): Pt[] {
  const [b, t] = h.bill;
  const l = t - b;
  return [...cub(pt(b, -h.billW), pt(b + l * 0.45, -h.billW * 0.95), pt(b + l * 0.8, -h.billW * 0.5), pt(t, 0), 8), ...cub(pt(t, 0), pt(b + l * 0.8, h.billW * 0.5), pt(b + l * 0.45, h.billW * 0.95), pt(b, h.billW), 8).slice(1)];
}

/** Where the tail's tip edge is, u from -1 (one side) to 1: gently rounded, a small notch between each feather. */
function tailTip(half: number, len: number, u: number): Pt {
  const lobe = Math.abs(Math.sin(((u + 1) / 2) * TAIL_N * Math.PI));
  return pt(TAIL_X - len * (1 - 0.16 * u * u) - lobe * 0.6, half * u * (1 - 0.08 * u * u));
}

const TAIL_X = -9.5;
const TAIL_N = 6;

/** The tail: a fan of broad feathers from under the rump, `half` its half-width at the tip. */
function tailShape(half: number, len: number): Pt[] {
  const us = Array.from({ length: 37 }, (_, i) => -1 + i / 18);
  return [pt(TAIL_X, 3.2), ...us.map((u) => tailTip(half, len, u)).reverse(), pt(TAIL_X, -3.2)];
}

/** The tail painted: glossy black, each feather's shaft and edge picked out, the sheen along its lit side. */
function tail(d: Draw, half: number, len: number): void {
  const { pen } = d;
  const shape = tailShape(half, len);
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, CROW_PAINT.black, 0.96);
  pen.clipped(shape, () => {
    glaze(d, TAIL_X - len * 0.55, 0, len * 0.5, half * 0.8, 0, CROW_PAINT.blue, 0.24);
    glaze(d, TAIL_X - len * 0.8, half * 0.5, len * 0.3, half * 0.5, 0, CROW_PAINT.violet, 0.22);
    for (let i = 0; i < TAIL_N; i++) {
      const u0 = -1 + (2 * i) / TAIL_N;
      const u1 = u0 + 2 / TAIL_N;
      const mid = (u0 + u1) / 2;
      const root = pt(TAIL_X + 1, mid * 2.6);
      // Each feather's far edge in shade, its near edge catching a little light.
      pen.fill([pt(TAIL_X + 1, u1 * 2.6), tailTip(half, len, u1), tailTip(half, len, mid + 0.35 / TAIL_N), pt(TAIL_X + 1, mid * 2.6 + 0.6)], CROW_PAINT.deep, 0.4);
      pen.hair([pt(TAIL_X - 1, u0 * 2.6 + 0.5), tailTip(half, len, u0 + 0.3 / TAIL_N)], 0.5, CROW_PAINT.sheen, 0.22);
      pen.hair([root, tailTip(half, len, mid)].map((p, k) => (k ? pt(p.x + 1.2, p.y) : p)), 0.4, CROW_PAINT.edge, 0.6);
      if (i > 0) pen.hair([pt(TAIL_X, u0 * 2.6), tailTip(half, len, u0)], 0.45, d.ink, 0.6);
    }
  });
  model(d, shape, 2.2, CROW_PAINT.deep, { shade: 0.35, hatch: 0.12, lit: 0, line: 0 });
  rimLight(d, shape, CROW_PAINT.gloss, 0.7, 0.4);
  pen.stroke(closed(shape), 0.85, d.ink, 1);
}

/** Feet when standing: the tips of the scaly black toes peeping out beside the chest. */
function feet(d: Draw): void {
  for (const s of [-1, 1]) {
    const base = pt(7, s * 6.8);
    for (const a of [-0.3, 0.15, 0.6]) {
      const tip = polar(base, a * s + s * 0.2, 3.6);
      d.pen.stroke([base, tip], 1.5, CROW_PAINT.foot, 1, false);
      d.pen.dot(tip.x, tip.y, 0.5, d.ink, 0.9);
    }
  }
}

/** The heavy bill: black, its ridge catching the light, the nasal bristles over its base. */
function bill(d: Draw, h: Head): void {
  const { pen } = d;
  const shape = billShape(h);
  const [b, t] = h.bill;
  pen.fill(shape, CROW_PAINT.bill, 1);
  pen.clipped(shape, () => {
    pen.crescent(shape, pt(-0.6, -1), () => pen.fill(shape, '#000000', 0.5));
    pen.hair([pt(b + 0.5, -0.7), pt(b + (t - b) * 0.55, -0.55), pt(t - 1.2, -0.15)], 0.9, '#9aa6c8', 0.75);
    pen.hair([pt(b + 1, -h.billW * 0.6), pt(b + (t - b) * 0.6, -h.billW * 0.45)], 0.5, '#5c678a', 0.6);
  });
  pen.stroke(closed(shape), 0.8, d.ink, 1, false);
  // Nasal bristles: stiff feathers combed forward over the base of the bill.
  for (let i = 0; i < 9; i++) {
    const y = (i / 8 - 0.5) * h.billW * 1.6;
    const root = pt(b - 2.2, y * 1.1);
    pen.hair([root, pt(b + 2.6 + (1 - Math.abs(y)) * 0.8, y * 0.7)], 0.55, i % 2 ? CROW_PAINT.gloss : CROW_PAINT.black, 0.85);
  }
}

/** The head: glossy crown feathered back from the bill, the dark eyes at its sides with a glint. */
function head(d: Draw, rng: Rng, h: Head): void {
  const { pen } = d;
  const shape = ellipseAt(h.c.x, h.c.y, h.rx, h.ry, 0, 32);
  crowPlumage(d, shape, rng, { dir: () => Math.PI, n: 34, size: 2.4, spots: [[h.c.x - 2, -2.5, 5, CROW_PAINT.violet], [h.c.x + 1.5, 2.5, 4, CROW_PAINT.blue]], line: 1.1 });
  bill(d, h);
  for (const s of [-1, 1]) {
    const e = pt(h.c.x + 1.2, s * (h.ry - 1.3));
    pen.fill(ellipseAt(e.x, e.y, 1.75, 1.35, 0, 14), '#3a3f52', 1);
    pen.fill(ellipseAt(e.x + 0.1, e.y, 1.25, 1, 0, 14), CROW_PAINT.eye, 1);
    pen.dot(e.x - 0.35, e.y - 0.4, 0.42, PAPER_FILL, 0.95);
  }
}

/** Tiny clods kicked up where the bill strikes the ground. */
function clods(d: Draw, at: Pt): void {
  for (const [a, r, s] of [[-0.9, 3.2, 0.5], [0.2, 4, 0.4], [1.1, 3, 0.45], [-0.2, 5.2, 0.3], [0.8, 5.6, 0.32]] as const) {
    const p = polar(at, a, r);
    d.pen.dot(p.x, p.y, s, d.ink, 0.85);
  }
  for (const a of [-1.2, 0, 1.2]) d.pen.hair([polar(at, a, 2.2), polar(at, a, 3.6)], 0.4, d.ink, 0.7);
}

/** The crow on the ground: tail, body, folded wings, head. */
function grounded(d: Draw, pose: 'stand' | 'hop' | 'peck'): void {
  const rng = createRng(SEED);
  const lift = pose === 'hop' ? 0.7 : 0;
  const h = pose === 'peck' ? PECK_HEAD : HEAD;
  const fan = pose === 'hop' ? 5.6 : pose === 'peck' ? 4.8 : 4.2;
  const tailLen = pose === 'peck' ? 13.5 : 16;
  const body = egg(0, 16, 8.3);
  const wings = [foldedWing(lift, false), foldedWing(lift, true)];
  const neck = ellipseAt(15, 0, 6.5, 5.6, 0, 20);
  const sil = [body, ellipseAt(h.c.x, 0, h.rx, h.ry), billShape(h), tailShape(fan, tailLen), ...wings.flatMap(foldedOutlines), ...(pose === 'peck' ? [neck] : [])];
  shadowOf(d, sil, pose === 'hop' ? 6 : 2.4, pose === 'hop' ? 0.09 : 0.16);
  if (pose === 'stand') feet(d);
  tail(d, fan, tailLen);
  crowPlumage(d, body, rng, { dir: () => Math.PI, n: 70, size: 3.4, spots: [[6, -3, 9, CROW_PAINT.blue], [-4, 3, 8, CROW_PAINT.violet], [-10, -1, 5, CROW_PAINT.teal]] });
  for (const w of wings) paintFolded(d, w, rng);
  if (pose === 'peck') crowPlumage(d, neck, rng, { dir: () => Math.PI, n: 16, size: 2.6, spots: [[15, -2, 4, CROW_PAINT.blue]], line: 1 });
  head(d, rng, h);
  if (pose === 'peck') clods(d, pt(h.bill[1] + 0.5, 0));
}

/** The crow in flight: fanned tail, spread wings, the body over their roots, head. */
function flying(d: Draw, up: boolean): void {
  const rng = createRng(SEED + 1);
  const wings = openWings(up);
  tail(d, 8.6, 17);
  for (const w of wings) paintOpen(d, w);
  crowPlumage(d, egg(1, 16, 7.6), rng, { dir: () => Math.PI, n: 60, size: 3.3, spots: [[6, -3, 8, CROW_PAINT.blue], [-4, 3, 8, CROW_PAINT.violet]] });
  head(d, rng, HEAD);
}

function draw(d: Draw, pose: CrowPose): void {
  if (pose === 'fly0' || pose === 'fly1') flying(d, pose === 'fly1');
  else grounded(d, pose);
}

/** The crow. */
export const CROW: SpriteArt<CrowPose> = { frame: 120, res: 3, poses: CRITTER_POSES.crow, draw };
