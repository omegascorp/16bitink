import { makeCanvas } from '../../../src/art/pen';
import { VIDEO } from '../short';

/**
 * Fading a drawing as a whole. The game's pen (and drawSwimmer) set the
 * canvas alpha stroke by stroke, so an outer globalAlpha is lost on them:
 * a prop that fades in is drawn whole onto a scratch layer, which is then
 * laid over the frame at its alpha. Nested fades get a layer each.
 */

const layers: HTMLCanvasElement[] = [];
let depth = 0;

/** Runs `draw` (on the context it is handed) so that everything it draws shows at `alpha`. */
export function faded(ctx: CanvasRenderingContext2D, alpha: number, draw: (c: CanvasRenderingContext2D) => void): void {
  if (alpha <= 0) return;
  if (alpha >= 0.999) {
    draw(ctx);
    return;
  }
  const canvas = layers[depth] ?? (layers[depth] = makeCanvas(VIDEO.width, VIDEO.height).canvas);
  const layer = canvas.getContext('2d')!;
  layer.setTransform(1, 0, 0, 1, 0, 0);
  layer.clearRect(0, 0, canvas.width, canvas.height);
  layer.setTransform(ctx.getTransform());
  depth++;
  try {
    draw(layer);
  } finally {
    depth--;
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha *= alpha;
  ctx.drawImage(canvas, 0, 0);
  ctx.restore();
}
