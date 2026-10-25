import type { SolidDef } from '../../level/types';
import { blob, castShadow, polar, SHADOW } from '../groundKit';
import { closed, type Draw, edge, oval, pt, skin, TAU } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { outline } from '../groundKit';
import type { PlaceArt } from '../places/types';
import { specks } from '../places/farmGroundParts';
import { paintBarrensCover } from './barrensPlaceCover';
import { paintBarrensGround } from './barrensPlaceGround';
import { burntAt, fascicle, NEEDLE, needleShadows, rngAt, SAND_DEEP, SAND_PALE, strokeNeedles } from './barrensPlaceKit';
import { pitchPine } from './barrensPlacePine';
import { pineLog, pineStump } from './barrensPlaceSolids';

/**
 * The Pine Barrens (chapter 2), painted: the New Jersey pinelands from
 * above in autumn, ink and wash. The ground is in barrensPlaceGround.ts
 * (its tracks, burn and floor in barrensPlaceTracks/Fire/Floor.ts), the
 * solid things in barrensPlaceSolids.ts, the cover in barrensPlaceCover.ts.
 */

/** How charred a thing at x, y of size r is: 0 outside the board's burn, up to 1 well inside it. */
const charOf = (x: number, y: number, r: number): number => Math.max(0, Math.min(1, (burntAt(x, y) + r) / (r * 2)));

/** A solid of a look the Barrens has no painting for: a plain washed shape, so a new look still shows. */
function plain(d: Draw, s: SolidDef): void {
  const shape = s.kind === 'circle' ? oval(s.x, s.y, s.r, s.r, 24) : outline([pt(s.x, s.y), pt(s.x + s.w, s.y), pt(s.x + s.w, s.y + s.h), pt(s.x, s.y + s.h)], 8).slice(0, -1);
  castShadow(d, shape, 8, 0.2);
  skin(d, shape, '#8f6a52', 0.6);
  edge(d, shape, 1.4);
}

function solid(d: Draw, s: SolidDef): void {
  if (s.kind === 'circle') {
    const c = pt(s.x, s.y);
    if (s.look === 'pine') return pitchPine(d, c, s.r, charOf(s.x, s.y, s.r));
    if (s.look === 'stump') return pineStump(d, c, s.r, charOf(s.x, s.y, s.r));
  } else if (s.look === 'log') {
    return pineLog(d, s.x, s.y, s.w, s.h, charOf(s.x + s.w / 2, s.y + s.h / 2, Math.min(s.w, s.h)));
  }
  plain(d, s);
}

/** A nest: a shallow scrape in the sand, its wall towards the light in shade, the thrown-out sand heaped round it, a few needles in it. */
function sandScrape(d: Draw, p: Pt): void {
  const { pen } = d;
  const rng = rngAt(p.x, p.y, 4);
  const rim = blob(p, 25, 21, rng, 0.18, 26, rng() * TAU);
  const hollow = blob(p, 18, 15, rng, 0.15, 22, rng() * TAU);
  pen.fill(rim, PAPER_FILL, 0.3);
  pen.fill(rim, SAND_PALE, 0.5);
  pen.crescent(rim, pt(-SHADOW.x * 4, -SHADOW.y * 4), () => pen.fill(rim, SAND_DEEP, 0.2));
  pen.fill(hollow, SAND_DEEP, 0.18);
  pen.crescent(hollow, pt(SHADOW.x * 6, SHADOW.y * 6), () => pen.fill(hollow, d.ink, 0.2));
  pen.crescent(hollow, pt(-SHADOW.x * 4, -SHADOW.y * 4), () => pen.fill(hollow, PAPER_FILL, 0.35));
  specks(d, SAND_DEEP, 0.4, Array.from({ length: 160 }, () => {
    const q = polar(p, rng() * TAU, Math.sqrt(rng()) * 24);
    return [q.x, q.y, 0.3 + rng() * 0.5] as const;
  }));
  pen.hair(closed(hollow).slice(2, 15), 0.6, d.ink, 0.45);
  const needles = Array.from({ length: 4 }, () => fascicle(p.x + (rng() - 0.5) * 22, p.y + (rng() - 0.5) * 18, rng() * TAU, 9 + rng() * 4, rng)).flat();
  needleShadows(d, needles, 0.18, 0.8);
  strokeNeedles(d, needles, NEEDLE, 0.8, 0.6);
}

export const BARRENS_PLACE: PlaceArt | undefined = {
  ground: paintBarrensGround,
  solid,
  nest: sandScrape,
  cover: paintBarrensCover,
};
