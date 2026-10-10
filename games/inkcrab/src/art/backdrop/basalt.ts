import { bezier, type Draw, oval, pt } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { BACKDROP_W, band, FAR, fadeBottom, tiled } from './common';
import { glow } from './estuary';
import { driftwood } from './beach';
import { candelabra, iguanaHeap, opuntia, paloSanto, seaLion, sesuvium } from './galapagos';
import { BASALT, basaltRock, cinderCone, columnCliff, farIsle, plume, ropes, seaArch, shieldVolcano, smokeWisp, steam, sulphurVent, tuffCone } from './lava';
import { woolsack } from './granite';
import { cloud } from './tropic';
import { swells } from './water';

/**
 * Beach 5: a young volcanic coast, the Galápagos, dry and sunny. Far off, a
 * hard bright sky with a few fair-weather clouds and rags of volcanic haze
 * drifting on the wind, frigatebirds hanging on it; then the deep blue
 * Pacific under a broad shield volcano, black flows streaking its flanks,
 * cinder cones, its summit smoking, a low island and a yacht; basalt cliffs
 * in hexagonal columns, a sea arch, an eroded tuff cone and a black lava
 * field with tree cactus, candelabra cactus and pale palo santo, fumaroles
 * steaming and white surf on black rock, boobies and pelicans flying low;
 * nearest, black sand and ropy pahoehoe with rock pools, sesuvium, a heap
 * of marine iguanas, a sea lion asleep, a sulphur vent and bleached
 * driftwood. (No small creatures nearby: the level's own lava lizards and
 * Sally Lightfoot crabs must never be mistaken for scenery.)
 */
const W = BACKDROP_W;
const SKY = '#7fb6de';
const SKY_PALE = '#dcedf3';
const SEA = '#2f6d9e';
const SEA_TEAL = '#4f8aa8';
const SAND = '#6f6a65';
const SAND_GRAIN = '#3b3835';
const POOL = '#8fb8c8';

/** A smooth wave that repeats exactly every tile, so anything shaped by it wraps seamlessly. */
const wave = (x: number, k: number, phase = 0): number => Math.sin((x / W) * Math.PI * 2 * k + phase);

export const BASALT_SKY_H = 220;
/** Taller than other seas: the volcano and its plume stand well above the horizon. */
export const BASALT_SEA_H = 300;
export const LAVA_CLIFFS_H = 300;
const SHORE_HEADROOM = 70;
export const LAVA_SHORE_H = 250 + SHORE_HEADROOM;
const SHORE_GROUND = 200 + SHORE_HEADROOM;

export function sky(d: Draw): void {
  const H = BASALT_SKY_H;
  // A hard, clean equatorial blue, deep overhead, paling only near the sea.
  band(d, 0, H * 0.5, SKY, 0.2, 0.44);
  band(d, H * 0.5, H, SKY, 0.44, 0.08);
  band(d, H * 0.6, H, SKY_PALE, 0, 0.4);
  tiled(d, 951, (t) => {
    const { pen } = t;
    // A small, fierce sun: a white disc in a tight glare, its rim inked in broken arcs.
    glow(t, 820, 52, 70, 60, '#fff1c2', 0.55);
    glow(t, 820, 52, 26, 26, '#fffaf0', 0.95);
    pen.fill(oval(820, 52, 12, 12, 24), PAPER_FILL, 1);
    const rim = oval(820, 52, 13, 13, 36);
    for (let i = 0; i < 36; i += 6) pen.hair(rim.slice(i, i + 4), 0.8, t.ink, FAR * 0.6);
  });
}

/**
 * A few fair-weather cumulus, and rags of volcanic haze torn off the
 * plume: their own layer, drifting on the wind (the frigatebirds are movers).
 */
export function clouds(d: Draw): void {
  tiled(d, 955, (t) => {
    for (const [x, y, w, n] of [[170, 74, 92, 5], [610, 118, 64, 4], [960, 66, 70, 4], [400, 176, 40, 3], [800, 190, 34, 3]] as const) cloud(t, x, y, w, n);
    for (const [x, y, w, h] of [[250, 40, 110, 18], [700, 56, 80, 13], [20, 130, 70, 11], [480, 100, 56, 9]] as const) smokeWisp(t, x, y, w, h);
  });
}

const HORIZON = 174;

