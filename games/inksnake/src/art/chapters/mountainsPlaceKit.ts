import { createRng, type Rng } from '../../logic/rng';
import { BOARD } from '../../level/types';
import { blob, castShadow, SHADOW } from '../groundKit';
import { closed, type Draw, oval, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { specks } from '../places/farmGroundParts';
import { mix } from '../wash';

/**
 * What the Mountains' painters share: the western Zagros' colours (pale
 * grey limestone weathered buff, pockets of red terra rossa soil, slate
 * shadow, rust-orange and grey crustose lichen, sun-dried grass, the
 * grey-green of thyme and spiny cushions, the dark leaves of Persian oak)
 * and the painting of a mass of limestone from above: lit top, shaded
 * flanks, ledges, cracks, solution pits and lichen, its shadow thrown down
 * and to the right.
 */
export const LIME = '#e2dbca';
export const LIME_LIT = '#f4efe3';
export const LIME_BUFF = '#d7c7a4';
export const LIME_GREY = '#b8b1a2';
export const LIME_SHADE = '#8b8577';
export const LIME_DEEP = '#59544c';
export const CRACK = '#2e2a27';
export const SOIL_RED = '#b27b57';
export const SOIL_RED_DEEP = '#80513a';
export const SOIL_BROWN = '#a08566';
export const SOIL_PALE = '#cfb690';
export const GRASS_DRY = '#c9ae6c';
export const GRASS_DRY_DEEP = '#8c7643';
export const GRASS_DRY_LIT = '#e8d7a2';
export const SAGE = '#87917a';
export const SAGE_DEEP = '#525c4a';
export const SAGE_LIT = '#bcc3a6';
export const OAK = '#5d6c3f';
export const OAK_DEEP = '#33402a';
export const OAK_LIT = '#9cab6c';
export const LICHEN_ORANGE = '#d19a42';
export const LICHEN_GREY = '#a6ab98';
export const LICHEN_PALE = '#d9dcc8';
export const LICHEN_DARK = '#3f3c37';
export const THYME_FLOWER = '#b98aab';
/** Shadow thrown on the rock: a cool slate, so it reads as shade in mountain light. */
export const SHADE = '#363440';

export const W = BOARD.w;
export const H = BOARD.h;

/** A steady rng for a thing at x, y (the k-th painter of it). */
export const rngAt = (x: number, y: number, k = 0): Rng => createRng(Math.round(x * 137 + y * 73 + k * 991) + 7717);

/** Shrinks a shape towards c by k and moves it by (dx, dy). */
export const inset = (shape: readonly Pt[], c: Pt, k: number, dx = 0, dy = 0): Pt[] => shape.map((p) => pt(c.x + (p.x - c.x) * k + dx, c.y + (p.y - c.y) * k + dy));

/** A ragged, angular rock outline round c (rx × ry): a blob broken into flat facets. */
export function rockShape(c: Pt, rx: number, ry: number, rng: Rng, turn = rng() * TAU, n = 11): Pt[] {
  const corners = blob(c, rx, ry, rng, 0.2, n, turn);
  const out: Pt[] = [];
  corners.forEach((a, i) => {
    const b = corners[(i + 1) % corners.length]!;
    for (let k = 0; k < 3; k++) out.push(pt(a.x + ((b.x - a.x) * k) / 3 + (rng() - 0.5) * 0.8, a.y + ((b.y - a.y) * k) / 3 + (rng() - 0.5) * 0.8));
  });
  return out;
}

/** Lichen on rock: crusts of rust-orange, grey-green and black, each a cluster of little rounded lobes. */
export function lichen(d: Draw, c: Pt, s: number, rng: Rng): void {
  const pick = rng();
  const colour = pick < 0.35 ? LICHEN_ORANGE : pick < 0.75 ? LICHEN_GREY : pick < 0.9 ? LICHEN_PALE : LICHEN_DARK;
  const lobes = 4 + Math.floor(rng() * 5);
  for (let k = 0; k < lobes; k++) {
    const p = pt(c.x + (rng() - 0.5) * s * 1.6, c.y + (rng() - 0.5) * s * 1.3);
    const r = s * (0.3 + rng() * 0.4);
    d.pen.fill(oval(p.x, p.y, r, r * (0.7 + rng() * 0.3), 9), colour, 0.55 + rng() * 0.3);
  }
  d.pen.fill(oval(c.x, c.y, s * 0.5, s * 0.4, 8), mix(colour, PAPER_FILL, 0.4), 0.3);
}

/** A crack in rock along pts: a dark ink line, its upper-left lip lit, a shade wash below it. */
export function crackLine(d: Draw, pts: readonly Pt[], w: number, alpha: number): void {
  d.pen.hair(pts.map((p) => pt(p.x + SHADOW.x * w * 0.9, p.y + SHADOW.y * w * 0.9)), w * 1.8, SHADE, alpha * 0.25);
  d.pen.hair(pts, w, CRACK, alpha);
  d.pen.hair(pts.map((p) => pt(p.x - SHADOW.x * w * 0.9, p.y - SHADOW.y * w * 0.9)), w * 0.7, PAPER_FILL, alpha * 0.55);
}

/** A wandering crack from a, `len` long, heading a0, kinking as it goes. */
export function crackPath(a: Pt, a0: number, len: number, rng: Rng, step = 4, kink = 0.7): Pt[] {
  const pts = [a];
  let ang = a0;
  for (let s = step; s <= len; s += step) {
    ang += (rng() - 0.5) * kink + (a0 - ang) * 0.15;
    const p = pts[pts.length - 1]!;
    pts.push(pt(p.x + Math.cos(ang) * step, p.y + Math.sin(ang) * step));
  }
  return pts;
}

export interface MassOpts {
  /** How high it stands, px: sets its shadow's reach and how much of its flanks show. */
  readonly height: number;
  /** Ledges stepped down its flanks (0 for a boulder). */
  readonly ledges: number;
  /** Its overall tone. */
  readonly tone?: string;
}

/**
 * A mass of limestone from above, filling `shape`: its shadow cast down to
 * the right, flanks falling away (lit on the upper left, in slate shade on
 * the lower right), ledges stepped down them, a paler weathered top with
 * blooms of buff and grey, solution pits, cracks, lichen, and a pen contour
 * heavier on the shadow side.
 */
export function rockMass(d: Draw, shape: readonly Pt[], rng: Rng, o: MassOpts): void {
  const { pen } = d;
  const xs = shape.map((p) => p.x);
  const ys = shape.map((p) => p.y);
  const c = pt((Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2);
  const size = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  const tone = o.tone ?? LIME_GREY;
  castShadow(d, shape, o.height * 1.1, 0.2, SHADE);
  castShadow(d, shape, o.height * 0.55, 0.22, SHADE);
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, tone, 0.95);
  // The top: a smaller face set back towards the light; the ring round it is the flanks.
  const topK = 1 - Math.min(o.ledges === 0 ? 0.42 : 0.34, (o.height * 1.7) / size);
  const back = pt(-SHADOW.x * o.height * 0.3, -SHADOW.y * o.height * 0.3);
  const top = inset(shape, c, topK, back.x, back.y);
  pen.clipped(shape, () => {
    // The flanks: light on the upper left, slate in shadow down the far side, hatched.
    pen.crescent(shape, pt(-SHADOW.x * o.height * 0.5, -SHADOW.y * o.height * 0.5), () => {
      pen.fill(shape, LIME_SHADE, 0.9);
      pen.fill(shape, LIME_DEEP, 0.3);
      pen.hatch(shape, 2, 0.9, 0.45, { color: d.ink, alpha: 0.4 });
    });
    pen.crescent(shape, pt(-SHADOW.x * o.height * 0.22, -SHADOW.y * o.height * 0.22), () => {
      pen.fill(shape, LIME_DEEP, 0.7);
      pen.hatch(shape, 2.3, -0.6, 0.4, { color: d.ink, alpha: 0.35 });
    });
    pen.crescent(shape, pt(SHADOW.x * o.height * 0.4, SHADOW.y * o.height * 0.4), () => pen.fill(shape, LIME_LIT, 0.45));
    // Runnels down the flanks, from the top's edge to the foot: the face's fluting, darker on the shadow side.
    shape.forEach((p, i) => {
      if (i % 2 !== 0) return;
      const q = top[i]!;
      const away = ((p.x - c.x) * SHADOW.x + (p.y - c.y) * SHADOW.y) / (size / 2);
      const m = pt((p.x + q.x) / 2 + (rng() - 0.5) * 1.2, (p.y + q.y) / 2 + (rng() - 0.5) * 1.2);
      pen.hair([q, m, p], 0.5, away > 0 ? LIME_DEEP : PAPER_FILL, away > 0 ? 0.35 + 0.35 * away : 0.35);
    });
    // Ledges: the beds of the limestone stepping down the flanks.
    for (let k = 1; k <= o.ledges; k++) {
      const t = k / (o.ledges + 1);
      const ring = inset(shape, c, 1 - (1 - topK) * t, back.x * t, back.y * t).map((p) => pt(p.x + (rng() - 0.5) * 1.2, p.y + (rng() - 0.5) * 1.2));
      pen.hair(closed(ring).map((p) => pt(p.x + SHADOW.x * 1.4, p.y + SHADOW.y * 1.4)), 1.8, SHADE, 0.2);
      pen.hair(closed(ring), 0.55, d.ink, 0.42);
    }
    // The weathered top.
    pen.fill(top, LIME, 0.6);
    pen.clipped(top, () => {
      for (let k = 0; k < 6; k++) {
        const p = pt(c.x + (rng() - 0.5) * size * 0.7, c.y + (rng() - 0.5) * size * 0.6);
        pen.fill(blob(p, size * (0.08 + rng() * 0.14), size * (0.05 + rng() * 0.1), rng, 0.4, 12, rng() * TAU), rng() < 0.5 ? LIME_BUFF : LIME_GREY, 0.28);
      }
      pen.crescent(top, pt(-SHADOW.x * 3, -SHADOW.y * 3), () => pen.fill(top, LIME_SHADE, 0.25));
      pen.crescent(top, pt(SHADOW.x * 3, SHADOW.y * 3), () => pen.fill(top, LIME_LIT, 0.55));
      const area = size * size;
      specks(d, LIME_DEEP, 0.35, Array.from({ length: Math.round(area / 9) }, () => [c.x + (rng() - 0.5) * size, c.y + (rng() - 0.5) * size, 0.25 + rng() * 0.45] as const));
      specks(d, PAPER_FILL, 0.5, Array.from({ length: Math.round(area / 14) }, () => [c.x + (rng() - 0.5) * size, c.y + (rng() - 0.5) * size, 0.25 + rng() * 0.4] as const));
      // Solution pits: little hollows, dark in their upper-left, lit in their far rim.
      for (let k = 0; k < Math.round(area / 900); k++) {
        const p = pt(c.x + (rng() - 0.5) * size * 0.7, c.y + (rng() - 0.5) * size * 0.6);
        const r = 0.8 + rng() * 1.6;
        const pit = oval(p.x, p.y, r, r * 0.8, 10);
        pen.fill(pit, LIME_SHADE, 0.6);
        pen.crescent(pit, pt(SHADOW.x * r * 0.6, SHADOW.y * r * 0.6), () => pen.fill(pit, LIME_DEEP, 0.7));
      }
    });
    for (let k = 0; k < Math.max(1, Math.round(size / 26)); k++) {
      const a = pt(c.x + (rng() - 0.5) * size * 0.8, c.y + (rng() - 0.5) * size * 0.7);
      crackLine(d, crackPath(a, rng() * TAU, size * (0.2 + rng() * 0.35), rng, 3), 0.6, 0.6);
    }
    for (let k = 0; k < Math.round(size / 9); k++) {
      lichen(d, pt(c.x + (rng() - 0.5) * size * 0.85, c.y + (rng() - 0.5) * size * 0.8), 1.2 + rng() * 2.4, rng);
    }
  });
  pen.hair(closed(top), 0.45, d.ink, 0.3);
  pen.stroke(closed(shape), 1.5, d.ink, 0.95);
}
