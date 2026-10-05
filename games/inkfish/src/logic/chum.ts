import type { Rng } from './rng';

/** How far out, as a share of the way to the view's edge, the chum school appears: on screen, but with room to swim in. */
const VIEW_SHARE: readonly [number, number] = [0.55, 0.8];

export interface ChumSpot {
  readonly x: number;
  readonly y: number;
  /** Unit direction from the player out to the spot. */
  readonly dx: number;
  readonly dy: number;
}

/**
 * Where a chum school appears: evenly round the player, out towards the edges
 * of what the camera shows (`halfW` × `halfH` around the player), so you see
 * it arrive whatever your size. Never closer than `minGap`, so it isn't
 * swallowed the moment it lands.
 */
export function chumSpots(x: number, y: number, halfW: number, halfH: number, count: number, minGap: number, rng: Rng): ChumSpot[] {
  return Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2 + (rng() - 0.5) * 0.3;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    const share = VIEW_SHARE[0] + rng() * (VIEW_SHARE[1] - VIEW_SHARE[0]);
    const d = Math.max(minGap, share * Math.hypot(halfW * dx, halfH * dy));
    return { x: x + dx * d, y: y + dy * d, dx, dy };
  });
}
