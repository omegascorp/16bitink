import { bezier, capsule, closed, cub, type Draw, edge, glint, oval, pt, shade, skin, TAU, tint, tube } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { limb } from './limb';

/**
 * A northern kelp crab (Pugettia producta), side-on and facing right: a
 * small spider crab with a smooth, shield-shaped carapace, domed and
 * glossy, drawn out in front into a short forked beak (rostrum) over a
 * small eye; long, thin, stilted legs with hooked tips for gripping kelp,
 * and slender claws held forward. Olive-green to olive-brown like the kelp
 * it hides in, with a paler, yellowish underside.
 */
const SHELL = '#6c7140';
const DARK = '#3d4226';
const BROWN = '#7d6a3e';
const BELLY = '#d6cd9c';
const LEG = '#727444';
const TIP = '#3a3324';

/** Four long, thin legs a side, knees cocked high above the shell, stepping in alternate pairs. */
function legs(d: Draw, bottom: number, far: boolean): void {
  [-50, -37, 27, 42].forEach((dx, i) => {
    const ph = -d.f * (TAU / 3) + (i % 2) * Math.PI + (far ? Math.PI / 2 : 0);
    const step = Math.cos(ph) * 4;
    const lift = Math.max(0, Math.sin(ph)) * 5;
    const hip = pt(dx * 0.24 + (far ? -3 : 0), bottom - 2 + (far ? -3 : 0));
    const foot = pt(dx + step + (far ? -4 : 0), d.g - lift * 0.4 - (far ? 2 : 0));
    const reach = foot.x - hip.x;
    const dir = Math.sign(reach);
    const knee = pt(hip.x + reach * 0.52, bottom - 12 - lift);
    const ankle = pt(hip.x + reach * 0.88, d.g - 9 - lift * 0.6);
    const tip = pt(foot.x + dir * 0.6, foot.y);
    limb(d, [hip, knee, ankle, tip], { widths: [2.8, 2.3, 1.7, 0.4], wash: LEG, hairs: far ? 0 : 1, far });
    // The dark, hooked last segment that grips the kelp.
    const a = pt(ankle.x + (tip.x - ankle.x) * 0.5, ankle.y + (tip.y - ankle.y) * 0.5);
    d.pen.stroke(bezier(a, pt(tip.x + dir * 0.8, a.y + (tip.y - a.y) * 0.7), tip, 4), far ? 0.8 : 1.1, TIP, far ? 0.5 : 0.85, false);
  });
}

/** A slender claw held forward: a long arm, a narrow palm and fine fingers. */
function claw(d: Draw, x: number, y: number, s: number, far: boolean): void {
  const { pen } = d;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, y + dy * s);
  const arm = capsule(P(0, 0), P(10, -3), 3.6 * s, 3.2 * s);
  const wrist = oval(x + 11.5 * s, y - 3.4 * s, 2.6 * s, 2.4 * s, 12);
  const palm = [
    ...cub(P(12, -1.4), P(12, -6), P(15, -7), P(19, -6.2), 8),
    ...cub(P(19, -6.2), P(21, -5.6), P(21.4, -2), P(19.4, -0.6), 6).slice(1),
    ...cub(P(19.4, -0.6), P(17, 0.6), P(13.5, 0.6), P(12, -1.4), 6).slice(1),
  ];
  const fixed = tube(bezier(P(19.4, -1.6), P(23, -1.6), P(25.5, -3.4), 6), 2.4 * s, 0.6 * s);
  const moving = tube(bezier(P(19.6, -5), P(23.4, -6), P(25.6, -3.8), 6), 2.2 * s, 0.6 * s);
  for (const part of [arm, wrist, fixed, moving, palm]) {
    pen.fill(part, PAPER_FILL, 1);
    pen.fill(part, SHELL, far ? 0.82 : 0.72);
    if (far) pen.fill(part, d.ink, 0.14);
  }
  if (!far) {
    pen.clipped(palm, () => tint(d, oval(x + 16 * s, y + 0.5 * s, 5 * s, 2 * s, 10), BELLY, 0.6));
    glint(d, [P(13.5, -5), P(17, -6)], 0.8, 0.6);
    shade(d, palm, 0.35);
  }
  for (const part of [arm, wrist, fixed, moving, palm]) pen.stroke(closed(part), far ? 0.6 : 0.9, d.ink, far ? 0.55 : 1, false);
}

