import { bodyProportions, drawFish, FISH_TEX, type FishShape } from '../../src/art/fishArt';
import { makeCanvas } from '../../src/art/pen';
import { BOIL_FRAMES } from '../../src/art/textures';

/**
 * The game's own fish drawings, drawn big enough for a 1080 px wide video.
 * Pen strokes are vectors, so a scaled context gives the same drawing with
 * crisp lines (and the same boil-frame seeds as the game).
 */
export const SPRITE_RES = 8;

export interface Sprite {
  /** One canvas per boil frame, FISH_TEX * res square, fish facing right. */
  readonly frames: readonly HTMLCanvasElement[];
  /** Body length in sprite px (nose to tail stalk, the length the chain is sized by). */
  readonly bodyPx: number;
  /** Sprite px per fish-texture px. */
  readonly res: number;
}

const frameSeed = (f: number): number => 101 + f * 977;

/** `res` sprite px per texture px: the default suits a fish as wide as the video; smaller fish can save memory with less. */
export function makeSprite(shape: FishShape, res = SPRITE_RES): Sprite {
  const side = FISH_TEX * res;
  const frames = Array.from({ length: BOIL_FRAMES }, (_, f) => {
    const { canvas, ctx } = makeCanvas(side, side);
    ctx.scale(res, res);
    drawFish(ctx, shape, 'light', frameSeed(f));
    return canvas;
  });
  return { frames, bodyPx: bodyProportions(shape).hl * 2 * res, res };
}
