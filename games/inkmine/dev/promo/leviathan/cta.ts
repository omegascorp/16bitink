import { cub, makeDraw, pt } from '../../../src/art/kit';
import { PAPER_FILL } from '../../../src/art/palette';
import type { Pt } from '../../../src/art/pen';
import { drawTextLine, PAPER_ON_DARK } from '../captions';

/**
 * The call to action, in the last 3 s: all of it above y 1480 and right of
 * x 60, where Shorts' own title and channel row don't cover it. The arrow's
 * tip points down-left at the channel name.
 */
export const CTA = {
  line: { text: 'First world free', y: 1108, size: 132 },
  sub: { text: 'tap the channel name', y: 1200, size: 80 },
  tip: pt(170, 1470),
} as const;

const HEAD_LEN = 46;
const SHAFT: readonly Pt[] = cub(pt(340, 1226), pt(240, 1232), pt(158, 1310), pt(170, 1462), 26);

function arrow(ctx: CanvasRenderingContext2D, drawn: number, alpha: number, boil: number, colour: string, width: number): void {
  const d = makeDraw(ctx, 8600 + boil, boil, 0, colour);
  const n = Math.max(2, Math.round(SHAFT.length * drawn));
  d.pen.stroke(SHAFT.slice(0, n), width, colour, alpha, false);
  if (drawn < 1) return;
  const { tip } = CTA;
  for (const side of [-1, 1]) {
    d.pen.stroke([pt(tip.x + side * HEAD_LEN * 0.82 - 4, tip.y - HEAD_LEN), pt(tip.x + side * 10, tip.y - 16), tip], width, colour, alpha, false);
  }
}

/** The line, the sub-line and the arrow, drawn on over `drawn` (0..1). */
export function drawCta(ctx: CanvasRenderingContext2D, alpha: number, drawn: number, boil: number): void {
  if (alpha <= 0) return;
  drawTextLine(ctx, CTA.line.text, 540, CTA.line.y, CTA.line.size, 700, alpha, PAPER_ON_DARK);
  drawTextLine(ctx, CTA.sub.text, 540, CTA.sub.y, CTA.sub.size, 700, alpha, PAPER_ON_DARK);
  if (drawn <= 0) return;
  arrow(ctx, drawn, alpha * 0.9, boil, PAPER_ON_DARK.halo, 22);
  arrow(ctx, drawn, alpha, boil, PAPER_FILL, 11);
}
