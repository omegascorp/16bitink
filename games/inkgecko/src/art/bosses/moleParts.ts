import { createRng, type Rng } from '../../logic/rng';
import { blob } from '../groundKit';
import { bezier, closed, cub, type Draw, pt, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { ellipseAt, glaze, leafBlade } from '../propsKit';
import { mix } from '../wash';

/**
 * Parts of the Mole boss: its velvet fur coat, the pink snout and spade
 * paws, the soil clods it shoves up, and the stars of a bonk. Local units
 * (board px), light from the upper left.
 */
export const MOLE = {
  fur: '#3a3843',
  furDeep: '#15131b',
  sheen: '#aeb3c8',
  pink: '#efaba6',
  pinkDeep: '#b9636c',
  nose: '#c9707a',
  claw: '#f1e5c8',
  clawDeep: '#a8916b',
  soil: '#6f4f36',
  soilLit: '#a57e5a',
  soilDark: '#3b281b',
  star: '#f3c94e',
} as const;

export const flipY = (pts: readonly Pt[]): Pt[] => pts.map((p) => pt(p.x, -p.y));
/** A closed outline from its +y half, traced from the front of the midline to the back of it. */
export const bilateral = (half: readonly Pt[]): Pt[] => [...half, ...flipY(half).reverse().slice(1, -1)];

/** Whether p lies inside a closed polygon. */
export function inside(poly: readonly Pt[], p: Pt): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) hit = !hit;
  }
  return hit;
}

function bounds(shape: readonly Pt[]): { x0: number; x1: number; y0: number; y1: number } {
  const xs = shape.map((p) => p.x);
  const ys = shape.map((p) => p.y);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}

/** Where the coat catches the light, and how far that sheen spreads. */
export interface Sheen {
  readonly at: Pt;
  readonly r: number;
}

/**
 * Velvet fur: a near-black wash, a soft blue-grey sheen where the light
 * lies on it, short hairs lying back from `flow` (dark everywhere, pale in
 * the sheen), a deep crescent on the shadow side and a fuzzy contour.
 * Hair positions are fixed by `seed`; only the line boils.
 */
export function furCoat(d: Draw, smooth: readonly Pt[], flow: Pt, sheens: readonly Sheen[], seed: number, n: number, tuft = 1): void {
  const { pen } = d;
  const shape = furry(smooth, flow, seed + 1, tuft);
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, MOLE.fur, 0.97);
  const b = bounds(smooth);
  const size = Math.max(b.x1 - b.x0, b.y1 - b.y0);
  const light = (p: Pt): number => Math.max(0, ...sheens.map((s) => 1 - Math.hypot(p.x - s.at.x, p.y - s.at.y) / s.r));
  pen.clipped(shape, () => {
    for (const s of sheens) glaze(d, s.at.x, s.at.y, s.r, s.r * 0.62, -0.5, MOLE.sheen, 0.42);
    pen.crescent(smooth, pt(-size * 0.09, -size * 0.13), () => pen.fill(shape, MOLE.furDeep, 0.55));
    pen.crescent(smooth, pt(size * 0.025, size * 0.04), () => pen.fill(shape, MOLE.sheen, 0.3));
    const rng = createRng(seed);
    for (let i = 0; i < n; i++) {
      const p = pt(b.x0 + rng() * (b.x1 - b.x0), b.y0 + rng() * (b.y1 - b.y0));
      const len = 2 + rng() * 2;
      const curl = (rng() - 0.5) * 1.2;
      const lit = rng() < 0.2 + light(p) * 0.8;
      if (!inside(smooth, p)) continue;
      const l = Math.hypot(p.x - flow.x, p.y - flow.y) || 1;
      const u = pt((p.x - flow.x) / l, (p.y - flow.y) / l);
      const tip = pt(p.x + u.x * len, p.y + u.y * len);
      const mid = pt((p.x + tip.x) / 2 - u.y * curl, (p.y + tip.y) / 2 + u.x * curl);
      pen.hair([p, mid, tip], 0.6, MOLE.furDeep, 0.6);
      if (lit) pen.hair([pt(p.x + 0.5, p.y + 0.4), pt(mid.x + 0.5, mid.y + 0.4), pt(tip.x + 0.5, tip.y + 0.4)], 0.42, MOLE.sheen, 0.2 + light(p) * 0.55);
    }
  });
  pen.stroke(closed(shape), 0.85, d.ink, 0.9, false);
}

