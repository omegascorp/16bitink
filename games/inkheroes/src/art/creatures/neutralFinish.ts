import { makeDraw, oval, type Draw } from '../kit';
import { LIGHT, SHADOW, TO_LIGHT, soft } from './neutralKit';

/**
 * The finish over a whole neutral figure, as InkMine's finishSprite: the
 * figure is painted on a layer of its own, then given a rim of warm light
 * on the edges turned to the light, a cool shade along the far edges and
 * one weighted ink silhouette round everything, heavier on the shadow side,
 * so the interior lines can stay fine (an illustrator's line hierarchy).
 * The layer is laid over the frame with the soft contact shadow under it.
 */

/** The drawing's bounds in local units (types.ts), with room for the silhouette. */
const BOUNDS = { x0: -60, y0: -108, x1: 60, y1: 14 } as const;
/** Below this alpha a pixel is a glow's halo or a soft edge, not the figure: it isn't outlined. */
const SOLID_FROM = 90;
const SOLID_TO = 170;

function layer(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, w);
  canvas.height = Math.max(1, h);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is not available');
  return { canvas, ctx };
}

function rgbOf(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** The pixels of `src` whose neighbour towards (dx, dy) is empty: a band along one side of the figure. */
function edgeBand(src: HTMLCanvasElement, dx: number, dy: number, color: string): HTMLCanvasElement {
  const { canvas, ctx } = layer(src.width, src.height);
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = 'destination-out';
  ctx.drawImage(src, -dx, -dy);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}

/** The figure's solid pixels in ink, ramped so the outline stays antialiased. */
function solidInk(src: HTMLCanvasElement, ink: string): HTMLCanvasElement {
  const out = layer(src.width, src.height);
  out.ctx.drawImage(src, 0, 0);
  const img = out.ctx.getImageData(0, 0, src.width, src.height);
  const [r, g, b] = rgbOf(ink);
  const px = img.data;
  for (let i = 0; i < px.length; i += 4) {
    const a = Math.max(0, Math.min(1, (px[i + 3]! - SOLID_FROM) / (SOLID_TO - SOLID_FROM)));
    px[i] = r;
    px[i + 1] = g;
    px[i + 2] = b;
    px[i + 3] = Math.round(a * 255);
  }
  out.ctx.putImageData(img, 0, 0);
  return out.canvas;
}

function finish(canvas: HTMLCanvasElement, unit: number, ink: string, line: number, rim: number): void {
  const ctx = canvas.getContext('2d')!;
  const src = layer(canvas.width, canvas.height);
  src.ctx.drawImage(canvas, 0, 0);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-atop';
  ctx.globalAlpha = rim;
  ctx.drawImage(edgeBand(src.canvas, TO_LIGHT.x * unit * 0.9, TO_LIGHT.y * unit * 0.9, LIGHT), 0, 0);
  ctx.globalAlpha = rim * 0.55;
  ctx.drawImage(edgeBand(src.canvas, -TO_LIGHT.x * unit * 1.6, -TO_LIGHT.y * unit * 1.6, SHADOW), 0, 0);
  const inked = solidInk(src.canvas, ink);
  ctx.globalCompositeOperation = 'destination-over';
  ctx.globalAlpha = 1;
  const base = line * unit;
  const steps = 20;
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const toShadow = Math.max(0, -(Math.cos(a) * TO_LIGHT.x + Math.sin(a) * TO_LIGHT.y));
    const r = base * (0.7 + 0.9 * toShadow);
    ctx.drawImage(inked, Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.restore();
}

export interface SpriteOpts {
  /** Half-width of the contact shadow on the ground. */
  readonly shadow: number;
  /** Where the contact shadow is centred. */
  readonly shadowX?: number;
  /** Silhouette line width in units on the lit side. */
  readonly line?: number;
  /** Strength of the rim light. */
  readonly rim?: number;
}

/**
 * Paints a figure through `draw` on its own layer (same transform as `ctx`,
 * pen seeded `seed + f`), finishes it, and lays it over a soft contact
 * shadow on `ctx`.
 */
export function sprite(ctx: CanvasRenderingContext2D, seed: number, f: number, o: SpriteOpts, draw: (d: Draw) => void): void {
  const ground = makeDraw(ctx, seed + f, f, 0);
  const sx = o.shadowX ?? 0;
  soft(ctx, 2.2, () => {
    ground.pen.fill(oval(sx, 0.6, o.shadow, 3.4, 28), SHADOW, 0.2);
    ground.pen.fill(oval(sx, 0.4, o.shadow * 0.6, 1.8, 24), SHADOW, 0.22);
  });
  const m = ctx.getTransform();
  const corners = [
    [BOUNDS.x0, BOUNDS.y0],
    [BOUNDS.x1, BOUNDS.y0],
    [BOUNDS.x0, BOUNDS.y1],
    [BOUNDS.x1, BOUNDS.y1],
  ].map(([x, y]) => ({ x: m.a * x! + m.c * y! + m.e, y: m.b * x! + m.d * y! + m.f }));
  const px0 = Math.floor(Math.min(...corners.map((c) => c.x)));
  const py0 = Math.floor(Math.min(...corners.map((c) => c.y)));
  const px1 = Math.ceil(Math.max(...corners.map((c) => c.x)));
  const py1 = Math.ceil(Math.max(...corners.map((c) => c.y)));
  const fig = layer(px1 - px0, py1 - py0);
  fig.ctx.setTransform(m.a, m.b, m.c, m.d, m.e - px0, m.f - py0);
  const d = makeDraw(fig.ctx, seed + f, f, 0);
  draw(d);
  finish(fig.canvas, Math.hypot(m.a, m.b) || 1, d.ink, o.line ?? 0.85, o.rim ?? 0.55);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(fig.canvas, px0, py0);
  ctx.restore();
}
