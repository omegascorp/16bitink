import type { CoverDef, LevelDef, SolidDef } from '../../level/types';
import type { Pt } from '../../logic/vec';
import type { Draw } from '../kit';

/**
 * How a chapter's place is painted on a level's board (BOARD.w × BOARD.h
 * board px, seen from above, light from the upper left).
 *
 * - `ground`: the whole board's ground, once per level. Keep anything tall
 *   or busy off the level's solids, cover and nests (they're painted on top)
 *   and leave the open ground readable: the snake and its prey must stand
 *   out against it.
 * - `solid`: one solid thing in its place (its `look` says what: a hay
 *   bale, a rock…), with a cast shadow towards the lower right.
 * - `nest`: a nest (eggs are drawn by the game on top).
 * - `cover`: one patch of cover. It's painted on its own layer that lies
 *   over the snake, so the snake slides under it: paint only inside a
 *   circle a little bigger than `c.r`, and keep it opaque enough to hide
 *   what's under it.
 */
export interface PlaceArt {
  readonly ground: (d: Draw, level: LevelDef) => void;
  readonly solid: (d: Draw, s: SolidDef) => void;
  readonly nest: (d: Draw, p: Pt) => void;
  readonly cover: (d: Draw, c: CoverDef) => void;
}
