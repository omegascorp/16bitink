import { createRng, type Rng } from '../logic/rng';
import { blob, body, castShadow, outline, polar, SHADOW } from './groundKit';
import { closed, type Draw, lerp, normals, oval, pt, ribbon, shade, TAU } from './kit';
import { LEAF, MOSS, PAPER_FILL } from './palette';
import type { Pt } from './pen';
import { coverEnds, coverHalf, hollowLog, unit } from './tunnel';
import { mix } from './wash';

/**
 * The orchard's covers, deck and seat: a hollow log over a straight stretch
 * of groove, a row of upturned apple crates along a curve, a plank
 * footbridge with pole rails carrying a groove over another, and a sawn
 * stump with its rings for the gecko.
 */
const PINE = '#cfae78';
const CLEAT = '#b08a5a';
const UNDER = '#2a2420';
const BARK = '#7d5f43';
const HEART = '#c89a62';
const SAP = '#e2c595';
const APPLE_MARK = '#b8453a';
/** Straightest a stretch must be (bow) and longest, for one log to cover it. */
const LOG_BOW = 12;
const LOG_LEN = 330;
/** One crate's length, in groove points (every ~4 units), and how far each runs on past its ends. */
const CRATE = 20;
const CRATE_RUN_ON = 12;
/** How far a footbridge's planks run out past its rails. */
const PLANK_OVER = 6;

/** The ground tone under a raised groove in the orchard: the channel's stone. */
export const ORCHARD_BED = '#cfc6b2';

/** The furthest any of pts[i..j] strays from the chord pts[i]→pts[j]. */
function bowOf(pts: readonly Pt[], i: number, j: number): number {
  const a = pts[i]!;
  const u = unit(a, pts[j]!);
  let m = 0;
  for (let k = i; k <= j; k++) m = Math.max(m, Math.abs((pts[k]!.x - a.x) * -u.y + (pts[k]!.y - a.y) * u.x));
  return m;
}

/** An upturned apple crate from a to b (running on `ext` past each), hw either side: boards with dark gaps, end cleats, nails, a faded stencil. */
function crate(d: Draw, a: Pt, b: Pt, hw: number, ext: readonly [number, number], rng: Rng): void {
  const { pen } = d;
  const u = unit(a, b);
  const n = pt(-u.y, u.x);
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const at = (s: number, t: number): Pt => pt(a.x + u.x * s + n.x * t, a.y + u.y * s + n.y * t);
  const rect = (s0: number, s1: number, t0: number, t1: number): Pt[] => [at(s0, t0), at(s1, t0), at(s1, t1), at(s0, t1)];
  const [s0, s1] = [-ext[0], len + ext[1]];
  const all = rect(s0, s1, -hw, hw);
  castShadow(d, all, 11, 0.2);
  pen.fill(all, UNDER, 0.88);
  const boards = 3;
  const bw = (2 * hw) / boards;
  for (let k = 0; k < boards; k++) {
    const t0 = -hw + k * bw + 1.6;
    const board = rect(s0 + 1, s1 - 1, t0, t0 + bw - 3.2);
    body(d, board, mix(PINE, '#a89a7a', rng() * 0.45), 0.7);
    pen.clipped(board, () => {
      for (let g = 0; g < len / 14; g++) {
        const s = s0 + rng() * (s1 - s0);
        const t = t0 + 2 + rng() * (bw - 7);
        pen.hair([at(s, t), at(s + 20 + rng() * 30, t + (rng() - 0.5) * 1.5)], 0.4, d.ink, 0.3);
      }
      if (k === 1 && rng() < 0.6) {
        // A faded stencil of an apple on the middle board.
        const c = at((s0 + s1) / 2, t0 + (bw - 3.2) / 2);
        pen.fill(oval(c.x, c.y, bw * 0.28, bw * 0.26, 16), APPLE_MARK, 0.3);
        pen.fill(blob(polar(c, -1.2, bw * 0.32), 3, 1.6, rng, 0, 8, -0.6), LEAF, 0.35);
      }
    });
    pen.crescent(board, pt(-SHADOW.x * 1.8, -SHADOW.y * 1.8), () => pen.fill(board, '#5a4028', 0.3));
    pen.stroke(outline(board, 6), 0.7, d.ink, 0.75, false);
  }
  for (const s of [s0 + 1, s1 - 11]) {
    const cleat = rect(s, s + 10, -hw - 1, hw + 1);
    body(d, cleat, CLEAT, 0.72);
    pen.crescent(cleat, pt(-SHADOW.x * 2.5, -SHADOW.y * 2.5), () => pen.fill(cleat, '#5a4028', 0.35));
    for (let k = 0; k < boards; k++) pen.dot(at(s + 5, -hw + (k + 0.5) * bw).x, at(s + 5, -hw + (k + 0.5) * bw).y, 0.9, UNDER, 0.85);
    pen.stroke(outline(cleat, 5), 0.9, d.ink, 0.9, false);
  }
  shade(d, all, 0.22);
  pen.stroke(outline(all, 8), 1.2, d.ink, 0.9);
}

