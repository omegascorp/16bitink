import { bezier, capsule, closed, cub, type Draw, edge, mottle, oval, pt, shade, skin, TAU, tint, tube } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { limb } from './limb';

/**
 * An Atlantic blue crab (Callinectes sapidus), side-on and facing right,
 * seen a little from above: a broad, flat carapace far wider than long,
 * its front edge cut into a row of teeth that ends at each side in a
 * long, sharp spine; olive-brown on the back, white beneath; bright blue
 * claws and legs, the claws long and ridged with pale fingertips, and the
 * last pair of legs flattened into oval paddles for swimming, held up
 * behind. The blue is a male's, with no red on the claws: red in the game
 * means it can catch you.
 */
const BACK = '#6b6942';
const DARK = '#3d3c25';
const RIM = '#8f8858';
const BELLY = '#ece7d6';
const BLUE = '#3f74b8';
const DEEP = '#26508a';
const PALE = '#a7c6e6';
const TIP = '#f1ece0';

/** Three walking legs a side, long and thin, splayed wide and low, stepping in alternate pairs. */
function legs(d: Draw, bottom: number, far: boolean): void {
  [-46, 34, 48].forEach((dx, i) => {
    const ph = -d.f * (TAU / 3) + (i % 2) * Math.PI + (far ? Math.PI / 2 : 0);
    const step = Math.cos(ph) * 4;
    const lift = Math.max(0, Math.sin(ph)) * 5;
    const hip = pt(dx * 0.3 + (far ? -3 : 0), bottom - 1 + (far ? -3 : 0));
    const foot = pt(dx + step + (far ? -4 : 0), d.g - lift * 0.4 - (far ? 2 : 0));
    const reach = foot.x - hip.x;
    const knee = pt(hip.x + reach * 0.5, bottom - 8 - lift);
    const ankle = pt(hip.x + reach * 0.86, d.g - 8 - lift * 0.6);
    const tip = pt(foot.x + Math.sign(reach) * 1.2, foot.y);
    limb(d, [hip, knee, ankle, tip], { widths: [4, 3.3, 2.2, 0.4], wash: BLUE, hairs: far ? 0 : 2, far });
  });
}

/** The last leg, held up behind and sculling: its end flattened into a broad oval paddle. */
function paddle(d: Draw, bottom: number, far: boolean): void {
  const { pen } = d;
  const scull = Math.sin(d.f * (TAU / 3) + (far ? 1.2 : 0)) * 3;
  const hip = pt(-16 + (far ? -3 : 0), bottom - 1 + (far ? -3 : 0));
  const knee = pt(-33 + (far ? -3 : 0), bottom - 4 + scull * 0.4 + (far ? -2 : 0));
  const wrist = pt(-45 + (far ? -3 : 0), bottom - 3 + scull + (far ? -2 : 0));
  limb(d, [hip, knee, wrist], { widths: [4.6, 3.8, 3], wash: BLUE, far });
  // The paddle: a flat oval blade, leaning back from the wrist.
  const ang = Math.atan2(wrist.y - knee.y, wrist.x - knee.x) + 0.35;
  const c = pt(wrist.x + Math.cos(ang) * 6.5, wrist.y + Math.sin(ang) * 6.5);
  const blade = Array.from({ length: 18 }, (_, i) => {
    const a = (i / 18) * TAU;
    const lx = Math.cos(a) * 7.5;
    const ly = Math.sin(a) * 3.6;
    return pt(c.x + lx * Math.cos(ang) - ly * Math.sin(ang), c.y + lx * Math.sin(ang) + ly * Math.cos(ang));
  });
  pen.fill(blade, PAPER_FILL, 1);
  pen.fill(blade, BLUE, far ? 0.8 : 0.6);
  if (far) pen.fill(blade, d.ink, 0.14);
  else {
    // A paler middle, fine ribs, and a fringe of hairs round the blade.
    pen.clipped(blade, () => tint(d, oval(c.x, c.y, 4, 1.6, 10), PALE, 0.6));
    pen.hair([wrist, pt(c.x + Math.cos(ang) * 6, c.y + Math.sin(ang) * 6)], 0.5, DEEP, 0.6);
    blade.forEach((p, i) => i % 2 === 0 && pen.hair([p, pt(p.x + (p.x - c.x) * 0.18, p.y + (p.y - c.y) * 0.3)], 0.4, d.ink, 0.5));
  }
  pen.stroke(closed(blade), far ? 0.7 : 1, d.ink, far ? 0.55 : 1, false);
}

