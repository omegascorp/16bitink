import type { SolidDef } from '../../level/types';
import { blob, castShadow } from '../groundKit';
import { closed, type Draw, oval, pt, TAU } from '../kit';
import type { Pt } from '../pen';
import type { PlaceArt } from '../places/types';
import { paintMountainsCover } from './mountainsPlaceCover';
import { paintMountainsGround } from './mountainsPlaceGround';
import { LIME_DEEP, LIME_SHADE, rngAt, rockMass, rockShape, SHADE, SOIL_RED } from './mountainsPlaceKit';
import { dryTuft, stone } from './mountainsPlaceParts';
import { mountainSolid } from './mountainsPlaceSolids';

/**
 * The Mountains (chapter 7), painted: a limestone slope of the western
 * Zagros from above, ink and wash. The ground is in mountainsPlaceGround.ts
 * (its stones and plants in mountainsPlaceParts.ts), the crags and boulders
 * in mountainsPlaceSolids.ts, the crevices and thyme in
 * mountainsPlaceCover.ts, the shared colours and rock painting in
 * mountainsPlaceKit.ts.
 */

/** A solid of a look the Mountains have no painting for: a plain block of limestone, so a new look still shows. */
function solid(d: Draw, s: SolidDef): void {
  if (mountainSolid(d, s)) return;
  const rng = rngAt(s.x, s.y, 21);
  const shape = s.kind === 'circle' ? rockShape(pt(s.x, s.y), s.r, s.r, rng) : [pt(s.x, s.y), pt(s.x + s.w, s.y), pt(s.x + s.w, s.y + s.h), pt(s.x, s.y + s.h)];
  rockMass(d, shape, rng, { height: 10, ledges: 1 });
}

/** A nest: a scrape in a pocket of red earth under a stone's lee, ringed with gravel, a stalk or two of dry grass. */
function scrape(d: Draw, p: Pt): void {
  const { pen } = d;
  const rng = rngAt(p.x, p.y, 4);
  const pocket = blob(p, 25, 21, rng, 0.2, 24, rng() * TAU);
  const hollow = blob(p, 16, 13, rng, 0.15, 20, rng() * TAU);
  pen.fill(pocket, SOIL_RED, 0.35);
  castShadow(d, hollow, -3, 0.18, SHADE);
  pen.fill(hollow, LIME_SHADE, 0.25);
  pen.hair(closed(hollow).slice(2, 14), 0.6, d.ink, 0.45);
  for (let k = 0; k < 10; k++) {
    const a = rng() * TAU;
    stone(d, pt(p.x + Math.cos(a) * (18 + rng() * 6), p.y + Math.sin(a) * (15 + rng() * 5)), 1.4 + rng() * 2.2, rng);
  }
  dryTuft(d, pt(p.x + 20, p.y - 14), 6, rng);
  pen.fill(oval(p.x, p.y, 6, 5, 10), LIME_DEEP, 0.08);
}

export const MOUNTAINS_PLACE: PlaceArt | undefined = {
  ground: paintMountainsGround,
  solid,
  nest: scrape,
  cover: paintMountainsCover,
};
