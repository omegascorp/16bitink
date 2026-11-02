import type { Boulder } from './boulders';
import type { Blot } from './guards';
import { FOOTING_STEPS } from './creatures';
import { gasRound, PUFF_GAS } from './frog';
import { COIN, GAS, GRAIN_R, LAVA, type Grains } from './particles';
import { inPlay, RUBY_R, type Ruby } from './rubies';

/**
 * The settle check's leave-outs (what the bot waits for: see World.judge).
 * Grains jiggling in place, by a ruby in play or a raft, or lava by a live
 * guard, move for good without going anywhere.
 */

/** The world counts as settled once nothing moves faster than this (px per step). */
export const SETTLED_SPEED = 0.35;
/**
 * Grains this close (px) to a resting ruby's edge, or lava this close to a
 * live guard's, jiggle for good (the ruby shoves them, a salamander wades):
 * the settle check leaves them out.
 */
const STIR_REACH = GRAIN_R * 4;
/** A salamander wading stirs its lava pool this far (px) past its edge. */
const WADE_REACH = 100;
/**
 * A grain slower than JIGGLE_MAX whose velocity, averaged with this keep per
 * step (about 10 steps), stays under DRIFT_SPEED is shaking in place (a deep
 * tank's pressure), not flowing: the settle check leaves it out too.
 */
const DRIFT_KEEP = 0.9;
const DRIFT_SPEED = SETTLED_SPEED * 0.5;
const JIGGLE_MAX = 1;

/** Each grain's averaged velocity, by grain id (see DRIFT_KEEP). */
export class Drift {
  private x = new Float64Array(0);
  private y = new Float64Array(0);

  track(g: Grains): void {
    if (this.x.length < g.capacity) {
      this.x = new Float64Array(Math.max(g.capacity, 1024));
      this.y = new Float64Array(Math.max(g.capacity, 1024));
    }
    for (let i = 0; i < g.count; i++) {
      const id = g.id[i]!;
      if (id >= this.x.length) continue;
      this.x[id] = this.x[id]! * DRIFT_KEEP + g.vx[i]! * (1 - DRIFT_KEEP);
      this.y[id] = this.y[id]! * DRIFT_KEEP + g.vy[i]! * (1 - DRIFT_KEEP);
    }
  }

  /** Grain i's averaged speed (px per step): how fast it is going somewhere, its shaking left out. */
  pace(g: Grains, i: number): number {
    const id = g.id[i]!;
    return id < this.x.length ? Math.hypot(this.x[id]!, this.y[id]!) : 0;
  }

  /** True when grain i is shaking in place: slow now, and its averaged velocity slower still. */
  jiggles(g: Grains, i: number): boolean {
    const id = g.id[i]!;
    return id < this.x.length && Math.hypot(g.vx[i]!, g.vy[i]!) < JIGGLE_MAX && Math.hypot(this.x[id]!, this.y[id]!) < DRIFT_SPEED;
  }
}

/** What the leave-outs look at. */
export interface StirWorld {
  readonly grains: Grains;
  readonly drift: Drift;
  readonly rubies: readonly Ruby[];
  readonly boulders: readonly Boulder[];
  readonly blots: readonly Blot[];
}

/** A moving grain the settle check leaves out: jiggling in place, by a ruby in play or a raft, or lava by a live guard (see STIR_REACH). */
export function stirred(w: StirWorld, i: number): boolean {
  const g = w.grains;
  const x = g.x[i]!;
  const y = g.y[i]!;
  if (w.drift.jiggles(g, i)) return true;
  for (const r of w.rubies) if (inPlay(r) && Math.hypot(x - r.x, y - r.y) < RUBY_R + STIR_REACH) return true;
  if (g.kind[i] === COIN) return false;
  for (const b of w.boulders) if (b.raft && !b.gone && Math.abs(x - b.x) < b.hw + STIR_REACH && Math.abs(y - b.y) < b.hh + STIR_REACH) return true;
  if (g.kind[i] !== LAVA) return false;
  for (const b of w.blots) if (!b.gone && Math.hypot(x - b.x, y - b.y) < b.r + WADE_REACH) return true;
  return false;
}

/**
 * A gas grain whose averaged speed (see Drift) is over this (px per step,
 * 72 px/s) is going somewhere: rising, or at the front of a pool creeping
 * along a roof. A deep, pressed mass of gas (a well under its lid) churns
 * slower than this for good.
 */
export const GAS_FLOW = 0.6;

/**
 * Tomb things still about to happen (chapter 3), which the stray allowance
 * would miss: any gas burning, any gas grain still flowing (GAS_FLOW: the few
 * grains at the front of a pool creeping along a roof are all the pool's
 * movement), and a rain frog puffed (floating, drifting or waiting to drop),
 * falling, or in water washing away. The earlier chapters have no gas or frogs.
 */
export function tombBusy(w: StirWorld): boolean {
  for (const b of w.blots) if (b.animal === 'frog' && !b.gone && (b.puffed || b.air > FOOTING_STEPS || b.wet > 0)) return true;
  return gasBusy(w);
}

/** Any gas burning, or any gas grain still flowing (see GAS_FLOW). */
function gasBusy(w: StirWorld): boolean {
  const g = w.grains;
  const s2 = SETTLED_SPEED * SETTLED_SPEED;
  for (let i = 0; i < g.count; i++) {
    if (g.kind[i] !== GAS) continue;
    if (g.burn[i]! > 0) return true;
    if (g.vx[i]! * g.vx[i]! + g.vy[i]! * g.vy[i]! > s2 && w.drift.pace(g, i) > GAS_FLOW) return true;
  }
  return false;
}

/**
 * The 'sealed' loss's version of tombBusy (see seal.ts): a live guard's own
 * motion never counts, only a body on its way somewhere. Busy: any guard
 * (the boss aside) falling, or in water washing away (it may land on, or
 * leave, a plate); a puffed frog adrift (moving, or its gas thinning: it is
 * about to drop); and gas burning or flowing. A guard pacing, or a frog
 * floating still in gas that stays, is calm.
 */
export function sealBusy(w: StirWorld): boolean {
  for (const b of w.blots) {
    if (b.gone || b.boss) continue;
    if (b.puffed ? adrift(b, w) : b.air > FOOTING_STEPS || b.wet > 0) return true;
  }
  return gasBusy(w);
}

/** A puffed frog drifting, or with too little gas round it to stay up for good. */
function adrift(b: Blot, w: StirWorld): boolean {
  return b.thin > 0 || Math.hypot(b.vx, b.vy) > SETTLED_SPEED || gasRound(b, w.grains) < PUFF_GAS;
}

/**
 * A moving grain the 'sealed' check leaves out: one the settle check leaves
 * out (see stirred), or one a live guard on its feet or afloat shoves as it
 * goes (within STIR_REACH of its edge): a frog pacing its puddle churns it
 * for good.
 */
export function sealStirred(w: StirWorld, i: number): boolean {
  if (stirred(w, i)) return true;
  const g = w.grains;
  if (g.kind[i] === COIN) return false;
  const x = g.x[i]!;
  const y = g.y[i]!;
  // Afloat counts too: the boss bobbing in a pool it never washes in (filled slowly) churns it for good.
  for (const b of w.blots) if (!b.gone && (b.puffed || b.air <= FOOTING_STEPS || b.wet > 0) && Math.hypot(x - b.x, y - b.y) < b.r + STIR_REACH) return true;
  return false;
}
