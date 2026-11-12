import type { Pose } from '../chain';
import { smooth } from '../short';
import { type FishId, shapeOf, spriteOf } from './species';
import { clipToGape, drawSwimmer, lipsOf, pointOn, type SwimLook } from './swimmer';

/**
 * One swallow, the whole video's only move: the eater swims in from the
 * left and stops facing right, the meal drifts in from the right facing it,
 * the jaws open, the meal slides in head first (seen going in at the lips,
 * never out of the back of the head), the belly swells as it goes and the
 * jaws shut. Every position is in screen px; times are seconds of the video.
 */

export interface Pt { readonly x: number; readonly y: number }

export interface SwallowPlan {
  readonly eater: FishId;
  readonly meal: FishId;
  /** Body lengths on screen, px (nose to tail stalk, as the game sizes fish). */
  readonly eaterLen: number;
  readonly mealLen: number;
  /** Where the eater's centre stops. */
  readonly at: Pt;
  /** When the eater starts swimming in, when the meal starts going in, and how long it takes. */
  readonly enter: number;
  /** When the meal starts drifting in (default: just after the eater). */
  readonly mealEnter?: number;
  readonly gulp: number;
  readonly gulpS: number;
  /** The full belly: how much it swells, where (0 nose .. 1 tail base) and over how much of the body. */
  readonly belly: { readonly size: number; readonly at: number; readonly width: number; readonly round?: number };
  /** Off screen until this time (the next step has taken over). */
  readonly until: number;
}

export interface SwallowState {
  readonly eater: Pose;
  readonly look: SwimLook;
  /** Null once it's all in. */
  readonly meal: Pose | null;
  /** 0 before the gulp .. 1 swallowed. */
  readonly progress: number;
  /** The open mouth's middle on screen. */
  readonly lips: Pt;
}

const ENTER_S = 1.3;
/** How far in front of the lips the meal waits, px. */
const GAP = 36;

const pose = (id: FishId, x: number, y: number, length: number, facing: 1 | -1, beat: number, effort: number, tilt = 0): Pose => ({
  j: 0, age: 0, shape: shapeOf(id), x, y, length, facing, tilt, beat, effort,
});

/** The jaws: opening just before the gulp, wide through it, shut after. */
function jawAt(p: SwallowPlan, t: number): number {
  return smooth((t - (p.gulp - 0.4)) / 0.35) * (1 - smooth((t - (p.gulp + p.gulpS)) / 0.3));
}

export function swallowAt(p: SwallowPlan, t: number): SwallowState {
  const arrive = smooth((t - p.enter) / ENTER_S);
  const ex = p.at.x - (1 - arrive) * (p.at.x + p.eaterLen * 1.2);
  const bob = Math.sin(t * 1.3) * p.eaterLen * 0.012;
  const progress = smooth((t - p.gulp) / p.gulpS);
  const jaw = jawAt(p, t);
  const look: SwimLook = { jaw, belly: { ...p.belly, size: p.belly.size * smooth(progress * 1.15) } };
  const effort = 0.35 + 0.6 * (1 - arrive) + 0.5 * Math.sin(Math.PI * progress);
  const eater = pose(p.eater, ex, p.at.y + bob, p.eaterLen, 1, t * 5, effort);
  const sprite = spriteOf(p.eater);
  // The meal lines up on the lips as they'll be wide open, so it doesn't jump as they part.
  const open = { ...look, jaw: 1 };
  const lips = pointOn(sprite, eater, open, lipsOf(sprite.anatomy, 1).mid);
  if (progress >= 1) return { eater, look, meal: null, progress, lips };
  const drift = smooth((t - (p.mealEnter ?? p.enter + 0.4)) / ENTER_S);
  const waiting = lips.x + GAP + (1 - drift) * 1400;
  // Head first: its nose goes from just in front of the lips to a little past its whole length inside.
  const nose = waiting - progress * (p.mealLen * 1.35 + GAP);
  const wriggle = 0.5 + 0.5 * Math.sin(Math.PI * progress);
  const meal = pose(p.meal, nose + p.mealLen / 2, lips.y, p.mealLen, -1, t * (6 + 8 * wriggle), 0.3 + 0.7 * wriggle);
  return { eater, look, meal, progress, lips };
}

/** The swallow at t: the inside of the mouth, the meal going in, then the eater over it. */
export function drawSwallow(ctx: CanvasRenderingContext2D, p: SwallowPlan, t: number, boil: number, alpha = 1): void {
  if (t >= p.until || alpha <= 0) return;
  const s = swallowAt(p, t);
  const sprite = spriteOf(p.eater);
  ctx.save();
  ctx.globalAlpha = alpha;
  if (s.meal) {
    drawSwimmer(ctx, sprite, s.eater, boil, { ...s.look, part: 'mouth' });
    ctx.save();
    if (s.progress > 0) clipToGape(ctx, sprite, s.eater, s.look);
    drawSwimmer(ctx, spriteOf(p.meal), s.meal, boil);
    ctx.restore();
    drawSwimmer(ctx, sprite, s.eater, boil, { ...s.look, part: 'body' });
  } else {
    drawSwimmer(ctx, sprite, s.eater, boil, s.look);
  }
  ctx.restore();
}

/** A fish on its own (the stops and the cold open): swimming in place at (x, y). */
export function drawAlone(
  ctx: CanvasRenderingContext2D, id: FishId, at: Pt, length: number, t: number, boil: number, look: SwimLook = {}, facing: 1 | -1 = 1, tilt = 0,
): Pose {
  const p = pose(id, at.x, at.y + Math.sin(t * 1.3) * length * 0.012, length, facing, t * 5, 0.35, tilt);
  drawSwimmer(ctx, spriteOf(id), p, boil, look);
  return p;
}
