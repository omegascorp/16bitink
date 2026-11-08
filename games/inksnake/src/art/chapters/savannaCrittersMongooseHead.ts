import { bezier, closed, type Draw, pt } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { beadEye, ellipseAt, glaze, hairs } from '../critters/preyKit';
import { grizzle, paintFur, type Pelt } from './barrensCrittersBeast';

/**
 * The banded mongoose's head from above: small and wedge-shaped, a
 * grizzled grey-brown crown, a darker, browner muzzle running to a dark
 * nose, short rounded ears set low at the sides, dark eyes near the front
 * of the face. With the jaws open (the bite) the lower jaw shows past the
 * upper one, a dark pink gape between them and the white teeth.
 */
export const MONGOOSE = {
  base: '#8b7f6a',
  deep: '#3c342b',
  light: '#d6ccb4',
  dark: '#2b241e',
  band: '#2f2822',
  pale: '#d9cfb6',
  warm: '#9b7a52',
  rufous: '#a5774a',
  leg: '#5f5345',
  paw: '#2c2520',
  pawLit: '#5e5244',
  claw: '#cbbd9f',
  muzzle: '#5c4a38',
  nose: '#1d1815',
  ear: '#6d6150',
  earIn: '#b48f78',
  gape: '#7b3b3b',
  tongue: '#c9767a',
  tooth: '#f5efe0',
} as const;

const M = MONGOOSE;

export const MONGOOSE_PELT: Pelt = { base: M.base, deep: M.deep, light: M.light, hair: (_p, r) => grizzle(M.dark, M.base, M.pale, M.warm, 0.32)(r) };

/** The head's outline round C (crown radius 4.4, a pointed muzzle 5 long), facing +x. */
export function mongooseHeadShape(C: Pt, n = 40): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const t = (i / n) * Math.PI * 2 - Math.PI;
    const front = Math.max(0, Math.cos(t));
    const r = 4.4 * (1 + 0.12 * Math.exp(-((Math.abs(t) - 1.9) ** 2) / 0.2)) + 5.2 * front ** 2.6;
    return pt(C.x + Math.cos(t) * r, C.y + Math.sin(t) * r * (1 - 0.32 * front));
  });
}

/** A small rounded ear low at the side of the crown. */
function ear(d: Draw, C: Pt, side: 1 | -1): void {
  const { pen } = d;
  const c = pt(C.x - 1.6, C.y + side * 4.4);
  const shape = ellipseAt(c.x, c.y, 1.5, 1.15, side * 0.4, 12);
  pen.fill(shape.map((p) => pt(p.x + 0.4, p.y + 0.6)), d.ink, 0.25);
  pen.fill(shape, M.ear, 1);
  pen.fill(ellipseAt(c.x + 0.25, c.y - side * 0.05, 0.8, 0.55, side * 0.4, 10), M.earIn, 0.85);
  pen.stroke(closed(shape), 0.35, d.ink, 0.9, false);
}

/** The lower jaw and the gape, painted under the head when the jaws are open. */
function openJaws(d: Draw, C: Pt): void {
  const { pen } = d;
  const jaw = [pt(C.x + 4, C.y - 2.4), pt(C.x + 9, C.y - 2.2), pt(C.x + 12.4, C.y - 1.1), pt(C.x + 13.2, C.y), pt(C.x + 12.4, C.y + 1.1), pt(C.x + 9, C.y + 2.2), pt(C.x + 4, C.y + 2.4)];
  pen.fill(jaw.map((p) => pt(p.x + 0.4, p.y + 0.7)), d.ink, 0.3);
  pen.fill(jaw, M.muzzle, 1);
  pen.clipped(jaw, () => glaze(d, C.x + 9, C.y - 0.6, 2.4, 1, 0, M.light, 0.35));
  pen.stroke(closed(jaw), 0.35, d.ink, 0.95, false);
  // The gape: dark pink, the tongue in it, white teeth round the rim.
  const gape = ellipseAt(C.x + 10, C.y, 2.4, 1.7, 0, 14);
  pen.fill(gape, M.gape, 1);
  pen.fill(ellipseAt(C.x + 10.3, C.y, 1.3, 0.8, 0, 10), M.tongue, 0.9);
  for (const s of [-1, 1]) {
    pen.dot(C.x + 11.9, C.y + s * 1.2, 0.42, M.tooth, 1);
    pen.dot(C.x + 10.3, C.y + s * 1.75, 0.3, M.tooth, 1);
    pen.dot(C.x + 8.8, C.y + s * 1.85, 0.26, M.tooth, 0.9);
  }
}

