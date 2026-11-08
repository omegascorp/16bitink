import { type Pt, spline } from '../../kraken/whale';
import { edgeAt } from '../../seal/art/paint';

/**
 * The T. rex head-and-neck outline, in its own units: the head is 100 long
 * (snout tip at x 42, back of the skull at x -58), the bite point at 0,0 (on
 * the lip line over the big back teeth), nose to the right, y down. The neck
 * runs down and back to x -156, where it fades out.
 *
 * A modern, lipped reconstruction: a deep, broad, boxy skull, the lacrimal
 * horn in front of the eye and the postorbital boss behind it, the eye high
 * and forward under a heavy brow, scaly lips over the teeth when the mouth is
 * shut, a deep lower jaw hinged far back under the skull.
 */

export const HEAD_LEN = 100;
/** Where the lower jaw turns, under the back of the skull. */
export const HINGE: Pt = { x: -53, y: 7.5 };
/** The widest gape, radians. */
export const JAW_MAX = 0.74;

/** The upper lip's edge, snout to the corner of the mouth. */
export const LIP: readonly Pt[] = spline([
  { x: 40.5, y: -5 }, { x: 37, y: -3 }, { x: 30, y: -1.4 }, { x: 20, y: -0.4 }, { x: 10, y: 0.2 }, { x: 0, y: 0 },
  { x: -10, y: -0.6 }, { x: -20, y: -1.6 }, { x: -28, y: -2.4 }, { x: -33, y: -2.8 },
], 5);
export const CORNER: Pt = LIP[LIP.length - 1]!;
/** Behind the corner of the mouth the cheek runs down and back to the hinge, over the jaw. */
export const CHEEK: readonly Pt[] = spline([CORNER, { x: -39, y: -0.6 }, { x: -45, y: 2.6 }, { x: -50, y: 5.6 }, HINGE], 4);
/** The whole upper edge of the mouth, snout to hinge. */
export const MOUTH_EDGE: readonly Pt[] = [...LIP, ...CHEEK.slice(1)];

/** The top line: up the blunt snout, back over the nasals, the lacrimal horn, the brow, the postorbital boss, the high back of the skull, down the neck. */
export const TOP: readonly Pt[] = spline([
  { x: 40.5, y: -5 }, { x: 42.2, y: -9.5 }, { x: 42, y: -15 }, { x: 40.4, y: -20 }, { x: 36.8, y: -24 }, { x: 31, y: -26.4 },
  { x: 22, y: -28.4 }, { x: 12, y: -30.4 }, { x: 3, y: -32.6 }, { x: -4, y: -35.2 }, { x: -9, y: -38.4 }, { x: -12.5, y: -41 },
  { x: -15.5, y: -42.4 }, { x: -18.5, y: -41.4 }, { x: -21.5, y: -41 }, { x: -25, y: -42.6 }, { x: -29, y: -43.6 }, { x: -35, y: -44.6 },
  { x: -42, y: -46 }, { x: -49, y: -47 }, { x: -54.5, y: -46.2 }, { x: -58.5, y: -43.4 }, { x: -61.5, y: -39.4 }, { x: -66, y: -37 },
  { x: -77, y: -34.4 }, { x: -91, y: -29.4 }, { x: -107, y: -21 }, { x: -123, y: -10 }, { x: -139, y: 2 }, { x: -156, y: 15 },
], 5);

/** The throat skin from the hinge down behind the jaw, and the underside of the neck. */
export const THROAT: readonly Pt[] = spline([HINGE, { x: -57, y: 13 }, { x: -56.5, y: 19.5 }, { x: -52, y: 24 }, { x: -44, y: 25.6 }, { x: -34, y: 25.4 }], 4);
export const NECK_BOTTOM: readonly Pt[] = spline([
  { x: -34, y: 25.4 }, { x: -42, y: 29 }, { x: -54, y: 36 }, { x: -70, y: 47.6 }, { x: -88, y: 61 }, { x: -106, y: 75 },
  { x: -124, y: 89 }, { x: -142, y: 103 }, { x: -158, y: 116 },
], 5);

/** Head and neck without the lower jaw. */
export const BODY: readonly Pt[] = [
  ...TOP,
  ...[...NECK_BOTTOM].reverse(),
  ...[...THROAT].reverse().slice(1),
  ...[...CHEEK].reverse().slice(1),
  ...[...LIP].reverse().slice(1, -1),
];

