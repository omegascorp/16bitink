import { bezier, capsule, closed, cub, type Draw, edge, oval, pt, shade, skin, TAU, tint, tube } from '../../../src/art/kit';
import type { Pt } from '../../../src/art/pen';
import { PAPER_FILL } from '../../../src/art/palette';
import { limb } from '../../../src/art/critters/limb';

/**
 * The Christmas Island red crab (Gecarcoidea natalis), side-on and facing
 * right, drawn with the game's pen kit like its other crabs (after
 * sallyCrab): a tall, domed, rounded-square carapace, all bright red with a
 * darker rim and an orange flush underneath, two equal stout claws with pale
 * tips, short eyestalks, and fairly long red legs that step in alternate
 * pairs through the boil frames.
 */
const SHELL = '#d8402c';
const RIM = '#9e2418';
const FLUSH = '#ec8a4a';
const LEG = '#c9382a';
const BAND = '#7d1e14';
const TIP = '#f3d6b0';

/** Four legs a side, splayed fore and aft with high knees, stepping in alternate pairs. */
function legs(d: Draw, bottom: number, far: boolean): void {
  [-50, -37, 30, 45].forEach((dx, i) => {
    const ph = -d.f * (TAU / 3) + (i % 2) * Math.PI + (far ? Math.PI / 2 : 0);
    const step = Math.cos(ph) * 4.5;
    const lift = Math.max(0, Math.sin(ph)) * 6;
    const hip = pt(dx * 0.3 + (far ? -3 : 0), bottom - 4 + (far ? -3 : 0));
    const foot = pt(dx + step + (far ? -4 : 0), d.g - lift * 0.4 - (far ? 2 : 0));
    const reach = foot.x - hip.x;
    const knee = pt(hip.x + reach * 0.45, bottom - 13 - lift);
    const ankle = pt(hip.x + reach * 0.85, d.g - 10 - lift * 0.6);
    const tip = pt(foot.x + Math.sign(reach) * 1, foot.y);
    limb(d, [hip, knee, ankle, tip], { widths: [6, 5, 3.4, 0.5], wash: LEG, band: BAND, hairs: far ? 0 : 3, far });
    // The dark, sharp last segment.
    const a = pt(ankle.x + (tip.x - ankle.x) * 0.5, ankle.y + (tip.y - ankle.y) * 0.5);
    d.pen.stroke([a, tip], far ? 1 : 1.4, d.ink, far ? 0.5 : 0.9, false);
  });
}

/** A stout claw held up in front: red arm and palm, pale fingertips. */
function claw(d: Draw, x: number, y: number, s: number, far: boolean): void {
  const { pen } = d;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, y + dy * s);
  const arm = capsule(P(0, 0), P(7, -4), 5.6 * s, 5 * s);
  const wrist = oval(x + 9 * s, y - 5 * s, 3.8 * s, 3.6 * s, 12);
  const palm = [
    ...cub(P(10, -1), P(9.5, -9), P(14, -11), P(19, -9.5), 8),
    ...cub(P(19, -9.5), P(22.5, -7), P(22.5, -1.5), P(19, 0.8), 6).slice(1),
    ...cub(P(19, 0.8), P(15, 2.6), P(11.5, 2), P(10, -1), 6).slice(1),
  ];
  const fixed = tube(bezier(P(18.5, -0.8), P(22.5, -0.4), P(25.5, -2.8), 6), 3.8 * s, 1 * s);
  const moving = tube(bezier(P(18.5, -7.5), P(24, -8.4), P(26, -3.4), 6), 3.4 * s, 1 * s);
  for (const part of [arm, wrist, palm, fixed, moving]) {
    pen.fill(part, PAPER_FILL, 1);
    pen.fill(part, SHELL, far ? 0.8 : 0.82);
    if (far) pen.fill(part, d.ink, 0.14);
  }
  for (const f of [fixed, moving]) pen.clipped(f, () => pen.fill(oval(x + 25.5 * s, y - 3 * s, 4.2 * s, 4.2 * s, 10), TIP, 0.95));
  if (!far) {
    pen.clipped(palm, () => {
      tint(d, oval(x + 15 * s, y + 1.5 * s, 6 * s, 2.2 * s, 10), RIM, 0.5);
      tint(d, oval(x + 15 * s, y - 8.5 * s, 4 * s, 1.3 * s, 10), PAPER_FILL, 0.45);
    });
    shade(d, palm, 0.4);
  }
  for (const part of [arm, wrist, fixed, moving, palm]) pen.stroke(closed(part), far ? 0.7 : 1, d.ink, far ? 0.55 : 1, false);
}

