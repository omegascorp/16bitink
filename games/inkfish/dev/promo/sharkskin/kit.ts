import { makeCanvas, Pen, type Pt } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { createRng } from '../../../src/logic/rng';

/**
 * The sketched props' kit: each prop is drawn once per boil frame with the
 * game's pen (the same shape, a different wobble), about an anchor point,
 * and stamped onto the frame moved, turned, scaled or flipped.
 */

export interface Prop {
  readonly frames: readonly HTMLCanvasElement[];
  /** Where the anchor sits in each canvas. */
  readonly ox: number;
  readonly oy: number;
}

/** Colours shared by the props. */
export const SKIN = '#f0cfae';
export const SHARK_GREY = '#7d8891';
export const DENTICLE = '#e4e8e6';
export const ENAMEL = '#fbf6e6';
export const DENTINE = '#e6c891';
export const PULP = '#e48f8f';
export const WOOD = '#b98450';
export const WASABI = '#8cbf5a';
export const WASABI_DARK = '#5f8f3a';
export const RED = '#c8452c';

/** Bakes a prop `w` × `h`, its anchor at (ox, oy): `draw` works about the anchor. */
export function bake(w: number, h: number, ox: number, oy: number, seed: number, draw: (pen: Pen, ctx: CanvasRenderingContext2D, rng: () => number) => void): Prop {
  const frames = Array.from({ length: BOIL_FRAMES }, (_, f) => {
    const { canvas, ctx } = makeCanvas(w, h);
    ctx.translate(ox, oy);
    draw(new Pen(ctx, seed * 31 + f * 977, 1.3), ctx, createRng(seed));
    return canvas;
  });
  return { frames, ox, oy };
}

export interface Placing {
  readonly scale?: number;
  readonly rot?: number;
  readonly alpha?: number;
  /** -1 mirrors it left to right (through 0 as it turns over). */
  readonly flip?: number;
}

/** Stamps a prop with its anchor at (x, y). */
export function drawProp(ctx: CanvasRenderingContext2D, p: Prop, boil: number, x: number, y: number, at: Placing = {}): void {
  const alpha = at.alpha ?? 1;
  const flip = at.flip ?? 1;
  if (alpha <= 0 || Math.abs(flip) < 0.01) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.translate(x, y);
  ctx.rotate(at.rot ?? 0);
  ctx.scale((at.scale ?? 1) * flip, at.scale ?? 1);
  ctx.drawImage(p.frames[boil % p.frames.length]!, -p.ox, -p.oy);
  ctx.restore();
}

/** Points along a quadratic curve. */
export function curve(a: Pt, c: Pt, b: Pt, n = 12): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const u = i / n;
    return { x: (1 - u) ** 2 * a.x + 2 * u * (1 - u) * c.x + u * u * b.x, y: (1 - u) ** 2 * a.y + 2 * u * (1 - u) * c.y + u * u * b.y };
  });
}

/** A rounded capsule from a to b, `r` thick each side: a finger, a stalk. */
export function capsule(a: Pt, b: Pt, r: number, n = 8): Pt[] {
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  const cap = (c: Pt, from: number): Pt[] =>
    Array.from({ length: n + 1 }, (_, i) => {
      const t = from + (Math.PI * i) / n;
      return { x: c.x + Math.cos(t) * r, y: c.y + Math.sin(t) * r };
    });
  return [...cap(b, ang - Math.PI / 2), ...cap(a, ang + Math.PI / 2)];
}

/** Fills a shape and inks round it. */
export function inked(pen: Pen, pts: readonly Pt[], fill: string, width = 3.5, alpha = 1): void {
  pen.fill(pts, fill, alpha);
  pen.closed(pts, width);
}

/** A rounded rectangle's outline. */
export function rounded(x: number, y: number, w: number, h: number, r: number): Pt[] {
  const corner = (cx: number, cy: number, from: number): Pt[] =>
    Array.from({ length: 5 }, (_, i) => ({ x: cx + Math.cos(from + (i * Math.PI) / 8) * r, y: cy + Math.sin(from + (i * Math.PI) / 8) * r }));
  return [
    ...corner(x + w - r, y + r, -Math.PI / 2), ...corner(x + w - r, y + h - r, 0),
    ...corner(x + r, y + h - r, Math.PI / 2), ...corner(x + r, y + r, Math.PI),
  ];
}
