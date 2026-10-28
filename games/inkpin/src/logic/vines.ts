import { LAVA, WATER, type Grains } from './particles';
import type { VineDef } from './level';

/**
 * Vines as they are now: a seed drinks the water that reaches it and grows
 * up to its ledge; lava touching any part of a vine burns it away.
 */

/** Water grains a seed drinks before it sprouts. */
export const SEED_THIRST = 12;
/** Steps a sprouted seed takes to grow to its full height (1.5 s). */
export const GROW_STEPS = 180;
/** How far around a seed it drinks from (px). */
const DRINK_R = 24;
/** Lava this close to a vine burns it (px). */
const BURN_REACH = 12;
/** A vine is climbable once it has grown this tall (px). */
const CLIMBABLE = 40;

export interface Vine {
  readonly def: VineDef;
  readonly x: number;
  readonly bottom: number;
  /** Its upper end now: the ledge once grown, its foot while a seed. */
  top: number;
  /** 0 = a seed, 1 = grown. */
  grown: number;
  /** Water drunk so far, towards SEED_THIRST. */
  drunk: number;
  burnt: boolean;
}

export type VineSave = Pick<Vine, 'top' | 'grown' | 'drunk' | 'burnt'>;

/** Where vine events go: the world's event list. */
type Sink = { push(...e: VineEvent[]): number };

export type VineEvent = { readonly type: 'sprout'; readonly x: number; readonly y: number } | { readonly type: 'vineBurnt'; readonly x: number; readonly y: number };

export function vine(def: VineDef): Vine {
  const grown = def.seed ? 0 : 1;
  return { def, x: def.x, bottom: def.bottom, top: def.seed ? def.bottom : def.top, grown, drunk: 0, burnt: false };
}

/** True when Nib can climb it: not burnt, and grown tall enough to hold. */
export function climbable(v: Vine): boolean {
  return !v.burnt && v.bottom - v.top >= CLIMBABLE;
}

/** One step: the seed drinks or grows; lava burns. */
export function stepVine(v: Vine, g: Grains, events: Sink): void {
  if (v.burnt) return;
  if (v.grown < 1) grow(v, g, events);
  if (touchesLava(v, g)) {
    v.burnt = true;
    events.push({ type: 'vineBurnt', x: v.x, y: (v.top + v.bottom) / 2 });
  }
}

function grow(v: Vine, g: Grains, events: Sink): void {
  if (v.drunk < SEED_THIRST) {
    g.near(v.x, v.bottom - 8, DRINK_R, (i) => {
      if (g.kind[i] !== WATER || v.drunk >= SEED_THIRST) return;
      g.remove(i);
      v.drunk++;
    });
    if (v.drunk >= SEED_THIRST) events.push({ type: 'sprout', x: v.x, y: v.bottom });
    return;
  }
  v.grown = Math.min(1, v.grown + 1 / GROW_STEPS);
  v.top = v.bottom - (v.def.bottom - v.def.top) * v.grown;
}

function touchesLava(v: Vine, g: Grains): boolean {
  let hit = false;
  for (let y = v.bottom - 6; y >= v.top - 20 && !hit; y -= BURN_REACH) {
    g.near(v.x, y, BURN_REACH, (i) => {
      if (g.kind[i] === LAVA) hit = true;
    });
  }
  return hit;
}

export function saveVine(v: Vine): VineSave {
  return { top: v.top, grown: v.grown, drunk: v.drunk, burnt: v.burnt };
}

export function loadVine(v: Vine, s: VineSave): void {
  Object.assign(v, s);
}
