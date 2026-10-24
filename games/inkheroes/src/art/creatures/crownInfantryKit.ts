import { bezier, closed, cub, oval, pt, ribbon, type Draw } from '../kit';
import type { Pt } from '../pen';
import { mix } from '../wash';
import { dab, gleam, IVORY, paint, SHADOW, type PaintOpts } from './crownInfantryPaint';

/**
 * The Crown infantry's shared kit: their colours (dark steel, deep
 * ultramarine cloth, umber leather, old brass) and the body parts every one
 * of them is built from, drawn facing right in a 3/4 view with the light
 * from the upper left: muscled limbs, boots, fists, a stern head in profile,
 * quilting, mail and trim. The men are drawn about seven heads tall.
 */
export const CROWN = {
  blue: '#24396e',
  blueDeep: '#172650',
  blueLight: '#3b5592',
  gold: '#8a6420',
  goldLight: '#c49a3e',
  glint: '#f0cf78',
  steel: '#6a707b',
  steelDark: '#464a53',
  iron: '#2f3238',
  leather: '#5a3d24',
  leatherDark: '#3a2616',
  hide: '#6f4e30',
  linen: '#a89878',
  wood: '#5e4026',
  woodDark: '#3b2716',
  skin: '#a87454',
  skinShade: '#6a4030',
  hair: '#2e1f14',
  hose: '#2c3040',
  boot: '#3a2717',
  holy: '#f3dc9a',
} as const;

/** Darkened for the far side of the figure (the far leg and arm). */
export const far = (color: string): string => mix(color, SHADOW, 0.32);

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

/**
 * A bent limb from a through the joint k to b, as one closed shape: its
 * width easing w0 → wk → w1, swelling to `m0` a quarter of the way down
 * (the thigh, the biceps) and to `m1` just past the joint (the calf, the
 * forearm's muscle) when they are given.
 */
export function limb(a: Pt, k: Pt, b: Pt, w0: number, wk: number, w1: number, m0?: number, m1?: number): Pt[] {
  const n = 7;
  const spine = [...seg(a, k, n), ...seg(k, b, n).slice(1)];
  const stops: [number, number][] = [[0, w0], [0.25, m0 ?? (w0 + wk) / 2], [0.5, wk], [0.68, m1 ?? wk + (w1 - wk) * 0.36], [1, w1]];
  const width = (u: number): number => {
    for (let i = 1; i < stops.length; i++) {
      const [u0, v0] = stops[i - 1]!;
      const [u1, v1] = stops[i]!;
      if (u <= u1) {
        const e = (u - u0) / (u1 - u0);
        return v0 + (v1 - v0) * (e * e * (3 - 2 * e));
      }
    }
    return w1;
  };
  return ribbon(spine, width).shape;
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
    d.pen.dot(p.x - r * 0.25, p.y - r * 0.3, r * 0.34, IVORY, 0.85);
  }
}

/** A seam: a fine dark line with a lit line just under it, as a joint catches the light. */
export function seam(d: Draw, pts: readonly Pt[], w = 0.35, alpha = 0.75): void {
  d.pen.hair(pts, w, d.ink, alpha);
  d.pen.hair(pts.map((p) => pt(p.x + 0.15, p.y + w * 1.1)), w * 0.7, IVORY, 0.3);
}

/** A strip of ochre-gold trim along a line: a hem, a collar, a shield's rim. */
export function trim(d: Draw, pts: readonly Pt[], w: number, color: string = CROWN.gold): void {
  const strip = ribbon(pts, () => w).shape;
  paint(d, strip, color, { alpha: 0.95, shadow: 0.45, hatch: 0, line: 0.4, gloss: true });
  gleam(d, pts.map((p) => pt(p.x - 0.2, p.y - w * 0.18)), Math.max(0.25, w * 0.18), 0.45);
}

/**
 * Quilting (a gambeson's padded channels): seams along each line in `rows`,
 * each puff lit just after its seam and shaded just before the next one.
 */
export function quilt(d: Draw, clip: readonly Pt[], rows: readonly (readonly Pt[])[], color: string): void {
  const dark = mix(color, SHADOW, 0.55);
  d.pen.clipped(clip, () => {
    for (const r of rows) {
      dab(d, ribbon(r.map((p) => pt(p.x - 0.7, p.y)), () => 1.3).shape, dark, 0.45, 0.5);
      d.pen.hair(r, 0.3, dark, 0.9);
      dab(d, ribbon(r.map((p) => pt(p.x + 0.9, p.y)), () => 0.9).shape, mix(color, '#f3d6a2', 0.3), 0.3, 0.4);
    }
  });
}

/** Chain mail: staggered rows of small rings, darkening down the shadow side. */
export function mail(d: Draw, clip: readonly Pt[], x0: number, x1: number, y0: number, y1: number): void {
  d.pen.clipped(clip, () => {
    let row = 0;
    for (let y = y0; y <= y1; y += 1.25, row++) {
      for (let x = x0 + (row % 2) * 0.7; x <= x1; x += 1.4) {
        d.pen.hair([pt(x - 0.6, y - 0.2), pt(x - 0.3, y + 0.35), pt(x + 0.3, y + 0.35), pt(x + 0.6, y - 0.2)], 0.24, d.ink, 0.7);
        if ((row + Math.round(x)) % 3 === 0) d.pen.dot(x - 0.25, y - 0.15, 0.16, IVORY, 0.35);
      }
    }
  });
}

