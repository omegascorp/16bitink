import { prepare as prepareGreatWhite } from '../foodchain/art/greatWhite';
import { drawWhite } from '../seal/figures';
import type { Short } from '../short';
import { VIDEO } from '../short';
import { drawSideBody, drawSideHead, SIDE_K } from './art/catfishSide';
import { drawCatfishTop } from './art/catfishTop';
import { drawPigeon, drawSeizedBody, drawSeizedFront, type PigeonPose, seized } from './art/pigeon';

/**
 * A preview of the short's painted animals (`?short=pigeons&kit`): at t < 1
 * the great white over the wels catfish from above and side-on, to
 * judge them side by side; at 1 to 1.5 the catfish's mouth open round a pigeon
 * and nearly shut; from 1.5 the pigeon's poses (standing, preening, bathing,
 * drinking, seized, side-eye with a foot lifted).
 */

function backdrop(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createLinearGradient(0, 0, 0, VIDEO.height);
  g.addColorStop(0, '#9fd0e0');
  g.addColorStop(1, '#5aa39b');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
}

function bigThree(ctx: CanvasRenderingContext2D, t: number): void {
  drawWhite(ctx, { x: 560, y: 260, len: 1000, angle: 0, flip: false, jaw: 0.25, worried: 0, tail: t * 6 }, t);
  drawCatfishTop(ctx, { x: 1040, y: 760, len: 1000, heading: 0, curl: 0.1, beat: t * 4 }, 1);
  catfish(ctx, 1320, 0.7, t);
}

function birds(ctx: CanvasRenderingContext2D, t: number): void {
  drawPigeon(ctx, { x: 300, y: 420, len: 480, face: 1, look: 1 });
  drawPigeon(ctx, { x: 790, y: 420, len: 440, face: -1, preen: 1, tone: 2 });
  drawPigeon(ctx, { x: 300, y: 930, len: 440, face: 1, bath: 1, wings: 0.5, flap: t * 8, tone: 1 });
  drawPigeon(ctx, { x: 790, y: 930, len: 440, face: -1, bow: 0.9 });
  drawPigeon(ctx, { x: 300, y: 1500, len: 460, face: 1, wings: 1, flap: 0.8, alarm: 1, dangle: 1, rot: -0.3 });
  drawPigeon(ctx, { x: 800, y: 1500, len: 460, face: 1, look: -1, alarm: 1, foot: 1 });
}

/** The catfish whole, at frame 1's scale, its mouth at height `y`. */
function catfish(ctx: CanvasRenderingContext2D, y: number, gape: number, t: number, bird?: PigeonPose): void {
  const zoom = 1 / SIDE_K;
  const at = { x: 420 / zoom, y: y / zoom };
  ctx.save();
  ctx.scale(zoom, zoom);
  drawSideBody(ctx, at, { back: 0, lead: { x: 0, y: 0 }, beat: t * 6 }, SIDE_K);
  drawSideHead(ctx, { x: at.x, y: at.y, k: SIDE_K, rot: 0 }, { gape, sway: t, inMouth: bird ? (c) => drawSeizedBody(c, bird) : undefined, overJaws: bird ? (c) => drawSeizedFront(c, bird) : undefined, ink: 1 });
  ctx.restore();
}

function variants(ctx: CanvasRenderingContext2D, t: number): void {
  catfish(ctx, 620, 0.6, t, seized(t * 9, 1));
  catfish(ctx, 1500, 0.1, t);
}

export function createPigeonsKit(ctx: CanvasRenderingContext2D): Short {
  void prepareGreatWhite();
  return {
    loopSeconds: 2,
    draw(seconds) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      backdrop(ctx);
      if (seconds < 1) bigThree(ctx, seconds);
      else if (seconds < 1.5) variants(ctx, seconds);
      else birds(ctx, seconds);
      ctx.restore();
    },
    audio: async () => new Blob(),
  };
}
