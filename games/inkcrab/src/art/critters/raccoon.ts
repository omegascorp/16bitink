import { bezier, closed, cub, type Draw, edge, oval, pt, ribbon, shade, skin, TAU, tint } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { limb } from './limb';

/**
 * A raccoon foraging the strandline, side-on and facing right: hunched
 * over its forelegs with the rump high and the nose down to the sand,
 * following a smell. Grizzled grey-brown fur in hatching, the black mask
 * across the eyes between a pale brow and a pale muzzle, round pale-rimmed
 * ears, dark nimble hands and feet, and a bushy tail ringed dark.
 */
const FUR = '#8d867b';
const BUFF = '#b3a48a';
const DARK = '#2b282b';
const PALE = '#eee8da';
const LEG = '#6f685f';
const PAW = '#3a3536';
const TAIL = '#a49a88';

/** Where the head sits, and how far it is tipped nose-down. */
const HEAD = { x: 24, up: 29, tilt: 0.92, s: 1.1 } as const;

/**
 * One leg stepping by phase `ph`: hind legs fold forward at the knee and
 * back at the hock onto a flat sole; forelegs come straight down to a
 * hand with long, spread fingers.
 */
function leg(d: Draw, hipX: number, hind: boolean, ph: number, far: boolean): void {
  const { pen } = d;
  const g = d.g;
  const step = Math.cos(ph) * 6;
  const lift = Math.max(0, Math.sin(ph)) * 4;
  const sink = far ? 1.5 : 0;
  const foot = pt(hipX + step + (hind ? 2 : 3), g - lift - sink);
  const hip = pt(hipX + (far ? 2 : 0), g - (hind ? 25 : 23) - sink);
  const joints = hind
    ? [hip, pt(hipX + 3 + step * 0.4, g - 15 - lift - sink), pt(hipX - 3 + step * 0.7, g - 6 - lift * 0.8 - sink), foot]
    : [hip, pt(hipX - 1 + step * 0.3, g - 14 - lift - sink), pt(hipX + 1 + step * 0.8, g - 4.5 - lift * 0.8 - sink), foot];
  const widths = hind ? [10, 6.4, 4.4, 3.4] : [8.4, 5.6, 4, 3];
  limb(d, joints, { widths, wash: LEG, far, line: 0.9 });
  // Dark from the wrist (or hock) down.
  const [, , wrist] = joints;
  limb(d, [wrist!, foot], { widths: [widths[2]!, widths[3]!], wash: PAW, far, line: 0.85 });
  // Long fingers (toes) spread on the sand, each ending in a small claw.
  const lifted = lift > 1.5;
  for (const k of [-1, 0, 1]) {
    const tip = pt(foot.x + (lifted ? 2.6 : 4) + k * 0.4, foot.y + (lifted ? 2 : 0) + k * (lifted ? 0.4 : 0.3) - (k === -1 ? 0.6 : 0));
    pen.stroke(bezier(foot, pt((foot.x + tip.x) / 2, Math.min(foot.y, tip.y) - 0.8), tip, 4), far ? 0.8 : 1.1, PAW, far ? 0.6 : 0.95, false);
  }
}

/** The bushy tail, ringed: drooping from the rump in a long curve, a dark tip. */
function tail(d: Draw): void {
  const { pen } = d;
  const g = d.g;
  const spine = cub(pt(-28, g - 43), pt(-40, g - 47), pt(-52, g - 41), pt(-57, g - 27), 24);
  const body = ribbon(spine, (u) => 8 + Math.sin(Math.min(1, u * 1.15) * Math.PI * 0.75) * 5 - u * 2);
  const end = spine[spine.length - 1]!;
  const shape = [...body.top, ...oval(end.x, end.y, 4.6, 4.6, 12).filter((p) => p.y > end.y - 1), ...[...body.bot].reverse()];
  skin(d, shape, TAIL, 0.8);
  pen.clipped(shape, () => {
    // Dark rings, the last one the whole tip.
    for (const k of [4, 8, 12, 16, 20]) {
      const a = body.top[k]!;
      const b = body.bot[k]!;
      pen.stroke([pt(a.x - 1, a.y - 1), pt(b.x + 1, b.y + 1)], 4.2, DARK, 0.8, false);
    }
    pen.fill(oval(end.x, end.y + 1, 6, 6, 12), DARK, 0.85);
    // Long guard hairs along it.
    for (let i = 0; i < 26; i++) {
      const k = 1 + Math.floor(pen.rng() * (spine.length - 3));
      const p = spine[k]!;
      const q = spine[k + 2]!;
      const off = pen.jitter(4);
      pen.hair([pt(p.x + off * 0.3, p.y - off), pt(q.x + off * 0.3, q.y - off)], 0.4, DARK, 0.4);
    }
  });
  shade(d, shape, 0.35);
  // Fluffy edge: short hairs standing out of the contour.
  for (let k = 2; k < spine.length - 1; k += 2) {
    for (const side of [body.top, body.bot]) {
      const p = side[k]!;
      const m = spine[k]!;
      const ux = (p.x - m.x) / (Math.hypot(p.x - m.x, p.y - m.y) || 1);
      const uy = (p.y - m.y) / (Math.hypot(p.x - m.x, p.y - m.y) || 1);
      pen.hair([p, pt(p.x + ux * 1.6 - uy * 0.8, p.y + uy * 1.6 + ux * 0.8)], 0.5, d.ink, 0.7);
    }
  }
  edge(d, shape, 0.9, 0.85);
}

