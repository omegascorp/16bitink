import { hasOnHand, onHand, spend, type PrintResult, type Profile } from './economy';
import { countOf, type Hold } from './hold';
import type { OreKey } from './ore';
import { hasBeat, withBeat } from './story';
import { waterAt } from './worlds';

/**
 * Your starship (spec, "Your starship and travel"): it came out of the
 * wild wormhole broken and braked into orbit over Graphite before its
 * systems died. The lander climbs up to it; the starship is what flies
 * between worlds, and the lander only goes down and up. The wormhole broke
 * its power, its telescope (so the star map stays dark until it's mended),
 * its fuel tank and its engine: each takes Graphite's ores, carried up in
 * the lander, and can only be mended aboard. Its jump drive is past
 * mending here: it's the way home, for later.
 *
 * Ids are saved: never change one.
 */
export const STARSHIP_IDS = ['power', 'telescope', 'tank', 'engine'] as const;
export type StarshipId = (typeof STARSHIP_IDS)[number];
/**
 * Fitted later, not broken: the Aster's tank (chapter 3), drawn for you
 * by the last of the Aster on Mycel once it's awake. It doubles the tank,
 * enough for Brine. Then their long tank (chapter 4), drawn by all four
 * with their star chart: enough for Talus.
 */
export const STARSHIP_UPGRADES = ['asterTank', 'longTank'] as const;
/** Whatever can be fitted aboard and saved as such: the four mended systems and the upgrades. */
export type StarshipFit = StarshipId | (typeof STARSHIP_UPGRADES)[number];
export const STARSHIP_FITS: readonly StarshipFit[] = [...STARSHIP_IDS, ...STARSHIP_UPGRADES];
/** Whether a slot is an upgrade to fit, not a system to mend. */
export const isUpgrade = (id: string): id is (typeof STARSHIP_UPGRADES)[number] => (STARSHIP_UPGRADES as readonly string[]).includes(id);
/** The starship's slots on the Starship tab: the four to mend, the upgrades, and the jump drive, past mending here. */
export const STARSHIP_SLOTS = [...STARSHIP_IDS, ...STARSHIP_UPGRADES, 'jump'] as const;
export type StarshipSlot = (typeof STARSHIP_SLOTS)[number];

export interface StarshipSystem {
  readonly id: StarshipSlot;
  readonly name: string;
  /** What's wrong (for the three to mend), or how it stands. */
  readonly broken: string;
  /** Ore it takes; null for the one that can't be mended. */
  readonly needs: Hold | null;
  readonly after: readonly StarshipFit[];
  /** Said once it's mended. */
  readonly opens: string;
  readonly fact?: string;
}

export const STARSHIP: Readonly<Record<StarshipSlot, StarshipSystem>> = {
  power: {
    id: 'power', name: 'Power', needs: { copper: 10, silver: 4 }, after: [],
    broken: 'The wormhole burnt out the power lines: half the lights are dark and nothing aboard can draw much.',
    opens: 'The lights are on and the systems wake: the ship can power repairs.',
    fact: 'Silver carries electricity better than any other metal. Spacecraft wire their power contacts with it where every loss counts.',
  },
  tank: {
    id: 'tank', name: 'Fuel tank', needs: { graphite: 12, copper: 3 }, after: ['power'],
    broken: 'The tank split along a seam and the fuel boiled away into space.',
    opens: "The tank holds again: enough fuel for a short trip, as far as a sister moon. A bigger tank will take you further.",
    fact: 'Big rocket tanks are wound with carbon fibre over a thin liner: as strong as steel and far lighter.',
  },
  engine: {
    id: 'engine', name: 'Engine', needs: { graphite: 8, silver: 4, quartz: 3 }, after: ['power'],
    broken: 'The engine, for flying between worlds, is cold: its grids cracked and its insulators shattered.',
    opens: 'The engine runs. With fuel in the tank, the ship can fly between worlds again.',
    fact: 'Ion engines push charged gas out through grids. Graphite grids last longest: the beam barely wears carbon away.',
  },
  telescope: {
    id: 'telescope', name: 'Telescope', needs: { quartz: 4, silver: 2 }, after: ['power'],
    broken: "Its mirror cracked in the wormhole. Without it there's no star map: you can't even see which star this is.",
    opens: "First light: it reads each world's air from its light, which is how the star map knows what it knows.",
    fact: 'Big telescope mirrors are glass coated with a film of silver or aluminium far thinner than a hair. Quartz glass barely grows or shrinks with heat, so the mirror keeps its shape.',
  },
  asterTank: {
    id: 'asterTank', name: 'Aster tank', needs: { lignite: 10, amber: 4, calcite: 4 }, after: ['tank'],
    broken: "The tank the Aster built for their craft, drawn for you in the peat by the last of them: a long jar wound in fibre. Your own tank holds enough for a sister moon; this one doubles it, enough for Brine.",
    opens: 'The Aster tank is fitted: the ship holds twice the fuel, enough to reach Brine.',
    fact: 'Big rocket tanks are carbon fibre wound over a thin liner. Here the fibre is pitch from lignite, the resin amber and the liner a ceramic of calcite.',
  },
  longTank: {
    id: 'longTank', name: 'Long tank', needs: { lignite: 12, amber: 6, pyrite: 6 }, after: ['asterTank'],
    broken: "The four Aster drew it with their star chart: a longer jar of the same pitch fibre, with a collar of pyrite iron at each end. It holds enough for Talus, nearer the star.",
    opens: 'The long tank is fitted: the ship holds enough to reach Talus.',
    fact: "The longer a tank, the more it holds for the same width of wall, which is why rocket stages are tall and thin. The collars take the push where the tank meets the frame.",
  },
  jump: {
    id: 'jump', name: 'Jump drive', needs: null, after: [],
    broken: 'Dead. It steadies wormholes for a jump, and the wild one burnt it out. Nothing in this system can mend it: it is the way home, for later.',
    opens: '',
  },
};

