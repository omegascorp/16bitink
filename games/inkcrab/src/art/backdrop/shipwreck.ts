import { bezier, cub, type Draw, lerp, pt, ribbon, tube } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { edges, FAR } from './common';
import { driftLog } from './pnw';

/**
 * The wreck of Wreck Cove and what it sheds: an old wooden sailing ship
 * hard on the rocks, broken-backed and listing, her stern stove in to the
 * ribs, a mast snapped off with a yard hanging askew and the rags of her
 * sails and rigging stirring; the stumps of an old pier going out into the
 * water; and up the beach a ship's timber with its iron bolts, and a whole
 * tree bleached white, branches and all. Things face right.
 */
const HULL = '#87745f';
const HULL_DARK = '#4b3d31';
const DECK = '#b8a98c';
const SPAR = '#7a6550';
const COPPER = '#5e9e88';
const CANVAS = '#e8ddc3';
const WEED = '#6f7f36';
const RUST = '#a5583a';
const PILING = '#a0937d';
const TIMBER = '#cdc2a9';
const TIMBER_SHADE = '#857b69';
const BLEACHED = '#e6dfcf';

/** A shape on paper under a wash, its edge inked. */
function washed(t: Draw, shape: readonly Pt[], color: string, alpha: number, w = 0.6, ink = 1): void {
  t.pen.fill(shape, PAPER_FILL, 1);
  t.pen.fill(shape, color, alpha);
  t.pen.stroke(edges(shape, 2), w, t.ink, FAR * ink, false);
}

/** A splintered end: a few jagged teeth across the end of a spar or frame from `a` to `b`. */
function splinters(t: Draw, a: Pt, b: Pt, len: number, dir: Pt): void {
  const pts: Pt[] = [a];
  for (let k = 1; k < 5; k++) {
    const p = lerp(a, b, k / 5);
    const l = len * (k % 2 ? 0.4 + t.pen.rng() * 0.6 : 0.1);
    pts.push(pt(p.x + dir.x * l, p.y + dir.y * l));
  }
  pts.push(b);
  washed(t, pts, SPAR, 0.55, 0.4);
}

/** A mast or spar as a tapering tube, its shade side darker, its top snapped off in splinters. */
function spar(t: Draw, foot: Pt, top: Pt, w0: number, w1: number, snapped: boolean): void {
  const { pen } = t;
  const shape = tube([foot, lerp(foot, top, 0.5), top], w0, w1);
  washed(t, shape, SPAR, 0.6, 0.6);
  pen.clipped(shape, () => pen.fill(shape.map((p) => pt(p.x + w0 * 0.45, p.y)), HULL_DARK, 0.3));
  if (!snapped) return;
  const d = Math.hypot(top.x - foot.x, top.y - foot.y);
  const u = pt((top.x - foot.x) / d, (top.y - foot.y) / d);
  splinters(t, pt(top.x - u.y * w1 * 0.5, top.y + u.x * w1 * 0.5), pt(top.x + u.y * w1 * 0.5, top.y - u.x * w1 * 0.5), w1 * 1.6, u);
}

/** A frame of the hull standing bare: a curved timber along `spine`, lit on one side, its head snapped if `broken`. */
function rib(t: Draw, spine: readonly Pt[], w0: number, w1: number, broken: boolean): void {
  const { pen } = t;
  const shape = tube(spine, w0, w1);
  washed(t, shape, HULL, 0.62, 0.5);
  pen.clipped(shape, () => pen.fill(shape.map((p) => pt(p.x + w0 * 0.5, p.y)), HULL_DARK, 0.35));
  const top = spine[spine.length - 1]!;
  if (broken) splinters(t, pt(top.x - w1 / 2, top.y), pt(top.x + w1 / 2, top.y), w1 * 1.4, pt(0, -1));
}

/**
 * The wreck: a two-masted wooden ship aground on the rocks, listing bow-up
 * and heeled towards us so her deck shows, planking stove in aft to leave
 * her ribs standing, copper sheathing green at the waterline, barnacles and
 * weed below; the foremast snapped high with its yard hanging askew and
 * tatters of sail, slack shrouds and stays, the mainmast a stump, the
 * bowsprit broken. `x` is her midships at the waterline; only what is above
 * water is drawn (the rocks and the surf against her are the caller's).
 */
