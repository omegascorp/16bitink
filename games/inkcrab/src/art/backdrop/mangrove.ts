import { bezier, cub, type Draw, pt, ribbon } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { BACKDROP_W, band, FAR, fadeBottom, tiled } from './common';
import { boardwalk, crabTrap, dugout, farBank, glow, hills, kelong, sampan, stiltHouse, towering } from './estuary';
import { canopyWall, log, nipa, pneumatophores, rhizophora, rootCage, snag, stuckPropagule } from './mangroveTrees';
import { burrow, egret, egretFlying, heron, ibis, kingfisher, kite, leaf, puddle, tracks } from './mudLife';
import { cloud } from './tropic';
import { reflection } from './water';

/**
 * Beach 4: a mangrove estuary in the Indo-Pacific, Borneo or the Andaman
 * coast, humid and green at low water. Far off, a hazy warm sky with
 * cumulus towering inland, ibis and egrets flying over and a brahminy kite;
 * then a still, olive river mouth under misty hills, the far bank's dark
 * line of forest, a village on stilts, a kelong and a sampan; a wall of
 * red mangroves on arching prop roots, nipa palms, a heron and an egret
 * fishing the creek mouth and a boardwalk winding into the trees; nearest,
 * a glistening mudflat cut by tidal creeks, bristling with pencil roots,
 * with crab burrows, fallen leaves and propagules, an old dugout and a
 * bamboo trap. (No small creatures nearby: the level's own fiddlers and
 * mudskippers must never be mistaken for scenery.)
 */
const W = BACKDROP_W;
const SKY = '#b4cbc6';
const HAZE = '#efe6c6';
const RIVER = '#8e9670';
const RIVER_BROWN = '#a3946c';
const HILLS = '#9fb2ab';
const HILLS_FAR = '#bccac4';
const MUD = '#8a7f6e';
const CREEK = '#959e8e';
const MUD_WET = '#6f6658';
const SHEEN = '#c3d2cc';
const BLEACHED = '#bcb39f';
const LEAVES = ['#d9b443', '#d3893a', '#c9c25a', '#e0a83c'] as const;

/** A smooth wave that repeats exactly every tile, so anything shaped by it wraps seamlessly. */
const wave = (x: number, k: number, phase = 0): number => Math.sin((x / W) * Math.PI * 2 * k + phase);

export const MANGROVE_SKY_H = 220;
export const RIVER_H = 170;
export const FOREST_H = 300;
const SHORE_HEADROOM = 70;
export const MUDFLAT_H = 250 + SHORE_HEADROOM;
const MUD_GROUND = 200 + SHORE_HEADROOM;

export function sky(d: Draw): void {
  const H = MANGROVE_SKY_H;
  // A humid, washed-out blue overhead, going to a warm haze lower down.
  band(d, 0, H * 0.4, SKY, 0.06, 0.28);
  band(d, H * 0.4, H, SKY, 0.28, 0.05);
  band(d, H * 0.35, H, HAZE, 0, 0.5);
  tiled(d, 941, (t) => {
    // The sun, a white blur in the haze.
    glow(t, 640, 44, 90, 70, '#f6e7b8', 0.5);
    glow(t, 640, 44, 24, 24, '#fffaf0', 0.9);
  });
  fadeBottom(d, MANGROVE_SKY_H, 50);
}

/**
 * Cumulus building over the hinterland, their bases lost in the haze, and
 * long bands of haze: their own layer, drifting slowly inland (the ibis,
 * egrets and kite are movers).
 */
export function clouds(d: Draw): void {
  tiled(d, 945, (t) => {
    const { pen } = t;
    towering(t, 150, 216, 150, 150);
    towering(t, 470, 214, 96, 82);
    towering(t, 830, 218, 190, 176);
    cloud(t, 520, 70, 80, 4);
    cloud(t, 1000, 96, 60, 3);
    for (const [x, y, w] of [[300, 168, 220], [620, 186, 180], [960, 176, 160], [60, 196, 140]] as const) {
      pen.hair(bezier(pt(x, y), pt(x + w / 2, y - 1.5), pt(x + w, y + 0.5), 12), 1.4, PAPER_FILL, 0.75);
      pen.hair(bezier(pt(x + 10, y + 2.5), pt(x + w / 2, y + 1.2), pt(x + w - 16, y + 3), 12), 0.4, t.ink, FAR * 0.22);
    }
  });
  fadeBottom(d, MANGROVE_SKY_H, 50);
}

