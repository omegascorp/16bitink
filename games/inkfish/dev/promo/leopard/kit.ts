import { VIDEO, type Short } from '../short';
import { prepare as prepareGreatWhite } from '../foodchain/art/greatWhite';
import { drawWhite } from './figures';
import { makeIce } from './scene';
import { drawAdelie, prepareAdelie } from './art/adelie';
import { drawDiver, prepareDiver } from './art/diver';
import { drawGrizzly, prepareGrizzly } from './art/grizzly';
import { drawLeopardSeal, prepareLeopardSeal } from './art/leopardSeal';

/**
 * A preview of the short's painted animals (`?short=leopard&kit`): the great
 * white, the leopard seal (mouth shut, then wide open), the diver, the
 * grizzly and the Adelie penguin, big, to judge them side by side.
 */
export function createLeopardKit(ctx: CanvasRenderingContext2D): Short {
  const water = makeIce();
  void prepareGreatWhite();
  prepareLeopardSeal();
  prepareAdelie();
  prepareDiver();
  prepareGrizzly();
  return {
    loopSeconds: 2,
    draw(seconds) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(water, 0, 0, VIDEO.width, VIDEO.height);
      const boil = Math.floor(seconds * 8) % 3;
      drawWhite(ctx, { x: 540, y: 250, len: 900, angle: 0, flip: false, jaw: 0.25, worried: 0, tail: seconds * 6 }, seconds);
      drawLeopardSeal(ctx, { x: 540, y: 560, len: 1000, rot: 0, face: 1, beat: seconds * 4 }, { gape: 0.1, bend: 2 }, boil);
      drawLeopardSeal(ctx, { x: 420, y: 960, len: 980, rot: 0, face: 1, beat: seconds * 4 }, { gape: 0.85, bend: 2 }, boil);
      drawDiver(ctx, 280, 1260, 1.6, 0, 1, { kick: 0.1 * Math.sin(seconds * 5) }, boil);
      drawGrizzly(ctx, 770, 1180, 420, 1, boil);
      drawAdelie(ctx, { x: 800, y: 1480, len: 360, rot: -0.2, face: 1 }, { flap: 0.6 }, boil);
      drawAdelie(ctx, { x: 340, y: 1620, len: 300, rot: 0.3, face: -1 }, { flap: 0.1, sleepy: 0.8 }, boil);
      ctx.restore();
    },
    audio: async () => new Blob(),
  };
}
