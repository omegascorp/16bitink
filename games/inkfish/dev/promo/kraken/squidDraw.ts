import { PAPER_FILL } from '../../../src/art/fish/kit';
import { ellipse, INK, makeCanvas, Pen } from '../../../src/art/pen';
import { drawSquidBody, drawSquidFin, drawSquidLimbAlong, EYE, FIN, mantleHalf, SQUID_TEX } from '../../../src/art/squidArt';
import { LIMBS } from '../../../src/art/squidPose';
import { BOIL_FRAMES } from '../../../src/art/textures';
import { type Frame } from './rig';
import type { Pt } from './whale';

/**
 * The giant squid, the game's own drawing (src/art/squidArt.ts): its body
 * and fins as sprites, one a line-boil frame; its arms and tentacles drawn
 * fresh each frame along whatever path the rig gives them; and its huge
 * eye, opened wide.
 */

const VARIANT = 'heavy';
/** Sprite px per squid body px. */
const RES = 6;
/** The box round the body and fins, squid body px. */
const BOX = { x0: -140, x1: 136, y0: -72, y1: 72 } as const;

export interface SquidSprite {
  readonly body: readonly HTMLCanvasElement[];
}

export function makeSquidSprite(): SquidSprite {
  const body = Array.from({ length: BOIL_FRAMES }, (_, f) => {
    const seed = 501 + f * 977;
    const { canvas, ctx } = makeCanvas((BOX.x1 - BOX.x0) * RES, (BOX.y1 - BOX.y0) * RES);
    ctx.scale(RES, RES);
    ctx.translate(-BOX.x0, -BOX.y0);
    const h = mantleHalf(FIN.x);
    const fin = { x: SQUID_TEX.fin.w * FIN.origin.x, y: SQUID_TEX.fin.h * FIN.origin.y };
    // The far fin, under the mantle; the body; the near fin.
    ctx.save();
    ctx.translate(FIN.x, h * 0.94 - 2);
    ctx.scale(1, -1);
    ctx.translate(-fin.x, -fin.y);
    drawSquidFin(ctx, VARIANT, seed + 5);
    ctx.restore();
    ctx.save();
    ctx.translate(-SQUID_TEX.body.w / 2, -SQUID_TEX.body.h / 2);
    drawSquidBody(ctx, VARIANT, seed);
    ctx.restore();
    ctx.save();
    ctx.translate(FIN.x - fin.x, -h + 2 - fin.y);
    drawSquidFin(ctx, VARIANT, seed + 3);
    ctx.restore();
    return canvas;
  });
  return { body };
}

/** Into the squid's body px from whatever space `f` is placed in. */
export function enterFrame(ctx: CanvasRenderingContext2D, f: Frame): void {
  ctx.translate(f.x, f.y);
  ctx.rotate(f.angle);
  ctx.scale(f.scale, f.scale);
}

/** The body and fins, in the squid's body px. */
export function drawSquidSprite(ctx: CanvasRenderingContext2D, sprite: SquidSprite, boil: number): void {
  const c = sprite.body[boil % sprite.body.length]!;
  ctx.drawImage(c, BOX.x0, BOX.y0, BOX.x1 - BOX.x0, BOX.y1 - BOX.y0);
}

/** The limbs `which` (indexes into LIMBS), each along its path in body px. */
export function drawLimbs(ctx: CanvasRenderingContext2D, paths: readonly (readonly Pt[])[], which: readonly number[], boil: number): void {
  for (const i of which) drawSquidLimbAlong(ctx, paths[i]!, LIMBS[i]!.kind, VARIANT, 301 + i * 37 + boil * 977, LIMBS[i]!.far);
}

export const FAR_LIMBS = LIMBS.map((l, i) => (l.far ? i : -1)).filter((i) => i >= 0);
export const NEAR_LIMBS = LIMBS.map((l, i) => (l.far ? -1 : i)).filter((i) => i >= 0);

/**
 * The eye, opened wide over the drawing's own: a pale ring all round a small
 * pupil that looks where `gaze` says (x, y about -1 .. 1), and a glint.
 */
export function drawWideEye(ctx: CanvasRenderingContext2D, gaze: Pt, glint: number, boil: number): void {
  const pen = new Pen(ctx, 811 + boil * 977, 0.25);
  const r = EYE.r * 1.5;
  const c = { x: EYE.x, y: EYE.y };
  // The socket's shadow, the white, a gold iris ring, the pupil.
  pen.fill(ellipse(c.x, c.y, r * 1.35, r * 1.25, 28), '#5b2318', 0.5);
  pen.fill(ellipse(c.x, c.y, r, r * 0.94, 28), PAPER_FILL, 1);
  const p = { x: c.x + gaze.x * r * 0.32, y: c.y + gaze.y * r * 0.3 };
  pen.fill(ellipse(p.x, p.y, r * 0.56, r * 0.54, 24), '#c99a3e', 0.55);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    pen.hair([{ x: p.x + Math.cos(a) * r * 0.3, y: p.y + Math.sin(a) * r * 0.3 }, { x: p.x + Math.cos(a) * r * 0.54, y: p.y + Math.sin(a) * r * 0.52 }], 0.35, INK, 0.6);
  }
  pen.dot(p.x, p.y, r * 0.28, INK);
  pen.dot(p.x + r * 0.12, p.y - r * 0.14, r * 0.09, PAPER_FILL);
  pen.stroke([...ellipse(c.x, c.y, r, r * 0.94, 28), { x: c.x + r, y: c.y }], 1.2, INK, 1, false);
  // Wide open: the lids pulled right back.
  pen.stroke([{ x: c.x - r * 1.25, y: c.y - r * 0.55 }, { x: c.x - r * 0.2, y: c.y - r * 1.35 }, { x: c.x + r * 1.1, y: c.y - r * 0.75 }], 1.1, INK, 1, false);
  pen.hair([{ x: c.x - r * 1.1, y: c.y + r * 0.8 }, { x: c.x, y: c.y + r * 1.3 }, { x: c.x + r * 1.05, y: c.y + r * 0.85 }], 0.6, INK, 0.7);
  if (glint > 0) {
    // A star of light in it.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = glint;
    ctx.strokeStyle = '#fff6d8';
    ctx.lineCap = 'round';
    const g = { x: p.x + r * 0.15, y: p.y - r * 0.2 };
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 4 + 0.3;
      const len = r * (k % 2 ? 0.55 : 1.0);
      ctx.lineWidth = k % 2 ? 0.8 : 1.3;
      ctx.beginPath();
      ctx.moveTo(g.x - Math.cos(a) * len, g.y - Math.sin(a) * len);
      ctx.lineTo(g.x + Math.cos(a) * len, g.y + Math.sin(a) * len);
      ctx.stroke();
    }
    ctx.restore();
  }
}
