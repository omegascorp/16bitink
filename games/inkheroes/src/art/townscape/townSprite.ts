import { createRng, type Rng } from '../../logic/rng';
import { pt, TAU, type Draw } from '../kit';
import { INK } from '../palette';
import { Pen, INK as PEN_INK, type Pt } from '../pen';
import { LIGHT, SHADOW, TO_LIGHT, type SpriteOpts } from '../sites/paintKit';

/**
 * The town's buildings finished as one oil study each: the same pass as
 * sites/paintKit's `sprite`, but tuned for the townscape's close view and
 * its darker, graver light, after Heroes III's town screens.
 *
 * - The pen is finer: every ink-coloured line (contours, joints, hatching)
 *   is drawn at about two thirds of its width, so the line reads as an
 *   illustrator's finishing pen over paint rather than a cartoon outline.
 *   Coloured strokes (beams, poles, iron, highlights) keep their widths.
 * - Before the silhouette is inked the whole building is glazed: an umber
 *   glaze that deepens it away from the light (upper left) and towards its
 *   foot, with a warm late-afternoon light kept on the lit upper left, so
 *   every piece sits in the same light and the same value range.
 * - The silhouette is light on the lit edges and firms up only on the
 *   shadow side.
 */

/** How much of its width an ink line keeps. */
const FINE = 0.64;

const isInk = (color: string | undefined): boolean => color === undefined || color === INK || color === PEN_INK;

/** A pen whose ink lines are drawn finer; painted strokes keep their width. */
class FinePen extends Pen {
  override stroke(points: readonly Pt[], width: number, color: string = INK, alpha = 1, retrace = true): void {
    super.stroke(points, isInk(color) ? width * FINE : width, color, alpha, retrace);
  }

  override hair(points: readonly Pt[], width: number, color: string = INK, alpha = 0.85): void {
    super.hair(points, isInk(color) ? width * FINE : width, color, alpha);
  }

  override hatch(clip: readonly Pt[], spacing: number, angle: number, width: number, opts: Parameters<Pen['hatch']>[4] = {}): void {
    super.hatch(clip, spacing, angle, isInk(opts.color) ? width * FINE : width, opts);
  }
}

const fineDraw = (ctx: CanvasRenderingContext2D, seed: number, f: number): Draw => ({ pen: new FinePen(ctx, seed, 0.5), ink: INK, f: ((f % 3) + 3) % 3, g: 0 });

function layer(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, w);
  canvas.height = Math.max(1, h);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is not available');
  return { canvas, ctx };
}

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

const SOLID_FROM = 90;
const SOLID_TO = 170;

function solidInk(src: HTMLCanvasElement, inkHex: string): HTMLCanvasElement {
  const out = layer(src.width, src.height);
  out.ctx.drawImage(src, 0, 0);
  const img = out.ctx.getImageData(0, 0, src.width, src.height);
  const n = parseInt(inkHex.slice(1), 16);
  const px = img.data;
  for (let i = 0; i < px.length; i += 4) {
    const a = Math.max(0, Math.min(1, (px[i + 3]! - SOLID_FROM) / (SOLID_TO - SOLID_FROM)));
    px[i] = (n >> 16) & 255;
    px[i + 1] = (n >> 8) & 255;
    px[i + 2] = n & 255;
    px[i + 3] = Math.round(a * 255);
  }
  out.ctx.putImageData(img, 0, 0);
  return out.canvas;
}

/** Glaze strengths: how deep the umber glaze goes away from the light, and how much warm light is kept on the lit side. */
export interface Glaze {
  /** Multiply colour at the lit upper left (lighter is less darkening). */
  readonly lit: string;
  /** Multiply colour in the middle. */
  readonly mid: string;
  /** Multiply colour at the far lower right. */
  readonly deep: string;
  /** Extra umber settling at the building's foot (0..1). */
  readonly foot: number;
}

export const GLAZE: Glaze = { lit: '#f8efe2', mid: '#dccfbf', deep: '#a29384', foot: 0.3 };

/** The umber glaze over everything painted on the layer so far (its own pixels only). */
function glaze(ctx: CanvasRenderingContext2D, b: SpriteOpts['bounds'], g: Glaze): void {
  const w = b.x1 - b.x0;
  const h = b.y1 - b.y0;
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  const lin = ctx.createLinearGradient(b.x0 + w * 0.1, b.y0 + h * 0.05, b.x0 + w * 0.95, b.y1);
  lin.addColorStop(0, g.lit);
  lin.addColorStop(0.5, g.mid);
  lin.addColorStop(1, g.deep);
  ctx.fillStyle = lin;
  ctx.fillRect(b.x0, b.y0, w, h);
  // The foot of the building, in the shade of the ground's own occlusion.
  const foot = ctx.createLinearGradient(0, b.y1 - h * 0.45, 0, b.y1);
  foot.addColorStop(0, 'rgba(255,255,255,0)');
  foot.addColorStop(1, `rgba(90,62,40,${g.foot})`);
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = foot;
  ctx.fillRect(b.x0, b.y0, w, h);
  ctx.restore();
}

