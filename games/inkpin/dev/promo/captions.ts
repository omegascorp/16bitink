import { INK, PAPER } from '../../src/art/palette';
import { VIDEO } from './short';

/**
 * Text over the shorts, in the game's handwriting font, kept inside the area
 * Shorts, Reels and TikTok leave clear (their buttons cover the top ~14% and
 * the bottom ~35%): between y ≈ 270 and 1250. The call to action may reach down
 * to y ≈ 1480, left of the channel name's buttons.
 */
export const CAPTION_FONT = 'Caveat';

/** Ink on a paper halo. */
export interface TextInk {
  readonly fill: string;
  readonly halo: string;
}
export const INK_ON_PAPER: TextInk = { fill: INK, halo: PAPER };

/** The safe band for text, video px. */
export const SAFE = { top: 270, bottom: 1250 } as const;

/** One centred line in the handwriting font, with a halo that keeps it readable over the drawing. */
export function drawTextLine(
  ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, weight: 500 | 700, alpha = 1, colours: TextInk = INK_ON_PAPER,
): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.font = `${weight} ${size}px ${CAPTION_FONT}`;
  ctx.strokeStyle = colours.halo;
  ctx.lineWidth = size * 0.18;
  ctx.globalAlpha = 0.92 * alpha;
  ctx.strokeText(text, x, y);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = colours.fill;
  ctx.fillText(text, x, y);
  ctx.restore();
}

/** The one caption that is there from the first frame to the last: the question. */
export const QUESTION = { text: 'Which pin first?', y: 350, size: 124 } as const;

export function drawQuestion(ctx: CanvasRenderingContext2D): void {
  drawTextLine(ctx, QUESTION.text, VIDEO.width / 2, QUESTION.y, QUESTION.size, 700);
}
