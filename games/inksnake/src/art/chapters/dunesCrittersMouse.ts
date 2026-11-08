import { drawRodent, type RodentLook, type RodentPose, TAILS } from '../critters/preyRodent';
import type { SpriteArt } from '../types';

/**
 * The desert pocket mouse, seen from above facing +x: a tiny sandy mouse,
 * about 18 long in the body, pale buff above finely ticked with dark hairs,
 * creamy white at the edges of its coat; small round ears (smaller than a
 * house mouse's), big dark eyes, and a long furred tail, sandy above and
 * pale below (not pink and naked). It sits with its tail curled round
 * ('idle') and scurries in two strides ('run0', 'run1').
 */
type Pose = 'idle' | 'run0' | 'run1';

const LOOK: RodentLook = {
  len: 18, wide: 10.5,
  fur: '#c4a47a', warm: '#cf9a5a', back: '#8f7454', pale: '#efe3c8', deep: '#5a4632',
  pink: '#e6bea8', pinkDeep: '#b88670', tail: '#cdb592', tailDeep: '#8a7154',
  earR: 1.85, eyeR: 1.05, snout: 0.15,
  tailLen: 22, tailW: 1.5, ring: 1.4, ringAlpha: 0.12,
  hairLen: 1.25, hairN: 380, guard: 0, tuft: 1, line: 0.5, whisker: 6, seed: 5301,
};

const POSES: Readonly<Record<Pose, RodentPose>> = {
  idle: { sx: 0.92, sy: 1.08, bend: 0, fore: [0, 0], hind: [0, 0], sit: true, tail: TAILS.curl },
  run0: { sx: 1.05, sy: 0.94, bend: 0.45, fore: [0.14, -0.06], hind: [-0.1, 0.1], sit: false, tail: TAILS.swing(-1) },
  run1: { sx: 1.05, sy: 0.94, bend: -0.45, fore: [-0.06, 0.14], hind: [0.1, -0.1], sit: false, tail: TAILS.swing(1) },
};

export const POCKET_MOUSE_ART: SpriteArt<Pose> = {
  frame: 48,
  res: 3,
  poses: ['idle', 'run0', 'run1'],
  draw: (d, pose) => drawRodent(d, LOOK, POSES[pose]),
};
