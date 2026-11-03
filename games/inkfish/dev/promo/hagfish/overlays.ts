import { drawTextLine, type TextInk } from '../captions';
import { VIDEO } from '../short';
import { countAt, countShowAt, handAt, secondsAt, stopwatchAt, viewAt, zealandAt } from './story';
import { TEXT } from './script';

/** The two things drawn over the picture: the stopwatch ("0.4 s") and the camera's viewfinder (REC, brackets, 14, New Zealand). */

const HALO = '#04101a';
const PAPER = '#f4eddc';
const WATCH: TextInk = { fill: PAPER, halo: HALO };
const RED = '#ff4a3c';
const GOLD = '#f5c84a';
const CX = VIDEO.width / 2;
const WATCH_C = { x: CX, y: 468 };
const WATCH_R = 168;

export function prepareViewfinder(): void {
  // Nothing to bake: drawn live from vectors.
}

/** A stopwatch: a dial, twelve ticks, a sweeping hand and a pie of time gone, with the seconds in the middle. */
export function drawStopwatch(ctx: CanvasRenderingContext2D, t: number): void {
  const a = stopwatchAt(t);
  if (a <= 0.005) return;
  const hand = handAt(t);
  const pop = 0.82 + 0.18 * Math.min(1, a * 1.4);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(WATCH_C.x, WATCH_C.y);
  ctx.scale(pop, pop);
  // The crown and button.
  ctx.fillStyle = '#c9ccd0';
  ctx.strokeStyle = '#1b1a1f';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(-22, -WATCH_R - 44, 44, 34, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillRect(-9, -WATCH_R - 12, 18, 14);
  // The case and face.
  const rim = ctx.createLinearGradient(-WATCH_R, -WATCH_R, WATCH_R, WATCH_R);
  rim.addColorStop(0, '#f2f4f5');
  rim.addColorStop(1, '#7d868e');
  ctx.fillStyle = rim;
  ctx.beginPath();
  ctx.arc(0, 0, WATCH_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 7;
  ctx.stroke();
  ctx.fillStyle = 'rgba(6,26,40,0.94)';
  ctx.beginPath();
  ctx.arc(0, 0, WATCH_R - 18, 0, Math.PI * 2);
  ctx.fill();
  // Time gone: a wedge from twelve o'clock.
  const sweep = Math.PI * 2 * 0.4 * hand;
  ctx.fillStyle = 'rgba(255,74,60,0.55)';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, WATCH_R - 22, -Math.PI / 2, -Math.PI / 2 + sweep);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = PAPER;
  ctx.lineCap = 'round';
  for (let i = 0; i < 12; i++) {
    const ang = (i * Math.PI) / 6 - Math.PI / 2;
    const r0 = WATCH_R - 26;
    const r1 = WATCH_R - (i % 3 === 0 ? 50 : 40);
    ctx.lineWidth = i % 3 === 0 ? 7 : 4;
    ctx.beginPath();
    ctx.moveTo(Math.cos(ang) * r0, Math.sin(ang) * r0);
    ctx.lineTo(Math.cos(ang) * r1, Math.sin(ang) * r1);
    ctx.stroke();
  }
  const ang = -Math.PI / 2 + sweep;
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(ang) * (WATCH_R - 34), Math.sin(ang) * (WATCH_R - 34));
  ctx.stroke();
  ctx.fillStyle = GOLD;
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  drawTextLine(ctx, `${secondsAt(t).toFixed(1)} s`, CX, TEXT.stopwatch.y, TEXT.stopwatch.size, 700, a * hand > 0.02 ? a : 0, WATCH);
}

/** The camera's viewfinder: corner brackets, a blinking REC dot, a counter ticking up and the place. */
export function drawViewfinder(ctx: CanvasRenderingContext2D, t: number): void {
  const a = viewAt(t);
  if (a <= 0.005) return;
  ctx.save();
  ctx.globalAlpha = a;
  // A dark vignette and a few scanlines.
  const vg = ctx.createRadialGradient(CX, 800, 500, CX, 800, 1250);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  for (let y = 0; y < VIDEO.height; y += 8) ctx.fillRect(0, y, VIDEO.width, 3);
  // Corner brackets.
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = 9;
  ctx.lineCap = 'square';
  const [x0, x1, y0, y1, s] = [64, VIDEO.width - 64, 276, 1250, 96];
  for (const [x, y, dx, dy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]] as const) {
    ctx.beginPath();
    ctx.moveTo(x + dx * s, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + dy * s);
    ctx.stroke();
  }
  // A small centre cross.
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(CX - 26, 760);
  ctx.lineTo(CX + 26, 760);
  ctx.moveTo(CX, 734);
  ctx.lineTo(CX, 786);
  ctx.stroke();
  // REC, blinking twice a second.
  const on = Math.floor(t * 2) % 2 === 0;
  if (on) {
    ctx.fillStyle = RED;
    ctx.beginPath();
    ctx.arc(x0 + 54, TEXT.rec.y - 22, 20, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  drawTextLine(ctx, 'REC', x0 + 190, TEXT.rec.y, TEXT.rec.size, 700, a, WATCH);
  const show = countShowAt(t);
  if (show > 0.01) {
    drawTextLine(ctx, String(countAt(t)), CX, TEXT.count.y, TEXT.count.size, 700, show * a, { fill: GOLD, halo: HALO });
    drawTextLine(ctx, 'times on camera', CX, TEXT.countSub.y, TEXT.countSub.size, 700, show * a, WATCH);
  }
  drawTextLine(ctx, 'New Zealand', CX, TEXT.zealand.y, TEXT.zealand.size, 700, zealandAt(t) * a, WATCH);
}
