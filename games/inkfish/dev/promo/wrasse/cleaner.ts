import { C, heightAt, type Anatomy, type Kit } from '../../../src/art/fish/kit';
import { ANATOMY } from '../../../src/art/fish/registry';
import type { Pt } from '../../../src/art/pen';
import type { Pose } from '../chain';
import { makeSprite, type Sprite } from '../sprites';

/**
 * The bluestreak cleaner wrasse (Labroides dimidiatus), drawn as a variant of
 * the game's `wrasse`: the same body (so the swimmer's mouth and bend fit it),
 * recoloured from the game's green-and-magenta wrasse to a cleaner's pale
 * blue body with a black stripe from the snout, through the eye, to the tail,
 * widening as it goes, and a brighter blue back half.
 */

const BASE = ANATOMY.wrasse;
const STRIPE = '#15161d';
const BLUE = '#3f86d6';

function stripeAt(k: Kit, t: number): number {
  return k.h(t) * (0.16 + 0.34 * t);
}

function cleanerExtras(k: Kit): void {
  // A pale blue wash all over, brighter blue towards the tail.
  k.pen.fill(k.body, '#9cc8ef', 0.3);
  k.pen.clipped(k.body, () => {
    const back: Pt[] = [];
    for (let t = 0.45; t <= 1.001; t += 0.02) back.push({ x: k.x(t), y: C - k.h(t) * 1.2 });
    for (let t = 1; t >= 0.45; t -= 0.02) back.push({ x: k.x(t), y: C + k.h(t) * 1.2 });
    k.pen.fill(back, BLUE, 0.28);
    // The black stripe, snout to tail stalk, widening backwards.
    const top: Pt[] = [];
    const bottom: Pt[] = [];
    for (let t = 0; t <= 1.001; t += 0.02) {
      top.push({ x: k.x(t), y: C - 1 - stripeAt(k, t) });
      bottom.push({ x: k.x(t), y: C - 1 + stripeAt(k, t) });
    }
    k.pen.fill([...top, ...bottom.reverse()], STRIPE, 0.88);
  });
  // The stripe runs on into the tail fin.
  const x1 = k.x(1);
  const w = stripeAt(k, 1);
  k.pen.fill([{ x: x1 + 2, y: C - 1 - w }, { x: x1 - 18, y: C - 1 - w * 1.1 }, { x: x1 - 18, y: C - 1 + w * 1.1 }, { x: x1 + 2, y: C - 1 + w }], STRIPE, 0.75);
}

export const CLEANER: Anatomy = { ...BASE, wash: '#6aa9e4', finWash: '#4d8fd8', extras: cleanerExtras };

/** The cleaner wrasse's sprite (`res` sprite px per texture px). */
export const makeCleaner = (res: number): Sprite => makeSprite('wrasse', res, 'light', CLEANER);

/** A fish on screen. `face` runs -1 (left) .. 1 (right), through 0 as it turns. */
export interface Fish {
  readonly x: number;
  readonly y: number;
  readonly len: number;
  readonly face: number;
  /** Nose up, radians. */
  readonly tilt: number;
  readonly beat: number;
  readonly effort: number;
}

/** A fish as drawSwimmer wants it, at the origin facing right: the caller turns it by `face`. */
export const poseOf = (f: Fish): Pose => ({
  j: 0, shape: 'wrasse', age: 0, x: 0, y: 0, length: f.len, facing: 1, tilt: f.tilt, beat: f.beat, effort: f.effort,
});

/**
 * A point of the drawing (texture px, fish facing right) on screen, bent
 * with the tail as drawSwimmer bends it, then tilted and turned with the fish.
 */
export function texToScreen(f: Fish, tx: number, ty: number): Pt {
  const k = f.len / (2 * CLEANER.hl);
  const along = (C + CLEANER.hl - tx) / (2 * CLEANER.hl);
  const bend = Math.max(0, (along - 0.3) / 0.7);
  const dy = CLEANER.hh * (0.12 + 0.14 * f.effort) * bend * bend * Math.sin(f.beat - 2.4 * along);
  const lx = (tx - C) * k;
  const ly = (ty - C + dy) * k;
  const c = Math.cos(-f.tilt);
  const s = Math.sin(-f.tilt);
  return { x: f.x + f.face * (lx * c - ly * s), y: f.y + lx * s + ly * c };
}

/** A point on its body: `along` 0 nose .. 1 tail stalk, `side` -1 on its back .. 1 on its belly. */
export function bodyPoint(f: Fish, along: number, side: number): Pt {
  return texToScreen(f, C + CLEANER.hl - 2 * CLEANER.hl * along, C + side * heightAt(CLEANER, along));
}

/** Where the brown mark sits: under the throat, just behind the mouth. */
export const THROAT = { along: 0.17, side: 0.78 } as const;
export const throatOf = (f: Fish): Pt => bodyPoint(f, THROAT.along, THROAT.side);
/** The eye, for sight lines. */
export const eyeOf = (f: Fish): Pt => bodyPoint(f, BASE.eye.t, -0.3);
