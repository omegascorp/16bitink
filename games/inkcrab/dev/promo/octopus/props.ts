import { INK, PAPER, PAPER_FILL, RED } from '../../../src/art/palette';
import { CAPTION_FONT, drawTextLine, type TextInk } from '../captions';
import { clamp01, lerp } from '../short';
import type { P } from './motion';
import { BEAT_OFFSET, BEAT_S, type HeartId, stoppedAt } from './story';

/**
 * The notebook's props over the pool: handwritten callouts with leader
 * lines, the numbers on the hearts, the copper and iron tiles, the heart
 * monitor whose third trace goes flat, the crab's "!" and a puff of sand.
 */
export const BLUE_INK = '#2a66d4';
export const IN_BLUE: TextInk = { fill: BLUE_INK, halo: PAPER };
export const IN_RED: TextInk = { fill: RED, halo: PAPER };

/** A label in ink handwriting, with leader lines to what it names. */
export function callout(ctx: CanvasRenderingContext2D, text: string, at: P, to: readonly P[], alpha: number, size = 64, colours?: TextInk): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = colours?.fill ?? INK;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  for (const p of to) {
    const from = { x: at.x, y: p.y > at.y ? at.y + size * 0.25 : at.y - size * 0.8 };
    const dx = p.x - from.x;
    const dy = p.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    ctx.beginPath();
    ctx.moveTo(from.x + (dx / len) * 10, from.y + (dy / len) * 10);
    ctx.lineTo(p.x - (dx / len) * 8, p.y - (dy / len) * 8);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
  }
  ctx.restore();
  drawTextLine(ctx, text, at.x, at.y, size, 700, alpha, colours);
}

