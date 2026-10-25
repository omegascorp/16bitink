import type { SpriteArt } from '../types';
import { CRITTER_POSES, type CritterPose } from './poses';
import { drawRodent, type RodentLook, type RodentPose, TAILS } from './preyRodent';

/**
 * The mouse: a small brown-grey field mouse, paler at the edges of its coat,
 * with big round pink ears, bead eyes, long whiskers and a thin pink tail.
 * Body 26 × 13 board px; it sits with its tail curled round it, and runs
 * in two strides with the tail swinging.
 */
const LOOK: RodentLook = {
  len: 26, wide: 13,
  fur: '#a38a70', warm: '#b98a52', back: '#76604c', pale: '#e2d4bb', deep: '#4a3a2e',
  pink: '#eaa9a2', pinkDeep: '#bd6f6d', tail: '#e2b2a8', tailDeep: '#a87470',
  earR: 3.1, eyeR: 1.2, snout: 0,
  tailLen: 27, tailW: 1.7, ring: 1.2, ringAlpha: 0.32,
  hairLen: 1.5, hairN: 460, guard: 0, tuft: 1, line: 0.55, whisker: 7, seed: 4101,
};

const POSES: Record<CritterPose<'mouse'>, RodentPose> = {
  idle: { sx: 0.9, sy: 1.07, bend: 0, fore: [0, 0], hind: [0, 0], sit: true, tail: TAILS.curl },
  run0: { sx: 1.04, sy: 0.95, bend: 0.5, fore: [0.14, -0.06], hind: [-0.1, 0.1], sit: false, tail: TAILS.swing(-1) },
  run1: { sx: 1.04, sy: 0.95, bend: -0.5, fore: [-0.06, 0.14], hind: [0.1, -0.1], sit: false, tail: TAILS.swing(1) },
};

export const MOUSE: SpriteArt<CritterPose<'mouse'>> = {
  frame: 64,
  res: 3,
  poses: CRITTER_POSES.mouse,
  draw: (d, pose) => drawRodent(d, LOOK, POSES[pose]),
};
