import { bezier, capsule, closed, cub, type Draw, edge, oval, pt, shade, skin, TAU, tint, tube } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { limb } from './limb';

/**
 * A young Sally Lightfoot crab (Grapsus grapsus) on the basalt, side-on and
 * facing right: a flat, round-fronted carapace scored with fine cross
 * ridges, a pale belly, short stout claws, and long, flat, spiny legs held
 * high for running and hopping over wet rock. Young ones are mottled
 * sooty brown-black flecked blue-white, hiding on the lava (the grown-up
 * red comes later); so they never look red, which in the game means
 * danger, and the red ink of one that can catch you stands out.
 */
const SHELL = '#4a4038';
const EDGE = '#7a6a52';
const DARK = '#241e1a';
const FLECK = '#cfe2ea';
const BELLY = '#e3dccb';
const LEG = '#3e352e';
const BAND = '#1f1a16';
const TIP = '#e8d9b8';

/** Four long, flat legs a side, splayed wide and low with the knees about level with the shell, stepping in alternate pairs. */
function legs(d: Draw, bottom: number, far: boolean): void {
  [-53, -41, 31, 48].forEach((dx, i) => {
    const ph = -d.f * (TAU / 3) + (i % 2) * Math.PI + (far ? Math.PI / 2 : 0);
    const step = Math.cos(ph) * 4;
    const lift = Math.max(0, Math.sin(ph)) * 5;
    const hip = pt(dx * 0.28 + (far ? -3 : 0), bottom - 3 + (far ? -3 : 0));
    const foot = pt(dx + step + (far ? -4 : 0), d.g - lift * 0.4 - (far ? 2 : 0));
    const reach = foot.x - hip.x;
    const knee = pt(hip.x + reach * 0.48, bottom - 10 - lift);
    const ankle = pt(hip.x + reach * 0.86, d.g - 8 - lift * 0.6);
    const tip = pt(foot.x + Math.sign(reach) * 1, foot.y);
    limb(d, [hip, knee, ankle, tip], { widths: [5.6, 4.8, 3.2, 0.4], wash: LEG, band: BAND, hairs: far ? 0 : 3, far });
    // Pale flecks on the flat upper leg, and the dark, sharp claw-tip of the last segment.
    if (!far) for (const t of [0.35, 0.65]) d.pen.dot(hip.x + (knee.x - hip.x) * t, hip.y + (knee.y - hip.y) * t - 0.6, 0.55, FLECK, 0.9);
    const a = pt(ankle.x + (tip.x - ankle.x) * 0.55, ankle.y + (tip.y - ankle.y) * 0.55);
    d.pen.stroke([a, tip], far ? 0.9 : 1.2, d.ink, far ? 0.5 : 0.95, false);
  });
}

/** A short, stout claw held under the front: red arm and palm, cream fingertips. */
function claw(d: Draw, x: number, y: number, s: number, far: boolean): void {
  const { pen } = d;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, y + dy * s);
  const arm = capsule(P(0, 0), P(6, -2.5), 5.2 * s, 4.6 * s);
  const wrist = oval(x + 8 * s, y - 3 * s, 3.6 * s, 3.4 * s, 12);
  const palm = [
    ...cub(P(9, 1), P(8.5, -6.5), P(13, -8.5), P(17.5, -7), 8),
    ...cub(P(17.5, -7), P(20.5, -5), P(20.5, 0), P(17.5, 2.2), 6).slice(1),
    ...cub(P(17.5, 2.2), P(14, 3.8), P(10.5, 3.4), P(9, 1), 6).slice(1),
  ];
  const fixed = tube(bezier(P(17, 0.5), P(21, 1), P(23.5, -1.2), 6), 3.6 * s, 1 * s);
  const moving = tube(bezier(P(17, -5.5), P(22, -6.5), P(24, -1.8), 6), 3.2 * s, 1 * s);
  for (const part of [arm, wrist, palm, fixed, moving]) {
    pen.fill(part, PAPER_FILL, 1);
    pen.fill(part, SHELL, far ? 0.8 : 0.75);
    if (far) pen.fill(part, d.ink, 0.14);
  }
  for (const f of [fixed, moving]) pen.clipped(f, () => pen.fill(oval(x + 23.5 * s, y - 1.6 * s, 4 * s, 4 * s, 10), TIP, 0.9));
  if (!far) {
    pen.clipped(palm, () => {
      tint(d, oval(x + 13 * s, y + 2 * s, 6 * s, 2 * s, 10), EDGE, 0.55);
      tint(d, oval(x + 13 * s, y - 7 * s, 4 * s, 1.3 * s, 10), PAPER_FILL, 0.4);
    });
    for (let i = 0; i < 4; i++) pen.dot(x + (11 + pen.rng() * 6) * s, y - (2 + pen.rng() * 4) * s, 0.5 * s, FLECK, 0.9);
    shade(d, palm, 0.4);
  }
  for (const part of [arm, wrist, fixed, moving, palm]) pen.stroke(closed(part), far ? 0.7 : 1, d.ink, far ? 0.55 : 1, false);
}