/**
 * A long claw held forward: a spiny arm, a ridged palm, long fingers. Bright
 * blue, paler beneath, the fingers fading to pale tips.
 */
function claw(d: Draw, x: number, y: number, s: number, far: boolean): void {
  const { pen } = d;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, y + dy * s);
  const arm = capsule(P(0, 0), P(11, -4), 5 * s, 4.4 * s);
  const wrist = oval(x + 13 * s, y - 4.6 * s, 3.8 * s, 3.4 * s, 12);
  const palm = [
    ...cub(P(14.5, -1.6), P(14, -8), P(18, -9.6), P(24, -8.8), 8),
    ...cub(P(24, -8.8), P(28, -8), P(29, -3), P(26.5, -0.6), 6).slice(1),
    ...cub(P(26.5, -0.6), P(23, 1.6), P(17, 1.6), P(14.5, -1.6), 6).slice(1),
  ];
  const fixedSpine = bezier(P(26, -1.6), P(32, -1.4), P(36.5, -4.6), 8);
  const movingSpine = bezier(P(25.6, -7.4), P(33, -8.8), P(37, -5.2), 8);
  const fixed = tube(fixedSpine, 3.8 * s, 0.8 * s);
  const moving = tube(movingSpine, 3.4 * s, 0.8 * s);
  for (const part of [arm, wrist, palm, fixed, moving]) {
    pen.fill(part, PAPER_FILL, 1);
    pen.fill(part, BLUE, far ? 0.82 : 0.72);
    if (far) pen.fill(part, d.ink, 0.14);
  }
  for (const f of [fixed, moving]) pen.clipped(f, () => pen.fill(oval(x + 37 * s, y - 5 * s, 6 * s, 6 * s, 12), TIP, 0.9));
  if (!far) {
    pen.clipped(palm, () => {
      tint(d, oval(x + 21 * s, y + 0.6 * s, 7 * s, 2.4 * s, 10), PALE, 0.7);
      tint(d, oval(x + 21 * s, y - 8.6 * s, 6 * s, 1.6 * s, 10), DEEP, 0.5);
    });
    // The ridges along the palm, and the spines on the arm.
    for (const v of [-6, -3.6]) pen.hair(bezier(P(16, v), P(21, v - 0.6), P(26.5, v + 0.4), 5), 0.5, DEEP, 0.7);
    for (const u of [0.35, 0.65, 0.9]) {
      const b = P(11 * u, -4 * u - 2.4);
      pen.stroke([pt(b.x - 0.8 * s, b.y + 0.4), pt(b.x + 0.6 * s, b.y - 2 * s), pt(b.x + 1 * s, b.y + 0.4)], 0.6, d.ink, 0.85, false);
    }
    shade(d, palm, 0.35);
    for (let k = 2; k < 7; k++) pen.dot(fixedSpine[k]!.x, fixedSpine[k]!.y - 1.3 * s, 0.45 * s, d.ink, 0.65);
  }
  for (const part of [arm, wrist, fixed, moving, palm]) pen.stroke(closed(part), far ? 0.7 : 1, d.ink, far ? 0.55 : 1, false);
}

/** A short stalked eye in its notch at the front of the shell. */
function eye(d: Draw, x: number, y: number): void {
  const { pen } = d;
  const stalk = capsule(pt(x - 1.2, y + 2.8), pt(x, y - 0.3), 2.4, 2.2);
  pen.fill(stalk, PAPER_FILL, 1);
  pen.fill(stalk, RIM, 0.8);
  pen.stroke(closed(stalk), 0.8, d.ink, 0.95, false);
  pen.fill(oval(x + 0.3, y - 1.1, 2.1, 1.9, 10), d.ink, 0.92);
  pen.dot(x + 0.9, y - 1.8, 0.55, PAPER_FILL, 0.95);
}

