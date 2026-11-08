import type { Pt } from '../../../../src/art/pen';
import { spline } from '../../kraken/whale';
import { type Box, contour, edgeAt, smoothLoop } from '../../seal/art/paint';
import { type Lock, type ShagRule, shaggy, unit } from './bearFur';

/**
 * The swimming polar bear's outline in its own units (245 from nose to rump, the middle at 0,0, nose to the
 * right, belly down), shared by the painted sprites (./polarBear.ts, ./bearLimbs.ts).
 *
 * Swimming, the bear holds its small head up with the chin at the water, a long thick neck running down into
 * the shoulder hump, the back sloping down to a low rounded rump that rides awash. In the hook the water line
 * sits near y = -9, so only the head, the neck and a strip of back show above it.
 */

/** The top line, nose tip over the Roman-nosed bridge, the crown, the long neck, the hump and the back to the rump. */
export const TOP: readonly Pt[] = spline([
  { x: 124.5, y: -26 }, { x: 123, y: -30 }, { x: 118.5, y: -33.4 }, { x: 108, y: -37.6 }, { x: 96, y: -41.8 }, { x: 85, y: -45 },
  { x: 76, y: -46.8 }, { x: 67, y: -46.6 }, { x: 58, y: -43.6 }, { x: 48, y: -37.4 }, { x: 38, y: -31 }, { x: 29, y: -28 },
  { x: 18, y: -29.4 }, { x: 6, y: -30 }, { x: -8, y: -28.4 }, { x: -30, y: -23.6 }, { x: -55, y: -19 }, { x: -80, y: -15.6 },
  { x: -98, y: -13.4 }, { x: -110, y: -10.6 }, { x: -118, y: -5.6 }, { x: -122, y: 1 }, { x: -122.5, y: 8 },
], 5);

/** The under line, from under the nose along the chin, the jaw, the throat, the chest and the belly to the rump. */
export const UNDER: readonly Pt[] = spline([
  { x: 124.5, y: -26 }, { x: 123.6, y: -23.2 }, { x: 121, y: -21.4 }, { x: 117.5, y: -19.6 }, { x: 112, y: -16 }, { x: 101, y: -12.6 },
  { x: 92, y: -9.6 }, { x: 84, y: -5.8 }, { x: 74, y: -0.8 }, { x: 62, y: 5.4 }, { x: 50, y: 13.4 }, { x: 37, y: 24 }, { x: 24, y: 32.6 },
  { x: 8, y: 38.4 }, { x: -12, y: 41 }, { x: -40, y: 40.4 }, { x: -64, y: 37.4 }, { x: -84, y: 32.4 }, { x: -100, y: 25.6 },
  { x: -112, y: 18 }, { x: -119, y: 12.6 }, { x: -122.5, y: 8 },
], 5);

export const topAt = (x: number): number => edgeAt(TOP, x);
export const underAt = (x: number): number => edgeAt(UNDER, x);
/** A line along the body at `v` of the way down from the top line to the under line, from x0 to x1. */
export const along = (v: number, x0: number, x1: number, step = 4): Pt[] => contour(topAt, underAt, v, x0, x1, step);

/** The lip line: black, from under the nose back to the corner of the mouth (below the eye's front). */
export const LIP: readonly Pt[] = spline([
  { x: 122.4, y: -22.6 }, { x: 118, y: -21.6 }, { x: 112, y: -21 }, { x: 106, y: -20.6 }, { x: 102, y: -20.2 }, { x: 99.6, y: -19.4 },
], 4);
/** The chin's lower edge, under the lip: where the lower jaw meets the throat fur. */
export const JAWLINE: readonly Pt[] = spline([{ x: 117, y: -19.4 }, { x: 108, y: -15 }, { x: 98, y: -12.6 }, { x: 88, y: -11.2 }], 4);

export const BEAR_EYE: Pt = { x: 97.5, y: -34.2 };
/** The bridge's slope (radians): the eye and the muzzle's markings follow it. */
export const BRIDGE_TILT = 0.36;