/** A boot from (x, top) down to the ground, the toe `len` forward: soft umber leather, a turned cuff, a heavy sole. */
export function boot(d: Draw, x: number, top: number, len: number, color: string = CROWN.boot): void {
  const shape = [pt(x - 2.4, top), pt(x + 2.2, top - 0.2), pt(x + 2.5, -4.2), pt(x + len - 2.4, -3), pt(x + len - 0.3, -1.6), pt(x + len, 0), pt(x - 2.9, 0), pt(x - 3.1, -3.2)];
  part(d, shape, color, { shadow: 0.6, line: 0.6 });
  // The cuff turned down, the creases at the ankle and the sole.
  part(d, [pt(x - 2.7, top - 0.3), pt(x + 2.5, top - 0.5), pt(x + 2.6, top + 2), pt(x - 2.8, top + 2.2)], mix(color, CROWN.leather, 0.4), { shadow: 0.4, hatch: 0, line: 0.45 });
  d.pen.hair([pt(x - 1.6, -5.4), pt(x + 1.8, -5.8)], 0.25, d.ink, 0.5);
  d.pen.stroke([pt(x - 3, -0.4), pt(x + len - 0.2, -0.4)], 0.75, mix(d.ink, SHADOW, 0.4), 0.95, false);
  gleam(d, [pt(x + 2.8, -3.6), pt(x + len - 2.4, -2.6)], 0.35, 0.4);
}

/** A gloved fist at c, knuckles towards `dir` (radians). */
export function fist(d: Draw, c: Pt, r: number, color: string = CROWN.leather, dir = 0): void {
  const ux = Math.cos(dir);
  const uy = Math.sin(dir);
  part(d, oval(c.x, c.y, r * 1.05, r * 0.9, 14), color, { shadow: 0.55, hatch: 0, line: 0.55 });
  // The knuckles' ridge and the thumb wrapped over.
  d.pen.hair([pt(c.x + ux * r * 0.55 - uy * r * 0.6, c.y + uy * r * 0.55 + ux * r * 0.6), pt(c.x + ux * r * 0.6 + uy * r * 0.6, c.y + uy * r * 0.6 - ux * r * 0.6)], 0.25, d.ink, 0.7);
  d.pen.hair([pt(c.x - ux * r * 0.2 - uy * r * 0.3, c.y - uy * r * 0.2 + ux * r * 0.3), pt(c.x + ux * r * 0.4 - uy * r * 0.1, c.y + uy * r * 0.4 + ux * r * 0.1)], 0.22, d.ink, 0.6);
  gleam(d, [pt(c.x - r * 0.6, c.y - r * 0.4), pt(c.x - r * 0.1, c.y - r * 0.75)], 0.3, 0.35);
}

export interface HeadOpts {
  /** Stubble on the jaw. */
  readonly stubble?: boolean;
  /** A full beard (its colour). */
  readonly beard?: string;
  /** Hair at the back of the head (its colour); none for a shaven or hooded head. */
  readonly hair?: string;
  /** Size: 1 is about 9 wide and 12 tall. */
  readonly scale?: number;
}

/** A grown man's head in profile, facing right, centred on c: about 9 wide and 12 tall at scale 1. */
export function headShape(c: Pt, s = 1): Pt[] {
  const p = (x: number, y: number): Pt => pt(c.x + x * s, c.y + y * s);
  return [
    p(-2.8, 4.8), p(-4.2, 2.4), p(-4.6, -1.2), p(-3.9, -4.3), p(-1.4, -6), p(1.8, -5.9), p(3.6, -4.5),
    // Forehead, the brow ridge, the bridge, a strong nose.
    p(4.2, -2.6), p(4.4, -1.6), p(4.1, -0.9), p(4.9, 0.7), p(5.6, 2), p(4.8, 2.4),
    // Lips, chin, the jaw's line back to its angle under the ear.
    p(4.7, 3), p(4.4, 3.5), p(4.6, 4), p(4.4, 5.2), p(3.6, 6), p(1.6, 6), p(-0.2, 5), p(-1.2, 3.8),
  ];
}

/**
 * A stern face: weathered skin under a warm light, an ear, a deep-set eye
 * in the brow's shadow, the hollow under the cheekbone, a set mouth and a
 * hard jaw; stubble or a beard. The helmet or hood is drawn over it by the caller.
 */
