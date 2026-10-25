import { bezier, closed, type Draw, pt } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { beadEye, ellipseAt, glaze } from '../critters/preyKit';
import { headShape, paintFur, type Pelt } from './barrensCrittersBeast';

/**
 * The Virginia opossum's head from above: long and pointed, the face white
 * with a greyer crown, dark smudges round small black eyes, a pink nose,
 * long dark whiskers and bare, thin black ears tipped pale. In the bite its
 * head tips up and its jaws gape: a pink mouth ringed by rows of small
 * white teeth and four long canines (an opossum has fifty teeth).
 */
export const OPOSSUM = {
  base: '#bfb9af',
  deep: '#4f4a45',
  light: '#efebe3',
  dark: '#2b2826',
  pale: '#f7f4ee',
  warm: '#a99f8f',
  white: '#f8f5ee',
  face: '#ece6dc',
  leg: '#36322f',
  foot: '#ead8d0',
  footDeep: '#b98f86',
  ear: '#1f1c1c',
  earTip: '#e7cfc6',
  nose: '#e3a2a0',
  noseDeep: '#ad6463',
  tail: '#e9cbc0',
  tailDeep: '#a07c74',
  tailBase: '#3d3533',
  mouth: '#b9545e',
  mouthDeep: '#6e2a35',
  tongue: '#e3878c',
  tooth: '#fbf8ef',
} as const;

const O = OPOSSUM;

const HEAD_PELT: Pelt = { base: O.face, deep: O.deep, light: O.light, hair: (_p, r) => (r < 0.6 ? O.white : r < 0.85 ? O.face : O.base) };

/** The head's outline round C: a crown narrowing to a long snout (shorter when the head tips up to bite). */
export const opossumHead = (C: Pt, biting: boolean): Pt[] => headShape(C, 6.8, 0.12, 1.9, biting ? 3.6 : 10, biting ? 1.6 : 2.4);

/** A bare, thin ear: a black rounded leaf, glossy, its rim pale. */
function ear(d: Draw, C: Pt, side: 1 | -1): void {
  const { pen } = d;
  const c = pt(C.x - 3.9, C.y + side * 6.8);
  const shape = ellipseAt(c.x, c.y, 1.5, 3.4, side * 0.35, 18);
  pen.fill(shape.map((p) => pt(p.x + 0.8, p.y + 1.2)), d.ink, 0.25);
  pen.fill(shape, O.earTip, 1);
  pen.fill(ellipseAt(c.x + 0.1, c.y - side * 0.4, 1.25, 2.9, side * 0.35, 16), O.ear, 0.95);
  pen.clipped(shape, () => glaze(d, c.x - 0.5, c.y - side * 0.6, 0.6, 1.6, side * 0.35, PAPER_FILL, 0.4));
  pen.stroke(closed(shape), 0.5, d.ink, 0.9);
}

function whiskers(d: Draw, root: Pt, side: number, reach: number): void {
  for (const [ty, tx] of [[5, 12], [7, 10.5], [8.5, 8]] as const) {
    const w = bezier(root, pt(root.x + 2.5, root.y + side * ty * 0.45), pt(root.x + tx * reach, root.y + side * ty * reach), 6);
    d.pen.hair(w, 0.32, d.ink, 0.7);
  }
}

/** A row of small pointed teeth along an edge, pointing along `into` (a unit vector per point). */
function teeth(d: Draw, edge: readonly Pt[], into: (p: Pt) => Pt, len: (i: number) => number): void {
  edge.forEach((p, i) => {
    const u = into(p);
    const v = pt(-u.y, u.x);
    const l = len(i);
    const w = Math.max(0.35, l * 0.32);
    const tooth = [pt(p.x + v.x * w, p.y + v.y * w), pt(p.x + u.x * l, p.y + u.y * l), pt(p.x - v.x * w, p.y - v.y * w)];
    d.pen.fill(tooth, O.tooth, 1);
    d.pen.stroke([...tooth], 0.2, d.ink, 0.85, false);
  });
}

/** The face painted over the head's fur: eyes in their dark smudges, the pink nose, whiskers. */
function face(d: Draw, C: Pt, nose: Pt, biting: boolean): void {
  const { pen } = d;
  for (const side of [-1, 1]) {
    const e = pt(C.x + 3.4, C.y + side * 3.1);
    glaze(d, e.x, e.y, 2.2, 1.6, side * 0.3, O.dark, 0.6);
    beadEye(d, e, biting ? 0.7 : 0.85);
    whiskers(d, pt(nose.x - 2.6, nose.y + side * 1.2), side, biting ? 0.8 : 1);
  }
  const n = ellipseAt(nose.x - 0.6, nose.y, 1.3, 1.5, 0, 14);
  pen.fill(n, O.nose, 1);
  pen.clipped(n, () => pen.crescent(n, pt(-0.4, -0.5), () => pen.fill(n, O.noseDeep, 0.6)));
  pen.dot(nose.x - 0.9, nose.y - 0.5, 0.35, PAPER_FILL, 0.9);
  pen.stroke(closed(n), 0.35, d.ink, 0.9, false);
}

