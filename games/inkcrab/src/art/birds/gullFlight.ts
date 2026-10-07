import { add, bezier, closed, cub, type Draw, edge, oval, pt, shade, skin, tint } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';

/**
 * A herring gull in flight, side-on and facing right, drawn in the critter
 * frame with its body centred on the origin: white head, body and short
 * square tail, a grey back, long grey wings with black tips spotted white,
 * a yellow bill with a red spot, pink feet tucked under the tail. The wings
 * beat up, level and down by frame (d.f 0..2).
 */
/** Frame units across the flying bird, wings included, at its widest frame. */
export const GULL_FLIGHT_SPAN = 69;

const WHITE = '#f6f3ea';
const GREY = '#a3afbb';
const UNDER = '#dfe2e2';
const BLACK = '#26262c';
const BILL = '#ecc43c';
const SPOT = '#d0402c';
const LEG = '#e2a296';
const IRIS = '#efe08a';

/** The short, square white tail and the pink feet tucked under it. */
function tail(d: Draw): void {
  const { pen } = d;
  const shape = [pt(-14, -4.5), pt(-25, -3.8), pt(-25.6, 2.4), pt(-14, 3.6)];
  skin(d, shape, WHITE, 0.8);
  pen.clipped(shape, () => {
    for (const y of [-2, 0, 1.8]) pen.hair([pt(-18, y * 0.8), pt(-28.5, y)], 0.4, d.ink, 0.3);
  });
  shade(d, shape, 0.25);
  edge(d, shape, 1);
  // Feet trailing under the tail, toes together.
  for (const dy of [0, 1.4]) {
    const foot = [pt(-9, 5 + dy), pt(-15, 5.2 + dy), pt(-19.5, 4.6 + dy)];
    pen.stroke(foot, 2, LEG, 0.95, false);
    pen.stroke(foot, 0.6, d.ink, 0.7, false);
  }
}

/** Head, body and bill: level, facing right, centred on the origin. */
function body(d: Draw): void {
  const { pen } = d;
  const shape = [
    ...cub(pt(20.5, -4.6), pt(19, -10.5), pt(11, -10.5), pt(7.5, -7), 8),
    ...cub(pt(7.5, -7), pt(0, -9), pt(-9, -8), pt(-16, -4.6), 10).slice(1),
    pt(-16, 3.2),
    ...cub(pt(-16, 3.2), pt(-8, 10), pt(6, 9.6), pt(13, 4.4), 10).slice(1),
    ...cub(pt(13, 4.4), pt(17, 2.4), pt(20, 0.6), pt(21.2, -1.8), 6).slice(1),
  ];
  skin(d, shape, WHITE, 0.85);
  pen.clipped(shape, () => {
    // The grey back, and cool shadow along the belly.
    tint(d, [pt(-20, -12), pt(8, -12), pt(8, -5), pt(-4, -4.6), pt(-20, -1.8)], GREY, 0.75);
    tint(d, oval(-2, 8, 18, 4, 16), UNDER, 0.7);
    for (let i = 0; i < 8; i++) {
      const x = 10 + pen.rng() * 9;
      const y = -9 + pen.rng() * 6;
      pen.hair([pt(x, y), pt(x - 1.4, y + 0.5)], 0.4, GREY, 0.7);
    }
  });
  shade(d, shape, 0.3);
  edge(d, shape, 1.2);
  // The bill: heavy, yellow, hooked, with the red spot on the lower mandible's angle.
  const bill: Pt[] = [
    ...cub(pt(20, -6), pt(24, -6.4), pt(28, -5.8), pt(30.4, -4.2), 8),
    pt(30.8, -2.6),
    pt(29.6, -2.3),
    ...cub(pt(28.8, -2.2), pt(27.8, -0.6), pt(26.6, -0.6), pt(25.8, -1.6), 4),
    ...cub(pt(25.8, -1.6), pt(24, -2), pt(22, -2.2), pt(20.6, -2.2), 4).slice(1),
  ];
  skin(d, bill, BILL, 0.9);
  pen.clipped(bill, () => pen.fill(oval(27.2, -1.4, 1.5, 1.1, 10), SPOT, 0.9));
  pen.hair(bezier(pt(21, -3.9), pt(25.5, -3.7), pt(29.8, -3.1), 5), 0.55, d.ink, 0.9);
  edge(d, bill, 0.9);
  // A pale, hard eye in an orange-red ring.
  pen.fill(oval(15.2, -5.4, 1.9, 1.8, 12), '#e0703a', 0.8);
  pen.fill(oval(15.2, -5.4, 1.35, 1.3, 12), IRIS, 1);
  pen.dot(15.4, -5.4, 0.6, d.ink, 1);
  pen.hair(closed(oval(15.2, -5.4, 1.9, 1.8, 12)), 0.5, d.ink, 0.9);
}

