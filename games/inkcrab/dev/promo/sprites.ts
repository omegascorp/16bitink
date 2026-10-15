import { CRITTER_FRAME, CRITTER_GROUND, drawCritter } from '../../src/art/critterArt';
import { type CrabColors, drawCrabBack, drawCrabFront, PLAYER_COLORS } from '../../src/art/crabArt';
import { FRAME, GROUND } from '../../src/art/frame';
import { type Draw, makeDraw } from '../../src/art/kit';
import { BOIL, RED } from '../../src/art/palette';
import { makeCanvas } from '../../src/art/pen';
import { drawShell } from '../../src/art/shellArt';
import { SHELL_KINDS, type ShellKind } from '../../src/logic/shells';
import type { SpeciesId } from '../../src/logic/species';

/**
 * The game's own drawings, baked big enough for a 1080 px wide video. Pen
 * strokes are vectors, so a scaled context gives the same drawing with crisp
 * lines, and the same seeds give the same wobble as in the game.
 *
 * The line boils at BOIL_FPS through the game's BOIL frames: a cycle of
 * BOIL / BOIL_FPS = 0.375 s, so a loop must be a multiple of 1.5 s (a whole
 * number of 30 fps frames and of boil cycles).
 */
export const BOIL_FPS = 8;

/** The boil frame at loop time `t`. */
export const boilAt = (t: number): number => Math.floor(t * BOIL_FPS + 1e-9) % BOIL;

export interface Sprite {
  /** One canvas per boil frame, `units`·`res` px square, the drawing's origin at its centre. */
  readonly frames: readonly HTMLCanvasElement[];
  /** The drawing's frame size, in the game's local units. */
  readonly units: number;
  /** Canvas px per local unit. */
  readonly res: number;
  /** Local y of the ground line the drawing stands on (below the centre). */
  readonly ground: number;
}

/** Bakes any of the game's drawings (`draw` gets a Draw for each boil frame), as the game's textures.ts does. */
export function bakeSprite(units: number, res: number, ground: number, seed: number, draw: (d: Draw) => void, ink?: string): Sprite {
  const frames = Array.from({ length: BOIL }, (_, f) => {
    const { canvas, ctx } = makeCanvas(Math.ceil(units * res), Math.ceil(units * res));
    ctx.scale(res, res);
    ctx.translate(units / 2, units / 2);
    draw(makeDraw(ctx, seed + f, f, ground, ink));
    return canvas;
  });
  return { frames, units, res, ground };
}

/** A beach creature from the game (critters/*), facing right; `danger` inks it red, the game's "this one eats you". */
export const critterSprite = (species: SpeciesId, res = 6, danger = false): Sprite =>
  bakeSprite(CRITTER_FRAME, res, CRITTER_GROUND, 800, (d) => drawCritter(d, species), danger ? RED : undefined);

/**
 * The hermit crab: 'back' is the body that sits in the shell, 'front' the head,
 * eyes and claws stepping out of its opening (draw back, then the shell, then
 * front). `naked` is the soft crab out of its shell, inked red as in the game.
 */
export const crabSprite = (part: 'back' | 'front', res = 4, naked = false, colors: CrabColors = PLAYER_COLORS): Sprite =>
  bakeSprite(FRAME, res, GROUND, part === 'back' ? (naked ? 120 : 100) : (naked ? 130 : 110), (d) => (part === 'back' ? drawCrabBack(d, naked, colors) : drawCrabFront(d, naked, colors)), naked ? RED : undefined);

/** A shell from the game, resting on the ground with its opening low on the right. */
export const shellSprite = (kind: ShellKind, res = 4): Sprite =>
  bakeSprite(FRAME, res, GROUND, 300 + SHELL_KINDS.indexOf(kind) * 10, (d) => drawShell(d, kind));

export interface Placement {
  /** Where the drawing's ground point (local x 0, y = ground) lands on screen. */
  readonly x: number;
  readonly y: number;
  /** Screen px per local unit (1 = the game's own size). */
  readonly scale: number;
  /** 1 faces right as drawn, -1 mirrors it. */
  readonly facing?: number;
  /** Radians, about the ground point. */
  readonly rotation?: number;
  readonly alpha?: number;
}

/** Draws a sprite's boil frame `boil` standing at a placement. */
export function drawSprite(ctx: CanvasRenderingContext2D, sprite: Sprite, boil: number, at: Placement): void {
  const frame = sprite.frames[((boil % sprite.frames.length) + sprite.frames.length) % sprite.frames.length]!;
  const alpha = at.alpha ?? 1;
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(at.x, at.y);
  if (at.rotation) ctx.rotate(at.rotation);
  ctx.scale((at.facing ?? 1) * at.scale, at.scale);
  // Canvas px back to local units, origin at the ground point.
  ctx.scale(1 / sprite.res, 1 / sprite.res);
  ctx.drawImage(frame, -(sprite.units / 2) * sprite.res, -(sprite.units / 2 + sprite.ground) * sprite.res);
  ctx.restore();
}
