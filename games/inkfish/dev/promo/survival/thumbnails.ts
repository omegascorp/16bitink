import { ANATOMY } from '../../../src/art/fish/registry';
import type { Pose } from '../chain';
import { makeSprite, type Sprite } from '../sprites';
import { drawSwimmer } from '../swimmer';
import { arrow, caption, divider, FULL, RED, RED_MOUTH, sticker, water, YELLOW, type Rect } from '../thumbnailKit';
import { drawPosed } from './scene';
import { prepareSprites, type FishId } from './species';

/**
 * The thumbnails for the eighth long-form video, "100 Fish Enter a Survival
 * Tournament… Only One Can Win" (script.md's Packaging: Test & Compare takes
 * three of the four). Captions in the cartoon face, X not ×.
 * - crowd: a packed, colourful tank, every fish under a red OUT stamp, the
 *          rivulus big in full colour on a yellow glow, "100 → 1";
 * - shock: the great white's open mouth with a red OUT across it, the
 *          rivulus smug in the corner, "ROUND 1?!";
 * - ends:  the two-ends split: the rivulus tiny on a big ruler, "2 IN" |
 *          the great white's mouth cropped by the frame, "180 IN";
 * - final: the mudskipper on a mud bank | the rivulus in a damp log, "VS", "FINAL".
 */
export const SURVIVAL_THUMBNAILS = ['crowd', 'shock', 'ends', 'final'] as const;
export type SurvivalThumbnail = (typeof SURVIVAL_THUMBNAILS)[number];

const W = 1280;
const H = 720;
const STAMP_FONT = '"Luckiest Guy"';

const fish = (id: FishId, x: number, y: number, len: number, facing: 1 | -1, more: Parameters<typeof drawPosed>[8] = {}) =>
  (c: CanvasRenderingContext2D): void => drawPosed(c, id, x, y, len, facing, 0.4, 0, { effort: 0.5, ...more });

/** A rubber stamp in the cartoon face, for the thumbnails. */
function stamp(ctx: CanvasRenderingContext2D, text: string, colour: string, x: number, y: number, size: number, rot = -0.14): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.font = `400 ${size}px ${STAMP_FONT}`;
  const w = ctx.measureText(text).width + size * 0.8;
  ctx.lineWidth = size * 0.12;
  ctx.strokeStyle = '#000';
  ctx.strokeRect(-w / 2 - 4, -size * 0.68 - 4, w + 8, size * 1.36 + 8);
  ctx.strokeStyle = colour;
  ctx.lineWidth = size * 0.09;
  ctx.strokeRect(-w / 2, -size * 0.68, w, size * 1.36);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.14;
  ctx.strokeText(text, 0, size * 0.06);
  ctx.fillStyle = colour;
  ctx.fillText(text, 0, size * 0.06);
  ctx.restore();
}

/** The great white for thumbnails: the game's shark in its smooth 'light' ink, a grey-blue back over its white belly. */
let shark: Sprite | null = null;
function greatWhite(x: number, y: number, len: number, facing: 1 | -1, jaw: number) {
  return (c: CanvasRenderingContext2D): void => {
    shark ??= makeSprite('shark', 6, 'light', { ...ANATOMY.shark, wash: '#6f93b4' });
    const pose: Pose = { j: 0, age: 0, shape: 'shark', x, y, length: len, facing, tilt: 0.04 * facing, beat: 0.6, effort: 0.4 };
    drawSwimmer(c, shark, pose, 0, { jaw, mouth: { ...RED_MOUTH, teeth: true } });
  };
}

/** The rivulus as the star: big, its own bright eye, on a yellow glow, stickered so it lifts off the water. */
function star(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, facing: 1 | -1, clip?: Rect, reach = 0.85): void {
  const glow = ctx.createRadialGradient(x, y, len * 0.1, x, y, len * reach);
  glow.addColorStop(0, 'rgba(255,226,80,0.95)');
  glow.addColorStop(0.55, 'rgba(255,210,31,0.45)');
  glow.addColorStop(1, 'rgba(255,210,31,0)');
  ctx.save();
  if (clip) {
    ctx.beginPath();
    ctx.rect(clip.x, clip.y, clip.width, clip.height);
    ctx.clip();
  }
  ctx.fillStyle = glow;
  ctx.fillRect(x - len, y - len, len * 2, len * 2);
  ctx.restore();
  sticker(ctx, fish('rivulus', x, y, len, facing), { outline: 6, clip });
}

