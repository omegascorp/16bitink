import type { Profile } from './economy';
import { starshipWhole } from './starship';
import { withBeat } from './story';
import type { WorldId } from './worlds';

/**
 * Flying the starship between worlds (spec, "Your starship and travel"):
 * each trip burns fuel from its tank, and the trip is open if the tank
 * holds enough. For now the trips are between the ringed giant's two moons
 * you can land on, Graphite and Mycel, whose window is always open; the
 * game clock and launch windows come later.
 */
export interface Trip {
  readonly between: readonly [WorldId, WorldId];
  /** Units of the starship's tank the trip burns, either way. */
  readonly fuel: number;
}

export const TRIPS: readonly Trip[] = [{ between: ['graphite', 'mycel'], fuel: 6 }];

/** What a trip from one world to another burns, or null with no trip between them. */
export function tripFuel(from: WorldId, to: WorldId): number | null {
  const trip = TRIPS.find(({ between: [a, b] }) => (a === from && b === to) || (a === to && b === from));
  return trip?.fuel ?? null;
}

/**
 * Whether the ship can fly to `to` now, or why not: 'here' (already there),
 * 'none' (no trip there yet), 'docked' (you're not aboard), 'ship' (it's
 * not mended), 'fuel' (the tank's short), 'locked' (that world needs the
 * full game, `has` says whether its ground is loaded).
 */
export type TravelCheck = 'ok' | 'here' | 'none' | 'docked' | 'ship' | 'fuel' | 'locked';

export function canTravel(p: Profile, to: WorldId, has: (id: WorldId) => boolean): TravelCheck {
  if (p.at === to) return 'here';
  const fuel = tripFuel(p.at, to);
  if (fuel === null) return 'none';
  if (!p.docked) return 'docked';
  if (!starshipWhole(p)) return 'ship';
  if (p.shipFuel < fuel) return 'fuel';
  return has(to) ? 'ok' : 'locked';
}

/** The trip made: the fuel burnt and the ship in orbit over `to`, still docked. Setting out from Graphite ends chapter 1. */
export function travel(p: Profile, to: WorldId): Profile {
  const fuel = tripFuel(p.at, to) ?? 0;
  return withBeat({ ...p, at: to, shipFuel: p.shipFuel - fuel }, 'course');
}
