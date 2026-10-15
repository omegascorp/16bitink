import { INK, PAPER } from '../../../src/art/pen';
import type { BabyPose } from './brood';

/**
 * A newborn pipefish, drawn as a little ink glyph rather than the game's
 * sprite (which shrinks to a hairline at this size): a wriggling olive
 * body, a round head with a big eye, the tube snout and a tail fan.
 */

const BODY = '#6f7d3f';

export function drawBaby(ctx: CanvasRenderingContext2D, p: BabyPose, alpha: number): void {
  if (alpha <= 0) return;
  const L = p.len;
  const n = 10;
  // The spine from the tail (-L/2) to the head (+0.28 L), the tail half wriggling.
  const spine = Array.from({ length: n + 1 }, (_, k) => {
    const u = k / n;
    const x = -L / 2 + u * 0.78 * L;
    const swing = (1 - u) ** 1.6;
    return { x, y: L * (0.05 + 0.05 * p.effort) * swing * Math.sin(p.beat - 3 * u) };
  });
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(p.x, p.y);
  ctx.scale(p.facing, 1);
  ctx.rotate(-p.tilt);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const trace = (): void => {
    ctx.beginPath();
    spine.forEach((q, k) => (k === 0 ? ctx.moveTo(q.x, q.y) : ctx.lineTo(q.x, q.y)));
  };
  const head = spine[n]!;
  // Tail fan.
  const tail = spine[0]!;
  ctx.fillStyle = BODY;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(tail.x + L * 0.04, tail.y);
  ctx.lineTo(tail.x - L * 0.08, tail.y - L * 0.06);
  ctx.lineTo(tail.x - L * 0.08, tail.y + L * 0.06);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Snout.
  ctx.lineWidth = Math.max(2.5, L * 0.045);
  ctx.beginPath();
  ctx.moveTo(head.x, head.y);
  ctx.lineTo(head.x + L * 0.24, head.y - L * 0.01);
  ctx.stroke();
  // Body: an ink outline, then the olive inside.
  trace();
  ctx.lineWidth = L * 0.12;
  ctx.stroke();
  trace();
  ctx.strokeStyle = BODY;
  ctx.lineWidth = L * 0.07;
  ctx.stroke();
  // Head and the big eye.
  ctx.beginPath();
  ctx.arc(head.x, head.y, L * 0.085, 0, Math.PI * 2);
  ctx.fillStyle = BODY;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(head.x + L * 0.02, head.y - L * 0.015, L * 0.05, 0, Math.PI * 2);
  ctx.fillStyle = PAPER;
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(head.x + L * 0.03, head.y - L * 0.015, L * 0.028, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
