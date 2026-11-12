import { C, ring, type Anatomy, type Kit } from '../../../../src/art/fish/kit';
import { ANATOMY } from '../../../../src/art/fish/registry';

/**
 * The school of round 1: five tunas, every one an obligate ram ventilator
 * (Bushnell et al. 1990, NOAA SWFSC: skipjack, yellowfin, bigeye; Wegner et
 * al. 2013, J Morphol: Thunnus must ram-ventilate). Skipjack is the game's own
 * tuna; the other four are Anatomy variants of it, drawn by the same fishArt.
 * No mackerel or bonito: mackerels only ram-ventilate at speed.
 */

const TUNA = ANATOMY.tuna;
const base = (k: Kit): void => TUNA.extras?.(k);

const YELLOW = '#f2c41a';

/** Yellow finlets along the back and belly behind the second dorsal and anal fins. */
function yellowFinlets(k: Kit): void {
  for (let i = 0; i < 6; i++) {
    const t = 0.69 + i * 0.045;
    const h = k.h(t);
    k.pen.fill(ring(k.x(t), C - h * 1.02, 2.4, 2.4), YELLOW, 0.95);
    k.pen.fill(ring(k.x(t), C + h * 0.92, 2.4, 2.4), YELLOW, 0.95);
  }
}

/** Yellowfin (Thunnus albacares): a long yellow second dorsal and anal fin, yellow finlets, a gold stripe down the side. */
export const YELLOWFIN: Anatomy = {
  ...TUNA,
  dorsal2: { from: 0.54, to: 0.62, height: 1.6, tri: true },
  anal: { from: 0.57, to: 0.65, height: 1.5, tri: true },
  finWash: YELLOW,
  extras: (k) => {
    base(k);
    const stripe = Array.from({ length: 18 }, (_, i) => {
      const t = 0.12 + i * 0.042;
      return { x: k.x(t), y: C - k.h(t) * 0.1 };
    });
    k.pen.stroke(stripe, 3.2, '#e8a812', 0.9, false);
    yellowFinlets(k);
  },
};

/** Bluefin (Thunnus thynnus): bigger and deeper, a deep blue-black back, short fins. */
export const BLUEFIN: Anatomy = {
  ...TUNA,
  hh: TUNA.hh * 1.12,
  dorsal: { from: 0.3, to: 0.42, height: 0.55, tri: true },
  dorsal2: { from: 0.54, to: 0.61, height: 0.5, tri: true },
  anal: { from: 0.57, to: 0.64, height: 0.45, tri: true },
  pectoral: 0.4,
  extras: (k) => {
    base(k);
    k.pen.clipped(k.body, () => {
      const back = Array.from({ length: 26 }, (_, i) => {
        const t = i / 25;
        return { x: k.x(t), y: C - k.h(t) * 0.05 };
      });
      k.pen.fill([...back, ...[...back].reverse().map((p) => ({ x: p.x, y: C - 80 }))], '#0d1c40', 0.55);
    });
  },
};

/** Bigeye (Thunnus obesus): plump, with a big eye. */
export const BIGEYE: Anatomy = { ...TUNA, hh: TUNA.hh * 1.18, peak: 0.44, blunt: 0.52, eye: { t: 0.15, r: 12 } };

/** Albacore (Thunnus alalunga): very long pectoral fins. */
export const ALBACORE: Anatomy = { ...TUNA, pectoral: 1.25 };
