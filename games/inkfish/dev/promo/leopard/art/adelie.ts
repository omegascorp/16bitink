import { PAPER_FILL } from '../../../../src/art/fish/kit';
import { INK, type Pt } from '../../../../src/art/pen';
import { BOIL_FRAMES } from '../../../../src/art/textures';
import { spline } from '../../kraken/whale';
import {
  blit, type Box, type Brush, type Bucket, bucketFor, columnWash, dab, edgeAt, frames, lazily, mixStops, px, screenScale, shade, smoothLoop, softLine, step01,
} from '../../seal/art/paint';

/**
 * An Adelie penguin (Pygoscelis adeliae), painted in the same manner as the
 * seals: a blue-black back, head and throat washed in column by column, a
 * white belly shaded grey-blue underneath, a white eye-ring round a dark wet
 * eye, a short feathered bill, pink feet, a stiff flipper that turns on the
 * shoulder. Own units: 104 long, middle at 0,0, nose (bill) to the right.
 */

export const PENGUIN_UNITS = 104;

export interface Placed {
  readonly x: number;
  readonly y: number;
  /** Length in px (own units are 104 long). */
  readonly len: number;
  readonly rot: number;
  readonly face: 1 | -1;
}

export interface PenguinLook {
  /** Flipper angle: 0 swept back along the body, 1 held out. */
  readonly flap?: number;
  /** Eye shut (limp), 0 .. 1. */
  readonly sleepy?: number;
}

const TOP: readonly Pt[] = spline([
  { x: 52, y: -2 }, { x: 49, y: -6 }, { x: 43, y: -9.5 }, { x: 35, y: -13.5 }, { x: 24, y: -13 }, { x: 14, y: -15 }, { x: 0, y: -21 }, { x: -16, y: -22.5 },
  { x: -30, y: -19 }, { x: -41, y: -11 }, { x: -50, y: -3 }, { x: -53, y: 0 },
], 5);
const UNDER: readonly Pt[] = spline([
  { x: -53, y: 0 }, { x: -44, y: 2 }, { x: -32, y: 11 }, { x: -12, y: 20 }, { x: 8, y: 21 }, { x: 24, y: 14 }, { x: 33, y: 7 }, { x: 42, y: 3.5 }, { x: 52, y: -2 },
], 5);
const BODY: readonly Pt[] = [...TOP, ...UNDER.slice(1, -1)];
const topAt = (x: number): number => edgeAt(TOP, x);
const underAt = (x: number): number => edgeAt(UNDER, x);

const AT = [0, 0.4, 0.52, 0.58, 0.82, 1] as const;
const BODY_PAL = ['#12181f', '#1c2530', '#2a3541', '#f0f3f2', '#f8faf9', '#b4c1c8'] as const;
const HEAD_PAL = ['#12181f', '#1a222c', '#202a35', '#222c37', '#222c37', '#1a222c'] as const;
const EYE: Pt = { x: 34, y: -6.5 };
const SHOULDER: Pt = { x: 8, y: 4 };
const FEET: Pt = { x: -40, y: 5 };

