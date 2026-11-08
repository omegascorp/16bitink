import type { KitEntry } from '../../foodchain/kit';
import type { DrawHead } from './contract';
import { drawShark, type SharkSpec } from './sharkHead';
import { megaScars } from './sharkMega';

/**
 * Megalodon's head, in head units (100 = snout tip to the last gill slit, the
 * bite point at 0,0, facing right): built heavier than the great white, not
 * copied from it. A short blunt snout, a deep skull and a thick neck, a long
 * mouth on a deep, heavy lower jaw that drops wider, dark charcoal over a
 * greyed belly, old scars, and huge broad serrated teeth in neat rows.
 */
const MEGA: SharkSpec = {
  seed: 9907,
  back: [
    { x: 14.5, y: -21 }, { x: 13.2, y: -28 }, { x: 8, y: -38 }, { x: -4, y: -50 }, { x: -24, y: -61 },
    { x: -52, y: -70 }, { x: -86, y: -76 }, { x: -122, y: -78 }, { x: -158, y: -76 }, { x: -185, y: -72 },
  ],
  under: [{ x: 14.5, y: -21 }, { x: 13.6, y: -14 }, { x: 9, y: -8 }, { x: 1.8, y: -4.6 }],
  mouth: [{ x: 1.8, y: -4.6 }, { x: -14, y: -1.2 }, { x: -31, y: 0.8 }, { x: -49, y: 2.2 }],
  chin: [
    { x: 1.8, y: -4.6 }, { x: 2, y: 2.6 }, { x: -2, y: 10 }, { x: -12, y: 16.6 }, { x: -26, y: 21.6 },
    { x: -40, y: 24.6 }, { x: -52, y: 26.4 }, { x: -62, y: 27.6 },
  ],
  cheek: [{ x: -49, y: 2.2 }, { x: -53, y: 10 }, { x: -57, y: 19 }, { x: -62, y: 27.6 }],
  belly: [{ x: -62, y: 27.6 }, { x: -92, y: 31 }, { x: -127, y: 32 }, { x: -160, y: 29 }, { x: -185, y: 26 }],
  shade: [
    { x: 15.5, y: -20 }, { x: 5, y: -16 }, { x: -10, y: -13.5 }, { x: -30, y: -11.5 }, { x: -52, y: -10 },
    { x: -72, y: -6.5 }, { x: -96, y: -10.5 }, { x: -120, y: -7.5 }, { x: -150, y: -11.5 }, { x: -195, y: -8.5 },
  ],
  dorsal: [
    { x: -98, y: -77 }, { x: -109, y: -99 }, { x: -121, y: -121 }, { x: -132, y: -137 }, { x: -139, y: -142 },
    { x: -140, y: -134 }, { x: -143, y: -116 }, { x: -149, y: -97 }, { x: -157, y: -83 }, { x: -166, y: -75.6 },
    { x: -132, y: -71 },
  ],
  pectoral: [
    { x: -84, y: 10 }, { x: -93, y: 28 }, { x: -107, y: 47 }, { x: -126, y: 65 }, { x: -148, y: 78 },
    { x: -143, y: 68 }, { x: -133, y: 53 }, { x: -124, y: 37 }, { x: -117, y: 24 }, { x: -110, y: 14 }, { x: -84, y: 10 },
  ],
  gills: [
    { x: -55.5, top: -48, bottom: 6 }, { x: -63, top: -50, bottom: 8 }, { x: -70.5, top: -51, bottom: 9 },
    { x: -78, top: -50.6, bottom: 8.4 }, { x: -85.5, top: -49, bottom: 6 },
  ],
  eye: { x: -19, y: -28.5 },
  eyeR: 2.3,
  colours: { slate: '#36404a', dark: '#0b0f14', sheen: '#d0d9e1', cool: '#4a596a', tint: 'rgba(150,148,136,0.16)', glaze: 0.3 },
  gape: 1.08,
  lift: 0.24,
  protrude: { x: 3.4, y: 3.2 },
  tip: 0.14,
  upper: { count: 8, len: [10.5, 6], wide: [9.2, 6], kind: 'broad', rake: [0.02, 0.22] },
  lower: { count: 8, len: [9.4, 5.6], wide: [7.6, 5], kind: 'broad', rake: [-0.04, 0.12] },
  gum: 4,
  rect: { x0: -185, x1: 30, y0: -150, y1: 90 },
  weight: 1.25,
  marks: megaScars,
};

/** Megalodon: heavier and darker than the great white, scarred, its huge serrated teeth bared in a wide gape. */
export const drawMegalodon: DrawHead = (ctx, p) => drawShark(ctx, MEGA, p);

export async function prepare(): Promise<void> {
  // Painted live: nothing to bake.
}

export const KIT: KitEntry = {
  name: 'megalodon',
  draw: (ctx, w, h, t) => drawMegalodon(ctx, { x: w * 0.72, y: h * 0.55, size: Math.min(w, h) * 0.55, jaw: 0.5 + 0.5 * Math.sin(t * 2), t }),
};
