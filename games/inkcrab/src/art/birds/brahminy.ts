import { add, bezier, closed, cub, type Draw, edge, lerp, oval, pt, shade, skin, tint, tube } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';

/**
 * A Brahminy kite (Haliastur indus), side-on and facing right, drawn in the
 * critter frame (origin at its centre, CRITTER_FRAME units square) like the
 * kestrel, whose hunt it shares: it hangs over the harbour on beating wings,
 * then drops on what it has seen. Rich chestnut body and wings, the head,
 * neck and breast white, finely streaked dark; a pale, hooked bill with a
 * yellow cere, a rounded chestnut tail tipped pale, and broad wings ending
 * in five black, fingered primaries. Hovering, it hangs tilted head-up with
 * its short yellow legs let down and the tail fanned, the wings beating (up,
 * mid, down by frame); on the downstroke the underside shows paler flight
 * feathers and the black tips. `dive`: stooping head-down, the wings swept
 * back and raised over the back, the legs and talons thrust forward.
 */
/** Frame units across the hovering bird, wings included, at its widest frame. */
export const BRAHMINY_SPAN = 71;

const CHESTNUT = '#8e5230';
const DEEP = '#5a3220';
const EDGING = '#c08a5e';
const FLIGHT = '#c4946a';
const TIPS = '#211d1b';
const STREAK = '#5e4a3c';
const BILL = '#e1d7a8';
const CERE = '#e3c34a';
const LEG = '#e0bf4c';

const rot = (p: Pt, a: number): Pt => pt(p.x * Math.cos(a) - p.y * Math.sin(a), p.x * Math.sin(a) + p.y * Math.cos(a));

/** The tail, from the rump back: a rounded fan when hovering, closed when diving. Chestnut, a pale tip. */
function tail(d: Draw, fanned: boolean): void {
  const { pen } = d;
  const shape = fanned
    ? [pt(-12, -4.6), ...bezier(pt(-29, -11.5), pt(-39, -0.5), pt(-29, 10.5), 10), pt(-12, 3.6)]
    : [pt(-12, -3.2), pt(-31, -3), pt(-34.5, 0), pt(-31, 3), pt(-12, 2.8)];
  skin(d, shape, CHESTNUT, 0.78);
  pen.clipped(shape, () => {
    // Darker towards the end, then the narrow pale tip.
    const arc = (k: number): Pt[] => (fanned ? bezier(pt(-29 + k, -11.5), pt(-39 + k * 1.1, -0.5), pt(-29 + k, 10.5), 10) : [pt(-34 + k, -4), pt(-34 + k, 4)]);
    pen.stroke(arc(4), 4, DEEP, 0.45, false);
    pen.stroke(arc(-0.4), 1.4, EDGING, 0.85, false);
    if (fanned) for (const a of [-0.3, -0.15, 0, 0.15, 0.3]) pen.hair([pt(-13, 0), pt(-13 - Math.cos(a) * 24, Math.sin(a) * 34)], 0.45, d.ink, 0.4);
  });
  shade(d, shape, 0.3);
  edge(d, shape, 1);
}

/** Toes spread from `f`, with black hooked talons. */
function talons(d: Draw, f: Pt, spread: readonly number[]): void {
  for (const a of spread) {
    const t0 = add(f, pt(2.2 * Math.cos(a), 2.2 * Math.sin(a)));
    d.pen.stroke([f, t0], 1.1, LEG, 0.95, false);
    d.pen.stroke(bezier(t0, add(t0, pt(1.3 * Math.cos(a), 1.3 * Math.sin(a))), add(t0, pt(1.5 * Math.cos(a + 1.2), 1.5 * Math.sin(a + 1.2))), 3), 0.8, d.ink, 0.95, false);
  }
}

/**
 * Body, head and bill in the bird's own frame: level, facing right. White
 * head, neck and breast, finely streaked; chestnut back, belly and thighs.
 */
