/** Where a background boat starts and how it moves, in backdrop design px. */
export interface Lane {
  readonly x: number;
  /** Design px per second; the sign is its starting heading. */
  readonly speed: number;
  /** Sails back and forth between these x; without one it drifts on and wraps around the tile. */
  readonly range?: readonly [number, number];
}

export interface Sail {
  readonly x: number;
  readonly heading: 1 | -1;
}

const mod = (a: number, n: number): number => ((a % n) + n) % n;

/** A boat's place and heading `t` seconds after it set out, on a backdrop tile `tile` px wide. */
export function sailAt(lane: Lane, t: number, tile: number): Sail {
  const dir: 1 | -1 = lane.speed < 0 ? -1 : 1;
  if (!lane.range) return { x: mod(lane.x + lane.speed * t, tile), heading: dir };
  const [a, b] = lane.range;
  const len = b - a;
  if (len <= 0) return { x: a, heading: dir };
  // Unfold the back-and-forth into one long trip of 2·len, measured from `a` heading right.
  const start = dir === 1 ? lane.x - a : 2 * len - (lane.x - a);
  const u = mod(start + Math.abs(lane.speed) * t, 2 * len);
  return u < len ? { x: a + u, heading: 1 } : { x: b - (u - len), heading: -1 };
}
