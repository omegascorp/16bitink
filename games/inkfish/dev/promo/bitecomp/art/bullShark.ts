import type { KitEntry } from '../../foodchain/kit';
import type { DrawHead } from './contract';
import { drawShark, type SharkSpec } from './sharkHead';

/**
 * The bull shark's head, in head units (100 = snout tip to the last gill
 * slit, the bite point at 0,0, facing right): a short, broad, bluntly rounded
 * snout, a small eye, a stocky body, plain grey over white with a soft line
 * between, a broad triangular first dorsal and big pectorals. Triangular
 * serrated uppers, narrow pointed lowers.
 */
const BULL: SharkSpec = {
  seed: 4410,
  back: [
    { x: 13.4, y: -13.6 }, { x: 12.6, y: -19 }, { x: 9.4, y: -25.4 }, { x: 2.6, y: -31.4 }, { x: -12, y: -38.4 },
    { x: -36, y: -46 }, { x: -68, y: -52 }, { x: -104, y: -55 }, { x: -140, y: -55 }, { x: -185, y: -50 },
  ],
  under: [{ x: 13.4, y: -13.6 }, { x: 12.4, y: -8.8 }, { x: 8.6, y: -4.6 }, { x: 1.6, y: -2.1 }],
  mouth: [{ x: 1.6, y: -2.1 }, { x: -9, y: 0 }, { x: -21, y: 1.4 }, { x: -33, y: 2.2 }],
  chin: [
    { x: 1.6, y: -2.1 }, { x: 1.4, y: 2.6 }, { x: -2.6, y: 6.8 }, { x: -11.6, y: 10.8 }, { x: -22.6, y: 14.2 },
    { x: -33, y: 16.6 }, { x: -42, y: 18.2 }, { x: -52, y: 19.4 },
  ],
  cheek: [{ x: -33, y: 2.2 }, { x: -38, y: 8 }, { x: -45, y: 14.6 }, { x: -52, y: 19.4 }],
  belly: [{ x: -52, y: 19.4 }, { x: -84, y: 23 }, { x: -122, y: 24 }, { x: -160, y: 21.4 }, { x: -185, y: 18.6 }],
  shade: [
    { x: 14.4, y: -12.6 }, { x: 3, y: -9.6 }, { x: -13, y: -8.4 }, { x: -34, y: -6.2 }, { x: -60, y: -4 },
    { x: -90, y: -2.6 }, { x: -120, y: -4.4 }, { x: -160, y: -3.4 }, { x: -195, y: -2.4 },
  ],
  dorsal: [
    { x: -92, y: -54.4 }, { x: -102, y: -72 }, { x: -114, y: -90 }, { x: -124, y: -100.6 }, { x: -129.4, y: -101.4 },
    { x: -131, y: -94 }, { x: -134, y: -80 }, { x: -139, y: -66 }, { x: -146, y: -57.6 }, { x: -152, y: -54.6 },
    { x: -120, y: -50 },
  ],
  pectoral: [
    { x: -74, y: 6 }, { x: -82, y: 20 }, { x: -94, y: 36 }, { x: -110, y: 51 }, { x: -129, y: 61 },
    { x: -127, y: 51 }, { x: -120, y: 38 }, { x: -112, y: 24 }, { x: -104, y: 13 }, { x: -96, y: 8 }, { x: -74, y: 6 },
  ],
  gills: [
    { x: -50, top: -29, bottom: 0.6 }, { x: -57, top: -30.4, bottom: 1.8 }, { x: -64, top: -31, bottom: 2.4 },
    { x: -71, top: -30.6, bottom: 2.2 }, { x: -78, top: -29.6, bottom: 1 },
  ],
  eye: { x: -15.6, y: -20.4 },
  eyeR: 2.1,
  colours: { slate: '#6a7076', dark: '#22272c', sheen: '#e4e8ea', cool: '#5d6b78' },
  gape: 0.94,
  lift: 0.22,
  protrude: { x: 2.2, y: 2 },
  tip: 0.12,
  upper: { count: 10, len: [4.6, 2.8], wide: [4.2, 2.8], kind: 'broad', rake: [0.06, 0.34] },
  lower: { count: 10, len: [4.8, 2.8], wide: [2.1, 1.6], kind: 'narrow', rake: [-0.06, 0.1] },
  gum: 2.6,
  rect: { x0: -185, x1: 26, y0: -108, y1: 70 },
  weight: 1,
  soft: true,
};

/** The painted bull shark's head and front: blunt snout, small eye, grey over white, biting with its upper jaw thrust out. */
export const drawBullShark: DrawHead = (ctx, p) => drawShark(ctx, BULL, p);

export async function prepare(): Promise<void> {
  // Painted live: nothing to bake.
}

export const KIT: KitEntry = {
  name: 'bullShark',
  draw: (ctx, w, h, t) => drawBullShark(ctx, { x: w * 0.72, y: h * 0.55, size: Math.min(w, h) * 0.55, jaw: 0.5 + 0.5 * Math.sin(t * 2), t }),
};