function finish(canvas: HTMLCanvasElement, unit: number, line: number, rim: number): void {
  const ctx = canvas.getContext('2d')!;
  const src = layer(canvas.width, canvas.height);
  src.ctx.drawImage(canvas, 0, 0);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-atop';
  ctx.globalAlpha = rim;
  ctx.drawImage(edgeBand(src.canvas, TO_LIGHT.x * unit * 0.8, TO_LIGHT.y * unit * 0.8, LIGHT), 0, 0);
  ctx.globalAlpha = rim * 0.7;
  ctx.drawImage(edgeBand(src.canvas, -TO_LIGHT.x * unit * 2, -TO_LIGHT.y * unit * 2, SHADOW), 0, 0);
  const inked = solidInk(src.canvas, INK);
  ctx.globalCompositeOperation = 'destination-over';
  ctx.globalAlpha = 1;
  const base = line * unit;
  const steps = 20;
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * TAU;
    const toShadow = Math.max(0, -(Math.cos(a) * TO_LIGHT.x + Math.sin(a) * TO_LIGHT.y));
    const r = base * (0.4 + 1.1 * toShadow);
    ctx.drawImage(inked, Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.restore();
}

export interface TownSpriteOpts extends SpriteOpts {
  readonly glaze?: Glaze;
}

/**
 * Paints a town building through `draw` on its own layer (as paintKit's
 * `sprite`: pen seeded `seed + f`, shapes' rng seeded by `seed`), glazes
 * it, finishes it with a fine weighted silhouette and lays it over its ground.
 */
export function townSprite(ctx: CanvasRenderingContext2D, seed: number, f: number, o: TownSpriteOpts, draw: (d: Draw, rng: Rng) => void): void {
  if (o.ground) o.ground(fineDraw(ctx, seed + f + 977, f), createRng(seed * 7 + 13));
  const m = ctx.getTransform();
  const { x0, y0, x1, y1 } = o.bounds;
  const corners = [pt(x0, y0), pt(x1, y0), pt(x0, y1), pt(x1, y1)].map((c) => pt(m.a * c.x + m.c * c.y + m.e, m.b * c.x + m.d * c.y + m.f));
  const px0 = Math.floor(Math.min(...corners.map((c) => c.x)));
  const py0 = Math.floor(Math.min(...corners.map((c) => c.y)));
  const px1 = Math.ceil(Math.max(...corners.map((c) => c.x)));
  const py1 = Math.ceil(Math.max(...corners.map((c) => c.y)));
  const fig = layer(px1 - px0, py1 - py0);
  fig.ctx.setTransform(m.a, m.b, m.c, m.d, m.e - px0, m.f - py0);
  draw(fineDraw(fig.ctx, seed + f, f), createRng(seed));
  // Glaze on a copy so the multiply can't stain the empty air, then keep it only where the figure is.
  const glazed = layer(fig.canvas.width, fig.canvas.height);
  glazed.ctx.drawImage(fig.canvas, 0, 0);
  glazed.ctx.setTransform(m.a, m.b, m.c, m.d, m.e - px0, m.f - py0);
  glaze(glazed.ctx, o.bounds, o.glaze ?? GLAZE);
  glazed.ctx.setTransform(1, 0, 0, 1, 0, 0);
  glazed.ctx.globalCompositeOperation = 'destination-in';
  glazed.ctx.drawImage(fig.canvas, 0, 0);
  fig.ctx.save();
  fig.ctx.setTransform(1, 0, 0, 1, 0, 0);
  fig.ctx.clearRect(0, 0, fig.canvas.width, fig.canvas.height);
  fig.ctx.drawImage(glazed.canvas, 0, 0);
  fig.ctx.restore();
  finish(fig.canvas, Math.hypot(m.a, m.b) || 1, (o.line ?? 0.8) * 0.72, o.rim ?? 0.42);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(fig.canvas, px0, py0);
  ctx.restore();
  if (o.air) o.air(fineDraw(ctx, seed + f + 431, f), createRng(seed * 3 + 5));
}
