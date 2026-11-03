import type { Pt } from '../../../../src/art/pen';
import { pt } from '../../../../src/art/kit';
import { blotchShape } from '../../../../src/art/snakes/cornPaint';
import type { SnakeArt } from '../../../../src/art/types';
import { makePython, smooth, type PythonTone } from './pythonPaint';

/**
 * Burmese python (Python bivittatus, Florida): warm tan ground, huge irregular
 * chestnut blotches edged in black that interlock like jigsaw pieces down the
 * back, smaller ones along the flanks, a dark brown spearhead on the crown.
 */
const BURMESE: PythonTone = {
  seed: 71000,
  period: 120,
  count: 2,
  wash: [[0, '#e6cf9c'], [0.16, '#d6b982'], [0.45, '#bf9a64'], [0.75, '#9a7545'], [1, '#5e4527']],
  pale: '#f0dfae',
  deep: '#6e4f2c',
  shadow: '#2c1c0c',
  edge: '#4a3016',
  belly: '#efe0b6',
  base: '#c9a56e',
  back: { body: '#7a4524', lit: '#a2663a', deep: '#33180a', rim: '#150a04', halo: '#f0dfae', haloAlpha: 0.4 },
  flank: { body: '#6a3c1f', lit: '#9a6a3c', deep: '#2c1508', rim: '#150a04' },
  heart: ['#a8683a', '#c58a55'],
  backShapes: (i, step, rng) => {
    const cx = i * step + step / 2 + (rng() - 0.5) * 3;
    return [blotchShape(cx, 12 + (rng() - 0.5) * 1.5, 19 + rng() * 2.5, 8.2, 71100 + i * 7 + (i % 2) * 13, { rough: 0.34, pow: 1.9, notch: 0.22, lobe: 0.32, n: 72 })];
  },
  flankShapes: (i, step, rng) => {
    const x = i * step + (rng() - 0.5) * 3;
    return [
      blotchShape(x, 2.4, 8 + rng() * 2, 3.4, 71200 + i * 5, { rough: 0.3, pow: 2, lobe: 0.2, n: 32 }),
      blotchShape(x + (rng() - 0.5) * 5, 21.6, 8.5 + rng() * 2, 3.5, 71300 + i * 5, { rough: 0.3, pow: 2, lobe: 0.2, n: 32 }),
    ];
  },
  scale: { alpha: 0.34, gloss: 0.55 },
  head: {
    stripe: { body: '#4a2812', lit: '#6a3e20', deep: '#241206', rim: '#150a04' },
    arrow: { body: '#5a3016', lit: '#7e4a26', deep: '#2c1408', rim: '#150a04', halo: '#ecd9a8', haloAlpha: 0.5 },
    crown: '#c9a56e',
    iris: ['#e0b46a', '#a06a2c', '#2e1c0c'],
    plateLight: '#f2e2b8',
    mouthSide: '#d6b982',
    mottle: '#6e4f2c',
    arrowLength: 15.2,
  },
};

/**
 * African rock python (Python sebae, Kenya): grey-olive ground, dark brown
 * blotches that run together into wavy zigzag bands across the back, fine pale
 * edging, a dark spearhead with a pale stripe each side and an eye stripe.
 */
function zigzag(i: number, step: number, rng: () => number): Pt[][] {
  const c = i * step + step / 2 + (rng() - 0.5) * 3;
  const j = (a: number): number => (rng() - 0.5) * a;
  // A wavy band, chevron-shaped, reaching to the flanks and touching its neighbours.
  const pts = [
    pt(c - 8 + j(2), 1.4), pt(c - 1 + j(2), 2), pt(c + 6 + j(2), 2.6), pt(c + 11 + j(2), 1.4),
    pt(c + 14 + j(2), 7), pt(c + 7 + j(2), 12), pt(c + 14 + j(2), 18), pt(c + 10 + j(2), 22.6),
    pt(c + 2 + j(2), 21.6), pt(c - 5 + j(2), 22.4), pt(c - 12 + j(2), 22), pt(c - 8 + j(2), 17),
    pt(c - 14 + j(2), 12), pt(c - 9 + j(2), 7),
  ];
  return [smooth(pts, 3)];
}

const ROCK: PythonTone = {
  seed: 72000,
  period: 120,
  count: 3,
  wash: [[0, '#b8b394'], [0.16, '#a39f80'], [0.45, '#8b8767'], [0.75, '#6c6a4e'], [1, '#3e3d2b']],
  pale: '#cfcaa8',
  deep: '#4c4a35',
  shadow: '#1c1a10',
  edge: '#2e2c1c',
  belly: '#dcd6b4',
  base: '#8e8a6c',
  back: { body: '#4a3523', lit: '#6a4f34', deep: '#1e140a', rim: '#0e0a06', halo: '#cfcaa8', haloAlpha: 0.55 },
  flank: { body: '#43301f', lit: '#6a5238', deep: '#1c120a', rim: '#0e0a06', halo: '#bdb894', haloAlpha: 0.3 },
  heart: ['#6a4f34', '#80633f'],
  backShapes: zigzag,
  flankShapes: (i, step, rng) => {
    const x = i * step + step / 2 + 18 + (rng() - 0.5) * 3;
    return [
      blotchShape(x, 2.2, 6 + rng() * 1.5, 2.8, 72200 + i * 5, { rough: 0.25, pow: 2.2, n: 28 }),
      blotchShape(x, 21.8, 6 + rng() * 1.5, 2.8, 72300 + i * 5, { rough: 0.25, pow: 2.2, n: 28 }),
    ];
  },
  scale: { alpha: 0.4, gloss: 0.3 },
  head: {
    stripe: { body: '#2e1f12', lit: '#4a3420', deep: '#140c06', rim: '#0a0604' },
    arrow: { body: '#3e2a1a', lit: '#5e432a', deep: '#1a0f07', rim: '#0a0604', halo: '#d8d3b0', haloAlpha: 0.35 },
    paleStripe: '#d4cfae',
    crown: '#938f72',
    iris: ['#c9b27a', '#7a5f30', '#241a0c'],
    plateLight: '#dcd6b4',
    mouthSide: '#a39f80',
    mottle: '#4c4a35',
    arrowLength: 17,
  },
};

export const BURMESE_PYTHON: SnakeArt = makePython(BURMESE);
export const ROCK_PYTHON: SnakeArt = makePython(ROCK);
