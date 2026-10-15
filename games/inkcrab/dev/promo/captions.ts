import { INK, PAPER, RED } from '../../src/art/palette';
import { VIDEO } from './short';

/**
 * Text over the shorts, in the game's handwriting font, kept inside the area
 * Shorts, Reels and TikTok leave clear (their buttons cover the top ~14% and
 * the bottom ~35%): between y ≈ 270 and 1250.
 */
export const CAPTION_FONT = 'Caveat';

/** Ink on a paper halo; night and deep-water scenes flip it to paper on dark ink. */
export interface TextInk {
  readonly fill: string;
  readonly halo: string;
}
export const INK_ON_PAPER: TextInk = { fill: INK, halo: PAPER };
export const PAPER_ON_DARK: TextInk = { fill: PAPER, halo: '#0d1230' };

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
  ctx.lineWidth = size * 0.16;
  ctx.globalAlpha = 0.85 * alpha;
  ctx.strokeText(text, x, y);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = colours.fill;
  ctx.fillText(text, x, y);
  ctx.restore();
}

/** Where the spoken line sits, how big, and how wide it may get before it shrinks to fit. */
export const SPOKEN = { y: 1200, size: 96, maxWidth: 980 } as const;

/**
 * The line being said, word by word: words already said in full ink, the
 * word being said in `hot` (the game's red by default), the rest faded.
 */
export function drawSpokenLine(
  ctx: CanvasRenderingContext2D, words: readonly string[], current: number, colours: TextInk = INK_ON_PAPER, hot: string = RED, y: number = SPOKEN.y,
): void {
  if (words.length === 0) return;
  ctx.save();
  ctx.font = `700 ${SPOKEN.size}px ${CAPTION_FONT}`;
  const space = ctx.measureText(' ').width;
  const widths = words.map((w) => ctx.measureText(w).width);
  ctx.restore();
  const total = widths.reduce((s, w) => s + w, 0) + space * (words.length - 1);
  const k = Math.min(1, SPOKEN.maxWidth / total);
  let x = VIDEO.width / 2 - (total * k) / 2;
  words.forEach((w, i) => {
    const ink: TextInk = i === current ? { fill: hot, halo: colours.halo } : colours;
    drawTextLine(ctx, w, x + (widths[i]! * k) / 2, y, SPOKEN.size * k, 700, i <= current ? 1 : 0.55, ink);
    x += (widths[i]! + space) * k;
  });
}