/** Grizzled fur: short strokes raked back and down over a shape, dark and pale. */
function grizzle(d: Draw, shape: readonly Pt[], n: number, x0: number, x1: number, y0: number, y1: number): void {
  const { pen } = d;
  pen.clipped(shape, () => {
    for (let i = 0; i < n; i++) {
      const x = x0 + pen.rng() * (x1 - x0);
      const y = y0 + pen.rng() * (y1 - y0);
      const len = 2 + pen.rng() * 2;
      const pale = i % 3 === 0;
      pen.hair([pt(x, y), pt(x - len, y + len * 0.45)], pale ? 0.5 : 0.45, pale ? PALE : DARK, pale ? 0.55 : 0.45);
    }
  });
}

/** The head, nose down: a broad skull tapering to a pointed muzzle, the black mask, pale brow and muzzle, round ears. */
function head(d: Draw): void {
  const { pen } = d;
  const n = pt(HEAD.x, d.g - HEAD.up);
  const [c, s] = [Math.cos(HEAD.tilt) * HEAD.s, Math.sin(HEAD.tilt) * HEAD.s];
  const P = (x: number, y: number): Pt => pt(n.x + x * c - y * s, n.y + x * s + y * c);
  const map = (pts: readonly Pt[]): Pt[] => pts.map((q) => P(q.x, q.y));
  // Ears first, standing up off the back of the crown (drawn upright, not tipped with the head).
  for (const [ex, ey, far] of [[-5.5, -5, true], [-2.5, -7.5, false]] as const) {
    const b = P(ex, ey);
    const ear = [...cub(pt(b.x - 3.6, b.y + 1.5), pt(b.x - 4.6, b.y - 6), pt(b.x + 1.6, b.y - 8.4), pt(b.x + 3.6, b.y + 0.5), 10), pt(b.x, b.y + 2.5)];
    skin(d, ear, far ? DARK : FUR, far ? 0.6 : 0.8);
    if (!far) {
      pen.clipped(ear, () => pen.fill(oval(b.x - 0.4, b.y - 1.6, 2, 3.6, 10), DARK, 0.65));
      pen.stroke(cub(pt(b.x - 3.4, b.y), pt(b.x - 4, b.y - 5.5), pt(b.x + 1.2, b.y - 7.6), pt(b.x + 3.2, b.y - 0.6), 10), 1.2, PALE, 0.9, false);
    }
    edge(d, ear, far ? 0.7 : 0.9, far ? 0.6 : 1);
  }
  const shape = map([
    ...cub(pt(-8, 3), pt(-8, -6), pt(2, -9.5), pt(8, -6), 10),
    ...cub(pt(8, -6), pt(12, -4), pt(16, -1.4), pt(18.6, 0.4), 6).slice(1),
    ...cub(pt(18.6, 0.4), pt(20, 1.2), pt(19.8, 3.2), pt(17.8, 3.2), 4).slice(1),
    ...cub(pt(17.8, 3.2), pt(12, 4.6), pt(6, 7.4), pt(0, 8.4), 8).slice(1),
    ...cub(pt(0, 8.4), pt(-5, 8.6), pt(-8, 6), pt(-8, 3), 6).slice(1),
  ]);
  skin(d, shape, FUR, 0.8);
  pen.clipped(shape, () => {
    // Pale cheeks and muzzle, a pale band over the brow.
    tint(d, map(oval(15.5, 1.8, 4.6, 2.8, 12)), PALE, 0.9);
    tint(d, map(oval(2, 6.6, 5, 2, 12)), PALE, 0.6);
    tint(d, map(oval(-2, -4, 7, 4, 12)), DARK, 0.25);
    pen.stroke(map(bezier(pt(-3, -5.6), pt(4, -6.4), pt(11.5, -3.6), 6)), 2.2, PALE, 0.85, false);
    // The mask: a black band from the eye back over the cheek, and the dark stripe down the nose.
    const mask = map([pt(-6, 1.6), pt(-1, -3.4), pt(5, -4.2), pt(11, -2.8), pt(13, -0.6), pt(10, 1.6), pt(4, 2), pt(-2, 4.4), pt(-6.4, 4.6)]);
    pen.fill(mask, DARK, 0.88);
    pen.stroke(map([pt(4, -6.8), pt(10, -4.2), pt(15.5, -1.6)]), 1.1, DARK, 0.7, false);
    grizzle(d, shape, 18, n.x - 8, n.x + 2, n.y - 8, n.y + 4);
  });
  shade(d, shape, 0.32);
  edge(d, shape, 1.1);
  // The nose tip, the mouth line, an eye shining out of the mask, whiskers.
  const nose = P(18.8, 1.6);
  pen.fill(oval(nose.x, nose.y, 1.6, 1.4, 10), DARK, 0.95);
  pen.hair(map(bezier(pt(17.6, 3), pt(13, 3.8), pt(9, 4.6), 5)), 0.55, d.ink, 0.75);
  const eye = P(6.6, -1.6);
  pen.dot(eye.x, eye.y, 1.3, d.ink, 1);
  pen.dot(eye.x + 0.5, eye.y - 0.5, 0.5, PAPER_FILL, 0.95);
  pen.hair(closed(oval(eye.x, eye.y, 1.8, 1.6, 10)), 0.35, PAPER_FILL, 0.5);
  for (const a of [-0.4, 0, 0.4]) {
    const w = P(14.5, 2.4);
    pen.hair([w, pt(w.x + Math.cos(a + 0.5) * 6, w.y + Math.sin(a + 0.5) * 6)], 0.35, d.ink, 0.6);
  }
}