function body(d: Draw, diving: boolean): void {
  const { pen } = d;
  const shape = [
    ...cub(pt(20, -5.5), pt(18.5, -11.5), pt(10, -12), pt(6, -8.5), 8),
    ...cub(pt(6, -8.5), pt(-2, -9.8), pt(-9, -8.5), pt(-14, -4.5), 8).slice(1),
    pt(-13.5, 3.6),
    ...cub(pt(-13.5, 3.6), pt(-7, 11), pt(6, 11), pt(12, 5.6), 10).slice(1),
    ...cub(pt(12, 5.6), pt(16, 3.5), pt(18.5, 1), pt(20.5, -1.6), 6).slice(1),
  ];
  skin(d, shape, PAPER_FILL, 0.4);
  pen.clipped(shape, () => {
    // Chestnut from the mantle back and under the belly; the white hood down over the breast.
    tint(d, [pt(-16, -13), pt(2, -13), pt(4, -6), pt(5, 1), pt(8, 6), pt(9, 14), pt(-16, 14)], CHESTNUT, 0.9);
    tint(d, oval(-6, -9, 10, 3, 12), DEEP, 0.35);
    // Fine dark shaft streaks over the white head, neck and breast.
    for (let i = 0; i < 22; i++) {
      const x = 4 + pen.rng() * 15;
      const y = -10 + pen.rng() * 15;
      pen.hair([pt(x, y), pt(x - 0.5, y + 1.3)], 0.4, STREAK, 0.55);
    }
    // Pale feather edges on the mantle.
    for (let i = 0; i < 8; i++) {
      const x = -12 + pen.rng() * 12;
      const y = -8 + pen.rng() * 5;
      pen.hair(bezier(pt(x - 1.2, y), pt(x, y + 0.9), pt(x + 1.2, y), 3), 0.45, EDGING, 0.7);
    }
  });
  shade(d, shape, 0.3);
  edge(d, shape, 1.2);
  // The pale, hooked bill with its yellow cere.
  const bill = [pt(19, -6.4), pt(22, -6.4), pt(24.6, -4.4), pt(24.8, -0.8), pt(23.6, -1.6), pt(22.8, -2.6), pt(19.6, -1.8)];
  skin(d, bill, BILL, 0.8);
  pen.fill(oval(20.2, -4.8, 1.4, 1.6, 8), CERE, 0.9);
  pen.hair(bezier(pt(20, -2.8), pt(22, -3), pt(23.6, -2.2), 4), 0.5, d.ink, 0.6);
  edge(d, bill, 0.9);
  // The dark brown eye.
  pen.dot(15.4, -5.6, 1.6, d.ink, 1);
  pen.dot(15.9, -6.1, 0.5, PAPER_FILL, 0.95);
  // Short yellow legs: let down when hovering, thrust forward under the bill to strike when diving.
  const legs = diving
    ? [[pt(3, 8), pt(15, 11), pt(24, 10)], [pt(5, 9.4), pt(17, 13.4), pt(26, 13)]]
    : [[pt(1, 8), pt(2.4, 12.6), pt(4, 15)], [pt(4, 8), pt(5.6, 12.4), pt(7.6, 14.6)]];
  for (const leg of legs) {
    // Chestnut feathered thighs, then bare yellow shanks.
    const thigh = tube([leg[0]!, lerp(leg[0]!, leg[1]!, 0.5)], 4.4, 2.6);
    skin(d, thigh, CHESTNUT, 0.8);
    edge(d, thigh, 0.6, 0.7);
    pen.stroke(leg, diving ? 2 : 1.8, LEG, 0.95, false);
    pen.stroke(leg.slice(1), 0.6, d.ink, 0.75, false);
    talons(d, leg[2]!, diving ? [-1.1, -0.2, 0.7, 2.6] : [0.2, 0.9, 1.6]);
  }
}

/**
 * A broad wing from shoulder `s` towards angle `a`, crooked at the wrist:
 * a broad arm, then a hand ending in five fingered primaries, black-tipped.
 * `len` foreshortens the far one; `under` shows the underside (on the
 * downstroke): chestnut coverts, paler, barred flight feathers, black tips.
 */
function wing(d: Draw, s: Pt, a: number, len: number, far: boolean, under: boolean): void {
  const { pen } = d;
  const ax = pt(Math.cos(a), Math.sin(a));
  const nrm = pt(-ax.y, ax.x);
  const k = nrm.x >= 0 ? 1 : -1;
  const at = (u: number, v: number): Pt => add(s, pt(ax.x * u * len + nrm.x * v * k, ax.y * u * len + nrm.y * v * k));
  // The leading edge bows forward to the wrist, then the hand sweeps back.
  const lead = cub(at(-0.06, 3), at(0.18, 7), at(0.38, 8.6), at(0.52, 7.4), 10);
  const hand = cub(at(0.52, 7.4), at(0.66, 6), at(0.78, 3.6), at(0.88, 2), 8).slice(1);
  const fingers: Pt[] = [];
  [[1, 1.6], [1.03, -1.4], [1.01, -4.4], [0.96, -7.2], [0.88, -9.8]].forEach(([u, v], i) => {
    if (i > 0) fingers.push(at(u! - 0.11, v! + 1.6));
    fingers.push(at(u! - 0.04, v! + 1.1), at(u!, v! + 0.3), at(u! - 0.01, v! - 0.6), at(u! - 0.05, v! - 1.1));
  });
  const trail = [at(0.74, -11.6), at(0.6, -12.2), at(0.46, -12.4), at(0.32, -12.2), at(0.18, -11.6), at(0.06, -10.2), at(-0.04, -7), at(-0.1, -1.5)];
  const shape = [...lead, ...hand, ...fingers, ...trail];
  skin(d, shape, CHESTNUT, far ? 0.85 : 0.8);
  pen.clipped(shape, () => {
    if (under) {
      // Paler flight feathers behind the chestnut coverts, finely barred.
      pen.fill([at(-0.1, -6), at(0.84, -4), at(1.2, -4), at(1.2, -16), at(-0.1, -16)], FLIGHT, 0.75);
      if (!far) for (const v of [-8, -10]) pen.hair([at(0, v), at(0.76, v + 1.2)], 0.45, DEEP, 0.45);
    } else {
      // Darker along the trailing edge of the arm.
      pen.fill([at(-0.1, -8), at(0.7, -7.4), at(0.7, -16), at(-0.1, -16)], DEEP, 0.4);
    }
    // The black wingtips: the fingered ends of the primaries.
    pen.fill([at(0.8, 12), at(1.2, 10), at(1.2, -14), at(0.76, -14)], TIPS, 0.88);
    if (!far) {
      // Covert edges across the arm, and the separations between the flight feathers.
      for (let i = 0; i < 9; i++) {
        const p = at(0.04 + pen.rng() * 0.5, 5 - pen.rng() * 9);
        pen.hair([p, add(p, pt(ax.x * 2, ax.y * 2))], 0.45, EDGING, 0.6);
      }
      for (const u of [0.12, 0.26, 0.4, 0.54, 0.68]) pen.hair([at(u, -7), at(u - 0.02, -12)], 0.4, under ? DEEP : EDGING, 0.4);
    }
    if (far) pen.fill(shape, d.ink, 0.14);
  });
  if (!far) shade(d, shape, 0.3);
  if (!far) for (let i = 1; i < trail.length - 1; i++) pen.hair(bezier(trail[i - 1]!, add(lerp(trail[i - 1]!, trail[i]!, 0.5), pt(nrm.x * -k * 0.9, nrm.y * -k * 0.9)), trail[i]!, 3), 0.4, d.ink, 0.5);
  pen.stroke(closed(shape), far ? 0.8 : 1.1, d.ink, far ? 0.6 : 1, false);
}

