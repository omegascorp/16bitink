import { type Pt, pt } from './geom';
import { gapeMiddle } from './mussel';
import { HUMP, mouthOf, type StarPose } from './star';
import { curlAt, gapAt, liftAt, meatAt, MUSSEL_SPACING, panAt, squashAt, stomachAt, strainAt, wiggleAt, wrap } from './story';

/**
 * The pool at a moment, as data: the star's pose, every mussel on the ledge
 * (where it is, how wide it gapes, how much is left in it) and where the
 * stomach reaches. Pure, so the tests can check the seam.
 */

export interface MusselState {
  /** Its middle, pool x. */
  readonly x: number;
  readonly gape: number;
  readonly meat: number;
}

/** The star stays in the middle of the pool; the ledge slides under it as it glides. */
export function starAt(t: number): StarPose {
  return { x: 0, hump: HUMP * (1 + squashAt(t)), curl: curlAt(t), wiggle: wiggleAt(t), strain: strainAt(t), lift: liftAt(t) };
}

/**
 * The mussels along the ledge, one every MUSSEL_SPACING: the one being eaten
 * (k = 0), emptied ones behind it, full ones gaping ahead. After the glide
 * the next one (k = 1) is where the eaten one was, as in frame 1.
 */
export function musselsAt(t: number): MusselState[] {
  const pan = panAt(t);
  return [-1, 0, 1, 2].map((k) => ({
    x: k * MUSSEL_SPACING - pan,
    gape: k === 0 ? gapAt(t) : 1,
    meat: k < 0 ? 0 : k === 0 ? meatAt(t) : 1,
  }));
}

/** The mussel under the star (the stomach only goes out while one is right under it). */
export function underStar(t: number): MusselState {
  const all = musselsAt(t);
  return all.reduce((best, m) => (Math.abs(m.x) < Math.abs(best.x) ? m : best), all[0]!);
}

/** Where the stomach starts (the mouth) and the bottom of its reach in the shell. */
export function stomachReach(t: number): { readonly mouth: Pt; readonly floor: Pt; readonly extent: number } {
  const m = underStar(t);
  const g = gapeMiddle(m.x, m.gape);
  return { mouth: mouthOf(starAt(t)), floor: pt(g.x, g.y + 45), extent: stomachAt(wrap(t)) };
}