const HORIZON = 46;

/** Still water: long, broken glints of the pale sky and a few faint ripple lines, opening out towards the viewer. */
function stillWater(t: Draw, y0: number, y1: number, rows: number): void {
  const { pen } = t;
  for (let r = 0; r < rows; r++) {
    const k = r / Math.max(1, rows - 1);
    const y = y0 + (y1 - y0) * k ** 1.3;
    for (let x = (r * 71) % 90 - 40; x < W; ) {
      const len = 14 + pen.rng() * 50 + k * 40;
      pen.hair([pt(x, y), pt(x + len, y + pen.jitter(0.3))], 0.6 + 0.6 * k, PAPER_FILL, 0.5 + 0.3 * k);
      if (pen.rng() < 0.4) pen.hair(bezier(pt(x + len * 0.3, y + 1.5 + k), pt(x + len * 0.55, y + 0.8 + k), pt(x + len * 0.8, y + 1.6 + k), 5), 0.4, t.ink, FAR * (0.15 + 0.2 * k));
      x += len + 30 + pen.rng() * 80;
    }
  }
}

/** A bamboo stake standing in the water, with its reflection. */
function stake(t: Draw, x: number, water: number, h: number): void {
  t.pen.hair([pt(x, water + 0.5), pt(x + 0.3, water - h)], 0.6, t.ink, FAR * 0.8);
  t.pen.hair([pt(x, water + 1.5), pt(x, water + h * 0.7)], 0.5, t.ink, FAR * 0.25);
}

/** The far river: hills in the haze, the far bank's forest with a village on stilts, a kelong, a sampan. */
export function river(d: Draw): void {
  const H = RIVER_H;
  band(d, 0, HORIZON, HAZE, 0, 0.5);
  // Olive water, browner with silt towards the viewer.
  band(d, HORIZON, H, RIVER, 0.44, 0.12);
  band(d, HORIZON + 10, H, RIVER_BROWN, 0, 0.34);
  tiled(d, 942, (t) => {
    const { pen } = t;
    hills(t, HORIZON, (x) => 24 + 10 * wave(x, 2, 0.3) + 6 * wave(x, 5, 1.7) + 3 * wave(x, 11, 0.2), HILLS_FAR, 0.3);
    hills(t, HORIZON, (x) => 12 + 6 * wave(x, 3, 2.2) + 4 * wave(x, 7, 0.9), HILLS, 0.36);
    // The far bank, broken where the river opens to the sea.
    const gap = (x: number): number => 1 - Math.exp(-(((x - 700) / 34) ** 2));
    farBank(t, HORIZON, (x) => (7 + 2.5 * wave(x, 4, 1) + 1.5 * wave(x, 9, 2) + 4 * Math.max(0, wave(x, 13, 0.5)) ** 4) * gap(x));
    pen.hair([pt(640, HORIZON), pt(760, HORIZON)], 0.6, t.ink, FAR * 0.6);
    stillWater(t, HORIZON + 4, H - 6, 12);
    // A fishing village on stilts along the far bank, its walkway joining the houses.
    pen.hair([pt(372, HORIZON + 0.5), pt(478, HORIZON + 0.5)], 0.5, t.ink, FAR * 0.7);
    for (const [x, s, wall] of [[380, 0.7, '#a88a62'], [398, 0.8, '#c7b08a'], [418, 0.65, '#a88a62'], [440, 0.85, '#b5a47e'], [462, 0.7, '#c7b08a']] as const) stiltHouse(t, x, HORIZON + 1.5, s, wall);
    kelong(t, 560, HORIZON + 20, 1);
    for (const [x, h] of [[180, 9], [196, 7], [214, 10], [860, 8], [872, 6]] as const) stake(t, x, HORIZON + 24 + (x % 3), h);
  });
}