/** The lower jaw, shut: its top tucked just under the upper lip, deep at the back, a square chin. */
export const JAW_TOP: readonly Pt[] = MOUTH_EDGE.filter((p) => p.x <= 36.4).map((p) => ({ x: p.x, y: p.y - 1.2 * Math.min(1, Math.max(0, (p.x - HINGE.x) / 14)) }));
export const JAW_BOTTOM: readonly Pt[] = spline([
  { x: -60, y: 12 }, { x: -59, y: 18 }, { x: -54, y: 23 }, { x: -44, y: 25.2 }, { x: -30, y: 25 }, { x: -16, y: 23.6 },
  { x: -4, y: 21.4 }, { x: 8, y: 18.6 }, { x: 18, y: 15.8 }, { x: 26, y: 13 }, { x: 32, y: 10 }, { x: 36, y: 6.6 },
  { x: 37.3, y: 2.6 }, { x: 37.4, y: -1 }, { x: 36.4, y: -3.4 },
], 4);
export const JAW: readonly Pt[] = [...JAW_TOP, { x: -57, y: 9 }, ...JAW_BOTTOM];

export const EYE: Pt = { x: -23.5, y: -33 };
export const EYE_R = 3.1;
export const NOSTRIL: Pt = { x: 35.2, y: -17.8 };

export const topAt = (x: number): number => edgeAt(TOP, x);
/** The lip, then the cheek, then (behind the hinge) the hinge's height. */
export const mouthAt = (x: number): number => (x <= HINGE.x ? HINGE.y : edgeAt(MOUTH_EDGE, x));
export const neckBottomAt = (x: number): number => (x >= -34 ? 25.4 : edgeAt(NECK_BOTTOM, x));
export const jawTopAt = (x: number): number => edgeAt(JAW_TOP, x);
export const jawBottomAt = (x: number): number => edgeAt(JAW_BOTTOM, x);

/** A point of the jaw (in its shut place) turned `a` about the hinge. */
export function turned(p: Pt, a: number): Pt {
  const [c, s] = [Math.cos(a), Math.sin(a)];
  const [dx, dy] = [p.x - HINGE.x, p.y - HINGE.y];
  return { x: HINGE.x + dx * c - dy * s, y: HINGE.y + dx * s + dy * c };
}

export interface Tooth {
  /** Where it sits along the jaw. */
  readonly x: number;
  /** Full length, root to tip; the root (about 4) hides under the lip. */
  readonly len: number;
  /** A little lean, radians (positive leans the tip back). */
  readonly lean?: number;
}

/** Upper teeth: three small D-shaped ones at the front, then the huge maxillary teeth, shrinking toward the back. */
export const UPPER_TEETH: readonly Tooth[] = [
  { x: 35, len: 6, lean: 0.05 }, { x: 32.4, len: 7.6, lean: -0.04 },
  { x: 28.4, len: 12.2, lean: 0.06 }, { x: 22.6, len: 16.2, lean: 0.02 }, { x: 16.4, len: 18, lean: 0.1 }, { x: 10.6, len: 13.4, lean: -0.03 },
  { x: 4.8, len: 16.4, lean: 0.08 }, { x: -1.4, len: 12.6, lean: 0.12 }, { x: -7, len: 13.2, lean: 0.04 }, { x: -12.8, len: 9.4, lean: 0.14 },
  { x: -18, len: 9.8, lean: 0.06 }, { x: -23.2, len: 7, lean: 0.1 },
];
/** Lower teeth, set between the uppers. */
export const LOWER_TEETH: readonly Tooth[] = [
  { x: 34.4, len: 6.6, lean: 0.06 }, { x: 30.6, len: 9.6, lean: 0 }, { x: 25.6, len: 12.8, lean: 0.08 }, { x: 19.6, len: 14.2, lean: 0.04 },
  { x: 13.4, len: 11.6, lean: 0.12 }, { x: 7.6, len: 12.8, lean: 0.02 }, { x: 1.6, len: 10.4, lean: 0.1 }, { x: -4.4, len: 10.6, lean: 0.06 },
  { x: -10.2, len: 8.2, lean: 0.12 }, { x: -15.6, len: 7.8, lean: 0.04 }, { x: -20.8, len: 6.2, lean: 0.1 },
];
