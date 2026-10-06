import { capsule, closed, type Draw, lerp, pt, setae } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';

export interface LimbStyle {
  /** Width at each joint, hip first. */
  readonly widths: readonly number[];
  readonly wash: string;
  /** Darker bands across each segment (as on a ghost crab's legs). */
  readonly band?: string;
  /** Stiff hairs per segment, along the underside; 0 for none. */
  readonly hairs?: number;
  /** Drawn behind the body: darker, softer line, no small detail. */
  readonly far: boolean;
  readonly line?: number;
}

/**
 * One jointed limb, drawn foot first so each segment overlaps the next one
 * out, as an illustrator inks it: paper, wash, darker bands, a shadow line
 * along the underside, hairs, a dark knuckle at each joint, then the contour.
 */
export function limb(d: Draw, joints: readonly Pt[], s: LimbStyle): void {
  const { pen } = d;
  const line = s.line ?? 1;
  for (let i = joints.length - 2; i >= 0; i--) {
    const a = joints[i]!;
    const b = joints[i + 1]!;
    const w0 = s.widths[i]!;
    const w1 = s.widths[i + 1]!;
    const seg = capsule(a, b, w0, w1);
    pen.fill(seg, PAPER_FILL, 1);
    pen.fill(seg, s.wash, s.far ? 0.85 : 0.6);
    if (s.far) pen.fill(seg, d.ink, 0.12);
    if (s.band && w0 > 2) {
      for (const t of [0.42, 0.72]) {
        const c = lerp(a, b, t);
        const w = (w0 + (w1 - w0) * t) * 0.5;
        const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        const nx = -(b.y - a.y) / len;
        const ny = (b.x - a.x) / len;
        pen.hair([pt(c.x + nx * w, c.y + ny * w), pt(c.x - nx * w, c.y - ny * w)], Math.max(0.8, w0 * 0.32), s.band, s.far ? 0.35 : 0.5);
      }
    }
    if (!s.far) {
      // Shadow along the underside of the segment, and its hairs.
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const nx = -(b.y - a.y) / len;
      const ny = (b.x - a.x) / len;
      const side = ny >= 0 ? 1 : -1;
      const off = (k: number): number => (w0 + (w1 - w0) * k) * 0.28 * side;
      pen.hair([pt(a.x + nx * off(0.15) + (b.x - a.x) * 0.15, a.y + ny * off(0.15) + (b.y - a.y) * 0.15), pt(a.x + nx * off(0.85) + (b.x - a.x) * 0.85, a.y + ny * off(0.85) + (b.y - a.y) * 0.85)], Math.max(0.4, w0 * 0.14), d.ink, 0.45);
      if (s.hairs) setae(d, a, b, s.hairs, Math.max(1.6, w0 * 0.8), side as 1 | -1, 0.7);
      if (i > 0) pen.dot(a.x, a.y, w0 * 0.22 + 0.3, d.ink, 0.45);
    }
    pen.stroke(closed(seg), (s.far ? 0.7 : 1) * line, d.ink, s.far ? 0.55 : 1, false);
  }
}
