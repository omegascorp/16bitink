import { bezier, capsule, closed, cub, type Draw, edge, glint, mottle, oval, pt, shade, skin, TAU, tint, tube } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { limb } from './limb';

/**
 * A Florida stone crab (Menippe mercenaria), side-on and facing right,
 * seen a little from above: a heavy, smooth, deeply domed oval carapace,
 * brownish-maroon spotted with grey, stout banded legs, and the enormous,
 * unequal crushing claws it is known for, tan beneath and maroon over the
 * top, ending in short, massive fingers that are black to the tips. Kept
 * brown rather than red, which in the game means it can catch you.
 */
const SHELL = '#62504a';
const DARK = '#3a2d2a';
const SPOT = '#a9aaa4';
const RIM = '#8d7464';
const BELLY = '#e6dcc4';
const LEG = '#86695c';
const BAND = '#4e3c37';
const PALM = '#cdb08a';
const FINGER = '#17151a';

/** Frame units the crab is set back, so the shell and the great claw sit about the frame centre. */
const SHIFT = -5;

/** Four stout legs a side, splayed wide, stepping in alternate pairs. */
function legs(d: Draw, bottom: number, far: boolean): void {
  [-50, -39, 28, 40].forEach((dx, i) => {
    const ph = -d.f * (TAU / 3) + (i % 2) * Math.PI + (far ? Math.PI / 2 : 0);
    const step = Math.cos(ph) * 3;
    const lift = Math.max(0, Math.sin(ph)) * 4;
    const hip = pt(dx * 0.3 + (far ? -3 : 0), bottom - 1 + (far ? -3 : 0));
    const foot = pt(dx + step + (far ? -4 : 0), d.g - lift * 0.4 - (far ? 2 : 0));
    const reach = foot.x - hip.x;
    const knee = pt(hip.x + reach * 0.5, bottom - 7 - lift);
    const ankle = pt(hip.x + reach * 0.86, d.g - 8 - lift * 0.6);
    const tip = pt(foot.x + Math.sign(reach) * 1, foot.y);
    limb(d, [hip, knee, ankle, tip], { widths: [7, 6, 4, 0.6], wash: LEG, band: BAND, hairs: far ? 0 : 2, far });
    // The dark, hairy last segment.
    const a = pt(ankle.x + (tip.x - ankle.x) * 0.45, ankle.y + (tip.y - ankle.y) * 0.45);
    d.pen.stroke([a, tip], far ? 1 : 1.4, DARK, far ? 0.5 : 0.85, false);
  });
}

/**
 * A massive crushing claw held forward: a thick arm and wrist, a deep,
 * swollen palm, maroon over the top and tan beneath, and short, heavy
 * fingers, black right to their tips, with blunt crushing teeth.
 */
function claw(d: Draw, x: number, y: number, s: number, far: boolean): void {
  const { pen } = d;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, y + dy * s);
  const arm = capsule(P(0, 0), P(7, -3), 7 * s, 6.6 * s);
  const wrist = oval(x + 10 * s, y - 4 * s, 5.4 * s, 5 * s, 14);
  const palm = [
    ...cub(P(12, 2), P(10, -10), P(17, -14.5), P(24, -13.5), 10),
    ...cub(P(24, -13.5), P(30, -12.6), P(32.5, -6), P(30, 0.5), 8).slice(1),
    ...cub(P(30, 0.5), P(26, 6), P(16, 6.4), P(12, 2), 8).slice(1),
  ];
  const fixedSpine = bezier(P(28.5, -1), P(34, -0.6), P(37.5, -4.4), 6);
  const movingSpine = bezier(P(28.5, -10), P(35.5, -11.4), P(38, -5.2), 6);
  const fixed = tube(fixedSpine, 6.4 * s, 1.6 * s);
  const moving = tube(movingSpine, 6 * s, 1.6 * s);
  for (const part of [arm, wrist, palm]) {
    pen.fill(part, PAPER_FILL, 1);
    pen.fill(part, PALM, far ? 0.85 : 0.78);
    if (far) pen.fill(part, d.ink, 0.14);
  }
  for (const f of [fixed, moving]) {
    pen.fill(f, PAPER_FILL, 1);
    pen.fill(f, FINGER, far ? 0.82 : 0.92);
  }
  pen.clipped(palm, () => {
    // Maroon-brown over the top of the hand, grey-spotted; the black of the fingers bleeding into it.
    tint(d, [P(8, -16), P(34, -16), P(34, -7), P(22, -8), P(8, -4)], SHELL, far ? 0.6 : 0.8);
    tint(d, oval(x + 30 * s, y - 5 * s, 4 * s, 7 * s, 12), FINGER, 0.55);
    if (!far) for (let i = 0; i < 6; i++) pen.dot(x + (14 + pen.rng() * 12) * s, y - (9 + pen.rng() * 4) * s, 0.6 * s, SPOT, 0.85);
  });
  if (!far) {
    pen.clipped(arm, () => tint(d, oval(x + 3 * s, y - 3 * s, 6 * s, 2.4 * s, 10), SHELL, 0.6));
    shade(d, palm, 0.4);
    glint(d, [P(16, -11), P(23, -12.2)], 1.1, 0.75);
    // Blunt crushing teeth on the fixed finger, and a glint on the black fingers.
    for (let k = 1; k < 5; k++) pen.dot(fixedSpine[k]!.x, fixedSpine[k]!.y - 2.4 * s, 0.75 * s, PAPER_FILL, 0.5);
    glint(d, movingSpine.slice(1, 4).map((p) => pt(p.x, p.y - 1.2 * s)), 0.8, 0.55);
  }
  for (const part of [arm, wrist, fixed, moving, palm]) pen.stroke(closed(part), far ? 0.7 : 1.1, d.ink, far ? 0.55 : 1, false);
}

