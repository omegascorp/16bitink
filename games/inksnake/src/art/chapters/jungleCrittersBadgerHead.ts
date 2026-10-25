import { bezier, closed, type Draw, pt } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { ellipseAt, glaze } from '../critters/preyKit';
import { headShape, paintFur, type Pelt } from './barrensCrittersBeast';

/**
 * The honey badger's head from above: broad and flat, the silver-white of
 * the mantle running forward over the crown to the brow, the face, cheeks
 * and blunt muzzle black; small eyes deep in the black, tiny ears that are
 * hardly more than ridges at the mantle's edge, a broad black nose. Biting,
 * the head drives forward with its jaws agape: a red mouth, short white
 * teeth and heavy canines. Stopped ('up'), it lifts its nose to sniff: the
 * muzzle foreshortened, nostrils showing.
 */
export const BADGER = {
  black: '#1f1d1d',
  coal: '#2e2b2a',
  deep: '#121011',
  sheen: '#5b5756',
  silver: '#cfcbc2',
  white: '#efece4',
  grey: '#8f8b84',
  warm: '#b3a993',
  claw: '#d8ccb2',
  clawDeep: '#8d7f66',
  pad: '#3b3433',
  mouth: '#a8404a',
  mouthDeep: '#5a1c25',
  tongue: '#d9757e',
  tooth: '#fbf8ef',
  nose: '#161415',
} as const;

const B = BADGER;

/** How the head is held. */
export type HeadHold = 'level' | 'bite' | 'up';

const HEAD_PELT: Pelt = { base: B.black, deep: B.deep, light: B.sheen, hair: (_p, r) => (r < 0.6 ? B.black : r < 0.88 ? B.coal : B.sheen) };

/** The head's outline round C: a broad crown and a short, blunt muzzle (shorter still with the nose lifted or the jaws thrown open). */
export const badgerHead = (C: Pt, hold: HeadHold): Pt[] => headShape(C, 7.6, 0.16, 1.85, hold === 'level' ? 7.2 : hold === 'bite' ? 4.4 : 3.6, 2);

/** Whether a point of the head (from its centre) lies in the mantle's silver cap. */
const inCap = (x: number, y: number): boolean => (x + 7) / 9.6 + (y / 6.2) ** 2 < 1;

/** The cap's outline: the mantle's front edge, a curve across the brow, closed off behind the head. */
function capShape(C: Pt): Pt[] {
  const front = Array.from({ length: 13 }, (_, i) => {
    const y = -6.2 + (i / 12) * 12.4;
    return pt(C.x - 7 + 9.6 * (1 - (y / 6.2) ** 2), C.y + y);
  });
  return [...front, pt(C.x - 12, C.y + 6.2), pt(C.x - 12, C.y - 6.2)];
}

/** A tiny ear: a short black ridge at the mantle's edge, its rim catching light. */
function ear(d: Draw, C: Pt, side: 1 | -1): void {
  const { pen } = d;
  const c = pt(C.x - 3.2, C.y + side * 6.9);
  const shape = ellipseAt(c.x, c.y, 1.7, 1.1, side * 0.25, 14);
  pen.fill(shape.map((p) => pt(p.x + 0.5, p.y + 0.8)), d.ink, 0.3);
  pen.fill(shape, B.coal, 1);
  pen.hair(bezier(pt(c.x - 1.4, c.y - side * 0.3), pt(c.x - 0.2, c.y - side * 1.1), pt(c.x + 1.3, c.y - side * 0.4), 5), 0.35, B.grey, 0.8);
  pen.stroke(closed(shape), 0.45, d.ink, 0.9);
}

/** A small dark eye in the black face, shown by its wet rim and glint. */
function eye(d: Draw, e: Pt, r: number): void {
  const { pen } = d;
  pen.fill(ellipseAt(e.x, e.y, r * 1.35, r * 1.05, 0, 12), B.sheen, 0.55);
  pen.fill(ellipseAt(e.x, e.y, r, r * 0.86, 0, 12), '#0c0b0c', 1);
  pen.dot(e.x - r * 0.3, e.y - r * 0.35, Math.max(0.4, r * 0.36), PAPER_FILL, 0.95);
}

/** The broad black nose pad, its two nostrils and a glint; lifted, it's seen more from the front. */
function nose(d: Draw, n: Pt, up: boolean): void {
  const { pen } = d;
  const pad = ellipseAt(n.x - 0.9, n.y, up ? 1.9 : 1.5, 2.3, 0, 16);
  pen.fill(pad, B.nose, 1);
  pen.clipped(pad, () => glaze(d, n.x - 1.4, n.y - 0.7, 1.2, 0.9, 0, B.sheen, 0.8));
  for (const s of [-1, 1]) pen.dot(n.x - (up ? 0.4 : 0.2), n.y + s * 1, up ? 0.5 : 0.38, '#000000', 0.9);
  pen.dot(n.x - 1.5, n.y - 0.9, 0.4, PAPER_FILL, 0.7);
  pen.stroke(closed(pad), 0.4, d.ink, 0.9, false);
}

function whiskers(d: Draw, root: Pt, side: number): void {
  for (const [ty, tx] of [[4, 8], [5.5, 7], [6.5, 5]] as const) {
    const w = bezier(root, pt(root.x + 2, root.y + side * ty * 0.5), pt(root.x + tx, root.y + side * ty), 6);
    d.pen.hair(w, 0.45, d.ink, 0.5);
    d.pen.hair(w, 0.25, B.grey, 0.8);
  }
}

