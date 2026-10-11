import { bezier, capsule, closed, cub, type Draw, edge, oval, pt, shade, skin, TAU, tint, tube } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { limb } from './limb';

/**
 * The horned ghost crab of Indian Ocean beaches, side-on and facing right:
 * a boxy, granular carapace, club eyes with little horns at their tips,
 * long banded legs on pointed feet and one claw bigger than the other.
 */
const SHELL = '#e8d8b0';
const FLANK = '#d4bd8c';
const LEG = '#dfca9e';
const BAND = '#b0915e';
const SPECK = '#9a7e56';

/** Four walking legs a side, splayed fore and aft, stepping in alternate pairs. */
function legs(d: Draw, bottom: number, far: boolean): void {
  [-50, -32, 26, 44].forEach((dx, i) => {
    const ph = -d.f * (TAU / 3) + (i % 2) * Math.PI + (far ? Math.PI / 2 : 0);
    const step = Math.cos(ph) * 4;
    const lift = Math.max(0, Math.sin(ph)) * 5;
    const hip = pt(dx * 0.3 + (far ? -3 : 0), bottom - 3 + (far ? -3 : 0));
    const foot = pt(dx + step + (far ? -4 : 0), d.g - lift * 0.4 - (far ? 2 : 0));
    const reach = foot.x - hip.x;
    const dir = Math.sign(reach);
    // Thigh up and out to a high knee, shin down, then a long pointed foot.
    const knee = pt(hip.x + reach * 0.42, bottom - 9 - lift);
    const ankle = pt(hip.x + reach * 0.84, d.g - 10 - lift * 0.6);
    limb(d, [hip, knee, ankle, pt(foot.x + dir * 1.5, foot.y)], { widths: [6.2, 4.6, 3, 0.5], wash: LEG, band: BAND, hairs: far ? 0 : 4, far });
  });
}

/** A cheliped: arm, wrist and a granular palm with a fixed finger and a hooked moving one, tips pale. */
function claw(d: Draw, x: number, y: number, s: number, far: boolean): void {
  const { pen } = d;
  const ink = far ? 0.55 : 1;
  const lw = far ? 0.7 : 1;
  const arm = capsule(pt(x, y), pt(x + 9 * s, y - 3 * s), 5 * s, 4.4 * s);
  const wrist = oval(x + 11 * s, y - 4 * s, 3.6 * s, 3.2 * s, 12);
  const palm = [
    ...cub(pt(x + 12 * s, y - 1 * s), pt(x + 11 * s, y - 9 * s), pt(x + 19 * s, y - 12 * s), pt(x + 24 * s, y - 9 * s), 10),
    ...cub(pt(x + 24 * s, y - 9 * s), pt(x + 26 * s, y - 6 * s), pt(x + 26 * s, y - 2 * s), pt(x + 23 * s, y), 6).slice(1),
    ...cub(pt(x + 23 * s, y), pt(x + 20 * s, y + 2 * s), pt(x + 14 * s, y + 2 * s), pt(x + 12 * s, y - 1 * s), 6).slice(1),
  ];
  const fixed = tube(bezier(pt(x + 22 * s, y - 2 * s), pt(x + 28 * s, y - 2.5 * s), pt(x + 33 * s, y - 6 * s), 8), 4.4 * s, 0.8 * s);
  const moving = tube(bezier(pt(x + 21 * s, y - 9 * s), pt(x + 29 * s, y - 12 * s), pt(x + 33.5 * s, y - 6.5 * s), 8), 3.8 * s, 0.8 * s);
  for (const part of [arm, wrist, fixed, moving, palm]) {
    pen.fill(part, PAPER_FILL, 1);
    pen.fill(part, SHELL, far ? 0.85 : 0.6);
    if (far) pen.fill(part, d.ink, 0.12);
  }
  if (!far) {
    // Pale fingertips, granules over the palm, teeth along the cutting edges.
    for (const f of [fixed, moving]) pen.clipped(f, () => pen.fill(oval(x + 32 * s, y - 6 * s, 4 * s, 4 * s, 10), PAPER_FILL, 0.85));
    for (let i = 0; i < 16; i++) {
      const gx = x + 14 * s + pen.rng() * 10 * s;
      const gy = y - 9 * s + pen.rng() * 8 * s;
      pen.dot(gx + 0.3, gy + 0.3, 0.5 * s, d.ink, 0.4);
      pen.dot(gx, gy, 0.3 * s, PAPER_FILL, 0.8);
    }
    for (let k = 0; k < 4; k++) {
      const tx = x + (24 + k * 2) * s;
      pen.hair([pt(tx, y - (3 + k * 0.4) * s), pt(tx + 0.8 * s, y - (4.4 + k * 0.4) * s), pt(tx + 1.6 * s, y - (3.4 + k * 0.5) * s)], 0.45, d.ink, 0.8);
    }
    shade(d, palm, 0.4);
  }
  for (const part of [arm, wrist, fixed, moving, palm]) pen.stroke(closed(part), lw, d.ink, ink, false);
}

