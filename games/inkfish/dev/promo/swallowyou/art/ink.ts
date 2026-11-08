import { INK, Pen, type Pt } from '../../../../src/art/pen';
import { BOIL_FPS, BOIL_FRAMES } from '../../../../src/art/textures';
import { createRng } from '../../../../src/logic/rng';

/**
 * Painting tools for this video's new drawings, in the game's pen and ink
 * painted like the humpback in ../../kayak/whale.ts: a wash through colour
 * stops, soft blotches like wet paint drying unevenly, hatching on the
 * shadowed side only, and a wobbly inked contour that boils 8 times a second.
 */

export type { Pt };

export const boilOf = (t: number): number => Math.floor(t * BOIL_FPS + 1e-9) % BOIL_FRAMES;

export const penFor = (ctx: CanvasRenderingContext2D, seed: number, boil: number, wobble = 1.2): Pen => new Pen(ctx, seed * 131 + boil * 977, wobble);

export const range = (n: number, f: (u: number) => Pt): Pt[] => Array.from({ length: n + 1 }, (_, i) => f(i / n));

/** A smooth curve through points (Catmull-Rom), `steps` points per span. */
export function spline(points: readonly Pt[], steps = 6, closed = false): Pt[] {
  const n = points.length;
  if (n < 3) return [...points];
  const at = (i: number): Pt => (closed ? points[((i % n) + n) % n]! : points[Math.max(0, Math.min(n - 1, i))]!);
  const out: Pt[] = [];
  const spans = closed ? n : n - 1;
  for (let i = 0; i < spans; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    for (let k = 0; k < steps; k++) {
      const s = k / steps;
      const s2 = s * s;
      const s3 = s2 * s;
      const f = (a: number, b: number, c: number, d: number): number => 0.5 * (2 * b + (-a + c) * s + (2 * a - 5 * b + 4 * c - d) * s2 + (-a + 3 * b - 3 * c + d) * s3);
      out.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) });
    }
  }
  if (!closed) out.push(points[n - 1]!);
  return out;
}

export const rot = (p: Pt, a: number, about: Pt = { x: 0, y: 0 }): Pt => {
  const dx = p.x - about.x;
  const dy = p.y - about.y;
  return { x: about.x + dx * Math.cos(a) - dy * Math.sin(a), y: about.y + dx * Math.sin(a) + dy * Math.cos(a) };
};

export function trace(ctx: CanvasRenderingContext2D, pts: readonly Pt[], close = true): void {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  if (close) ctx.closePath();
}

interface Blot { readonly u: number; readonly v: number; readonly r: number; readonly light: boolean; readonly a: number }

const blots = new Map<number, readonly Blot[]>();
function blotsFor(seed: number): readonly Blot[] {
  const hit = blots.get(seed);
  if (hit) return hit;
  const rng = createRng(seed);
  const made = Array.from({ length: 70 }, () => ({ u: rng(), v: rng(), r: 0.04 + rng() * 0.1, light: rng() < 0.45, a: 0.08 + rng() * 0.14 }));
  blots.set(seed, made);
  return made;
}

export interface PaintOpts {
  /** The wash runs from `from` to `to` through `stops`. */
  readonly from: Pt;
  readonly to: Pt;
  readonly stops: readonly string[];
  /** Contour width (0 for none), the hatching's spacing, and how strong it is. */
  readonly ink?: number;
  readonly hatch?: number;
  readonly hatchAlpha?: number;
  /** Mottling, fixed to the shape (not the boil). */
  readonly mottle?: number;
  readonly seed?: number;
}

/** A shape, painted: the wash, mottled, hatched on its shadowed side (towards `to`), inked round. */
export function paint(ctx: CanvasRenderingContext2D, pen: Pen, outline: readonly Pt[], o: PaintOpts): void {
  const g = ctx.createLinearGradient(o.from.x, o.from.y, o.to.x, o.to.y);
  o.stops.forEach((c, i) => g.addColorStop(i / Math.max(1, o.stops.length - 1), c));
  const xs = outline.map((p) => p.x);
  const ys = outline.map((p) => p.y);
  const box = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  const size = Math.max(box.w, box.h);
  ctx.save();
  trace(ctx, outline);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  const mottle = o.mottle ?? 1;
  if (mottle > 0) {
    for (const m of blotsFor(o.seed ?? 7)) {
      const x = box.x + m.u * box.w;
      const y = box.y + m.v * box.h;
      const r = m.r * size * 0.6;
      const blot = ctx.createRadialGradient(x, y, 0, x, y, r);
      blot.addColorStop(0, m.light ? `rgba(225,225,205,${(m.a * mottle).toFixed(3)})` : `rgba(10,12,8,${(m.a * mottle).toFixed(3)})`);
      blot.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = blot;
      ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    }
  }
  ctx.restore();
  const spacing = o.hatch ?? 0;
  if (spacing > 0) {
    const len = Math.hypot(o.to.x - o.from.x, o.to.y - o.from.y) || 1;
    const d = { x: (o.to.x - o.from.x) / len, y: (o.to.y - o.from.y) / len };
    const n = { x: -d.y, y: d.x };
    const start = { x: o.from.x + d.x * len * 0.62, y: o.from.y + d.y * len * 0.62 };
    const far = size * 2;
    const band = [
      { x: start.x - n.x * far, y: start.y - n.y * far }, { x: start.x + n.x * far, y: start.y + n.y * far },
      { x: start.x + n.x * far + d.x * far, y: start.y + n.y * far + d.y * far }, { x: start.x - n.x * far + d.x * far, y: start.y - n.y * far + d.y * far },
    ];
    pen.clipped(outline, () => pen.hatch(band, spacing, Math.atan2(d.y, d.x) + 1.1, Math.max(0.6, spacing * 0.12), { color: '#0b0d09', alpha: o.hatchAlpha ?? 0.3 }));
  }
  if ((o.ink ?? 2.6) > 0) pen.stroke([...outline, outline[0]!], o.ink ?? 2.6, INK, 1, true);
}

/** A soft round glow (light in water, a lamp). */
export function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, rgba: string, alpha: number): void {
  if (alpha <= 0 || r <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba.replace('A', String(alpha)));
  g.addColorStop(1, rgba.replace('A', '0'));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
}
