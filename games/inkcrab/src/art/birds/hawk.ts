import { add, bezier, closed, cub, type Draw, edge, lerp, oval, pt, shade, skin, tint } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';

/**
 * A Galápagos hawk (Buteo galapagoensis), side-on and facing right, drawn in
 * the critter frame (origin at its centre, CRITTER_FRAME units square) like
 * the kestrel, whose hunt it shares. Hanging on the wind, it tilts head-up
 * with its short, broad tail fanned and the broad, fingered wings beating
 * (up, mid, down by frame). `dive`: stooping head-down, wings half folded,
 * yellow feet thrust forward under the bill.
 */
/** Frame units across the hovering bird, wings included, at its widest frame. */
export const HAWK_SPAN = 68;

const SOOT = '#4b3b31';
const DEEP = '#2c221d';
const EDGING = '#a08670';
const BAR = '#c8bba5';
const FLIGHT = '#857c74';
const CERE = '#e5bd45';

const rot = (p: Pt, a: number): Pt => pt(p.x * Math.cos(a) - p.y * Math.sin(a), p.x * Math.sin(a) + p.y * Math.cos(a));

/** The short, broad tail: a rounded fan when hovering, closed when stooping. Grey-brown, pale bars, a dark band, a pale tip. */
function tail(d: Draw, fanned: boolean): void {
  const { pen } = d;
  const shape = fanned
    ? [pt(-12, -5), ...bezier(pt(-26, -12.5), pt(-34, -0.5), pt(-26, 11.5), 10), pt(-12, 4)]
    : [pt(-12, -3.6), pt(-30, -3.4), pt(-32.5, 0), pt(-30, 3.4), pt(-12, 3.2)];
  skin(d, shape, SOOT, 0.72);
  pen.clipped(shape, () => {
    // Narrow pale bars parallel to the tip, then the broad dark band and the pale tip itself.
    const arc = (k: number): Pt[] => (fanned ? bezier(pt(-26 + k, -12.5), pt(-34 + k * 1.1, -0.5), pt(-26 + k, 11.5), 10) : [pt(-32 + k, -4), pt(-32 + k, 4)]);
    for (const k of [12, 8.5, 5]) pen.stroke(arc(k), 1, BAR, 0.75, false);
    pen.stroke(arc(2.4), 2.6, DEEP, 0.75, false);
    pen.stroke(arc(-0.4), 1.2, PAPER_FILL, 0.8, false);
    if (fanned) for (const a of [-0.32, -0.16, 0, 0.16, 0.32]) pen.hair([pt(-13, 0), pt(-13 - Math.cos(a) * 20, Math.sin(a) * 32)], 0.45, d.ink, 0.4);
  });
  shade(d, shape, 0.32);
  edge(d, shape, 1);
}

