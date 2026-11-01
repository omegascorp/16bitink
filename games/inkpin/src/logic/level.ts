import type { Seg } from './geom';
import type { Kind } from './particles';

/** The ruin a level is in, for the art, the sounds and the loss lines. */
export type Ruin = 'jungle' | 'volcano' | 'tomb';
/**
 * The guards' animals: a boar and a porcupine (spiky) in the jungle, a
 * salamander (fireproof) and an armadillo (spiky) at the volcano, the rain
 * frog (it puffs up and floats on gas) and the old toad (the tomb's boss) in the tomb.
 */
export type GuardAnimal = 'boar' | 'porcupine' | 'salamander' | 'armadillo' | 'frog' | 'toad';

/**
 * A pressure plate (chapter 3): a carved slab flush with the floor whose top
 * is `y`. It weighs what is in its zone, x0..x1 by y - 40..y, and goes down
 * at `need` (default 25: Nib alone, or 25 grains).
 */
export interface PlateDef {
  readonly id: string;
  readonly x0: number;
  readonly x1: number;
  readonly y: number;
  readonly need?: number;
}

/**
 * A stone door (chapter 3): a capsule like a pin. Open, it has slid toward
 * its ring end (ax, ay) by its own length, into the rock. It is open while
 * its plate is down (or, with `invert`, while it's up).
 */
export interface DoorDef extends Seg {
  readonly id: string;
  readonly plate: string;
  readonly invert?: boolean;
}

/**
 * A barrier between Nib and his goal (a door, or a cracked wall by index):
 * once everything is out and settled, the level is lost as 'sealed' while it
 * stands with Nib on its far side. `side` is the goal's side of it.
 */
export interface SealDef {
  readonly door?: string;
  readonly wall?: number;
  readonly side: 'left' | 'right' | 'up' | 'down';
}

/** The boss's breath (the Tomb Guardian): every `every` s, `count` gas grains, never more than `max` in play. */
export interface BreathDef {
  readonly every: number;
  readonly count: number;
  readonly max: number;
}

/** A crumbling basalt ledge, x0..x1 along its top surface y; its slab is LEDGE_T * 2 thick below that. */
export interface LedgeDef {
  readonly x0: number;
  readonly x1: number;
  /** Its top surface. */
  readonly y: number;
}

/** A pin: a capsule that holds things back until it's pulled. The ring end is (ax, ay). */
export interface PinDef extends Seg {
  readonly id: string;
  /** A gate pin: tap it again to push it back in (chapter 2 on). */
  readonly gate?: boolean;
}

/** A block of grains, filled from its bottom row up until `count` grains are placed. */
export interface FillDef {
  readonly kind: Kind;
  readonly x0: number;
  readonly x1: number;
  /** The bottom of the block (the pin it rests on). For GAS, the underside of its lid: gas packs downward from y1 + 8. */
  readonly y1: number;
  readonly count: number;
}

/** A closed polygon of open space, for the art: everything outside the rooms is rock. */
export type Room = readonly (readonly [number, number])[];

/**
 * A hanging vine Nib climbs. `top` is the floor Nib steps onto at its upper
 * end (a ledge), `bottom` the floor at its foot. Lava burns a vine away.
 */
export interface VineDef {
  readonly x: number;
  readonly top: number;
  readonly bottom: number;
  /** Starts as a seed at its foot, and grows up to `top` once water reaches it. */
  readonly seed?: boolean;
}

/** A grate in the floor: liquid and coins that reach the box beneath it are gone. */
export interface DrainDef {
  readonly x0: number;
  readonly x1: number;
  readonly y0: number;
  readonly y1: number;
}

export interface GuardDef {
  readonly x: number;
  readonly y: number;
  /** A spiky guard can't be stomped: landing on it hurts Nib instead. */
  readonly spiky?: boolean;
  /** The chapter's boss: big, too tough to stomp, and only a flood all at once washes it away. */
  readonly boss?: boolean;
  /** Which animal (default: 'porcupine' if spiky, else 'boar'). A salamander is fireproof; an armadillo is armoured (spiky). */
  readonly animal?: GuardAnimal;
}

/** A spot the test bot sends Nib to: a tap on the floor, or on a vine (with y). */
export interface Stop {
  readonly x: number;
  readonly y?: number;
}

