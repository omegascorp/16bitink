import { prepare as prepareGreatWhite } from '../foodchain/art/greatWhite';
import type { Short } from '../short';
import { VIDEO } from '../short';
import { drawBullShark, prepareBull } from './art/bullShark';
import { drawSaltCroc, prepareCroc } from './art/saltCroc';
import { drawWhite } from '../seal/figures';

/**
 * A preview of the short's painted animals (`?short=croc&kit`): at t < 1 the
 * great white, the crocodile and the bull shark big, one above the other, to
 * judge them side by side; at t >= 1 the crocodile's moods and the bull
 * shark's poses at the sizes the short uses.
 */

function backdrop(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createLinearGradient(0, 0, 0, VIDEO.height);
  g.addColorStop(0, '#6f9a9a');
  g.addColorStop(1, '#16302f');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
}

function bigThree(ctx: CanvasRenderingContext2D, t: number): void {
  drawWhite(ctx, { x: 560, y: 330, len: 1000, angle: 0, flip: false, jaw: 0.25, worried: 0, tail: t * 6 }, t);
  drawSaltCroc(ctx, { x: 540, y: 880, len: 960, rot: 0, face: 1, beat: t * 4 }, { gape: 0.2 }, 0);
  drawBullShark(ctx, { x: 520, y: 1400, len: 880, rot: 0, face: 1, beat: t * 4 }, {}, 0);
}

function variants(ctx: CanvasRenderingContext2D, t: number): void {
  const boil = Math.floor(t * 8) % 3;
  const beat = t * 4;
  const at = (x: number, y: number, len = 520) => ({ x, y, len, rot: 0, face: 1 as const, beat });
  drawSaltCroc(ctx, at(540, 260, 900), { gape: 0.9, glare: 1 }, boil);
  drawSaltCroc(ctx, at(540, 640, 900), { gape: 0, lid: 0.5 }, boil);
  drawSaltCroc(ctx, at(540, 960, 700), { gape: 0.3, bend: 0.2 }, boil);
  drawBullShark(ctx, at(540, 1240, 700), { fear: 1, bend: 0.25 }, boil);
  drawBullShark(ctx, at(540, 1500, 500), {}, boil);
  drawSaltCroc(ctx, { x: 300, y: 1760, len: 420, rot: -0.5, face: 1, beat }, { gape: 0.5 }, boil);
  drawBullShark(ctx, { x: 800, y: 1760, len: 300, rot: 0.3, face: 1, beat }, {}, boil);
}

export function createCrocKit(ctx: CanvasRenderingContext2D): Short {
  void prepareGreatWhite();
  prepareCroc();
  prepareBull();
  return {
    loopSeconds: 2,
    draw(seconds) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      backdrop(ctx);
      if (seconds < 1) bigThree(ctx, seconds);
      else variants(ctx, seconds);
      ctx.restore();
    },
    audio: async () => new Blob(),
  };
}
