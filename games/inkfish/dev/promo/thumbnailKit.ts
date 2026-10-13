import type { FishShape, InkVariant } from '../../src/art/fishArt';
import { INK, PAPER } from '../../src/art/pen';
import { drawPaper } from '../../src/art/propArt';
import { createRng } from '../../src/logic/rng';
import type { Pose } from './chain';
import { makeSprite } from './sprites';
import { drawSwimmer, type SwimLook } from './swimmer';

/**
 * Shared pieces of the YouTube thumbnails (1280x720), modelled on what the
 * fish-eat-fish videos with millions of views do (Feed and Grow, the
 * "SIZE 1 vs SIZE 99999" and "FROM THIS... TO THIS..." formats):
 * - bright saturated water with warm-coloured fish on it;
 * - one huge open mouth, bright red inside, cropped by the frame;
 * - a prey with a big scared eye;
 * - a cartoon outline (white, then black) round everything that matters;
 * - two or three words, white with a fat black outline.
 * Everything is still the game's own pen-and-ink art, so it stays on brand.
 */
export const THUMB = { width: 1280, height: 720 } as const;
/** The duration badge's corner, kept clear (?guides outlines it). */
export const BADGE = { x: 1090, y: 630, width: 190, height: 90 } as const;

export const RED = '#e8262b';
export const YELLOW = '#ffd21f';
const BLACK = '#111014';
/** The inside of an open mouth, bright enough to read at 168 px. */
export const RED_MOUTH = { inside: '#a01d2c', tongue: '#ff6b7d' } as const;

export interface Rect { readonly x: number; readonly y: number; readonly width: number; readonly height: number }
export const FULL: Rect = { x: 0, y: 0, ...THUMB };

/** Vivid water over a faint layer of the game's sketchbook paper, lit from `light`. */
export function water(ctx: CanvasRenderingContext2D, area: Rect, light: { readonly x: number; readonly y: number }): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(area.x, area.y, area.width, area.height);
  ctx.clip();
  const wash = ctx.createLinearGradient(0, 0, 0, THUMB.height);
  wash.addColorStop(0, '#3cc8f2');
  wash.addColorStop(0.55, '#1593db');
  wash.addColorStop(1, '#0a55a8');
  ctx.fillStyle = wash;
  ctx.fillRect(area.x, area.y, area.width, area.height);
  // The paper's grain and specks, multiplied in lightly.
  const tile = document.createElement('canvas');
  tile.width = tile.height = 512;
  drawPaper(tile.getContext('2d')!, 512);
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = ctx.createPattern(tile, 'repeat')!;
  ctx.fillRect(area.x, area.y, area.width, area.height);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'screen';
  rays(ctx, area);
  const glow = ctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, 520);
  glow.addColorStop(0, 'rgba(200,250,255,0.55)');
  glow.addColorStop(1, 'rgba(200,250,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(area.x, area.y, area.width, area.height);
  ctx.restore();
}

/** Sunlight slanting down from the surface. */
function rays(ctx: CanvasRenderingContext2D, area: Rect): void {
  const rng = createRng(17);
  for (let x = area.x + 60; x < area.x + area.width + 200; x += 180 + rng() * 80) {
    const w = 40 + rng() * 60;
    const fade = ctx.createLinearGradient(0, 0, 0, THUMB.height * 0.85);
    fade.addColorStop(0, `rgba(190,245,255,${0.18 + rng() * 0.12})`);
    fade.addColorStop(1, 'rgba(190,245,255,0)');
    ctx.fillStyle = fade;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + w, 0);
    ctx.lineTo(x + w - 240, THUMB.height * 0.85);
    ctx.lineTo(x - 280, THUMB.height * 0.85);
    ctx.closePath();
    ctx.fill();
  }
}

function layerOf(draw: (c: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const layer = document.createElement('canvas');
  layer.width = THUMB.width;
  layer.height = THUMB.height;
  draw(layer.getContext('2d')!);
  return layer;
}

/** `layer`'s silhouette, filled with `color`. */
function silhouette(layer: HTMLCanvasElement, color: string): HTMLCanvasElement {
  return layerOf((c) => {
    c.drawImage(layer, 0, 0);
    c.globalCompositeOperation = 'source-in';
    c.fillStyle = color;
    c.fillRect(0, 0, THUMB.width, THUMB.height);
  });
}

function ring(ctx: CanvasRenderingContext2D, shape: HTMLCanvasElement, width: number): void {
  const steps = 32;
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    ctx.drawImage(shape, Math.cos(a) * width, Math.sin(a) * width);
  }
}

/**
 * Multiplies `tint` over the art in place, fading out over the near-white
 * pixels so eye whites and teeth stay white.
 */
