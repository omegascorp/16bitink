import type { Rng } from '../../logic/rng';
import type { Draw } from '../kit';
import type { Pt } from '../pen';
import type { Surface } from '../sites/build';
import { blob, dab } from '../sites/paintKit';

/**
 * The town's light, shared by its building kits: faces turned from the
 * light go deeper than on the map (the town screen's late, low sun), and
 * weathered stone gathers moss low down and in its joints.
 */

/** A face's tone (0 lit .. 1 dark) deepened when it is turned from the light. */
export const deepen = (tone: number): number => (tone > 0.2 ? Math.min(0.74, tone * 1.38) : tone);

/** Moss and lichen on old stone and roofs. */
export const MOSS = '#4a5a2c';
export const LICHEN = '#6a6a48';

/** Moss creeping up the foot of an old stone face and a few lichen stains higher up, kept inside `clip`. */
export function mossFoot(d: Draw, rng: Rng, at: Surface, w: number, h: number, clip: readonly Pt[]): void {
  d.pen.clipped(clip, () => {
    for (let i = 0; i < Math.max(1, Math.round(w / 26)); i++) {
      const c = at(rng() * w, rng() * Math.min(6, h * 0.25));
      dab(d, blob(c, 3 + rng() * 6, 1.6 + rng() * 2.4, rng, 0.4, 12), MOSS, 0.28, 1.4);
    }
    for (let i = 0; i < Math.round((w * h) / 2600); i++) {
      dab(d, blob(at(rng() * w, h * (0.3 + rng() * 0.6)), 2 + rng() * 3, 1.4 + rng() * 2, rng, 0.4, 10), LICHEN, 0.16, 1.2);
    }
  });
}
