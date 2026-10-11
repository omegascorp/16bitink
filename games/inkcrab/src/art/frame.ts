import { MOUTH_OFFSET } from '../logic/shells';

/**
 * Crab and shell drawings share one square frame (InkFish's critter frame)
 * so they stack: shells rest on the ground line with their opening low on
 * the right, and the crab steps out of it. Drawings use local px with the
 * origin at the centre; the ground is at local y = GROUND.
 *
 * Sprites are anchored at FOOT, on the ground under the opening, and scale
 * about it, so a small crab sits low in a big shell.
 */
export const FRAME = 256;
/** Local y of the ground line. */
export const GROUND = 46;
/** The anchor, in frame px. */
export const FOOT = { x: FRAME / 2 + 20, y: FRAME / 2 + GROUND } as const;
/** Frame px across a shell's drawn width; a shell is drawn `shellPx` world px wide. */
export const SHELL_UNITS = 116;
/** Frame x of the middle of a shell: MOUTH_OFFSET of its width short of the mouth. */
export const SHELL_MID = FOOT.x - Math.round(MOUTH_OFFSET * SHELL_UNITS);
