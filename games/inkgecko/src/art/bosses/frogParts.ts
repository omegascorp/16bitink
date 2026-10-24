import { createRng } from '../../logic/rng';
import { blob } from '../groundKit';
import { bezier, capsule, closed, type Draw, oval, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { ellipseAt, glaze } from '../propsKit';
import { mix } from '../wash';

/**
 * Parts of the Bullfrog boss: its warty olive skin, gold-ringed eyes,
 * eardrums, banded legs with webbed feet, the vocal sacs it puffs out and
 * the swirls of a daze. Local units (board px), light from the upper left.
 */
export const FROG = {
  back: '#6d8a38',
  head: '#86a444',
  deep: '#33441a',
  blotch: '#3a4520',
  belly: '#efe7c3',
  bellyDeep: '#bfb27c',
  gold: '#dca43c',
  goldDeep: '#8f5f17',
  pupil: '#141218',
  tymp: '#80763f',
  sac: '#f3edd0',
  sacDeep: '#c7bb86',
  web: '#9fb35e',
} as const;

export const flipY = (pts: readonly Pt[]): Pt[] => pts.map((p) => pt(p.x, -p.y));
/** A closed outline from its +y half, traced from the front of the midline to the back of it. */
export const bilateral = (half: readonly Pt[]): Pt[] => [...half, ...flipY(half).reverse().slice(1, -1)];

/** Paper, a wash, a pale bloom where the light falls, the colour deepening on the shadow side. */
export function skinWash(d: Draw, shape: readonly Pt[], wash: string, deep: string, light?: { at: Pt; r: number }): void {
  const { pen } = d;
  const xs = shape.map((p) => p.x);
  const ys = shape.map((p) => p.y);
  const size = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, wash, 0.93);
  pen.clipped(shape, () => {
    if (light) glaze(d, light.at.x, light.at.y, light.r, light.r * 0.6, -0.5, mix(wash, PAPER_FILL, 0.55), 0.55);
    pen.crescent(shape, pt(-size * 0.07, -size * 0.11), () => pen.fill(shape, deep, 0.42));
  });
}

/** Warts and grain: fine dark and pale dots over the skin, fixed by `seed`. */
export function warts(d: Draw, shape: readonly Pt[], n: number, seed: number): void {
  const { pen } = d;
  const rng = createRng(seed);
  const xs = shape.map((p) => p.x);
  const ys = shape.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  pen.clipped(shape, () => {
    for (let i = 0; i < n; i++) {
      const x = x0 + rng() * (x1 - x0);
      const y = y0 + rng() * (y1 - y0);
      const r = 0.35 + rng() * 0.55;
      const dark = rng() < 0.55;
      pen.dot(x, y, r, dark ? FROG.deep : mix(FROG.head, PAPER_FILL, 0.5), dark ? 0.55 : 0.6);
    }
  });
}

/** Dark mottled blotches clipped to a shape, placed by `seed` among `spots` (centre, size). */
export function blotches(d: Draw, shape: readonly Pt[], spots: readonly (readonly [number, number, number])[], seed: number): void {
  const { pen } = d;
  const rng = createRng(seed);
  pen.clipped(shape, () => {
    for (const [x, y, r] of spots) {
      const b = blob(pt(x, y), r, r * (0.6 + rng() * 0.35), rng, 0.3, 14, rng() * TAU);
      pen.fill(b, FROG.blotch, 0.62);
      pen.fill(b.map((p) => pt(p.x - 0.4, p.y - 0.5)), mix(FROG.blotch, FROG.back, 0.4), 0.35);
      pen.hair(closed(b).slice(4, 13), 0.35, d.ink, 0.45);
    }
  });
}