/** The dropped lower jaw and the open mouth in front of the tipped-up head, its lower teeth pointing up. */
function gape(d: Draw, C: Pt): void {
  const { pen } = d;
  const at = (x: number, y: number): Pt => pt(C.x + x, C.y + y);
  const outer = [...bezier(at(4, -7), at(18, -7.2), at(24.5, 0), 8), ...bezier(at(24.5, 0), at(18, 7.2), at(4, 7), 8).slice(1)];
  const inner = [...bezier(at(5.5, -5.8), at(17.5, -5.6), at(22.3, 0), 8), ...bezier(at(22.3, 0), at(17.5, 5.6), at(5.5, 5.8), 8).slice(1)];
  pen.fill(outer.map((p) => pt(p.x + 0.8, p.y + 1.2)), d.ink, 0.22);
  pen.fill(outer, O.face, 1);
  pen.clipped(outer, () => pen.crescent(outer, pt(-0.6, -0.9), () => pen.fill(outer, O.base, 0.6)));
  pen.stroke(closed(outer), 0.55, d.ink, 0.95);
  pen.fill(inner, O.mouthDeep, 1);
  pen.clipped(inner, () => {
    glaze(d, C.x + 15, C.y, 5.5, 3.6, 0, O.mouth, 0.9);
    const tongue = ellipseAt(C.x + 16.4, C.y, 2.8, 1.6, 0, 16);
    pen.fill(tongue, O.tongue, 1);
    pen.hair([at(14.2, 0), at(18.4, 0)], 0.28, O.mouthDeep, 0.6);
    glaze(d, C.x + 15.8, C.y - 0.6, 1.4, 0.6, 0, PAPER_FILL, 0.4);
  });
  const centre = at(13, 0);
  const toward = (p: Pt): Pt => {
    const l = Math.hypot(centre.x - p.x, centre.y - p.y) || 1;
    return pt((centre.x - p.x) / l, (centre.y - p.y) / l);
  };
  // Lower teeth along the jaw's inner rim, the canines near its front.
  const rim = inner.filter((_, i) => i > 0 && i < inner.length - 1 && i !== 8);
  teeth(d, rim.filter((_, i) => i % 2 === 0), toward, (i) => (i === 2 || i === 5 ? 2.9 : 1.6));
  pen.stroke(closed(inner), 0.35, d.ink, 0.9, false);
}

/** Paints the head round C (and, biting, its gape), ears behind. */
export function paintOpossumHead(d: Draw, C: Pt, biting: boolean): void {
  const { pen } = d;
  const shape = opossumHead(C, biting);
  if (biting) gape(d, C);
  const nose = pt(C.x + (biting ? 10.2 : 16.8), C.y);
  paintFur(d, HEAD_PELT, {
    shape,
    dir: (p) => Math.atan2(p.y - nose.y, p.x - nose.x),
    wet: () => {
      // A greyer crown, the face white from the eyes forward.
      glaze(d, C.x - 3.5, C.y, 5.5, 4.5, 0, O.base, 0.85);
      glaze(d, C.x - 4.5, C.y, 3.5, 2.4, 0, O.deep, 0.35);
      glaze(d, C.x + 8, C.y, 8, 4.5, 0, O.white, 0.6);
    },
    hair: (p, r) => (p.x < C.x - 1.5 && Math.abs(p.y - C.y) < 4.5 ? (r < 0.3 ? O.deep : r < 0.7 ? O.base : O.pale) : HEAD_PELT.hair(p, r)),
    n: 380, len: 1.8, seed: 8401, tuft: 1, line: 0.75,
  });
  if (biting) {
    // Upper teeth along the lip, pointing down into the mouth, the long canines at its corners.
    const lip = shape.filter((p, i) => p.x > C.x + 6.6 && i % 2 === 0).sort((a, b) => Math.atan2(a.y - C.y, a.x - C.x) - Math.atan2(b.y - C.y, b.x - C.x));
    const fwd = (): Pt => pt(1, 0);
    teeth(d, lip, (p) => {
      const f = fwd();
      const out = pt(p.x - C.x, p.y - C.y);
      const l = Math.hypot(out.x, out.y) || 1;
      return pt(f.x * 0.6 + (out.x / l) * 0.4, (out.y / l) * 0.8);
    }, (i) => (i === 0 || i === lip.length - 1 ? 3 : 1.6));
    pen.hair(closed(shape).filter((p) => p.x > C.x + 7), 0.3, O.mouthDeep, 0.6);
  }
  for (const side of [-1, 1] as const) ear(d, C, side);
  face(d, C, nose, biting);
}