export function shipwreck(t: Draw, x: number, water: number, s: number): void {
  const { pen } = t;
  const [c, sn] = [Math.cos(-0.05), Math.sin(-0.05)];
  const P = (dx: number, dy: number): Pt => pt(x + (dx * c - dy * sn) * s, water + (dx * sn + dy * c) * s);
  const M = (pts: readonly Pt[]): Pt[] => pts.map((p) => P(p.x, p.y));
  const sheer = (dx: number): number => -(22 + 0.0011 * (dx - 5) ** 2 + 0.05 * Math.max(0, dx - 40));
  const n = 8;
  const strake = (dx: number, k: number): number => sheer(dx) + (4 - sheer(dx)) * (k / n);
  const ends = Array.from({ length: n }, (_, k) => -26 - k * 5 - pen.rng() * 8);
  const above = [pt(x - 220 * s, water - 300 * s), pt(x + 220 * s, water - 300 * s), pt(x + 220 * s, water + 1.2), pt(x - 220 * s, water + 1.2)];
  pen.clipped(above, () => {
    // The far side of the hold, still planked low down, seen between the ribs.
    const far = [...Array.from({ length: 16 }, (_, i) => pt(-96 + i * 4, sheer(-96 + i * 4) * (0.45 + 0.12 * Math.sin(i * 1.7)))), pt(-30, 4), pt(-96, 4)];
    washed(t, M(far), HULL_DARK, 0.5, 0.4, 0.7);
    pen.clipped(M(far), () => {
      for (let k = 1; k < 5; k++) pen.hair(M([pt(-98, -k * 3.4), pt(-30, -k * 3.4)]), 0.35, t.ink, FAR * 0.5);
    });
    // Masts and rigging behind the hull: the mainmast stump, then the foremast with its rags.
    rigging(t, P, sheer, s);
    // The ribs where the planking has gone: the far side's frames, dark beyond, then the near ones, some broken short.
    for (let dx = -96; dx < -20; dx += 5 + pen.rng() * 1.5) {
      const top = (sheer(dx) - 6) * (dx < -66 ? 0.5 + pen.rng() * 0.4 : 1);
      const lean = (dx + 20) * 0.06;
      washed(t, tube(M(bezier(pt(dx + 2, 4), pt(dx + 2 + lean * 0.3, top * 0.5), pt(dx + 2 + lean, top), 6)), 2.2 * s, 1.6 * s), HULL_DARK, 0.6, 0.35, 0.7);
    }
        for (let dx = -94; dx < -22; dx += 5 + pen.rng() * 1.5) {
      const broken = pen.rng() < 0.4;
      // Taller towards the break, lower and more battered towards the sunken stern.
      const k = (dx + 94) / 72;
      const top = sheer(dx) * (broken ? 0.3 + pen.rng() * 0.35 : 0.7 + 0.32 * k + pen.jitter(0.06));
      const lean = (dx + 20) * 0.08;
      rib(t, M(bezier(pt(dx, 6), pt(dx - 4 + lean * 0.1, top * 0.6), pt(dx + lean, top), 8)), 3.6 * s, 2.2 * s, broken);
    }
    // The clamp along the rib heads, broken off and sagging.
    washed(t, ribbon(M(bezier(pt(-26, sheer(-26) + 1), pt(-46, sheer(-46) + 3), pt(-66, sheer(-66) + 16), 8)), (u) => s * (3 - u)).shape, HULL, 0.6, 0.45);
    // Planks still clinging aft of the break, sagging off the ribs.
    for (const [k, to, sag] of [[2, -62, 3], [4, -80, 6], [6, -88, 2]] as const) {
      const from = ends[k]! + 2;
      const spine = M(bezier(pt(from, strake(from, k + 0.5)), pt((from + to) / 2, strake(from, k + 0.5) + sag * 0.3), pt(to, strake(to, k + 0.5) + sag), 8));
      washed(t, ribbon(spine, (u) => s * (3.4 - u)).shape, HULL, 0.6, 0.45);
    }
    hull(t, P, M, sheer, strake, ends, s);
    // Barnacles and weed along the waterline, on the hull and the ribs alike.
    for (let dx = -96; dx < 98; dx += 1.6 + pen.rng() * 2.4) {
      const p = P(dx, -2 - pen.rng() * 3.5);
      pen.dot(p.x, p.y, (0.4 + pen.rng() * 0.35) * s, PAPER_FILL, 0.75);
      if (pen.rng() < 0.5) pen.hair([P(dx, -3 - pen.rng() * 2), P(dx + pen.jitter(1.2), 1.5)], 0.7, WEED, 0.75);
    }
  });
}

