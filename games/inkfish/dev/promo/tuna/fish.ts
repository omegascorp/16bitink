import type { FishShape } from '../../../src/art/fishArt';
import { C, heightAt } from '../../../src/art/fish/kit';
import { ANATOMY } from '../../../src/art/fish/registry';
import type { Pose } from '../chain';
import type { Fish } from './story';

/** Fish as drawSwimmer and the suck-in want them, and points along their bodies (where the tag's string is tied). */

export interface Pt {
  readonly x: number;
  readonly y: number;
}

/** A fish in screen space, facing squarely one way. */
export const poseOf = (shape: FishShape, f: Fish): Pose => ({
  j: 0, shape, age: 0, x: f.x, y: f.y, length: f.len, facing: f.face, tilt: f.tilt, beat: f.beat, effort: f.effort,
});

/**
 * A point of the drawing (texture px, fish facing right) on screen, bent
 * with the tail as drawSwimmer bends it, then tilted and turned with the fish.
 */
function texToScreen(shape: FishShape, f: Fish, tx: number, ty: number): Pt {
  const a = ANATOMY[shape];
  const k = f.len / (2 * a.hl);
  const along = (C + a.hl - tx) / (2 * a.hl);
  const bend = Math.max(0, (along - 0.3) / 0.7);
  const dy = a.hh * (0.12 + 0.14 * f.effort) * bend * bend * Math.sin(f.beat - 2.4 * along);
  const lx = (tx - C) * k;
  const ly = (ty - C + dy) * k;
  const c = Math.cos(-f.tilt);
  const s = Math.sin(-f.tilt);
  return { x: f.x + f.face * (lx * c - ly * s), y: f.y + lx * s + ly * c };
}

/** A point on its body: `along` 0 nose .. 1 tail stalk, `side` -1 on its back .. 1 on its belly. */
export function bodyPoint(shape: FishShape, f: Fish, along: number, side: number): Pt {
  const a = ANATOMY[shape];
  return texToScreen(shape, f, C + a.hl - 2 * a.hl * along, C + side * heightAt(a, along));
}
