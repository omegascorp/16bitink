/**
 * The giant squid's strike, as pure timing: it draws back and flares its arms
 * (the tell: time to dodge), the two long feeding tentacles shoot out, hold
 * for a moment with their clubs open, then reel back in.
 * Times in ms from the start of the strike.
 */
export const STRIKE = { windup: 380, out: 280, hold: 220, back: 520, total: 380 + 280 + 220 + 520 } as const;

/** How far out the tentacles are, 0 (tucked in) .. 1 (fully out), `ms` into a strike. */
export function strikeExtension(at: number): number {
  const ms = at - STRIKE.windup;
  if (ms <= 0 || at >= STRIKE.total) return 0;
  if (ms < STRIKE.out) {
    const t = ms / STRIKE.out;
    // Whips out: fast start, easing into full length.
    return 1 - (1 - t) * (1 - t) * (1 - t);
  }
  if (ms < STRIKE.out + STRIKE.hold) return 1;
  const t = (ms - STRIKE.out - STRIKE.hold) / STRIKE.back;
  // Reels in slowly at first, then snaps back.
  return 1 - t * t;
}

/** How far the tentacles reach from the squid's centre, in world units, for a squid of radius `size`. */
export function tentacleReach(size: number): number {
  return size * 5.5;
}
