import { makeCanvas } from '../../../src/art/pen';
import { RED } from '../../../src/art/palette';
import { drawWorld } from '../eggeater/render';
import { smooth, window01 } from '../short';
import { boilAt } from '../sprites';
import { flash } from './cards';
import { drawCircles } from './diagrams';
import { write } from './hud';
import { keyed } from './steps';
import { T } from './timeline';

/**
 * The twist, side-on: the egg-eater short's own world (its savanna, its
 * painted side view, its egg, its x-ray of the spines cracking it) drawn
 * into a portrait canvas and shown 1080 wide to fill the 16:9 frame (its
 * crop follows the action), the labels over it. Its clock is
 * run on our words: the egg in the jaws while the mouth is measured, the
 * crack on "crack", the shell spat out flat on "spits".
 */

/** Our seconds → the short's seconds. */
const CLOCK: readonly (readonly [number, number])[] = [
  [T.thisOne, 0.3], [T.twoInches + 0.6, 2.6], [T.spikes - 0.1, 9.6], [T.crack, 10.95], [T.spits, 13.2], [T.flat + 0.3, 14.9], [T.biggestMouth, 15.4],
];

/** The portrait world is shown 1080 wide (×16/9 to fill the frame), from this far down: lower for the crack, higher for the shell. */
const SHOW_K = 1920 / 1080;
const cropTop = (u: number): number => keyed([[0, 330], [8.5, 330], [9.6, 390], [12.4, 390], [13.2, 300]], u);

export interface Twist {
  draw(ctx: CanvasRenderingContext2D, t: number): void;
}

/** A measuring bar with end ticks and a two-line label to its left. */
function bar(ctx: CanvasRenderingContext2D, x: number, y0: number, y1: number, top: string, under: string, u: number, side: -1 | 1 = -1): void {
  if (u <= 0) return;
  ctx.save();
  ctx.globalAlpha = u;
  ctx.strokeStyle = RED;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  const yb = y0 + (y1 - y0) * smooth(u);
  ctx.beginPath();
  ctx.moveTo(x - 18, y0);
  ctx.lineTo(x + 18, y0);
  ctx.moveTo(x, y0);
  ctx.lineTo(x, yb);
  ctx.moveTo(x - 18, yb);
  ctx.lineTo(x + 18, yb);
  ctx.stroke();
  ctx.restore();
  const align = side < 0 ? 'right' : 'left';
  write(ctx, top, x + side * 40, (y0 + y1) / 2, 72, { align, alpha: u });
  write(ctx, under, x + side * 40, (y0 + y1) / 2 + 56, 46, { align, alpha: u, weight: 500 });
}

export function createTwist(): Twist {
  const { canvas, ctx: off } = makeCanvas(1080, 1920);
  return {
    draw(ctx, t) {
      const u = keyed(CLOCK, t);
      off.save();
      off.setTransform(1, 0, 0, 1, 0, 0);
      drawWorld(off, u, boilAt(u));
      off.restore();
      ctx.drawImage(canvas, 0, cropTop(u), 1080, 1080 / SHOW_K, 0, 0, 1920, 1080);
      // The measures: the head, then the mouth round the egg.
      const head = window01(t, T.halfInch - 0.2, T.twice - 0.3, 0.3);
      const mouth = window01(t, T.twoInches - 0.2, T.twice - 0.3, 0.3);
      bar(ctx, 1240, 108, 240, '½ in', 'head · 1 cm', head, 1);
      bar(ctx, 470, 62, 1040, '2 in', 'mouth · 5 cm', mouth);
      drawCircles(ctx, t, T.twice - 0.2, T.spikes - 0.2);
      if (t > T.crack - 0.1 && t < T.spits) write(ctx, 'crack!', 300, 520, 130, { fill: RED, alpha: window01(t, T.crack, T.spits, 0.2) });
      if (t > T.spits) write(ctx, 'shell: crushed flat', 330, 520, 84, { alpha: window01(t, T.spits + 0.2, T.biggestMouth, 0.3) });
      flash(ctx, Math.max(0, 1 - Math.abs(t - T.crack - 0.25) / 0.25));
    },
  };
}
