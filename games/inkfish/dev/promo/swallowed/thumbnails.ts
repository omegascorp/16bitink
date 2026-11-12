import { caption, divider, FULL, sticker, water, YELLOW, type Rect } from '../thumbnailKit';
import { planOf } from './layout';
import { drawFoldedMeal, SWALLOWER_BELLY } from './render';
import { drawAlone, drawSwallow, type SwallowPlan } from './scene';
import { prepareSprites, type StepId } from './species';

/**
 * The thumbnails for the seventh long-form video, "swallowed whole size
 * comparison… but every meal is real", on docs/longform-playbook.md's rules
 * (an open mouth, size contrast, saturated blue, 0–3 words). Captions are in
 * the cartoon face: the pixel font's 4, % and × don't read (and this face's × is too small: write X).
 * - split:    #2's "$1 vs $X" shape: the grouper with the shark half way
 *             in, "50%", against the black swallower's ballooned belly
 *             with its folded meal, "450%";
 * - balloon:  the swallower alone and huge, its meal folded inside,
 *             "4.5X LONGER" (no outline laid out beside it: one 4.5x as
 *             long won't fit the frame at this size, and a shorter one lies);
 * - cannibal: a pike with another pike half way down, no words.
 */
export const SWALLOWED_THUMBNAILS = ['split', 'balloon', 'cannibal'] as const;
export type SwallowedThumbnail = (typeof SWALLOWED_THUMBNAILS)[number];

const W = 1280;
const H = 720;

/** A step's swallow frozen half way in, resized and moved. */
function halfway(id: StepId, eaterLen: number, at: { readonly x: number; readonly y: number }, progress: number) {
  return (c: CanvasRenderingContext2D): void => {
    const base = planOf(id, { enter: -10, gulp: 0, gulpS: 1, until: 99 });
    const plan: SwallowPlan = { ...base, eaterLen, mealLen: eaterLen * (base.mealLen / base.eaterLen), at };
    drawSwallow(c, plan, progress, 0);
  };
}

function swallower(len: number, at: { readonly x: number; readonly y: number }) {
  return (c: CanvasRenderingContext2D): void => {
    drawAlone(c, 'swallower', at, len, 0, 0, { belly: SWALLOWER_BELLY });
    drawFoldedMeal(c, at, len, 1);
  };
}

function drawSplit(ctx: CanvasRenderingContext2D): void {
  const SPLIT = 600;
  const left: Rect = { x: 0, y: 0, width: SPLIT, height: H };
  const right: Rect = { x: SPLIT, y: 0, width: W - SPLIT, height: H };
  water(ctx, left, { x: 250, y: 100 });
  water(ctx, right, { x: 950, y: 80 });
  sticker(ctx, halfway('grouper', 500, { x: 190, y: 400 }, 0.12), { outline: 6, clip: left });
  sticker(ctx, swallower(560, { x: 940, y: 400 }), { outline: 6, clip: right });
  divider(ctx, SPLIT);
  caption(ctx, '50%', SPLIT / 2, 100, 140, SPLIT - 60, '#ffffff', 'cartoon');
  caption(ctx, '450%', 940, 100, 160, 560, YELLOW, 'cartoon');
}

function drawBalloon(ctx: CanvasRenderingContext2D): void {
  water(ctx, FULL, { x: 640, y: 60 });
  sticker(ctx, swallower(820, { x: 600, y: 420 }), { outline: 7 });
  caption(ctx, '4.5X LONGER', 640, 95, 130, 1180, YELLOW, 'cartoon');
}

function drawCannibal(ctx: CanvasRenderingContext2D): void {
  water(ctx, FULL, { x: 400, y: 60 });
  sticker(ctx, halfway('pike', 820, { x: 420, y: 380 }, 0.35), { outline: 7 });
}

export async function drawSwallowedThumbnail(ctx: CanvasRenderingContext2D, id: SwallowedThumbnail): Promise<void> {
  prepareSprites();
  ctx.clearRect(0, 0, W, H);
  if (id === 'split') drawSplit(ctx);
  else if (id === 'balloon') drawBalloon(ctx);
  else drawCannibal(ctx);
}
