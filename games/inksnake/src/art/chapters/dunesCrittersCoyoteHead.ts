import { createRng } from '../../logic/rng';
import { bezier, closed, cub, type Draw, pt } from '../kit';
import { INK, PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { ellipseAt, glaze } from '../critters/preyKit';
import { bilateralY } from '../critters/tomcatKit';
import { grizzle, paintFur, type Pelt, resample } from './barrensCrittersBeast';

/**
 * The coyote's head from above: a grizzled grey-buff crown, a long narrow
 * muzzle tawny along the top, cream at the lips, big upright pointed ears
 * with rusty backs and pale insides, slanted amber eyes, a black nose and
 * whiskers. Biting, the jaws gape: a dark mouth past the nose, fangs and
 * the lower jaw's tip beyond, the ears laid back.
 */
export const COYOTE = {
  base: '#ad9877',
  deep: '#4a3d2f',
  light: '#e3d6bb',
  dark: '#2a231d',
  saddle: '#6c5c49',
  tawny: '#c08a52',
  rust: '#a9683a',
  cream: '#efe5d0',
  pale: '#d9ccb2',
  eye: '#d3a23a',
  eyeDeep: '#8d6220',
  nose: '#1c1816',
  mouth: '#5b2a28',
  tongue: '#c9706a',
  tooth: '#fbf6ea',
} as const;

const K = COYOTE;

export interface CoyoteHead {
  readonly C: Pt;
  readonly snout: number;
  readonly ears: 'up' | 'back';
  readonly bite: boolean;
}

/** The head's outline round C: a crown that narrows into a long, slim muzzle. */
export function coyoteHeadShape(h: CoyoteHead): Pt[] {
  const { C, snout } = h;
  const k = snout / 18;
  const half = [
    ...cub(pt(C.x - 8, 0), pt(C.x - 8, 4.4), pt(C.x - 5.8, 7.4), pt(C.x - 1.6, 8.3), 6),
    ...cub(pt(C.x - 1.6, 8.3), pt(C.x + 1.6, 8.9), pt(C.x + 4, 7.8), pt(C.x + 5.8, 6.2), 5).slice(1),
    ...cub(pt(C.x + 5.8, 6.2), pt(C.x + 8 * k + 1, 4.6), pt(C.x + 11 * k + 1, 3.4), pt(C.x + 15 * k, 2.6), 6).slice(1),
    ...cub(pt(C.x + 15 * k, 2.6), pt(C.x + 17 * k, 2.2), pt(C.x + snout + 0.2, 1.4), pt(C.x + snout, 0), 4).slice(1),
  ];
  return resample(bilateralY(half).map((p) => pt(p.x, C.y + p.y)), 1.3);
}

/** Ear corners (back, front) and tip from the head's centre, on the +y side. */
const EAR: Readonly<Record<'up' | 'back', readonly [Pt, Pt, Pt]>> = {
  up: [pt(-5.4, 2.4), pt(0.4, 6), pt(-5.6, 14.2)],
  back: [pt(-6, 2), pt(-1.8, 5.2), pt(-14.5, 8.2)],
};

function ear(d: Draw, h: CoyoteHead, side: 1 | -1): void {
  const { pen } = d;
  const [b0, b1, tip] = EAR[h.ears].map((p) => pt(h.C.x + p.x, h.C.y + p.y * side)) as [Pt, Pt, Pt];
  const outer = cub(b0, pt(b0.x - 2.2, b0.y + side * 4), pt(tip.x - 1, tip.y - side * 2.6), tip, 9);
  const front = cub(tip, pt(tip.x + 1.4, tip.y - side * 2.4), pt(b1.x + 1, b1.y + side * 3.4), b1, 8).slice(1);
  const shape = [...outer, ...front];
  pen.fill(shape.map((p) => pt(p.x + 1.1, p.y + 1.7)), INK, 0.22);
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, K.rust, 0.9);
  const m = pt((b0.x + b1.x + tip.x) / 3, (b0.y + b1.y + tip.y) / 3);
  const inner = shape.map((p) => pt(m.x + (p.x - m.x) * 0.6 + 0.4, m.y + (p.y - m.y) * 0.6 - side * 0.3));
  pen.clipped(shape, () => {
    glaze(d, (b0.x + b1.x) / 2, (b0.y + b1.y) / 2, 3.5, 3, 0, K.base, 0.8);
    glaze(d, tip.x, tip.y, 3, 3, 0, K.dark, 0.75);
    // The pale inside of the ear, seen past its front edge.
    pen.fill(inner, K.cream, 0.8);
    pen.clipped(inner, () => pen.crescent(inner, pt(-0.5, -side * 0.7), () => pen.fill(inner, K.pale, 0.8)));
  });
  const rng = createRng(6402 + side);
  for (let i = 0; i < 9; i++) {
    const t = 0.2 + rng() * 0.7;
    const p = pt(b1.x + (tip.x - b1.x) * t, b1.y + (tip.y - b1.y) * t);
    pen.hair([p, pt(p.x - 1.2 - rng(), p.y - side * (0.6 + rng() * 0.8))], 0.3, PAPER_FILL, 0.8);
  }
  pen.stroke(shape, 0.7, d.ink, 0.9);
}

