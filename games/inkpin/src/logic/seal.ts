import { STEPS_PER_SECOND } from './particles';
import { sealBusy, sealStirred, SETTLED_SPEED, type StirWorld } from './settle';
import type { PlateState } from './tomb';

/**
 * When a shut barrier between Nib and the goal ends the level 'sealed' (see
 * World.judge): with every pin out, once the board has come to rest. Two
 * ways to come to rest:
 * - calm: nothing moves for SEAL_STEPS but Nib, the guards' own pacing and
 *   floating (see sealBusy), and at most SEAL_STRAYS stray grains;
 * - a lull, for a board where a few grains churn for good: for LULL_STEPS
 *   no body moves, no plate goes up or down, no door slides, at most
 *   CHURN_STRAYS grains move, and none of them is heading anywhere (its
 *   averaged velocity, see Drift, under SETTLED_SPEED: lava creeping toward
 *   Nib, or a trickle toward a plate, is no lull).
 * A pull or a push starts both over.
 */

/** Steps of calm before 'sealed' (1 s). */
export const SEAL_STEPS = STEPS_PER_SECOND;
/** Steps of a lull before 'sealed' (5 s): longer than a flood takes to reach a plate. */
export const LULL_STEPS = STEPS_PER_SECOND * 5;
/** Grains that may still move in a calm board (water squeezed between a resting boulder and a wall). */
export const SEAL_STRAYS = 6;
/** Grains that may still churn in a lull: a few, never a flood. */
const CHURN_STRAYS = 24;

export class SealWatch {
  /** Steps the board has been calm, and in a lull. */
  calm = 0;
  lull = 0;
  /** The plates that were down last step, one bit each. */
  private down = 0;

  /** A pull or a push: things start moving again. */
  restart(): void {
    this.calm = 0;
    this.lull = 0;
  }

  /** One step's look at the board. `moving`: a body, ruby, ledge or door moved this step. */
  step(moving: boolean, w: StirWorld, plates: readonly PlateState[]): void {
    let down = 0;
    plates.forEach((p, i) => (down |= p.down ? 1 << i : 0));
    const flipped = down !== this.down;
    this.down = down;
    if (moving || flipped || sealBusy(w)) return this.restart();
    let heading = false;
    const strays = w.grains.countFasterThan(SETTLED_SPEED, (i) => {
      if (sealStirred(w, i)) return true;
      if (w.drift.pace(w.grains, i) > SETTLED_SPEED) heading = true;
      return false;
    });
    this.calm = strays > SEAL_STRAYS ? 0 : this.calm + 1;
    this.lull = strays > CHURN_STRAYS || heading ? 0 : this.lull + 1;
  }

  /** True once the board has come to rest: calm for SEAL_STEPS, or in a lull for LULL_STEPS. */
  get due(): boolean {
    return this.calm >= SEAL_STEPS || this.lull >= LULL_STEPS;
  }
}