/** A row of short teeth along an edge, each pointing along `into`. */
function teeth(d: Draw, edge: readonly Pt[], into: (p: Pt) => Pt, len: (i: number) => number): void {
  edge.forEach((p, i) => {
    const u = into(p);
    const v = pt(-u.y, u.x);
    const l = len(i);
    const w = Math.max(0.4, l * 0.38);
    const tooth = [pt(p.x + v.x * w, p.y + v.y * w), pt(p.x + u.x * l, p.y + u.y * l), pt(p.x - v.x * w, p.y - v.y * w)];
    d.pen.fill(tooth, B.tooth, 1);
    d.pen.stroke(tooth, 0.2, d.ink, 0.85, false);
  });
}

/** The thrown-open lower jaw in front of the head and the red mouth inside it, its teeth pointing in. */
function gape(d: Draw, C: Pt): void {
  const { pen } = d;
  const at = (x: number, y: number): Pt => pt(C.x + x, C.y + y);
  const outer = [...bezier(at(4, -7.4), at(16.5, -7.6), at(21.5, 0), 8), ...bezier(at(21.5, 0), at(16.5, 7.6), at(4, 7.4), 8).slice(1)];
  const inner = [...bezier(at(5.5, -6), at(15.5, -6), at(19.4, 0), 8), ...bezier(at(19.4, 0), at(15.5, 6), at(5.5, 6), 8).slice(1)];
  pen.fill(outer.map((p) => pt(p.x + 0.8, p.y + 1.2)), d.ink, 0.25);
  pen.fill(outer, B.coal, 1);
  pen.clipped(outer, () => glaze(d, C.x + 12, C.y - 4.5, 6, 1.5, 0, B.sheen, 0.6));
  pen.stroke(closed(outer), 0.6, d.ink, 0.95);
  pen.fill(inner, B.mouthDeep, 1);
  pen.clipped(inner, () => {
    glaze(d, C.x + 13, C.y, 5.5, 4, 0, B.mouth, 0.95);
    pen.fill(ellipseAt(C.x + 14, C.y, 3, 1.8, 0, 16), B.tongue, 1);
    pen.hair([at(11.8, 0), at(16.4, 0)], 0.3, B.mouthDeep, 0.6);
    glaze(d, C.x + 13.6, C.y - 0.7, 1.5, 0.6, 0, PAPER_FILL, 0.4);
  });
  const centre = at(12, 0);
  const toward = (p: Pt): Pt => {
    const l = Math.hypot(centre.x - p.x, centre.y - p.y) || 1;
    return pt((centre.x - p.x) / l, (centre.y - p.y) / l);
  };
  const rim = inner.filter((_, i) => i > 0 && i < inner.length - 1 && i !== 8 && i % 2 === 0);
  teeth(d, rim, toward, (i) => (i === 1 || i === rim.length - 2 ? 2.6 : 1.3));
  pen.stroke(closed(inner), 0.4, d.ink, 0.9, false);
}

/** Paints the head round C: its gape when biting, the black face and silver cap, ears, eyes and nose. */
export function paintBadgerHead(d: Draw, C: Pt, hold: HeadHold): void {
  const { pen } = d;
  const shape = badgerHead(C, hold);
  if (hold === 'bite') gape(d, C);
  const tip = pt(C.x + (hold === 'level' ? 14.4 : hold === 'bite' ? 11.6 : 10.8), C.y);
  paintFur(d, HEAD_PELT, {
    shape,
    dir: (p) => Math.atan2(p.y - tip.y, p.x - tip.x),
    wet: () => {
      pen.fill(capShape(C), B.silver, 0.92);
      glaze(d, C.x - 4, C.y - 1, 4, 3.5, 0, B.white, 0.7);
      glaze(d, C.x + 6, C.y, 6, 5, 0, B.deep, 0.4);
    },
    hair: (p, r) => (inCap(p.x - C.x, p.y - C.y) ? (r < 0.1 ? B.grey : r < 0.6 ? B.white : r < 0.9 ? B.silver : B.warm) : HEAD_PELT.hair(p, r)),
    n: 420, len: 1.9, seed: 9401, tuft: 1, line: 0.8,
  });
  for (const side of [-1, 1] as const) ear(d, C, side);
  for (const side of [-1, 1]) {
    eye(d, pt(C.x + (hold === 'up' ? 3.4 : 4.2), C.y + side * 3.5), hold === 'bite' ? 0.75 : 0.9);
    whiskers(d, pt(tip.x - 2.4, tip.y + side * 1.6), side);
  }
  if (hold === 'bite') {
    // The upper teeth along the lip, pointing forward into the gape, a canine at each corner.
    const lip = shape.filter((p, i) => p.x > C.x + 7.4 && i % 2 === 0).sort((a, b) => Math.atan2(a.y - C.y, a.x - C.x) - Math.atan2(b.y - C.y, b.x - C.x));
    teeth(d, lip, (p) => {
      const o = pt(p.x - C.x, p.y - C.y);
      const l = Math.hypot(o.x, o.y) || 1;
      return pt(0.6 + (o.x / l) * 0.4, (o.y / l) * 0.8);
    }, (i) => (i === 0 || i === lip.length - 1 ? 2.8 : 1.4));
  }
  nose(d, tip, hold === 'up');
}
