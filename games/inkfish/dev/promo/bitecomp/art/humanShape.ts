import type { Pt } from '../../../../src/art/pen';
import { spline } from '../../kraken/whale';
import { step01 } from '../../seal/art/paint';

/**
 * The human's shapes, anime style, in local units: head length (nose tip to
 * the back of the skull) = LEN, facing +x, y down, the origin at the bite
 * point (the mouth line, where the teeth meet with the jaw shut).
 *
 * A friendly young adult drawn like an anime key visual: a big round cranium
 * under a lot of hair, a small face with a pointed little nose, a short upper
 * lip, a gentle pointed chin and a clean jawline back to the ear; the eye set
 * a little low and large. The mouth has two states: closed (rest) and lips
 * parted round the sensor bar with the teeth gripping it (grip).
 */

export const LEN = 300;

/** The jaw's hinge, in front of and below the ear. */
export const HINGE: Pt = { x: -74, y: -44 };
/** The jaw turns this far (radians) at `jaw` 1. */
export const JAW_MAX = 0.3;
/** The mouth's back corner: it stays put as the jaw drops, so the open mouth is a wedge, not a slot. */
export const CORNER: Pt = { x: 44, y: 2 };
/** The front of the upper lip's inner edge (where the profile meets the mouth line). */
export const LIP_FRONT: Pt = { x: 57, y: 0 };

/** How far the lips part at the front round the bar: the upper lifts, the lower drops. */
const GRIP_UP = 7;
const GRIP_DOWN = 7.5;

const lift = (g: number) => (p: Pt): Pt => ({ x: p.x, y: p.y - g * step01(p.x, CORNER.x, 54) * Math.max(0, Math.min(1, (p.y + 18) / 18)) });
const drop = (g: number) => (p: Pt): Pt => ({ x: p.x, y: p.y + g * step01(p.x, CORNER.x, 54) * Math.max(0, Math.min(1, 1 - p.y / 18)) });

/** The face's profile, from under the bangs down over the brow, the nose and the upper lip to the mouth. */
const FACE_REST: readonly Pt[] = spline([
  { x: 48, y: -214 }, { x: 55, y: -190 }, { x: 58.5, y: -166 }, { x: 59.5, y: -144 }, { x: 59, y: -128 }, { x: 57.5, y: -116 },
  { x: 57, y: -106 }, { x: 58.2, y: -97 }, { x: 61, y: -85 }, { x: 66, y: -72 }, { x: 71.5, y: -59 }, { x: 76, y: -49.5 },
  { x: 78, y: -45.5 }, { x: 77, y: -42 }, { x: 72.5, y: -39.5 }, { x: 66.5, y: -38 }, { x: 63, y: -35.5 }, { x: 62, y: -29 },
  { x: 62.4, y: -21 }, { x: 62.8, y: -13 }, { x: 62.4, y: -7 }, { x: 60.2, y: -2.6 }, LIP_FRONT,
], 6);

/** The skull from the nape up the back and over the top to the forehead (all under the hair). */
const SKULL: readonly Pt[] = spline([
  { x: -175, y: -38 }, { x: -200, y: -62 }, { x: -217, y: -100 }, { x: -222, y: -140 }, { x: -214, y: -186 }, { x: -192, y: -224 },
  { x: -155, y: -254 }, { x: -105, y: -270 }, { x: -50, y: -268 }, { x: 0, y: -254 }, { x: 32, y: -236 }, { x: 48, y: -214 },
], 5);

/** Under the skull from the hinge back, below the ear, to the nape. */
const UNDER: readonly Pt[] = spline([HINGE, { x: -92, y: -36 }, { x: -122, y: -30 }, { x: -150, y: -31 }, { x: -175, y: -38 }], 4);

/** The lips' inner edges, front to the corner. */
const LIP_TOP_REST: readonly Pt[] = spline([LIP_FRONT, { x: 52, y: 0.9 }, { x: 47.5, y: 1.5 }, CORNER], 4);
const LIP_BOT_REST: readonly Pt[] = spline([{ x: 57, y: 0.6 }, { x: 52, y: 1.1 }, { x: 47.5, y: 1.6 }, CORNER], 4);

