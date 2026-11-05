import { PAPER, makeCanvas } from '../../../src/art/pen';
import { type TextInk, drawTextLine } from '../captions';
import { drawOrca } from '../foodchain/art/orca';
import { drawWhaleShark } from '../foodchain/art/whaleShark';
import { VIDEO } from '../short';
import type { OrcaPose, SharkPose } from './poses';

/** Drawing helpers the scenes share: the two animals from a pose, a ghost of the shark, written words. */

export const LIGHT_TEXT: TextInk = { fill: PAPER, halo: '#041a30' };

export function say(ctx: CanvasRenderingContext2D, text: string, line: { readonly y: number; readonly size: number }, alpha: number, ink: TextInk = LIGHT_TEXT): void {
  drawTextLine(ctx, text, VIDEO.width / 2, line.y, line.size, 700, alpha, ink);
}

/** The whale shark, rolled about its long axis: scaled in y by cos(roll), so a negative scale shows its belly on top, painted white and lit. */
export function drawShark(ctx: CanvasRenderingContext2D, p: SharkPose, t: number): void {
  const s = Math.abs(p.s) < 0.035 ? (p.s < 0 ? -0.035 : 0.035) : p.s;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.a);
  ctx.scale(1, s);
  drawWhaleShark(ctx, 0, 0, p.len, 0, t, { tail: p.tail, gape: p.gape, dent: p.dent, whiteBelly: s < 0 });
  ctx.restore();
}

export function drawOrcaPose(ctx: CanvasRenderingContext2D, o: OrcaPose, t: number): void {
  if (o.alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha *= o.alpha;
  drawOrca(ctx, o.x, o.y, o.len, o.a, t, { tail: o.tail }, o.flip);
  ctx.restore();
}

let scratch: ReturnType<typeof makeCanvas> | null = null;
/** A scratch canvas the size of the video, cleared. */
export function scratchLayer(): CanvasRenderingContext2D {
  scratch ??= makeCanvas(VIDEO.width, VIDEO.height);
  scratch.ctx.setTransform(1, 0, 0, 1, 0, 0);
  scratch.ctx.globalCompositeOperation = 'source-over';
  scratch.ctx.clearRect(0, 0, VIDEO.width, VIDEO.height);
  return scratch.ctx;
}

/** What `draw` paints, all of it faded together: drawn straight at `alpha`, the sprites' overlaps would show darker. */
export function faded(ctx: CanvasRenderingContext2D, draw: (c: CanvasRenderingContext2D) => void, alpha: number): void {
  const c = scratchLayer();
  c.save();
  draw(c);
  c.restore();
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.drawImage(scratch!.canvas, 0, 0);
  ctx.restore();
}

/** What `draw` paints, as a flat colour: a silhouette, drawn at `alpha`, with `edge` px of dark outline if asked. */
export function silhouette(ctx: CanvasRenderingContext2D, draw: (c: CanvasRenderingContext2D) => void, fill: string, alpha: number, outline?: { readonly colour: string; readonly width: number }): void {
  const c = scratchLayer();
  c.save();
  draw(c);
  c.restore();
  c.globalCompositeOperation = 'source-in';
  c.fillStyle = outline ? outline.colour : fill;
  c.fillRect(0, 0, VIDEO.width, VIDEO.height);
  const layer = scratch!.canvas;
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (outline) {
    for (let i = 0; i < 12; i++) ctx.drawImage(layer, Math.cos((i * Math.PI) / 6) * outline.width, Math.sin((i * Math.PI) / 6) * outline.width);
    const inner = scratchLayer();
    inner.save();
    draw(inner);
    inner.restore();
    inner.globalCompositeOperation = 'source-in';
    inner.fillStyle = fill;
    inner.fillRect(0, 0, VIDEO.width, VIDEO.height);
  }
  ctx.drawImage(scratch!.canvas, 0, 0);
  ctx.restore();
}