const WATER = FOREST_H - 50;

/** The forest's gloomy understory: shade between canopy and water, crowded with faint root cages. */
function understory(t: Draw, x0: number, x1: number, top: (x: number) => number): void {
  const { pen } = t;
  const edge: Pt[] = [];
  for (let x = x0; x <= x1; x += 6) {
    const e = Math.min(1, (x - x0) / 50, (x1 - x) / 50);
    edge.push(pt(x, WATER - (WATER - top(x) - 25) * Math.sqrt(Math.max(0, e))));
  }
  const shape = [...edge, pt(x1, WATER + 1), pt(x0, WATER + 1)];
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, '#3e5038', 0.3);
  // A tangle of prop roots in the shade, drawn as dark arches.
  for (let x = x0 + 16; x < x1 - 16; x += 8 + pen.rng() * 10) {
    const side = pen.rng() < 0.5 ? -1 : 1;
    const p0 = pt(x, WATER - 18 - pen.rng() * 20);
    const reach = 8 + pen.rng() * 18;
    pen.hair(cub(p0, pt(p0.x + side * reach * 0.5, p0.y - 6), pt(p0.x + side * reach * 0.9, p0.y + 2), pt(p0.x + side * reach, WATER + 1), 10), 0.9, '#4a4a3a', 0.35);
  }
  for (let x = x0 + 50; x < x1 - 50; x += 7 + pen.rng() * 8) pen.hair([pt(x, top(x) + 30), pt(x + pen.jitter(2), WATER - 30)], 0.5, t.ink, FAR * 0.25);
}

/** The bank of mud at the forest's foot, bared by the tide, with pencil roots and a glint at the water's edge. */
function bank(t: Draw, x0: number, x1: number): void {
  const { pen } = t;
  const y = (x: number): number => WATER - 2 - 1.5 * wave(x, 9, 0.7);
  const top: Pt[] = [];
  for (let x = x0; x <= x1; x += 6) top.push(pt(x, y(x)));
  const shape = [...top, pt(x1, WATER + 5), ...bezier(pt(x1, WATER + 5), pt((x0 + x1) / 2, WATER + 7), pt(x0, WATER + 5), 10).slice(1)];
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, MUD, 0.5);
  pneumatophores(t, x0 + 6, x1 - 6, y, Math.round((x1 - x0) / 3), 5, 0.8);
  pen.hair([pt(x0 + 4, WATER + 5.5), pt(x1 - 4, WATER + 5.5)], 0.8, PAPER_FILL, 0.85);
  pen.hair(top, 0.5, t.ink, FAR * 0.6);
}

/**
 * The mangrove forest: two walls of red mangroves on their prop roots,
 * nipa palms where a creek opens between them, a heron and an egret
 * fishing it, and a boardwalk coming out of the trees and back in.
 */
