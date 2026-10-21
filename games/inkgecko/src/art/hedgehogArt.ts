import { createRng } from '../logic/rng';
import { bezier, closed, cub, type Draw, pt, TAU } from './kit';
import { PAPER_FILL } from './palette';
import type { Pt } from './pen';
import { castShadow, ellipseAt, glaze } from './propsKit';
import { mix } from './wash';

/**
 * The Hedgehog charm's sprite, seen from above trundling towards +x: a
 * spiny brown-and-cream mantle, a pale pointed face with bead eyes, round
 * ears and a glossy dark nose, and four small feet peeping out at the sides
 * in two walk steps. About 56 long and 40 across, centred at the origin.
 */
export const HEDGEHOG_FRAME = 72;
/** Texture px per unit for the hedgehog. */
export const HEDGEHOG_RES = 3;
export type HedgehogStep = 0 | 1;

const HOG = {
  mantle: '#9a7550',
  mantleDeep: '#4f3828',
  spine: '#4a3325',
  spineTip: '#f2e4c4',
  face: '#ead6ae',
  faceDeep: '#b78f60',
  mask: '#7d5c40',
  ear: '#b98a70',
  foot: '#d6a58f',
  nose: '#2b2226',
  seed: 6611,
} as const;

/** The body's centre and radii: the spiny back from the tail (−x) to the brow. */
const BACK = { x: -7, rx: 19, ry: 15.5 } as const;
/** Where the quills lie back from: a point on the brow. */
const BROW = pt(15, 0);

/** The body under the quills: an egg, broader behind. */
function body(): Pt[] {
  return Array.from({ length: 48 }, (_, i) => {
    const a = (i / 48) * TAU;
    const c = Math.cos(a);
    return pt(BACK.x + c * BACK.rx, Math.sin(a) * BACK.ry * (1 - 0.1 * Math.max(0, c)));
  });
}

/** How far p lies out on the body's ellipse: 1 on its edge. */
const reach = (p: Pt): number => ((p.x - BACK.x) / BACK.rx) ** 2 + (p.y / BACK.ry) ** 2;

/** The face: a rounded wedge from under the brow to the nose. */
function face(): Pt[] {
  const top = cub(pt(1, -10.8), pt(10.5, -11.4), pt(18.5, -6.2), pt(23.8, -1.5), 12);
  const bot = cub(pt(23.8, 1.5), pt(18.5, 6.2), pt(10.5, 11.4), pt(1, 10.8), 12);
  const tip = bezier(pt(23.8, -1.5), pt(25.8, 0), pt(23.8, 1.5), 4).slice(1, -1);
  return [...top, ...tip, ...bot];
}

/** Where each foot sits at rest, and how far it reaches forward in each step. */
const FEET: readonly { x: number; y: number; step: readonly [number, number] }[] = [
  { x: 4, y: -13.6, step: [2.6, -1.8] },
  { x: 4, y: 13.6, step: [-1.8, 2.6] },
  { x: -18.5, y: -15.4, step: [-1.8, 2.4] },
  { x: -18.5, y: 15.4, step: [2.4, -1.8] },
];

/** A small pink-brown forepaw pointing forward, its toes and claws at the front. */
function foot(d: Draw, x: number, y: number): void {
  const { pen } = d;
  const pad = ellipseAt(x, y, 3, 2.3, 0, 16);
  pen.fill(pad, PAPER_FILL, 1);
  pen.fill(pad, HOG.foot, 0.9);
  pen.crescent(pad, pt(-0.8, -0.9), () => pen.fill(pad, mix(HOG.foot, HOG.mantleDeep, 0.5), 0.5));
  pen.hair(closed(pad), 0.6, d.ink, 0.95);
  for (const k of [-1, 0, 1]) pen.hair([pt(x + 2.4 - Math.abs(k) * 0.4, y + k * 1.1), pt(x + 3.6 - Math.abs(k) * 0.4, y + k * 1.3)], 0.45, HOG.mantleDeep, 0.9);
}

/** The pale face: its wash, the darker mask round the eyes, the snout's lit ridge, whiskers. */
function paintFace(d: Draw, shape: readonly Pt[]): void {
  const { pen } = d;
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, HOG.face, 0.9);
  pen.clipped(shape, () => {
    for (const s of [-1, 1]) glaze(d, 13, s * 6.2, 5.6, 3.6, s * 0.4, HOG.mask, 0.5);
    pen.crescent(shape, pt(-1.2, -2.4), () => pen.fill(shape, HOG.faceDeep, 0.45));
    pen.hair([pt(10, -1.4), pt(16, -1.5), pt(22, -0.9)], 1.6, PAPER_FILL, 0.5);
    pen.stipple(shape, 40, (x) => (x > 16 ? 0.7 : 0.2), 0.3, HOG.faceDeep);
  });
  pen.stroke(closed(shape), 0.9, d.ink, 0.9);
  for (const s of [-1, 1]) {
    for (const [ry, ty, tx] of [[1.6, 4.4, 27.5], [2.2, 6.2, 26.2], [2.8, 7.4, 24]] as const) {
      pen.hair(bezier(pt(22, s * ry), pt(24.4, s * (ry + 1.8)), pt(tx, s * ty), 5), 0.25, d.ink, 0.5);
    }
  }
}