/** A heart's number, popped by `scale`, with a ring spreading as it is counted (`ring` 0 .. 1). */
export function drawNumber(ctx: CanvasRenderingContext2D, n: HeartId, at: P, scale: number, rings: readonly number[]): void {
  for (const u of rings) {
    if (u < 0 || u > 1) continue;
    ctx.save();
    ctx.globalAlpha = 1 - u;
    ctx.strokeStyle = RED;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(at.x, at.y - 20, 34 + 46 * u, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  if (scale <= 0) return;
  drawTextLine(ctx, String(n), at.x, at.y, 76 * scale, 700, clamp01(scale * 2), { fill: RED, halo: PAPER_FILL });
}

/** A periodic-table tile: its number, symbol and name, washed in the metal's colour, with a drop of the blood it makes. */
export function drawTile(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, el: { readonly n: number; readonly sym: string; readonly name: string; readonly wash: string; readonly blood: string }): void {
  if (s <= 0) return;
  const w = 200;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.rotate(el.sym === 'Cu' ? -0.05 : 0.05);
  ctx.fillStyle = PAPER_FILL;
  ctx.fillRect(-w / 2, -w / 2, w, w);
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = el.wash;
  ctx.fillRect(-w / 2 + 4, -w / 2 + 3, w, w);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.lineJoin = 'round';
  ctx.strokeRect(-w / 2, -w / 2, w, w);
  ctx.fillStyle = INK;
  ctx.textAlign = 'left';
  ctx.font = `700 40px ${CAPTION_FONT}`;
  ctx.fillText(String(el.n), -w / 2 + 14, -w / 2 + 42);
  ctx.textAlign = 'center';
  ctx.font = `700 104px ${CAPTION_FONT}`;
  ctx.fillText(el.sym, 0, 34);
  ctx.font = `700 42px ${CAPTION_FONT}`;
  ctx.fillText(el.name, 0, w / 2 - 18);
  // The drop of blood it makes: blue for copper, red for iron.
  ctx.translate(66, -62);
  ctx.scale(0.75, 0.75);
  ctx.beginPath();
  ctx.moveTo(0, -30);
  ctx.bezierCurveTo(10, -14, 20, -2, 20, 10);
  ctx.arc(0, 10, 20, 0, Math.PI);
  ctx.bezierCurveTo(-20, -2, -10, -14, 0, -30);
  ctx.fillStyle = el.blood;
  ctx.fill();
  ctx.lineWidth = 3.5;
  ctx.stroke();
  ctx.restore();
}

/** A big red ✗ drawn across a tile, `u` 0 .. 1 of its two strokes. */
export function drawCross(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, u: number): void {
  if (u <= 0) return;
  ctx.save();
  ctx.strokeStyle = RED;
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  const a = clamp01(u * 2);
  const b = clamp01(u * 2 - 1);
  ctx.beginPath();
  ctx.moveTo(x - r, y - r);
  ctx.lineTo(lerp(x - r, x + r, a), lerp(y - r, y + r, a));
  if (b > 0) {
    ctx.moveTo(x + r, y - r);
    ctx.lineTo(lerp(x + r, x - r, b), lerp(y - r, y + r, b));
  }
  ctx.stroke();
  ctx.restore();
}

/** One heartbeat on the trace at time τ: a small bump, the spike, a dip and a slow wave after. */
function ecg(id: HeartId, tau: number): number {
  const u = (((tau - BEAT_OFFSET[id]) % BEAT_S) + BEAT_S) % BEAT_S;
  const g = (c: number, w: number): number => Math.exp(-(((u - c) / w) ** 2));
  const v = 0.15 * g(0.0, 0.025) + g(0.06, 0.012) - 0.35 * g(0.085, 0.012) + 0.22 * g(0.22, 0.04);
  return id === 3 ? v * (1 - stoppedAt(tau)) : v;
}

/** The monitor card: three traces scrolling left, heart 3's flat while it is stopped. */
export const MONITOR = { x: 40, y: 290, w: 420, h: 250 } as const;
export function drawMonitor(ctx: CanvasRenderingContext2D, t: number, show: number, stopped: number): void {
  if (show <= 0) return;
  const { x, y, w, h } = MONITOR;
  const slide = (1 - show) * -60;
  ctx.save();
  ctx.globalAlpha = clamp01(show * 1.5);
  ctx.translate(slide, 0);
  ctx.fillStyle = PAPER_FILL;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.strokeRect(x, y, w, h);
  const rows: readonly [HeartId, string][] = [[1, '1'], [2, '2'], [3, '3']];
  rows.forEach(([id, label], r) => {
    const cy = y + 62 + r * 72;
    const flat = id === 3 ? stopped : 0;
    ctx.font = `700 52px ${CAPTION_FONT}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = id === 3 ? RED : INK;
    ctx.fillText(label, x + 34, cy + 18);
    const x0 = x + 70;
    const x1 = x + w - 22;
    ctx.strokeStyle = id === 3 && flat > 0.5 ? RED : INK;
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let px = x0; px <= x1; px += 3) {
      const tau = t - (x1 - px) / 260;
      const v = ecg(id, tau);
      if (px === x0) ctx.moveTo(px, cy - v * 44);
      else ctx.lineTo(px, cy - v * 44);
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x1, cy - ecg(id, t) * 44, 7, 0, Math.PI * 2);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
  });
  ctx.restore();
}

/** A "!" (the game's alarm) over something that has just noticed trouble. */
export function drawExclaim(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  if (size <= 0) return;
  drawTextLine(ctx, '!', x, y, size, 700, 1, { fill: RED, halo: PAPER_FILL });
}

/** A puff of sand kicked up, `u` 0 .. 1 through it. */
export function drawPuff(ctx: CanvasRenderingContext2D, at: P, u: number, seed: number): void {
  if (u < 0 || u > 1) return;
  ctx.save();
  for (let k = 0; k < 6; k++) {
    const a = -Math.PI / 2 + (k - 2.5) * 0.5 + seed;
    const d = 20 + 50 * u;
    ctx.globalAlpha = 0.4 * (1 - u);
    ctx.fillStyle = '#b89c6c';
    ctx.beginPath();
    ctx.arc(at.x + Math.cos(a) * d, at.y + Math.sin(a) * d * 0.7, 7 + 10 * u, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
