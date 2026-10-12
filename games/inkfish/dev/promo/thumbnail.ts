import type { FishShape, InkVariant } from '../../src/art/fishArt';
import { INK, PAPER } from '../../src/art/pen';
import { ART_RES, drawBubble, drawPaper, drawWeed, type WeedKind } from '../../src/art/propArt';
import { CLOUD_SIZE, drawCloud } from '../../src/art/skyArt';
import { createRng } from '../../src/logic/rng';
import { stamp } from './banner';
import type { Pose } from './chain';
import { drawExclaim } from './render';
import { makeSprite } from './sprites';
import { drawSwimmer } from './swimmer';

/**
 * The YouTube thumbnail for the InkFish level 1 video, 1280x720, from the game's own art.
 *
 * Laid out for how YouTube shows thumbnails: as small as 168x94 in the
 * sidebar, so a three-line hook and three big fish; the duration badge covers
 * the bottom-right corner, so nothing there matters.
 */
export const THUMB = { width: 1280, height: 720 } as const;
/** The duration badge's corner, kept clear (?guides outlines it). */
export const BADGE = { x: 1090, y: 630, width: 190, height: 90 } as const;

const SURFACE_Y = 92;
const BLUE_INK = '#1f3f8a';
/** The inside-of-a-mouth red, for the word that hurts. */
const RED_INK = '#a3252b';

function paper(ctx: CanvasRenderingContext2D): void {
  const tile = document.createElement('canvas');
  tile.width = tile.height = 512;
  drawPaper(tile.getContext('2d')!, 512);
  ctx.fillStyle = ctx.createPattern(tile, 'repeat')!;
  ctx.fillRect(0, 0, THUMB.width, THUMB.height);
  // Deeper than the game's wash, so the frame holds up next to YouTube's white or black page.
  const wash = ctx.createLinearGradient(0, SURFACE_Y, 0, THUMB.height);
  wash.addColorStop(0, 'rgba(70,130,200,0.12)');
  wash.addColorStop(1, 'rgba(40,95,170,0.5)');
  ctx.fillStyle = wash;
  ctx.fillRect(0, SURFACE_Y, THUMB.width, THUMB.height - SURFACE_Y);
}

function wavy(ctx: CanvasRenderingContext2D, y: (x: number) => number, width: number, alpha: number): void {
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let x = -10; x <= THUMB.width + 10; x += 10) {
    if (x === -10) ctx.moveTo(x, y(x));
    else ctx.lineTo(x, y(x));
  }
  ctx.stroke();
  ctx.restore();
}

function surface(ctx: CanvasRenderingContext2D): void {
  stamp(ctx, CLOUD_SIZE.w, CLOUD_SIZE.h, (c) => drawCloud(c, 61), 760, 30, 0.75);
  wavy(ctx, (x) => SURFACE_Y + Math.sin(x / 60) * 5, 3.2, 0.8);
  wavy(ctx, (x) => SURFACE_Y + 13 + Math.sin(x / 60 + 1) * 4, 1.6, 0.35);
}

/** Weeds rising from the bottom edge, framing the left and right. */
function weeds(ctx: CanvasRenderingContext2D): void {
  const list: [WeedKind, number, number][] = [[0, 40, 1.5], [2, 140, 1.0], [1, 1240, 1.3]];
  for (const [kind, x, size] of list) {
    const art = document.createElement('canvas');
    art.width = 128 * ART_RES;
    art.height = 256 * ART_RES;
    drawWeed(art.getContext('2d')!, 7 + kind * 13 + x, kind, 0, art.width, art.height);
    const w = 128 * size;
    const h = 256 * size;
    ctx.drawImage(art, x - w / 2, THUMB.height - h + 20, w, h);
  }
}

