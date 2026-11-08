import { bezier, cub, type Draw, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { blob } from '../groundKit';
import { createRng } from '../../logic/rng';
import { bilateral, clod, clodRing, crumbs, furCoat, MOLE, paw, snout, star, whiskers } from './moleParts';
import type { BossArt } from './types';

/**
 * The Mole, chapter 1's boss, seen from above facing +x as it heaves up
 * out of its molehill (the heap itself is painted on the board beneath):
 * a velvet near-black body with a blue-grey sheen, a long pink snout with
 * whiskers, eyes lost in the fur, and two great pink spade paws with pale
 * claws braced on the soil, a collar of fresh clods shoved up round it.
 *  - 'up': head and shoulders out, paws spread (the pose it can be hit in);
 *  - 'peek': just the crown of the head and the snout tip out of the soil;
 *  - 'hurt': eyes squeezed shut, paws flung up, stars round its head.
 */
const FRAME = 120;

/** The head and shoulders out of the hole: a pear, broad at the shoulders, the head tapering to the snout. */
function body(): Pt[] {
  return bilateral([
    ...cub(pt(31, 0), pt(31, 4.5), pt(27.5, 9.5), pt(20, 13), 6),
    ...cub(pt(20, 13), pt(12, 16.5), pt(8, 24), pt(-4, 26.5), 8).slice(1),
    ...cub(pt(-4, 26.5), pt(-17, 29), pt(-30, 24), pt(-33.5, 11), 8).slice(1),
    ...cub(pt(-33.5, 11), pt(-35, 5), pt(-35, 2), pt(-35, 0), 4).slice(1),
  ]);
}

/** The loose soil collar it has pushed up and out round its body. */
function collar(d: Draw, c: Pt, rx: number, ry: number, seed: number): void {
  const { pen } = d;
  const rng = createRng(seed);
  const shape = blob(c, rx, ry, rng, 0.2, 40);
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, MOLE.soil, 0.9);
  pen.clipped(shape, () => {
    pen.fill(blob(pt(c.x - rx * 0.3, c.y - ry * 0.4), rx * 0.7, ry * 0.45, rng, 0.2, 20), MOLE.soilLit, 0.5);
    pen.stipple(shape, Math.round(rx * ry * 0.5), () => 0.8, 0.45, MOLE.soilDark);
    pen.stipple(shape, Math.round(rx * ry * 0.25), (x, y) => (x - c.x + y - c.y < 0 ? 0.9 : 0.2), 0.4, MOLE.soilLit);
  });
  pen.crescent(shape, pt(-rx * 0.08, -ry * 0.12), () => pen.fill(shape, MOLE.soilDark, 0.4));
  pen.stroke([...shape, shape[0]!], 0.55, d.ink, 0.5, false);
}

/** Tiny bead eyes, half lost in the fur: a dark bead, a pale rim where the fur parts, a glint. */
function eyes(d: Draw, x: number, y: number): void {
  const { pen } = d;
  for (const s of [-1, 1]) {
    pen.hair(bezier(pt(x - 2.2, s * (y - 0.2)), pt(x, s * (y - 2.1)), pt(x + 2, s * (y - 0.6)), 5), 0.6, MOLE.sheen, 0.7);
    pen.dot(x, s * y, 1.25, '#0b0a10', 1);
    pen.dot(x - 0.35, s * y - 0.45, 0.42, PAPER_FILL, 0.95);
  }
}

/** Eyes screwed shut: little pale crosses in the fur. */
function shutEyes(d: Draw, x: number, y: number): void {
  const { pen } = d;
  for (const s of [-1, 1]) {
    const c = pt(x, s * y);
    for (const [a, b] of [[pt(-2.3, -2.3), pt(2.3, 2.3)], [pt(-2.3, 2.3), pt(2.3, -2.3)]] as const) {
      pen.hair([pt(c.x + a.x, c.y + a.y), pt(c.x + b.x, c.y + b.y)], 2.8, d.ink, 0.95);
      pen.hair([pt(c.x + a.x, c.y + a.y), pt(c.x + b.x, c.y + b.y)], 1.6, PAPER_FILL, 1);
    }
  }
}

/** The face end of the body: eyes (open or shut), whiskers, snout. */
function face(d: Draw, shut: boolean): void {
  if (shut) shutEyes(d, 17.5, 8.6);
  else eyes(d, 17.5, 8.6);
  whiskers(d, 31, 40, 4.4, 10);
}

/** Paw placings: where each sits, which way its claws reach, and its scale. */
interface PawPose {
  readonly c: Pt;
  readonly ang: number;
  readonly s: number;
  readonly splay: number;
  readonly lift: number;
}

const UP_PAWS: PawPose = { c: pt(9, 28.5), ang: 0.85, s: 1.12, splay: 1, lift: 0 };
const HURT_PAWS: PawPose = { c: pt(14, 31.5), ang: 1.35, s: 1.25, splay: 1.5, lift: 1 };

