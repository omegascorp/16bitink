import { drawBurst, drawGulp, mawAt, tipsOf } from './maw';
import { COLD_BOTTOM, COLD_MID, COLD_TOP, drawRays, drawSnow, drawVignette, drawWater } from './sea';
import { cycles, gulpAt, shakeAt, SHUT_T, wrap } from './story';
import { drawShark } from './tag';

/**
 * The close-up the gulp is seen through: world point `focus` at screen point
 * `at`, `zoom` screen px per world px. Fixed, so the seam can't move it.
 */
export const DEEP_CAM = { focus: { x: 550, y: 700 }, at: { x: 540, y: 800 }, zoom: 1.4 } as const;
export const toDeepScreen = (p: { readonly x: number; readonly y: number }): { x: number; y: number } => ({
  x: DEEP_CAM.at.x + (p.x - DEEP_CAM.focus.x) * DEEP_CAM.zoom,
  y: DEEP_CAM.at.y + (p.y - DEEP_CAM.focus.y) * DEEP_CAM.zoom,
});

/**
 * Frame 1 and the end: cold blue-black open water, the shark with the tag
 * on its fin, and the mouth rising out of the dark below, mid-gulp round it.
 */
export function drawDeep(ctx: CanvasRenderingContext2D, sheet: HTMLCanvasElement, t: number, boil: number): void {
  const g = gulpAt(t);
  drawWater(ctx, sheet, COLD_TOP, COLD_MID, COLD_BOTTOM);
  drawRays(ctx, t, 0.8);
  drawSnow(ctx, t, '#dfe8ff', 1);
  const jolt = shakeAt(t);
  ctx.save();
  ctx.translate(jolt.x + DEEP_CAM.at.x, jolt.y + DEEP_CAM.at.y);
  ctx.scale(DEEP_CAM.zoom, DEEP_CAM.zoom);
  ctx.translate(-DEEP_CAM.focus.x, -DEEP_CAM.focus.y);
  drawGulp(ctx, g, t, boil, (s) => {
    drawShark(ctx, s.pose, t, { worried: s.worried, jaw: 0.25 * s.worried, tail: cycles(29, t) }, { swing: 0.12 * Math.sin(cycles(23, t)) });
  });
  const tips = tipsOf(mawAt(1, t));
  drawBurst(ctx, { x: (tips.upper.x + tips.lower.x) / 2, y: (tips.upper.y + tips.lower.y) / 2 + 120 }, wrap(t) - SHUT_T);
  ctx.restore();
  drawVignette(ctx, 0.65);
}
