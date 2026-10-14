import { addOre, emptyInventory, isEmpty, roomFor, type Inventory } from './inventory';
import { oreKeyOf } from './ore';

/**
 * The numbers on the HUD (docs/inkmine-design.md, "The suit"): the
 * drill's energy cell, the jetpack's fuel, the ore bag (a slot inventory,
 * inventory.ts), and hearts. Each change returns a new suit.
 */
export interface Suit {
  readonly energy: number;
  readonly maxEnergy: number;
  /** Jetpack fuel. */
  readonly fuel: number;
  readonly maxFuel: number;
  readonly bag: Inventory;
  readonly hearts: number;
  readonly maxHearts: number;
  /** Sim time until which hits are shrugged off (after a hit). */
  readonly graceUntil: number;
}

export interface SuitSpec {
  readonly energy: number;
  readonly fuel: number;
  /** Bag slots. */
  readonly slots: number;
  readonly hearts: number;
}

/** Pieces of one ore a suit bag slot stacks. */
export const SUIT_STACK = 10;

/** The Mk 0 starter set. */
export const STARTER: SuitSpec = { energy: 100, fuel: 60, slots: 4, hearts: 3 };
/** Seconds of grace after losing a heart. */
export const GRACE = 2;

/** A suit fresh from the ship: full cell and tank, and the bag as it was left (empty by default). */
export function newSuit(spec: SuitSpec, bag: Inventory = emptyInventory(spec.slots, SUIT_STACK)): Suit {
  return { energy: spec.energy, maxEnergy: spec.energy, fuel: spec.fuel, maxFuel: spec.fuel, bag, hearts: spec.hearts, maxHearts: spec.hearts, graceUntil: 0 };
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

/** Whether a piece of this ore (by id) has room in the bag: a stack of it with room, or an empty slot. */
export function fits(s: Suit, oreId: number): boolean {
  const ore = oreKeyOf(oreId);
  return !!ore && roomFor(s.bag, ore) > 0;
}

/** Whether nothing more fits: every slot holds a full stack. */
export const bagFull = (s: Suit): boolean => s.bag.slots.every((x) => x !== null && x.n >= s.bag.stack);

/** Puts a piece of ore (by id) in the bag, or null when there's no room for it. */
export function stow(s: Suit, oreId: number): Suit | null {
  const ore = oreKeyOf(oreId);
  if (!ore) return null;
  const r = addOre(s.bag, ore, 1);
  return r.added ? { ...s, bag: r.inv } : null;
}

/** Empties the bag (lost). */
export function emptyBag(s: Suit): Suit {
  return isEmpty(s.bag) ? s : { ...s, bag: emptyInventory(s.bag.slots.length, s.bag.stack) };
}

export function withBag(s: Suit, bag: Inventory): Suit {
  return { ...s, bag };
}

/** Loses a heart unless in grace; `hit` says whether it counted. */
export function hurt(s: Suit, now: number): { suit: Suit; hit: boolean } {
  if (now < s.graceUntil || s.hearts <= 0) return { suit: s, hit: false };
  return { suit: { ...s, hearts: s.hearts - 1, graceUntil: now + GRACE }, hit: true };
}
