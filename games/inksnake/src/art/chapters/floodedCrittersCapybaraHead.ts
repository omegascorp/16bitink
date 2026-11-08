import { closed, type Draw, pt } from '../kit';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { beadEye, ellipseAt, glaze } from '../critters/preyKit';
import { paintFur, type Pelt } from './barrensCrittersBeast';
import { film, rings, smoothLoop } from './floodedCrittersKit';

/**
 * The capybara's head from above: big, blunt and boxy, the muzzle nearly as
 * broad as the crown and squared off, small round ears set far back, small
 * eyes and nostrils high on top (it swims with only those above water), the
 * bald dark scent gland (the morrillo) on the bridge of the nose. Lowered
 * to graze or drink, the head shortens as it tips away from the eye, its
 * nose in the grass or the water.
 */
export const CAPY = {
  base: '#9c6c43',
  deep: '#4f3420',
  light: '#c8996a',
  dark: '#3b2717',
  pale: '#d6b086',
  warm: '#b07a48',
  face: '#8a5c38',
  muzzle: '#5e4030',
  nose: '#2e2420',
  ear: '#5a3d2a',
  earIn: '#8f6a55',
  foot: '#4a3a30',
  nail: '#2a221e',
  grass: '#6f8f3e',
  grassDeep: '#3f5a25',
} as const;

const C0 = CAPY;

export type HeadDo = 'up' | 'graze' | 'drink';

/** The head's outline round C: a broad crown running out into a blunt, square muzzle. */
export function capyHead(C: Pt, act: HeadDo): Pt[] {
  const L = act === 'up' ? 1 : 0.8;
  const keys: readonly (readonly [number, number])[] = [
    [-8.5, 0], [-7.8, 5.6], [-4, 8.4], [2, 8.6], [8 * L, 7.6], [14 * L, 6.6], [18.6 * L, 5.4], [20.4 * L, 2.6], [20.8 * L, 0],
  ];
  const half = keys.map(([x, y]) => pt(C.x + x, C.y + y));
  const other = [...keys].reverse().slice(1, -1).map(([x, y]) => pt(C.x + x, C.y - y));
  return smoothLoop([...half, ...other], 4);
}

const HEAD_PELT: Pelt = { base: C0.face, deep: C0.deep, light: C0.light, hair: (_p, r) => (r < 0.25 ? C0.dark : r < 0.75 ? C0.base : C0.pale) };

function ear(d: Draw, C: Pt, side: 1 | -1): void {
  const { pen } = d;
  const c = pt(C.x - 5, C.y + side * 7.6);
  const shape = ellipseAt(c.x, c.y, 2, 2.5, side * 0.5, 16);
  pen.fill(shape.map((p) => pt(p.x + 0.7, p.y + 1)), d.ink, 0.25);
  pen.fill(shape, C0.ear, 1);
  pen.fill(ellipseAt(c.x + 0.3, c.y + side * 0.2, 1.2, 1.6, side * 0.4, 12), C0.earIn, 0.8);
  pen.stroke(closed(shape), 0.5, d.ink, 0.9);
}

/** A few blades of grass being cropped at the nose. */
function tuft(d: Draw, at: Pt): void {
  const { pen } = d;
  for (const [a, l] of [[-1.1, 5], [-0.5, 6.5], [0.1, 5.5], [0.6, 6], [1.2, 4.5], [2.5, 3.5], [-2.4, 4]] as const) {
    const tip = pt(at.x + Math.cos(a) * l, at.y + Math.sin(a) * l);
    const mid = pt((at.x + tip.x) / 2 + Math.sin(a) * 0.8, (at.y + tip.y) / 2 - Math.cos(a) * 0.8);
    pen.stroke([at, mid, tip], 1.1, C0.grass, 0.95, false);
    pen.hair([at, mid, tip], 0.3, C0.grassDeep, 0.8);
  }
}

/** Paints the head round C. */
export function paintCapyHead(d: Draw, C: Pt, act: HeadDo): void {
  const { pen } = d;
  const shape = capyHead(C, act);
  const nose = pt(C.x + (act === 'up' ? 20.2 : 16.2), C.y);
  if (act === 'graze') tuft(d, pt(nose.x + 1, nose.y));
  paintFur(d, HEAD_PELT, {
    shape,
    dir: (p) => Math.atan2(p.y - nose.y, p.x - nose.x),
    wet: () => {
      glaze(d, C.x - 2, C.y, 7, 6, 0, C0.base, 0.6);
      // The muzzle, darker and nearly bare at the front.
      glaze(d, nose.x - 2.5, C.y, 5, 6.5, 0, C0.muzzle, 0.7);
      glaze(d, C.x + 2, C.y, 6, 2.5, 0, C0.deep, 0.35);
    },
    n: 520, len: 2, seed: 9101, tuft: 0.9, line: 0.05,
  });
  // The contour round the face only: behind, the head runs into the thick neck's fur.
  const front = shape.filter((p) => p.x > C.x - 3.5).sort((a, b) => Math.atan2(a.y - C.y, a.x - C.x - 4) - Math.atan2(b.y - C.y, b.x - C.x - 4));
  pen.stroke(front, 0.85, d.ink, 0.9);
  pen.clipped(shape, () => {
    for (let i = 0; i < 70; i++) {
      const y = C.y + (((i * 37) % 70) / 70 - 0.5) * 16;
      const x = C.x - 9 + ((i * 53) % 11) * 0.45;
      pen.hair([pt(x - 1, y), pt(x + 2.4 + ((i * 7) % 5) * 0.4, y + (y - C.y) * 0.06)], 0.35, i % 3 ? C0.base : C0.dark, 0.75);
    }
  });
  for (const side of [-1, 1] as const) ear(d, C, side);
  // The morrillo, a bald dark ridge on the bridge of the nose.
  const gland = ellipseAt(C.x + (act === 'up' ? 10.5 : 8.5), C.y, 3.4, 1.5, 0, 16);
  pen.fill(gland, C0.dark, 0.75);
  pen.hair(gland.slice(10, 16), 0.4, PAPER_FILL, 0.35);
  for (const side of [-1, 1] as const) {
    const e = pt(C.x + (act === 'up' ? 2.5 : 1.6), C.y + side * 7);
    glaze(d, e.x, e.y, 2, 1.4, 0, C0.dark, 0.5);
    beadEye(d, e, 1.05);
    // Nostrils: slits high on the snout's front corners.
    const n = pt(nose.x - 1.8, C.y + side * 3);
    pen.fill(ellipseAt(n.x, n.y, 1.1, 0.5, side * 0.6, 10), C0.nose, 0.95);
    pen.hair([pt(nose.x - 0.5, C.y + side * 0.4), pt(nose.x - 0.2, C.y + side * 3.4)], 0.4, C0.nose, 0.6);
  }
  // The split upper lip at the front of the snout.
  pen.hair([pt(nose.x - 0.4, C.y - 0.8), pt(nose.x + 0.3, C.y), pt(nose.x - 0.4, C.y + 0.8)], 0.45, C0.nose, 0.8);
  if (act === 'drink') {
    const lap = ellipseAt(nose.x - 1.2, C.y, 3.8, 6, 0, 18);
    film(d, lap, 0.45, 9121);
    rings(d, pt(nose.x, C.y), 5, 7.5, 3, 9122, 0.75);
  }
}
