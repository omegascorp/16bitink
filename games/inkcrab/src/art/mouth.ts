import type { ShellKind } from '../logic/shells';
import { FOOT, FRAME } from './frame';

/**
 * Frame x of the middle of each shell's opening (see shellArt.ts, which
 * draws its mouths here). They differ a lot: a bottle cap's is far back,
 * a bulb's out on its screw base.
 */
export const MOUTH_X: Readonly<Record<ShellKind, number>> = {
  periwinkle: -14 + 38 * 0.78,
  bottlecap: 5,
  snail: -14 + 38 * 0.78,
  bulb: 17,
  can: 9,
  whelk: 12,
  moonsnail: -18 + 44 * 0.78,
  jar: 12,
  coconut: 6,
  conch: 8,
};

/** Crab-frame x that sits in the middle of the opening: a little inside the back of its head shield. */
const SEAT_X = 15;
/** Local x of the shared anchor, which both drawings scale about. */
const FOOT_X = FOOT.x - FRAME / 2;

/**
 * How far (world px, facing right) to slide the crab drawing so it comes out
 * of the opening rather than standing beside it. `unit` and `body` are the
 * shell's and the crab's scales, frame px to world px.
 */
export function crabShift(kind: ShellKind, unit: number, body: number): number {
  return (MOUTH_X[kind] - FOOT_X) * unit - (SEAT_X - FOOT_X) * body;
}
