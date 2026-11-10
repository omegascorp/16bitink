import { drawTextLine, LIGHT, type TextInk } from './captions';
import { window01, type Short } from './short';

/**
 * The game and its page on the site, small under the captions. Never in the
 * hook: by default it fades in 40% of the way through, a narrated short with
 * a call to action brings it in with that (`from`), and it is gone 0.6 s
 * before the loop point, so frame 1 stays about the animal and the seam is
 * untouched. (Same rule as the other games' shorts.)
 */
/** Big enough to read on a phone, and right of centre so the call to action's arrow (down the left) never crosses it. */
export const CREDIT = { text: 'InkHeroes · 16bit.ink/heroes', x: 650, y: 1318, size: 50, alpha: 0.9 } as const;
const FADE_S = 0.4;
const IN_AT = 0.4;
/** Seconds before the loop point by which it is gone. */
export const GONE_BEFORE_S = 0.6;

/** A short's own credit: its words, and the second it fades in. */
export interface CreditOverride {
  readonly text?: string;
  readonly from?: number;
}

/** How much of the credit shows at loop time `t`. */
export const creditAt = (t: number, loopSeconds: number, from: number = IN_AT * loopSeconds): number =>
  CREDIT.alpha * window01(t, from, loopSeconds - GONE_BEFORE_S, FADE_S);

/** The same short with the credit drawn over every frame. */
export function withCredit(short: Short, ctx: CanvasRenderingContext2D, own: CreditOverride = {}, colours: TextInk = LIGHT): Short {
  const loop = short.loopSeconds;
  const text = own.text ?? CREDIT.text;
  return {
    ...short,
    draw(seconds: number): void {
      short.draw(seconds);
      const alpha = creditAt(((seconds % loop) + loop) % loop, loop, own.from);
      if (alpha > 0) drawTextLine(ctx, text, CREDIT.x, CREDIT.y, CREDIT.size, alpha, colours, 700);
    },
  };
}
