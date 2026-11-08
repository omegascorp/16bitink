import { prepare as prepareGreatWhite } from '../foodchain/art/greatWhite';
import { drawWhite } from '../seal/figures';
import type { Short } from '../short';
import { VIDEO } from '../short';
import { drawDogfish } from './art/dogfish';
import { drawHagfish } from './art/hagfish';
import { gelCloud } from './art/slime';
import { swimSpine } from './story';

/**
 * A preview of the short's painted animals (`?short=hagfish&kit`): at t < 1 the
 * great white, the dogfish and the hagfish big, one above the other, to judge
 * them side by side; at t >= 1 the dogfish's moods (mouth, wide eye, gills with
 * slime) and the hagfish with its slime.
 */

function backdrop(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createLinearGradient(0, 0, 0, VIDEO.height);
  g.addColorStop(0, '#2a6a7e');
  g.addColorStop(1, '#0a2230');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
}

const dog = (x: number, y: number, len: number, rot = 0, beat = 0) => ({ x, y, len, rot, face: 1 as const, beat });

function bigThree(ctx: CanvasRenderingContext2D, t: number): void {
  drawWhite(ctx, { x: 560, y: 330, len: 1000, angle: 0, flip: false, jaw: 0.25, worried: 0, tail: t * 6 }, t);
  drawDogfish(ctx, dog(540, 800, 1000, 0, t * 4), { gape: 0.1 }, 0);
  drawHagfish(ctx, swimSpine({ x: 90, y: 1500 }, Math.PI, 880, t * 3, 0.5), { half: 46, coat: () => 0.5, wiggle: t * 8 }, 0);
}

function variants(ctx: CanvasRenderingContext2D, t: number): void {
  const boil = Math.floor(t * 8) % 3;
  drawDogfish(ctx, dog(540, 300, 900, 0, t * 4), { gape: 1, wide: 1, flare: 0.9, gel: 1, drift: t * 5 }, boil);
  drawDogfish(ctx, dog(540, 620, 700, 0.08, t * 4), { bend: 0.3, gape: 0.5, flare: 0.5 }, boil);
  drawDogfish(ctx, dog(540, 880, 520, 0, t * 4), {}, boil);
  drawHagfish(ctx, swimSpine({ x: 90, y: 1080 }, Math.PI, 700, t * 3, 0.6), { half: 36, coat: () => 1, jets: 0.7, wiggle: t * 8, mouth: 0.8 }, boil);
  gelCloud(ctx, { x: 540, y: 1380 }, 360, 1, 1, 9, t);
  drawHagfish(ctx, swimSpine({ x: 700, y: 1700 }, Math.PI, 620, t * 3 + 1, 0.7), { half: 28, coat: () => 0.4, wiggle: t * 8 }, boil);
}

export function createHagfishKit(ctx: CanvasRenderingContext2D): Short {
  void prepareGreatWhite();
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
