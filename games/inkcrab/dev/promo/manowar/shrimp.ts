import { bezier, edge, eyeDot, makeDraw, oval, pt, shade, skin, tint } from '../../../src/art/kit';
import { PAPER_FILL } from '../../../src/art/palette';
import type { Shrimp } from './story';

/**
 * A tiny shrimp, the feeder's meal: a curled, segmented body, a fan of tail,
 * long feelers and a black eye, in the game's pen. Facing left, the way it
 * swims to the mouth; `kick` flicks its tail.
 */
const SHELL = '#f2a48c';

export function drawShrimp(ctx: CanvasRenderingContext2D, s: Shrimp, boil: number): void {
  if (s.alpha <= 0 || s.scale <= 0) return;
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.scale(s.scale * 4, s.scale * 4);
  ctx.globalAlpha = s.alpha;
  const d = makeDraw(ctx, 5600 + boil, boil, 0);
  const { pen } = d;
  // Feelers sweeping forward, and the legs under it.
  for (const [dy, len] of [[-3, 26], [-1, 20]] as const) pen.hair(bezier(pt(-8, dy), pt(-22, dy - 8), pt(-8 - len, dy - 2), 8), 0.5, d.ink, 0.8);
  for (let k = 0; k < 5; k++) pen.hair([pt(-3 + k * 3, 4), pt(-4 + k * 3, 8 + (k % 2))], 0.5, d.ink, 0.7);
  // The tail fan, flicking.
  const tail = 0.25 * s.kick;
  const fan = [pt(12, 1), pt(19 + 2 * tail, -3 + 4 * tail), pt(21, 2 + 3 * tail), pt(18 + 2 * tail, 7 + 2 * tail)];
  skin(d, fan, SHELL, 0.7);
  edge(d, fan, 0.7);
  // Segments from the head back, curling down.
  for (let k = 4; k >= 0; k--) {
    const a = 0.35 * k;
    const seg = oval(-6 + k * 4.2, -1 + Math.sin(a) * 2.5, 4.8 - k * 0.35, 4.6 - k * 0.3, 14);
    skin(d, seg, SHELL, 0.75);
    edge(d, seg, 0.6, 0.85);
  }
  const head = oval(-8, -1.5, 6.2, 4.6, 16);
  skin(d, head, SHELL, 0.75);
  shade(d, head, 0.3);
  tint(d, oval(-9, -3.5, 2.5, 1.2, 10), PAPER_FILL, 0.6);
  edge(d, head, 0.8);
  eyeDot(d, -11, -2.5, 1.1);
  ctx.restore();
}
