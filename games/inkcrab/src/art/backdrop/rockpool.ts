import { bezier, type Draw, oval, pt } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { BACKDROP_W, band, FAR, fadeBottom, tiled } from './common';
import { cottage, crabber, float, gull, headland, lighthouse, potStack, quay, scud, slipway } from './coast';
import { cliff, GRANITE, GRASS, joint, PINK, rock, through, thrift, woolsack } from './granite';
import { anemone, barnacles, creel, gutweed, kelp, limpet, mussels, pebbles, pool, rope, standingGull, starfish, weedMat, wrack } from './shoreLife';
import { swells } from './water';

/**
 * Beach 3: a cold, clean granite coast, Cornwall or Brittany. Far off, a
 * breezy pale sky with cumulus scudding before the wind and gulls on it;
 * then a slate-blue sea flecked with whitecaps, with a lighthouse on a far
 * headland; granite cliffs and sea stacks with seabirds on their ledges and
 * sea pinks on top, and a fishing village climbing the hill above its quay;
 * nearest, a granite shelf at low tide with rock pools, boulders draped in
 * wrack and kelp, barnacles, limpets, mussels, anemones and a crab pot.
 */
const W = BACKDROP_W;
const SKY = '#9ec0d8';
const SKY_PALE = '#dfe9ee';
const SEA = '#4d7893';
const SEA_GREEN = '#6c9c9e';
const GORSE = '#e2c04a';

/** A smooth wave that repeats exactly every tile, so anything shaped by it wraps seamlessly. */
const wave = (x: number, k: number, phase = 0): number => Math.sin((x / W) * Math.PI * 2 * k + phase);

export const ROCK_SKY_H = 220;
export const ROCK_SEA_H = 170;
export const CLIFFS_H = 300;
const SHORE_HEADROOM = 60;
export const SHELF_H = 250 + SHORE_HEADROOM;
const SHELF_GROUND = 200 + SHORE_HEADROOM;

export function sky(d: Draw): void {
  const H = ROCK_SKY_H;
  // A clear, rinsed blue overhead, paling towards the sea; both fade out at the layer's edges.
  band(d, 0, H * 0.45, SKY, 0.08, 0.36);
  band(d, H * 0.45, H, SKY, 0.36, 0);
  band(d, H * 0.55, H, SKY_PALE, 0, 0.35);
  tiled(d, 921, (t) => {
    const { pen } = t;
    // Fair-weather cumulus in streets along the wind, smaller and flatter towards the horizon.
    for (const [x, y, w, h] of [
      [120, 66, 170, 34], [430, 52, 120, 26], [880, 70, 190, 38],
      [260, 120, 96, 18], [560, 132, 120, 22], [760, 116, 80, 15], [990, 128, 90, 17],
      [60, 166, 60, 10], [380, 172, 74, 12], [660, 178, 52, 9], [860, 170, 66, 11],
      [200, 200, 40, 6], [520, 204, 46, 6], [760, 206, 34, 5], [960, 202, 40, 6],
    ] as const) scud(t, x, y, w, h);
    // The wind itself: long thin streaks.
    for (const [x, y, w] of [[250, 40, 150], [560, 120, 120], [40, 180, 110], [760, 30, 140], [600, 200, 160]] as const) {
      pen.hair(bezier(pt(x, y), pt(x + w / 2, y - 1.5), pt(x + w, y + 0.5), 10), 0.45, t.ink, FAR * 0.22);
    }
    for (const [x, y, s, flap, dir] of [[600, 88, 1.25, 0.2, 1], [646, 104, 0.9, 0.8, 1], [690, 80, 0.7, 0, -1], [300, 34, 0.8, 0.6, 1], [990, 156, 0.85, 0.1, -1], [40, 112, 0.6, 0.9, 1], [770, 40, 0.55, 0.3, 1]] as const) {
      gull(t, x, y, s, flap, dir);
    }
  });
}

const HORIZON = 44;

