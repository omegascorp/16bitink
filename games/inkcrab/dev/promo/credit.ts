import { drawTextLine, INK_ON_PAPER, type TextInk } from './captions';
import { VIDEO, window01, type Short } from './short';

/**
 * The game and where to play it, small under the captions. Never in the
 * hook: it fades in 40% of the way through (around the payoff) and out again
 * before the loop point, so the first second stays about the animal and the
 * loop seam is untouched. (Same rule as InkFish's shorts.)
 */
const CREDIT = { text: 'InkCrab · 16bit.ink', y: 1292, size: 46, alpha: 0.75 } as const;
const FADE_S = 0.4;
const IN_AT = 0.4;
/** Seconds before the loop point by which it is gone. */
const GONE_BEFORE_S = 0.6;

/** A short's own credit: its text, and how far through the loop it fades in (0..1). */
export interface CreditOptions {
  readonly text?: string;
  readonly inAt?: number;
}

/** How much of the credit shows at loop time `t`. */
export const creditAt = (t: number, loopSeconds: number, inAt: number = IN_AT): number =>
  CREDIT.alpha * window01(t, inAt * loopSeconds, loopSeconds - GONE_BEFORE_S, FADE_S);

/** The same short with the credit drawn over every frame. */
export function withCredit(short: Short, ctx: CanvasRenderingContext2D, colours: TextInk = INK_ON_PAPER, options: CreditOptions = {}): Short {
  const loop = short.loopSeconds;
  return {
    ...short,
    draw(seconds: number): void {
      short.draw(seconds);
      const alpha = creditAt(((seconds % loop) + loop) % loop, loop, options.inAt);
      if (alpha > 0) drawTextLine(ctx, options.text ?? CREDIT.text, VIDEO.width / 2, CREDIT.y, CREDIT.size, 700, alpha, colours);
    },
  };
}
