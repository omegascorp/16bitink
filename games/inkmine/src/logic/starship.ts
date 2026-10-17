import { hasOnHand, onHand, spend, type PrintResult, type Profile } from './economy';
import { countOf, type Hold } from './hold';
import type { OreKey } from './ore';
import { hasBeat, withBeat } from './story';

/**
 * Your starship (spec, "Your starship and travel"): she came out of the
 * wild wormhole broken and braked into orbit over Graphite before her
 * systems died. The lander climbs up to her; she's what flies between
 * worlds, and the lander only goes down and up. The wormhole broke her
 * power, her telescope (so the star map stays dark until it's mended), her
 * fuel tank and her engine: each takes Graphite's ores, carried up in the
 * lander, and can only be mended aboard her. Her jump drive is past
 * mending here: it's the way home, for later.
 *
 * Ids are saved: never change one.
 */
export const STARSHIP_IDS = ['power', 'telescope', 'tank', 'engine'] as const;
export type StarshipId = (typeof STARSHIP_IDS)[number];
/** Her slots on the Starship tab: the four to mend, and the jump drive, past mending here. */
export const STARSHIP_SLOTS = [...STARSHIP_IDS, 'jump'] as const;
export type StarshipSlot = (typeof STARSHIP_SLOTS)[number];

export interface StarshipSystem {
  readonly id: StarshipSlot;
  readonly name: string;
  /** What's wrong (for the three to mend), or how it stands. */
  readonly broken: string;
  /** Ore it takes; null for the two that can't be mended. */
  readonly needs: Hold | null;
  readonly after: readonly StarshipId[];
  /** Said once it's mended. */
  readonly opens: string;
  readonly fact?: string;
}

export const STARSHIP: Readonly<Record<StarshipSlot, StarshipSystem>> = {
  power: {
    id: 'power', name: 'Power', needs: { copper: 10, silver: 4 }, after: [],
    broken: 'The wormhole burnt out her power lines: half her lights are dark and nothing aboard can draw much.',
    opens: 'Her lights are on and her systems wake: she can power repairs.',
    fact: 'Silver carries electricity better than any other metal. Spacecraft wire their power contacts with it where every loss counts.',
  },
  tank: {
    id: 'tank', name: 'Fuel tank', needs: { graphite: 12, copper: 3 }, after: ['power'],
    broken: 'Her tank split along a seam and the fuel boiled away into space.',
    opens: "The tank holds again: enough fuel for a short trip, as far as a sister moon. A bigger tank will take you further.",
    fact: 'Big rocket tanks are wound with carbon fibre over a thin liner: as strong as steel and far lighter.',
  },
  engine: {
    id: 'engine', name: 'Engine', needs: { graphite: 8, silver: 4, quartz: 3 }, after: ['power'],
    broken: 'Her engine, for flying between worlds, is cold: its grids cracked and its insulators shattered.',
    opens: 'The engine runs. With fuel in the tank, she can fly between worlds again.',
    fact: 'Ion engines push charged gas out through grids. Graphite grids last longest: the beam barely wears carbon away.',
  },
  telescope: {
    id: 'telescope', name: 'Telescope', needs: { quartz: 4, silver: 2 }, after: ['power'],
    broken: "Its mirror cracked in the wormhole. Without it there's no star map: you can't even see which star this is.",
    opens: "First light: it reads each world's air from its light, which is how the star map knows what it knows.",
    fact: 'Big telescope mirrors are glass coated with a film of silver or aluminium far thinner than a hair. Quartz glass barely grows or shrinks with heat, so the mirror keeps its shape.',
  },
  jump: {
    id: 'jump', name: 'Jump drive', needs: null, after: [],
    broken: 'Dead. It steadies wormholes for a jump, and the wild one burnt it out. Nothing in this system can mend it: it is the way home, for later.',
    opens: '',
  },
};

/** Her fuel tank, once mended: split from ice like the lander's, for now (another fuel may take over for long trips). */
export const SHIP_TANK = { capacity: 10, ore: 'ice' as OreKey } as const;

/** The first trip the map offers, and what it burns (a sister moon: its window is always open). */
export const FIRST_COURSE = { to: 'mycel', fuel: 6 } as const;

export const isFixed = (p: Pick<Profile, 'starship'>, id: StarshipId): boolean => p.starship.includes(id);
export const starshipWhole = (p: Pick<Profile, 'starship'>): boolean => STARSHIP_IDS.every((id) => p.starship.includes(id));

/** Whether a system can be mended now, or why not: 'away' when you're not aboard her. */
export type FixCheck = 'ok' | 'done' | 'order' | 'materials' | 'away' | 'never';

export function canFix(p: Profile, id: StarshipSlot): FixCheck {
  if (id === 'jump') return 'never';
  if (isFixed(p, id)) return 'done';
  const s = STARSHIP[id];
  if (!s.after.every((a) => isFixed(p, a))) return 'order';
  if (!p.docked) return 'away';
  return hasOnHand(p)(s.needs!) ? 'ok' : 'materials';
}

export function fix(p: Profile, id: StarshipId): PrintResult<FixCheck> {
  const why = canFix(p, id);
  if (why !== 'ok') return { ok: false, why };
  const spent = spend(p, STARSHIP[id].needs!);
  return { ok: true, profile: { ...spent, starship: [...spent.starship, id] } };
}

export type ShipRefillCheck = 'ok' | 'full' | 'materials' | 'tank' | 'away';

/** Lumps a refill of her tank would take now. */
export function shipRefillCost(p: Profile): number {
  return Math.min(SHIP_TANK.capacity - p.shipFuel, countOf(onHand(p), SHIP_TANK.ore));
}

export function canRefillShip(p: Profile): ShipRefillCheck {
  if (!isFixed(p, 'tank')) return 'tank';
  if (!p.docked) return 'away';
  if (p.shipFuel >= SHIP_TANK.capacity) return 'full';
  return shipRefillCost(p) > 0 ? 'ok' : 'materials';
}

export function refillShip(p: Profile): PrintResult<ShipRefillCheck> {
  const why = canRefillShip(p);
  if (why !== 'ok') return { ok: false, why };
  const n = shipRefillCost(p);
  return { ok: true, profile: { ...spend(p, { [SHIP_TANK.ore]: n }), shipFuel: p.shipFuel + n } };
}

/** Whether the star map can be looked at: her telescope sees again. */
export const mapOpen = (p: Pick<Profile, 'starship'>): boolean => p.starship.includes('telescope');

export type CourseCheck = 'ok' | 'away' | 'broken' | 'fuel' | 'set';

/** Whether the first trip can be set now: aboard, the ship mended, the fuel for it in her tank. */
export function canSetCourse(p: Profile): CourseCheck {
  if (hasBeat(p, 'course')) return 'set';
  if (!p.docked) return 'away';
  if (!starshipWhole(p)) return 'broken';
  return p.shipFuel >= FIRST_COURSE.fuel ? 'ok' : 'fuel';
}

/** Sets course for the first sister moon: the end of chapter 1. The fuel burns on the way, in the next chapter. */
export function setCourse(p: Profile): PrintResult<CourseCheck> {
  const why = canSetCourse(p);
  if (why !== 'ok') return { ok: false, why };
  return { ok: true, profile: withBeat(p, 'course') };
}
