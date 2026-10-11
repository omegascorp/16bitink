import { add, bezier, closed, cub, type Draw, edge, lerp, oval, pt, shade, skin, tint, tube } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';

/**
 * An osprey (Pandion haliaetus), side-on and facing right, drawn in the
 * critter frame (origin at its centre, CRITTER_FRAME units square) like the
 * kestrel, whose hunt it shares: it hangs over the shallows on beating
 * wings, then plunges feet-first. Dark brown above and white below, a white
 * head with a dark stripe back through the eye, a short ragged nape crest,
 * a black hooked bill and long, narrow, angled wings, crooked at the wrist,
 * the underside white with a dark patch at the bend and barred flight
 * feathers. Hovering, it hangs tilted head-up with its legs let down and
 * the barred tail fanned, the wings beating (up, mid, down by frame).
 * `dive`: stooping head-down, the wings swept back and raised over the back,
 * long legs and open talons thrust forward under the bill.
 */
/** Frame units across the hovering bird, wings included, at its widest frame. */
export const OSPREY_SPAN = 74;

const BROWN = '#4e3d30';
const DEEP = '#2a201a';
const EDGING = '#9a8670';
const BAR = '#c9bea9';
const FLIGHT = '#8f8a84';
const LEG = '#a7b0b4';
const BILL = '#26221f';
const IRIS = '#e8c547';

const rot = (p: Pt, a: number): Pt => pt(p.x * Math.cos(a) - p.y * Math.sin(a), p.x * Math.sin(a) + p.y * Math.cos(a));

/** The tail, from the rump back: a squared fan when hovering, closed when diving. Brown, barred pale, a pale tip. */
function tail(d: Draw, fanned: boolean): void {
  const { pen } = d;
  const shape = fanned
    ? [pt(-12, -4.6), ...bezier(pt(-30, -11.5), pt(-36, -0.5), pt(-30, 10.5), 10), pt(-12, 3.6)]
    : [pt(-12, -3.2), pt(-32, -3), pt(-34.5, 0), pt(-32, 3), pt(-12, 2.8)];
  skin(d, shape, BROWN, 0.72);
  pen.clipped(shape, () => {
    // Narrow pale bars parallel to the tip, a dark subterminal band, then the pale tip.
    const arc = (k: number): Pt[] => (fanned ? bezier(pt(-30 + k, -11.5), pt(-36 + k * 1.1, -0.5), pt(-30 + k, 10.5), 10) : [pt(-34 + k, -4), pt(-34 + k, 4)]);
    for (const k of [14, 10.5, 7]) pen.stroke(arc(k), 1.4, BAR, 0.8, false);
    pen.stroke(arc(3.2), 2.4, DEEP, 0.7, false);
    pen.stroke(arc(-0.4), 1.4, PAPER_FILL, 0.85, false);
    if (fanned) for (const a of [-0.3, -0.15, 0, 0.15, 0.3]) pen.hair([pt(-13, 0), pt(-13 - Math.cos(a) * 22, Math.sin(a) * 34)], 0.45, d.ink, 0.4);
  });
  shade(d, shape, 0.3);
  edge(d, shape, 1);
}

/**
 * Body, head and bill in the bird's own frame: level, facing right. Brown
 * back, white breast with a faint brown necklace, white head with the dark
 * eye stripe running back down the nape, and a little ragged crest.
 */
