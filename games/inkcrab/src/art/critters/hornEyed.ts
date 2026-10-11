import { bezier, capsule, closed, cub, type Draw, edge, oval, pt, shade, skin, TAU, tint, tube } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { limb } from './limb';

/**
 * A horn-eyed ghost crab (Ocypode ceratophthalmus) running the night beach,
 * side-on and facing right, up on the tips of its legs: a deep, squarish
 * carapace with straight sides and sharp front corners, sand-coloured and
 * marbled with darker brown, very tall eyestalks with the dark cornea down
 * their front, each drawn out at the top into a long, slender horn (the
 * style) that gives it its name. Long running legs with fringed joints,
 * banded; the claws unequal, the bigger one with a ridged palm.
 */
const SHELL = '#d9c99c';
const FLANK = '#c3ad7c';
const MOTTLE = '#8a7048';
const LEG = '#d3bf91';
const BAND = '#8f7248';
const TIP = '#f2e9d0';
const HORN = '#5e4a34';

/** Four long running legs a side, spread wide, the body carried high; stepping in alternate pairs. */
function legs(d: Draw, bottom: number, far: boolean): void {
  [-54, -37, 30, 47].forEach((dx, i) => {
    const ph = -d.f * (TAU / 3) + (i % 2) * Math.PI + (far ? Math.PI / 2 : 0);
    const step = Math.cos(ph) * 5;
    const lift = Math.max(0, Math.sin(ph)) * 6;
    const hip = pt(dx * 0.28 + (far ? -3 : 0), bottom - 2 + (far ? -3 : 0));
    const foot = pt(dx + step + (far ? -4 : 0), d.g - lift * 0.4 - (far ? 2 : 0));
    const reach = foot.x - hip.x;
    const dir = Math.sign(reach);
    // Thigh up to a high knee, a long shin down, then a long pointed tiptoe foot.
    const knee = pt(hip.x + reach * 0.45, bottom - 12 - lift);
    const ankle = pt(hip.x + reach * 0.82, d.g - 12 - lift * 0.6);
    const tip = pt(foot.x + dir * 1.2, foot.y);
    limb(d, [hip, knee, ankle, tip], { widths: [6, 4.6, 2.8, 0.5], wash: LEG, band: BAND, hairs: far ? 0 : 3, far });
    if (!far) {
      // The brush of fine hair along the shin that marks a ghost crab's leg.
      for (let k = 1; k <= 4; k++) {
        const p = pt(knee.x + (ankle.x - knee.x) * (k / 5), knee.y + (ankle.y - knee.y) * (k / 5));
        d.pen.hair([p, pt(p.x - dir * 2.2, p.y + 1.4)], 0.4, d.ink, 0.6);
      }
      d.pen.hair([pt(ankle.x + (tip.x - ankle.x) * 0.55, ankle.y + (tip.y - ankle.y) * 0.55), tip], 1.1, TIP, 0.7);
    }
  });
}

/** A cheliped: arm, wrist and a deep palm, the fingers stout and pale-tipped; the bigger one has the ridged palm it rasps to call. */
function claw(d: Draw, x: number, y: number, s: number, far: boolean): void {
  const { pen } = d;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, y + dy * s);
  const arm = capsule(P(0, 0), P(9, -4), 5 * s, 4.4 * s);
  const wrist = oval(x + 11 * s, y - 5 * s, 3.6 * s, 3.2 * s, 12);
  const palm = [
    ...cub(P(12, -2), P(11, -11), P(19, -13), P(24, -10), 10),
    ...cub(P(24, -10), P(27, -7), P(27, -2), P(23, 0.5), 6).slice(1),
    ...cub(P(23, 0.5), P(20, 2.4), P(14, 2.4), P(12, -2), 6).slice(1),
  ];
  const fixed = tube(bezier(P(22, -2), P(28, -2), P(32, -5.5), 8), 4.6 * s, 0.9 * s);
  const moving = tube(bezier(P(21, -10), P(28, -12), P(32.5, -6.5), 8), 4 * s, 0.9 * s);
  for (const part of [arm, wrist, fixed, moving, palm]) {
    pen.fill(part, PAPER_FILL, 1);
    pen.fill(part, SHELL, far ? 0.85 : 0.7);
    if (far) pen.fill(part, d.ink, 0.12);
  }
  if (!far) {
    for (const f of [fixed, moving]) pen.clipped(f, () => pen.fill(oval(x + 31 * s, y - 6 * s, 4.4 * s, 4.4 * s, 10), PAPER_FILL, 0.9));
    pen.clipped(palm, () => pen.stipple(palm, 50, () => 0.6, 0.45, MOTTLE));
    // The stridulating ridge: a row of fine bars along the inside of the palm.
    for (let k = 0; k < 7; k++) pen.hair([P(14 + k * 1.3, -4.2 - k * 0.5), P(14.4 + k * 1.3, -6 - k * 0.5)], 0.45, d.ink, 0.7);
    shade(d, palm, 0.4);
  }
  for (const part of [arm, wrist, fixed, moving, palm]) pen.stroke(closed(part), far ? 0.7 : 1, d.ink, far ? 0.55 : 1, false);
}

/**
 * A tall eyestalk from `base`, swollen into a club: the dark, faceted cornea
 * wrapping its front from low on the stalk nearly to the top, and the stalk
 * running on past it into a long, slender horn curving back.
 */
