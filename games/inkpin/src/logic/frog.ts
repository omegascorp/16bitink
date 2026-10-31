import { capsuleContact, type Contact, type Seg } from './geom';
import type { Blot } from './guards';
import { GAS, type Grains } from './particles';

/**
 * The rain frog (chapter 3): a guard with a boar's rules that puffs up round
 * in gas. Puffed, it stops walking and floats up on the gas (held under
 * ceilings, pins, ledges and doors), drifting with it. With the gas gone
 * from round it for DROP_STEPS, it goes flat and falls like any creature.
 */

/** Gas grains within its radius plus PUFF_REACH that puff it up, and fewer than THIN that let it go flat. */
export const PUFF_GAS = 6;
const PUFF_REACH = 8;
const THIN = 2;
export const DROP_STEPS = 30;
/** Fastest it floats up (px per step), and how quickly it gets there. */
export const FROG_RISE = 0.8;
const RISE_EASE = 0.08;
/** It drifts with the mean sideways speed of the gas this close to it. */
const DRIFT_REACH = 40;

export type FrogEvent = { readonly type: 'frogPuff'; readonly x: number; readonly y: number } | { readonly type: 'frogDrop'; readonly x: number; readonly y: number };

/**
 * One step of a frog's puff: it puffs up in gas and floats, or goes flat.
 * Returns true while it floats (the world doesn't walk it this step).
 */
export function stepFrog(b: Blot, g: Grains, segs: readonly Seg[], k: Contact, events: FrogEvent[]): boolean {
  if (b.animal !== 'frog' || b.gone) return false;
  let near = 0;
  g.near(b.x, b.y, b.r + PUFF_REACH, (i) => {
    if (g.kind[i] === GAS) near++;
  });
  if (!b.puffed) {
    if (near < PUFF_GAS) return false;
    b.puffed = true;
    b.thin = 0;
    events.push({ type: 'frogPuff', x: b.x, y: b.y });
  } else if (near < THIN) {
    if (++b.thin >= DROP_STEPS) {
      b.puffed = false;
      b.thin = 0;
      b.vy = 0;
      b.air = 1;
      events.push({ type: 'frogDrop', x: b.x, y: b.y });
      return false;
    }
  } else b.thin = 0;
  let flow = 0;
  let n = 0;
  g.near(b.x, b.y, DRIFT_REACH, (i) => {
    if (g.kind[i] !== GAS) return;
    flow += g.vx[i]!;
    n++;
  });
  b.vx = n ? flow / n : b.vx * 0.9;
  b.vy += (-FROG_RISE - b.vy) * RISE_EASE;
  b.x += b.vx;
  b.y += b.vy;
  b.wet = 0;
  for (let pass = 0; pass < 2; pass++) {
    for (const s of segs) {
      if (!capsuleContact(s, b.x, b.y, b.r, k)) continue;
      b.x += k.nx * k.depth;
      b.y += k.ny * k.depth;
      const vn = b.vx * k.nx + b.vy * k.ny;
      if (vn < 0) {
        b.vx -= vn * k.nx;
        b.vy -= vn * k.ny;
      }
    }
  }
  b.air++;
  b.grounded = false;
  return true;
}
