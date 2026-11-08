import type { Snake } from './snake';
import { dist, pt, type Pt } from './vec';

/** Body samples tested, every this many (samples are 4 px apart: still far closer than any creature is wide). */
const STRIDE = 2;
/** Push-out passes: one can push a creature into another stretch of body where it's tightly coiled. */
const PASSES = 2;

/**
 * Keeps a creature of radius `r` at `p` off the snake's body: the body is
 * solid ground for whatever walks or swims at its level. The neck is left
 * out, so the head can still reach what it eats and what bites it. Returns
 * the creature's new place and the push's direction, or null if it was
 * clear. A creature is pushed out on the side it's on, so one inside a
 * loop of body stays inside it.
 */
export function pushOffBody(snake: Snake, p: Pt, r: number): { readonly p: Pt; readonly n: Pt } | null {
  const pts = snake.trail.pts;
  const end = Math.min(snake.trail.count, pts.length);
  const reach = r + snake.width / 2;
  let q = p;
  let n: Pt | null = null;
  for (let pass = 0; pass < PASSES; pass++) {
    let moved = false;
    for (let i = snake.neck; i < end; i += STRIDE) {
      const s = pts[i]!;
      const d = dist(q, s);
      if (d >= reach) continue;
      // Dead on a sample: out sideways from the body's own line.
      const next = pts[Math.min(end - 1, i + 1)]!;
      const ux = d > 1e-6 ? (q.x - s.x) / d : -(next.y - s.y) / (dist(next, s) || 1);
      const uy = d > 1e-6 ? (q.y - s.y) / d : (next.x - s.x) / (dist(next, s) || 1);
      q = pt(s.x + ux * reach, s.y + uy * reach);
      n = pt(ux, uy);
      moved = true;
    }
    if (!moved) break;
  }
  return n ? { p: q, n } : null;
}
