import { INK, type Pt } from '../../../../src/art/pen';
import { BOIL_FRAMES } from '../../../../src/art/textures';
import { spline } from '../../kraken/whale';
import { blit, type Box, type Brush, type Bucket, bucketFor, dab, fadeRoot, frames, lazily, px, screenScale, shade, smoothLoop, softLine } from '../../seal/art/paint';

/**
 * A grizzly bear's head and shoulders in three-quarter view, facing right,
 * painted like the seals: a shoulder hump behind, a broad dished skull, small
 * round ears, a paler muzzle with a dark wet nose, a small eye with a
 * catchlight under a heavy brow, fur in layered strokes lit from above. Own
 * units: the head about 100 wide, centred near 0,0; GRIZZLY_UNITS is the box.
 */

export const GRIZZLY_UNITS = 140;

const HUMP: readonly Pt[] = smoothLoop([
  { x: -130, y: 70 }, { x: -126, y: 0 }, { x: -108, y: -40 }, { x: -78, y: -66 }, { x: -50, y: -66 }, { x: -30, y: -48 }, { x: -20, y: 10 }, { x: -20, y: 70 },
], 5);
const SKULL: readonly Pt[] = smoothLoop([
  { x: -50, y: -14 }, { x: -44, y: -38 }, { x: -20, y: -54 }, { x: 14, y: -52 }, { x: 40, y: -38 }, { x: 52, y: -12 }, { x: 52, y: 14 }, { x: 38, y: 38 },
  { x: 8, y: 48 }, { x: -26, y: 42 }, { x: -46, y: 22 },
], 5);
const MUZZLE: readonly Pt[] = smoothLoop([
  { x: 12, y: 4 }, { x: 28, y: -8 }, { x: 54, y: -4 }, { x: 70, y: 8 }, { x: 68, y: 26 }, { x: 50, y: 40 }, { x: 26, y: 38 }, { x: 10, y: 22 },
], 5);
const NOSE: readonly Pt[] = smoothLoop([{ x: 50, y: 2 }, { x: 62, y: -4 }, { x: 74, y: 4 }, { x: 72, y: 14 }, { x: 60, y: 18 }, { x: 50, y: 12 }], 4);
const EAR_N: Pt = { x: -36, y: -48 };
const EAR_F: Pt = { x: 28, y: -54 };

const BASE = '#4b3120';
const FUR_DARK = '#1c0f08';
const FUR_LIGHT = '#d8b681';

function disc(ctx: CanvasRenderingContext2D, c: Pt, r: number): readonly Pt[] {
  void ctx;
  return Array.from({ length: 16 }, (_, i) => ({ x: c.x + r * Math.cos((i / 16) * Math.PI * 2), y: c.y + r * 0.95 * Math.sin((i / 16) * Math.PI * 2) }));
}

/** Fur: strokes laid outward from the bridge of the nose, dark under and pale-tipped on top, clipped to the shape. */
function fur(k: Brush, shape: readonly Pt[], centre: Pt, count: number, lightBias: number): void {
  const { pen } = k;
  const xs = shape.map((p) => p.x);
  const ys = shape.map((p) => p.y);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  pen.clipped(shape, () => {
    for (let i = 0; i < count; i++) {
      const x = x0 + pen.rng() * (x1 - x0);
      const y = y0 + pen.rng() * (y1 - y0);
      const [dx, dy] = [x - centre.x, y - centre.y];
      const d = Math.hypot(dx, dy) || 1;
      const len = 7 + pen.rng() * 9;
      const top = 1 - (y - y0) / (y1 - y0);
      const pale = pen.rng() < 0.25 + lightBias * top;
      pen.hair([{ x, y }, { x: x + (dx / d) * len, y: y + (dy / d) * len }], px(k, 0.9), pale ? FUR_LIGHT : FUR_DARK, pale ? 0.38 : 0.26);
    }
  });
}

function form(k: Brush, shape: readonly Pt[], base: string, lit: string, y0: number, y1: number, ink: number): void {
  const { pen, ctx } = k;
  pen.fill(shape, base, 1);
  shade(ctx, shape, y0, y1, [[0, lit], [0.45, 'rgba(0,0,0,0)'], [1, 'rgba(8,3,1,0.55)']]);
  pen.stroke([...shape, shape[0]!], px(k, ink), INK, 1, true);
}

