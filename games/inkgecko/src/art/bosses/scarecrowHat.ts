import { createRng } from '../../logic/rng';
import { closed, type Draw, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { glaze } from '../propsKit';
import { mix } from '../wash';

/**
 * The Scarecrow's wide woven straw hat seen from above: a plaited brim
 * coiled round and round, frayed at its edge with a tear in it, a domed
 * crown of tighter coils with a pinch in its top, and a faded red band.
 * `HatPose` lets the hurt pose knock it askew: squashed as it tilts, its
 * crown slid towards the side that lifts.
 */
export const SCARE = {
  straw: '#e2c167',
  strawDeep: '#9a7434',
  hat: '#d6b46a',
  hatDeep: '#6e5024',
  band: '#9c4a3a',
  shirt: '#6f86b0',
  shirtPale: '#a9b7cc',
  shirtDeep: '#2d3a63',
  wood: '#8a6440',
  burlap: '#c4a878',
  seed: 6620,
} as const;

export interface HatPose {
  readonly c: Pt;
  /** Brim radius along its own x and y (y shorter when tilted). */
  readonly rx: number;
  readonly ry: number;
  readonly rot: number;
  /** Where the crown sits relative to the brim's centre, in brim units. */
  readonly crown: Pt;
}

export const HAT_UPRIGHT: HatPose = { c: pt(0, 0), rx: 29, ry: 29, rot: 0, crown: pt(-1.2, -1.2) };

/** A point on the hat: r out (in brim units, 29 = the brim's edge) at angle a, about centre o. */
function mapper(h: HatPose): (o: Pt, r: number, a: number) => Pt {
  const [cs, sn] = [Math.cos(h.rot), Math.sin(h.rot)];
  const [kx, ky] = [h.rx / 29, h.ry / 29];
  return (o, r, a) => {
    const x = (o.x + Math.cos(a) * r) * kx;
    const y = (o.y + Math.sin(a) * r) * ky;
    return pt(h.c.x + x * cs - y * sn, h.c.y + x * sn + y * cs);
  };
}

const ringOf = (at: (o: Pt, r: number, a: number) => Pt, o: Pt, r: (a: number) => number, n: number): Pt[] =>
  Array.from({ length: n }, (_, i) => at(o, r((i / n) * TAU), (i / n) * TAU));

/** Coils of plaited straw from r0 out to r1 round o: a seam between coils, herringbone stitches along each. */
function plait(d: Draw, at: (o: Pt, r: number, a: number) => Pt, o: Pt, r0: number, r1: number, wob: (a: number) => number): void {
  const { pen } = d;
  let flip = 1;
  for (let r = r0; r < r1; r += 2.3) {
    const n = Math.max(12, Math.round((TAU * r) / 1.5));
    pen.hair(closed(ringOf(at, o, (a) => r + wob(a), n)), 0.32, SCARE.hatDeep, 0.45);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const rr = r + 1.15 + wob(a);
      const s = (flip * 0.9) / rr;
      pen.hair([at(o, rr - 0.85, a - s), at(o, rr + 0.85, a + s)], 0.3, SCARE.strawDeep, 0.5);
    }
    flip = -flip;
  }
}

