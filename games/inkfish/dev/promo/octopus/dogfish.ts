import type { Pose } from '../chain';
import { makeSprite, type Sprite } from '../sprites';
import type { Pt } from '../../../src/art/pen';
import { DOGFISH } from './dogfishArt';
import { drawSwimmer, type SwimLook } from './swimmer';

/** The spiny dogfish (dogfishArt.ts draws it) as a sprite that swims, and points on it. */

export { DOGFISH };

export function makeDogfish(res = 5): Sprite {
  return makeSprite('shark', res, 'light', DOGFISH);
}

/** A dogfish in the water: centre (x, y) in screen px, body length in px, facing, tilt (+ nose up), tail beat. */
export interface Swim {
  readonly x: number;
  readonly y: number;
  readonly length: number;
  readonly facing: 1 | -1;
  readonly tilt: number;
  readonly beat: number;
  readonly effort: number;
}

export function drawDogfish(ctx: CanvasRenderingContext2D, sprite: Sprite, s: Swim, boil: number, look: SwimLook = {}): void {
  const pose: Pose = { j: 0, age: 0, shape: 'shark', x: s.x, y: s.y, length: s.length, facing: s.facing, tilt: s.tilt, beat: s.beat, effort: s.effort };
  drawSwimmer(ctx, sprite, pose, boil, look);
}

/** Its nose direction on screen (unit) and the "up" side's normal. */
export function axesOf(s: Swim): { readonly d: Pt; readonly up: Pt } {
  const d = { x: s.facing * Math.cos(s.tilt), y: -Math.sin(s.tilt) };
  const n = { x: d.y, y: -d.x };
  return { d, up: n.y <= 0 ? n : { x: -n.x, y: -n.y } };
}

/** A point on the dogfish: u along it (-1 tail stalk .. 1 nose), v across (-1 belly .. 1 back), screen px. */
export function onDogfish(s: Swim, u: number, v: number): Pt {
  const { d, up } = axesOf(s);
  const half = s.length / 2;
  const h = s.length * (DOGFISH.hh / (2 * DOGFISH.hl)) * 0.92;
  return { x: s.x + d.x * u * half + up.x * v * h, y: s.y + d.y * u * half + up.y * v * h };
}
