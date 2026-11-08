import type { KitEntry } from '../foodchain/kit';
import type { Short } from '../short';
import * as alligator from './art/alligator';
import * as bullShark from './art/bullShark';
import * as dog from './art/dog';
import * as greatWhite from './art/greatWhite';
import * as human from './art/human';
import * as jaguar from './art/jaguar';
import * as lion from './art/lion';
import * as megalodon from './art/megalodon';
import * as piranha from './art/piranha';
import * as saltCroc from './art/saltCroc';
import * as trex from './art/trex';

/**
 * A preview page for the bite-force video's heads (`?video=bitecomp-kit`):
 * every one in a grid, the jaw opening and shutting; `&only=lion` draws one,
 * full frame. The bite point of each is marked with a small red cross.
 */

const ALL: readonly { readonly KIT: KitEntry; prepare(): Promise<void> }[] = [human, jaguar, dog, lion, bullShark, alligator, saltCroc, greatWhite, trex, megalodon, piranha];

export async function createBitecompKit(ctx: CanvasRenderingContext2D, only: string | null): Promise<Short> {
  await Promise.all(ALL.map((m) => m.prepare()));
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  const entries = only ? ALL.filter((m) => m.KIT.name === only).map((m) => m.KIT) : ALL.map((m) => m.KIT);
  if (entries.length === 0) throw new Error(`No drawing named "${only}": use one of ${ALL.map((m) => m.KIT.name).join(', ')}`);
  const cols = entries.length === 1 ? 1 : 4;
  const rows = Math.ceil(entries.length / cols);
  const draw = (t: number): void => {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#e9e1cf';
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
      ctx.strokeStyle = '#c0392b';
      ctx.lineWidth = 2;
      const bx = cw * 0.72;
      const by = ch * 0.55;
      ctx.beginPath();
      ctx.moveTo(bx - 8, by);
      ctx.lineTo(bx + 8, by);
      ctx.moveTo(bx, by - 8);
      ctx.lineTo(bx, by + 8);
      ctx.stroke();
      ctx.restore();
    });
    ctx.restore();
  };
  return { loopSeconds: 10, draw, audio: async () => new Blob([], { type: 'audio/wav' }) };
}