/** The nose: a black pad on the muzzle's tip, rounded on top, its underside running back into the lip. */
export const NOSE: readonly Pt[] = smoothLoop([
  { x: 125.4, y: -26.4 }, { x: 124, y: -30.4 }, { x: 120.4, y: -32.6 }, { x: 116.6, y: -31.6 }, { x: 115.6, y: -28 },
  { x: 117, y: -24.6 }, { x: 121, y: -22.8 }, { x: 124.4, y: -23.4 },
], 4);

/** Small round ears set low and back on the skull, the near one over the far one. */
export const EAR_NEAR: readonly Pt[] = smoothLoop([
  { x: 63.6, y: -43 }, { x: 64.2, y: -47.4 }, { x: 67, y: -50.4 }, { x: 70.8, y: -50.6 }, { x: 73.6, y: -48 }, { x: 74.4, y: -44.2 },
], 4);
/** Only the top of the far ear shows, just ahead of the near one. */
export const EAR_FAR: readonly Pt[] = smoothLoop([
  { x: 72, y: -46.4 }, { x: 73.4, y: -49.4 }, { x: 76, y: -50.4 }, { x: 78.2, y: -48.8 }, { x: 78.6, y: -46.4 },
], 4);
/** The short tail: a tuft at the top of the rump. */
export const TAIL: readonly Pt[] = smoothLoop([
  { x: -112, y: -6 }, { x: -118, y: -8.6 }, { x: -124.4, y: -7.4 }, { x: -127.6, y: -4 }, { x: -125, y: -1 }, { x: -117, y: 0 },
], 4);

// ---------------------------------------------------------------- the shaggy silhouette

const inside = (p: Pt): Pt => {
  const x = Math.max(-100, Math.min(80, p.x));
  return { x, y: (topAt(x) + underAt(x)) / 2 };
};

/** Sleek over the head and the wet back, shaggy on the throat, the belly and the rump. */
const TOP_RULE: ShagRule = {
  inside,
  shag: (p) => (p.x > 84 ? [0, 0, 0] : p.x > 34 ? [0.3, 0.7, 1.5] : p.x > -100 ? [0.15, 0.5, 1.1] : [0.5, 0.8, 1.8]),
  flow: (p) => (p.x < -100 ? unit(-1, 1) : unit(-1, 0.18)),
};
const UNDER_RULE: ShagRule = {
  inside,
  shag: (p) => (p.x > 96 ? [0.15, 0.6, 1.2] : p.x > 30 ? [0.85, 1.6, 3.6] : p.x > -104 ? [0.7, 1.4, 3.4] : [0.8, 1.6, 3.2]),
  flow: (p) => (p.x < -104 ? unit(-1, 1.4) : unit(-1, 0.7)),
};

const locks: Lock[] = [];
const SHAG_TOP = shaggy(TOP, 9301, TOP_RULE, locks);
const SHAG_UNDER = shaggy(UNDER, 9311, UNDER_RULE, locks);

/** The body's silhouette, shaggy where the fur is. */
export const BODY: readonly Pt[] = [...SHAG_TOP, ...[...SHAG_UNDER].reverse().slice(1, -1)];
/** The top edge and the under edge (both nose to rump) with their locks, for the ink. */
export const EDGE_TOP: readonly Pt[] = SHAG_TOP;
export const EDGE_UNDER: readonly Pt[] = SHAG_UNDER;
export const LOCKS: readonly Lock[] = locks;

/** Where the limbs join the body. */
export const SHOULDER_NEAR: Pt = { x: 32, y: 12 };
export const SHOULDER_FAR: Pt = { x: 24, y: 8 };
export const HIP_NEAR: Pt = { x: -90, y: 14 };
export const HIP_FAR: Pt = { x: -84, y: 10 };

export const BODY_BOX: Box = { x0: -136, x1: 132, y0: -60, y1: 54 };
