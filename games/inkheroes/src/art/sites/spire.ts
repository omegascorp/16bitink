import type { Rng } from '../../logic/rng';
import { bezier, closed, pt, type Draw } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { CROWN_GOLD, DEPTH, frontArc, roundWash } from './build';
import { gleam, LIGHT, mix, SHADOW } from './paintKit';

/**
 * Conical roofs for round towers (the Crown's blue spires, the windmill's
 * cap): a slightly concave cone over the drum's top, shaded round, laid
 * with rows of scalloped slates, a gilt band at the eave and a finial.
 */
export function cone(d: Draw, rng: Rng, top: Pt, r: number, rise: number, color: string, trim: string | null = CROWN_GOLD): Pt {
  const { pen } = d;
  const apex = pt(top.x, top.y - rise);
  const arc = frontArc(top.x, top.y, r, 20);
  const shape = [
    ...bezier(apex, pt(top.x - r * 0.28, top.y - rise * 0.32), arc[0]!, 12),
    ...arc.slice(1),
    ...bezier(arc[arc.length - 1]!, pt(top.x + r * 0.28, top.y - rise * 0.32), apex, 12).slice(1, -1),
  ];
  roundWash(d, shape, top.x - r, top.x + r, color, 0.32);
  // Where along a row: the cone's width at height fraction t (concave, as the outline).
  const half = (t: number): number => {
    const u = 1 - t;
    return r * (u * u + 2 * u * t * 0.28);
  };
  pen.clipped(shape, () => {
    const rows = Math.max(3, Math.round(rise / 3.4));
    for (let k = 1; k < rows; k++) {
      const t = k / rows;
      const rr = half(t);
      const cy = top.y - rise * t;
      const a = frontArc(top.x, cy, rr, 14);
      pen.hair(a, 0.42, d.ink, 0.42);
      const n = Math.max(3, Math.round(rr / 1.7));
      for (let i = 0; i < n; i++) {
        const s = ((i + (k % 2) * 0.5 + 0.25) / n) * Math.PI;
        const x = top.x - rr * Math.cos(s);
        const y = cy + rr * DEPTH * Math.sin(s);
        pen.hair([pt(x, y), pt(x + (apex.x - x) * 0.06, y + (rise / rows) * 0.85)], 0.35, d.ink, 0.35);
        if (rng() < 0.25) pen.dot(x + 0.6, y + 1.2, 0.9, rng() < 0.5 ? mix(color, LIGHT, 0.5) : mix(color, SHADOW, 0.5), 0.35);
      }
    }
  });
  // A sheen down the lit flank.
  gleam(d, bezier(pt(top.x - r * 0.5, top.y + 0.5), pt(top.x - r * 0.28, top.y - rise * 0.4), pt(apex.x - 0.4, apex.y + rise * 0.15), 8), 0.7, 0.35);
  if (trim) {
    const band = [...frontArc(top.x, top.y - 1.4, r * 0.97, 16), ...frontArc(top.x, top.y, r, 16).reverse()];
    pen.fill(band, trim, 0.95);
    pen.hair(frontArc(top.x, top.y - 1.3, r * 0.97, 16), 0.4, mix(trim, SHADOW, 0.5), 0.9);
  }
  pen.stroke(closed(shape), 0.7, d.ink, 0.95);
  return apex;
}

/** A gilt ball on a spike at a roof's apex. */
export function finial(d: Draw, apex: Pt, h = 3): Pt {
  const { pen } = d;
  pen.stroke([apex, pt(apex.x, apex.y - h)], 0.7, d.ink, 0.95, false);
  pen.dot(apex.x, apex.y - h * 0.45, 1.1, CROWN_GOLD, 1);
  pen.dot(apex.x - 0.35, apex.y - h * 0.45 - 0.35, 0.4, PAPER_FILL, 0.85);
  return pt(apex.x, apex.y - h);
}
