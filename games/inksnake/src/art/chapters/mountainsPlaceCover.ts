import type { CoverDef } from '../../level/types';
import { polar, SHADOW } from '../groundKit';
import { closed, type Draw, pt, ribbon, TAU } from '../kit';
import type { Pt } from '../pen';
import { CRACK, crackLine, LIME_DEEP, LIME_SHADE, rngAt, rockMass, rockShape } from './mountainsPlaceKit';
import { dryTuft, stone, thymeMat } from './mountainsPlaceParts';

/**
 * The Mountains' cover, painted on the layer over the snake (so it slides
 * under), opaque inside a circle a little bigger than its r: a crevice (a
 * low slab of limestone split by a deep, dark fissure the viper slips
 * into, crumbs of stone and a tuft of grass at its lips) and thyme (a wide
 * low mound of wild thyme, grey-green and flecked with mauve flowers).
 */

/** The fissure across the slab: a long lens, wide in the middle, pinching to cracks at both ends. */
function fissure(c: Pt, r: number, a: number, rng: () => number): { spine: Pt[]; shape: Pt[] } {
  const spine = Array.from({ length: 15 }, (_, i) => {
    const t = i / 14 - 0.5;
    const wob = Math.sin(t * 7 + rng() * 0.5) * r * 0.06;
    return pt(c.x + Math.cos(a) * t * r * 1.5 - Math.sin(a) * wob, c.y + Math.sin(a) * t * r * 1.5 + Math.cos(a) * wob);
  });
  const width = r * (0.2 + rng() * 0.06);
  return { spine, shape: ribbon(spine, (u) => width * Math.sin(Math.PI * u) ** 0.8 + 0.4).shape };
}

function crevice(d: Draw, cv: CoverDef): void {
  const { pen } = d;
  const c = pt(cv.x, cv.y);
  const rng = rngAt(c.x, c.y, 11);
  const slab = rockShape(c, cv.r * 1.05, cv.r * (0.88 + rng() * 0.1), rng, rng() * TAU, 12);
  rockMass(d, slab, rng, { height: 7, ledges: 1, tone: '#b9b2a3' });
  const a = -0.6 + (rng() - 0.5) * 0.9;
  const { spine, shape } = fissure(c, cv.r, a, rng);
  pen.clipped(slab, () => {
    // The fissure: its near wall lit, its far wall in shade, black at its depth.
    pen.fill(shape, LIME_SHADE, 1);
    pen.crescent(shape, pt(SHADOW.x * 2.5, SHADOW.y * 2.5), () => pen.fill(shape, LIME_DEEP, 0.9));
    const deep = ribbon(spine, (u) => cv.r * 0.11 * Math.sin(Math.PI * u) ** 1.2 + 0.2).shape.map((p) => pt(p.x + SHADOW.x * 1.2, p.y + SHADOW.y * 1.2));
    pen.fill(deep, CRACK, 0.96);
    pen.hatch(shape, 1.6, 0.9, 0.4, { color: d.ink, alpha: 0.4 });
    pen.hair(closed(shape), 1, d.ink, 0.9);
    // Hairline cracks running on from its ends.
    for (const end of [spine[0]!, spine[spine.length - 1]!]) {
      const out = Math.atan2(end.y - c.y, end.x - c.x);
      const path = Array.from({ length: 6 }, (_, i) => polar(end, out + (rng() - 0.5) * 0.5, i * cv.r * 0.06));
      crackLine(d, path, 0.6, 0.7);
    }
    // Crumbs of rock fallen at its lips.
    for (let k = 0; k < 5; k++) {
      const s = spine[2 + Math.floor(rng() * 11)]!;
      stone(d, pt(s.x + (rng() - 0.5) * cv.r * 0.3, s.y + (rng() - 0.5) * cv.r * 0.3), 1.2 + rng() * 2, rng);
    }
  });
  const lip = spine[4 + Math.floor(rng() * 6)]!;
  dryTuft(d, pt(lip.x - Math.sin(a) * cv.r * 0.2, lip.y + Math.cos(a) * cv.r * 0.2), 6 + rng() * 3, rng);
}

function thyme(d: Draw, cv: CoverDef): void {
  const c = pt(cv.x, cv.y);
  const rng = rngAt(c.x, c.y, 12);
  thymeMat(d, c, cv.r * 1.02, rng, 0.8);
  const n = 4 + Math.floor(rng() * 2);
  for (let k = 0; k < n; k++) {
    const p = polar(c, (k / n) * TAU + rng() * 0.6, cv.r * (0.3 + rng() * 0.25));
    thymeMat(d, p, cv.r * (0.42 + rng() * 0.16), rng, 1.4, false);
  }
  thymeMat(d, pt(c.x - cv.r * 0.08, c.y - cv.r * 0.1), cv.r * 0.4, rng, 1.6, false);
  for (let k = 0; k < 3; k++) dryTuft(d, polar(c, rng() * TAU, cv.r * (0.85 + rng() * 0.15)), 5 + rng() * 3, rng);
}

/** One patch of cover by its look (a look with no painting of its own is drawn as thyme). */
export function paintMountainsCover(d: Draw, cv: CoverDef): void {
  if (cv.look === 'crevice') crevice(d, cv);
  else thyme(d, cv);
}