function body(d: Draw, diving: boolean): void {
  const { pen } = d;
  const shape = [
    ...cub(pt(20, -5.5), pt(18.5, -11.5), pt(10, -12), pt(7, -8.5), 8),
    // The ragged nape crest.
    pt(5, -10.6), pt(4.4, -8.4), pt(2, -10.2), pt(2, -8),
    ...cub(pt(2, -8), pt(-4, -9.5), pt(-9, -8.5), pt(-14, -4.5), 8).slice(1),
    pt(-13.5, 3.6),
    ...cub(pt(-13.5, 3.6), pt(-7, 11), pt(6, 11), pt(12, 5.6), 10).slice(1),
    ...cub(pt(12, 5.6), pt(16, 3.5), pt(18.5, 1), pt(20.5, -1.6), 6).slice(1),
  ];
  skin(d, shape, PAPER_FILL, 0.4);
  pen.clipped(shape, () => {
    // Dark brown back and nape; the dark stripe from the eye back to it.
    tint(d, [pt(-16, -13), pt(4, -13), pt(6, -6), pt(4, -3.4), pt(-4, -2.4), pt(-16, 0)], BROWN, 0.9);
    pen.stroke(cub(pt(17, -5.6), pt(13, -5.2), pt(9, -4.6), pt(4, -2.6), 8), 2.6, DEEP, 0.85, false);
    // Faint streaks on the crown, and the brown necklace across the breast.
    for (const x of [9, 11.5, 14]) pen.hair([pt(x, -10.4), pt(x - 1.4, -8.6)], 0.45, BROWN, 0.6);
    for (let i = 0; i < 10; i++) {
      const x = 4 + pen.rng() * 9;
      const y = 1 + pen.rng() * 4;
      pen.hair([pt(x, y), pt(x - 0.5, y + 1.4)], 0.55, BROWN, 0.6);
    }
    // Pale feather edges on the back.
    for (let i = 0; i < 8; i++) {
      const x = -12 + pen.rng() * 14;
      const y = -8 + pen.rng() * 5;
      pen.hair(bezier(pt(x - 1.2, y), pt(x, y + 0.9), pt(x + 1.2, y), 3), 0.45, EDGING, 0.7);
    }
  });
  shade(d, shape, 0.3);
  edge(d, shape, 1.2);
  // The black, strongly hooked bill.
  const bill = [pt(19, -6.6), pt(22.4, -6.6), pt(25.6, -4.4), pt(25.8, -0.6), pt(24.4, -1.6), pt(23.4, -2.6), pt(19.6, -1.8)];
  skin(d, bill, BILL, 0.75);
  pen.hair(bezier(pt(20, -2.8), pt(22, -3), pt(24, -2.2), 4), 0.5, PAPER_FILL, 0.5);
  edge(d, bill, 0.9);
  // The yellow eye in the dark stripe.
  pen.fill(oval(15.4, -5.6, 2.4, 2.2, 12), IRIS, 0.9);
  pen.dot(15.5, -5.6, 1.3, d.ink, 1);
  pen.dot(15.9, -6, 0.45, PAPER_FILL, 0.95);
  // Long pale legs: let down when hovering, thrust forward under the bill to strike when diving.
  const legs = diving
    ? [[pt(3, 8), pt(18, 12), pt(29, 11)], [pt(5, 9.4), pt(20, 14.4), pt(31, 14)]]
    : [[pt(1, 8), pt(2.6, 14), pt(4.6, 17.5)], [pt(4, 8), pt(6, 13.6), pt(8.4, 16.8)]];
  for (const leg of legs) {
    // White feathered thighs, then bare grey-blue shanks.
    const thigh = tube([leg[0]!, lerp(leg[0]!, leg[1]!, 0.45)], 4.4, 2.6);
    skin(d, thigh, PAPER_FILL, 0.3);
    edge(d, thigh, 0.6, 0.7);
    pen.stroke(leg, diving ? 2.2 : 1.9, LEG, 0.95, false);
    pen.stroke(leg.slice(1), 0.6, d.ink, 0.75, false);
    const f = leg[2]!;
    // Toes spread with long black hooked talons.
    const spread = diving ? [-1.1, -0.2, 0.7, 2.6] : [0.2, 0.9, 1.6];
    for (const a of spread) {
      const t0 = add(f, pt(2.4 * Math.cos(a), 2.4 * Math.sin(a)));
      pen.stroke([f, t0], 1.1, LEG, 0.95, false);
      pen.stroke(bezier(t0, add(t0, pt(1.4 * Math.cos(a), 1.4 * Math.sin(a))), add(t0, pt(1.6 * Math.cos(a + 1.2), 1.6 * Math.sin(a + 1.2))), 3), 0.8, d.ink, 0.95, false);
    }
  }
}

