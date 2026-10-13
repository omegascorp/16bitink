import { INK, PAPER } from '../../../src/art/pen';
import { CAPTION_FONT, drawTextLine } from '../captions';
import { smooth } from '../short';
import type { Sex, Tag } from './story';

/** The notes inked over the family: ♂ and ♀ badges, rank numbers, names, and rings. */

export const MALE_INK = '#2f68ad';
export const FEMALE_INK = '#d23f78';
const STRIKE = '#e0442f';
const RING = '#e2632a';

/** ♂ or ♀, drawn as pen strokes on a paper halo, `width` squeezing it like a card turning over. */
export function drawBadge(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, sex: Sex, width: number, alpha: number): void {
  if (alpha <= 0 || width <= 0.01) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(width, 1);
  ctx.globalAlpha = alpha;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const path = (): void => {
    ctx.beginPath();
    if (sex === 'male') {
      // A ring with an arrow out to the upper right.
      const c = { x: -r * 0.2, y: r * 0.2 };
      ctx.arc(c.x, c.y, r * 0.62, 0, Math.PI * 2);
      const from = { x: c.x + r * 0.44, y: c.y - r * 0.44 };
      const tip = { x: c.x + r * 1.15, y: c.y - r * 1.15 };
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(tip.x, tip.y);
      ctx.moveTo(tip.x - r * 0.55, tip.y);
      ctx.lineTo(tip.x, tip.y);
      ctx.lineTo(tip.x, tip.y + r * 0.55);
    } else {
      // A ring with a cross hanging below.
      const c = { x: 0, y: -r * 0.3 };
      ctx.arc(c.x, c.y, r * 0.62, 0, Math.PI * 2);
      ctx.moveTo(c.x, c.y + r * 0.62);
      ctx.lineTo(c.x, c.y + r * 1.5);
      ctx.moveTo(c.x - r * 0.42, c.y + r * 1.1);
      ctx.lineTo(c.x + r * 0.42, c.y + r * 1.1);
    }
  };
  path();
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = r * 0.42;
  ctx.stroke();
  path();
  ctx.strokeStyle = sex === 'male' ? MALE_INK : FEMALE_INK;
  ctx.lineWidth = r * 0.17;
  ctx.stroke();
  ctx.restore();
}

/** "#1", "#2"… beside the badge. */
export function drawRank(ctx: CanvasRenderingContext2D, x: number, y: number, rank: number, alpha: number): void {
  drawTextLine(ctx, `#${rank}`, x, y, 58, 700, alpha);
}

const TAG_SIZE = 64;
const TAG_GAP = 26;

/** The notes in a row centred on x, each taking room as it fades in; a struck one gets a red pen line through it. */
export function drawTags(ctx: CanvasRenderingContext2D, tags: readonly Tag[], x: number, y: number): void {
  ctx.save();
  ctx.font = `700 ${TAG_SIZE}px ${CAPTION_FONT}`;
  const room = tags.map((t) => (ctx.measureText(t.text).width + TAG_GAP) * smooth(t.alpha * 2.5));
  ctx.restore();
  const total = room.reduce((s, w) => s + w, 0) - TAG_GAP * Math.min(1, room.length);
  let left = x - total / 2;
  tags.forEach((tag, i) => {
    const w = room[i]!;
    if (tag.alpha > 0) {
      const cx = left + (w - TAG_GAP) / 2;
      drawTextLine(ctx, tag.text, cx, y, TAG_SIZE, 700, tag.alpha);
      if (tag.strike > 0) drawStrike(ctx, cx, y - TAG_SIZE * 0.28, w - TAG_GAP + 16, tag.strike, tag.alpha);
    }
    left += w;
  });
}

function drawStrike(ctx: CanvasRenderingContext2D, cx: number, y: number, w: number, u: number, alpha: number): void {
  const x0 = cx - w / 2;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = STRIKE;
  ctx.lineCap = 'round';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(x0, y + 6);
  ctx.quadraticCurveTo(x0 + w * 0.5 * u, y + 2 - 4 * u, x0 + w * u, y + 6 - 10 * u);
  ctx.stroke();
  ctx.restore();
}

/** A ring pulsing out round a fish as the narrator names it, `u` 0 .. 1. */
export function drawRing(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, u: number): void {
  if (u < 0 || u > 1) return;
  ctx.save();
  ctx.strokeStyle = RING;
  ctx.lineWidth = 6;
  ctx.globalAlpha = 0.9 * Math.sin(Math.PI * u);
  ctx.beginPath();
  ctx.ellipse(x, y, len * (0.62 + 0.18 * u), len * (0.42 + 0.12 * u), 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** Ink on paper for the captions; the word being spoken in clownfish orange. */
export const SPOKEN = { fill: '#d9541e', halo: PAPER } as const;
export const UNSPOKEN = { fill: INK, halo: PAPER } as const;