/** Whitecaps on a breezy sea: short flicks of white, bigger and further apart towards the viewer. */
function whitecaps(t: Draw, y0: number, y1: number, rows: number): void {
  const { pen } = t;
  for (let r = 0; r < rows; r++) {
    const k = r / Math.max(1, rows - 1);
    const y = y0 + (y1 - y0) * k ** 1.2;
    for (let x = (r * 53) % 40; x < W; x += 22 + 40 * k + pen.rng() * 30) {
      const len = 3 + 7 * k + pen.rng() * 3;
      const cy = y + pen.jitter(1 + k);
      pen.fill(oval(x + len * 0.5, cy + 1.2 + k, len * 0.7, 0.8 + k, 10), SEA, 0.12);
      pen.hair(bezier(pt(x, cy), pt(x + len * 0.35, cy - 1 - k), pt(x + len, cy + 0.3), 5), 0.9 + 0.8 * k, PAPER_FILL, 0.85);
      pen.hair(bezier(pt(x + 1, cy + 0.9 + k * 0.6), pt(x + len * 0.45, cy - 0.1), pt(x + len * 0.9, cy + 1), 4), 0.4, t.ink, FAR * (0.25 + 0.3 * k));
    }
  }
}

/** A bank of far cumulus sitting on the horizon: small pale heads with a flat grey base, broken into groups. */
function cloudBank(t: Draw, y: number): void {
  const { pen } = t;
  for (let x = 0; x < W; ) {
    const n = 3 + Math.floor(pen.rng() * 5);
    for (let k = 0; k < n; k++, x += 5 + pen.rng() * 5) {
      const r = 2.5 + pen.rng() * 4 * Math.sin((Math.PI * (k + 0.5)) / n);
      const head = oval(x, y - r * 0.6, r * 1.2, r, 14).filter((p) => p.y <= y);
      pen.fill([...head, pt(x + r * 1.2, y), pt(x - r * 1.2, y)], PAPER_FILL, 0.9);
      pen.hair(head.slice(0, 8).filter((p) => p.y < y - r * 0.4), 0.4, t.ink, FAR * 0.3);
    }
    pen.hair([pt(x - n * 8 - 4, y - 0.5), pt(x, y - 0.5)], 1.2, '#b9c4cc', 0.6);
    x += 30 + pen.rng() * 70;
  }
}

/** A gannet's dive: a narrow plume of white thrown up from the sea. */
function splash(t: Draw, x: number, y: number, s: number): void {
  const { pen } = t;
  for (let k = -2; k <= 2; k++) pen.hair(bezier(pt(x + k * 0.6 * s, y), pt(x + k * 1.2 * s, y - 4 * s), pt(x + k * 2 * s, y - 5 * s - Math.abs(k)), 4), 0.6, PAPER_FILL, 0.95);
  pen.hair(bezier(pt(x - 3 * s, y + 0.5), pt(x, y - 0.6), pt(x + 3 * s, y + 0.5), 4), 0.4, t.ink, FAR * 0.5);
}

/** The open sea: a far headland with its lighthouse, another with a coastguard lookout, and whitecaps. */
export function sea(d: Draw): void {
  const H = ROCK_SEA_H;
  band(d, HORIZON, H * 0.55, SEA, 0.5, 0.4);
  band(d, H * 0.55, H, SEA_GREEN, 0.4, 0.36);
  tiled(d, 922, (t) => {
    const { pen } = t;
    cloudBank(t, HORIZON - 2);
    const near = (pts: Pt[], x: number): number => pts.reduce((b, p) => (Math.abs(p.x - x) < Math.abs(b.x - x) ? p : b)).y;
    const far = headland(t, 420, 760, HORIZON, 24, 1);
    lighthouse(t, 732, near(far, 732) + 1, 1);
    const east = headland(t, 860, 1060, HORIZON, 12, -1);
    cottage(t, 888, near(east, 888) + 1, 0.35, '#f1ece0');
    // A low rock off the point, and the white of the sea breaking on it.
    const islet = [pt(790, HORIZON + 0.5), ...bezier(pt(790, HORIZON + 0.5), pt(800, HORIZON - 6), pt(814, HORIZON + 0.5), 8).slice(1)];
    pen.fill(islet, '#8d9ca3', 0.5);
    pen.hair(islet, 0.5, t.ink, FAR * 0.7);
    pen.hair([pt(786, HORIZON + 1), pt(819, HORIZON + 1)], 1, PAPER_FILL, 0.9);
    pen.stroke([pt(-20, HORIZON), pt(W + 20, HORIZON)], 1, t.ink, FAR, false);
    swells(t, HORIZON + 4, HORIZON + 34);
    whitecaps(t, HORIZON + 5, H - 6, 10);
    splash(t, 610, HORIZON + 22, 1);
    splash(t, 980, HORIZON + 40, 0.8);
  });
}

