import { createRng } from '../../logic/rng';
import type { LevelDef } from '../../level/types';
import type { Draw } from '../kit';
import type { Pt } from '../pen';
import { busyOf, distTo, keepsOf, seedOf } from '../places/farmKit';
import { edges, flats, flatsLife, pebbles } from './dunesPlaceGravel';
import { sandOf } from './dunesPlaceKit';
import { crests, reliefOf, ripples, sandGrain, sandWashes } from './dunesPlaceSand';
import { burrow, kratHops, sidewinderTrail } from './dunesPlaceTracks';

/**
 * The Dunes' ground (chapter 3), the Mojave seen from above: gravel flats of
 * desert pavement (dunesPlaceGravel.ts), and over them, where the level's
 * sand zones lie, dunes of loose pale sand (dunesPlaceSand.ts) with wind
 * ripples, crests and shaded slip faces, so where the sidewinder can bury
 * reads at a glance; tracks and a burrow in the sand (dunesPlaceTracks.ts).
 * Each level lies differently (seeded from its id).
 */
export function paintDunesGround(d: Draw, level: LevelDef): void {
  const rng = createRng(seedOf(level.id));
  const keeps = keepsOf(level);
  const busy = busyOf(keeps);
  const sand = sandOf(level);
  const relief = reliefOf(sandOf(level, 110), rng);
  const clear = (p: Pt, room = 8): boolean => keeps.every((k) => distTo(k, p.x, p.y) > room);
  // Marks in the sand stay off the level's things (not the start: a trail may run under the snake).
  const things = keeps.slice(0, keeps.length - 2);
  const room = (p: Pt): boolean => things.every((k) => distTo(k, p.x, p.y) > 16);
  flats(d, rng);
  pebbles(d, sand, busy, rng);
  sandWashes(d, sand, relief, rng);
  ripples(d, sand, relief, rng);
  crests(d, relief, rng);
  sandGrain(d, sand, rng);
  sidewinderTrail(d, sand, room, rng);
  if (rng() < 0.7) kratHops(d, sand, room, rng);
  for (let k = 0, n = 1 + Math.floor(rng() * 2); k < n; k++) burrow(d, sand, (p) => clear(p, 20), rng);
  flatsLife(d, sand, busy, (p) => clear(p), rng);
  edges(d);
}
