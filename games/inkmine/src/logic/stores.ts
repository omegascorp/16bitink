import { onHand, spend, type PrintResult, type Profile } from './economy';
import { countOf } from './hold';
import type { OreKey } from './ore';
import { storeCapacity } from './ship';
import type { Suit } from './suit';
import { fuelsAt } from './worlds';

/**
 * The lander's stores: an air tank and a battery that top the suit up at
 * the lander, instead of air and charge appearing from nowhere. The tank
 * is refilled from the world's water (split, as the suit splits it) and the
 * battery from what feeds the cell there (graphite on Graphite, lignite on
 * Mycel: worlds.ts), both from what's on hand; the battery also
 * charges slowly from the lander's panels, so it can't be left flat for
 * good, and ice lies near the surface all round, so the tank never can
 * either. They start full and hold enough for several dives, so a refill
 * is an errand every few trips, not every one; the supply tanks module
 * makes them bigger. Hearts, the shield and the jetpack are still put
 * right for free.
 */
export const STORES = {
  air: { per: 25 },
  power: { per: 20 },
  /** Units of charge a second the panels put back in the battery. */
  solar: 0.3,
} as const;

export type StoreKind = 'air' | 'power';
export const STORE_KINDS: readonly StoreKind[] = ['air', 'power'];

export interface Stores {
  readonly air: number;
  readonly power: number;
}

export { storeCapacity };

/** What refills a store where you are: the air tank from the world's water, the battery from its cell fuel. */
export function storeOre(p: Pick<Profile, 'at'>, k: StoreKind): OreKey {
  const fuels = fuelsAt(p.at);
  return k === 'air' ? fuels.air : fuels.cell;
}

/** Lumps a refill of one store would take now: what fills it, or what's on hand if that's less. */
export function storeRefillCost(p: Profile, k: StoreKind): number {
  const room = storeCapacity(p.ship) - p.stores[k];
  return Math.min(Math.ceil(room / STORES[k].per), countOf(onHand(p), storeOre(p, k)));
}

export type StoreRefillCheck = 'ok' | 'full' | 'materials';

export function canRefillStore(p: Profile, k: StoreKind): StoreRefillCheck {
  if (p.stores[k] >= storeCapacity(p.ship)) return 'full';
  return storeRefillCost(p, k) > 0 ? 'ok' : 'materials';
}

/** Fills a store with all the ore it can take that's on hand (the cargo first). */
export function refillStore(p: Profile, k: StoreKind): PrintResult<StoreRefillCheck> {
  const why = canRefillStore(p, k);
  if (why !== 'ok') return { ok: false, why };
  const n = storeRefillCost(p, k);
  const spent = spend(p, { [storeOre(p, k)]: n });
  return { ok: true, profile: { ...spent, stores: { ...p.stores, [k]: Math.min(storeCapacity(p.ship), p.stores[k] + n * STORES[k].per) } } };
}

export interface Restock {
  readonly suit: Suit;
  readonly stores: Stores;
  /** The stores that couldn't fill their gauge. */
  readonly short: readonly StoreKind[];
}

/** The suit at the lander: hearts, shield and jetpack put right, air and charge drawn from the stores as far as they go. */
export function restockFrom(s: Suit, stores: Stores): Restock {
  const airNeed = s.maxAir - s.air;
  const powerNeed = s.maxEnergy - s.energy;
  const air = Math.min(airNeed, stores.air);
  // The cell reads in whole units: the battery's panel trickle gives no fractions.
  const power = Math.min(powerNeed, Math.floor(stores.power));
  const short: StoreKind[] = [];
  if (air < airNeed - 1e-9) short.push('air');
  if (power < powerNeed - 1e-9) short.push('power');
  return {
    suit: { ...s, hearts: s.maxHearts, shield: s.maxShield, fuel: s.maxFuel, choking: 0, air: s.air + air, energy: s.energy + power },
    stores: { air: stores.air - air, power: stores.power - power },
    short,
  };
}

/** The panels charging the battery for `dt` s (the air tank only fills from ice). */
export function solarCharge(stores: Stores, capacity: number, dt: number): Stores {
  return stores.power >= capacity ? stores : { ...stores, power: Math.min(capacity, stores.power + STORES.solar * dt) };
}
