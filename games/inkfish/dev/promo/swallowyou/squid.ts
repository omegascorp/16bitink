import { freeLimb } from '../kraken/rig';
import { drawLimbs, drawSquidSprite, FAR_LIMBS, makeSquidSprite, NEAR_LIMBS, type SquidSprite } from '../kraken/squidDraw';
import { LIMBS } from '../../../src/art/squidPose';
import { boilOf } from './art/ink';

/**
 * The giant squid (the kraken short's drawing): a free-swimming one, its arms
 * trailing, for the sperm whale to hunt. Its mantle leads along -x of its own
 * frame; `length` is mantle tip to arm tips in screen px.
 */

/** Mantle tip to arm tips in the drawing's body px, about. */
const SQUID_SPAN = 640;

let sprite: SquidSprite | null = null;

export function drawSquid(ctx: CanvasRenderingContext2D, x: number, y: number, length: number, angle: number, t: number, alpha = 1): void {
  if (alpha <= 0 || length < 4) return;
  sprite ??= makeSquidSprite();
  const boil = boilOf(t);
  const paths = LIMBS.map((_, i) => freeLimb(i, t, 0.35));
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(length / SQUID_SPAN, length / SQUID_SPAN);
  ctx.translate(-80, 0);
  drawLimbs(ctx, paths, FAR_LIMBS, boil);
  drawSquidSprite(ctx, sprite, boil);
  drawLimbs(ctx, paths, NEAR_LIMBS, boil);
  ctx.restore();
}
