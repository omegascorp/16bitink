import { BIRD_TEX, drawBird } from '../../../src/art/birdArt';
import { INK, PAPER } from '../../../src/art/pen';
import { ART_RES } from '../../../src/art/propArt';
import { drawExclaim } from '../effects';
import {
  caption, drawFish, RED_MOUTH, sticker, water, YELLOW, type Fish, type Rect,
} from '../thumbnailKit';

/**
 * The Reddit ad images (Max campaign "Media") and thumbnails, in the
 * thumbnail kit's look. Every layout is written in fractions of the canvas,
 * so one drawing serves 3:4, 1:1 and 4:3.
 *
 * Reddit's creative study: text on a still image lowers conversion unless it
 * is short, all caps or urgent, and a logo raises it (top-left or
 * bottom-right). So two images carry no words at all, the rest carry two or
 * three words in caps, and every image has the logo bottom-right.
 * Thumbnails ("small formats", 400x300 and 300x300) carry no text and no logo.
 */
export const IMAGE_IDS = ['run', 'leap', 'chain', 'glowup', 'hunter'] as const;
export const THUMB_IDS = ['run', 'leap', 'gulp'] as const;
export type ImageId = (typeof IMAGE_IDS)[number];
export type ThumbId = (typeof THUMB_IDS)[number];

const BLUE_INK = '#1f3f8a';
const PERCH_TINT = '#ffb36b';

interface Frame {
  readonly ctx: CanvasRenderingContext2D;
  readonly w: number;
  readonly h: number;
  /** The shorter side: fish and text scale with it. */
  readonly u: number;
  readonly portrait: boolean;
}

const frameOf = (ctx: CanvasRenderingContext2D): Frame => {
  const { width: w, height: h } = ctx.canvas;
  return { ctx, w, h, u: Math.min(w, h), portrait: h > w * 1.1 };
};

const full = (f: Frame): Rect => ({ x: 0, y: 0, width: f.w, height: f.h });

/** A perch's jaws filling the frame from the right, open right behind a fleeing inkling. */
function run(f: Frame): void {
  const { ctx, w, h, u } = f;
  water(ctx, full(f), { x: w * 0.3, y: h * 0.4 });
  const perch: Fish = {
    shape: 'perch', variant: 'heavy', x: w * 0.97, y: h * (f.portrait ? 0.6 : 0.56), length: u * 0.98, facing: -1, tilt: 0.12,
    look: { jaw: 1, mouth: { ...RED_MOUTH, teeth: true } },
  };
  const inkling: Fish = { shape: 'inkling', variant: 'light', x: w * 0.22, y: h * (f.portrait ? 0.4 : 0.38), length: u * 0.34, facing: -1, tilt: -0.2, look: { jaw: 0.55 } };
  sticker(ctx, (c) => drawFish(c, perch, 0), { tint: PERCH_TINT });
  sticker(ctx, (c) => drawFish(c, inkling, 1), { outline: 9 });
}

/** Sky over the sea, split by a foamy waterline at `surface`. */
function skyAndSea(f: Frame, surface: number): void {
  const { ctx, w, h } = f;
  const sky = ctx.createLinearGradient(0, 0, 0, surface);
  sky.addColorStop(0, '#7fd3f7');
  sky.addColorStop(1, '#fff1c9');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, surface);
  const sun = ctx.createRadialGradient(w * 0.8, surface * 0.35, 0, w * 0.8, surface * 0.35, f.u * 0.35);
  sun.addColorStop(0, 'rgba(255,250,220,0.95)');
  sun.addColorStop(1, 'rgba(255,250,220,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, w, surface);
  water(ctx, { x: 0, y: surface, width: w, height: h - surface }, { x: w * 0.5, y: surface + 60 });
  ctx.save();
  ctx.lineWidth = 7;
  ctx.strokeStyle = PAPER;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 8) {
    const y = surface + Math.sin(x / 38) * 6;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
}

/** A tern drawn at `scale` times its game size, centred on (x, y), facing right. */
function tern(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, tilt: number, wing: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.scale(scale / ART_RES, scale / ART_RES);
  ctx.translate((-BIRD_TEX.w * ART_RES) / 2, (-BIRD_TEX.h * ART_RES) / 2);
  drawBird(ctx, 'tern', wing, 401);
  ctx.restore();
}

/** White droplets thrown up where the fish broke the surface. */
function spray(ctx: CanvasRenderingContext2D, x: number, surface: number, size: number): void {
  const drops = [[-1.25, 0.55, 0.1], [-1.55, 1.05, 0.07], [-1.0, 0.2, 0.08], [1.45, 0.3, 0.1], [1.75, 0.8, 0.08], [2.1, 0.35, 0.06], [-1.85, 0.3, 0.06]] as const;
  for (const [dx, dy, r] of drops) {
    sticker(ctx, (c) => {
      c.fillStyle = PAPER;
      c.beginPath();
      c.arc(x + dx * size, surface - dy * size, r * size, 0, Math.PI * 2);
      c.fill();
    }, { outline: 3 });
  }
}