/**
 * A long, narrow wing from shoulder `s` towards angle `a`, crooked at the
 * wrist: a narrow arm, then a long hand ending in four fingered primaries.
 * `len` foreshortens the far one; `under` shows the underside (on the
 * downstroke): white coverts with the dark patch at the bend, grey flight
 * feathers barred dark, and dark fingertips.
 */
function wing(d: Draw, s: Pt, a: number, len: number, far: boolean, under: boolean): void {
  const { pen } = d;
  const ax = pt(Math.cos(a), Math.sin(a));
  const nrm = pt(-ax.y, ax.x);
  const k = nrm.x >= 0 ? 1 : -1;
  const at = (u: number, v: number): Pt => add(s, pt(ax.x * u * len + nrm.x * v * k, ax.y * u * len + nrm.y * v * k));
  // The leading edge bows forward to the wrist, then the hand sweeps back.
  const lead = cub(at(-0.06, 3), at(0.18, 6.4), at(0.38, 8), at(0.5, 6.6), 10);
  const hand = cub(at(0.5, 6.6), at(0.64, 5), at(0.76, 2.6), at(0.88, 0.8), 8).slice(1);
  const fingers: Pt[] = [];
  [[1, 0.6], [1.02, -2.2], [0.98, -5], [0.92, -7.6]].forEach(([u, v], i) => {
    if (i > 0) fingers.push(at(u! - 0.12, v! + 1.5));
    fingers.push(at(u! - 0.04, v! + 1.1), at(u!, v! + 0.3), at(u! - 0.01, v! - 0.6), at(u! - 0.05, v! - 1.1));
  });
  const trail = [at(0.8, -9.4), at(0.66, -10.2), at(0.52, -10.4), at(0.38, -10.4), at(0.24, -10.2), at(0.1, -9.2), at(-0.02, -6.6), at(-0.1, -1.5)];
  const shape = [...lead, ...hand, ...fingers, ...trail];
  skin(d, shape, under ? PAPER_FILL : BROWN, under ? 0.5 : far ? 0.85 : 0.82);
  pen.clipped(shape, () => {
    if (under) {
      // Grey flight feathers behind the white coverts, barred; the dark carpal patch; dark fingertips.
      pen.fill([at(-0.1, -5.4), at(0.8, -3.6), at(1.2, -3.6), at(1.2, -14), at(-0.1, -14)], FLIGHT, 0.6);
      pen.fill([at(0.76, 10), at(1.2, 8), at(1.2, -12), at(0.76, -12)], FLIGHT, 0.55);
      pen.fill([at(0.86, 10), at(1.2, 8), at(1.2, -12), at(0.86, -12)], DEEP, 0.7);
      pen.fill([at(0.42, 6), at(0.5, 7), at(0.58, 5), at(0.6, 1), at(0.52, -1.4), at(0.44, 1)], DEEP, 0.85);
      if (!far) {
        for (const v of [-7, -8.6]) pen.hair([at(0, v), at(0.78, v + 1.4)], 0.45, DEEP, 0.55);
        for (const u of [0.82, 0.9]) pen.hair([at(u, 4), at(u, -9)], 0.45, DEEP, 0.5);
      }
    } else {
      // Darker hand and trailing edge; the slightly paler coverts.
      pen.fill([at(0.64, 10), at(1.2, 8), at(1.2, -14), at(0.64, -14)], DEEP, 0.6);
      pen.fill([at(-0.1, -6.4), at(0.7, -6), at(0.7, -14), at(-0.1, -14)], DEEP, 0.35);
    }
    if (!far) {
      // Covert edges across the arm, and the separations between the flight feathers.
      for (let i = 0; i < 9; i++) {
        const p = at(0.04 + pen.rng() * 0.5, 4 - pen.rng() * 8);
        pen.hair([p, add(p, pt(ax.x * 2, ax.y * 2))], 0.45, under ? FLIGHT : EDGING, 0.6);
      }
      for (const u of [0.12, 0.26, 0.4, 0.54, 0.68]) pen.hair([at(u, -6), at(u - 0.02, -10)], 0.4, under ? DEEP : PAPER_FILL, 0.35);
    }
    if (far) pen.fill(shape, d.ink, 0.14);
  });
  if (!far) shade(d, shape, 0.3);
  if (!far) for (let i = 1; i < trail.length - 1; i++) pen.hair(bezier(trail[i - 1]!, add(lerp(trail[i - 1]!, trail[i]!, 0.5), pt(nrm.x * -k * 0.9, nrm.y * -k * 0.9)), trail[i]!, 3), 0.4, d.ink, 0.5);
  pen.stroke(closed(shape), far ? 0.8 : 1.1, d.ink, far ? 0.6 : 1, false);
}

