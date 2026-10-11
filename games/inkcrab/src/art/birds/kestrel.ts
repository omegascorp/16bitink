import { add, bezier, closed, cub, type Draw, edge, oval, pt, shade, skin, tint } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';

/**
 * A male kestrel, side-on and facing right, drawn in the critter frame
 * (origin at its centre, CRITTER_FRAME units square). Hovering, it hangs
 * tilted head-up with the tail fanned and pressed down and the long, pointed
 * wings beating (up, mid, down by frame). `dive`: stooping head-down, wings
 * folded back along the body into a compact teardrop.
 */
/** Frame units across the hovering bird, wings included, at its widest frame. */
export const KESTREL_SPAN = 70;

const RUFOUS = '#c06a35';
const SPOT = '#3f2617';
const GREY = '#8a93a3';
const BUFF = '#efd6a6';
const DARK = '#38343a';
const CERE = '#e5bd45';

const rot = (p: Pt, a: number): Pt => pt(p.x * Math.cos(a) - p.y * Math.sin(a), p.x * Math.sin(a) + p.y * Math.cos(a));

/** The tail, from the rump back: a broad fan when hovering, closed when diving. Grey, a black band, a pale tip. */
function tail(d: Draw, fanned: boolean): void {
  const { pen } = d;
  const shape = fanned
    ? [pt(-11, -4), ...bezier(pt(-30, -12), pt(-38, -1), pt(-30, 11), 10), pt(-11, 3)]
    : [pt(-11, -3), pt(-34, -2.6), pt(-37, 0), pt(-34, 2.6), pt(-11, 2.6)];
  skin(d, shape, GREY, 0.75);
  pen.clipped(shape, () => {
    // The black band near the tip, then the white tip itself.
    const band = fanned ? bezier(pt(-28, -12), pt(-35, -1), pt(-28, 11), 10) : [pt(-31, -4), pt(-31, 4)];
    pen.stroke(band, 3.4, DARK, 0.85, false);
    if (fanned) {
      pen.stroke(bezier(pt(-31, -13), pt(-39.5, -1), pt(-31, 12), 10), 1.6, PAPER_FILL, 0.9, false);
      // The feathers of the fan.
      for (const a of [-0.3, -0.15, 0, 0.15, 0.3]) pen.hair([pt(-12, 0), pt(-12 - Math.cos(a) * 24, Math.sin(a) * 36)], 0.45, d.ink, 0.45);
    }
  });
  shade(d, shape, 0.3);
  edge(d, shape, 1);
}

/** Body, head and beak in the bird's own frame: level, facing right. */
function body(d: Draw, diving: boolean): void {
  const { pen } = d;
  const shape = [
    ...cub(pt(20, -6), pt(18, -11), pt(11, -11), pt(8, -7), 8),
    ...cub(pt(8, -7), pt(0, -9.5), pt(-8, -8), pt(-13, -4), 10).slice(1),
    pt(-12, 3),
    ...cub(pt(-12, 3), pt(-6, 10), pt(6, 10), pt(12, 5), 10).slice(1),
    ...cub(pt(12, 5), pt(16, 3), pt(19, 1), pt(21, -2), 6).slice(1),
  ];
  skin(d, shape, BUFF, 0.7);
  pen.clipped(shape, () => {
    // Rufous back with dark spots; grey head.
    tint(d, [pt(-14, -12), pt(10, -12), pt(10, -3), pt(-2, -2), pt(-14, 0)], RUFOUS, 0.75);
    tint(d, oval(15, -5, 8, 7.5, 16), GREY, 0.8);
    for (let i = 0; i < 9; i++) pen.dot(-10 + pen.rng() * 18, -7.5 + pen.rng() * 4, 0.7, SPOT, 0.8);
    // Streaked buff breast.
    for (let i = 0; i < 12; i++) {
      const x = -6 + pen.rng() * 16;
      const y = 1 + pen.rng() * 6;
      pen.hair([pt(x, y), pt(x - 0.6, y + 1.4)], 0.6, SPOT, 0.65);
    }
    // The dark "moustache" below the eye.
    pen.stroke([pt(15, -3), pt(14.2, 0), pt(13.2, 3)], 1.6, DARK, 0.85, false);
  });
  shade(d, shape, 0.35);
  edge(d, shape, 1.2);
  // The hooked beak with its yellow cere.
  const beak = [pt(20, -6.2), pt(23.5, -5.6), pt(25.5, -3.2), pt(24.8, -0.6), pt(23.4, -2.2), pt(20.8, -1.6)];
  skin(d, beak, DARK, 0.55);
  pen.fill(oval(20.8, -4.6, 1.4, 1.6, 8), CERE, 0.9);
  edge(d, beak, 0.9);
  // The big dark eye in a yellow ring.
  pen.fill(oval(15.6, -5.6, 2.6, 2.4, 12), CERE, 0.85);
  pen.dot(15.6, -5.6, 1.9, d.ink, 1);
  pen.dot(16.2, -6.2, 0.6, PAPER_FILL, 0.95);
  if (diving) return;
  // Feet tucked up under the belly, toes curled.
  for (const dx of [0, 2.5]) pen.stroke([pt(1 + dx, 8), pt(2 + dx, 11), pt(4 + dx, 11.5)], 1, d.ink, 0.9, false);
}