/** The lower face is drawn short, as anime draws it: everything below the mouth squashed up a little. */
const SHORT = 0.86;
export const short = (p: Pt): Pt => (p.y > 0 ? { x: p.x, y: p.y * SHORT } : p);

/** The lower lip and the chin, front, down to the chin's point. */
const CHIN_REST: readonly Pt[] = spline([
  { x: 57, y: 0.6 }, { x: 59.4, y: 4 }, { x: 59.2, y: 8.6 }, { x: 56.6, y: 12.8 }, { x: 53.4, y: 16.4 }, { x: 53.2, y: 21 },
  { x: 55, y: 28 }, { x: 55.2, y: 35 }, { x: 52.4, y: 42 }, { x: 46.5, y: 48.4 },
], 6).map(short);
/** The jawline: the chin's point back along the jaw, round the angle and up to the hinge. */
export const JAWLINE: readonly Pt[] = spline([
  { x: 46.5, y: 48.4 }, { x: 37, y: 51.6 }, { x: 22, y: 51.4 }, { x: 4, y: 46.6 }, { x: -16, y: 39 }, { x: -35, y: 28.5 },
  { x: -50, y: 16.5 }, { x: -60, y: 3 }, { x: -66, y: -12 }, { x: -70, y: -28 }, HINGE,
], 6).map(short);

/** The shapes that change between the closed mouth (rest) and the lips parted round the bar (grip). */
export interface MouthShapes {
  readonly grip: boolean;
  /** The face's profile, hairline to the upper lip's front. */
  readonly face: readonly Pt[];
  /** The upper and lower lips' inner edges, front to the corner. */
  readonly lipTop: readonly Pt[];
  readonly lipBot: readonly Pt[];
  /** The lower lip and chin's profile, down to the chin's point. */
  readonly chin: readonly Pt[];
  /** The head without the lower jaw: face, upper lip back to the corner, the cheek to the hinge, under the ear, the skull. */
  readonly head: readonly Pt[];
}

const dedupe = (pts: readonly Pt[]): Pt[] => pts.filter((p, i, all) => i === 0 || p.x !== all[i - 1]!.x || p.y !== all[i - 1]!.y);

function mouthShapes(grip: boolean): MouthShapes {
  const up = lift(grip ? GRIP_UP : 0);
  const down = drop(grip ? GRIP_DOWN : 0);
  const face = FACE_REST.map(up);
  const lipTop = LIP_TOP_REST.map(up);
  const lipBot = LIP_BOT_REST.map(down);
  const chin = CHIN_REST.map(down);
  const head = dedupe([...face, ...lipTop.slice(1), HINGE, ...UNDER.slice(1), ...SKULL.slice(1)]);
  return { grip, face, lipTop, lipBot, chin, head };
}

export const REST: MouthShapes = mouthShapes(false);
export const GRIP: MouthShapes = mouthShapes(true);

// ---------------------------------------------------------------- the ear

export const EAR: readonly Pt[] = spline([
  { x: -84, y: -96 }, { x: -92, y: -104.5 }, { x: -104, y: -107 }, { x: -114, y: -99 }, { x: -118.5, y: -84 }, { x: -116.5, y: -68 },
  { x: -110, y: -56 }, { x: -100, y: -48.5 }, { x: -90.5, y: -48 }, { x: -85, y: -54 }, { x: -82.5, y: -65 }, { x: -82, y: -80 }, { x: -84, y: -96 },
], 5);
/** The bowl of the ear, in shade. */
export const EAR_BOWL: readonly Pt[] = spline([
  { x: -89, y: -91 }, { x: -99, y: -96 }, { x: -107, y: -88 }, { x: -108, y: -73 }, { x: -101, y: -63 }, { x: -93, y: -65 }, { x: -89.5, y: -76 }, { x: -89, y: -91 },
], 4);
/** The rim's inner line. */
export const EAR_RIM: readonly Pt[] = spline([{ x: -91, y: -99 }, { x: -103, y: -101 }, { x: -111.5, y: -90 }, { x: -111, y: -72 }, { x: -104, y: -59 }], 5);

// ---------------------------------------------------------------- the eye and brow

