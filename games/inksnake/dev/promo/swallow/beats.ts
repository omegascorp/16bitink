import { smooth } from '../short';
import type { Cast } from './cast';
import { type Balance, drawBalance, drawGhost, drawHaHa, drawHeart, drawTape } from './cards';
import { drawJaws, drawSnorkel } from './anatomy';
import { drawBellyCorn, drawUnhinge } from './diagrams';
import type { Shot } from './scene';
import { bodyOf, lumpPoint } from './swallower';
import { T, sectionStart as s } from './timeline';

/**
 * The cards and insets laid over each section's picture, each on its word.
 * `shot` is the meal shot under them (for things placed on the snake).
 */

const FAWN_BALANCE: Balance = {
  from: T.thirtyOne - 0.2, to: T.forget, left: 'SNAKE\n31.5 lb', leftAt: T.thirtyOne, right: 'FAWN\n35 lb', rightAt: T.thirtyFive, tips: 1, share: '111%',
};
const DEER_BALANCE: Balance = {
  from: T.fifteenFoot - 0.2, to: T.tenInches - 0.3, left: 'SNAKE\n115 lb', leftAt: T.fifteenFoot, right: 'DEER\n77 lb', rightAt: T.deer77 + 0.4, tips: -1, share: '67%',
};

/** When the balance tips (for the clunk). */
export const TIP_TIMES: readonly number[] = [FAWN_BALANCE.rightAt, DEER_BALANCE.rightAt];

export function drawBeats(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number, shot: Shot | null): void {
  drawUnhinge(ctx, t, T.unhinge - 0.3, T.champion);
  drawBellyCorn(ctx, t, T.belly - 0.2, T.goUp - 0.4);
  drawBalance(ctx, FAWN_BALANCE, t);
  drawJaws(ctx, t, { from: T.lowerJaw - 0.2, spread: T.spread - 0.3, left: T.creeping, right: T.oneSide, to: T.windpipe - 0.3 });
  drawSnorkel(ctx, t, T.windpipe - 0.2, T.snorkel + 1.2);
  drawBalance(ctx, DEER_BALANCE, t);
  drawHeart(ctx, t, T.heart - 0.4, T.forty - 0.2, s(6) - 0.1);
  if (!shot) return;
  const { pose, view } = shot;
  if (t > T.tenInches - 0.3 && t < T.footWide) {
    const body = bodyOf(pose, view);
    const p = body.spine[0]!;
    const q = body.spine[3]!;
    const show = smooth((t - T.tenInches + 0.3) / 0.6) * (1 - smooth((t - T.footWide + 0.5) / 0.4));
    drawTape(ctx, p, Math.atan2(p.y - q.y, p.x - q.x), body.widths[0]! * 1.15, show, '10.2 in · 26 cm');
  }
  if (t > T.footWide - 0.4 && t < T.thrilled && pose.meal) {
    const m = pose.meal.meal;
    const at = lumpPoint(pose, view);
    const sAt = pose.headS - (pose.meal.at ?? 0);
    const a = smooth((t - T.footWide + 0.4) / 0.4) * (1 - smooth((t - T.thrilled + 0.3) / 0.3));
    drawGhost(ctx, m.rim, m.ghost, at, pose.route.heading(sAt) + Math.PI, (pose.meal.scale * m.cm * view.zoom) / m.len, boil, (t - T.footWide) / 1.6, a, '≈ 120 lb');
  }
  if (t > T.laughing - 0.3 && t < T.wasnt + 1) {
    const at = lumpPoint(pose, view);
    drawHaHa(ctx, { x: at.x, y: at.y - 170 }, t, T.laughing - 0.2, T.wasnt, T.wasnt + 0.9);
  }
}
