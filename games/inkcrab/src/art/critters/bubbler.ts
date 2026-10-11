import { bezier, capsule, closed, cub, type Draw, edge, glint, oval, pt, shade, skin, TAU, tint, tube } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { limb } from './limb';

/**
 * A sand bubbler crab (Scopimera / Dotilla) on the wet sand of the
 * Malabar coast, side-on and facing right: a tiny crab with a round,
 * swollen, almost globular body, pale sandy grey speckled darker, eyes
 * standing up on long stalks, two small, equal claws held down at the
 * mouth (they sift the sand into little balls), and long, thin, spidery
 * legs, banded, arching high over the sand.
 */
const SHELL = '#cbc3ad';
const GREY = '#9c9a90';
const SPECK = '#5f5a4e';
const BELLY = '#ece6d3';
const LEG = '#d2c8ae';
const BAND = '#8a8170';

/** Long, thin legs, four a side, knees high above the shell's waist, stepping in alternate pairs. */
function legs(d: Draw, bottom: number, far: boolean): void {
  [-44, -33, 28, 40].forEach((dx, i) => {
    const ph = -d.f * (TAU / 3) + (i % 2) * Math.PI + (far ? Math.PI / 2 : 0);
    const step = Math.cos(ph) * 3;
    const lift = Math.max(0, Math.sin(ph)) * 4;
    const hip = pt(dx * 0.22 + (far ? -2 : 0), bottom - 3 + (far ? -2 : 0));
    const foot = pt(dx + step + (far ? -3 : 0), d.g - lift * 0.4 - (far ? 1.5 : 0));
    const reach = foot.x - hip.x;
    const knee = pt(hip.x + reach * 0.5, bottom - 13 - lift);
    const ankle = pt(hip.x + reach * 0.88, d.g - 9 - lift * 0.6);
    const tip = pt(foot.x + Math.sign(reach) * 0.8, foot.y);
    limb(d, [hip, knee, ankle, tip], { widths: [3, 2.5, 1.7, 0.3], wash: LEG, band: BAND, hairs: far ? 0 : 1, far, line: 0.85 });
  });
}

/** A small claw, held down and in at the mouth: a short arm, a little round palm, fine pale-tipped fingers. */
function claw(d: Draw, x: number, y: number, s: number, far: boolean): void {
  const { pen } = d;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, y + dy * s);
  const arm = capsule(P(0, 0), P(5, 4), 3.4 * s, 3 * s);
  const palm = oval(x + 8 * s, y + 5.5 * s, 4 * s, 3 * s, 12);
  const fixed = tube(bezier(P(10.5, 7), P(13, 8), P(14.5, 10.5), 5), 2 * s, 0.5 * s);
  const moving = tube(bezier(P(10.5, 4), P(14, 5), P(15, 9.5), 5), 1.8 * s, 0.5 * s);
  for (const part of [arm, fixed, moving, palm]) {
    pen.fill(part, PAPER_FILL, 1);
    pen.fill(part, SHELL, far ? 0.85 : 0.7);
    if (far) pen.fill(part, d.ink, 0.14);
  }
  if (!far) {
    pen.clipped(palm, () => tint(d, oval(x + 7 * s, y + 4 * s, 3 * s, 1.5 * s, 8), GREY, 0.5));
    pen.dot(x + 7.4 * s, y + 5 * s, 0.45 * s, SPECK, 0.8);
    pen.dot(x + 9 * s, y + 6.4 * s, 0.4 * s, SPECK, 0.7);
  }
  for (const part of [arm, fixed, moving, palm]) pen.stroke(closed(part), far ? 0.6 : 0.85, d.ink, far ? 0.55 : 1, false);
}