/** Body, head and bill in the bird's own frame: level, facing right. Bulky, small-headed. */
function body(d: Draw, diving: boolean): void {
  const { pen } = d;
  const shape = [
    ...cub(pt(19, -5), pt(17.5, -10.5), pt(10, -11), pt(7, -7.5), 8),
    ...cub(pt(7, -7.5), pt(-1, -10.5), pt(-9, -9), pt(-14, -5), 10).slice(1),
    pt(-13.5, 4),
    ...cub(pt(-13.5, 4), pt(-7, 12), pt(6, 12), pt(12, 6), 10).slice(1),
    ...cub(pt(12, 6), pt(16, 3.5), pt(18.5, 1), pt(20, -1.8), 6).slice(1),
  ];
  skin(d, shape, SOOT, 0.82);
  pen.clipped(shape, () => {
    // Darker on the back and crown; pale feather edges scalloped over the back and breast.
    tint(d, [pt(-16, -13), pt(20, -13), pt(20, -4), pt(4, -3), pt(-16, -1)], DEEP, 0.45);
    for (let i = 0; i < 14; i++) {
      const x = -11 + pen.rng() * 22;
      const y = -8 + pen.rng() * 16;
      pen.hair(bezier(pt(x - 1.2, y), pt(x, y + 0.9), pt(x + 1.2, y), 3), 0.45, EDGING, 0.7);
    }
  });
  shade(d, shape, 0.38);
  edge(d, shape, 1.2);
  // The heavy hooked bill, dark horn, behind a broad yellow cere.
  const bill = [pt(18.5, -6.6), pt(22.5, -6.4), pt(25.6, -4), pt(25.4, -0.4), pt(23.8, -2), pt(19.4, -1.4)];
  skin(d, bill, DEEP, 0.6);
  pen.fill(oval(19.8, -4.4, 2, 2.1, 10), CERE, 0.9);
  pen.hair(bezier(pt(19.6, -2.6), pt(22, -2.8), pt(24.2, -1.8), 4), 0.5, d.ink, 0.8);
  edge(d, bill, 0.9);
  // A dark eye under a heavy brow.
  pen.dot(14.4, -5.4, 1.6, d.ink, 1);
  pen.dot(14.9, -5.9, 0.5, PAPER_FILL, 0.95);
  pen.stroke(bezier(pt(11.6, -7.6), pt(14.4, -8.4), pt(17, -6.8), 4), 0.9, d.ink, 0.85, false);
  // Diving, legs thrust forward under the bill, talons spread; hovering, feet tucked under the belly.
  const legs = diving ? [[pt(4, 8), pt(14, 9), pt(20, 6)], [pt(5.6, 9.6), pt(15.6, 10.6), pt(21.6, 7.6)]] : [[pt(2, 9), pt(3, 12.5), pt(5.4, 13)], [pt(4.6, 9), pt(5.6, 12.5), pt(8, 13)]];
  for (const leg of legs) {
    pen.stroke(leg, diving ? 2.2 : 1.8, CERE, 0.95, false);
    pen.stroke(leg, 0.6, d.ink, 0.75, false);
    const f = leg[2]!;
    if (diving) for (const a of [-0.9, 0, 0.9]) pen.stroke(bezier(f, add(f, pt(2.4 * Math.cos(a), 2.4 * Math.sin(a))), add(f, pt(3 * Math.cos(a + 0.6), 3 * Math.sin(a + 0.6))), 3), 0.8, d.ink, 0.95, false);
  }
}

/**
 * A broad buteo wing from shoulder `s` towards angle `a`: a deep arm, then a
 * blunt hand split into five fingered primaries. `len` foreshortens the far
 * one; `under` shows the underside (dark coverts, barred grey flight feathers).
 */
