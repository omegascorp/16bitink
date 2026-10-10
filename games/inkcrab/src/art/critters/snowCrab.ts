import { bezier, capsule, closed, cub, type Draw, edge, glint, oval, pt, shade, skin, TAU, tint, tube } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { limb } from './limb';

/**
 * A snow crab (Chionoecetes opilio) on cold shingle, side-on and facing
 * right: a spider crab with a rounded, almost circular carapace, a little
 * longer than wide, its back studded with small blunt bumps and drawn out
 * in front into two short horns over the eyes. Very long, flattened
 * walking legs with sharp tips, spread wide and stepping high, and
 * slender claws held forward. Orange-tan above, cream to white beneath,
 * the legs banded a deeper orange.
 */
const SHELL = '#c97b44';
const DARK = '#86472a';
const PALE = '#e9b98c';
const BELLY = '#f1e5cc';
const LEG = '#d89a63';
const BAND = '#a85e33';
const FINGER = '#5a3424';

/** Four very long, flat legs a side, knees cocked high over the shell, stepping in alternate pairs. */
function legs(d: Draw, bottom: number, far: boolean): void {
  [-56, -41, 33, 50].forEach((dx, i) => {
    const ph = -d.f * (TAU / 3) + (i % 2) * Math.PI + (far ? Math.PI / 2 : 0);
    const step = Math.cos(ph) * 4.5;
    const lift = Math.max(0, Math.sin(ph)) * 5;
    const hip = pt(dx * 0.24 + (far ? -3 : 0), bottom - 2 + (far ? -3 : 0));
    const foot = pt(dx + step + (far ? -4 : 0), d.g - lift * 0.4 - (far ? 2 : 0));
    const reach = foot.x - hip.x;
    const knee = pt(hip.x + reach * 0.5, bottom - 13 - lift);
    const ankle = pt(hip.x + reach * 0.86, d.g - 10 - lift * 0.6);
    const tip = pt(foot.x + Math.sign(reach) * 0.8, foot.y);
    limb(d, [hip, knee, ankle, tip], { widths: [4.4, 3.8, 2.6, 0.4], wash: LEG, band: BAND, hairs: far ? 0 : 1, far });
    if (!far) {
      // The flattened leg's pale upper edge, catching the light.
      const t = (u: number): Pt => pt(hip.x + (knee.x - hip.x) * u, hip.y + (knee.y - hip.y) * u - 1.1);
      d.pen.hair([t(0.25), t(0.85)], 0.7, PAPER_FILL, 0.55);
    }
  });
}

/** A slender claw held forward: a long arm, a narrow palm and fine, dark-tipped fingers. */
function claw(d: Draw, x: number, y: number, s: number, far: boolean): void {
  const { pen } = d;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, y + dy * s);
  const arm = capsule(P(0, 0), P(11, -3.6), 3.8 * s, 3.2 * s);
  const wrist = oval(x + 12.5 * s, y - 4 * s, 2.7 * s, 2.5 * s, 12);
  const palm = [
    ...cub(P(13, -1.8), P(13, -6.8), P(16, -7.6), P(20.5, -6.8), 8),
    ...cub(P(20.5, -6.8), P(22.6, -6), P(23, -2.4), P(21, -1), 6).slice(1),
    ...cub(P(21, -1), P(18.4, 0.4), P(14.6, 0.4), P(13, -1.8), 6).slice(1),
  ];
  const fixed = tube(bezier(P(21, -2), P(25, -2), P(28, -3.8), 6), 2.4 * s, 0.6 * s);
  const moving = tube(bezier(P(21.2, -5.6), P(25.4, -6.6), P(28, -4.2), 6), 2.2 * s, 0.6 * s);
  for (const part of [arm, wrist, palm]) {
    pen.fill(part, PAPER_FILL, 1);
    pen.fill(part, SHELL, far ? 0.82 : 0.72);
    if (far) pen.fill(part, d.ink, 0.14);
  }
  for (const f of [fixed, moving]) {
    pen.fill(f, PAPER_FILL, 1);
    pen.fill(f, PALE, far ? 0.82 : 0.75);
    pen.clipped(f, () => pen.fill(oval(x + 28 * s, y - 4 * s, 3 * s, 4 * s, 10), FINGER, 0.7));
    if (far) pen.fill(f, d.ink, 0.12);
  }
  if (!far) {
    pen.clipped(palm, () => tint(d, oval(x + 17 * s, y + 0.5 * s, 5 * s, 2 * s, 10), BELLY, 0.7));
    glint(d, [P(14.5, -5.6), P(18, -6.6)], 0.8, 0.6);
    shade(d, palm, 0.35);
    for (let k = 0; k < 3; k++) pen.dot(x + (3 + k * 3) * s, y - (1.6 + k * 1) * s, 0.45 * s, DARK, 0.7);
  }
  for (const part of [arm, wrist, fixed, moving, palm]) pen.stroke(closed(part), far ? 0.6 : 0.9, d.ink, far ? 0.55 : 1, false);
}

