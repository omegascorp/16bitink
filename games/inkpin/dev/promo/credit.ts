import { drawTextLine } from './captions';

/** The game and where to play it, small under the captions, in the call to action's window only. */
export const CREDIT = { text: 'InkPin · 16bit.ink/pin', x: 300, y: 838, size: 62 } as const;

export function drawCredit(ctx: CanvasRenderingContext2D, alpha: number): void {
  drawTextLine(ctx, CREDIT.text, CREDIT.x, CREDIT.y, CREDIT.size, 700, 0.9 * alpha);
}
