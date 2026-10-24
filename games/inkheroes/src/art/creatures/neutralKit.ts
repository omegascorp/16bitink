import { capsule, closed, pt, ribbon, TAU, type Draw } from '../kit';
import { pathOf, type Pt } from '../pen';
import { mix, rgba } from '../wash';

/**
 * Painting for the neutral monsters (goblin, skeleton, bandit), ported from
 * InkMine's sprite painting (inkmine/src/art/paint.ts): each part is laid
 * in like an oil study in low, late light: a deep body colour, the warm
 * light rolling in from the upper left, a dark core shadow on the far side
 * with a little warm light bounced back into its edge, pigment pooled at
 * the rim, hatching in the shadow, then a fine umber pen line. The figure's
 * one silhouette and warm rim light come after, in neutralFinish.ts.
 */

/** Warm late-afternoon light from the upper left. */
export const LIGHT = '#f6d49a';
/** Deep shadow: violet-umber, as a painter mixes it (never grey). */
export const SHADOW = '#22141a';
/** Warm earth light bounced up from the ground into a shadow. */
export const BOUNCE = '#8a6a48';
/** The darkest dark: near-black umber. */
export const UMBER = '#1a120c';
/** Highlights are warm ivory, never white. */
export const IVORY = '#e9dfc6';
/** Pen lines are drawn at this share of the widths the figures ask for: a finishing pen, not an outline. */
export const LINE_K = 0.66;
/** Which way the light comes from: up and to the left. */
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

const shifted = (shape: readonly Pt[], dx: number, dy: number): Pt[] => shape.map((p) => pt(p.x + dx, p.y + dy));

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
    ctx.fill('evenodd');
  });
  ctx.restore();
}

export interface PaintOpts {
  /** Strength of the body colour (0..1). */
  readonly alpha?: number;
  /** Depth of the core shadow (0..1). */
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

/** One part, painted: paper, body colour, light, core shadow, bounce, pooled rim, hatching, pen line. */
export function paint(d: Draw, shape: readonly Pt[], color: string, o: PaintOpts = {}): void {
  const { pen } = d;
  const ctx = pen.ctx;
  const b = boxOf(shape);
  const size = Math.max(1, Math.max(b.w, b.h));
  const minor = Math.max(1, Math.min(b.w, b.h));
  const shadow = o.shadow ?? 0.5;
  pen.fill(shape, mix(color, UMBER, 0.45), 1);
  pen.clipped(shape, () => {
    ctx.globalAlpha = o.alpha ?? 1;
    ctx.fillStyle = color;
    ctx.fillRect(b.x0 - 1, b.y0 - 1, b.w + 2, b.h + 2);
    const lx = b.x0 + b.w * 0.3;
    const ly = b.y0 + b.h * 0.22;
    const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, size * 0.8);
    const lit = mix(color, LIGHT, o.gloss ? 0.62 : 0.34);
    g.addColorStop(0, rgba(lit, o.gloss ? 0.9 : 0.75));
    g.addColorStop(o.gloss ? 0.22 : 0.42, rgba(lit, 0.22));
    g.addColorStop(1, rgba(lit, 0));
    ctx.globalAlpha = 1;
    ctx.fillStyle = g;
    ctx.fillRect(b.x0 - 1, b.y0 - 1, b.w + 2, b.h + 2);
  });
  if (shadow > 0) {
    const k = minor * 0.42;
    crescentFill(ctx, shape, TO_LIGHT.x * k, TO_LIGHT.y * k, mix(color, SHADOW, 0.72), Math.min(1, 0.9 * shadow), o.gloss ? minor * 0.04 : minor * 0.12);
    const r = minor * 0.09;
    crescentFill(ctx, shape, TO_LIGHT.x * r, TO_LIGHT.y * r, mix(color, BOUNCE, 0.38), 0.3 * shadow, minor * 0.04);
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
  const hatch = o.hatch ?? 0.2;
  if (hatch > 0 && shadow > 0) {
    const s = Math.max(1.1, size / 22);
    const k = minor * 0.3;
    pen.crescent(shape, pt(TO_LIGHT.x * k, TO_LIGHT.y * k), () => pen.hatch(shape, s, 0.9, 0.3, { color: d.ink, alpha: hatch }));
    if (o.cross) {
      const c = minor * 0.16;
      pen.crescent(shape, pt(TO_LIGHT.x * c, TO_LIGHT.y * c), () => pen.hatch(shape, s * 1.1, -0.55, 0.28, { color: d.ink, alpha: hatch * 0.9 }));
    }
  }
  const line = o.line ?? 0.6;
  if (line > 0) pen.stroke(closed(shape), line * LINE_K, d.ink, o.lineAlpha ?? 0.85);
}

/** A thin painted highlight along a curve: the glint on metal, a lit ridge. */
export function gleam(d: Draw, pts: readonly Pt[], w: number, alpha = 0.9, color: string = IVORY): void {
  soft(d.pen.ctx, w * 0.25, () => d.pen.stroke(pts, w, color, alpha, false));
}

/** A soft wash dabbed over a shape (grime, rust, a cast shadow), feathered at its edge. */
export function dab(d: Draw, shape: readonly Pt[], color: string, alpha: number, blur: number): void {
  soft(d.pen.ctx, blur, () => d.pen.fill(shape, color, alpha));
}

/** A radial glow (an eye's light). */
export function glow(ctx: CanvasRenderingContext2D, c: Pt, r: number, color: string, alpha: number): void {
  ctx.save();
  const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, r);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(c.x - r, c.y - r, r * 2, r * 2);
  ctx.restore();
}