/** A slanted amber eye with a round pupil, the dark line running from its front corner. */
function eye(d: Draw, e: Pt, side: 1 | -1, narrow: boolean): void {
  const { pen } = d;
  const rot = side * 0.45;
  const ball = ellipseAt(e.x, e.y, 1.9, narrow ? 0.75 : 1.05, rot, 14);
  pen.fill(ball, K.eye, 1);
  pen.crescent(ball, pt(0.5, side * 0.25), () => pen.fill(ball, K.eyeDeep, 0.7));
  pen.dot(e.x + 0.2, e.y, narrow ? 0.55 : 0.7, INK, 1);
  pen.dot(e.x - 0.35, e.y - 0.35, 0.28, PAPER_FILL, 1);
  pen.stroke(closed(ball), 0.5, d.ink, 1, false);
  const f = pt(e.x + Math.cos(rot) * 1.9, e.y + Math.sin(rot) * 1.9);
  pen.stroke([f, pt(f.x + 1.6, f.y - side * 0.5)], 0.55, K.dark, 0.85, false);
  pen.hair(bezier(pt(e.x - 2.2, e.y + side * 0.1), pt(e.x - 1, e.y - side * 1.5), pt(e.x + 1.3, e.y - side * 1.3), 5), 0.45, d.ink, 0.55);
}

/** The gape: a dark mouth opening past the nose, the lower jaw's tip beyond it, fangs at its corners, a lick of tongue. */
function jaws(d: Draw, h: CoyoteHead): void {
  const { pen } = d;
  const N = pt(h.C.x + h.snout, h.C.y);
  const gap = [pt(N.x - 3.5, N.y - 2.4), pt(N.x + 2.5, N.y - 3.6), pt(N.x + 6, N.y - 2.4), pt(N.x + 6.6, N.y), pt(N.x + 6, N.y + 2.4), pt(N.x + 2.5, N.y + 3.6), pt(N.x - 3.5, N.y + 2.4)];
  pen.fill(gap, K.mouth, 1);
  pen.fill(ellipseAt(N.x + 2.4, N.y + 0.4, 2.6, 1.4, 0, 12), K.tongue, 0.9);
  // The lower jaw's tip, beyond the gape.
  const chin = [pt(N.x + 4.8, N.y - 2.6), pt(N.x + 6.6, N.y - 2.2), pt(N.x + 7.6, N.y), pt(N.x + 6.6, N.y + 2.2), pt(N.x + 4.8, N.y + 2.6), pt(N.x + 5.8, N.y)];
  pen.fill(chin, K.cream, 1);
  pen.clipped(chin, () => pen.fill(chin.map((p) => pt(p.x + 0.6, p.y + 0.6)), K.pale, 0.7));
  pen.stroke(closed(chin), 0.45, d.ink, 0.9, false);
  for (const side of [-1, 1]) {
    for (const [x, y, l] of [[1.6, 3.2, 1.8], [5.4, 2.2, -1.5]] as const) {
      const b = pt(N.x + x, N.y + side * y);
      const fang = [pt(b.x - 0.5, b.y), pt(b.x + 0.5, b.y), pt(b.x + 0.1, b.y - side * l)];
      pen.fill(fang, K.tooth, 1);
      pen.stroke(closed(fang), 0.2, d.ink, 0.8, false);
    }
  }
  pen.stroke(closed(gap), 0.5, d.ink, 0.9, false);
}