/** A leg segment a → b, banded with dark stripes across, shaded and inked. */
export function limb(d: Draw, a: Pt, b: Pt, w0: number, w1: number, bands: number): Pt[] {
  const { pen } = d;
  const shape = capsule(a, b, w0, w1);
  skinWash(d, shape, FROG.back, FROG.deep);
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const u = pt((b.x - a.x) / len, (b.y - a.y) / len);
  const n = pt(-u.y, u.x);
  pen.clipped(shape, () => {
    for (let i = 0; i < bands; i++) {
      const t = (i + 0.7) / (bands + 0.4);
      const c = pt(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
      const w = w0 + (w1 - w0) * t;
      const half = w * 0.75;
      const band = [pt(c.x - u.x * 1.6 + n.x * half, c.y - u.y * 1.6 + n.y * half), pt(c.x + u.x * 1.4 + n.x * half, c.y + u.y * 1.4 + n.y * half), pt(c.x + u.x * 1.9 - n.x * half, c.y + u.y * 1.9 - n.y * half), pt(c.x - u.x * 1.2 - n.x * half, c.y - u.y * 1.2 - n.y * half)];
      pen.fill(band, FROG.blotch, 0.6);
    }
    pen.hair([pt(a.x - n.x * w0 * 0.22, a.y - n.y * w0 * 0.22), pt(b.x - n.x * w1 * 0.22, b.y - n.y * w1 * 0.22)], Math.min(w0, w1) * 0.22, PAPER_FILL, 0.3);
  });
  pen.stroke(closed(shape), 0.95, d.ink, 0.95);
  return shape;
}

/** A webbed hind foot from the ankle, its toes fanned round `ang`, `spread` wide, the webs between them. */
export function foot(d: Draw, ankle: Pt, ang: number, spread: number, lens: readonly number[]): void {
  const { pen } = d;
  const n = lens.length;
  const tips = lens.map((l, i) => {
    const a = ang + (i / (n - 1) - 0.5) * spread;
    return pt(ankle.x + Math.cos(a) * l, ankle.y + Math.sin(a) * l);
  });
  const web: Pt[] = [ankle];
  tips.forEach((t, i) => {
    web.push(t);
    const next = tips[i + 1];
    if (next) {
      const mid = pt((t.x + next.x) / 2, (t.y + next.y) / 2);
      web.push(pt(ankle.x + (mid.x - ankle.x) * 0.62, ankle.y + (mid.y - ankle.y) * 0.62));
    }
  });
  pen.fill(web.map((p) => pt(p.x + 1.2, p.y + 1.8)), d.ink, 0.12);
  pen.fill(web, PAPER_FILL, 0.6);
  pen.fill(web, FROG.web, 0.7);
  pen.hair(closed(web), 0.4, d.ink, 0.55);
  for (const t of tips) {
    const toe = capsule(ankle, t, 2.6, 1.5);
    skinWash(d, toe, FROG.back, FROG.deep);
    pen.stroke(closed(toe), 0.6, d.ink, 0.9, false);
    const knob = oval(t.x, t.y, 1.25, 1.25, 10);
    pen.fill(knob, mix(FROG.head, PAPER_FILL, 0.3), 1);
    pen.hair(closed(knob), 0.45, d.ink, 0.9);
  }
}

/** A small front hand at the wrist: four fingers splayed round `ang`, each with a round tip. */
export function hand(d: Draw, wrist: Pt, ang: number, spread: number, lens: readonly number[]): void {
  const { pen } = d;
  const n = lens.length;
  lens.forEach((l, i) => {
    const a = ang + (i / (n - 1) - 0.5) * spread;
    const tip = pt(wrist.x + Math.cos(a) * l, wrist.y + Math.sin(a) * l);
    const f = capsule(wrist, tip, 2.4, 1.6);
    skinWash(d, f, FROG.back, FROG.deep);
    pen.stroke(closed(f), 0.6, d.ink, 0.9, false);
    const knob = oval(tip.x, tip.y, 1.15, 1.15, 10);
    pen.fill(knob, mix(FROG.head, PAPER_FILL, 0.3), 1);
    pen.hair(closed(knob), 0.45, d.ink, 0.9);
  });
}

/** The big round eardrum behind the eye, with its rim and a glint. */
export function tympanum(d: Draw, c: Pt, r: number): void {
  const { pen } = d;
  const disc = oval(c.x, c.y, r, r * 0.92, 20);
  pen.fill(disc, FROG.tymp, 0.9);
  pen.crescent(disc, pt(r * 0.3, r * 0.35), () => pen.fill(disc, FROG.deep, 0.5));
  pen.hair(closed(oval(c.x, c.y, r * 0.55, r * 0.5, 14)), 0.35, FROG.deep, 0.5);
  pen.hair(bezier(pt(c.x - r * 0.6, c.y - r * 0.2), pt(c.x - r * 0.5, c.y - r * 0.65), pt(c.x - r * 0.05, c.y - r * 0.7), 5), 0.6, PAPER_FILL, 0.6);
  pen.stroke(closed(disc), 0.75, d.ink, 0.9);
}

/**
 * A bulging eye: a green lid dome round a gold-ringed eyeball with a dark
 * horizontal pupil and a bright glint; `shut` lowers the lid over it.
 */
export function eye(d: Draw, c: Pt, r: number, shut: boolean): void {
  const { pen } = d;
  const lid = oval(c.x, c.y, r * 1.22, r * 1.15, 22);
  pen.fill(lid.map((p) => pt(p.x + 1, p.y + 1.6)), d.ink, 0.2);
  skinWash(d, lid, FROG.head, FROG.deep, { at: pt(c.x - r * 0.4, c.y - r * 0.5), r: r * 0.8 });
  pen.stroke(closed(lid), 0.9, d.ink, 0.95);
  const ball = oval(c.x + r * 0.05, c.y, r * 0.95, r * 0.92, 22);
  if (shut) {
    pen.clipped(ball, () => pen.crescent(ball, pt(-r * 0.25, -r * 0.4), () => pen.fill(ball, FROG.deep, 0.4)));
    const s = Math.sign(c.y) || 1;
    pen.stroke(bezier(pt(c.x - r * 0.8, c.y + s * r * 0.1), pt(c.x, c.y + s * r * 0.55), pt(c.x + r * 0.85, c.y + s * r * 0.05), 8), 1.1, d.ink, 0.95, false);
    for (const k of [-0.45, 0, 0.45]) pen.hair([pt(c.x + k * r, c.y + s * r * 0.42), pt(c.x + k * r * 1.2, c.y + s * r * 0.85)], 0.5, d.ink, 0.75);
    return;
  }
  pen.fill(ball, PAPER_FILL, 1);
  pen.fill(ball, FROG.gold, 0.95);
  pen.clipped(ball, () => {
    pen.crescent(ball, pt(-r * 0.2, -r * 0.3), () => pen.fill(ball, FROG.goldDeep, 0.6));
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      pen.hair([pt(c.x + Math.cos(a) * r * 0.45, c.y + Math.sin(a) * r * 0.42), pt(c.x + Math.cos(a) * r * 0.85, c.y + Math.sin(a) * r * 0.8)], 0.3, FROG.goldDeep, 0.6);
    }
  });
  pen.fill(ellipseAt(c.x + r * 0.08, c.y, r * 0.58, r * 0.34, 0, 16), FROG.pupil, 1);
  pen.stroke(closed(ball), 0.8, d.ink, 0.95);
  pen.dot(c.x - r * 0.32, c.y - r * 0.38, r * 0.2, PAPER_FILL, 1);
  pen.dot(c.x + r * 0.35, c.y + r * 0.3, r * 0.08, PAPER_FILL, 0.8);
}

