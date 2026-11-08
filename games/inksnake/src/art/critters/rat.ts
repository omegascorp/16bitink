import type { SpriteArt } from '../types';
import { CRITTER_POSES, type CritterPose } from './poses';
import { drawRodent, type RodentLook, type RodentPose, TAILS } from './preyRodent';

/**
 * The rat: a big brown rat, clearly not a mouse: a heavier body with a
 * blunt snout, small ears, a rough shaggy coat with long dark guard hairs
 * and a thick, scaly pink-grey tail. Body 58 × 30 board px; it sits with
 * its tail curled round it, and runs in two strides with the tail swinging.
 */
const LOOK: RodentLook = {
  len: 58, wide: 30,
  fur: '#8a6a4b', warm: '#9c6936', back: '#56402d', pale: '#c2ab8d', deep: '#2f2219',
  pink: '#d99c92', pinkDeep: '#a1625c', tail: '#c7a39a', tailDeep: '#76605b',
  earR: 4.6, eyeR: 1.75, snout: 1,
  tailLen: 50, tailW: 4.6, ring: 1.5, ringAlpha: 0.62,
  hairLen: 3, hairN: 1000, guard: 200, tuft: 2, line: 0.95, whisker: 13, seed: 5203,
};

const POSES: Record<CritterPose<'rat'>, RodentPose> = {
  idle: { sx: 0.92, sy: 1.05, bend: 0, fore: [0, 0], hind: [0, 0], sit: true, tail: TAILS.curl },
  run0: { sx: 1.03, sy: 0.96, bend: 1, fore: [0.12, -0.05], hind: [-0.09, 0.09], sit: false, tail: TAILS.swing(-1) },
  run1: { sx: 1.03, sy: 0.96, bend: -1, fore: [-0.05, 0.12], hind: [0.09, -0.09], sit: false, tail: TAILS.swing(1) },
};

export const RAT: SpriteArt<CritterPose<'rat'>> = {
  frame: 124,
  res: 3,
  poses: CRITTER_POSES.rat,
  draw: (d, pose) => drawRodent(d, LOOK, POSES[pose]),
};
