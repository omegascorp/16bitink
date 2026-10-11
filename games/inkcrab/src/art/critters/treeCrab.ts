import { bezier, capsule, closed, cub, type Draw, edge, mottle, oval, pt, shade, skin, TAU, tint, tube } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { limb } from './limb';

/**
 * A mangrove tree crab (Aratus pisonii), side-on and facing right: a small,
 * flat, square carapace mottled olive-brown with dark blotches, a broad
 * squared front with the eyes at its corners, short red claws with pale
 * tips, and long, thin, banded legs ending in needle-sharp dark points for
 * gripping bark.
 */
const SHELL = '#8c7c4c';
const DARK = '#4a3a22';
const PALE = '#d6c89a';
const LEG = '#8e7e52';
const BAND = '#4c3f24';
const CLAW = '#b4513a';
const TIP = '#f0e4c6';

/** Four long legs a side, knees cocked high above the shell, stepping in alternate pairs. */
function legs(d: Draw, bottom: number, far: boolean): void {
  [-56, -42, 30, 46].forEach((dx, i) => {
    const ph = -d.f * (TAU / 3) + (i % 2) * Math.PI + (far ? Math.PI / 2 : 0);
    const step = Math.cos(ph) * 4;
    const lift = Math.max(0, Math.sin(ph)) * 4.5;
    const hip = pt(dx * 0.28 + (far ? -3 : 0), bottom - 3 + (far ? -3 : 0));
    const foot = pt(dx + step + (far ? -4 : 0), d.g - lift * 0.4 - (far ? 2 : 0));
    const reach = foot.x - hip.x;
    const knee = pt(hip.x + reach * 0.45, bottom - 14 - lift);
    const ankle = pt(hip.x + reach * 0.85, d.g - 9 - lift * 0.6);
    const tip = pt(foot.x + Math.sign(reach) * 1, foot.y);
    limb(d, [hip, knee, ankle, tip], { widths: [4.4, 3.6, 2.4, 0.3], wash: LEG, band: BAND, hairs: far ? 0 : 2, far });
    // The sharp, dark claw-tip of the last segment (dactyl).
    const a = pt(ankle.x + (tip.x - ankle.x) * 0.6, ankle.y + (tip.y - ankle.y) * 0.6);
    d.pen.stroke([a, tip], far ? 0.8 : 1.1, d.ink, far ? 0.5 : 0.95, false);
  });
}

/** A short, stout claw held under the front: red arm and palm, pale-tipped fingers. */
function claw(d: Draw, x: number, y: number, s: number, far: boolean): void {
  const { pen } = d;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, y + dy * s);
  const arm = capsule(P(0, 0), P(6, -2), 5 * s, 4.4 * s);
  const wrist = oval(x + 8 * s, y - 2.5 * s, 3.4 * s, 3.2 * s, 12);
  const palm = [
    ...cub(P(9, 1), P(8.5, -6), P(13, -8), P(17, -6.5), 8),
    ...cub(P(17, -6.5), P(19.5, -4.5), P(19.5, 0), P(17, 2), 6).slice(1),
    ...cub(P(17, 2), P(14, 3.5), P(10.5, 3.2), P(9, 1), 6).slice(1),
  ];
  const fixed = tube(bezier(P(16, 0.5), P(20, 1), P(23, -1), 6), 3.4 * s, 0.9 * s);
  const moving = tube(bezier(P(16, -5), P(21, -6), P(23.4, -1.6), 6), 3 * s, 0.9 * s);
  for (const part of [arm, wrist, palm, fixed, moving]) {
    pen.fill(part, PAPER_FILL, 1);
    pen.fill(part, CLAW, far ? 0.8 : 0.72);
    if (far) pen.fill(part, d.ink, 0.14);
  }
  for (const f of [fixed, moving]) pen.clipped(f, () => pen.fill(oval(x + 23 * s, y - 1.5 * s, 4 * s, 4 * s, 10), TIP, 0.9));
  if (!far) {
    pen.clipped(palm, () => tint(d, oval(x + 13 * s, y - 6.5 * s, 4 * s, 1.4 * s, 10), PAPER_FILL, 0.45));
    shade(d, palm, 0.4);
  }
  for (const part of [arm, wrist, fixed, moving, palm]) pen.stroke(closed(part), far ? 0.7 : 1, d.ink, far ? 0.55 : 1, false);
}

