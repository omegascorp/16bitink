import { ellipse, INK, makeCanvas, PAPER, Pen, type Pt } from '../../../src/art/pen';
import { drawTextLine, type TextInk } from '../captions';
import { smooth, VIDEO } from '../short';
import { smoothCurve } from './geom';
import { TEXT } from './script';
import { cycles, japanAt, throbAt, timerAt, timerSecondsAt, wrap } from './story';

/**
 * The X-ray's company, in screen px: two scientists in lab coats and
 * goggles leaning in from the right, lit cyan by the screen; the flag and
 * name of Japan; and the stopwatch running down from "3:00".
 */

export const HALO = '#050914';
const ON_DARK: TextInk = { fill: PAPER, halo: HALO };
const SKIN = '#e0b48e';
const HAIR = '#2b2420';
const COAT = '#e6ebee';
const CYAN = 'rgba(140,225,255,0.75)';

/** One scientist, side on and facing left, head at (x, y). */
function scientist(pen: Pen, x: number, y: number, k: number, dim: number, hair: string): void {
  const P = (px: number, py: number): Pt => ({ x: x + px * k, y: y + py * k });
  const coat = smoothCurve([P(-160, 420), P(-150, 210), P(-108, 128), P(-40, 96), P(40, 100), P(118, 140), P(170, 230), P(200, 420)], 5);
  pen.fill(coat, COAT, 1);
  pen.clipped(coat, () => {
    pen.hatch(coat.map((p) => ({ x: p.x + 70 * k, y: p.y })), 9 * k, 1.1, 1.1, { color: '#7a8a96', alpha: 0.35 });
  });
  pen.stroke([...coat], 2.6, INK, 0.95);
  // The lapel and the shirt's dark V.
  pen.fill([P(-40, 96), P(10, 100), P(-12, 190)], '#36505e', 0.9);
  pen.hair([P(-40, 98), P(-30, 210), P(-70, 330)], 1.6, INK, 0.8);
  pen.hair([P(10, 102), P(30, 200)], 1.4, INK, 0.6);
  // A pen in the top pocket.
  pen.fill([P(60, 190), P(68, 190), P(68, 240), P(60, 240)], '#2d6fb0', 0.9);
  // Neck and head.
  pen.fill([P(-30, 40), P(26, 40), P(30, 104), P(-34, 104)], SKIN, 1);
  const head = ellipse(x, y, 60 * k, 72 * k, 26);
  pen.fill(head, SKIN, 1);
  const face = smoothCurve([P(-40, -60), P(-58, -24), P(-64, -4), P(-80, 16), P(-62, 24), P(-60, 40), P(-54, 50), P(-58, 58), P(-38, 74), P(0, 70)], 4);
  pen.fill([...face, P(10, 0)], SKIN, 1);
  pen.clipped([...head, ...face], () => pen.fill(ellipse(x + 30 * k, y + 10 * k, 50 * k, 70 * k, 18), '#9a6e52', 0.35));
  pen.stroke(face, 2.4, INK, 0.95);
  // Hair on top and at the back, an ear.
  const hairShape = smoothCurve([P(-48, -46), P(-30, -74), P(10, -82), P(52, -60), P(64, -10), P(54, 34), P(30, 10), P(12, -30), P(-20, -44)], 4, true);
  pen.fill(hairShape, hair, 1);
  pen.stroke([...hairShape, hairShape[0]!], 1.8, INK, 0.9);
  pen.fill(ellipse(x + 16 * k, y + 6 * k, 10 * k, 15 * k, 12), SKIN, 1);
  pen.stroke([...ellipse(x + 16 * k, y + 6 * k, 10 * k, 15 * k, 12)], 1.6, INK, 0.8);
  // Goggles: a strap round the head, a lens lit by the X-ray.
  pen.stroke([P(-50, -16), P(0, -20), P(62, -16)], 9 * k, '#1f2a30', 0.95, false);
  const lens = ellipse(x - 44 * k, y - 14 * k, 23 * k, 18 * k, 16);
  pen.fill(lens, '#7fd8ff', 0.75);
  pen.stroke([...lens, lens[0]!], 2.6, INK, 1);
  pen.dot(x - 50 * k, y - 20 * k, 4 * k, '#ffffff', 0.9);
  // A small mouth, the lit edge of the face and coat.
  pen.hair([P(-56, 42), P(-44, 44)], 1.6, INK, 0.8);
  pen.stroke(face.slice(1, 7).map((p) => ({ x: p.x + 4, y: p.y })), 3, CYAN, 0.6, false);
  pen.stroke(coat.slice(0, 10).map((p) => ({ x: p.x + 5, y: p.y })), 3.5, CYAN, 0.5, false);
  if (dim > 0) pen.fill([...coat, ...head], HALO, dim);
}

let layer: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null = null;
/** Where the scientists' coats have faded out, above the captions. */
export const SCIENTISTS_FADE = { from: 1010, to: 1100 } as const;

