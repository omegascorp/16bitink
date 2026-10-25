import { bezier, closed, type Draw, pt } from '../kit';
import { INK, PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { ellipseAt, glaze } from '../critters/tomcatKit';
import { furEdge, hairs } from '../critters/tomcatFur';
import { FOX, model, redHair, wash, whiteHair } from './barrensFoxArtFur';
import type { Fox, FoxEyes } from './barrensFoxArtParts';

/**
 * The Red Fox's head from above: a red crown, white cheek ruffs and lips,
 * the dark "tear" lines running from the eyes down the muzzle, slanted
 * amber eyes with slit pupils, a glossy black nose and dark whiskers.
 */

/** Each look's eye half-length, half-height, the slit's half-width and how far its lids slant. */
const EYES: Readonly<Record<FoxEyes, readonly [number, number, number]>> = {
  keen: [2.6, 1.2, 0.36],
  fixed: [2.7, 1.42, 0.46],
  soft: [2.5, 1.35, 0.66],
  wide: [2.9, 1.95, 1.15],
};

function eye(d: Draw, e: Pt, side: 1 | -1, look: FoxEyes): void {
  const { pen } = d;
  const [rx, ry, px] = EYES[look];
  const rot = side * 0.5;
  const ball = ellipseAt(e.x, e.y, rx, ry, rot, 16);
  if (look === 'wide') pen.fill(ellipseAt(e.x, e.y, rx + 0.6, ry + 0.6, rot, 16), PAPER_FILL, 0.95);
  pen.fill(ball, FOX.eye, 1);
  pen.crescent(ball, pt(0.7, side * 0.3), () => pen.fill(ball, FOX.eyeDeep, 0.7));
  pen.fill(ellipseAt(e.x + 0.2, e.y, px, ry * 0.92, rot + side * 1.3, 12), INK, 1);
  pen.dot(e.x - 0.5, e.y - 0.45, 0.34, PAPER_FILL, 1);
  pen.stroke(closed(ball), 0.6, d.ink, 1, false);
  // The black line running from the eye's front corner, then the brow over it.
  const front = pt(e.x + Math.cos(rot) * rx, e.y + Math.sin(rot) * rx);
  pen.stroke([front, pt(front.x + 1.6, front.y - side * 0.6)], 0.7, FOX.black, 0.9, false);
  if (look !== 'wide') pen.hair(bezier(pt(e.x - 2.8, e.y + side * 0.2), pt(e.x - 1.6, e.y - side * 1.7), pt(e.x + 1.4, e.y - side * 1.6), 6), 0.6, d.ink, 0.6);
}

/** Dark whiskers fanning out from the muzzle's sides; splayed forward in a fright. */
function whiskers(d: Draw, C: Pt, k: number, side: 1 | -1, look: FoxEyes): void {
  const fwd = look === 'wide' ? 3 : 0;
  for (const [ty, tx, j] of [[8, 25, 0], [10.5, 22, 1], [12.5, 18, 2]] as const) {
    const root = pt(C.x + (13 - j * 0.9) * k, C.y + side * (2.4 + j * 0.25));
    const tip = pt(C.x + (tx + fwd) * k + (1 - k) * 6, C.y + side * (ty - fwd * 0.4));
    const wh = bezier(root, pt(C.x + (16 + j) * k, C.y + side * ty * 0.5), tip, 6);
    d.pen.hair(wh, 0.42, d.ink, 0.65);
  }
}

export function paintHead(d: Draw, c: Fox): void {
  const { pen } = d;
  const s = c.head;
  const C = c.headC;
  const k = c.snout / 20;
  const N = pt(C.x + c.snout, C.y);
  // White: the cheek ruffs and the lips along the muzzle's sides.
  const cheek = (p: Pt): boolean => ((p.x - C.x - 2) / 4.6) ** 2 + ((Math.abs(p.y - C.y) - 9.6) / 3.4) ** 2 < 1;
  const lip = (p: Pt): boolean => p.x > C.x + 5 && p.x < N.x - 1.6 && Math.abs(p.y - C.y) > 2 + 4.4 * ((N.x - p.x) / (N.x - C.x - 5)) ** 1.3;
  const white = (p: Pt): boolean => cheek(p) || lip(p);
  const lie = (p: Pt): number => Math.atan2(p.y - N.y, p.x - N.x) + Math.PI;
  wash(d, s, FOX.base, pt(-2, -3.2), 0.4);
  pen.clipped(s, () => {
    // Golden crown, a deeper red along the top of the muzzle.
    glaze(d, C.x - 2.5, C.y - 1.5, 7, 6, 0, FOX.light, 0.4);
    glaze(d, C.x + 10 * k, C.y, 8 * k, 2.4, 0, FOX.rich, 0.45);
    for (const side of [-1, 1]) {
      glaze(d, C.x + 2, C.y + side * 9.8, 5, 3.6, side * 0.4, FOX.white, 0.97);
      const a = pt(C.x + 7, C.y + side * 6.4);
      const b = pt(N.x - 2, C.y + side * 2);
      const m = pt((a.x + b.x) / 2, (a.y + b.y) / 2);
      glaze(d, m.x, m.y, Math.hypot(b.x - a.x, b.y - a.y) * 0.55, 1.8, Math.atan2(b.y - a.y, b.x - a.x), FOX.white, 0.95);
    }
  });
  hairs(d, s, { dir: lie, color: (p, r) => (white(p) ? whiteHair(r) : redHair(r, 0.05)) }, 520, 7401, 1.9);
  // The dark tear lines from the eyes' front corners down the sides of the muzzle.
  for (const side of [-1, 1] as const) {
    const t = bezier(pt(C.x + 7.2, C.y + side * 5.6), pt(C.x + 10.5 * k + 1, C.y + side * 5), pt(C.x + 14.5 * k + 0.4, C.y + side * 3.4), 6);
    pen.hair(t, 1.1, FOX.blackSoft, 0.55);
    pen.hair(t.map((p) => pt(p.x + 0.3, p.y + side * 0.35)), 0.5, FOX.black, 0.5);
  }
  model(d, s, pt(C.x + 2, C.y), 12, 10, pt(-2, -3.2), 0.28);
  // The bridge of the nose, lit along its ridge.
  pen.hair(bezier(pt(C.x + 4, C.y - 0.6), pt(C.x + 10 * k, C.y - 0.9), pt(N.x - 2.6, C.y - 0.5), 6), 0.9, FOX.light, 0.5);
  furEdge(d, s, 0.8, 7402, 2, 1 + c.puff * 1.2);
  for (const side of [-1, 1] as const) {
    eye(d, pt(C.x + 5.2 + (k - 1) * 1.5, C.y + side * 4.8), side, c.eyes);
    for (const [x, y] of [[13, 2.6], [14.2, 2.2], [12.2, 3.1]] as const) pen.dot(C.x + x * k, C.y + side * y, 0.26, d.ink, 0.55);
    whiskers(d, C, k, side, c.eyes);
  }
  // The nose: a glossy black pad at the very tip.
  const nose = [pt(N.x - 2.6, C.y - 1.9), pt(N.x - 0.6, C.y - 1.6), pt(N.x + 0.5, C.y), pt(N.x - 0.6, C.y + 1.6), pt(N.x - 2.6, C.y + 1.9), pt(N.x - 3.2, C.y)];
  pen.fill(nose, FOX.nose, 1);
  pen.dot(N.x - 1.9, C.y - 0.8, 0.45, PAPER_FILL, 0.7);
  pen.hair(closed(nose), 0.45, d.ink, 0.9);
}
