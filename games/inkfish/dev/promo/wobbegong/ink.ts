import { makeCanvas, Pen, type Pt } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { createRng, type Rng } from '../../../src/logic/rng';

/**
 * The short's pen kit: art baked once per boil frame over a box of the
 * world (mm) at a resolution (px per mm), a pen for the live parts that
 * boils with them, and smooth curves.
 */

/** A box of the world, mm, baked at `res` px per mm. */
export interface Box {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
  readonly res: number;
}

/** A baked layer: one canvas per boil frame covering its box. */
export interface Baked {
  readonly box: Box;
  readonly frames: readonly HTMLCanvasElement[];
}

/**
 * Bakes `draw` (in world mm) once per boil frame: the same shapes every
 * time (its rng restarts from `seed`), a different wobble of the pen.
 * Baking the same `draw` over two boxes gives the same picture at two
 * resolutions.
 */
export function bake(box: Box, seed: number, wobble: number, draw: (pen: Pen, ctx: CanvasRenderingContext2D, rng: Rng) => void): Baked {
  const frames = Array.from({ length: BOIL_FRAMES }, (_, f) => {
    const { canvas, ctx } = makeCanvas(Math.ceil((box.x1 - box.x0) * box.res), Math.ceil((box.y1 - box.y0) * box.res));
    ctx.scale(box.res, box.res);
    ctx.translate(-box.x0, -box.y0);
    draw(new Pen(ctx, seed * 31 + f * 977, wobble), ctx, createRng(seed));
    return canvas;
  });
  return { box, frames };
}

/** Draws a baked layer where it belongs in the world (the ctx already in world mm). */
export function drawBaked(ctx: CanvasRenderingContext2D, layer: Baked, boil: number, alpha = 1): void {
  if (alpha <= 0.003) return;
  const { box } = layer;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(layer.frames[boil % layer.frames.length]!, box.x0, box.y0, box.x1 - box.x0, box.y1 - box.y0);
  ctx.restore();
}

/** A pen for something drawn live, every frame: it wobbles with the boil, steady between its steps. */
export const livePen = (ctx: CanvasRenderingContext2D, seed: number, boil: number, wobble = 1): Pen => new Pen(ctx, seed * 31 + (boil % BOIL_FRAMES) * 977, wobble);

/** Points round an ellipse arc from `a0` to `a1` (radians, y down). */
export function arc(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n = 32): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n;
    return { x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry };
  });
}

/** A closed rounded rectangle as points. */
export function roundRect(x: number, y: number, w: number, h: number, r: number): Pt[] {
  return [
    ...arc(x + w - r, y + r, r, r, -Math.PI / 2, 0, 6),
    ...arc(x + w - r, y + h - r, r, r, 0, Math.PI / 2, 6),
    ...arc(x + r, y + h - r, r, r, Math.PI / 2, Math.PI, 6),
    ...arc(x + r, y + r, r, r, Math.PI, Math.PI * 1.5, 6),
  ];
}

function catmull(p0: Pt, p1: Pt, p2: Pt, p3: Pt, u: number): Pt {
  const u2 = u * u;
  const u3 = u2 * u;
  const f = (a: number, b: number, c: number, d: number): number => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3);
  return { x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) };
}

/** A smooth closed curve through points (Catmull-Rom), `per` points a span. */
export function smoothClosed(pts: readonly Pt[], per = 4): Pt[] {
  const n = pts.length;
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < per; k++) out.push(catmull(pts[(i - 1 + n) % n]!, pts[i]!, pts[(i + 1) % n]!, pts[(i + 2) % n]!, k / per));
  }
  return out;
}

/** A smooth open curve through points (Catmull-Rom). */
export function smoothOpen(pts: readonly Pt[], per = 4): Pt[] {
  const n = pts.length;
  const out: Pt[] = [];
  for (let i = 0; i < n - 1; i++) {
    for (let k = 0; k < per; k++) out.push(catmull(pts[Math.max(0, i - 1)]!, pts[i]!, pts[i + 1]!, pts[Math.min(n - 1, i + 2)]!, k / per));
  }
  out.push(pts[n - 1]!);
  return out;
}

/** An irregular blob round (x, y): `n` points at radius r, each pushed in or out by up to `rough`. */
export function blob(rng: Rng, x: number, y: number, rx: number, ry: number, rough: number, n = 9, turn = 0): Pt[] {
  const c = Math.cos(turn);
  const s = Math.sin(turn);
  return smoothClosed(
    Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2;
      const k = 1 + (rng() - 0.5) * 2 * rough;
      const px = Math.cos(a) * rx * k;
      const py = Math.sin(a) * ry * k;
      return { x: x + px * c - py * s, y: y + px * s + py * c };
    }),
    3,
  );
}

/** Keeps the part of a convex polygon on p's side of the line halfway between p and q. */
function clipHalf(poly: readonly Pt[], p: Pt, q: Pt): Pt[] {
  const m = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
  const d = { x: q.x - p.x, y: q.y - p.y };
  const side = (v: Pt): number => (v.x - m.x) * d.x + (v.y - m.y) * d.y;
  const out: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    const sa = side(a);
    const sb = side(b);
    if (sa <= 0) out.push(a);
    if (sa * sb < 0) {
      const f = sa / (sa - sb);
      out.push({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f });
    }
  }
  return out;
}

/** A Voronoi cell of the plane: its seed and its outline. */
export interface Cell {
  readonly at: Pt;
  readonly poly: readonly Pt[];
}

/**
 * Cells tiling a box, about `size` across, from jittered seeds: a net of
 * polygons like the wobbegong's reticulated skin.
 */
export function cellsIn(rng: Rng, x0: number, y0: number, x1: number, y1: number, size: number): Cell[] {
  const cols = Math.ceil((x1 - x0) / size) + 2;
  const rows = Math.ceil((y1 - y0) / size) + 2;
  const seeds: Pt[][] = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => ({ x: x0 + (c - 1 + 0.15 + rng() * 0.7) * size, y: y0 + (r - 1 + 0.15 + rng() * 0.7) * size })));
  const cells: Cell[] = [];
  for (let r = 1; r < rows - 1; r++) {
    for (let c = 1; c < cols - 1; c++) {
      const p = seeds[r]![c]!;
      let poly: Pt[] = [{ x: p.x - size * 2, y: p.y - size * 2 }, { x: p.x + size * 2, y: p.y - size * 2 }, { x: p.x + size * 2, y: p.y + size * 2 }, { x: p.x - size * 2, y: p.y + size * 2 }];
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const q = seeds[r + dr]?.[c + dc];
          if (q && q !== p) poly = clipHalf(poly, p, q);
        }
      }
      cells.push({ at: p, poly });
    }
  }
  return cells;
}

/** A polygon pulled in towards a point by `by` mm (a cell inside its net line). */
export function shrink(poly: readonly Pt[], to: Pt, by: number): Pt[] {
  return poly.map((v) => {
    const d = Math.hypot(v.x - to.x, v.y - to.y) || 1;
    const k = Math.max(0, d - by) / d;
    return { x: to.x + (v.x - to.x) * k, y: to.y + (v.y - to.y) * k };
  });
}

/** Whether p is inside a closed polygon. */
export function inside(poly: readonly Pt[], p: Pt): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) hit = !hit;
  }
  return hit;
}

/** "r,g,b" of a hex colour. */
export function rgbOf(hex: string): string {
  const v = parseInt(hex.slice(1), 16);
  return `${(v >> 16) & 255},${(v >> 8) & 255},${v & 255}`;
}
