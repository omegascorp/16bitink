import { bezier, closed, type Draw, pt } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { ellipseAt, glaze } from '../critters/preyKit';
import { grizzle, headShape, paintFur, type Pelt } from './barrensCrittersBeast';
import { MONGOOSE, type MongooseEyes } from './jungleBossParts';

/**
 * The Grey Mongoose's head from above: a narrow, pointed wedge, finely
 * grizzled grey, the muzzle browner towards a dark nose; small rounded ears
 * set low at the sides; red-brown eyes with a dark rim and a long
 * horizontal pupil; fine whiskers. Darting in, its jaws are wide: a red
 * mouth, small sharp teeth and long canines.
 */
const M = MONGOOSE;

const PELT: Pelt = { base: M.base, deep: M.deep, light: M.light, hair: (_p, r) => grizzle(M.dark, M.base, M.pale, M.warm, 0.32)(r) };

/** The head's outline round C, its snout `snout` long (shorter when it opens its jaws). */
export const mongooseHead = (C: Pt, snout: number, gape: boolean): Pt[] => headShape(C, 5.8, 0.12, 1.9, gape ? snout * 0.62 : snout + 1.2, 2.6);

/** A small rounded ear set low at the side of the crown, fur-backed, its hollow dark. */
function ear(d: Draw, C: Pt, side: 1 | -1, flat: boolean): void {
  const { pen } = d;
  const c = pt(C.x - (flat ? 3.8 : 2.8), C.y + side * (flat ? 5.4 : 5.7));
  const shape = ellipseAt(c.x, c.y, flat ? 2.2 : 1.6, flat ? 1.1 : 1.6, side * (flat ? 0.5 : 0.2), 14);
  pen.fill(shape.map((p) => pt(p.x + 0.5, p.y + 0.8)), d.ink, 0.25);
  pen.fill(shape, M.base, 1);
  pen.fill(ellipseAt(c.x + 0.3, c.y + side * 0.2, flat ? 1.3 : 0.9, flat ? 0.5 : 0.9, side * 0.2, 12), M.deep, 0.85);
  pen.hair(closed(shape).slice(0, 9), 0.3, M.pale, 0.7);
  pen.stroke(closed(shape).slice(3, 13), 0.4, d.ink, 0.75);
}

/** An eye: the dark rim of bare skin, the red-brown iris, the long horizontal pupil, a glint; the lid's line sets the look. */
function eye(d: Draw, e: Pt, side: number, look: MongooseEyes): void {
  const { pen } = d;
  const r = look === 'wide' ? 1.2 : 1;
  const ry = look === 'fixed' ? r * 0.62 : r * 0.9;
  pen.fill(ellipseAt(e.x, e.y, r * 1.3, ry * 1.3 + 0.2, side * 0.25, 14), M.rim, 0.95);
  const ball = ellipseAt(e.x, e.y, r, ry, side * 0.25, 14);
  pen.fill(ball, M.iris, 1);
  pen.clipped(ball, () => pen.crescent(ball, pt(-r * 0.25, -r * 0.3), () => pen.fill(ball, M.irisDeep, 0.6)));
  const pupil = look === 'dizzy' ? ellipseAt(e.x + side * 0.2, e.y - side * 0.2, r * 0.38, r * 0.38, 0, 10) : ellipseAt(e.x, e.y, r * 0.62, Math.min(ry * 0.36, 0.5), side * 0.25, 12);
  pen.fill(pupil, '#120d0b', 1);
  pen.dot(e.x - r * 0.35, e.y - ry * 0.4, Math.max(0.4, r * 0.25), PAPER_FILL, 0.95);
  if (look === 'fixed') pen.hair([pt(e.x - r * 1.3, e.y - side * ry * 0.2), pt(e.x, e.y - side * ry * 1.1), pt(e.x + r * 1.3, e.y - side * ry * 0.5)], 0.45, d.ink, 0.9);
  if (look === 'wide') pen.hair(bezier(pt(e.x - r * 1.2, e.y - side * r * 0.9), pt(e.x, e.y - side * r * 1.6), pt(e.x + r * 1.2, e.y - side * r * 0.9), 5), 0.35, d.ink, 0.7);
}

function whiskers(d: Draw, root: Pt, side: number, reach: number): void {
  for (const [ty, tx] of [[4.5, 9], [6, 8], [7, 6]] as const) {
    const w = bezier(root, pt(root.x + 2.2, root.y + side * ty * 0.45), pt(root.x + tx * reach, root.y + side * ty * reach), 6);
    d.pen.hair(w, 0.3, d.ink, 0.6);
  }
}

/** Small sharp teeth along an edge, each pointing along `into`. */
function teeth(d: Draw, edge: readonly Pt[], into: (p: Pt) => Pt, len: (i: number) => number): void {
  edge.forEach((p, i) => {
    const u = into(p);
    const v = pt(-u.y, u.x);
    const l = len(i);
    const w = Math.max(0.32, l * 0.3);
    const tooth = [pt(p.x + v.x * w, p.y + v.y * w), pt(p.x + u.x * l, p.y + u.y * l), pt(p.x - v.x * w, p.y - v.y * w)];
    d.pen.fill(tooth, M.tooth, 1);
    d.pen.stroke(tooth, 0.2, d.ink, 0.85, false);
  });
}