/**
 * A long pointed wing from shoulder `s` towards angle `a`; `len` foreshortens
 * the far one. `under` shows the pale, barred underside (on the downstroke).
 */
function wing(d: Draw, s: Pt, a: number, len: number, far: boolean, under: boolean): void {
  const { pen } = d;
  const ax = pt(Math.cos(a), Math.sin(a));
  const nrm = pt(-ax.y, ax.x);
  // The leading edge faces forward (right).
  const k = nrm.x >= 0 ? 1 : -1;
  const at = (u: number, v: number): Pt => add(s, pt(ax.x * u * len + nrm.x * v * k, ax.y * u * len + nrm.y * v * k));
  // Broad at the arm, bending at the wrist, then a long narrow hand to a sharp point.
  const lead = cub(at(-0.06, 3), at(0.2, 6.5), at(0.42, 6), at(1, 0), 16);
  const trail = [at(0.9, -1.6), at(0.78, -3.4), at(0.64, -5.4), at(0.5, -7.6), at(0.36, -9.6), at(0.22, -10.4), at(0.08, -9.6), at(-0.04, -7), at(-0.1, -2)];
  const shape = [...lead, ...trail];
  skin(d, shape, under ? BUFF : RUFOUS, far ? 0.8 : 0.72);
  pen.clipped(shape, () => {
    // The dark outer hand; on top, a dark band along the trailing edge of the arm too.
    pen.fill([at(0.44, 10), at(1.2, 0), at(0.7, -10), at(0.44, -12)], under ? GREY : DARK, under ? 0.55 : 0.85);
    if (!under) pen.fill([at(0, -7), at(0.46, -6.5), at(0.46, -12), at(0, -12)], DARK, 0.4);
    if (!far) {
      // Spotted coverts (barred underneath), and the separations between the primaries.
      for (let i = 0; i < 9; i++) {
        const p = at(0.06 + pen.rng() * 0.36, -6 + pen.rng() * 10);
        pen.dot(p.x, p.y, under ? 0.5 : 0.65, SPOT, under ? 0.6 : 0.85);
      }
      for (const u of [0.52, 0.62, 0.72, 0.82]) pen.hair([at(u, 4.5 - u * 4), at(u + 0.1, -6 + u * 5)], 0.45, PAPER_FILL, 0.45);
    }
    if (far) pen.fill(shape, d.ink, 0.14);
  });
  if (!far) shade(d, shape, 0.3);
  // Scalloped trailing edge, then the contour.
  if (!far) for (let i = 1; i < trail.length - 1; i++) pen.hair(bezier(trail[i - 1]!, add(lerpMid(trail[i - 1]!, trail[i]!), pt(nrm.x * -k * 0.9, nrm.y * -k * 0.9)), trail[i]!, 3), 0.4, d.ink, 0.5);
  pen.stroke(closed(shape), far ? 0.8 : 1.1, d.ink, far ? 0.6 : 1, false);
}

const lerpMid = (a: Pt, b: Pt): Pt => pt((a.x + b.x) / 2, (a.y + b.y) / 2);

/** Wing angles by frame, near wing then far: up, mid, down. */
const BEAT: readonly (readonly [number, number])[] = [[-1.9, -1.5], [-2.85, -2.55], [1.2, 1.5]];
const HOVER_TILT = -0.75;
const DIVE_TILT = 1.25;

export function kestrel(d: Draw, dive: boolean): void {
  const { ctx } = d.pen;
  if (dive) {
    ctx.save();
    ctx.rotate(DIVE_TILT);
    ctx.translate(8, 0);
    tail(d, false);
    body(d, true);
    // The wings folded along the back, tips past the tail.
    const folded = [
      ...cub(pt(9, -6.5), pt(0, -12.5), pt(-22, -10), pt(-43, -2.5), 14),
      pt(-40, 0.2),
      ...cub(pt(-40, 0.2), pt(-24, 0.5), pt(-6, 1.5), pt(7, -1), 10),
    ];
    skin(d, folded, RUFOUS, 0.75);
    d.pen.clipped(folded, () => {
      d.pen.fill([pt(-12, -12), pt(-46, -4), pt(-46, 2), pt(-12, 2)], DARK, 0.8);
      for (let i = 0; i < 7; i++) d.pen.dot(-8 + d.pen.rng() * 15, -6 + d.pen.rng() * 3.5, 0.65, SPOT, 0.85);
      for (const y of [-4.5, -2.5]) d.pen.hair([pt(-14, y - 1), pt(-40, y + 1.5)], 0.45, PAPER_FILL, 0.4);
    });
    shade(d, folded, 0.3);
    edge(d, folded, 1.1);
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
