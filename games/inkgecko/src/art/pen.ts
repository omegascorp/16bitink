import { createRng, type Rng } from '../logic/rng';

export const INK = '#1b1a1f';
export const PAPER = '#f4eddc';

export interface Pt {
  x: number;
  y: number;
}

/**
 * A wobbly pen imitation, copied from InkFish (a candidate for a shared package). Every stroke is jittered and
 * re-traced faintly so lines look hand-drawn; drawing the same shape
 * with a different seed produces the "line boil" frames.
 */
export class Pen {
  readonly rng: Rng;

  constructor(readonly ctx: CanvasRenderingContext2D, seed: number, readonly wobble = 1.2) {
    this.rng = createRng(seed);
  }

  jitter(amount = this.wobble): number {
    return (this.rng() - 0.5) * 2 * amount;
  }

  /**
   * One confident pen stroke through `points`: smoothed into a single
   * curve, swelling and tapering like a dip pen, with a slow drift rather
   * than a shaky hand. `retrace` adds a light partial accent pass along part
   * of it, the way an inker firms up a contour.
   */
  stroke(points: readonly Pt[], width: number, color = INK, alpha = 1, retrace = true): void {
    if (points.length < 2) return;
    const loop = isLoop(points);
    this.ink(points, width, color, alpha, { loop, taper: loop ? 0 : 1, drift: this.wobble });
    if (!retrace || points.length < 4) return;
    const n = points.length;
    const from = Math.floor(this.rng() * n * 0.3);
    const to = Math.max(from + 2, n - Math.floor(this.rng() * n * 0.35));
    this.ink(points.slice(from, to), width * 0.5, color, alpha * 0.3, { loop: false, taper: 1, drift: this.wobble * 0.6 });
  }

  /** Fine line for interior detail: thin, tapered both ends, steadier. */
  hair(points: readonly Pt[], width: number, color = INK, alpha = 0.85): void {
    if (points.length < 2) return;
    this.ink(points, width, color, alpha, { loop: isLoop(points), taper: 1, drift: this.wobble * 0.4 });
  }

  /** Random dots, denser where `density(x, y)` is high (0..1), clipped to a shape. */
  stipple(clip: readonly Pt[], count: number, density: (x: number, y: number) => number, r = 0.55, color = INK): void {
    const { ctx } = this;
    const xs = clip.map((p) => p.x);
    const ys = clip.map((p) => p.y);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    ctx.save();
    pathOf(ctx, clip);
    ctx.clip();
    ctx.fillStyle = color;
    for (let i = 0; i < count; i++) {
      const x = x0 + this.rng() * (x1 - x0);
      const y = y0 + this.rng() * (y1 - y0);
      if (this.rng() > density(x, y)) continue;
      ctx.globalAlpha = 0.55 + this.rng() * 0.4;
      ctx.beginPath();
      ctx.arc(x, y, r * (0.6 + this.rng() * 0.8), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /**
   * Runs `draw` clipped to the part of `clip` not covered by `clip` moved by
   * `shift`: shifted towards the light, that leaves the crescent of core
   * shadow on the far side of a form.
   */
  crescent(clip: readonly Pt[], shift: Pt, draw: () => void): void {
    const { ctx } = this;
    ctx.save();
    pathOf(ctx, clip);
    ctx.clip();
    ctx.beginPath();
    clip.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    clip.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x + shift.x, p.y + shift.y) : ctx.lineTo(p.x + shift.x, p.y + shift.y)));
    ctx.closePath();
    ctx.clip('evenodd');
    draw();
    ctx.restore();
  }

  /** Runs `draw` with drawing clipped to a closed shape. */
  clipped(clip: readonly Pt[], draw: () => void): void {
    this.ctx.save();
    pathOf(this.ctx, clip);
    this.ctx.clip();
    draw();
    this.ctx.restore();
  }

