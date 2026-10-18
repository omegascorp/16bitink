import { boxOf, rgba, soft } from '../../../src/art/paint';
import { pathOf, type Pt } from '../../../src/art/pen';
import { BOIL } from '../../../src/art/palette';
import { makeDraw, type Draw } from '../../../src/art/kit';
import { render } from '../../../src/art/textures';
import type { Frame, Sprite } from '../sprites';

/**
 * Painting black plants, after the game's paint.ts: life under a red dwarf
 * drinks every colour, so the body is near-black, but a painter still
 * gives it form: a waxy dark-violet sheen where the sky lights it, deeper
 * black below, pigment pooled at the wash's edge, violet veins, and the
 * red sun behind it catching its rims (`backlight`), so a forest of them
 * reads as plants against the glow, not as cut-outs.
 */
export const BLACKS = {
  body: '#0e0a15',
  deep: '#030206',
  sheen: '#46306e',
  vein: '#6a4c96',
  ink: '#07040d',
  rim: '#ff6a42',
  haze: '#4a1a20',
} as const;

export interface BlackOpts {
  /** How strong the violet sheen is (0..1). */
  readonly sheen?: number;
  /** Where the sheen falls: the direction the lit side faces (default up). */
  readonly lit?: Pt;
  /** Pen line width (0 for none). */
  readonly line?: number;
}

/** One part of a black plant, painted: body, sheen towards `lit`, deep shadow away from it, pooled edge, pen line. */
export function blackPart(d: Draw, shape: readonly Pt[], o: BlackOpts = {}): void {
  const ctx = d.pen.ctx;
  const b = boxOf(shape);
  const lit = o.lit ?? { x: 0, y: -1 };
  const cx = b.x0 + b.w / 2;
  const cy = b.y0 + b.h / 2;
  const reach = Math.max(b.w, b.h) / 2;
  d.pen.fill(shape, BLACKS.body, 1);
  d.pen.clipped(shape, () => {
    const g = ctx.createLinearGradient(cx + lit.x * reach, cy + lit.y * reach, cx - lit.x * reach, cy - lit.y * reach);
    g.addColorStop(0, rgba(BLACKS.sheen, 0.5 * (o.sheen ?? 0.6)));
    g.addColorStop(0.45, rgba(BLACKS.sheen, 0.06 * (o.sheen ?? 0.6)));
    g.addColorStop(0.7, rgba(BLACKS.deep, 0));
    g.addColorStop(1, rgba(BLACKS.deep, 0.85));
    ctx.fillStyle = g;
    ctx.fillRect(b.x0 - 1, b.y0 - 1, b.w + 2, b.h + 2);
    // Pigment pooled at the wash's edge, as watercolour dries.
    soft(ctx, Math.min(b.w, b.h) * 0.06, () => {
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = BLACKS.deep;
      ctx.lineWidth = Math.min(3, Math.min(b.w, b.h) * 0.14);
      pathOf(ctx, shape);
      ctx.stroke();
      ctx.globalAlpha = 1;
    });
  });
  d.pen.stipple(shape, Math.round(b.w * b.h * 0.05), (_, y) => 0.35 * (1 - (y - b.y0) / Math.max(1, b.h)), 0.35, BLACKS.sheen);
  const line = o.line ?? 0.9;
  if (line > 0) d.pen.stroke([...shape, shape[0]!], line, BLACKS.ink, 0.9);
}

/** A fine violet vein. */
export const vein = (d: Draw, pts: readonly Pt[], w = 0.5, alpha = 0.55): void => d.pen.hair(pts, w, BLACKS.vein, alpha);

function scratch(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is not available');
  return { canvas, ctx };
}

/** The pixels of `src` whose neighbour (dx, dy) px away is empty: a band along that side of the figure, in `color`. */
function edgeBand(src: HTMLCanvasElement, dx: number, dy: number, color: string): HTMLCanvasElement {
  const { canvas, ctx } = scratch(src.width, src.height);
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = 'destination-out';
  ctx.drawImage(src, -dx, -dy);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}

export interface Backlight {
  /** Unit direction towards the sun, on the canvas. */
  readonly to: Pt;
  /** How thick the rim is, in canvas px. */
  readonly px: number;
  readonly alpha: number;
  /** A haze over the whole figure (distance), 0..1. */
  readonly haze?: number;
}

/** The red sun behind a finished figure: a hot rim on the edges turned to it, a fainter one all round, and haze for distance. */
export function backlight(canvas: HTMLCanvasElement, o: Backlight): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const src = scratch(canvas.width, canvas.height);
  src.ctx.drawImage(canvas, 0, 0);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-atop';
  if (o.haze) {
    ctx.globalAlpha = o.haze;
    ctx.fillStyle = BLACKS.haze;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  const passes: readonly (readonly [number, number, number, number])[] = [
    [o.to.x, o.to.y, o.px, o.alpha * 0.8],
    [o.to.x, o.to.y, o.px * 0.4, o.alpha],
    [0, -1, o.px * 0.5, o.alpha * 0.3],
  ];
  for (const [x, y, r, a] of passes) {
    ctx.globalAlpha = a;
    soft(ctx, r * 0.25, () => ctx.drawImage(edgeBand(src.canvas, x * r, y * r, BLACKS.rim), 0, 0));
  }
  ctx.restore();
}

/** Bakes a black plant once per boil frame, then lights it from behind. */
export function bakeBlack(frame: Frame, res: number, seed: number, draw: (d: Draw) => void, light: Omit<Backlight, 'px'> & { readonly px?: number }): Sprite {
  const frames = Array.from({ length: BOIL }, (_, f) => {
    const canvas = render(frame.w, frame.h, frame.ox, frame.oy, res, (ctx) => draw(makeDraw(ctx, seed + f, f, 0, BLACKS.ink)));
    backlight(canvas, { ...light, px: light.px ?? res * 2.2 });
    return canvas;
  });
  return { frames, frame, res };
}