/**
 * The contour roughened into fur: resampled every couple of px, every other
 * point pushed out into a tuft raked back from `flow`, so the silhouette
 * reads as a pelt, not a hard shell.
 */
function furry(shape: readonly Pt[], flow: Pt, seed: number, tuft: number): Pt[] {
  const rng = createRng(seed);
  const loop = closed(shape);
  const out: Pt[] = [];
  let odd = false;
  for (let i = 0; i < shape.length; i++) {
    const a = loop[i]!;
    const b = loop[i + 1]!;
    const seg = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    let nx = -(b.y - a.y) / seg;
    let ny = (b.x - a.x) / seg;
    const mid = pt((a.x + b.x) / 2, (a.y + b.y) / 2);
    if (inside(shape, pt(mid.x + nx * 0.8, mid.y + ny * 0.8))) [nx, ny] = [-nx, -ny];
    for (let s = 0; s < seg; s += (1.1 + rng() * 0.5) * Math.sqrt(tuft)) {
      const p = pt(a.x + ((b.x - a.x) * s) / seg, a.y + ((b.y - a.y) * s) / seg);
      odd = !odd;
      if (!odd) {
        out.push(pt(p.x - nx * 0.3, p.y - ny * 0.3));
        continue;
      }
      const l = Math.hypot(p.x - flow.x, p.y - flow.y) || 1;
      const len = (0.9 + rng() * 1.3) * tuft;
      out.push(pt(p.x + nx * len + ((p.x - flow.x) / l) * len * 0.7, p.y + ny * len + ((p.y - flow.y) / l) * len * 0.7));
    }
  }
  return out;
}

/**
 * The pink snout from x0 (half-width w, sunk under the fur that is drawn
 * over it) to its tip at x1: a bulbous end with a darker pad and nostrils,
 * soft wrinkles, a glazed highlight.
 */
export function snout(d: Draw, x0: number, x1: number, w: number): void {
  const { pen } = d;
  const len = x1 - x0;
  const half = [
    ...cub(pt(x1, 0), pt(x1 + 0.2, w * 0.5), pt(x1 - len * 0.08, w * 0.72), pt(x1 - len * 0.22, w * 0.62), 6),
    ...cub(pt(x1 - len * 0.22, w * 0.62), pt(x1 - len * 0.4, w * 0.54), pt(x0 + len * 0.3, w * 0.8), pt(x0, w), 8).slice(1),
  ];
  const shape = bilateral([...half, pt(x0 - 1, 0)]);
  pen.fill(shape.map((p) => pt(p.x + 1.4, p.y + 2.1)), d.ink, 0.2);
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, MOLE.pink, 0.95);
  pen.clipped(shape, () => {
    pen.crescent(shape, pt(-0.8, -w * 0.4), () => pen.fill(shape, MOLE.pinkDeep, 0.5));
    glaze(d, x1 - len * 0.35, -w * 0.25, len * 0.3, w * 0.22, 0, PAPER_FILL, 0.55);
    for (const t of [0.42, 0.58, 0.7]) {
      const x = x0 + len * t;
      const hw = w * 0.7;
      pen.hair(bezier(pt(x - 0.5, -hw), pt(x + 0.7, 0), pt(x - 0.5, hw), 6), 0.3, MOLE.pinkDeep, 0.6);
    }
    pen.fill(ellipseAt(x1 - len * 0.04, 0, len * 0.08, w * 0.62, 0, 14), MOLE.nose, 0.9);
  });
  pen.stroke(closed(shape), 0.8, d.ink, 0.95);
  for (const s of [-1, 1]) {
    pen.fill(ellipseAt(x1 - len * 0.03, s * w * 0.27, Math.max(0.4, w * 0.09), Math.max(0.55, w * 0.15), s * 0.5, 8), MOLE.furDeep, 0.95);
  }
  pen.dot(x1 - len * 0.09, -w * 0.38, Math.max(0.35, w * 0.08), PAPER_FILL, 0.9);
}

