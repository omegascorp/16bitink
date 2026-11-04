import { prepare as prepareGreatWhite } from '../foodchain/art/greatWhite';
import { drawWhite } from '../seal/figures';
import type { Short } from '../short';
import { VIDEO } from '../short';
import { drawAlvin } from './art/alvin';
import { drawBow } from './art/bow';
import { CREW, drawCrew } from './art/faces';
import { drawSwordfish } from './art/swordfish';
import { crewPorts } from './art/crewPort';

/**
 * A preview of the short's painted subjects (`?short=alvin&kit`): at t < 1 the
 * great white, the swordfish and Alvin big, one above the other, to judge them
 * side by side; at t >= 1 the crew's looks (calm, gasp, grin) and the swordfish's
 * moods (alarmed, squinting at its sword); at t >= 1.5 the Titanic's bow.
 */

function backdrop(ctx: CanvasRenderingContext2D, deep: boolean): void {
  const g = ctx.createLinearGradient(0, 0, 0, VIDEO.height);
  g.addColorStop(0, deep ? '#0b3358' : '#2f86b0');
  g.addColorStop(1, deep ? '#031020' : '#0c4a6c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
}

function bigThree(ctx: CanvasRenderingContext2D, t: number): void {
  drawWhite(ctx, { x: 560, y: 250, len: 1000, angle: 0, flip: false, jaw: 0.25, worried: 0, tail: t * 6 }, t);
  drawSwordfish(ctx, { tip: { x: 980, y: 760 }, len: 900, a: 0, yaw: 0, roll: 0.1, persp: 200 }, { bend: 0.15 * Math.sin(t * 5), tail: 0.2 * Math.sin(t * 7) }, 0);
  drawAlvin(ctx, { x: 500, y: 1400, len: 860, rot: 0 }, { lit: 1, beams: 0.6, prop: t * 8, name: 1, port: crewPorts([{ shock: 0, joy: 0.2 }, { shock: 0, joy: 0.2 }, { shock: 0, joy: 0.2 }]) }, 0);
}

function variants(ctx: CanvasRenderingContext2D, t: number): void {
  if (t >= 1.5) {
    drawBow(ctx, { light: 1, reveal: 1 }, 0);
    return;
  }
  CREW.forEach((who, i) => drawCrew(ctx, who, 190 + i * 350, 250, 130, i === 0 ? { shock: 0, joy: 0 } : i === 1 ? { shock: 1, joy: 0 } : { shock: 0, joy: 1 }));
  const at = (y: number) => ({ tip: { x: 960, y }, len: 780, a: 0, yaw: 0.2, roll: 0.3, persp: 200 });
  drawSwordfish(ctx, at(1000), { bend: 0.2, tail: 0.2, wide: 1 }, 0);
  drawSwordfish(ctx, at(1500), { bend: -0.1, tail: 0, cross: 1 }, 1);
}

export function createAlvinKit(ctx: CanvasRenderingContext2D): Short {
  void prepareGreatWhite();
  return {
    loopSeconds: 2,
    draw(seconds) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      backdrop(ctx, seconds >= 1);
      if (seconds < 1) bigThree(ctx, seconds);
      else variants(ctx, seconds);
      ctx.restore();
    },
    audio: async () => new Blob(),
  };
}
