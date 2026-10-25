import type { SolidDef } from '../../level/types';
import { blob, castShadow, outline, SHADOW } from '../groundKit';
import { closed, type Draw, edge, oval, pt, skin } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import type { PlaceArt } from '../places/types';
import { paintDunesCover } from './dunesPlaceCover';
import { paintDunesGround } from './dunesPlaceGround';
import { rngAt, SAND, SAND_DEEP } from './dunesPlaceKit';
import { creosote, yucca } from './dunesPlacePlants';
import { boulder, outcrop } from './dunesPlaceSolids';

/**
 * The Dunes (chapter 3), painted: the Mojave from above, ink and wash. The
 * ground (gravel flats, dunes of loose sand where the level's sand zones
 * lie, tracks) is in dunesPlaceGround.ts, the rocks in dunesPlaceSolids.ts,
 * the creosote and yucca in dunesPlacePlants.ts, the mesquite cover in
 * dunesPlaceCover.ts.
 */

/** A solid of a look the Dunes has no painting for: a plain washed shape, so a new look still shows. */
function plain(d: Draw, s: SolidDef): void {
  const shape = s.kind === 'circle' ? oval(s.x, s.y, s.r, s.r, 24) : outline([pt(s.x, s.y), pt(s.x + s.w, s.y), pt(s.x + s.w, s.y + s.h), pt(s.x, s.y + s.h)], 8).slice(0, -1);
  castShadow(d, shape, 8, 0.2);
  skin(d, shape, '#b49a7a', 0.6);
  edge(d, shape, 1.4);
}

function solid(d: Draw, s: SolidDef): void {
  if (s.kind === 'circle') {
    const c = pt(s.x, s.y);
    if (s.look === 'creosote') return creosote(d, c, s.r);
    if (s.look === 'yucca') return yucca(d, c, s.r);
    if (s.look === 'boulder' || s.look === 'rock') return boulder(d, c, s.r);
  } else if (s.look === 'rock' || s.look === 'boulder') {
    return outcrop(d, s.x, s.y, s.w, s.h);
  }
  plain(d, s);
}

/** A nest: a shallow scrape in the sand, its upper-left wall in shade, the thrown-out sand round it. */
function scrape(d: Draw, p: Pt): void {
  const { pen } = d;
  const rng = rngAt(p.x, p.y, 17);
  const rim = blob(p, 24, 20, rng, 0.18, 26);
  const hollow = blob(p, 17, 14, rng, 0.15, 22);
  pen.fill(rim, PAPER_FILL, 0.3);
  pen.fill(rim, SAND, 0.6);
  pen.fill(hollow, SAND_DEEP, 0.18);
  pen.crescent(hollow, pt(SHADOW.x * 6, SHADOW.y * 6), () => pen.fill(hollow, d.ink, 0.2));
  pen.crescent(hollow, pt(-SHADOW.x * 4, -SHADOW.y * 4), () => pen.fill(hollow, PAPER_FILL, 0.35));
  pen.hair(closed(hollow).slice(2, 15), 0.6, d.ink, 0.45);
}

export const DUNES_PLACE: PlaceArt | undefined = {
  ground: paintDunesGround,
  solid,
  nest: scrape,
  cover: paintDunesCover,
};
