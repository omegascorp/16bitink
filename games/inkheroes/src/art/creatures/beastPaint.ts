import type { Draw } from '../kit';
import { pathOf, withScratch, type Pt } from '../pen';
import { INK } from '../palette';
import { mix, rgba } from '../wash';
import { FRAME_H, FRAME_W, GROUND_Y } from './types';

/**
 * Watercolour painting for the neutral beasts (wolf, ogre), ported from
 * InkMine's sprite painting: each part is laid in as a wash study (body
 * colour, light rolling in from the upper left, a soft core shadow with
 * light bounced into its edge, pigment pooled at the rim, hatching in the
 * shadow, a fine pen line). `finished` paints a whole figure on a layer of
 * its own and finishes it: one low warm light across the whole figure, a
 * rim of sunlight on the lit edges, a deep violet-umber edge on the far
 * side and one fine umber silhouette, firmer only on the shadow side, so
 * the beast reads on a dark field. Old-master values: deep shadows, warm
 * small lights, never paper white.
 */

/** Warm late-afternoon light. */
export const LIGHT = '#f2d49a';
/** Shadow: a deep violet-umber, as an old master mixes it (never grey, never black). */
export const SHADOW = '#22161a';
/** Light bounced up from the earth into a shadow: dull and warm. */
export const BOUNCE = '#7a6650';
/** The palest a highlight goes: warm ivory, never white. */
export const IVORY = '#e9dfc6';
/** The warm rim of sunlight caught on the lit edge of a figure. */
export const RIM = '#f4c472';
/** Towards the light: up and to the left. */
export const TO_LIGHT: Pt = { x: -0.55, y: -0.84 };

interface Box {
  readonly x0: number;
  readonly y0: number;
  readonly w: number;
  readonly h: number;
}

export function boxOf(shape: readonly Pt[]): Box {
  const xs = shape.map((p) => p.x);
  const ys = shape.map((p) => p.y);
  const x0 = Math.min(...xs);
  const y0 = Math.min(...ys);
  return { x0, y0, w: Math.max(...xs) - x0, h: Math.max(...ys) - y0 };
}

function unitPx(ctx: CanvasRenderingContext2D): number {
  const m = ctx.getTransform();
  return Math.hypot(m.a, m.b) || 1;
}

let canBlur: boolean | null = null;

function blurs(ctx: CanvasRenderingContext2D): boolean {
  if (canBlur === null) {
    ctx.filter = 'blur(2px)';
    canBlur = ctx.filter === 'blur(2px)';
    ctx.filter = 'none';
  }
  return canBlur;
}

/** Runs `draw` with a soft edge of `r` units (hard where the canvas can't blur). */
export function soft(ctx: CanvasRenderingContext2D, r: number, draw: () => void): void {
  const px = r * unitPx(ctx);
  // Under a pixel a blur shows nothing but costs a whole filter pass.
  if (px < 1 || !blurs(ctx)) {
    draw();
    return;
  }
  ctx.filter = `blur(${px.toFixed(2)}px)`;
  draw();
  ctx.filter = 'none';
}

const shifted = (shape: readonly Pt[], dx: number, dy: number): Pt[] => shape.map((p) => ({ x: p.x + dx, y: p.y + dy }));

/** Fills the far-side crescent: the part of `shape` its copy moved by (dx, dy) leaves bare. */
function crescentFill(ctx: CanvasRenderingContext2D, shape: readonly Pt[], dx: number, dy: number, color: string, alpha: number, blur: number): void {
  ctx.save();
  pathOf(ctx, shape);
  ctx.clip();
  soft(ctx, blur, () => {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    for (const ring of [shape, shifted(shape, dx, dy)]) {
      ring.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.closePath();
    }
    ctx.fill('evenodd');
  });
  ctx.restore();
}

export interface PaintOpts {
  readonly alpha?: number;
  /** Core shadow depth 0..1. */
  readonly shadow?: number;
  /** Hatching alpha over the shadow (0 for none). */
  readonly hatch?: number;
  readonly cross?: boolean;
  /** Hard and glossy: a sharper highlight and terminator. */
  readonly gloss?: boolean;
  /** Pen line width (0 for none). */
  readonly line?: number;
  readonly lineAlpha?: number;
}