  /**
   * The stroke engine: the points are smoothed (Catmull-Rom), given a slow
   * sideways drift and a width that swells and tapers, then filled as one
   * shape, so a translucent line never darkens where it overlaps itself.
   */
  private ink(points: readonly Pt[], width: number, color: string, alpha: number, o: { loop: boolean; taper: number; drift: number }): void {
    const pts = smooth(o.loop ? points.slice(0, -1) : points, o.loop);
    if (pts.length < 2) return;
    const len: number[] = [0];
    for (let i = 1; i < pts.length; i++) len.push(len[i - 1]! + Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y));
    const total = len[len.length - 1]!;
    if (total < 0.5) {
      this.dot(pts[0]!.x, pts[0]!.y, width / 2, color, alpha);
      return;
    }
    // Slow drift and swell: a couple of long waves, whole cycles on a loop so it closes.
    const cycles = (k: number): number => (o.loop ? Math.max(1, Math.round(total / k)) : Math.max(0.6, total / k));
    const [c1, c2, c3] = [cycles(70), cycles(31), cycles(55)];
    const [p1, p2, p3] = [this.rng() * TAU, this.rng() * TAU, this.rng() * TAU];
    const taperLen = Math.min(total * 0.3, width * 5 + 3);
    // Closed contours are drawn heavier on the side turned from the light (upper left), lighter where it hits.
    const out = o.loop ? Math.sign(signedArea(pts)) || 1 : 0;
    const left: Pt[] = [];
    const right: Pt[] = [];
    for (let i = 0; i < pts.length; i++) {
      const u = len[i]! / total;
      const a = pts[Math.max(0, i - 1)]!;
      const b = pts[Math.min(pts.length - 1, i + 1)]!;
      const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const nx = -(b.y - a.y) / d;
      const ny = (b.x - a.x) / d;
      const drift = o.drift * (0.65 * Math.sin(TAU * c1 * u + p1) + 0.35 * Math.sin(TAU * c2 * u + p2));
      const ends = o.taper > 0 ? Math.min(easeIn(len[i]! / taperLen), easeIn((total - len[i]!) / taperLen)) : 1;
      const shadow = out !== 0 ? 0.6 + 0.85 * Math.max(0, (nx * SHADOW.x + ny * SHADOW.y) * -out) : 1;
      const w = Math.max(0.12, width * shadow * (1 + 0.16 * Math.sin(TAU * c3 * u + p3)) * (0.18 + 0.82 * ends)) / 2;
      const x = pts[i]!.x + nx * drift;
      const y = pts[i]!.y + ny * drift;
      left.push({ x: x + nx * w, y: y + ny * w });
      right.push({ x: x - nx * w, y: y - ny * w });
    }
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    if (o.loop) {
      // A closed contour is a ring: outer edge one way, inner edge back.
      left.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.closePath();
      [...right].reverse().forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.closePath();
      ctx.fill('evenodd');
    } else {
      [...left, ...[...right].reverse()].forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  closed(points: readonly Pt[], width: number, color = INK): void {
    this.stroke([...points, points[0]!], width, color);
  }

  fill(points: readonly Pt[], color: string, alpha: number): void {
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    pathOf(ctx, points);
    ctx.fill();
    ctx.restore();
  }

  /**
   * Hatching: parallel strokes across a closed shape, each starting and
   * stopping just inside its edges with tapered ends and a little variety in
   * length, as drawn by hand rather than ruled.
   */
  hatch(clip: readonly Pt[], spacing: number, angle: number, width: number, opts: HatchOpts = {}): void {
    const xs = clip.map((p) => p.x);
    const ys = clip.map((p) => p.y);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const span = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) + 4;
    const dir = { x: Math.cos(angle), y: Math.sin(angle) };
    const nrm = { x: -dir.y, y: dir.x };
    this.clipped(clip, () => {
      for (let off = -span / 2; off < span / 2; off += spacing * (0.85 + this.rng() * 0.3)) {
        const o = { x: cx + nrm.x * off, y: cy + nrm.y * off };
        for (const [s0, s1] of chords(clip, o, dir)) {
          const inset = (s1 - s0) * 0.08;
          const a = s0 + inset * (0.3 + this.rng());
          const b = s1 - inset * (0.3 + this.rng());
          if (b - a < spacing * 0.6) continue;
          const mid = o.y + dir.y * (a + b) / 2;
          if (opts.onlyBelow !== undefined && mid < opts.onlyBelow) continue;
          this.ink([{ x: o.x + dir.x * a, y: o.y + dir.y * a }, { x: o.x + dir.x * b, y: o.y + dir.y * b }], width, opts.color ?? INK, opts.alpha ?? 0.8, { loop: false, taper: 1, drift: 0.25 });
        }
      }
    });
  }

