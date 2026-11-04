import { drawOrca, prepare as prepareOrca } from '../foodchain/art/orca';
import { prepare as prepareGreatWhite } from '../foodchain/art/greatWhite';
import { drawCapeFurSeal, prepareSeal } from '../seal/art/capeFurSeal';
import { drawWhite } from '../seal/figures';
import type { Short } from '../short';
import { VIDEO } from '../short';
import { drawPorpoise } from './art/porpoise';
import { drawScientist } from './art/scientist';
import { drawOrcaHead, intoHead, prepareHead } from './art/orcaHead';
import { drawSealFront } from './art/sealFront';

/**
 * A preview of the short's painted animals (`?short=orcastomach&kit`): at
 * t < 1 the great white, the orca and the new harbour porpoise big, one above
 * the other, to judge them side by side; at 1 <= t < 2 the porpoise next to
 * the cape fur seal, and the scientist at both his sizes; at t >= 2 the
 * close-up head round the spotted seal, and the same head shut with a smug
 * half-lid.
 */

function backdrop(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createLinearGradient(0, 0, 0, VIDEO.height);
  g.addColorStop(0, '#2f6d9c');
  g.addColorStop(1, '#0f2f4a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
}

const seal = (x: number, y: number, len: number, beat: number) => ({ x, y, len, rot: 0, face: 1 as const, beat });

function bigThree(ctx: CanvasRenderingContext2D, t: number): void {
  drawWhite(ctx, { x: 560, y: 330, len: 1000, angle: 0, flip: false, jaw: 0.25, worried: 0, tail: t * 6 }, t);
  drawOrca(ctx, 540, 820, 1000, 0, t, { jaw: 0.2, tail: t * 5 });
  drawPorpoise(ctx, seal(520, 1420, 820, t * 5), { fear: 0 }, 0);
}

function smalls(ctx: CanvasRenderingContext2D, t: number): void {
  drawPorpoise(ctx, seal(300, 330, 500, t * 5), { fear: 0 }, 0);
  drawCapeFurSeal(ctx, seal(790, 340, 520, t * 4), { mood: 'plain', gape: 0 }, 0);
  drawScientist(ctx, { x: 540, y: 760, scale: 2.1 }, { mood: 'bemused', gaze: 0, hands: 1, tilt: 0, lid: 0 });
  drawScientist(ctx, { x: 860, y: 1420, scale: 1.12 }, { mood: 'calm', gaze: -0.5, hands: 0, tilt: 0, lid: 0 });
}

function jaws(ctx: CanvasRenderingContext2D, t: number): void {
  const big = { x: 530, y: 640, size: 900, tilt: -0.03, jaw: 0.97, lid: 0 };
  drawOrcaHead(ctx, big);
  ctx.save();
  intoHead(ctx, big);
  drawSealFront(ctx, 44, 132, 1, 0, { beat: t * 11, sweat: 0.7 });
  ctx.restore();
  drawOrcaHead(ctx, { x: 540, y: 1480, size: 520, tilt: 0.05, jaw: 0, lid: 0.6 });
}

export function createOrcastomachKit(ctx: CanvasRenderingContext2D): Short {
  void prepareGreatWhite();
  void prepareOrca();
  prepareSeal();
  prepareHead();
  return {
    loopSeconds: 3,
    draw(seconds) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      backdrop(ctx);
      if (seconds < 1) bigThree(ctx, seconds);
      else if (seconds < 2) smalls(ctx, seconds);
      else jaws(ctx, seconds);
      ctx.restore();
    },
    audio: async () => new Blob(),
  };
}