/** One part, painted as a wash study, then lined. */
export function paint(d: Draw, shape: readonly Pt[], color: string, o: PaintOpts = {}): void {
  const { pen } = d;
  const ctx = pen.ctx;
  const b = boxOf(shape);
  const size = Math.max(1, Math.max(b.w, b.h));
  const minor = Math.max(1, Math.min(b.w, b.h));
  const shadow = o.shadow ?? 0.5;
  pen.fill(shape, mix(color, SHADOW, 0.25), 1);
  pen.clipped(shape, () => {
    ctx.globalAlpha = o.alpha ?? 0.92;
    ctx.fillStyle = color;
    ctx.fillRect(b.x0 - 1, b.y0 - 1, b.w + 2, b.h + 2);
    const lx = b.x0 + b.w * 0.32;
    const ly = b.y0 + b.h * 0.24;
    const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, size * 0.78);
    const lit = mix(color, LIGHT, o.gloss ? 0.62 : 0.4);
    g.addColorStop(0, rgba(lit, 0.85));
    g.addColorStop(o.gloss ? 0.22 : 0.36, rgba(lit, 0.35));
    g.addColorStop(1, rgba(lit, 0));
    ctx.globalAlpha = 1;
    ctx.fillStyle = g;
    ctx.fillRect(b.x0 - 1, b.y0 - 1, b.w + 2, b.h + 2);
  });
  if (shadow > 0) {
    const k = minor * 0.46;
    crescentFill(ctx, shape, TO_LIGHT.x * k, TO_LIGHT.y * k, mix(color, SHADOW, 0.68), Math.min(1, 0.9 * shadow), o.gloss ? minor * 0.04 : Math.min(2.4, minor * 0.08));
    const r = minor * 0.08;
    crescentFill(ctx, shape, TO_LIGHT.x * r, TO_LIGHT.y * r, mix(color, BOUNCE, 0.4), 0.3 * shadow, minor * 0.04);
  }
  pen.clipped(shape, () => {
    soft(ctx, minor * 0.05, () => {
      ctx.globalAlpha = 0.32;
      ctx.strokeStyle = mix(color, SHADOW, 0.55);
      ctx.lineWidth = Math.min(2.2, minor * 0.16);
      pathOf(ctx, shape);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
  });
  const hatch = o.hatch ?? 0.22;
  if (hatch > 0 && shadow > 0) {
    const s = Math.max(1.3, size / 24);
    const k = minor * 0.3;
    pen.crescent(shape, { x: TO_LIGHT.x * k, y: TO_LIGHT.y * k }, () => pen.hatch(shape, s, 0.9, 0.4, { color: d.ink, alpha: hatch }));
    if (o.cross) {
      const c = minor * 0.16;
      pen.crescent(shape, { x: TO_LIGHT.x * c, y: TO_LIGHT.y * c }, () => pen.hatch(shape, s * 1.1, -0.55, 0.36, { color: d.ink, alpha: hatch * 0.9 }));
    }
  }
  const line = o.line ?? 0.7;
  if (line > 0) pen.stroke([...shape, shape[0]!], line, d.ink, o.lineAlpha ?? 0.9);
}

/** A soft wash dabbed over a shape (a saddle of dark fur, a blush), feathered by `blur`. */
export function dab(d: Draw, shape: readonly Pt[], color: string, alpha: number, blur: number): void {
  soft(d.pen.ctx, blur, () => d.pen.fill(shape, color, alpha));
}

/** A thin painted highlight along a curve: a glint on iron, horn or a wet nose. */
export function gleam(d: Draw, pts: readonly Pt[], w: number, alpha = 0.9): void {
  soft(d.pen.ctx, w * 0.25, () => d.pen.stroke(pts, w, IVORY, alpha, false));
}

/** The pixels of `src` whose neighbour towards (dx, dy) is empty, tinted: a band along one side. */
function edgeBand(src: HTMLCanvasElement, dx: number, dy: number, color: string, use: (band: HTMLCanvasElement) => void): void {
  withScratch(src.width, src.height, (ctx, canvas) => {
    ctx.drawImage(src, 0, 0);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.drawImage(src, -dx, -dy);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    use(canvas);
  });
}

/** The figure's solid pixels in ink (soft edges ramped so the outline stays antialiased). */
function solidInk(src: HTMLCanvasElement, ink: string, use: (c: HTMLCanvasElement) => void): void {
  withScratch(src.width, src.height, (ctx, canvas) => {
    ctx.drawImage(src, 0, 0);
    const img = ctx.getImageData(0, 0, src.width, src.height);
    const n = parseInt(ink.slice(1), 16);
    const px = img.data;
    for (let i = 0; i < px.length; i += 4) {
      const a = Math.max(0, Math.min(1, (px[i + 3]! - 90) / 80));
      px[i] = (n >> 16) & 255;
      px[i + 1] = (n >> 8) & 255;
      px[i + 2] = n & 255;
      px[i + 3] = Math.round(a * 255);
    }
    ctx.putImageData(img, 0, 0);
    use(canvas);
  });
}

export interface Finish {
  /** Silhouette width in units on the lit side; the shadow side gets more. */
  readonly line: number;
  /** Rim light strength. */
  readonly rim: number;
}

function finishLayer(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, u: number, o: Finish): void {
  withScratch(canvas.width, canvas.height, (_, src) => {
    src.getContext('2d')!.drawImage(canvas, 0, 0);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-atop';
    // One light over the whole figure: what faces the low sun warms, what is turned from it sinks into shadow.
    const g = ctx.createLinearGradient(canvas.width * 0.1, canvas.height * 0.05, canvas.width * 0.85, canvas.height);
    g.addColorStop(0, rgba(LIGHT, 0.16 * o.rim));
    g.addColorStop(0.42, rgba(LIGHT, 0));
    g.addColorStop(0.62, rgba(SHADOW, 0.12));
    g.addColorStop(1, rgba(SHADOW, 0.42));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    edgeBand(src, TO_LIGHT.x * u * 1.2, TO_LIGHT.y * u * 1.2, RIM, (band) => {
      ctx.globalAlpha = o.rim;
      ctx.drawImage(band, 0, 0);
    });
    edgeBand(src, -TO_LIGHT.x * u * 2, -TO_LIGHT.y * u * 2, SHADOW, (band) => {
      ctx.globalAlpha = o.rim * 0.8;
      ctx.drawImage(band, 0, 0);
    });
    solidInk(src, INK, (ink) => {
      ctx.globalCompositeOperation = 'destination-over';
      ctx.globalAlpha = 1;
      const base = o.line * u;
      for (let i = 0; i < 20; i++) {
        const a = (i / 20) * Math.PI * 2;
        const toShadow = Math.max(0, -(Math.cos(a) * TO_LIGHT.x + Math.sin(a) * TO_LIGHT.y));
        const r = base * (0.45 + 1.05 * toShadow);
        ctx.drawImage(ink, Math.cos(a) * r, Math.sin(a) * r);
      }
    });
    ctx.restore();
  });
}

/**
 * Paints a figure on a layer of its own at the target's resolution, gives
 * it its rim light and silhouette, and lays it onto `ctx` (whose transform,
 * a flip included, is respected). `ground` paints straight onto `ctx`
 * first: the contact shadow, which must not be outlined.
 */
export function finished(ctx: CanvasRenderingContext2D, o: Finish, ground: () => void, figure: (layer: CanvasRenderingContext2D) => void): void {
  ground();
  const u = unitPx(ctx);
  const w = Math.ceil(FRAME_W * u);
  const h = Math.ceil(FRAME_H * u);
  withScratch(w, h, (layer, canvas) => {
    layer.setTransform(u, 0, 0, u, (FRAME_W / 2) * u, GROUND_Y * u);
    figure(layer);
    finishLayer(canvas, layer, u, o);
    ctx.drawImage(canvas, -FRAME_W / 2, -GROUND_Y, FRAME_W, FRAME_H);
  });
}

const GROUND_DARK = '#140d09';

/** A soft contact shadow on the ground, plus a darker core right under the feet. */
export function groundShadow(d: Draw, cx: number, rx: number, ry: number): void {
  const ctx = d.pen.ctx;
  const ring = (k: number): Pt[] => Array.from({ length: 28 }, (_, i) => ({ x: cx + Math.cos((i / 28) * Math.PI * 2) * rx * k, y: 0.6 + Math.sin((i / 28) * Math.PI * 2) * ry * k }));
  soft(ctx, ry * 0.8, () => d.pen.fill(ring(1), GROUND_DARK, 0.3));
  soft(ctx, ry * 0.4, () => d.pen.fill(ring(0.7), GROUND_DARK, 0.3));
}
