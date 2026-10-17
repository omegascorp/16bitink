import { addOre, emptyInventory, isEmpty, roomFor, takeOre, countIn, type Inventory } from './inventory';
import { oreKeyOf, type OreKey } from './ore';

/**
 * The suit (spec, "The suit: staying alive"), No Man's Sky's life system
 * inked: a shield that takes hits first and refills by itself, hearts that
 * only the lander (or a medkit) gives back, life support that drains while
 * you're out, the drill's energy cell, a jetpack that charges itself on the
 * ground, and the ore bag (a slot inventory, inventory.ts). Life support
 * and the cell can be fed from the bag, one piece of the planet's fuel at a
 * time. Each change returns a new suit.
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
  /** Shield bars, refilling in fractions. A hit takes a whole bar or nothing. */
  readonly shield: number;
  readonly maxShield: number;
  /** Sim time of the last hit: the shield starts refilling SHIELD.delay after it. */
  readonly hitAt: number;
  /** Life support. */
  readonly air: number;
  readonly maxAir: number;
  /** Seconds spent with no air: a heart goes every AIR.choke of them. */
  readonly choking: number;
}

export interface SuitSpec {
  readonly energy: number;
  readonly fuel: number;
  /** Bag slots. */
  readonly slots: number;
  readonly hearts: number;
  /** Shield bars. */
  readonly shield: number;
  readonly air: number;
}

/** The two gauges fed from the bag: the drill's cell and life support. */
export type Gauge = 'cell' | 'air';
/** Which ore feeds each gauge: each planet has its own fuels. */
/** What feeds each gauge where you are, the main one first (worlds.ts). */
export type Fuels = Readonly<Record<Gauge, readonly OreKey[]>>;

/** The first of a gauge's fuels there's any of in the bag, or null. */
export function fuelIn(bag: Inventory, fuels: Fuels, g: Gauge): OreKey | null {
  return fuels[g].find((ore) => countIn(bag, ore) > 0) ?? null;
}

/** Pieces of one ore a suit bag slot stacks. */
export const SUIT_STACK = 10;

/** The Mk 0 starter set. */
export const STARTER: SuitSpec = { energy: 100, fuel: 60, slots: 4, hearts: 3, shield: 1, air: 100 };
/** Seconds of grace after a hit. */
export const GRACE = 2;
/** The shield waits `delay` s after a hit, then refills `rate` bars a second. */
export const SHIELD = { delay: 4, rate: 0.5 } as const;
/**
 * Life support: a full 100 lasts `seconds` outside; with none left a heart
 * goes every `choke` s. Under `low` of it, the suit warns.
 */
export const AIR = { full: 100, seconds: 360, choke: 6, low: 0.25 } as const;
/**
 * Air under water (spec, "Brine: Water and air"): each `per` metres of
 * water over your head adds one more time over, up to `max` times, as a
 * diver's air goes twice as fast at 10 m and three times at 20 m. A
 * rebreather recycles your breath, so depth stops mattering.
 */
export const DEEP_AIR = { per: 10, max: 4 } as const;

/** How many times faster life support drains `depth` metres under water. */
export function airRate(depth: number, rebreather: boolean): number {
  if (depth <= 0 || rebreather) return 1;
  return Math.min(DEEP_AIR.max, 1 + depth / DEEP_AIR.per);
}

/** Fuel a second the jetpack gets back while you stand on something (a full starter tank in 2 s). */
export const JET_RECHARGE = 30;
/** What one piece of fuel puts in each gauge. */
export const FEED: Readonly<Record<Gauge, number>> = { cell: 35, air: 40 };

/** A suit fresh from the ship: everything full, and the bag as it was left (empty by default). */
export function newSuit(spec: SuitSpec, bag: Inventory = emptyInventory(spec.slots, SUIT_STACK)): Suit {
  return {
    energy: spec.energy, maxEnergy: spec.energy, fuel: spec.fuel, maxFuel: spec.fuel, bag,
    hearts: spec.hearts, maxHearts: spec.hearts, graceUntil: 0,
    shield: spec.shield, maxShield: spec.shield, hitAt: -Infinity,
    air: spec.air, maxAir: spec.air, choking: 0,
  };
}

/** Spends `cost` energy, or null when the cell hasn't that much left. */
export function spend(s: Suit, cost: number): Suit | null {
  return s.energy >= cost ? { ...s, energy: s.energy - cost } : null;
}

/** Burns up to `amount` fuel (never below empty). */
export function burn(s: Suit, amount: number): Suit {
  const left = s.fuel - Math.min(s.fuel, amount);
  return { ...s, fuel: left < 1e-9 ? 0 : left };
}

