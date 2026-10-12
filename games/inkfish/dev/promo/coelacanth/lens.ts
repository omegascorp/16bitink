import { Pen } from '../../../src/art/pen';
import { drawTextLine, type TextInk } from '../captions';
import { cubic, type Pt, pt } from './shape';
import { AGE_TEXT, LENS } from './story';

/**
 * "Living to a hundred": a magnifier over one of the fish's scales, its
 * growth rings drawing in from the middle out while the years count up to
 * 100 (a 2021 study read the coelacanth's age from rings like these).
 */
const CHALK = '#dcd6e6';
const SCALE = '#2f5f93';
const RINGS = 20;

/** One scale, in lens px about its middle: a rounded plate, wider than tall. */
const PLATE: readonly Pt[] = [
  ...cubic(pt(-104, 0), pt(-104, -80), pt(90, -92), pt(112, -10), 12),
  ...cubic(pt(112, -10), pt(124, 60), pt(-30, 100), pt(-104, 0), 12).slice(1),
].map((p) => pt(p.x * 1.22, p.y * 1.3));

export function drawAgeLens(
  ctx: CanvasRenderingContext2D, open: number, years: number, to: Pt, boil: number, ink: TextInk,
): void {
  if (open <= 0) return;
  const { x, y, r } = LENS;
  const rr = r * (0.85 + 0.15 * open);
  const pen = new Pen(ctx, 6100 + boil * 977, 1.2);
  ctx.save();
  ctx.globalAlpha = open;
  ctx.strokeStyle = CHALK;
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 9]);
  ctx.beginPath();
  const dx = to.x - x;
  const dy = to.y - y;
  const d = Math.hypot(dx, dy) || 1;
  ctx.moveTo(x + (dx / d) * rr, y + (dy / d) * rr);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(to.x, to.y, 9, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, rr, 0, Math.PI * 2);
  ctx.save();
  ctx.clip();
  ctx.fillStyle = '#0a1430';
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.translate(x, y);
  pen.fill(PLATE, SCALE, 1);
  // The rings, as many as the years counted so far allow, from the middle out.
  const shown = (RINGS * years) / 100;
  for (let k = 1; k <= Math.floor(shown); k++) {
    const f = k / (RINGS + 1);
    pen.hair(PLATE.map((p) => pt(p.x * f + 10 * (1 - f), p.y * f)), k % 5 === 0 ? 3 : 1.8, CHALK, k % 5 === 0 ? 0.95 : 0.65);
  }
  // The bumps of its armour.
  for (let k = 0; k < 14; k++) {
    const a = k * 2.4;
    const rad = 30 + (k % 4) * 16;
    pen.dot(Math.cos(a) * rad * 1.1 + 10, Math.sin(a) * rad * 0.7, 3, '#cfe4f7', 0.6);
  }
  pen.stroke([...PLATE, PLATE[0]!], 4, '#081120', 1, false);
  ctx.restore();
  ctx.strokeStyle = CHALK;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(x, y, rr, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  // The count, and what it's counted from.
  drawTextLine(ctx, `${years} years`, AGE_TEXT.x, AGE_TEXT.y, AGE_TEXT.size, 700, open, ink);
  drawTextLine(ctx, 'read from the rings', AGE_TEXT.x, AGE_TEXT.y + 70, 56, 700, open, ink);
  drawTextLine(ctx, 'on its scales', AGE_TEXT.x, AGE_TEXT.y + 126, 56, 700, open, ink);
}
