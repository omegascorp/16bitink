import { createRng } from '../../logic/rng';
import { blob } from '../groundKit';
import { bezier, capsule, closed, type Draw, oval, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { ellipseAt, skinWash } from './preyKit';

/**
 * Parts of the little green frog, after InkGecko's Bullfrog boss scaled
 * down to a prey frog: its spotted skin, gold eyes bulging on top, the
 * eardrums, banded legs with webbed feet and slim fingers. Board px, light
 * from the upper left.
 */
export const FROG_INK = {
  back: '#7da444',
  head: '#94b851',
  deep: '#33491a',
  blotch: '#3a5520',
  belly: '#efe8c4',
  bellyDeep: '#c2b67f',
  fold: '#c9d98a',
  gold: '#e3ae3f',
  goldDeep: '#93611a',
  pupil: '#141218',
  tymp: '#7f7a3e',
  web: '#a9c266',
} as const;

const F = FROG_INK;

/** Fine grain: small dark and pale dots over the skin, fixed by `seed`. */
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
      const dark = rng() < 0.5;
      pen.dot(x, y, 0.4, dark ? F.deep : mix(F.head, PAPER_FILL, 0.55), dark ? 0.35 : 0.5);
    }
  });
}

/** Dark mottled blotches clipped to a shape (centre and size each), placed by `seed`. */
export function blotches(d: Draw, shape: readonly Pt[], spots: readonly (readonly [number, number, number])[], seed: number): void {
  const { pen } = d;
  const rng = createRng(seed);
  pen.clipped(shape, () => {
    for (const [x, y, r] of spots) {
      const b = blob(pt(x, y), r, r * (0.6 + rng() * 0.35), rng, 0.3, 14, rng() * TAU);
      pen.fill(b, F.blotch, 0.6);
      pen.fill(b.map((p) => pt(p.x - 0.2, p.y - 0.25)), mix(F.blotch, F.back, 0.4), 0.35);
      pen.hair(closed(b).slice(4, 13), 0.22, d.ink, 0.45);
    }
  });
}