/** The jetpack charging itself for `dt` s (standing on ground or a ladder). */
export function rechargeJet(s: Suit, dt: number): Suit {
  return s.fuel >= s.maxFuel ? s : { ...s, fuel: Math.min(s.maxFuel, s.fuel + JET_RECHARGE * dt) };
}

/** The shield refilling, once nothing has hit for SHIELD.delay. */
export function regen(s: Suit, dt: number, now: number): Suit {
  if (s.shield >= s.maxShield || now - s.hitAt < SHIELD.delay) return s;
  return { ...s, shield: Math.min(s.maxShield, s.shield + SHIELD.rate * dt) };
}

/** Life support draining for `dt` s outside, `rate` times as fast as on dry ground (deep water); `choked` when a heart went for want of air. */
export function breathe(s: Suit, dt: number, rate = 1): { suit: Suit; choked: boolean } {
  const air = Math.max(0, s.air - (AIR.full / AIR.seconds) * rate * dt);
  if (air > 1e-9) return { suit: { ...s, air, choking: 0 }, choked: false };
  const choking = s.choking + dt;
  if (choking < AIR.choke - 1e-9 || s.hearts <= 0) return { suit: { ...s, air: 0, choking }, choked: false };
  return { suit: { ...s, air: 0, choking: choking - AIR.choke, hearts: s.hearts - 1 }, choked: true };
}

/** At the lander: hearts, shield, life support and the cell all put right. */
export function restore(s: Suit): Suit {
  return { ...s, hearts: s.maxHearts, shield: s.maxShield, air: s.maxAir, energy: s.maxEnergy, fuel: s.maxFuel, choking: 0 };
}

/** Whether anything restore() would top up is down. */
export const worn = (s: Suit): boolean =>
  s.hearts < s.maxHearts || s.shield < s.maxShield || s.air < s.maxAir || s.energy < s.maxEnergy;

const share = (s: Suit, g: Gauge): number => (g === 'cell' ? s.energy / s.maxEnergy : s.air / s.maxAir);
const level = (s: Suit, g: Gauge): number => (g === 'cell' ? s.energy : s.air);
const room = (s: Suit, g: Gauge): number => (g === 'cell' ? s.maxEnergy - s.energy : s.maxAir - s.air);

export type FeedResult = { readonly ok: true; readonly suit: Suit } | { readonly ok: false; readonly why: 'none' | 'full' };

/** Feeds a gauge one piece of `ore` from the bag. */
export function feed(s: Suit, g: Gauge, ore: OreKey): FeedResult {
  if (room(s, g) <= 1e-9) return { ok: false, why: 'full' };
  const taken = takeOre(s.bag, ore, 1);
  if (!taken.taken) return { ok: false, why: 'none' };
  const to = Math.min(level(s, g) + FEED[g], g === 'cell' ? s.maxEnergy : s.maxAir);
  return { ok: true, suit: g === 'cell' ? { ...s, bag: taken.inv, energy: to } : { ...s, bag: taken.inv, air: to, choking: 0 } };
}

/** Whether a whole piece of fuel fits in the gauge (more than half of it, so little is wasted). */
export const hasRoomFor = (s: Suit, g: Gauge): boolean => room(s, g) >= FEED[g] / 2;

/** Which gauge the feed key feeds: the lower one with room and fuel for it, or else the lower one (to say why not). */
export function pickFeed(s: Suit, fuels: Fuels): Gauge {
  const order: Gauge[] = share(s, 'cell') < share(s, 'air') ? ['cell', 'air'] : ['air', 'cell'];
  return order.find((g) => hasRoomFor(s, g) && fuelIn(s.bag, fuels, g) !== null) ?? order[0]!;
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

/** Empties the bag. */
export function emptyBag(s: Suit): Suit {
  // The bag's locks are the player's, not its contents: they stay.
  return isEmpty(s.bag) ? s : { ...s, bag: { ...s.bag, slots: s.bag.slots.map(() => null) } };
}

export function withBag(s: Suit, bag: Inventory): Suit {
  return { ...s, bag };
}

/** What a hit took: a shield bar, a heart, or nothing (in grace). */
export type Hit = 'shield' | 'heart' | null;

/** A hit: a whole shield bar takes it, or else a heart goes (and what's left of the shield). Then grace. */
export function hurt(s: Suit, now: number): { suit: Suit; hit: Hit } {
  if (now < s.graceUntil || s.hearts <= 0) return { suit: s, hit: null };
  const after = { ...s, hitAt: now, graceUntil: now + GRACE };
  if (s.shield >= 1 - 1e-9) return { suit: { ...after, shield: s.shield - 1 < 1e-9 ? 0 : s.shield - 1 }, hit: 'shield' };
  return { suit: { ...after, shield: 0, hearts: s.hearts - 1 }, hit: 'heart' };
}
