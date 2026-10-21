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