/** A short stalked eye on the front corner of the shell. */
function eye(d: Draw, x: number, y: number, far: boolean): void {
  const { pen } = d;
  const stalk = capsule(pt(x - 1.4, y + 4), pt(x, y - 0.5), 3, 2.8);
  pen.fill(stalk, PAPER_FILL, 1);
  pen.fill(stalk, SHELL, 0.85);
  pen.stroke(closed(stalk), far ? 0.6 : 0.8, d.ink, far ? 0.55 : 0.95, false);
  pen.fill(oval(x + 0.4, y - 1.4, 2.8, 2.6, 10), d.ink, far ? 0.6 : 0.95);
  if (!far) pen.dot(x + 1.2, y - 2.3, 0.7, PAPER_FILL, 0.95);
}

export function redCrab(d: Draw): void {
  const { pen } = d;
  pen.fill(oval(0, d.g - 1, 50, 3.2, 24), d.ink, 0.12);
  const top = d.g - 46;
  const bottom = d.g - 24;
  legs(d, bottom, true);
  claw(d, 15, bottom - 2, 1, true);
  eye(d, 17, top + 1, true);
  // A tall dome, rounded behind and squarer at the front.
  const shape = [
    ...cub(pt(-26, bottom), pt(-32, bottom - 4), pt(-31, top + 7), pt(-22, top + 1.5), 8),
    ...cub(pt(-22, top + 1.5), pt(-9, top - 3.5), pt(9, top - 3.5), pt(19, top + 1), 10).slice(1),
    ...cub(pt(19, top + 1), pt(27, top + 3), pt(29, top + 11), pt(26, bottom), 10).slice(1),
    ...cub(pt(26, bottom), pt(10, bottom + 2.6), pt(-10, bottom + 2.6), pt(-26, bottom), 10).slice(1),
  ];
  skin(d, shape, SHELL, 0.9);
  const margin = cub(pt(-31, top + 11), pt(-10, top + 13), pt(12, top + 13), pt(29, top + 9), 12);
  pen.clipped(shape, () => {
    // An orange flush low on the side, the rim darker, a highlight on the dome.
    tint(d, [pt(-34, bottom - 5), pt(34, bottom - 6), pt(34, d.g), pt(-34, d.g)], FLUSH, 0.55);
    tint(d, [...margin, pt(34, top + 16), pt(-34, top + 16)], RIM, 0.25);
    tint(d, oval(-6, top + 4, 12, 3, 12), PAPER_FILL, 0.5);
  });
  shade(d, shape, 0.45);
  pen.hair(margin, 0.6, d.ink, 0.5);
  // The H-groove on its back, and the hatched underside where the body turns under.
  pen.hair(bezier(pt(-8, top + 1), pt(-2, top + 7), pt(5, top + 1.5), 8), 0.6, d.ink, 0.5);
  pen.clipped(shape, () => pen.hatch([pt(-34, bottom - 3), pt(32, bottom - 3), pt(32, bottom + 4), pt(-34, bottom + 4)], 1.8, 0.35, 0.45, { color: d.ink, alpha: 0.4 }));
  edge(d, shape, 1.3);
  legs(d, bottom, false);
  eye(d, 22, top + 1, false);
  claw(d, 18, bottom, 1.15, false);
}