  dot(x: number, y: number, r: number, color = INK, alpha = 1): void {
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + this.jitter(0.2), y + this.jitter(0.2), Math.max(0.4, r), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  circle(x: number, y: number, r: number, width: number, color = INK): void {
    this.closed(ellipse(x, y, r, r, Math.max(10, Math.round(r))), width, color);
  }
}

export interface HatchOpts {
  onlyBelow?: number;
  color?: string;
  alpha?: number;
}

export function pathOf(ctx: CanvasRenderingContext2D, points: readonly Pt[]): void {
  ctx.beginPath();
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
}

export function ellipse(cx: number, cy: number, rx: number, ry: number, steps = 24): Pt[] {
  return Array.from({ length: steps }, (_, i) => {
    const a = (i / steps) * Math.PI * 2;
    return { x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry };
  });
}

export function makeCanvas(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is not available');
  return { canvas, ctx };
}

const TAU = Math.PI * 2;
/** The direction shadows fall (light comes from the upper left). */
const SHADOW = { x: 0.55, y: 0.84 };

/** Twice the signed area of a closed polyline; its sign gives the winding, so which side is outside. */
function signedArea(pts: readonly Pt[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]!;
    const q = pts[(i + 1) % pts.length]!;
    a += p.x * q.y - q.x * p.y;
  }
  return a;
}

/** Smooth ease from 0 to 1 over t in 0..1 (clamped). */
function easeIn(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

/** Whether a polyline returns to its start: a closed contour. */
function isLoop(points: readonly Pt[]): boolean {
  const a = points[0]!;
  const b = points[points.length - 1]!;
  return points.length > 3 && Math.hypot(a.x - b.x, a.y - b.y) < 0.5;
}

/** Catmull-Rom through the points, resampled about every 1.5 px. */
function smooth(points: readonly Pt[], loop: boolean): Pt[] {
  const n = points.length;
  if (n < 3) return [...points];
  const at = (i: number): Pt => (loop ? points[((i % n) + n) % n]! : points[Math.max(0, Math.min(n - 1, i))]!);
  const out: Pt[] = [];
  const segs = loop ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const steps = Math.max(1, Math.ceil(Math.hypot(p2.x - p1.x, p2.y - p1.y) / 1.5));
    for (let k = 0; k < steps; k++) {
      const t = k / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push({
        x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      });
    }
  }
  out.push(loop ? out[0]! : points[n - 1]!);
  return out;
}

/** Where the line o + s·dir runs inside a closed polygon: [s0, s1] pairs. */
function chords(poly: readonly Pt[], o: Pt, dir: Pt): [number, number][] {
  const hits: number[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    const den = dir.x * ey - dir.y * ex;
    if (Math.abs(den) < 1e-9) continue;
    const t = ((a.x - o.x) * ey - (a.y - o.y) * ex) / den;
    const u = ((a.x - o.x) * dir.y - (a.y - o.y) * dir.x) / den;
    if (u >= 0 && u < 1) hits.push(t);
  }
  hits.sort((x, y) => x - y);
  const out: [number, number][] = [];
  for (let i = 0; i + 1 < hits.length; i += 2) out.push([hits[i]!, hits[i + 1]!]);
  return out;
}
