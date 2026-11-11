import { drawGreatWhite } from '../foodchain/art/greatWhite';
import { VIDEO, type Short } from '../short';
import { BEETLE_REST, drawBeetle } from './art/beetle';
import { drawFrog, FROG_REST, POND_FROG } from './art/frog';
import { FOUR_KINDS } from './art/kinds';
import { drawPond } from './art/scenery';

/**
 * A preview of the short's painted animals (`?short=beetle&kit`), to judge
 * them against the great white (../foodchain/art/greatWhite.ts): the shark on
 * top, the pond frog big with the beetle beside it, the four other kinds and
 * the beetle large from above.
 */
export function createBeetleKit(ctx: CanvasRenderingContext2D): Short {
  return {
    loopSeconds: 3,
    draw(seconds) {
      const boil = Math.floor(seconds * 8) % 3;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      drawPond(ctx, 1900, 0, 0);
      drawGreatWhite(ctx, 540, 230, 760, 0, seconds, { jaw: 0.2 });
      drawFrog(ctx, POND_FROG, { ...FROG_REST, x: 420, y: 760, k: 1.9, face: 1, look: 0.4 }, boil);
      drawBeetle(ctx, { ...BEETLE_REST, x: 900, y: 740, k: 1.9, a: Math.PI, tilt: 0.6, t: seconds }, boil);
      FOUR_KINDS.forEach((look, i) => drawFrog(ctx, look, { ...FROG_REST, x: 200 + (i % 2) * 500, y: 1080 + Math.floor(i / 2) * 260, k: 0.95, face: 1 }, boil));
      drawBeetle(ctx, { ...BEETLE_REST, x: 540, y: 1700, k: 9, a: -0.3, step: seconds * 6, t: seconds }, boil);
      ctx.restore();
    },
    audio: async () => new Blob(),
  };
}
