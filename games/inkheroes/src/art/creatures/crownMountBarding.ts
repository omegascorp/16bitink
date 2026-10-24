import { pt, type Draw } from '../kit';
import type { Pt } from '../pen';
import { dab, gleam, LIGHT, lineOf, mix, paint, shapeOf, SHADOW } from './crownElitePaint';
import { mapXY } from './crownMountRig';
import { CROWN_BLUE, GOLD, STEEL } from './crownMountRider';

/**
 * The Lancer's barding: a caparison of Crown blue over the horse's neck and
 * body, edged in gold and powdered with gold crowns, falling in folds to a
 * scalloped hem at the knees; and a steel chanfron over the face with a
 * blue plume at the poll. Drawn in the horse's body coordinates; the
 * cloth over the neck bends with it (`warp`), the hem streams back in the
 * wind and rides up over a lifted knee (Drape).
 */

/** How the caparison hangs this frame. */
export interface Drape {
  readonly warp: (p: Pt) => Pt;
  /** 0 standing, 1 at the gallop. */
  readonly wind: number;
  /** Loop phase, for the ripple along the hem. */
  readonly t: number;
  /** Knees and hocks (body coordinates) pushing the hem up from below. */
  readonly knees: readonly Pt[];
}

const STILL: Drape = { warp: (p) => p, wind: 0, t: 0, knees: [] };

/** Moves a point of the hanging cloth: the lower it hangs, the more the wind and the knees move it. */
function drape(p: Pt, o: Drape): Pt {
  const hang = Math.max(0, Math.min(1, (p.y + 34) / 12));
  if (hang === 0) return o.warp(p);
  const w = o.wind * hang;
  let x = p.x - w * 2.2;
  let y = p.y - w * (1.2 + Math.sin(o.t * Math.PI * 2 - p.x * 0.16) * 1.1);
  for (const k of o.knees) {
    const near = 1 - ((x - k.x) / 8) ** 2;
    if (near > 0 && k.y - 2 < y) y += (k.y - 2 - y) * near * near * hang;
  }
  return o.warp(pt(x, y));
}

/** A small gold crown (three points on a band), centred at c, `s` across. */
export function goldCrown(d: Draw, c: Pt, s: number): void {
  const k = s / 8;
  const crown = [pt(c.x - 4 * k, c.y + 2.6 * k), pt(c.x - 4.4 * k, c.y - 2.4 * k), pt(c.x - 2 * k, c.y), pt(c.x, c.y - 3.4 * k), pt(c.x + 2 * k, c.y), pt(c.x + 4.4 * k, c.y - 2.4 * k), pt(c.x + 4 * k, c.y + 2.6 * k)];
  paint(d, crown, GOLD, { shadow: 0.3, hatch: 0, line: 0.45, gloss: true });
}

/** The hem from the back (x0) to the front (x1): scallops between y0 and y1. */
function hem(x0: number, x1: number, y0: number, y1: number, n: number): [number, number][] {
  return Array.from({ length: n * 2 + 1 }, (_, i) => {
    const t = i / (n * 2);
    const y = y0 + (y1 - y0) * t;
    return [x0 + (x1 - x0) * t, i % 2 ? y + 2.2 : y] as [number, number];
  });
}

const TOP: readonly [number, number][] = [
  [28.4, -68.4], [26.4, -73], [23.4, -75], [17, -72], [10, -65.6], [4.4, -57.4], [1.2, -53.6], [-4, -51], [-13, -51], [-21, -53.8], [-27.8, -52.4],
  [-32.6, -47], [-35, -39], [-37, -29],
];
const FRONT: readonly [number, number][] = [[26.2, -24.4], [24.6, -31], [24, -38.6], [25, -45], [24.6, -52], [25.6, -59], [27.4, -64.6]];

export function caparisonShape(o: Drape = STILL): Pt[] {
  return shapeOf(mapXY([...TOP, [-39.4, -20.6], ...hem(-36, 24, -20, -23.6, 8), ...FRONT], (p) => drape(p, o)), 4);
}

