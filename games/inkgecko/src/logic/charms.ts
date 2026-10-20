/** Charms: the power-ups. On pivot levels one rides on a marble; on rail levels they fall from pops to be caught. */
export const CHARMS = ['slow', 'reverse', 'burst', 'aim', 'dragonfly'] as const;
export type CharmId = (typeof CHARMS)[number];

/** How long each lasting charm works, seconds. */
export const CHARM_SECONDS: Readonly<Record<CharmId, number>> = { slow: 8, reverse: 3, burst: 0, aim: 10, dragonfly: 0 };
/** Speed factor while Slow works. */
export const SLOW_FACTOR = 0.5;
/** Burst's reach, in marble widths from the marble it was on (or where the shot landed). */
export const BURST_REACH = 2.5;
/** A charm on a marble fades if not popped within this many seconds. */
export const CHARM_FADES_AFTER = 12;

export const CHARM_NAMES: Readonly<Record<CharmId, string>> = { slow: 'Slow', reverse: 'Reverse', burst: 'Burst', aim: 'Aim', dragonfly: 'Dragonfly' };