function paint(k: Brush): void {
  const { pen, ctx } = k;
  // The shoulder hump behind, fading away to the left and down.
  form(k, HUMP, '#3d2616', 'rgba(210,170,110,0.4)', -66, 70, 1.6);
  fur(k, HUMP, { x: -20, y: -60 }, 150, 0.5);
  fadeRoot(ctx, -138, -86);
  // Ears: round, behind the skull.
  for (const e of [EAR_F, EAR_N]) {
    const shape = disc(ctx, e, e === EAR_N ? 14 : 12);
    form(k, shape, '#3b2314', 'rgba(220,180,120,0.45)', e.y - 14, e.y + 14, 1.5);
    pen.fill(disc(ctx, { x: e.x + 1, y: e.y + 2 }, 7), '#1a0d07', 0.85);
  }
  form(k, SKULL, BASE, 'rgba(225,185,125,0.5)', -54, 48, 1.8);
  fur(k, SKULL, { x: 20, y: 0 }, 300, 0.6);
  pen.clipped(SKULL, () => {
    // The dished face: a pale brow band, shadow in the hollow, a dark mask round the eyes, a shadowed cheek.
    softLine(ctx, [{ x: -30, y: -40 }, { x: 0, y: -46 }, { x: 30, y: -34 }], 9, FUR_LIGHT, 0.3);
    dab(ctx, 6, -10, 22, '16,8,4', 0.3);
    dab(ctx, -34, 24, 22, '10,5,2', 0.35);
  });
  form(k, MUZZLE, '#8a6338', 'rgba(240,215,160,0.55)', -8, 40, 1.7);
  fur(k, MUZZLE, { x: 34, y: 10 }, 90, 0.7);
  pen.clipped(MUZZLE, () => dab(ctx, 40, 30, 14, '10,5,2', 0.3));
  // The nose: dark, wet, a highlight and the nostril.
  pen.fill(NOSE, '#120b08', 1);
  pen.clipped(NOSE, () => dab(ctx, 61, 2, 7, '230,225,220', 0.5));
  pen.stroke([...NOSE, NOSE[0]!], px(k, 1.4), INK, 1, true);
  pen.stroke(spline([{ x: 66, y: 8 }, { x: 62, y: 11 }], 3), px(k, 1.4), '#000', 1, false);
  // The mouth: a dark line under the muzzle curving up at the corner.
  pen.hair(spline([{ x: 58, y: 28 }, { x: 44, y: 34 }, { x: 28, y: 32 }, { x: 18, y: 24 }], 5), px(k, 1.5), INK, 0.85);
  pen.hair(spline([{ x: 60, y: 18 }, { x: 58, y: 28 }], 3), px(k, 1.2), INK, 0.7);
  // Eyes under heavy brows: the near one bigger, both with catchlights.
  for (const [c, r] of [[{ x: -2, y: -14 }, 5.5], [{ x: 32, y: -20 }, 4.2]] as const) {
    pen.hair(spline([{ x: c.x - r - 3, y: c.y - r * 0.9 }, { x: c.x, y: c.y - r - 3 }, { x: c.x + r + 4, y: c.y - r * 0.4 }], 4), px(k, 2.6), INK, 0.9);
    pen.fill(disc(ctx, c, r), '#0b0605', 1);
    pen.dot(c.x - r * 0.35, c.y - r * 0.4, px(k, 1.4), '#ffffff', 0.95);
    pen.dot(c.x + r * 0.4, c.y + r * 0.45, px(k, 0.8), '#c9a273', 0.6);
  }
}

const BOX: Box = { x0: -138, x1: 80, y0: -72, y1: 74 };
const spritesFor = lazily((b: Bucket) => ({ res: b.res, c: frames(BOX, b, 5531, paint) }));

/** The bear's head at (x, y), the box `len` px across (`GRIZZLY_UNITS` own units), `face` -1 mirrors it. */
export function drawGrizzly(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, face: 1 | -1, boil: number): void {
  const k = len / GRIZZLY_UNITS;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(face * k, k);
  const s = spritesFor(bucketFor(screenScale(ctx)));
  blit(ctx, s.c[((boil % BOIL_FRAMES) + BOIL_FRAMES) % BOIL_FRAMES]!, BOX, s.res);
  ctx.restore();
}

export function prepareGrizzly(): void {
  spritesFor(bucketFor(5));
}
