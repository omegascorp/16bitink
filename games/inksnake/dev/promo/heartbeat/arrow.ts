import type { Pt } from '../sprites';
import { CTA } from './story';

/** The arrow's line, u = 0 at its tail, 1 at its tip: a curve, a little unsteady as a pen line is. */
export function arrowPoint(u: number): Pt {
  const { from, c0, c1, tip } = CTA.arrow;
  const v = 1 - u;
  const k = [v * v * v, 3 * v * v * u, 3 * v * u * u, u * u * u] as const;
  const wob = Math.sin(u * 17) * 2.2 * (1 - u);
  return {
    x: k[0] * from.x + k[1] * c0.x + k[2] * c1.x + k[3] * tip.x + wob,
    y: k[0] * from.y + k[1] * c0.y + k[2] * c1.y + k[3] * tip.y - wob,
  };
}
