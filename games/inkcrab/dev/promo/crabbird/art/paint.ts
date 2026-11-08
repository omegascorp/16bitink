import { makeCanvas, type Pt } from '../../../../src/art/pen';

/**
 * Painting tools for the new animals: gradient washes, soft shadows faked
 * with stacked strokes, flecks, and parts baked once per line-boil frame so
 * only the ink moves. The moon sits up and to the left of the subjects.
 */
export const NIGHT_INK = '#140d24';
export const MOON_RIM = '#d5e4ff';
/** Towards the moon, a unit vector in screen space. */
export const LIGHT: Pt = { x: -0.62, y: -0.78 };

/** A small seeded generator, so every fleck lands in the same place on every frame. */
export function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let z = s;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}

/** A Catmull-Rom curve through `pts`, `n` samples per span; closed shapes wrap round. */
export function spline(pts: readonly Pt[], n = 8, closed = false): Pt[] {
  const at = (i: number): Pt => (closed ? pts[((i % pts.length) + pts.length) % pts.length]! : pts[Math.max(0, Math.min(pts.length - 1, i))]!);
  const spans = closed ? pts.length : pts.length - 1;
  const out: Pt[] = [];
  for (let i = 0; i < spans; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    for (let k = 0; k < n; k++) {
      const u = k / n;
      const [u2, u3] = [u * u, u * u * u];
      out.push({
        x: 0.5 * (2 * p1.x + (p2.x - p0.x) * u + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * u2 + (3 * p1.x - p0.x - 3 * p2.x + p3.x) * u3),
        y: 0.5 * (2 * p1.y + (p2.y - p0.y) * u + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * u2 + (3 * p1.y - p0.y - 3 * p2.y + p3.y) * u3),
      });
    }
  }
  if (!closed) out.push(pts[pts.length - 1]!);
  return out;
}

export function trace(ctx: CanvasRenderingContext2D, pts: readonly Pt[], close = true): void {
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  if (close) ctx.closePath();
}

/** Runs `draw` clipped to a closed shape. */
export function inside(ctx: CanvasRenderingContext2D, pts: readonly Pt[], draw: () => void): void {
  ctx.save();
  trace(ctx, pts);
  ctx.clip();
  draw();
  ctx.restore();
}

/** A soft-edged stroke: wide and faint to narrow and firm. */
export function soft(ctx: CanvasRenderingContext2D, pts: readonly Pt[], width: number, color: string, alpha: number, close = false): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const passes = 6;
  for (let i = 0; i < passes; i++) {
    ctx.globalAlpha = alpha / passes;
    ctx.lineWidth = width * (1 - i / passes);
    trace(ctx, pts, close);
    ctx.stroke();
  }
  ctx.restore();
}

/** A soft round glow or shadow. */
export function blob(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha: number, ry = r, angle = 0): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(1, ry / r);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, color);
  g.addColorStop(1, `${color}00`);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Small irregular flecks of paint across a box. */
export function flecks(
  ctx: CanvasRenderingContext2D, box: { x0: number; y0: number; x1: number; y1: number }, count: number, rnd: () => number,
  colors: readonly string[], rMin: number, rMax: number, alpha: number, keep: (x: number, y: number) => number = () => 1,
): void {
  ctx.save();
  for (let i = 0; i < count; i++) {
    const x = box.x0 + rnd() * (box.x1 - box.x0);
    const y = box.y0 + rnd() * (box.y1 - box.y0);
    const r = rMin + rnd() * rnd() * (rMax - rMin);
    const a = rnd() * Math.PI;
    const squash = 0.45 + rnd() * 0.55;
    const c = colors[Math.floor(rnd() * colors.length)]!;
    if (rnd() > keep(x, y)) continue;
    ctx.globalAlpha = alpha * (0.5 + rnd() * 0.5);
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * squash, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export interface Baked {
  readonly frames: readonly HTMLCanvasElement[];
  /** Local box the canvases cover. */
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  /** Canvas px per local unit. */
  readonly res: number;
}

/** One canvas per boil frame; `paint` draws in local units. */
export function bake(box: { x: number; y: number; w: number; h: number }, res: number, boils: number, paint: (ctx: CanvasRenderingContext2D, boil: number) => void): Baked {
  const frames = Array.from({ length: boils }, (_, f) => {
    const { canvas, ctx } = makeCanvas(Math.ceil(box.w * res), Math.ceil(box.h * res));
    ctx.scale(res, res);
    ctx.translate(-box.x, -box.y);
    paint(ctx, f);
    return canvas;
  });
  return { frames, ...box, res };
}

export function drawBaked(ctx: CanvasRenderingContext2D, b: Baked, boil: number): void {
  ctx.drawImage(b.frames[boil % b.frames.length]!, b.x, b.y, b.w, b.h);
}