/** A short stalked eye on the front corner of the shell. */
function eye(d: Draw, x: number, y: number, far: boolean): void {
  const { pen } = d;
  const stalk = capsule(pt(x - 1.4, y + 3.5), pt(x, y - 0.5), 2.8, 2.6);
  pen.fill(stalk, PAPER_FILL, 1);
  pen.fill(stalk, EDGE, 0.8);
  pen.stroke(closed(stalk), far ? 0.6 : 0.8, d.ink, far ? 0.55 : 0.95, false);
  pen.fill(oval(x + 0.4, y - 1.4, 2.6, 2.4, 10), d.ink, far ? 0.6 : 0.92);
  if (!far) pen.dot(x + 1.1, y - 2.2, 0.65, PAPER_FILL, 0.95);
}

export function sallyCrab(d: Draw): void {
  const { pen } = d;
  pen.fill(oval(0, d.g - 1, 48, 3, 24), d.ink, 0.1);
  const top = d.g - 36;
  const bottom = d.g - 21;
  legs(d, bottom, true);
  claw(d, 16, bottom - 1, 1, true);
  eye(d, 18, top, true);
  // Flat on top, rounded behind and rounded right round the front.
  const shape = [
    ...cub(pt(-26, bottom), pt(-31, bottom - 3), pt(-31, top + 4), pt(-24, top + 1), 8),
    ...cub(pt(-24, top + 1), pt(-8, top - 1.4), pt(8, top - 1.4), pt(19, top), 10).slice(1),
    ...cub(pt(19, top), pt(27, top + 1), pt(30, top + 8), pt(25, bottom), 10).slice(1),
    ...cub(pt(25, bottom), pt(10, bottom + 2.2), pt(-10, bottom + 2.2), pt(-26, bottom), 10).slice(1),
  ];
  skin(d, shape, SHELL, 0.88);
  const margin = cub(pt(-31, top + 7), pt(-10, top + 8.5), pt(12, top + 8.5), pt(30, top + 5.5), 12);
  pen.clipped(shape, () => {
    // Orange towards the rim and below the side edge, the pale belly underneath.
    tint(d, [...margin, pt(34, d.g), pt(-34, d.g)], EDGE, 0.55);
    tint(d, [pt(-34, bottom - 3), pt(34, bottom - 4), pt(34, d.g), pt(-34, d.g)], BELLY, 0.85);
    // Fine transverse ridges across the back, darker red.
    for (let k = 0; k < 9; k++) {
      const x = -22 + k * 5;
      pen.hair(bezier(pt(x, top + 1), pt(x + 2.5, top + 3), pt(x + 1.5, top + 6), 4), 0.55, DARK, 0.6);
    }
    // Blue-white flecks.
    for (let i = 0; i < 18; i++) {
      const fx = -25 + pen.rng() * 50;
      const fy = top + 1 + pen.rng() * 10;
      pen.fill(oval(fx, fy, 0.7 + pen.rng() * 0.8, 0.5 + pen.rng() * 0.4, 8), FLECK, 0.9);
    }
  });
  shade(d, shape, 0.42);
  pen.hair(margin, 0.6, d.ink, 0.5);
  // The H-groove, and the hatched underside where the body turns under.
  pen.hair(bezier(pt(-8, top + 1), pt(-2, top + 6), pt(5, top + 1.5), 8), 0.6, d.ink, 0.5);
  pen.clipped(shape, () => pen.hatch([pt(-34, bottom - 3), pt(32, bottom - 3), pt(32, bottom + 4), pt(-34, bottom + 4)], 1.8, 0.35, 0.45, { color: d.ink, alpha: 0.4 }));
  pen.hair(cub(pt(22, top + 1.5), pt(27, top + 4), pt(28, bottom - 6), pt(24.5, bottom - 2), 6), 0.55, d.ink, 0.5);
  edge(d, shape, 1.3);
  legs(d, bottom, false);
  eye(d, 24, top, false);
  claw(d, 19, bottom, 1.15, false);
}
