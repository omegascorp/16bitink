import type { Pose } from '../chain';
import { drawTextLine } from '../captions';
import type { Sprite } from '../sprites';
import { drawSwimmer } from '../swimmer';
import { faded } from './layer';
import { COLD_ON_PAPER, drawViewRing, EMBER_ON_PAPER, RED_ON_PAPER } from './props';
import type { Pt } from './story';

/**
 * What each eye sees of a mackerel darting past: a cold eye's view smeared
 * into a blur behind it, a warm eye's crisp, side by side in round views,
 * and "×10" between them.
 */

export const VIEW_R = 170;
export const COLD_VIEW: Pt = { x: 265, y: 465 };
export const WARM_VIEW: Pt = { x: 815, y: 465 };
const LABEL_DY = VIEW_R + 74;
const WATER = '#203a5c';
const DART_LEN = 210;

/** The mackerel inside a view, `u` of the way across it (0 .. 1). */
function dartPose(at: Pt, u: number, beat: number): Pose {
  return {
    j: 0, shape: 'mackerel', age: 0, x: at.x - VIEW_R - DART_LEN * 0.6 + (2 * VIEW_R + DART_LEN * 1.2) * u, y: at.y + 10 * Math.sin(u * 6),
    length: DART_LEN, facing: 1, tilt: 0.06 * Math.cos(u * 6), beat, effort: 1,
  };
}

/** One round view: the water, the mackerel (smeared or sharp), the ring. */
function drawView(ctx: CanvasRenderingContext2D, sprite: Sprite, at: Pt, warm: boolean, u: number, beat: number, boil: number): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(at.x, at.y, VIEW_R, 0, Math.PI * 2);
  ctx.clip();
  const g = ctx.createRadialGradient(at.x, at.y - 60, 20, at.x, at.y, VIEW_R);
  g.addColorStop(0, '#36597f');
  g.addColorStop(1, WATER);
  ctx.fillStyle = g;
  ctx.fillRect(at.x - VIEW_R, at.y - VIEW_R, 2 * VIEW_R, 2 * VIEW_R);
  const pose = dartPose(at, u, beat);
  if (warm) {
    // Speed lines behind it, the fish itself crisp.
    ctx.strokeStyle = '#d8e6f5';
    ctx.lineCap = 'round';
    ctx.lineWidth = 4;
    for (const dy of [-38, -8, 26]) {
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.moveTo(pose.x - DART_LEN * 0.55, pose.y + dy);
      ctx.lineTo(pose.x - DART_LEN * 1.25, pose.y + dy);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    drawSwimmer(ctx, sprite, pose, boil);
  } else {
    // A cold retina is slow: the fish smears out along its path, blurred.
    ctx.filter = 'blur(9px)';
    for (let k = 6; k >= 0; k--) drawSwimmer(ctx, sprite, { ...pose, x: pose.x - k * 34 }, boil, { alpha: k === 0 ? 0.55 : 0.22, stretch: 1.25 });
    ctx.filter = 'none';
  }
  ctx.restore();
  drawViewRing(ctx, at, VIEW_R, warm, boil);
}

/** Both views and their labels, popped in at `shown`, with "×10" at `ten` (0 .. ~1.1). */
export function drawEyeViews(ctx: CanvasRenderingContext2D, sprite: Sprite, shown: number, ten: number, u: number, beat: number, boil: number): void {
  if (shown <= 0) return;
  const pop = 0.7 + 0.3 * shown;
  for (const [at, warm] of [[COLD_VIEW, false], [WARM_VIEW, true]] as const) {
    faded(ctx, shown, (c) => {
      c.save();
      c.translate(at.x, at.y);
      c.scale(pop, pop);
      c.translate(-at.x, -at.y);
      drawView(c, sprite, at, warm, u, beat, boil);
      c.restore();
    });
    drawTextLine(ctx, warm ? 'warm eye' : 'cold eye', at.x, at.y + LABEL_DY * pop, 76, 700, shown, warm ? EMBER_ON_PAPER : COLD_ON_PAPER);
  }
  if (ten > 0) {
    const mid = { x: (COLD_VIEW.x + WARM_VIEW.x) / 2, y: COLD_VIEW.y + 45 };
    ctx.save();
    ctx.translate(mid.x, mid.y);
    ctx.scale(ten, ten);
    ctx.rotate(-0.08);
    drawTextLine(ctx, '×10', 0, 0, 160, 700, Math.min(1, ten) * shown, RED_ON_PAPER);
    ctx.restore();
  }
}
