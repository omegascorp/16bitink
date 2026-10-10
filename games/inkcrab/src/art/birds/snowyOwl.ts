import { add, bezier, closed, cub, type Draw, edge, lerp, oval, pt, shade, skin, tint, tube } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';

/**
 * A snowy owl (Bubo scandiacus), side-on and facing right, drawn in the
 * critter frame (origin at its centre, CRITTER_FRAME units square) like the
 * kestrel, whose hunt it shares here: it hangs over the shingle on beating
 * wings, then drops on what it has seen. A big, heavy owl, white all over,
 * barred and flecked with dark brown (most heavily on the back and wings),
 * with a round head and no ear tufts, piercing yellow eyes under a frowning
 * brow, a black bill almost hidden in the feathers of the face, a short
 * rounded tail, broad rounded wings, and legs feathered right down to the
 * black talons. Hovering, it hangs tilted head-up with its furred feet let
 * down and the tail spread, the wings beating (up, mid, down by frame); on
 * the downstroke the white underside shows, barred only near the tips.
 * `dive`: dropping head-down, the wings swept back and raised over the
 * back, the feathered feet and talons thrust forward.
 */
/** Frame units across the hovering bird, wings included, at its widest frame. */
export const SNOWY_OWL_SPAN = 72;

const WHITE = '#eceef0';
const COOL = '#b9c1cd';
const BAR = '#3d3836';
const EYE = '#f0bf2a';
const BILL = '#2b292a';

const rot = (p: Pt, a: number): Pt => pt(p.x * Math.cos(a) - p.y * Math.sin(a), p.x * Math.sin(a) + p.y * Math.cos(a));

/** Dark bars across an area: short curved flecks in rows, `n` of them, inside `clip`. */
function bars(d: Draw, x0: number, x1: number, y0: number, y1: number, n: number, len = 2.4, alpha = 0.75): void {
  const { pen } = d;
  for (let i = 0; i < n; i++) {
    const x = x0 + pen.rng() * (x1 - x0);
    const y = y0 + pen.rng() * (y1 - y0);
    pen.stroke(bezier(pt(x - len / 2, y - 0.3), pt(x, y + 0.7), pt(x + len / 2, y - 0.3), 3), 0.9, BAR, alpha, false);
  }
}

/** The tail, from the rump back: short, rounded and spread when hovering, closed when diving. White, barred dark. */
function tail(d: Draw, fanned: boolean): void {
  const { pen } = d;
  const shape = fanned
    ? [pt(-12, -4.6), ...bezier(pt(-25, -10), pt(-34, 0), pt(-25, 9.5), 10), pt(-12, 3.6)]
    : [pt(-12, -3.4), pt(-27, -3), pt(-30, 0), pt(-27, 3), pt(-12, 3)];
  skin(d, shape, WHITE, 0.6);
  pen.clipped(shape, () => {
    // Bars across the tail, following its rounded end.
    for (const k of [3, 8, 13]) {
      const arc = fanned ? bezier(pt(-25 + k, -10 + k * 0.4), pt(-34 + k * 1.1, 0), pt(-25 + k, 9.5 - k * 0.4), 10) : [pt(-29 + k, -4), pt(-29 + k, 4)];
      pen.stroke(arc, 1.1, BAR, 0.6, false);
    }
    if (fanned) for (const a of [-0.3, -0.15, 0, 0.15, 0.3]) pen.hair([pt(-13, 0), pt(-13 - Math.cos(a) * 20, Math.sin(a) * 28)], 0.4, d.ink, 0.35);
  });
  shade(d, shape, 0.3);
  edge(d, shape, 1);
}

/** A leg feathered to the toes: a fluffy white boot along `leg`, then the black, hooked talons spread from its end. */
function foot(d: Draw, leg: readonly Pt[], spread: readonly number[]): void {
  const { pen } = d;
  const boot = tube(leg, 5.4, 3.6);
  skin(d, boot, WHITE, 0.6);
  pen.clipped(boot, () => pen.fill(boot.map((p) => pt(p.x + 1, p.y + 1.4)), COOL, 0.35));
  edge(d, boot, 0.7, 0.85);
  // A few feathery strokes standing off the boot.
  for (const u of [0.3, 0.6, 0.9]) {
    const p = lerp(leg[0]!, leg[leg.length - 1]!, u);
    pen.hair([pt(p.x - 2, p.y), pt(p.x - 3.2, p.y + 1)], 0.4, d.ink, 0.6);
  }
  const f = leg[leg.length - 1]!;
  for (const a of spread) {
    const t0 = add(f, pt(2 * Math.cos(a), 2 * Math.sin(a)));
    pen.stroke(bezier(t0, add(t0, pt(1.6 * Math.cos(a), 1.6 * Math.sin(a))), add(t0, pt(1.8 * Math.cos(a + 1.3), 1.8 * Math.sin(a + 1.3))), 3), 0.95, BILL, 0.95, false);
  }
}

/**
 * Body, head and bill in the bird's own frame: level, facing right. A big
 * round head straight onto a heavy body, white, barred over the back and
 * flanks, flecked on the crown; the face plain white.
 */
