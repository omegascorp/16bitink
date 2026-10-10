import { bezier, capsule, closed, cub, type Draw, edge, glint, mottle, oval, pt, shade, skin, TAU, tint, tube } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { limb } from './limb';

/**
 * A giant mud crab (Scylla serrata) on the harbour mud, side-on and facing
 * right, seen a little from above: a broad, smooth, rather flat carapace,
 * dark olive-green going brown, its front edge cut into a saw of nine
 * coarse teeth on each side; stout legs netted with a pale mesh, the last
 * pair flattened into paddles; and huge, smooth, swollen claws, spined at
 * the wrist, the heavy fingers dark to the tips. Green-brown, never red:
 * red in the game means it can catch you.
 */
const BACK = '#4d5634';
const DARK = '#2b3020';
const RIM = '#7b7a4a';
const BELLY = '#e3dcbf';
const LEG = '#66683f';
const MESH = '#c9c79a';
const UNDER = '#a99f6c';
const FINGER = '#221d18';

/** Frame units the crab is set back, so the shell and the great claw sit about the frame centre. */
const SHIFT = -9;
/** How far the claws are raised from level, radians: held up and open, ready. */
const CLAW_TILT = -0.32;
/** Teeth on the front edge, per side. */
const TEETH = 9;

/** A pale net over a limb or claw: the mud crab's polygonal mottling. */
function mesh(d: Draw, shape: readonly Pt[], cx: number, cy: number, rx: number, ry: number, n: number): void {
  const { pen } = d;
  pen.clipped(shape, () => {
    for (let i = 0; i < n; i++) {
      const x = cx + (pen.rng() - 0.5) * 2 * rx;
      const y = cy + (pen.rng() - 0.5) * 2 * ry;
      const r = 0.7 + pen.rng() * 0.7;
      pen.hair(closed(oval(x, y, r * 1.2, r, 5)), 0.4, MESH, 0.45);
    }
  });
}

/** Three stout walking legs a side, splayed wide and low, stepping in alternate pairs. */
function legs(d: Draw, bottom: number, far: boolean): void {
  [-44, 32, 44].forEach((dx, i) => {
    const ph = -d.f * (TAU / 3) + (i % 2) * Math.PI + (far ? Math.PI / 2 : 0);
    const step = Math.cos(ph) * 3;
    const lift = Math.max(0, Math.sin(ph)) * 4;
    const hip = pt(dx * 0.3 + (far ? -3 : 0), bottom - 1 + (far ? -3 : 0));
    const foot = pt(dx + step + (far ? -4 : 0), d.g - lift * 0.4 - (far ? 2 : 0));
    const reach = foot.x - hip.x;
    const knee = pt(hip.x + reach * 0.5, bottom - 7 - lift);
    const ankle = pt(hip.x + reach * 0.86, d.g - 8 - lift * 0.6);
    const tip = pt(foot.x + Math.sign(reach) * 1, foot.y);
    limb(d, [hip, knee, ankle, tip], { widths: [6.4, 5.4, 3.6, 0.5], wash: LEG, hairs: far ? 0 : 3, far });
    if (!far) for (const [a, b] of [[hip, knee], [knee, ankle]] as const) mesh(d, capsule(a, b, 5, 4), (a.x + b.x) / 2, (a.y + b.y) / 2, Math.abs(b.x - a.x) / 2 + 1, Math.abs(b.y - a.y) / 2 + 1, 4);
  });
}

/** The last leg, held up behind: its end flattened into a broad, fringed paddle. */
function paddle(d: Draw, bottom: number, far: boolean): void {
  const { pen } = d;
  const scull = Math.sin(d.f * (TAU / 3) + (far ? 1.2 : 0)) * 2.5;
  const o = far ? -3 : 0;
  const hip = pt(-16 + o, bottom - 1 + o);
  const knee = pt(-29 + o, bottom - 7 + scull * 0.4 + o);
  const wrist = pt(-39 + o, bottom - 8 + scull + o);
  limb(d, [hip, knee, wrist], { widths: [5.6, 4.6, 3.6], wash: LEG, far });
  const ang = Math.atan2(wrist.y - knee.y, wrist.x - knee.x) + 0.3;
  const c = pt(wrist.x + Math.cos(ang) * 6, wrist.y + Math.sin(ang) * 6);
  const blade = Array.from({ length: 18 }, (_, i) => {
    const a = (i / 18) * TAU;
    const lx = Math.cos(a) * 7;
    const ly = Math.sin(a) * 4;
    return pt(c.x + lx * Math.cos(ang) - ly * Math.sin(ang), c.y + lx * Math.sin(ang) + ly * Math.cos(ang));
  });
  pen.fill(blade, PAPER_FILL, 1);
  pen.fill(blade, LEG, far ? 0.85 : 0.7);
  if (far) pen.fill(blade, d.ink, 0.14);
  else {
    pen.hair([wrist, pt(c.x + Math.cos(ang) * 5.5, c.y + Math.sin(ang) * 5.5)], 0.5, DARK, 0.6);
    blade.forEach((p, i) => i % 2 === 0 && pen.hair([p, pt(p.x + (p.x - c.x) * 0.18, p.y + (p.y - c.y) * 0.3)], 0.4, d.ink, 0.5));
  }
  pen.stroke(closed(blade), far ? 0.7 : 1, d.ink, far ? 0.55 : 1, false);
}

