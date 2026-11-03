import { INK } from '../../../src/art/palette';
import { SNAKE_W } from '../../../src/art/types';
import type { Route } from '../krait/path';
import { drawBody, drawBodyShadow, drawSprite, type BodyPose, type Pt, taper } from '../sprites';
import type { Meal, Snake } from './cast';

/**
 * Any snake swallowing any meal, generalised from the python short
 * (python/snake.ts): the body laid along a route behind the head, tapering
 * to the tail; the meal going into the jaws head first (what is still
 * outside shows ahead of the lips, the jaws' skin stretched round it as a
 * sleeve as wide as the meal); then the lump sliding down, the meal showing
 * through the skin as a faint x-ray (darkened into the scales, a pale rim).
 * Everything is in world units (the caller's scale: world units per cm),
 * drawn through `view` (world to screen) at `zoom` screen px per world unit.
 */

export interface View {
  readonly at: (p: Pt) => Pt;
  readonly zoom: number;
}

export interface MealState {
  readonly meal: Meal;
  /** World units per cm (the shot's scale). */
  readonly scale: number;
  /** How far in: 0 its nose at the lips, 1 all of it (negative: still ahead of the mouth). */
  readonly p: number;
  /** Once in: the lump's middle, world units behind the head (defaults to just behind it). */
  readonly at?: number;
  /** How strongly it shows through the skin (0..1). */
  readonly xray?: number;
}

export interface SnakePose {
  readonly snake: Snake;
  readonly route: Route;
  readonly headS: number;
  readonly length: number;
  readonly width: number;
  readonly meal?: MealState;
  readonly mouth?: 'shut' | 'open';
  readonly tongue?: number;
  /** A squeeze pulse, 0..1 (the coils tighten). */
  readonly squeeze?: number;
  /** Darkened towards a silhouette, 0..1. */
  readonly dark?: number;
  readonly alpha?: number;
}

/** The lips, head units ahead of the head's centre. */
export const LIP = 11;
/** The head's width over the body's while its jaws are stretched round a meal. */
export const HEAD_STRETCH = 1.3;

interface Lay {
  readonly hs: number;
  readonly front: number;
  readonly gulping: boolean;
  readonly centre: number;
  readonly mealLen: number;
  readonly mealW: number;
}

function layOf(k: SnakePose): Lay {
  const m = k.meal;
  const mealLen = m ? m.meal.cm * m.scale : 0;
  const mealW = m ? m.meal.wideCm * m.scale : 0;
  const gulping = !!m && m.p > -0.02 && m.p < 1;
  const centre = !m ? 0 : m.p < 1 ? m.p * mealLen - mealLen / 2 : m.at ?? mealLen / 2 + k.width;
  const lipW = gulping ? profile(-centre, mealLen, mealW) : 0;
  const hs = (gulping && lipW > k.width ? k.width * HEAD_STRETCH : k.width) / SNAKE_W;
  return { hs, front: gulping ? LIP * hs : 0, gulping, centre, mealLen, mealW };
}

/** The lump's width at `x` from the meal's middle (an egg-shaped swell, a little wider than the meal). */
function profile(x: number, len: number, wide: number): number {
  const u = x / (len * 0.5);
  if (len <= 0 || Math.abs(u) >= 1) return 0;
  return wide * 1.06 * Math.pow(1 - u * u, 0.42);
}

/** The body's spine and widths on screen, from the lips (or the head) back to the tail. */
export function bodyOf(k: SnakePose, view: View): BodyPose & { readonly lay: Lay } {
  const lay = layOf(k);
  const step = Math.max(0.6, k.width * 0.35);
  const total = lay.front + k.length;
  const n = Math.ceil(total / step);
  const squeeze = 1 - 0.14 * (k.squeeze ?? 0);
  const spine: Pt[] = [];
  const widths: number[] = [];
  for (let i = 0; i <= n; i++) {
    const d = Math.min(total, i * step);
    spine.push(view.at(k.route.at(k.headS + lay.front - d)));
    const body = k.width * taper(Math.max(0, d - lay.front) / k.length) * squeeze;
    const lump = k.meal ? profile(d - lay.centre, lay.mealLen, lay.mealW) : 0;
    widths.push(Math.max(body, lump) * view.zoom);
  }
  return { spine, widths, along: (k.width * view.zoom) / SNAKE_W, lay };
}

function headAngle(k: SnakePose, at: number): number {
  const a = k.route.at(at);
  const b = k.route.at(at - k.width * 1.4);
  return Math.atan2(a.y - b.y, a.x - b.x);
}

/** The body's outline, for clipping the x-ray to the skin. */
function outline(ctx: CanvasRenderingContext2D, b: BodyPose): void {
  const left: Pt[] = [];
  const right: Pt[] = [];
  const n = b.spine.length;
  for (let i = 0; i < n; i++) {
    const a = b.spine[Math.max(0, i - 1)]!;
    const c = b.spine[Math.min(n - 1, i + 1)]!;
    const len = Math.hypot(a.x - c.x, a.y - c.y) || 1;
    const nx = -(a.y - c.y) / len;
    const ny = (a.x - c.x) / len;
    const h = b.widths[i]! * 0.44;
    left.push({ x: b.spine[i]!.x + nx * h, y: b.spine[i]!.y + ny * h });
    right.push({ x: b.spine[i]!.x - nx * h, y: b.spine[i]!.y - ny * h });
  }
  ctx.beginPath();
  [...left, ...right.reverse()].forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
}

