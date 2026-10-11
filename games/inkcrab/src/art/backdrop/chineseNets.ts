import { bezier, type Draw, lerp, oval, pt, tube } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { edges, FAR } from './common';

/**
 * The harbour front of Fort Kochi: the Chinese fishing nets (cheena vala),
 * huge cantilevered lift nets on teak-pole frames, each rocking on its
 * trestle at the water's edge, the square net slung beneath four
 * spreaders at the boom's tip and balanced by granite stones hung on
 * ropes at the landward end; and the village behind, fishermen's huts on
 * stilts under palm thatch, houses with steep tiled roofs and verandahs,
 * and a whitewashed church front.
 */
const TEAK = '#9b7a52';
const TEAK_DARK = '#5f4a33';
const NET = '#5d6f6a';
const STONE = '#a29d92';
const THATCH = '#a38a58';
const THATCH_DARK = '#6f5c38';
const MAT = '#c7ad78';
const TILE = '#b2603f';
const LIME = '#f2ede1';
const DOOR = '#3d4660';

/** A shape on paper under a wash, its edge inked. */
function washed(t: Draw, shape: readonly Pt[], color: string, alpha: number, w = 0.5, ink = 1): void {
  t.pen.fill(shape, PAPER_FILL, 1);
  t.pen.fill(shape, color, alpha);
  t.pen.stroke(edges(shape, 2), w, t.ink, FAR * ink, false);
}

/** A pole as a tapering tube of teak, inked. */
function pole(t: Draw, a: Pt, b: Pt, w0: number, w1: number): void {
  washed(t, tube([a, lerp(a, b, 0.5), b], w0, w1), TEAK, 0.7, 0.4);
}

/** The net: a square of mesh sagging between the spreaders' tips, drawn at `alpha` (faint under water). */
function netSling(t: Draw, a: Pt, b: Pt, sag: number, s: number, alpha: number): void {
  const { pen } = t;
  const mid = pt((a.x + b.x) / 2, Math.max(a.y, b.y) + sag);
  const belly = bezier(a, mid, b, 14);
  const rim = bezier(a, pt(mid.x, (a.y + b.y) / 2 + sag * 0.3), b, 10);
  const shape = [...belly, ...[...rim].reverse().slice(1)];
  pen.fill(shape, PAPER_FILL, 0.5 * alpha);
  pen.fill(shape, NET, 0.3 * alpha);
  pen.clipped(shape, () => {
    pen.hatch(shape, 1.1 * s, 1.0, 0.25, { color: t.ink, alpha: FAR * 0.55 * alpha });
    pen.hatch(shape, 1.1 * s, Math.PI - 1.0, 0.25, { color: t.ink, alpha: FAR * 0.55 * alpha });
  });
  pen.hair(belly, 0.45, t.ink, FAR * alpha);
  pen.hair(rim, 0.35, t.ink, FAR * 0.6 * alpha);
}

/**
 * A Chinese fishing net, side-on, facing out over the water to the right
 * (`dir` -1 faces left): a platform on stilts, an A-frame trestle the boom
 * rocks on, the long boom with its spreaders and the net slung beneath
 * them, stays to a short king post, and the stones on ropes at the
 * landward end. `lift` runs from 0 (net down in the water) to 1 (hauled up,
 * dripping).
 */
