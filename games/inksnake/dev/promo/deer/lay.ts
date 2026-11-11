import { SNAKE_W } from '../../../src/art/types';
import { lengths } from '../pythonbear/python';
import { edges, type Lay, strokeLine, type Strips } from '../cobra/lay';
import { drawBody, drawBodyShadow, type Pt } from '../sprites';
import { BURM } from './burmeseArt';

/**
 * The python laid out: a straight-ish body with a lump, and a coiled pile
 * (turns drawn outer first, each inner turn lying on top). Edges are inked
 * along both sides without end caps, so a coil's turns join cleanly.
 */
export function drawSeg(ctx: CanvasRenderingContext2D, strips: Strips, boil: number, l: Lay, shadow = 1): void {
  if (l.spine.length < 2) return;
  const pose = { spine: l.spine, widths: l.widths, along: l.base / SNAKE_W, offset: l.offset };
  if (shadow > 0) drawBodyShadow(ctx, pose, l.base, shadow);
  drawBody(ctx, l.headRight ? strips.right : strips.left, boil, pose);
  const { a, b } = edges(l, 0.985);
  const w = Math.max(2.2, l.base * 0.028);
  strokeLine(ctx, a, w, BURM.line);
  strokeLine(ctx, b, w, BURM.line);
}

/** A body with its tail tapering off and its own width per point; the tail's tip capped. */
export function drawSnake(ctx: CanvasRenderingContext2D, strips: Strips, boil: number, l: Lay, shadow = 1): void {
  drawSeg(ctx, strips, boil, l, shadow);
  const { a, b } = edges(l, 0.985);
  const n = a.length - 1;
  strokeLine(ctx, [a[n]!, l.spine[n]!, b[n]!], Math.max(2.2, l.base * 0.028), BURM.line);
}

/** The body's width share at u (0 head .. 1 tail): the neck a touch narrower, the tail tapering to a point. */
export function bodyShare(u: number): number {
  const neck = u < 0.06 ? 0.82 + 0.18 * (u / 0.06) : 1;
  if (u <= 0.72) return neck;
  const x = (u - 0.72) / 0.28;
  return 1 - 0.9 * x * x * (3 - 2 * x);
}

/** A lump `size` wide (share of the base) centred `at` of the way along, `len` of the length long. */
export function lumpShare(u: number, at: number, len: number, size: number): number {
  const v = (u - (at - len / 2)) / len;
  if (v <= 0 || v >= 1) return 0;
  return (size - 1) * Math.sin(v * Math.PI) ** 0.7;
}

export interface Coil {
  readonly turns: readonly Lay[];
  /** The head's lay (the innermost turn), for drawHeadOn. */
  readonly head: Lay;
}

/**
 * A coiled pile seen a little from above: a spiral of `turns` turns from the
 * tail on the outside in to the head on top, `flat` its squash, each turn
 * raised a little over the one outside it.
 */
export function coilOf(c: Pt, outer: number, inner: number, turns: number, base: number, flat = 0.42, start = 0, headRight = true): Coil {
  const total = turns * Math.PI * 2;
  const n = Math.ceil(turns * 90);
  // Head first: from the inner end out to the tail.
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const th = total * (1 - i / n);
    const k = th / total;
    const r = outer + (inner - outer) * k;
    const a = th + start;
    pts.push({ x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r * flat - k * base * 0.9 });
  }
  const s = lengths(pts);
  const len = s[s.length - 1]!;
  const widths = s.map((d) => base * bodyShare(d / len));
  const per = Math.ceil(n / turns);
  const out: Lay[] = [];
  for (let from = n; from > 0; from -= per) {
    const lo = Math.max(0, from - per);
    out.push({ spine: pts.slice(lo, from + 1), widths: widths.slice(lo, from + 1), base, headRight, offset: s[lo]! / (base / SNAKE_W) });
  }
  return { turns: out, head: { spine: pts.slice(0, per + 1), widths: widths.slice(0, per + 1), base, headRight } };
}

export function drawCoil(ctx: CanvasRenderingContext2D, strips: Strips, boil: number, coil: Coil, shadow = 0.8): void {
  coil.turns.forEach((l, i) => drawSeg(ctx, strips, boil, l, i === 0 ? shadow : 0.35));
}
