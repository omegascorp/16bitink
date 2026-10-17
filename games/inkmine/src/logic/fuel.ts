import { onHand, spend, type PrintResult, type Profile } from './economy';
import { countOf } from './hold';
import type { OreKey } from './ore';
import { hasBeat, withBeat } from './story';

/**
 * The lander's fuel tank (spec, "The lander"): hydrogen and oxygen, split
 * from water ice by the lander's power, as real moon bases plan to fuel
 * their rockets. Refilled aboard from the ice on hand (the cargo, then the
 * bag), one unit a lump; the climb to the ship in orbit burns most of a
 * tank. Ice is also what the suit makes air from, so a refill and a long
 * trip pull on the same ore.
 */
export const FUEL = {
  /** Units the tank holds. */
  max: 12,
  /** Units the climb from Graphite to the ship in orbit burns. */
  toOrbit: 10,
  /** What it's split from. */
  ore: 'ice' as OreKey,
} as const;

/** Lumps a refill would take now: what the tank lacks, or what's on hand if that's less. */
export function refillCost(p: Profile): number {
  return Math.min(FUEL.max - p.fuel, countOf(onHand(p), FUEL.ore));
}

export type RefillCheck = 'ok' | 'full' | 'materials';

export function canRefill(p: Profile): RefillCheck {
  if (p.fuel >= FUEL.max) return 'full';
  return refillCost(p) > 0 ? 'ok' : 'materials';
}

/** Tops the tank up with all the ice it can take that's on hand. */
export function refill(p: Profile): PrintResult<RefillCheck> {
  const why = canRefill(p);
  if (why !== 'ok') return { ok: false, why };
  const n = refillCost(p);
  return { ok: true, profile: { ...spend(p, { [FUEL.ore]: n }), fuel: p.fuel + n } };
}

/** Whether the lander can climb to the ship now, or why not. */
export type LiftCheck = 'ok' | 'core' | 'fuel' | 'flown';

export function canLiftOff(p: Profile): LiftCheck {
  if (hasBeat(p, 'flown')) return 'flown';
  if (!p.repaired.includes('core')) return 'core';
  return p.fuel >= FUEL.toOrbit ? 'ok' : 'fuel';
}

/** The climb to orbit: the fuel burnt, and the flight saved. */
export function liftOff(p: Profile): PrintResult<LiftCheck> {
  const why = canLiftOff(p);
  if (why !== 'ok') return { ok: false, why };
  return { ok: true, profile: withBeat({ ...p, fuel: p.fuel - FUEL.toOrbit }, 'flown') };
}