function warm(layer: HTMLCanvasElement, tint: string): void {
  const c = layer.getContext('2d')!;
  const probe = layerOf((p) => { p.fillStyle = tint; p.fillRect(0, 0, 1, 1); }).getContext('2d')!.getImageData(0, 0, 1, 1).data;
  const image = c.getImageData(0, 0, layer.width, layer.height);
  const px = image.data;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] === 0) continue;
    const light = (0.3 * px[i]! + 0.59 * px[i + 1]! + 0.11 * px[i + 2]!) / 255;
    const w = Math.min(1, Math.max(0, (0.95 - light) / 0.1));
    for (let k = 0; k < 3; k++) px[i + k] = px[i + k]! * (1 - w + (w * probe[k]!) / 255);
  }
  c.putImageData(image, 0, 0);
}

export interface StickerStyle {
  /** White ring width, px; a black ring 5 px wider goes round it. */
  readonly outline?: number;
  /** Multiplied over the art to warm or deepen its colours, e.g. '#ffb070'. */
  readonly tint?: string;
  /** Clip to this area (a panel of a split thumbnail). */
  readonly clip?: Rect;
}

/**
 * Draws `draw` like a cartoon sticker: a drop shadow, a black then a white
 * ring round its silhouette, and optionally a colour multiplied over the art.
 */
export function sticker(ctx: CanvasRenderingContext2D, draw: (c: CanvasRenderingContext2D) => void, style: StickerStyle = {}): void {
  const { outline = 8, tint, clip } = style;
  const layer = layerOf(draw);
  if (tint) warm(layer, tint);
  ctx.save();
  if (clip) {
    ctx.beginPath();
    ctx.rect(clip.x, clip.y, clip.width, clip.height);
    ctx.clip();
  }
  const black = silhouette(layer, BLACK);
  ctx.save();
  ctx.shadowColor = 'rgba(0,20,50,0.55)';
  ctx.shadowBlur = 26;
  ctx.shadowOffsetY = 10;
  ctx.drawImage(black, 0, 0);
  ctx.restore();
  ring(ctx, black, outline + 5);
  ring(ctx, silhouette(layer, PAPER), outline);
  ctx.drawImage(layer, 0, 0);
  ctx.restore();
}

export interface Fish {
  readonly shape: FishShape;
  readonly variant: InkVariant;
  readonly x: number;
  readonly y: number;
  readonly length: number;
  readonly facing: 1 | -1;
  readonly tilt: number;
  readonly look?: SwimLook;
}

export function poseOf({ shape, x, y, length, facing, tilt }: Fish, j: number): Pose {
  return { j, shape, age: 0, x, y, length, facing, tilt, beat: j * 1.9, effort: 0.8 };
}

/** A game fish, mid-swim. */
export function drawFish(ctx: CanvasRenderingContext2D, fish: Fish, j: number): void {
  drawSwimmer(ctx, makeSprite(fish.shape, undefined, fish.variant), poseOf(fish, j), j, fish.look);
}

/**
 * A caption in bold Silkscreen, white (or `fill`) with a fat black outline and
 * a shadow, centred on `x` and fitted to `maxWidth`: the big-channel look.
 */
export function caption(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, maxWidth: number, fill = '#ffffff'): void {
  ctx.save();
  ctx.font = `700 ${size}px Silkscreen`;
  const fitted = Math.floor(size * Math.min(1, maxWidth / ctx.measureText(text).width));
  ctx.font = `700 ${fitted}px Silkscreen`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(0,10,30,0.6)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 8;
  ctx.strokeStyle = BLACK;
  ctx.lineWidth = fitted * 0.3;
  ctx.strokeText(text, x, y);
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
  ctx.restore();
}

/** The hard red split between two panels, black-edged. */
export function divider(ctx: CanvasRenderingContext2D, x: number): void {
  ctx.save();
  ctx.fillStyle = BLACK;
  ctx.fillRect(x - 9, 0, 18, THUMB.height);
  ctx.fillStyle = RED;
  ctx.fillRect(x - 5, 0, 10, THUMB.height);
  ctx.restore();
}

/** A fat yellow arrow pointing right, centred at (x, y), black-outlined. */
export function arrow(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rotation = 0): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  const s = size / 2;
  ctx.beginPath();
  ctx.moveTo(-s, -s * 0.32);
  ctx.lineTo(s * 0.15, -s * 0.32);
  ctx.lineTo(s * 0.15, -s * 0.75);
  ctx.lineTo(s, 0);
  ctx.lineTo(s * 0.15, s * 0.75);
  ctx.lineTo(s * 0.15, s * 0.32);
  ctx.lineTo(-s, s * 0.32);
  ctx.closePath();
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(0,10,30,0.6)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 6;
  ctx.strokeStyle = BLACK;
  ctx.lineWidth = size * 0.12;
  ctx.stroke();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = YELLOW;
  ctx.fill();
  ctx.restore();
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