/** The stooping pose: wings swept back, the far one raised over the back. In the bird's own frame. */
function stoop(d: Draw): void {
  const { pen } = d;
  tail(d, false);
  const raised = [
    ...cub(pt(6, -8), pt(-4, -16), pt(-18, -21), pt(-33, -19), 14),
    pt(-30, -15.6),
    ...cub(pt(-30, -15.6), pt(-20, -14), pt(-8, -9.5), pt(0, -6), 10),
  ];
  skin(d, raised, CHESTNUT, 0.85);
  pen.fill(raised, d.ink, 0.14);
  pen.clipped(raised, () => pen.fill([pt(-22, -26), pt(-40, -22), pt(-40, -10), pt(-22, -10)], TIPS, 0.75));
  edge(d, raised, 0.8, 0.6);
  body(d, true);
  // The near wing swept back along the body, its crooked wrist high, the black primaries past the tail.
  const folded = [
    ...cub(pt(9, -7), pt(2, -15), pt(-12, -16), pt(-20, -12), 12),
    ...cub(pt(-20, -12), pt(-28, -9), pt(-35, -5), pt(-42, -2.4), 10).slice(1),
    pt(-39, 0.4),
    ...cub(pt(-39, 0.4), pt(-26, 1), pt(-8, 2), pt(7, -1), 12),
  ];
  skin(d, folded, CHESTNUT, 0.85);
  pen.clipped(folded, () => {
    pen.fill([pt(-24, -16), pt(-48, -6), pt(-48, 3), pt(-24, 3)], TIPS, 0.85);
    for (const y of [-6, -3.4]) pen.hair([pt(-18, y - 2), pt(-38, y + 2)], 0.45, EDGING, 0.45);
    for (let i = 0; i < 8; i++) {
      const x = -10 + pen.rng() * 16;
      const y = -10 + pen.rng() * 7;
      pen.hair([pt(x, y), pt(x - 2, y + 0.4)], 0.45, EDGING, 0.65);
    }
  });
  shade(d, folded, 0.32);
  edge(d, folded, 1.1);
}

/** Wing angles by frame, near wing then far: up, mid, down. */
const BEAT: readonly (readonly [number, number])[] = [[-1.85, -1.5], [-2.8, -2.5], [1.15, 1.45]];
const HOVER_TILT = -0.65;
const DIVE_TILT = 1.15;

export function brahminy(d: Draw, dive: boolean): void {
  const { ctx } = d.pen;
  if (dive) {
    ctx.save();
    ctx.rotate(DIVE_TILT);
    ctx.translate(4, 0);
    stoop(d);
    ctx.restore();
    return;
  }
  const [near, farA] = BEAT[d.f]!;
  const shoulder = rot(pt(2, -6), HOVER_TILT);
  const down = d.f === 2;
  wing(d, add(shoulder, pt(1.5, -1.5)), farA, down ? 36 : 42, true, down);
  ctx.save();
  ctx.rotate(HOVER_TILT);
  tail(d, true);
  body(d, false);
  ctx.restore();
  wing(d, shoulder, near, down ? 42 : 50, false, down);
}
