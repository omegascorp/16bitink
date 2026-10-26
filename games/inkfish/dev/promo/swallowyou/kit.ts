import { PAPER } from '../../../src/art/pen';
import type { Short } from '../short';
import { drawCroc } from './art/croc';
import { drawDiver, drawWalker, drawYou } from './art/people';
import { drawAnimal, iconOf } from './cast';
import { ANIMALS } from './timeline';

/**
 * A preview page for this video's drawings (`?video=swallowyou&kit`, since
 * longform.ts only registers the video): every animal through the cast's one
 * door beside "you" to scale, its jaws working with time, the stamp card's
 * mouths, the new crocodile big, and the people. `&only=croc` draws one
 * animal full frame.
 */
export function createKit(ctx: CanvasRenderingContext2D, only: string | null): Short {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  const water = (): void => {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#5f97b8');
    g.addColorStop(1, '#1d4c74');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  };
  const draw = (t: number): void => {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    water();
    const gape = 0.5 - 0.5 * Math.cos(t * 1.6);
    if (only) {
      const a = ANIMALS.find((x) => x === only);
      if (!a) throw new Error(`No animal named "${only}"`);
      drawAnimal(ctx, a, { x: 1700, y: 600 }, 1500, 1, t, { gape });
      // Guides: where the snout and the tail tip should be.
      ctx.fillStyle = '#ff2050';
      ctx.fillRect(1699, 0, 3, H);
      ctx.fillRect(199, 0, 3, H);
      ctx.restore();
      return;
    }
    // Two columns of four, each animal 760 px long beside a "you" scaled to it... at a fixed 60 px per foot here.
    ANIMALS.forEach((a, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x0 = 40 + col * 960;
      const y = 140 + row * 250;
      drawYou(ctx, x0 + 40, y + 90, 110, t);
      drawAnimal(ctx, a, { x: x0 + 110, y: y + 30 }, 760, -1, t, { gape });
      ctx.drawImage(iconOf(a), x0 + 760, y - 60, 160, 109);
    });
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, H - 90, W, 90);
    drawYou(ctx, 60, H - 10, 70, t, { arms: 'shrug' });
    drawDiver(ctx, 260, H - 45, 160, 1, t);
    drawWalker(ctx, 420, H - 10, 70, t * 4, t);
    drawCroc(ctx, 1100, H - 50, 600, -1, t, { gape, tail: t * 2, roll: t * 2 });
    ctx.restore();
  };
  return { loopSeconds: 10, draw, audio: async () => new Blob([], { type: 'audio/wav' }) };
}
