import { drawOrca, prepare as prepareOrca } from '../foodchain/art/orca';
import { drawWhaleShark, prepare as prepareShark } from '../foodchain/art/whaleShark';
import { drawCloseDiver } from './diverParts';
import { diverCutAt } from './poses';
import type { Short } from '../short';
import { VIDEO } from '../short';

/** A preview of the short's painted subjects (`?short=orcaflip&kit`): the shark right way up and belly-up, an orca, the diver. */
export function createOrcaflipKit(ctx: CanvasRenderingContext2D): Short {
  void prepareOrca();
  void prepareShark();
  return {
    loopSeconds: 2,
    draw(seconds) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const g = ctx.createLinearGradient(0, 0, 0, VIDEO.height);
      g.addColorStop(0, '#2478ad');
      g.addColorStop(1, '#06294a');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
      drawWhaleShark(ctx, 540, 260, 1000, 0, seconds, { tail: seconds * 3 });
      ctx.save();
      ctx.translate(540, 700);
      ctx.scale(1, -1);
      drawWhaleShark(ctx, 0, 0, 1000, 0, seconds, { tail: seconds * 3, whiteBelly: true, gape: 0.3 });
      ctx.restore();
      drawOrca(ctx, 540, 1100, 1000, 0, seconds, { jaw: 0.1 });
      drawCloseDiver(ctx, { ...diverCutAt(0), pose: { ...diverCutAt(0).diver.pose, x: 300, y: 1800 }, scale: 3 }, 0, seconds);
      ctx.restore();
    },
    audio: async () => new Blob(),
  };
}
