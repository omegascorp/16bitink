import { drawGreatWhite } from '../foodchain/art/greatWhite';
import { drawOrca } from '../foodchain/art/orca';
import { clamp01, lerp, ramp } from '../short';
import { type BodyPose, onBody, ORCA_SNOUT, poseWith, SHARK_BELLY } from './pose';
import { drawBubbles, drawSpeedLines, tinted } from './paint';
import { drawRays, drawSnow, drawVignette, drawWater, glow, type Rgb } from './sea';
import { A_AT, AND_AT, cycles, FLIPPED_AT, POD_AT, ramAt, rollAt, until, UPSIDE_AT, wrap } from './story';

/**
 * "a pod flipped young great whites upside down…" (action): brighter, busier
 * water. The pod closes in round a young great white; one orca drives up
 * under it, snout first, and the shark rolls over onto its back in a burst
 * of bubbles. The camera shakes with the ram.
 */

const ACTION_TOP: Rgb = [34, 96, 146];
const ACTION_MID: Rgb = [14, 50, 94];
const ACTION_BOTTOM: Rgb = [4, 14, 36];
const HAZE = '#173f6c';

/** Where the shark is, centre and heading, as it's rolled (before the roll's squash). */
export function flipSharkAt(t: number): BodyPose {
  const u = wrap(t);
  const r = rollAt(t);
  // It's shoved up a little by the ram, then hangs.
  const off = until(u, AND_AT + 0.1);
  const lift = 70 * ramp(u, FLIPPED_AT, UPSIDE_AT + 0.3) * off;
  return { x: 560 + lerp(-40, 30, ramp(u, A_AT, UPSIDE_AT + 0.6) * off), y: 820 - lift + 6 * Math.sin(cycles(5, t)), length: 640, angle: -0.06 + 0.12 * Math.sin(Math.PI * r), flip: r > 0.5 };
}

/** The ramming orca: below the shark, snout up into its belly. */
export function ramOrcaAt(t: number): BodyPose {
  const shark = flipSharkAt(t);
  const target = onBody({ ...shark, flip: false }, SHARK_BELLY);
  const ram = ramAt(t);
  const snout = { x: target.x - 30 + lerp(-320, 0, ram), y: target.y + 4 + lerp(520, 0, ram) };
  return poseWith(snout, ORCA_SNOUT, 1250, -0.95, false);
}

export function drawFlip(ctx: CanvasRenderingContext2D, sheet: HTMLCanvasElement, t: number): void {
  const u = wrap(t);
  const ram = ramAt(t);
  const jolt = Math.max(0, 1 - Math.abs(u - (FLIPPED_AT + 0.3)) / 0.5);
  drawWater(ctx, sheet, ACTION_TOP, ACTION_MID, ACTION_BOTTOM);
  drawRays(ctx, t, 1.1, -100, '210,235,255');
  drawSnow(ctx, t, '#e0f0ff', 0.8);
  ctx.save();
  ctx.translate(14 * jolt * Math.sin(u * 90), 10 * jolt * Math.cos(u * 70));
  // The pod around: two more orcas, hazy, closing in from both sides.
  const close = ramp(u, A_AT - 0.2, POD_AT + 0.8) * until(u, AND_AT + 0.1);
  tinted(ctx, (c) => {
    drawOrca(c, lerp(-200, 150, close), 470 + 10 * Math.sin(cycles(4, t)), 760, 0.12, t, { tail: cycles(17, t) });
    drawOrca(c, lerp(1350, 960, close), 1130 + 10 * Math.sin(cycles(4, t) + 1), 820, Math.PI + 0.1, t, { tail: cycles(17, t) + 1 }, true);
  }, HAZE, 0.45);
  // The shark, rolling over: squashed across its height as it turns, mirrored past halfway.
  const shark = flipSharkAt(t);
  const r = rollAt(t);
  const squash = Math.max(0.55, Math.abs(Math.cos(Math.PI * r)));
  ctx.save();
  ctx.translate(shark.x, shark.y);
  ctx.rotate(shark.angle);
  ctx.scale(1, squash);
  ctx.rotate(-shark.angle);
  ctx.translate(-shark.x, -shark.y);
  glow(ctx, shark.x, shark.y, 420, '170,210,240', 0.18);
  drawGreatWhite(ctx, shark.x, shark.y, shark.length, shark.angle, t, { worried: clamp01(ram * 1.5) * (1 - r * 0.5), jaw: 0.3 * ram * (1 - r), tail: cycles(29, t) }, shark.flip);
  ctx.restore();
  // The ramming orca, driving up from below.
  const orca = ramOrcaAt(t);
  drawSpeedLines(ctx, onBody(orca, ORCA_SNOUT).x, onBody(orca, ORCA_SNOUT).y + 60, orca.angle, ram * (1 - r * 0.7), 260, 520);
  drawOrca(ctx, orca.x, orca.y, orca.length, orca.angle, t, { jaw: 0.1, tail: cycles(23, t) });
  // The splash of the roll: bubbles bursting off the shark.
  const burst = ramp(u, FLIPPED_AT + 0.1, UPSIDE_AT + 0.9) * until(u, AND_AT + 0.1);
  drawBubbles(ctx, shark.x, shark.y + 40, 18, 520, 40 + 480 * burst, Math.sin(Math.PI * burst), 7);
  // Right as it turns over, a thick burst of bubbles off its side.
  const turning = Math.max(0, 1 - Math.abs(r - 0.5) / 0.3);
  drawBubbles(ctx, shark.x, shark.y + 190, 34, 640, 60 + 60 * r, turning, 11);
  ctx.restore();
  drawVignette(ctx, 0.55, '2,8,22');
}