/** Both forepaws, mirrored; a lifted pair throws its shadow further off. */
function paws(d: Draw, p: PawPose): void {
  for (const s of [-1, 1]) {
    const c = pt(p.c.x, s * p.c.y);
    if (p.lift > 0) {
      d.pen.fill(blob(pt(c.x + 5, c.y + 8), 8 * p.s, 6.5 * p.s, createRng(41), 0.2, 16), d.ink, 0.13);
    }
    paw(d, pt(p.c.x - 9, s * 19), c, s * p.ang, p.s, p.splay);
  }
}

/** Clods: those behind the body's rim (drawn under it) and those heaped over its back edge. */
function soil(d: Draw, rx: number, ry: number, cx: number, size: number, seed: number, over: boolean, clear: (a: number) => boolean): void {
  const spots = clodRing(pt(cx, 0), rx, ry, Math.round(rx * 0.9), seed, size, clear);
  for (const c of spots) {
    const back = Math.cos(c.a) < 0.25;
    if (over === (back && c.k < 1.04)) clod(d, c.p, c.s, c.seed);
  }
}

/** Motion marks flicked out round the flailing paws and the head. */
function bonk(d: Draw): void {
  const { pen } = d;
  for (const s of [-1, 1]) {
    for (const [r, a0, a1] of [[47, 0.55, 0.95], [52, 0.6, 0.88]] as const) {
      pen.stroke(Array.from({ length: 7 }, (_, i) => {
        const a = s * (a0 + ((a1 - a0) * i) / 6);
        return pt(4 + Math.cos(a) * r, Math.sin(a) * r);
      }), 0.9, d.ink, 0.8, false);
    }
  }
  const orbit = Array.from({ length: 40 }, (_, i) => {
    const a = (i / 39) * TAU;
    return pt(14 + Math.cos(a) * 12, Math.sin(a) * 19);
  });
  for (let i = 0; i < orbit.length - 3; i += 4) pen.hair(orbit.slice(i, i + 3), 0.95, MOLE.sheen, 0.9);
  star(d, pt(4, -17), 5.2, -0.3);
  star(d, pt(27, -13), 4.2, 0.4);
  star(d, pt(19, 19), 4.6, 0.1);
}

/** The mole heaved up out of the soil: 'up' or, eyes shut and paws flung up, 'hurt'. */
function drawUp(d: Draw, hurt: boolean): void {
  const shape = body();
  const clear = (a: number): boolean => Math.abs(a) < 0.45 || Math.abs(Math.abs(a) - 1.1) < 0.35;
  d.pen.fill(shape.map((p) => pt(p.x + 3, p.y + 4.5)), d.ink, 0.22);
  collar(d, pt(-9, 0), 35, 33, 501);
  crumbs(d, pt(-2, 0), 44, 38, 60, 502);
  soil(d, 37, 31, -5, 3.6, 503, false, clear);
  paws(d, hurt ? HURT_PAWS : UP_PAWS);
  snout(d, 22, 47, 6.4);
  furCoat(d, shape, pt(40, 0), [{ at: pt(-8, -11), r: 22 }, { at: pt(15, -5), r: 9 }], 504, 900);
  face(d, hurt);
  soil(d, 37, 31, -5, 3.6, 503, true, clear);
  if (hurt) bonk(d);
}

/** Just the crown of the head and the snout tip poking out of the soil. */
function drawPeek(d: Draw): void {
  const crown = bilateral([
    ...cub(pt(11, 0), pt(11, 5), pt(7, 9.5), pt(0, 10.5), 6),
    ...cub(pt(0, 10.5), pt(-7, 11.4), pt(-13, 8.5), pt(-13.5, 0), 6).slice(1),
  ]);
  d.pen.fill(crown.map((p) => pt(p.x + 2, p.y + 3)), d.ink, 0.22);
  collar(d, pt(-2, 0), 18, 16, 511);
  crumbs(d, pt(0, 0), 23, 21, 34, 512);
  const clear = (a: number): boolean => Math.abs(a) < 0.4;
  soil(d, 17, 15, -2, 3, 513, false, clear);
  snout(d, 4, 22, 4.6);
  furCoat(d, crown, pt(18, 0), [{ at: pt(-4, -5), r: 10 }], 514, 340, 0.6);
  whiskers(d, 11.5, 17, 3.2, 7);
  soil(d, 17, 15, -2, 3, 513, true, clear);
}

function draw(d: Draw, pose: string): void {
  if (pose === 'peek') drawPeek(d);
  else drawUp(d, pose === 'hurt');
}

export const MOLE_ART: BossArt = { frame: FRAME, res: 3, poses: ['up', 'peek', 'hurt'], draw };
