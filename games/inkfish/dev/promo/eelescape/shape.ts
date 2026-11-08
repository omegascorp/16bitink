import type { Pt } from '../../../src/art/pen';
import { makeTrack, rotateAbout, smoothCurve, type Track } from './geom';

/**
 * The dark sleeper (Odontobutis obscura) close up, in world px (the river
 * camera at rest maps them 1:1 onto the 1080×1920 frame): a chunky goby-like
 * river fish facing left, its big head filling the frame and its body
 * running off the right edge. Its wide mouth opens by the lower jaw
 * swinging down round its hinge; the gill cover's back edge is where the
 * eel squeezes out.
 */

/** The snout tip, the corner of the mouth and the jaw's hinge. */
export const SNOUT: Pt = { x: 255, y: 770 };
export const MOUTH_CORNER: Pt = { x: 560, y: 852 };
export const HINGE: Pt = { x: 592, y: 872 };

export const EYE: Pt = { x: 468, y: 642 };
export const EYE_R = 46;

/** The upper lip, snout to mouth corner. */
export const UPPER_LIP: readonly Pt[] = smoothCurve([SNOUT, { x: 330, y: 800 }, { x: 450, y: 832 }, MOUTH_CORNER], 6);

const DORSAL: readonly Pt[] = [
  SNOUT, { x: 266, y: 712 }, { x: 305, y: 660 }, { x: 372, y: 616 }, { x: 466, y: 578 }, { x: 580, y: 552 }, { x: 700, y: 515 },
  { x: 840, y: 480 }, { x: 1000, y: 452 }, { x: 1200, y: 436 }, { x: 1500, y: 430 },
];
const BELLY: readonly Pt[] = [
  { x: 1500, y: 1146 }, { x: 1200, y: 1142 }, { x: 1000, y: 1134 }, { x: 800, y: 1110 }, { x: 662, y: 1068 }, { x: 602, y: 1016 }, { x: 588, y: 985 },
];
/** The back of the lower jaw, which the body's outline follows up to the hinge. */
const JAW_BACK: readonly Pt[] = [{ x: 588, y: 985 }, { x: 606, y: 925 }, HINGE];

/** The body's outline (head, back, belly; everything but the lower jaw), clockwise from the snout. */
export const BODY: readonly Pt[] = [
  ...smoothCurve(DORSAL, 6),
  { x: 1500, y: 800 },
  ...smoothCurve(BELLY, 6),
  ...JAW_BACK.slice(1),
  MOUTH_CORNER,
  ...[...UPPER_LIP].reverse().slice(1, -1),
];

/** The lower jaw, shut: its lip from chin to hinge, then round its back and underside. */
export const CHIN: Pt = { x: 232, y: 812 };
export const JAW_TOP: readonly Pt[] = smoothCurve([CHIN, { x: 300, y: 824 }, { x: 420, y: 843 }, { x: 540, y: 858 }, HINGE], 6);
export const JAW_UNDER: readonly Pt[] = smoothCurve([{ x: 606, y: 925 }, { x: 588, y: 985 }, { x: 520, y: 990 }, { x: 420, y: 964 }, { x: 320, y: 920 }, { x: 258, y: 870 }, CHIN], 6);
export const JAW: readonly Pt[] = [...JAW_TOP, ...JAW_UNDER.slice(0, -1)];

/** How far the jaw swings down when the mouth is wide open, radians (negative turns the chin down). */
export const JAW_SWING = -0.78;
export const jawAngle = (open: number): number => JAW_SWING * open;
export const swung = (p: Pt, open: number): Pt => rotateAbout(p, HINGE, jawAngle(open));

/** The gill cover's back edge, top to bottom: the slit the eel comes out of. */
export const GILL_EDGE: readonly Pt[] = smoothCurve([{ x: 690, y: 540 }, { x: 745, y: 650 }, { x: 785, y: 770 }, { x: 805, y: 880 }, { x: 800, y: 950 }, { x: 770, y: 1030 }, { x: 720, y: 1085 }], 6);
export const GILL_SLIT: Pt = { x: 803, y: 915 };

/** Everything behind the gill cover's edge (and below the fish there): where the escaping eel shows. */
export const BEHIND_GILL: readonly Pt[] = [{ x: 690, y: -3000 }, ...GILL_EDGE, { x: 720, y: 5000 }, { x: 6000, y: 5000 }, { x: 6000, y: -3000 }];

/** The pectoral fin: its base just behind the gill cover, fanning back. */
export const PECTORAL_BASE: readonly [Pt, Pt] = [{ x: 830, y: 898 }, { x: 826, y: 958 }];

/** The swallowed eel's path: from below and in front of the mouth, in through the lips (s = 0), to the throat. */
export const SWALLOW: Track = makeTrack(
  [
    { x: -320, y: 1560 }, { x: -140, y: 1420 }, { x: -40, y: 1330 }, { x: 20, y: 1230 }, { x: 62, y: 1130 }, { x: 112, y: 1040 }, { x: 178, y: 966 },
    { x: 270, y: 920 }, { x: 420, y: 892 }, { x: 540, y: 872 }, { x: 650, y: 864 }, { x: 820, y: 866 }, { x: 1000, y: 876 },
  ],
  7,
);

/** The escape: from the throat, out of the gill slit (s = 0), past the pectoral fin and away under the body. */
export const EXIT: Track = makeTrack(
  [
    { x: 420, y: 880 }, { x: 560, y: 880 }, { x: 690, y: 892 }, GILL_SLIT, { x: 872, y: 962 }, { x: 930, y: 1030 }, { x: 1010, y: 1098 },
    { x: 1120, y: 1160 }, { x: 1300, y: 1205 }, { x: 1600, y: 1225 }, { x: 2600, y: 1240 },
  ],
  3,
);

/** The eel in the close-up: a juvenile Japanese eel, slender and see-through grey, px. */
export const EEL_LEN = 700;
export const EEL_HALF = 21;