/** The planked hull forward of the break: strakes, wale, copper at the waterline, and the deck showing as she heels. */
function hull(t: Draw, P: (dx: number, dy: number) => Pt, M: (pts: readonly Pt[]) => Pt[], sheer: (dx: number) => number, strake: (dx: number, k: number) => number, ends: readonly number[], s: number): void {
  const { pen } = t;
  // The deck, tilted towards us: planks running fore and aft, the main hatch open and dark, the far rail beyond.
  const deckW = (dx: number): number => 7 * Math.min(1, (92 - dx) / 40);
  const deckEdge = Array.from({ length: 31 }, (_, i) => -34 + i * 4).map((dx) => pt(dx, sheer(dx) - deckW(dx)));
  const deck = M([...deckEdge, ...[...deckEdge].reverse().map((p) => pt(p.x, sheer(p.x)))]);
  washed(t, deck, DECK, 0.55, 0.45);
  pen.clipped(deck, () => {
    for (const k of [0.25, 0.5, 0.75]) pen.hair(M(deckEdge.map((p) => pt(p.x, p.y + deckW(p.x) * k))), 0.3, t.ink, FAR * 0.5);
    pen.fill(M([pt(2, sheer(2) - 6), pt(18, sheer(18) - 6), pt(17, sheer(17) - 1.5), pt(3, sheer(3) - 1.5)]), HULL_DARK, 0.75);
    pen.fill(M([pt(-30, sheer(-30) - 6.5), pt(-20, sheer(-20) - 6.5), pt(-22, sheer(-22) - 2), pt(-31, sheer(-31) - 2)]), HULL_DARK, 0.6);
  });
  pen.hair(M(deckEdge.map((p) => pt(p.x, p.y - 1.6))).filter((_, i) => i % 9 < 6), 0.5, t.ink, FAR * 0.7);
  // The hull side: a staircase of strakes broken off at different lengths aft.
  const outline: Pt[] = [];
  for (let dx = 88; dx > ends[0]!; dx -= 4) outline.push(pt(dx, sheer(dx)));
  ends.forEach((e, k) => outline.push(pt(e, strake(e, k)), pt(e + pen.jitter(1.2), strake(e, k + 1))));
  for (let dx = ends[ends.length - 1]!; dx < 96; dx += 4) outline.push(pt(dx, 6));
  outline.push(...cub(pt(97, 6), pt(101, -8), pt(97, -26), pt(88, sheer(88)), 8));
  const side = M(outline);
  washed(t, side, HULL, 0.62, 0.8, 1.1);
  pen.clipped(side, () => {
    for (let k = 1; k < 8; k++) {
      const seam = Array.from({ length: 34 }, (_, i) => ends[k]! + ((98 - ends[k]!) * i) / 33).map((dx) => pt(dx, strake(dx, k)));
      pen.hair(M(seam), 0.35, t.ink, FAR * 0.55);
      for (let dx = ends[k]! + 8 + ((k * 13) % 17); dx < 90; dx += 22 + pen.rng() * 10) pen.hair(M([pt(dx, strake(dx, k)), pt(dx, strake(dx, k + 1))]), 0.3, t.ink, FAR * 0.5);
    }
    // The wale, a heavy dark band under the rail, and the copper green along the waterline, torn in places.
    pen.fill(M([...Array.from({ length: 34 }, (_, i) => -60 + i * 5).map((dx) => pt(dx, sheer(dx) + 2.4)), ...Array.from({ length: 34 }, (_, i) => 105 - i * 5).map((dx) => pt(dx, sheer(dx) + 5.6))]), HULL_DARK, 0.5);
    const copper = M([pt(-60, -7), ...Array.from({ length: 10 }, (_, i) => pt(-50 + i * 15, -7.5 + 2.5 * Math.sin(i * 2.3))), pt(104, -6), pt(104, 8), pt(-60, 8)]);
    pen.fill(copper, COPPER, 0.5);
    pen.clipped(copper, () => {
      for (let dx = -60; dx < 104; dx += 4) pen.hair(M([pt(dx, -9), pt(dx, 6)]), 0.25, t.ink, FAR * 0.35);
      pen.hair(M([pt(-60, -3.5), pt(104, -3.5)]), 0.25, t.ink, FAR * 0.35);
    });
    pen.hatch(side, 1.6, 0.35, 0.4, { color: t.ink, alpha: FAR * 0.45, onlyBelow: P(0, -14).y });
    // Broken-backed: a split opening down her side by the mainmast, the planks sprung either side of it.
    const crack = [pt(-10, sheer(-10) - 1), pt(-6, -18), pt(-9, -13), pt(-4, -7), pt(-6, 7), pt(-1, 7), pt(0, -8), pt(-3, -13), pt(1, -19), pt(-4, sheer(-4) - 1)];
    pen.fill(M(crack), HULL_DARK, 0.85);
    pen.hair(M(crack), 0.4, t.ink, FAR * 0.8);
    for (const [dx, k] of [[-11, 2], [1, 3], [-12, 4], [2, 5]] as const) pen.hair(M([pt(dx, strake(dx, k)), pt(dx + (dx < -5 ? -6 : 6), strake(dx, k) - 1.2)]), 0.8, HULL, 0.9);
    // Rust bleeding from the bolts of the chainplates.
    for (const dx of [34, 40, 46, 52, -6, -12]) pen.hair(M([pt(dx, sheer(dx) + 3), pt(dx + 0.5, sheer(dx) + 12 + pen.rng() * 6)]), 0.6, RUST, 0.45);
  });
  // The rail, broken here and there, and the stump of the bowsprit with a rope dangling.
  pen.stroke(M(Array.from({ length: 31 }, (_, i) => ends[0]! + 2 + i * ((88 - ends[0]!) / 30)).map((dx) => pt(dx, sheer(dx) - 0.6))).filter((_, i) => i % 11 !== 7), 0.9, t.ink, FAR, false);
  spar(t, P(86, sheer(86) - 2), P(126, -56), 3.4 * s, 2.2 * s, true);
  pen.hair(bezier(P(122, -54), P(124, -40), P(119, -30), 6), 0.35, t.ink, FAR * 0.7);
}