export interface LevelDef {
  readonly id: string;
  /** The chapter's ruin, shown above the level's name. */
  readonly chapter: string;
  readonly name: string;
  /** One line under the name: what to do. */
  readonly goal: string;
  /** A first tip in place of the controls tip, for a level that teaches something new. */
  readonly tip?: string;
  readonly rooms: readonly Room[];
  readonly walls: readonly Seg[];
  /** Walls drawn as stone bars inside a room (dividers), by index into `walls`. */
  readonly bars: readonly number[];
  readonly pins: readonly PinDef[];
  readonly fills: readonly FillDef[];
  readonly nib: { readonly x: number; readonly y: number };
  readonly blots: readonly GuardDef[];
  /**
   * Where the chest stands; Nib opens it on reaching it and takes its
   * treasure. A Loot level has none: the gold is the goal.
   */
  readonly chest?: { readonly x: number; readonly y: number };
  /** Coins Nib must pick up (as well as taking the chest, if there is one) to win. */
  readonly coinsNeeded: number;
  readonly vines?: readonly VineDef[];
  /** Round stones that roll, plug drains and squash what they land on. */
  readonly boulders?: readonly { readonly x: number; readonly y: number }[];
  /** Wooden crates: they float on water (Nib can ride one), squash what they land on, and burn in lava. */
  readonly crates?: readonly { readonly x: number; readonly y: number }[];
  readonly drains?: readonly DrainDef[];
  /** Lights out: only Nib's lamp, the torches and lava light the room. */
  readonly dark?: boolean;
  /** The ruin it's in, for the art, the sounds and the loss lines (default 'jungle'). */
  readonly ruin?: Ruin;
  /** Crumbling basalt ledges: each holds Nib once, then cracks and falls as a slab soon after he steps off it. */
  readonly ledges?: readonly LedgeDef[];
  /** Pumice rafts: float on lava and on water, never burn, flat-topped to ride. (x, y) is the centre. */
  readonly rafts?: readonly { readonly x: number; readonly y: number }[];
  /** Fire rubies: gems lava can't hurt. Each counts RUBY_COINS toward the coin target and the bank. */
  readonly rubies?: readonly { readonly x: number; readonly y: number }[];
  /** Pressure plates (chapter 3). */
  readonly plates?: readonly PlateDef[];
  /** Stone doors, each worked by one plate (chapter 3). */
  readonly doors?: readonly DoorDef[];
  /** The doors and cracked walls between Nib and his goal: shut on him, they end the level as 'sealed'. */
  readonly seals?: readonly SealDef[];
  /** Fire bowls standing on the floor at y; the flame is a circle at (x, y - 34), r 12. Water douses one for good. */
  readonly braziers?: readonly { readonly x: number; readonly y: number }[];
  /** Wall indices a blast breaks (each must also be in `bars`). */
  readonly cracked?: readonly number[];
  /** The boss's gas breath (level 30). */
  readonly breath?: BreathDef;
  /** The Clear goal: every guard must be gone (as well as the chest, if any, and the coins) before the goal is met. */
  readonly clear?: boolean;
  /**
   * A winning order, for the lab and the tests, in steps (see parseStep): 'W' pulls W
   * (or pushes the gate W back in if it's out), 'W~1.5' does that 1.5 s
   * after the step before instead of once things settle, '@2060' walks Nib
   * to x = 2060 (and waits until things settle).
   */
  readonly solution: readonly string[];
  /**
   * For the test bot: where an eager player sends Nib after each pull, in
   * order, and back and forth at the end. Defaults to the chest.
   */
  readonly stops?: readonly Stop[];
  /** Wall torches (decoration, and light in the dark): their brackets are painted, their flames animated. */
  readonly torches: readonly { readonly x: number; readonly y: number }[];
  /** The part of the board the camera fits to the screen. A tall one scrolls with Nib. */
  readonly view: { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
}

/**
 * One step of a solution or a test order: a pin to tap, and how long after
 * the step before (s), or null to wait until things settle. A walk step
 * ('@2060') has `walk`, the x Nib walks to; its id is the step's text.
 */
export interface Step {
  readonly id: string;
  readonly wait: number | null;
  readonly walk?: number;
}

/** Reads a step: 'W' (once things settle), 'W~1.5' (1.5 s after the step before), '@2060' (walk Nib to x = 2060). */
export function parseStep(step: string): Step {
  const at = step.lastIndexOf('~');
  const head = at < 0 ? step : step.slice(0, at);
  let wait: number | null = null;
  if (at >= 0) {
    wait = Number(step.slice(at + 1));
    if (!Number.isFinite(wait) || wait < 0) throw new Error(`Bad step "${step}": the wait must be seconds, as in "W~1.5"`);
  }
  if (!head.startsWith('@')) return { id: head, wait };
  const walk = Number(head.slice(1));
  if (head.length < 2 || !Number.isFinite(walk)) throw new Error(`Bad step "${step}": a walk is '@' and an x, as in "@2060"`);
  return { id: head, wait, walk };
}
