import type { Pt } from '../../../../src/art/pen';
import { spline } from '../../kraken/whale';
import { edgeAt, turn } from '../../seal/art/paint';

/**
 * The human head's shapes, in local units: head length (nose tip to the back
 * of the skull) = LEN, facing +x, y down, the origin at the bite point (the
 * first molars, where the back teeth meet with the jaw shut).
 */

export const LEN = 300;

/** The jaw's hinge, just in front of and below the ear. */
export const HINGE: Pt = { x: -66, y: -50 };
/** The jaw turns this far (radians) at `jaw` 1. */
export const JAW_MAX = 0.3;
/** The corner of the mouth (the lips pulled back past the first molar). */
export const CORNER: Pt = { x: -14, y: 0 };
const CORNER_OPEN = turn(CORNER, HINGE, JAW_MAX);

/** The parted lips' inner edges, front to the corner: the opening the teeth show through. */
export const LIP_TOP: readonly Pt[] = spline([
  { x: 52, y: -12.5 }, { x: 46, y: -14 }, { x: 36, y: -14.5 }, { x: 24, y: -13.5 }, { x: 12, y: -12 }, { x: 0, y: -10 },
  { x: -8, y: -6 }, CORNER,
], 4);
export const LIP_BOT: readonly Pt[] = spline([
  { x: 50, y: 12.5 }, { x: 44, y: 14 }, { x: 34, y: 14.5 }, { x: 22, y: 13.5 }, { x: 10, y: 12 }, { x: 0, y: 10 },
  { x: -8, y: 6 }, CORNER,
], 4);
export const LENS: readonly Pt[] = [...LIP_TOP, ...[...LIP_BOT].reverse().slice(1)];
export const lipTopAt = (x: number): number => edgeAt(LIP_TOP, x);
export const lipBotAt = (x: number): number => edgeAt(LIP_BOT, x);

/** The face in profile, from the upper lip up over the nose and brow to the hairline. */
export const FACE: readonly Pt[] = spline([
  { x: 52, y: -12.5 }, { x: 55.5, y: -17 }, { x: 55, y: -22 }, { x: 51, y: -27 }, { x: 49, y: -32 }, { x: 52, y: -35.5 },
  { x: 62, y: -38 }, { x: 71, y: -40.5 }, { x: 76, y: -45 }, { x: 75, y: -52 }, { x: 70, y: -60 }, { x: 64, y: -73 },
  { x: 58, y: -87 }, { x: 53.5, y: -99 }, { x: 55, y: -108 }, { x: 60, y: -117 }, { x: 61.5, y: -133 }, { x: 60, y: -158 },
  { x: 54, y: -186 },
], 5);

/** The skull from the hairline over the top and down the back to the nape. */
export const SKULL: readonly Pt[] = spline([
  { x: 54, y: -186 }, { x: 42, y: -211 }, { x: 20, y: -233 }, { x: -15, y: -250 }, { x: -60, y: -258 }, { x: -110, y: -254 },
  { x: -155, y: -236 }, { x: -192, y: -203 }, { x: -215, y: -161 }, { x: -223, y: -118 }, { x: -218, y: -78 },
  { x: -206, y: -46 }, { x: -192, y: -22 },
], 6);

/** Under the skull from the nape forward, below the ear lobe, to the hinge. */
const UNDER: readonly Pt[] = spline([{ x: -192, y: -22 }, { x: -150, y: -24 }, { x: -110, y: -16 }, { x: -86, y: -20 }, { x: -74, y: -34 }, HINGE], 4);

/**
 * The head without the lower jaw: the face, the skull, and (between the jaw's
 * top edge shut and fully open, behind the corner of the mouth) the cheek that
 * shows as the jaw drops.
 */
export const HEAD: readonly Pt[] = [
  ...FACE, ...SKULL.slice(1), ...UNDER.slice(1), CORNER_OPEN, ...[...LIP_TOP].reverse(),
].filter((p, i, all) => i === 0 || p.x !== all[i - 1]!.x || p.y !== all[i - 1]!.y);