/** Whiskers fanning out from the sides of the snout, between x0 and x1. */
export function whiskers(d: Draw, x0: number, x1: number, w: number, reach: number): void {
  const { pen } = d;
  for (const s of [-1, 1]) {
    for (let k = 0; k < 4; k++) {
      const x = x0 + ((x1 - x0) * (k + 0.5)) / 4;
      const root = pt(x, s * w * (0.95 - k * 0.07));
      const tip = pt(x + reach * (0.2 + k * 0.12), s * (w + reach * (0.95 - k * 0.12)));
      pen.hair(bezier(root, pt((root.x + tip.x) / 2 - reach * 0.1, s * (w + reach * 0.4)), tip, 6), 0.3, d.ink, 0.6);
    }
  }
}

/**
 * A big pink spade of a forepaw at c, its claws reaching along `ang`, `s`
 * its scale: a fur cuff from `root` on the body, a broad palm with creases,
 * five fat fingers and five long pale claws.
 */
export function paw(d: Draw, root: Pt, c: Pt, ang: number, s: number, splay = 1): void {
  const { pen } = d;
  const [cs, sn] = [Math.cos(ang), Math.sin(ang)];
  /** A point `along` the way the claws reach and `across` the hand. */
  const u = (along: number, across: number): Pt => pt(c.x + (cs * along - sn * across) * s, c.y + (sn * along + cs * across) * s);
  const cuff = [...bezier(pt(root.x - 5, root.y), u(-7, -6), u(-2, -7), 6), ...bezier(u(-2, 7), u(-7, 6), pt(root.x + 5, root.y), 6)];
  pen.fill(cuff, MOLE.fur, 1);
  pen.clipped(cuff, () => glaze(d, c.x - 3, c.y - 3, 5 * s, 3 * s, -0.5, MOLE.sheen, 0.35));
  pen.hair(cuff.slice(0, 7), 0.8, d.ink, 0.8);
  pen.hair(cuff.slice(7), 0.8, d.ink, 0.8);
  const fingers = [-2, -1, 0, 1, 2].map((k) => {
    const curve = Math.abs(k) * 1.1;
    const a = ang + k * 0.17 * splay;
    const root2 = u(5.2 - curve, k * 3.3 * Math.sqrt(splay));
    return { a, base: u(4 - curve, k * 3.1 * Math.sqrt(splay)), blade: leafBlade(root2, a, (8.4 - Math.abs(k) * 1.1) * s, 2.7 * s, k * 0.03) };
  });
  for (const f of fingers) {
    const sh = f.blade.shape;
    pen.fill(sh.map((p) => pt(p.x + 1.2, p.y + 1.8)), d.ink, 0.15);
    pen.fill(sh, PAPER_FILL, 1);
    pen.fill(sh, MOLE.claw, 0.95);
    pen.crescent(sh, pt(-0.6, -0.9), () => pen.fill(sh, MOLE.clawDeep, 0.6));
    pen.hair([f.blade.at(0.15, 0), f.blade.at(0.8, 0)], 0.35, MOLE.clawDeep, 0.6);
    pen.stroke(closed(sh), 0.55, d.ink, 0.9, false);
  }
  const palm = ellipseAt(c.x, c.y, 5.8 * s, 9.2 * s * Math.sqrt(splay), ang, 26);
  pen.fill(palm, PAPER_FILL, 1);
  pen.fill(palm, MOLE.pink, 0.95);
  pen.clipped(palm, () => {
    pen.crescent(palm, pt(-1.8 * s, -2.6 * s), () => pen.fill(palm, MOLE.pinkDeep, 0.45));
    glaze(d, c.x - 1.6 * s, c.y - 2.2 * s, 3.6 * s, 2.6 * s, -0.5, PAPER_FILL, 0.45);
    for (const k of [-4, 0.5, 4.5]) pen.hair(bezier(u(-3.8, k * 0.8), u(-0.5, k * 1.05), u(2.4, k * 1.2), 5), 0.4, MOLE.pinkDeep, 0.65);
  });
  for (const f of fingers) {
    const knuckle = ellipseAt(f.base.x, f.base.y, 2.1 * s, 1.75 * s, f.a, 12);
    pen.fill(knuckle, MOLE.pink, 1);
    pen.crescent(knuckle, pt(-0.5, -0.7), () => pen.fill(knuckle, MOLE.pinkDeep, 0.45));
    pen.hair(closed(knuckle).slice(0, 7), 0.35, MOLE.pinkDeep, 0.8);
  }
  pen.stroke(closed(palm), 0.9, d.ink, 0.95);
}

