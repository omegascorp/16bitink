import type { Draw } from './kit';
import { pathOf, type Pt } from './pen';
import { PAPER_FILL } from './palette';

/**
 * Painting for sprites, over the pen (kit.ts): each part is laid in like a
 * watercolour study rather than a flat fill: a body colour, the light
 * rolling in from the upper left, a soft core shadow on the far side with
 * a little light bounced back into it, pigment pooled at the wash's edge,
 * then the pen line. `finishSprite` runs over a whole baked figure: a rim
 * of light on its lit edges and one weighted ink silhouette, heavier on the
 * shadow side, so interior lines can stay fine (the line hierarchy an
 * illustrator keeps).
 */

/** Warm light from the glow on the upper left. */
export const LIGHT = '#fff2d8';
/** Cool shadow: indigo, as a painter mixes it (never black). */
export const SHADOW = '#1e2350';
/** Light bounced back up from the ground into a shadow. */
export const BOUNCE = '#b9c3dc';
/** Which way the light comes from: up and to the left. */
export const TO_LIGHT: Pt = { x: -0.55, y: -0.84 };

function rgbOf(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Two colours mixed, `t` of the way from `a` to `b`. */
export function mix(a: string, b: string, t: number): string {
  const [r0, g0, b0] = rgbOf(a);
  const [r1, g1, b1] = rgbOf(b);
  const c = (x: number, y: number): string => Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
  return `#${c(r0, r1)}${c(g0, g1)}${c(b0, b1)}`;
}

/** A colour as rgba() with an alpha, for gradient stops. */
export function rgba(hex: string, a: number): string {
  const [r, g, b] = rgbOf(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

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

/** Canvas px per drawing unit under the current transform. */
function unitPx(ctx: CanvasRenderingContext2D): number {
  const m = ctx.getTransform();
  return Math.hypot(m.a, m.b) || 1;
}

let canBlur: boolean | null = null;

/** Whether this browser blurs on a canvas (Safari before 18 doesn't). */
export function blurs(ctx: CanvasRenderingContext2D): boolean {
  if (canBlur === null) {
    ctx.filter = 'blur(2px)';
    canBlur = ctx.filter === 'blur(2px)';
    ctx.filter = 'none';
  }
  return canBlur;
}

/** Runs `draw` with a soft edge of `r` drawing units (no blur where the canvas can't). */
export function soft(ctx: CanvasRenderingContext2D, r: number, draw: () => void): void {
  if (r <= 0 || !blurs(ctx)) {
    draw();
    return;
  }
  ctx.filter = `blur(${(r * unitPx(ctx)).toFixed(2)}px)`;
  draw();
  ctx.filter = 'none';
}

function shifted(shape: readonly Pt[], dx: number, dy: number): Pt[] {
  return shape.map((p) => ({ x: p.x + dx, y: p.y + dy }));
}

/** Fills the part of `shape` that `shape` moved by (dx, dy) doesn't cover: the crescent on the far side. */
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
    // Evenodd leaves where the two don't overlap; the clip keeps only the part inside the shape.
    ctx.fill('evenodd');
  });
  ctx.restore();
}

export interface PaintOpts {
  /** How strong the body colour is (0..1). */
  readonly alpha?: number;
  /** How deep the core shadow goes (0..1). */
  readonly shadow?: number;
  /** Pen hatching over the shadow: its alpha (0 for none). */
  readonly hatch?: number;
  /** Cross-hatch the darkest edge too. */
  readonly cross?: boolean;
  /** A hard, glossy surface: a sharper highlight and a crisper terminator. */
  readonly gloss?: boolean;
  /** Pen line width (0 for none). */
  readonly line?: number;
  readonly lineAlpha?: number;
}

/**
 * One part, painted: paper, the body colour, a highlight where the light
 * falls, a soft core shadow on the far side, the light bounced back into
 * its edge, pigment pooled round the rim, a little hatching in the shadow
 * and a fine pen line.
 */
