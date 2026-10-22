/** Charms: the power-ups. On pivot levels one rides on a marble; on rail levels they fall from pops to be caught. */
export const CHARMS = ['slow', 'reverse', 'burst', 'aim', 'dragonfly', 'inkpot', 'geode', 'hedgehog', 'rain', 'lantern'] as const;
export type CharmId = (typeof CHARMS)[number];

/** How long each lasting charm works, seconds. */
export const CHARM_SECONDS: Readonly<Record<CharmId, number>> = { slow: 8, reverse: 3, burst: 0, aim: 10, dragonfly: 0, inkpot: 0, geode: 0, hedgehog: 0, rain: 0, lantern: 12 };
/** Speed factor while Slow works. */
export const SLOW_FACTOR = 0.5;
/** Burst's reach, in marble widths from the marble it was on (or where the shot landed). */
export const BURST_REACH = 2.5;
/** The Hedgehog eats this many marbles from the front of the line nearest its well. */
export const HEDGEHOG_EATS = 10;
/** How fast it trundles up the track, board px/s. */
export const HEDGEHOG_SPEED = 260;
/** Rain pops every open marble within this many board px of its column, left or right. */
export const RAIN_HALF = 52;
/** A charm on a marble fades if not popped within this many seconds. */
export const CHARM_FADES_AFTER = 12;

export const CHARM_NAMES: Readonly<Record<CharmId, string>> = { slow: 'Slow', reverse: 'Reverse', burst: 'Burst', aim: 'Aim', dragonfly: 'Dragonfly', inkpot: 'Ink Pot', geode: 'Geode', hedgehog: 'Hedgehog', rain: 'Rain', lantern: 'Lantern' };

/**
 * Reverse and Slow stall the line: each only turns up once a line is this
 * far towards its well (0..1), where it rescues rather than drags.
 */
export const STALL_FROM: Readonly<Partial<Record<CharmId, number>>> = { slow: 0.35, reverse: 0.5 };

/**
 * The charm to give next: one of the level's `charms` that fits how close
 * the line is to its well (`danger`, 0..1), not `last` again while there is
 * another, chosen by `roll` (0..1). Null when none fits yet.
 */
export function pickCharm(charms: readonly CharmId[], danger: number, last: CharmId | null, roll: number): CharmId | null {
  const fits = charms.filter((c) => danger >= (STALL_FROM[c] ?? 0));
  const fresh = fits.filter((c) => c !== last);
  const pool = fresh.length ? fresh : fits;
  return pool[Math.min(pool.length - 1, Math.floor(roll * pool.length))] ?? null;
}
