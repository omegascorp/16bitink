import { bezier, closed, cub, oval, pt, ribbon, type Draw } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { mix } from '../wash';
import { dab, gleam, paint, SHADOW, type PaintOpts } from './crownInfantryPaint';

/**
 * The Crown infantry's shared kit: their colours (steel, deep blue cloth,
 * ochre-gold trim) and the body parts every one of them is built from,
 * drawn facing right in a 3/4 view with the light from the upper left:
 * bent limbs, boots, fists, a head in profile, quilting, mail and trim.
 */
export const CROWN = {
  blue: '#2f55a8',
  blueDeep: '#233f82',
  blueLight: '#5b7cc2',
  gold: '#c99a2e',
  goldLight: '#e2bd58',
  steel: '#a9b3c1',
  steelDark: '#6b7485',
  iron: '#4b5262',
  leather: '#8c5f37',
  leatherDark: '#5d3e25',
  hide: '#b48857',
  linen: '#e6dcc2',
  wood: '#9a7247',
  woodDark: '#5f4329',
  skin: '#e0ae88',
  skinShade: '#b9785a',
  hair: '#5a3c25',
  hose: '#4a5576',
  boot: '#5b3f2b',
  holy: '#ffe9a6',
} as const;

/** Darkened for the far side of the figure (the far leg and arm). */
export const far = (color: string): string => mix(color, SHADOW, 0.28);

/** A part painted the usual way for these figures. */
export function part(d: Draw, shape: readonly Pt[], color: string, o: PaintOpts = {}): void {
  paint(d, shape, color, { alpha: 0.92, shadow: 0.5, line: 0.6, hatch: 0.18, ...o });
}

/** Steel: glossy, a crisp terminator, light hatching. */
export function steel(d: Draw, shape: readonly Pt[], color: string = CROWN.steel, o: PaintOpts = {}): void {
  paint(d, shape, color, { alpha: 0.95, shadow: 0.62, line: 0.6, hatch: 0.16, gloss: true, ...o });
}

/** n points along the straight line from a to b (both ends included). */
export function seg(a: Pt, b: Pt, n: number): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => pt(a.x + ((b.x - a.x) * i) / n, a.y + ((b.y - a.y) * i) / n));
}

/** A bent limb from a through the joint k to b, its width easing w0 → wk → w1, as one closed shape. */
export function limb(a: Pt, k: Pt, b: Pt, w0: number, wk: number, w1: number): Pt[] {
  const n = 7;
  const spine = [...seg(a, k, n), ...seg(k, b, n).slice(1)];
  return ribbon(spine, (u) => (u < 0.5 ? w0 + (wk - w0) * (u / 0.5) : wk + (w1 - wk) * ((u - 0.5) / 0.5))).shape;
}

/** A band of width `w` (or `w(u)` along it, u in 0..1) round a spine, as a closed shape. */
export function ribbonOf(spine: readonly Pt[], w: number, fn?: (u: number) => number): Pt[] {
  return ribbon(spine, fn ?? (() => w)).shape;
}

/** A rounded rectangle's outline. */
export function roundRect(x0: number, y0: number, x1: number, y1: number, r: number): Pt[] {
  const corner = (cx: number, cy: number, from: number): Pt[] =>
    Array.from({ length: 4 }, (_, i) => pt(cx + Math.cos(from + (i / 3) * (Math.PI / 2)) * r, cy + Math.sin(from + (i / 3) * (Math.PI / 2)) * r));
  return [...corner(x1 - r, y0 + r, -Math.PI / 2), ...corner(x1 - r, y1 - r, 0), ...corner(x0 + r, y1 - r, Math.PI / 2), ...corner(x0 + r, y0 + r, Math.PI)];
}

/** Rivets: small domes, dark below and caught by the light on top. */
export function rivets(d: Draw, at: readonly Pt[], r = 0.5, color: string = CROWN.steel): void {
  for (const p of at) {
    d.pen.dot(p.x + r * 0.25, p.y + r * 0.3, r, d.ink, 0.6);
    d.pen.dot(p.x, p.y, r * 0.8, color, 1);
    d.pen.dot(p.x - r * 0.25, p.y - r * 0.3, r * 0.38, PAPER_FILL, 0.9);
  }
}

/** A seam: a fine dark line with a lit line just under it, as a joint catches the light. */
export function seam(d: Draw, pts: readonly Pt[], w = 0.35, alpha = 0.75): void {
  d.pen.hair(pts, w, d.ink, alpha);
  d.pen.hair(pts.map((p) => pt(p.x + 0.15, p.y + w * 1.1)), w * 0.8, PAPER_FILL, 0.4);
}

/** A strip of ochre-gold trim along a line: a hem, a collar, a shield's rim. */
export function trim(d: Draw, pts: readonly Pt[], w: number, color: string = CROWN.gold): void {
  const strip = ribbon(pts, () => w).shape;
  paint(d, strip, color, { alpha: 0.95, shadow: 0.35, hatch: 0, line: 0.4, gloss: true });
  gleam(d, pts.map((p) => pt(p.x - 0.2, p.y - w * 0.18)), Math.max(0.3, w * 0.22), 0.5);
}

