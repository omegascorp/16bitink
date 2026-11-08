import { bezier, closed, type Draw, pt } from '../kit';
import { INK, PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { FUR, furEdge, furStripe, hairs, model, wash } from './tomcatFur';
import { ellipseAt, glaze } from './tomcatKit';
import type { EyeLook, Tom } from './tomcatParts';

/**
 * The Old Tomcat's head, seen from above: a broad tabby crown with the M on
 * the brow, heavy jowls, a white muzzle and blaze, amber eyes under a
 * scowl, an old scar across the brow, a scarred nose and stiff whiskers.
 */


/** Each look's eye half-width and half-height, and its pupil's (a slit, opening to a disc). */
const EYES: Readonly<Record<Exclude<EyeLook, 'squeeze'>, readonly [number, number, number, number]>> = {
  hunt: [2.4, 1.3, 0.42, 1.1],
  focus: [2.5, 1.55, 0.8, 1.3],
  wide: [2.6, 1.9, 1.2, 1.4],
  shock: [2.9, 2.3, 1.5, 1.6],
};

function eye(d: Draw, e: Pt, side: 1 | -1, look: EyeLook): void {
  const { pen } = d;
  if (look === 'squeeze') {
    pen.stroke([pt(e.x - 2.4, e.y - side * 1.5), pt(e.x + 0.8, e.y), pt(e.x - 2.4, e.y + side * 1.5)], 1, d.ink, 1, false);
    pen.hair([pt(e.x - 3.6, e.y - side * 2.4), pt(e.x - 1.2, e.y - side * 2.2)], 0.45, d.ink, 0.6);
    return;
  }
  const [rx, ry, px, py] = EYES[look];
  const rot = side * 0.45;
  const ball = ellipseAt(e.x, e.y, rx, ry, rot, 16);
  if (look === 'shock') pen.fill(ellipseAt(e.x, e.y, rx + 0.7, ry + 0.7, rot, 16), PAPER_FILL, 0.95);
  pen.fill(ball, FUR.eye, 1);
  pen.crescent(ball, pt(0.8, 0), () => pen.fill(ball, FUR.eyeDeep, 0.65));
  pen.fill(ellipseAt(e.x + 0.3, e.y, px, py, rot, 12), INK, 1);
  pen.dot(e.x - 0.5, e.y - 0.6, 0.38, PAPER_FILL, 1);
  pen.stroke(closed(ball), 0.65, d.ink, 1, false);
  if (look === 'hunt' || look === 'focus') {
    // The scowl: a heavy brow ridge over the eye.
    pen.stroke(bezier(pt(e.x - 3.4, e.y + side * 0.8), pt(e.x - 2.2, e.y - side * 1.9), pt(e.x + 1.2, e.y - side * 2.1), 6), 0.85, d.ink, 0.75, false);
  }
}

/** The whiskers fanning from the pads: stiff and white, splayed forward in a fright, drooping when dazed. */
function whiskers(d: Draw, C: Pt, side: 1 | -1, look: EyeLook): void {
  const { pen } = d;
  const fwd = look === 'shock' ? 5 : look === 'squeeze' ? -4 : 0;
  for (const [ty, tx, k] of [[9, 26, 0], [12.5, 23, 1], [15.5, 19, 2]] as const) {
    // One whisker on the scarred side was bitten short.
    const short = side === -1 && k === 1 ? 0.55 : 1;
    const root = pt(C.x + 11.2 - k * 0.4, C.y + side * (2.6 + k * 0.7));
    const tip = pt(root.x + (tx + fwd - 11) * short, C.y + side * (ty - fwd * 0.4) * (0.4 + 0.6 * short));
    const wh = bezier(root, pt(C.x + 15.5 + k, C.y + side * ty * 0.55), tip, 6);
    pen.hair(wh, 0.6, d.ink, 0.4);
    pen.hair(wh, 0.36, PAPER_FILL, 0.95);
  }
}

/** The head's stripes: the M on the brow, lines back over the crown, two cheek lines from each eye. */
function headStripes(C: Pt): { curve: Pt[]; w: number }[] {
  const at = (x: number, y: number): Pt => pt(C.x + x, C.y + y);
  const out: { curve: Pt[]; w: number }[] = [];
  // The M: its feet towards the eyes, its peaks towards the crown.
  out.push({ curve: [at(5.6, -6.2), at(2.6, -5.4), at(-0.4, -4.4), at(1.6, -2.2), at(3.4, 0), at(1.6, 2.2), at(-0.4, 4.4), at(2.6, 5.4), at(5.6, 6.2)], w: 1.3 });
  for (const side of [-1, 1]) {
    out.push({ curve: bezier(at(-0.4, side * 4.4), at(-6, side * 5.2), at(-13, side * 5.8), 6), w: 1.5 });
    out.push({ curve: bezier(at(1.4, side * 1.4), at(-5, side * 1.6), at(-13.5, side * 1.8), 6), w: 1.3 });
    out.push({ curve: bezier(at(5.4, side * 7.8), at(1.4, side * 10.4), at(-3.6, side * 13.4), 5), w: 1.4 });
    out.push({ curve: bezier(at(2.6, side * 11.2), at(-0.6, side * 13.2), at(-4.6, side * 15.4), 5), w: 1.1 });
  }
  return out;
}

const agouti = (r: number): string => (r < 0.14 ? FUR.stripe : r < 0.4 ? FUR.deep : r < 0.72 ? FUR.base : FUR.light);

export function paintHead(d: Draw, c: Tom): void {
  const { pen } = d;
  const s = c.head;
  const C = c.headC;
  const muzzle = (p: Pt): boolean => ((p.x - C.x - 10.5) / 6.8) ** 2 + ((p.y - C.y) / 8.6) ** 2 < 0.8 || ((p.x - C.x - 7) / 5.2) ** 2 + ((Math.abs(p.y - C.y) - 10) / 3.8) ** 2 < 0.7;
  const from = pt(C.x + 12, C.y);
  const lie = (p: Pt): number => Math.atan2(p.y - from.y, p.x - from.x) + Math.PI;
  const stripes = headStripes(C);
  wash(d, s, FUR.base, pt(-2.4, -3.6), 0.45);
  pen.clipped(s, () => {
    glaze(d, C.x - 4, C.y - 2, 10, 9, 0, FUR.warm, 0.3);
    // The stripes laid in wet first, soft-edged, under the fur.
    for (const st of stripes) pen.hair(st.curve, st.w * 1.3, FUR.stripe, 0.5);
    // The white muzzle and jowls, and a narrow blaze up the nose.
    glaze(d, C.x + 10.5, C.y, 6.8, 8.8, 0, FUR.white, 0.97);
    for (const side of [-1, 1]) glaze(d, C.x + 7, C.y + side * 10, 5.2, 4, side * 0.5, FUR.white, 0.9);
    glaze(d, C.x + 6, C.y, 5.5, 1.9, 0, FUR.white, 0.85);
  });
  hairs(d, s, { dir: lie, color: (p, r) => (muzzle(p) ? (r < 0.35 ? FUR.whiteDeep : PAPER_FILL) : agouti(r)) }, 620, 9401, 2.2);
  pen.clipped(s, () => stripes.forEach((st, i) => furStripe(d, st.curve, st.w * 1.1, FUR.stripe, lie, 9410 + i, 6, 1.8, 0.95)));
  model(d, s, C, 12.5, 12.5, pt(-2.4, -3.6));
  // The old scar: a pale, hairless seam from the crown across the brow over the left eye.
  const scar = bezier(pt(C.x - 3, C.y - 11.2), pt(C.x + 2, C.y - 8.2), pt(C.x + 7.4, C.y - 2.6), 7);
  pen.hair(scar.map((p) => pt(p.x + 0.4, p.y + 0.7)), 1.9, FUR.deep, 0.45);
  pen.hair(scar, 1.2, FUR.scar, 1);
  pen.hair(scar.map((p) => pt(p.x + 0.5, p.y + 0.8)), 0.3, d.ink, 0.6);
  furEdge(d, s, 0.85, 9402, 2, 1 + c.puff * 1.2);
  for (const side of [-1, 1] as const) {
    eye(d, pt(C.x + 7.8, C.y + side * 5.2), side, c.eyes);
    pen.dot(C.x + 11.8, C.y + side * 2.5, 0.32, d.ink, 0.6);
    pen.dot(C.x + 11, C.y + side * 3.6, 0.32, d.ink, 0.6);
    pen.dot(C.x + 10.6, C.y + side * 2.2, 0.28, d.ink, 0.5);
    whiskers(d, C, side, c.eyes);
  }
  const nose = [pt(C.x + 13.2, C.y - 1.5), pt(C.x + 14.6, C.y), pt(C.x + 13.2, C.y + 1.5), pt(C.x + 12.2, C.y)];
  pen.fill(nose, FUR.pink, 1);
  pen.dot(C.x + 13.6, C.y - 0.5, 0.45, FUR.deep, 0.8);
  pen.hair(closed(nose), 0.45, d.ink, 0.85);
}
