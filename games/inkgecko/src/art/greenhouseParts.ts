import { createRng, type Rng } from '../logic/rng';
import { blob, body, castShadow, outline, polar, SHADOW } from './groundKit';
import { closed, type Draw, normals, oval, pt, ribbon, shade, TAU } from './kit';
import { PAPER_FILL } from './palette';
import type { Pt } from './pen';
import { coverEnds, coverHalf, tilted, unit } from './tunnel';
import { mix } from './wash';

/**
 * The greenhouse's covers, deck and seat: a salt-glazed drain pipe laid in
 * jointed lengths over a stretch of groove, a little brick causeway carrying
 * a groove over another, and a big upturned terracotta saucer for the gecko.
 */
const GLAZE = '#9c5b36';
const GLAZE_DEEP = '#5e3220';
const BRICK = '#b65b3e';
const CAP = '#d9cdb6';
const HOLLOW = '#1d1f2b';
export const SAUCER = '#c77a52';
/** Length of one pipe section, in groove points (every ~4 units). */
const SECTION = 14;

/** The furthest any of pts[i..j] strays from the chord pts[i]→pts[j]. */
function bowOf(pts: readonly Pt[], i: number, j: number): number {
  const a = pts[i]!;
  const u = unit(a, pts[j]!);
  let m = 0;
  for (let k = i; k <= j; k++) m = Math.max(m, Math.abs((pts[k]!.x - a.x) * -u.y + (pts[k]!.y - a.y) * u.x));
  return m;
}

/** One straight section of glazed pipe from a to b, radius r: round in section, glossy on top. */
function section(d: Draw, a: Pt, b: Pt, r: number, rng: Rng): void {
  const { pen } = d;
  const u = unit(a, b);
  const n = pt(-u.y, u.x);
  const side = (k: number): Pt[] => [pt(a.x + n.x * r * k, a.y + n.y * r * k), pt(b.x + n.x * r * k, b.y + n.y * r * k)];
  const shape = [...side(1), ...side(-1).reverse()];
  castShadow(d, shape, 10, 0.18);
  body(d, shape, mix(GLAZE, '#b07a3c', rng() * 0.35), 0.8);
  const lit = n.x * SHADOW.x + n.y * SHADOW.y < 0 ? 1 : -1;
  pen.clipped(shape, () => {
    pen.stipple(shape, 50, () => 0.6, 0.7, GLAZE_DEEP);
    pen.stroke(side(-lit * 0.62), r * 0.75, GLAZE_DEEP, 0.35, false);
    pen.stroke(side(lit * 0.42), r * 0.35, '#e7b98b', 0.35, false);
    pen.stroke(side(lit * 0.45), 1.6, PAPER_FILL, 0.85, false);
  });
  pen.crescent(shape, pt(n.x * lit * r * 0.5, n.y * lit * r * 0.5), () => pen.hatch(shape, 2.8, Math.atan2(u.y, u.x) + 1.1, 0.45, { color: d.ink, alpha: 0.35 }));
  pen.stroke(side(1), 1.2, d.ink, 0.9);
  pen.stroke(side(-1), 1.3, d.ink, 0.9);
}

/** A pipe's socket: a collar a little wider than the pipe, across direction u at c. */
function socket(d: Draw, c: Pt, u: Pt, r: number, open: boolean): void {
  const { pen } = d;
  const ring = tilted(c, u, 7, r + 4, 26);
  castShadow(d, ring, 8, 0.15);
  body(d, ring, mix(GLAZE, GLAZE_DEEP, 0.2), 0.85);
  pen.crescent(ring, pt(-SHADOW.x * 3, -SHADOW.y * 3), () => pen.fill(ring, GLAZE_DEEP, 0.4));
  pen.hair(closed(tilted(pt(c.x - u.x * 2, c.y - u.y * 2), u, 3, r + 2, 22)).slice(4, 14), 1, '#f0cfa8', 0.6);
  if (open) {
    const hole = tilted(c, u, 4, r - 5, 24);
    pen.fill(hole, HOLLOW, 0.92);
    pen.stroke(closed(hole), 0.8, d.ink, 0.9, false);
  }
  pen.stroke(closed(ring), 1.1, d.ink, 0.9, false);
}

/**
 * A salt-glazed drain pipe laid along a stretch of groove in straight
 * sections jointed by sockets, so it follows a curve as well as a straight.
 * Covers a band coverHalf(grooveW) either side; dark mouths at both ends.
 */
export function drainPipe(d: Draw, pts: readonly Pt[], grooveW: number): void {
  if (pts.length < 2) return;
  const rng = createRng(Math.round(pts[0]!.x * 13 + pts[0]!.y * 7 + pts.length));
  coverEnds(d, pts, grooveW);
  const half = coverHalf(grooveW);
  const cuts = [0];
  while (cuts[cuts.length - 1]! < pts.length - 1) cuts.push(Math.min(pts.length - 1, cuts[cuts.length - 1]! + SECTION));
  if (cuts.length > 2 && cuts[cuts.length - 1]! - cuts[cuts.length - 2]! < SECTION / 2) cuts.splice(cuts.length - 2, 1);
  const r = half + Math.max(...cuts.slice(1).map((j, k) => bowOf(pts, cuts[k]!, j)));
  for (let k = 0; k + 1 < cuts.length; k++) section(d, pts[cuts[k]!]!, pts[cuts[k + 1]!]!, r, rng);
  for (let k = 1; k + 1 < cuts.length; k++) {
    const c = pts[cuts[k]!]!;
    socket(d, c, unit(pts[cuts[k - 1]!]!, pts[cuts[k + 1]!]!), r, false);
  }
  const last = cuts[cuts.length - 1]!;
  socket(d, pts[0]!, unit(pts[0]!, pts[cuts[1]!]!), r, true);
  socket(d, pts[last]!, unit(pts[cuts[cuts.length - 2]!]!, pts[last]!), r, true);
}

