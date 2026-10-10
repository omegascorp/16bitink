import { add, bezier, closed, cub, type Draw, edge, lerp, oval, pt, shade, skin, tint } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';

/**
 * A female belted kingfisher (Megaceryle alcyon), side-on and facing right,
 * drawn in the critter frame (origin at its centre, CRITTER_FRAME units
 * square) like the kestrel, whose hunt it shares: it hangs over the water
 * on beating wings, then plunges. Big-headed and short-tailed, slate
 * blue-grey above with a ragged double crest, a white collar right round
 * the neck, a long, heavy dagger of a bill, a slate band across the white
 * breast and, below it, the female's rusty belly band. Hovering, the body
 * hangs tilted up with the tail fanned, the head bent down to look along
 * the bill at the water, the wings beating (up, mid, down by frame).
 * `dive`: plunging bill-first, wings folded back tight.
 */
/** Frame units across the hovering bird, wings included, at its widest frame. */
export const KINGFISHER_SPAN = 80;

const SLATE = '#5d7896';
const DEEP = '#2f3c4f';
const RUST = '#b86a3e';
const BILL = '#33353d';
const JAW = '#8f939b';

const rot = (p: Pt, a: number): Pt => pt(p.x * Math.cos(a) - p.y * Math.sin(a), p.x * Math.sin(a) + p.y * Math.cos(a));

/** The short, square tail: fanned when hovering, closed when diving. Slate, crossed by rows of white spots. */
function tail(d: Draw, fanned: boolean): void {
  const { pen } = d;
  const shape = fanned
    ? [pt(-11, -4), ...bezier(pt(-25, -9.5), pt(-30, -0.5), pt(-25, 8.5), 8), pt(-11, 3)]
    : [pt(-11, -2.8), pt(-27, -2.4), pt(-28.5, 0), pt(-27, 2.4), pt(-11, 2.6)];
  skin(d, shape, SLATE, 0.78);
  pen.clipped(shape, () => {
    // Rows of white spots across the feathers, and a darker tip.
    const arc = (k: number): Pt[] => (fanned ? bezier(pt(-25 + k, -9.5), pt(-30 + k * 1.1, -0.5), pt(-25 + k, 8.5), 8) : [pt(-28 + k, -3), pt(-28 + k, 3)]);
    pen.stroke(arc(-0.2), 2.4, DEEP, 0.7, false);
    for (const k of [4, 8, 12]) arc(k).forEach((p, i) => i % 2 === 1 && pen.dot(p.x, p.y, 0.55, PAPER_FILL, 0.9));
    if (fanned) for (const a of [-0.3, -0.15, 0, 0.15, 0.3]) pen.hair([pt(-12, 0), pt(-12 - Math.cos(a) * 18, Math.sin(a) * 28)], 0.45, d.ink, 0.4);
  });
  shade(d, shape, 0.3);
  edge(d, shape, 1);
}

/** The body without the head, in the bird's own frame: level, facing right. Slate back, white breast with its two bands. */
function body(d: Draw, diving: boolean): void {
  const { pen } = d;
  const shape = [
    ...cub(pt(10, -8), pt(2, -10), pt(-7, -8.5), pt(-13, -4), 10),
    pt(-12, 3),
    ...cub(pt(-12, 3), pt(-6, 10.5), pt(6, 10.5), pt(12, 5), 10).slice(1),
    ...cub(pt(12, 5), pt(15, 2), pt(15.5, -3), pt(13, -7), 6).slice(1),
  ];
  skin(d, shape, PAPER_FILL, 0.4);
  pen.clipped(shape, () => {
    // Slate back; the slate breast band, the rusty belly band and rusty flanks below it.
    tint(d, [pt(-14, -12), pt(12, -12), pt(10, -4), pt(-2, -1.5), pt(-14, 0)], SLATE, 0.85);
    pen.stroke(bezier(pt(15, -2), pt(10, 2.5), pt(4, 4), 6), 4, SLATE, 0.8, false);
    pen.stroke(bezier(pt(11, 6), pt(4, 8), pt(-3, 8), 6), 3.6, RUST, 0.8, false);
    tint(d, oval(-6, 4, 7, 3, 12), RUST, 0.55);
    // Fine pale spotting on the back.
    for (let i = 0; i < 8; i++) pen.dot(-9 + pen.rng() * 16, -7 + pen.rng() * 4, 0.45, PAPER_FILL, 0.7);
  });
  shade(d, shape, 0.32);
  edge(d, shape, 1.2);
  if (diving) return;
  // Tiny feet tucked up under the belly.
  for (const dx of [0, 2.2]) pen.stroke([pt(2 + dx, 9), pt(3 + dx, 11), pt(4.6 + dx, 11.4)], 0.9, d.ink, 0.9, false);
}

