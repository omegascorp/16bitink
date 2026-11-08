import { bezier, closed, type Draw, pt } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { beadEye, ellipseAt, glaze } from '../critters/preyKit';
import { grizzle, paintFur, type Pelt } from './barrensCrittersBeast';
import { inside } from './barrensCrittersKit';

/**
 * The raccoon's head from above: a grizzled grey crown, a dark band down
 * the brow to the nose, white brows over the black bandit's mask that
 * sweeps back to the cheeks, a white muzzle, a black nose, bright eyes in
 * the mask, white-rimmed ears and fine whiskers.
 */
export const RACCOON = {
  base: '#8e8b85',
  deep: '#3e3a36',
  light: '#d8d3c8',
  dark: '#23201e',
  pale: '#e6e1d5',
  warm: '#8b7559',
  buff: '#b9a98c',
  leg: '#6c645c',
  paw: '#3a3431',
  finger: '#4c4440',
  pawLit: '#6d625c',
  claw: '#d8cdb8',
  mask: '#1c1a19',
  white: '#f4f0e8',
  nose: '#1a1818',
} as const;

const R = RACCOON;

const PELT: Pelt = { base: R.base, deep: R.deep, light: R.light, hair: (_p, r) => grizzle(R.dark, R.base, R.pale, R.warm, 0.3)(r) };

/** The mask on the +y side, from the bridge of the nose round the eye and back to the cheek (head units from C). */
const MASK: readonly Pt[] = [pt(8.6, 1.3), pt(7, 3.2), pt(4.8, 5.4), pt(2.2, 7.6), pt(-1.2, 8.8), pt(-2.4, 7.4), pt(-0.6, 5.4), pt(1.2, 3.4), pt(3.4, 1.7), pt(6, 1)];

type Region = 'mask' | 'brow' | 'muzzle' | 'stripe' | 'cheek' | 'crown';

/** Which marking a point of the head falls in (x, y from the head's centre). */
function region(x: number, y: number): Region {
  const ay = Math.abs(y);
  if (inside(MASK, pt(x, ay))) return 'mask';
  if (((x - 1.2) / 2.6) ** 2 + ((ay - 3.3) / 1.3) ** 2 < 1) return 'brow';
  if (ay < 1.15 && x > -5 && x < 12) return 'stripe';
  if (((x - 9.8) / 4.2) ** 2 + ((ay - 2.3) / 2.1) ** 2 < 1 || x > 12.6) return 'muzzle';
  if (((x + 1.5) / 3) ** 2 + ((ay - 9) / 1.9) ** 2 < 1) return 'cheek';
  return 'crown';
}

const HAIR: Readonly<Record<Region, (r: number) => string>> = {
  mask: (r) => (r < 0.85 ? R.mask : R.deep),
  brow: (r) => (r < 0.7 ? R.white : R.light),
  muzzle: (r) => (r < 0.6 ? R.white : r < 0.85 ? R.light : R.base),
  stripe: (r) => (r < 0.7 ? R.dark : R.deep),
  cheek: (r) => (r < 0.6 ? R.white : R.light),
  crown: (r) => grizzle(R.dark, R.base, R.pale, R.warm, 0.3)(r),
};

/** An ear standing at the back of the crown: a grizzled dark back, rounded, its rim edged white. */
function ear(d: Draw, C: Pt, side: 1 | -1): void {
  const { pen } = d;
  const c = pt(C.x - 4.6, C.y + side * 6.6);
  const shape = [pt(c.x + 1.6, c.y - side * 1.6), pt(c.x + 1.4, c.y + side * 0.6), pt(c.x + 0.2, c.y + side * 2.2), pt(c.x - 1.4, c.y + side * 2.6), pt(c.x - 2.4, c.y + side * 1.4), pt(c.x - 2.2, c.y - side * 0.6), pt(c.x - 0.6, c.y - side * 1.8)];
  pen.fill(shape.map((p) => pt(p.x + 0.8, p.y + 1.2)), d.ink, 0.25);
  pen.fill(shape, R.white, 1);
  const inner = shape.map((p) => pt(c.x + (p.x - c.x) * 0.7 + 0.25, c.y + (p.y - c.y) * 0.7 - side * 0.2));
  pen.fill(inner, R.deep, 0.9);
  pen.clipped(inner, () => glaze(d, c.x - 0.6, c.y - 0.5, 1.4, 1, 0, R.base, 0.6));
  pen.stroke(closed(shape), 0.55, d.ink, 0.9);
}

/** Whiskers fanning from the muzzle, pale over ink. */
function whiskers(d: Draw, C: Pt): void {
  for (const side of [-1, 1]) {
    for (const [ty, tx] of [[6.5, 21], [8.5, 19], [10, 16]] as const) {
      const root = pt(C.x + 12.4, C.y + side * 1.9);
      const w = bezier(root, pt(C.x + 15, C.y + side * ty * 0.6), pt(C.x + tx, C.y + side * ty), 6);
      d.pen.hair(w, 0.5, d.ink, 0.35);
      d.pen.hair(w, 0.3, PAPER_FILL, 0.9);
    }
  }
}

/** Paints the head (its outline given) round C, ears and all; `intent` narrows the eyes on the grab. */
export function paintRaccoonHead(d: Draw, C: Pt, shape: readonly Pt[], intent: boolean): void {
  const { pen } = d;
  const nose = pt(C.x + 15, C.y);
  const at = (x: number, y: number): Pt => pt(C.x + x, C.y + y);
  paintFur(d, PELT, {
    shape,
    dir: (p) => Math.atan2(p.y - nose.y, p.x - nose.x),
    wet: () => {
      glaze(d, C.x - 3, C.y, 7, 7, 0, R.warm, 0.25);
      for (const side of [-1, 1]) {
        pen.fill(MASK.map((p) => at(p.x, p.y * side)), R.mask, 0.92);
        glaze(d, C.x + 1.2, C.y + side * 3.3, 2.6, 1.3, side * 0.2, R.white, 0.95);
        glaze(d, C.x + 9.8, C.y + side * 2.3, 4.2, 2.1, 0, R.white, 0.95);
        glaze(d, C.x - 1.5, C.y + side * 9, 3, 1.9, 0, R.white, 0.9);
      }
      pen.hair([at(-6, 0), at(2, 0), at(9, 0), at(12.5, 0)], 2.2, R.dark, 0.85);
      glaze(d, C.x + 14, C.y, 2.4, 2.6, 0, R.white, 0.9);
    },
    hair: (p, r) => HAIR[region(p.x - C.x, p.y - C.y)](r),
    n: 520, len: 1.9, seed: 7401, tuft: 1.2, line: 0.8,
  });
  for (const side of [-1, 1]) {
    const e = at(4.3, side * 3.4);
    pen.fill(ellipseAt(e.x, e.y, 1.3, intent ? 0.8 : 1.05, side * 0.35, 12), R.mask, 1);
    beadEye(d, e, intent ? 0.75 : 0.95);
    // The pale rim of the brow over the eye.
    pen.hair(bezier(at(2.6, side * 2.6), at(3.8, side * 2.1), at(5.6, side * 2.5), 5), 0.4, R.white, 0.8);
  }
  for (const side of [-1, 1] as const) ear(d, C, side);
  const n = ellipseAt(nose.x - 0.5, nose.y, 1.5, 1.8, 0, 14);
  pen.fill(n, R.nose, 1);
  pen.dot(nose.x - 1, nose.y - 0.6, 0.45, mix(R.base, PAPER_FILL, 0.5), 0.9);
  pen.stroke(closed(n), 0.35, d.ink, 0.9, false);
  whiskers(d, C);
}