export function chineseNet(t: Draw, x: number, water: number, s: number, lift: number, dir: 1 | -1 = 1): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s * dir, water + dy * s);
  const deck = -8;
  // The platform: planks on stilts, running back to the land.
  for (const dx of [-34, -26, -18, -10, -2, 4]) pen.hair([P(dx, deck), P(dx + 0.4, 2)], 0.6, t.ink, FAR * 0.85);
  washed(t, [P(-38, deck - 1.4), P(6, deck - 1.4), P(6, deck + 0.4), P(-38, deck + 0.4)], TEAK, 0.6, 0.4);
  // The trestle the boom pivots on.
  const pivot = P(-2, deck - 16);
  pole(t, P(-8, deck), pivot, 1.6 * s, 1.1 * s);
  pole(t, P(4, deck), pivot, 1.6 * s, 1.1 * s);
  const ang = 0.17 - 0.85 * lift;
  const along = (len: number): Pt => pt(pivot.x + Math.cos(ang) * len * s * dir, pivot.y + Math.sin(ang) * len * s);
  const tip = along(68);
  const rear = along(-24);
  const king = pt(pivot.x - 4 * s * dir, pivot.y - 20 * s);
  // Spreaders from the tip, and the net slung between their ends.
  const spread = (dx: number, dy: number): Pt => pt(tip.x + dx * s * dir, tip.y + dy * s);
  const fore = spread(26, 28);
  const aft = spread(-24, 30);
  const clipAbove = [pt(x - 200, water - 400), pt(x + 200, water - 400), pt(x + 200, water), pt(x - 200, water)];
  const clipBelow = [pt(x - 200, water), pt(x + 200, water), pt(x + 200, water + 200), pt(x - 200, water + 200)];
  pen.clipped(clipBelow, () => netSling(t, aft, fore, 18 * s, s, 0.3));
  pen.clipped(clipAbove, () => netSling(t, aft, fore, 18 * s, s, 1));
  for (const end of [fore, aft]) pen.stroke([tip, end], 0.6 * s, TEAK_DARK, 0.8, false);
  pen.hair([tip, spread(1, 34)], 0.3, t.ink, FAR * 0.5);
  if (lift > 0.6) for (let k = 0; k < 6; k++) {
    const p = lerp(aft, fore, 0.15 + pen.rng() * 0.7);
    pen.hair([pt(p.x, p.y + 14 * s), pt(p.x, Math.min(water, p.y + 22 * s))], 0.3, PAPER_FILL, 0.8);
  }
  // The boom: two poles lashed side by side.
  pole(t, rear, tip, 2.4 * s, 1.2 * s);
  pen.hair([pt(rear.x, rear.y - 1.4 * s), pt(tip.x, tip.y - 0.7 * s)], 0.35, TEAK_DARK, 0.7);
  // The king post and its stays to the tip and the rear.
  pole(t, pivot, king, 1.4 * s, 0.9 * s);
  pen.hair([king, tip], 0.35, t.ink, FAR * 0.8);
  pen.hair([king, rear], 0.35, t.ink, FAR * 0.8);
  pen.hair([king, along(30)], 0.3, t.ink, FAR * 0.6);
  // The counterweights: granite stones strung on ropes hanging from the rear of the boom.
  for (let k = 0; k < 5; k++) {
    const top = lerp(rear, pivot, k * 0.18);
    const end = pt(top.x, Math.min(P(0, deck - 2).y, top.y + (12 + k * 2) * s));
    pen.hair([top, end], 0.35, t.ink, FAR * 0.8);
    for (let j = 0; j < 1 + (k % 2); j++) {
      const at = lerp(top, end, 0.55 + j * 0.4);
      washed(t, oval(at.x, at.y, (1.7 + pen.rng() * 0.6) * s, (1.4 + pen.rng() * 0.4) * s, 9), STONE, 0.6, 0.35);
    }
  }
}

/**
 * A fisherman's hut on stilts at the water's edge: posts, a floor of
 * planks, walls of woven palm matting, and a steep hipped roof of palm
 * thatch hanging low over them.
 */
export function stiltHut(t: Draw, x: number, water: number, s: number): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, water + dy * s);
  for (const dx of [-10, -4, 3, 9]) pen.hair([P(dx, -8), P(dx + 0.3, 1.5)], 0.55, t.ink, FAR * 0.85);
  pen.hair([P(-10, -2), P(-4, -7)], 0.3, t.ink, FAR * 0.6);
  pen.hair([P(3, -7), P(9, -2)], 0.3, t.ink, FAR * 0.6);
  const wall = [P(-10, -8), P(10, -8), P(10, -17), P(-10, -17)];
  washed(t, wall, MAT, 0.6, 0.45);
  pen.clipped(wall, () => {
    for (let dx = -9; dx < 10; dx += 1.4) pen.hair([P(dx, -8), P(dx, -17)], 0.25, t.ink, FAR * 0.4);
    pen.fill([P(-3, -8), P(1, -8), P(1, -14.5), P(-3, -14.5)], DOOR, 0.55);
  });
  washed(t, [P(-12, -7), P(12, -7), P(12, -8.4), P(-12, -8.4)], TEAK, 0.6, 0.4);
  const roof = [P(-14.5, -15), P(14.5, -15), P(5, -27), P(-5, -27)];
  washed(t, roof, THATCH, 0.6, 0.55);
  pen.clipped(roof, () => {
    for (let k = 0; k < 40; k++) {
      const u = pen.rng();
      const top = lerp(P(-5, -27), P(5, -27), u);
      const foot = lerp(P(-14.5, -15), P(14.5, -15), u);
      const a = lerp(top, foot, pen.rng() * 0.6);
      pen.hair([a, lerp(a, foot, 0.4 + pen.rng() * 0.6)], 0.3, THATCH_DARK, 0.7);
    }
  });
  pen.hair(bezier(P(-14.5, -15), P(0, -14), P(14.5, -15), 8), 0.6, THATCH_DARK, 0.8);
}

