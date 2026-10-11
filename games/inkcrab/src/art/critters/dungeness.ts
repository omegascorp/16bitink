import { bezier, capsule, closed, cub, type Draw, edge, mottle, oval, pt, shade, skin, TAU, tint, tube } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { limb } from './limb';

/**
 * A Dungeness crab (Metacarcinus magister) on the cold sand, side-on and
 * facing right, seen a little from above so the breadth of its back
 * shows: a broad, low oval carapace, much wider than long, its front
 * edge cut into a row of fine teeth running back to the widest point.
 * Purplish-brown on the back, tan at the rim, a cream belly, paler legs,
 * and heavy claws with dark fingers tipped white. Never red, which in the
 * game means it can catch you.
 */
const BACK = '#6e5664';
const RIM = '#b59c7c';
const DARK = '#3f3038';
const BELLY = '#e8dec6';
const LEG = '#d3bf98';
const BAND = '#a68b6a';
const FINGER = '#4a3a3c';

/** Four flat legs a side, splayed wide and low, stepping in alternate pairs; the last pair paddle-flat. */
function legs(d: Draw, bottom: number, far: boolean): void {
  [-56, -44, 30, 44].forEach((dx, i) => {
    const ph = -d.f * (TAU / 3) + (i % 2) * Math.PI + (far ? Math.PI / 2 : 0);
    const step = Math.cos(ph) * 3.5;
    const lift = Math.max(0, Math.sin(ph)) * 4.5;
    const hip = pt(dx * 0.3 + (far ? -3 : 0), bottom - 1 + (far ? -3 : 0));
    const foot = pt(dx + step + (far ? -4 : 0), d.g - lift * 0.4 - (far ? 2 : 0));
    const reach = foot.x - hip.x;
    const knee = pt(hip.x + reach * 0.5, bottom - 5 - lift);
    const ankle = pt(hip.x + reach * 0.85, d.g - 8 - lift * 0.6);
    const tip = pt(foot.x + Math.sign(reach) * 1, foot.y);
    limb(d, [hip, knee, ankle, tip], { widths: [6, 5, 3.4, 0.5], wash: LEG, band: BAND, hairs: far ? 0 : 3, far });
  });
}

/**
 * A heavy claw held forward under the front edge: a stout arm, a deep
 * palm with a row of small spines along its top, and short, thick, dark
 * fingers ending in white tips.
 */
function claw(d: Draw, x: number, y: number, s: number, far: boolean): void {
  const { pen } = d;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, y + dy * s);
  const arm = capsule(P(0, 0), P(7, -3), 6 * s, 5.4 * s);
  const wrist = oval(x + 9 * s, y - 3.6 * s, 4.2 * s, 3.8 * s, 12);
  const palm = [
    ...cub(P(10, 1.5), P(9, -8), P(14, -10.5), P(19.5, -9.5), 10),
    ...cub(P(19.5, -9.5), P(23.5, -8.5), P(24.5, -2), P(21.5, 2.5), 8).slice(1),
    ...cub(P(21.5, 2.5), P(17, 4.6), P(12, 4.4), P(10, 1.5), 6).slice(1),
  ];
  const fixedSpine = bezier(P(21, 0.5), P(26, 1), P(29, -2.6), 6);
  const movingSpine = bezier(P(20.5, -7), P(26.5, -8.4), P(29.4, -3.4), 6);
  const fixed = tube(fixedSpine, 4.6 * s, 1.1 * s);
  const moving = tube(movingSpine, 4 * s, 1.1 * s);
  for (const part of [arm, wrist, palm]) {
    pen.fill(part, PAPER_FILL, 1);
    pen.fill(part, RIM, far ? 0.85 : 0.75);
    if (far) pen.fill(part, d.ink, 0.14);
  }
  for (const f of [fixed, moving]) {
    pen.fill(f, PAPER_FILL, 1);
    pen.fill(f, FINGER, far ? 0.8 : 0.75);
    // The white tips.
    pen.clipped(f, () => pen.fill(oval(x + 29 * s, y - 3 * s, 3.4 * s, 4 * s, 10), PAPER_FILL, 0.95));
    if (far) pen.fill(f, d.ink, 0.12);
  }
  if (!far) {
    pen.clipped(palm, () => {
      // Purplish over the top of the hand, cream beneath.
      tint(d, oval(x + 15 * s, y - 9 * s, 8 * s, 3.5 * s, 12), BACK, 0.55);
      tint(d, oval(x + 16 * s, y + 3.5 * s, 7 * s, 2.5 * s, 12), BELLY, 0.7);
    });
    shade(d, palm, 0.4);
    // Spines along the upper edge of the palm.
    for (let k = 0; k < 4; k++) {
      const b = P(12 + k * 2.6, -9.4 - Math.sin((k / 3) * Math.PI) * 0.8);
      pen.stroke([pt(b.x - 0.6 * s, b.y + 0.3), pt(b.x + 0.5 * s, b.y - 1.6 * s), pt(b.x + 0.9 * s, b.y + 0.3)], 0.55, d.ink, 0.85, false);
    }
    // Teeth along the cutting edges.
    for (let k = 1; k < 5; k++) pen.dot(fixedSpine[k]!.x, fixedSpine[k]!.y - 1.6 * s, 0.45 * s, d.ink, 0.7);
  }
  for (const part of [arm, wrist, fixed, moving, palm]) pen.stroke(closed(part), far ? 0.7 : 1, d.ink, far ? 0.55 : 1, false);
}

