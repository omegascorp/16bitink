import { bezier, closed, type Draw, pt } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { beadEye, ellipseAt, glaze } from '../critters/preyKit';
import { headShape, paintFur, type Pelt } from './barrensCrittersBeast';

/**
 * The Badger's head from above: a long wedge, white, with a broad black
 * stripe either side running from near the nose back over the small eyes to
 * the ears, a white blaze between them down the middle; the ears small and
 * round, black rimmed white; a black nose. Lunging, the head lifts (its
 * snout shorter from above) and the jaws gape on a pink mouth, its long
 * canines bared. Nose down to sniff, the snout foreshortens too.
 */
export const BADGER = {
  grey: '#9a968f',
  greyDeep: '#4b4845',
  greyLight: '#d9d5cc',
  silver: '#e6e2d9',
  warm: '#a39885',
  black: '#1c1a19',
  white: '#f5f2ea',
  leg: '#262321',
  claw: '#d8d0bd',
  nose: '#161413',
  mouth: '#b4505a',
  mouthDeep: '#5e2430',
  tooth: '#fbf8ef',
  hole: '#1d1712',
  soil: '#6e5a42',
  soilLight: '#9c8665',
  soilDeep: '#3d3024',
} as const;

const B = BADGER;

/** The head's half width at x (for laying the stripes along it). */
function halfAt(C: Pt, R: number, snout: number, x: number): number {
  const u = Math.max(0, Math.min(1, (x - C.x) / (R + snout)));
  return x < C.x ? R * 0.96 : R * (1 - 0.78 * u ** 1.25);
}

/** How the stripes fall at p: 'white' blaze, 'black' stripe, 'cheek' white. */
function stripeAt(C: Pt, R: number, snout: number, p: Pt): 'blaze' | 'stripe' | 'cheek' {
  const v = Math.abs(p.y - C.y) / Math.max(0.5, halfAt(C, R, snout, p.x));
  const nearNose = p.x > C.x + R + snout * 0.72;
  if (nearNose) return 'blaze';
  const inner = 0.17 + 0.06 * Math.max(0, (C.x - p.x) / R);
  return v < inner ? 'blaze' : v < 0.72 ? 'stripe' : 'cheek';
}

/** The outline round C: crown R wide, the snout running `snout` further. */
export const badgerHead = (C: Pt, R: number, snout: number): Pt[] => headShape(C, R, 0.1, 1.8, snout, 1.7, 56);

/** One black stripe's shape on the `s` side, from near the nose back past the crown. */
function stripe(C: Pt, R: number, snout: number, s: number): Pt[] {
  const xs = Array.from({ length: 14 }, (_, i) => C.x + R + snout * 0.74 - (i / 13) * (R * 2.1 + snout * 0.74));
  const edge = (k: (x: number) => number): Pt[] => xs.map((x) => pt(x, C.y + s * k(x) * halfAt(C, R, snout, x)));
  const inner = edge((x) => 0.17 + 0.06 * Math.max(0, (C.x - x) / R));
  const outer = edge(() => 0.74);
  return [...inner, ...outer.reverse()];
}

function ear(d: Draw, c: Pt, side: number): void {
  const { pen } = d;
  const shape = ellipseAt(c.x, c.y, 2.6, 3.1, side * 0.5, 16);
  pen.fill(shape.map((p) => pt(p.x + 0.9, p.y + 1.3)), d.ink, 0.25);
  pen.fill(shape, B.white, 1);
  pen.fill(ellipseAt(c.x + 0.2, c.y - side * 0.2, 1.9, 2.4, side * 0.5, 14), B.black, 0.95);
  pen.stroke(closed(shape), 0.45, d.ink, 0.9);
}

