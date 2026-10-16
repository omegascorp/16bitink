import { INK, type Pen, type Pt } from '../../../src/art/pen';

/**
 * Ink-painting technique for the figures, after the game's fish: shapes
 * laid in with a textured wash, shadow sides cross-hatched, and outlines
 * in tapering strokes, heavier on the shadow side than on the lit one.
 */

/** A smooth outline through quadratic segments: start, then [control, end] pairs. */
export function path(start: Pt, ...segments: readonly (readonly [Pt, Pt])[]): Pt[] {
  const out: Pt[] = [start];
  let from = start;
  for (const [c, to] of segments) {
    for (let i = 1; i <= 8; i++) {
      const u = i / 8;
      out.push({ x: (1 - u) ** 2 * from.x + 2 * u * (1 - u) * c.x + u * u * to.x, y: (1 - u) ** 2 * from.y + 2 * u * (1 - u) * c.y + u * u * to.y });
    }
    from = to;
  }
  return out;
}

/** The outline of a limb or a finger along `spine`, `r0` thick at its root to `r1` at its rounded end. */
export function tube(spine: readonly Pt[], r0: number, r1: number): Pt[] {
  const n = spine.length;
  const angle = (i: number): number => {
    const a = spine[Math.max(0, i - 1)]!;
    const b = spine[Math.min(n - 1, i + 1)]!;
    return Math.atan2(b.y - a.y, b.x - a.x);
  };
  const side = (s: number): Pt[] =>
    spine.map((p, i) => {
      const r = r0 + ((r1 - r0) * i) / (n - 1);
      return { x: p.x - s * Math.sin(angle(i)) * r, y: p.y + s * Math.cos(angle(i)) * r };
    });
  const end = spine[n - 1]!;
  const a = angle(n - 1);
  const cap = Array.from({ length: 7 }, (_, k) => {
    const t = a + Math.PI / 2 - (Math.PI * (k + 1)) / 8;
    return { x: end.x + Math.cos(t) * r1, y: end.y + Math.sin(t) * r1 };
  });
  return [...side(1), ...cap, ...side(-1).reverse()];
}

/** One side of a tube (1 or -1), for weighting its outline. */
export function tubeSide(spine: readonly Pt[], r0: number, r1: number, s: number): Pt[] {
  const n = spine.length;
  return spine.map((p, i) => {
    const a = spine[Math.max(0, i - 1)]!;
    const b = spine[Math.min(n - 1, i + 1)]!;
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const r = r0 + ((r1 - r0) * i) / (n - 1);
    return { x: p.x - s * Math.sin(ang) * r, y: p.y + s * Math.cos(ang) * r };
  });
}

/** A wash of colour with a little grain in it, and a darker glaze over part of it (`glaze`, optional). */
export function wash(pen: Pen, shape: readonly Pt[], colour: string, grain: string, glaze?: { readonly region: readonly Pt[]; readonly colour: string; readonly alpha: number }): void {
  pen.fill(shape, colour, 0.95);
  pen.stipple(shape, 260 + shape.length * 4, () => 0.35, 0.7, grain);
  if (glaze) pen.clipped(shape, () => pen.fill(glaze.region, glaze.colour, glaze.alpha));
}

/** Cross-hatching over the part of `shape` inside `region`: one pass, and a lighter second across it where it's darkest. */
export function shade(pen: Pen, shape: readonly Pt[], region: readonly Pt[], spacing: number, angle = 0.8, alpha = 0.55, deep?: readonly Pt[]): void {
  pen.clipped(shape, () => {
    pen.hatch(region, spacing, angle, 0.9, { alpha });
    if (deep) pen.hatch(deep, spacing * 1.15, angle - 1.35, 0.8, { alpha: alpha * 0.85 });
  });
}

/** A closed outline in two tapering strokes: the first `split` of it `first` wide, the rest `rest` (heavier on the shadow side). */
export function contour(pen: Pen, shape: readonly Pt[], first: number, rest: number, split = 0.5): void {
  const cut = Math.max(2, Math.round(shape.length * split));
  pen.stroke(shape.slice(0, cut + 1), first, INK);
  pen.stroke([...shape.slice(cut), shape[0]!], rest, INK);
}

/** A band between two lines, as a closed shape (for hatching a strip). */
export const band = (a: readonly Pt[], b: readonly Pt[]): Pt[] => [...a, ...[...b].reverse()];

/** A line moved by (dx, dy). */
export const shifted = (pts: readonly Pt[], dx: number, dy: number): Pt[] => pts.map((p) => ({ x: p.x + dx, y: p.y + dy }));