/** The masts: the mainmast a stump, the foremast snapped high, its yard hanging askew with rags of sail, slack shrouds and stays. */
function rigging(t: Draw, P: (dx: number, dy: number) => Pt, sheer: (dx: number) => number, s: number): void {
  const { pen } = t;
  const fore = P(40, -122);
  const head = P(40.6, -110);
  // Shrouds from the masthead to the rail, one parted and hanging; a few ratlines still across them.
  const shrouds = [28, 34, 46, 52].map((dx) => P(dx, sheer(dx) - 1));
  shrouds.forEach((foot, i) => {
    if (i === 3) pen.hair(bezier(head, P(50, -86), P(47, -64), 8), 0.35, t.ink, FAR * 0.7);
    else pen.hair(bezier(head, pt((head.x + foot.x) / 2 + 1.5, (head.y + foot.y) / 2 + 2), foot, 8), 0.35, t.ink, FAR * 0.75);
  });
  for (let k = 1; k < 9; k++) {
    if (k % 3 === 2) continue;
    pen.hair([lerp(head, shrouds[0]!, k / 10), lerp(head, shrouds[2]!, k / 10)], 0.25, t.ink, FAR * 0.55);
  }
  // The forestay, slack, sagging to the broken bowsprit.
  pen.hair(bezier(head, P(84, -66), P(122, -55), 12), 0.35, t.ink, FAR * 0.7);
  spar(t, P(-16, sheer(-16) - 5), P(-18, -74), 4.6 * s, 3.8 * s, true);
  pen.hair(bezier(P(-17.6, -70), P(-30, -50), P(-28, -34), 6), 0.35, t.ink, FAR * 0.6);
  pen.hair(bezier(P(-17.6, -66), P(-6, -48), P(-2, sheer(-2) - 1), 6), 0.35, t.ink, FAR * 0.7);
  spar(t, P(40, sheer(40) - 5), fore, 5 * s, 3.6 * s, true);
  for (const dy of [-60, -84]) pen.hair([P(37.6, dy), P(42.6, dy)], 0.6, t.ink, FAR * 0.8);
  // The fore yard, one lift parted, hanging steeply across the mast; tatters of the sail hang from it, stirring to the right.
  const a = P(14, -86);
  const b = P(70, -114);
  spar(t, a, b, 2.6 * s, 2 * s, false);
  pen.hair([P(40.6, -118), b], 0.3, t.ink, FAR * 0.7);
  for (const [u, len, w] of [[0.12, 22, 6], [0.3, 12, 5], [0.48, 30, 8], [0.7, 16, 5], [0.86, 24, 6]] as const) {
    const top = lerp(a, b, u);
    const spine = cub(top, pt(top.x + 2 * s, top.y + len * 0.4 * s), pt(top.x + 5 * s, top.y + len * 0.7 * s), pt(top.x + (8 + pen.jitter(2)) * s, top.y + len * s), 8);
    const rag = ribbon(spine, (v) => w * s * (1 - v * 0.6));
    const ragged = [...rag.top, ...[...rag.bot].reverse()].map((p, i) => pt(p.x + (i % 3 === 1 ? pen.jitter(1.2) : 0), p.y + (i % 2 ? pen.jitter(1) : 0)));
    pen.fill(ragged, PAPER_FILL, 0.95);
    pen.fill(ragged, CANVAS, 0.75);
    pen.hair(rag.top, 0.35, t.ink, FAR * 0.7);
    pen.hair(rag.bot, 0.3, t.ink, FAR * 0.5);
  }
  pen.hair(bezier(P(66, -112), P(74, -96), P(70, -78), 6), 0.3, t.ink, FAR * 0.6);
}

