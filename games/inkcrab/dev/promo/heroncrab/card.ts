import { drawTextLine, INK_ON_PAPER } from '../captions';
import { crabSprite, critterSprite, drawSprite, shellSprite, type Sprite } from '../sprites';
import { INK, PAPER, PAPER_FILL } from '../../../src/art/palette';
import { Pen, type Pt } from '../../../src/art/pen';
import { cardHeronAt, cardHideAt, CTA } from './story';

/**
 * A small inked card of the real game, pinned over the marsh: InkCrab's own
 * heron (red: it eats you) stalks in and freezes over the player's hermit
 * crab, and the crab pulls into its shell, which is how you live through it
 * in the game.
 */
export interface GameCard {
  readonly back: Sprite;
  readonly front: Sprite;
  readonly shell: Sprite;
  readonly heron: Sprite;
}

export const makeGameCard = (): GameCard => ({
  back: crabSprite('back', 6),
  front: crabSprite('front', 6),
  shell: shellSprite('whelk', 6),
  heron: critterSprite('heron', 6, true),
});

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
  const corners: readonly Pt[] = [{ x: 1, y: 2 }, { x: w - 1, y: 3 }, { x: w - 2, y: h - 1 }, { x: 2, y: h - 2 }];
  const pen = new Pen(ctx, 5700 + boil, 1);
  corners.forEach((p, i) => pen.stroke([p, corners[(i + 1) % corners.length]!], 4.5, INK, 1, false));
  ctx.save();
  ctx.beginPath();
  ctx.rect(10, 10, w - 20, h - 20);
  ctx.clip();
  // The heron walks in from the right and stops, bill over the crab.
  const come = cardHeronAt(t);
  drawSprite(ctx, card.heron, boil, { x: 236 + 120 * (1 - come), y: 200, scale: 1.9, facing: -1 });
  const crab = { x: 96, y: 200, scale: 0.8 };
  const hide = cardHideAt(t);
  drawSprite(ctx, card.back, boil, { ...crab, alpha: 1 - hide });
  drawSprite(ctx, card.shell, boil, crab);
  drawSprite(ctx, card.front, boil, { ...crab, x: crab.x - 10 * hide, alpha: 1 - hide });
  ctx.restore();
  ctx.restore();
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(TILT);
  drawTextLine(ctx, 'Heron freezes?', 0, h / 2 - 66, 48, 700, alpha, INK_ON_PAPER);
  drawTextLine(ctx, 'Hide in your shell!', 0, h / 2 - 22, 46, 700, alpha, INK_ON_PAPER);
  ctx.restore();
}