/** The upper lid's lash line, the back corner round to the front; the lower lid, the back corner to the front. */
const EYE_MID: Pt = { x: 40, y: -90 };
const grow = (p: Pt): Pt => ({ x: EYE_MID.x + (p.x - EYE_MID.x) * 1.1, y: EYE_MID.y + (p.y - EYE_MID.y) * 1.1 });
const BACK0: Pt = { x: 16, y: -88 };
export const EYE_BACK: Pt = grow(BACK0);
export const UPPER_LID: readonly Pt[] = spline([
  BACK0, { x: 22, y: -100 }, { x: 30, y: -110 }, { x: 40, y: -115.6 }, { x: 48.6, y: -114 }, { x: 53.2, y: -107 }, { x: 54.8, y: -97 },
], 6).map(grow);
export const LOWER_LID: readonly Pt[] = spline([BACK0, { x: 25, y: -75.5 }, { x: 35, y: -68 }, { x: 45, y: -66 }, { x: 51.5, y: -69.4 }], 6).map(grow);
/** The front of the eye, the cornea's side, top to bottom. */
export const EYE_FRONT: readonly Pt[] = spline([{ x: 54.8, y: -97 }, { x: 55.5, y: -86 }, { x: 54.3, y: -76 }, { x: 51.5, y: -69.4 }], 4).map(grow);
export const IRIS: Pt = grow({ x: 46.6, y: -87 });
export const IRIS_R = { x: 9, y: 21 } as const;

/** The brow, back to front. */
export const BROW: readonly Pt[] = spline([{ x: 10, y: -119 }, { x: 24, y: -128 }, { x: 40, y: -132 }, { x: 52, y: -130 }, { x: 58.5, y: -125.5 }], 6);

// ---------------------------------------------------------------- the neck and the T-shirt

/** The neck, from up under the skull and jaw (hidden there) down into the shirt. */
export const NECK: readonly Pt[] = [
  { x: -40, y: -50 }, { x: 4, y: 12 },
  ...spline([{ x: -4, y: 44 }, { x: -8.5, y: 80 }, { x: -13, y: 112 }, { x: -17, y: 140 }], 4),
  { x: -190, y: 140 },
  ...spline([{ x: -181, y: 92 }, { x: -173, y: 40 }, { x: -167, y: -8 }, { x: -160, y: -50 }], 4),
];
/** The throat's line and the nape's, that show. */
export const THROAT: readonly Pt[] = spline([{ x: -3, y: 34 }, { x: -6, y: 60 }, { x: -9.5, y: 88 }, { x: -13.5, y: 116 }, { x: -16, y: 130 }], 6);
export const NAPE: readonly Pt[] = spline([{ x: -166, y: -20 }, { x: -170, y: 20 }, { x: -175, y: 60 }, { x: -181, y: 92 }], 6);

/** The crew neck, back to front; the shirt's front and its back over the shoulder. */
export const NECKLINE: readonly Pt[] = spline([{ x: -184, y: 88 }, { x: -150, y: 104 }, { x: -108, y: 117 }, { x: -60, y: 126 }, { x: -17, y: 129 }], 6);
export const SHIRT_FRONT: readonly Pt[] = spline([{ x: -17, y: 129 }, { x: -9, y: 160 }, { x: -1, y: 204 }, { x: 5, y: 256 }, { x: 8, y: 314 }], 6);
export const SHIRT_BACK: readonly Pt[] = spline([
  { x: -374, y: 314 }, { x: -371, y: 254 }, { x: -357, y: 198 }, { x: -328, y: 156 }, { x: -286, y: 126 },
  { x: -240, y: 104 }, { x: -206, y: 93 }, { x: -184, y: 88 },
], 6);
export const SHIRT: readonly Pt[] = [...SHIRT_FRONT, ...SHIRT_BACK, ...NECKLINE.slice(1, -1)];
/** The sleeve's seam round the front of the shoulder. */
export const SEAM: readonly Pt[] = spline([{ x: -176, y: 100 }, { x: -134, y: 128 }, { x: -110, y: 170 }, { x: -101, y: 226 }, { x: -101, y: 314 }], 6);
/** Where the bust fades out, local y. */
export const FADE_FROM = 236;
export const FADE_TO = 300;

/** The baked neck-and-shirt sprite's box, local units. */
export const NECK_BOX = { x0: -392, x1: 24, y0: -60, y1: 316 } as const;