/**
 * A Kerala house: limewashed or colour-washed walls under a verandah on
 * posts, a dark door and shuttered windows, and a steep hipped roof of
 * terracotta tiles with a little gablet at the ridge.
 */
export function tiledHouse(t: Draw, x: number, ground: number, s: number, wall: string, wide = 1): void {
  const { pen } = t;
  const w = 13 * wide;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, ground + dy * s);
  const body = [P(-w, 0), P(w, 0), P(w, -11), P(-w, -11)];
  washed(t, body, wall, 0.5, 0.45);
  pen.clipped(body, () => {
    pen.fill([P(-w, -2), P(w, -2), P(w, 0), P(-w, 0)], '#8f6a50', 0.4);
    pen.fill([P(-2, 0), P(2, 0), P(2, -7.5), P(-2, -7.5)], DOOR, 0.6);
    for (const dx of [-w + 3, w - 7]) {
      const win = [P(dx, -4), P(dx + 4, -4), P(dx + 4, -8), P(dx, -8)];
      pen.fill(win, DOOR, 0.5);
      pen.hair([P(dx + 2, -4), P(dx + 2, -8)], 0.3, PAPER_FILL, 0.7);
    }
  });
  for (const dx of [-w + 1, -w * 0.33, w * 0.33, w - 1]) pen.hair([P(dx, 0), P(dx, -11)], 0.45, t.ink, FAR * 0.8);
  const roof = [P(-w - 4, -10), P(w + 4, -10), P(w * 0.45, -22), P(-w * 0.45, -22)];
  washed(t, roof, TILE, 0.58, 0.55);
  pen.clipped(roof, () => {
    for (let y = -11.4; y > -22; y -= 1.6) {
      const row: Pt[] = [];
      for (let dx = -w - 4; dx <= w + 4; dx += 1.6) row.push(P(dx, y + ((dx * 10) % 2 === 0 ? 0 : 0.35)));
      pen.hair(row, 0.3, '#6f3424', 0.5);
    }
    pen.hatch(roof, 1.4, 1.2, 0.3, { color: t.ink, alpha: FAR * 0.25, onlyBelow: ground - 16 * s });
  });
  const gablet = [P(-w * 0.2, -22), P(w * 0.2, -22), P(0, -25.5)];
  washed(t, gablet, '#e7dcc4', 0.6, 0.45);
  pen.hair([P(-w * 0.45, -22), P(w * 0.45, -22)], 0.5, t.ink, FAR);
}

/**
 * A Portuguese-era church front, whitewashed: a tall gable with a scrolled
 * pediment and a cross, pilasters, an arched door and a round window, the
 * long tiled roof of the nave behind.
 */
export function churchFront(t: Draw, x: number, ground: number, s: number): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, ground + dy * s);
  const nave = [P(0, -16), P(30, -16), P(30, -26), P(4, -26)];
  washed(t, [P(0, 0), P(30, 0), P(30, -16), P(0, -16)], LIME, 0.6, 0.45);
  washed(t, nave, TILE, 0.55, 0.5);
  const front = [P(-10, 0), P(10, 0), P(10, -24), ...bezier(P(10, -24), P(9, -30), P(5, -31), 5).slice(1), P(4, -36), ...bezier(P(4, -36), P(0, -40), P(-4, -36), 6).slice(1), P(-5, -31), ...bezier(P(-5, -31), P(-9, -30), P(-10, -24), 5).slice(1)];
  washed(t, front, LIME, 0.75, 0.6, 1.1);
  pen.clipped(front, () => {
    pen.fill([P(4, 0), P(12, 0), P(12, -42), P(4, -42)], '#7d86a0', 0.2);
    for (const dx of [-8, 8]) pen.hair([P(dx, 0), P(dx, -24)], 0.4, t.ink, FAR * 0.6);
    pen.hair([P(-10, -24), P(10, -24)], 0.45, t.ink, FAR * 0.7);
  });
  const door = [P(-3, 0), P(3, 0), P(3, -8), ...bezier(P(3, -8), P(0, -12), P(-3, -8), 6).slice(1)];
  pen.fill(door, DOOR, 0.6);
  const rose = oval(x, ground - 18 * s, 2 * s, 2 * s, 12);
  pen.fill(rose, DOOR, 0.45);
  pen.hair(edges(rose), 0.35, t.ink, FAR);
  pen.stroke([P(0, -39.5), P(0, -45)], 0.6 * s, t.ink, FAR * 1.1, false);
  pen.stroke([P(-1.8, -43.5), P(1.8, -43.5)], 0.6 * s, t.ink, FAR * 1.1, false);
}