export function forest(d: Draw): void {
  band(d, WATER - 6, WATER + 4, RIVER, 0, 0.42);
  band(d, WATER + 4, FOREST_H, RIVER, 0.42, 0.36);
  tiled(d, 943, (t) => {
    const top = (x: number): number => WATER - 112 - 14 * wave(x, 3, 0.5) - 8 * wave(x, 7, 1.9);
    // The walls run 620 to 900, and 960 round into the next tile to 380.
    for (const [x0, x1] of [[620, 900], [960, W + 380]] as const) {
      understory(t, x0, x1, top);
      canopyWall(t, x0, x1, top, 46, 0.7);
      bank(t, x0 - 16, x1 + 16);
    }
    bank(t, 400, 600);
    stillWater(t, WATER + 10, FOREST_H - 8, 5);
    boardwalk(t, [{ x: 690, y: WATER - 6, s: 0.5 }, { x: 750, y: WATER - 2, s: 0.62 }, { x: 820, y: WATER + 6, s: 0.8 }, { x: 880, y: WATER + 11, s: 0.95 }, { x: 920, y: WATER + 12, s: 1 }, { x: 960, y: WATER + 9, s: 0.9 }, { x: 1010, y: WATER + 1, s: 0.7 }, { x: 1050, y: WATER - 3, s: 0.55 }]);
    // The creek mouth: nipa palms on its banks, a young mangrove, a heron and an egret.
    nipa(t, 400, WATER + 1, 54);
    nipa(t, 612, WATER, 46);
    nipa(t, 932, WATER + 1, 40);
    rhizophora(t, 574, WATER + 2, 62, 42);
    heron(t, 472, WATER - 1, 1.4);
    reflection(t, 540, WATER + 7, 8, 8, '#e8e4d8', 0.5);
    egret(t, 540, WATER + 7, 1.2, -1, true);
    // The front rank of trees, each over its reflection.
    for (const [x, h, w] of [[990, 150, 110], [60, 136, 100], [168, 166, 126], [276, 126, 96], [352, 100, 70], [652, 130, 96], [762, 162, 122], [866, 122, 90]] as const) {
      reflection(t, x, WATER + 3, w * 0.7, 18, '#4a4636', 0.22);
      rhizophora(t, x, WATER + 2, h, w, 0.9);
    }
  });
  fadeBottom(d, FOREST_H, 30);
}

/** A tidal creek winding across the mud: a channel of sky-grey water, its far bank cut dark. */
function creek(t: Draw, spine: readonly Pt[], w0: number, w1: number): void {
  const { pen } = t;
  const r = ribbon(spine, (u) => w0 + (w1 - w0) * u ** 1.4);
  pen.ctx.save();
  pen.ctx.beginPath();
  pen.ctx.rect(-W, 0, W * 3, MUDFLAT_H);
  pen.ctx.clip();
  pen.fill(r.shape, PAPER_FILL, 1);
  pen.fill(r.shape, CREEK, 0.65);
  pen.clipped(r.shape, () => {
    for (let i = 2; i < spine.length - 1; i += 2) {
      const p = spine[i]!;
      const l = 3 + (i / spine.length) * 12;
      pen.hair([pt(p.x - l / 2, p.y), pt(p.x + l / 2, p.y)], 0.7, PAPER_FILL, 0.9);
    }
    pen.fill(r.top.map((p) => pt(p.x, p.y)).concat([...r.top].reverse().map((p) => pt(p.x, p.y + 2))), MUD_WET, 0.35);
  });
  pen.hair(r.top, 0.6, t.ink, FAR * 0.75);
  pen.hair(r.bot, 0.4, t.ink, FAR * 0.4);
  pen.ctx.restore();
}

/** The flat itself: wet grey-brown mud, darker low down, glistening in streaks. */
function flat(t: Draw, top: (x: number) => number): void {
  const { pen } = t;
  const edge: Pt[] = [];
  for (let x = -20; x <= W + 20; x += 8) edge.push(pt(x, top(x)));
  const shape = [...edge, pt(W + 20, MUDFLAT_H), pt(-20, MUDFLAT_H)];
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, MUD, 0.6);
  pen.fill([...edge.map((p) => pt(p.x, p.y + 22)), pt(W + 20, MUDFLAT_H), pt(-20, MUDFLAT_H)], MUD_WET, 0.16);
  pen.stipple(shape, 1600, (_, y) => Math.max(0, 1 - (y - MUD_GROUND) / 60) * 0.5, 0.4, MUD_WET);
  for (let k = 0; k < 90; k++) {
    const x = pen.rng() * W;
    const y = top(x) + 4 + pen.rng() ** 1.3 * 46;
    const len = 4 + pen.rng() * 22;
    pen.hair([pt(x, y), pt(x + len, y + pen.jitter(0.3))], 0.6 + pen.rng() * 0.6, PAPER_FILL, 0.55 + pen.rng() * 0.3);
  }
  pen.stroke(edge, 1.1, t.ink, FAR, false);
}