/**
 * Quilting (a gambeson's padded channels): seams along each line in `rows`,
 * each puff lit just after its seam and shaded just before the next one.
 */
export function quilt(d: Draw, clip: readonly Pt[], rows: readonly (readonly Pt[])[], color: string): void {
  const dark = mix(color, SHADOW, 0.55);
  d.pen.clipped(clip, () => {
    for (const r of rows) {
      dab(d, ribbon(r.map((p) => pt(p.x - 0.7, p.y)), () => 1.2).shape, dark, 0.35, 0.5);
      d.pen.hair(r, 0.42, dark, 0.9);
      gleam(d, r.map((p) => pt(p.x + 0.8, p.y)), 0.55, 0.32);
    }
  });
}

/** Chain mail: staggered rows of small rings, darkening down the shadow side. */
export function mail(d: Draw, clip: readonly Pt[], x0: number, x1: number, y0: number, y1: number): void {
  d.pen.clipped(clip, () => {
    let row = 0;
    for (let y = y0; y <= y1; y += 1.25, row++) {
      for (let x = x0 + (row % 2) * 0.7; x <= x1; x += 1.4) {
        d.pen.hair([pt(x - 0.6, y - 0.2), pt(x - 0.3, y + 0.35), pt(x + 0.3, y + 0.35), pt(x + 0.6, y - 0.2)], 0.26, d.ink, 0.55);
      }
    }
  });
}

/** A boot from the ankle at (x, top) down to the ground, the toe `len` forward. */
export function boot(d: Draw, x: number, top: number, len: number, color: string = CROWN.boot): void {
  const shape = [pt(x - 2.6, top), pt(x + 2.3, top - 0.2), pt(x + 2.7, -3.4), pt(x + len - 2, -2.8), pt(x + len - 0.2, -1.6), pt(x + len, 0), pt(x - 3, 0), pt(x - 3.1, -2.6)];
  part(d, shape, color, { shadow: 0.55, line: 0.65 });
  // The cuff turned down, and the sole.
  d.pen.hair([pt(x - 2.7, top + 1.6), pt(x + 2.4, top + 1.4)], 0.4, d.ink, 0.7);
  d.pen.stroke([pt(x - 3, -0.3), pt(x + len - 0.2, -0.3)], 0.9, d.ink, 0.9, false);
  gleam(d, [pt(x + 2.8, -2.8), pt(x + len - 2.2, -2.3)], 0.45, 0.6);
}

/** A gloved fist at c, knuckles towards `dir` (radians). */
export function fist(d: Draw, c: Pt, r: number, color: string = CROWN.leather, dir = 0): void {
  const ux = Math.cos(dir);
  const uy = Math.sin(dir);
  part(d, oval(c.x, c.y, r * 1.05, r * 0.92, 14), color, { shadow: 0.45, hatch: 0, line: 0.55 });
  // The knuckles' ridge and the thumb wrapped over.
  d.pen.hair([pt(c.x + ux * r * 0.55 - uy * r * 0.6, c.y + uy * r * 0.55 + ux * r * 0.6), pt(c.x + ux * r * 0.6 + uy * r * 0.6, c.y + uy * r * 0.6 - ux * r * 0.6)], 0.35, d.ink, 0.7);
  d.pen.hair([pt(c.x - ux * r * 0.2 - uy * r * 0.3, c.y - uy * r * 0.2 + ux * r * 0.3), pt(c.x + ux * r * 0.4 - uy * r * 0.1, c.y + uy * r * 0.4 + ux * r * 0.1)], 0.3, d.ink, 0.6);
}

export interface HeadOpts {
  /** Stubble on the jaw. */
  readonly stubble?: boolean;
  /** A full beard (its colour). */
  readonly beard?: string;
  /** Hair at the back of the head (its colour); none for a shaven or hooded head. */
  readonly hair?: string;
  /** Size: 1 is about 9 wide and 11 tall. */
  readonly scale?: number;
}

/** The head in profile, facing right, centred on c: about 9 wide and 11 tall at scale 1. */
export function headShape(c: Pt, s = 1): Pt[] {
  const p = (x: number, y: number): Pt => pt(c.x + x * s, c.y + y * s);
  return [p(-2.6, 5.2), p(-4.1, 2), p(-4.6, -1.6), p(-3.4, -4.6), p(-0.5, -6), p(2.6, -5.2), p(4.1, -3.2), p(4.5, -1.3), p(4.3, -0.5), p(5.8, 1.4), p(4.7, 2.1), p(4.9, 2.9), p(4.6, 3.4), p(4.7, 4.1), p(4, 5.3), p(2.2, 5.9), p(0.3, 5.5)];
}

/**
 * A face: the skin painted with a warm light, an ear, a dark eye under a
 * firm brow, the nostril and mouth, a ruddy cheek; stubble or a beard.
 * The helmet or hood is drawn over it by the caller.
 */