/** Paints the head round h.C, ears and all. */
export function paintCoyoteHead(d: Draw, h: CoyoteHead, shape: readonly Pt[]): void {
  const { pen } = d;
  const C = h.C;
  const N = pt(C.x + h.snout, C.y);
  const k = h.snout / 12;
  if (h.bite) jaws(d, h);
  const pelt: Pelt = { base: K.base, deep: K.deep, light: K.light, hair: (_p, r) => grizzle(K.dark, K.base, K.light, K.tawny, 0.3)(r) };
  const lip = (p: Pt): boolean => p.x > C.x + 3.5 && Math.abs(p.y - C.y) > 1.2 + 3.2 * ((N.x - p.x) / (N.x - C.x)) ** 1.1;
  const cheek = (p: Pt): boolean => ((p.x - C.x - 1) / 3.6) ** 2 + ((Math.abs(p.y - C.y) - 6.6) / 2.2) ** 2 < 1;
  paintFur(d, pelt, {
    shape,
    dir: (p) => Math.atan2(p.y - N.y, p.x - N.x),
    wet: () => {
      glaze(d, C.x - 2, C.y, 6, 5.5, 0, K.saddle, 0.35);
      glaze(d, C.x + 7 * k, C.y, 6 * k, 2.6, 0, K.tawny, 0.7);
      for (const side of [-1, 1]) {
        glaze(d, C.x + 1, C.y + side * 6.6, 3.6, 2.2, side * 0.3, K.cream, 0.85);
        glaze(d, C.x + 9 * k, C.y + side * 3, 5 * k, 1.3, -side * 0.2, K.cream, 0.8);
      }
    },
    hair: (p, r) => (cheek(p) || lip(p) ? (r < 0.65 ? K.cream : K.pale) : p.x > C.x + 3 && Math.abs(p.y - C.y) < 2.4 ? (r < 0.6 ? K.tawny : r < 0.85 ? K.rust : K.base) : grizzle(K.dark, K.base, K.light, K.tawny, 0.3)(r)),
    n: 520, len: 1.7, seed: 6401, tuft: 1.1, line: 0.75,
  });
  pen.hair(bezier(pt(C.x + 2, C.y - 0.5), pt(C.x + 7 * k, C.y - 0.8), pt(N.x - 2, C.y - 0.4), 6), 0.8, K.light, 0.45);
  for (const side of [-1, 1] as const) {
    eye(d, pt(C.x + 3.6, C.y + side * 3.5), side, h.bite);
    for (const [x, y] of [[9, 2.2], [10.2, 1.9], [8.4, 2.6]] as const) pen.dot(C.x + x * k, C.y + side * y, 0.22, d.ink, 0.55);
    for (const [ty, tx] of [[6.5, 19], [8.5, 17], [10, 14]] as const) {
      const root = pt(C.x + 9.5 * k, C.y + side * 2.2);
      d.pen.hair(bezier(root, pt(C.x + 12 * k, C.y + side * ty * 0.55), pt(C.x + tx * k, C.y + side * ty), 6), 0.32, d.ink, 0.5);
    }
  }
  for (const side of [-1, 1] as const) ear(d, h, side);
  const nose = [pt(N.x - 2.1, C.y - 1.5), pt(N.x - 0.4, C.y - 1.3), pt(N.x + 0.5, C.y), pt(N.x - 0.4, C.y + 1.3), pt(N.x - 2.1, C.y + 1.5), pt(N.x - 2.6, C.y)];
  pen.fill(nose, K.nose, 1);
  pen.dot(N.x - 1.5, C.y - 0.6, 0.38, mix(K.base, PAPER_FILL, 0.5), 0.8);
  pen.hair(closed(nose), 0.4, d.ink, 0.9);
}