/**
 * The mudflat at low tide: saplings and an old root cage standing up behind,
 * creeks and puddles, fields of pencil roots, crab burrows, fallen leaves,
 * propagules, a dugout and a bamboo trap.
 */
export function mudflat(d: Draw): void {
  const G = MUD_GROUND;
  const top = (x: number): number => G - 3 * wave(x, 2, 0.5) - 2 * wave(x, 5, 1.3);
  tiled(d, 944, (t) => {
    const { pen } = t;
    // A dead tree's bleached root cage and the stump of its trunk.
    const stump = ribbon([pt(142, top(142) - 18), pt(143, top(142) - 40), pt(141, top(142) - 50)], (u) => 7 - 2 * u);
    pen.fill(stump.shape, PAPER_FILL, 1);
    pen.fill(stump.shape, BLEACHED, 0.55);
    pen.hair(stump.top, 0.6, t.ink, FAR);
    pen.hair(stump.bot, 0.6, t.ink, FAR);
    pen.hair([pt(137.5, top(142) - 50), pt(139.5, top(142) - 53), pt(141, top(142) - 49), pt(143.5, top(142) - 54), pt(144.5, top(142) - 50)], 0.6, t.ink, FAR);
    rootCage(t, 142, top(142) - 24, top(142) + 6, 74, 0.75, 1, BLEACHED);
    for (const [x, h, w] of [[34, 40, 30], [382, 60, 42], [508, 70, 50], [846, 46, 32], [968, 56, 40]] as const) rhizophora(t, x, top(x) + 4, h, w);
    const perch = snag(t, 742, top(742) + 4, 62, 0.08);
    kingfisher(t, perch.x, perch.y + 0.5, 1, -1);
    nipa(t, 620, top(620) + 4, 34);
    flat(t, top);
    creek(t, cub(pt(420, top(420) + 2), pt(520, top(470) + 12), pt(360, top(420) + 26), pt(520, MUDFLAT_H - 2), 24), 2, 18);
    creek(t, cub(pt(770, top(770) + 3), pt(700, top(740) + 14), pt(820, top(780) + 24), pt(720, MUDFLAT_H - 2), 20), 1.5, 12);
    for (const [x, y, rx, ry] of [[60, 20, 26, 3], [300, 34, 34, 4], [640, 26, 22, 3], [940, 30, 30, 3.6]] as const) puddle(t, x, top(x) + y, rx, ry, SHEEN);
    for (const [x0, x1, n, h] of [[0, 120, 110, 9], [170, 340, 150, 10], [700, 800, 80, 8], [870, 1024, 140, 10]] as const) pneumatophores(t, x0, x1, (x) => top(x) + 3, n, h);
    dugout(t, 240, top(240) + 18, 1.3, MUD);
    crabTrap(t, 676, top(676) + 15, 1.2);
    log(t, 560, 640, top(600) + 9, 4.5);
    for (const [x, h, lean, sprout] of [[118, 12, 0.08, false], [214, 14, -0.1, true], [452, 11, 0.12, false], [566, 13, -0.04, true], [742, 12, 0.1, false], [905, 14, -0.08, true], [1000, 11, 0.05, false]] as const) stuckPropagule(t, x, top(x) + 10, h, lean, sprout);
    for (let k = 0; k < 26; k++) {
      const x = pen.rng() * W;
      burrow(t, x, top(x) + 8 + pen.rng() * 34, 1);
    }
    for (let k = 0; k < 22; k++) {
      const x = pen.rng() * W;
      leaf(t, x, top(x) + 6 + pen.rng() * 40, 1 + pen.rng() * 0.3, pen.rng() * Math.PI, LEAVES[k % LEAVES.length]!);
    }
    tracks(t, 500, 636, (x) => top(x) + 38 + 3 * Math.sin(x * 0.04));
    egret(t, 646, top(646) + 40, 1.3, 1);
  });
  fadeBottom(d, MUDFLAT_H, 40);
}