const CROWD: readonly [FishId, number, number, number, 1 | -1][] = [
  ['mako', 200, 130, 360, 1], ['cod', 1100, 130, 260, -1], ['salmon', 1120, 400, 260, -1], ['icefish', 170, 400, 230, 1],
  ['eel', 330, 610, 260, 1], ['goldfish', 1010, 600, 170, -1], ['pupfish', 190, 250, 120, 1], ['goldfish', 620, 110, 140, 1],
  ['tuna', 430, 250, 150, 1], ['yellowfin', 860, 240, 150, -1], ['bluefin', 1210, 250, 140, -1], ['bigeye', 760, 560, 130, -1],
  ['pupfish', 1180, 560, 110, -1], ['albacore', 90, 560, 130, 1], ['salmon', 520, 470, 200, 1],
];

function drawCrowd(ctx: CanvasRenderingContext2D): void {
  water(ctx, FULL, { x: 640, y: 40 });
  for (const [id, x, y, len, facing] of CROWD) sticker(ctx, fish(id, x, y, len, facing, { expr: 'squeeze' }), { outline: 3 });
  for (const [, x, y, len] of CROWD) stamp(ctx, 'OUT', RED, x, y, len > 200 ? 52 : 40);
  star(ctx, 650, 370, 540, -1, undefined, 0.6);
  caption(ctx, '100', 470, 635, 120, 300, '#ffffff', 'cartoon');
  arrow(ctx, 640, 635, 70);
  caption(ctx, '1', 790, 635, 130, 200, YELLOW, 'cartoon');
}

function drawShock(ctx: CanvasRenderingContext2D): void {
  water(ctx, FULL, { x: 900, y: 40 });
  sticker(ctx, greatWhite(860, 400, 1900, -1, 1), { outline: 6 });
  stamp(ctx, 'OUT', RED, 560, 330, 160);
  star(ctx, 1080, 600, 330, -1);
  caption(ctx, 'ROUND 1?!', 640, 92, 130, 1100, YELLOW, 'cartoon');
}

/** A chunky yellow ruler with inch marks, for the "ends" split. */
function ruler(ctx: CanvasRenderingContext2D, x: number, y: number, w: number): void {
  ctx.save();
  ctx.fillStyle = YELLOW;
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 6;
  ctx.fillRect(x, y, w, 70);
  ctx.strokeRect(x, y, w, 70);
  for (let i = 0; i <= 8; i++) {
    const xx = x + 20 + i * ((w - 40) / 8);
    ctx.beginPath();
    ctx.moveTo(xx, y);
    ctx.lineTo(xx, y + (i % 2 ? 22 : 40));
    ctx.stroke();
  }
  ctx.restore();
}

function drawEnds(ctx: CanvasRenderingContext2D): void {
  const SPLIT = 560;
  const left: Rect = { x: 0, y: 0, width: SPLIT, height: H };
  const right: Rect = { x: SPLIT, y: 0, width: W - SPLIT, height: H };
  water(ctx, left, { x: 280, y: 60 });
  water(ctx, right, { x: 900, y: 60 });
  ruler(ctx, 50, 520, 460);
  star(ctx, 280, 430, 330, -1, left);
  sticker(ctx, greatWhite(1640, 430, 2300, -1, 1), { outline: 6, clip: right });
  divider(ctx, SPLIT);
  caption(ctx, '2 IN', SPLIT / 2, 110, 140, SPLIT - 60, '#ffffff', 'cartoon');
  caption(ctx, '180 IN', 920, 100, 150, 620, YELLOW, 'cartoon');
}

function drawFinalThumb(ctx: CanvasRenderingContext2D): void {
  const left: Rect = { x: 0, y: 0, width: W / 2, height: H };
  const right: Rect = { x: W / 2, y: 0, width: W / 2, height: H };
  water(ctx, left, { x: 320, y: 60 });
  water(ctx, right, { x: 960, y: 60 });
  sticker(ctx, fish('mudskipper', 290, 440, 500, 1), { outline: 6, clip: left });
  star(ctx, 1000, 440, 480, -1, right, 0.7);
  divider(ctx, W / 2);
  caption(ctx, 'VS', W / 2, 600, 130, 220, '#ffffff', 'cartoon');
  caption(ctx, 'FINAL', W / 2, 92, 140, 700, YELLOW, 'cartoon');
}

export async function drawSurvivalThumbnail(ctx: CanvasRenderingContext2D, id: SurvivalThumbnail): Promise<void> {
  prepareSprites();
  ctx.clearRect(0, 0, W, H);
  if (id === 'crowd') drawCrowd(ctx);
  else if (id === 'shock') drawShock(ctx);
  else if (id === 'ends') drawEnds(ctx);
  else drawFinalThumb(ctx);
}
