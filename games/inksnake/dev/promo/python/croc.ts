import { type Draw, pt } from '../../../src/art/kit';
import { softShadow } from '../../../src/art/chapters/barrensCrittersBeast';
import { CROC_U, type CrocLeg, type CrocPaint, paintCroc } from '../../../src/art/chapters/floodedCrittersCroc';
import { bentSpine, bodyAlong, type Body } from '../../../src/art/chapters/floodedCrittersKit';
import type { SpriteArt } from '../../../src/art/types';

/**
 * The freshwater crocodile (Crocodylus johnstoni) from above facing +x,
 * 104 long: the game's caiman painter (floodedCrittersCroc.ts: scutes,
 * crossbands, orbits, claws) on a body with a long NARROW snout, in the
 * freshwater croc's pale brown with dark bands. 'swim0' and 'swim1' tuck the
 * legs back and sweep the tail either way, 'face' lies straight with its
 * teeth showing. The origin is the middle of the body: the snout's tip is
 * CROC_SNOUT ahead of it.
 */
export type CrocPose = 'swim0' | 'swim1' | 'face';

export const CROC_LEN = 104;
/** From the frame's centre to the snout's tip, art units. */
export const CROC_SNOUT = CROC_LEN / 2;

const FRESHWATER: CrocPaint = {
  base: '#9b8a62',
  deep: '#3b3220',
  light: '#d2c493',
  band: '#4a3b24',
  scute: '#85775a',
  head: '#a8976a',
  jaw: '#ece1b6',
  foot: '#8a7b58',
  iris: '#c9a43a',
};

/** Half widths along the body (u, half width at len 108): the caiman's, but the snout long and thin. */
const KNOTS: readonly (readonly [number, number])[] = [[0, 0], [0.012, 2], [0.03, 2.6], [0.1, 3], [0.165, 3.8], [0.2, 5], [0.235, 5.6], [0.3, 9], [0.38, 10.4], [0.45, 9.4], [0.52, 7], [0.7, 4.2], [0.88, 2], [1, 0.4]];

function half(u: number, k: number): number {
  for (let i = 1; i < KNOTS.length; i++) {
    const [u1, w1] = KNOTS[i]!;
    const [u0, w0] = KNOTS[i - 1]!;
    if (u <= u1) {
      const t = (u - u0) / (u1 - u0);
      if (i === 1) return w1 * Math.sqrt(t) * k;
      return (w0 + (w1 - w0) * (1 - Math.cos(Math.PI * t)) * 0.5) * k;
    }
  }
  return 0.4 * k;
}

const TUCK: readonly CrocLeg[] = [
  { u: CROC_U.fore, side: 1, elbow: [-5, 3.5], foot: [-10, 4.5], hind: false },
  { u: CROC_U.fore, side: -1, elbow: [-5, 3.5], foot: [-10, 4.5], hind: false },
  { u: CROC_U.hind, side: 1, elbow: [-5, 3], foot: [-11, 3.5], hind: true },
  { u: CROC_U.hind, side: -1, elbow: [-5, 3], foot: [-11, 3.5], hind: true },
];

const BEND: Readonly<Record<CrocPose, (u: number) => number>> = {
  swim0: (u) => 14 * Math.sin(Math.max(0, u - 0.3) * 4.2) * Math.max(0, u - 0.3) - 1.5 * u,
  swim1: (u) => -14 * Math.sin(Math.max(0, u - 0.3) * 4.2) * Math.max(0, u - 0.3) + 1.5 * u,
  face: (u) => 2.5 * Math.sin(u * 5),
};

export function crocBody(pose: CrocPose): Body {
  const k = CROC_LEN / 108;
  return bodyAlong(bentSpine(pt(CROC_SNOUT, 0), CROC_LEN, BEND[pose], 40), (u) => half(u, k));
}

function draw(d: Draw, pose: CrocPose): void {
  const k = CROC_LEN / 108;
  const b = crocBody(pose);
  softShadow(d, [b.shape], pt(2.4, 3.6), 0.16, 1.6);
  paintCroc(d, b, FRESHWATER, TUCK, k, pose === 'face' ? { bands: 0.6, teeth: true } : { bands: 0.6 });
}

export const FRESHWATER_CROC_ART: SpriteArt<CrocPose> = { frame: 130, res: 2, poses: ['swim0', 'swim1', 'face'], draw };