/** Sun on the water: short bright flecks scattered across the swell, sparser further out. */
function glints(t: Draw, y0: number, y1: number, n: number): void {
  const { pen } = t;
  for (let k = 0; k < n; k++) {
    const u = pen.rng() ** 0.8;
    const y = y0 + (y1 - y0) * u;
    const x = pen.rng() * W;
    const len = 2 + u * 7 + pen.rng() * 3;
    pen.hair([pt(x, y), pt(x + len, y + pen.jitter(0.3))], 0.6 + u * 0.7, PAPER_FILL, 0.6 + u * 0.3);
  }
}

/** The open Pacific: the shield volcano smoking over its cinder cones, a low island, swell and glints. */
export function sea(d: Draw): void {
  const H = BASALT_SEA_H;
  band(d, HORIZON, H * 0.75, SEA, 0.55, 0.42);
  band(d, H * 0.75, H, SEA_TEAL, 0.42, 0.38);
  tiled(d, 952, (t) => {
    const { pen } = t;
    farIsle(t, 40, 190, HORIZON, 14);
    farIsle(t, 930, 990, HORIZON, 9);
    const v = shieldVolcano(t, 560, 300, HORIZON, 80);
    cinderCone(t, 418, HORIZON - v.height(418) + 2, 24, 9, 0.8);
    cinderCone(t, 706, HORIZON - v.height(706) + 2, 30, 11, 0.8);
    cinderCone(t, 760, HORIZON - v.height(760) + 1.5, 16, 6, 0.7);
    plume(t, v.vent, 62, 170);
    pen.stroke([pt(-20, HORIZON), pt(W + 20, HORIZON)], 1, t.ink, FAR, false);
    swells(t, HORIZON + 4, HORIZON + 40);
    glints(t, HORIZON + 3, H - 6, 160);
  });
}

const WATER = LAVA_CLIFFS_H - 50;

/** Surf on black rock: a broken white band at the waterline with spray thrown up. */
function foam(t: Draw, x0: number, x1: number, y: number): void {
  const { pen } = t;
  for (let x = x0; x < x1; x += 5 + pen.rng() * 10) {
    if (pen.rng() < 0.25) continue;
    const w = 3 + pen.rng() * 12;
    const lift = 1 + pen.rng() * 4;
    pen.hair(bezier(pt(x, y + 1 + pen.jitter(1)), pt(x + w * (0.3 + pen.rng() * 0.4), y - lift), pt(x + w, y + pen.jitter(1)), 5), 0.9 + pen.rng() * 0.8, PAPER_FILL, 0.95);
    pen.hair(bezier(pt(x + 1, y + 2), pt(x + w * 0.5, y - 0.5), pt(x + w, y + 1.5), 5), 0.4, t.ink, FAR * 0.45);
    if (pen.rng() < 0.3) glow(t, x + w / 2, y - 4, w * 0.6, 5, '#ffffff', 0.7);
  }
}

/** A low black lava field at the water's edge: clinkery aa, its top a jumble of small blocks. Returns its top. */
function lavaField(t: Draw, x0: number, x1: number, height: (x: number) => number): (x: number) => number {
  const { pen } = t;
  const top = (x: number): number => WATER - height(x) - 1.5 * Math.abs(Math.sin(x * 0.35)) - Math.abs(Math.sin(x * 0.11));
  const edge: Pt[] = [];
  for (let x = x0; x <= x1; x += 2) edge.push(pt(x, top(x)));
  const shape = [...edge, pt(x1, WATER + 3), pt(x0, WATER + 3)];
  basaltRock(t, shape, { form: false });
  pen.clipped(shape, () => {
    for (let k = 0; k < (x1 - x0) / 3; k++) {
      const x = x0 + pen.rng() * (x1 - x0);
      const y = top(x) + 2 + pen.rng() * (WATER - top(x));
      pen.hair([pt(x, y), pt(x + 2 + pen.rng() * 3, y + pen.jitter(1))], 0.4, t.ink, FAR * 0.5);
    }
  });
  return top;
}

/**
 * Basalt cliffs in hexagonal columns with palo santo and cactus on top, a
 * sea arch, a black lava field steaming from its fumaroles with a grove of
 * cactus, an eroded tuff cone behind, and surf all along.
 */
