import type { SolidDef } from '../../level/types';
import type { Pt } from '../../logic/vec';
import { blob, castShadow, outline, polar, SHADOW } from '../groundKit';
import { type Draw, edge, oval, pt, skin, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import { specks } from '../places/farmGroundParts';
import type { PlaceArt } from '../places/types';
import { paintReefCover } from './reefPlaceCover';
import { paintReefGround } from './reefPlaceGround';
import { rngAt, SAND_DEEP, SAND_DRY } from './reefPlaceKit';
import { coralHead } from './reefPlaceCoral';
import { beachRock } from './reefPlaceSolids';

/**
 * The Reef (chapter 6), painted: an Indo-Pacific coral reef from above, ink
 * and wash. The sea, its floor and the sand cays are in reefPlaceGround.ts
 * (the cays in reefPlaceCay.ts, the small things on the bottom in
 * reefPlaceSeabed.ts), the coral heads in reefPlaceCoral.ts, the beach rocks in reefPlaceSolids.ts,
 * the seagrass and sea fans in reefPlaceCover.ts. What moves (light on the
 * water, the eels' holes, bubbles and ripples) is reefView.ts's.
 */

/** A solid of a look the reef has no painting for: a plain washed shape, so a new look still shows. */
function plain(d: Draw, s: SolidDef): void {
  const shape = s.kind === 'circle' ? oval(s.x, s.y, s.r, s.r, 24) : outline([pt(s.x, s.y), pt(s.x + s.w, s.y), pt(s.x + s.w, s.y + s.h), pt(s.x, s.y + s.h)], 8).slice(0, -1);
  castShadow(d, shape, 8, 0.2);
  skin(d, shape, '#b9a98a', 0.6);
  edge(d, shape, 1.4);
}

function solid(d: Draw, s: SolidDef): void {
  if (s.kind === 'circle' && s.look === 'coral') return coralHead(d, pt(s.x, s.y), s.r);
  if (s.kind === 'circle' && s.look === 'rock') return beachRock(d, pt(s.x, s.y), s.r);
  plain(d, s);
}

/** A nest: a turtle's scrape in the cay's sand, the thrown-out sand heaped round it. */
function scrape(d: Draw, p: Pt): void {
  const { pen } = d;
  const rng = rngAt(p.x, p.y, 4);
  const rim = blob(p, 25, 21, rng, 0.18, 26, rng() * TAU);
  const hollow = blob(p, 17, 14, rng, 0.15, 22, rng() * TAU);
  pen.fill(rim, SAND_DRY, 0.7);
  pen.crescent(rim, pt(-SHADOW.x * 4, -SHADOW.y * 4), () => pen.fill(rim, SAND_DEEP, 0.2));
  pen.fill(hollow, SAND_DEEP, 0.2);
  pen.crescent(hollow, pt(SHADOW.x * 6, SHADOW.y * 6), () => pen.fill(hollow, d.ink, 0.2));
  pen.crescent(hollow, pt(-SHADOW.x * 4, -SHADOW.y * 4), () => pen.fill(hollow, PAPER_FILL, 0.35));
  specks(d, SAND_DEEP, 0.4, Array.from({ length: 120 }, () => {
    const q = polar(p, rng() * TAU, Math.sqrt(rng()) * 24);
    return [q.x, q.y, 0.3 + rng() * 0.5] as const;
  }));
  pen.hair([...hollow, hollow[0]!].slice(2, 15), 0.6, d.ink, 0.45);
}

export const REEF_PLACE: PlaceArt | undefined = {
  ground: paintReefGround,
  solid,
  nest: scrape,
  cover: paintReefCover,
};
