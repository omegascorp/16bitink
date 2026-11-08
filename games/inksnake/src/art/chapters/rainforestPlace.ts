import { BOARD, type CoverDef, type LevelDef, type SolidDef, type ZoneDef } from '../../level/types';
import { blob, castShadow, outline, SHADOW } from '../groundKit';
import { type Draw, edge, oval, pt, skin, TAU } from '../kit';
import type { Pt } from '../pen';
import type { PlaceArt } from '../places/types';
import { crownShadow, lookOf, paintCrown, type CrownLook } from './rainforestPlaceCrown';
import { paintFloor } from './rainforestPlaceFloor';
import { around, BARK, BARK_DARK, BARK_LIT, CROWN_LEAF, granulate, rngAt } from './rainforestPlaceKit';

/**
 * The Rainforest's boards (chapter 5), painted: a Southeast Asian canopy
 * seen from above. The forest floor lies dim and far below
 * (rainforestPlaceFloor.ts); each `tree` zone is a crown standing over it
 * (rainforestPlaceCrown.ts: 'crown', 'fig', 'tall' for an emergent), its
 * shadow thrown down-right across the floor, the emergents painted last,
 * over their neighbours.
 */

type Round = { readonly c: Pt; readonly r: number; readonly look: CrownLook };

const ORDER: Record<CrownLook, number> = { crown: 0, fig: 1, tall: 2 };

/** A level's crowns, lowest first: the emergents tower over the rest. */
function crownsOf(zones: readonly ZoneDef[]): Round[] {
  return zones
    .flatMap((z): Round[] => (z.kind === 'tree' && z.shape === 'circle' ? [{ c: pt(z.x, z.y), r: z.r, look: lookOf(z.look) }] : []))
    .sort((a, b) => ORDER[a.look] - ORDER[b.look]);
}

/** A tree zone of another shape (none yet): its outline washed leafy, so it still shows. */
function otherTree(d: Draw, z: ZoneDef): void {
  if (z.kind !== 'tree' || z.shape === 'circle') return;
  const shape = z.shape === 'rect' ? outline([pt(z.x, z.y), pt(z.x + z.w, z.y), pt(z.x + z.w, z.y + z.h), pt(z.x, z.y + z.h)], 8).slice(0, -1) : [...z.points];
  castShadow(d, shape, 24, 0.3);
  d.pen.fill(shape, CROWN_LEAF.base, 1);
  edge(d, shape, 1.2, 0.5);
}

function ground(d: Draw, level: LevelDef): void {
  paintFloor(d, level);
  const crowns = crownsOf(level.zones ?? []);
  for (const k of crowns) crownShadow(d, k.c, k.r, k.look);
  for (const z of level.zones ?? []) otherTree(d, z);
  for (const k of crowns) paintCrown(d, k.c, k.r, k.look);
  granulate(d.pen.ctx, BOARD.w, BOARD.h, rngAt(level.start.x, level.start.y, 3), 12000);
}

/** A trunk seen from above (a solid circle): the bole's top in bark, buttress roots flaring out over the floor. */
function trunk(d: Draw, c: Pt, r: number): void {
  const { pen } = d;
  const rng = rngAt(c.x, c.y, 5);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU + rng() * 0.6;
    const root = [around(c, a - 0.25, r * 0.7), around(c, a, r * (1.5 + rng() * 0.4)), around(c, a + 0.25, r * 0.7)];
    castShadow(d, root, 4, 0.3);
    pen.fill(root, BARK, 0.95);
    pen.hair(root, 0.7, d.ink, 0.5);
  }
  const top = blob(c, r, r, rng, 0.08, 26);
  castShadow(d, top, 8, 0.35);
  skin(d, top, BARK_LIT, 0.8);
  pen.crescent(top, pt(-SHADOW.x * r * 0.5, -SHADOW.y * r * 0.5), () => pen.fill(top, BARK_DARK, 0.45));
  edge(d, top, 1.3);
}

/** A solid: a trunk (circle) or a fallen bole (rect); anything else a plain washed shape. */
function solid(d: Draw, s: SolidDef): void {
  if (s.kind === 'circle') return trunk(d, pt(s.x, s.y), s.r);
  const shape = outline([pt(s.x, s.y), pt(s.x + s.w, s.y), pt(s.x + s.w, s.y + s.h), pt(s.x, s.y + s.h)], 8).slice(0, -1);
  castShadow(d, shape, 7, 0.35);
  skin(d, shape, BARK, 0.8);
  d.pen.crescent(shape, pt(-SHADOW.x * 5, -SHADOW.y * 5), () => d.pen.fill(shape, BARK_DARK, 0.4));
  edge(d, shape, 1.3);
}

/** A nest: a hollow in a branch, dark inside, a few twigs over its lip. */
function nest(d: Draw, p: Pt): void {
  const rng = rngAt(p.x, p.y, 9);
  const rim = blob(p, 18, 15, rng, 0.15, 22);
  const hole = blob(p, 11, 9, rng, 0.15, 18);
  skin(d, rim, BARK_LIT, 0.8);
  d.pen.fill(hole, BARK_DARK, 0.9);
  edge(d, rim, 1.1, 0.7);
  for (let i = 0; i < 5; i++) {
    const a = rng() * TAU;
    d.pen.hair([around(p, a, 8), around(p, a + 0.4, 20)], 0.8, BARK, 0.9);
  }
}

/** Cover: a low-hanging clump of leaves the snake slides under. */
function cover(d: Draw, c: CoverDef): void {
  const r = c.r;
  d.pen.fill(oval(c.x, c.y, r * 1.02, r * 1.02, 28), CROWN_LEAF.depth, 0.9);
  paintCrown(d, pt(c.x, c.y), r, lookOf(c.look));
}

export const RAINFOREST_PLACE: PlaceArt | undefined = { ground, solid, nest, cover };
