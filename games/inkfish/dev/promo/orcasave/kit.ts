import { VIDEO, type Short } from '../short';
import { prepare as prepareGreatWhite, drawGreatWhite } from '../foodchain/art/greatWhite';
import { drawHumpback, prepare as prepareHumpback } from '../foodchain/art/humpback';
import { drawOrca, prepare as prepareOrca } from '../foodchain/art/orca';
import { makeWater } from '../seal/scene';
import { drawWeddell, prepareWeddell } from './art/weddell';
import { createOrcasave } from './render';

/**
 * A preview of the short's painted animals (`?short=orcasave&kit`): the great
 * white for scale, the humpback belly-up with its flippers open, an orca, and
 * the Weddell seal (calm, and nervous); at t >= 1 the finished short.
 */
export function createOrcasaveKit(ctx: CanvasRenderingContext2D): Short {
  const water = makeWater();
  void prepareGreatWhite();
  void prepareHumpback();
  void prepareOrca();
  prepareWeddell();
  const main = createOrcasave(ctx);
  return {
    loopSeconds: 2,
    draw(seconds) {
      if (seconds >= 1) return main.draw(seconds);
      const t = seconds;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(water, 0, 0, VIDEO.width, VIDEO.height);
      drawGreatWhite(ctx, 560, 190, 900, 0, t, { jaw: 0.25, tail: t * 6 });
      drawOrca(ctx, 560, 440, 700, 0, t, { jaw: 0.1, tail: t * 6 });
      drawWeddell(ctx, { x: 560, y: 760, len: 760, rot: 0, face: 1, beat: t * 4 }, { mood: 'plain', gape: 0 }, 0);
      drawWeddell(ctx, { x: 300, y: 1080, len: 420, rot: 0, face: 1, beat: t * 4 }, { mood: 'nervous', gape: 0, sweat: 0.8, smile: 0 }, 0);
      ctx.save();
      ctx.translate(540, 1500);
      ctx.scale(1, -1);
      drawHumpback(ctx, 0, 0, 1300, 0, t, { gape: 0, throat: 0.3, fin: -0.9, farFin: 0.3 });
      ctx.restore();
      ctx.restore();
    },
    audio: async () => new Blob(),
  };
}
