import { INK, PAPER_FILL, RED } from '../../src/art/palette';
import { VIDEO } from './short';

/**
 * Text over the shorts, in the game's handwriting font, kept inside the area
 * Shorts, Reels and TikTok leave clear (their buttons cover the top ~14% and
 * the bottom ~35%): between y ≈ 270 and 1250.
 */
export const CAPTION_FONT = 'Caveat';
/** The game's own handwriting stack (scenes/ui.ts HAND_FONT), for the words that float up off the board. */
export const HAND_FONT = '"Caveat", "Patrick Hand", "Comic Sans MS", cursive';

/** Ink on a paper halo. */
export interface TextInk {
  readonly fill: string;
  readonly halo: string;
}
export const INK_ON_PAPER: TextInk = { fill: INK, halo: PAPER_FILL };
/** The game's danger red (the well when the line nears it). */
export const RED_ON_PAPER: TextInk = { fill: RED, halo: PAPER_FILL };

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
  ctx.globalAlpha = 0.9 * alpha;
  ctx.strokeText(text, x, y);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = colours.fill;
  ctx.fillText(text, x, y);
  ctx.restore();
}

/** A meme caption: when it shows, where, and how big. */
export interface Caption {
  readonly text: string;
  readonly from: number;
  readonly to: number;
  readonly y: number;
  readonly size: number;
  readonly colours?: TextInk;
}

/** How long a caption takes to pop in and fade out, s. */
const POP_S = 0.12;
const FADE_S = 0.25;

/** How much of a caption shows at loop time t (0..1), and its pop-in scale. */
export function captionAt(c: Caption, t: number): { readonly alpha: number; readonly scale: number } {
  if (t < c.from || t >= c.to) return { alpha: 0, scale: 1 };
  const inU = Math.min(1, (t - c.from) / POP_S);
  const out = Math.min(1, (c.to - t) / FADE_S);
  // Pops in a touch big and settles, like a sticker slapped on.
  const scale = 1 + 0.18 * (1 - inU) * (1 - inU);
  return { alpha: Math.min(inU * 1.6, 1, out), scale };
}

/** Draws whichever captions show at t, centred across the video. */
export function drawCaptions(ctx: CanvasRenderingContext2D, captions: readonly Caption[], t: number): void {
  for (const c of captions) {
    const { alpha, scale } = captionAt(c, t);
    if (alpha <= 0) continue;
    drawTextLine(ctx, c.text, VIDEO.width / 2, c.y, c.size * scale, 700, alpha, c.colours ?? INK_ON_PAPER);
  }
}