/** Text with a thick paper halo, so it reads over the water and the pen lines. */
function haloText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, fill: string, halo: number): void {
  ctx.lineJoin = 'round';
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = halo;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

/** Sets the largest font up to `px` at which `text` fits in `maxWidth`. */
function fitFont(ctx: CanvasRenderingContext2D, text: string, weight: number, family: string, px: number, maxWidth: number): void {
  ctx.font = `${weight} ${px}px ${family}`;
  const scaled = Math.floor(px * Math.min(1, maxWidth / ctx.measureText(text).width));
  ctx.font = `${weight} ${scaled}px ${family}`;
}

/**
 * The hook, three lines stacked in the empty water on the left. No level name
 * or site: the video title says those, and YouTube prints the channel under it.
 */
function hook(ctx: CanvasRenderingContext2D): void {
  const left = 48;
  const width = 450;
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  fitFont(ctx, 'EAT', 400, 'Silkscreen', 200, width);
  haloText(ctx, 'EAT', left, 310, INK, 26);
  ctx.save();
  ctx.translate(left + 8, 415);
  ctx.rotate(-0.06);
  fitFont(ctx, 'or be', 700, 'Caveat', 140, width);
  haloText(ctx, 'or be', 0, 0, BLUE_INK, 22);
  ctx.restore();
  fitFont(ctx, 'EATEN', 400, 'Silkscreen', 200, width);
  haloText(ctx, 'EATEN', left, 570, RED_INK, 26);
  ctx.restore();
}

/**
 * "LEVEL 1" as an inked tag in the top-left: the series marker. Top-left
 * because YouTube puts its hover buttons top-right and the duration bottom-right.
 */
function levelTag(ctx: CanvasRenderingContext2D, level: number): void {
  const text = `LEVEL ${level}`;
  ctx.save();
  ctx.translate(48, 30);
  ctx.rotate(-0.03);
  ctx.font = '400 58px Silkscreen';
  const padX = 22;
  const w = ctx.measureText(text).width + padX * 2;
  const h = 84;
  ctx.fillStyle = INK;
  ctx.strokeStyle = PAPER;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.roundRect(0, 0, w, h, 10);
  ctx.stroke();
  ctx.fill();
  ctx.fillStyle = PAPER;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, padX, h / 2 + 3);
  ctx.restore();
}

interface Cast { readonly shape: FishShape; readonly variant: InkVariant; readonly x: number; readonly y: number; readonly length: number; readonly tilt: number; readonly jaw: number }

/**
 * The moment before the bite, all heading left: the inkling (the player)
 * gaping after a minnow while a perch twice its size closes on its tail.
 */
const CAST: readonly Cast[] = [
  { shape: 'perch', variant: 'heavy', x: 1150, y: 330, length: 720, tilt: 0.08, jaw: 0.95 },
  { shape: 'inkling', variant: 'light', x: 700, y: 470, length: 330, tilt: -0.2, jaw: 0.8 },
  { shape: 'minnow', variant: 'light', x: 445, y: 612, length: 140, tilt: -0.18, jaw: 0 },
];

function foodChain(ctx: CanvasRenderingContext2D): void {
  CAST.forEach(({ shape, variant, x, y, length, tilt, jaw }, i) => {
    const pose: Pose = { j: i, shape, age: 0, x, y, length, facing: -1, tilt, beat: i * 1.9, effort: 0.8 };
    drawSwimmer(ctx, makeSprite(shape, undefined, variant), pose, i, { jaw });
  });
  // The inkling has just seen what is behind it.
  const inkling = CAST[1]!;
  drawExclaim(ctx, inkling.x - 120, inkling.y - inkling.length * 0.62, inkling.length * 0.4, -0.15);
  const rng = createRng(9);
  // Bubbles rising between the inkling and the perch's jaw.
  for (let i = 0; i < 6; i++) {
    stamp(ctx, 16, 16, (c) => drawBubble(c, 3 + i), 800 + rng() * 70, 330 - i * 40 - rng() * 12, 1.4 + rng() * 1.4);
  }
}

/** Outlines the duration badge's corner, for checking the layout (?guides). */
export function drawGuides(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.lineWidth = 3;
  ctx.setLineDash([14, 8]);
  ctx.strokeStyle = '#d23';
  ctx.strokeRect(BADGE.x, BADGE.y, BADGE.width, BADGE.height);
  ctx.restore();
}

export function drawThumbnail(ctx: CanvasRenderingContext2D): void {
  paper(ctx);
  surface(ctx);
  weeds(ctx);
  foodChain(ctx);
  hook(ctx);
  levelTag(ctx, 1);
}