function body(d: Draw, diving: boolean): void {
  const { pen } = d;
  const shape = [
    ...cub(pt(21.5, -3), pt(21.5, -12.5), pt(12, -15), pt(6, -10.5), 10),
    ...cub(pt(6, -10.5), pt(-2, -10.5), pt(-9, -9), pt(-14, -4.5), 8).slice(1),
    pt(-13.5, 3.6),
    ...cub(pt(-13.5, 3.6), pt(-7, 12.4), pt(6, 12.8), pt(13, 7.4), 10).slice(1),
    ...cub(pt(13, 7.4), pt(17.5, 5), pt(21, 2.6), pt(21.5, -3), 6).slice(1),
  ];
  skin(d, shape, WHITE, 0.55);
  pen.clipped(shape, () => {
    // Cool shadow under the belly and round the back of the head.
    tint(d, oval(-2, 11, 17, 5, 14), COOL, 0.7);
    tint(d, oval(8, -10, 4, 5, 10), COOL, 0.35);
    // Bars over the back and flanks, flecks over the crown and nape; the face stays white.
    bars(d, -13, 7, -9, 8, 22, 2.6, 0.75);
    for (let i = 0; i < 12; i++) pen.dot(6 + pen.rng() * 9, -13 + pen.rng() * 5, 0.55, BAR, 0.8);
    // The facial disc: a soft rim of feathers curving behind the eye.
    pen.hair(bezier(pt(12.5, -11.5), pt(10.5, -4), pt(13.5, 4), 8), 0.6, COOL, 0.9);
  });
  shade(d, shape, 0.32);
  edge(d, shape, 1.2);
  // The black bill, hooked, nearly hidden in the bristles of the face.
  const bill = [pt(20.4, -4.6), pt(22.4, -4.2), pt(23.4, -2.4), pt(22.8, 0), pt(21.6, -1.4), pt(20.4, -1.6)];
  skin(d, bill, BILL, 0.85);
  edge(d, bill, 0.7);
  for (const y of [-5.6, -4, -1]) pen.hair([pt(18.6, y), pt(21.8, y + 0.3)], 0.45, d.ink, 0.5);
  // The yellow eye, black pupil, under a heavy frowning brow.
  pen.fill(oval(17.4, -5, 2.5, 2.3, 12), EYE, 0.95);
  pen.dot(17.8, -5, 1.25, BILL, 1);
  pen.dot(18.3, -5.6, 0.45, PAPER_FILL, 0.95);
  pen.stroke(closed(oval(17.4, -5, 2.5, 2.3, 12)), 0.55, d.ink, 0.85, false);
  pen.stroke(bezier(pt(14.2, -8.6), pt(17.4, -8.6), pt(20.4, -6.4), 5), 0.9, d.ink, 0.85, false);
  // The feathered legs: let down when hovering, thrust forward under the bill to strike when diving.
  if (diving) {
    foot(d, [pt(4, 8), pt(14, 11.6), pt(22, 11)], [-1.1, -0.2, 0.7, 2.6]);
    foot(d, [pt(6, 9.4), pt(16, 14), pt(24.4, 14)], [-1.1, -0.2, 0.7, 2.6]);
  } else {
    foot(d, [pt(1, 9), pt(2.4, 13), pt(3.6, 15.4)], [0.2, 0.9, 1.6]);
    foot(d, [pt(4.6, 9), pt(6, 12.8), pt(7.6, 15)], [0.2, 0.9, 1.6]);
  }
}

/**
 * A broad, rounded wing from shoulder `s` towards angle `a`: a deep arm and
 * a rounded hand of short-fingered primaries. `len` foreshortens the far
 * one. Above, white crossed with rows of dark bars, heaviest towards the
 * tip; `under` (on the downstroke), white with bars only at the tips.
 */
