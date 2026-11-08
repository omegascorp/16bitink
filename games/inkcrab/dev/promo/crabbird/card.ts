import { drawSprite, crabSprite, shellSprite, type Sprite } from '../sprites';
import { drawTextLine, INK_ON_PAPER } from '../captions';
import { INK, PAPER, PAPER_FILL } from '../../../src/art/palette';
import { Pen, type Pt } from '../../../src/art/pen';
import { cardCrabAt, CTA } from './story';

/**
 * A small inked card of the real game, pinned over the night: the game's own
 * crab in its shell, eating and growing, and what you do in InkCrab.
 */
export interface GameCard {
  readonly back: Sprite;
  readonly front: Sprite;
  readonly shell: Sprite;
}

export const makeGameCard = (): GameCard => ({ back: crabSprite('back', 6), front: crabSprite('front', 6), shell: shellSprite('whelk', 6) });

const TILT = -0.035;

export function drawGameCard(ctx: CanvasRenderingContext2D, card: GameCard, t: number, alpha: number, boil: number): void {
  const { x, y, w, h } = CTA.card;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(TILT);
  ctx.translate(-w / 2, -h / 2);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = PAPER_FILL;
  ctx.fillRect(10, 10, w - 20, h - 20);
  // Four pen strokes, one a side, running a little past the corners.
  const corners: readonly Pt[] = [{ x: 1, y: 2 }, { x: w - 1, y: 3 }, { x: w - 2, y: h - 1 }, { x: 2, y: h - 2 }];
  const pen = new Pen(ctx, 5600 + boil, 1);
  corners.forEach((p, i) => pen.stroke([p, corners[(i + 1) % corners.length]!], 4.5, INK, 1, false));
  const at = { x: 124, y: 186, scale: cardCrabAt(t) };
  drawSprite(ctx, card.back, boil, at);
  drawSprite(ctx, card.shell, boil, at);
  drawSprite(ctx, card.front, boil, at);
  ctx.restore();
  // Written on the card, level with it.
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(TILT);
  drawTextLine(ctx, 'Eat. Grow.', 0, h / 2 - 66, 50, 700, alpha, INK_ON_PAPER);
  drawTextLine(ctx, 'Find a bigger shell.', 0, h / 2 - 22, 46, 700, alpha, INK_ON_PAPER);
  ctx.restore();
}
