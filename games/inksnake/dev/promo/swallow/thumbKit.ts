import { makeCanvas } from '../../../src/art/pen';

/**
 * Shared pieces of the swallow video's YouTube thumbnails, ported from
 * InkFish's thumbnailKit (games/inkfish/dev/promo/thumbnailKit.ts) and drawn
 * at the video's 1920 × 1080: a colour punch over the game's soft paper
 * palette, cartoon stickers (black then white ring round a silhouette), the
 * big-channel caption (white or yellow, fat black outline), the red divider
 * and the fat yellow arrow.
 */
export const TW = 1920;
export const TH = 1080;
/** YouTube's duration badge, bottom right (at 1920 × 1080), kept clear. */
export const BADGE = { x: 1635, y: 945, width: 285, height: 135 } as const;

export const RED = '#e8262b';
export const YELLOW = '#ffd21f';
export const BLACK = '#111014';
const WHITE = '#fffaf0';

export function layerOf(draw: (c: CanvasRenderingContext2D) => void, width = TW, height = TH): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(width, height);
  ctx.imageSmoothingQuality = 'high';
  draw(ctx);
  return canvas;
}

/** Draws `draw` through a saturation and contrast punch (the video's soft palette, pushed for a thumbnail). */
export function punch(ctx: CanvasRenderingContext2D, draw: (c: CanvasRenderingContext2D) => void, filter = 'saturate(1.7) contrast(1.18) brightness(1.04)'): void {
  const layer = layerOf(draw);
  ctx.save();
  ctx.filter = filter;
  ctx.drawImage(layer, 0, 0);
  ctx.restore();
}

/** `layer`'s solid silhouette in `color`: soft shadows (alpha under ~60%) left out, so rings hug the art, not its shadow. */
function silhouette(layer: HTMLCanvasElement, color: string): HTMLCanvasElement {
  const probe = layerOf((c) => { c.fillStyle = color; c.fillRect(0, 0, 1, 1); }, 1, 1).getContext('2d')!.getImageData(0, 0, 1, 1).data;
  const { canvas, ctx } = makeCanvas(layer.width, layer.height);
  const image = layer.getContext('2d')!.getImageData(0, 0, layer.width, layer.height);
  const px = image.data;
  for (let i = 0; i < px.length; i += 4) {
    const on = px[i + 3]! > 150;
    px[i] = probe[0]!;
    px[i + 1] = probe[1]!;
    px[i + 2] = probe[2]!;
    px[i + 3] = on ? 255 : 0;
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

function ring(ctx: CanvasRenderingContext2D, shape: HTMLCanvasElement, width: number): void {
  const steps = 32;
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    ctx.drawImage(shape, Math.cos(a) * width, Math.sin(a) * width);
  }
}

export interface StickerStyle {
  /** White ring width, px (0: black ring only); a black ring 6 px wider goes round it. */
  readonly outline?: number;
  /** A CSS filter for the art itself (the punch). */
  readonly filter?: string;
  /** Clip to this path (a panel of a split thumbnail). */
  readonly clip?: (c: CanvasRenderingContext2D) => void;
  readonly shadow?: boolean;
}

/** Draws `draw` like a cartoon sticker: a drop shadow, a black then a white ring round its silhouette. */
export function sticker(ctx: CanvasRenderingContext2D, draw: (c: CanvasRenderingContext2D) => void, style: StickerStyle = {}): void {
  const { outline = 8, filter = 'saturate(1.6) contrast(1.15)', clip, shadow = true } = style;
  const layer = layerOf(draw);
  ctx.save();
  if (clip) {
    ctx.beginPath();
    clip(ctx);
    ctx.clip();
  }
  const black = silhouette(layer, BLACK);
  if (shadow) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,15,5,0.6)';
    ctx.shadowBlur = 34;
    ctx.shadowOffsetY = 14;
    ctx.drawImage(black, 0, 0);
    ctx.restore();
  }
  ring(ctx, black, outline + 6);
  if (outline > 0) ring(ctx, silhouette(layer, WHITE), outline);
  ctx.filter = filter;
  ctx.drawImage(layer, 0, 0);
  ctx.restore();
}

/** A caption in bold Silkscreen, white (or `fill`) with a fat black outline and a shadow, centred on `x`, fitted to `maxWidth`. */
export function caption(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, maxWidth: number, fill = '#ffffff', rotation = 0): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.font = `700 ${size}px Silkscreen`;
  const fitted = Math.floor(size * Math.min(1, maxWidth / ctx.measureText(text).width));
  ctx.font = `700 ${fitted}px Silkscreen`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(0,10,0,0.65)';
  ctx.shadowBlur = 26;
  ctx.shadowOffsetY = 12;
  ctx.strokeStyle = BLACK;
  ctx.lineWidth = fitted * 0.3;
  ctx.strokeText(text, 0, 0);
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = fill;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

/** The hard red split, black-edged, from (x0, 0) to (x1, TH). */
export function divider(ctx: CanvasRenderingContext2D, x0: number, x1: number): void {
  ctx.save();
  ctx.lineCap = 'butt';
  for (const [w, c] of [[30, BLACK], [16, RED]] as const) {
    ctx.beginPath();
    ctx.moveTo(x0 + (x0 - x1) * 0.05, -54);
    ctx.lineTo(x1 - (x0 - x1) * 0.05, TH + 54);
    ctx.lineWidth = w;
    ctx.strokeStyle = c;
    ctx.stroke();
  }
  ctx.restore();
}

/** A fat yellow arrow pointing right, centred at (x, y), black-outlined. */
export function arrow(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rotation = 0): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  const s = size / 2;
  ctx.beginPath();
  ctx.moveTo(-s, -s * 0.3);
  ctx.lineTo(s * 0.12, -s * 0.3);
  ctx.lineTo(s * 0.12, -s * 0.78);
  ctx.lineTo(s, 0);
  ctx.lineTo(s * 0.12, s * 0.78);
  ctx.lineTo(s * 0.12, s * 0.3);
  ctx.lineTo(-s, s * 0.3);
  ctx.closePath();
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(0,10,0,0.6)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 10;
  ctx.strokeStyle = BLACK;
  ctx.lineWidth = size * 0.11;
  ctx.stroke();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = YELLOW;
  ctx.fill();
  ctx.restore();
}

/** Outlines the duration badge's corner (?guides). */
export function drawGuides(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.lineWidth = 4;
  ctx.setLineDash([20, 12]);
  ctx.strokeStyle = '#d23';
  ctx.strokeRect(BADGE.x, BADGE.y, BADGE.width, BADGE.height);
  ctx.restore();
}
