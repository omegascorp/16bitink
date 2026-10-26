import { drawGreatWhite } from '../foodchain/art/greatWhite';
import { drawOrca } from './orcaArt';
import { along, type BodyPose, onBody, ORCA_EYE, ORCA_SNOUT, poseWith } from './pose';
import { drawRays, drawSnow, drawVignette, drawWater, glow, type Rgb } from './sea';
import { cycles, glintAt, hookInAt, hookJawAt, hookZoomAt } from './story';

/**
 * Frame 1 and the end (menace): the orca's head close, coming down from the
 * top right, jaws open over a young great white hanging limp on its back
 * (white belly up) across the frame below it. Deep blue water, light from
 * above. The camera pushes slowly in on the orca's eye.
 */

const MENACE_TOP: Rgb = [22, 58, 104];
const MENACE_MID: Rgb = [10, 30, 66];
const MENACE_BOTTOM: Rgb = [2, 8, 22];

/** The orca's resting place in the hook (before it comes in along its heading): snout low left of centre, nose down, leftward. */
export const ORCA_HOOK: BodyPose = poseWith({ x: 400, y: 610 }, ORCA_SNOUT, 2350, Math.PI - 0.38, true);

/** The young great white on its back, below the orca's jaws: snout to the right. */
export const SHARK_HOOK: BodyPose = { x: 530, y: 860, length: 860, angle: -0.04, flip: true };

/** The orca in the hook at time t (before the camera). */
export const orcaHookAt = (t: number): BodyPose => along(ORCA_HOOK, hookInAt(t));
/** The shark in the hook at time t: hanging still, a slow drift. */
export const sharkHookAt = (t: number): BodyPose => ({
  ...SHARK_HOOK,
  y: SHARK_HOOK.y + 8 * Math.sin(cycles(2, t)),
  angle: SHARK_HOOK.angle + 0.015 * Math.sin(cycles(3, t) + 0.6),
});

/** The camera: a fixed close crop on the bite (`CROP` about `at`), and in it, the push zooming about the orca's resting eye. */
export const HOOK_FOCUS = onBody(ORCA_HOOK, ORCA_EYE);
export const HOOK_CROP = { at: { x: 480, y: 760 }, k: 1.2 } as const;
export const toHookScreen = (p: { readonly x: number; readonly y: number }, t: number): { x: number; y: number } => {
  const k = hookZoomAt(t);
  const pushed = { x: HOOK_FOCUS.x + (p.x - HOOK_FOCUS.x) * k, y: HOOK_FOCUS.y + (p.y - HOOK_FOCUS.y) * k };
  return { x: HOOK_CROP.at.x + (pushed.x - HOOK_CROP.at.x) * HOOK_CROP.k, y: HOOK_CROP.at.y + (pushed.y - HOOK_CROP.at.y) * HOOK_CROP.k };
};

/** A four-point glint. */
export function drawGlint(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, alpha: number): void {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const rr = i % 2 === 0 ? r : r * 0.16;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawHook(ctx: CanvasRenderingContext2D, sheet: HTMLCanvasElement, t: number): void {
  drawWater(ctx, sheet, MENACE_TOP, MENACE_MID, MENACE_BOTTOM);
  drawRays(ctx, t, 0.9);
  drawSnow(ctx, t, '#dfe8ff', 0.9);
  const k = hookZoomAt(t);
  const shark = sharkHookAt(t);
  const orca = orcaHookAt(t);
  ctx.save();
  ctx.translate(HOOK_CROP.at.x, HOOK_CROP.at.y);
  ctx.scale(HOOK_CROP.k, HOOK_CROP.k);
  ctx.translate(-HOOK_CROP.at.x, -HOOK_CROP.at.y);
  ctx.translate(HOOK_FOCUS.x, HOOK_FOCUS.y);
  ctx.scale(k, k);
  ctx.translate(-HOOK_FOCUS.x, -HOOK_FOCUS.y);
  // A pale glow under the shark's white belly, so it reads against the dark.
  glow(ctx, shark.x, shark.y - 30, 520, '150,190,230', 0.22);
  drawGreatWhite(ctx, shark.x, shark.y, shark.length, shark.angle, t, { tail: 0.9, worried: 0 }, shark.flip);
  drawOrca(ctx, orca.x, orca.y, orca.length, orca.angle, t, { jaw: hookJawAt(t), tail: cycles(11, t) }, orca.flip);
  ctx.restore();
  const eye = toHookScreen(onBody(orcaHookAt(t), ORCA_EYE), t);
  const g = glintAt(t);
  glow(ctx, eye.x, eye.y, 120, '200,230,255', 0.35 * g);
  drawGlint(ctx, eye.x + 4, eye.y - 4, 46 * g * k * HOOK_CROP.k, g);
  drawVignette(ctx, 0.62);
}