/**
 * The head in its own frame (origin where it meets the body, facing right):
 * big and round under a shaggy crest, the white collar, a white spot before
 * the eye and the long, straight dagger bill, dark above, grey below.
 */
function head(d: Draw): void {
  const { pen } = d;
  // The ragged crest: two tufts of pointed feathers raised off the back of the crown.
  const shape = [
    pt(-4, 5),
    ...cub(pt(-4, 5), pt(-7, 2), pt(-7, -3), pt(-6, -6), 6).slice(1),
    pt(-11, -9.5), pt(-6.4, -9), pt(-8.6, -14), pt(-3.6, -11.4), pt(-4, -16), pt(0.4, -12.4),
    ...cub(pt(0.4, -12.4), pt(5, -13), pt(10, -10), pt(11.4, -5), 8).slice(1),
    ...cub(pt(11.4, -5), pt(12.4, -1), pt(11, 3), pt(7, 5.5), 6).slice(1),
    ...cub(pt(7, 5.5), pt(3, 7), pt(-1, 7), pt(-4, 5), 4).slice(1),
  ];
  skin(d, shape, SLATE, 0.85);
  pen.clipped(shape, () => {
    // The white throat and collar (wrapping up behind the head), shading back into slate.
    pen.fill([...cub(pt(12, -1), pt(8, 1.5), pt(2, 1), pt(-1, -2), 6), pt(-8, -1), pt(-8, 8), pt(12, 8)], PAPER_FILL, 0.95);
    pen.stroke(bezier(pt(-6, -3), pt(-3, 1), pt(-1, 6), 5), 3.2, PAPER_FILL, 0.9, false);
    tint(d, oval(-2, -10, 6, 3, 10), DEEP, 0.35);
    // Shaggy feather strokes in the crest.
    for (const [a, b] of [[pt(-1, -8), pt(-8, -12)], [pt(1, -9), pt(-3, -14)], [pt(-2, -6), pt(-9, -8.5)]] as const) pen.hair([a, b], 0.5, DEEP, 0.6);
  });
  shade(d, shape, 0.3);
  edge(d, shape, 1.15);
  // The bill: long, deep at the base, tapering straight to a point.
  const bill = [pt(10.6, -6.4), ...bezier(pt(13, -6.6), pt(22, -5.4), pt(28, -2.6), 6), pt(27.6, -2), ...bezier(pt(26, -1.6), pt(19, -0.4), pt(11.6, 0.4), 6)];
  skin(d, bill, BILL, 0.82);
  pen.clipped(bill, () => pen.fill([pt(10, -2.6), pt(28, -2.6), pt(28, 2), pt(10, 2)], JAW, 0.7));
  pen.hair(bezier(pt(11.4, -2.6), pt(19, -2.6), pt(27, -2.3), 5), 0.55, d.ink, 0.85);
  edge(d, bill, 0.9);
  // A white spot before the eye, and the eye.
  pen.dot(9.8, -5.4, 1, PAPER_FILL, 0.95);
  pen.dot(7, -5, 1.6, d.ink, 1);
  pen.dot(7.5, -5.5, 0.5, PAPER_FILL, 0.95);
}

/**
 * A short, pointed wing from shoulder `s` towards angle `a`; `len`
 * foreshortens the far one. Slate coverts, black primaries with a white
 * patch at their base; `under` shows the white underside (on the downstroke).
 */
