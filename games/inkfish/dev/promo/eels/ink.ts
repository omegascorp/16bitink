import { makeCanvas, Pen, type Pt } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { createRng } from '../../../src/logic/rng';

/**
 * The short's own inked things, drawn with the game's pen: a prop is drawn
 * once per boil frame (the same shape each time, a different wobble), and
 * small marks drawn live take a pen seeded by the boil frame, so they boil
 * along with everything else.
 */

export interface Prop {
  readonly frames: readonly HTMLCanvasElement[];
  readonly w: number;
  readonly h: number;
}

export function prop(w: number, h: number, seed: number, draw: (pen: Pen, ctx: CanvasRenderingContext2D, rng: () => number) => void): Prop {
  const frames = Array.from({ length: BOIL_FRAMES }, (_, f) => {
    const { canvas, ctx } = makeCanvas(w, h);
    draw(new Pen(ctx, seed * 31 + f * 977, 1.4), ctx, createRng(seed));
    return canvas;
  });
  return { frames, w, h };
}

/** Draws a prop with its top-left at (x, y), scaled about there. */
export function drawProp(ctx: CanvasRenderingContext2D, p: Prop, boil: number, x: number, y: number, scale = 1): void {
  ctx.drawImage(p.frames[boil % p.frames.length]!, x, y, p.w * scale, p.h * scale);
}

/** A pen for marks drawn live, boiling with the props. */
export const livePen = (ctx: CanvasRenderingContext2D, seed: number, boil: number): Pen => new Pen(ctx, seed * 31 + (boil % BOIL_FRAMES) * 977, 1.1);

/** A closed shape filled and inked round. */
export function inked(pen: Pen, pts: readonly Pt[], fill: string, width: number, alpha = 1): void {
  pen.fill(pts, fill, alpha);
  pen.closed(pts, width);
}

/** Points along a quadratic curve. */
export function curve(a: Pt, c: Pt, b: Pt, n = 10): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const u = i / n;
    const v = 1 - u;
    return { x: v * v * a.x + 2 * v * u * c.x + u * u * b.x, y: v * v * a.y + 2 * v * u * c.y + u * u * b.y };
  });
}

/** Points round an ellipse, from `from` to `to` radians. */
export function arc(cx: number, cy: number, rx: number, ry: number, from: number, to: number, n = 16): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = from + ((to - from) * i) / n;
    return { x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry };
  });
}

/** A ragged-edged wash, as if brushed across the page: full width, from `top` to `bottom`, its edges wavering. */
export function washPath(ctx: CanvasRenderingContext2D, top: number, bottom: number, w: number, seed: number): void {
  const rng = createRng(seed);
  const edge = (y: number, k: number): Pt[] =>
    Array.from({ length: 41 }, (_, i) => ({ x: -20 + ((w + 40) * i) / 40, y: y + 9 * Math.sin(i * 0.7 + k) + 6 * (rng() - 0.5) }));
  const upper = edge(top, 1);
  const lower = edge(bottom, 4).reverse();
  ctx.beginPath();
  [...upper, ...lower].forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
}

/** The male and female signs, `size` px across the ring, in pen strokes. */
export function drawSign(pen: Pen, kind: 'male' | 'female', x: number, y: number, size: number, colour: string, width: number): void {
  const r = size / 2;
  pen.closed(arc(x, y, r, r, 0, Math.PI * 2, 22).slice(0, -1), width, colour);
  if (kind === 'female') {
    pen.stroke([{ x, y: y + r }, { x, y: y + r * 2.1 }], width, colour);
    pen.stroke([{ x: x - r * 0.55, y: y + r * 1.55 }, { x: x + r * 0.55, y: y + r * 1.55 }], width, colour);
    return;
  }
  const d = Math.SQRT1_2;
  const tip = { x: x + r * 2, y: y - r * 2 };
  pen.stroke([{ x: x + r * d, y: y - r * d }, tip], width, colour);
  pen.stroke([{ x: tip.x - r * 0.75, y: tip.y }, tip, { x: tip.x, y: tip.y + r * 0.75 }], width, colour);
}
