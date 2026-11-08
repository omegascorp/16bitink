import type { Rng } from '../../logic/rng';
import { polar, SHADOW } from '../groundKit';
import { bezier, closed, type Draw, pt } from '../kit';
import { PAPER_FILL } from '../palette';
import { pathOf, type Pt, withScratch } from '../pen';
import { rgba } from '../wash';

/**
 * Painting helpers shared by the birds (crow, hawk, hen), after InkGecko's
 * magpie and owl: feather blades, soft wet-in-wet glazes, a solid cast
 * shadow, rim light, form modelling, and a coat of small overlapping
 * feathers laid over a shape. Local units, light from the upper left.
 */

/** A feather or leaf: its outline, and the point t of the way out, w across its midline. */
export interface Blade {
  readonly shape: Pt[];
  readonly at: (t: number, w: number) => Pt;
}

/** A frame along `ang` from `root`, its midline bowed sideways by `bend`·len at the tip. */
function frameOf(root: Pt, ang: number, len: number, bend: number): (t: number, w: number) => Pt {
  const dir = pt(Math.cos(ang), Math.sin(ang));
  const nrm = pt(-dir.y, dir.x);
  return (t, w) => {
    const across = w + bend * len * t * t;
    return pt(root.x + dir.x * len * t + nrm.x * across, root.y + dir.y * len * t + nrm.y * across);
  };
}

/** A feather: narrow at its root, broad and rounded at its tip (`round` < 1 squares it off a little). */
export function petalBlade(root: Pt, ang: number, len: number, width: number, bend = 0, n = 14): Blade {
  const at = frameOf(root, ang, len, bend);
  const half = (t: number): number => {
    const k = 0.62;
    return (width / 2) * (t < k ? 0.22 + 0.78 * Math.sin((Math.PI / 2) * (t / k)) : Math.sqrt(Math.max(0, 1 - ((t - k) / (1 - k)) ** 2)));
  };
  const ts = Array.from({ length: n + 1 }, (_, i) => i / n);
  const shape = [...ts.map((t) => at(t, half(t))), ...[...ts].reverse().slice(1, -1).map((t) => at(t, -half(t)))];
  return { shape, at };
}

/** A pointed blade (a primary's emarginated tip, a hackle): widest a third of the way, tapering to a point. */
export function lanceBlade(root: Pt, ang: number, len: number, width: number, bend = 0): Blade {
  const at = frameOf(root, ang, len, bend);
  const shape = [...bezier(at(0, width * 0.15), at(0.4, width * 0.62), at(1, 0), 10), ...bezier(at(1, 0), at(0.4, -width * 0.62), at(0, -width * 0.15), 10).slice(1)];
  return { shape, at };
}

/** A blade whose every point goes through `f` (mirrored, swept, turned). */
export function mapBlade(b: Blade, f: (p: Pt) => Pt): Blade {
  return { shape: b.shape.map(f), at: (t, w) => f(b.at(t, w)) };
}

/** A rotated ellipse. */
export function ellipseAt(cx: number, cy: number, rx: number, ry: number, rot = 0, n = 24): Pt[] {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const x = Math.cos(a) * rx;
    const y = Math.sin(a) * ry;
    return pt(cx + x * c - y * s, cy + x * s + y * c);
  });
}

/** A soft-edged glaze: `color` at `alpha` in the middle of an ellipse, fading to nothing at its edge (wet-in-wet). */
export function glaze(d: Draw, cx: number, cy: number, rx: number, ry: number, rot: number, color: string, alpha: number): void {
  const { ctx } = d.pen;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(0.55, rgba(color, alpha * 0.85));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
  ctx.restore();
}

/** Whether p lies inside the closed polygon. */
export function inside(poly: readonly Pt[], p: Pt): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!;
    const b = poly[j]!;
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) hit = !hit;
  }
  return hit;
}

/** The middle of a shape's bounding box, and its half extents. */
export function boxOf(shape: readonly Pt[]): { cx: number; cy: number; rx: number; ry: number; x0: number; y0: number; x1: number; y1: number } {
  const xs = shape.map((p) => p.x);
  const ys = shape.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, rx: (x1 - x0) / 2, ry: (y1 - y0) / 2, x0, y0, x1, y1 };
}

/** One soft shadow for a set of shapes, laid solid on a spare layer first so overlaps don't darken. */
export function shadowOf(d: Draw, shapes: readonly (readonly Pt[])[], dist: number, alpha: number): void {
  const { ctx } = d.pen;
  withScratch(ctx.canvas.width, ctx.canvas.height, (layer, canvas) => {
    layer.setTransform(ctx.getTransform());
    layer.fillStyle = d.ink;
    for (const s of shapes) {
      pathOf(layer, s.map((p) => pt(p.x + SHADOW.x * dist, p.y + SHADOW.y * dist)));
      layer.fill();
    }
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = alpha;
    ctx.drawImage(canvas, 0, 0);
    ctx.restore();
  });
}