const WATER = CLIFFS_H - 50;

/** Surf boiling at the foot of the rock: a broken white band with spray thrown up. */
function foam(t: Draw, x0: number, x1: number, y: number): void {
  const { pen } = t;
  for (let x = x0; x < x1; x += 5 + pen.rng() * 10) {
    if (pen.rng() < 0.3) continue;
    const w = 3 + pen.rng() * 12;
    const lift = 1 + pen.rng() * 4;
    pen.hair(bezier(pt(x, y + 1 + pen.jitter(1)), pt(x + w * (0.3 + pen.rng() * 0.4), y - lift), pt(x + w, y + pen.jitter(1)), 5), 0.8 + pen.rng() * 0.8, PAPER_FILL, 0.95);
    pen.hair(bezier(pt(x + 1, y + 2), pt(x + w * 0.5, y - 0.5), pt(x + w, y + 1.5), 5), 0.4, t.ink, FAR * 0.45);
    if (pen.rng() < 0.25) for (let k = 0; k < 4; k++) pen.dot(x + pen.rng() * w, y - 3 - pen.rng() * 6, 0.5, PAPER_FILL, 0.9);
  }
}

/** The hill above the harbour: small walled fields climbing to a granite outcrop, gorse in flower. */
function hill(t: Draw, x0: number, x1: number, height: (x: number) => number): Pt[] {
  const { pen } = t;
  const top: Pt[] = [];
  for (let x = x0; x <= x1; x += 4) top.push(pt(x, WATER - height(x)));
  const shape = [...top, pt(x1, WATER + 2), pt(x0, WATER + 2)];
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, GRASS, 0.42);
  pen.clipped(shape, () => {
    // Stone hedges between the fields, running up and across the slope.
    for (let x = x0 + 30; x < x1 - 20; x += 34 + pen.rng() * 30) pen.hair([pt(x, WATER - height(x) - 2), pt(x + 4 + pen.jitter(3), WATER - height(x) * 0.5), pt(x + 2 + pen.jitter(6), WATER)], 0.5, t.ink, FAR * 0.4);
    for (let k = 0; k < 4; k++) {
      const u = 0.25 + k * 0.17;
      const line = top.map((p) => pt(p.x, WATER - (WATER - p.y) * (1 - u)));
      pen.hair(line.filter((_, i) => i % 9 < 6), 0.45, t.ink, FAR * 0.35);
    }
    for (let k = 0; k < (x1 - x0) / 5; k++) {
      const x = x0 + pen.rng() * (x1 - x0);
      const y = WATER - height(x) * (0.2 + pen.rng() * 0.75);
      pen.fill(oval(x, y, 2.6, 1.6, 8), pen.rng() < 0.35 ? GORSE : '#6f8f4c', 0.45);
    }
    pen.hatch(shape, 1.8, 1.15, 0.35, { color: t.ink, alpha: FAR * 0.18 });
  });
  pen.stroke(top, 0.9, t.ink, FAR, false);
  return top;
}

/** A granite church tower with corner pinnacles, standing over the village. */
function churchTower(t: Draw, x: number, ground: number, s: number): void {
  const { pen } = t;
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, ground + dy * s);
  const tower = [P(-5, 0), P(5, 0), P(4.6, -30), P(-4.6, -30)];
  rock(t, tower, { fade: 0.9, lichen: 1, hatch: false });
  pen.clipped(tower, () => {
    for (let y = -4; y > -30; y -= 3.5) pen.hair([P(-5, y), P(5, y)], 0.3, t.ink, FAR * 0.35);
    pen.fill([P(2, 0), P(6, 0), P(6, -31), P(1.8, -31)], '#687792', 0.25);
  });
  pen.fill([P(-1, -24), P(1, -24), P(1, -20), P(-1, -20)], t.ink, FAR * 0.8);
  for (const dx of [-4.6, -1.6, 1.6, 4.6]) {
    const pin = [P(dx - 0.9, -30), P(dx + 0.9, -30), P(dx, -34)];
    pen.fill(pin, GRANITE, 0.8);
    pen.hair([...pin, pin[0]!], 0.4, t.ink, FAR);
  }
}

