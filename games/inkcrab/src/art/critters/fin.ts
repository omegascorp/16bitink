import { type Draw, lerp, pt } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';

export interface FinStyle {
  readonly wash: string;
  /** Wash strength: fins are thinner than the body, so lighter. */
  readonly alpha?: number;
  /** Fin rays drawn from base to edge. */
  readonly rays: number;
  /** Rays stand proud of the membrane as spines by this much (0 for soft fins). */
  readonly spines?: number;
  /** Behind the body: softer line, no rays. */
  readonly far?: boolean;
}

/**
 * A fish's fin between its base (along the body) and its free edge, both
 * running the same way and sampled alike: translucent membrane, fine rays,
 * a light contour along the free edge only.
 */
export function fin(d: Draw, base: readonly Pt[], edge: readonly Pt[], s: FinStyle): Pt[] {
  const { pen } = d;
  const shape = [...base, ...[...edge].reverse()];
  pen.fill(shape, PAPER_FILL, 0.85);
  pen.fill(shape, s.wash, s.alpha ?? 0.5);
  if (s.far) pen.fill(shape, d.ink, 0.12);
  const at = (line: readonly Pt[], t: number): Pt => {
    const k = t * (line.length - 1);
    const i = Math.min(line.length - 2, Math.floor(k));
    return lerp(line[i]!, line[i + 1]!, k - i);
  };
  if (!s.far) {
    for (let r = 0; r < s.rays; r++) {
      const t = (r + 0.5) / s.rays;
      const a = at(base, t);
      const b = at(edge, t);
      const tip = s.spines ? pt(b.x + (b.x - a.x) * s.spines, b.y + (b.y - a.y) * s.spines) : b;
      pen.hair([a, tip], s.spines ? 0.8 : 0.45, d.ink, s.spines ? 0.9 : 0.55);
    }
  }
  pen.stroke(edge, s.far ? 0.6 : 0.8, d.ink, s.far ? 0.5 : 0.85, false);
  return shape;
}
