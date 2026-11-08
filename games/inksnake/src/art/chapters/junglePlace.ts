import type { SolidDef } from '../../level/types';
import { blob, castShadow, outline } from '../groundKit';
import { type Draw, edge, oval, pt, skin, TAU } from '../kit';
import type { Pt } from '../pen';
import type { PlaceArt } from '../places/types';
import { paintJungleCover } from './junglePlaceCover';
import { paintJungleGround } from './junglePlaceGround';
import { leaf, rngAt, UMBER } from './junglePlaceKit';
import { bamboo, ruin, teakLog } from './junglePlaceSolids';

/**
 * The Jungle (chapter 9), painted: a forest floor by a stream in northern
 * India, ink and wash, seen from above. The ground (leaf litter on dark loam,
 * dappled light, roots, moss, a termite mound) is junglePlaceGround.ts, the
 * stream and its banks junglePlaceStream.ts, the solid things (bamboo,
 * fallen teak, a ruined temple's stones) junglePlaceSolids.ts, the cover (a
 * king cobra's nest mound of leaves, ferns) junglePlaceCover.ts.
 */

/** A solid of a look the Jungle has no painting for: a plain washed shape, so a new look still shows. */
function plain(d: Draw, s: SolidDef): void {
  const shape = s.kind === 'circle' ? oval(s.x, s.y, s.r, s.r, 24) : outline([pt(s.x, s.y), pt(s.x + s.w, s.y), pt(s.x + s.w, s.y + s.h), pt(s.x, s.y + s.h)], 8).slice(0, -1);
  castShadow(d, shape, 8, 0.2);
  skin(d, shape, '#8f7a5a', 0.6);
  edge(d, shape, 1.4);
}

function solid(d: Draw, s: SolidDef): void {
  if (s.kind === 'circle' && s.look === 'bamboo') return bamboo(d, pt(s.x, s.y), s.r);
  if (s.kind === 'rect' && s.look === 'log') return teakLog(d, s.x, s.y, s.w, s.h);
  if (s.kind === 'rect' && s.look === 'ruin') return ruin(d, s.x, s.y, s.w, s.h);
  plain(d, s);
}

/** A nest: a shallow scrape in the loam lined with dead leaves. */
function nest(d: Draw, p: Pt): void {
  const rng = rngAt(p.x, p.y, 9);
  const hollow = blob(p, 20, 17, rng, 0.15, 22, rng() * TAU);
  d.pen.fill(hollow, UMBER, 0.3);
  d.pen.crescent(hollow, pt(5, 7), () => d.pen.fill(hollow, d.ink, 0.15));
  for (let k = 0; k < 9; k++) leaf(d, pt(p.x + (rng() - 0.5) * 24, p.y + (rng() - 0.5) * 20), rng() * TAU, 9 + rng() * 5, rng, { age: 0.3, lift: 0.8 });
}

export const JUNGLE_PLACE: PlaceArt | undefined = {
  ground: paintJungleGround,
  solid,
  nest,
  cover: paintJungleCover,
};
