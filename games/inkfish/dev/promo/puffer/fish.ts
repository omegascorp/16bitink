import { bodyProportions } from '../../../src/art/fishArt';
import { INK } from '../../../src/art/pen';
import type { Pose } from '../chain';
import type { Sprite } from '../sprites';
import { drawSwimmer } from '../swimmer';
import { drawnLen, type Puffer } from './story';

/**
 * The puffer as the game draws it, blown up the game's way (1.7 times its
 * size), rounder as it fills, with spines standing out all round once it is
 * a ball.
 */

const { hl, hh } = bodyProportions('puffer');
const SPINES = 46;
/** Spine angles round the body, leaving the mouth and tail clear. */
const SPINE_ANGLES: readonly number[] = Array.from({ length: SPINES }, (_, i) => (i / SPINES) * Math.PI * 2 + 0.07).filter(
  (a) => Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) > 0.38 && Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < Math.PI - 0.55,
);

export function pufferPose(p: Puffer): Pose {
  return { j: 0, shape: 'puffer', age: 0, x: p.x, y: p.y, length: drawnLen(p), facing: 1, tilt: p.tilt, beat: p.beat, effort: p.effort };
}

/** Taller and a touch shorter as it fills: a ball, not a big fish. */
export function pufferLook(p: Puffer): { readonly squash: number; readonly stretch: number } {
  return { squash: 1 + 0.22 * p.inf + p.jiggle, stretch: 1 - 0.06 * p.inf - 0.5 * p.jiggle };
}

/** Half-length and half-height of the body on screen. */
function radii(p: Puffer): { readonly a: number; readonly b: number } {
  const look = pufferLook(p);
  const l = drawnLen(p);
  return { a: (l / 2) * look.stretch, b: (l / 2) * (hh / hl) * look.squash };
}

/** Spines standing out from the skin, drawn under the body so their roots are hidden. */
function drawSpines(ctx: CanvasRenderingContext2D, p: Puffer): void {
  const out = Math.max(0, Math.min(1.1, (p.inf - 0.35) / 0.6));
  if (out <= 0) return;
  const { a, b } = radii(p);
  const len = drawnLen(p) * 0.085 * out;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(-p.tilt);
  ctx.fillStyle = INK;
  for (const [i, ang] of SPINE_ANGLES.entries()) {
    const cx = Math.cos(ang);
    const sy = Math.sin(ang);
    const root = { x: a * 0.9 * cx, y: b * 0.9 * sy };
    // Normal of the ellipse there.
    const nx = cx / a;
    const ny = sy / b;
    const n = Math.hypot(nx, ny);
    const l = len * (i % 2 ? 0.8 : 1.05);
    const tip = { x: a * cx + (nx / n) * l, y: b * sy + (ny / n) * l };
    const w = drawnLen(p) * 0.012;
    ctx.beginPath();
    ctx.moveTo(root.x - (ny / n) * w, root.y + (nx / n) * w);
    ctx.lineTo(tip.x, tip.y);
    ctx.lineTo(root.x + (ny / n) * w, root.y - (nx / n) * w);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** Prickles on the stretched skin, each a dot and a short stroke pointing out. */
function drawPrickles(ctx: CanvasRenderingContext2D, p: Puffer): void {
  const out = Math.max(0, Math.min(1, (p.inf - 0.5) / 0.5));
  if (out <= 0) return;
  const { a, b } = radii(p);
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(-p.tilt);
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1.5, drawnLen(p) * 0.005);
  ctx.globalAlpha = 0.75 * out;
  for (let ring = 0; ring < 3; ring++) {
    const r = 0.45 + ring * 0.17;
    const count = 9 + ring * 4;
    for (let k = 0; k < count; k++) {
      const ang = (k / count) * Math.PI * 2 + ring * 0.4;
      const x = a * r * Math.cos(ang);
      const y = b * r * Math.sin(ang);
      // Keep the eye and mouth clear.
      if (x > a * 0.25 && y < b * 0.1) continue;
      if (x > a * 0.55) continue;
      const len = drawnLen(p) * 0.02;
      ctx.beginPath();
      ctx.arc(x, y, ctx.lineWidth * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
      ctx.stroke();
    }
  }
  ctx.restore();
}

export function drawPuffer(ctx: CanvasRenderingContext2D, sprite: Sprite, p: Puffer, boil: number): void {
  drawSpines(ctx, p);
  drawSwimmer(ctx, sprite, pufferPose(p), boil, pufferLook(p));
  drawPrickles(ctx, p);
}

/** The outer edge of the ball (spines and all) for effects round it. */
export function ballRadius(p: Puffer): number {
  const { a, b } = radii(p);
  return Math.max(a, b) + drawnLen(p) * 0.085 * Math.max(0, Math.min(1.1, (p.inf - 0.35) / 0.6));
}