/** The game's bird catch: the inkling bursting out of the sea, jaws open under a tern. */
function leap(f: Frame): void {
  const { ctx, w, h, u } = f;
  const surface = h * (f.portrait ? 0.62 : 0.7);
  skyAndSea(f, surface);
  const fish: Fish = { shape: 'inkling', variant: 'light', x: w * 0.47, y: surface - u * 0.14, length: u * 0.62, facing: 1, tilt: 0.9, look: { jaw: 1, mouth: RED_MOUTH } };
  sticker(ctx, (c) => drawFish(c, fish, 0));
  spray(ctx, w * 0.3, surface, u * 0.17);
  const bird = { x: w * 0.77, y: Math.max(surface - u * 0.52, u * 0.24) };
  sticker(ctx, (c) => tern(c, bird.x, bird.y, u * 0.0048, -0.25, 0), { outline: 7 });
  sticker(ctx, (c) => drawExclaim(c, bird.x + u * 0.16, bird.y - u * 0.14, u * 0.13, 0.25), { outline: 5 });
}

/** Four fish in a row, each with its jaws open on the one in front: there's always a bigger fish. */
function chain(f: Frame): void {
  const { ctx, w, h, u } = f;
  water(ctx, full(f), { x: w * 0.25, y: h * 0.3 });
  // From the smallest (top left) to the biggest (bottom right, cut by the frame).
  const row: readonly Fish[] = [
    { shape: 'minnow', variant: 'light', x: w * 0.13, y: h * 0.3, length: u * 0.17, facing: -1, tilt: -0.25, look: { jaw: 0.3 } },
    { shape: 'inkling', variant: 'light', x: w * 0.33, y: h * 0.4, length: u * 0.27, facing: -1, tilt: -0.25, look: { jaw: 1, mouth: RED_MOUTH } },
    { shape: 'perch', variant: 'heavy', x: w * 0.6, y: h * 0.53, length: u * 0.46, facing: -1, tilt: -0.25, look: { jaw: 1, mouth: RED_MOUTH } },
    { shape: 'shark', variant: 'heavy', x: w * 1.02, y: h * 0.74, length: u * 0.95, facing: -1, tilt: -0.25, look: { jaw: 1, mouth: { ...RED_MOUTH, teeth: true } } },
  ];
  for (let i = row.length - 1; i >= 0; i--) {
    sticker(ctx, (c) => drawFish(c, row[i]!, i), { tint: row[i]!.shape === 'perch' ? PERCH_TINT : undefined, outline: i === 0 ? 6 : 8 });
  }
  caption(ctx, 'EAT OR', w * 0.5, h * 0.08, u * 0.12, w * 0.8);
  caption(ctx, 'BE EATEN', w * 0.5, h * 0.08 + u * 0.135, u * 0.12, w * 0.8, YELLOW);
}

/** The hard red split between a top and a bottom panel, black-edged. */
function splitAcross(ctx: CanvasRenderingContext2D, y: number, width: number): void {
  ctx.save();
  ctx.fillStyle = '#111014';
  ctx.fillRect(0, y - 9, width, 18);
  ctx.fillStyle = '#e8262b';
  ctx.fillRect(0, y - 5, width, 10);
  ctx.restore();
}

/** Two panels, top and bottom: before and after. */
function panels(f: Frame): { readonly top: Rect; readonly bottom: Rect; readonly split: number } {
  const split = Math.round(f.h * 0.45);
  return { top: { x: 0, y: 0, width: f.w, height: split }, bottom: { x: 0, y: split, width: f.w, height: f.h - split }, split };
}

/** "FROM THIS" a tiny inkling, "TO THIS!" the same fish, huge, swallowing a perch. */
function glowup(f: Frame): void {
  const { ctx, w, u } = f;
  const { top, bottom, split } = panels(f);
  water(ctx, top, { x: w * 0.5, y: split * 0.6 });
  water(ctx, bottom, { x: w * 0.5, y: split + bottom.height * 0.5 });
  const tiny: Fish = { shape: 'inkling', variant: 'light', x: w * 0.5, y: split * 0.62, length: u * 0.14, facing: 1, tilt: 0.05 };
  sticker(ctx, (c) => drawFish(c, tiny, 0), { outline: 6, clip: top });
  const huge: Fish = { shape: 'inkling', variant: 'light', x: w * 0.72, y: split + bottom.height * 0.64, length: u * 0.86, facing: -1, tilt: 0.02, look: { jaw: 1, mouth: RED_MOUTH } };
  const perch: Fish = { shape: 'perch', variant: 'light', x: w * 0.33, y: split + bottom.height * 0.67, length: u * 0.25, facing: -1, tilt: -0.15, look: { jaw: 0.4 } };
  sticker(ctx, (c) => drawFish(c, huge, 1), { clip: bottom });
  sticker(ctx, (c) => drawFish(c, perch, 2), { tint: PERCH_TINT, outline: 6, clip: bottom });
  splitAcross(ctx, split, w);
  caption(ctx, 'FROM THIS', w * 0.5, split * 0.2, u * 0.1, w * 0.85);
  caption(ctx, 'TO THIS!', w * 0.5, split + u * 0.09, u * 0.1, w * 0.85, YELLOW);
}