/**
 * The carapace: round and deep, highest just behind the middle, sloping in
 * front to the two short horns over the eyes.
 */
function carapace(top: number, bottom: number): Pt[] {
  return [
    ...cub(pt(-19, bottom), pt(-27, bottom - 4), pt(-25, top + 6), pt(-15, top + 1.5), 8),
    ...cub(pt(-15, top + 1.5), pt(-6, top - 2), pt(8, top - 1.6), pt(16, top + 3.6), 10).slice(1),
    ...cub(pt(16, top + 3.6), pt(20, top + 6), pt(23, top + 6.6), pt(26.6, top + 6.4), 6).slice(1),
    pt(27.2, top + 7.6),
    ...cub(pt(27.2, top + 7.6), pt(24.6, top + 8.6), pt(22.6, top + 9.6), pt(21.4, top + 11), 5).slice(1),
    ...cub(pt(21.4, top + 11), pt(22.6, bottom - 5), pt(21, bottom - 1), pt(18, bottom), 6).slice(1),
    ...cub(pt(18, bottom), pt(6, bottom + 2.6), pt(-8, bottom + 2.6), pt(-19, bottom), 10).slice(1),
  ];
}

export function snowCrab(d: Draw): void {
  const { pen } = d;
  pen.fill(oval(0, d.g - 1, 52, 3, 24), d.ink, 0.1);
  const top = d.g - 40;
  const bottom = d.g - 21;
  legs(d, bottom, true);
  claw(d, 14, bottom - 2, 0.95, true);
  const shape = carapace(top, bottom);
  skin(d, shape, SHELL, 0.85);
  const margin = cub(pt(-26, top + 12), pt(-8, top + 14.4), pt(8, top + 14.4), pt(22, top + 11.4), 12);
  pen.clipped(shape, () => {
    // Deeper orange over the crown, the cream underside below the side edge.
    tint(d, oval(-3, top + 3, 16, 6, 16), DARK, 0.3);
    tint(d, [...margin, pt(34, bottom - 3), pt(34, d.g), pt(-34, d.g), pt(-34, bottom - 3)], DARK, 0.2);
    tint(d, [pt(-34, bottom - 2.6), pt(34, bottom - 3.4), pt(34, d.g), pt(-34, d.g)], BELLY, 0.85);
    pen.hair(margin, 0.55, d.ink, 0.45);
    // The small blunt bumps all over the back: a dark lower side and a pale top on each.
    for (let i = 0; i < 26; i++) {
      const bx = -20 + pen.rng() * 38;
      const by = top + 1.5 + pen.rng() * 10;
      const r = 0.7 + pen.rng() * 0.5;
      pen.fill(oval(bx + 0.3, by + 0.4, r, r * 0.8, 8), DARK, 0.55);
      pen.dot(bx - 0.2, by - 0.3, r * 0.5, PALE, 0.8);
    }
    // The regions of the back, faint.
    pen.hair(bezier(pt(-6, top + 1), pt(-2, top + 5.6), pt(4, top + 1.4), 6), 0.5, d.ink, 0.45);
  });
  shade(d, shape, 0.42);
  glint(d, cub(pt(-15, top + 3), pt(-9, top + 0.4), pt(-1, top - 0.2), pt(5, top + 1), 8), 1.1, 0.6);
  // The bumpy rim: a row of small knobs standing up along the top of the shell.
  for (let k = 0; k < 9; k++) {
    const u = k / 8;
    const p = pt(-20 + u * 34, top + 1.6 + Math.pow(Math.abs(u - 0.45) * 2, 2) * 3.4 - (u > 0.9 ? -1.5 : 0));
    pen.stroke([pt(p.x - 0.9, p.y + 0.4), pt(p.x, p.y - 1.3), pt(p.x + 0.9, p.y + 0.4)], 0.6, d.ink, 0.8, false);
  }
  // The split between the two horns, and the hatched underside.
  pen.hair([pt(22, top + 8.6), pt(27, top + 7.4)], 0.5, d.ink, 0.6);
  pen.clipped(shape, () => pen.hatch([pt(-34, bottom - 3), pt(30, bottom - 3), pt(30, bottom + 4), pt(-34, bottom + 4)], 1.8, 0.35, 0.45, { color: d.ink, alpha: 0.4 }));
  edge(d, shape, 1.25);
  // A small eye on a short stalk in its socket under the horns.
  pen.fill(oval(21.6, top + 10.4, 2.2, 2, 10), PAPER_FILL, 0.8);
  pen.dot(22, top + 10.2, 1.6, d.ink, 0.95);
  pen.dot(22.5, top + 9.6, 0.5, PAPER_FILL, 0.95);
  legs(d, bottom, false);
  claw(d, 16, bottom - 1, 1.05, false);
}
