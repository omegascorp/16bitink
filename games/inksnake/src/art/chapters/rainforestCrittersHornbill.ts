import { createRng, type Rng } from '../../logic/rng';
import { closed, type Draw, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import type { SpriteArt } from '../types';
import { ellipseAt, glaze, model, shadowOf } from '../critters/birdKit';
import { CROW_PAINT, crowPlumage, foldedOutlines, foldedWing, openWings, paintFolded, paintOpen } from '../critters/birdCrowParts';
import { casqueBill, type HornHead } from './rainforestCrittersHornbillBill';

/**
 * The rhinoceros hornbill, seen from above facing +x: a big glossy black
 * bird (drawn at 1.25 × a crow's build, wings after the crow's), a long
 * white tail crossed by a broad black band, and the great ivory bill under
 * its orange-red casque, its tip curling up like a horn; a red eye in a
 * black face.
 *  - 'stand': wings folded along the back, the tail behind;
 *  - 'hop': mid-hop, the wings lifted off the back;
 *  - 'peck': casque and bill thrust down at the tail it's pecking,
 *    foreshortened, the tail tipped up;
 *  - 'fly0', 'fly1': wings spread, then raised (the beat), tail fanned.
 */
type Pose = 'stand' | 'hop' | 'peck' | 'fly0' | 'fly1';

const SCALE = 1.25;
const SEED = 7801;

const H = {
  white: '#f2eee2',
  whiteDeep: '#b9b3a4',
  band: '#141519',
} as const;

function egg(cx: number, rx: number, ry: number): Pt[] {
  return Array.from({ length: 40 }, (_, i) => {
    const a = (i / 40) * TAU;
    const c = Math.cos(a);
    return pt(cx + c * rx, Math.sin(a) * ry * (1 - 0.32 * Math.max(0, -c) ** 1.5));
  });
}

const HEAD: HornHead = { c: pt(17, 0), rx: 6.4, ry: 5.8, bill: [21.5, 39], billW: 3.6, down: 0 };
/** Pecking: the head thrust forward and down at the tail, the bill pointing down so it looks short and the casque looms. */
const PECK_HEAD: HornHead = { c: pt(21, 0), rx: 6.2, ry: 5.7, bill: [25, 33], billW: 3.9, down: 1 };

const TAIL_X = -10;
const TAIL_N = 10;

function tailTip(half: number, len: number, u: number): Pt {
  const lobe = Math.abs(Math.sin(((u + 1) / 2) * TAIL_N * Math.PI));
  return pt(TAIL_X - len * (1 - 0.1 * u * u) - lobe * 0.5, half * u);
}

function tailShape(half: number, len: number): Pt[] {
  const us = Array.from({ length: 41 }, (_, i) => -1 + i / 20);
  return [pt(TAIL_X, 3.6), ...us.map((u) => tailTip(half, len, u)).reverse(), pt(TAIL_X, -3.6)];
}

/** The long tail: white, each feather's shaft and edge, the broad black band across its middle. */
function tail(d: Draw, half: number, len: number): void {
  const { pen } = d;
  const shape = tailShape(half, len);
  const at = (u: number, k: number): Pt => {
    const tip = tailTip(half, len, u);
    const root = pt(TAIL_X + 1, u * 3);
    return pt(root.x + (tip.x - root.x) * k, root.y + (tip.y - root.y) * k);
  };
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, H.white, 0.9);
  pen.clipped(shape, () => {
    for (let i = 0; i < TAIL_N; i++) {
      const u0 = -1 + (2 * i) / TAIL_N;
      const u1 = u0 + 2 / TAIL_N;
      const um = (u0 + u1) / 2;
      pen.fill([at(u1, 0), at(u1, 1.05), at(um + 0.3 / TAIL_N, 1.05), at(um, 0.1)], H.whiteDeep, 0.35);
      pen.hair([at(um, 0.05), at(um, 0.97)], 0.35, H.whiteDeep, 0.7);
      if (i > 0) pen.hair([at(u0, 0.05), at(u0, 1)], 0.35, d.ink, 0.45);
    }
    // The broad black band across the middle, each feather's edge glossed in it.
    const band = [...Array.from({ length: 21 }, (_, i) => at(-1.1 + i * 0.11, 0.32)), ...Array.from({ length: 21 }, (_, i) => at(1.1 - i * 0.11, 0.68))];
    pen.fill(band, H.band, 0.95);
    pen.clipped(band, () => {
      glaze(d, TAIL_X - len * 0.5, -half * 0.3, len * 0.25, half * 0.5, 0, CROW_PAINT.blue, 0.3);
      for (let i = 1; i < TAIL_N; i++) pen.hair([at(-1 + (2 * i) / TAIL_N, 0.3), at(-1 + (2 * i) / TAIL_N, 0.7)], 0.3, CROW_PAINT.gloss, 0.35);
    });
  });
  model(d, shape, 2.4, H.whiteDeep, { shade: 0.4, hatch: 0.18, lit: 0.15, line: 0 });
  pen.stroke(closed(shape), 0.75, d.ink, 1);
}

