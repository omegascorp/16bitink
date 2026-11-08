import { caption, divider, FULL, sticker, water, YELLOW } from '../thumbnailKit';
import { prepareSpecies, SPECIES } from './species';
import { drawLab, drawSensor, rigAt } from './stage';
import { BITES } from './timeline';

/**
 * The thumbnails for the sixth long-form video, "bite force comparison…
 * but every number is real" (script.md, "Thumbnails"):
 * - ends:   a hard split, a small human head with "135 lb" on the left,
 *           megalodon's open jaws cropped by the right half, "40,000 lb";
 * - record: the saltwater crocodile's jaws clamped on the sensor bar, a red
 *           MEASURED stamp, "RECORD";
 * - twist:  a black piranha baring its teeth, tiny beside a crocodile's
 *           open jaw, "30X".
 */
export const BITECOMP_THUMBNAILS = ['ends', 'record', 'twist'] as const;
export type BitecompThumbnail = (typeof BITECOMP_THUMBNAILS)[number];

const W = 1280;
const H = 720;
const RED = '#e8262b';

/** A rubber stamp, as in the video but red and bigger. */
function stamp(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, tilt: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.font = `700 ${size}px sans-serif`;
  const w = ctx.measureText(text).width + size * 0.9;
  const h = size * 1.45;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.strokeStyle = RED;
  ctx.lineWidth = size * 0.14;
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, size * 0.2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = RED;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, size * 0.05);
  ctx.restore();
}

function lab(ctx: CanvasRenderingContext2D, t: number): void {
  ctx.save();
  ctx.scale(W / 1920, H / 1080);
  drawLab(ctx, t);
  ctx.restore();
}

function drawEnds(ctx: CanvasRenderingContext2D): void {
  const meg = BITES.find((b) => b.animal === 'megalodon')!;
  // Right: megalodon's jaws wide open on dark water, cropped by the frame.
  water(ctx, { x: 520, y: 0, width: 760, height: H }, { x: 1000, y: 100 });
  ctx.save();
  ctx.fillStyle = 'rgba(5,20,45,0.45)';
  ctx.fillRect(520, 0, 760, H);
  ctx.restore();
  sticker(ctx, (c) => SPECIES.megalodon.draw(c, { x: 1330, y: 400, size: 1250, jaw: 1, t: meg.at - 0.2 }), { outline: 6, clip: { x: 520, y: 0, width: 760, height: H } });
  // Left: the lab and a small human head.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, 520, H);
  ctx.clip();
  lab(ctx, 30);
  ctx.restore();
  sticker(ctx, (c) => SPECIES.human.draw(c, { x: 360, y: 420, size: 200, jaw: 0.4, t: 0 }), { outline: 6, clip: { x: 0, y: 0, width: 520, height: H } });
  divider(ctx, 520);
  caption(ctx, '135 lb', 260, 160, 92, 440, '#ffffff');
  caption(ctx, '40,000 lb', 900, 610, 120, 700, YELLOW);
}

function drawRecord(ctx: CanvasRenderingContext2D): void {
  const croc = BITES.find((b) => b.animal === 'saltCroc' && !b.preview)!;
  const t = croc.at + 1.5;
  lab(ctx, t);
  const rig = rigAt(t);
  // Zoomed in on the bite: the bar and the jaws clamped on it, bigger than in the video.
  const k = 1.15;
  const at = { x: 720, y: 380 };
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.scale(k, k);
  ctx.translate(-rig.x, -rig.y);
  drawSensor(ctx, t);
  ctx.restore();
  sticker(ctx, (c) => {
    c.translate(at.x, at.y);
    c.scale(k, k);
    c.translate(-rig.x, -rig.y);
    SPECIES.saltCroc.draw(c, { x: rig.x, y: rig.y, size: 640, jaw: 0, t });
  }, { outline: 6 });
  stamp(ctx, 'MEASURED', 1010, 600, 70, -0.1);
  caption(ctx, 'RECORD', 900, 110, 130, 700, YELLOW);
}

function drawTwist(ctx: CanvasRenderingContext2D): void {
  water(ctx, FULL, { x: 900, y: 120 });
  // The crocodile's open jaw across the left two-thirds, cropped.
  sticker(ctx, (c) => SPECIES.saltCroc.draw(c, { x: 820, y: 420, size: 1250, jaw: 0.75, t: 0 }), { outline: 6 });
  // The piranha, small, teeth bared, in front at the right.
  sticker(ctx, (c) => SPECIES.piranha.draw(c, { x: 1150, y: 470, size: 260, jaw: 0.7, t: 0 }), { outline: 6 });
  caption(ctx, '30X', 1070, 170, 190, 360, YELLOW);
}

export async function drawBitecompThumbnail(ctx: CanvasRenderingContext2D, id: BitecompThumbnail): Promise<void> {
  await prepareSpecies();
  ctx.clearRect(0, 0, W, H);
  if (id === 'ends') drawEnds(ctx);
  else if (id === 'record') drawRecord(ctx);
  else drawTwist(ctx);
}
