import { createRng } from '../../logic/rng';
import { closed, type Draw, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { rod } from '../allotmentKit';
import { castShadow, ellipseAt, glaze } from '../propsKit';
import { mix } from '../wash';
import { HAT_UPRIGHT, type HatPose, paintHat, SCARE } from './scarecrowHat';
import { paintSleeve } from './scarecrowSleeve';
import type { BossArt } from './types';

/**
 * The Scarecrow (chapter 6, the Allotment), seen from above. The game
 * draws 'body' at the centre and two 'sleeve's turned round it (at a and
 * a + π): the body is the wide woven straw hat (radius ~29, the part that
 * can be hit) with the faded shirt's shoulders and collar peeping out; a
 * sleeve is one arm along +x from under the hat. 'hurt' knocks the hat
 * askew off the sacking head, straw flying, seeing stars.
 */

/** One straw: an even, fine stalk with a thin ink edge (the pen would taper so short a stroke away). */
function strand(d: Draw, pts: readonly Pt[], colour: string): void {
  rod(d, pts, 1.5, d.ink, 0.7, 0);
  rod(d, pts, 0.95, colour, 1, 0);
}

/** The shirt's shoulders along the crossbar and the collar's points, peeping out round the hat. */
function shoulders(d: Draw): void {
  const { pen } = d;
  const yoke = Array.from({ length: 48 }, (_, i) => {
    const a = (i / 48) * TAU;
    const c = Math.cos(a);
    return pt(c * (30 + 3.5 * c * c), Math.sin(a) * 23);
  });
  castShadow(d, yoke, pt(3, 4.6), 0.18);
  pen.fill(yoke, PAPER_FILL, 1);
  pen.fill(yoke, SCARE.shirt, 0.85);
  pen.clipped(yoke, () => {
    glaze(d, -22, -6, 10, 8, 0, SCARE.shirtPale, 0.5);
    pen.crescent(yoke, pt(-2.5, -4), () => pen.fill(yoke, SCARE.shirtDeep, 0.35));
    for (const s of [-1, 1]) pen.hair([pt(s * 27, -12), pt(s * 31.5, 0), pt(s * 27, 12)], 0.5, SCARE.shirtDeep, 0.7);
  });
  pen.stroke(closed(yoke), 0.95, d.ink, 0.9);
  // A little straw escaping at the neck, front and back.
  for (const a of [1.4, 1.55, 1.72, 4.62, 4.78]) strand(d, [pt(Math.cos(a) * 26, Math.sin(a) * 26), pt(Math.cos(a + 0.04) * 33, Math.sin(a + 0.04) * 33)], SCARE.straw);
}

/** Loose straws flung through the air, each with a flick of motion behind it. */
function flyingStraw(d: Draw): void {
  const { pen } = d;
  const rng = createRng(SCARE.seed + 50);
  for (let k = 0; k < 16; k++) {
    const a = -2.2 + rng() * 2.6 + (k % 2) * Math.PI * 0.75;
    const r = 34 + rng() * 22;
    const c = pt(Math.cos(a) * r + 6, Math.sin(a) * r - 4);
    const t = rng() * Math.PI;
    const len = 3.5 + rng() * 3;
    const p0 = pt(c.x - Math.cos(t) * len, c.y - Math.sin(t) * len);
    const p1 = pt(c.x + Math.cos(t) * len, c.y + Math.sin(t) * len);
    pen.fill(ellipseAt(c.x + 3, c.y + 4.5, len, 0.7, t, 8), d.ink, 0.12);
    strand(d, [p0, c, p1], k % 3 === 0 ? SCARE.strawDeep : SCARE.straw);
    const back = pt(-Math.cos(a), -Math.sin(a));
    pen.hair([pt(c.x + back.x * 3, c.y + back.y * 3), pt(c.x + back.x * 7, c.y + back.y * 7)], 0.4, d.ink, 0.5);
  }
}

/** A small five-pointed star, washed pale gold and inked. */
function star(d: Draw, x: number, y: number, r: number, rot: number): void {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = rot + (i / 10) * TAU;
    return pt(x + Math.cos(a) * (i % 2 === 0 ? r : r * 0.45), y + Math.sin(a) * (i % 2 === 0 ? r : r * 0.45));
  });
  d.pen.fill(pts, PAPER_FILL, 1);
  d.pen.fill(pts, SCARE.straw, 0.85);
  d.pen.hair(closed(pts), 0.6, d.ink, 0.95);
}

