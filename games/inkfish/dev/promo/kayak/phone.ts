import { INK, Pen } from '../../../src/art/pen';
import { drawTextLine } from '../captions';
import { CHALK, INK_BG } from './scene';

/**
 * Dad's phone, filming: a dark handset in his hand, its screen showing the
 * gulp (the replay, drawn full size elsewhere and laid in here), a blinking
 * red REC dot, a timer and the viewfinder's corner marks. Its screen is 9:16,
 * so blown up to the whole frame it is frame 1.
 */

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

const BODY = '#16191d';
const RED = '#e0412f';
const SKIN = '#ecc6a0';

function rounded(ctx: CanvasRenderingContext2D, r: Rect, radius: number): void {
  ctx.beginPath();
  ctx.roundRect(r.x, r.y, r.w, r.h, radius);
}

export function drawPhone(ctx: CanvasRenderingContext2D, screen: Rect, replay: HTMLCanvasElement, rec: number, blink: boolean, seconds: number, boil: number): void {
  const m = screen.w * 0.05;
  const body = { x: screen.x - m, y: screen.y - m * 2.2, w: screen.w + 2 * m, h: screen.h + 4.4 * m };
  const pen = new Pen(ctx, 7177 + boil * 977, 1.2);
  ctx.save();
  // The handset.
  rounded(ctx, body, m * 2.2);
  ctx.fillStyle = BODY;
  ctx.fill();
  ctx.lineWidth = Math.max(2, m * 0.16);
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(200,210,215,0.35)';
  ctx.lineWidth = Math.max(1, m * 0.08);
  rounded(ctx, { x: body.x + m * 0.25, y: body.y + m * 0.25, w: body.w - m * 0.5, h: body.h - m * 0.5 }, m * 2);
  ctx.stroke();
  // The screen: the replay.
  ctx.save();
  // Square corners by the loop point, where the screen is the whole frame.
  rounded(ctx, screen, m * 0.6 * rec);
  ctx.clip();
  ctx.drawImage(replay, screen.x, screen.y, screen.w, screen.h);
  ctx.restore();
  // Dad's thumb over the edge (let go as we zoom into the screen).
  ctx.globalAlpha = rec;
  ctx.beginPath();
  ctx.ellipse(body.x + m * 0.4, screen.y + screen.h * 0.62, m * 1.2, m * 2.3, 0.15, 0, Math.PI * 2);
  ctx.fillStyle = SKIN;
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, m * 0.14);
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.restore();
  if (rec <= 0.01) return;
  // Recording: the dot, "REC", the timer, the viewfinder's corners.
  const k = screen.w / 560;
  ctx.save();
  ctx.globalAlpha = rec;
  if (blink) pen.dot(screen.x + 48 * k, screen.y + 58 * k, 15 * k, RED, 1);
  pen.circle(screen.x + 48 * k, screen.y + 58 * k, 15 * k, 2.4 * k, INK);
  drawTextLine(ctx, 'REC', screen.x + 112 * k, screen.y + 74 * k, 50 * k, 700, rec, { fill: RED, halo: INK_BG });
  const secs = Math.floor(seconds);
  drawTextLine(ctx, `00:0${secs % 10}`, screen.x + screen.w - 100 * k, screen.y + 74 * k, 46 * k, 700, rec, { fill: CHALK, halo: INK_BG });
  ctx.strokeStyle = CHALK;
  ctx.lineWidth = 4 * k;
  ctx.lineCap = 'round';
  const c = 40 * k;
  const inset = 30 * k;
  for (const [cx, cy, sx, sy] of [
    [screen.x + inset, screen.y + inset + 70 * k, 1, 1], [screen.x + screen.w - inset, screen.y + inset + 70 * k, -1, 1],
    [screen.x + inset, screen.y + screen.h - inset, 1, -1], [screen.x + screen.w - inset, screen.y + screen.h - inset, -1, -1],
  ] as const) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + sy * c);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + sx * c, cy);
    ctx.stroke();
  }
  ctx.restore();
}
