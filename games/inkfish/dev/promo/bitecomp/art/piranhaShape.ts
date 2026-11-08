import type { Pt } from '../../../../src/art/pen';
import { spline } from '../../kraken/whale';
import { edgeAt, turn } from '../../seal/art/paint';

/**
 * The black piranha's shapes (Serrasalmus rhombeus), in local units: head
 * length (snout to the edge of the gill cover) = LEN, facing +x, y down, the
 * origin at the bite point (where the front teeth meet with the jaw shut).
 * The front half of a deep, blunt-headed body: to just past the pectoral fin.
 */

export const LEN = 300;

/** The lower jaw's hinge, under the eye behind the corner of the mouth. */
export const HINGE: Pt = { x: -104, y: 30 };
/** The jaw drops this far (radians) at `jaw` 1. */
export const JAW_MAX = 0.55;

/** The back, from the snout up the steep blunt forehead and along the deep body to the cut. */
export const TOP: readonly Pt[] = spline([
  { x: 10, y: -10 }, { x: 15, y: -20 }, { x: 16, y: -35 }, { x: 12, y: -54 }, { x: 2, y: -80 }, { x: -14, y: -108 },
  { x: -38, y: -140 }, { x: -72, y: -174 }, { x: -118, y: -205 }, { x: -180, y: -233 }, { x: -260, y: -259 },
  { x: -350, y: -280 }, { x: -440, y: -293 }, { x: -580, y: -300 },
], 6);

/** The upper jaw's edge, front to the corner of the mouth. */
export const MOUTH_UP: readonly Pt[] = spline([{ x: 10, y: -10 }, { x: 0, y: -6.5 }, { x: -20, y: -0.5 }, { x: -42, y: 6.5 }, { x: -64, y: 14 }, { x: -86, y: 22 }], 4);
/** The heavy lower jaw's edge, its tip jutting past the upper, to the corner (lips a little apart, so the teeth show). */
export const MOUTH_LO: readonly Pt[] = spline([{ x: 22, y: 3 }, { x: 4, y: 9 }, { x: -20, y: 13.5 }, { x: -42, y: 17.5 }, { x: -64, y: 20.5 }, { x: -86, y: 22 }], 4);
export const CORNER: Pt = MOUTH_UP[MOUTH_UP.length - 1]!;
export const mouthUpAt = (x: number): number => edgeAt(MOUTH_UP, x);
export const mouthLoAt = (x: number): number => edgeAt(MOUTH_LO, x);

/** The chin, from the jaw's tip round under it. */
export const CHIN: readonly Pt[] = spline([{ x: 22, y: 3 }, { x: 29, y: 5 }, { x: 33, y: 13 }, { x: 31, y: 28 }, { x: 22, y: 45 }, { x: 8, y: 58 }, { x: -6, y: 65 }], 4);
/** The deep belly, chin to the cut, along its saw-edged keel. */
export const BELLY: readonly Pt[] = spline([
  { x: -6, y: 65 }, { x: -28, y: 76 }, { x: -58, y: 90 }, { x: -92, y: 105 }, { x: -134, y: 122 }, { x: -184, y: 143 },
  { x: -244, y: 164 }, { x: -312, y: 184 }, { x: -384, y: 201 }, { x: -460, y: 213 }, { x: -580, y: 222 },
], 6);
export const topAt = (x: number): number => edgeAt(TOP, x);
export const bellyAt = (x: number): number => edgeAt(BELLY, x);

/** The lower jaw: lip, the jutting chin, the underside back to below the hinge. */
const JAW_BACK_X = -136;
const JAW_BACK: readonly Pt[] = spline([HINGE, { x: -118, y: 54 }, { x: -129, y: 86 }, { x: JAW_BACK_X, y: bellyAt(JAW_BACK_X) }], 4);
export const JAW_UNDER: readonly Pt[] = [...BELLY.filter((p) => p.x > JAW_BACK_X).reverse(), ...[...CHIN].reverse().slice(1)];
export const JAW: readonly Pt[] = [...MOUTH_LO, ...JAW_BACK, ...JAW_UNDER.slice(0, -1)];

