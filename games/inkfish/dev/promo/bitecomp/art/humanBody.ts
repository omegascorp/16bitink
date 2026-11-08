import { makeCanvas, type Pt } from '../../../../src/art/pen';
import { spline } from '../../kraken/whale';
import { FADE_FROM, FADE_TO, NAPE, NECK, NECK_BOX, NECKLINE, SEAM, SHIRT, SHIRT_BACK, SHIRT_FRONT, THROAT } from './humanShape';
import { fill, type Ink, INNER, line, OUTER, RIB, SHIRT as SHIRT_BASE, SHIRT_HI, SHIRT_SH, SKIN, SKIN_SH, within } from './humanSkin';

/**
 * The human's slender neck and shoulders in a plain crew-neck T-shirt, cel
 * shaded, fading out below. Baked once per screen size (it never moves), at
 * the screen's own resolution so it stays crisp.
 */

/** The jaw's crisp shadow across the top of the neck, and the back of the neck turned from the light. */
const JAW_SHADOW: readonly Pt[] = spline([
  { x: 20, y: 30 }, { x: 4, y: 58 }, { x: -18, y: 70 }, { x: -48, y: 68 }, { x: -80, y: 56 }, { x: -112, y: 36 }, { x: -140, y: 18 }, { x: -175, y: 8 },
], 4);
const NECK_BACK_SHADOW: readonly Pt[] = spline([{ x: -128, y: 0 }, { x: -136, y: 50 }, { x: -146, y: 100 }, { x: -152, y: 140 }], 4);

function paintNeck(k: Ink): void {
  const { ctx } = k;
  fill(ctx, NECK, SKIN);
  within(ctx, NECK, () => {
    fill(ctx, [...JAW_SHADOW, { x: -240, y: -80 }, { x: 40, y: -80 }], SKIN_SH);
    fill(ctx, [...NECK_BACK_SHADOW, { x: -240, y: 160 }, { x: -240, y: 0 }], SKIN_SH);
  });
  line(k, THROAT, OUTER, { in: 0.25, out: 0.1 });
  line(k, NAPE, OUTER, { in: 0.3, out: 0.1 });
}

function paintShirt(k: Ink): void {
  const { ctx } = k;
  fill(ctx, SHIRT, SHIRT_BASE);
  within(ctx, SHIRT, () => {
    // The neck's shadow under the collar, the arm's side and the lower back turned away.
    const collar = NECKLINE.map((p) => ({ x: p.x, y: p.y + 12 + 6 * Math.sin((p.x + 184) / 30) }));
    fill(ctx, [...collar, { x: 0, y: 60 }, { x: -200, y: 60 }], SHIRT_SH);
    const side = spline([{ x: -96, y: 320 }, { x: -104, y: 250 }, { x: -140, y: 200 }, { x: -200, y: 186 }, { x: -270, y: 196 }, { x: -330, y: 222 }, { x: -380, y: 262 }], 5);
    fill(ctx, [...side, { x: -400, y: 330 }], SHIRT_SH);
    // Light along the top of the shoulder.
    const top = SHIRT_BACK.filter((p) => p.y < 210);
    fill(ctx, [...top.map((p) => ({ x: p.x + 4, y: p.y + 4 })), ...[...top].reverse().map((p) => ({ x: p.x + 16, y: p.y + 15 }))], SHIRT_HI);
  });
  // The ribbed crew neck.
  const band = [...NECKLINE, ...[...NECKLINE].reverse().map((p) => ({ x: p.x + 1, y: p.y + 8 }))];
  fill(ctx, band, RIB);
  line(k, NECKLINE.map((p) => ({ x: p.x + 1, y: p.y + 8 })), INNER, { in: 0.1, out: 0.1 });
  line(k, SEAM, INNER, { in: 0.15, out: 0.3 });
  line(k, NECKLINE, OUTER * 0.85, { in: 0.05, out: 0.05 });
  line(k, SHIRT_FRONT, OUTER, { in: 0.02, out: 0.3 });
  line(k, SHIRT_BACK, OUTER, { in: 0.3, out: 0.02 });
}

function paintBust(k: Ink): void {
  const { ctx } = k;
  paintNeck(k);
  paintShirt(k);
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  const g = ctx.createLinearGradient(0, FADE_FROM, 0, FADE_TO);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.fillStyle = g;
  ctx.fillRect(NECK_BOX.x0, FADE_FROM, NECK_BOX.x1 - NECK_BOX.x0, NECK_BOX.y1 - FADE_FROM);
  ctx.restore();
}

/** Sprite px per local unit, rounded to about 3% steps so nearby sizes share a bake. */
const quantise = (res: number): number => 2 ** (Math.round(Math.log2(res) * 24) / 24);
const baked = new Map<number, HTMLCanvasElement>();

/** The bust baked at `res` screen px per local unit. */
export function bustAt(res: number): { readonly canvas: HTMLCanvasElement; readonly res: number } {
  const q = quantise(Math.max(0.05, res));
  let canvas = baked.get(q);
  if (!canvas) {
    if (baked.size > 24) baked.clear();
    const made = makeCanvas(Math.ceil((NECK_BOX.x1 - NECK_BOX.x0) * q), Math.ceil((NECK_BOX.y1 - NECK_BOX.y0) * q));
    made.ctx.scale(q, q);
    made.ctx.translate(-NECK_BOX.x0, -NECK_BOX.y0);
    paintBust({ ctx: made.ctx, lw: 1 / q });
    canvas = made.canvas;
    baked.set(q, canvas);
  }
  return { canvas, res: q };
}
