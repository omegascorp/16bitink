import type { KitEntry } from '../../foodchain/kit';
import type { DrawHead } from './contract';
import { drawShark, type SharkSpec } from './sharkHead';

/**
 * The great white's head, in head units (100 = snout tip to the last gill
 * slit, the bite point at 0,0, facing right), drawn after the foodchain
 * painting's shape: a pointed conical snout, the slate back breaking off
 * raggedly to a white belly, five long gill slits, the tall dorsal fin and the
 * long sickle pectoral. Broad triangular serrated uppers, narrower lowers.
 */
export const WHITE: SharkSpec = {
  seed: 7301,
  back: [
    { x: 21.4, y: -17.6 }, { x: 19.6, y: -22 }, { x: 12.5, y: -29.8 }, { x: -2, y: -39 }, { x: -23, y: -47.5 },
    { x: -52, y: -55 }, { x: -87, y: -60.2 }, { x: -122, y: -61.2 }, { x: -158, y: -58.8 }, { x: -185, y: -55 },
  ],
  under: [{ x: 21.4, y: -17.6 }, { x: 18.6, y: -12.4 }, { x: 11.5, y: -6.8 }, { x: 1.9, y: -3.3 }],
  mouth: [{ x: 1.9, y: -3.3 }, { x: -9.7, y: -0.9 }, { x: -22.2, y: 0.6 }, { x: -35.4, y: 1.4 }],
  chin: [
    { x: 1.9, y: -3.3 }, { x: 1.4, y: 1.4 }, { x: -3, y: 5.6 }, { x: -12.8, y: 9.6 }, { x: -24, y: 12.8 },
    { x: -34, y: 14.9 }, { x: -43, y: 16.2 }, { x: -52, y: 17.2 },
  ],
  cheek: [{ x: -35.4, y: 1.4 }, { x: -40, y: 6.5 }, { x: -46, y: 12.5 }, { x: -52, y: 17.2 }],
  belly: [{ x: -52, y: 17.2 }, { x: -84, y: 19.6 }, { x: -122, y: 20.2 }, { x: -160, y: 17.4 }, { x: -185, y: 15 }],
  shade: [
    { x: 23, y: -17 }, { x: 9.7, y: -13 }, { x: -5.8, y: -10.3 }, { x: -25.3, y: -8.3 }, { x: -44.7, y: -8.7 },
    { x: -58, y: -5.6 }, { x: -74, y: -8.7 }, { x: -93, y: -6.4 }, { x: -113, y: -11 }, { x: -136, y: -8.7 },
    { x: -161, y: -13.4 }, { x: -195, y: -12 },
  ],
  dorsal: [
    { x: -93.8, y: -60.9 }, { x: -103.9, y: -79.5 }, { x: -115.6, y: -100.5 }, { x: -126.8, y: -116 }, { x: -133.5, y: -121 },
    { x: -134.2, y: -113.8 }, { x: -137, y: -96.7 }, { x: -142.4, y: -78.7 }, { x: -149.8, y: -65.9 }, { x: -158.4, y: -58.9 },
    { x: -126, y: -54 },
  ],
  pectoral: [
    { x: -78.2, y: 2.2 }, { x: -86, y: 17 }, { x: -99.2, y: 34.1 }, { x: -117, y: 51.6 }, { x: -137.4, y: 64.4 },
    { x: -132.7, y: 56.7 }, { x: -123.7, y: 42.6 }, { x: -115.6, y: 27.1 }, { x: -109.3, y: 15.4 }, { x: -103.9, y: 7.6 }, { x: -78.2, y: 2.2 },
  ],
  gills: [
    { x: -49.4, top: -35.6, bottom: 1 }, { x: -56.8, top: -37.2, bottom: 2.6 }, { x: -64.2, top: -38, bottom: 3.4 },
    { x: -71.6, top: -38, bottom: 3 }, { x: -78.6, top: -37.2, bottom: 1 },
  ],
  eye: { x: -14.4, y: -22.7 },
  eyeR: 2.7,
  colours: { slate: '#56636f', dark: '#1c232b', sheen: '#e3eaf0', cool: '#55687c' },
  gape: 0.98,
  lift: 0.26,
  protrude: { x: 2.6, y: 2.4 },
  tip: 0.13,
  upper: { count: 10, len: [6.4, 3.4], wide: [5, 3.2], kind: 'broad', rake: [0.04, 0.32] },
  lower: { count: 10, len: [6.6, 3.6], wide: [3.9, 2.5], kind: 'narrow', rake: [-0.08, 0.14] },
  gum: 3,
  rect: { x0: -185, x1: 34, y0: -128, y1: 72 },
  weight: 1,
};

export const drawGreatWhite: DrawHead = (ctx, p) => drawShark(ctx, WHITE, p);

export async function prepare(): Promise<void> {
  // Painted live: nothing to bake.
}

export const KIT: KitEntry = {
  name: 'greatWhite',
  draw: (ctx, w, h, t) => drawGreatWhite(ctx, { x: w * 0.72, y: h * 0.55, size: Math.min(w, h) * 0.55, jaw: 0.5 + 0.5 * Math.sin(t * 2), t }),
};
