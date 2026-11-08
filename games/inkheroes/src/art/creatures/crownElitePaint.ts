import { makeDraw, normals, pt, type Draw } from '../kit';
import { INK } from '../palette';
import { makeCanvas, pathOf, shrink, type Pt } from '../pen';
import { mix, rgba } from '../wash';

/**
 * Painting for the Crown's elite sprites (griffin, lancer, seraph, the
 * hero), ported from InkMine's paint.ts: each part is laid in like a
 * watercolour study (body colour, light rolling in from the upper left, a
 * soft core shadow with light bounced into its edge, pigment pooled at the
 * rim, hatching, then a fine pen line), and the whole figure gets a finish
 * pass: a warm rim of light on its lit edges and one weighted ink
 * silhouette, heavier on the shadow side.
 */
/** Warm late-afternoon light from the upper left. */
export const LIGHT = '#f4dcaa';
/** Shadow: a deep violet-umber, never grey or navy. */
export const SHADOW = '#2a1b22';
/** Light bounced up from warm ground into the shadow's edge. */
export const BOUNCE = '#8c6a4c';
/** The warm rim of light on a figure's lit edge, so it reads on a dark field. */
export const RIM = '#f0c47a';
/** Specular glints: warm ivory, never pure white. */
export const GLINT = '#f3e6c6';
/** Pen lines are drawn at this fraction of the width asked: a fine finishing pen, not a cartoon outline. */
const LINE_K = 0.62;
export const TO_LIGHT: Pt = { x: -0.55, y: -0.84 };

export { mix, rgba };

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

/** Runs `draw` with a soft edge of `r` units (no blur where the canvas can't). */
export function soft(ctx: CanvasRenderingContext2D, r: number, draw: () => void): void {
  if (r <= 0 || !blurs(ctx)) {
    draw();
    return;
  }
  ctx.filter = `blur(${(r * unitPx(ctx)).toFixed(2)}px)`;
  draw();
  ctx.filter = 'none';
}

function crescentFill(ctx: CanvasRenderingContext2D, shape: readonly Pt[], dx: number, dy: number, color: string, alpha: number, blur: number): void {
  ctx.save();
  pathOf(ctx, shape);
  ctx.clip();
  soft(ctx, blur, () => {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    for (const ring of [shape, shape.map((p) => pt(p.x + dx, p.y + dy))]) {
      ring.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.closePath();
    }
    ctx.fill('evenodd');
  });
  ctx.restore();
}

export interface PaintOpts {
  readonly alpha?: number;
  /** How deep the core shadow goes (0..1). */
  readonly shadow?: number;
  /** Hatching over the shadow: its alpha (0 for none). */
  readonly hatch?: number;
  readonly cross?: boolean;
  /** Hard, glossy surface (metal): sharper highlight and terminator. */
  readonly gloss?: boolean;
  /** Pen line width (0 for none). */
  readonly line?: number;
  readonly lineAlpha?: number;
  /** Where the light pools, as a fraction of the box (default upper left). */
  readonly lit?: Pt;
}

/** One part, painted as a watercolour study and inked. */
export function paint(d: Draw, shape: readonly Pt[], color: string, o: PaintOpts = {}): void {
  const { pen } = d;
  const ctx = pen.ctx;
  const b = boxOf(shape);
  const size = Math.max(1, Math.max(b.w, b.h));
  const minor = Math.max(1, Math.min(b.w, b.h));
  const shadow = o.shadow ?? 0.5;
  pen.fill(shape, mix(color, SHADOW, 0.25), 1);
  pen.clipped(shape, () => {
    ctx.globalAlpha = o.alpha ?? 0.94;
    ctx.fillStyle = color;
    ctx.fillRect(b.x0 - 1, b.y0 - 1, b.w + 2, b.h + 2);
    const lx = b.x0 + b.w * (o.lit?.x ?? 0.32);
    const ly = b.y0 + b.h * (o.lit?.y ?? 0.24);
    const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, size * (o.gloss ? 0.7 : 0.85));
    const lit = mix(color, LIGHT, o.gloss ? 0.6 : 0.38);
    g.addColorStop(0, rgba(lit, o.gloss ? 0.9 : 0.75));
    g.addColorStop(o.gloss ? 0.18 : 0.45, rgba(lit, o.gloss ? 0.3 : 0.22));
    g.addColorStop(1, rgba(lit, 0));
    ctx.globalAlpha = 1;
    ctx.fillStyle = g;
    ctx.fillRect(b.x0 - 1, b.y0 - 1, b.w + 2, b.h + 2);
  });
  if (shadow > 0) {
    const k = minor * 0.42;
    crescentFill(ctx, shape, TO_LIGHT.x * k, TO_LIGHT.y * k, mix(color, SHADOW, 0.72), Math.min(1, 0.95 * shadow), o.gloss ? minor * 0.04 : minor * 0.12);
    const r = minor * 0.09;
    crescentFill(ctx, shape, TO_LIGHT.x * r, TO_LIGHT.y * r, mix(color, BOUNCE, 0.45), 0.32 * shadow, minor * 0.04);
  }
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
  const hatch = o.hatch ?? 0.2;
  if (hatch > 0 && shadow > 0) {
    const s = Math.max(1.2, size / 24);
    const k = minor * 0.3;
    pen.crescent(shape, pt(TO_LIGHT.x * k, TO_LIGHT.y * k), () => pen.hatch(shape, s, 0.9, 0.3, { color: d.ink, alpha: hatch }));
    if (o.cross) {
      const c = minor * 0.16;
      pen.crescent(shape, pt(TO_LIGHT.x * c, TO_LIGHT.y * c), () => pen.hatch(shape, s * 1.1, -0.55, 0.28, { color: d.ink, alpha: hatch * 0.9 }));
    }
  }
  const line = (o.line ?? 0.6) * LINE_K;
  if (line > 0) pen.stroke([...shape, shape[0]!], line, d.ink, o.lineAlpha ?? 0.85);
}

