import { drawTextLine } from '../captions';

/**
 * Text laid over the 4:5 Reddit videos (1200x1500, transparent): the game's
 * name and offer along the bottom, in the shorts' handwriting, so the brand
 * is on screen from the first second to the last. Reddit counts captions
 * towards the +8% it measured for text on video. `chain` also gets the
 * game's one-line pitch at the top, since that footage has no captions of its own.
 */
export const OVERLAY_IDS = ['footer', 'chain'] as const;
export type OverlayId = (typeof OVERLAY_IDS)[number];

export function drawOverlay(ctx: CanvasRenderingContext2D, id: OverlayId): void {
  const { width: w, height: h } = ctx.canvas;
  const s = w / 1200;
  if (id === 'chain') {
    drawTextLine(ctx, 'Eat smaller fish. Grow.', w / 2, 175 * s, 100 * s, 700);
    drawTextLine(ctx, 'Don’t get eaten.', w / 2, 285 * s, 100 * s, 700);
  }
  drawTextLine(ctx, 'InkFish', w / 2, h - 105 * s, 120 * s, 700);
  drawTextLine(ctx, 'First chapter free · 16bit.ink', w / 2, h - 38 * s, 58 * s, 500);
}
