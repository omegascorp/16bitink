import type { Pt } from '../../../../src/art/pen';
import { spline } from '../../kraken/whale';
import { contour, edgeAt, smoothLoop } from './paint';

/**
 * The Cape fur seal's outline in its own units (310 long, the middle at 0,0,
 * nose to the right, belly down): shared by the painted sprites
 * (./capeFurSeal.ts) and the live face (./sealFace.ts).
 */

/** The back, from the tip of the nose over the head, neck and shoulders to the tail. */
export const TOP: readonly Pt[] = spline([
  { x: 163, y: 3 }, { x: 161.5, y: -1.5 }, { x: 157, y: -5.5 }, { x: 148, y: -8.5 }, { x: 136, y: -11.5 }, { x: 125, y: -14.5 },
  { x: 115, y: -19 }, { x: 104, y: -22.5 }, { x: 92, y: -24.5 }, { x: 80, y: -24.5 }, { x: 68, y: -23.5 }, { x: 54, y: -25 },
  { x: 38, y: -30 }, { x: 20, y: -34.5 }, { x: 0, y: -36.5 }, { x: -22, y: -36 }, { x: -46, y: -32 }, { x: -70, y: -26 },
  { x: -92, y: -19.5 }, { x: -112, y: -13.5 }, { x: -128, y: -9 }, { x: -140, y: -5.5 }, { x: -148, y: -2 }, { x: -151, y: 1 },
], 5);

/** The upper lip, from under the nose back to the corner of the mouth. */
export const LIP: readonly Pt[] = spline([
  { x: 163, y: 3 }, { x: 162.5, y: 6.5 }, { x: 159, y: 9 }, { x: 152, y: 10.8 }, { x: 142, y: 12 }, { x: 132, y: 13 },
  { x: 122, y: 14.2 }, { x: 113, y: 15.3 }, { x: 109, y: 15.8 },
], 4);
/** The corner of the mouth: the lower jaw turns about it. */
export const PIVOT: Pt = LIP[LIP.length - 1]!;

/** From the corner of the mouth down the throat, along the chest and belly to the tail. */
export const THROAT: readonly Pt[] = spline([
  PIVOT, { x: 112.5, y: 20.5 }, { x: 112, y: 26 }, { x: 107, y: 30.5 }, { x: 97, y: 33.5 }, { x: 84, y: 36 }, { x: 68, y: 39 },
  { x: 50, y: 43.5 }, { x: 30, y: 45.5 }, { x: 8, y: 44.5 }, { x: -16, y: 41 }, { x: -40, y: 35 }, { x: -64, y: 28 },
  { x: -88, y: 21 }, { x: -110, y: 14 }, { x: -128, y: 9.5 }, { x: -140, y: 6.5 }, { x: -148, y: 4 }, { x: -151, y: 1 },
], 5);

/** The lower jaw: its lip under the upper lip, the chin tucked behind the nose, its underside back to the throat. */
export const JAW_TOP: readonly Pt[] = spline([
  { x: 159, y: 10.2 }, { x: 152, y: 11.6 }, { x: 142, y: 12.8 }, { x: 132, y: 13.8 }, { x: 122, y: 15 }, { x: 113, y: 16 }, { x: 109, y: 16.3 },
], 4);
export const JAW_UNDER: readonly Pt[] = spline([
  { x: 108, y: 29 }, { x: 114, y: 27.2 }, { x: 124, y: 25.2 }, { x: 135, y: 22.6 }, { x: 145, y: 19.2 }, { x: 152, y: 15.6 },
  { x: 157, y: 12.6 }, { x: 159.5, y: 10.8 },
], 4);
export const JAW: readonly Pt[] = [...JAW_TOP, { x: 106.5, y: 20 }, { x: 105.5, y: 25.5 }, ...JAW_UNDER];

export const BODY: readonly Pt[] = [...TOP, ...[...THROAT].reverse(), ...[...LIP].reverse().slice(1)];

/** The underside as the wash sees it: under the jaw at the head, then the throat and belly. */
export const UNDER: readonly Pt[] = [{ x: 166, y: 5 }, ...[...JAW_UNDER].reverse(), ...THROAT.filter((p) => p.x < 106)];
export const topAt = (x: number): number => edgeAt(TOP, x);
export const underAt = (x: number): number => edgeAt(UNDER, x);
export const along = (v: number, x0: number, x1: number, step = 4): Pt[] => contour(topAt, underAt, v, x0, x1, step);

export const EYE: Pt = { x: 117, y: -7.5 };
export const EAR: readonly Pt[] = smoothLoop([
  { x: 97, y: -11 }, { x: 94, y: -15.5 }, { x: 88, y: -19 }, { x: 80.5, y: -22 }, { x: 78, y: -21.6 }, { x: 81.5, y: -18.2 }, { x: 87, y: -14 }, { x: 93, y: -10 },
], 4);
export const NOSE: readonly Pt[] = smoothLoop([
  { x: 163.6, y: 2.6 }, { x: 162.4, y: -1.8 }, { x: 159, y: -4.2 }, { x: 155.4, y: -3.2 }, { x: 154.6, y: 0.8 }, { x: 156.6, y: 5 }, { x: 160.6, y: 6.6 },
], 4);

/** Where the limbs join the body. */
export const FORE_NEAR: Pt = { x: 50, y: 30 };
export const FORE_FAR: Pt = { x: 36, y: 26 };
export const HIND_UP: Pt = { x: -140, y: -0.5 };
export const HIND_DOWN: Pt = { x: -138, y: 3.5 };