/** Fine whiskers from the muzzle. */
function whiskers(d: Draw, C: Pt): void {
  for (const s of [-1, 1]) {
    for (const [ty, tx] of [[3.4, 11.5], [4.4, 10]] as const) {
      const root = pt(C.x + 7.2, C.y + s * 1.2);
      const w = bezier(root, pt(C.x + 8.6, C.y + s * ty * 0.6), pt(C.x + tx, C.y + s * ty), 5);
      d.pen.hair(w, 0.3, d.ink, 0.35);
      d.pen.hair(w, 0.2, PAPER_FILL, 0.8);
    }
  }
}

/** Paints the head round C; `open` parts the jaws for the bite, `look` turns it a little (radians). */
export function paintMongooseHead(d: Draw, C: Pt, open: boolean): void {
  const { pen } = d;
  const shape = mongooseHeadShape(C);
  const at = (x: number, y: number): Pt => pt(C.x + x, C.y + y);
  if (open) openJaws(d, C);
  for (const side of [-1, 1] as const) ear(d, C, side);
  const nose = at(open ? 8.6 : 9.5, 0);
  paintFur(d, MONGOOSE_PELT, {
    shape,
    dir: (p) => Math.atan2(p.y - nose.y, p.x - nose.x),
    wet: () => {
      glaze(d, C.x + 6, C.y, 4.2, 2.2, 0, M.muzzle, 0.75);
      glaze(d, C.x - 1, C.y, 3.6, 3.2, 0, M.warm, 0.25);
      for (const s of [-1, 1]) glaze(d, C.x + 2.6, C.y + s * 2.6, 1.8, 1, s * 0.4, M.dark, 0.5);
    },
    hair: (p, r) => {
      const x = p.x - C.x;
      if (x > 4) return r < 0.6 ? M.muzzle : r < 0.85 ? M.dark : M.warm;
      return grizzle(M.dark, M.base, M.pale, M.warm, 0.34)(r);
    },
    n: 200, len: 1.2, seed: 7811, tuft: 0.7, line: 0.6,
  });
  for (const s of [-1, 1]) {
    const e = at(3.1, s * 2.25);
    pen.fill(ellipseAt(e.x, e.y, 0.95, 0.65, s * 0.45, 12), M.dark, 1);
    beadEye(d, e, 0.62);
    pen.hair(bezier(at(1.8, s * 2.1), at(3, s * 1.55), at(4.4, s * 1.85), 5), 0.3, M.light, 0.7);
  }
  const n = ellipseAt(nose.x, nose.y, 0.95, 1.1, 0, 12);
  pen.fill(n, M.nose, 1);
  pen.dot(nose.x - 0.35, nose.y - 0.4, 0.3, mix(M.base, PAPER_FILL, 0.5), 0.9);
  whiskers(d, C);
}

/** The neck's fur lying back over the rim of the crown, so the head grows out of the body instead of sitting on it. */
export function neckRuff(d: Draw, C: Pt): void {
  const ruff = ellipseAt(C.x - 4.7, C.y, 1.9, 3.3, 0, 16);
  d.pen.clipped(ruff, () => glaze(d, C.x - 4.7, C.y, 2.6, 3.8, 0, M.base, 0.95));
  hairs(d, ruff, { dir: () => Math.PI, color: (_p, r) => grizzle(M.dark, M.base, M.pale, M.warm, 0.3)(r) }, 70, 7815, 1.5, 0.3, 0.85);
}
