import { ramp } from '../short';
import type { Pt } from '../sprites';
import type { Cast } from './cast';
import { drawPythonBody, drawPythonHead, type Lay } from './python';
import { freeSlide, lookBack, tongueAt } from './story';
import { drawBandage } from './vet';

/**
 * "…and set the snake FREE. Still… you have to admit,": back in the forest
 * in daylight, the python slides off to the right, its bandage on, a slow
 * serpentine wave fixed to the ground as the body runs along it; on "Still…"
 * it stops, lifts its head and flicks its tongue at us.
 */
const LINE_Y = 1380;
const BASE = 96;
const LENGTH = 1700;

export function freeLay(t: number): Lay {
  const head = 480 + freeSlide(t);
  const n = 340;
  const spine = Array.from({ length: n + 1 }, (_, i) => {
    const x = head - (LENGTH * i) / n;
    return { x, y: LINE_Y + 26 * Math.sin(x * 0.007 + 0.6) };
  });
  const widths = spine.map((_, i) => BASE * (i > n * 0.7 ? 1 - 0.8 * ((i - n * 0.7) / (n * 0.3)) ** 1.4 : 1));
  return { spine, widths, base: BASE, headRight: true };
}

function drawTongue(ctx: CanvasRenderingContext2D, from: Pt, angle: number, out: number): void {
  if (out <= 0) return;
  const len = 70 * out;
  const tip = { x: from.x + Math.cos(angle) * len, y: from.y + Math.sin(angle) * len };
  ctx.save();
  ctx.strokeStyle = '#b8243a';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(tip.x, tip.y);
  for (const s of [-0.45, 0.45]) {
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(tip.x + Math.cos(angle + s) * 22 * out, tip.y + Math.sin(angle + s) * 22 * out);
  }
  ctx.stroke();
  ctx.restore();
}

export function drawFree(ctx: CanvasRenderingContext2D, cast: Cast, t: number, boil: number): void {
  ctx.drawImage(cast.day, -360 - 0.25 * freeSlide(t), 0);
  const lay = freeLay(t);
  drawPythonBody(ctx, cast.python, boil, lay, 0.9);
  drawBandage(ctx, lay, 560, 70);
  const lift = 0.32 * lookBack(t);
  drawPythonHead(ctx, cast.python, boil, lay, 'shut', lift);
  const k = lay.widths[0]! / 24;
  const a = lay.spine[0]!;
  drawTongue(ctx, { x: a.x + Math.cos(-lift) * 51 * k, y: a.y + Math.sin(-lift) * 51 * k + 2 }, -lift + 0.1, tongueAt(t));
  const v = ctx.createRadialGradient(540, 960, 420, 540, 960, 1200);
  v.addColorStop(0, 'rgba(4,10,8,0)');
  v.addColorStop(1, `rgba(4,10,8,${0.45 + 0.1 * ramp(t, 15, 16)})`);
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, 1080, 1920);
}
