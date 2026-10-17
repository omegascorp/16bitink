import { capsule, cub, oval, pt, type Draw } from '../kit';
import { dab, gleam, glow, mix, paint, SHADOW } from '../paint';
import { PAPER_FILL } from '../palette';
import type { Pt } from '../pen';
import { FLESH } from './flesh';

/**
 * The grazer (a walker, harmless, inked in blue): a soft, slow cap-eater
 * that creeps over the surface on a row of cushioned tube feet, rippling
 * them in a wave as a millipede does. What it eats grows back on it: its
 * back carries shelves of bracket fungus, its own fruiting bodies, ringed
 * with a year's growth each and beaded with lit spores at their rims. When
 * frightened it pulls its feet and head in and sinks under the shelves like
 * a heap of fallen bark. Its front end is a soft snout with two stubby eye
 * stalks and a fringe of rasping palps that scrape the caps. Drawn facing
 * right, the origin at the middle of its underside on the ground (y = 0).
 */
export const GRAZER_ART = { w: 56, h: 36, ox: 28, oy: 34 } as const;

const BODY = '#b4a6c6';
const FOOT = '#9c88ad';
const SHELF = '#d4ad66';
const SHELF_RIM = '#efe0bd';
const SHELF_GILL = '#6b4a3a';
const PALP = '#c99bb8';

/** The feet's x along the underside, back to front. */
const FEET = [-16, -10.6, -5.2, 0.2, 5.6, 11] as const;

/** One tube foot from the body down to the ground; `lift` raises its pad (mid-step), `lean` tips it. */
function tubeFoot(d: Draw, x: number, top: number, lift: number, lean: number, far: boolean): void {
  const pad = pt(x + lean, -1.4 - lift);
  const leg = capsule(pt(x, top), pad, 4.2, 3.4);
  paint(d, leg, far ? mix(FOOT, SHADOW, 0.25) : FOOT, { alpha: 1, shadow: 0.5, hatch: 0, line: 0.55 });
  const sole = oval(pad.x, pad.y + 0.4, 2.6, 1.3, 12);
  paint(d, sole, mix(FOOT, PALP, 0.5), { alpha: 1, shadow: 0.3, hatch: 0, line: 0.5 });
}

/** The mantle: a long soft dome from tail to snout, mottled, its lower edge a frilled skirt over the feet. */
function mantle(d: Draw, base: number, top: number, x0: number, x1: number): Pt[] {
  const shape = [
    pt(x0, base - 1.4),
    ...cub(pt(x0, base - 1.4), pt(x0 + 2, top + 2), pt(x1 - 14, top - 1), pt(x1 - 2, top + 4), 12),
    ...cub(pt(x1 - 2, top + 4), pt(x1 + 2, top + 6), pt(x1 + 2, base - 1), pt(x1 - 2, base), 6),
    ...cub(pt(x1 - 2, base), pt(x1 - 14, base + 1.2), pt(x0 + 10, base + 1.2), pt(x0, base - 1.4), 10),
  ];
  paint(d, shape, BODY, { alpha: 1, shadow: 0.55, hatch: 0.18, line: 0.75 });
  d.pen.stipple(shape, 50, () => 0.6, 0.45, mix(BODY, SHADOW, 0.35));
  // The skirt: a frilled edge along the bottom.
  const skirt: Pt[] = [];
  for (let x = x0 + 3; x <= x1 - 3; x += 2.2) skirt.push(pt(x, base - 0.6 + (Math.round(x) % 2 ? 0.7 : -0.2)));
  d.pen.hair(skirt, 0.45, mix(BODY, SHADOW, 0.6), 0.8);
  return shape;
}

/** A shelf's lobed rim, `s` of the way out from its root: a half-oval with a wavy edge, as bracket fungus grows. */
function rim(w: number, h: number, s: number, seed: number): Pt[] {
  return Array.from({ length: 31 }, (_, i) => {
    const a = Math.PI + (i / 30) * Math.PI;
    const k = s * (1 + 0.035 * Math.sin(a * 9 + seed));
    return pt(Math.cos(a) * (w / 2) * k, Math.sin(a) * h * k);
  });
}

