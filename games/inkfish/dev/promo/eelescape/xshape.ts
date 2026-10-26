import type { Pt } from '../../../src/art/pen';
import { makeTrack, smoothCurve, type Track } from './geom';

/**
 * The dark sleeper whole, side on, as the X-ray sees it, in world px (the
 * X-ray camera at rest shows it across the frame): the body's soft outline,
 * the skeleton, the stomach behind the head with the eel curled up in it,
 * and the way out: forward up the gullet into the throat, and back out of
 * the gill slit under the gill cover's edge.
 */

export const X_BODY: readonly Pt[] = smoothCurve(
  [
    { x: 96, y: 784 }, { x: 102, y: 760 }, { x: 120, y: 728 }, { x: 160, y: 694 }, { x: 225, y: 672 }, { x: 300, y: 660 }, { x: 400, y: 652 }, { x: 520, y: 655 },
    { x: 640, y: 668 }, { x: 760, y: 694 }, { x: 860, y: 722 }, { x: 905, y: 734 }, { x: 960, y: 704 }, { x: 1005, y: 712 }, { x: 1024, y: 765 },
    { x: 1005, y: 818 }, { x: 960, y: 828 }, { x: 905, y: 796 }, { x: 860, y: 806 }, { x: 760, y: 826 }, { x: 640, y: 852 }, { x: 520, y: 872 },
    { x: 400, y: 874 }, { x: 300, y: 862 }, { x: 220, y: 842 }, { x: 160, y: 820 }, { x: 118, y: 800 },
  ],
  6,
  true,
);

export const X_EYE: Pt = { x: 205, y: 712 };
export const X_EYE_R = 24;

/** The stomach: a sac behind the head, under the backbone. */
export const STOMACH = { x: 478, y: 803, rx: 112, ry: 58 } as const;

/** The backbone runs from the skull to the tail fin. */
export const SPINE_FROM: Pt = { x: 350, y: 738 };
export const SPINE_TO: Pt = { x: 905, y: 765 };
export const VERTEBRAE = 30;

/**
 * The eel's path: curled in the stomach head (s = 0) at the back to tail at
 * the front, then forward up the gullet to the throat, round, and out of
 * the gill slit at the gill cover's edge.
 */
const COIL: readonly Pt[] = [
  { x: 562, y: 830 }, { x: 500, y: 842 }, { x: 440, y: 836 }, { x: 416, y: 812 }, { x: 448, y: 792 }, { x: 510, y: 794 }, { x: 545, y: 778 },
  { x: 512, y: 760 }, { x: 452, y: 764 }, { x: 395, y: 784 },
];
const OUT: readonly Pt[] = [
  { x: 350, y: 790 }, { x: 306, y: 788 }, { x: 286, y: 806 }, { x: 304, y: 828 }, { x: 340, y: 842 }, { x: 382, y: 864 }, { x: 432, y: 898 },
  { x: 500, y: 940 }, { x: 600, y: 990 },
];
export const X_TRACK: Track = makeTrack([...COIL, ...OUT], 0);
/** The eel's length (its tail at rest is at the front of the stomach), and where the gill slit is, along the path. */
export const X_EEL_LEN = X_TRACK.marks[COIL.length - 1]!;
export const X_GILL_S = X_TRACK.marks[COIL.length + 4]!;
/** The throat, where the gullet turns back towards the gill slit. */
export const X_THROAT_S = X_TRACK.marks[COIL.length + 2]!;
/** Where the gullet starts (the stomach's front). */
export const X_GULLET_S = X_TRACK.marks[COIL.length]!;
export const X_EEL_HALF = 7;
