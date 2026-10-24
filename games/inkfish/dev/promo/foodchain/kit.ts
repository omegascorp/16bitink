import { PAPER } from '../../../src/art/pen';
import type { Short } from '../short';
import * as blueWhale from './art/blueWhale';
import * as greatWhite from './art/greatWhite';
import * as orca from './art/orca';
import * as plankton from './art/plankton';
import * as whaleShark from './art/whaleShark';

/**
 * A preview page for the food-chain video's new drawings (`?video=foodchain-kit`).
 * Every drawing module in `art/` exports a `KIT` entry; the page draws them all in a
 * grid, or one full frame with `&only=<name>`. `t` animates any pose
 * (jaw, tail, throat), so `snap.mjs` can check a few moments.
 */

export interface KitEntry {
  readonly name: string;
  /** Draws a preview filling a w x h box (origin at its top left) at time t seconds. */
  draw(ctx: CanvasRenderingContext2D, w: number, h: number, t: number): void;
}

export async function createKit(ctx: CanvasRenderingContext2D, only: string | null): Promise<Short> {
  const all = [plankton, orca, greatWhite, whaleShark, blueWhale];
  await Promise.all(all.map((m) => m.prepare()));
  const entries = all.map((m) => m.KIT).filter((e) => !only || e.name === only);
  if (only && entries.length === 0) throw new Error(`No kit entry named "${only}"`);
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  const cols = Math.ceil(Math.sqrt(entries.length));
  const rows = Math.max(1, Math.ceil(entries.length / cols));
  return {
    loopSeconds: 10,
    draw(t) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, W, H);
      entries.forEach((e, i) => {
        const cw = W / cols;
        const ch = H / rows;
        ctx.save();
        ctx.translate((i % cols) * cw, Math.floor(i / cols) * ch);
        ctx.beginPath();
        ctx.rect(0, 0, cw, ch);
        ctx.clip();
        e.draw(ctx, cw, ch, t);
        ctx.restore();
      });
      ctx.restore();
    },
    audio: async () => new Blob([], { type: 'audio/wav' }),
  };
}