/** A leg segment a → b, banded with dark stripes across, shaded and inked. */
export function limb(d: Draw, a: Pt, b: Pt, w0: number, w1: number, bands: number): Pt[] {
  const { pen } = d;
  const shape = capsule(a, b, w0, w1);
  skinWash(d, shape, F.back, F.deep);
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const u = pt((b.x - a.x) / len, (b.y - a.y) / len);
  const n = pt(-u.y, u.x);
  pen.clipped(shape, () => {
    for (let i = 0; i < bands; i++) {
      const t = (i + 0.7) / (bands + 0.4);
      const c = pt(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
      const half = (w0 + (w1 - w0) * t) * 0.75;
      const k = len * 0.09;
      const band = [pt(c.x - u.x * k + n.x * half, c.y - u.y * k + n.y * half), pt(c.x + u.x * k + n.x * half, c.y + u.y * k + n.y * half), pt(c.x + u.x * k * 1.3 - n.x * half, c.y + u.y * k * 1.3 - n.y * half), pt(c.x - u.x * k * 0.8 - n.x * half, c.y - u.y * k * 0.8 - n.y * half)];
      pen.fill(band, F.blotch, 0.55);
    }
    pen.hair([pt(a.x - n.x * w0 * 0.22, a.y - n.y * w0 * 0.22), pt(b.x - n.x * w1 * 0.22, b.y - n.y * w1 * 0.22)], Math.min(w0, w1) * 0.22, PAPER_FILL, 0.35);
  });
  pen.stroke(closed(shape), 0.45, d.ink, 0.95);
  return shape;
}

/** A small round toe pad at a tip. */
function knob(d: Draw, t: Pt, r: number): void {
  const k = oval(t.x, t.y, r, r, 10);
  d.pen.fill(k, mix(F.head, PAPER_FILL, 0.35), 1);
  d.pen.hair(closed(k), 0.25, d.ink, 0.9);
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
  pen.fill(web.map((p) => pt(p.x + 0.5, p.y + 0.8)), d.ink, 0.12);
  pen.fill(web, PAPER_FILL, 0.6);
  pen.fill(web, F.web, 0.7);
  pen.hair(closed(web), 0.22, d.ink, 0.55);
  for (const t of tips) {
    const toe = capsule(ankle, t, 0.95, 0.55);
    skinWash(d, toe, F.back, F.deep);
    pen.stroke(closed(toe), 0.3, d.ink, 0.9, false);
    knob(d, t, 0.48);
  }
}

/** A small front hand at the wrist: four fingers splayed round `ang`, each with a round tip. */
export function hand(d: Draw, wrist: Pt, ang: number, spread: number, lens: readonly number[]): void {
  const { pen } = d;
  const n = lens.length;
  lens.forEach((l, i) => {
    const a = ang + (i / (n - 1) - 0.5) * spread;
    const tip = pt(wrist.x + Math.cos(a) * l, wrist.y + Math.sin(a) * l);
    const f = capsule(wrist, tip, 0.85, 0.55);
    skinWash(d, f, F.back, F.deep);
    pen.stroke(closed(f), 0.3, d.ink, 0.9, false);
    knob(d, tip, 0.45);
  });
}

/** The round eardrum behind the eye, with its rim and a glint. */
export function tympanum(d: Draw, c: Pt, r: number): void {
  const { pen } = d;
  const disc = oval(c.x, c.y, r, r * 0.92, 16);
  pen.fill(disc, F.tymp, 0.85);
  pen.crescent(disc, pt(r * 0.3, r * 0.35), () => pen.fill(disc, F.deep, 0.5));
  pen.hair(bezier(pt(c.x - r * 0.6, c.y - r * 0.2), pt(c.x - r * 0.5, c.y - r * 0.65), pt(c.x - r * 0.05, c.y - r * 0.7), 5), 0.3, PAPER_FILL, 0.6);
  pen.stroke(closed(disc), 0.35, d.ink, 0.85);
}

/** A bulging eye: a green lid dome round a gold eyeball with a dark horizontal pupil and a bright glint. */
export function eye(d: Draw, c: Pt, r: number): void {
  const { pen } = d;
  const lid = oval(c.x, c.y, r * 1.22, r * 1.15, 20);
  pen.fill(lid.map((p) => pt(p.x + 0.5, p.y + 0.8)), d.ink, 0.22);
  skinWash(d, lid, F.head, F.deep, { at: pt(c.x - r * 0.4, c.y - r * 0.5), r: r * 0.8 });
  pen.stroke(closed(lid), 0.45, d.ink, 0.95);
  const ball = oval(c.x + r * 0.05, c.y, r * 0.95, r * 0.92, 20);
  pen.fill(ball, PAPER_FILL, 1);
  pen.fill(ball, F.gold, 0.95);
  pen.clipped(ball, () => {
    pen.crescent(ball, pt(-r * 0.2, -r * 0.3), () => pen.fill(ball, F.goldDeep, 0.6));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      pen.hair([pt(c.x + Math.cos(a) * r * 0.45, c.y + Math.sin(a) * r * 0.42), pt(c.x + Math.cos(a) * r * 0.85, c.y + Math.sin(a) * r * 0.8)], 0.15, F.goldDeep, 0.55);
    }
  });
  pen.fill(ellipseAt(c.x + r * 0.08, c.y, r * 0.6, r * 0.36, 0, 14), F.pupil, 1);
  pen.stroke(closed(ball), 0.4, d.ink, 0.95);
  pen.dot(c.x - r * 0.3, c.y - r * 0.36, Math.max(0.4, r * 0.22), PAPER_FILL, 1);
  pen.dot(c.x + r * 0.38, c.y + r * 0.3, 0.4, PAPER_FILL, 0.7);
}
