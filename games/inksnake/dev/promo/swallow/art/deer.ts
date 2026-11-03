import type { Draw } from '../../../../src/art/kit';
import { type DeerBuild, type DeerCoat, paintDeer } from './deerKit';
import type { MealArt } from './index';

/**
 * An adult white-tailed deer, a doe (no antlers), about 77 lb, from above,
 * 'limp' (see index.ts): the grey-brown winter coat, darker down the spine
 * and paler to the flanks, the white throat patch showing past the jaw, the
 * white eye ring and muzzle band behind the black nose, big ears laid back,
 * slim legs with black hooves, the tail's white underside fringing it.
 */
const COAT: DeerCoat = {
  base: '#8b7a68',
  deep: '#4b3e33',
  dark: '#30271f',
  light: '#b9a892',
  pale: '#ddd1bd',
  warm: '#9e8063',
  white: '#fbf6ec',
  face: '#8a7562',
  muzzle: '#5d5148',
  leg: '#9a7f63',
  hoof: '#1d1918',
  nose: '#1a1718',
  ear: '#857463',
  earRim: '#2e2620',
};

const BUILD: DeerBuild = {
  poll: 29.8,
  face: [[-2.5, 0], [-2, 3.4], [0, 4.6], [3.5, 5.3], [6.5, 5.6], [9, 4.6], [12, 3.7], [15, 3.1], [18, 2.7], [19.6, 1.8], [20.2, 0]],
  trunk: [[30.5, 4.2], [24, 4.9], [17, 7.2], [11, 9.8], [3, 11.4], [-9, 12], [-21, 11.8], [-33, 11.2], [-42, 9.6], [-50, 0]],
  ear: { len: 15.5, w: 2.7 },
  eye: { x: 6.4, y: 3.9, r: 1.45 },
  fore: { root: { x: 8, y: 7 }, joint: { x: -5, y: 14.4 }, hoof: { x: -20, y: 14 }, widths: [[0, 5.2], [0.3, 3.8], [0.5, 2.6], [0.85, 2.1], [0.95, 2.4], [1, 2.2]] },
  hind: { root: { x: -38, y: 6.5 }, joint: { x: -62, y: 6.8 }, hoof: { x: -83, y: 4.2 }, widths: [[0, 12], [0.24, 9.4], [0.44, 3.8], [0.56, 2.8], [0.88, 2.2], [0.95, 2.5], [1, 2.3]] },
  hoof: 1.6,
  tail: { from: -46, len: 19, w: 5 },
  hair: 2.2,
  hairs: 2400,
  spots: false,
  throat: true,
  seed: 9500,
};

export const DEER: MealArt = {
  art: { frame: 180, res: 2.5, poses: ['limp'] as const, draw: (d: Draw) => paintDeer(d, BUILD, COAT) },
  len: 100,
  cm: 140,
};