/**
 * The quills: banded spines, brown with cream tips, lying back from the brow
 * and fanning out to the sides past the body's edge, tail first so those
 * nearer the head lie over the roots of those behind; the ones that make the
 * silhouette are inked. Positions are fixed; only the line boils.
 */
function quills(d: Draw): void {
  const { pen } = d;
  const rng = createRng(HOG.seed + 1);
  const out: { root: Pt; tip: Pt; mid: Pt; dark: boolean; edge: boolean }[] = [];
  while (out.length < 300) {
    const p = pt(BACK.x + (rng() * 2 - 1) * BACK.rx, (rng() * 2 - 1) * BACK.ry);
    if (reach(p) > 0.9 || p.x > 10.5) continue;
    const l = Math.hypot(p.x - BROW.x, p.y - BROW.y) || 1;
    const a = Math.atan2(p.y - BROW.y, p.x - BROW.x) + (rng() - 0.5) * 0.3;
    const len = (6.4 + rng() * 2.6) * (0.55 + 0.45 * Math.min(1, l / 20));
    const tip = pt(p.x + Math.cos(a) * len, p.y + Math.sin(a) * len);
    out.push({ root: p, tip, mid: pt(p.x + Math.cos(a) * len * 0.55, p.y + Math.sin(a) * len * 0.55), dark: rng() < 0.3, edge: reach(tip) > 0.95 });
  }
  out.sort((a, b) => a.root.x - b.root.x);
  for (const q of out) {
    if (q.edge) pen.hair([q.mid, q.tip], 2.4, d.ink, 0.8);
    pen.hair([q.root, q.tip], 1.9, q.dark ? HOG.mantleDeep : HOG.spine, 1);
    pen.hair([q.mid, q.tip], 1.25, HOG.spineTip, 1);
  }
}

/**
 * The hedgehog trundling towards +x, centred in HEDGEHOG_FRAME. `step` 0
 * and 1 swap which feet reach forward, so alternating them reads as a walk.
 */
export function drawHedgehog(d: Draw, step: HedgehogStep): void {
  const { pen } = d;
  const back = body();
  const snout = face();
  const spread = back.map((p) => pt(BACK.x + (p.x - BACK.x) * 1.22, p.y * 1.25));
  // Its shadow on the ground, then the feet peeping out under it.
  castShadow(d, back.map((p) => pt(BACK.x + (p.x - BACK.x) * 1.12, p.y * 1.12)), pt(2, 2.6), 0.13);
  castShadow(d, snout, pt(1.6, 2.4), 0.14);
  for (const f of FEET) foot(d, f.x + f.step[step], f.y);
  paintFace(d, snout);
  // The body: a brown wash, rounded by light and shadow, quills over it.
  pen.fill(back, PAPER_FILL, 1);
  pen.fill(back, HOG.mantle, 0.95);
  pen.clipped(back, () => pen.crescent(back, pt(-4, -5), () => pen.fill(back, HOG.mantleDeep, 0.55)));
  quills(d);
  pen.clipped(spread, () => {
    // Volume over the quills: lit at the upper left, deep at the lower right.
    glaze(d, BACK.x - 4, -6, 13, 8, -0.4, PAPER_FILL, 0.28);
    pen.crescent(spread, pt(-4, -5.5), () => pen.fill(spread, HOG.mantleDeep, 0.3));
  });
  // Ears at the brow, eyes, and the nose.
  for (const s of [-1, 1]) {
    const ear = ellipseAt(10.4, s * 8.4, 1.9, 1.5, s * 0.5, 14);
    pen.fill(ear, PAPER_FILL, 1);
    pen.fill(ear, HOG.ear, 0.9);
    pen.fill(ellipseAt(10.6, s * 8.6, 0.9, 0.7, s * 0.5, 10), mix(HOG.ear, HOG.mantleDeep, 0.55), 0.6);
    pen.hair(closed(ear), 0.6, d.ink, 0.95);
    pen.dot(14.6, s * 5.3, 1.7, HOG.nose, 1);
    pen.dot(14.1, s * 5.3 - 0.6, 0.6, PAPER_FILL, 0.95);
  }
  const nose = ellipseAt(23.6, 0, 2, 2.4, 0, 16);
  pen.fill(nose, HOG.nose, 1);
  pen.dot(23.1, -0.9, 0.6, PAPER_FILL, 0.9);
  pen.hair(closed(nose), 0.5, d.ink, 0.9);
}
