import type { SolidDef } from '../../level/types';
import { castShadow, outline } from '../groundKit';
import { type Draw, edge, oval, pt, skin } from '../kit';
import { coopRoof, cornCrib, strawNest } from './farmBuildings';
import { paintCover } from './farmCover';
import { paintFarmGround } from './farmGround';
import { barrel, fencePost, fieldStone, hayBale, trough } from './farmSolids';
import type { PlaceArt } from './types';

/**
 * The farm (chapter 1), painted: a farmyard garden from above in ink and
 * wash. The ground is in farmGround.ts (and farmBarnFloor.ts for the barn at
 * night), the solid things in farmSolids.ts and farmBuildings.ts, the cover
 * in farmCover.ts.
 */

/** A solid of a look the farm has no painting for: a plain washed shape, so a new look still shows. */
function plain(d: Draw, s: SolidDef): void {
  const shape = s.kind === 'circle' ? oval(s.x, s.y, s.r, s.r, 24) : outline([pt(s.x, s.y), pt(s.x + s.w, s.y), pt(s.x + s.w, s.y + s.h), pt(s.x, s.y + s.h)], 8).slice(0, -1);
  castShadow(d, shape, 8, 0.2);
  skin(d, shape, '#a7744a', 0.6);
  edge(d, shape, 1.4);
}

function solid(d: Draw, s: SolidDef): void {
  if (s.kind === 'circle') {
    const c = pt(s.x, s.y);
    if (s.look === 'rock') return fieldStone(d, c, s.r);
    if (s.look === 'post') return fencePost(d, c, s.r);
    if (s.look === 'barrel') return barrel(d, c, s.r);
  } else {
    if (s.look === 'bale') return hayBale(d, s.x, s.y, s.w, s.h);
    if (s.look === 'trough') return trough(d, s.x, s.y, s.w, s.h);
    if (s.look === 'crib') return cornCrib(d, s.x, s.y, s.w, s.h);
    if (s.look === 'coop') return coopRoof(d, s.x, s.y, s.w, s.h);
  }
  plain(d, s);
}

export const FARM: PlaceArt = {
  ground: paintFarmGround,
  solid,
  nest: strawNest,
  cover: paintCover,
};