/**
 * The stumps of an old pier running out into the water: weathered posts
 * at odd heights and leans, their tops split, dark and barnacled where the
 * tide washes them, a stringer still spanning a pair here and there.
 * Each post is [x, height, lean]. Returns the tops of the posts.
 */
export function pilings(t: Draw, posts: readonly (readonly [number, number, number])[], water: number): Pt[] {
  const { pen } = t;
  const tops = posts.map(([x, h, lean]) => pt(x + lean * h, water - h));
  posts.forEach(([x, h], i) => {
    const next = posts[i + 1];
    if (!next || h < 20 || next[1] < 20 || pen.rng() < 0.4) return;
    const y = water - Math.min(h, next[1]) * 0.75;
    washed(t, [pt(x, y), pt(next[0], y + 1), pt(next[0], y + 3.2), pt(x, y + 2.2)], PILING, 0.55, 0.4);
  });
  posts.forEach(([x, h], i) => {
    const top = tops[i]!;
    const post = tube([pt(x, water + 2), lerp(pt(x, water + 2), top, 0.5), top], 4.4, 3.6);
    washed(t, post, PILING, 0.6, 0.65);
    pen.clipped(post, () => {
      pen.fill(post.map((p) => pt(p.x + 2, p.y)), '#5f5648', 0.3);
      for (let k = 0; k < 3; k++) pen.hair([pt(x - 1 + k, water - h * 0.9), pt(x - 1 + k + pen.jitter(0.5), water)], 0.25, t.ink, FAR * 0.45);
      pen.fill([pt(x - 4, water - 5), pt(x + 4, water - 5), pt(x + 4, water + 3), pt(x - 4, water + 3)], '#3f3a30', 0.45);
      for (let k = 0; k < 6; k++) pen.dot(x + pen.jitter(1.6), water - 1 - pen.rng() * 4, 0.45, PAPER_FILL, 0.8);
    });
    pen.hair([pt(top.x - 1.8, top.y + 0.3), pt(top.x - 0.6, top.y - 0.8), pt(top.x + 0.4, top.y + 0.2), pt(top.x + 1.8, top.y - 0.4)], 0.4, t.ink, FAR * 0.8);
  });
  return tops;
}

/**
 * A ship's timber washed up the beach: a squared beam of bleached oak lying
 * from `a` to `b`, its top and front faces and sawn end showing, iron bolts
 * through it bleeding rust, a bent drift-bolt sticking out of the end.
 */