/** A soft painted highlight along a curve (metal, wet eye, sheen on cloth). */
export function gleam(d: Draw, pts: readonly Pt[], w: number, alpha = 0.9): void {
  soft(d.pen.ctx, w * 0.25, () => d.pen.stroke(pts, w * 0.8, GLINT, alpha, false));
}

/** A soft wash dabbed over a shape, feathered at its edge. */
export function dab(d: Draw, shape: readonly Pt[], color: string, alpha: number, blur: number): void {
  soft(d.pen.ctx, blur, () => d.pen.fill(shape, color, alpha));
}

/** A radial glow. */
export function glow(ctx: CanvasRenderingContext2D, c: Pt, r: number, color: string, alpha: number): void {
  ctx.save();
  const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, r);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(c.x - r, c.y - r, r * 2, r * 2);
  ctx.restore();
}

/** Catmull-Rom through the points, `per` samples a span. */
export function smooth(points: readonly Pt[], per = 6): Pt[] {
  const n = points.length;
  if (n < 3) return [...points];
  const at = (i: number): Pt => points[Math.max(0, Math.min(n - 1, i))]!;
  const out: Pt[] = [];
  for (let i = 0; i < n - 1; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    for (let k = 0; k < per; k++) {
      const t = k / per;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push(pt(
        0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      ));
    }
  }
  out.push(points[n - 1]!);
  return out;
}

/** A joint and its full width there: one key of a limb. */
export type Joint = readonly [x: number, y: number, w: number];

export interface Limb {
  /** The closed outline. */
  readonly shape: Pt[];
  /** Its two long edges (left of travel, right of travel), for inking them apart. */
  readonly a: Pt[];
  readonly b: Pt[];
  readonly spine: Pt[];
}

/**
 * A limb through its joints: the spine smoothed through them and thickened
 * to each joint's width, eased between, with a round cap at the far end.
 */
export function limb(joints: readonly Joint[], per = 6): Limb {
  const spine = smooth(joints.map(([x, y]) => pt(x, y)), per);
  const n = joints.length - 1;
  const width = (i: number): number => {
    const u = (i / (spine.length - 1)) * n;
    const k = Math.min(n - 1, Math.floor(u));
    const t = u - k;
    const e = t * t * (3 - 2 * t);
    return joints[k]![2] + (joints[k + 1]![2] - joints[k]![2]) * e;
  };
  const nr = normals(spine);
  const a = spine.map((p, i) => pt(p.x + nr[i]!.x * width(i) / 2, p.y + nr[i]!.y * width(i) / 2));
  const b = spine.map((p, i) => pt(p.x - nr[i]!.x * width(i) / 2, p.y - nr[i]!.y * width(i) / 2));
  const end = spine[spine.length - 1]!;
  const r = width(spine.length - 1) / 2;
  const ang = Math.atan2(a[a.length - 1]!.y - end.y, a[a.length - 1]!.x - end.x);
  const cap = Array.from({ length: 5 }, (_, i) => pt(end.x + Math.cos(ang - ((i + 1) * Math.PI) / 6) * r, end.y + Math.sin(ang - ((i + 1) * Math.PI) / 6) * r));
  return { shape: [...a, ...cap, ...[...b].reverse()], a, b, spine };
}

