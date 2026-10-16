import { heightAt } from '../../../src/art/fish/kit';
import { ANATOMY } from '../../../src/art/fish/registry';
import type { Pt } from '../../../src/art/pen';
import type { Pose } from '../chain';
import type { Fish } from './story';

/** The tuna as drawSwimmer wants it, and points on its body (its gills, where the ring sits). */

const TUNA = ANATOMY.tuna;

/** The tuna in screen space, facing right. */
export const poseOf = (f: Fish): Pose => ({
  j: 0, shape: 'tuna', age: 0, x: f.x, y: f.y, length: f.len, facing: 1, tilt: f.tilt, beat: f.beat, effort: f.effort,
});

/**
 * A point on its body: `along` 0 nose .. 1 tail stalk, `side` -1 on its
 * back .. 1 on its belly, bent with the tail as drawSwimmer bends it and
 * tilted with the fish.
 */
export function bodyPoint(f: Fish, along: number, side: number): Pt {
  const k = f.len / (2 * TUNA.hl);
  const bend = Math.max(0, (along - 0.3) / 0.7);
  const dy = TUNA.hh * (0.12 + 0.14 * f.effort) * bend * bend * Math.sin(f.beat - 2.4 * along);
  const lx = (TUNA.hl - 2 * TUNA.hl * along) * k;
  const ly = (side * heightAt(TUNA, along) + dy) * k;
  const c = Math.cos(-f.tilt);
  const s = Math.sin(-f.tilt);
  return { x: f.x + lx * c - ly * s, y: f.y + lx * s + ly * c };
}

/** Its body's half height at `along`, screen px. */
export const halfHeight = (f: Fish, along: number): number => heightAt(TUNA, along) * (f.len / (2 * TUNA.hl));

/** Where its gill cover's back edge is (the game draws it at 0.27 of the way along). */
export const GILL = 0.27;
