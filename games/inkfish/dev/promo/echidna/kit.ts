import { prepare as prepareGreatWhite } from '../foodchain/art/greatWhite';
import { drawWhite } from '../seal/figures';
import type { Short } from '../short';
import { VIDEO } from '../short';
import { drawEchidna } from './art/echidna';
import { drawTigerShark, prepareTiger } from './art/tigerShark';

/**
 * A preview of the short's painted animals (`?short=echidna&kit`): at t < 1
 * the great white, the tiger shark and the echidna big, one above the other,
 * to judge them side by side; at t >= 1 the shark's moods (jaws open with an
 * echidna in them, a half-lid, the tag) and the echidna's (bristled, sad).
 */

function backdrop(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createLinearGradient(0, 0, 0, VIDEO.height);
  g.addColorStop(0, '#5fc6c8');
  g.addColorStop(1, '#0f4a56');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIDEO.width, VIDEO.height);
}

function bigThree(ctx: CanvasRenderingContext2D, t: number): void {
  drawWhite(ctx, { x: 560, y: 300, len: 1000, angle: 0, flip: false, jaw: 0.25, worried: 0, tail: t * 6 }, t);
  drawTigerShark(ctx, { x: 540, y: 820, len: 960, rot: 0, face: 1, beat: t * 4 }, { gape: 0.5 }, 0);
  drawEchidna(ctx, { x: 340, y: 1400, len: 600, rot: 0, face: 1, beat: t * 3 }, {}, 0);
}

function variants(ctx: CanvasRenderingContext2D, t: number): void {
  const boil = Math.floor(t * 8) % 3;
  const beat = t * 4;
  const at = (x: number, y: number, len = 520) => ({ x, y, len, rot: 0, face: 1 as const, beat });
  drawTigerShark(ctx, at(180, 330, 1500), { gape: 1, fear: 0.6, inMouth: (c) => drawEchidna(c, { x: 150, y: 26, len: 34, rot: 0.25, face: -1, beat }, { bristle: 1 }, boil) }, boil);
  drawTigerShark(ctx, at(540, 760, 900), { lid: 0.55, tag: 1 }, boil);
  drawTigerShark(ctx, at(540, 1040, 700), { lid: 0.9, bend: 0.2 }, boil);
  drawEchidna(ctx, at(160, 1300, 500), { bristle: 1 }, boil);
  drawEchidna(ctx, { x: 160, y: 1560, len: 500, rot: 0, face: 1, beat: 0 }, { sad: 1 }, boil);
  drawEchidna(ctx, { x: 700, y: 1500, len: 260, rot: -0.4, face: -1, beat }, {}, boil);
}

export function createEchidnaKit(ctx: CanvasRenderingContext2D): Short {
  void prepareGreatWhite();
  prepareTiger();
  return {
    loopSeconds: 2,
    draw(seconds) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      backdrop(ctx);
      if (seconds < 1) bigThree(ctx, seconds);
      else variants(ctx, seconds);
      ctx.restore();
    },
    audio: async () => new Blob(),
  };
}