/** One bracket shelf on the back: a half-disc rooted at `root`, `w` across, ringed with growth bands, its pored underside showing under the rim. */
function shelf(d: Draw, root: Pt, w: number, h: number, tilt: number, beads: boolean): void {
  const { ctx } = d.pen;
  ctx.save();
  ctx.translate(root.x, root.y);
  ctx.rotate(tilt);
  const seed = w + h;
  const cap = [...rim(w, h, 1, seed), ...cub(pt(w / 2, 0), pt(w / 4, 1.6), pt(-w / 4, 1.6), pt(-w / 2, 0), 6)];
  // The gills underneath, a dark lip just under the rim.
  const gill = [pt(-w / 2 + 0.6, -0.4), pt(w / 2 - 0.6, -0.4), ...cub(pt(w / 2 - 0.6, 0.8), pt(w / 4, 2.8), pt(-w / 4, 2.8), pt(-w / 2 + 0.6, 0.8), 6)];
  paint(d, gill, SHELF_GILL, { alpha: 1, shadow: 0.2, hatch: 0, line: 0.5 });
  paint(d, cap, SHELF, { alpha: 1, shadow: 0.5, hatch: 0.16, line: 0.7 });
  // Growth rings, concentric from the root, darker and lighter by turns.
  d.pen.clipped(cap, () => {
    for (let k = 1; k <= 3; k++) {
      const s = k / 3.6;
      const ring = rim(w, h, s, seed).map((p) => pt(p.x, p.y + 0.6));
      d.pen.hair(ring, 0.5, k % 2 ? mix(SHELF, SHADOW, 0.45) : mix(SHELF, '#7a4a28', 0.35), 0.75);
      d.pen.hair(ring.map((p) => pt(p.x - 0.4, p.y - 0.5)), 0.35, mix(SHELF, PAPER_FILL, 0.5), 0.5);
    }
  });
  // The pale outermost band, this season's growth.
  d.pen.stroke(rim(w, h, 0.9, seed).slice(1, -1), 0.9, SHELF_RIM, 0.75, false);
  if (beads) {
    const edge = rim(w, h, 0.93, seed);
    for (const i of [7, 14, 22]) {
      glow(ctx, edge[i]!, 2.2, FLESH.glowTeal, 0.55);
      d.pen.dot(edge[i]!.x, edge[i]!.y, 0.55, '#e9fff8', 0.95);
    }
  }
  gleam(d, cub(pt(-w * 0.36, -h * 0.4), pt(-w * 0.3, -h * 0.8), pt(-w * 0.1, -h * 0.92), pt(0, -h * 0.93), 6), 0.6, 0.6);
  ctx.restore();
}

/** The head: a soft snout with two eye stalks and a fringe of palps hanging under it, swaying by the step. */
function head(d: Draw, at: Pt, step: number): void {
  for (const [dx, far] of [[-1.6, true], [1.4, false]] as const) {
    const tip = pt(at.x + dx + 2.6, at.y - 9.6 + (far ? 0.6 : 0));
    d.pen.stroke([pt(at.x + dx, at.y - 4), pt(at.x + dx + 1.2, at.y - 7), tip], 1.9, d.ink, 0.9, false);
    d.pen.stroke([pt(at.x + dx, at.y - 4), pt(at.x + dx + 1.2, at.y - 7), tip], 1.1, far ? mix(BODY, SHADOW, 0.25) : BODY, 1, false);
    d.pen.dot(tip.x + 0.3, tip.y - 0.2, 1.15, d.ink, 0.95);
    d.pen.dot(tip.x + 0.6, tip.y - 0.6, 0.35, PAPER_FILL, 0.95);
  }
  const snout = [pt(at.x - 4, at.y - 5.6), ...cub(pt(at.x - 4, at.y - 5.6), pt(at.x + 1, at.y - 7.4), pt(at.x + 6.6, at.y - 5), pt(at.x + 6.4, at.y - 1.6), 8), ...cub(pt(at.x + 6.4, at.y - 1.6), pt(at.x + 6, at.y + 1), pt(at.x, at.y + 1.6), pt(at.x - 4, at.y + 0.6), 6)];
  paint(d, snout, mix(BODY, PALP, 0.3), { alpha: 1, shadow: 0.5, hatch: 0.12, line: 0.7 });
  d.pen.dot(at.x + 1.6, at.y - 4.4, 0.7, PAPER_FILL, 0.6);
  // The palps: short curling feelers under the mouth that rasp the caps.
  for (let k = 0; k < 5; k++) {
    const x = at.x + 0.8 + k * 1.3;
    const sway = Math.sin(step * 2 + k) * 0.8;
    const pts = [pt(x, at.y + 0.6), pt(x + 0.6 + sway, at.y + 2.6), pt(x + 1.4 + sway, at.y + 3.8), pt(x + 2 + sway * 0.5, at.y + 3.4)];
    d.pen.stroke(pts, 1.2, d.ink, 0.85, false);
    d.pen.stroke(pts, 0.6, PALP, 1, false);
  }
}

