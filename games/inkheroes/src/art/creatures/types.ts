/**
 * The contract for creature drawings. A drawer paints one creature in local
 * units: origin on the ground between its feet, facing right (+x), up is −y.
 * It must stay inside x −56..56 and y −104..12 (a little room below for its
 * shadow). Battle and map sprites are baked from it at CREATURE_RES and
 * flipped for the right-hand army.
 *
 * `seed` steadies the pen's wobble; `f` (0..2) is the line-boil frame:
 * redraw the same pose with the pen seeded `seed + f` so lines shimmer
 * slightly between frames, never moving the shapes.
 */
export type CreatureDrawer = (ctx: CanvasRenderingContext2D, seed: number, f: number) => void;

/** The baked frame, in units: the origin sits at (FRAME_W / 2, GROUND_Y). */
export const FRAME_W = 120;
export const FRAME_H = 124;
export const GROUND_Y = 112;
/** Texture px per unit. */
export const CREATURE_RES = 2;