export function head(d: Draw, c: Pt, o: HeadOpts = {}): void {
  const s = o.scale ?? 1;
  const shape = headShape(c, s);
  const p = (x: number, y: number): Pt => pt(c.x + x * s, c.y + y * s);
  const ov = (x: number, y: number, rx: number, ry: number): Pt[] => oval(c.x + x * s, c.y + y * s, rx * s, ry * s, 12);
  const deep = mix(CROWN.skinShade, SHADOW, 0.45);
  part(d, shape, CROWN.skin, { shadow: 0.65, line: 0.6, hatch: 0.14 });
  d.pen.clipped(shape, () => {
    // The hollow under the cheekbone, a weathered flush, the brow's shadow over the socket.
    dab(d, ov(2, 2.4, 2, 1.3), CROWN.skinShade, 0.4, 0.7);
    dab(d, ov(2.8, 1, 1.4, 0.8), '#8a3e2c', 0.18, 0.7);
    dab(d, ov(2.9, -0.7, 1.7, 1.1), deep, 0.75, 0.45);
    if (o.hair) part(d, [p(-5, -3.2), p(-1.4, -4.2), p(-1.6, 0.2), p(-2.6, 3.8), p(-5, 4)], o.hair, { shadow: 0.5, hatch: 0, line: 0 });
    if (o.stubble) d.pen.stipple(shape, 90, (x, y) => (y > c.y + 2.2 * s && x > c.x - 1.5 * s ? 0.85 : 0), 0.2, mix(CROWN.hair, SHADOW, 0.3));
  });
  if (o.beard) {
    const beard = [p(-0.8, 1.2), p(1.4, 2.4), p(3.4, 2.6), p(4.9, 2.8), p(5.2, 4.6), p(4.6, 7.2), p(2.6, 8.8), p(0.4, 7.6), p(-1.6, 4.4)];
    part(d, beard, o.beard, { shadow: 0.6, line: 0.5, hatch: 0.1 });
    for (const [x0, x1] of [[0.4, 1.2], [1.8, 2.4], [3.2, 3.6], [4.2, 4.4]] as const) d.pen.hair([p(x0, 3.8), p(x1, 7.6)], 0.2, mix(o.beard, SHADOW, 0.55), 0.75);
    d.pen.hair([p(4.6, 3.1), p(3.4, 3.3)], 0.3, mix(o.beard, SHADOW, 0.6), 0.9);
  }
  // Ear.
  part(d, ov(-1, 0.6, 1.1, 1.7), CROWN.skin, { shadow: 0.5, hatch: 0, line: 0.45 });
  d.pen.hair([p(-1.2, -0.3), p(-0.6, 0.5), p(-1, 1.4)], 0.22, deep, 0.9);
  // A heavy brow, the deep-set eye under it (no glint: it sits in shadow), the nostril and a set mouth.
  d.pen.stroke([p(1.6, -1.9), p(3, -2.2), p(4.3, -1.7)], 0.5 * s, d.ink, 0.9, false);
  d.pen.hair([p(2.5, -0.55), p(3.1, -0.75), p(3.6, -0.6)], 0.42 * s, mix(d.ink, SHADOW, 0.5), 1);
  d.pen.hair([p(2.6, -0.1), p(3.4, -0.2)], 0.2, deep, 0.6);
  d.pen.hair([p(4.4, 1.4), p(4.5, 2.1), p(5, 2.25)], 0.24, deep, 0.9);
  d.pen.hair([p(4.1, 1.9), p(3.4, 3.1)], 0.2, deep, 0.55);
  if (!o.beard) d.pen.hair([p(4.6, 3.45), p(3.7, 3.55)], 0.3, deep, 0.9);
  // The lit plane of the brow and the nose's ridge, and the jaw's shadow on the neck.
  gleam(d, [p(3.4, -4.4), p(4.1, -2.8)], 0.3, 0.35);
  gleam(d, [p(4.4, -0.4), p(5.1, 1.2)], 0.25, 0.35);
  d.pen.hair(bezier(p(-1.4, 3.8), p(0.2, 5.6), p(3.4, 6), 6), 0.28, deep, 0.7);
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
    d.pen.hair([pt(c.x - w / 2, c.y - k * 0.9), pt(c.x + w / 2, c.y + k * 0.9)], 0.42, color, 0.9);
  }
}

/** A neck from the shoulders up into the head (drawn before the head): thick, the jaw's shade across its top. */
export function neck(d: Draw, c: Pt, w = 4.6): void {
  const shape = roundRect(c.x - w / 2, c.y - 4, c.x + w / 2, c.y + 4, 1.4);
  part(d, shape, CROWN.skin, { shadow: 0.7, hatch: 0.12, line: 0.5 });
  d.pen.clipped(shape, () => dab(d, [pt(c.x - w, c.y - 5), pt(c.x + w, c.y - 5), pt(c.x + w, c.y - 1.6), pt(c.x - w, c.y - 0.6)], SHADOW, 0.45, 0.6));
}

/** A hard highlight streak along steel, and a soft reflected one on the shadow side. */
export function shine(d: Draw, lit: readonly Pt[], w = 0.7, reflected?: readonly Pt[]): void {
  gleam(d, lit, w, 0.95);
  if (reflected) d.pen.stroke(reflected, w * 0.6, mix(CROWN.steel, '#c8a27a', 0.35), 0.4, false);
}

export { closed, cub, oval, pt };
