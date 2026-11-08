import { drawTextLine, INK_ON_PAPER, type TextInk } from './captions';
import { VIDEO, window01, type Short } from './short';

/**
 * The game and where to play it, small under the captions. Never in the
 * hook: it fades in 40% of the way through (around the payoff) and out again
 * before the loop point, so the first second stays about the animal and the
 * loop seam is untouched. (Same rule as InkFish's, InkCrab's and InkMine's shorts.)
 */
const CREDIT = { text: 'InkSnake · 16bit.ink', y: 1292, size: 46, alpha: 0.75 } as const;
const FADE_S = 0.4;
const IN_AT = 0.4;
/** Seconds before the loop point by which it is gone. */
const GONE_BEFORE_S = 0.6;

/** A short's own credit: its words, and the second it fades in (by default, IN_AT of the way through). */
export interface CreditOverride {
  readonly text?: string;
  readonly from?: number;
}

/** How much of the credit shows at loop time `t`. */
export const creditAt = (t: number, loopSeconds: number, from: number = IN_AT * loopSeconds): number =>
  CREDIT.alpha * window01(t, from, loopSeconds - GONE_BEFORE_S, FADE_S);

/** The same short with the credit drawn over every frame. */
export function withCredit(short: Short, ctx: CanvasRenderingContext2D, colours: TextInk = INK_ON_PAPER, own: CreditOverride = {}): Short {
  const loop = short.loopSeconds;
  const text = own.text ?? CREDIT.text;
  return {
    ...short,
    draw(seconds: number): void {
      short.draw(seconds);
      const alpha = creditAt(((seconds % loop) + loop) % loop, loop, own.from);
      if (alpha > 0) drawTextLine(ctx, text, VIDEO.width / 2, CREDIT.y, CREDIT.size, 700, alpha, colours);
    },
  };
}