/** A short stalked eye in its notch at the front of the shell. */
function eye(d: Draw, x: number, y: number): void {
  const { pen } = d;
  const stalk = capsule(pt(x - 1.4, y + 3), pt(x, y - 0.3), 2.8, 2.6);
  pen.fill(stalk, PAPER_FILL, 1);
  pen.fill(stalk, RIM, 0.8);
  pen.stroke(closed(stalk), 0.8, d.ink, 0.95, false);
  pen.fill(oval(x + 0.3, y - 1.2, 2.3, 2.1, 10), d.ink, 0.92);
  pen.dot(x + 0.9, y - 1.9, 0.6, PAPER_FILL, 0.95);
}

export function stoneCrab(d: Draw): void {
  const { pen } = d;
  const { ctx } = pen;
  ctx.save();
  ctx.translate(SHIFT, 0);
  pen.fill(oval(0, d.g - 1, 50, 3, 24), d.ink, 0.1);
  const top = d.g - 44;
  const cy = d.g - 31;
  const bottom = d.g - 19;
  legs(d, bottom, true);
  // The smaller cutting claw on the far side, raised a little behind the crusher.
  claw(d, 15, bottom - 7, 0.8, true);
  // The cream body under the shell, turned under and hatched.
  const under = [
    ...cub(pt(-27, cy + 3), pt(-30, bottom - 3), pt(-24, bottom + 1), pt(-16, bottom + 1), 8),
    ...cub(pt(-16, bottom + 1), pt(-4, bottom + 2), pt(12, bottom + 2), pt(22, bottom), 8).slice(1),
    ...cub(pt(22, bottom), pt(29, bottom - 2), pt(31, cy + 6), pt(28, cy + 3), 6).slice(1),
  ];
  skin(d, under, BELLY, 0.7);
  pen.clipped(under, () => pen.hatch(under, 1.8, 0.35, 0.45, { color: d.ink, alpha: 0.35 }));
  edge(d, under, 1.1);
  // A heavy, smooth oval, deeply domed, the front edge cut into a few low, blunt lobes.
  const front = cub(pt(33, cy), pt(26, cy + 9), pt(-26, cy + 9), pt(-33, cy), 30).map((p, i) => {
    if (p.x < 6 || i % 3 !== 0) return p;
    return pt(p.x + 0.6, p.y + 1);
  });
  const shape = [...cub(pt(-33, cy), pt(-33, top - 2), pt(27, top - 3), pt(33, cy), 20), ...front.slice(1, -1)];
  skin(d, shape, SHELL, 0.88);
  pen.clipped(shape, () => {
    // Paler brown at the rim, darkest over the crown; grey spots and speckles all over.
    pen.stroke(cub(pt(35, cy + 1), pt(26, cy + 8), pt(-26, cy + 8), pt(-35, cy + 1), 20), 4, RIM, 0.6, false);
    tint(d, oval(-4, top + 5, 22, 5, 18), DARK, 0.35);
    for (let i = 0; i < 26; i++) {
      const sx = -30 + pen.rng() * 60;
      const sy = top + 2 + pen.rng() * 18;
      pen.fill(oval(sx, sy, 0.7 + pen.rng() * 1.2, 0.5 + pen.rng() * 0.8, 8), SPOT, 0.8);
    }
  });
  mottle(d, shape, 90, top, cy + 6, DARK, 0.45);
  shade(d, shape, 0.45, true);
  // Smooth and a little glossy: a highlight across the dome.
  glint(d, cub(pt(-22, top + 4), pt(-14, top + 0.6), pt(-2, top - 0.4), pt(6, top + 0.6), 8), 1.2, 0.6);
  // The faint grooves of the back.
  pen.hair(bezier(pt(-8, top + 3), pt(-1, top + 8), pt(7, top + 3.4), 8), 0.6, d.ink, 0.45);
  pen.hair(bezier(pt(-22, top + 6), pt(-17, top + 10), pt(-10, top + 11.5), 6), 0.5, d.ink, 0.35);
  edge(d, shape, 1.45);
  eye(d, 29, cy - 1);
  legs(d, bottom, false);
  // The great crusher, held low in front.
  claw(d, 15, bottom + 3, 1.22, false);
  ctx.restore();
}