/**
 * The orchard's cover over a stretch of groove: a hollow log on a short
 * nearly straight stretch, else a row of upturned apple crates laid along
 * it, each overlapping the last. Covers coverHalf(grooveW) either side.
 */
export function orchardCover(d: Draw, pts: readonly Pt[], grooveW: number): void {
  if (pts.length < 2) return;
  const rng = createRng(Math.round(pts[0]!.x * 13 + pts[0]!.y * 7 + pts.length));
  coverEnds(d, pts, grooveW);
  const half = coverHalf(grooveW);
  const a = pts[0]!;
  const b = pts[pts.length - 1]!;
  const bow = bowOf(pts, 0, pts.length - 1);
  if (bow <= LOG_BOW && Math.hypot(b.x - a.x, b.y - a.y) <= LOG_LEN) {
    hollowLog(d, a, b, half + bow, rng);
    return;
  }
  const count = Math.max(1, Math.round((pts.length - 1) / CRATE));
  const cuts = Array.from({ length: count + 1 }, (_, k) => Math.round(((pts.length - 1) * k) / count));
  for (let k = 0; k < count; k++) {
    const [i, j] = [cuts[k]!, cuts[k + 1]!];
    crate(d, pts[i]!, pts[j]!, half + bowOf(pts, i, j), [k === 0 ? 0 : CRATE_RUN_ON, k === count - 1 ? 0 : CRATE_RUN_ON], rng);
  }
}

/** A plank footbridge deck: planks laid across, a round pole rail along each side, sawn posts at the corners. */
export function plankDeck(d: Draw, pts: readonly Pt[], half: number, _grooveW: number, rng: Rng): void {
  const { pen } = d;
  const deck = ribbon(pts, () => half * 2 + PLANK_OVER * 2);
  const last = pts.length - 1;
  for (let i = 0; i < last; i += 2) {
    const j = Math.min(last, i + 2);
    const plank = [deck.top[i]!, lerp(deck.top[i]!, deck.top[j]!, 0.8), lerp(deck.bot[i]!, deck.bot[j]!, 0.8), deck.bot[i]!];
    body(d, plank, mix(PINE, '#9c8a68', rng() * 0.5), 0.72);
    pen.crescent(plank, pt(-SHADOW.x * 1.4, -SHADOW.y * 1.4), () => pen.fill(plank, '#5a4028', 0.3));
    pen.hair(outline(plank, 5), 0.55, d.ink, 0.7);
  }
  const nrm = normals(pts);
  for (const s of [1, -1]) {
    const rail = pts.map((p, i) => pt(p.x + nrm[i]!.x * s * (half - 4), p.y + nrm[i]!.y * s * (half - 4)));
    pen.stroke(rail.map((p) => pt(p.x + SHADOW.x * 6, p.y + SHADOW.y * 6)), 7, d.ink, 0.18, false);
    pen.stroke(rail, 7, mix(BARK, PINE, 0.35), 0.95, false);
    pen.stroke(rail.map((p) => pt(p.x - SHADOW.x * 1.6, p.y - SHADOW.y * 1.6)), 2, PAPER_FILL, 0.4, false);
    pen.hair(rail.map((p, i) => pt(p.x + nrm[i]!.x * 3.5, p.y + nrm[i]!.y * 3.5)), 0.8, d.ink, 0.85);
    pen.hair(rail.map((p, i) => pt(p.x - nrm[i]!.x * 3.5, p.y - nrm[i]!.y * 3.5)), 0.8, d.ink, 0.85);
    for (const i of [0, last]) {
      const top = oval(rail[i]!.x, rail[i]!.y, 6.5, 6.5, 16);
      castShadow(d, top, 7, 0.2);
      body(d, top, SAP, 0.85);
      pen.hair(closed(oval(rail[i]!.x, rail[i]!.y, 3.6, 3.6, 12)), 0.4, d.ink, 0.5);
      pen.stroke(closed(top), 0.9, d.ink, 0.9, false);
    }
  }
}

