/**
 * How well bots play, per chapter (design doc "Bots": aim error, reaction
 * time, kiting, focus fire), plus the role knobs a level can't set.
 */
export interface Difficulty {
  /** Standard spread of aim, radians. */
  readonly aimError: number;
  /** Seconds between decisions. */
  readonly reaction: number;
  /** Chance to keep range (retreat while firing) when it outranges the target. */
  readonly kite: number;
  /** Prefers the weakest visible enemy. */
  readonly focus: boolean;
  /** Backs off to repair below this share of HP (when losing). */
  readonly fleeHp: number;
  /** Share of decisions it holds fire (slow trigger finger). */
  readonly hesitate: number;
}

/** Chapter 1 is the easy chapter: wide aim, slow to react (sim-tuned, Nov 14). */
export const CH1_BOTS: Difficulty = { aimError: 0.28, reaction: 0.5, kite: 0.3, focus: false, fleeHp: 0.25, hesitate: 0.35 };
/** The player's stand-in in the sim: a decent casual player. */
export const PLAYER_BOT: Difficulty = { aimError: 0.14, reaction: 0.28, kite: 0.6, focus: true, fleeHp: 0.3, hesitate: 0 };
export const ACE_BOT: Difficulty = { aimError: 0.1, reaction: 0.25, kite: 0.8, focus: true, fleeHp: 0.3, hesitate: 0.1 };

/** How far an unalerted bot spots you, by role (alerted or fighting: VISION). */
export const ROLE_SIGHT = { guard: 340, patrol: 380, turret: 400, wave: 440, hunter: 440, convoy: 300, runner: 300 } as const;
/** A guard fights this far from its post, then goes back. */
export const GUARD_LEASH = 320;
/** Guards and patrols within this of a guard that's hit or sees you join in. */
export const ALARM_RADIUS = 420;
/** An alerted bot hunts the alarm's spot this long. */
export const ALERT_TIME = 25;
/** Convoys and runners shoot back for this long after being hit. */
export const SHOOT_BACK = 4;
