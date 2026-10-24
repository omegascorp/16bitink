import { makeDraw, oval, type Draw } from '../kit';
import { makeCanvas, pathOf, type Pt } from '../pen';
import { mix, rgba } from '../wash';
import { FRAME_H, FRAME_W, GROUND_Y } from './types';

/**
 * Painting for the Crown's infantry (spearman, bowman, swordsman, monk),
 * in the manner of an oil study under late-afternoon light: each part is
 * laid in in its local colour (deep, never pastel), a small warm light
 * rolls in from the upper left, a deep umber core shadow turns the form,
 * a little warm light is bounced back into its edge, pigment pools at the
 * rim, hatching sits in the shadow and a fine umber pen line finishes it.
 * The whole figure is then finished together: a warm/umber light pass, a
 * warm rim of light on its lit edges (so it reads on a dark field) and one
 * fine ink silhouette, firmer only on the shadow side.
 */

/** Warm late-afternoon light from the upper left. */
export const LIGHT = '#f3d6a2';
/** Deep shadow: umber leaning violet, as a painter mixes it (never grey). */
export const SHADOW = '#1f141a';
/** Warm light bounced back up from the ground into a shadow. */
export const BOUNCE = '#8a6a52';
/** The warm rim of light caught along the lit edges. */
export const RIM = '#e9c08a';
/** The brightest a highlight gets: warm ivory, never white. */
export const IVORY = '#ece0c2';
/** Every pen line in these figures is this much of the old cartoon weight. */
const LINE_K = 0.62;
/** Which way the light comes from: up and to the left. */
export const TO_LIGHT: Pt = { x: -0.55, y: -0.84 };

interface Box {
  readonly x0: number;
  readonly y0: number;
  readonly w: number;
  readonly h: number;
}

