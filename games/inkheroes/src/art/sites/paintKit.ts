import { createRng, type Rng } from '../../logic/rng';
import { closed, makeDraw, oval, pt, TAU, type Draw } from '../kit';
import { PAPER_FILL } from '../palette';
import { pathOf, type Pt } from '../pen';
import { mix, rgba } from '../wash';

/**
 * Painting for the map's sites, after InkMine's sprite painting
 * (inkmine/src/art/paint.ts): each part is laid in as a watercolour study,
 * a body colour with the light rolling in from the upper left, a soft core
 * shadow on the far side with a little light bounced back into it, pigment
 * pooled at the wash's edge, hatching in the shadow and a fine pen line.
 * `sprite` paints a whole site on a layer of its own and finishes it with a
 * rim of light and one weighted ink silhouette, heavier on the shadow side,
 * over its soft shadow on the ground.
 */

/** Warm light from the upper left. */
export const LIGHT = '#ffe2b0';
/** Deep shadow: umber warmed with a touch of violet, as an old master mixes it. */
export const SHADOW = '#22140f';
/** Light bounced up from the ground into a shadow. */
export const BOUNCE = '#8a7556';
/** Towards the light (up and to the left), and the way shadows fall. */
export const TO_LIGHT: Pt = { x: -0.55, y: -0.84 };
export const DOWN: Pt = { x: 0.55, y: 0.84 };

export { mix, rgba };

export const polar = (c: Pt, a: number, r: number): Pt => pt(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r);
export const shift = (shape: readonly Pt[], dx: number, dy: number): Pt[] => shape.map((p) => pt(p.x + dx, p.y + dy));

/** A rough round outline (a stone, a heap, a bush). */
export function blob(c: Pt, rx: number, ry: number, rng: Rng, rough = 0.12, n = 22, turn = 0): Pt[] {
  const [p1, p2, p3] = [rng() * TAU, rng() * TAU, rng() * TAU];
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * TAU;
    const k = 1 + rough * (0.55 * Math.sin(a * 2 + p1) + 0.3 * Math.sin(a * 3 + p2) + 0.15 * Math.sin(a * 5 + p3));
    const x = Math.cos(a) * rx * k;
    const y = Math.sin(a) * ry * k;
    return pt(c.x + x * cos - y * sin, c.y + x * sin + y * cos);
  });
}

/** A polygon with extra points along its sides, so the pen (which smooths through its points) keeps them straight. */
export function crisp(poly: readonly Pt[], step = 4): Pt[] {
  const out: Pt[] = [];
  poly.forEach((a, i) => {
    const b = poly[(i + 1) % poly.length]!;
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / step));
    for (let k = 0; k < n; k++) out.push(pt(a.x + ((b.x - a.x) * k) / n, a.y + ((b.y - a.y) * k) / n));
  });
  return out;
}

/** An open polyline with extra points along it (straight segments, sharp-ish joints). */
export function run(pts: readonly Pt[], step = 4): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / step));
    for (let k = 0; k < n; k++) out.push(pt(a.x + ((b.x - a.x) * k) / n, a.y + ((b.y - a.y) * k) / n));
  }
  out.push(pts[pts.length - 1]!);
  return out;
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

function unitPx(ctx: CanvasRenderingContext2D): number {
  const m = ctx.getTransform();
  return Math.hypot(m.a, m.b) || 1;
}

let canBlur: boolean | null = null;

/** Runs `draw` with a soft edge of `r` drawing units (no blur where the canvas can't). */
export function soft(ctx: CanvasRenderingContext2D, r: number, draw: () => void): void {
  if (canBlur === null) {
    ctx.filter = 'blur(2px)';
    canBlur = ctx.filter === 'blur(2px)';
    ctx.filter = 'none';
  }
  if (r <= 0 || !canBlur) {
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
    for (const ring of [shape, shift(shape, dx, dy)]) {
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
  /** A hard, glossy surface: a sharper highlight and a crisper terminator. */
  readonly gloss?: boolean;
  /** Pen line width (0 for none). */
  readonly line?: number;
  readonly lineAlpha?: number;
}

/** A rounded part, painted: paper, body colour, light from the upper left, soft core shadow, bounce, pooled rim, hatching, pen line. */
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
    const k = minor * 0.42;
    crescentFill(ctx, shape, TO_LIGHT.x * k, TO_LIGHT.y * k, mix(color, SHADOW, 0.62), 0.75 * shadow, o.gloss ? minor * 0.04 : minor * 0.12);
    const r = minor * 0.09;
    crescentFill(ctx, shape, TO_LIGHT.x * r, TO_LIGHT.y * r, mix(color, BOUNCE, 0.55), 0.4 * shadow, minor * 0.04);
  }
  pool(d, shape, color, minor);
  if ((o.hatch ?? 0.22) > 0 && shadow > 0) {
    const s = Math.max(1.3, size / 22);
    const k = minor * 0.3;
    pen.crescent(shape, { x: TO_LIGHT.x * k, y: TO_LIGHT.y * k }, () => pen.hatch(shape, s, 0.9, 0.32, { color: d.ink, alpha: o.hatch ?? 0.22 }));
    if (o.cross) {
      const c = minor * 0.16;
      pen.crescent(shape, { x: TO_LIGHT.x * c, y: TO_LIGHT.y * c }, () => pen.hatch(shape, s * 1.1, -0.55, 0.3, { color: d.ink, alpha: (o.hatch ?? 0.22) * 0.9 }));
    }
  }
  const line = o.line ?? 0.6;
  if (line > 0) pen.stroke(closed(shape), line, d.ink, o.lineAlpha ?? 0.9);
}

