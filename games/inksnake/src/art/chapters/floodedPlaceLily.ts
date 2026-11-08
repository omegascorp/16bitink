import type { Rng } from '../../logic/rng';
import { blob, polar, SHADOW } from '../groundKit';
import { closed, type Draw, oval, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { glaze } from '../snakes/cornPaint';
import { mix } from '../wash';
import { PAD, PAD_DEEP, PAD_LIT, PAD_RIM, PETAL, PETAL_PINK, SHADE, SKY, TEA_DEEP } from './floodedPlaceKit';

/**
 * Water lilies, painted on the cover layer over the snake: one giant
 * Victoria pad (the Amazon's, its rim turned up and red underneath, its
 * face netted with ribs) among a mat of ordinary lily pads, each notched
 * to its stem, a few curling at the edge, with one white flower opening
 * pink. Opaque (the mat closes up under the pads) and inside about r × 1.12.
 */

/** A round pad's outline round c, radius s, its V notch towards `notch`, the edge wavering a little. */
function padShape(c: Pt, s: number, notch: number, rng: Rng, cut = 0.32): Pt[] {
  const n = 30;
  const ph = rng() * TAU;
  const pts: Pt[] = [];
  for (let i = 0; i < (cut > 0 ? n + 1 : n); i++) {
    const a = notch + cut / 2 + ((TAU - cut) * i) / n;
    const k = 1 + 0.03 * Math.sin(a * 3 + ph) + 0.02 * Math.sin(a * 7 - ph);
    pts.push(polar(c, a, s * k));
  }
  if (cut > 0) pts.push(polar(c, notch, s * 0.12));
  return pts;
}

/** An ordinary lily pad: its shadow, its green (a darker heart, a lit edge towards the light), veins fanning from the stem, an edge curled up. */
function lilyPad(d: Draw, c: Pt, s: number, rng: Rng): void {
  const { pen } = d;
  const notch = rng() * TAU;
  const shape = padShape(c, s, notch, rng);
  pen.fill(shape.map((p) => pt(p.x + SHADOW.x * 1.6, p.y + SHADOW.y * 1.6)), SHADE, 0.35);
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, mix(PAD, rng() < 0.5 ? PAD_LIT : PAD_DEEP, rng() * 0.4), 0.92);
  pen.clipped(shape, () => {
    glaze(pen.ctx, c.x - s * 0.3, c.y - s * 0.35, s * 0.8, s * 0.6, 0, PAD_LIT, 0.4);
    glaze(pen.ctx, c.x + s * 0.4, c.y + s * 0.45, s * 0.8, s * 0.5, 0, PAD_DEEP, 0.45);
    for (let i = 0; i < 11; i++) {
      const a = notch + 0.3 + ((TAU - 0.6) * i) / 10;
      pen.hair([polar(c, notch, s * 0.1), polar(c, a, s * 0.5), polar(c, a + 0.05, s * 0.93)], 0.3, PAD_DEEP, 0.45);
    }
    // A curl at the edge: the pad's red underside showing.
    if (rng() < 0.6) {
      const a = notch + Math.PI + (rng() - 0.5) * 2;
      const curl = blob(polar(c, a, s * 0.92), s * 0.34, s * 0.12, rng, 0.2, 12, a + Math.PI / 2);
      pen.fill(curl, PAD_RIM, 0.75);
    }
    // Drops of water standing on it, catching the light.
    for (let k = 0; k < 3; k++) {
      const p = polar(c, rng() * TAU, rng() * s * 0.7);
      pen.dot(p.x, p.y, 0.7, SKY, 0.8);
      pen.dot(p.x + 0.4, p.y + 0.5, 0.5, PAD_DEEP, 0.5);
    }
  });
  pen.stroke(closed(shape), 0.9, d.ink, 0.8, false);
}