/** An outline from a list of points as a smooth closed curve. */
export function blob(points: readonly Pt[], per = 5): Pt[] {
  const n = points.length;
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [points[(i - 1 + n) % n]!, points[i]!, points[(i + 1) % n]!, points[(i + 2) % n]!];
    for (let k = 0; k < per; k++) {
      const t = k / per;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push(pt(
        0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      ));
    }
  }
  return out;
}

/** Shorthand for blob over [x, y] pairs. */
export const shapeOf = (xy: readonly (readonly [number, number])[], per = 5): Pt[] => blob(xy.map(([x, y]) => pt(x, y)), per);
export const lineOf = (xy: readonly (readonly [number, number])[], per = 6): Pt[] => smooth(xy.map(([x, y]) => pt(x, y)), per);

/** The frame a creature may paint in (types.ts), with a margin. */
const FRAME = { x0: -60, y0: -110, x1: 60, y1: 14 } as const;

function edgeBand(src: HTMLCanvasElement, dx: number, dy: number, color: string): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(src.width, src.height);
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = 'destination-out';
  ctx.drawImage(src, -dx, -dy);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}

function solidInk(src: HTMLCanvasElement, ink: string): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(src.width, src.height);
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
  return canvas;
}

function finishLayer(canvas: HTMLCanvasElement, unit: number, line: number, rim: number): void {
  const ctx = canvas.getContext('2d')!;
  const src = makeCanvas(canvas.width, canvas.height);
  src.ctx.drawImage(canvas, 0, 0);
  const lit = edgeBand(src.canvas, TO_LIGHT.x * unit * 0.9, TO_LIGHT.y * unit * 0.9, RIM);
  const dark = edgeBand(src.canvas, -TO_LIGHT.x * unit * 1.6, -TO_LIGHT.y * unit * 1.6, SHADOW);
  const ink = solidInk(src.canvas, INK);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-atop';
  ctx.globalAlpha = rim;
  ctx.drawImage(lit, 0, 0);
  ctx.globalAlpha = rim * 0.55;
  ctx.drawImage(dark, 0, 0);
  ctx.globalCompositeOperation = 'destination-over';
  ctx.globalAlpha = 1;
  const base = line * unit;
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    const toShadow = Math.max(0, -(Math.cos(a) * TO_LIGHT.x + Math.sin(a) * TO_LIGHT.y));
    const r = base * (0.45 + 1.05 * toShadow);
    ctx.drawImage(ink, Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.restore();
  for (const c of [src.canvas, lit, dark, ink]) shrink(c);
}

export interface FinishOpts {
  /** Silhouette width in units on the lit side. */
  readonly line?: number;
  readonly rim?: number;
}

/**
 * Paints a figure on a layer of its own (same transform as `ctx`), gives it
 * the finish (rim light, weighted silhouette), then lays it on `ctx`.
 * `ground` paints straight onto `ctx` first (the contact shadow, which
 * mustn't be outlined).
 */
export function finished(ctx: CanvasRenderingContext2D, seed: number, f: number, figure: (d: Draw) => void, ground?: (d: Draw) => void, o: FinishOpts = {}): void {
  if (ground) ground(makeDraw(ctx, seed + f + 7, f, 0));
  const m = ctx.getTransform();
  const corners = [pt(FRAME.x0, FRAME.y0), pt(FRAME.x1, FRAME.y0), pt(FRAME.x0, FRAME.y1), pt(FRAME.x1, FRAME.y1)].map((p) => pt(m.a * p.x + m.c * p.y + m.e, m.b * p.x + m.d * p.y + m.f));
  const x0 = Math.floor(Math.min(...corners.map((p) => p.x)));
  const y0 = Math.floor(Math.min(...corners.map((p) => p.y)));
  const w = Math.ceil(Math.max(...corners.map((p) => p.x))) - x0;
  const h = Math.ceil(Math.max(...corners.map((p) => p.y))) - y0;
  const layer = makeCanvas(w, h);
  layer.ctx.setTransform(m.a, m.b, m.c, m.d, m.e - x0, m.f - y0);
  figure(makeDraw(layer.ctx, seed + f, f, 0));
  finishLayer(layer.canvas, Math.hypot(m.a, m.b) || 1, (o.line ?? 0.8) * LINE_K, o.rim ?? 0.75);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(layer.canvas, x0, y0);
  ctx.restore();
  shrink(layer.canvas);
}

/** A soft contact shadow on the ground, centred at cx. */
export function groundShadow(d: Draw, cx: number, rx: number, ry = 3.4, alpha = 0.16): void {
  dab(d, blob([pt(cx - rx, 0.4), pt(cx, -ry * 0.6), pt(cx + rx, 0.4), pt(cx, ry + 0.4)], 6), SHADOW, alpha, 1.6);
}