/** A light along the upper-left rim of a shape, from inside it. */
export function rimLight(d: Draw, shape: readonly Pt[], colour: string, w = 1.2, alpha = 0.6): void {
  d.pen.clipped(shape, () => d.pen.stroke(closed(shape.map((p) => pt(p.x + 1.1, p.y + 1.5))), w, colour, alpha, false));
}

/**
 * Volume over a feathered mass: a wash of `dark` and diagonal hatching in
 * the crescent turned from the light, a pale bloom where it falls, a pen
 * contour (heavier on the shadow side).
 */
export function model(d: Draw, shape: readonly Pt[], k: number, dark: string, o: { shade?: number; hatch?: number; lit?: number; line?: number } = {}): void {
  const { pen } = d;
  pen.crescent(shape, pt(-SHADOW.x * k, -SHADOW.y * k), () => pen.fill(shape, dark, o.shade ?? 0.32));
  if ((o.hatch ?? 0.3) > 0) pen.crescent(shape, pt(-SHADOW.x * k * 0.6, -SHADOW.y * k * 0.6), () => pen.hatch(shape, 1.9, 0.9, 0.38, { color: d.ink, alpha: o.hatch ?? 0.3 }));
  if ((o.lit ?? 0.22) > 0) pen.crescent(shape, pt(SHADOW.x * k * 0.6, SHADOW.y * k * 0.6), () => pen.fill(shape, PAPER_FILL, o.lit ?? 0.22));
  if ((o.line ?? 1.2) > 0) pen.stroke(closed(shape), o.line ?? 1.2, d.ink, 0.95);
}

/** A shape's edge broken into soft scallops (feather tips), `depth` out from its centre, about `step` apart. */
export function scalloped(shape: readonly Pt[], step: number, depth: number): Pt[] {
  const cx = shape.reduce((a, p) => a + p.x, 0) / shape.length;
  const cy = shape.reduce((a, p) => a + p.y, 0) / shape.length;
  const ring = closed(shape);
  const pts: Pt[] = [];
  let carry = 0;
  for (let i = 0; i + 1 < ring.length; i++) {
    const a = ring[i]!;
    const b = ring[i + 1]!;
    const l = Math.hypot(b.x - a.x, b.y - a.y);
    for (let s = carry; s < l; s += step) pts.push(pt(a.x + ((b.x - a.x) * s) / l, a.y + ((b.y - a.y) * s) / l));
    carry = (carry - l) % step;
    if (carry < 0) carry += step;
  }
  return pts.flatMap((p, i) => {
    const q = pts[(i + 1) % pts.length]!;
    const m = pt((p.x + q.x) / 2, (p.y + q.y) / 2);
    const l = Math.hypot(m.x - cx, m.y - cy) || 1;
    return bezier(p, pt(m.x + ((m.x - cx) / l) * depth * 2, m.y + ((m.y - cy) / l) * depth * 2), q, 3).slice(0, -1);
  });
}

/** One small feather of a coat: its blade, size, angle and a random draw for its tone. */
export interface CoatFeather {
  readonly f: Blade;
  readonly s: number;
  readonly a: number;
  readonly r: number;
}

/**
 * A coat of small feathers over `shape`: `n` blades tipped along dir(p),
 * laid so the ones nearer the front lie over those behind (as a bird's
 * feathers overlap), each painted by `paint`, clipped to the shape.
 * `ruffle` throws them askew.
 */
export function coat(d: Draw, shape: readonly Pt[], rng: Rng, o: { dir: (p: Pt) => number; n: number; size: number; ruffle?: number; paint: (c: CoatFeather) => void }): void {
  const pts: { p: Pt; a: number; key: number }[] = [];
  const b = boxOf(shape);
  const ruffle = o.ruffle ?? 0;
  for (let tries = 0; pts.length < o.n && tries < o.n * 6; tries++) {
    const p = pt(b.x0 + rng() * (b.x1 - b.x0), b.y0 + rng() * (b.y1 - b.y0));
    if (!inside(shape, p)) continue;
    const base = o.dir(p);
    pts.push({ p, a: base + (rng() - 0.5) * (0.3 + ruffle * 1.6), key: -(p.x * Math.cos(base) + p.y * Math.sin(base)) });
  }
  pts.sort((u, v) => u.key - v.key);
  d.pen.clipped(shape, () => {
    for (const { p, a } of pts) {
      const s = o.size * (0.8 + rng() * 0.45);
      const f = petalBlade(polar(p, a + Math.PI, s * 0.35), a, s, s * 0.8, (rng() - 0.5) * 0.12, 10);
      o.paint({ f, s, a, r: rng() });
    }
  });
}

