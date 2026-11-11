import { INK, PAPER, RED } from '../../../src/art/palette';
import { drawTextLine } from '../captions';
import { drawHeadOn, drawLaid, type Strips } from '../cobra/lay';
import { spineOf } from '../pythonbear/python';
import { VIDEO } from '../short';
import { type Pt, type Sprite } from '../sprites';
import { arrowDraw, CTA, ctaAt, wrap } from './story';

/**
 * The call to action as the python sits by the plate (as cobra/cta.ts has
 * it): InkSnake's own game snake wriggling along over the words, the big
 * line "16bit.ink/snake", the small one, and the hand-inked arrow down to
 * where YouTube shows the channel name. Gone 0.6 s before the loop point.
 */
const STEPS = 40;

export interface GameSnake {
  readonly strips: Strips;
  readonly head: Sprite;
}

/** The arrow's line, u = 0 at its tail, 1 at its tip (heartbeat's curve, moved to this short's words). */
function arrowPoint(u: number): Pt {
  const { from, c0, c1, tip } = CTA.arrow;
  const v = 1 - u;
  const k = [v * v * v, 3 * v * v * u, 3 * v * u * u, u * u * u] as const;
  const wob = Math.sin(u * 17) * 2.2 * (1 - u);
  return { x: k[0] * from.x + k[1] * c0.x + k[2] * c1.x + k[3] * tip.x + wob, y: k[0] * from.y + k[1] * c0.y + k[2] * c1.y + k[3] * tip.y - wob };
}

function strokeInk(ctx: CanvasRenderingContext2D, pts: readonly Pt[], width: number, colour: string): void {
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
}

function drawArrow(ctx: CanvasRenderingContext2D, drawn: number): void {
  const n = Math.max(2, Math.round(STEPS * drawn));
  const line = Array.from({ length: n + 1 }, (_, i) => arrowPoint((i / n) * drawn));
  const tip = line[line.length - 1]!;
  const before = line[Math.max(0, line.length - 6)]!;
  const dir = Math.atan2(tip.y - before.y, tip.x - before.x);
  const barb = (turn: number, len: number): Pt => ({ x: tip.x - Math.cos(dir + turn) * len, y: tip.y - Math.sin(dir + turn) * len });
  const head = [barb(0.62, 74), tip, barb(-0.56, 66)];
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  strokeInk(ctx, line, 21, PAPER);
  if (drawn >= 0.98) strokeInk(ctx, head, 21, PAPER);
  strokeInk(ctx, line, 9.5, INK);
  if (drawn >= 0.98) strokeInk(ctx, head, 9.5, INK);
  ctx.restore();
}

/** The game's corn snake sliding along a wave over the words, as it moves in InkSnake. */
function drawGameSnake(ctx: CanvasRenderingContext2D, snake: GameSnake, t: number, boil: number, a: number): void {
  const u = wrap(t);
  const knots = Array.from({ length: 9 }, (_, i) => ({ x: 790 - i * 70, y: 860 + Math.sin(u * 6 - i * 0.9) * 26 }));
  const spine = spineOf(knots, 4);
  const lay = { spine, widths: spine.map((_, i) => 46 * (i > spine.length * 0.7 ? 1 - 0.85 * ((i - spine.length * 0.7) / (spine.length * 0.3)) : 1)), base: 46, headRight: true, offset: u * 30 };
  ctx.save();
  ctx.globalAlpha = a;
  drawLaid(ctx, snake.strips, boil, lay, INK, 0.6);
  drawHeadOn(ctx, snake.head, boil, lay);
  ctx.restore();
}

export function drawCta(ctx: CanvasRenderingContext2D, snake: GameSnake, t: number, boil: number): void {
  const a = ctaAt(t);
  if (a <= 0) return;
  drawGameSnake(ctx, snake, t, boil, a);
  ctx.save();
  drawTextLine(ctx, CTA.big.text, VIDEO.width / 2, CTA.big.y, CTA.big.size, 700, a, { fill: RED, halo: '#fffaf0' });
  drawTextLine(ctx, CTA.small.text, VIDEO.width / 2, CTA.small.y, CTA.small.size, 700, a);
  ctx.globalAlpha = a;
  drawArrow(ctx, arrowDraw(t));
  ctx.restore();
}