/** An eye on a long, slender stalk, standing up from the front of the shell, the dark eye at its tip. */
function eye(d: Draw, base: Pt, tip: Pt, far: boolean): void {
  const { pen } = d;
  const stalk = capsule(base, tip, 2.2, 1.8);
  pen.fill(stalk, PAPER_FILL, 1);
  pen.fill(stalk, SHELL, far ? 0.85 : 0.7);
  if (far) pen.fill(stalk, d.ink, 0.12);
  pen.stroke(closed(stalk), far ? 0.6 : 0.8, d.ink, far ? 0.55 : 1, false);
  const ball = oval(tip.x + 0.3, tip.y - 1, 2.1, 2.5, 10);
  pen.fill(ball, d.ink, far ? 0.6 : 0.92);
  if (!far) pen.dot(tip.x + 0.9, tip.y - 1.9, 0.55, PAPER_FILL, 0.95);
}

/** The round shell: a swollen globe, higher at the front, its belly tucked in over the legs. */
function shell(top: number, bottom: number): Pt[] {
  return [
    ...cub(pt(-15, bottom), pt(-23, bottom - 3), pt(-22, top + 5), pt(-11, top + 1), 8),
    ...cub(pt(-11, top + 1), pt(-3, top - 1.6), pt(9, top - 1.4), pt(15, top + 3), 10).slice(1),
    ...cub(pt(15, top + 3), pt(21, top + 7), pt(21, bottom - 4), pt(15, bottom), 8).slice(1),
    ...cub(pt(15, bottom), pt(6, bottom + 2.4), pt(-7, bottom + 2.4), pt(-15, bottom), 10).slice(1),
  ];
}

export function bubbler(d: Draw): void {
  const { pen } = d;
  pen.fill(oval(0, d.g - 1, 38, 2.6, 24), d.ink, 0.1);
  const top = d.g - 38;
  const bottom = d.g - 16;
  legs(d, bottom, true);
  claw(d, 12, bottom - 5, 1.05, true);
  eye(d, pt(11, top + 4), pt(9.5, top - 9), true);
  const shape = shell(top, bottom);
  skin(d, shape, SHELL, 0.8);
  const waist = cub(pt(-21, top + 13), pt(-8, top + 16.5), pt(8, top + 16.5), pt(20, top + 12), 12);
  pen.clipped(shape, () => {
    // Grey over the crown, a pale belly below the side edge; dark speckles all over, densest on top.
    tint(d, oval(-2, top + 3, 15, 5, 16), GREY, 0.45);
    tint(d, [...waist, pt(24, bottom + 4), pt(-24, bottom + 4)], BELLY, 0.7);
    pen.stipple(shape, 130, (_, y) => (y < top + 12 ? 0.75 : 0.3), 0.55, SPECK);
    for (let i = 0; i < 9; i++) {
      const sx = -16 + pen.rng() * 30;
      const sy = top + 2 + pen.rng() * 11;
      pen.fill(oval(sx, sy, 0.9 + pen.rng() * 1, 0.6 + pen.rng() * 0.6, 8), SPECK, 0.55);
    }
  });
  shade(d, shape, 0.42);
  pen.hair(waist, 0.55, d.ink, 0.5);
  // The grooves of the back, and a soft gleam over the globe.
  pen.hair(bezier(pt(-6, top + 2), pt(-1, top + 6), pt(5, top + 2), 6), 0.5, d.ink, 0.45);
  glint(d, cub(pt(-12, top + 3), pt(-8, top + 0.6), pt(-2, top), pt(3, top + 0.4), 6), 1, 0.7);
  pen.clipped(shape, () => pen.hatch([pt(-24, bottom - 2.6), pt(24, bottom - 2.6), pt(24, bottom + 3), pt(-24, bottom + 3)], 1.5, 0.35, 0.4, { color: d.ink, alpha: 0.4 }));
  edge(d, shape, 1.15);
  eye(d, pt(14, top + 4), pt(13.5, top - 10), false);
  legs(d, bottom, false);
  claw(d, 14, bottom - 4, 1.2, false);
}