function wing(d: Draw, s: Pt, a: number, len: number, far: boolean, under: boolean): void {
  const { pen } = d;
  const ax = pt(Math.cos(a), Math.sin(a));
  const nrm = pt(-ax.y, ax.x);
  const k = nrm.x >= 0 ? 1 : -1;
  const at = (u: number, v: number): Pt => add(s, pt(ax.x * u * len + nrm.x * v * k, ax.y * u * len + nrm.y * v * k));
  const lead = cub(at(-0.06, 3), at(0.22, 6.5), at(0.5, 6), at(1, 0.4), 16);
  const trail = [at(0.94, -2.4), at(0.84, -4.6), at(0.72, -6.8), at(0.58, -8.6), at(0.44, -10), at(0.3, -10.6), at(0.16, -10.2), at(0.04, -8.4), at(-0.06, -4.6), at(-0.1, -1)];
  const shape = [...lead, ...trail];
  skin(d, shape, under ? PAPER_FILL : SLATE, under ? 0.5 : far ? 0.85 : 0.8);
  pen.clipped(shape, () => {
    // Black outer hand with the white patch at its base; dark tips underneath.
    pen.fill([at(0.5, 10), at(1.2, 0), at(0.8, -12), at(0.5, -12)], under ? '#9aa1aa' : DEEP, under ? 0.6 : 0.88);
    if (!under) pen.stroke([at(0.5, 1), at(0.6, -3.5)], 2.6, PAPER_FILL, 0.9, false);
    // Underneath, fine dark bars across the white flight feathers.
    if (under && !far) for (const u of [0.2, 0.32, 0.44]) pen.hair([at(u, 2), at(u - 0.04, -9)], 0.45, DEEP, 0.4);
    if (!far) {
      // Fine white spots on the coverts (barring underneath), the separations between the flight feathers.
      for (let i = 0; i < 8; i++) {
        const p = at(0.06 + pen.rng() * 0.4, -5 + pen.rng() * 8);
        pen.dot(p.x, p.y, 0.45, under ? DEEP : PAPER_FILL, under ? 0.45 : 0.75);
      }
      for (const u of [0.62, 0.72, 0.82]) pen.hair([at(u, 4 - u * 4), at(u + 0.08, -6 + u * 5)], 0.45, PAPER_FILL, 0.45);
    }
    if (far) pen.fill(shape, d.ink, 0.14);
  });
  if (!far) shade(d, shape, 0.3);
  if (!far) for (let i = 1; i < trail.length - 1; i++) pen.hair(bezier(trail[i - 1]!, add(lerp(trail[i - 1]!, trail[i]!, 0.5), pt(nrm.x * -k * 0.9, nrm.y * -k * 0.9)), trail[i]!, 3), 0.4, d.ink, 0.5);
  pen.stroke(closed(shape), far ? 0.8 : 1.1, d.ink, far ? 0.6 : 1, false);
}

/** Wing angles by frame, near wing then far: up, mid, down. */
const BEAT: readonly (readonly [number, number])[] = [[-1.9, -1.5], [-2.85, -2.55], [1.2, 1.5]];
const HOVER_TILT = -0.7;
/** How far the head bends down from the body while hovering, to look along the bill at the water. */
const HOVER_NOD = 0.85;
const DIVE_TILT = 1.35;
/** Frame units the hovering bird is set back from the frame centre. */
const HOVER_SHIFT = -9;
/** Where the head meets the body, in the bird's frame. */
const NECK = pt(11, -3);

export function kingfisher(d: Draw, dive: boolean): void {
  const { ctx } = d.pen;
  if (dive) {
    ctx.save();
    ctx.rotate(DIVE_TILT);
    ctx.translate(2, 0);
    tail(d, false);
    body(d, true);
    // The wings folded tight along the back, tips past the tail.
    const folded = [
      ...cub(pt(9, -6), pt(0, -11), pt(-18, -9), pt(-34, -2.5), 14),
      pt(-31.5, 0.4),
      ...cub(pt(-31.5, 0.4), pt(-18, 0.6), pt(-5, 1.5), pt(7, -1), 10),
    ];
    skin(d, folded, SLATE, 0.8);
    d.pen.clipped(folded, () => {
      d.pen.fill([pt(-14, -11), pt(-38, -4), pt(-38, 2), pt(-14, 2)], DEEP, 0.85);
      d.pen.stroke([pt(-11, -3.5), pt(-16, -3)], 2, PAPER_FILL, 0.85, false);
      for (let i = 0; i < 6; i++) d.pen.dot(-6 + d.pen.rng() * 12, -6 + d.pen.rng() * 4, 0.45, PAPER_FILL, 0.7);
    });
    shade(d, folded, 0.3);
    edge(d, folded, 1.1);
    ctx.translate(NECK.x, NECK.y);
    head(d);
    ctx.restore();
    return;
  }
  // The big bill reaches well forward: set back, so the drawing centres where the kestrel's does.
  ctx.save();
  ctx.translate(HOVER_SHIFT, 0);
  const [near, farA] = BEAT[d.f]!;
  const shoulder = rot(pt(2, -6), HOVER_TILT);
  const down = d.f === 2;
  wing(d, add(shoulder, pt(1.5, -1.5)), farA, down ? 32 : 37, true, down);
  ctx.save();
  ctx.rotate(HOVER_TILT);
  tail(d, true);
  body(d, false);
  ctx.translate(NECK.x, NECK.y);
  ctx.rotate(HOVER_NOD);
  head(d);
  ctx.restore();
  wing(d, shoulder, near, down ? 37 : 44, false, down);
  ctx.restore();
}