export function raccoon(d: Draw): void {
  const { pen } = d;
  const g = d.g;
  pen.fill(oval(-2, g - 1, 38, 3, 24), d.ink, 0.1);
  // A slow forager's walk: diagonal pairs (near hind with far fore).
  const ph = -d.f * (TAU / 3);
  const bob = [0, -0.6, 0.3][d.f]!;
  leg(d, -24, true, ph + Math.PI, true);
  leg(d, 13, false, ph, true);
  tail(d);
  const y = (v: number): number => g + v + bob;
  // Body: deep in the chest, hunched, the rump the highest point.
  const shape = [
    ...cub(pt(18, y(-21)), pt(6, y(-17.5)), pt(-12, y(-17.5)), pt(-23, y(-21)), 12),
    ...cub(pt(-23, y(-21)), pt(-33, y(-23)), pt(-37, y(-34)), pt(-33, y(-44)), 10).slice(1),
    ...cub(pt(-33, y(-44)), pt(-27, y(-54)), pt(-11, y(-54)), pt(-1, y(-48)), 12).slice(1),
    ...cub(pt(-1, y(-48)), pt(9, y(-44)), pt(18, y(-41)), pt(24, y(-35)), 10).slice(1),
    ...cub(pt(24, y(-35)), pt(27, y(-30)), pt(25, y(-23)), pt(18, y(-21)), 6).slice(1),
  ];
  skin(d, shape, FUR, 0.78);
  pen.clipped(shape, () => {
    // Buff along the flank, paler under the belly; the back darker with black-tipped guard hairs.
    tint(d, oval(-8, y(-27), 26, 7, 18), BUFF, 0.55);
    tint(d, oval(-4, y(-19), 22, 3.5, 16), PALE, 0.6);
    tint(d, oval(-14, y(-50), 20, 5, 16), DARK, 0.3);
    // Fur in hatching: soft strokes following the coat back over the hump.
    pen.hatch(shape, 2.4, 2.6, 0.45, { color: d.ink, alpha: 0.28 });
  });
  grizzle(d, shape, 90, -34, 24, y(-54), y(-20));
  shade(d, shape, 0.42, true);
  // Fur standing out of the contour along the back and under the belly.
  for (let i = 0; i < shape.length - 1; i += 2) {
    const p = shape[i]!;
    const q = shape[i + 1]!;
    const len = Math.hypot(q.x - p.x, q.y - p.y) || 1;
    const nx = (q.y - p.y) / len;
    const ny = -(q.x - p.x) / len;
    const l = 1.4 + pen.rng() * 1.2;
    pen.hair([p, pt(p.x - nx * l - (q.x - p.x) / len * l * 0.6, p.y - ny * l - (q.y - p.y) / len * l * 0.6)], 0.5, d.ink, 0.7);
  }
  edge(d, shape, 1.2);
  // The shoulder and thigh: a curve of the coat over each.
  pen.hair(bezier(pt(-30, y(-38)), pt(-24, y(-29)), pt(-15, y(-24)), 6), 0.6, d.ink, 0.45);
  pen.hair(bezier(pt(8, y(-38)), pt(13, y(-31)), pt(10, y(-23)), 6), 0.6, d.ink, 0.45);
  leg(d, -20, true, ph, false);
  leg(d, 16, false, ph + Math.PI, false);
  head(d);
}
