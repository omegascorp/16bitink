import type { Profile } from './economy';
import { countOf, holdEntries, type Hold } from './hold';
import { contents, takeHoldFrom, type Inventory } from './inventory';
import type { OreKey } from './ore';

/**
 * Chapter 1's story past the radio (spec, "Story: chapter 1"): the moment
 * the radio works, a call comes in, a slow voice nobody understands.
 * The lander's dish can't tell where it's from; a handheld receiver
 * (tools.ts) follows it by its strength, hot and cold, to the Lamplighters'
 * outpost on the crater's far rim. You can't understand each other, so they say what
 * they want by pictures in the dust: silver from deep down, for a drive
 * core. They take it from your bag, and hand the core over once your ship
 * is whole (the hull and the thrusters mended). Fitted aboard, it flies.
 *
 * The beats are saved as reached: never rename one.
 */
export const BEATS = ['called', 'met', 'paid', 'core', 'flown', 'course', 'aboard', 'firstLight', 'mycelOrbit', 'mycelLanded', 'distress', 'asterFound', 'asterCamp', 'asterWoken'] as const;
export type Beat = (typeof BEATS)[number];

/**
 * Graphite's outpost, on the crater's far rim: the column a Lamplighter
 * stands at to meet you (the world is `worldCols` round), and how far east
 * of them their domes stand.
 */
export const OUTPOST = { col: 180, worldCols: 256, domes: 5 } as const;
/** What the Lamplighters want for the core: silver, which lies deep. */
export const TRADE: Hold = { silver: 10 };

/** The beat that says a world's first-landing card was read (Graphite's opening is `started`). */
export const ARRIVAL_BEAT: Readonly<Partial<Record<string, Beat>>> = { mycel: 'mycelLanded' };

export const hasBeat = (p: Pick<Profile, 'beats'>, b: Beat): boolean => p.beats.includes(b);

export function withBeat(p: Profile, b: Beat): Profile {
  return hasBeat(p, b) ? p : { ...p, beats: [...p.beats, b] };
}

/**
 * What the Aster's sleep pod needs to wake its sleeper (spec, "Mycel"): its
 * cell is a glass prism with a pyrite cathode, as theirs all are, and
 * it's drained flat. Pyrite for the cathode, calcite for the clear crystal.
 */
export const WAKE: Hold = { pyrite: 6, calcite: 4 };

/**
 * Ores kept in the bag at the lander, from when they're asked for until
 * they're handed over: the Lamplighters' silver, and the sleep pod's charge.
 */
export function keptOres(p: Pick<Profile, 'beats'>): OreKey[] {
  const asked = [...(hasBeat(p, 'met') && !hasBeat(p, 'paid') ? holdEntries(TRADE) : []), ...(hasBeat(p, 'asterCamp') && !hasBeat(p, 'asterWoken') ? holdEntries(WAKE) : [])];
  return [...new Set(asked.map(([ore]) => ore))];
}

/** The call is waiting: the radio works and it hasn't been taken yet. */
export const callDue = (p: Profile): boolean => p.repaired.includes('comms') && !hasBeat(p, 'called');

/**
 * The Aster lander's distress call is waiting: the starship's power is back
 * on over Graphite and its radio hasn't played the recording yet. It's
 * what sends you to Mycel (spec, "Mycel").
 */
export const distressDue = (p: Profile): boolean => p.docked && p.at === 'graphite' && p.starship.includes('power') && !hasBeat(p, 'distress');

/** The ship is whole but for the core: what the Lamplighters wait for before they hand it over. */
export const shipWhole = (p: Profile): boolean => p.repaired.includes('hull') && p.repaired.includes('thrusters');

/** The receiver's bands: within each many tiles of the outpost (the short way round), that many bars; past the last, static. */
const BANDS: readonly (readonly [number, number])[] = [[6, 5], [16, 4], [32, 3], [60, 2], [100, 1]];

/**
 * The receiver's reading, in bars (0 to 5), at `tiles` from the outpost
 * the short way round: it only says how strong the call is, never where
 * from, so you find them by walking whichever way it gets stronger. The
 * bands narrow as you close in, so the last steps still read hot or cold.
 */
export function signalBars(tiles: number): number {
  return BANDS.find(([within]) => tiles <= within)?.[1] ?? 0;
}

/** "native silver 3/10": what the trade (or another hold, such as the pod's charge) wants against what's in the bag. */
export function tradeLine(bag: Inventory, names: (ore: string) => string, want: Hold = TRADE): string {
  const have = contents(bag);
  return holdEntries(want).map(([ore, n]) => `${names(ore)} ${Math.min(countOf(have, ore), n)}/${n}`).join(' · ');
}

/**
 * What the Lamplighters do when you come to them:
 * - 'meet': the first time, they show by pictures what they want;
 * - 'want': they're still waiting for it (and the bag hasn't all of it);
 * - 'paid': they took it from the bag, and wait for your ship to be whole;
 * - 'waitShip': paid already, the ship still isn't whole;
 * - 'core': they hand over the core;
 * - 'thanks': the core is yours; they just wave.
 * null before the call: nobody knows you're coming.
 */
export type Says = 'meet' | 'want' | 'paid' | 'waitShip' | 'core' | 'thanks';

export interface Visit {
  readonly profile: Profile;
  /** The suit's bag after the visit (they take the trade from it). */
  readonly bag: Inventory;
  readonly says: Says | null;
}

export function visit(p: Profile, bag: Inventory): Visit {
  if (!p.repaired.includes('comms')) return { profile: p, bag, says: null };
  if (hasBeat(p, 'core')) return { profile: p, bag, says: 'thanks' };
  if (!hasBeat(p, 'met')) return { profile: withBeat(withBeat(p, 'called'), 'met'), bag, says: 'meet' };
  let profile = p;
  let after = bag;
  if (!hasBeat(p, 'paid')) {
    const took = takeHoldFrom(bag, TRADE);
    if (holdEntries(took.short).length) return { profile: p, bag, says: 'want' };
    profile = withBeat(profile, 'paid');
    after = took.inv;
  }
  if (!shipWhole(profile)) return { profile, bag: after, says: hasBeat(p, 'paid') ? 'waitShip' : 'paid' };
  return { profile: withBeat(profile, 'core'), bag: after, says: 'core' };
}

/**
 * What happens at the Aster's camp on Mycel (spec, "Mycel"), at the end of
 * the crew's trail east:
 * - 'camp': the first time, you find it: three empty bedrolls, pictures on
 *   the wall of the other three flying off to Brine, and the last of them
 *   asleep in a pod whose power is failing;
 * - 'pod': the pod still waits for its charge (the bag hasn't all of it);
 * - 'woken': the charge taken from the bag, the sleeper wakes and shows
 *   you where its crew went;
 * - 'awake': it's awake already; it flashes its crown at you.
 */
export type CampSays = 'camp' | 'pod' | 'woken' | 'awake';

export interface CampVisit {
  readonly profile: Profile;
  /** The suit's bag after the visit (the pod's charge is taken from it). */
  readonly bag: Inventory;
  readonly says: CampSays;
}

export function campVisit(p: Profile, bag: Inventory): CampVisit {
  if (!hasBeat(p, 'asterCamp')) return { profile: withBeat(p, 'asterCamp'), bag, says: 'camp' };
  if (hasBeat(p, 'asterWoken')) return { profile: p, bag, says: 'awake' };
  const took = takeHoldFrom(bag, WAKE);
  if (holdEntries(took.short).length) return { profile: p, bag, says: 'pod' };
  return { profile: withBeat(p, 'asterWoken'), bag: took.inv, says: 'woken' };
}