/** The jaws agape in front of the lifted head: white lower jaw, pink mouth, the canines and a row of teeth. */
function gape(d: Draw, C: Pt, R: number, snout: number): void {
  const { pen } = d;
  const at = (x: number, y: number): Pt => pt(C.x + x, C.y + y);
  const f = R + snout;
  const outer = [...bezier(at(f - 4, -R * 0.72), at(f + 7, -R * 0.72), at(f + 11, 0), 8), ...bezier(at(f + 11, 0), at(f + 7, R * 0.72), at(f - 4, R * 0.72), 8).slice(1)];
  const inner = [...bezier(at(f - 3, -R * 0.55), at(f + 6, -R * 0.52), at(f + 9, 0), 8), ...bezier(at(f + 9, 0), at(f + 6, R * 0.52), at(f - 3, R * 0.55), 8).slice(1)];
  pen.fill(outer.map((p) => pt(p.x + 0.8, p.y + 1.2)), d.ink, 0.22);
  pen.fill(outer, B.greyLight, 1);
  pen.stroke(closed(outer), 0.6, d.ink, 0.95);
  pen.fill(inner, B.mouthDeep, 1);
  pen.clipped(inner, () => {
    glaze(d, C.x + f + 3.5, C.y, 5, 3.5, 0, B.mouth, 0.9);
    glaze(d, C.x + f + 4, C.y, 2.6, 1.5, 0, '#df8a90', 0.7);
  });
  // Lower teeth along the rim, the canines standing at its front corners.
  inner.forEach((p, i) => {
    if (i === 0 || i === inner.length - 1 || i % 2 === 1) return;
    const c = pt(C.x + f + 3, C.y);
    const l = Math.hypot(c.x - p.x, c.y - p.y) || 1;
    const u = pt((c.x - p.x) / l, (c.y - p.y) / l);
    const len = i === 4 || i === inner.length - 5 ? 2.6 : 1.3;
    const tooth = [pt(p.x - u.y * 0.5, p.y + u.x * 0.5), pt(p.x + u.x * len, p.y + u.y * len), pt(p.x + u.y * 0.5, p.y - u.x * 0.5)];
    pen.fill(tooth, B.tooth, 1);
    pen.stroke(tooth, 0.2, d.ink, 0.8, false);
  });
  pen.stroke(closed(inner), 0.35, d.ink, 0.9, false);
}

export interface HeadSpec {
  readonly C: Pt;
  readonly R: number;
  readonly snout: number;
  readonly biting: boolean;
  /** Eyes wide (the startle). */
  readonly wide?: boolean;
}

/** Paints the head, its stripes, ears, eyes and nose (and the gape when it lunges). */
export function paintBadgerHead(d: Draw, h: HeadSpec): Pt[] {
  const { pen } = d;
  const { C, R, snout } = h;
  const shape = badgerHead(C, R, snout);
  const nose = pt(C.x + R + snout, C.y);
  if (h.biting) gape(d, C, R, snout);
  const pelt: Pelt = { base: B.white, deep: B.greyDeep, light: B.white, hair: () => B.white };
  paintFur(d, pelt, {
    shape,
    dir: (p) => Math.atan2(p.y - nose.y, p.x - nose.x),
    wet: () => {
      for (const s of [-1, 1]) pen.fill(stripe(C, R, snout, s), B.black, 0.95);
      glaze(d, nose.x - 2, nose.y, 3.5, 2.5, 0, B.greyLight, 0.6);
    },
    hair: (p, r) => {
      const k = stripeAt(C, R, snout, p);
      if (k === 'stripe') return r < 0.75 ? B.black : B.greyDeep;
      return r < 0.7 ? B.white : r < 0.9 ? B.silver : B.greyLight;
    },
    n: 700, len: 1.9, seed: 9501, tuft: 1, line: 0.8,
  });
  for (const s of [-1, 1]) {
    ear(d, pt(C.x - R * 0.55, C.y + s * R * 0.92), s);
    const e = pt(C.x + R * 0.55, C.y + s * R * 0.42);
    beadEye(d, e, h.wide ? 1.35 : 1);
    if (h.wide) pen.hair(closed(ellipseAt(e.x, e.y, 1.9, 1.7, 0, 12)), 0.3, B.white, 0.8);
  }
  const n = ellipseAt(nose.x - 1, nose.y, 1.9, 2.3, 0, 16);
  pen.fill(n, B.nose, 1);
  pen.dot(nose.x - 1.5, nose.y - 0.8, 0.5, PAPER_FILL, 0.85);
  pen.dot(nose.x - 0.3, nose.y - 0.8, 0.3, '#5a5150', 0.9);
  pen.dot(nose.x - 0.3, nose.y + 0.8, 0.3, '#5a5150', 0.9);
  pen.stroke(closed(n), 0.4, d.ink, 0.9, false);
  return shape;
}