/** The sacking head, its weave and the straw hair sticking out, bared where the hat slid off. */
function head(d: Draw): void {
  const { pen } = d;
  const rng = createRng(SCARE.seed + 60);
  for (let k = 0; k < 22; k++) {
    const a = rng() * TAU;
    const p = pt(Math.cos(a) * 13, Math.sin(a) * 12.5);
    pen.hair([p, pt(p.x + Math.cos(a + (rng() - 0.5) * 0.6) * (4 + rng() * 4), p.y + Math.sin(a) * (4 + rng() * 4))], 1.1, k % 3 ? SCARE.straw : SCARE.strawDeep, 1);
  }
  const sack = ellipseAt(0, 0, 14, 13.4, 0, 30);
  pen.fill(sack, PAPER_FILL, 1);
  pen.fill(sack, SCARE.burlap, 0.9);
  pen.clipped(sack, () => {
    for (let x = -14; x < 14; x += 1.4) pen.hair([pt(x, -14), pt(x + 0.3, 14)], 0.25, mix(SCARE.burlap, SCARE.hatDeep, 0.6), 0.55);
    for (let y = -14; y < 14; y += 1.4) pen.hair([pt(-14, y), pt(14, y + 0.3)], 0.25, mix(SCARE.burlap, SCARE.hatDeep, 0.6), 0.4);
    pen.crescent(sack, pt(-2.6, -3.2), () => pen.fill(sack, SCARE.hatDeep, 0.4));
    // A darned seam over the crown of the head.
    pen.hair([pt(-9, -3), pt(0, -5), pt(9, -2)], 0.6, SCARE.hatDeep, 0.8);
    for (let x = -8; x < 9; x += 2.2) pen.hair([pt(x, -5.4), pt(x + 0.4, -2.4)], 0.45, '#5a4028', 0.85);
  });
  pen.stroke(closed(sack), 0.9, d.ink, 0.9);
}

/** The shirt's open collar round the neck, bared when the hat slides off: a shadowed opening and two points. */
function collar(d: Draw): void {
  const { pen } = d;
  const opening = ellipseAt(0, 0, 17, 16, 0, 30);
  pen.fill(opening, SCARE.shirtDeep, 0.55);
  pen.hair(closed(opening), 0.7, d.ink, 0.85);
  for (const s of [-1, 1]) {
    const tip = [pt(s * 2, 14.5), pt(s * 12, 13), pt(s * 9.5, 21.5), pt(s * 3, 19)];
    pen.fill(tip, PAPER_FILL, 1);
    pen.fill(tip, mix(SCARE.shirt, SCARE.shirtPale, 0.4), 0.92);
    pen.crescent(tip, pt(-0.8, -1), () => pen.fill(tip, SCARE.shirtDeep, 0.35));
    pen.hair(closed(tip), 0.6, d.ink, 0.9);
  }
}

function body(d: Draw): void {
  shoulders(d);
  paintHat(d, HAT_UPRIGHT);
}

/** Knocked: the hat tipped up and slid off to the side, the head bared, straw flying, seeing stars. */
const HAT_KNOCKED: HatPose = { c: pt(14, -10), rx: 28, ry: 21, rot: 0.6, crown: pt(4, -3.5) };

function hurt(d: Draw): void {
  const { pen } = d;
  shoulders(d);
  pen.ctx.save();
  pen.ctx.translate(-5, 5);
  collar(d);
  head(d);
  pen.ctx.restore();
  paintHat(d, HAT_KNOCKED);
  flyingStraw(d);
  for (const [x, y, r, a] of [[-34, -24, 4, 0.2], [42, 28, 3.4, 0.9], [-20, 40, 3, 0.5], [44, -38, 3.2, 1.3]] as const) star(d, x, y, r, a);
  for (const [x, y] of [[-40, 4], [16, -46]] as const) {
    pen.hair(Array.from({ length: 24 }, (_, i) => pt(x + Math.cos(i * 0.5) * (0.3 + i * 0.18), y + Math.sin(i * 0.5) * (0.3 + i * 0.15))), 0.7, d.ink, 0.9);
  }
}

function draw(d: Draw, pose: string): void {
  if (pose === 'sleeve') paintSleeve(d);
  else if (pose === 'hurt') hurt(d);
  else body(d);
}

export const SCARECROW_ART: BossArt = { frame: 180, res: 3, poses: ['body', 'sleeve', 'hurt'], draw };