/** Walking: the feet rippling in a wave from tail to snout, the body riding a little up and down. */
function walking(d: Draw): void {
  const f = d.f;
  const bob = [0, -0.5, -0.2][f]!;
  const base = -6 + bob;
  // Far feet first, a half-step out of phase, peeking between the near ones.
  FEET.forEach((x, i) => {
    const phase = (i + f + 1) % 3;
    tubeFoot(d, x + 2.2, base + 1, phase === 0 ? 1.4 : 0, phase === 0 ? 1.2 : -0.6 + phase * 0.4, true);
  });
  mantle(d, base, base - 10, -22, 20);
  FEET.forEach((x, i) => {
    const phase = (i + f) % 3;
    tubeFoot(d, x, base + 1.4, phase === 0 ? 1.8 : 0, phase === 0 ? 1.6 : -0.8 + phase * 0.5, false);
  });
  shelf(d, pt(-14, base - 7.6), 17, 9, -0.22, true);
  shelf(d, pt(-2.6, base - 9.4), 18, 10.5, -0.08, false);
  shelf(d, pt(8.6, base - 8.4), 14, 8.5, 0.12, true);
  head(d, pt(20, base - 1), f);
  // A tail frill trailing on the ground.
  d.pen.stroke([pt(-21.6, base - 0.4), pt(-24, base + 2.6), pt(-25, base + 4.8)], 1.6, d.ink, 0.85, false);
  d.pen.stroke([pt(-21.6, base - 0.4), pt(-24, base + 2.6), pt(-25, base + 4.8)], 0.9, BODY, 1, false);
}

/** Curled: feet and head drawn in, sunk to the ground under its shelves, which close down over it like shingles. */
function curled(d: Draw): void {
  const base = -0.6;
  mantle(d, base, base - 9, -20, 17);
  for (const x of [-12, -2, 8]) {
    const pad = oval(x, -0.6, 2.8, 1.1, 12);
    paint(d, pad, mix(FOOT, PALP, 0.5), { alpha: 1, shadow: 0.3, hatch: 0, line: 0.5 });
  }
  shelf(d, pt(-11, base - 3), 19, 10, -0.5, true);
  shelf(d, pt(9.6, base - 3), 18, 10, 0.5, true);
  shelf(d, pt(-0.6, base - 6.6), 20, 11.5, 0, false);
  // Only the palps' tips peek out at the front.
  for (let k = 0; k < 3; k++) d.pen.stroke([pt(16 + k, -1.6), pt(17 + k * 1.2, -0.4)], 1, d.ink, 0.7, false);
}

/** The grazer facing right: `walk` with `d.f` as the step, or `curled` up under its shelves, safe. */
export function drawGrazer(d: Draw, pose: 'walk' | 'curled'): void {
  dab(d, oval(0, 0.2, 24, 1.8, 20), SHADOW, 0.14, 1.2);
  if (pose === 'curled') curled(d);
  else walking(d);
}
