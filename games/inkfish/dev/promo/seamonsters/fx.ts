import { H, W } from './lineup';

/**
 * Drawing through an offscreen layer: a canvas filter (or a flat tint) set
 * while drawing the big baked sprites (the blue whale's are ~40 MB) can lose
 * the canvas, so whatever needs one is drawn plain onto this layer first and
 * the effect is applied once, as the layer is laid on the frame.
 */

let scratch: { readonly canvas: HTMLCanvasElement; readonly ctx: CanvasRenderingContext2D } | null = null;

function layer(): { readonly canvas: HTMLCanvasElement; readonly ctx: CanvasRenderingContext2D } {
  if (!scratch) {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    scratch = { canvas, ctx: canvas.getContext('2d')! };
  }
  scratch.ctx.setTransform(1, 0, 0, 1, 0, 0);
  scratch.ctx.globalAlpha = 1;
  scratch.ctx.globalCompositeOperation = 'source-over';
  scratch.ctx.clearRect(0, 0, W, H);
  return scratch;
}

/** `draw` on the layer, then the layer laid on `ctx` through a CSS filter. */
export function drawFiltered(ctx: CanvasRenderingContext2D, filter: string, alpha: number, draw: (c: CanvasRenderingContext2D) => void): void {
  const l = layer();
  draw(l.ctx);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.filter = filter;
  ctx.drawImage(l.canvas, 0, 0);
  ctx.restore();
}

/** `draw` on the layer, flattened to one colour (a silhouette), then laid on `ctx`. */
export function drawTinted(ctx: CanvasRenderingContext2D, colour: string, alpha: number, draw: (c: CanvasRenderingContext2D) => void): void {
  const l = layer();
  draw(l.ctx);
  l.ctx.globalCompositeOperation = 'source-in';
  l.ctx.fillStyle = colour;
  l.ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.drawImage(l.canvas, 0, 0);
  ctx.restore();
}
