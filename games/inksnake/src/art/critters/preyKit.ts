import { createRng } from '../../logic/rng';
import { closed, type Draw, pt } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { mix, rgba } from '../wash';

/**
 * Painting helpers shared by the prey (mouse, rat, frog, egg), adapted from
 * InkGecko's props kit and its cat and frog bosses: soft glazes, washes
 * rounded by light from the upper left, fur hairs lying along a coat and a
 * furry contour. Local units are board px, origin at the frame centre.
 */

/** Where shadows fall: away from a light at the upper left. */
export const SHADOW_DIR = pt(0.55, 0.84);

/** A rotated ellipse. */
export function ellipseAt(cx: number, cy: number, rx: number, ry: number, rot: number, n = 18): Pt[] {
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

/** The shape's shadow on the ground, `off` down and to the right. */
export function castShadow(d: Draw, shape: readonly Pt[], off: Pt, alpha: number): void {
  d.pen.fill(shape.map((p) => pt(p.x + off.x, p.y + off.y)), d.ink, alpha);
}

const flipY = (pts: readonly Pt[]): Pt[] => pts.map((p) => pt(p.x, -p.y));
/** A closed outline from its +y half, traced from the front of the midline to the back of it. */
export const bilateral = (half: readonly Pt[]): Pt[] => [...half, ...flipY(half).reverse().slice(1, -1)];

/** The size of a shape's bounding box: its larger side. */
export function sizeOf(shape: readonly Pt[]): number {
  const xs = shape.map((p) => p.x);
  const ys = shape.map((p) => p.y);
  return Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
}

/** Paper, a wash, a pale bloom where the light falls, the colour deepening on the shadow side. */
export function skinWash(d: Draw, shape: readonly Pt[], wash: string, deep: string, light?: { at: Pt; r: number }, depth = 0.42): void {
  const { pen } = d;
  const size = sizeOf(shape);
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, wash, 0.93);
  pen.clipped(shape, () => {
    if (light) glaze(d, light.at.x, light.at.y, light.r, light.r * 0.6, -0.5, mix(wash, PAPER_FILL, 0.55), 0.55);
    pen.crescent(shape, pt(-size * 0.07, -size * 0.11), () => pen.fill(shape, deep, depth));
  });
}

/** How a coat lies at a point (an angle) and what colour a hair there is (`r` is a random 0..1). */
export interface Coat {
  readonly dir: (p: Pt) => number;
  readonly color: (p: Pt, r: number) => string;
}

/** Short pen hairs over a shape, lying along its coat; `n` of them about `len` long, placed by `seed`. */
export function hairs(d: Draw, shape: readonly Pt[], coat: Coat, n: number, seed: number, len: number, w = 0.3, alpha = 0.75): void {
  const { pen } = d;
  const rng = createRng(seed);
  const xs = shape.map((p) => p.x);
  const ys = shape.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  pen.clipped(shape, () => {
    for (let i = 0; i < n; i++) {
      const p = pt(x0 + rng() * (x1 - x0), y0 + rng() * (y1 - y0));
      const a = coat.dir(p) + (rng() - 0.5) * 0.35;
      const l = len * (0.7 + rng() * 0.6);
      const q = pt(p.x + Math.cos(a) * l, p.y + Math.sin(a) * l);
      const m = pt((p.x + q.x) / 2 + Math.cos(a + 1.57) * l * 0.1, (p.y + q.y) / 2 + Math.sin(a + 1.57) * l * 0.1);
      pen.hair([p, m, q], w, coat.color(p, rng()), alpha);
    }
  });
}

/**
 * A furry contour: a pen line round the shape, with small hairs flicking
 * out across it so the edge reads soft, more of them on the shadow side.
 * `tuft` scales their length (a rougher coat has longer ones).
 */
export function furEdge(d: Draw, shape: readonly Pt[], w: number, seed: number, every = 2, tuft = 1, alpha = 0.85): void {
  const { pen } = d;
  pen.stroke(closed(shape), w, d.ink, alpha);
  const rng = createRng(seed);
  const n = shape.length;
  const c = shape.reduce((s, p) => pt(s.x + p.x / n, s.y + p.y / n), pt(0, 0));
  for (let i = 0; i < n; i += every) {
    const p = shape[i]!;
    const r = Math.hypot(p.x - c.x, p.y - c.y) || 1;
    const o = pt((p.x - c.x) / r, (p.y - c.y) / r);
    const shade = o.x * SHADOW_DIR.x + o.y * SHADOW_DIR.y;
    if (rng() > 0.4 + shade * 0.4) continue;
    const l = (0.7 + rng() * 0.9) * tuft;
    const back = rng() < 0.5 ? -1 : 1;
    pen.hair([pt(p.x - o.x * 0.8, p.y - o.y * 0.8), pt(p.x + o.x * l - o.y * 0.5 * back, p.y + o.y * l + o.x * 0.5 * back)], w * 0.4, d.ink, 0.55);
  }
}

/** A glossy black bead of an eye, with a crisp glint towards the light and a faint rim light opposite. */
export function beadEye(d: Draw, c: Pt, r: number): void {
  const { pen } = d;
  const ball = ellipseAt(c.x, c.y, r, r * 0.86, 0, 14);
  pen.fill(ball, '#151319', 1);
  pen.dot(c.x - r * 0.32, c.y - r * 0.34, r * 0.34, PAPER_FILL, 0.95);
  pen.dot(c.x + r * 0.38, c.y + r * 0.36, r * 0.13, PAPER_FILL, 0.55);
}
