import { createRng } from '../../logic/rng';
import type { LevelDef, SolidDef } from '../../level/types';
import { blob, castShadow } from '../groundKit';
import { closed, type Draw, edge, oval, pt, skin, TAU } from '../kit';
import type { Pt } from '../pen';
import type { PlaceArt } from '../places/types';
import { busyOf, keepsOf, seedOf } from '../places/farmKit';
import { bankShallows, paintBank } from './floodedPlaceBank';
import { paintFloodedCover } from './floodedPlaceCover';
import { banksOf, BARK, LEAF_DRY, MUD, rngAt } from './floodedPlaceKit';
import { floatingLog, floodTree } from './floodedPlaceSolids';
import { paintWater } from './floodedPlaceWater';

/**
 * The Flooded Forest (chapter 10), painted: the Amazon's várzea at high
 * water from above, ink and wash. Tea-dark blackwater fills the board
 * (floodedPlaceWater.ts) between banks and islands of low land
 * (floodedPlaceBank.ts); trees stand in the flood and logs float
 * (floodedPlaceSolids.ts); water lilies, water lettuce and reeds are the
 * cover (floodedPlaceCover.ts, floodedPlaceLily.ts).
 */
function ground(d: Draw, level: LevelDef): void {
  const banks = banksOf(level);
  const busy = busyOf(keepsOf(level));
  const rng = createRng(seedOf(level.id) ^ 0x2c1b3c6d);
  paintWater(d, banks, busy, rng);
  for (const b of banks) bankShallows(d, b);
  for (const b of banks) paintBank(d, b, rng, busy);
}

/** A solid of a look the Flooded Forest has no painting for: a plain washed shape, so a new look still shows. */
function plain(d: Draw, s: SolidDef): void {
  const shape = s.kind === 'circle' ? oval(s.x, s.y, s.r, s.r, 24) : [pt(s.x, s.y), pt(s.x + s.w, s.y), pt(s.x + s.w, s.y + s.h), pt(s.x, s.y + s.h)];
  castShadow(d, shape, 8, 0.2);
  skin(d, shape, BARK, 0.6);
  edge(d, shape, 1.4);
}

function solid(d: Draw, s: SolidDef): void {
  if (s.kind === 'circle' && s.look === 'trunk') return floodTree(d, pt(s.x, s.y), s.r);
  if (s.kind === 'rect' && s.look === 'log') return floatingLog(d, s.x, s.y, s.w, s.h);
  plain(d, s);
}

/** A nest (none of the levels has one yet): a heap of dead leaves and twigs on the bank. */
function nest(d: Draw, p: Pt): void {
  const rng = rngAt(p.x, p.y, 5);
  const heap = blob(p, 22, 18, rng, 0.2, 22, rng() * TAU);
  castShadow(d, heap, 3, 0.2);
  d.pen.fill(heap, MUD, 0.7);
  for (let k = 0; k < 30; k++) {
    const a = rng() * TAU;
    const q = pt(p.x + Math.cos(a) * rng() * 18, p.y + Math.sin(a) * rng() * 15);
    d.pen.hair([q, pt(q.x + Math.cos(a + 1.4) * 8, q.y + Math.sin(a + 1.4) * 8)], 0.8, LEAF_DRY, 0.8);
  }
  d.pen.stroke(closed(heap), 1, d.ink, 0.6);
}

export const FLOODED_PLACE: PlaceArt | undefined = { ground, solid, nest, cover: paintFloodedCover };
