import { route } from '../krait/path';
import type { Pt } from '../sprites';
import { onBoard, drawBoard } from './boards';
import type { Cast } from './cast';
import { drawStep, drawLying, type Shot, vignette, viewOf } from './scene';
import { camAt, keyed, OLIVE_STEP } from './steps';
import { drawSnake } from './swallower';
import { T, sectionStart as s } from './timeline';

/**
 * Section 2's coil: the olive python comes in and wraps a loop of its body
 * round the croc's middle, then squeezes in pulses; on "took it down" the
 * shot cuts to the swallow (OLIVE_STEP), head first.
 */

const C = OLIVE_STEP.route.at(OLIVE_STEP.mealS);
const RING = 25;

const knots: Pt[] = [
  { x: 1500, y: 470 }, { x: 950, y: 430 }, { x: 640, y: 340 }, { x: 470, y: 300 },
  ...Array.from({ length: 16 }, (_, i) => {
    const a = Math.PI * 0.35 + (i / 15) * Math.PI * 2.25;
    return { x: C.x + Math.cos(a) * RING, y: C.y + Math.sin(a) * RING };
  }),
  { x: C.x + 40, y: C.y - 34 }, { x: C.x + 85, y: C.y - 30 },
];
const COIL = route(knots, 1);

export function drawOlive(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number): Shot {
  if (t >= T.tookDown) return drawStep(ctx, cast, OLIVE_STEP, t, boil);
  const cam = onBoard(camAt(OLIVE_STEP.cams, t));
  const view = viewOf(cam);
  drawBoard(ctx, cast.boards.lake, cam);
  drawLying(ctx, cast, OLIVE_STEP, view, boil);
  const length = 300 * OLIVE_STEP.scale;
  const headS = keyed([[s(2) - 0.2, COIL.length - 700], [T.coiled + 0.5, COIL.length]], t);
  const q = t > T.coiled + 0.5 ? Math.max(0, Math.sin((t - T.coiled - 0.5) * Math.PI * 2.2)) ** 2 : 0;
  const pose = { snake: cast.snakes.olive, route: COIL, headS, length, width: 9 * OLIVE_STEP.scale, squeeze: q, tongue: Math.max(0, Math.sin(t * 5)) ** 3 };
  drawSnake(ctx, pose, view, boil);
  vignette(ctx, 0.35);
  return { cam, view, pose };
}
