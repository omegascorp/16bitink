import type { Rng } from '../../logic/rng';
import { polar, SHADOW } from '../groundKit';
import { bezier, closed, cub, type Draw, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { ellipseAt, glaze } from '../propsKit';
import { mix } from '../wash';
import { HOLLOW, LION_DEEP, LION_STONE, lichen, stone } from './lionStone';

/**
 * The stone lion's head from above, facing +x: a mane of carved curling
 * locks in rows round the neck and shoulders, the broad worn face coming
 * forward out of it (brow, deep-set blank eyes, the bridge of the nose, the
 * whisker pads), small round ears, and when it roars the jaw dropped open
 * in front of the raised muzzle: a dark mouth, a carved tongue, stone fangs.
 */
export const MANE = pt(16, 0);

export interface HeadPose {
  readonly roar: boolean;
  readonly shut: boolean;
}

/** How far the mane reaches from MANE at angle a: deepest behind, drawn in at the front where the face comes out. */
function reach(a: number, roar: boolean): number {
  const back = 0.5 - 0.5 * Math.cos(a);
  return (roar ? 1.12 : 1) * (14 + 19 * Math.sqrt(back));
}

/**
 * The mane's silhouette: carved locks round its edge, rounded and swept back
 * at rest, pointed and bristling when it roars.
 */
function maneShape(roar: boolean): Pt[] {
  const n = 22;
  return Array.from({ length: 220 }, (_, i) => {
    const a = (i / 220) * TAU;
    const w = Math.abs(Math.sin(((a + (roar ? 0 : 0.08 * Math.sin(a))) * n) / 2));
    const lobe = roar ? 0.88 + 0.13 * (1 - w) ** 1.6 + 0.04 * w : 0.9 + 0.1 * Math.sqrt(w);
    return polar(MANE, a, reach(a, roar) * lobe);
  });
}

/** One carved curl at p: its shadowed underside, a comma cut trailing back from a spiral, a lit crown. */
function curl(d: Draw, p: Pt, r: number, out: number, rng: Rng): void {
  const { pen } = d;
  const ring = Array.from({ length: 14 }, (_, i) => polar(p, (i / 14) * TAU, r * (1 + (rng() - 0.5) * 0.12)));
  pen.crescent(ring, pt(-SHADOW.x * r * 0.55, -SHADOW.y * r * 0.55), () => pen.fill(ring, mix(LION_DEEP, d.ink, 0.35), 0.45));
  pen.crescent(ring, pt(SHADOW.x * r * 0.45, SHADOW.y * r * 0.45), () => pen.fill(ring, PAPER_FILL, 0.4));
  const turn = Math.sin(out) >= 0 ? 1 : -1;
  const tail = bezier(polar(p, out, r * 2.4), polar(polar(p, out, r * 1.3), out + turn * Math.PI / 2, r * 0.9), polar(p, out + turn * Math.PI / 2, r), 6);
  const spiral = Array.from({ length: 16 }, (_, i) => {
    const t = i / 15;
    return polar(p, out + turn * (Math.PI / 2 + t * TAU * 0.9), r * (1 - t * 0.75));
  });
  pen.hair([...tail, ...spiral.slice(1)], 0.65, d.ink, 0.85);
}

/** The mane as one mass of carved stone, rows of curls cut into it, the outer row following its lobes. */
function mane(d: Draw, roar: boolean, rng: Rng): Pt[] {
  const { pen } = d;
  const shape = maneShape(roar);
  pen.fill(shape.map((p) => pt(p.x + SHADOW.x * 4, p.y + SHADOW.y * 4)), d.ink, 0.14);
  stone(d, shape, rng, { line: 1.35, lichen: 4, grain: 0.14, depth: 0.08 });
  pen.clipped(shape, () => {
    const rows = [
      { k: 0.87, n: 24, r: 3 },
      { k: 0.68, n: 19, r: 2.8 },
      { k: 0.5, n: 14, r: 2.5 },
      { k: 0.32, n: 9, r: 2.2 },
    ];
    for (const [ri, row] of rows.entries()) {
      for (let i = 0; i < row.n; i++) {
        const a = ((i + (ri % 2) * 0.5) / row.n) * TAU + (rng() - 0.5) * 0.08;
        if (Math.cos(a) > 0.55 - ri * 0.25) continue;
        const p = polar(MANE, a, reach(a, roar) * row.k);
        const r = row.r * (0.75 + 0.35 * (0.5 - 0.5 * Math.cos(a))) * (roar ? 1.08 : 1);
        curl(d, p, r, a, rng);
      }
      // A cut between the rows, scalloped round the curls.
      const k = row.k - 0.12;
      const cut = Array.from({ length: 60 }, (_, i) => {
        const a = 0.9 + (i / 59) * (TAU - 1.8);
        return polar(MANE, a, reach(a, roar) * k * (0.94 + 0.06 * Math.abs(Math.sin((a * row.n) / 2))));
      });
      pen.hair(cut, 0.45, d.ink, 0.35);
    }
  });
  return shape;
}

/** The face's outline, from the back of the brow round to the nose; the muzzle foreshortened by `short` when raised. */
function faceShape(short: number): Pt[] {
  const fx = (p: Pt): Pt => (p.x > 25 ? pt(25 + (p.x - 25) * short, p.y) : p);
  const right = [
    ...cub(pt(12, 0), pt(12, 9), pt(15, 13), pt(21, 13.2), 8),
    ...cub(pt(21, 13.2), pt(26, 13.4), pt(29, 11.5), pt(32, 10.4), 8).slice(1),
    ...cub(pt(32, 10.4), pt(38, 10.6), pt(42, 8.6), pt(42.6, 0), 8).slice(1),
  ].map(fx);
  return [...right, ...[...right].reverse().slice(1, -1).map((p) => pt(p.x, -p.y))];
}

/** The jaw dropped open in front of the muzzle, as its rim and the mouth inside it. */
function jawShapes(): { jaw: Pt[]; mouth: Pt[] } {
  const right = [pt(29, 0), pt(29, 9.6), ...cub(pt(31, 10), pt(40, 11), pt(47, 8), pt(49.5, 0), 10)];
  const jaw = [...right, ...[...right].reverse().slice(1, -1).map((p) => pt(p.x, -p.y))];
  const mouth = jaw.map((p) => pt(39.5 + (p.x - 39.5) * 0.8, p.y * 0.72));
  return { jaw, mouth };
}

/** A fang: a small pale stone cone from `base` towards `ang`. */
function fang(d: Draw, base: Pt, ang: number, len: number, w: number): void {
  const n = ang + Math.PI / 2;
  const shape = [polar(base, n, w / 2), polar(base, ang, len), polar(base, n, -w / 2)];
  d.pen.fill(shape, PAPER_FILL, 1);
  d.pen.fill(shape, mix(LION_STONE, PAPER_FILL, 0.5), 0.6);
  d.pen.hair(closed(shape), 0.5, d.ink, 0.95);
}

/** The open mouth: jaw, dark gullet, tongue and lower fangs (drawn under the face). */
function openJaw(d: Draw, rng: Rng): void {
  const { pen } = d;
  const { jaw, mouth } = jawShapes();
  stone(d, jaw, rng, { line: 1.1, lichen: 1 });
  pen.fill(mouth, HOLLOW, 0.92);
  pen.clipped(mouth, () => {
    glaze(d, 42, 0, 7, 6, 0, '#6a2e2c', 0.7);
    const tongue = ellipseAt(42.5, 0, 5.2, 4, 0, 18);
    pen.fill(tongue, mix(LION_DEEP, '#7a4e44', 0.4), 0.75);
    pen.hair(closed(tongue), 0.5, d.ink, 0.7);
    pen.hair([pt(39, 0), pt(45, 0)], 0.5, d.ink, 0.6);
    glaze(d, 44, -1.2, 2.5, 1.4, 0, PAPER_FILL, 0.25);
  });
  pen.stroke(closed(mouth), 0.8, d.ink, 0.95);
  for (const s of [-1, 1]) fang(d, pt(46, s * 4.8), Math.PI + s * 0.25, 4.6, 2.6);
  for (let k = -1.5; k <= 1.5; k += 1) fang(d, pt(48.2, k * 1.6), Math.PI, 1.6, 1.4);
}

/** The worn features: brow, eyes (blank and drilled, or carved shut), bridge, nose, whisker pads. */
function features(d: Draw, face: readonly Pt[], pose: HeadPose, rng: Rng): void {
  const { pen } = d;
  const k = pose.roar ? 0.72 : 1;
  const fx = (x: number): number => (x > 25 ? 25 + (x - 25) * k : x);
  pen.clipped(face, () => {
    // The bridge of the nose catches the light; the cheeks fall away into shade.
    pen.stroke([pt(23, -0.8), pt(fx(31), -1), pt(fx(38), -0.9)], 2.6, PAPER_FILL, 0.4, false);
    for (const s of [-1, 1]) pen.hair([pt(fx(28), s * 2.9), pt(fx(33), s * 2.8), pt(fx(37.5), s * 3)], 0.55, d.ink, 0.6);
    pen.hair([pt(21, -1.5), pt(24, 0), pt(21, 1.5)], 0.45, d.ink, 0.5);
    for (const s of [-1, 1]) {
      // A heavy frowning brow, the eye hooded deep under it: blank stone, a shallow drilled pupil.
      const eye = [pt(fx(25.6), s * 4.6), pt(fx(28.2), s * 5.6), pt(fx(30.4), s * 7.6), pt(fx(28.6), s * 8.6), pt(fx(26.4), s * 7)];
      pen.fill(ellipseAt(fx(28.4), s * 7.4, 4.4, 3, s * 0.6, 14), HOLLOW, 0.3);
      pen.stroke(bezier(pt(19.5, s * 12.5), pt(25.5, s * 10.5), pt(25.5, s * 3.6), 8), 1.1, d.ink, 0.85, false);
      pen.hair(bezier(pt(17, s * 9), pt(21, s * 6.5), pt(22, s * 2.5), 6), 0.45, d.ink, 0.4);
      if (pose.shut) {
        pen.fill(eye, LION_DEEP, 0.35);
        pen.stroke([pt(fx(25.4), s * 4.8), pt(fx(28.4), s * 7), pt(fx(30.4), s * 8)], 1.1, d.ink, 0.95, false);
        for (const t of [0.3, 0.6]) pen.hair([pt(fx(25.8 + t * 4.5), s * (5 + t * 3)), pt(fx(25.3 + t * 4.5), s * (6.4 + t * 3))], 0.45, d.ink, 0.7);
      } else {
        pen.fill(eye, mix(LION_STONE, PAPER_FILL, 0.3), 0.95);
        pen.fill([eye[0]!, eye[1]!, eye[2]!, pt(fx(28.4), s * 6.3)], LION_DEEP, 0.5);
        pen.dot(fx(28.3), s * 6.9, 0.65, HOLLOW, 0.75);
        pen.hair(closed(eye), 0.6, d.ink, 0.95);
      }
      // Whisker pads, the drilled dots of the whiskers on them.
      pen.hair(bezier(pt(fx(32.5), s * 9.4), pt(fx(40), s * 10), pt(fx(41.6), s * 3.8), 8), 0.6, d.ink, 0.7);
      pen.hair([pt(fx(30), s * 10.6), pt(fx(31), s * 8), pt(fx(32), s * 4.6)], 0.45, d.ink, 0.5);
      for (let j = 0; j < 6; j++) pen.dot(fx(35 + (j % 3) * 1.8), s * (5.4 + Math.floor(j / 3) * 1.7 + (j % 3) * 0.3), 0.38, d.ink, 0.65);
    }
    lichen(d, pt(22, -6), 14, rng, 2);
  });
  // The broad nose pad at the front, its nostrils.
  const nose = [pt(fx(35.4), -4.6), pt(fx(40.6), -3.6), pt(fx(42), 0), pt(fx(40.6), 3.6), pt(fx(35.4), 4.6), pt(fx(34.2), 0)];
  pen.fill(nose, mix(LION_DEEP, HOLLOW, 0.3), 0.55);
  pen.hair(closed(nose), 0.6, d.ink, 0.9);
  for (const s of [-1, 1]) pen.dot(fx(40.2), s * 1.6, 0.6, HOLLOW, 0.9);
  if (pose.roar) for (const s of [-1, 1]) fang(d, pt(fx(39.6), s * 4.1), s * 0.12, 4.2, 2.2);
}

/** Small rounded ears set back on the crown, hollowed inside, one chipped. */
function ears(d: Draw, rng: Rng, roar: boolean): void {
  const { pen } = d;
  for (const s of [-1, 1]) {
    const c = pt(roar ? 9 : 10, s * (roar ? 12.5 : 11.5));
    const ear = ellipseAt(c.x, c.y, 3.6, 2.8, s * (roar ? -0.9 : -0.55), 14);
    stone(d, ear, rng, { line: 0.9, lichen: 0, grain: 0.3 });
    const cup = ellipseAt(c.x + 0.5, c.y + s * 0.3, 1.9, 1.2, s * -0.55, 12);
    pen.fill(cup, LION_DEEP, 0.45);
    pen.hair(closed(cup).slice(3, 11), 0.45, d.ink, 0.6);
  }
}

/** The whole head and mane, drawn over the body. Returns the outlines of its parts (for clipping cracks). */
export function drawHead(d: Draw, pose: HeadPose, rng: Rng): Pt[][] {
  const { pen } = d;
  const mass = mane(d, pose.roar, rng);
  ears(d, rng, pose.roar);
  if (pose.roar) openJaw(d, rng);
  const face = faceShape(pose.roar ? 0.72 : 1);
  pen.fill(face.map((p) => pt(p.x + SHADOW.x * 2.5, p.y + SHADOW.y * 2.5)), d.ink, 0.18);
  stone(d, face, rng, { shade: 0.9, line: 1.3, lichen: 0, grain: 0.22, depth: 0.1 });
  features(d, face, pose, rng);
  return [mass, face];
}
