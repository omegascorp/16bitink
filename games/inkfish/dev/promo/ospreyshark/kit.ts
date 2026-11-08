import { drawGreatWhite } from '../foodchain/art/greatWhite';
import { VIDEO, type Short } from '../short';
import { drawFish } from './art/fish';
import { drawOspreyBack, drawOspreyFeet, drawOspreyFront, type OspreyPose } from './art/osprey';
import { drawSky } from './art/scenery';
import { drawSharkWithFish } from './art/shark';
import { gripFor, sharkPlace } from './rig';

/**
 * A preview of the short's painted animals (`?short=ospreyshark&kit`), to
 * judge them against the great white (../foodchain/art/greatWhite.ts) side by
 * side: the great white on top, the osprey with the shark and the fish in the
 * middle, the fish close up below.
 */
export function createOspreySharkKit(ctx: CanvasRenderingContext2D): Short {
  return {
    loopSeconds: 3,
    draw(seconds) {
      const boil = Math.floor(seconds * 8) % 3;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      drawSky(ctx, 1);
      drawGreatWhite(ctx, 540, 190, 760, 0, seconds, { jaw: 0.3 });
      ctx.save();
      ctx.translate(-20, -60);
      ctx.scale(0.95, 0.95);
      const osprey: OspreyPose = { x: 560, y: 630, k: 1, beat: seconds * 4, flap: 1, cry: 0 };
      const shark = sharkPlace(0.8, seconds * 6, 0.3);
      const grip = gripFor(osprey, shark);
      drawOspreyBack(ctx, osprey, boil);
      drawSharkWithFish(ctx, shark, seconds, { worry: 0.6, wiggle: Math.sin(seconds * 8) * 0.5, look: 0 }, 0, boil);
      drawOspreyFeet(ctx, osprey, grip, boil);
      drawOspreyFront(ctx, osprey, grip, boil);
      ctx.restore();
      drawFish(ctx, { x: 540, y: 1560, k: 3.2, a: 0, worry: 0.5 + 0.5 * Math.sin(seconds * 2), wiggle: Math.sin(seconds * 6) * 0.5, look: 1 }, boil);
      ctx.restore();
    },
    audio: async () => new Blob(),
  };
}