/** A short stalked eye at the front corner. */
function eye(d: Draw, x: number, y: number, far: boolean): void {
  const { pen } = d;
  const stalk = capsule(pt(x - 1, y + 3), pt(x, y - 1), 2.6, 2.4);
  pen.fill(stalk, PAPER_FILL, 1);
  pen.fill(stalk, SHELL, 0.8);
  pen.stroke(closed(stalk), far ? 0.6 : 0.8, d.ink, far ? 0.55 : 0.95, false);
  pen.fill(oval(x + 0.4, y - 1.6, 2.6, 2.4, 10), d.ink, far ? 0.6 : 0.92);
  if (!far) pen.dot(x + 1.1, y - 2.4, 0.65, PAPER_FILL, 0.95);
}

export function treeCrab(d: Draw): void {
  const { pen } = d;
  pen.fill(oval(0, d.g - 1, 46, 3, 24), d.ink, 0.1);
  const top = d.g - 39;
  const bottom = d.g - 23;
  legs(d, bottom, true);
  claw(d, 18, bottom - 1, 0.9, true);
  eye(d, 21, top - 1, true);
  // Flat and square: barely domed on top, straight sides, a broad squared front.
  const shape = [
    ...cub(pt(-26, bottom), pt(-31, bottom - 3), pt(-31, top + 4), pt(-25, top + 1), 8),
    ...cub(pt(-25, top + 1), pt(-10, top - 0.8), pt(10, top - 0.8), pt(23, top), 10).slice(1),
    pt(26, top + 1),
    ...cub(pt(26, top + 1), pt(28, top + 5), pt(28, bottom - 3), pt(25.5, bottom), 8).slice(1),
    ...cub(pt(25.5, bottom), pt(10, bottom + 2), pt(-10, bottom + 2), pt(-26, bottom), 10).slice(1),
  ];
  skin(d, shape, SHELL, 0.85);
  pen.clipped(shape, () => {
    // Dark blotches and pale flecks: the bark-and-lichen camouflage.
    for (let i = 0; i < 16; i++) {
      const bx = -27 + pen.rng() * 52;
      const by = top + 1 + pen.rng() * 13;
      tint(d, oval(bx, by, 1.8 + pen.rng() * 2.6, 1 + pen.rng() * 1.6, 10), DARK, 0.45);
    }
    for (let i = 0; i < 8; i++) tint(d, oval(-24 + pen.rng() * 46, top + 2 + pen.rng() * 9, 1.2, 0.8, 8), PALE, 0.55);
    pen.hair(cub(pt(-31, top + 6), pt(-10, top + 7.5), pt(10, top + 7.5), pt(28, top + 5), 12), 0.6, d.ink, 0.5);
  });
  mottle(d, shape, 90, top, bottom, DARK, 0.5);
  shade(d, shape, 0.42);
  // Fine oblique ridges (striae) on the side of the shell, and the hatched underside.
  for (let k = 0; k < 4; k++) pen.hair([pt(-18 + k * 6, top + 9), pt(-14 + k * 6, top + 12.5)], 0.45, d.ink, 0.4);
  pen.clipped(shape, () => pen.hatch([pt(-34, bottom - 3), pt(30, bottom - 3), pt(30, bottom + 4), pt(-34, bottom + 4)], 1.8, 0.35, 0.45, { color: d.ink, alpha: 0.4 }));
  pen.hair(cub(pt(26, top + 2), pt(27.5, top + 6), pt(27.5, bottom - 5), pt(25.5, bottom - 2), 6), 0.55, d.ink, 0.5);
  edge(d, shape, 1.3);
  eye(d, 25, top - 1, false);
  legs(d, bottom, false);
  claw(d, 21, bottom + 1, 1, false);
}