/** Two scientists, head and shoulders, sliding in from the right; their coats fade out above the captions. */
export function drawScientists(ctx: CanvasRenderingContext2D, amount: number, t: number, boil: number): void {
  if (amount <= 0.01) return;
  layer ??= makeCanvas(VIDEO.width, VIDEO.height);
  const c = layer.ctx;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalCompositeOperation = 'source-over';
  c.clearRect(0, 0, VIDEO.width, VIDEO.height);
  const slide = (1 - smooth(amount)) * 520;
  const bob = 4 * Math.sin(cycles(9, t));
  const pen = new Pen(c, 9100 + boil * 977, 1);
  scientist(pen, 1000 + slide, 885 + bob, 0.76, 0.35, '#5a4a3a');
  scientist(pen, 862 + slide, 940 - bob, 0.9, 0, HAIR);
  const fade = c.createLinearGradient(0, SCIENTISTS_FADE.from, 0, SCIENTISTS_FADE.to);
  fade.addColorStop(0, 'rgba(0,0,0,0)');
  fade.addColorStop(1, 'rgba(0,0,0,1)');
  c.globalCompositeOperation = 'destination-out';
  c.fillStyle = fade;
  c.fillRect(0, SCIENTISTS_FADE.from, VIDEO.width, VIDEO.height - SCIENTISTS_FADE.from);
  c.globalCompositeOperation = 'source-over';
  ctx.save();
  ctx.globalAlpha = Math.min(1, amount * 1.5);
  ctx.drawImage(layer.canvas, 0, 0);
  ctx.restore();
}

/** Japan's flag (a red disc on white, waving a little) and its name. */
export function drawJapan(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const a = japanAt(t);
  if (a <= 0.01) return;
  const pen = new Pen(ctx, 9300 + boil * 977, 0.8);
  const pop = 0.7 + 0.3 * smooth(a);
  const cx = 340;
  const cy = 396;
  const w = 150 * pop;
  const h = 100 * pop;
  const wave = (px: number): number => 6 * Math.sin(px / 40 + cycles(18, t));
  const top = Array.from({ length: 9 }, (_, i) => ({ x: cx - w / 2 + (w * i) / 8, y: cy - h / 2 + wave(w * i / 8) }));
  const bottom = top.map((p) => ({ x: p.x, y: p.y + h })).reverse();
  ctx.save();
  ctx.globalAlpha = a;
  pen.fill([...top, ...bottom], '#f6f2e8', 1);
  pen.fill(ellipse(cx, cy + wave(w / 2), 30 * pop, 30 * pop, 22), '#c8102e', 1);
  pen.stroke([...top, ...bottom, top[0]!], 2.6, INK, 1, false);
  pen.stroke([{ x: cx - w / 2 - 4, y: cy - h / 2 - 20 }, { x: cx - w / 2 - 4, y: cy + h / 2 + 60 }], 5, '#c9b48c', 1, false);
  ctx.restore();
  drawTextLine(ctx, 'Japan', TEXT.japan.x, TEXT.japan.y, TEXT.japan.size * pop, 700, a, ON_DARK);
}

/** The stopwatch: its face with a hand sweeping round and a red wedge of time used, and the time left. */
export function drawTimer(ctx: CanvasRenderingContext2D, t: number, boil: number): void {
  const a = timerAt(t);
  if (a <= 0.01) return;
  const u = wrap(t);
  const left = timerSecondsAt(u);
  const pen = new Pen(ctx, 9500 + boil * 977, 0.8);
  const cx = 380;
  const cy = 408;
  const r = 66 * (1 + 0.05 * throbAt(u));
  ctx.save();
  ctx.globalAlpha = a;
  pen.fill([{ x: cx - 12, y: cy - r - 22 }, { x: cx + 12, y: cy - r - 22 }, { x: cx + 12, y: cy - r + 2 }, { x: cx - 12, y: cy - r + 2 }], '#b9c2c8', 1);
  pen.fill(ellipse(cx, cy, r, r, 30), '#f6f2e8', 1);
  const used = (180 - left) / 60;
  ctx.fillStyle = 'rgba(220,60,40,0.55)';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, r * 0.86, -Math.PI / 2, -Math.PI / 2 + used * Math.PI * 2);
  ctx.closePath();
  ctx.fill();
  const hand = -Math.PI / 2 + ((180 - left) % 60) / 60 * Math.PI * 2;
  pen.stroke([{ x: cx, y: cy }, { x: cx + Math.cos(hand) * r * 0.8, y: cy + Math.sin(hand) * r * 0.8 }], 4, INK, 1, false);
  pen.dot(cx, cy, 6, INK, 1);
  pen.stroke([...ellipse(cx, cy, r, r, 30), ellipse(cx, cy, r, r, 30)[0]!], 4, INK, 1, false);
  ctx.restore();
  const m = Math.floor(left / 60);
  const s = Math.floor(left % 60);
  drawTextLine(ctx, `${m}:${String(s).padStart(2, '0')}`, TEXT.timer.x, TEXT.timer.y, TEXT.timer.size, 700, a, { fill: '#ffb08a', halo: HALO });
}
