import { BOIL_FRAMES } from '../../../src/art/textures';
import type { Short } from '../short';
import { drawText, PAPER_ON_INK } from '../swallowyou/text';
import { H, W } from './layout';
import { drawFishState, type Expr } from './scene';
import { prepareSprites, type FishId } from './species';
import { drawStage } from './tank';

/**
 * A preview page for the survival video's cast (`?video=survival-kit`):
 * every fish it draws, with each face it pulls (plain, wide, squeezed,
 * happy, sweating). `&only=rivulus` shows one fish big.
 */

const IDS: readonly FishId[] = [
  'pupfish', 'mudskipper', 'rivulus', 'goldfish', 'eel', 'icefish', 'salmon', 'tuna', 'cod', 'mako', 'white',
  'giantMudskipper', 'sailfish', 'nurse', 'lungfish', 'flyingfish', 'yellowfin', 'bluefin', 'bigeye', 'albacore',
];
const FACES: readonly (Expr | 'sweat')[] = [null, 'wide', 'squeeze', 'happy', 'sweat'];

export async function createSurvivalKit(ctx: CanvasRenderingContext2D, only: string | null): Promise<Short> {
  prepareSprites();
  const ids = only ? IDS.filter((id) => id === only) : IDS;
  if (ids.length === 0) throw new Error(`No fish "${only}": use one of ${IDS.join(', ')}`);
  const cols = only ? 1 : 4;
  const rows = Math.ceil(ids.length / cols);
  const cw = W / cols;
  const ch = (H - 40) / rows;
  const draw = (t: number): void => {
    const boil = Math.floor(t * 6) % BOIL_FRAMES;
    const face = FACES[Math.floor(t / 1.5) % FACES.length]!;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    drawStage(ctx, t);
    ids.forEach((id, i) => {
      const x = (i % cols) * cw + cw / 2;
      const y = 40 + Math.floor(i / cols) * ch + ch / 2;
      const len = Math.min(cw * 0.7, ch * 2.2);
      drawFishState(ctx, {
        id, x, y, len, facing: 1, tilt: 0, effort: 0.4, alpha: 1,
        expr: face === 'sweat' ? 'wide' : face, sweat: face === 'sweat' ? 1 : 0,
      }, t, boil);
      drawText(ctx, id, { x, y: y + ch * 0.42, size: 30, maxWidth: cw - 20 }, 700, 1, PAPER_ON_INK);
    });
    drawText(ctx, `face: ${face ?? 'plain'}`, { x: W / 2, y: 22, size: 30, maxWidth: 600 }, 700, 1, PAPER_ON_INK);
    ctx.restore();
  };
  return { loopSeconds: 1.5 * FACES.length, draw, audio: async () => new Blob([], { type: 'audio/wav' }) };
}