/** The whole hat, its shadow included; returns the brim's outline. */
export function paintHat(d: Draw, h: HatPose): Pt[] {
  const { pen } = d;
  const rng = createRng(SCARE.seed + 1);
  const at = mapper(h);
  const o = pt(0, 0);
  const [p1, p2] = [rng() * TAU, rng() * TAU];
  const wob = (a: number): number => 0.3 * Math.sin(a * 3 + p1) + 0.2 * Math.sin(a * 5 + p2);
  const brim = ringOf(at, o, (a) => 29 + wob(a), 72);
  const cr = 13;
  const crown = ringOf(at, h.crown, (a) => cr + wob(a + 1) * 0.6, 40);
  pen.fill(brim.map((p) => pt(p.x + 4, p.y + 5.5)), d.ink, 0.2);
  // The brim: straw wash, lit to the upper left, a pool of shade lower right, then the plait.
  pen.fill(brim, PAPER_FILL, 1);
  pen.fill(brim, SCARE.hat, 0.88);
  pen.clipped(brim, () => {
    const lit = at(o, 14, -2.3);
    glaze(d, lit.x, lit.y, 15, 10, -0.6, PAPER_FILL, 0.35);
    pen.crescent(brim, pt(-3.5, -4.5), () => pen.fill(brim, SCARE.hatDeep, 0.35));
    plait(d, at, o, cr + 1, 29, wob);
    // Weather: a few darker rain stains and grit.
    for (let k = 0; k < 4; k++) {
      const p = at(o, 17 + rng() * 9, rng() * TAU);
      glaze(d, p.x, p.y, 4 + rng() * 3, 2.5 + rng() * 2, rng() * 3, SCARE.strawDeep, 0.3);
    }
    pen.stipple(brim, 120, () => 0.5, 0.3, SCARE.hatDeep);
  });
  const ta = 2.6;
  // The crown: its shadow on the brim, a tighter coil, a pinch in the top, the band.
  pen.fill(crown.map((p) => pt(p.x + 2.4, p.y + 3.3)), SCARE.hatDeep, 0.4);
  pen.fill(crown, PAPER_FILL, 1);
  pen.fill(crown, mix(SCARE.hat, SCARE.straw, 0.4), 0.88);
  pen.clipped(crown, () => {
    plait(d, at, h.crown, 1.4, cr - 1.6, (a) => wob(a + 1) * 0.4);
    const lit = at(h.crown, 5, -2.4);
    glaze(d, lit.x, lit.y, 7, 5, -0.6, PAPER_FILL, 0.45);
    pen.crescent(crown, pt(-2.6, -3.2), () => pen.fill(crown, SCARE.hatDeep, 0.4));
    const pinch = [at(h.crown, 4, Math.PI), at(h.crown, 1, Math.PI + 0.2), at(h.crown, 4, 0)];
    pen.hair(pinch, 0.8, SCARE.hatDeep, 0.55);
  });
  pen.stroke(closed(crown), 0.8, d.ink, 0.85);
  const ringAt = (k: number): Pt[] => ringOf(at, h.crown, (a) => cr + k + wob(a + 1) * 0.6, 40);
  const band = [...ringAt(2.4), ...ringAt(-0.4).reverse()];
  pen.fill(band, SCARE.band, 0.92);
  pen.clipped(band, () => pen.crescent(ringAt(2.4), pt(-1.2, -1.6), () => pen.fill(band, '#4a1e18', 0.35)));
  pen.hair(closed(ringOf(at, h.crown, (a) => cr + 0.5 + wob(a + 1) * 0.6, 40)), 0.7, mix(SCARE.band, PAPER_FILL, 0.45), 0.55);
  pen.hair(closed(ringOf(at, h.crown, (a) => cr - 0.35 + wob(a + 1) * 0.6, 40)), 0.45, d.ink, 0.7);
  // The band's knot at the back, its two tails.
  const knot = at(h.crown, cr + 1, 2.4);
  pen.dot(knot.x, knot.y, 1.8, SCARE.band, 0.95);
  for (const s of [-0.25, 0.2]) pen.stroke([knot, at(h.crown, cr + 5, 2.4 + s)], 1.5, SCARE.band, 0.9, false);
  pen.hair(closed(ringOf(at, h.crown, (a) => cr + 2.4 + wob(a + 1) * 0.6, 40)), 0.55, d.ink, 0.8);
  // The frayed edge: straw ends poking out all round, then the brim's contour.
  for (let k = 0; k < 52; k++) {
    const a = k < 6 ? ta + (rng() - 0.5) * 0.25 : rng() * TAU;
    const len = 1.4 + rng() * 2.4 + (k < 6 ? 2.5 : 0);
    const ends = [at(o, 28.2, a), at(o, 28.2 + len, a + (rng() - 0.5) * 0.12)];
    if (k % 2 === 0) pen.hair(ends, 1.2, d.ink, 0.55);
    pen.hair(ends, 0.85, k % 3 === 0 ? SCARE.strawDeep : SCARE.straw, 1);
  }
  pen.stroke(closed(brim), 1.05, d.ink, 0.92);
  return brim;
}