export function cliffs(d: Draw): void {
  band(d, WATER - 8, WATER + 6, SEA_TEAL, 0, 0.42);
  band(d, WATER + 6, LAVA_CLIFFS_H, SEA_TEAL, 0.42, 0.36);
  tiled(d, 953, (t) => {
    tuffCone(t, 770, 960, WATER + 2, 74);
    // The main cliff, columns from the next tile's lava field on round to the arch.
    const main = (x: number): number => (x < -40 ? 0 : x < -24 ? (x + 40) * 5 : x > 300 ? Math.max(0, (318 - x) * 5.5) : 80 + 18 * Math.sin((x + 40) * 0.012) + 2 * Math.sin(x * 0.05));
    const sky = columnCliff(t, -40, 318, WATER, main);
    const at = (x: number): number => sky.reduce((b, p) => (Math.abs(p.x - x) < Math.abs(b.x - x) ? p : b)).y;
    for (const [x, h] of [[30, 40], [196, 34], [270, 28]] as const) paloSanto(t, x, at(x) + 1, h, 0.6);
    opuntia(t, 96, at(96) + 1, 46, 0.6);
    candelabra(t, 148, at(148) + 1, 30, 0.6);
    candelabra(t, 236, at(236) + 1, 22, 0.5);
    seaArch(t, 352, 470, WATER + 1, 72, [384, 432, 30]);
    // The lava field, with a grove of cactus and palo santo, steaming here and there.
    const top = lavaField(t, 480, 790, (x) => 10 + 6 * Math.sin((x - 480) * 0.02) + 4 * Math.sin(x * 0.07));
    for (const [x, h] of [[520, 36], [548, 30], [742, 34], [772, 26]] as const) paloSanto(t, x, top(x) + 1, h, 0.55);
    for (const [x, h] of [[586, 52], [690, 44]] as const) opuntia(t, x, top(x) + 1, h, 0.62);
    candelabra(t, 636, top(636) + 1, 34, 0.6);
    candelabra(t, 716, top(716) + 1, 24, 0.5);
    for (const [x, h] of [[612, 46], [660, 30], [760, 38]] as const) steam(t, x, top(x) - 1, h, 0.9);
    for (const [x0, x1] of [[-40, 320], [350, 474], [478, 792], [800, 980]] as const) foam(t, x0, x1, WATER);
    swells(t, WATER + 8, LAVA_CLIFFS_H - 12);
  });
  fadeBottom(d, LAVA_CLIFFS_H, 30);
}

/**
 * The floor's black rock, laid once across exactly one tile (not per copy,
 * so its edges neither double up nor ink a line at the seam).
 */
function floorRock(d: Draw, top: (x: number) => number): void {
  const { pen } = d;
  const edge: Pt[] = [];
  for (let x = 0; x <= W; x += 8) edge.push(pt(x, top(x)));
  const shape = [...edge, pt(W, LAVA_SHORE_H), pt(0, LAVA_SHORE_H)];
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, BASALT, 0.55);
  pen.stipple(shape, 2200, () => 0.5, 0.35, '#2d2a28');
  pen.stipple(shape, 500, (_, y) => (y < SHORE_GROUND + 14 ? 0.8 : 0.1), 0.4, PAPER_FILL);
  pen.fill([...edge, ...[...edge].reverse().map((p) => pt(p.x, p.y + 5))], '#2b2927', 0.25);
}

/** On the floor: drifts of black sand, glossy streaks, ropy folds, and its inked edge. */
function floor(t: Draw, top: (x: number) => number): void {
  const { pen } = t;
  const edge: Pt[] = [];
  for (let x = -20; x <= W + 20; x += 8) edge.push(pt(x, top(x)));
  // Drifts of black sand over the rock: paler, grainy, with soft edges.
  for (const [x0, x1] of [[330, 600], [860, 1000]] as const) {
    const drift: Pt[] = [];
    for (let x = x0; x <= x1; x += 6) drift.push(pt(x, top(x) + 4 + 3 * Math.sin((x - x0) * 0.05)));
    const sand = [...drift, ...bezier(pt(x1, top(x1) + 6), pt((x0 + x1) / 2, LAVA_SHORE_H + 30), pt(x0, top(x0) + 6), 16)];
    pen.fill(sand, PAPER_FILL, 1);
    pen.fill(sand, SAND, 0.55);
    pen.stipple(sand, Math.round((x1 - x0) * 8), () => 0.6, 0.4, SAND_GRAIN);
    pen.hair(drift, 0.6, t.ink, FAR * 0.6);
  }
  for (let k = 0; k < 70; k++) {
    const x = pen.rng() * W;
    const y = top(x) + 6 + pen.rng() ** 1.3 * 44;
    pen.hair([pt(x, y), pt(x + 4 + pen.rng() * 12, y + pen.jitter(0.3))], 0.6, '#c8d4dc', 0.45);
  }
  for (const [x, y, w, n] of [[60, 14, 60, 4], [200, 26, 80, 5], [680, 16, 70, 4], [790, 30, 90, 5], [140, 40, 50, 3], [1010, 20, 60, 4]] as const) ropes(t, x, top(x) + y, w, n);
  pen.stroke(edge, 1.1, t.ink, FAR, false);
}