/** "HUNTED": a perch three times your size, jaws open. "HUNTER": you, eating that perch. */
function hunter(f: Frame): void {
  const { ctx, w, u } = f;
  const { top, bottom, split } = panels(f);
  water(ctx, top, { x: w * 0.25, y: split * 0.6 });
  water(ctx, bottom, { x: w * 0.7, y: split + bottom.height * 0.5 });
  const bigPerch: Fish = { shape: 'perch', variant: 'heavy', x: w * 0.78, y: split * 0.62, length: u * 0.82, facing: -1, tilt: 0.05, look: { jaw: 1, mouth: RED_MOUTH } };
  const smallInkling: Fish = { shape: 'inkling', variant: 'light', x: w * 0.14, y: split * 0.68, length: u * 0.17, facing: -1, tilt: -0.15, look: { jaw: 0.5 } };
  sticker(ctx, (c) => drawFish(c, bigPerch, 0), { tint: PERCH_TINT, clip: top });
  sticker(ctx, (c) => drawFish(c, smallInkling, 1), { outline: 6, clip: top });
  const bigInkling: Fish = { shape: 'inkling', variant: 'light', x: w * 0.74, y: split + bottom.height * 0.64, length: u * 0.84, facing: -1, tilt: 0.02, look: { jaw: 1, mouth: RED_MOUTH } };
  const smallPerch: Fish = { shape: 'perch', variant: 'light', x: w * 0.33, y: split + bottom.height * 0.67, length: u * 0.24, facing: -1, tilt: -0.12, look: { jaw: 0.4 } };
  sticker(ctx, (c) => drawFish(c, bigInkling, 2), { clip: bottom });
  sticker(ctx, (c) => drawFish(c, smallPerch, 3), { tint: PERCH_TINT, outline: 6, clip: bottom });
  splitAcross(ctx, split, w);
  caption(ctx, 'HUNTED', w * 0.5, split * 0.17, u * 0.11, w * 0.8);
  caption(ctx, 'HUNTER', w * 0.5, split + u * 0.1, u * 0.11, w * 0.8, YELLOW);
}

/** Thumbnail only: the grown inkling with a perch going down. */
function gulp(f: Frame): void {
  const { ctx, w, h, u } = f;
  water(ctx, full(f), { x: w * 0.45, y: h * 0.45 });
  const huge: Fish = { shape: 'inkling', variant: 'light', x: w * 0.68, y: h * 0.5, length: u * 1.15, facing: -1, tilt: 0.02, look: { jaw: 1, mouth: RED_MOUTH } };
  const perch: Fish = { shape: 'perch', variant: 'light', x: w * 0.22, y: h * 0.55, length: u * 0.36, facing: -1, tilt: -0.15, look: { jaw: 0.4 } };
  sticker(ctx, (c) => drawFish(c, huge, 0));
  sticker(ctx, (c) => drawFish(c, perch, 1), { tint: PERCH_TINT, outline: 7 });
}

/** The game's name on a slightly tilted paper label, its bottom-right corner at (right, bottom). */
export function drawLogo(ctx: CanvasRenderingContext2D, right: number, bottom: number, size: number): void {
  ctx.save();
  ctx.font = `700 ${size}px Caveat`;
  const nameWidth = ctx.measureText('InkFish').width;
  const padX = size * 0.28;
  const boxW = nameWidth + padX * 2;
  const boxH = size * 1.32;
  ctx.translate(right - boxW / 2, bottom - boxH / 2);
  ctx.rotate(-0.035);
  ctx.shadowColor = 'rgba(0,10,30,0.45)';
  ctx.shadowBlur = size * 0.18;
  ctx.shadowOffsetY = size * 0.06;
  ctx.fillStyle = PAPER;
  ctx.beginPath();
  ctx.roundRect(-boxW / 2, -boxH / 2, boxW, boxH, size * 0.12);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = Math.max(3, size * 0.05);
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = BLUE_INK;
  ctx.fillText('InkFish', 0, -size * 0.12);
  ctx.font = `500 ${size * 0.34}px Caveat`;
  ctx.fillStyle = INK;
  ctx.fillText('16bit.ink', 0, size * 0.4);
  ctx.restore();
}

const IMAGES: Readonly<Record<ImageId, (f: Frame) => void>> = { run, leap, chain, glowup, hunter };
const THUMBS: Readonly<Record<ThumbId, (f: Frame) => void>> = { run, leap, gulp };

export function drawAdImage(ctx: CanvasRenderingContext2D, id: ImageId): void {
  const f = frameOf(ctx);
  IMAGES[id](f);
  drawLogo(ctx, f.w - f.u * 0.04, f.h - f.u * 0.04, f.u * 0.11);
}

export function drawAdThumb(ctx: CanvasRenderingContext2D, id: ThumbId): void {
  THUMBS[id](frameOf(ctx));
}
