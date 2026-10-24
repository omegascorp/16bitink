import type { Rng } from '../../logic/rng';
import { SHADOW } from '../groundKit';
import { closed, type Draw, pt } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { glaze } from '../propsKit';
import { barredFeather, moonRim, OWL, plumage } from './owlParts';

/**
 * The tawny owl's open wing from above: broad and rounded, the coverts
 * mottled like the back with a row of pale spots, the barred secondaries
 * along the trailing edge and the primaries fanned into fingers at the tip.
 */
export interface WingPose {
  /** Reach from the shoulder to the tip. */
  readonly span: number;
  /** How far the tip sweeps forward (+) or back (−) of the shoulder. */
  readonly sweep: number;
  /** Chord at the root. */
  readonly chord: number;
}

/** Point on the wing (side s = ±1) t of the way out, k across from the leading edge (0) to the trailing edge (1). */
export function wingAt(s: number, w: WingPose): (t: number, k: number) => Pt {
  return (t, k) => {
    const lead = 6 + 6 * Math.sin(Math.PI * Math.min(1, t * 1.1)) + w.sweep * t * t;
    const chord = w.chord * (1 - 0.12 * t) * Math.sqrt(Math.max(0, 1 - t ** 7));
    return pt(lead - chord * k, s * (11 + w.span * t));
  };
}

/** The wing's whole outline. */
export function wingShape(s: number, w: WingPose): Pt[] {
  const at = wingAt(s, w);
  const ts = Array.from({ length: 25 }, (_, i) => i / 24);
  return [...ts.map((t) => at(t, 0)), ...[...ts].reverse().slice(1).map((t) => at(t, 1)), pt(-14, s * 8)];
}

/** One open wing, painted; `alpha` < 1 draws a faint ghost of it (the beat's blur). */
export function paintWing(d: Draw, s: number, w: WingPose, rng: Rng, alpha = 1): void {
  const { pen } = d;
  const at = wingAt(s, w);
  const shape = wingShape(s, w);
  if (alpha < 1) {
    pen.fill(shape, OWL.buff, 0.25 * alpha);
    pen.hair(closed(shape), 0.5, d.ink, 0.6 * alpha);
    return;
  }
  pen.fill(shape.map((p) => pt(p.x + SHADOW.x * 4, p.y + SHADOW.y * 3)), d.ink, 0.12);
  moonRim(d, shape);
  // Flight feathers, the outermost primary first, each overlapping the one beyond it.
  const n = 12;
  for (let i = n - 1; i >= 0; i--) {
    const t = (i + 0.5) / n;
    const primary = t > 0.55;
    const base = at(Math.min(0.9, t * 0.94), 0.3);
    const end = at(Math.min(0.985, t + 0.02), 1);
    const dx = end.x - base.x;
    const dy = end.y - base.y;
    const l = Math.hypot(dx, dy) || 1;
    const extra = primary ? 3 + (t - 0.55) * 14 : 2.5;
    const tip = pt(end.x + (dx / l) * extra, end.y + (dy / l) * extra);
    barredFeather(d, base, tip, primary ? 7 : 8.5, primary ? 4 : 3, 1, ((i * 37) % 7) / 7 * 0.16 - 0.04, i % 3 === 0);
  }
  // Coverts: the front of the wing, mottled, a row of pale spots along the greater coverts.
  const ts = Array.from({ length: 21 }, (_, i) => i / 20);
  const coverts = [...ts.map((t) => at(t, 0)), ...[...ts].reverse().map((t) => at(Math.min(1, t), 0.6 - 0.15 * t * t))];
  pen.fill(coverts, PAPER_FILL, 1);
  pen.fill(coverts, OWL.russet, 0.85);
  plumage(d, coverts, rng, () => Math.PI + s * 0.25, 120, 4.4);
  for (let t = 0.08; t < 0.82; t += 0.075) {
    const p = at(t, 0.5 - 0.12 * t * t);
    pen.fill([pt(p.x - 1.2, p.y - 1.1), pt(p.x + 1.4, p.y - 0.8), pt(p.x + 1.2, p.y + 1.1), pt(p.x - 1.4, p.y + 0.9)], OWL.cream, 0.9);
    pen.hair([pt(p.x - 1.6, p.y), pt(p.x + 1.6, p.y)], 0.3, OWL.dark, 0.5);
  }
  pen.hair(ts.map((t) => at(Math.min(1, t), 0.6 - 0.15 * t * t)), 0.55, d.ink, 0.55);
  // The leading edge is pale and spotted.
  pen.stroke(ts.slice(0, 18).map((t) => at(t, 0.04)), 1.6, OWL.cream, 0.75, false);
  pen.clipped(shape, () => glaze(d, at(0.35, 0.2).x, at(0.35, 0.2).y, 16, 9, 0, PAPER_FILL, 0.18));
  pen.stroke(ts.map((t) => at(t, 0)), 1.25, d.ink, 0.95, false);
}
