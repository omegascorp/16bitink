import { drawTextLine, GILT } from './captions';
import { clamp01, VIDEO, window01 } from './short';

/**
 * The call to action in a narrated short's last ~3 s, as #101 on has it: the
 * big line, the small "tap the channel name", and an arrow down to where
 * YouTube shows the channel name (bottom left). It is gone 0.6 s before the
 * loop point, so frame 1 never carries it.
 */
export interface CtaTiming {
  readonly from: number;
  readonly to: number;
}

export const CTA_TEXT = {
  big: { y: 1148, size: 128 },
  small: { text: 'tap the channel name', y: 1230, size: 64 },
} as const;

/** The arrow's curve, from under the words down to the channel name. */
const ARROW = { from: { x: 200, y: 1262 }, c0: { x: 228, y: 1372 }, c1: { x: 185, y: 1420 }, tip: { x: 120, y: 1470 } } as const;

export const ctaAlpha = (u: number, c: CtaTiming): number => window01(u, c.from, c.to, 0.2);
export const arrowDrawn = (u: number, c: CtaTiming): number => clamp01((u - c.from - 0.15) / 0.45);

interface Pt {
  readonly x: number;
  readonly y: number;
}

function arrowPoint(u: number): Pt {
  const { from, c0, c1, tip } = ARROW;
  const v = 1 - u;
  const k = [v * v * v, 3 * v * v * u, 3 * v * u * u, u * u * u] as const;
  return { x: k[0] * from.x + k[1] * c0.x + k[2] * c1.x + k[3] * tip.x, y: k[0] * from.y + k[1] * c0.y + k[2] * c1.y + k[3] * tip.y };
}

function stroke(ctx: CanvasRenderingContext2D, pts: readonly Pt[], width: number, colour: string): void {
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
}

function drawArrow(ctx: CanvasRenderingContext2D, drawn: number): void {
  const steps = 40;
  const n = Math.max(2, Math.round(steps * drawn));
  const line = Array.from({ length: n + 1 }, (_, i) => arrowPoint((i / n) * drawn));
  const tip = line[line.length - 1]!;
  const before = line[Math.max(0, line.length - 6)]!;
  const dir = Math.atan2(tip.y - before.y, tip.x - before.x);
  const barb = (turn: number, len: number): Pt => ({ x: tip.x - Math.cos(dir + turn) * len, y: tip.y - Math.sin(dir + turn) * len });
  const head = [barb(0.62, 70), tip, barb(-0.56, 62)];
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  stroke(ctx, line, 22, '#120b05');
  if (drawn >= 0.98) stroke(ctx, head, 22, '#120b05');
  stroke(ctx, line, 10, GILT);
  if (drawn >= 0.98) stroke(ctx, head, 10, GILT);
  ctx.restore();
}

export function drawCta(ctx: CanvasRenderingContext2D, u: number, big: string, c: CtaTiming): void {
  const a = ctaAlpha(u, c);
  if (a <= 0) return;
  drawTextLine(ctx, big, VIDEO.width / 2, CTA_TEXT.big.y, CTA_TEXT.big.size, a, { fill: GILT, halo: '#120b05' });
  drawTextLine(ctx, CTA_TEXT.small.text, VIDEO.width / 2, CTA_TEXT.small.y, CTA_TEXT.small.size, a);
  ctx.save();
  ctx.globalAlpha = a;
  drawArrow(ctx, arrowDrawn(u, c));
  ctx.restore();
}
