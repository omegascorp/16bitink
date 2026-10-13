import { INK } from '../../../src/art/pen';
import { drawTextLine } from '../captions';
import { counterAt, FIGURES, figureAt } from './story';

/** Thirty little ink stick figures in rows, and the tally of them. */

const TALL = 78;
const TALLY_RED = '#c8362a';

function drawFigure(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, arms: 0 | 1 | 2): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const h = TALL;
  ctx.beginPath();
  // Legs, body, arms.
  ctx.moveTo(-14, 0);
  ctx.lineTo(0, -h * 0.34);
  ctx.lineTo(14, 0);
  ctx.moveTo(0, -h * 0.34);
  ctx.lineTo(0, -h * 0.7);
  const shoulder = -h * 0.6;
  ctx.moveTo(-18, arms === 2 ? shoulder - 26 : shoulder + 22);
  ctx.lineTo(0, shoulder);
  ctx.lineTo(18, arms >= 1 ? shoulder - 26 : shoulder + 22);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -h * 0.84, h * 0.14, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawPeople(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 5;
  FIGURES.forEach((f, i) => {
    const s = figureAt(i, t);
    if (s.alpha <= 0 || s.scale <= 0.01) return;
    ctx.globalAlpha = s.alpha;
    drawFigure(ctx, f.x, f.y - s.hop, s.scale, f.arms);
  });
  ctx.restore();
}

/** "×30" beside the ball, counting up as they pop. */
export function drawTally(ctx: CanvasRenderingContext2D, t: number, x: number, y: number): void {
  const c = counterAt(t);
  if (c.alpha <= 0 || c.n <= 0) return;
  drawTextLine(ctx, `×${c.n}`, x, y, 120, 700, c.alpha, { fill: TALLY_RED, halo: '#f4eddc' });
  drawTextLine(ctx, c.n === 1 ? 'person' : 'people', x, y + 56, 56, 700, c.alpha);
}
