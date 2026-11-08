import type { ZoneKind } from '../level/types';
import type { Rng } from './rng';
import { TAU, type Pt, type Shape } from './vec';

/**
 * What the snakes eat. Sizes are body widths in board px (compared with
 * the snake's gape, coil and venom), growth is how much longer a meal
 * makes it. Every meal is swallowed whole and alive, cartoon style: no
 * gore, and venom only makes prey sleepy (see the no-gross-food rule).
 * Kinds are registered per chapter (see prey.ts).
 */
export type PreyKind = string;

/** How a prey animal gets about: running in short bursts, hopping, staying put (eggs), or its own way (`step`). */
export type PreyGait = 'scurry' | 'hop' | 'still';

export interface PreySpec {
  readonly name: string;
  /** The plural, when it isn't the name plus an s. */
  readonly plural?: string;
  readonly size: number;
  readonly growth: number;
  readonly gait: PreyGait;
  /** Top speed, px/s (a hop's speed while in the air). */
  readonly speed: number;
  /** It runs from a snake whose head comes this close, px (0: it never runs). */
  readonly fear: number;
  readonly points: number;
  /** Where it lives: it appears there and won't leave it (eels in the water, geckos in the trees). */
  readonly zone?: ZoneKind;
  /** Its own way of moving, instead of the gait's (`near`: a snake it can see is close). */
  readonly step?: (p: Prey, world: PreyWorld, dt: number, near: boolean) => void;
}

/** Seconds a new prey animal takes to appear (it can't be eaten until then). */
export const APPEAR_TIME = 0.6;

/**
 * appear: fading in; idle, walk, flee, hop: about its life; caught: held in
 * a coil; stagger: bitten by a venomous snake, running off slower and
 * slower; sleep: the venom has made it sleepy (it can be swallowed, whatever
 * its size); hidden: out of reach (an eel in its hole, a bird in the air).
 */
export type PreyMode = 'appear' | 'idle' | 'walk' | 'flee' | 'hop' | 'caught' | 'stagger' | 'sleep' | 'hidden';

export interface Prey {
  readonly id: number;
  readonly kind: PreyKind;
  x: number;
  y: number;
  heading: number;
  mode: PreyMode;
  /** Seconds left in the current mode. */
  timer: number;
  /** 0..1 while appearing, then 1. */
  shown: number;
  /** Circled in red: the level's feast asks for these. */
  marked: boolean;
  /** Where an egg lies (its nest), or null. */
  readonly nest: Pt | null;
  /** Walking speed now, px/s. */
  speed: number;
  /** Frozen with fear: a coil is closing round it (set each frame by the world). */
  frozen: boolean;
  /** Height off the ground, 0..1 (birds), for the view. */
  alt: number;
  /** A behaviour's own state, if it keeps any. */
  data?: Record<string, number>;
}

export interface PreyWorld {
  readonly w: number;
  readonly h: number;
  readonly solids: readonly Shape[];
  /** The snake's head, and whether it can be seen (not under cover, buried…). */
  readonly head: Pt;
  readonly headSeen: boolean;
  readonly rng: Rng;
  /** Whether a point lies in a zone of this kind. */
  readonly inZone: (p: Pt, kind: ZoneKind) => boolean;
}

export function makePrey(id: number, kind: PreyKind, at: Pt, rng: Rng, nest: Pt | null = null, marked = false): Prey {
  return { id, kind, x: at.x, y: at.y, heading: rng() * TAU, mode: 'appear', timer: APPEAR_TIME, shown: 0, marked, nest, speed: 0, frozen: false, alt: 0 };
}

/** Whether prey in this mode can be eaten or coiled now. */
export function catchable(p: Prey): boolean {
  return p.mode !== 'caught' && p.mode !== 'appear' && p.mode !== 'hidden';
}