/** A puffed vocal sac: a pale taut balloon with a glossy window, faint stretch lines, a shadow beneath. */
export function sac(d: Draw, c: Pt, rx: number, ry: number): void {
  const { pen } = d;
  const shape = oval(c.x, c.y, rx, ry, 30);
  pen.fill(shape.map((p) => pt(p.x + 2, p.y + 3)), d.ink, 0.2);
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, FROG.sac, 0.95);
  pen.clipped(shape, () => {
    pen.crescent(shape, pt(-rx * 0.25, -ry * 0.3), () => pen.fill(shape, FROG.sacDeep, 0.55));
    pen.crescent(shape, pt(-rx * 0.1, -ry * 0.14), () => pen.fill(shape, FROG.sacDeep, 0.3));
    const s = Math.sign(c.y) || 1;
    for (const k of [-0.5, -0.15, 0.2, 0.55]) {
      pen.hair(bezier(pt(c.x + k * rx * 1.4, c.y - s * ry * 0.95), pt(c.x + k * rx * 0.6, c.y), pt(c.x + k * rx * 1.2, c.y + s * ry * 0.95), 8), 0.3, FROG.sacDeep, 0.6);
    }
  });
  pen.fill(ellipseAt(c.x - rx * 0.3, c.y - ry * 0.35, rx * 0.32, ry * 0.2, -0.5, 14), PAPER_FILL, 0.85);
  pen.dot(c.x - rx * 0.05, c.y - ry * 0.5, rx * 0.08, PAPER_FILL, 1);
  pen.stroke(closed(shape), 1, d.ink, 0.95);
}

/** A little ink spiral of a daze at c, on a paper halo so it reads over the skin. */
export function swirl(d: Draw, c: Pt, r: number, turn: number): void {
  const pts = Array.from({ length: 30 }, (_, i) => {
    const t = i / 29;
    const a = turn + t * TAU * 1.7;
    return pt(c.x + Math.cos(a) * r * (0.15 + 0.85 * t), c.y + Math.sin(a) * r * (0.15 + 0.85 * t));
  });
  d.pen.hair(pts, 2, PAPER_FILL, 0.75);
  d.pen.hair(pts, 0.85, d.ink, 0.95);
}