export function shipTimber(t: Draw, a: Pt, b: Pt, r: number): void {
  const { pen } = t;
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  const down = pt(-Math.sin(ang) * r * 2, Math.cos(ang) * r * 2);
  const back = pt(-r * 0.5, -r * 0.9);
  const at = (p: Pt, ...ds: Pt[]): Pt => ds.reduce((q, d) => pt(q.x + d.x, q.y + d.y), p);
  pen.fill([pt(a.x - r, a.y + r * 2.4), pt(b.x + r * 2, b.y + r * 2.4), pt(b.x + r * 3, b.y + r * 2.8), pt(a.x, a.y + r * 2.8)], t.ink, 0.1);
  const top = [a, b, at(b, back), at(a, back)];
  washed(t, top, '#efe8d6', 0.7, 0.5);
  const end = [a, at(a, down), at(a, down, back), at(a, back)];
  washed(t, end, TIMBER_SHADE, 0.45, 0.55);
  pen.clipped(end, () => {
    const mid = at(a, pt(down.x / 2 + back.x / 2, down.y / 2 + back.y / 2));
    for (const k of [0.4, 0.7, 1]) pen.hair(bezier(pt(mid.x - r * 0.6 * k, mid.y + r * 0.8 * k), pt(mid.x - r * 0.3 * k, mid.y - r * 0.2 * k), pt(mid.x + r * 0.5 * k, mid.y - r * 0.7 * k), 5), 0.3, t.ink, FAR * 0.55);
  });
  const front = [a, b, at(b, down), at(a, down)];
  washed(t, front, TIMBER, 0.7, 0.75);
  pen.clipped(front, () => {
    for (const k of [0.25, 0.5, 0.78]) pen.hair([lerp(a, at(a, down), k), lerp(b, at(b, down), k + pen.jitter(0.05))].map((p) => pt(p.x, p.y + pen.jitter(0.4))), 0.3, t.ink, FAR * 0.45);
    pen.hatch(front, 1.4, 0.3, 0.3, { color: t.ink, alpha: FAR * 0.35, onlyBelow: Math.min(a.y, b.y) + r * 1.1 });
    pen.hair([lerp(a, b, 0.55), lerp(a, b, 0.72)].map((p) => pt(p.x, p.y + r * 0.9)), 0.5, t.ink, FAR * 0.6);
  });
  // Bolt heads in pairs, each with its rust running down the face.
  for (let u = 0.12; u < 0.95; u += 0.2 + pen.rng() * 0.06) {
    for (const k of [0.3, 0.7]) {
      const p = lerp(lerp(a, b, u), lerp(at(a, down), at(b, down), u), k);
      pen.hair([p, pt(p.x + pen.jitter(0.4), p.y + r * (0.6 + pen.rng() * 0.6))], 0.9, RUST, 0.4);
      pen.dot(p.x, p.y, r * 0.18, '#3a302a', 0.85);
    }
  }
  const boltAt = at(a, pt(down.x / 2 + back.x / 2, down.y / 2 + back.y / 2));
  pen.stroke(bezier(boltAt, pt(boltAt.x - r * 1.6, boltAt.y - r * 0.2), pt(boltAt.x - r * 2.2, boltAt.y - r * 1.4), 6), 0.9, '#3a302a', 0.8, false);
  pen.hair([boltAt, pt(boltAt.x - r * 1.2, boltAt.y)], 0.6, RUST, 0.5);
}

/**
 * A whole tree thrown up on the beach and bleached white, as on the
 * boneyard beaches of the Gulf: the trunk lying from `a` (its root plate)
 * to `b`, snapped-off branches reaching up and out of it, forking.
 */
export function bleachedTree(t: Draw, a: Pt, b: Pt, r: number): void {
  const { pen } = t;
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const limbs: Pt[][] = [];
  for (const [u, ang, l] of [[0.34, -1.05, 0.22], [0.52, -0.75, 0.3], [0.7, -1.3, 0.16], [0.82, -0.6, 0.2]] as const) {
    const base = lerp(a, b, u);
    const from = pt(base.x, base.y - r * (1.2 - u * 0.4));
    const L = len * l;
    const tip = pt(from.x + Math.cos(ang) * L, from.y + Math.sin(ang) * L * 0.8);
    const limb = bezier(from, pt(from.x + Math.cos(ang + 0.3) * L * 0.5, from.y + Math.sin(ang - 0.2) * L * 0.5), tip, 8);
    limbs.push(limb);
    const fork = limb[5]!;
    const ang2 = ang + 0.55;
    limbs.push(bezier(fork, pt(fork.x + Math.cos(ang2) * L * 0.2, fork.y + Math.sin(ang2) * L * 0.2), pt(fork.x + Math.cos(ang2) * L * 0.42, fork.y + Math.sin(ang2) * L * 0.36), 6));
  }
  limbs.forEach((limb, i) => {
    const w = i % 2 ? r * 0.35 : r * 0.7;
    const shape = ribbon(limb, (v) => w * (1 - v * 0.65)).shape;
    washed(t, shape, BLEACHED, 0.7, 0.55);
    pen.hair(limb.slice(1, -1).map((p) => pt(p.x + w * 0.15, p.y)), 0.3, t.ink, FAR * 0.45);
    const tip = limb[limb.length - 1]!;
    pen.hair([pt(tip.x - w * 0.3, tip.y), pt(tip.x + pen.jitter(0.6), tip.y - w * 0.6), pt(tip.x + w * 0.3, tip.y)], 0.4, t.ink, FAR * 0.8);
  });
  driftLog(t, a, b, r, true);
}
