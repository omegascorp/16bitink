import type { Pt } from './draw';

/**
 * Stencilled lettering, drawn rather than set in a font: each letter is a set of
 * straight bars with the small bridges a paint stencil leaves. Own units: a
 * letter is 1 tall.
 */

type Bar = readonly [Pt, Pt];

const p = (x: number, y: number): Pt => ({ x, y });

const GLYPHS: Readonly<Record<string, { readonly w: number; readonly bars: readonly Bar[] }>> = {
  A: { w: 0.78, bars: [[p(0.03, 1), p(0.33, 0.06)], [p(0.75, 1), p(0.45, 0.06)], [p(0.2, 0.68), p(0.58, 0.68)]] },
  L: { w: 0.54, bars: [[p(0.08, 0), p(0.08, 0.8)], [p(0.08, 0.92), p(0.52, 0.92)]] },
  V: { w: 0.78, bars: [[p(0.03, 0), p(0.33, 0.94)], [p(0.75, 0), p(0.45, 0.94)]] },
  I: { w: 0.22, bars: [[p(0.11, 0), p(0.11, 1)]] },
  N: { w: 0.72, bars: [[p(0.08, 0), p(0.08, 1)], [p(0.64, 0), p(0.64, 1)], [p(0.17, 0.12), p(0.55, 0.88)]] },
};

/** `text` centred at x, its top at y, `size` tall, in the current fill. */
export function stencil(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, fill: string, alpha: number): void {
  if (alpha <= 0.01) return;
  const gap = 0.16;
  const glyphs = [...text].map((c) => GLYPHS[c]).filter((g) => g !== undefined);
  const total = glyphs.reduce((s, g) => s + g.w + gap, -gap);
  ctx.save();
  ctx.translate(x - (total * size) / 2, y);
  ctx.scale(size, size);
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = fill;
  ctx.lineWidth = 0.17;
  ctx.lineCap = 'butt';
  let at = 0;
  for (const g of glyphs) {
    for (const [a, b] of g.bars) {
      ctx.beginPath();
      ctx.moveTo(at + a.x, a.y);
      ctx.lineTo(at + b.x, b.y);
      ctx.stroke();
    }
    at += g.w + gap;
  }
  ctx.restore();
}
