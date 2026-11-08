import type { Draw } from './kit';

/**
 * The contracts between the drawings and the game. Everything on the board
 * is seen from above, like the board itself.
 */

/**
 * A creature or thing painted as sprites: a square frame `frame` board px
 * across, centred on it, at `res` texture px per board px, one drawing per
 * pose. Creatures face +x (the view turns them). `draw` paints one pose
 * with the line boil `d` carries (d.f is the boil frame 0..2). Paint only
 * inside the frame, with a few px to spare.
 */
export interface SpriteArt<P extends string = string> {
  readonly frame: number;
  readonly res: number;
  readonly poses: readonly P[];
  /** Method syntax on purpose: a sprite with named poses still counts as a SpriteArt of any pose. */
  draw(d: Draw, pose: P): void;
}

/** The nominal body width snake art is drawn at, board px; the game scales it to the real width. */
export const SNAKE_W = 24;

/**
 * A player snake's drawings.
 *
 * - `strip`: the back of the body, painted along +x on a canvas `STRIP_LEN`
 *   × SNAKE_W board px (origin at the strip's top-left, y running across the
 *   body, 0 to SNAKE_W). The game lays it along the body's curve, so the
 *   pattern must repeat seamlessly every `period` board px: x = period + a
 *   must look exactly like x = a (paint period + a quarter more, the last
 *   quarter a copy of the first). Pen contours run along both long edges
 *   (y ≈ 1 and y ≈ SNAKE_W - 1); the light falls from the top edge (y = 0).
 * - `head`: the head and the first bit of neck, frame centred on the point
 *   between the eyes' back edge and the snout's middle, facing +x, drawn for
 *   a body SNAKE_W wide (the neck at x = -frame/2 .. about -SNAKE_W/2 is
 *   exactly SNAKE_W wide, so it meets the strip). Poses: 'shut', 'open' (jaws
 *   wide for a big meal), 'strike' (mouth open, a little forward).
 * - `tongue`: the forked tongue flicking out of the snout, frame centred on
 *   its root (at the snout tip), pointing +x.
 * - `colours`: the washes the interface uses for this snake (its lives,
 *   its portrait's spot).
 */
export interface SnakeArt {
  readonly period: number;
  readonly drawStrip: (d: Draw, length: number) => void;
  /** The belly, painted the same way, if the snake ever shows it (a hognose playing dead rolls belly-up). */
  readonly drawBelly?: (d: Draw, length: number) => void;
  readonly head: SpriteArt<'shut' | 'open' | 'strike'>;
  readonly tongue: SpriteArt<'flick'>;
  /** Where the tongue's root sits from the head frame's centre, board px (+x is forward), at SNAKE_W. */
  readonly snout: number;
  readonly colours: { readonly base: string; readonly mark: string; readonly belly: string };
}

/** The strip is painted this long: the period plus a quarter, at most. */
export function stripLength(period: number): number {
  return Math.ceil(period * 1.25);
}