/** The lower lip, chin and the soft line under it back to the throat. */
export const CHIN: readonly Pt[] = spline([
  { x: 50, y: 12.5 }, { x: 54, y: 16 }, { x: 54.5, y: 21 }, { x: 51, y: 26 }, { x: 45.5, y: 29.5 }, { x: 46, y: 35 },
  { x: 50, y: 43 }, { x: 48.5, y: 51 }, { x: 41, y: 57.5 }, { x: 28, y: 62 }, { x: 10, y: 66 }, { x: -8, y: 71 }, { x: -22, y: 76 },
], 5);
/** From the throat back along under the jaw, up the back of it to the hinge. */
const JAW_BACK: readonly Pt[] = spline([
  { x: -22, y: 76 }, { x: -42, y: 70 }, { x: -58, y: 52 }, { x: -69, y: 26 }, { x: -73, y: 2 }, { x: -72, y: -24 }, HINGE,
], 5);
/** The lower jaw (lower lip, teeth, chin, the cheek below the line from the corner of the mouth to the hinge). */
export const JAW: readonly Pt[] = [...[...LIP_BOT].reverse(), ...CHIN.slice(1), ...JAW_BACK.slice(1)];
/** The bone's lower edge, chin to the angle under the ear: a soft edge in the paint, not an outline. */
export const MANDIBLE: readonly Pt[] = spline([{ x: 41, y: 57.5 }, { x: 12, y: 58 }, { x: -20, y: 52 }, { x: -46, y: 40 }, { x: -64, y: 26 }, { x: -71, y: 10 }], 5);

/** The neck (running up under the skull and jaw, hidden there) and the shoulders in a T-shirt. */
export const NECK: readonly Pt[] = spline([
  { x: -24, y: 20 }, { x: -22, y: 76 }, { x: -25, y: 96 }, { x: -23.5, y: 104 }, { x: -28, y: 114 }, { x: -37, y: 138 },
  { x: -48, y: 160 }, { x: -64, y: 196 }, { x: -222, y: 196 }, { x: -212, y: 124 }, { x: -192, y: 80 }, { x: -180, y: 30 }, { x: -182, y: -30 },
  { x: -150, y: -46 }, { x: -100, y: -58 }, { x: -70, y: -58 }, { x: -46, y: -30 },
], 4);
/** The front of the throat that shows, for its ink. */
export const THROAT: readonly Pt[] = NECK.filter((p) => p.y > 75 && p.y < 154 && p.x > -60);
/** The back of the neck that shows, nape to the collar. */
export const NAPE: readonly Pt[] = spline([{ x: -186, y: -16 }, { x: -180, y: 30 }, { x: -190, y: 80 }, { x: -212, y: 120 }], 5);

/** The crew neck, back to front, and the shirt's outline from the front of the collar round to the back of it. */
export const NECKLINE: readonly Pt[] = spline([{ x: -212, y: 118 }, { x: -178, y: 134 }, { x: -130, y: 146 }, { x: -86, y: 153 }, { x: -48, y: 151 }], 6);
export const SHIRT_FRONT: readonly Pt[] = spline([{ x: -48, y: 151 }, { x: -36, y: 176 }, { x: -18, y: 220 }, { x: -6, y: 280 }, { x: 0, y: 352 }], 6);
export const SHIRT_BACK: readonly Pt[] = spline([
  { x: -446, y: 352 }, { x: -446, y: 290 }, { x: -434, y: 236 }, { x: -406, y: 196 }, { x: -354, y: 166 },
  { x: -292, y: 144 }, { x: -242, y: 128 }, { x: -212, y: 118 },
], 6);
export const SHIRT: readonly Pt[] = [...SHIRT_FRONT, ...SHIRT_BACK, ...NECKLINE.slice(1, -1)];
/** Where the bust fades out, local y. */
export const FADE_FROM = 286;
export const FADE_TO = 350;

