import { createRng, type Rng } from '../logic/rng';

export const INK = '#1b1a1f';
export const PAPER = '#f4eddc';

export interface Pt {
  x: number;
  y: number;
}

/**
 * A wobbly fountain-pen imitation. Every stroke is jittered and
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
   * Polyline through points, smoothed, with pressure-varying width.
   * `retrace` adds a faint second pass (the pen went over it twice):
   * nice on contours, noise on hairline detail.
   */
  stroke(points: readonly Pt[], width: number, color = INK, alpha = 1, retrace = true): void {
    if (points.length < 2) return;
    const pts = points.map((p) => ({ x: p.x + this.jitter(), y: p.y + this.jitter() }));
    this.trace(pts, width, color, alpha);
    if (!retrace) return;
    const ghost = pts.map((p) => ({ x: p.x + this.jitter(0.6), y: p.y + this.jitter(0.6) }));
    this.trace(ghost, width * 0.45, color, alpha * 0.22);
  }

  /** Fine single-pass line for interior detail (no re-trace, less wobble). */
  hair(points: readonly Pt[], width: number, color = INK, alpha = 0.85): void {
    if (points.length < 2) return;
    const pts = points.map((p) => ({ x: p.x + this.jitter(0.35), y: p.y + this.jitter(0.35) }));
    this.trace(pts, width, color, alpha);
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

  /** Runs `draw` with drawing clipped to a closed shape. */
  clipped(clip: readonly Pt[], draw: () => void): void {
    this.ctx.save();
    pathOf(this.ctx, clip);
    this.ctx.clip();
    draw();
    this.ctx.restore();
  }

  private trace(pts: readonly Pt[], width: number, color: string, alpha: number): void {
    const { ctx } = this;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1]!;
      const b = pts[i]!;
      // Pressure: thinner at stroke ends, thicker mid-stroke.
      const t = i / pts.length;
      ctx.lineWidth = Math.max(0.3, width * (0.6 + 0.55 * Math.sin(Math.PI * t)) * (1 + this.jitter(0.12)));
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      const mx = (a.x + b.x) / 2 + this.jitter(0.2);
      const my = (a.y + b.y) / 2 + this.jitter(0.2);
      ctx.quadraticCurveTo(mx, my, b.x, b.y);
      ctx.stroke();
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

  /** Parallel hatching clipped to a closed shape. */
  hatch(clip: readonly Pt[], spacing: number, angle: number, width: number, opts: HatchOpts = {}): void {
    const { ctx } = this;
    const xs = clip.map((p) => p.x);
    const ys = clip.map((p) => p.y);
    const minX = Math.min(...xs) - 20;
    const maxX = Math.max(...xs) + 20;
    const minY = Math.min(...ys) - 20;
    const maxY = Math.max(...ys) + 20;
    const span = Math.hypot(maxX - minX, maxY - minY);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const dir = { x: Math.cos(angle), y: Math.sin(angle) };
    const nrm = { x: -dir.y, y: dir.x };
    ctx.save();
    pathOf(ctx, clip);
    ctx.clip();
    for (let off = -span / 2; off < span / 2; off += spacing + this.jitter(spacing * 0.2)) {
      const ox = cx + nrm.x * off;
      const oy = cy + nrm.y * off;
      if (opts.onlyBelow !== undefined && oy < opts.onlyBelow) continue;
      const len = span / 2;
      this.trace(
        [
          { x: ox - dir.x * len, y: oy - dir.y * len },
          { x: ox + dir.x * len, y: oy + dir.y * len },
        ],
        width,
        opts.color ?? INK,
        opts.alpha ?? 0.8,
      );
    }
    ctx.restore();
  }

  dot(x: number, y: number, r: number, color = INK, alpha = 1): void {
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + this.jitter(0.4), y + this.jitter(0.4), Math.max(0.4, r), 0, Math.PI * 2);
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
