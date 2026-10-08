import type { PlayerFishId } from '../levels/types';
import type { Relation } from './sizing';

/**
 * Each chapter's fish has one ability of its own, loosely true to life. Most
 * are passive; the active ones (ink, flash) have a key (E) and a touch button
 * next to dash, and are taught on the intro card when they first appear.
 */
export type AbilityId = 'ink' | 'skip' | 'spines' | 'graze' | 'doubleDash' | 'sense' | 'flash' | 'gape' | 'searchlight' | 'jellyBody';

export interface AbilityInfo {
  /** Short name: the HUD label and the touch button for active ones. */
  readonly name: string;
  /** Used with the ability key or button. */
  readonly active: boolean;
  /** Ms before it can be used (or, for spines, work) again. 0 for always-on abilities. */
  readonly cooldownMs: number;
}

export const ABILITY_INFO: Readonly<Record<AbilityId, AbilityInfo>> = {
  ink: { name: 'ink', active: true, cooldownMs: 10000 },
  skip: { name: 'skip', active: false, cooldownMs: 0 },
  spines: { name: 'spines', active: false, cooldownMs: 12000 },
  graze: { name: 'graze', active: false, cooldownMs: 0 },
  doubleDash: { name: 'double dash', active: false, cooldownMs: 0 },
  sense: { name: 'sense', active: false, cooldownMs: 0 },
  flash: { name: 'flash', active: true, cooldownMs: 12000 },
  gape: { name: 'gape', active: false, cooldownMs: 0 },
  searchlight: { name: 'searchlight', active: false, cooldownMs: 0 },
  jellyBody: { name: 'jelly body', active: false, cooldownMs: 0 },
};

export const PLAYER_ABILITY: Readonly<Record<PlayerFishId, AbilityId>> = {
  inkling: 'ink',
  goby: 'skip',
  perchfry: 'spines',
  butterfly: 'graze',
  tuna: 'doubleDash',
  mako: 'sense',
  lanternfish: 'flash',
  viperfish: 'gape',
  loosejaw: 'searchlight',
  snailfish: 'jellyBody',
};

/**
 * Level number (1-based across the game) where the first fish's ability is
 * taught: after the basics (level 1) and the leap (level 2). Every later fish
 * has its ability from the first level of its chapter, where it's announced.
 */
export const INK_DEBUT = 3;

/** Whether this fish can use its ability on this level. */
export function abilityUnlocked(fish: PlayerFishId, levelNumber: number): boolean {
  return fish !== 'inkling' || levelNumber >= INK_DEBUT;
}

/** The ability key on desktop. */
export const ABILITY_KEY = 'E';

/** Tuning for every ability, in one place. */
export const ABILITY = {
  /** Ink cloud: how far it reaches, px, and how long hunters inside it lose you, ms. */
  inkRadius: 220,
  inkBlindMs: 3500,
  /** Flash: how far it's seen, px, how long fish come to it, ms, and how fast they swim in, px/s. */
  flashRadius: 480,
  flashMs: 3000,
  flashPull: 170,
  /** Skip: launch speed off the water, as a share of a full leap's slowest launch. */
  skipLaunch: 1.05,
  /** Grazing in coral: growth points a second. */
  grazePerSec: 1.5,
  /** Double dash: the short gap before the second dash is ready, ms. */
  chainGapMs: 250,
  dashCharges: 2,
  /** Spines: how long the biter is stunned, ms, and your breather after, ms. */
  spineStunMs: 2200,
  spineSafeMs: 1200,
  /** Searchlight: how much further your light reaches in the dark. */
  searchlight: 1.8,
} as const;

/** Whether you can eat a fish in this relation to you: a huge gape takes fish your own size too. */
export function canSwallow(ability: AbilityId, rel: Relation): boolean {
  return rel === 'prey' || (ability === 'gape' && rel === 'peer');
}

export interface DashState {
  /** No dash before this time. */
  readonly readyAt: number;
  /** Dashes left before the cooldown. */
  readonly left: number;
  /** When all dashes are back. */
  readonly refillAt: number;
}

export const freshDashes = (charges: number): DashState => ({ readyAt: 0, left: charges, refillAt: 0 });

/**
 * One dash spent at `now`, or null if none is ready. With one charge this is
 * the plain cooldown; with two, the second follows after a short gap and the
 * cooldown starts from the last dash.
 */
export function spendDash(s: DashState, now: number, charges: number, cooldownMs: number): DashState | null {
  const left = now >= s.refillAt ? charges : s.left;
  if (left < 1 || now < s.readyAt) return null;
  const refillAt = now + cooldownMs;
  return { left: left - 1, refillAt, readyAt: left - 1 > 0 ? now + ABILITY.chainGapMs : refillAt };
}

/** How much further than usual the player's light reaches. */
export function lightBoost(ability: AbilityId): number {
  return ability === 'searchlight' ? ABILITY.searchlight : 1;
}

/** Stings and spines slide off a jelly body. */
export function shrugsOff(ability: AbilityId, cause: 'sting' | 'spiked' | 'other'): boolean {
  return ability === 'jellyBody' && cause !== 'other';
}

/** What the HUD shows for an active ability: its name and how ready it is, 0..1. */
export function abilityMeter(ability: AbilityId, readyAt: number, now: number): { readonly name: string; readonly ready: number } {
  const info = ABILITY_INFO[ability];
  const left = Math.max(0, readyAt - now);
  return { name: info.name, ready: info.cooldownMs ? 1 - left / info.cooldownMs : 1 };
}