/** An oval of radii (rx, ry) turned by `rot`. */
export function ovalAt(c: Pt, rx: number, ry: number, rot = 0, n = 20): Pt[] {
  const [cs, sn] = [Math.cos(rot), Math.sin(rot)];
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * TAU;
    const x = Math.cos(a) * rx;
    const y = Math.sin(a) * ry;
    return pt(c.x + x * cs - y * sn, c.y + x * sn + y * cs);
  });
}

/** A closed outline through a few key points, smoothed (Catmull-Rom) so painted fills have no corners. */
export function blob(keys: readonly Pt[], per = 5): Pt[] {
  const n = keys.length;
  const at = (i: number): Pt => keys[((i % n) + n) % n]!;
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    for (let k = 0; k < per; k++) {
      const t = k / per;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push(
        pt(
          0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
          0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
        ),
      );
    }
  }
  return out;
}

/** A tapering tube along a spine with round ends; `w(u)` is its full width at u in 0..1. */
export function roundTube(spine: readonly Pt[], w: (u: number) => number): Pt[] {
  const { top, bot } = ribbon(spine, w);
  // A half circle from one side to the other, bulging out past the end the way `out` points.
  const cap = (c: Pt, from: Pt, out: Pt): Pt[] => {
    const a0 = Math.atan2(from.y - c.y, from.x - c.x);
    const r = Math.hypot(from.x - c.x, from.y - c.y);
    const ao = Math.atan2(out.y, out.x);
    const turn = Math.sin(ao - a0) >= 0 ? Math.PI : -Math.PI;
    return Array.from({ length: 6 }, (_, i) => {
      const a = a0 + (turn * (i + 1)) / 7;
      return pt(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r);
    });
  };
  const n = spine.length - 1;
  const [s0, s1, e0, e1] = [spine[0]!, spine[1]!, spine[n - 1]!, spine[n]!];
  return [...top, ...cap(e1, top[n]!, pt(e1.x - e0.x, e1.y - e0.y)), ...[...bot].reverse(), ...cap(s0, bot[0]!, pt(s0.x - s1.x, s0.y - s1.y))];
}

/** A limb segment from a to b, painted (thigh, shin, forearm). */
export function limb(d: Draw, a: Pt, b: Pt, w0: number, w1: number, color: string, o: PaintOpts = {}): Pt[] {
  const shape = capsule(a, b, w0, w1);
  paint(d, shape, color, { shadow: 0.5, line: 0.6, ...o });
  return shape;
}

/** A ragged hem from a to b: torn points hanging down by `drop`, `n` tatters, fixed by `seed`. */
export function tatters(a: Pt, b: Pt, n: number, drop: number, seed: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n * 2; i++) {
    const t = i / (n * 2);
    const r = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
    const j = r - Math.floor(r);
    const down = i % 2 === 1 ? drop * (0.55 + 0.6 * j) : drop * 0.1 * j;
    out.push(pt(a.x + (b.x - a.x) * t + (i % 2 ? (j - 0.5) * 1.2 : 0), a.y + (b.y - a.y) * t + down));
  }
  return out;
}

/** Stitches: short dashes along a seam. */
export function stitches(d: Draw, from: Pt, to: Pt, n: number, color: string, w = 0.3): void {
  for (let k = 0; k < n; k++) {
    const t0 = (k + 0.2) / n;
    const t1 = (k + 0.65) / n;
    d.pen.hair([pt(from.x + (to.x - from.x) * t0, from.y + (to.y - from.y) * t0), pt(from.x + (to.x - from.x) * t1, from.y + (to.y - from.y) * t1)], w, color, 0.8);
  }
}

/** Fold lines in cloth: fine strokes in the cloth's own shadow colour. */
export function folds(d: Draw, lines: readonly (readonly Pt[])[], color: string, w = 0.45, alpha = 0.75): void {
  const deep = mix(color, SHADOW, 0.65);
  for (const l of lines) d.pen.hair(l, w * 0.85, deep, alpha);
}

/** A rivet or nail head: a small dome, dark below and lit on top. */
export function stud(d: Draw, p: Pt, r: number, color: string): void {
  d.pen.dot(p.x + r * 0.25, p.y + r * 0.3, r, d.ink, 0.6);
  d.pen.dot(p.x, p.y, r * 0.8, color, 1);
  d.pen.dot(p.x - r * 0.25, p.y - r * 0.3, r * 0.38, IVORY, 0.85);
}