function wing(d: Draw, s: Pt, a: number, len: number, far: boolean, under: boolean): void {
  const { pen } = d;
  const ax = pt(Math.cos(a), Math.sin(a));
  const nrm = pt(-ax.y, ax.x);
  const k = nrm.x >= 0 ? 1 : -1;
  const at = (u: number, v: number): Pt => add(s, pt(ax.x * u * len + nrm.x * v * k, ax.y * u * len + nrm.y * v * k));
  const lead = cub(at(-0.06, 3.5), at(0.2, 7.5), at(0.5, 7.5), at(0.78, 6), 12);
  // The fingers: rounded tips fanning from the leading edge back, with notches between.
  const fingers: Pt[] = [];
  [[1, 3.6], [1.04, 0], [1.02, -3.6], [0.97, -7.2], [0.9, -10.6]].forEach(([u, v], i) => {
    if (i > 0) fingers.push(at(u! - 0.15, v! + 1.9));
    fingers.push(at(u! - 0.05, v! + 1.4), at(u!, v! + 0.4), at(u! - 0.01, v! - 0.7), at(u! - 0.06, v! - 1.4));
  });
  const trail = [at(0.76, -13.4), at(0.62, -14.6), at(0.48, -15.2), at(0.34, -15), at(0.2, -14.4), at(0.07, -12.6), at(-0.04, -9), at(-0.1, -2)];
  const shape = [...lead, ...fingers, ...trail];
  skin(d, shape, SOOT, far ? 0.85 : 0.8);
  pen.clipped(shape, () => {
    if (under) {
      // Grey flight feathers below the dark coverts, barred across.
      pen.fill([at(0.02, -6), at(0.8, -3), at(1.2, -3), at(1.2, -18), at(0, -18)], FLIGHT, 0.75);
      pen.fill([at(0.78, 10), at(1.2, 8), at(1.2, -3), at(0.78, -3)], FLIGHT, 0.6);
      if (!far) for (const v of [-8.5, -11, -13.5]) pen.hair([at(0.04, v), at(0.8, v + 1)], 0.45, DEEP, 0.5);
    } else {
      pen.fill([at(0.8, 10), at(1.2, 8), at(1.2, -16), at(0.8, -16)], DEEP, 0.55);
    }
    if (!far) {
      // Pale-edged coverts across the arm, and the separations between the secondaries.
      for (let i = 0; i < 9; i++) {
        const p = at(0.05 + pen.rng() * 0.6, 4 - pen.rng() * 7);
        pen.hair([p, add(p, pt(ax.x * 2, ax.y * 2))], 0.45, under ? DEEP : EDGING, 0.6);
      }
      for (const u of [0.15, 0.3, 0.45, 0.6]) pen.hair([at(u, -7), at(u - 0.02, -14)], 0.4, under ? DEEP : PAPER_FILL, 0.35);
    }
    if (far) pen.fill(shape, d.ink, 0.14);
  });
  if (!far) shade(d, shape, 0.3);
  // Scalloped trailing edge, then the contour.
  if (!far) for (let i = 1; i < trail.length - 1; i++) pen.hair(bezier(trail[i - 1]!, add(lerp(trail[i - 1]!, trail[i]!, 0.5), pt(nrm.x * -k * 0.9, nrm.y * -k * 0.9)), trail[i]!, 3), 0.4, d.ink, 0.5);
  pen.stroke(closed(shape), far ? 0.8 : 1.1, d.ink, far ? 0.6 : 1, false);
}

/** Wing angles by frame, near wing then far: up, mid, down. */
const BEAT: readonly (readonly [number, number])[] = [[-1.9, -1.5], [-2.85, -2.55], [1.2, 1.5]];
const HOVER_TILT = -0.6;
const DIVE_TILT = 1.2;

export function hawk(d: Draw, dive: boolean): void {
  const { ctx } = d.pen;
  if (dive) {
    ctx.save();
    ctx.rotate(DIVE_TILT);
    ctx.translate(6, 0);
    tail(d, false);
    body(d, true);
    // The broad wings half folded along the back, fingertips past the tail.
    const folded = [
      ...cub(pt(9, -7), pt(0, -15), pt(-22, -13), pt(-38, -4), 14),
      pt(-36, 0),
      ...cub(pt(-36, 0), pt(-22, 1.5), pt(-6, 2), pt(7, -1), 10),
    ];
    skin(d, folded, SOOT, 0.8);
    d.pen.clipped(folded, () => {
      d.pen.fill([pt(-16, -15), pt(-42, -6), pt(-42, 3), pt(-16, 3)], DEEP, 0.6);
      for (const y of [-5.5, -3]) d.pen.hair([pt(-16, y - 1.5), pt(-36, y + 1.5)], 0.45, PAPER_FILL, 0.4);
      for (let i = 0; i < 8; i++) {
        const x = -8 + d.pen.rng() * 14;
        const y = -8 + d.pen.rng() * 6;
        d.pen.hair([pt(x, y), pt(x - 2, y + 0.4)], 0.45, EDGING, 0.65);
      }
    });
    shade(d, folded, 0.32);
    edge(d, folded, 1.1);
    ctx.restore();
    return;
  }
  const [near, farA] = BEAT[d.f]!;
  const shoulder = rot(pt(2, -6), HOVER_TILT);
  const down = d.f === 2;
  wing(d, add(shoulder, pt(1.5, -1.5)), farA, down ? 32 : 38, true, down);
  ctx.save();
  ctx.rotate(HOVER_TILT);
  tail(d, true);
  body(d, false);
  ctx.restore();
  wing(d, shoulder, near, down ? 38 : 44, false, down);
}
