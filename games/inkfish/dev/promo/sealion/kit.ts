import { VIDEO, type Short } from '../short';
import { prepare as prepareGreatWhite, drawGreatWhite } from '../foodchain/art/greatWhite';
import { drawHumpback, humpbackMouth, prepare as prepareHumpback } from '../foodchain/art/humpback';
import { makeWater } from '../seal/scene';
import { drawSeaLion, prepareAnimals } from './animals';
import { createSealion } from './render';

/**
 * A preview of the short's painted animals (`?short=sealion&kit`): at t < 1 the
 * great white, the humpback (lunging, rising head-up) and the sea lion, big, to
 * judge them together; at t >= 1 the finished short.
 */

function big(ctx: CanvasRenderingContext2D, t: number): void {
  drawGreatWhite(ctx, 560, 230, 1000, 0, t, { jaw: 0.25, tail: t * 6 });
  const pose = { gape: 0.9, throat: 0.8, tail: t * 4 };
  drawHumpback(ctx, 520, 640, 1040, 0, t, pose);
  const m = humpbackMouth(520, 640, 1040, 0, pose);
  drawSeaLion(ctx, { x: 560, y: 1000, len: 700, rot: 0, face: 1, beat: t * 4 }, { mood: 'nervous', gape: 0, sweat: 0.8 }, 0);
  drawHumpback(ctx, 900, 1400, 1400, -Math.PI / 2 + 0.15, t, { gape: 1, throat: 0.9 });
  void m;
  drawHumpback(ctx, 560, 1700, 1000, Math.PI, t, { gape: 0.25, throat: 0.9, fin: -1.0, farFin: -0.4 });
}

export function createSealionKit(ctx: CanvasRenderingContext2D): Short {
  const water = makeWater();
  void prepareGreatWhite();
  void prepareHumpback();
  prepareAnimals();
  const main = createSealion(ctx);
  return {
    loopSeconds: 2,
    draw(seconds) {
      if (seconds >= 1) return main.draw(seconds);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(water, 0, 0, VIDEO.width, VIDEO.height);
      big(ctx, seconds);
      ctx.restore();
    },
    audio: async () => new Blob(),
  };
}