/**
 * The front edge of the shell from the right spine round to the left one,
 * seen from a little above: from the spine tip a row of sharp teeth runs in
 * towards the eye, then the smooth back half, and the left spine.
 */
function outline(top: number, cy: number): Pt[] {
  const front = cub(pt(34, cy), pt(26, cy + 8), pt(-26, cy + 8), pt(-34, cy), 32).map((p, i, arc) => {
    if (i === 0 || i % 2 === 1 || p.x < 10) return p;
    const a = arc[i - 1]!;
    const b = arc[Math.min(arc.length - 1, i + 1)]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const t = 1.8;
    return pt(p.x + ((b.y - a.y) / len) * t + 0.8, p.y - ((b.x - a.x) / len) * t);
  });
  const spine = (sgn: 1 | -1): Pt[] => [pt(sgn * 34, cy - 3.4), pt(sgn * 53, cy - 5.6), pt(sgn * 34, cy + 1.6)];
  const back = cub(pt(-34, cy - 3.4), pt(-31, top - 1), pt(28, top - 2), pt(34, cy - 3.4), 20);
  const right = spine(1);
  const left = spine(-1);
  return [...back, right[1]!, ...front.slice(1, -1), left[2]!, left[1]!];
}

export function blueCrab(d: Draw): void {
  const { pen } = d;
  pen.fill(oval(0, d.g - 1, 50, 3, 24), d.ink, 0.1);
  const top = d.g - 39;
  const cy = d.g - 29;
  const bottom = d.g - 17;
  paddle(d, bottom, true);
  legs(d, bottom, true);
  claw(d, 17, bottom - 2, 0.85, true);
  // The white body under the shell, hatched where it turns under.
  const under = [
    ...cub(pt(-25, cy + 3), pt(-28, bottom - 3), pt(-22, bottom + 1), pt(-14, bottom + 1), 8),
    ...cub(pt(-14, bottom + 1), pt(-4, bottom + 2), pt(10, bottom + 2), pt(20, bottom), 8).slice(1),
    ...cub(pt(20, bottom), pt(27, bottom - 2), pt(29, cy + 6), pt(26, cy + 3), 6).slice(1),
  ];
  skin(d, under, BELLY, 0.6);
  pen.clipped(under, () => pen.hatch(under, 1.8, 0.35, 0.45, { color: d.ink, alpha: 0.3 }));
  edge(d, under, 1.1);
  const shape = outline(top, cy);
  skin(d, shape, BACK, 0.85);
  pen.clipped(shape, () => {
    // Paler olive at the rim and along the spines, darker over the middle; faint granules.
    pen.stroke(cub(pt(36, cy + 1), pt(26, cy + 7), pt(-26, cy + 7), pt(-36, cy + 1), 20), 3.6, RIM, 0.65, false);
    tint(d, oval(-2, top + 4, 22, 4, 18), DARK, 0.3);
    for (const sgn of [1, -1]) pen.stroke([pt(sgn * 30, cy - 1), pt(sgn * 50, cy - 4.6)], 1.6, RIM, 0.6, false);
  });
  mottle(d, shape, 110, top, cy + 5, DARK, 0.4);
  shade(d, shape, 0.42);
  // The grooves of the back: an H in the middle and the ridges out towards the spines.
  pen.hair(bezier(pt(-8, top + 2), pt(-1, top + 7), pt(7, top + 2.4), 8), 0.6, d.ink, 0.5);
  pen.hair(bezier(pt(-24, top + 5), pt(-16, top + 7.6), pt(-10, top + 9), 6), 0.5, d.ink, 0.4);
  pen.hair(bezier(pt(22, top + 5), pt(15, top + 7.6), pt(10, top + 9), 6), 0.5, d.ink, 0.4);
  edge(d, shape, 1.35);
  eye(d, 24, cy + 1);
  paddle(d, bottom, false);
  legs(d, bottom, false);
  claw(d, 17, bottom + 2, 1, false);
}
