import { makeDraw, type Draw } from '../../src/art/kit';
import { BOIL } from '../../src/art/palette';
import { render, type Finish } from '../../src/art/textures';

/**
 * The game's own drawings, baked big enough for a 1080 px wide video. Pen
 * strokes are vectors, so a bigger `res` gives the same drawing with crisp
 * lines, and the same seeds give the same wobble as in the game.
 *
 * The line boils at BOIL_FPS through the game's BOIL frames: a cycle of
 * BOIL / BOIL_FPS = 0.375 s, so a loop must be a multiple of 1.5 s (a whole
 * number of 30 fps frames and of boil cycles).
 */
export const BOIL_FPS = 8;

/** The boil frame at loop time `t`. */
export const boilAt = (t: number): number => Math.floor(t * BOIL_FPS + 1e-9) % BOIL;

/** Where a drawing sits in its frame, in the game's units: `w`×`h`, its origin at `ox`, `oy` (as each art file's *_ART constant). */
export interface Frame {
  readonly w: number;
  readonly h: number;
  readonly ox: number;
  readonly oy: number;
}

export interface Sprite {
  /** One canvas per boil frame. */
  readonly frames: readonly HTMLCanvasElement[];
  readonly frame: Frame;
  /** Canvas px per unit. */
  readonly res: number;
}

/**
 * Bakes any of the game's drawings once per boil frame, as the game's
 * textures.ts does: `draw` gets a Draw for that frame, and a `finish` adds
 * the game's rim light and ink silhouette.
 */
export function bakeSprite(frame: Frame, res: number, seed: number, draw: (d: Draw) => void, finish?: Finish, ink?: string): Sprite {
  const frames = Array.from({ length: BOIL }, (_, f) =>
    render(frame.w, frame.h, frame.ox, frame.oy, res, (ctx) => draw(makeDraw(ctx, seed + f, f, 0, ink)), finish));
  return { frames, frame, res };
}

export interface Placement {
  /** Where the drawing's origin lands on screen. */
  readonly x: number;
  readonly y: number;
  /** Screen px per unit (1 = the game's own size at 1x). */
  readonly scale: number;
  /** 1 faces as drawn, -1 mirrors it. */
  readonly facing?: number;
  /** Radians, about the origin. */
  readonly rotation?: number;
  readonly alpha?: number;
}

/** Draws a sprite's boil frame `boil` at a placement. */
export function drawSprite(ctx: CanvasRenderingContext2D, sprite: Sprite, boil: number, at: Placement): void {
  const n = sprite.frames.length;
  const canvas = sprite.frames[((boil % n) + n) % n]!;
  const alpha = at.alpha ?? 1;
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(at.x, at.y);
  if (at.rotation) ctx.rotate(at.rotation);
  ctx.scale((at.facing ?? 1) * at.scale, at.scale);
  ctx.scale(1 / sprite.res, 1 / sprite.res);
  ctx.drawImage(canvas, -sprite.frame.ox * sprite.res, -sprite.frame.oy * sprite.res);
  ctx.restore();
}
