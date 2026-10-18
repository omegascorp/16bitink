import { pt } from '../../../src/art/kit';
import { rgba } from '../../../src/art/paint';
import type { Sprite } from '../sprites';
import { BEAST_BODY, makeBeast, type BeastSprites } from './beastArt';
import { drawBracket, drawCracks, drawDust, drawPart, drawPopLabel, drawRing } from './marks';
import {
  beastAt, BEAST_LEGS, burstAt, COUNT_ORDER, countAt, cracksAt, footOf, glowAt, PIVOT, ringAt, shortMark, SHORT_AT, SLAM_AT, STOMP_AT, wideMark, WIDE_AT, wrap,
  type BeastPose,
} from './story';

/** The heavy-world deer's scene: the beast, its cracks and dust, and the "short", "wide" and six-leg marks. */

/** The legs hang from under the body: far ones first, then near. */
const FAR = [3, 4, 5] as const;
const NEAR = [0, 1, 2] as const;

function drawLegs(ctx: CanvasRenderingContext2D, s: BeastSprites, p: BeastPose, boil: number, which: readonly number[]): void {
  for (const i of which) {
    const l = p.legs[i]!;
    drawPart(ctx, BEAST_LEGS[i]!.far ? s.far : s.near, boil, p.x + l.hip.x * p.scale, p.ground + l.hip.y * p.scale, p.scale, l.angle, l.stretch);
  }
}

function drawBody(ctx: CanvasRenderingContext2D, part: Sprite, p: BeastPose, boil: number): void {
  ctx.save();
  ctx.translate(p.x, p.ground);
  ctx.scale(p.scale, p.scale);
  ctx.translate(PIVOT.x, PIVOT.y + p.bob);
  ctx.rotate(p.tilt);
  ctx.translate(-PIVOT.x, -PIVOT.y);
  drawPart(ctx, part, boil, 0, 0, 1);
  ctx.restore();
}

/** Where the two front feet come down: the middle of them. */
function frontFoot(p: BeastPose): { x: number; y: number } {
  const a = footOf(p, 2);
  const b = footOf(p, 5);
  return { x: (a.x + b.x) / 2, y: a.y };
}

export function makeBeastScene(): (ctx: CanvasRenderingContext2D, t: number, boil: number) => void {
  const sprites = makeBeast(4);
  return (ctx, t, boil) => {
    const p = beastAt(t);
    const at = frontFoot(beastAt(SLAM_AT + 0.3));
    // A warm light breaking behind it on "animals!".
    const glow = glowAt(t);
    if (glow > 0) {
      const g = ctx.createRadialGradient(p.x, p.ground - 260, 0, p.x, p.ground - 260, 700);
      g.addColorStop(0, rgba('#ffcf8a', 0.42 * glow));
      g.addColorStop(1, rgba('#ffcf8a', 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, p.ground - 960, 1080, 1100);
    }
    const stomp = footOf(beastAt(STOMP_AT + 0.3), 2);
    drawLegs(ctx, sprites, p, boil, FAR);
    drawLegs(ctx, sprites, p, boil, NEAR);
    drawBody(ctx, sprites.body, p, boil);
    drawDust(ctx, at.x, at.y, burstAt(t, SLAM_AT), 1.15, boil, 1);
    drawDust(ctx, stomp.x, stomp.y, burstAt(t, STOMP_AT), 0.9, boil, 2);
    // The ground's cracks show through the settling dust.
    drawCracks(ctx, at.x, at.y + 6, cracksAt(t, SLAM_AT), 1, boil, 1, 0.85);
    drawCracks(ctx, stomp.x + 30, stomp.y + 10, cracksAt(t, STOMP_AT), 0.8, boil, 2, 0.85);
    drawMarks(ctx, p, t, boil);
  };
}

/** "short": a height bracket behind it; "wide": a width bracket over its back; "SIX-legged": a ring and a number on each foot. */
function drawMarks(ctx: CanvasRenderingContext2D, p: BeastPose, t: number, boil: number): void {
  const w = wrap(t);
  const top = p.ground - 162 * p.scale;
  const left = p.x - BEAST_BODY.ox * p.scale * 0.86;
  const right = p.x + (BEAST_BODY.w - BEAST_BODY.ox) * p.scale * 0.98;
  const sm = shortMark(t);
  if (sm > 0) {
    ctx.globalAlpha = sm;
    drawBracket(ctx, pt(left - 34, p.ground), pt(left - 34, top), pt(14, 0), Math.min(1, (w - SHORT_AT + 0.1) / 0.25), boil, 1);
    ctx.globalAlpha = 1;
    drawPopLabel(ctx, 'short', left + 30, top - 30, 84, (w - SHORT_AT + 0.05) / 0.3, sm);
  }
  const wm = wideMark(t);
  if (wm > 0) {
    ctx.globalAlpha = wm;
    drawBracket(ctx, pt(left, top - 110), pt(right, top - 110), pt(0, 14), Math.min(1, (w - WIDE_AT + 0.1) / 0.3), boil, 2);
    ctx.globalAlpha = 1;
    drawPopLabel(ctx, 'wide', (left + right) / 2 + 120, top - 135, 84, (w - WIDE_AT + 0.05) / 0.3, wm);
  }
  COUNT_ORDER.forEach((leg, k) => {
    const a = ringAt(t, k);
    if (a <= 0) return;
    const f = footOf(p, leg);
    const far = BEAST_LEGS[leg]!.far;
    drawRing(ctx, f.x, f.y - 6, 62, 24, Math.min(1, (w - countAt(k) + 0.02) / 0.12), a * (far ? 0.85 : 1));
    drawPopLabel(ctx, String(k + 1), f.x + (far ? 30 : -30), f.y + (far ? -48 : 62), 58, (w - countAt(k)) / 0.25, a);
  });
}
