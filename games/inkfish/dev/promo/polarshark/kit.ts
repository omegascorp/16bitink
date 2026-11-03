import { prepare as prepareGreatWhite } from '../foodchain/art/greatWhite';
import { drawWhite } from '../seal/figures';
import type { Short } from '../short';
import { VIDEO } from '../short';
import { drawGreenlandShark, prepareGreenland } from './art/greenlandShark';
import { drawPolarBear, prepareBear } from './art/polarBear';

/**
 * A preview of the short's painted animals (`?short=polarshark&kit`): at t < 1 the great white, the
 * Greenland shark and the polar bear big, one above the other, to judge them side by side; at t >= 1
 * the shark's mouth and the bear's moods at the sizes the short uses.
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
  drawGreenlandShark(ctx, { x: 540, y: 880, len: 960, rot: 0, face: 1, beat: t * 3 }, { open: 0.6 }, 0);
  drawPolarBear(ctx, { x: 520, y: 1400, len: 760, rot: 0, face: 1, beat: t * 5 }, {}, 0);
}

function variants(ctx: CanvasRenderingContext2D, t: number): void {
  const boil = Math.floor(t * 8) % 3;
  const at = (x: number, y: number, len: number, beat = t * 4) => ({ x, y, len, rot: 0, face: 1 as const, beat });
  drawGreenlandShark(ctx, at(540, 280, 900), { open: 0 }, boil);
  drawGreenlandShark(ctx, at(540, 640, 800), { open: 1, bend: 0.2 }, boil);
  drawGreenlandShark(ctx, at(540, 960, 500), { dark: 1 }, boil);
  drawPolarBear(ctx, at(540, 1240, 500), { shock: 1 }, boil);
  drawPolarBear(ctx, at(300, 1560, 380), { effort: 0.4 }, boil);
  drawPolarBear(ctx, at(800, 1560, 380), { dark: 1 }, boil);
}

export function createPolarsharkKit(ctx: CanvasRenderingContext2D): Short {
  void prepareGreatWhite();
  prepareGreenland();
  prepareBear();
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
