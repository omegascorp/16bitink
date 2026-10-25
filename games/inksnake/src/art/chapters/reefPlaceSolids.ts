import type { Pt } from '../../logic/vec';
import { blob, polar, SHADOW } from '../groundKit';
import { type Draw, edge, pt, shade, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import { specks } from '../places/farmGroundParts';
import { mix } from '../wash';
import { ALGAE, glazeAt, rngAt, SAND_DEEP } from './reefPlaceKit';

/** The reef's beach rock, from above: grey pitted limestone on the cays (the coral heads are in reefPlaceCoral.ts). */
const ROCK = '#bdb4a0';
const ROCK_DEEP = '#7c7262';

/** A beach rock on a cay: pitted grey limestone, shaded and hatched, a little weed at its foot, its shadow on the sand. */
export function beachRock(d: Draw, c: Pt, r: number): void {
  const { pen } = d;
  const rng = rngAt(c.x, c.y, 11);
  const shape = blob(c, r, r * (0.75 + rng() * 0.2), rng, 0.22, 24, rng() * TAU);
  pen.fill(shape.map((p) => pt(p.x + SHADOW.x * r * 0.45, p.y + SHADOW.y * r * 0.45)), mix(SAND_DEEP, d.ink, 0.3), 0.35);
  specks(d, ALGAE, 0.5, Array.from({ length: Math.round(r * 2) }, () => {
    const q = polar(c, rng() * TAU, r * (0.85 + rng() * 0.3));
    return [q.x, q.y, 0.5 + rng() * 0.7] as const;
  }));
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, ROCK, 0.85);
  pen.clipped(shape, () => {
    glazeAt(pen.ctx, c.x - r * 0.3, c.y - r * 0.3, r * 0.7, r * 0.5, 0, PAPER_FILL, 0.4);
    pen.crescent(shape, pt(-SHADOW.x * r * 0.4, -SHADOW.y * r * 0.4), () => pen.fill(shape, ROCK_DEEP, 0.35));
    for (let k = 0; k < Math.round(r * 1.4); k++) {
      const p = polar(c, rng() * TAU, Math.sqrt(rng()) * r * 0.9);
      const s = 0.5 + rng() * 1.1;
      pen.dot(p.x + 0.4, p.y + 0.5, s, PAPER_FILL, 0.5);
      pen.dot(p.x, p.y, s, ROCK_DEEP, 0.75);
    }
  });
  shade(d, shape, 0.45, true);
  edge(d, shape, 1.4, 0.95);
}