/** Options for one flight feather. */
export interface VaneOpts {
  /** The feather's wash and its strength. */
  readonly base: string;
  readonly alpha?: number;
  /** The crescent of shade along its far side. */
  readonly deep: string;
  /** Soft glazes along it, root to tip (sheen, warmth). */
  readonly glazes?: readonly string[];
  readonly glazeAlpha?: number;
  /** Dark bars across it. */
  readonly bars?: number;
  readonly bar?: string;
  readonly barAlpha?: number;
  /** A band of colour across the tip, from `tipFrom` of the way out. */
  readonly tip?: string;
  readonly tipFrom?: number;
  readonly tipAlpha?: number;
  /** A pale edge round the tip. */
  readonly fringe?: string;
  /** Shaft and barbs. */
  readonly shaft: string;
  readonly barbs?: string;
  readonly barbAlpha?: number;
  /** A light along its lit edge. */
  readonly lit?: string;
  readonly line?: number;
  readonly lineAlpha?: number;
}

/** One flight feather painted along its blade: wash, glazes, bars, tip, shade, barbs, shaft and a fine contour. */
export function vane(d: Draw, f: Blade, w: number, o: VaneOpts): void {
  const { pen } = d;
  pen.fill(f.shape, PAPER_FILL, 1);
  pen.fill(f.shape, o.base, o.alpha ?? 0.9);
  pen.clipped(f.shape, () => {
    (o.glazes ?? []).forEach((c, i, all) => {
      const p = f.at((i + 0.6) / (all.length + 0.2), w * 0.12);
      glaze(d, p.x, p.y, w * 1.1, w * 0.7, 0, c, o.glazeAlpha ?? 0.35);
    });
    const bars = o.bars ?? 0;
    for (let i = 0; i < bars; i++) {
      const u = 0.22 + (i / bars) * 0.66;
      pen.fill([f.at(u - 0.035, -w), f.at(u, w), f.at(u + 0.05, w), f.at(u + 0.015, -w)], o.bar ?? o.deep, o.barAlpha ?? 0.45);
    }
    if (o.tip) {
      const t0 = o.tipFrom ?? 0.8;
      pen.fill([f.at(t0, -w), f.at(t0 + 0.04, w), f.at(1.2, w), f.at(1.2, -w)], o.tip, o.tipAlpha ?? 0.75);
    }
    pen.crescent(f.shape, pt(-1.1, -1.5), () => pen.fill(f.shape, o.deep, 0.4));
    if (o.barbs) {
      for (let t = 0.16; t < 0.9; t += 0.12) {
        for (const s of [1, -1]) pen.hair([f.at(t, 0), f.at(t + 0.07, s * w * 0.42)], 0.25, o.barbs, o.barbAlpha ?? 0.3);
      }
    }
    if (o.lit) pen.hair(Array.from({ length: 7 }, (_, i) => f.at(0.12 + i * 0.12, -w * 0.4)), 0.55, o.lit, 0.4);
  });
  if (o.fringe) pen.hair(f.shape.slice(Math.floor(f.shape.length * 0.3), Math.ceil(f.shape.length * 0.7)), 0.6, o.fringe, 0.55);
  pen.hair(Array.from({ length: 7 }, (_, i) => f.at(0.02 + i * 0.14, 0)), 0.45, o.shaft, 0.75);
  pen.stroke(closed(f.shape), o.line ?? 0.7, d.ink, o.lineAlpha ?? 1, false);
}

/** A loose feather drifting off at c, turned to `ang`, painted by `paint`, with its shadow far below. */
export function looseFeather(d: Draw, c: Pt, ang: number, len: number, paint: (f: Blade, w: number) => void): void {
  const w = len * 0.34;
  const root = polar(c, ang + Math.PI, len / 2);
  const f = petalBlade(root, ang, len, w, 0.14);
  d.pen.fill(f.shape.map((p) => pt(p.x + SHADOW.x * 7, p.y + SHADOW.y * 7)), d.ink, 0.12);
  paint(f, w);
  for (const [t, s] of [[0.45, 1], [0.68, -1]] as const) d.pen.hair([f.at(t, s * w * 0.08), f.at(t + 0.1, s * w * 0.55)], 0.55, PAPER_FILL, 0.85);
  d.pen.hair([root, polar(root, ang + Math.PI - 0.2, 3)], 0.7, d.ink, 0.95);
}

/** A few swept strokes where something moved fast: speed in a still. */
export function swish(d: Draw, from: Pt, ang: number, len: number, bow: number, alpha = 0.7): void {
  const to = polar(from, ang, len);
  const mid = polar(polar(from, ang, len / 2), ang + Math.PI / 2, bow);
  const line = bezier(from, mid, to, 8);
  d.pen.stroke(line, 2.2, PAPER_FILL, 0.3, false);
  d.pen.hair(line, 0.8, d.ink, alpha);
}
