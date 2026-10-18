import { backStipple, C, type Anatomy } from '../../../src/art/fish/kit';
import { INK } from '../../../src/art/pen';

/**
 * The two fish of the short, neither of which the game draws.
 *
 * The black swallower (Chiasmodon niger) as a game Anatomy, drawn by the
 * game's own fishArt (same pen, wash, hatching and boil as every fish in
 * InkFish): a small, slender, near-black fish with a big head, big eyes,
 * a long first-dorsal-then-second-dorsal back, and no mouth line (mouth
 * 'none'), because its hinged jaws are cut open and drawn by
 * swallowerArt.ts.
 *
 * The snake mackerel (Gempylus serpens) is too long and bendy for a
 * sprite: mackerel.ts draws it as a ribbon along a bent spine, from the
 * profile here.
 */

/** Charcoal skin, a touch warm, as the game's other near-black deep fish. */
export const SKIN = '#2b2730';
const SKIN_DARK = '#141118';

export const SWALLOWER: Anatomy = {
  hl: 86, hh: 19, peak: 0.3, blunt: 0.6, peduncle: 0.27, tail: 'fork', tailSize: 1.3,
  dorsal: { from: 0.3, to: 0.4, height: 0.7, spiny: true }, dorsal2: { from: 0.45, to: 0.88, height: 0.55 },
  anal: { from: 0.47, to: 0.88, height: 0.5 }, pectoral: 0.6, pelvic: true, scales: false,
  eye: { t: 0.1, r: 6.8 }, mouth: 'none', wash: SKIN, finWash: '#6a6474', finAlpha: 0.3, lateral: false,
  extras: (k) => {
    k.pen.fill(k.body, SKIN_DARK, 0.8);
    backStipple(1.2)(k);
    // A faint sheen along the flank so the ink still reads on near-black skin.
    k.pen.clipped(k.body, () => {
      const row = Array.from({ length: 16 }, (_, i) => {
        const t = 0.26 + (i / 15) * 0.62;
        return { x: k.x(t), y: C - k.h(t) * 0.42 };
      });
      k.pen.hair(row, 1.4, '#8a8496', 0.45);
    });
    // Its gill cover, picked out in a paler line on the dark.
    const t = 0.26;
    k.pen.hair([{ x: k.x(t) + 2, y: C - k.h(t) * 0.7 }, { x: k.x(t) - 3, y: C }, { x: k.x(t) + 2, y: C + k.h(t) * 0.75 }], 0.7, '#9a94a6', 0.55);
  },
  ink: INK,
};

/** The snake mackerel's length as a multiple of the swallower's: 86 cm in a fish of about 20 cm. */
export const LENGTH_RATIO = 4.3;
/** Its body's half-depth at the widest, as a share of its length: a long, slender fish. */
export const MACKEREL_DEPTH = 1 / 36;

/** Its half-depth along the body, 0 snout .. 1 tail tips, as a share of the widest. */
export function mackerelProfile(s: number): number {
  if (s < 0.11) return 0.12 + 0.88 * Math.sin((Math.PI / 2) * (s / 0.11)) ** 0.8;
  if (s < 0.6) return 1;
  if (s < 0.93) return 1 - 0.76 * ((s - 0.6) / 0.33) ** 1.2;
  return 0.24;
}

/** Where its parts are along it (0 snout .. 1 tail tips). */
export const MACKEREL = {
  eye: 0.034,
  jaw: 0.075,
  gill: 0.1,
  dorsal: [0.12, 0.6] as const,
  dorsal2: [0.66, 0.74] as const,
  anal: [0.68, 0.75] as const,
  finlets: [0.76, 0.92] as const,
  pectoral: 0.115,
  tailBase: 0.935,
} as const;