/** Where the meal's middle is and which way its nose points, on screen. */
function mealPlace(k: SnakePose, lay: Lay, view: View): { readonly c: Pt; readonly angle: number } {
  const s = k.headS + lay.front - lay.centre;
  const c = view.at(k.route.at(s));
  return { c, angle: k.route.heading(s) + Math.PI };
}

function drawMeal(ctx: CanvasRenderingContext2D, k: SnakePose, lay: Lay, view: View, boil: number, inside: boolean, body: BodyPose): void {
  const m = k.meal!;
  const { c, angle } = mealPlace(k, lay, view);
  const scale = (m.scale * m.meal.cm * view.zoom) / m.meal.len;
  if (!inside) {
    drawSprite(ctx, m.meal.sprite, boil, { x: c.x, y: c.y, scale, rotation: angle });
    return;
  }
  const xray = m.xray ?? 1;
  if (xray <= 0) return;
  ctx.save();
  outline(ctx, body);
  ctx.clip();
  ctx.globalCompositeOperation = 'screen';
  drawSprite(ctx, m.meal.ghost, boil, { x: c.x, y: c.y, scale, rotation: angle, alpha: 0.16 * xray });
  ctx.globalCompositeOperation = 'multiply';
  drawSprite(ctx, m.meal.sprite, boil, { x: c.x, y: c.y, scale, rotation: angle, alpha: 0.5 * xray });
  ctx.globalCompositeOperation = 'source-over';
  drawSprite(ctx, m.meal.rim, boil, { x: c.x, y: c.y, scale, rotation: angle, alpha: 0.95 * xray });
  ctx.restore();
}

/** The lips stretched round the meal: a pale lip and an ink line across the mouth. */
function drawLips(ctx: CanvasRenderingContext2D, k: SnakePose, body: BodyPose): void {
  const p = body.spine[0]!;
  const q = body.spine[Math.min(2, body.spine.length - 1)]!;
  const a = Math.atan2(p.y - q.y, p.x - q.x);
  const half = body.widths[0]! / 2;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(a);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-half * 0.12, -half);
  ctx.quadraticCurveTo(half * 0.32, 0, -half * 0.12, half);
  ctx.strokeStyle = k.snake.art.colours.belly;
  ctx.lineWidth = Math.max(2, half * 0.22);
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1.5, half * 0.07);
  ctx.stroke();
  ctx.restore();
}

/** Draws the snake (and its meal) through a view. */
export function drawSnake(ctx: CanvasRenderingContext2D, k: SnakePose, view: View, boil: number): void {
  const body = bodyOf(k, view);
  const { lay } = body;
  const alpha = k.alpha ?? 1;
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (k.dark) ctx.filter = `brightness(${1 - 0.8 * k.dark}) saturate(${1 - 0.6 * k.dark})`;
  drawBodyShadow(ctx, body, k.width * view.zoom);
  if (k.meal && lay.gulping) {
    // What's still outside, ahead of the lips.
    const lip = body.spine[0]!;
    const back = body.spine[Math.min(2, body.spine.length - 1)]!;
    const a = Math.atan2(lip.y - back.y, lip.x - back.x);
    ctx.save();
    ctx.translate(lip.x, lip.y);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.rect(-body.widths[0]! * 0.1, -5000, 10000, 10000);
    ctx.rotate(-a);
    ctx.translate(-lip.x, -lip.y);
    ctx.clip();
    drawMeal(ctx, k, lay, view, boil, false, body);
    ctx.restore();
  }
  drawBody(ctx, k.snake.strip, boil, body);
  if (k.meal) drawMeal(ctx, k, lay, view, boil, true, body);
  if (lay.gulping) drawLips(ctx, k, body);
  // The head.
  const headAt = view.at(k.route.at(k.headS));
  const angle = headAngle(k, k.headS);
  const hs = lay.hs * view.zoom;
  ctx.save();
  ctx.translate(headAt.x, headAt.y);
  ctx.rotate(angle);
  ctx.scale(hs, hs);
  const out = !lay.gulping && k.mouth !== 'open' ? k.tongue ?? 0 : 0;
  if (out > 0) {
    ctx.save();
    ctx.translate(k.snake.art.snout - 2 - (1 - out) * 9, 0);
    ctx.scale(0.5 + 0.5 * out, 1);
    drawSprite(ctx, k.snake.tongue, boil, { x: 0, y: 0, scale: 1, rotation: Math.sin(out * 29) * 0.16, alpha: Math.min(1, out * 4) });
    ctx.restore();
  }
  drawSprite(ctx, k.mouth === 'open' && !lay.gulping ? k.snake.open : k.snake.shut, boil, { x: 0, y: 0, scale: 1 });
  ctx.restore();
  ctx.restore();
}

/** Where the lump's middle is on screen (for labels and effects). */
export function lumpPoint(k: SnakePose, view: View): Pt {
  const lay = layOf(k);
  return mealPlace(k, lay, view).c;
}

/** The head's place on screen. */
export function headPoint(k: SnakePose, view: View): Pt {
  return view.at(k.route.at(k.headS));
}
