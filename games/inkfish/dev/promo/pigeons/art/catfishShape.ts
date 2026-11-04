import type { Pt } from '../../../../src/art/pen';
import { open } from './skin';

/**
 * The shape of the catfish's head in strong three-quarter profile, heading left
 * and a little towards a camera lying on the gravel. Own units are the pixels of
 * frame 1, so the lines below are simply where they land in that frame.
 *
 * The mouth is a ring: the near lips sweep back from the snout to the corner
 * (well past the eye), the far lips turn back from the snout's front edge to the
 * far corner, and the river shows in the notch between them.
 */

/** Where the pose puts the head: the middle of the mouth. */
export const MOUTH: Pt = { x: 420, y: 846 };
/** The near corner of the mouth, about which the lower jaw turns. */
export const CORNER: Pt = { x: 640, y: 838 };
const FAR_CORNER: Pt = { x: 285, y: 852 };
const SNOUT: Pt = { x: 104, y: 672 };
const CHIN: Pt = { x: 104, y: 922 };

/** The gape the lines below are drawn at. */
export const GAPE_REF = 0.56;
/** The lower jaw's turn (radians, screen clockwise) at a gape. */
export const jawTurn = (gape: number): number => -(gape - GAPE_REF) * 0.46;

const SPLIT = 5;
export const NEAR_UP: readonly Pt[] = open([CORNER, { x: 560, y: 806 }, { x: 470, y: 776 }, { x: 380, y: 748 }, { x: 290, y: 720 }, { x: 210, y: 696 }, { x: 150, y: 674 }, { x: 118, y: 660 }, SNOUT], SPLIT);
export const FAR_UP: readonly Pt[] = open([SNOUT, { x: 118, y: 716 }, { x: 158, y: 770 }, { x: 214, y: 816 }, FAR_CORNER], SPLIT);
export const NEAR_LOW: readonly Pt[] = open([CORNER, { x: 560, y: 866 }, { x: 470, y: 892 }, { x: 380, y: 920 }, { x: 290, y: 946 }, { x: 210, y: 958 }, { x: 150, y: 962 }, { x: 116, y: 950 }, CHIN], SPLIT);
export const FAR_LOW: readonly Pt[] = open([CHIN, { x: 122, y: 890 }, { x: 170, y: 868 }, { x: 225, y: 858 }, FAR_CORNER], SPLIT);

/** The silhouette: over the head from the snout to the neck, and under it from the chin to the throat. */
export const TOPLINE: readonly Pt[] = open([SNOUT, { x: 106, y: 644 }, { x: 130, y: 612 }, { x: 180, y: 578 }, { x: 260, y: 545 }, { x: 370, y: 515 }, { x: 520, y: 490 }, { x: 680, y: 474 }, { x: 830, y: 470 }, { x: 1000, y: 490 }], SPLIT);
export const CHINLINE: readonly Pt[] = open([CHIN, { x: 100, y: 960 }, { x: 116, y: 1006 }, { x: 150, y: 1042 }, { x: 214, y: 1076 }, { x: 300, y: 1100 }, { x: 420, y: 1113 }, { x: 560, y: 1112 }, { x: 700, y: 1092 }, { x: 830, y: 1054 }, { x: 1000, y: 985 }], SPLIT);

/** The skin round the near cheek, neck and throat, everything but the lower jaw. */
export const HEAD_SHAPE: readonly Pt[] = [...NEAR_UP, ...TOPLINE.slice(1), { x: 1010, y: 800 }, ...CHINLINE.filter((p) => p.x > 620).reverse(), CORNER];
/** The lower jaw, as far back as it swings. */
export const JAW_SHAPE: readonly Pt[] = [...NEAR_LOW, ...CHINLINE.slice(1).filter((p) => p.x < 800), { x: 800, y: 820 }];

export const EYE: Pt = { x: 232, y: 648 };
/** The roots of the two long whiskers: the near one on the lip ahead of the eye, the far one on the snout's far edge. */
export const WHISKER_NEAR: Pt = { x: 166, y: 668 };
export const WHISKER_FAR: Pt = { x: 124, y: 628 };
/** The four chin barbels, near the chin's edge. */
export const BARBELS: readonly (readonly [number, number, number])[] = [[176, 1058, -16], [252, 1088, -8], [340, 1106, 4], [442, 1113, 16]];

/** The gill slit, top to bottom. */
export const GILL: readonly Pt[] = open([{ x: 800, y: 600 }, { x: 836, y: 720 }, { x: 836, y: 850 }, { x: 792, y: 985 }], 8);
/** The near pectoral fin, a broad rounded paddle splayed on the gravel behind the gill. */
export const PECTORAL: readonly Pt[] = open([{ x: 792, y: 952 }, { x: 850, y: 956 }, { x: 930, y: 1004 }, { x: 990, y: 1066 }, { x: 984, y: 1118 }, { x: 930, y: 1122 }, { x: 852, y: 1086 }, { x: 790, y: 1036 }, { x: 772, y: 990 }, { x: 792, y: 952 }], 5);

/** Where the bird sits, crosswise between the corners of the mouth. */
export const BIRD: Pt = { x: 482, y: 868 };
/** The cave's far end. */
export const GULLET: Pt = { x: 500, y: 846 };

/** Points along the chin and throat that water pours from. */
export const POUR_EDGE: readonly Pt[] = CHINLINE.filter((_, i) => i % 3 === 0 && i > 4);
