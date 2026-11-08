import { caption, divider, FULL, sticker, water, YELLOW, type Rect } from '../thumbnailKit';
import { prepareSpecies, SPECIES } from './species';

/**
 * The thumbnails for the sixth long-form video, "bite force comparison…
 * but every number is real", on the packaging rules in
 * docs/longform-playbook.md (one giant open red mouth cropped by the frame,
 * a face, size contrast, saturated colour, 0–3 words):
 * - split: #2's winning "$1 vs $X" shape: a small human with
 *          "135 LB" against the saltwater crocodile's wide-open jaws, the
 *          record, cropped by the frame, "3,690 LB";
 * - rex:   a T. rex mouth too big for the frame over a tiny human,
 *          "7,800 LB";
 * - twist: the size contrast flipped: a giant black piranha face, teeth
 *          bared, and a tiny crocodile, "30X".
 */
export const BITECOMP_THUMBNAILS = ['split', 'rex', 'twist'] as const;
export type BitecompThumbnail = (typeof BITECOMP_THUMBNAILS)[number];

const W = 1280;
const H = 720;

/** A hot sunburst: a bright core at `at` falling off to deep red-orange, with rays. */
function burst(ctx: CanvasRenderingContext2D, area: Rect, at: { readonly x: number; readonly y: number }, core: string, edge: string): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(area.x, area.y, area.width, area.height);
  ctx.clip();
  const g = ctx.createRadialGradient(at.x, at.y, 0, at.x, at.y, 900);
  g.addColorStop(0, core);
  g.addColorStop(1, edge);
  ctx.fillStyle = g;
  ctx.fillRect(area.x, area.y, area.width, area.height);
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = 'rgba(255,240,190,0.12)';
  const n = 18;
  for (let i = 0; i < n; i += 2) {
    const a0 = (i / n) * Math.PI * 2;
    const a1 = ((i + 1) / n) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(at.x, at.y);
    ctx.lineTo(at.x + Math.cos(a0) * 2000, at.y + Math.sin(a0) * 2000);
    ctx.lineTo(at.x + Math.cos(a1) * 2000, at.y + Math.sin(a1) * 2000);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** The human, mouth shut, facing right. */
const human = (x: number, y: number, size: number) => (c: CanvasRenderingContext2D): void =>
  SPECIES.human.draw(c, { x, y, size, jaw: 0, t: 0 });

function drawSplit(ctx: CanvasRenderingContext2D): void {
  const SPLIT = 470;
  const left: Rect = { x: 0, y: 0, width: SPLIT, height: H };
  const right: Rect = { x: SPLIT, y: 0, width: W - SPLIT, height: H };
  water(ctx, left, { x: 230, y: 120 });
  water(ctx, right, { x: 900, y: 80 });
  sticker(ctx, human(330, 500, 240), { outline: 6, clip: left });
  sticker(ctx, (c) => SPECIES.saltCroc.draw(c, { x: 1300, y: 390, size: 560, jaw: 1, t: 0 }), { outline: 6, clip: right, tint: '#ffe2c0' });
  divider(ctx, SPLIT);
  caption(ctx, '135 LB', SPLIT / 2, 110, 84, SPLIT - 50);
  caption(ctx, '3,690 LB', 875, 100, 116, 700, YELLOW);
}

function drawRex(ctx: CanvasRenderingContext2D): void {
  burst(ctx, FULL, { x: 360, y: 300 }, '#ffcf5a', '#c3271b');
  sticker(ctx, (c) => SPECIES.trex.draw(c, { x: 1250, y: 290, size: 680, jaw: 1, t: 0 }), { outline: 6 });
  sticker(ctx, human(330, 610, 230), { outline: 6 });
  caption(ctx, '7,800 LB', 330, 110, 120, 580, YELLOW);
}

function drawTwist(ctx: CanvasRenderingContext2D): void {
  burst(ctx, FULL, { x: 820, y: 330 }, '#fff0a0', '#e0501a');
  // The piranha's head fills the left, its body cropped by the frame edge.
  sticker(ctx, (c) => SPECIES.piranha.draw(c, { x: 860, y: 400, size: 580, jaw: 1, t: 0 }), { outline: 6 });
  // A whole crocodile, tiny beside it.
  sticker(ctx, (c) => SPECIES.saltCroc.draw(c, { x: 1225, y: 430, size: 150, jaw: 0.7, t: 0 }), { outline: 5 });
  caption(ctx, '30X', 1090, 140, 190, 330, YELLOW);
}

export async function drawBitecompThumbnail(ctx: CanvasRenderingContext2D, id: BitecompThumbnail): Promise<void> {
  await prepareSpecies();
  ctx.clearRect(0, 0, W, H);
  if (id === 'split') drawSplit(ctx);
  else if (id === 'rex') drawRex(ctx);
  else drawTwist(ctx);
}