function boxOf(shape: readonly Pt[]): Box {
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
function blurs(ctx: CanvasRenderingContext2D): boolean {
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

/** Fills the part of `shape` that `shape` moved by (dx, dy) doesn't cover: the crescent on the far side. */
function crescentFill(ctx: CanvasRenderingContext2D, shape: readonly Pt[], dx: number, dy: number, color: string, alpha: number, blur: number): void {
  ctx.save();
  pathOf(ctx, shape);
  ctx.clip();
  soft(ctx, blur, () => {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    for (const ring of [shape, shape.map((p) => ({ x: p.x + dx, y: p.y + dy }))]) {
      ring.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.closePath();
    }
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
  /** A hard, glossy surface (steel): a sharper highlight and a crisper terminator. */
  readonly gloss?: boolean;
  /** Pen line width (0 for none). */
  readonly line?: number;
  readonly lineAlpha?: number;
}

/**
 * One part, painted: paper, the body colour, a highlight where the light
 * falls, a soft core shadow on the far side, the light bounced back into
 * its edge, pigment pooled round the rim, hatching in the shadow and a pen line.
 */
export function paint(d: Draw, shape: readonly Pt[], color: string, o: PaintOpts = {}): void {
  const { pen } = d;
  const ctx = pen.ctx;
  const b = boxOf(shape);
  const size = Math.max(1, Math.max(b.w, b.h));
  const minor = Math.max(1, Math.min(b.w, b.h));
  const shadow = o.shadow ?? 0.5;
  // The local colour, laid in solid; `alpha` below 1 lets it sink a touch towards shadow.
  pen.fill(shape, mix(color, SHADOW, (1 - (o.alpha ?? 0.92)) * 1.2), 1);
  pen.clipped(shape, () => {
    const lx = b.x0 + b.w * 0.3;
    const ly = b.y0 + b.h * 0.22;
    const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, size * 0.8);
    const lit = mix(color, LIGHT, o.gloss ? 0.55 : 0.3);
    g.addColorStop(0, rgba(lit, o.gloss ? 0.9 : 0.75));
    g.addColorStop(o.gloss ? 0.2 : 0.42, rgba(lit, 0.22));
    g.addColorStop(1, rgba(lit, 0));
    ctx.globalAlpha = 1;
    ctx.fillStyle = g;
    ctx.fillRect(b.x0 - 1, b.y0 - 1, b.w + 2, b.h + 2);
  });
  if (shadow > 0) {
    const k = minor * 0.45;
    crescentFill(ctx, shape, TO_LIGHT.x * k, TO_LIGHT.y * k, mix(color, SHADOW, 0.68), 0.82 * shadow, o.gloss ? minor * 0.04 : minor * 0.12);
    const r = minor * 0.09;
    crescentFill(ctx, shape, TO_LIGHT.x * r, TO_LIGHT.y * r, mix(color, BOUNCE, 0.4), 0.38 * shadow, minor * 0.04);
  }
  pen.clipped(shape, () => {
    soft(ctx, minor * 0.05, () => {
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = mix(color, SHADOW, 0.55);
      ctx.lineWidth = Math.min(2.2, minor * 0.16);
      pathOf(ctx, shape);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
  });
  const hatch = o.hatch ?? 0.2;
  if (hatch > 0 && shadow > 0) {
    const s = Math.max(1.1, size / 26);
    const k = minor * 0.3;
    const hatchInk = mix(d.ink, SHADOW, 0.3);
    pen.crescent(shape, { x: TO_LIGHT.x * k, y: TO_LIGHT.y * k }, () => pen.hatch(shape, s, 0.9, 0.22, { color: hatchInk, alpha: hatch * 1.2 }));
    if (o.cross) {
      const c = minor * 0.16;
      pen.crescent(shape, { x: TO_LIGHT.x * c, y: TO_LIGHT.y * c }, () => pen.hatch(shape, s * 1.1, -0.55, 0.2, { color: hatchInk, alpha: hatch }));
    }
  }
  const line = (o.line ?? 0.6) * LINE_K;
  if (line > 0) pen.stroke([...shape, shape[0]!], line, d.ink, o.lineAlpha ?? 0.85);
}

/** A thin painted highlight along a curve: the glint on steel. */
export function gleam(d: Draw, pts: readonly Pt[], w: number, alpha = 0.9): void {
  soft(d.pen.ctx, w * 0.25, () => d.pen.stroke(pts, w * 0.85, IVORY, alpha, false));
}

/** A soft wash dabbed over a shape (a cast shadow, a blush), feathered at its edge. */
export function dab(d: Draw, shape: readonly Pt[], color: string, alpha: number, blur: number): void {
  soft(d.pen.ctx, blur, () => d.pen.fill(shape, color, alpha));
}

/** A radial glow (the monk's holy light). */
export function glow(ctx: CanvasRenderingContext2D, c: Pt, r: number, color: string, alpha: number): void {
  ctx.save();
  const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, r);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(c.x - r, c.y - r, r * 2, r * 2);
  ctx.restore();
}

function layer(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  return makeCanvas(Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
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

/** Below this alpha a pixel is a glow's halo, not the figure: it isn't outlined. */
const SOLID_FROM = 90;
const SOLID_TO = 170;

/** The figure's solid pixels in ink, ramped smoothly so the outline stays antialiased. */
function solidInk(src: HTMLCanvasElement, ink: string): HTMLCanvasElement {
  const out = layer(src.width, src.height);
  out.ctx.drawImage(src, 0, 0);
  const img = out.ctx.getImageData(0, 0, src.width, src.height);
  const n = parseInt(ink.slice(1), 16);
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

/** Warm over the lit upper left of the figure, cool over its lower right. */
function lightPass(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-atop';
  const g = ctx.createLinearGradient(w * 0.2, h * 0.1, w * 0.8, h * 0.95);
  g.addColorStop(0, 'rgba(250, 206, 140, 0.13)');
  g.addColorStop(0.42, 'rgba(250, 206, 140, 0)');
  g.addColorStop(0.58, 'rgba(31, 20, 26, 0)');
  g.addColorStop(1, 'rgba(31, 20, 26, 0.3)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** A warm rim light on the lit edges, a deep shade on the far ones, and one fine ink silhouette firming on the shadow side. */
function finish(canvas: HTMLCanvasElement, unit: number, ink: string, line: number, rim: number): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const src = layer(canvas.width, canvas.height);
  src.ctx.drawImage(canvas, 0, 0);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-atop';
  ctx.globalAlpha = rim;
  ctx.drawImage(edgeBand(src.canvas, TO_LIGHT.x * unit * 0.6, TO_LIGHT.y * unit * 0.6, RIM), 0, 0);
  ctx.globalAlpha = rim * 0.7;
  ctx.drawImage(edgeBand(src.canvas, -TO_LIGHT.x * unit * 1.8, -TO_LIGHT.y * unit * 1.8, SHADOW), 0, 0);
  const solid = solidInk(src.canvas, ink);
  ctx.globalCompositeOperation = 'destination-over';
  ctx.globalAlpha = 1;
  const base = line * unit;
  const steps = 20;
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const toShadow = Math.max(0, -(Math.cos(a) * TO_LIGHT.x + Math.sin(a) * TO_LIGHT.y));
    const r = base * (0.55 + 1.15 * toShadow);
    ctx.drawImage(solid, Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.restore();
}

export interface FigureOpts {
  /** Half-width of the contact shadow on the ground. */
  readonly shadowRx: number;
  /** Silhouette line, in units, on the lit side. */
  readonly line?: number;
  readonly rim?: number;
  /** Drawn after the finish, so it isn't outlined (a glow's halo). */
  readonly after?: (d: Draw) => void;
}

/**
 * Paints a figure on a layer of its own (unflipped, in the frame's units at
 * the target's resolution), finishes it as a whole and lays it over a soft
 * contact shadow on `ctx`, under whatever transform (and flip) `ctx` has.
 */
export function infantryFigure(ctx: CanvasRenderingContext2D, seed: number, f: number, o: FigureOpts, draw: (d: Draw) => void): void {
  const unit = Math.max(1, unitPx(ctx));
  const { canvas, ctx: lc } = layer(FRAME_W * unit, FRAME_H * unit);
  lc.scale(unit, unit);
  lc.translate(FRAME_W / 2, GROUND_Y);
  const d = makeDraw(lc, seed + f, f, 0);
  draw(d);
  lightPass(lc, canvas.width, canvas.height);
  finish(canvas, unit, d.ink, o.line ?? 0.48, o.rim ?? 0.5);
  if (o.after) o.after(d);
  // The contact shadow: a soft pool under the feet, darker at its heart.
  const ground = makeDraw(ctx, seed + f, f, 0);
  soft(ctx, 1.6, () => {
    ground.pen.fill(oval(2, 0.6, o.shadowRx, 3.4, 28), SHADOW, 0.22);
    ground.pen.fill(oval(0.5, 0.2, o.shadowRx * 0.55, 1.8, 24), SHADOW, 0.3);
  });
  ctx.drawImage(canvas, -FRAME_W / 2, -GROUND_Y, FRAME_W, FRAME_H);
}
