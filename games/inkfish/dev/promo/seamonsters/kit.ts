import type { KitEntry } from '../foodchain/kit';
import type { Short } from '../short';
import * as baskingShark from './art/baskingShark';
import * as frilledShark from './art/frilledShark';
import * as legends from './art/legends';
import * as manatee from './art/manatee';
import * as siphonophore from './art/siphonophore';

/**
 * A preview page for this video's new drawings (`?video=seamonsters-kit`):
 * every one in a grid, moving with time; `&only=manatee` draws one full frame.
 */

const ALL: readonly { readonly KIT: KitEntry; prepare(): Promise<void> }[] = [frilledShark, manatee, baskingShark, siphonophore, legends];

export async function createSeamonstersKit(ctx: CanvasRenderingContext2D, only: string | null): Promise<Short> {
  await Promise.all(ALL.map((m) => m.prepare()));
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  const entries = only ? ALL.filter((m) => m.KIT.name === only).map((m) => m.KIT) : ALL.map((m) => m.KIT);
  if (entries.length === 0) throw new Error(`No drawing named "${only}": use one of ${ALL.map((m) => m.KIT.name).join(', ')}`);
  const cols = entries.length === 1 ? 1 : 2;
  const rows = Math.ceil(entries.length / cols);
  const draw = (t: number): void => {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#3f86b8');
    g.addColorStop(1, '#123a63');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const cw = W / cols;
    const ch = H / rows;
    entries.forEach((e, i) => {
      ctx.save();
      ctx.translate((i % cols) * cw, Math.floor(i / cols) * ch);
      ctx.beginPath();
      ctx.rect(0, 0, cw, ch);
      ctx.clip();
      e.draw(ctx, cw, ch, t);
      ctx.restore();
    });
    ctx.restore();
  };
  return { loopSeconds: 10, draw, audio: async () => new Blob([], { type: 'audio/wav' }) };
}