/** The head: glossy black, a red eye ringed in bare dark skin under long lashes, the bill and casque in front. */
function head(d: Draw, rng: Rng, h: HornHead): void {
  const { pen } = d;
  const shape = ellipseAt(h.c.x, h.c.y, h.rx, h.ry, 0, 32);
  crowPlumage(d, shape, rng, { dir: () => Math.PI, n: 30, size: 2.4, spots: [[h.c.x - 2, -2.5, 5, CROW_PAINT.teal], [h.c.x + 1.5, 2.5, 4, CROW_PAINT.blue]], line: 1 });
  casqueBill(d, h);
  for (const s of [-1, 1]) {
    const e = pt(h.c.x + 1.6, s * (h.ry - 1.4));
    pen.fill(ellipseAt(e.x, e.y, 2, 1.5, 0, 14), '#2a2226', 1);
    pen.fill(ellipseAt(e.x + 0.1, e.y, 1.3, 1.05, 0, 14), '#c8321f', 1);
    pen.dot(e.x + 0.2, e.y, 0.55, '#120b0a', 1);
    pen.dot(e.x - 0.35, e.y - 0.4, 0.38, PAPER_FILL, 0.95);
    // Long lashes, a hornbill's.
    for (const k of [-0.8, 0, 0.8]) pen.hair([pt(e.x + k, e.y - s * 1.3), pt(e.x + k + 0.6, e.y - s * 2.5)], 0.25, d.ink, 0.8);
  }
}

function grounded(d: Draw, pose: 'stand' | 'hop' | 'peck'): void {
  const rng = createRng(SEED);
  const lift = pose === 'hop' ? 0.75 : 0;
  const h = pose === 'peck' ? PECK_HEAD : HEAD;
  const fan = pose === 'hop' ? 6.4 : pose === 'peck' ? 6 : 5.2;
  const tailLen = pose === 'peck' ? 21 : 25;
  const body = egg(0, 16, 8.6);
  const wings = [foldedWing(lift, false), foldedWing(lift, true)];
  const neck = ellipseAt(14.5, 0, 7, 5.8, 0, 20);
  shadowOf(d, [body, ellipseAt(h.c.x, 0, h.rx, h.ry), neck, tailShape(fan, tailLen), ...wings.flatMap(foldedOutlines)], pose === 'hop' ? 6 : 2.4, pose === 'hop' ? 0.09 : 0.16);
  tail(d, fan, tailLen);
  crowPlumage(d, body, rng, { dir: () => Math.PI, n: 70, size: 3.4, spots: [[6, -3, 9, CROW_PAINT.teal], [-4, 3, 8, CROW_PAINT.blue]] });
  for (const w of wings) paintFolded(d, w, rng);
  crowPlumage(d, neck, rng, { dir: () => Math.PI, n: 16, size: 2.6, spots: [[15, -2, 4, CROW_PAINT.blue]], line: 0.9 });
  head(d, rng, h);
}

function flying(d: Draw, up: boolean): void {
  const rng = createRng(SEED + 1);
  tail(d, 8.4, 25);
  // The crow's wings, a touch smaller here so the spread tips stay in the frame.
  const { ctx } = d.pen;
  ctx.save();
  ctx.scale(0.9, 0.9);
  for (const w of openWings(up)) paintOpen(d, w);
  ctx.restore();
  crowPlumage(d, egg(1, 16, 7.8), rng, { dir: () => Math.PI, n: 60, size: 3.3, spots: [[6, -3, 8, CROW_PAINT.teal], [-4, 3, 8, CROW_PAINT.blue]] });
  head(d, rng, HEAD);
}

function draw(d: Draw, pose: Pose): void {
  const { ctx } = d.pen;
  ctx.save();
  ctx.scale(SCALE, SCALE);
  if (pose === 'fly0' || pose === 'fly1') flying(d, pose === 'fly1');
  else grounded(d, pose);
  ctx.restore();
}

export const HORNBILL_ART: SpriteArt<Pose> = {
  frame: 120,
  res: 2,
  poses: ['stand', 'hop', 'peck', 'fly0', 'fly1'],
  draw,
};
