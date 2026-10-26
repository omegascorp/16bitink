import { ellipse, INK, makeCanvas, Pen, type Pt } from '../../../src/art/pen';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { drawTextLine } from '../captions';
import { VIDEO } from '../short';
import { INK_BG, SPOKEN } from './scene';
import { css, drawRays, drawSnow, drawWater, glow, mixRgb, type Rgb } from './sea';
import { DEPTH_FT, DEPTH_M, depthAt01, fallAt, readoutAt, wrap } from './story';
import { TEXT } from './script';

/**
 * The drop between the hook and the seabed: the camera follows the ROV's
 * lamps down a dark water column, the last of the light fading above, snow
 * streaming up past, and the depth readout ticking to 1,500 ft (450 m).
 */

const BLUE_TOP: Rgb = [22, 52, 92];
const BLUE_MID: Rgb = [10, 26, 52];
const BLACK_TOP: Rgb = [4, 8, 16];
const BLACK_MID: Rgb = [2, 4, 9];
const BOTTOM: Rgb = [1, 2, 5];

/** "1,500" from 1500. */
const withCommas = (n: number): string => n.toLocaleString('en-US');

/** The readout's text at t: feet (to the nearest 10) and metres (to the nearest 5). */
export function readoutText(t: number): { readonly ft: string; readonly m: string } {
  const k = depthAt01(t);
  return { ft: `${withCommas(Math.round((DEPTH_FT * k) / 10) * 10)} ft`, m: `${Math.round((DEPTH_M * k) / 5) * 5} m` };
}

export function drawDescent(ctx: CanvasRenderingContext2D, sheet: HTMLCanvasElement, rov: readonly HTMLCanvasElement[], t: number, boil: number): void {
  const k = fallAt(t);
  drawWater(ctx, sheet, mixRgb(BLUE_TOP, BLACK_TOP, k), mixRgb(BLUE_MID, BLACK_MID, k), BOTTOM);
  drawRays(ctx, t, 1 - k, -150 - 900 * k);
  // Snow streaming up past the falling camera.
  const u = wrap(t);
  drawSnow(ctx, t, '#dfe8f2', 1.4, 2600 * k + 300 * u);
  drawRov(ctx, rov, t, boil);
}

/** The ROV's drawing, ink and wash, one canvas per boil frame: a pale float over a dark frame, thrusters each side, two lamps. */
const ROV = { w: 300, h: 190, res: 2 } as const;

export function makeRov(): HTMLCanvasElement[] {
  return Array.from({ length: BOIL_FRAMES }, (_, f) => {
    const W = ROV.w + 120;
    const H = ROV.h + 80;
    const { canvas, ctx } = makeCanvas(W * ROV.res, H * ROV.res);
    ctx.scale(ROV.res, ROV.res);
    ctx.translate(W / 2, H / 2);
    const pen = new Pen(ctx, 313 + f * 17, 1.1);
    const w = ROV.w;
    const h = ROV.h;
    const rect = (x0: number, y0: number, x1: number, y1: number): Pt[] => [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
    // The frame: dark struts and skids.
    const frame = rect(-w / 2, -h * 0.08, w / 2, h * 0.42);
    pen.fill(frame, '#20262c', 1);
    pen.hatch(frame, 6, 0.8, 0.6, { color: INK, alpha: 0.5 });
    for (const sx of [-0.42, -0.14, 0.14, 0.42]) pen.stroke([{ x: sx * w, y: -h * 0.08 }, { x: sx * w + 6, y: h * 0.42 }], 2.6, '#8c949a', 0.8);
    pen.stroke([...frame, frame[0]!], 3, INK, 1);
    pen.stroke([{ x: -w * 0.52, y: h * 0.48 }, { x: w * 0.52, y: h * 0.48 }], 4, INK, 1);
    // The float on top, shaded underneath.
    const float = rect(-w / 2 - 8, -h * 0.5, w / 2 + 8, -h * 0.06);
    pen.fill(float, '#e6d8a4', 1);
    pen.hatch(rect(-w / 2 - 8, -h * 0.24, w / 2 + 8, -h * 0.06), 5, 0.35, 0.7, { color: '#6b5f3e', alpha: 0.55 });
    for (let i = 1; i < 8; i++) pen.hair([{ x: -w / 2 + (i * w) / 8, y: -h * 0.48 }, { x: -w / 2 + (i * w) / 8 - 6, y: -h * 0.08 }], 1, INK, 0.45);
    pen.stroke([...float, float[0]!], 3, INK, 1);
    // Thrusters each side.
    for (const side of [-1, 1]) {
      const thr = ellipse(side * (w / 2 + 22), h * 0.16, 20, 34, 18);
      pen.fill(thr, '#3c434b', 1);
      pen.hatch(thr, 5, 1.2, 0.6, { color: INK, alpha: 0.5 });
      pen.stroke([...thr, thr[0]!], 2.6, INK, 1);
      pen.hair(ellipse(side * (w / 2 + 22), h * 0.16, 11, 22, 14), 1, '#9aa2a8', 0.7);
    }
    // The camera dome and the lamp housings.
    const dome = ellipse(0, h * 0.3, 22, 16, 16);
    pen.fill(dome, '#5d7180', 1);
    pen.stroke([...dome, dome[0]!], 2.4, INK, 1);
    for (const lx of [-0.3, 0.3]) {
      const lamp = ellipse(lx * w, h * 0.36, 17, 13, 14);
      pen.fill(lamp, '#fff6d6', 1);
      pen.stroke([...lamp, lamp[0]!], 2.4, INK, 1);
    }
    return canvas;
  });
}

/** The ROV going down ahead of us, its lamps lit, soft cones of light below. */
function drawRov(ctx: CanvasRenderingContext2D, frames: readonly HTMLCanvasElement[], t: number, boil: number): void {
  const u = wrap(t);
  const x = VIDEO.width / 2 + 10 * Math.sin(u * 2.1);
  const y = 720 + 8 * Math.sin(u * 3.3);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (const lx of [-0.3, 0.3]) {
    const ox = x + lx * ROV.w;
    const oy = y + ROV.h * 0.36;
    for (const [spread, alpha] of [[0.42, 0.12], [0.26, 0.14], [0.12, 0.12]] as const) {
      const g = ctx.createLinearGradient(ox, oy, ox, oy + 1200);
      g.addColorStop(0, `rgba(240,240,215,${alpha})`);
      g.addColorStop(1, 'rgba(240,240,215,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(ox + Math.tan(spread) * 1200 + lx * 300, oy + 1200);
      ctx.lineTo(ox - Math.tan(spread) * 1200 + lx * 300, oy + 1200);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.restore();
  const frame = frames[boil % frames.length]!;
  const W = frame.width / ROV.res;
  const H = frame.height / ROV.res;
  ctx.drawImage(frame, x - W / 2, y - H / 2, W, H);
  for (const lx of [-0.3, 0.3]) glow(ctx, x + lx * ROV.w, y + ROV.h * 0.36, 90, '255,245,205', 0.55);
}

/** The depth readout at the top: feet big, metres under it. */
export function drawReadout(ctx: CanvasRenderingContext2D, t: number): void {
  const a = readoutAt(t);
  if (a <= 0) return;
  const { ft, m } = readoutText(t);
  drawTextLine(ctx, ft, VIDEO.width / 2, TEXT.depth.y, TEXT.depth.size, 700, a, { fill: SPOKEN, halo: INK_BG });
  drawTextLine(ctx, m, VIDEO.width / 2, TEXT.depthM.y, TEXT.depthM.size, 700, a * 0.9, { fill: css([226, 232, 236]), halo: INK_BG });
}