/** One brick (a quad, inset by its mortar), washed, shaded and outlined. */
function brick(d: Draw, quad: readonly Pt[], rng: Rng): void {
  const { pen } = d;
  const c = pt(quad.reduce((s, p) => s + p.x, 0) / 4, quad.reduce((s, p) => s + p.y, 0) / 4);
  const shape = quad.map((p) => pt(c.x + (p.x - c.x) * 0.88, c.y + (p.y - c.y) * 0.84));
  body(d, shape, mix(BRICK, rng() < 0.3 ? '#7d3b2c' : '#d58a5c', rng() * 0.5), 0.75);
  pen.stipple(shape, 10, () => 0.6, 0.5, '#5e2e22');
  pen.crescent(shape, pt(-SHADOW.x * 1.6, -SHADOW.y * 1.6), () => pen.fill(shape, '#5e2e22', 0.35));
  pen.hair(outline(shape, 4), 0.55, d.ink, 0.75);
}

/** A brick causeway deck: brick parapets either side of the groove, piers with stone caps at the ends. */
export function brickDeck(d: Draw, pts: readonly Pt[], half: number, grooveW: number, rng: Rng): void {
  const { pen } = d;
  const deck = ribbon(pts, () => half * 2);
  const inner = ribbon(pts, () => grooveW + 1);
  body(d, deck.shape, mix(BRICK, '#e0b08a', 0.5), 0.6);
  const last = pts.length - 1;
  for (const [outer, edge] of [[deck.top, inner.top], [deck.bot, inner.bot]] as const) {
    for (let i = 0; i < last; ) {
      const j = Math.min(last, i + 5);
      brick(d, [outer[i]!, outer[j]!, edge[j]!, edge[i]!], rng);
      i = j;
    }
    pen.stroke(outer, 1.2, d.ink, 0.9);
  }
  const nrm = normals(pts);
  for (const i of [0, last]) {
    for (const s of [1, -1]) {
      const c = pt(pts[i]!.x + nrm[i]!.x * s * (half - 4), pts[i]!.y + nrm[i]!.y * s * (half - 4));
      const pier = blob(c, 9, 9, rng, 0.04, 12, Math.atan2(nrm[i]!.y, nrm[i]!.x) + Math.PI / 4).map((p, k) => (k % 3 === 0 ? polar(p, Math.atan2(p.y - c.y, p.x - c.x), 1.5) : p));
      castShadow(d, pier, 7, 0.2);
      body(d, pier, CAP, 0.8);
      pen.crescent(pier, pt(-SHADOW.x * 3, -SHADOW.y * 3), () => pen.fill(pier, '#8f8676', 0.45));
      pen.stroke(closed(pier), 1, d.ink, 0.9, false);
    }
  }
}

/** The ground tone under a raised groove in the greenhouse. */
export const GREENHOUSE_BED = '#d6b49a';

/**
 * A big terracotta saucer turned upside down, radius r at c: its flat foot
 * on top, the wall sloping out to the rim, a chip and a bloom of old salts.
 */
export function upturnedSaucer(d: Draw, c: Pt, r: number): void {
  const { pen } = d;
  const rng = createRng(Math.round(c.x * 31 + c.y * 17));
  const rim = blob(c, r, r, rng, 0.012, 48);
  castShadow(d, rim, 7, 0.2);
  castShadow(d, rim, 3, 0.12);
  body(d, rim, SAUCER, 0.72);
  // The sloping wall: lit on the light's side, in shade on the other.
  pen.crescent(rim, pt(SHADOW.x * r * 0.14, SHADOW.y * r * 0.14), () => pen.fill(rim, PAPER_FILL, 0.4));
  pen.crescent(rim, pt(-SHADOW.x * r * 0.16, -SHADOW.y * r * 0.16), () => pen.fill(rim, mix(SAUCER, '#6e3424', 0.6), 0.4));
  shade(d, rim, 0.3);
  const foot = oval(c.x, c.y, r * 0.8, r * 0.8, 44);
  pen.fill(foot, mix(SAUCER, '#e3a77c', 0.35), 0.8);
  pen.clipped(foot, () => {
    pen.stroke(closed(oval(c.x, c.y, r * 0.62, r * 0.62, 40)), 1.8, PAPER_FILL, 0.25, false);
    pen.stipple(foot, 140, (x, y) => (Math.hypot(x - c.x, y - c.y) > r * 0.5 ? 0.6 : 0.2), 0.8, '#f2e8d6');
    for (let k = 0; k < 3; k++) pen.fill(oval(c.x + (rng() - 0.5) * r, c.y + (rng() - 0.5) * r, 8 + rng() * 10, 5 + rng() * 6, 14), '#8c4a33', 0.08);
  });
  pen.crescent(foot, pt(-SHADOW.x * 2.5, -SHADOW.y * 2.5), () => pen.fill(foot, '#6e3424', 0.18));
  pen.stroke(closed(foot), 1, d.ink, 0.75);
  pen.hair(closed(oval(c.x, c.y, r * 0.75, r * 0.75, 40)), 0.45, d.ink, 0.3);
  // A chip out of the rim.
  const a = rng() * TAU;
  const chip = [polar(c, a - 0.1, r + 0.5), polar(c, a, r - 6), polar(c, a + 0.12, r + 0.5)];
  pen.fill(chip, '#e6b48c', 0.95);
  pen.hair(chip, 0.6, d.ink, 0.8);
  pen.stroke(closed(rim), 1.4, d.ink, 0.95);
}