export function paint(d: Draw, shape: readonly Pt[], color: string, o: PaintOpts = {}): void {
  const { pen } = d;
  const ctx = pen.ctx;
  const b = boxOf(shape);
  const size = Math.max(1, Math.max(b.w, b.h));
  const minor = Math.max(1, Math.min(b.w, b.h));
  const shadow = o.shadow ?? 0.5;
  pen.fill(shape, PAPER_FILL, 1);
  pen.clipped(shape, () => {
    ctx.globalAlpha = o.alpha ?? 0.9;
    ctx.fillStyle = color;
    ctx.fillRect(b.x0 - 1, b.y0 - 1, b.w + 2, b.h + 2);
    // The light rolling over the form from the upper left.
    const lx = b.x0 + b.w * 0.32;
    const ly = b.y0 + b.h * 0.24;
    const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, size * 0.85);
    const lit = mix(color, LIGHT, o.gloss ? 0.7 : 0.5);
    g.addColorStop(0, rgba(lit, 0.85));
    g.addColorStop(o.gloss ? 0.25 : 0.45, rgba(lit, 0.25));
    g.addColorStop(1, rgba(lit, 0));
    ctx.globalAlpha = 1;
    ctx.fillStyle = g;
    ctx.fillRect(b.x0 - 1, b.y0 - 1, b.w + 2, b.h + 2);
  });
  if (shadow > 0) {
    // Core shadow, then the bounce lifting its very edge.
    const k = minor * 0.42;
    crescentFill(ctx, shape, TO_LIGHT.x * k, TO_LIGHT.y * k, mix(color, SHADOW, 0.62), 0.75 * shadow, o.gloss ? minor * 0.04 : minor * 0.12);
    const r = minor * 0.09;
    crescentFill(ctx, shape, TO_LIGHT.x * r, TO_LIGHT.y * r, mix(color, BOUNCE, 0.55), 0.4 * shadow, minor * 0.04);
  }
  // Pigment pooled at the edge of the wash, as watercolour dries.
  pen.clipped(shape, () => {
    soft(ctx, minor * 0.05, () => {
      ctx.globalAlpha = 0.28;
      ctx.strokeStyle = mix(color, SHADOW, 0.45);
      ctx.lineWidth = Math.min(2.2, minor * 0.16);
      pathOf(ctx, shape);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
  });
  if ((o.hatch ?? 0.22) > 0 && shadow > 0) {
    const s = Math.max(1.4, size / 22);
    const k = minor * 0.3;
    pen.crescent(shape, { x: TO_LIGHT.x * k, y: TO_LIGHT.y * k }, () => pen.hatch(shape, s, 0.9, 0.35, { color: d.ink, alpha: o.hatch ?? 0.22 }));
    if (o.cross) {
      const c = minor * 0.16;
      pen.crescent(shape, { x: TO_LIGHT.x * c, y: TO_LIGHT.y * c }, () => pen.hatch(shape, s * 1.1, -0.55, 0.32, { color: d.ink, alpha: (o.hatch ?? 0.22) * 0.9 }));
    }
  }
  const line = o.line ?? 0.7;
  if (line > 0) pen.stroke([...shape, shape[0]!], line, d.ink, o.lineAlpha ?? 0.9);
}

/** A thin painted highlight along a curve: the glint on metal or glass. */
export function gleam(d: Draw, pts: readonly Pt[], w: number, alpha = 0.9): void {
  const ctx = d.pen.ctx;
  soft(ctx, w * 0.25, () => d.pen.stroke(pts, w, PAPER_FILL, alpha, false));
}

/** A soft wash dabbed over a shape (grime, scorch, glow), feathered at its edge. */
export function dab(d: Draw, shape: readonly Pt[], color: string, alpha: number, blur: number): void {
  const ctx = d.pen.ctx;
  soft(ctx, blur, () => d.pen.fill(shape, color, alpha));
}

/** A radial glow (a lamp, a hot bit, a lit porthole). Its faint halo is left out of the sprite's silhouette (`finishSprite`). */
export function glow(ctx: CanvasRenderingContext2D, c: Pt, r: number, color: string, alpha: number): void {
  ctx.save();
  const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, r);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(c.x - r, c.y - r, r * 2, r * 2);
  ctx.restore();
}

function scratch(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is not available');
  return { canvas, ctx };
}

/** The pixels of `src` whose neighbour `by` px towards (dx, dy) is empty: a band along one side of the figure. */
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

/** Below this alpha a pixel is a glow's halo or a soft edge, not the figure: it isn't outlined. */
const SOLID_FROM = 90;
const SOLID_TO = 170;

/** The figure's solid pixels in ink, ramped smoothly so the outline stays antialiased. */
function solidInk(src: HTMLCanvasElement, ink: string): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const out = scratch(src.width, src.height);
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
  return out;
}

export interface FinishOpts {
  /** Canvas px per drawing unit. */
  readonly unit: number;
  readonly ink: string;
  /** The silhouette line's width in drawing units, on the lit side; the shadow side gets more. */
  readonly line?: number;
  /** How strong the rim of light is. */
  readonly rim?: number;
}

/**
 * The finish over a whole figure, once it's drawn: a rim of warm light on
 * the edges turned to the light, a cool shade along the far edges, and one
 * ink silhouette round everything, swelling on the shadow side.
 */
export function finishSprite(canvas: HTMLCanvasElement, o: FinishOpts): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const u = o.unit;
  const src = scratch(canvas.width, canvas.height);
  src.ctx.drawImage(canvas, 0, 0);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const rim = o.rim ?? 0.6;
  if (rim > 0) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.globalAlpha = rim;
    ctx.drawImage(edgeBand(src.canvas, TO_LIGHT.x * u * 0.9, TO_LIGHT.y * u * 0.9, LIGHT), 0, 0);
    ctx.globalAlpha = rim * 0.55;
    ctx.drawImage(edgeBand(src.canvas, -TO_LIGHT.x * u * 1.6, -TO_LIGHT.y * u * 1.6, SHADOW), 0, 0);
  }
  // The silhouette: the figure in ink, nudged out all round, under the figure.
  const ink = solidInk(src.canvas, o.ink);
  ctx.globalCompositeOperation = 'destination-over';
  ctx.globalAlpha = 1;
  const base = (o.line ?? 0.75) * u;
  const steps = 20;
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const toShadow = Math.max(0, -(Math.cos(a) * TO_LIGHT.x + Math.sin(a) * TO_LIGHT.y));
    const r = base * (0.7 + 0.9 * toShadow);
    ctx.drawImage(ink.canvas, Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.restore();
}
