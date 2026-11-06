import { drawSet, makeSet, type Stage } from '../coconut/scene';
import { drawFood, FOOD_FRAME, FOOD_GROUND } from '../../../src/art/itemArt';
import { INK_ON_PAPER, drawSpokenLine } from '../captions';
import { bakeSprite, crabSprite, drawSprite, shellSprite, type Sprite } from '../sprites';
import { END_SIZE, GAME_LINE, gameAt, OLD_SHELL_X, SHELL_X } from './story';

/**
 * The real game, big: its own beach and its own crab, eating, growing and
 * moving up to a bigger shell. Every drawing here is the game's (sprites.ts
 * bakes them at video size).
 */
const GROUND_Y = 1020;

export interface GameKit {
  readonly set: Stage;
  readonly back: Sprite;
  readonly front: Sprite;
  readonly small: Sprite;
  readonly big: Sprite;
  readonly crumb: Sprite;
  readonly clam: Sprite;
}

export const makeGameKit = (): GameKit => ({
  set: makeSet(),
  back: crabSprite('back', 6),
  front: crabSprite('front', 6),
  small: shellSprite('periwinkle', 6),
  big: shellSprite('whelk', 6),
  crumb: bakeSprite(FOOD_FRAME, 8, FOOD_GROUND, 500, (d) => drawFood(d, 'crumb')),
  clam: bakeSprite(FOOD_FRAME, 8, FOOD_GROUND, 510, (d) => drawFood(d, 'clam')),
});

export function drawGameShot(ctx: CanvasRenderingContext2D, kit: GameKit, t: number, boil: number): void {
  const g = gameAt(t);
  drawSet(ctx, kit.set, t);
  // The bigger shell waits; the old one stays behind once it's moved up.
  if (g.moved < 0.5) drawSprite(ctx, kit.big, boil, { x: SHELL_X, y: GROUND_Y, scale: END_SIZE });
  else drawSprite(ctx, kit.small, boil, { x: OLD_SHELL_X, y: GROUND_Y, scale: END_SIZE });
  g.food.forEach((f, i) => {
    if (f.left <= 0) return;
    drawSprite(ctx, i % 2 === 0 ? kit.crumb : kit.clam, boil, { x: f.x, y: GROUND_Y, scale: 3.4 * (0.4 + 0.6 * f.left), alpha: f.left });
  });
  const squash = 1 + 0.08 * g.bump;
  const at = { x: g.x, y: GROUND_Y, scale: g.size * squash };
  const shell = g.moved >= 0.5 ? kit.big : kit.small;
  drawSprite(ctx, kit.back, boil, at);
  drawSprite(ctx, shell, boil, at);
  drawSprite(ctx, kit.front, boil, at);
  if (g.word >= 0) drawSpokenLine(ctx, GAME_LINE, g.word, INK_ON_PAPER, undefined, 400);
}
