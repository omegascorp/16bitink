import type { Anatomy } from '../../../../src/art/fish/kit';
import { ANATOMY } from '../../../../src/art/fish/registry';
import { FISH_TEX } from '../../../../src/art/fishArt';
import { BOIL_FPS } from '../../../../src/art/textures';
import type { Short } from '../../short';
import { makeSprite } from '../../sprites';
import * as art from './anatomy';
import { COCOON, makeCocoon } from './cocoon';

/**
 * A preview page for the survival video's new fish (`?video=survival-art`):
 * every one big (as on a contestant card) and at a quarter of that, beside
 * the game's goby and cod for scale and style, on tank-blue water.
 * `&only=RIVULUS` draws one at the line-up's size (2/3 of the frame wide).
 */

interface Entry {
  readonly name: string;
  readonly hl: number;
  readonly frames: (res: number) => readonly HTMLCanvasElement[];
}

const fish = (name: string, a: Anatomy): Entry => ({ name, hl: a.hl, frames: (res) => makeSprite('goby', res, 'light', a).frames });

const ENTRIES: readonly Entry[] = [
  fish('RIVULUS', art.RIVULUS),
  fish('MUDSKIPPER', art.MUDSKIPPER),
  fish('GIANT_MUDSKIPPER', art.GIANT_MUDSKIPPER),
  fish('PUPFISH', art.PUPFISH),
  fish('ICEFISH', art.ICEFISH),
  fish('SALMON', art.SALMON),
  fish('SAILFISH', art.SAILFISH),
  fish('NURSE_SHARK', art.NURSE_SHARK),
  fish('LUNGFISH', art.LUNGFISH),
  { name: 'cocoon', hl: COCOON.hl, frames: (res) => makeCocoon(res).frames },
  fish('goby (game)', ANATOMY.goby),
  fish('cod (game)', ANATOMY.cod),
];

function water(ctx: CanvasRenderingContext2D, W: number, H: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#4aa3d8');
  g.addColorStop(1, '#1d5f96');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

export async function createSurvivalArt(ctx: CanvasRenderingContext2D, only: string | null): Promise<Short> {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  const picked = only ? ENTRIES.filter((e) => e.name === only) : ENTRIES;
  if (picked.length === 0) throw new Error(`No fish named "${only}": use one of ${ENTRIES.map((e) => e.name).join(', ')}`);
  const res = only ? 8 : 2;
  const sprites = picked.map((e) => ({ e, frames: e.frames(res) }));
  const cols = only ? 1 : 3;
  const rows = Math.ceil(picked.length / cols);
  const cw = W / cols;
  const ch = H / rows;
  const draw = (t: number): void => {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    water(ctx, W, H);
    const f = Math.floor(t * BOIL_FPS);
    sprites.forEach(({ e, frames }, i) => {
      const frame = frames[f % frames.length]!;
      const x0 = (i % cols) * cw;
      const y0 = Math.floor(i / cols) * ch;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x0, y0, cw, ch);
      ctx.clip();
      // Big: the texture square (whose body is 2*hl of 256) sized so the body is `body` px long.
      const body = only ? W * 0.6 : 250;
      const side = (body / (2 * e.hl)) * FISH_TEX;
      const cx = x0 + (only ? cw * 0.46 : cw * 0.4);
      const cy = y0 + ch / 2;
      ctx.drawImage(frame, cx - side / 2, cy - side / 2, side, side);
      const q = side / 4;
      const qx = only ? x0 + cw * 0.88 : x0 + cw * 0.86;
      ctx.drawImage(frame, qx - q / 2, cy + (only ? ch * 0.3 : ch * 0.18) - q / 2, q, q);
      ctx.fillStyle = '#ffffff';
      ctx.font = '600 20px sans-serif';
      ctx.fillText(`${e.name}  hl ${e.hl}`, x0 + 12, y0 + 26);
      ctx.restore();
    });
    ctx.restore();
  };
  return { loopSeconds: 10, draw, audio: async () => new Blob([], { type: 'audio/wav' }) };
}
