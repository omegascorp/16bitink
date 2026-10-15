import { claw } from '../../../src/art/crabArt';
import { limb } from '../../../src/art/critters/limb';
import { type Draw, edge, eyeDot, mottle, oval, pt, shade, skin, TAU, tint } from '../../../src/art/kit';
import type { Pt } from '../../../src/art/pen';
import { PAPER_FILL } from '../../../src/art/palette';

/**
 * A red king crab (Paralithodes camtschaticus), which the game doesn't
 * have, drawn with its pen kit: side-on and facing right, standing on local
 * y = 0. A deep, rounded shell bristling with spines, very long spiny legs
 * (three pairs show; the fourth is tucked away, as on a real king crab),
 * the right claw bigger than the left, all a dark red-brown over a cream
 * underside. Not inked red: in the game red ink means "this one eats you".
 */
const SHELL = '#a6452b';
const DARK = '#5a2014';
const LEG = '#9a3a22';
const BAND = '#6c2818';
const BELLY = '#ecd6b0';

const C = pt(0, -36);
const RX = 31;
const RY = 21;

/** The shell outline, every other point pushed out into a spine along the top. */
function shellOutline(): Pt[] {
  return Array.from({ length: 44 }, (_, i) => {
    const a = (i / 44) * TAU;
    const s = Math.sin(a);
    const spiny = s < 0.15 && i % 2 === 0 ? 1.13 : 1;
    // A little narrower at the front, as the shell tapers to the eyes.
    const x = Math.cos(a) * RX * (Math.cos(a) > 0 ? 0.92 : 1);
    return pt(C.x + x * spiny, C.y + (s < 0 ? RY : RY * 0.7) * s * spiny);
  });
}

/** Short spines along a leg segment's upper side. */
function spines(d: Draw, a: Pt, b: Pt, n: number, len: number, alpha: number): void {
  const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const nx = (b.y - a.y) / l;
  const ny = -(b.x - a.x) / l;
  const up = ny < 0 ? 1 : -1;
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1);
    const p = pt(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
    d.pen.hair([p, pt(p.x + nx * up * len + (b.x - a.x) / l * 1.5, p.y + ny * up * len + (b.y - a.y) / l * 1.5)], 1.2, d.ink, alpha);
  }
}

/** Long legs arching high over the body: knee up, then down to a pointed foot far out. */
function legs(d: Draw, far: boolean): void {
  const feet = far ? [50, -22, -74] : [76, 34, -62];
  feet.forEach((fx, i) => {
    const ph = -d.f * (TAU / 3) + (i % 2) * Math.PI + (far ? Math.PI / 2 : 0);
    const step = Math.cos(ph) * 3;
    const lift = Math.max(0, Math.sin(ph)) * 3;
    const hip = pt(C.x + [14, 2, -12][i]! + (far ? -3 : 0), C.y + RY * 0.62 + (far ? -3 : 0));
    const foot = pt(fx + step, -lift * 0.4 - (far ? 2 : 0));
    const dir = Math.sign(foot.x - hip.x) || 1;
    // The knee well out to the side, arched up to the shell's shoulder: legs reach out from under it.
    const knee = pt(hip.x + (foot.x - hip.x) * 0.55, C.y - (far ? 6 : 2) - lift);
    const ankle = pt(hip.x + (foot.x - hip.x) * 0.86 + dir * 4, -20 - lift * 0.6);
    const joints = [hip, knee, ankle, foot];
    limb(d, joints, { widths: [7, 6, 4.2, 0.8], wash: LEG, band: BAND, hairs: 0, far });
    if (!far) for (let j = 0; j < 3; j++) spines(d, joints[j]!, joints[j + 1]!, 3, 4, 0.9);
  });
}

export function drawKingCrab(d: Draw): void {
  const open = [1, 3, 2][d.f]!;
  legs(d, true);
  claw(d, C.x + 16 - 34 * 0.42, C.y + 6 - 8 * 0.42, 0.42, LEG, open * 0.6, true, DARK);
  const shell = shellOutline();
  skin(d, shell, SHELL, 0.72);
  d.pen.clipped(shell, () => tint(d, oval(C.x, C.y + RY * 0.75, RX * 1.1, RY * 0.4, 20), BELLY, 0.85));
  mottle(d, shell, 60, C.y - RY, C.y + RY * 0.3, DARK);
  shade(d, shell, 0.5, true);
  // The bases of the spines all over the top of the shell: little bumps, each with its shadow and a glint.
  for (let i = 0; i < 26; i++) {
    const a = Math.PI + d.pen.rng() * Math.PI;
    const r = 0.25 + d.pen.rng() * 0.6;
    const p = pt(C.x + Math.cos(a) * RX * r, C.y + Math.sin(a) * RY * r * 0.9);
    d.pen.dot(p.x + 0.5, p.y + 0.6, 1.3, d.ink, 0.5);
    d.pen.dot(p.x, p.y, 0.7, PAPER_FILL, 0.85);
  }
  edge(d, shell, 1.3);
  legs(d, false);
  claw(d, C.x + 24 - 34 * 0.68, C.y + 10 - 8 * 0.68, 0.68, LEG, open, false, DARK);
  // Eyes on short stalks at the front of the shell.
  const root = pt(C.x + RX * 0.8, C.y - RY * 0.55);
  d.pen.stroke([root, pt(root.x + 3, root.y - 6)], 2, d.ink, 1, false);
  eyeDot(d, root.x + 3, root.y - 7, 2.3);
  d.pen.fill(oval(C.x, 0.5, 70, 3, 24), d.ink, 0.08);
}
