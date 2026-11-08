import { drawSprite, type Pt } from '../sprites';
import { type Camera, drawBoard, onBoard, toScreen } from './boards';
import type { Cast } from './cast';
import { camAt, type Step, stepPose } from './steps';
import { drawSnake, type SnakePose, type View } from './swallower';

/**
 * One meal's shot: its board under the camera, the meal lying in the snake's
 * way until the jaws reach it, the snake, and a soft vignette.
 */

export function viewOf(cam: Camera): View {
  return { at: (p: Pt) => toScreen(cam, p), zoom: cam.zoom };
}

export interface Shot {
  readonly cam: Camera;
  readonly view: View;
  readonly pose: SnakePose;
}

/** The meal lying on the ground at its place on the route, nose towards the snake. */
export function drawLying(ctx: CanvasRenderingContext2D, cast: Cast, st: Step, view: View, boil: number): void {
  const meal = cast.meals[st.meal];
  const c = view.at(st.route.at(st.mealS));
  const scale = (st.scale * meal.cm * view.zoom) / meal.len;
  drawSprite(ctx, meal.sprite, boil, { x: c.x, y: c.y, scale, rotation: st.route.heading(st.mealS) + Math.PI });
}

export function vignette(ctx: CanvasRenderingContext2D, strength: number): void {
  const g = ctx.createRadialGradient(960, 540, 420, 960, 540, 1150);
  g.addColorStop(0, 'rgba(20,14,8,0)');
  g.addColorStop(1, `rgba(20,14,8,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1920, 1080);
}

/** Draws a step's shot at t; `cam` overrides its own camera, `under` draws between the ground and the snake. */
export function drawStep(ctx: CanvasRenderingContext2D, cast: Cast, st: Step, t: number, boil: number, cam?: Camera, under?: (view: View) => void): Shot {
  const c = onBoard(cam ?? camAt(st.cams, t));
  const view = viewOf(c);
  drawBoard(ctx, cast.boards[st.board], c);
  const pose = stepPose(st, cast.snakes[st.snake], cast.meals[st.meal], t);
  under?.(view);
  if (pose.meal && pose.meal.p <= -0.02) drawLying(ctx, cast, st, view, boil);
  drawSnake(ctx, pose, view, boil);
  vignette(ctx, 0.35);
  return { cam: c, view, pose };
}