/** Wing angles by frame, near wing then far: up, mid, down. */
const BEAT: readonly (readonly [number, number])[] = [[-1.85, -1.5], [-2.8, -2.5], [1.15, 1.45]];
const HOVER_TILT = -0.65;
const DIVE_TILT = 1.15;

export function osprey(d: Draw, dive: boolean): void {
  const { ctx } = d.pen;
  if (dive) {
    ctx.save();
    ctx.rotate(DIVE_TILT);
    ctx.translate(4, 0);
    tail(d, false);
    // The far wing swept back and raised above the back, only its edge showing.
    const raised = [
      ...cub(pt(6, -8), pt(-4, -16), pt(-18, -21), pt(-34, -19), 14),
      pt(-31, -15.6),
      ...cub(pt(-31, -15.6), pt(-20, -14), pt(-8, -9.5), pt(0, -6), 10),
    ];
    skin(d, raised, BROWN, 0.85);
    d.pen.fill(raised, d.ink, 0.14);
    d.pen.clipped(raised, () => d.pen.fill([pt(-18, -26), pt(-40, -22), pt(-40, -10), pt(-18, -10)], DEEP, 0.6));
    edge(d, raised, 0.8, 0.6);
    body(d, true);
    // The near wing swept back along the body, its crooked wrist high, the long primaries past the tail.
    const folded = [
      ...cub(pt(9, -7), pt(2, -15), pt(-12, -16), pt(-20, -12), 12),
      ...cub(pt(-20, -12), pt(-28, -9), pt(-36, -5), pt(-44, -2.4), 10).slice(1),
      pt(-41, 0.4),
      ...cub(pt(-41, 0.4), pt(-26, 1), pt(-8, 2), pt(7, -1), 12),
    ];
    skin(d, folded, BROWN, 0.82);
    d.pen.clipped(folded, () => {
      d.pen.fill([pt(-20, -16), pt(-48, -6), pt(-48, 3), pt(-20, 3)], DEEP, 0.6);
      for (const y of [-6, -3.4]) d.pen.hair([pt(-18, y - 2), pt(-40, y + 2)], 0.45, PAPER_FILL, 0.4);
      for (let i = 0; i < 8; i++) {
        const x = -10 + d.pen.rng() * 16;
        const y = -10 + d.pen.rng() * 7;
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
  wing(d, add(shoulder, pt(1.5, -1.5)), farA, down ? 38 : 44, true, down);
  ctx.save();
  ctx.rotate(HOVER_TILT);
  tail(d, true);
  body(d, false);
  ctx.restore();
  wing(d, shoulder, near, down ? 44 : 52, false, down);
}
