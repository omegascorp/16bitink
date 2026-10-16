import { makeCanvas, PAPER, Pen, type Pt } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { createRng } from '../../../src/logic/rng';
import type { TextInk } from '../captions';

/**
 * The short's pen kit: inked props drawn once per boil frame, a pen for the
 * moving parts that boils with them, and the red of the corrections.
 */

export const RED = '#c8352b';
export const RED_ON_PAPER: TextInk = { fill: RED, halo: PAPER };
export const GLASS_TINT = '#7fb0b8';
export const WATER_TOP = '#a9d3d6';
export const WATER_DEEP = '#5e9aa6';
export const WOOD = '#a8743f';
export const WOOD_DARK = '#6e4724';

/** An inked prop: one canvas per boil frame, placed with its top-left at (x, y). */
export interface Prop {
  readonly frames: readonly HTMLCanvasElement[];
  readonly x: number;
  readonly y: number;
}

/** Draws a prop once per boil frame: the same shape each time (rng), a different wobble (pen). */
export function prop(
  x: number, y: number, w: number, h: number, seed: number, draw: (pen: Pen, ctx: CanvasRenderingContext2D, rng: () => number) => void,
): Prop {
  const frames = Array.from({ length: BOIL_FRAMES }, (_, f) => {
    const { canvas, ctx } = makeCanvas(w, h);
    ctx.translate(-x, -y);
    draw(new Pen(ctx, seed * 31 + f * 977, 1.1), ctx, createRng(seed));
    return canvas;
  });
  return { frames, x, y };
}

export function drawProp(ctx: CanvasRenderingContext2D, p: Prop, boil: number): void {
  ctx.drawImage(p.frames[boil % p.frames.length]!, p.x, p.y);
}

/** A pen for something drawn live, every frame: it wobbles with the boil, steady between its steps. */
export const livePen = (ctx: CanvasRenderingContext2D, seed: number, boil: number, wobble = 1): Pen => new Pen(ctx, seed * 31 + (boil % BOIL_FRAMES) * 977, wobble);

/** Points round an ellipse arc, from angle `a0` to `a1` (radians, y down). */
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

/** A red ink ✕ centred at (x, y), `size` across, each stroke drawn 0 .. 1, with a faint bleed under it. */
export function drawRedCross(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, strokes: readonly [number, number], width: number): void {
  const lines: readonly (readonly [Pt, Pt])[] = [
    [{ x: x - w / 2, y: y - h / 2 }, { x: x + w / 2, y: y + h / 2 }],
    [{ x: x + w / 2, y: y - h / 2 }, { x: x - w / 2, y: y + h / 2 }],
  ];
  ctx.save();
  ctx.strokeStyle = RED;
  ctx.lineCap = 'round';
  lines.forEach(([a, b], i) => {
    const u = strokes[i]!;
    if (u <= 0) return;
    const end = { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
    // A brush stroke: a soft wide bleed, then the stroke, thinning towards its end.
    const bow = { x: (a.x + end.x) / 2 + (i ? -1 : 1) * h * 0.04, y: (a.y + end.y) / 2 - w * 0.02 };
    for (const [lw, alpha] of [[width * 1.9, 0.18], [width, 0.92]] as const) {
      ctx.globalAlpha = alpha;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(bow.x, bow.y, end.x, end.y);
      ctx.stroke();
    }
  });
  ctx.restore();
}