/**
 * A long gull's wing from shoulder `s` towards angle `a`: a broad arm, a crook
 * at the wrist, a long hand to a point. `len` foreshortens it; `under` shows
 * the pale underside (on the downstroke). The black tip carries white spots.
 */
function wing(d: Draw, s: Pt, a: number, len: number, far: boolean, under: boolean): void {
  const { pen } = d;
  const ax = pt(Math.cos(a), Math.sin(a));
  const nrm = pt(-ax.y, ax.x);
  // The leading edge faces forward (right); a wing pointing straight back leads upward.
  const k = Math.abs(nrm.x) > 0.2 ? (nrm.x >= 0 ? 1 : -1) : nrm.y <= 0 ? 1 : -1;
  // The hand sweeps back from the wrist: the crook that makes a gull's wing.
  const at = (u: number, v: number): Pt => {
    const c = v * 1.3;
    const back = Math.max(0, u - 0.42) * len * 0.42;
    return add(s, pt(ax.x * u * len + nrm.x * c * k - back, ax.y * u * len + nrm.y * c * k));
  };
  const lead = [...cub(at(-0.06, 3), at(0.18, 6), at(0.36, 6.2), at(0.46, 5.4), 8), ...cub(at(0.46, 5.4), at(0.62, 4.6), at(0.86, 2.6), at(1, 0), 10).slice(1)];
  const trail = [at(0.92, -1.8), at(0.8, -3.6), at(0.66, -5.4), at(0.52, -7.4), at(0.4, -8.6), at(0.24, -9.2), at(0.08, -8.6), at(-0.04, -6.4), at(-0.1, -1.6)];
  const shape = [...lead, ...trail];
  skin(d, shape, under ? UNDER : GREY, far ? 0.85 : 0.8);
  pen.clipped(shape, () => {
    // The black wingtip, its white spots (mirrors), and the white trailing edge of the arm.
    pen.fill([at(0.7, 10), at(1.2, 0), at(0.8, -10), at(0.66, -10)], BLACK, far ? 0.75 : 0.9);
    for (const [u, v, r] of [[0.92, -0.3, 1.3], [0.8, -1.6, 1]] as const) {
      const c = at(u, v);
      pen.fill(oval(c.x, c.y, r, r, 10), PAPER_FILL, 0.95);
    }
    if (!under) pen.stroke(trail.slice(2), 1.8, PAPER_FILL, 0.85, false);
    if (!far) {
      // Covert rows across the arm, and the separations between the primaries.
      for (const u of [0.12, 0.22, 0.32]) pen.hair(bezier(at(u, 4), at(u + 0.03, -1), at(u - 0.02, -5), 4), 0.45, d.ink, under ? 0.2 : 0.35);
      for (const u of [0.6, 0.7, 0.8]) pen.hair([at(u, 4.4 - u * 3.6), at(u + 0.08, -5 + u * 4)], 0.45, under ? d.ink : PAPER_FILL, 0.4);
    }
    if (far) pen.fill(shape, d.ink, 0.14);
  });
  if (!far) shade(d, shape, 0.28);
  pen.stroke(closed(shape), far ? 0.8 : 1.1, d.ink, far ? 0.6 : 1, false);
}

/** Wing angle and length by frame, near wing then far: up, level (swept back, foreshortened), down. */
const BEAT: readonly { readonly near: number; readonly far: number; readonly len: number; readonly farLen: number }[] = [
  { near: -1.62, far: -1.38, len: 46, farLen: 40 },
  { near: -2.9, far: -2.6, len: 30, farLen: 28 },
  { near: 1.32, far: 1.6, len: 46, farLen: 36 },
];

export function gullFlight(d: Draw): void {
  const b = BEAT[d.f]!;
  const down = d.f === 2;
  // The body rises a little on the downstroke.
  const bob = [1, 0, -1][d.f]!;
  const { ctx } = d.pen;
  ctx.save();
  ctx.translate(-2.5, bob);
  const shoulder = pt(0, -5);
  wing(d, add(shoulder, pt(2, -1.5)), b.far, b.farLen, true, down);
  tail(d);
  body(d);
  wing(d, shoulder, b.near, b.len, false, down);
  ctx.restore();
}
