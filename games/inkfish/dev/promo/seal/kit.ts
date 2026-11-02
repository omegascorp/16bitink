import { VIDEO, type Short } from '../short';
import { prepare as prepareGreatWhite } from '../foodchain/art/greatWhite';
import { drawBlueShark, drawSeal, drawSharkIcon, drawWhite, prepareFigures } from './figures';
import { makeWater } from './scene';

/**
 * A preview of the short's painted animals (`?short=seal&kit`): at t < 1 the
 * great white, the seal and the blue shark big, one above the other, to judge
 * them side by side; at t >= 1 the seal's moods and the shark's poses at the
 * sizes the short uses (the bite, the icons, the dark shape sinking).
 */

function bigThree(ctx: CanvasRenderingContext2D, t: number): void {
  drawWhite(ctx, { x: 560, y: 360, len: 1000, angle: 0, flip: false, jaw: 0.25, worried: 0, tail: t * 6 }, t);
  drawSeal(ctx, { x: 560, y: 900, len: 760, rot: 0, face: 1, beat: t * 4 }, { mood: 'plain', gape: 0 }, 0);
  drawBlueShark(ctx, { x: 520, y: 1430, len: 920, rot: 0, face: 1, beat: t * 4 }, {}, 0);
}

function variants(ctx: CanvasRenderingContext2D, t: number): void {
  const boil = Math.floor(t * 8) % 3;
  const beat = t * 4;
  const at = (x: number, y: number): { x: number; y: number; len: number; rot: number; face: 1; beat: number } => ({ x, y, len: 330, rot: 0, face: 1, beat });
  drawSeal(ctx, at(290, 230), { mood: 'fierce', gape: 0.65 }, boil);
  drawSeal(ctx, at(820, 230), { mood: 'smug', gape: 0, napkin: true, puff: 0.8 }, boil);
  drawSeal(ctx, at(290, 520), { mood: 'nervous', gape: 0, sweat: 0.8 }, boil);
  drawSeal(ctx, at(820, 520), { mood: 'sly', gape: 0, wave: 0.9, napkin: true }, boil);
  drawBlueShark(ctx, { x: 540, y: 840, len: 700, rot: 0, face: 1, beat }, { fear: 1, bend: 0.25 }, boil);
  drawBlueShark(ctx, { x: 540, y: 1140, len: 700, rot: 0, face: 1, beat: beat + 2 }, { fear: 0.5, bend: -0.15 }, boil);
  for (let n = 0; n < 5; n++) drawSharkIcon(ctx, 150 + n * 195, 1380, 170, boil);
  drawBlueShark(ctx, { x: 280, y: 1660, len: 520, rot: 0.8, face: 1, beat }, { dark: 1 }, boil);
  drawSeal(ctx, { x: 790, y: 1660, len: 420, rot: 0.95, face: 1, beat }, { mood: 'fierce', gape: 0.5 }, boil);
}

export function createSealKit(ctx: CanvasRenderingContext2D): Short {
  const water = makeWater();
  void prepareGreatWhite();
  prepareFigures();
  return {
    loopSeconds: 2,
    draw(seconds) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(water, 0, 0, VIDEO.width, VIDEO.height);
      if (seconds < 1) bigThree(ctx, seconds);
      else variants(ctx, seconds);
      ctx.restore();
    },
    audio: async () => new Blob(),
  };
}
