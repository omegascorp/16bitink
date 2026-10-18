import type { Ray } from './story';

/**
 * Beams of coloured light, as a painter glazes them: a wide soft wash, a
 * brighter band and a near-white core, added onto the dark ('lighter'), so
 * where they cross they mix and glow.
 */
const GLOW: readonly (readonly [number, number])[] = [[120, 0.05], [66, 0.09], [34, 0.18], [14, 0.38], [4, 0.3]];
/** On paper light can't be added, so the beam is painted: a band of colour with a deeper core. */
const PAINT: readonly (readonly [number, number])[] = [[44, 0.22], [30, 0.45], [16, 0.8]];
export type BeamMode = 'glow' | 'paint';

function strokePath(ctx: CanvasRenderingContext2D, pts: readonly { x: number; y: number }[]): void {
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
}

/** A glowing beam along `pts` in `colour`, `width` times the usual. */
export function beam(ctx: CanvasRenderingContext2D, pts: readonly { x: number; y: number }[], colour: string, alpha: number, width = 1, mode: BeamMode = 'glow'): void {
  if (alpha <= 0 || pts.length < 2) return;
  const layers = mode === 'glow' ? GLOW : PAINT;
  ctx.save();
  if (mode === 'glow') ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const base = ctx.globalAlpha;
  layers.forEach(([w, a], i) => {
    ctx.globalAlpha = base * alpha * a;
    ctx.strokeStyle = mode === 'glow' && i === layers.length - 1 ? '#fff8ec' : colour;
    ctx.lineWidth = w * width;
    strokePath(ctx, pts);
    ctx.stroke();
  });
  ctx.restore();
}

/** The drawn part of a ray, from its `from` to its `to` (0 the source, 1 where it lands). */
export function drawRay(ctx: CanvasRenderingContext2D, r: Ray, alpha: number, width = 1, mode: BeamMode = 'glow'): void {
  if (r.to <= r.from) return;
  const at = (u: number): { x: number; y: number } => ({ x: r.sx + (r.hx - r.sx) * u, y: r.sy + (r.hy - r.sy) * u });
  beam(ctx, [at(r.from), at(r.to)], r.colour, alpha, width, mode);
}

/**
 * The bounced ray: from `a` towards `b`, drawn as far as `to`, wobbling
 * like a plucked spring (`wobble` 1 → 0 as it settles), the wobble biggest
 * near the bounce.
 */
export function springPath(a: { x: number; y: number }, b: { x: number; y: number }, to: number, wobble: number, phase: number): { x: number; y: number }[] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l = Math.hypot(dx, dy) || 1;
  const n = { x: -dy / l, y: dx / l };
  const steps = Math.max(2, Math.round(60 * to));
  return Array.from({ length: steps + 1 }, (_, i) => {
    const u = (i / steps) * to;
    const amp = 34 * wobble * Math.exp(-u * 2.5) * Math.sin(u * Math.PI * 9 - phase);
    return { x: a.x + dx * u + n.x * amp, y: a.y + dy * u + n.y * amp };
  });
}
