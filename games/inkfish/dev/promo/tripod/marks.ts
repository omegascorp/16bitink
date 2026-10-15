import { PAPER } from '../../../src/art/pen';
import { drawTextLine, type TextInk } from '../captions';
import { lerp } from '../short';
import type { Pt } from './body';
import { CHALK, drawCopepod, NIGHT, SPOKEN } from './scene';
import { FLOOR_Y } from './story';

/** The short's chalk marks: labels with leader lines, the depth gauge, the numbered rays, the measuring bars and the lens. */

export const PAPER_ON_INK: TextInk = { fill: PAPER, halo: NIGHT };
export const YELLOW_ON_INK: TextInk = { fill: SPOKEN, halo: NIGHT };

export const write = (ctx: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, alpha: number, ink: TextInk = PAPER_ON_INK): void =>
  drawTextLine(ctx, s, x, y, size, 700, alpha, ink);

/** A chalk line with a dot at its end, `alpha` 0 .. 1, drawn out from `from` as `grow` goes 0 → 1. */
export function drawLeader(ctx: CanvasRenderingContext2D, from: Pt, to: Pt, alpha: number, grow = 1, colour = CHALK): void {
  if (alpha <= 0 || grow <= 0) return;
  const end = { x: lerp(from.x, to.x, grow), y: lerp(from.y, to.y, grow) };
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = NIGHT;
  ctx.lineCap = 'round';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
  ctx.strokeStyle = colour;
  ctx.lineWidth = 3.5;
  ctx.stroke();
  if (grow >= 1) {
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.arc(to.x, to.y, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** A label with leader lines to the things it names, starting just off the text. */
export function drawCallout(ctx: CanvasRenderingContext2D, text: string, at: Pt, to: readonly Pt[], alpha: number, size = 64): void {
  if (alpha <= 0) return;
  for (const p of to) {
    const from = { x: at.x, y: p.y > at.y ? at.y + size * 0.25 : at.y - size * 0.8 };
    const dx = p.x - from.x;
    const dy = p.y - from.y;
    const len = Math.hypot(dx, dy);
    if (len > 40) drawLeader(ctx, { x: from.x + (dx / len) * 10, y: from.y + (dy / len) * 10 }, { x: p.x - (dx / len) * 10, y: p.y - (dy / len) * 10 }, alpha);
  }
  write(ctx, text, at.x, at.y, size, alpha);
}

// ---------------------------------------------------------------- depth

/** The depth gauge down the right edge, 0 m at the top to 5,000 m at the mud, and its readout at the top. */
const GAUGE = { x: 1010, top: 350, bottom: FLOOR_Y - 20, max: 5000 } as const;
const gaugeY = (m: number): number => GAUGE.top + ((GAUGE.bottom - GAUGE.top) * m) / GAUGE.max;

export function drawDepth(ctx: CanvasRenderingContext2D, show: number, metres: number, km: number): void {
  if (show <= 0) return;
  ctx.save();
  ctx.globalAlpha = show;
  ctx.strokeStyle = CHALK;
  ctx.lineCap = 'round';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(GAUGE.x, GAUGE.top);
  ctx.lineTo(GAUGE.x, GAUGE.bottom);
  for (let m = 0; m <= GAUGE.max; m += 1000) {
    ctx.moveTo(GAUGE.x - (m % 2000 === 0 ? 26 : 16), gaugeY(m));
    ctx.lineTo(GAUGE.x, gaugeY(m));
  }
  ctx.stroke();
  // The marker riding down, a yellow wedge pointing at the scale.
  const y = gaugeY(metres);
  ctx.fillStyle = SPOKEN;
  ctx.strokeStyle = NIGHT;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(GAUGE.x - 8, y);
  ctx.lineTo(GAUGE.x - 44, y - 18);
  ctx.lineTo(GAUGE.x - 44, y + 18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  write(ctx, '0 m', GAUGE.x - 20, GAUGE.top - 22, 44, show);
  write(ctx, `${metres.toLocaleString('en-US')} m`, 540, 440, 150, show, YELLOW_ON_INK);
  write(ctx, '4.5 km down', 540, 520, 64, km);
}

// ---------------------------------------------------------------- rays and bars

/** A number in a chalk ring, popping in. */
export function drawTag(ctx: CanvasRenderingContext2D, n: number, at: Pt, show: number): void {
  if (show <= 0) return;
  const r = 34 * Math.min(1.15, show * 1.15);
  ctx.save();
  ctx.globalAlpha = Math.min(1, show * 1.5);
  ctx.fillStyle = NIGHT;
  ctx.strokeStyle = SPOKEN;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(at.x, at.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  write(ctx, String(n), at.x, at.y + r * 0.42, r * 1.5, Math.min(1, show * 1.5), YELLOW_ON_INK);
}

/** A measuring bar from `a` to `b` with end ticks, in `colour`. */
export function drawBar(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, colour: string, alpha: number): void {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (alpha <= 0 || len < 2) return;
  const nx = (-dy / len) * 16;
  const ny = (dx / len) * 16;
  const path = (): void => {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    for (const p of [a, b]) {
      ctx.moveTo(p.x - nx, p.y - ny);
      ctx.lineTo(p.x + nx, p.y + ny);
    }
  };
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  path();
  ctx.strokeStyle = NIGHT;
  ctx.lineWidth = 12;
  ctx.stroke();
  path();
  ctx.strokeStyle = colour;
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------- the lens

export const LENS = { x: 790, y: 360, r: 165 } as const;

/** A magnifier on the copepod in the fins: a chalk ring, the copepod big inside, and two lines down to the real one. */
export function drawLens(ctx: CanvasRenderingContext2D, on: Pt, open: number, t: number): void {
  if (open <= 0) return;
  const r = LENS.r * Math.min(1, open * 1.05);
  const dx = on.x - LENS.x;
  const dy = on.y - LENS.y;
  const d = Math.hypot(dx, dy) || 1;
  const side = Math.asin(Math.min(1, r / d));
  const base = Math.atan2(dy, dx);
  ctx.save();
  ctx.globalAlpha = open;
  ctx.strokeStyle = CHALK;
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 10]);
  for (const s of [-1, 1]) {
    const a = base + s * (Math.PI / 2 - side);
    ctx.beginPath();
    ctx.moveTo(LENS.x + Math.cos(a) * r, LENS.y + Math.sin(a) * r);
    ctx.lineTo(on.x, on.y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(on.x, on.y, 26, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(LENS.x, LENS.y, r, 0, Math.PI * 2);
  ctx.fillStyle = '#2a3f5e';
  ctx.fill();
  ctx.clip();
  // Specks drifting by inside, with the current.
  ctx.fillStyle = '#c8d4e4';
  for (let i = 0; i < 14; i++) {
    const x = LENS.x - r + ((i * 97 + t * 60) % (2 * r));
    const y = LENS.y - r + ((i * 53) % (2 * r));
    ctx.globalAlpha = 0.35 * open;
    ctx.beginPath();
    ctx.arc(x, y, 2 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = open;
  drawCopepod(ctx, { x: LENS.x + 10, y: LENS.y + 6 * Math.sin(t * 3) }, r * 1.05, Math.PI + 0.15 * Math.sin(t * 1.3), t, '#120a06', open);
  ctx.restore();
  ctx.save();
  ctx.globalAlpha = open;
  ctx.strokeStyle = NIGHT;
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(LENS.x, LENS.y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = CHALK;
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.restore();
}

/** A dashed arrow bowing from `a` to `b`, drawn out as `grow` goes 0 → 1. */
export function drawDashedArrow(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, alpha: number, bow: number): void {
  if (alpha <= 0) return;
  const mid = { x: (a.x + b.x) / 2 - bow, y: (a.y + b.y) / 2 + bow * 0.4 };
  const pt = (u: number): Pt => ({
    x: (1 - u) ** 2 * a.x + 2 * u * (1 - u) * mid.x + u * u * b.x,
    y: (1 - u) ** 2 * a.y + 2 * u * (1 - u) * mid.y + u * u * b.y,
  });
  const tip = pt(0.9);
  const back = pt(0.8);
  const ang = Math.atan2(tip.y - back.y, tip.x - back.x);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = SPOKEN;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.setLineDash([12, 12]);
  ctx.beginPath();
  for (let i = 1; i <= 18; i++) {
    const p = pt(0.1 + (0.8 * i) / 18);
    if (i === 1) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(tip.x + Math.cos(ang + 2.5) * 22, tip.y + Math.sin(ang + 2.5) * 22);
  ctx.lineTo(tip.x, tip.y);
  ctx.lineTo(tip.x + Math.cos(ang - 2.5) * 22, tip.y + Math.sin(ang - 2.5) * 22);
  ctx.stroke();
  ctx.restore();
}