/** The throat under the jaw: the lip turned down as far as the jaw opens, to the belly (hidden by the jaw at every gape). */
const FOLD: readonly Pt[] = (() => {
  const out: Pt[] = [];
  for (const p of [...MOUTH_LO].reverse()) {
    const q = turn(p, HINGE, JAW_MAX);
    if (q.x > -6 || q.y >= bellyAt(q.x)) return [...out, { x: Math.min(q.x, -6), y: bellyAt(Math.min(q.x, -6)) }];
    out.push(q);
  }
  return out;
})();
const FOLD_END = FOLD[FOLD.length - 1]!;

/** The body without the lower jaw. */
export const BODY: readonly Pt[] = [
  ...MOUTH_UP, HINGE, ...FOLD, ...BELLY.filter((p) => p.x < FOLD_END.x), ...[...TOP].reverse().slice(0, -1),
];
/** The belly's inked edge behind the jaw. */
export const BELLY_INK: readonly Pt[] = BELLY.filter((p) => p.x < -70);
/** Where the jaw's back end melts into the throat (so it slides under smoothly as it turns). */
export const JAW_MELT: readonly [number, number] = [-96, JAW_BACK_X];

/** The gill cover's free edge and the bony ridge in front of it. */
export const OPERCLE: readonly Pt[] = spline([
  { x: -228, y: -176 }, { x: -266, y: -130 }, { x: -289, y: -62 }, { x: -296, y: 0 }, { x: -290, y: 58 }, { x: -270, y: 108 }, { x: -240, y: 140 },
], 6);
export const PREOPERCLE: readonly Pt[] = spline([{ x: -166, y: -110 }, { x: -184, y: -40 }, { x: -188, y: 20 }, { x: -176, y: 70 }, { x: -152, y: 104 }], 6);

/** The near pectoral fin, low behind the gill cover, swept back. */
export const FIN_ROOT: Pt = { x: -300, y: 100 };
export const FIN: readonly Pt[] = spline([
  { x: -296, y: 86 }, { x: -328, y: 89 }, { x: -370, y: 102 }, { x: -410, y: 122 }, { x: -440, y: 146 }, { x: -428, y: 155 },
  { x: -390, y: 150 }, { x: -350, y: 138 }, { x: -316, y: 124 }, { x: -301, y: 112 }, { x: -296, y: 86 },
], 5);

export const EYE: Pt = { x: -100, y: -82 };
export const EYE_R = 31;

/** Upper teeth: [x, height, width]; the lower ones sit between them, so they interlock. */
export const UPPER_TEETH: readonly (readonly [number, number, number])[] = [
  [-1, 12, 10], [-12, 12, 10], [-23, 11.5, 9.5], [-34, 10.5, 9], [-45, 9.5, 8.5], [-56, 8.5, 8], [-67, 7, 7],
];
export const LOWER_TEETH: readonly (readonly [number, number, number])[] = [
  [7, 14, 11], [-6, 14, 11], [-17.5, 13.5, 10.5], [-28.5, 12.5, 10], [-39.5, 11.5, 9.5], [-50.5, 10, 9], [-61.5, 8.5, 8], [-72, 7, 7],
];

/** Where the front half fades out, local x. */
export const FADE_FROM = -470;
export const FADE_TO = -578;

/** Sprite boxes, local units. */
export const BODY_BOX = { x0: -582, x1: 30, y0: -310, y1: 232 } as const;
export const JAW_BOX = { x0: -140, x1: 38, y0: -8, y1: 128 } as const;
export const TEETH_BOX = { x0: -82, x1: 26, y0: -20, y1: 32 } as const;
export const FIN_BOX = { x0: -446, x1: -288, y0: 78, y1: 162 } as const;