/** A loose clod of soil: a lumpy brown wash, lit at the upper left, dark beneath, outlined. */
export function clod(d: Draw, c: Pt, s: number, seed: number): void {
  const { pen } = d;
  const rng = createRng(seed);
  const shape = blob(c, s, s * (0.7 + rng() * 0.25), rng, 0.3, 11, rng() * TAU);
  pen.fill(shape.map((p) => pt(p.x + s * 0.3 + 0.5, p.y + s * 0.45 + 0.7)), d.ink, 0.2);
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, mix(MOLE.soil, MOLE.soilLit, rng() * 0.7), 0.95);
  pen.clipped(shape, () => {
    pen.crescent(shape, pt(-s * 0.35, -s * 0.5), () => pen.fill(shape, MOLE.soilDark, 0.65));
    pen.fill(ellipseAt(c.x - s * 0.3, c.y - s * 0.35, s * 0.42, s * 0.26, -0.6, 10), mix(MOLE.soilLit, PAPER_FILL, 0.45), 0.6);
    if (s > 2.4) pen.stipple(shape, Math.round(s * 5), () => 0.7, 0.3, MOLE.soilDark);
  });
  pen.stroke(closed(shape), s > 2.4 ? 0.6 : 0.45, d.ink, 0.8, false);
}

/** One clod's place: angle round the ring, how far out (1 = on the ring), size, seed. */
export interface ClodSpot {
  readonly p: Pt;
  readonly a: number;
  readonly k: number;
  readonly s: number;
  readonly seed: number;
}

/** Clods scattered round an ellipse (centre c, radii rx × ry), fixed by `seed`; `skip(a)` keeps a sector clear. */
export function clodRing(c: Pt, rx: number, ry: number, count: number, seed: number, size: number, skip: (a: number) => boolean): ClodSpot[] {
  const rng: Rng = createRng(seed);
  const out: ClodSpot[] = [];
  for (let i = 0; i < count * 3 && out.length < count; i++) {
    const a = rng() * TAU - Math.PI;
    const k = 0.92 + rng() * rng() * 0.4;
    const s = size * (0.45 + rng() * 0.75) * (k > 1.2 ? 0.6 : 1);
    const sd = Math.floor(rng() * 1e6);
    if (skip(a)) continue;
    out.push({ p: pt(c.x + Math.cos(a) * rx * k, c.y + Math.sin(a) * ry * k), a, k, s, seed: sd });
  }
  return out;
}

/** Loose crumbs: tiny soil dots round a ring. */
export function crumbs(d: Draw, c: Pt, rx: number, ry: number, count: number, seed: number): void {
  const rng = createRng(seed);
  for (let i = 0; i < count; i++) {
    const a = rng() * TAU;
    const k = 0.98 + rng() * 0.28;
    const r = 0.5 + rng() * 0.8;
    const col = rng() < 0.5 ? MOLE.soil : MOLE.soilDark;
    d.pen.dot(c.x + Math.cos(a) * rx * k, c.y + Math.sin(a) * ry * k, r, col, 0.85);
  }
}

/** A five-pointed cartoon star of a bonk. */
export function star(d: Draw, c: Pt, r: number, rot: number): void {
  const { pen } = d;
  const shape = Array.from({ length: 10 }, (_, i) => {
    const a = rot + (i / 10) * TAU;
    const rr = i % 2 === 0 ? r : r * 0.48;
    return pt(c.x + Math.cos(a) * rr, c.y + Math.sin(a) * rr);
  });
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, MOLE.star, 0.95);
  pen.crescent(shape, pt(-r * 0.2, -r * 0.3), () => pen.fill(shape, mix(MOLE.star, '#c0751f', 0.6), 0.6));
  pen.stroke(closed(shape), 0.7, d.ink, 0.95, false);
}
