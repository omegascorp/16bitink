import { route } from '../krait/path';
import type { Cast } from './cast';
import { drawStep, type Shot } from './scene';
import { DEER_STEP } from './steps';
import { drawSnake } from './swallower';
import { T } from './timeline';

/**
 * The cold open's first shot (frame 1 is the thumbnail-like still: the
 * Burmese python's jaws round the deer's rump, the deer's x-ray in the
 * lump, "77 lb"); on "not even the biggest" a darker, bigger body with a
 * hyena-sized lump slides through above it, head first.
 */

const HYENA_ROUTE = route([{ x: 1400, y: 196 }, { x: 600, y: 190 }, { x: -800, y: 200 }]);
const SCALE = 1.2;

export function drawOpenShot(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number): Shot {
  const from = T.notEven - 0.3;
  const u = (t - from) / (T.lining - from);
  return drawStep(ctx, cast, DEER_STEP, t, boil, undefined, (view) => {
    if (t < from) return;
    const length = 400 * SCALE;
    drawSnake(ctx, {
      snake: cast.snakes.rock, route: HYENA_ROUTE, headS: 640 + u * 1500, length, width: 12.5 * SCALE,
      meal: { meal: cast.meals.hyena, scale: SCALE, p: 1, at: length * 0.42, xray: 0.8 }, dark: 0.45,
    }, view, boil);
  });
}
