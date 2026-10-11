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
  /** One canvas per boil frame, FISH_TEX * SPRITE_RES square, fish facing right. */
  readonly frames: readonly HTMLCanvasElement[];
  /** Body length in sprite px (nose to tail stalk, the length the chain is sized by). */
  readonly bodyPx: number;
}

const frameSeed = (f: number): number => 101 + f * 977;

export function makeSprite(shape: FishShape): Sprite {
  const side = FISH_TEX * SPRITE_RES;
  const frames = Array.from({ length: BOIL_FRAMES }, (_, f) => {
    const { canvas, ctx } = makeCanvas(side, side);
    ctx.scale(SPRITE_RES, SPRITE_RES);
    drawFish(ctx, shape, 'light', frameSeed(f));
    return canvas;
  });
  return { frames, bodyPx: bodyProportions(shape).hl * 2 * SPRITE_RES };
}