function wing(d: Draw, s: Pt, a: number, len: number, far: boolean, under: boolean): void {
  const { pen } = d;
  const ax = pt(Math.cos(a), Math.sin(a));
  const nrm = pt(-ax.y, ax.x);
  const k = nrm.x >= 0 ? 1 : -1;
  const at = (u: number, v: number): Pt => add(s, pt(ax.x * u * len + nrm.x * v * k, ax.y * u * len + nrm.y * v * k));
  // The leading edge bows forward to the wrist, then the rounded hand.
  const lead = cub(at(-0.06, 3), at(0.18, 7.6), at(0.4, 9), at(0.56, 7.8), 10);
  const hand = cub(at(0.56, 7.8), at(0.72, 6.6), at(0.86, 4.4), at(0.94, 2), 8).slice(1);
  const fingers: Pt[] = [];
  [[1, 0.8], [1.03, -2.4], [1, -5.6], [0.93, -8.6]].forEach(([u, v], i) => {
    if (i > 0) fingers.push(at(u! - 0.11, v! + 1.6));
    fingers.push(at(u! - 0.03, v! + 1.2), at(u!, v! + 0.2), at(u! - 0.02, v! - 0.8), at(u! - 0.05, v! - 1.2));
  });
  const trail = [at(0.8, -11.4), at(0.66, -12.6), at(0.5, -13), at(0.34, -12.8), at(0.2, -12), at(0.07, -10.4), at(-0.04, -7), at(-0.1, -1.5)];
  const shape = [...lead, ...hand, ...fingers, ...trail];
  skin(d, shape, WHITE, far ? 0.75 : 0.55);
  pen.clipped(shape, () => {
    // Cool shadow along the trailing edge.
    pen.fill([at(-0.1, -9), at(1.1, -6), at(1.1, -16), at(-0.1, -16)], COOL, under ? 0.4 : 0.3);
    // Rows of dark chevron bars across the wing, heavier out over the hand; only the tips underneath.
    const rows = under ? [0.8, 0.9, 0.99] : [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.99];
    for (const u of rows) {
      const heavy = u > 0.45;
      for (let v = 8; v > -13; v -= heavy ? 2.4 : 3.2) {
        if (pen.rng() < (heavy ? 0.12 : 0.3)) continue;
        const c = at(u, v + pen.jitter(0.6));
        const l = heavy ? 1.6 : 1.3;
        pen.stroke([pt(c.x - ax.x * l * len * 0.02 + nrm.x * l, c.y - ax.y * l * len * 0.02 + nrm.y * l), c, pt(c.x - ax.x * l * len * 0.02 - nrm.x * l, c.y - ax.y * l * len * 0.02 - nrm.y * l)], heavy ? 1.2 : 1, BAR, far ? 0.5 : under ? 0.6 : 0.75, false);
      }
    }
    if (!far) for (const u of [0.62, 0.74, 0.86]) pen.hair([at(u, 5), at(u - 0.02, -9)], 0.4, d.ink, 0.3);
    if (far) pen.fill(shape, d.ink, 0.12);
  });
  if (!far) shade(d, shape, 0.28);
  if (!far) for (let i = 1; i < trail.length - 1; i++) pen.hair(bezier(trail[i - 1]!, add(lerp(trail[i - 1]!, trail[i]!, 0.5), pt(nrm.x * -k * 0.9, nrm.y * -k * 0.9)), trail[i]!, 3), 0.4, d.ink, 0.5);
  pen.stroke(closed(shape), far ? 0.8 : 1.1, d.ink, far ? 0.6 : 1, false);
}

/** The dropping pose: wings swept back, the far one raised over the back. In the bird's own frame. */
function stoop(d: Draw): void {
  const { pen } = d;
  tail(d, false);
  const raised = [
    ...cub(pt(6, -9), pt(-4, -17), pt(-17, -22), pt(-31, -20), 14),
    pt(-28.6, -16),
    ...cub(pt(-28.6, -16), pt(-19, -14.6), pt(-8, -10), pt(0, -6.4), 10),
  ];
  skin(d, raised, WHITE, 0.75);
  pen.fill(raised, d.ink, 0.12);
  pen.clipped(raised, () => bars(d, -30, -6, -21, -10, 12, 2.2, 0.5));
  edge(d, raised, 0.8, 0.6);
  body(d, true);
  // The near wing swept back along the body, its wrist high, the barred primaries past the tail.
  const folded = [
    ...cub(pt(9, -8), pt(2, -16), pt(-12, -16.6), pt(-20, -12.4), 12),
    ...cub(pt(-20, -12.4), pt(-27, -9), pt(-33, -5), pt(-38, -2.4), 10).slice(1),
    pt(-35.4, 0.6),
    ...cub(pt(-35.4, 0.6), pt(-24, 1.2), pt(-8, 2), pt(7, -1), 12),
  ];
  skin(d, folded, WHITE, 0.6);
  pen.clipped(folded, () => {
    pen.fill([pt(-40, 0), pt(10, 0), pt(10, 4), pt(-40, 4)], COOL, 0.4);
    // Heavier bars over the primaries, flecks over the coverts.
    for (const x of [-35, -31, -27, -23, -19]) pen.stroke(bezier(pt(x + 1, -9), pt(x - 1, -4), pt(x, 1), 4), 1.3, BAR, 0.85, false);
    bars(d, -16, 6, -14, -2, 16, 2.4, 0.75);
  });
  shade(d, folded, 0.3);
  edge(d, folded, 1.1);
}

/** Wing angles by frame, near wing then far: up, mid, down. */
const BEAT: readonly (readonly [number, number])[] = [[-1.85, -1.5], [-2.8, -2.5], [1.15, 1.45]];
const HOVER_TILT = -0.6;
const DIVE_TILT = 1.15;

export function snowyOwl(d: Draw, dive: boolean): void {
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
  const shoulder = rot(pt(2, -6.5), HOVER_TILT);
  const down = d.f === 2;
  wing(d, add(shoulder, pt(1.5, -1.5)), farA, down ? 36 : 42, true, down);
  ctx.save();
  ctx.rotate(HOVER_TILT);
  tail(d, true);
  body(d, false);
  ctx.restore();
  wing(d, shoulder, near, down ? 42 : 50, false, down);
}
