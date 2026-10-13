import {
  arrow, caption, divider, drawFish, FULL, RED, RED_MOUTH, sticker, water, YELLOW, type Fish, type Rect,
} from './thumbnailKit';

export { BADGE, drawGuides, THUMB } from './thumbnailKit';

/**
 * The YouTube thumbnails for the InkFish level 1 video, from the game's own
 * art and level 1's own fish. Three ideas, to upload together to YouTube's
 * "Test & Compare":
 * - hunter: the role reversal level 1 really has (you start smaller than the
 *   perch and finish bigger), as a split "HUNTED | HUNTER";
 * - glowup: "FROM THIS... TO THIS...", the format behind a 7.9M-view Feed and Grow video;
 * - run:    one giant red mouth, cropped by the frame, right behind a scared inkling.
 */
export const THUMBNAIL_IDS = ['hunter', 'glowup', 'run'] as const;
export type ThumbnailId = (typeof THUMBNAIL_IDS)[number];

const SPLIT = 640;
const LEFT: Rect = { x: 0, y: 0, width: SPLIT, height: 720 };
const RIGHT: Rect = { x: SPLIT, y: 0, width: 1280 - SPLIT, height: 720 };
/** Perch, warmed up from tan towards orange so it stands off the blue. */
const PERCH_TINT = '#ffb36b';

/** The level's start: a perch three times your size, jaws open. And its end: you, eating that perch. */
function hunter(ctx: CanvasRenderingContext2D): void {
  water(ctx, LEFT, { x: 220, y: 470 });
  water(ctx, RIGHT, { x: 900, y: 420 });
  const bigPerch: Fish = { shape: 'perch', variant: 'heavy', x: 800, y: 430, length: 900, facing: -1, tilt: 0.05, look: { jaw: 1, mouth: RED_MOUTH } };
  const smallInkling: Fish = { shape: 'inkling', variant: 'light', x: 140, y: 500, length: 200, facing: -1, tilt: -0.15, look: { jaw: 0.5 } };
  sticker(ctx, (c) => drawFish(c, bigPerch, 0), { tint: PERCH_TINT, clip: LEFT });
  sticker(ctx, (c) => drawFish(c, smallInkling, 1), { outline: 6, clip: LEFT });
  const bigInkling: Fish = { shape: 'inkling', variant: 'light', x: 1150, y: 440, length: 760, facing: -1, tilt: 0.02, look: { jaw: 1, mouth: RED_MOUTH } };
  const smallPerch: Fish = { shape: 'perch', variant: 'light', x: 770, y: 470, length: 230, facing: -1, tilt: -0.12, look: { jaw: 0.4 } };
  sticker(ctx, (c) => drawFish(c, bigInkling, 2), { clip: RIGHT });
  sticker(ctx, (c) => drawFish(c, smallPerch, 3), { tint: PERCH_TINT, outline: 6, clip: RIGHT });
  divider(ctx, SPLIT);
  caption(ctx, 'HUNTED', SPLIT / 2, 92, 120, 560);
  caption(ctx, 'HUNTER', SPLIT + SPLIT / 2, 92, 120, 560, YELLOW);
}

/** A tiny inkling alone in the water, then the same fish, huge, swallowing a perch. */
function glowup(ctx: CanvasRenderingContext2D): void {
  water(ctx, LEFT, { x: 320, y: 430 });
  water(ctx, RIGHT, { x: 900, y: 420 });
  const tiny: Fish = { shape: 'inkling', variant: 'light', x: 320, y: 440, length: 150, facing: 1, tilt: 0.05 };
  sticker(ctx, (c) => drawFish(c, tiny, 0), { outline: 6, clip: LEFT });
  const huge: Fish = { shape: 'inkling', variant: 'light', x: 1170, y: 450, length: 820, facing: -1, tilt: 0.02, look: { jaw: 1, mouth: RED_MOUTH } };
  const perch: Fish = { shape: 'perch', variant: 'light', x: 760, y: 470, length: 220, facing: -1, tilt: -0.15, look: { jaw: 0.4 } };
  sticker(ctx, (c) => drawFish(c, huge, 1), { clip: RIGHT });
  sticker(ctx, (c) => drawFish(c, perch, 2), { tint: PERCH_TINT, outline: 6, clip: RIGHT });
  divider(ctx, SPLIT);
  arrow(ctx, SPLIT, 600, 150, -0.25);
  caption(ctx, 'FROM THIS', SPLIT / 2, 92, 100, 560);
  caption(ctx, 'TO THIS!', SPLIT + SPLIT / 2, 92, 100, 560, YELLOW);
}

/** A perch's mouth filling the frame, open right behind the inkling. */
function run(ctx: CanvasRenderingContext2D): void {
  water(ctx, FULL, { x: 360, y: 470 });
  const perch: Fish = { shape: 'perch', variant: 'heavy', x: 1110, y: 360, length: 1180, facing: -1, tilt: 0.08, look: { jaw: 1, mouth: { ...RED_MOUTH, teeth: true } } };
  const inkling: Fish = { shape: 'inkling', variant: 'light', x: 290, y: 500, length: 380, facing: -1, tilt: -0.14, look: { jaw: 0.55 } };
  sticker(ctx, (c) => drawFish(c, perch, 0), { tint: PERCH_TINT });
  sticker(ctx, (c) => drawFish(c, inkling, 1), { outline: 9 });
  caption(ctx, 'RUN!', 260, 130, 190, 470, RED);
}

const DRAW: Readonly<Record<ThumbnailId, (ctx: CanvasRenderingContext2D) => void>> = { hunter, glowup, run };

export function drawThumbnail(ctx: CanvasRenderingContext2D, id: ThumbnailId): void {
  DRAW[id](ctx);
}
