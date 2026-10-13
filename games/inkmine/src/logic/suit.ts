import { oreById } from './ore';

/**
 * The numbers on the HUD (docs/inkmine-design.md, "The suit"): the
 * drill's energy cell, the jetpack's fuel, the ore bag, and hearts. Each
 * change returns a new suit.
 */
export interface Suit {
  readonly energy: number;
  readonly maxEnergy: number;
  /** Jetpack fuel. */
  readonly fuel: number;
  readonly maxFuel: number;
  /** Ore ids, one per piece. */
  readonly bag: readonly number[];
  readonly bagSize: number;
  readonly hearts: number;
  readonly maxHearts: number;
  /** Sim time until which hits are shrugged off (after a hit). */
  readonly graceUntil: number;
}

export interface SuitSpec {
  readonly energy: number;
  readonly fuel: number;
  readonly bag: number;
  readonly hearts: number;
}

/** The Mk 0 starter set. */
export const STARTER: SuitSpec = { energy: 100, fuel: 60, bag: 10, hearts: 3 };
/** Seconds of grace after losing a heart. */
export const GRACE = 2;

export function newSuit(spec: SuitSpec): Suit {
  return { energy: spec.energy, maxEnergy: spec.energy, fuel: spec.fuel, maxFuel: spec.fuel, bag: [], bagSize: spec.bag, hearts: spec.hearts, maxHearts: spec.hearts, graceUntil: 0 };
}

/** Spends `cost` energy, or null when the cell hasn't that much left. */
export function spend(s: Suit, cost: number): Suit | null {
  return s.energy >= cost ? { ...s, energy: s.energy - cost } : null;
}

export function recharge(s: Suit): Suit {
  return s.energy === s.maxEnergy ? s : { ...s, energy: s.maxEnergy };
}

/** Burns up to `amount` fuel (never below empty). */
export function burn(s: Suit, amount: number): Suit {
  const left = s.fuel - Math.min(s.fuel, amount);
  return { ...s, fuel: left < 1e-9 ? 0 : left };
}

export function refuel(s: Suit): Suit {
  return s.fuel === s.maxFuel ? s : { ...s, fuel: s.maxFuel };
}

export const bagFull = (s: Suit): boolean => s.bag.length >= s.bagSize;

/** Puts a piece of ore in the bag, or null when it's full. */
export function stow(s: Suit, ore: number): Suit | null {
  return bagFull(s) ? null : { ...s, bag: [...s.bag, ore] };
}

/** What the bag sells for. */
export function bagValue(bag: readonly number[]): number {
  return bag.reduce((sum, id) => sum + (oreById(id)?.value ?? 0), 0);
}

/** Empties the bag (banked or lost). */
export function emptyBag(s: Suit): Suit {
  return s.bag.length === 0 ? s : { ...s, bag: [] };
}

/** Loses a heart unless in grace; `hit` says whether it counted. */
export function hurt(s: Suit, now: number): { suit: Suit; hit: boolean } {
  if (now < s.graceUntil || s.hearts <= 0) return { suit: s, hit: false };
  return { suit: { ...s, hearts: s.hearts - 1, graceUntil: now + GRACE }, hit: true };
}