/** The Victoria pad: a flat round face netted into cells by ribs, its rim turned up, red outside, casting its shade in across the face. */
function victoria(d: Draw, c: Pt, s: number, rng: Rng): void {
  const { pen } = d;
  const notch = rng() * TAU;
  // The Victoria's pad is whole: no notch to its stem, just a cleft in the rim.
  const outer = padShape(c, s, notch, rng, 0);
  const face = padShape(c, s - 3, notch, rng, 0);
  pen.fill(outer.map((p) => pt(p.x + SHADOW.x * 3.5, p.y + SHADOW.y * 3.5)), SHADE, 0.4);
  pen.fill(outer, PAPER_FILL, 1);
  pen.fill(outer, PAD_RIM, 0.92);
  pen.clipped(outer, () => glaze(pen.ctx, c.x + s * 0.5, c.y + s * 0.55, s * 0.9, s * 0.7, 0, '#5a1d1c', 0.5));
  pen.fill(face, PAPER_FILL, 1);
  pen.fill(face, mix(PAD, PAD_LIT, 0.15), 0.94);
  pen.clipped(face, () => {
    glaze(pen.ctx, c.x + s * 0.15, c.y + s * 0.2, s * 0.9, s * 0.9, 0, PAD_LIT, 0.25);
    // The ribs: spokes from the middle, and rings of cross-ribs between them.
    const spokes = 22;
    for (let i = 0; i < spokes; i++) {
      const a = notch + (i / spokes) * TAU;
      pen.hair([polar(c, a, s * 0.05), polar(c, a + 0.02, s * 0.5), polar(c, a, s * 0.97)], 0.45, PAD_DEEP, 0.55);
    }
    for (const k of [0.32, 0.55, 0.76]) {
      for (let i = 0; i < spokes; i++) {
        const a0 = notch + (i / spokes) * TAU;
        const a1 = notch + ((i + 1) / spokes) * TAU;
        const rr = s * (k + (rng() - 0.5) * 0.04);
        pen.hair([polar(c, a0, rr), polar(c, (a0 + a1) / 2, rr * 1.02), polar(c, a1, rr)], 0.32, PAD_DEEP, 0.4);
      }
    }
    // The upturned rim's shade, thrown in from the lit side, and the lit inner face of the far rim.
    pen.crescent(face, pt(SHADOW.x * 4, SHADOW.y * 4), () => pen.fill(face, SHADE, 0.28));
    pen.crescent(face, pt(-SHADOW.x * 3, -SHADOW.y * 3), () => pen.fill(face, PAD_LIT, 0.4));
    for (let k = 0; k < 5; k++) {
      const p = polar(c, rng() * TAU, rng() * s * 0.8);
      pen.dot(p.x, p.y, 0.9, SKY, 0.75);
    }
  });
  pen.hair(closed(face), 0.6, d.ink, 0.6);
  pen.hair([polar(c, notch - 0.03, s - 3.2), polar(c, notch, s + 0.3)], 0.6, d.ink, 0.7);
  pen.stroke(closed(outer), 1.2, d.ink, 0.9, false);
}

/** A water lily flower: rings of pointed petals, white turning pink at their bases, a gold heart. */
function flower(d: Draw, c: Pt, s: number, rng: Rng): void {
  const { pen } = d;
  pen.fill(oval(c.x + SHADOW.x * 2, c.y + SHADOW.y * 2, s, s, 18), SHADE, 0.3);
  for (const [k, n, col] of [[1, 9, PETAL], [0.72, 8, mix(PETAL, PETAL_PINK, 0.5)], [0.45, 7, PETAL_PINK]] as const) {
    const ph = rng() * TAU;
    for (let i = 0; i < n; i++) {
      const a = ph + (i / n) * TAU;
      const tip = polar(c, a, s * k);
      const side = pt(-Math.sin(a) * s * k * 0.22, Math.cos(a) * s * k * 0.22);
      const mid = polar(c, a, s * k * 0.5);
      const petal = [c, pt(mid.x + side.x, mid.y + side.y), tip, pt(mid.x - side.x, mid.y - side.y)];
      pen.fill(petal, col, 0.95);
      pen.hair(closed(petal), 0.3, d.ink, 0.35);
    }
  }
  pen.dot(c.x, c.y, s * 0.2, '#e7b43c', 1);
  pen.dot(c.x - s * 0.06, c.y - s * 0.06, s * 0.08, '#f8e7a0', 0.9);
}

export function lilies(d: Draw, c: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  // The mat: pads crowded under pads, so nothing below shows.
  const mat = blob(c, r * 1.02, r * 0.98, rng, 0.1, 30, rng() * TAU);
  pen.fill(mat.map((p) => pt(p.x + SHADOW.x * 2, p.y + SHADOW.y * 2)), SHADE, 0.3);
  pen.fill(mat, PAD_DEEP, 0.96);
  pen.clipped(mat, () => glaze(pen.ctx, c.x, c.y, r, r, 0, TEA_DEEP, 0.3));
  const big = polar(c, rng() * TAU, r * 0.18);
  const bigR = r * 0.6;
  const smalls: { p: Pt; s: number }[] = [];
  for (let k = 0; k < 60 && smalls.length < 9; k++) {
    const p = polar(c, rng() * TAU, r * (0.35 + rng() * 0.55));
    const s = r * (0.2 + rng() * 0.14);
    if (Math.hypot(p.x - c.x, p.y - c.y) + s > r * 1.1) continue;
    if (Math.hypot(p.x - big.x, p.y - big.y) < bigR + s * 0.2) continue;
    if (smalls.some((q) => Math.hypot(q.p.x - p.x, q.p.y - p.y) < (q.s + s) * 0.7)) continue;
    smalls.push({ p, s });
  }
  for (const q of smalls) lilyPad(d, q.p, q.s, rng);
  victoria(d, big, bigR, rng);
  const fl = smalls[0];
  if (fl) flower(d, polar(fl.p, rng() * TAU, fl.s * 0.3), r * 0.17, rng);
}