/**
 * A huge claw held forward: a thick arm, a wrist with two sharp spines, a
 * smooth, swollen palm, olive over the top and paler beneath, netted pale,
 * and heavy fingers with big blunt teeth, dark from the middle to the tips.
 */
function claw(d: Draw, x: number, y: number, s: number, far: boolean): void {
  const { pen } = d;
  const [c, sn] = [Math.cos(CLAW_TILT), Math.sin(CLAW_TILT)];
  const P = (dx: number, dy: number): Pt => pt(x + (dx * c - dy * sn) * s, y + (dx * sn + dy * c) * s);
  const map = (pts: readonly Pt[]): Pt[] => pts.map((q) => P(q.x, q.y));
  const arm = capsule(P(0, 0), P(8, -3.4), 7 * s, 6.4 * s);
  const wc = P(11, -4.6);
  const wrist = oval(wc.x, wc.y, 5.2 * s, 4.8 * s, 14);
  // A long, swollen palm, deepest at the knuckle.
  const palm = map([
    ...cub(pt(13, 2), pt(11, -9), pt(18, -12.5), pt(27, -12), 10),
    ...cub(pt(27, -12), pt(33, -11.6), pt(36, -5), pt(33.5, 1.4), 8).slice(1),
    ...cub(pt(33.5, 1.4), pt(28, 6.6), pt(17, 6.4), pt(13, 2), 8).slice(1),
  ]);
  const fixedSpine = map(bezier(pt(32.5, -0.2), pt(40, 1.2), pt(45, -3.6), 7));
  const movingSpine = map(bezier(pt(32.5, -9.8), pt(41, -13), pt(45.6, -5), 7));
  const fixed = tube(fixedSpine, 6.2 * s, 1.4 * s);
  const moving = tube(movingSpine, 5.6 * s, 1.4 * s);
  for (const part of [arm, wrist, palm, fixed, moving]) {
    pen.fill(part, PAPER_FILL, 1);
    pen.fill(part, LEG, far ? 0.85 : 0.75);
    if (far) pen.fill(part, d.ink, 0.14);
  }
  // Dark from the middle of the fingers to their tips.
  const tips = P(46, -5);
  for (const f of [fixed, moving]) pen.clipped(f, () => pen.fill(oval(tips.x, tips.y, 8 * s, 10 * s, 14), FINGER, far ? 0.6 : 0.85));
  if (!far) {
    pen.clipped(palm, () => {
      tint(d, map(oval(23, 4, 10, 3, 12)), UNDER, 0.75);
      tint(d, map(oval(22, -11, 10, 3, 12)), BACK, 0.6);
    });
    const mid = P(23, -3);
    mesh(d, palm, mid.x, mid.y, 10 * s, 7 * s, 11);
    shade(d, palm, 0.4);
    glint(d, [P(18, -9.6), P(26, -10.6)], 1.1, 0.75);
    // The two spines on the wrist, and the blunt crushing teeth.
    for (const [sx, sy] of [[8.6, -9], [13, -8.6]] as const) {
      const b = P(sx, sy);
      pen.fill([pt(b.x - 1.2 * s, b.y + 0.8 * s), pt(b.x + 1.6 * s, b.y - 2.6 * s), pt(b.x + 1.4 * s, b.y + 0.9 * s)], d.ink, 0.85);
    }
    for (let k = 1; k < 6; k++) pen.dot(fixedSpine[k]!.x, fixedSpine[k]!.y - 2.4 * s, 0.7 * s, PAPER_FILL, 0.55);
    glint(d, movingSpine.slice(1, 4).map((p) => pt(p.x, p.y - 1.3 * s)), 0.8, 0.5);
  }
  for (const part of [arm, wrist, fixed, moving, palm]) pen.stroke(closed(part), far ? 0.7 : 1.15, d.ink, far ? 0.55 : 1, false);
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

/**
 * The shell's rim from the front round to the back, seen a little from
 * above: from the eye a saw of nine big, even, forward-pointing teeth runs
 * back to the widest point; behind it the rim is smooth.
 */
function outline(top: number, cy: number): Pt[] {
  const arc = cub(pt(37, cy - 1), pt(28, cy + 10), pt(-28, cy + 10), pt(-37, cy - 1), 40);
  const teeth = arc.flatMap((p, i) => {
    const k = i - 1;
    if (k < 0 || k >= TEETH * 3 || k % 3 !== 0) return [p];
    const b = arc[i + 2]!;
    const len = Math.hypot(b.x - p.x, b.y - p.y) || 1;
    // The tooth's point: well out from the rim and raked forward, smaller towards the back.
    const h = 3.4 - (k / (TEETH * 3)) * 1.2;
    const tip = pt(p.x + ((b.y - p.y) / len) * h + 1.6, p.y - ((b.x - p.x) / len) * h * 0.85);
    return [p, tip];
  });
  const back = cub(pt(-37, cy - 1), pt(-35, top - 2), pt(30, top - 3), pt(37, cy - 1), 20);
  return [...back, ...teeth.slice(1, -1)];
}

export function mudCrab(d: Draw): void {
  const { pen } = d;
  const { ctx } = pen;
  ctx.save();
  ctx.translate(SHIFT, 0);
  pen.fill(oval(2, d.g - 1, 52, 3, 24), d.ink, 0.1);
  const top = d.g - 41;
  const cy = d.g - 31;
  const bottom = d.g - 18;
  paddle(d, bottom, true);
  legs(d, bottom, true);
  claw(d, 14, bottom - 10, 1.0, true);
  // The cream body under the shell, turned under and hatched.
  const under = [
    ...cub(pt(-28, cy + 3), pt(-31, bottom - 3), pt(-25, bottom + 1), pt(-17, bottom + 1), 8),
    ...cub(pt(-17, bottom + 1), pt(-4, bottom + 2), pt(12, bottom + 2), pt(23, bottom), 8).slice(1),
    ...cub(pt(23, bottom), pt(30, bottom - 2), pt(32, cy + 6), pt(29, cy + 3), 6).slice(1),
  ];
  skin(d, under, BELLY, 0.65);
  pen.clipped(under, () => pen.hatch(under, 1.8, 0.35, 0.45, { color: d.ink, alpha: 0.35 }));
  edge(d, under, 1.1);
  const shape = outline(top, cy);
  skin(d, shape, BACK, 0.88);
  pen.clipped(shape, () => {
    // Olive going brown at the rim, darkest over the middle of the back.
    pen.stroke(cub(pt(39, cy + 1), pt(28, cy + 9), pt(-28, cy + 9), pt(-39, cy + 1), 20), 4, RIM, 0.55, false);
    tint(d, oval(-4, top + 4, 24, 5, 18), DARK, 0.4);
  });
  mottle(d, shape, 80, top, cy + 6, DARK, 0.45);
  shade(d, shape, 0.45, true);
  // Smooth and a little glossy; the H-groove and the ridges of the back.
  glint(d, cub(pt(-24, top + 3.6), pt(-16, top + 0.4), pt(-4, top - 0.6), pt(4, top + 0.4), 8), 1.1, 0.55);
  pen.hair(bezier(pt(-8, top + 2.6), pt(-1, top + 8), pt(7, top + 3), 8), 0.6, d.ink, 0.5);
  pen.hair(bezier(pt(-24, top + 5), pt(-17, top + 9), pt(-10, top + 10.5), 6), 0.5, d.ink, 0.4);
  pen.hair(bezier(pt(22, top + 5), pt(16, top + 9), pt(10, top + 10.5), 6), 0.5, d.ink, 0.4);
  edge(d, shape, 1.45);
  eye(d, 31, cy - 2);
  paddle(d, bottom, false);
  legs(d, bottom, false);
  // The great claw, held forward and a little raised.
  claw(d, 13, bottom + 3, 1.3, false);
  ctx.restore();
}
