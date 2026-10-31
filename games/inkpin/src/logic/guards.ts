import type { GuardAnimal, GuardDef } from './level';
import type { Creature } from './world';

/**
 * The guards: they patrol their room, turn at walls and edges, and go for
 * Nib once he's close and on their level. Each animal is beaten its own
 * way: a boar is stomped, a porcupine or an armadillo (spiky) never; lava
 * scorches any guard but a salamander, which wades through it; water soaks
 * every one until it washes away.
 */

export const BLOT_R = 22;
/** The boss guard: a big one. */
export const BOSS_R = 40;
/** Walking speed in px per step. */
export const BLOT_WALK = 0.55;
/** A guard sees Nib this far away sideways, and only on about its own level (px). */
const BLOT_SIGHT_X = 220;
const BLOT_SIGHT_Y = 50;
/** Steps a patrolling guard pushes against something before it turns round. */
const BLOT_TURN_STEPS = 30;
/** A guard that can't get at Nib paces off this long (steps) before it turns to glare again, like a bull. */
const PACE_STEPS = 90;
/** Net headway (px) that counts as getting somewhere: a guard jittering against a wall moves every step but gets nowhere. */
const HEADWAY = 4;
/** Water a guard can soak up (grain contacts summed over steps) before it washes away. */
export const BLOT_SOAK = 260;
/** The boss soaks up far more, and dries off as it goes, so only a flood all at once washes it away. */
export const BOSS_SOAK = 70;
export const BOSS_DRY = 10;
const BOSS_SIGHT_X = 320;

/** How a guard is beaten: washed away, scorched, or stomped flat. */
export type BlotEnd = 'washed' | 'scorched' | 'stomped';

export interface Blot extends Creature {
  readonly spiky: boolean;
  readonly boss: boolean;
  readonly animal: GuardAnimal;
  soaked: number;
  /** Set when it's gone: washed away or dried to smoke. */
  gone: BlotEnd | null;
  goneAt: number;
  /** Steps it has walked without getting anywhere (from `anchor`): it turns round. */
  stuck: number;
  /** Where it was when it last got somewhere. */
  anchor: number;
  /** Steps left pacing away, having found it can't get at Nib (a wall, an edge, a ledge too high). */
  pacing: number;
}

/** What a guard needs of the world it walks in. */
export interface GuardHost {
  readonly nib: Creature;
  moveCreature(c: Creature, walk: number, isNib: boolean): void;
  /** True when a circle at (x, y) would overlap a wall, a pin still in, stone or a body. */
  overlaps(x: number, y: number, r: number): boolean;
  /** True when lava is within r of (x, y). */
  lavaAt(x: number, y: number, r: number): boolean;
  blotGone(b: Blot, how: BlotEnd): void;
}

export function blot(def: GuardDef): Blot {
  const animal = def.animal ?? (def.spiky ? 'porcupine' : 'boar');
  const spiky = def.spiky ?? (animal === 'porcupine' || animal === 'armadillo');
  const r = def.boss ? BOSS_R : BLOT_R;
  return { x: def.x, y: def.y, vx: 0, vy: 0, r, grounded: false, air: 0, wet: 0, facing: -1, spiky, boss: def.boss ?? false, animal, soaked: 0, gone: null, goneAt: 0, stuck: 0, anchor: def.x, pacing: 0 };
}

/**
 * The Volcano Shrine's guards haul themselves up a step as Nib does (up to
 * 44 px), so a salamander climbs out of its lava pool after him; the
 * jungle's boars and porcupines only manage a low lip.
 */
export function hauls(b: Blot): boolean {
  return b.animal === 'salamander' || b.animal === 'armadillo';
}

/** A salamander (and the Old Salamander) never burns. */
export function fireproof(b: Blot): boolean {
  return b.animal === 'salamander';
}

/** One step of a guard: patrol, or go for Nib, then soak up the water around it. */
export function moveBlot(b: Blot, w: GuardHost, footing: number): void {
  const nib = w.nib;
  // The boss keeps its eyes on Nib wherever it is, and waits below.
  const seesNib = b.boss ? Math.abs(nib.x - b.x) < BOSS_SIGHT_X : Math.abs(nib.x - b.x) < BLOT_SIGHT_X && Math.abs(nib.y - b.y) < BLOT_SIGHT_Y;
  if (b.pacing > 0) b.pacing--;
  if (seesNib && b.pacing === 0) {
    b.facing = Math.sign(nib.x - b.x) || b.facing;
    // Blocked on the way to Nib (an edge, a wall, a ledge too high): it paces off, then comes back to glare.
    if (edgeAhead(b, w, footing) || b.stuck > BLOT_TURN_STEPS) {
      b.facing = -b.facing;
      b.stuck = 0;
      b.anchor = b.x;
      b.pacing = PACE_STEPS;
    }
  } else if (b.stuck > BLOT_TURN_STEPS || edgeAhead(b, w, footing)) {
    b.facing = -b.facing;
    b.stuck = 0;
    b.anchor = b.x;
  }
  w.moveCreature(b, b.facing * BLOT_WALK, false);
  if (Math.abs(b.x - b.anchor) > HEADWAY) {
    b.anchor = b.x;
    b.stuck = 0;
  } else b.stuck++;
  soak(b, w);
}

/** Water soaks into a guard until it washes away; the boss dries off as it goes. */
function soak(b: Blot, w: GuardHost): void {
  if (b.gone) return;
  if (b.boss) b.soaked = Math.max(0, b.soaked - BOSS_DRY);
  if (b.wet > 0) {
    b.soaked += b.wet;
    if (b.soaked > (b.boss ? BOSS_SOAK : BLOT_SOAK)) w.blotGone(b, 'washed');
  }
}

/**
 * True when a guard standing on something would walk off a drop next. Lava
 * ahead is no drop to a salamander: it wades in.
 */
function edgeAhead(b: Blot, w: GuardHost, footing: number): boolean {
  if (b.air > footing || b.wet > 3) return false;
  const x = b.x + b.facing * (b.r + 6);
  const y = b.y + b.r + 14;
  if (w.overlaps(x, y, 4)) return false;
  return !(fireproof(b) && w.lavaAt(x, y + 10, 14));
}

/** The guard's share of how soaked it must get to wash away, for the art. */
export function soakOf(b: Blot): number {
  return Math.min(1, b.soaked / (b.boss ? BOSS_SOAK : BLOT_SOAK));
}