function paintBody(k: Brush): void {
  const { pen, ctx } = k;
  pen.fill(BODY, PAPER_FILL, 1);
  pen.clipped(BODY, () => {
    ctx.save();
    ctx.translate(px(k, 0.8), px(k, 1));
    columnWash(ctx, -56, 56, 1, topAt, underAt, (x) => mixStops(AT, [[BODY_PAL, 1 - step01(x, 20, 30)], [HEAD_PAL, step01(x, 20, 30)]]), 30);
    ctx.restore();
    // Sheen along the back, grey under the belly, soft feather streaks.
    softLine(ctx, [{ x: 30, y: -12 }, { x: 0, y: -18 }, { x: -30, y: -16 }], 5, '#9fb7cc', 0.3);
    softLine(ctx, [{ x: -35, y: 14 }, { x: -10, y: 19 }, { x: 15, y: 17 }], 6, '#7e92a0', 0.3);
    dab(ctx, -12, 8, 14, '120,140,152', 0.14);
    for (let i = 0; i < 26; i++) {
      const x = -46 + pen.rng() * 84;
      const y = topAt(x) + (underAt(x) - topAt(x)) * (0.1 + pen.rng() * 0.8);
      const white = y > topAt(x) + (underAt(x) - topAt(x)) * 0.55 && x < 24;
      pen.hair([{ x, y }, { x: x - 5 - pen.rng() * 5, y: y + (pen.rng() - 0.3) * 3 }], px(k, 0.8), white ? '#7e8e98' : '#6f8aa1', white ? 0.16 : 0.18);
    }
    // The bill's warm tip, then the eye-ring: a fat white ring round a dark wet eye.
    dab(ctx, 50, -2, 4, '90,40,32', 0.45);
    ctx.fillStyle = '#f6f4ea';
    ctx.beginPath();
    ctx.ellipse(EYE.x, EYE.y, 4.3, 3.9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(40,40,44,0.7)';
    ctx.lineWidth = px(k, 0.8);
    ctx.stroke();
  });
  pen.stroke(TOP.filter((p) => p.x < 51), px(k, 1.7), INK, 1, true);
  pen.stroke(UNDER.slice(1), px(k, 1.9), INK, 1, true);
  pen.hair(spline([{ x: 38, y: -1.5 }, { x: 46, y: -1.2 }, { x: 51, y: -2 }], 4), px(k, 0.9), '#ffffff', 0.25);
  pen.hair(spline([{ x: 25, y: 0 }, { x: 29, y: 4 }], 3), px(k, 0.8), INK, 0.3);
}

const FLIPPER: readonly Pt[] = smoothLoop([{ x: -2, y: -4 }, { x: 8, y: -6.5 }, { x: 22, y: -6 }, { x: 32, y: -3 }, { x: 36, y: 0 }, { x: 31, y: 3 }, { x: 20, y: 5.5 }, { x: 8, y: 6 }, { x: -2, y: 4.5 }], 4);
const FLIPPER_BOX: Box = { x0: -4, x1: 40, y0: -10, y1: 10 };

function paintFlipper(k: Brush): void {
  const { pen, ctx } = k;
  pen.fill(FLIPPER, '#171e27', 1);
  shade(ctx, FLIPPER, -6, 6, [[0, 'rgba(120,150,175,0.45)'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(235,240,240,0.7)']]);
  pen.stroke(FLIPPER.slice(2, FLIPPER.length - 2), px(k, 1.5), INK, 1, true);
}

const FOOT: readonly Pt[] = smoothLoop([{ x: 0, y: -3 }, { x: 8, y: -4 }, { x: 15, y: -1 }, { x: 14, y: 2 }, { x: 7, y: 4 }, { x: 0, y: 3 }], 3);
const FOOT_BOX: Box = { x0: -2, x1: 17, y0: -6, y1: 6 };

function paintFoot(k: Brush): void {
  const { pen, ctx } = k;
  pen.fill(FOOT, '#d99a8d', 1);
  shade(ctx, FOOT, -4, 4, [[0, 'rgba(255,230,220,0.5)'], [1, 'rgba(120,50,50,0.4)']]);
  pen.stroke(FOOT.slice(1, FOOT.length - 1), px(k, 1.4), INK, 1, true);
}

const BODY_BOX: Box = { x0: -58, x1: 58, y0: -27, y1: 26 };
const SEED = 9127;
interface Sprites {
  readonly res: number;
  readonly body: readonly HTMLCanvasElement[];
  readonly flipper: readonly HTMLCanvasElement[];
  readonly foot: readonly HTMLCanvasElement[];
}
const spritesFor = lazily((b: Bucket): Sprites => ({
  res: b.res,
  body: frames(BODY_BOX, b, SEED, paintBody),
  flipper: frames(FLIPPER_BOX, b, SEED + 13, paintFlipper),
  foot: frames(FOOT_BOX, b, SEED + 29, paintFoot),
}));

function drawEye(ctx: CanvasRenderingContext2D, sleepy: number, lw: number): void {
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(EYE.x + 0.3, EYE.y, 2.6, 2.6, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#080605';
  ctx.fill();
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.arc(EYE.x - 0.6, EYE.y - 1.2, 0.95, 0, Math.PI * 2);
  ctx.fill();
  if (sleepy > 0.01) {
    ctx.fillStyle = '#f6f4ea';
    ctx.fillRect(EYE.x - 6, EYE.y - 6, 12, 6 * sleepy * 1.9 - 0.6);
  }
  ctx.restore();
  if (sleepy > 0.01) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1 * lw;
    ctx.beginPath();
    ctx.moveTo(EYE.x - 3.2, EYE.y - 3 + 5.7 * sleepy);
    ctx.lineTo(EYE.x + 3.6, EYE.y - 3 + 5.7 * sleepy);
    ctx.stroke();
  }
}

/** Where a point in own units lands on screen. */
export function onPenguin(p: Placed, local: Pt): Pt {
  const k = p.len / PENGUIN_UNITS;
  const [c, s] = [Math.cos(p.rot), Math.sin(p.rot)];
  return { x: p.x + p.face * (local.x * k * c - local.y * k * s), y: p.y + local.x * k * s + local.y * k * c };
}

export function drawAdelie(ctx: CanvasRenderingContext2D, p: Placed, look: PenguinLook, boil: number): void {
  const k = p.len / PENGUIN_UNITS;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(p.face, 1);
  ctx.rotate(p.rot);
  ctx.scale(k, k);
  const scale = screenScale(ctx);
  const s = spritesFor(bucketFor(scale));
  const f = ((boil % BOIL_FRAMES) + BOIL_FRAMES) % BOIL_FRAMES;
  const flap = look.flap ?? 0;
  // Feet trail behind; the flipper on the near side swings from the shoulder.
  ctx.save();
  ctx.translate(FEET.x, FEET.y);
  ctx.rotate(Math.PI - 0.2);
  ctx.scale(1, -1);
  blit(ctx, s.foot[f]!, FOOT_BOX, s.res);
  ctx.restore();
  blit(ctx, s.body[f]!, BODY_BOX, s.res);
  drawEye(ctx, look.sleepy ?? 0, 1 / scale);
  ctx.save();
  ctx.translate(SHOULDER.x, SHOULDER.y);
  ctx.rotate(2.75 - 1.7 * flap);
  blit(ctx, s.flipper[f]!, FLIPPER_BOX, s.res);
  ctx.restore();
  ctx.restore();
}

export function prepareAdelie(): void {
  spritesFor(bucketFor(2.4));
}