/** The caparison, painted: blue field, folds, gold crowns and border. */
export function caparison(d: Draw, o: Drape = STILL): Pt[] {
  const { pen } = d;
  const shape = caparisonShape(o);
  const w = (xy: readonly (readonly [number, number])[]): [number, number][] => mapXY(xy, o.warp);
  paint(d, shape, CROWN_BLUE, { shadow: 0.6, hatch: 0.22, cross: true, line: 0, lit: pt(0.5, 0.25) });
  pen.clipped(shape, () => {
    // The body's roundness under the cloth, then folds hanging from it to the hem.
    dab(d, shapeOf([[-26, -48], [14, -50], [16, -40], [-26, -38]]), LIGHT, 0.16, 3);
    dab(d, shapeOf([[-36, -30], [24, -30], [24, -18], [-38, -18]]), SHADOW, 0.2, 2.4);
    for (let x = -32; x <= 20; x += 5.2) {
      const sway = (x % 2) * 0.4;
      dab(d, shapeOf([[x - 0.6, -31], [x + 0.6, -31], [x + 1.4 + sway, -19], [x - 0.6 + sway, -19]]), LIGHT, 0.22, 0.8);
      pen.hair(lineOf([[x + 2.2, -32], [x + 2.6, -26], [x + 3 + sway, -20]]), 0.35, mix(CROWN_BLUE, SHADOW, 0.65), 0.75);
    }
    // The cloth stretched round the neck: creases from the throat.
    for (const k of [0, 1, 2]) pen.hair(lineOf(w([[24.6 - k * 1.2, -60 + k * 5], [19 - k * 2, -58 + k * 4.6], [14 - k * 2, -54 + k * 4]])), 0.35, mix(CROWN_BLUE, SHADOW, 0.6), 0.6);
  });
  // The gold border: along the hem, and down the neck's edge.
  const border = hem(-38.6, 25.4, -21.6, -25, 8).map(([x, y]) => drape(pt(x, y), o));
  pen.clipped(shape, () => {
    pen.stroke(border, 2.2, GOLD, 0.95, false);
    pen.stroke(border.map((p) => pt(p.x, p.y - 1.5)), 0.35, d.ink, 0.6, false);
  });
  pen.stroke([...shape, shape[0]!], 0.65, d.ink, 0.9);
  for (const [x, y, s] of [[-20, -42, 7], [-4, -36, 7], [12, -40, 6.4], [-27, -30, 5.6], [8, -29, 5.6], [16, -58, 5.4]] as const) goldCrown(d, drape(pt(x, y), o), s);
  return shape;
}

/** The chanfron: a steel plate down the face with an eye guard, rivets, and a plume at the poll. */
export function chanfron(d: Draw): void {
  const { pen } = d;
  const plate = shapeOf([[25.6, -73.6], [29, -73.4], [31.4, -68.4], [34, -60.6], [35.8, -55.4], [34.8, -53.6], [32.6, -55.6], [29.8, -61.6], [27.2, -66.4], [25, -70]], 4);
  paint(d, plate, STEEL, { shadow: 0.45, hatch: 0.14, line: 0.6, gloss: true, lit: pt(0.3, 0.2) });
  pen.hair(lineOf([[27.8, -72.4], [31, -65], [34.2, -56.6]]), 0.4, d.ink, 0.5);
  gleam(d, lineOf([[27.4, -71.6], [30.2, -65.6], [32.8, -58.6]]), 0.8, 0.85);
  for (const [x, y] of [[27.6, -70.4], [30.4, -63], [33, -57]] as const) pen.dot(x, y, 0.55, GOLD);
  // Eye guard round the eye.
  pen.stroke(lineOf([[26.6, -69], [29.8, -68], [30.4, -65.2]]), 0.9, d.ink, 0.85, false);
  pen.stroke(lineOf([[26.6, -69], [29.8, -68], [30.4, -65.2]]), 0.5, mix(STEEL, '#ffffff', 0.4), 0.9, false);
  // The plume at the poll.
  const plume = shapeOf([[24.6, -74.6], [23.4, -80], [20.2, -84.6], [16.6, -85], [19.6, -81], [21, -76]], 4);
  paint(d, plume, CROWN_BLUE, { shadow: 0.4, hatch: 0, line: 0.5 });
  pen.hair(lineOf([[23.8, -76], [22, -81], [18.6, -84]]), 0.3, '#e8eefc', 0.8);
}
