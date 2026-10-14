import { drawBarreleye } from '../barreleye/fish';
import { EYES_FORWARD, EYES_UP } from '../barreleye/story';

/**
 * The barreleye from its own short (barreleye/fish.ts): the clear shield over
 * its head, and the two green-lensed eyes inside it that turn on their
 * pivots, from looking ahead to looking straight up through the forehead.
 * The game's sprite has none of that, and the narration is about it.
 */

/** Its drawing, snout to tail fork, in its own px. */
const DRAWN_LENGTH = 870;

export interface BarreleyeLook {
  /** Body centre on screen, px. */
  readonly x: number;
  readonly y: number;
  /** Snout to tail, px. */
  readonly length: number;
  readonly facing: 1 | -1;
  /** Nose up is positive (as for every other fish in the video), radians. */
  readonly tilt: number;
  /** 0 looking ahead .. 1 looking straight up. */
  readonly eyesUp: number;
  /** Fin phase, and 0 hovering .. 1 swimming hard. */
  readonly beat: number;
  readonly effort: number;
  readonly alpha: number;
}

export function drawBarreleyeAt(ctx: CanvasRenderingContext2D, b: BarreleyeLook, boil: number): void {
  if (b.alpha <= 0) return;
  const scale = b.length / DRAWN_LENGTH;
  ctx.save();
  ctx.globalAlpha *= b.alpha;
  ctx.translate(b.x, b.y);
  ctx.scale(b.facing, 1);
  ctx.rotate(-b.tilt);
  ctx.scale(scale, scale);
  drawBarreleye(ctx, {
    x: 0, y: 0, tilt: 0,
    eyes: EYES_FORWARD + (EYES_UP - EYES_FORWARD) * b.eyesUp,
    fin: b.beat, effort: b.effort, glow: 1, bite: -1,
  }, boil, { lit: 0, gleam: -1 });
  ctx.restore();
}