/** Pigment pooled at the edge of a wash, as watercolour dries. */
export function pool(d: Draw, shape: readonly Pt[], color: string, minor: number, alpha = 0.28): void {
  const { pen } = d;
  const ctx = pen.ctx;
  pen.clipped(shape, () => {
    soft(ctx, minor * 0.05, () => {
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = mix(color, SHADOW, 0.45);
      ctx.lineWidth = Math.min(1.8, minor * 0.16);
      pathOf(ctx, shape);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
  });
}

/**
 * A flat face (a wall, a roof plane), washed: an even body colour lit
 * towards `from` and settling darker towards `to`, the pigment pooled at
 * its edge, hatching when it's turned from the light, and a pen line.
 */
export function flat(d: Draw, shape: readonly Pt[], color: string, o: { readonly tone?: number; readonly hatch?: number; readonly line?: number; readonly from?: Pt; readonly to?: Pt; readonly angle?: number } = {}): void {
  const { pen } = d;
  const ctx = pen.ctx;
  const b = boxOf(shape);
  const tone = o.tone ?? 0;
  const body = tone >= 0 ? mix(color, SHADOW, tone) : mix(color, LIGHT, -tone);
  pen.fill(shape, PAPER_FILL, 1);
  pen.clipped(shape, () => {
    const from = o.from ?? pt(b.x0, b.y0);
    const to = o.to ?? pt(b.x0 + b.w, b.y0 + b.h);
    const g = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
    g.addColorStop(0, rgba(mix(body, LIGHT, 0.35), 0.9));
    g.addColorStop(0.55, rgba(body, 0.9));
    g.addColorStop(1, rgba(mix(body, SHADOW, 0.25), 0.92));
    ctx.fillStyle = g;
    ctx.fillRect(b.x0 - 1, b.y0 - 1, b.w + 2, b.h + 2);
  });
  pool(d, shape, body, Math.max(1, Math.min(b.w, b.h)), 0.22);
  if ((o.hatch ?? 0) > 0) pen.hatch(shape, Math.max(1.2, Math.min(2, b.w / 8)), o.angle ?? 1.05, 0.3, { color: d.ink, alpha: o.hatch });
  const line = o.line ?? 0.55;
  if (line > 0) pen.stroke(closed(shape), line, d.ink, 0.85);
}

/** A thin painted highlight along a curve: the glint on metal or glass. */
export function gleam(d: Draw, pts: readonly Pt[], w: number, alpha = 0.9): void {
  soft(d.pen.ctx, w * 0.25, () => d.pen.stroke(pts, w, PAPER_FILL, alpha, false));
}

/** A soft wash dabbed over a shape (grime, soot, moss), feathered at its edge. */
export function dab(d: Draw, shape: readonly Pt[], color: string, alpha: number, blur: number): void {
  soft(d.pen.ctx, blur, () => d.pen.fill(shape, color, alpha));
}

/** A radial glow (a flame, a candle, a lit window). */
export function glow(ctx: CanvasRenderingContext2D, c: Pt, r: number, color: string, alpha: number): void {
  ctx.save();
  const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, r);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(c.x - r, c.y - r, r * 2, r * 2);
  ctx.restore();
}

/** An ink line (open polyline), no retrace. */
export function ink(d: Draw, pts: readonly Pt[], w: number, alpha = 0.9): void {
  d.pen.stroke(pts, w, d.ink, alpha, false);
}

// ---- The finish: rim light and a weighted silhouette, over a soft ground shadow ----

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

function finish(canvas: HTMLCanvasElement, unit: number, inkHex: string, line: number, rim: number): void {
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
  const inked = solidInk(src.canvas, inkHex);
  ctx.globalCompositeOperation = 'destination-over';
  ctx.globalAlpha = 1;
  const base = line * unit;
  const steps = 20;
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * TAU;
    const toShadow = Math.max(0, -(Math.cos(a) * TO_LIGHT.x + Math.sin(a) * TO_LIGHT.y));
    const r = base * (0.7 + 0.9 * toShadow);
    ctx.drawImage(inked, Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.restore();
}

export interface Bounds {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

export interface SpriteOpts {
  /** The drawing's extent in local units (the site's frame). */
  readonly bounds: Bounds;
  /** Silhouette line width in units on the lit side. */
  readonly line?: number;
  readonly rim?: number;
  /** Painted on the ground first, outside the silhouette: cast shadows, worn earth, spilt things. */
  readonly ground?: (d: Draw, rng: Rng) => void;
  /** Painted over the finished figure, not outlined: smoke, glows, sparkles. */
  readonly air?: (d: Draw, rng: Rng) => void;
}

/**
 * Paints a site through `draw` on its own layer (same transform as `ctx`,
 * the pen seeded `seed + f`, the shapes' rng seeded by `seed` alone so the
 * boil frames keep their shapes), finishes it and lays it over its ground.
 */
export function sprite(ctx: CanvasRenderingContext2D, seed: number, f: number, o: SpriteOpts, draw: (d: Draw, rng: Rng) => void): void {
  if (o.ground) o.ground(makeDraw(ctx, seed + f + 977, f, 0), createRng(seed * 7 + 13));
  const m = ctx.getTransform();
  const { x0, y0, x1, y1 } = o.bounds;
  const corners = [pt(x0, y0), pt(x1, y0), pt(x0, y1), pt(x1, y1)].map((c) => pt(m.a * c.x + m.c * c.y + m.e, m.b * c.x + m.d * c.y + m.f));
  const px0 = Math.floor(Math.min(...corners.map((c) => c.x)));
  const py0 = Math.floor(Math.min(...corners.map((c) => c.y)));
  const px1 = Math.ceil(Math.max(...corners.map((c) => c.x)));
  const py1 = Math.ceil(Math.max(...corners.map((c) => c.y)));
  const fig = layer(px1 - px0, py1 - py0);
  fig.ctx.setTransform(m.a, m.b, m.c, m.d, m.e - px0, m.f - py0);
  const d = makeDraw(fig.ctx, seed + f, f, 0);
  draw(d, createRng(seed));
  finish(fig.canvas, Math.hypot(m.a, m.b) || 1, d.ink, o.line ?? 0.8, o.rim ?? 0.5);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(fig.canvas, px0, py0);
  ctx.restore();
  if (o.air) o.air(makeDraw(ctx, seed + f + 431, f, 0), createRng(seed * 3 + 5));
}

/** A soft shadow on the ground under a site: a broad faint pool and a darker core. */
export function groundShadow(d: Draw, cx: number, cy: number, rx: number, ry: number, alpha = 0.22): void {
  soft(d.pen.ctx, Math.max(1.5, ry * 0.5), () => {
    d.pen.fill(oval(cx, cy, rx, ry, 30), SHADOW, alpha * 0.7);
    d.pen.fill(oval(cx - rx * 0.08, cy - ry * 0.1, rx * 0.7, ry * 0.55, 26), SHADOW, alpha * 0.6);
  });
}

/** A shape's shadow thrown down and to the right along the ground, softened. */
export function castShadow(d: Draw, shape: readonly Pt[], dx: number, dy: number, alpha = 0.2, blur = 1.6): void {
  soft(d.pen.ctx, blur, () => d.pen.fill(shift(shape, dx, dy), SHADOW, alpha));
}

/** A site frame (types.ts) as drawing bounds in local units. */
export const boundsOf = (fr: { readonly w: number; readonly h: number; readonly ox: number; readonly oy: number }): Bounds => ({ x0: -fr.ox, y0: -fr.oy, x1: fr.w - fr.ox, y1: fr.h - fr.oy });

/** A four-point sparkle (a glint on gold or a gem), painted in the air over a finished site. */
export function sparkle(d: Draw, c: Pt, r: number, alpha = 0.95): void {
  const s = r * 0.22;
  const star = [pt(c.x, c.y - r), pt(c.x + s, c.y - s), pt(c.x + r, c.y), pt(c.x + s, c.y + s), pt(c.x, c.y + r), pt(c.x - s, c.y + s), pt(c.x - r, c.y), pt(c.x - s, c.y - s)];
  glow(d.pen.ctx, c, r * 1.3, LIGHT, 0.5 * alpha);
  d.pen.fill(star, PAPER_FILL, alpha);
}