export function head(d: Draw, c: Pt, o: HeadOpts = {}): void {
  const s = o.scale ?? 1;
  const shape = headShape(c, s);
  const p = (x: number, y: number): Pt => pt(c.x + x * s, c.y + y * s);
  const ov = (x: number, y: number, rx: number, ry: number): Pt[] => oval(c.x + x * s, c.y + y * s, rx * s, ry * s, 12);
  part(d, shape, CROWN.skin, { shadow: 0.55, line: 0.6, hatch: 0.12 });
  d.pen.clipped(shape, () => {
    dab(d, ov(2.4, 2.2, 1.6, 1.1), '#d0644a', 0.24, 0.8);
    if (o.hair) part(d, [p(-5, -2.6), p(-1.2, -3.4), p(-1.6, 0.4), p(-2.6, 3.6), p(-5, 4)], o.hair, { shadow: 0.45, hatch: 0, line: 0 });
    if (o.stubble) d.pen.stipple(shape, 80, (x, y) => (y > c.y + 2.2 * s && x > c.x - 1.5 * s ? 0.85 : 0), 0.22, mix(CROWN.hair, SHADOW, 0.3));
  });
  if (o.beard) {
    const beard = [p(-0.6, 1.4), p(1.4, 2.6), p(3.4, 2.4), p(5.1, 2.9), p(5.2, 4.6), p(4.4, 7), p(2.4, 8.4), p(0.4, 7.2), p(-1.6, 4.4)];
    part(d, beard, o.beard, { shadow: 0.5, line: 0.5, hatch: 0 });
    for (const [x0, x1] of [[0.6, 1.4], [2, 2.6], [3.4, 3.8]] as const) d.pen.hair([p(x0, 4), p(x1, 7.2)], 0.25, mix(o.beard, SHADOW, 0.5), 0.7);
  }
  // Ear.
  part(d, ov(-1, 0.6, 1.15, 1.75), CROWN.skin, { shadow: 0.4, hatch: 0, line: 0.45 });
  d.pen.hair([p(-1.2, -0.3), p(-0.6, 0.5), p(-1, 1.4)], 0.28, CROWN.skinShade, 0.9);
  // Brow, eye socket shadow, eye with its glint.
  dab(d, ov(2.9, -0.5, 1.6, 1), CROWN.skinShade, 0.45, 0.4);
  d.pen.stroke([p(1.6, -1.6), p(3, -1.9), p(4.4, -1.4)], 0.7 * s, d.ink, 0.9, false);
  const eye = p(3.1, -0.45);
  d.pen.dot(eye.x, eye.y, 0.62 * s, d.ink, 1);
  d.pen.dot(eye.x + 0.2 * s, eye.y - 0.2 * s, 0.2 * s, PAPER_FILL, 0.9);
  d.pen.hair([p(4.6, 1.8), p(4.1, 1.7)], 0.35, d.ink, 0.8);
  d.pen.hair([p(4.6, 3.2), p(3.6, 3.3)], 0.4, mix(CROWN.skinShade, SHADOW, 0.3), 0.85);
  // The jaw's shadow on the neck.
  d.pen.hair(bezier(p(-1.6, 3.6), p(0.2, 5.4), p(3.4, 5.6), 6), 0.35, CROWN.skinShade, 0.7);
}

/** A shadow cast by `shape` (moved away from the light by `by`) onto whatever `clip` is. */
export function cast(d: Draw, clip: readonly Pt[], shape: readonly Pt[], by: number, alpha = 0.32): void {
  d.pen.clipped(clip, () => dab(d, shape.map((p) => pt(p.x + by * 0.55, p.y + by * 0.84)), SHADOW, alpha, 0.7));
}

/** Leather wraps (cross-garters) round a shin from `a` (knee) down to `b`. */
export function wraps(d: Draw, a: Pt, b: Pt, w: number, n: number, color: string = CROWN.leatherDark): void {
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const c = pt(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
    const k = i % 2 ? 1 : -1;
    d.pen.hair([pt(c.x - w / 2, c.y - k * 0.9), pt(c.x + w / 2, c.y + k * 0.9)], 0.5, color, 0.85);
  }
}

/** A neck from the shoulders up into the head (drawn before the head). */
export function neck(d: Draw, c: Pt, w = 4.4): void {
  part(d, roundRect(c.x - w / 2, c.y - 3, c.x + w / 2, c.y + 4, 1.4), CROWN.skin, { shadow: 0.6, hatch: 0.1, line: 0.5 });
}

/** A hard highlight streak along steel, and a soft reflected one on the shadow side. */
export function shine(d: Draw, lit: readonly Pt[], w = 0.7, reflected?: readonly Pt[]): void {
  gleam(d, lit, w, 0.9);
  if (reflected) d.pen.stroke(reflected, w * 0.7, mix(CROWN.steel, '#ffffff', 0.3), 0.4, false);
}

export { closed, cub, oval, pt };