/**
 * Granite cliffs to the left with a summit of piled woolsacks, sea stacks
 * off the point, and a fishing village climbing the hill above its quay,
 * a crabber at her mooring and pot buoys bobbing.
 */
export function cliffs(d: Draw): void {
  band(d, WATER - 10, WATER + 6, SEA_GREEN, 0, 0.4);
  band(d, WATER + 6, CLIFFS_H, SEA_GREEN, 0.4, 0.34);
  tiled(d, 923, (t) => {
    const hillH = through([[556, 0], [566, 16], [620, 22], [700, 28], [790, 42], [880, 64], [950, 76], [1010, 66]]);
    hill(t, 556, 1010, hillH);
    churchTower(t, 930, WATER - hillH(930) + 3, 1.1);
    for (const [x, wash, wide] of [[598, '#f1ece0', 1.1], [624, '#e8c7bb', 0.9], [650, '#f1ece0', 1.3], [684, '#eedca0', 1], [712, '#f1ece0', 1.2], [744, '#c5d6dc', 0.9], [774, '#f1ece0', 1.1], [806, '#e8c7bb', 1], [840, '#f1ece0', 1.4], [878, '#f1ece0', 0.9]] as const) {
      cottage(t, x, WATER - hillH(x) + 5, 1, wash, wide);
    }
    slipway(t, 560, WATER - 14, 600, WATER);
    // The main cliff, running off the left edge into the next tile's hill.
    // The main cliff climbs out of the next tile's hill, so it starts low at the left.
    const main = through([[-62, 0], [-44, 58], [-10, 74], [40, 112], [90, 128], [150, 142], [200, 124], [250, 136], [300, 106], [345, 90], [372, 0]]);
    cliff(t, { x0: -62, x1: 374, foot: WATER, height: main, joints: [-30, 12, 50, 94, 140, 186, 232, 278, 318, 352], birds: 0.55 });
    for (const [x, rx, ry] of [[150, 20, 9], [168, 9, 6], [252, 15, 8], [56, 10, 5]] as const) {
      const base = WATER - main(x) + 4;
      const shape = woolsack(t, x, base - ry, rx, ry, 3.4, base + 2);
      rock(t, shape, { lichen: 1, fade: 0.9 });
      joint(t, [pt(x + rx * 0.3, base - ry * 1.8), pt(x + rx * 0.25, base)], 0.6);
    }
    // Sea stacks off the point.
    cliff(t, { x0: 402, x1: 452, foot: WATER, height: through([[402, 0], [408, 92], [422, 104], [440, 96], [447, 80], [452, 0]]), joints: [418, 436], birds: 0.8 });
    cliff(t, { x0: 484, x1: 516, foot: WATER, height: through([[484, 0], [489, 50], [502, 58], [511, 46], [516, 0]]), joints: [500], birds: 0.6 });
    cliff(t, { x0: 536, x1: 556, foot: WATER, height: through([[536, 0], [540, 20], [550, 16], [556, 0]]), joints: [], turf: false });
    for (const [x0, x1] of [[-60, 376], [398, 456], [480, 520], [532, 560]] as const) foam(t, x0, x1, WATER);
    // The harbour: a crabber at her mooring off the slip, pot buoys, and the quay with its pots.
    crabber(t, 650, WATER + 1, 1.1);
    for (const [x, flag] of [[612, false], [622, true], [690, false], [470, true], [576, false]] as const) float(t, x, WATER + 3, 0.9, flag);
    quay(t, 700, 900, WATER + 2, 16);
    potStack(t, 800, WATER - 14, 5, 3, 1);
    potStack(t, 860, WATER - 14, 3, 2, 1);
    whitecaps(t, WATER + 10, CLIFFS_H - 10, 4);
    gull(t, 470, WATER - 130, 0.6, 0.4);
    gull(t, 520, WATER - 96, 0.5, 0.9, -1);
  });
  fadeBottom(d, CLIFFS_H, 30);
}

