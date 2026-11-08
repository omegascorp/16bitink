import type { SolidDef } from '../../level/types';
import { castShadow } from '../groundKit';
import { type Draw, edge, oval, pt, skin } from '../kit';
import type { Pt } from '../pen';
import { outline } from '../groundKit';
import type { PlaceArt } from '../places/types';
import { paintHeathCover } from './heathPlaceCover';
import { paintHeathGround } from './heathPlaceGround';
import { sett } from './heathPlaceSett';
import { rngAt } from './heathPlaceKit';
import { boulder, dryStoneWall } from './heathPlaceSolids';

/**
 * The Heath (chapter 8), painted: English lowland heath from above, ink and
 * wash. The ground (ling on peat, sandy clearings and path, the pool, the
 * setts, the floor's small things) is in heathPlaceGround.ts and the files
 * it draws on, the solid things (granite boulders, dry-stone walls) in
 * heathPlaceSolids.ts, the cover (ling and gorse bushes) in
 * heathPlaceCover.ts. The sun patches are left bare sand: the chapter's
 * view lights them, drifts the clouds over and trembles the setts.
 */

/** A solid of a look the Heath has no painting for: a plain washed shape, so a new look still shows. */
function plain(d: Draw, s: SolidDef): void {
  const shape = s.kind === 'circle' ? oval(s.x, s.y, s.r, s.r, 24) : outline([pt(s.x, s.y), pt(s.x + s.w, s.y), pt(s.x + s.w, s.y + s.h), pt(s.x, s.y + s.h)], 8).slice(0, -1);
  castShadow(d, shape, 8, 0.2);
  skin(d, shape, '#9a958a', 0.6);
  edge(d, shape, 1.4);
}

function solid(d: Draw, s: SolidDef): void {
  if (s.kind === 'circle' && s.look === 'boulder') return boulder(d, pt(s.x, s.y), s.r);
  if (s.kind === 'rect' && s.look === 'wall') return dryStoneWall(d, s.x, s.y, s.w, s.h);
  plain(d, s);
}

/** A nest (the Heath's levels have none): a sett-like scrape, so one still shows. */
function nest(d: Draw, p: Pt): void {
  sett(d, p, rngAt(p.x, p.y, 6));
}

export const HEATH_PLACE: PlaceArt | undefined = {
  ground: paintHeathGround,
  solid,
  nest,
  cover: paintHeathCover,
};
