import { INK, PAPER } from '../../src/art/pen';
import { VIDEO } from './render';

/**
 * Text over the loop, in the game's handwriting font. It stays inside the
 * area Reels, Stories, TikTok and Shorts leave clear (their buttons and
 * captions cover the top ~14% and bottom ~35%), above and below the fish.
 *
 * Two kinds: the ad cut sells the game; the viral cut is a single hook line,
 * like a post, with the site's name kept small.
 */
export const CAPTION_FONT = 'Caveat';

interface Line {
  readonly text: string;
  readonly y: number;
  readonly size: number;
  readonly weight: 500 | 700;
  readonly alpha?: number;
}

const AD: readonly Line[] = [
  { text: 'Eat smaller fish. Grow.', y: 330, size: 92, weight: 700 },
  { text: 'Don’t get eaten.', y: 430, size: 92, weight: 700 },
  { text: 'InkFish', y: 1255, size: 130, weight: 700 },
  { text: 'Free to play in your browser · 16bit.ink', y: 1332, size: 58, weight: 500 },
];

/** The longest hook line that fits the width at full size; longer hooks wrap onto two lines. */
const HOOK_SIZE = 104;
const HOOK_MAX_WIDTH = VIDEO.width - 140;

/** A hook line at the top, wrapped to fit, and the site's name small at the bottom. */
function hookLines(ctx: CanvasRenderingContext2D, hook: string): Line[] {
  ctx.font = `700 ${HOOK_SIZE}px ${CAPTION_FONT}`;
  const words = hook.split(/\s+/).filter(Boolean);
  const rows: string[] = [];
  for (const word of words) {
    const last = rows[rows.length - 1];
    if (last !== undefined && ctx.measureText(`${last} ${word}`).width <= HOOK_MAX_WIDTH) rows[rows.length - 1] = `${last} ${word}`;
    else rows.push(word);
  }
  const top = rows.length > 1 ? 320 : 360;
  return [
    ...rows.map((text, i): Line => ({ text, y: top + i * 112, size: HOOK_SIZE, weight: 700 })),
    { text: '16bit.ink', y: 1230, size: 52, weight: 500, alpha: 0.55 },
  ];
}

export type CaptionSet = { readonly kind: 'ad' } | { readonly kind: 'hook'; readonly text: string };

export function drawCaptions(ctx: CanvasRenderingContext2D, set: CaptionSet): void {
  const lines = set.kind === 'ad' ? AD : hookLines(ctx, set.text);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  for (const line of lines) {
    ctx.font = `${line.weight} ${line.size}px ${CAPTION_FONT}`;
    const alpha = line.alpha ?? 1;
    // A paper halo keeps the words readable over a passing fin.
    ctx.strokeStyle = PAPER;
    ctx.lineWidth = line.size * 0.16;
    ctx.globalAlpha = 0.85 * alpha;
    ctx.strokeText(line.text, VIDEO.width / 2, line.y);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = INK;
    ctx.fillText(line.text, VIDEO.width / 2, line.y);
  }
  ctx.restore();
}