function eye(d: Draw, base: Pt, h: number, far: boolean): void {
  const { pen } = d;
  const top = pt(base.x + 1.6, base.y - h);
  const stalk = [
    ...cub(pt(base.x - 1.6, base.y), pt(base.x - 2.6, base.y - h * 0.5), pt(top.x - 3.2, top.y + 3), top, 10),
    ...cub(top, pt(top.x + 3.8, top.y + 2), pt(base.x + 4.4, base.y - h * 0.4), pt(base.x + 1.8, base.y), 10).slice(1),
  ];
  pen.fill(stalk, PAPER_FILL, 1);
  pen.fill(stalk, SHELL, far ? 0.85 : 0.75);
  if (far) pen.fill(stalk, d.ink, 0.12);
  // The cornea over the front of the club.
  const cornea = [
    ...cub(pt(base.x + 1.2, base.y - h * 0.22), pt(base.x + 4.6, base.y - h * 0.38), pt(top.x + 3.4, top.y + 3.2), pt(top.x + 0.4, top.y + 0.6), 10),
    ...cub(pt(top.x + 0.4, top.y + 0.6), pt(top.x - 1.2, top.y + 4), pt(base.x - 0.2, base.y - h * 0.44), pt(base.x + 1.2, base.y - h * 0.22), 8).slice(1),
  ];
  pen.fill(cornea, d.ink, far ? 0.6 : 0.9);
  if (!far) {
    pen.clipped(cornea, () => {
      for (let k = 0; k < 14; k++) pen.dot(base.x + pen.rng() * 4.4, base.y - h * (0.25 + pen.rng() * 0.7), 0.35, PAPER_FILL, 0.3);
    });
    pen.dot(base.x + 3, base.y - h * 0.62, 0.95, PAPER_FILL, 0.95);
  }
  pen.stroke(closed(stalk), far ? 0.7 : 0.95, d.ink, far ? 0.6 : 1, false);
  // The horn: a long style, as long as the stalk, thick at its root, thinning to a hair and curving back.
  const horn = tube(cub(pt(top.x, top.y + 1), pt(top.x + 1.2, top.y - 5), pt(top.x + 0.6, top.y - 10), pt(top.x - 3.8, top.y - h * 1.1), 12), 1.5, 0.3);
  pen.fill(horn, HORN, far ? 0.6 : 0.9);
  pen.stroke(closed(horn), far ? 0.5 : 0.7, d.ink, far ? 0.55 : 1, false);
}

export function hornEyed(d: Draw): void {
  const { pen } = d;
  pen.fill(oval(0, d.g - 1, 46, 3, 24), d.ink, 0.1);
  const bob = [0, -1, 0.5][d.f]!;
  const top = d.g - 52 + bob;
  const bottom = d.g - 28 + bob;
  legs(d, bottom, true);
  claw(d, 18, bottom - 2, 0.78, true);
  eye(d, pt(19, top + 2), 14, true);
  // Squarer than its cousins: a nearly flat top, straight sides, a sharp corner at the eye socket.
  const shape = [
    ...cub(pt(-24, bottom), pt(-30, bottom - 6), pt(-30, top + 5), pt(-24, top + 0.8), 10),
    ...cub(pt(-24, top + 0.8), pt(-8, top - 1.6), pt(10, top - 1.6), pt(24, top), 10).slice(1),
    pt(27.4, top - 1.8),
    pt(29, top + 2.2),
    ...cub(pt(29, top + 2.2), pt(31.5, top + 8), pt(31.5, bottom - 5), pt(28, bottom), 10).slice(1),
    ...cub(pt(28, bottom), pt(12, bottom + 2.4), pt(-10, bottom + 2.4), pt(-24, bottom), 10).slice(1),
  ];
  skin(d, shape, SHELL, 0.75);
  const shoulder = cub(pt(-32, top + 9), pt(-12, top + 11), pt(14, top + 11), pt(31, top + 8), 14);
  pen.clipped(shape, () => {
    tint(d, [...shoulder, pt(40, d.g), pt(-40, d.g)], FLANK, 0.45);
    // Marbled with darker brown: soft blotches, then speckle.
    for (let i = 0; i < 16; i++) {
      const bx = -28 + pen.rng() * 56;
      const by = top + 1 + pen.rng() * 19;
      tint(d, oval(bx, by, 1.6 + pen.rng() * 2.4, 1 + pen.rng() * 1.4, 10), MOTTLE, 0.35);
    }
    pen.stipple(shape, 160, (_, y) => (y < top + 12 ? 0.7 : 0.4), 0.45, MOTTLE);
  });
  shade(d, shape, 0.42);
  pen.hair(shoulder, 0.7, d.ink, 0.55);
  // The H-shaped grooves of the back.
  pen.hair(bezier(pt(-12, top + 1), pt(-4, top + 7), pt(6, top + 1.5), 8), 0.7, d.ink, 0.6);
  pen.hair(bezier(pt(-18, top + 1.5), pt(-16, top + 6), pt(-10, top + 8), 6), 0.55, d.ink, 0.5);
  pen.hair(bezier(pt(12, top + 1.5), pt(10, top + 6), pt(4, top + 8), 6), 0.55, d.ink, 0.5);
  // The mouthparts' plate under the eyes, and the hatched underside.
  const mouth = [pt(22, bottom - 10), pt(28.5, bottom - 11), pt(29, bottom - 1), pt(22, bottom)];
  pen.fill(mouth, PAPER_FILL, 0.7);
  pen.hair(closed(mouth), 0.55, d.ink, 0.7);
  pen.clipped(shape, () => pen.hatch([pt(-40, bottom - 4), pt(36, bottom - 4), pt(36, bottom + 4), pt(-40, bottom + 4)], 1.8, 0.35, 0.45, { color: d.ink, alpha: 0.4 }));
  edge(d, shape, 1.4);
  eye(d, pt(24.5, top + 2.4), 15, false);
  legs(d, bottom, false);
  claw(d, 22, bottom + 1, 1.2, false);
}
