/**
 * How big each chapter's sea is. The sea is a ring (see logic/ring.ts), so
 * width sets how long a lap takes before the scenery comes round again, and
 * height sets how much room there is to dive away from a big fish.
 *
 * Fish don't fill the whole ring: they live in a shoal band around the player
 * (see shoalReach), so a wider sea costs no extra fish, only scenery.
 */

/** Scenery counts and fish numbers are tuned for a sea this size; see widthScale and shoalScale. */
export const REFERENCE_SEA = { width: 3600, height: 2000 } as const;

/** One lap at cruising speed (300 px/s) is ~19 s of swimming straight. */
const WIDTH = 5600;
/** The deep chapters' fish are the biggest, so their water is taller. */
const DEEP_FROM = 7;

export function worldFor(chapter: number): { readonly width: number; readonly height: number } {
  const height = chapter <= 1 ? 1800 : chapter < DEEP_FROM ? 2000 : 2300;
  return { width: WIDTH, height };
}

/** Scenery spread along the ring (rocks, weeds, decor, cover, skyline) scales with its width. */
export function widthScale(width: number): number {
  return width / REFERENCE_SEA.width;
}

/** The shoal band is a fixed width, so the number of fish in it only follows the height of the water. */
export function shoalScale(height: number): number {
  return height / REFERENCE_SEA.height;
}
