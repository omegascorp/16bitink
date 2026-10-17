import { onHand, spend, type PrintResult, type Profile } from './economy';
import { countOf } from './hold';
import type { OreKey } from './ore';
import { hasBeat, withBeat } from './story';

/**
 * The lander's fuel tank (spec, "Your starship and travel"): hydrogen and
 * oxygen, split from water ice by the lander's power, as real moon bases
 * plan to fuel their rockets. Refilled from the ice on hand (the cargo,
 * then the bag), one unit a lump, on the ground or docked. Graphite has no
 * air to brake in, so landing burns as much as climbing: lift-off waits for
 * enough to come back down too, and you're never stranded in orbit. Ice is
 * also what the suit makes air from, so a refill and a long trip pull on
 * the same ore.
 */
export const FUEL = {
  /** Units the tank holds. */
  max: 12,
  /** Units the climb from Graphite to the starship in orbit burns. */
  toOrbit: 6,
  /** Units landing back on Graphite burns. */
  toGround: 6,
  /** What it's split from. */
  ore: 'ice' as OreKey,
} as const;

/** What lift-off needs in the tank: the climb and the landing after. */
export const ROUND_TRIP = FUEL.toOrbit + FUEL.toGround;

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

/** Whether the lander can climb to the starship now, or why not. */
export type LiftCheck = 'ok' | 'core' | 'fuel' | 'docked';

export function canLiftOff(p: Profile): LiftCheck {
  if (p.docked) return 'docked';
  if (!p.repaired.includes('core')) return 'core';
  return p.fuel >= ROUND_TRIP ? 'ok' : 'fuel';
}

/** The climb to orbit: the fuel burnt, docked, and the first flight saved. */
export function liftOff(p: Profile): PrintResult<LiftCheck> {
  const why = canLiftOff(p);
  if (why !== 'ok') return { ok: false, why };
  return { ok: true, profile: withBeat({ ...p, fuel: p.fuel - FUEL.toOrbit, docked: true }, 'flown') };
}

export type LandCheck = 'ok' | 'ground' | 'fuel';

export function canLand(p: Profile): LandCheck {
  if (!p.docked) return 'ground';
  return p.fuel >= FUEL.toGround ? 'ok' : 'fuel';
}

/** Back down to Graphite from the starship: the fuel burnt, on the ground. */
export function land(p: Profile): PrintResult<LandCheck> {
  const why = canLand(p);
  if (why !== 'ok') return { ok: false, why };
  return { ok: true, profile: { ...p, fuel: p.fuel - FUEL.toGround, docked: false } };
}

/** Whether the lander has flown up once (the star map's been seen). */
export const hasFlown = (p: Profile): boolean => hasBeat(p, 'flown');