/** A short stalked eye in its notch at the front of the shell. */
function eye(d: Draw, x: number, y: number, far: boolean): void {
  const { pen } = d;
  const stalk = capsule(pt(x - 1.4, y + 3), pt(x, y - 0.3), 2.6, 2.4);
  pen.fill(stalk, PAPER_FILL, 1);
  pen.fill(stalk, RIM, 0.8);
  pen.stroke(closed(stalk), far ? 0.6 : 0.8, d.ink, far ? 0.55 : 0.95, false);
  pen.fill(oval(x + 0.3, y - 1.2, 2.2, 2, 10), d.ink, far ? 0.6 : 0.92);
  if (!far) pen.dot(x + 0.9, y - 1.9, 0.6, PAPER_FILL, 0.95);
}

/**
 * The rim of the shell, seen from a little above, from the front round the
 * widest point to the back: smooth behind, its front half cut into sharp
 * teeth standing out from the edge.
 */
function rim(cy: number): Pt[] {
  const arc = cub(pt(34, cy), pt(26, cy + 9.5), pt(-26, cy + 9.5), pt(-34, cy), 30);
  return arc.map((p, i) => {
    if (i === 0 || i % 2 === 1 || p.x < -2) return p;
    const a = arc[i - 1]!;
    const b = arc[Math.min(arc.length - 1, i + 1)]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const t = 1.6 + p.x * 0.04;
    return pt(p.x + ((b.y - a.y) / len) * t, p.y - ((b.x - a.x) / len) * t);
  });
}

export function dungeness(d: Draw): void {
  const { pen } = d;
  pen.fill(oval(0, d.g - 1, 50, 3, 24), d.ink, 0.1);
  const top = d.g - 40;
  const cy = d.g - 31;
  const bottom = d.g - 17;
  legs(d, bottom, true);
  claw(d, 17, bottom - 1, 0.8, true);
  // The body under the shell: cream, turned under and hatched.
  const under = [
    ...cub(pt(-27, cy + 3), pt(-30, bottom - 3), pt(-24, bottom + 1), pt(-16, bottom + 1), 8),
    ...cub(pt(-16, bottom + 1), pt(-4, bottom + 2), pt(12, bottom + 2), pt(22, bottom), 8).slice(1),
    ...cub(pt(22, bottom), pt(29, bottom - 2), pt(31, cy + 6), pt(28, cy + 3), 6).slice(1),
  ];
  skin(d, under, BELLY, 0.7);
  pen.clipped(under, () => {
    tint(d, oval(0, cy + 5, 30, 3, 16), RIM, 0.5);
    pen.hatch(under, 1.8, 0.35, 0.45, { color: d.ink, alpha: 0.35 });
  });
  edge(d, under, 1.1);
  // The shell: a broad oval seen a little from above, domed over the back, the toothed rim below.
  const edgeLine = rim(cy);
  const shape = [...cub(pt(-34, cy), pt(-33, top - 1), pt(26, top - 2.5), pt(34, cy), 18), ...edgeLine.slice(1, -1)];
  skin(d, shape, BACK, 0.82);
  pen.clipped(shape, () => {
    // Tan towards the rim, darker over the middle of the back.
    pen.stroke(cub(pt(36, cy + 1), pt(26, cy + 8), pt(-26, cy + 8), pt(-36, cy + 1), 20), 4.5, RIM, 0.75, false);
    tint(d, oval(-4, top + 4, 22, 4.5, 18), DARK, 0.3);
  });
  mottle(d, shape, 140, top, cy + 6, DARK, 0.45);
  shade(d, shape, 0.42);
  // The H-groove and the regions of the back, faint.
  pen.hair(bezier(pt(-8, top + 2), pt(-1, top + 7), pt(7, top + 2.4), 8), 0.6, d.ink, 0.5);
  pen.hair(bezier(pt(-22, top + 4), pt(-17, top + 8), pt(-10, top + 9.5), 6), 0.5, d.ink, 0.4);
  pen.hair(bezier(pt(20, top + 4), pt(16, top + 8), pt(10, top + 9.5), 6), 0.5, d.ink, 0.4);
  edge(d, shape, 1.4);
  eye(d, 30, cy - 1, false);
  legs(d, bottom, false);
  claw(d, 21, bottom + 1, 0.88, false);
}