/** A ledge of the shelf behind the floor: a blocky slab whose foot the floor hides. Returns its top lip. */
function ledge(t: Draw, x0: number, x1: number, h: number, ground: number, weed = 0.4): Pt[] {
  const shape = woolsack(t, (x0 + x1) / 2, ground - h / 2 + 8, (x1 - x0) / 2, h / 2 + 8, 5);
  rock(t, shape, { lichen: Math.round((x1 - x0) / 40), fade: 0.85 });
  const { pen } = t;
  const p = pen.rng() * 6;
  barnacles(t, shape, x0, x1, ground - h * weed - 8, ground - h * weed + 4, Math.round((x1 - x0) * 0.8));
  // Weed in a few patches along it, not one even skirt.
  for (let a = x0 + pen.rng() * 10; a < x1 - 12; ) {
    const b = Math.min(x1, a + 30 + pen.rng() * 60);
    weedMat(t, shape, a, b, (x) => ground - h * weed * (0.6 + 0.4 * Math.sin((Math.PI * (x - a)) / (b - a))) + 3 * Math.sin(x * 0.05 + p), ground + 10);
    a = b + 6 + pen.rng() * 26;
  }
  const cols = Math.round((x1 - x0) / 34);
  for (let k = 1; k < cols; k++) {
    const x = x0 + ((x1 - x0) * k) / cols + pen.jitter(6);
    joint(t, [pt(x, ground - h + 3), pt(x + pen.jitter(3), ground - h * 0.5), pt(x + pen.jitter(3), ground)], 0.7);
  }
  joint(t, bezier(pt(x0 + 8, ground - h * 0.45), pt((x0 + x1) / 2, ground - h * 0.5 + pen.jitter(3)), pt(x1 - 8, ground - h * 0.42), 10), 0.5);
  const cy = ground - h / 2 + 8;
  return shape.filter((p) => p.y < cy - (h / 2 + 8) * 0.75).sort((a, b) => a.x - b.x);
}

/** The shelf floor: a broad wet granite pavement, bedded and cracked, crusted with barnacles. */
function floor(t: Draw, top: (x: number) => number): void {
  const { pen } = t;
  const edge: Pt[] = [];
  for (let x = -20; x <= W + 20; x += 8) edge.push(pt(x, top(x)));
  const shape = [...edge, pt(W + 20, SHELF_H), pt(-20, SHELF_H)];
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, GRANITE, 0.4);
  pen.fill([...edge, ...[...edge].reverse().map((p) => pt(p.x, p.y + 6))], PINK, 0.3);
  pen.fill([...edge.map((p) => pt(p.x, p.y + 14)), pt(W + 20, SHELF_H), pt(-20, SHELF_H)], '#7d8a8c', 0.18);
  pen.stipple(shape, 2600, (_, y) => Math.max(0, 1 - (y - SHELF_GROUND) / 50) * 0.7, 0.32, '#5f626e');
  barnacles(t, shape, -20, W + 20, SHELF_GROUND - 6, SHELF_GROUND + 12, 260);
  for (let k = 0; k < 3; k++) {
    const y = (x: number): number => top(x) + 9 + k * 9 + 1.5 * wave(x, 4 + k, k);
    const run: Pt[] = [];
    for (let x = -20; x <= W + 20; x += 10) run.push(pt(x, y(x)));
    for (let i = 0; i + 6 < run.length; i += 9) joint(t, run.slice(i, i + 6), 0.45);
  }
  for (let x = 30; x < W; x += 60 + pen.rng() * 50) joint(t, [pt(x, top(x) + 2), pt(x + pen.jitter(4), top(x) + 14), pt(x + pen.jitter(6), top(x) + 32)], 0.5);
  pen.stroke(edge, 1.1, t.ink, FAR, false);
}

/**
 * A boulder sitting on the shelf: lichen on its dry crown, a band of
 * barnacles, and wrack slumped over its lower half (`weed`: how far up, 0..1).
 * Returns its outline.
 */
function boulder(t: Draw, x: number, ground: number, rx: number, ry: number, weed = 0.5): Pt[] {
  const { pen } = t;
  // Lumpy and lopsided, flattened on top where it split along a joint.
  const shape = woolsack(t, x, ground - ry + 4, rx, ry, 2.3, ground + 4, 1.6).map((p) => pt(p.x, Math.max(p.y, ground + 4 - ry * 1.85)));
  rock(t, shape, { lichen: 1 + Math.round(rx / 30), fade: 0.85 });
  joint(t, bezier(pt(x - rx * 0.2, ground - ry * 1.8), pt(x + rx * 0.05, ground - ry), pt(x - rx * 0.1, ground - ry * 0.3), 8), 0.55);
  const line = ground + 4 - ry * 2 * weed;
  barnacles(t, shape, x - rx, x + rx, line - ry * 0.35, line + 3, Math.round(rx * 1.6));
  if (weed > 0) {
    const p = pen.rng() * 6;
    weedMat(t, shape, x - rx - 2, x + rx + 2, (xx) => line + 3 * Math.sin(xx * 0.08 + p) + 0.002 * (xx - x) ** 2, ground + 6);
  }
  return shape;
}

