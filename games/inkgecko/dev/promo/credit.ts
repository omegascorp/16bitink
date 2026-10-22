import { drawTextLine, INK_ON_PAPER, type TextInk } from './captions';
import { VIDEO, type Short } from './short';

/**
 * The game and where to play it, small under the captions, in every frame
 * of every gameplay short: the gameplay is the content, so the game's name
 * belongs on it (as InkFish's gameplay shorts, dev/promo/gameplay/hud.ts).
 * Inside the area the Shorts buttons leave clear (above y ≈ 1250).
 */
export const CREDIT = { text: 'InkGecko · 16bit.ink', y: 1228, size: 56, alpha: 0.8 } as const;

/** How much of the credit shows at loop time t: all of it, always. */
export const creditAt = (_t: number): number => CREDIT.alpha;

export function drawCredit(ctx: CanvasRenderingContext2D, t: number, colours: TextInk = INK_ON_PAPER): void {
  drawTextLine(ctx, CREDIT.text, VIDEO.width / 2, CREDIT.y, CREDIT.size, 700, creditAt(t), colours);
}

/** The same short with the credit drawn over every frame. */
export function withCredit(short: Short, ctx: CanvasRenderingContext2D, colours: TextInk = INK_ON_PAPER): Short {
  const loop = short.loopSeconds;
  return {
    ...short,
    draw(seconds: number): void {
      short.draw(seconds);
      drawCredit(ctx, ((seconds % loop) + loop) % loop, colours);
    },
  };
}
