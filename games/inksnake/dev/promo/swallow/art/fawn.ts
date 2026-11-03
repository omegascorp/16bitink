import type { Draw } from '../../../../src/art/kit';
import { type DeerBuild, type DeerCoat, paintDeer } from './deerKit';
import type { MealArt } from './index';

/**
 * A white-tailed deer fawn, about 35 lb, from above, 'limp' (see index.ts):
 * the warm reddish-brown coat with rows of white spots either side of the
 * dark spine, the belly's pale edge at the flanks, a big head with big ears
 * laid back, long slim legs with small dark hooves, a short white-fringed tail.
 */
const COAT: DeerCoat = {
  base: '#a8653c',
  deep: '#5a3119',
  dark: '#3e2313',
  light: '#cf9566',
  pale: '#ecd9bb',
  warm: '#bd7442',
  white: '#fdf7ea',
  face: '#a36540',
  muzzle: '#6e4a36',
  leg: '#a8774f',
  hoof: '#3a2c25',
  nose: '#1f1a1a',
  ear: '#9c6847',
  earRim: '#3a2618',
};

const BUILD: DeerBuild = {
  poll: 26,
  face: [[-2.8, 0], [-2.3, 4], [0, 5.4], [3.8, 6.2], [7, 6.5], [10, 5.3], [13.5, 4.2], [17, 3.4], [20.5, 2.9], [22.6, 1.9], [23.3, 0]],
  trunk: [[27, 4.6], [21, 5.2], [14.5, 7], [9, 9.2], [1, 10.6], [-10, 11.1], [-22, 11], [-33, 10.4], [-42, 9], [-50, 0]],
  ear: { len: 17.5, w: 3.2 },
  eye: { x: 7.3, y: 4.6, r: 1.7 },
  fore: { root: { x: 6, y: 6.5 }, joint: { x: -7, y: 13.4 }, hoof: { x: -24, y: 13.2 }, widths: [[0, 4.8], [0.3, 3.4], [0.5, 2.3], [0.85, 1.8], [0.95, 2.1], [1, 1.9]] },
  hind: { root: { x: -38, y: 6 }, joint: { x: -64, y: 6.4 }, hoof: { x: -88, y: 4 }, widths: [[0, 11], [0.24, 8.4], [0.44, 3.3], [0.56, 2.5], [0.88, 1.9], [0.95, 2.2], [1, 2]] },
  hoof: 1.3,
  tail: { from: -46.5, len: 12, w: 4 },
  hair: 1.9,
  hairs: 2300,
  spots: true,
  throat: false,
  seed: 9400,
};

export const FAWN: MealArt = {
  art: { frame: 190, res: 2.5, poses: ['limp'] as const, draw: (d: Draw) => paintDeer(d, BUILD, COAT) },
  len: 100,
  cm: 90,
};