export function kelpCrab(d: Draw): void {
  const { pen } = d;
  pen.fill(oval(0, d.g - 1, 46, 3, 24), d.ink, 0.1);
  const top = d.g - 39;
  const bottom = d.g - 20;
  legs(d, bottom, true);
  claw(d, 13, bottom - 2, 0.95, true);
  // A smooth, deep dome, highest just forward of the middle, sloping to the forked rostrum over the face.
  const shape = [
    ...cub(pt(-18, bottom), pt(-25, bottom - 3), pt(-24, top + 7), pt(-16, top + 2.5), 8),
    ...cub(pt(-16, top + 2.5), pt(-8, top - 1.5), pt(6, top - 1.8), pt(14, top + 3), 10).slice(1),
    ...cub(pt(14, top + 3), pt(18, top + 5.5), pt(22, top + 6.4), pt(28, top + 6.4), 6).slice(1),
    pt(28.6, top + 7.6),
    ...cub(pt(28.6, top + 7.6), pt(25, top + 8.6), pt(22, top + 9.6), pt(20, top + 11), 6).slice(1),
    ...cub(pt(20, top + 11), pt(21, bottom - 4), pt(19.5, bottom - 1), pt(17, bottom), 6).slice(1),
    ...cub(pt(17, bottom), pt(6, bottom + 2.4), pt(-8, bottom + 2.4), pt(-18, bottom), 10).slice(1),
  ];
  skin(d, shape, SHELL, 0.85);
  pen.clipped(shape, () => {
    // Browner over the crown, the yellowish underside below the side edge.
    tint(d, oval(-2, top + 3, 15, 6, 16), BROWN, 0.45);
    const margin = cub(pt(-25, top + 11), pt(-8, top + 13), pt(8, top + 13), pt(21, top + 10.5), 12);
    tint(d, [...margin, pt(34, bottom - 3), pt(34, d.g), pt(-34, d.g), pt(-34, bottom - 3)], DARK, 0.25);
    tint(d, [pt(-34, bottom - 2.5), pt(34, bottom - 3.5), pt(34, d.g), pt(-34, d.g)], BELLY, 0.85);
    pen.hair(margin, 0.55, d.ink, 0.45);
    // A few faint low bumps (the shield's regions), but smooth overall.
    for (const [bx, by] of [[-10, top + 5], [2, top + 4], [-4, top + 9]] as const) pen.hair(bezier(pt(bx - 3, by + 1), pt(bx, by - 1), pt(bx + 3, by + 1), 4), 0.45, DARK, 0.5);
  });
  shade(d, shape, 0.4);
  // Glossy: a long highlight over the dome.
  glint(d, cub(pt(-14, top + 3.6), pt(-8, top + 1), pt(2, top + 0.6), pt(8, top + 2), 8), 1.2, 0.7);
  // The fork of the rostrum, and the hatched underside.
  pen.hair([pt(21.5, top + 8.2), pt(27.6, top + 7.2)], 0.5, d.ink, 0.6);
  pen.clipped(shape, () => pen.hatch([pt(-34, bottom - 3), pt(30, bottom - 3), pt(30, bottom + 4), pt(-34, bottom + 4)], 1.8, 0.35, 0.45, { color: d.ink, alpha: 0.4 }));
  edge(d, shape, 1.2);
  // A small eye tucked in its socket under the rostrum.
  pen.fill(oval(19.6, top + 10, 2, 1.8, 10), PAPER_FILL, 0.8);
  pen.dot(19.8, top + 10, 1.5, d.ink, 0.95);
  pen.dot(20.3, top + 9.5, 0.45, PAPER_FILL, 0.95);
  legs(d, bottom, false);
  claw(d, 15, bottom - 1, 1.05, false);
}
