import { type Draw, pt } from '../kit';
import type { SpriteArt } from '../types';
import { softShadow } from './barrensCrittersBeast';
import { CROC_U, type CrocLeg, crocBody, type CrocPaint, paintCroc } from './floodedCrittersCroc';
import { film, rings, wake } from './floodedCrittersKit';

/**
 * The young caiman from above facing +x, about 105 long: olive and
 * yellowish with bold dark crossbands (a juvenile's colours), golden eyes
 * on their raised orbits, the bony spectacle between them. 'idle' floats
 * at rest, legs sprawled, the tail's end trailing under the surface;
 * 'swim0', 'swim1' tuck the legs back along the body and sweep the tail.
 */
type Pose = 'idle' | 'swim0' | 'swim1';

export const YOUNG_CAIMAN: CrocPaint = {
  base: '#8b8a4e',
  deep: '#3b3a22',
  light: '#c6bf78',
  band: '#2f3120',
  scute: '#7b7a44',
  head: '#9a9258',
  jaw: '#e0d6a0',
  foot: '#77743f',
  iris: '#c9a43a',
};

const LEN = 104;

const SPRAWL: readonly CrocLeg[] = [
  { u: CROC_U.fore, side: 1, elbow: [-2, 7], foot: [4, 11], hind: false },
  { u: CROC_U.fore, side: -1, elbow: [-1, 7], foot: [5, 10.5], hind: false },
  { u: CROC_U.hind, side: 1, elbow: [3, 8], foot: [-3, 13], hind: true },
  { u: CROC_U.hind, side: -1, elbow: [2, 8.5], foot: [-4, 12.5], hind: true },
];

/** Swimming, the legs lie back against the flanks. */
const TUCK: readonly CrocLeg[] = [
  { u: CROC_U.fore, side: 1, elbow: [-5, 3.5], foot: [-10, 4.5], hind: false },
  { u: CROC_U.fore, side: -1, elbow: [-5, 3.5], foot: [-10, 4.5], hind: false },
  { u: CROC_U.hind, side: 1, elbow: [-5, 3], foot: [-11, 3.5], hind: true },
  { u: CROC_U.hind, side: -1, elbow: [-5, 3], foot: [-11, 3.5], hind: true },
];

const BEND: Readonly<Record<Pose, (u: number) => number>> = {
  idle: (u) => 7 * Math.max(0, u - 0.45) ** 2 * 4,
  swim0: (u) => 14 * Math.sin(Math.max(0, u - 0.3) * 4.2) * Math.max(0, u - 0.3) - 1.5 * u,
  swim1: (u) => -14 * Math.sin(Math.max(0, u - 0.3) * 4.2) * Math.max(0, u - 0.3) + 1.5 * u,
};

function draw(d: Draw, pose: Pose): void {
  const k = LEN / 108;
  const b = crocBody(pt(52, 0), LEN, BEND[pose]);
  const swim = pose !== 'idle';
  rings(d, b.at(0.3, 0), 30, 16, 2, 6601, swim ? 0.35 : 0.5);
  if (swim) wake(d, b.at(0.01, 0), 34, 14, 0.55);
  softShadow(d, [b.shape], pt(2.4, 3.6), 0.16, 1.6);
  paintCroc(d, b, YOUNG_CAIMAN, swim ? TUCK : SPRAWL, k, { bands: 0.6 });
  // The tail's end lies just under the surface.
  const tail = [...Array.from({ length: 12 }, (_, i) => b.at(0.74 + i * 0.024, 1.4)), ...Array.from({ length: 12 }, (_, i) => b.at(1.02 - i * 0.024, -1.4))];
  film(d, tail, 0.35, 6602);
}

export const YOUNG_CAIMAN_ART: SpriteArt<Pose> = { frame: 130, res: 2, poses: ['idle', 'swim0', 'swim1'], draw };