/** The dropped lower jaw ahead of the head and the red mouth in it, its teeth pointing in. */
function gape(d: Draw, C: Pt, snout: number): void {
  const { pen } = d;
  const at = (x: number, y: number): Pt => pt(C.x + x, C.y + y);
  const L = snout + 8;
  const outer = [...bezier(at(3, -5.6), at(L * 0.8, -5.8), at(L + 1.2, 0), 8), ...bezier(at(L + 1.2, 0), at(L * 0.8, 5.8), at(3, 5.6), 8).slice(1)];
  const inner = [...bezier(at(4.4, -4.4), at(L * 0.76, -4.4), at(L - 0.6, 0), 8), ...bezier(at(L - 0.6, 0), at(L * 0.76, 4.4), at(4.4, 4.4), 8).slice(1)];
  pen.fill(outer.map((p) => pt(p.x + 0.8, p.y + 1.2)), d.ink, 0.22);
  pen.fill(outer, M.rufous, 1);
  pen.clipped(outer, () => glaze(d, C.x + L * 0.7, C.y - 3.5, 5, 1.4, 0, M.light, 0.5));
  pen.stroke(closed(outer), 0.55, d.ink, 0.95);
  pen.fill(inner, M.mouthDeep, 1);
  pen.clipped(inner, () => {
    glaze(d, C.x + L * 0.62, C.y, L * 0.3, 3.2, 0, M.mouth, 0.95);
    pen.fill(ellipseAt(C.x + L * 0.66, C.y, 2.6, 1.4, 0, 16), M.tongue, 1);
    glaze(d, C.x + L * 0.66, C.y - 0.5, 1.2, 0.5, 0, PAPER_FILL, 0.4);
  });
  const centre = at(L * 0.6, 0);
  const toward = (p: Pt): Pt => {
    const l = Math.hypot(centre.x - p.x, centre.y - p.y) || 1;
    return pt((centre.x - p.x) / l, (centre.y - p.y) / l);
  };
  const rim = inner.filter((_, i) => i > 0 && i < inner.length - 1 && i !== 8 && i % 2 === 0);
  teeth(d, rim, toward, (i) => (i === 1 || i === rim.length - 2 ? 2.2 : 1.1));
  pen.stroke(closed(inner), 0.35, d.ink, 0.9, false);
}

/** Paints the head round C: its gape, the grizzled fur, ears, eyes, nose and whiskers. */
export function paintMongooseHead(d: Draw, C: Pt, snout: number, open: boolean, look: MongooseEyes, flatEars: boolean): void {
  const { pen } = d;
  const shape = mongooseHead(C, snout, open);
  if (open) gape(d, C, snout);
  // The small ears sit low at the sides, half under the crown's fur.
  for (const side of [-1, 1] as const) ear(d, C, side, flatEars);
  const tip = pt(C.x + 5.8 + (open ? snout * 0.62 : snout + 1.2), C.y);
  paintFur(d, PELT, {
    shape,
    dir: (p) => Math.atan2(p.y - tip.y, p.x - tip.x),
    wet: () => {
      glaze(d, tip.x - 4, C.y, 6, 3.2, 0, M.rufous, 0.55);
      glaze(d, C.x - 2, C.y, 5, 4.5, 0, M.light, 0.3);
      for (const s of [-1, 1]) glaze(d, C.x + 3.6, C.y + s * 3.2, 2.6, 1.6, s * 0.3, M.deep, 0.35);
    },
    hair: (p, r) => (p.x > tip.x - 6 ? (r < 0.3 ? M.deep : r < 0.75 ? M.rufous : M.base) : PELT.hair(p, r)),
    n: 360, len: 1.6, seed: 9601, tuft: 0.9, line: 0.75,
  });
  for (const side of [-1, 1]) {
    eye(d, pt(C.x + 3.2, C.y + side * 3.7), side, look);
    whiskers(d, pt(tip.x - 2.6, tip.y + side * 1), side, open ? 0.8 : 1);
  }
  if (open) {
    const lip = shape.filter((p, i) => p.x > C.x + 6.2 && i % 2 === 0).sort((a, b) => Math.atan2(a.y - C.y, a.x - C.x) - Math.atan2(b.y - C.y, b.x - C.x));
    teeth(d, lip, (p) => {
      const o = pt(p.x - C.x, p.y - C.y);
      const l = Math.hypot(o.x, o.y) || 1;
      return pt(0.6 + (o.x / l) * 0.4, (o.y / l) * 0.8);
    }, (i) => (i === 0 || i === lip.length - 1 ? 2.3 : 1.1));
  }
  const n = ellipseAt(tip.x - 0.7, tip.y, 1.1, 1.4, 0, 14);
  pen.fill(n, M.nose, 1);
  pen.dot(tip.x - 0.9, tip.y - 0.5, 0.4, M.noseLit, 0.9);
  for (const s of [-1, 1]) pen.dot(tip.x - 0.3, tip.y + s * 0.6, 0.25, '#1a1210', 0.9);
  pen.stroke(closed(n), 0.3, d.ink, 0.9, false);
}