/** Short hair: the outer edge over the skull, then the hairline back round the ear to the nape. */
export const HAIR: readonly Pt[] = [
  ...spline([
    { x: 56, y: -182 }, { x: 60, y: -192 }, { x: 50, y: -220 }, { x: 25, y: -244 }, { x: -13, y: -262 }, { x: -60, y: -270 },
    { x: -112, y: -266 }, { x: -160, y: -248 }, { x: -200, y: -213 }, { x: -225, y: -166 }, { x: -232, y: -118 },
    { x: -227, y: -78 }, { x: -214, y: -44 }, { x: -196, y: -18 },
  ], 6),
  ...spline([
    { x: -196, y: -18 }, { x: -168, y: -22 }, { x: -140, y: -36 }, { x: -128, y: -62 }, { x: -125, y: -96 }, { x: -113, y: -118 },
    { x: -91, y: -124 }, { x: -73, y: -116 }, { x: -63, y: -102 }, { x: -60, y: -86 }, { x: -53, y: -86 }, { x: -50, y: -108 },
    { x: -44, y: -132 }, { x: -14, y: -156 }, { x: 18, y: -170 }, { x: 42, y: -176 }, { x: 56, y: -182 },
  ], 5).slice(1, -1),
];
/** The hairline at the temple and the sideburn, where hair thins onto skin. */
export const HAIRLINE: readonly Pt[] = spline([
  { x: -60, y: -86 }, { x: -53, y: -86 }, { x: -50, y: -108 }, { x: -44, y: -132 }, { x: -14, y: -156 }, { x: 18, y: -172 },
  { x: 42, y: -176 }, { x: 56, y: -182 },
], 5);
/** The whorl the hair grows out from. */
export const CROWN: Pt = { x: -120, y: -238 };

/** The ear: the helix rim round the back, the lobe, the tragus at the front. */
export const EAR: readonly Pt[] = spline([
  { x: -80, y: -96 }, { x: -91, y: -110 }, { x: -108, y: -108 }, { x: -119, y: -90 }, { x: -119, y: -66 }, { x: -112, y: -46 },
  { x: -102, y: -30 }, { x: -91, y: -25 }, { x: -84, y: -32 }, { x: -83, y: -46 }, { x: -79, y: -56 }, { x: -78, y: -70 },
  { x: -77, y: -84 }, { x: -80, y: -96 },
], 5);

/** The eye in profile: upper and lower lids, back corner to the front of the cornea. */
export const EYE_BACK: Pt = { x: 19, y: -91 };
export const EYE_FRONT: Pt = { x: 42, y: -91.5 };
export const UPPER_LID: readonly Pt[] = spline([EYE_BACK, { x: 24, y: -96 }, { x: 31, y: -99 }, { x: 37.5, y: -98 }, { x: 41, y: -94.5 }, EYE_FRONT], 4);
export const LOWER_LID: readonly Pt[] = spline([EYE_BACK, { x: 26, y: -87 }, { x: 33, y: -86 }, { x: 39, y: -87.5 }, EYE_FRONT], 4);
export const IRIS: Pt = { x: 37.6, y: -92.2 };

/** The brow, back to front. */
export const BROW: readonly Pt[] = spline([{ x: 12, y: -108 }, { x: 24, y: -113.5 }, { x: 38, y: -116 }, { x: 50, y: -115 }, { x: 57, y: -112 }], 5);

/** Teeth: [front x, back x] along the arch as it shows side on (the front ones foreshortened). */
export type Tooth = readonly [number, number, 'incisor' | 'canine' | 'premolar' | 'molar'];
export const UPPER_TEETH: readonly Tooth[] = [
  [46.5, 41.5, 'incisor'], [41.5, 35.5, 'incisor'], [35.5, 26.5, 'canine'], [26.5, 17, 'premolar'], [17, 7, 'premolar'],
  [7, -7, 'molar'], [-7, -21, 'molar'],
];
export const LOWER_TEETH: readonly Tooth[] = [
  [43, 38, 'incisor'], [38, 32.5, 'incisor'], [32.5, 24.5, 'canine'], [24.5, 15.5, 'premolar'], [15.5, 5, 'premolar'],
  [5, -9, 'molar'], [-9, -23, 'molar'],
];

/** Sprite boxes, local units. */
export const HEAD_BOX = { x0: -240, x1: 82, y0: -276, y1: 22 } as const;
export const JAW_BOX = { x0: -90, x1: 62, y0: -60, y1: 88 } as const;
export const NECK_BOX = { x0: -452, x1: 12, y0: -64, y1: 354 } as const;