/** The starship's fuel tank, once mended: split from ice like the lander's, for now (another fuel may take over for long trips). With the Aster's tank fitted it holds `aster`; with their long tank, `long`. */
export const SHIP_TANK = { capacity: 10, aster: 20, long: 32 } as const;

/** What the starship's tank holds now. */
export function shipTankCapacity(p: Pick<Profile, 'starship'>): number {
  if (p.starship.includes('longTank')) return SHIP_TANK.long;
  return p.starship.includes('asterTank') ? SHIP_TANK.aster : SHIP_TANK.capacity;
}

/** What the starship's tank is split from where you are (the water you carry up: worlds.ts). */
export const shipFuelOre = (p: Pick<Profile, 'at'>): OreKey => waterAt(p.at);

/** The first trip the map offers, and what it burns (a sister moon: its window is always open). */
export const FIRST_COURSE = { to: 'mycel', fuel: 6 } as const;

export const isFixed = (p: Pick<Profile, 'starship'>, id: StarshipFit): boolean => p.starship.includes(id);
export const starshipWhole = (p: Pick<Profile, 'starship'>): boolean => STARSHIP_IDS.every((id) => p.starship.includes(id));

/** Whether a system can be mended now, or why not: 'away' when you're not aboard, 'design' for an upgrade nobody has shown you yet. */
export type FixCheck = 'ok' | 'done' | 'order' | 'materials' | 'away' | 'never' | 'design';

/** The Aster tank's design: the last of the Aster draws it once it's awake. */
export const asterTankKnown = (p: Pick<Profile, 'beats'>): boolean => hasBeat(p, 'asterWoken');
/** The long tank's design: the four Aster draw it with their star chart, together again. */
export const longTankKnown = (p: Pick<Profile, 'beats'>): boolean => hasBeat(p, 'asterReunion');

export function canFix(p: Profile, id: StarshipSlot): FixCheck {
  if (id === 'jump') return 'never';
  if (isFixed(p, id)) return 'done';
  if (id === 'asterTank' && !asterTankKnown(p)) return 'design';
  if (id === 'longTank' && !longTankKnown(p)) return 'design';
  const s = STARSHIP[id];
  if (!s.after.every((a) => isFixed(p, a))) return 'order';
  if (!p.docked) return 'away';
  return hasOnHand(p)(s.needs!) ? 'ok' : 'materials';
}

export function fix(p: Profile, id: StarshipFit): PrintResult<FixCheck> {
  const why = canFix(p, id);
  if (why !== 'ok') return { ok: false, why };
  const spent = spend(p, STARSHIP[id].needs!);
  return { ok: true, profile: { ...spent, starship: [...spent.starship, id] } };
}

export type ShipRefillCheck = 'ok' | 'full' | 'materials' | 'tank' | 'away';

/** Lumps a refill of the starship's tank would take now. */
export function shipRefillCost(p: Profile): number {
  return Math.min(shipTankCapacity(p) - p.shipFuel, countOf(onHand(p), shipFuelOre(p)));
}

export function canRefillShip(p: Profile): ShipRefillCheck {
  if (!isFixed(p, 'tank')) return 'tank';
  if (!p.docked) return 'away';
  if (p.shipFuel >= shipTankCapacity(p)) return 'full';
  return shipRefillCost(p) > 0 ? 'ok' : 'materials';
}

export function refillShip(p: Profile): PrintResult<ShipRefillCheck> {
  const why = canRefillShip(p);
  if (why !== 'ok') return { ok: false, why };
  const n = shipRefillCost(p);
  return { ok: true, profile: { ...spend(p, { [shipFuelOre(p)]: n }), shipFuel: p.shipFuel + n } };
}

/** Whether the star map can be looked at: its telescope sees again. */
export const mapOpen = (p: Pick<Profile, 'starship'>): boolean => p.starship.includes('telescope');

export type CourseCheck = 'ok' | 'away' | 'broken' | 'fuel' | 'set';

/** Whether the first trip can be set now: aboard, the ship mended, the fuel for it in the tank. */
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