/**
 * A sawn apple-tree stump, radius r at c, for the gecko to sit on: rough
 * bark round a pale cut face with its growth rings, a check or two, root
 * flares into the grass and a little moss.
 */
export function treeStump(d: Draw, c: Pt, r: number): void {
  const { pen } = d;
  const rng = createRng(Math.round(c.x * 31 + c.y * 17));
  // The flare of the roots: a lumpy base spreading a little into the grass.
  const flare = blob(c, r + 8, r + 7, rng, 0.14, 40);
  castShadow(d, flare, 5, 0.15);
  body(d, flare, mix(BARK, '#6f7a4a', 0.25), 0.7);
  pen.crescent(flare, pt(-SHADOW.x * 4, -SHADOW.y * 4), () => pen.fill(flare, '#3f2c1d', 0.35));
  pen.clipped(flare, () => {
    for (let k = 0; k < 30; k++) {
      const a = rng() * TAU;
      pen.hair([polar(c, a, r), polar(c, a + (rng() - 0.5) * 0.1, r + 9)], 0.5, '#3f2c1d', 0.5);
    }
  });
  pen.hair(closed(flare), 0.8, d.ink, 0.75);
  const bark = blob(c, r, r * 0.97, rng, 0.04, 44);
  castShadow(d, bark, 9, 0.2);
  body(d, bark, BARK, 0.8);
  pen.clipped(bark, () => {
    for (let k = 0; k < 60; k++) {
      const a = rng() * TAU;
      pen.hair([polar(c, a, r * 0.86), polar(c, a + (rng() - 0.5) * 0.08, r + 1)], 0.6, '#3f2c1d', 0.6);
    }
  });
  const face = blob(c, r * 0.86, r * 0.84, rng, 0.03, 40);
  body(d, face, SAP, 0.85);
  const pith = polar(c, rng() * TAU, r * 0.12);
  pen.clipped(face, () => {
    pen.fill(blob(pith, r * 0.58, r * 0.55, rng, 0.05, 30), HEART, 0.45);
    for (let k = 1; k <= 13; k++) {
      const rr = (r * 0.82 * k) / 13;
      pen.hair(closed(blob(pith, rr, rr * 0.97, rng, 0.04, Math.max(12, Math.round(rr))))
        , k % 4 === 0 ? 0.7 : 0.4, d.ink, k % 4 === 0 ? 0.45 : 0.28);
    }
    // Saw marks: faint sweeping arcs.
    for (let k = 0; k < 6; k++) {
      const o = polar(c, 2.4, r * 1.6);
      const rr = r * (1.1 + k * 0.18);
      pen.hair(Array.from({ length: 12 }, (_, i) => polar(o, -0.95 + i * 0.07, rr)), 0.5, '#9c7a52', 0.25);
    }
  });
  // Checks: dry cracks running in from the bark.
  for (let k = 0; k < 3; k++) {
    const a = rng() * TAU;
    pen.stroke([polar(pith, a, r * 0.84), polar(pith, a + 0.04, r * 0.6), polar(pith, a - 0.02, r * (0.3 + rng() * 0.2))], 1.1, d.ink, 0.75, false);
  }
  pen.dot(pith.x, pith.y, 1.6, '#5a3f28', 0.9);
  pen.crescent(face, pt(SHADOW.x * 4, SHADOW.y * 4), () => pen.fill(face, '#5a3f28', 0.12));
  // Moss on the bark at the shady side.
  pen.clipped(bark, () => {
    for (let k = 0; k < 40; k++) {
      const p = polar(c, 0.9 + (rng() - 0.5) * 1.4, r * (0.88 + rng() * 0.14));
      pen.fill(oval(p.x, p.y, 1.6 + rng() * 2.4, 1.4 + rng() * 1.8, 8), rng() < 0.4 ? LEAF : MOSS, 0.65);
    }
  });
  pen.stroke(closed(face), 0.9, d.ink, 0.85);
  pen.stroke(closed(bark), 1.4, d.ink, 0.95);
}
