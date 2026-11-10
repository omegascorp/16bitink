import { INK } from '../../../src/art/palette';
import { clamp01, smooth } from '../short';
import { drawSprite, type Sprite } from '../sprites';
import { type Agama, agamaSpine, agamaWidth, type HeadAt, KS, MOUTH_CUT, type Pt } from './story';

/**
 * The swallow, seen from above: the agama's front half is inside the snake,
 * under its head; the head (the shut drawing, so no open mouth shows) is
 * stretched wide round it, the snout broadened, and the lips close on its
 * flanks on both sides. Only the agama's back half comes out of the mouth.
 */

/** How much wider the head is at x (head-drawing units, 0 between the eyes, snout tip at 21), stretched round the agama by `k` (0..1); the neck is not. */
export const stretchAt = (x: number, k: number): number => 1 + k * (0.08 * clamp01((x + 16) / 8) + 0.37 * smooth((x - 6) / 13));

const NECK_X = -16;
const SLICE = 0.5;

/** The shut head, each thin slice across it widened by stretchAt. */
export function drawStretchedHead(ctx: CanvasRenderingContext2D, sprite: Sprite, boil: number, h: HeadAt, k: number): void {
  if (k <= 0) {
    drawSprite(ctx, sprite, boil, { x: h.x, y: h.y, rotation: h.heading, scale: KS * h.scale });
    return;
  }
  const canvas = sprite.frames[((boil % sprite.frames.length) + sprite.frames.length) % sprite.frames.length]!;
  const half = sprite.frame / 2;
  const res = canvas.width / sprite.frame;
  ctx.save();
  ctx.translate(h.x, h.y);
  ctx.rotate(h.heading);
  ctx.scale(KS * h.scale, KS * h.scale);
  ctx.drawImage(canvas, 0, 0, (NECK_X + half) * res, canvas.height, -half, -half, NECK_X + half, sprite.frame);
  for (let x = NECK_X; x < half; x += SLICE) {
    const g = stretchAt(x + SLICE / 2, k);
    ctx.drawImage(canvas, (x + half) * res, 0, SLICE * res, canvas.height, x, -half * g, SLICE + 0.03, sprite.frame * g);
  }
  ctx.restore();
}

/** The agama's own drawing point (board px) on screen, for its placement. */
function agamaPoint(a: Agama, p: Pt): Pt {
  const [c, s] = [Math.cos(a.angle), Math.sin(a.angle)];
  return { x: a.x + (c * p.x - s * p.y) * a.scale, y: a.y + (s * p.x + c * p.y) * a.scale };
}

/** The agama, its front (behind MOUTH_CUT, in the head's frame) hidden: that part is in the mouth. */
export function drawAgamaInMouth(ctx: CanvasRenderingContext2D, sprite: Sprite, boil: number, a: Agama, h: HeadAt): void {
  ctx.save();
  const screen = ctx.getTransform();
  ctx.translate(h.x, h.y);
  ctx.rotate(h.heading);
  ctx.scale(KS * h.scale, KS * h.scale);
  ctx.beginPath();
  ctx.rect(MOUTH_CUT, -400, 800, 800);
  ctx.clip();
  ctx.setTransform(screen);
  drawSprite(ctx, sprite, boil, { x: a.x, y: a.y, rotation: a.angle, scale: a.scale });
  ctx.restore();
}

/** The snake's lips (its lower jaw's edges) pressed on the agama's flanks where it goes in, both sides; under the head, which covers their back ends. */
export function drawLips(ctx: CanvasRenderingContext2D, a: Agama): void {
  if (a.sMouth === undefined) return;
  ctx.save();
  for (const side of [1, -1] as const) {
    const inner: Pt[] = [];
    const outer: Pt[] = [];
    for (let s = a.sMouth - 2.4; s <= a.sMouth + 1.6 + 1e-9; s += 0.2) {
      const p = agamaSpine(a.pose, s);
      const half = agamaWidth(s) / 2;
      // The jaw's edge thins to nothing at its tip, ahead of the snout.
      const thick = 1.25 * smooth((a.sMouth + 1.6 - s) / 1.6);
      inner.push(agamaPoint(a, { x: p.x, y: p.y + side * (half - 0.35) }));
      outer.push(agamaPoint(a, { x: p.x, y: p.y + side * (half + thick) }));
    }
    ctx.beginPath();
    [...inner, ...[...outer].reverse()].forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    ctx.fillStyle = '#a89d88';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.32 * a.scale;
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    outer.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    // The pale lip scales along it.
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = '#e9e1cf';
    ctx.lineWidth = 0.22 * a.scale;
    ctx.beginPath();
    inner.forEach((p, i) => {
      const q = { x: (p.x + outer[i]!.x) / 2, y: (p.y + outer[i]!.y) / 2 };
      if (i === 0) ctx.moveTo(q.x, q.y);
      else ctx.lineTo(q.x, q.y);
    });
    ctx.stroke();
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.22 * a.scale;
    ctx.beginPath();
    inner.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