/** A rock pool in the lava, holding the sky, black rocks at its back with the surf bursting over them. */
function pool(t: Draw, x0: number, x1: number, y: number): void {
  const { pen } = t;
  for (const [x, rx, ry] of [[x0 + 14, 18, 14], [x0 + 46, 26, 20], [x1 - 30, 22, 16], [x1 - 6, 14, 10]] as const) {
    glow(t, x - 4, y - ry * 2.4, rx * 1.4, ry * 1.1, '#ffffff', 0.85);
    basaltRock(t, woolsack(t, x, y - ry * 0.8, rx, ry, 2.2, y + 2, 1.5), {});
  }
  for (let k = 0; k < 18; k++) {
    const x = x0 + 4 + pen.rng() * (x1 - x0 - 8);
    pen.hair(bezier(pt(x, y - 20 - pen.rng() * 14), pt(x + 2, y - 30 - pen.rng() * 12), pt(x + 5, y - 26 - pen.rng() * 10), 4), 0.8, PAPER_FILL, 0.9);
  }
  const water = oval((x0 + x1) / 2, y + 7, (x1 - x0) / 2 + 6, 6, 28);
  pen.fill(water, PAPER_FILL, 1);
  pen.fill(water, POOL, 0.55);
  pen.clipped(water, () => {
    for (let k = 0; k < 6; k++) pen.hair([pt(x0 + pen.rng() * (x1 - x0), y + 4 + k * 1.5), pt(x0 + pen.rng() * (x1 - x0), y + 4 + k * 1.5)], 0.7, PAPER_FILL, 0.8);
  });
  pen.hair(water.slice(0, 15), 0.6, t.ink, FAR * 0.8);
}

/**
 * The near shore: black sand and ropy pahoehoe, a raised lobe of lava with
 * marine iguanas heaped on it, cactus, sesuvium, a sleeping sea lion, a
 * rock pool with the surf breaking behind it, a sulphur vent, driftwood.
 */
export function shore(d: Draw): void {
  const G = SHORE_GROUND;
  const top = (x: number): number => G - 3 * wave(x, 3, 0.2) - 2 * wave(x, 7, 1.3);
  tiled(d, 954, (t) => {
    // Toes of a pahoehoe lobe at the left, wrinkled into ropes, iguanas basking on them.
    const toes = [[130, 18, 66, 22], [44, 10, 46, 15], [206, 8, 40, 12]].map(([x, dy, rx, ry]) => {
      const toe = woolsack(t, x!, G - dy!, rx!, ry!, 2.4, G + 8, 1.3);
      basaltRock(t, toe, {});
      ropes(t, x!, G - dy! - ry! * 0.7, rx! * 1.3, 4);
      return toe;
    });
    const lobeTop = (x: number): number => Math.min(G, ...toes.flat().filter((p) => Math.abs(p.x - x) < 6).map((p) => p.y)) + 2.5;
    iguanaHeap(t, 118, lobeTop, 1.45);
    candelabra(t, 262, top(262) + 3, 92, 1.3);
    opuntia(t, 900, top(900) + 3, 128, 1.15);
    paloSanto(t, 952, top(952) + 2, 80, 1);
  });
  floorRock(d, top);
  tiled(d, 956, (t) => {
    floor(t, top);
    pool(t, 610, 730, top(670) + 8);
    sesuvium(t, 210, 330, (x) => top(x) + 10);
    sesuvium(t, 740, 860, (x) => top(x) + 14, 0.4);
    sesuvium(t, -10, 40, (x) => top(x) + 16, 0.8);
    seaLion(t, 470, top(470) + 24, 1.6);
    sulphurVent(t, 800, top(800) + 30, 1.4);
    // A bleached log washed up: the beach's driftwood, drawn half as big again, being nearer.
    t.pen.ctx.save();
    t.pen.ctx.translate(1010, top(1010) + 30);
    t.pen.ctx.scale(1.6, 1.6);
    driftwood(t, 0, 0, 64);
    t.pen.ctx.restore();
  });
  fadeBottom(d, LAVA_SHORE_H, 40);
}
