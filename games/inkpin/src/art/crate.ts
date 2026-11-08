import { ART_RES, INK, WOOD, WOOD_DARK } from './palette';
import { makeCanvas, Pen, type Pt } from './pen';
import { mix, rgba } from './wash';

/** A wooden crate: planks across, a cross brace, nails and a lit top edge. Centred; `h` is half its side. */
export const CRATE_FRAME = { w: 64, h: 64 } as const;

export function paintCrate(h: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(CRATE_FRAME.w * ART_RES, CRATE_FRAME.h * ART_RES);
  ctx.scale(ART_RES, ART_RES);
  ctx.translate(CRATE_FRAME.w / 2, CRATE_FRAME.h / 2);
  const pen = new Pen(ctx, 33, 0.35);
  const box: Pt[] = [{ x: -h, y: -h }, { x: h, y: -h }, { x: h, y: h }, { x: -h, y: h }];
  const g = ctx.createLinearGradient(-h, -h, h, h);
  g.addColorStop(0, mix(WOOD, '#ffffff', 0.18));
  g.addColorStop(1, mix(WOOD, WOOD_DARK, 0.45));
  ctx.fillStyle = g;
  ctx.fillRect(-h, -h, h * 2, h * 2);
  // Planks: four across, each with its own wash and grain.
  const plank = (h * 2) / 4;
  for (let k = 0; k < 4; k++) {
    const y = -h + k * plank;
    ctx.fillStyle = rgba(k % 2 ? WOOD_DARK : '#ffffff', 0.08);
    ctx.fillRect(-h, y, h * 2, plank);
    for (let s = 0; s < 2; s++) {
      const gy = y + plank * (0.35 + s * 0.3);
      pen.hair([{ x: -h + 3, y: gy }, { x: -h * 0.2, y: gy + 0.8 }, { x: h - 3, y: gy - 0.4 }], 0.5, WOOD_DARK, 0.45);
    }
    if (k) pen.hair([{ x: -h, y }, { x: h, y }], 0.9, mix(WOOD_DARK, INK, 0.4), 0.8);
  }
  // A frame round the edge and a cross brace.
  const rim = 5;
  ctx.strokeStyle = mix(WOOD, WOOD_DARK, 0.35);
  ctx.lineWidth = rim;
  ctx.strokeRect(-h + rim / 2, -h + rim / 2, h * 2 - rim, h * 2 - rim);
  ctx.lineWidth = rim - 1;
  ctx.beginPath();
  ctx.moveTo(-h + rim, h - rim);
  ctx.lineTo(h - rim, -h + rim);
  ctx.stroke();
  pen.hair([{ x: -h + rim, y: h - rim - 2 }, { x: h - rim - 2, y: -h + rim }], 0.6, '#ffffff', 0.35);
  pen.hair([{ x: -h + 2, y: -h + 1.5 }, { x: h - 2, y: -h + 1.5 }], 1.1, '#fff1d8', 0.6);
  // Nails at the corners.
  for (const [x, y] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) pen.dot(x * (h - rim / 2), y * (h - rim / 2), 1.1, mix(WOOD_DARK, INK, 0.6), 0.9);
  // Straight outline: the pen's smoothing would round the corners off.
  ctx.strokeStyle = INK;
  ctx.globalAlpha = 0.9;
  ctx.lineWidth = 1.6;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  box.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.closePath();
  ctx.stroke();
  ctx.globalAlpha = 1;
  return canvas;
}