/**
 * The granite shelf at low tide: ledges stepping up to the right, a floor
 * of wet rock with rock pools, boulders draped in wrack and kelp, mussels,
 * limpets, anemones, a starfish, a withy pot on its rope, and a gull.
 */
export function shelf(d: Draw): void {
  const G = SHELF_GROUND;
  const top = (x: number): number => G - 3 * wave(x, 3, 0.4) - 2 * wave(x, 7, 1.1);
  tiled(d, 924, (t) => {
    // Ledges behind, stepping up to the right.
    ledge(t, -24, 150, 30, G, 0.5);
    ledge(t, 646, 776, 36, G, 0.45);
    const l2 = ledge(t, 742, 892, 60, G, 0.35);
    const l3 = ledge(t, 870, 1004, 44, G, 0.5);
    kelp(t, pt(640, G + 2), G + 6, 34, 5.5, -1);
    const l2Top = Math.min(...l2.map((p) => p.y));
    standingGull(t, 790, l2Top + 3, 1.25);
    for (const x of [918, 944]) thrift(t, x, Math.min(...l3.filter((p) => Math.abs(p.x - x) < 6).map((p) => p.y)) + 1.5, 1.1);
    floor(t, top);
    // A pool in the floor at the left, another in front of the ledges.
    pool(t, 104, 236, top(170) + 4, 8);
    for (const [x, s] of [[130, 1], [176, 0.8], [210, 1.1]] as const) anemone(t, x, top(170) + 13, s, true);
    pool(t, 806, 900, top(850) + 4, 6);
    gutweed(t, 102, top(102) + 4, 1);
    gutweed(t, 242, top(242) + 3, 0.8);
    gutweed(t, 904, top(904) + 4, 1);
    // The boulder heap in the middle.
    boulder(t, 432, top(432) + 4, 54, 38, 0.55);
    boulder(t, 360, top(360) + 6, 32, 22, 0.6);
    boulder(t, 522, top(522) + 6, 40, 28, 0.45);
    kelp(t, pt(556, top(556) + 2), top(556) + 7, 36, 5.5, 1);
    starfish(t, 506, top(506) - 30, 6, 0.4);
    for (const [x, y, s] of [[452, 52, 0.9], [470, 46, 1], [418, 58, 0.8], [350, 30, 0.9], [536, 40, 0.8], [492, 44, 0.7]] as const) limpet(t, x, top(x) - y, s);
    mussels(t, 396, top(396) + 7, 46, 7, 50);
    mussels(t, 484, top(484) + 7, 34, 6, 36);
    mussels(t, 576, top(576) + 6, 26, 5, 22);
    for (const [x, s] of [[318, 1], [470, 1.1], [576, 0.9], [612, 0.8], [760, 1]] as const) anemone(t, x, top(x) + 6, s);
    // Small boulders scattered along the shelf.
    for (const [x, rx, ry, weed] of [[60, 16, 11, 0.6], [276, 14, 9, 0], [714, 18, 12, 0.7], [978, 20, 13, 0.5]] as const) boulder(t, x, top(x) + 5, rx, ry, weed);
    // A withy pot left on the rock, its rope trailing off along the shelf.
    const tie = creel(t, 650, top(650) + 9, 1.2);
    rope(t, bezier(tie, pt(622, top(622) + 16), pt(586, top(586) + 13), 12));
    rope(t, bezier(pt(586, top(586) + 13), pt(560, top(560) + 14), pt(536, top(536) + 18), 8));
    float(t, 676, top(676) + 11, 1.3);
    pebbles(t, 240, 312, (x) => top(x) + 8, 16);
    pebbles(t, 666, 730, (x) => top(x) + 9, 12);
    pebbles(t, 930, 1000, (x) => top(x) + 8, 14);
    wrack(t, pt(286, top(286) + 12), 6, 0.1, 2, 2);
    wrack(t, pt(748, top(748) + 12), 6, 2.9, 2, 2);
  });
  fadeBottom(d, SHELF_H, 40);
}
