import { bezier, closed, type Draw, pt } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { beadEye, ellipseAt, glaze } from '../critters/preyKit';
import { headShape, paintFur, type Pelt } from './barrensCrittersBeast';

/**
 * The hedgehog's face from above, poking out in front of its spines: a
 * brown-furred cone, darker round small black eyes, short round ears at the
 * brim of the spines, a long mobile snout ending in a wet black nose, and
 * whiskers. Biting, the snout thrusts forward and the jaws part on a pink
 * mouth with a row of tiny teeth.
 */
export const HOG = {
  spine: '#efe4c8',
  band: '#4a3423',
  root: '#2c2018',
  mass: '#5c4430',
  deep: '#2a1d14',
  light: '#d9c39a',
  face: '#9a7656',
  faceDark: '#5e4331',
  facePale: '#c7a782',
  ear: '#7c5a40',
  nose: '#1c1714',
  foot: '#6b4e3c',
  footPale: '#a98670',
  claw: '#e8dcc6',
  mouth: '#b9545e',
  mouthDeep: '#6e2a35',
} as const;

const FACE: Pelt = {
  base: HOG.face, deep: HOG.faceDark, light: HOG.facePale,
  hair: (_p, r) => (r < 0.25 ? HOG.faceDark : r < 0.7 ? HOG.face : HOG.facePale),
};

/** The face's outline round C (the crown, under the front spines), its snout `reach` long. */
export const hogHead = (C: Pt, reach: number): Pt[] => headShape(C, 6.2, 0.18, 1.7, reach, 3.4);

/** A short round ear at the spines' brim. */
function ear(d: Draw, C: Pt, side: 1 | -1): void {
  const { pen } = d;
  const c = pt(C.x + 0.2, C.y + side * 6);
  const shape = ellipseAt(c.x, c.y, 1.9, 1.6, side * 0.4, 14);
  pen.fill(shape.map((p) => pt(p.x + 0.6, p.y + 0.9)), d.ink, 0.25);
  pen.fill(shape, HOG.ear, 1);
  pen.fill(ellipseAt(c.x + 0.3, c.y - side * 0.1, 1.1, 0.9, side * 0.4, 12), '#c99a88', 0.7);
  pen.stroke(closed(shape), 0.4, d.ink, 0.9);
}

function whiskers(d: Draw, root: Pt, side: number): void {
  for (const [ty, tx] of [[4, 7], [6, 6], [7.5, 4.5]] as const) {
    d.pen.hair(bezier(root, pt(root.x + 2, root.y + side * ty * 0.4), pt(root.x + tx, root.y + side * ty), 6), 0.28, d.ink, 0.6);
  }
}

/** The jaws parted under the thrust snout: a pink mouth with tiny white teeth along it. */
function mouth(d: Draw, tip: Pt): void {
  const { pen } = d;
  const m = ellipseAt(tip.x - 1.6, tip.y, 2.6, 2, 0, 16);
  pen.fill(m, HOG.mouthDeep, 1);
  pen.clipped(m, () => glaze(d, tip.x - 1.4, tip.y, 2, 1.3, 0, HOG.mouth, 0.9));
  for (const s of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const p = pt(tip.x - 3.4 + i * 0.9, tip.y + s * (1.8 - i * 0.12));
      pen.fill([pt(p.x - 0.3, p.y), pt(p.x, p.y - s * 0.6), pt(p.x + 0.3, p.y)], PAPER_FILL, 1);
    }
  }
  pen.stroke(closed(m), 0.35, d.ink, 0.9, false);
}

/** The ears, painted over the brim of the spines. */
export function hogEars(d: Draw, C: Pt): void {
  for (const side of [-1, 1] as const) ear(d, C, side);
}

/** Paints the face round C, the snout `reach` long (thrust further when biting). */
export function paintHogHead(d: Draw, C: Pt, reach: number, biting: boolean): void {
  const { pen } = d;
  const shape = hogHead(C, reach);
  const tip = pt(C.x + 6.4 + reach, C.y);
  paintFur(d, FACE, {
    shape,
    dir: (p) => Math.atan2(p.y - tip.y, p.x - tip.x),
    wet: () => {
      // A darker mask round the eyes, the forehead paler under the spines.
      glaze(d, C.x + 3.5, C.y, 4.5, 5.5, 0, HOG.faceDark, 0.55);
      glaze(d, C.x - 2.5, C.y, 3.5, 4.5, 0, HOG.facePale, 0.5);
      glaze(d, tip.x - 3, tip.y, 3.5, 2, 0, HOG.faceDark, 0.45);
    },
    n: 320, len: 1.5, seed: 8701, tuft: 0.8, line: 0.5,
  });
  if (biting) mouth(d, tip);
  for (const side of [-1, 1]) {
    const e = pt(C.x + 4.2, C.y + side * 3.1);
    glaze(d, e.x, e.y, 1.8, 1.4, 0, HOG.deep, 0.6);
    beadEye(d, e, 1.1);
    whiskers(d, pt(tip.x - 2.4, tip.y + side * 1), side);
  }
  const nose = ellipseAt(tip.x - 0.5, tip.y, 1.4, 1.6, 0, 14);
  pen.fill(nose, HOG.nose, 1);
  pen.dot(tip.x - 0.8, tip.y - 0.6, 0.4, PAPER_FILL, 0.9);
  pen.dot(tip.x - 0.1, tip.y - 0.6, 0.22, '#55484a', 0.9);
  pen.dot(tip.x - 0.1, tip.y + 0.6, 0.22, '#55484a', 0.9);
  pen.stroke(closed(nose), 0.35, d.ink, 0.9, false);
}
