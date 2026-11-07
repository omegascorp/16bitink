import { drawGreatWhite } from '../foodchain/art/greatWhite';
import { VIDEO, type Short } from '../short';
import { drawCapybara } from './art/capybara';
import { drawPelican } from './art/pelican';
import { PELICAN_K, type PelicanHead } from './rig';

/**
 * A preview of the short's painted animals (`?short=pelican&kit`), to judge
 * them against the great white (../foodchain/art/greatWhite.ts) side by side:
 * the shark on top, the pelican standing with its slack pouch, a pup and the
 * mother below.
 */

const REST: PelicanHead = { x: 132, y: -292, a: 0.95, gape: 0, sack: 20, bulge: 0.4, seeThrough: 0, alarm: 0, squint: 0 };

export function createPelicanKit(ctx: CanvasRenderingContext2D): Short {
  return {
    loopSeconds: 3,
    draw(seconds) {
      const boil = Math.floor(seconds * 8) % 3;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const g = ctx.createLinearGradient(0, 0, 0, VIDEO.height);
      g.addColorStop(0, '#bfe0ee');
      g.addColorStop(1, '#a9cf7a');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
      drawGreatWhite(ctx, 540, 300, 900, 0, seconds, { jaw: 0.2 });
      drawPelican(ctx, { x: 560, y: 1150, k: PELICAN_K * 1.25, face: -1, head: REST, lean: 0, step: 0, walk: 0 }, boil);
      drawCapybara(ctx, { x: 300, y: 1560, k: 1.3, face: 1, lid: 0.56, tone: 0 }, boil);
      drawCapybara(ctx, { x: 640, y: 1860, k: 1.6, face: -1, lid: 0.66, tone: 1 }, boil);
      ctx.restore();
    },
    audio: async () => new Blob(),
  };
}