/** A club eye on its stalk: dark cornea over the top two-thirds, faceted, with a slender horn at the tip. */
function eye(d: Draw, base: Pt, tip: Pt, far: boolean): void {
  const { pen } = d;
  const mid = pt(base.x + (tip.x - base.x) * 0.35, base.y + (tip.y - base.y) * 0.35);
  const stalk = capsule(base, mid, 3, 3.4);
  const cornea = capsule(mid, tip, 4.8, 3.8);
  pen.fill(stalk, PAPER_FILL, 1);
  pen.fill(stalk, SHELL, 0.7);
  pen.stroke(closed(stalk), far ? 0.7 : 0.9, d.ink, far ? 0.6 : 1, false);
  pen.fill(cornea, d.ink, far ? 0.6 : 0.88);
  if (!far) {
    pen.clipped(cornea, () => {
      for (let k = 0; k < 10; k++) pen.dot(mid.x + pen.jitter(2), mid.y + (tip.y - mid.y) * pen.rng(), 0.35, PAPER_FILL, 0.3);
    });
    pen.dot(tip.x + 0.6, tip.y + 2.2, 0.9, PAPER_FILL, 0.95);
  }
  pen.stroke(closed(cornea), far ? 0.7 : 0.9, d.ink, far ? 0.6 : 1, false);
  // The horn (stylus) that gives the species its name.
  pen.stroke(bezier(tip, pt(tip.x + 0.5, tip.y - 4), pt(tip.x - 1.5, tip.y - 7), 5), far ? 0.8 : 1.1, d.ink, far ? 0.55 : 0.95, false);
}

export function ghostCrab(d: Draw): void {
  const { pen } = d;
  pen.fill(oval(0, d.g - 1, 46, 3, 24), d.ink, 0.1);
  const top = d.g - 46;
  const bottom = d.g - 22;
  legs(d, bottom, true);
  claw(d, 20, bottom - 2, 0.75, true);
  eye(d, pt(19, top + 1), pt(17, top - 14), true);
  // Rounded at the back, squarer and taller at the front, a tooth at the eye socket's corner.
  const shape = [
    ...cub(pt(-28, bottom), pt(-38, bottom - 3), pt(-39, top + 4), pt(-24, top + 1), 10),
    ...cub(pt(-24, top + 1), pt(-8, top - 2.5), pt(12, top - 2.5), pt(25, top), 10).slice(1),
    pt(28, top - 1.5),
    pt(30, top + 2),
    ...cub(pt(30, top + 2), pt(34, top + 8), pt(34.5, bottom - 6), pt(29, bottom), 10).slice(1),
    ...cub(pt(29, bottom), pt(12, bottom + 3), pt(-12, bottom + 3), pt(-28, bottom), 10).slice(1),
  ];
  skin(d, shape, SHELL, 0.7);
  // The flank below the shoulder line, a shade darker.
  const shoulder = cub(pt(-37, top + 9), pt(-12, top + 12), pt(14, top + 12), pt(33, top + 8), 14);
  pen.clipped(shape, () => tint(d, [...shoulder, pt(40, d.g), pt(-40, d.g)], FLANK, 0.4));
  pen.stipple(shape, 220, (_, y) => (y < top + 12 ? 0.7 : 0.35), 0.5, SPECK);
  // Granules: tiny raised beads, shadowed below and caught by light above.
  for (let i = 0; i < 40; i++) {
    const x = -32 + pen.rng() * 62;
    const y = top + 2 + pen.rng() * 20;
    pen.dot(x + 0.35, y + 0.4, 0.55, d.ink, 0.35);
    pen.dot(x - 0.1, y - 0.1, 0.32, PAPER_FILL, 0.85);
  }
  shade(d, shape, 0.42);
  pen.hair(shoulder, 0.7, d.ink, 0.55);
  // The H-shaped grooves on the back and the cardiac pit.
  pen.hair(bezier(pt(-14, top + 1), pt(-6, top + 7), pt(4, top + 1.5), 8), 0.7, d.ink, 0.6);
  pen.hair(bezier(pt(-20, top + 2), pt(-18, top + 6), pt(-12, top + 8), 6), 0.55, d.ink, 0.5);
  pen.hair(bezier(pt(10, top + 2), pt(8, top + 6), pt(2, top + 8), 6), 0.55, d.ink, 0.5);
  // The pale front margin and the mouthparts' plate under the eyes.
  pen.hair(cub(pt(30, top + 3), pt(33, top + 8), pt(33, bottom - 9), pt(30, bottom - 3), 8), 0.6, d.ink, 0.5);
  const mouth = [pt(23, bottom - 9), pt(29.5, bottom - 10), pt(30, bottom - 1), pt(23, bottom)];
  pen.fill(mouth, PAPER_FILL, 0.7);
  pen.hair(closed(mouth), 0.55, d.ink, 0.7);
  pen.hair([pt(26.5, bottom - 9.5), pt(26.5, bottom - 0.5)], 0.45, d.ink, 0.55);
  // Hatched underside where the body turns under.
  pen.clipped(shape, () => pen.hatch([pt(-40, bottom - 4), pt(36, bottom - 4), pt(36, bottom + 4), pt(-40, bottom + 4)], 1.8, 0.35, 0.45, { color: d.ink, alpha: 0.4 }));
  edge(d, shape, 1.4);
  eye(d, pt(26, top + 1), pt(28, top - 15), false);
  legs(d, bottom, false);
  claw(d, 24, bottom, 1, false);
}
