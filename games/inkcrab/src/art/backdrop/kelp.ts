import { bezier, type Draw, oval, pt } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { BACKDROP_W, band, FAR, fadeBottom, tiled } from './common';
import { glow } from './estuary';
import { cape, FOG, FOG_SHADE, fogBank, headland, longSwells, mist, seaStack, stackRock, stratus, surf } from './fogCoast';
import { through, woolsack } from './granite';
import { beachgrass, driftLog, harborSeal, keepersHouse, kelpBed, pnwLighthouse, salal, seaOtter, spruce, wrackLine } from './pnw';

/**
 * Beach 6: a cold, foggy coast, Oregon or Washington. Far off, a pale
 * overcast sky with a weak sun showing through the haze, low stratus and
 * fog banks drifting along the horizon, gulls on the wind; then the
 * grey-green Pacific rolling in long swells, capes of dark forest fading
 * one behind another into the fog, rafts of kelp and a troller working
 * the swell; a headland of Sitka spruce and fir with a white lighthouse
 * on its cliff, its lamp lit, and the keeper's house below; Haystack Rock
 * and its needles in the surf, a kelp bed with a sea otter floating on its
 * back, a harbor seal hauled out on the rocks of the point, pelicans and
 * cormorants flying low; nearest, a grey beach with silver driftwood logs
 * piled at its back, dunes of beachgrass with salal and shore pines, and
 * the wrack of the last tide. (No small creatures nearby: the level's own
 * crabs and the like must never be mistaken for scenery.)
 */
const W = BACKDROP_W;
const SKY = '#a9b8c0';
const SKY_PALE = '#dfe4e2';
const SEA = '#5d7a74';
const SEA_GREY = '#7d918c';
const SAND = '#c9c0a6';
const SAND_GRAIN = '#6f6a5c';
const DUNE_GRASS = '#8f9a5e';

/** A smooth wave that repeats exactly every tile, so anything shaped by it wraps seamlessly. */
const wave = (x: number, k: number, phase = 0): number => Math.sin((x / W) * Math.PI * 2 * k + phase);

export const KELP_SKY_H = 220;
/**
 * The clouds reach down to the horizon (their layer sits lower than the
 * sky, see THEMES), so the fog banks can lie on the sea.
 */
export const KELP_CLOUDS_H = 300;
const FOG_BASE = 294;
export const KELP_SEA_H = 200;
export const KELP_CLIFFS_H = 300;
const SHORE_HEADROOM = 70;
export const KELP_SHORE_H = 250 + SHORE_HEADROOM;
const SHORE_GROUND = 200 + SHORE_HEADROOM;

export function sky(d: Draw): void {
  const H = KELP_SKY_H;
  // Overcast: a flat, pale grey-blue, a little brighter towards the sea.
  band(d, 0, H * 0.4, SKY, 0.1, 0.38);
  band(d, H * 0.4, H, SKY, 0.38, 0);
  band(d, H * 0.35, H * 0.7, SKY_PALE, 0, 0.4);
  band(d, H * 0.7, H, SKY_PALE, 0.4, 0);
  tiled(d, 961, (t) => {
    const { pen } = t;
    // A weak sun through the haze: a pale disc in a broad soft glow, its rim barely there.
    glow(t, 690, 70, 120, 84, '#f7f3e3', 0.5);
    glow(t, 690, 70, 34, 30, '#fffaf0', 0.7);
    pen.fill(oval(690, 70, 13, 13, 28), PAPER_FILL, 0.65);
    const rim = oval(690, 70, 13.5, 13.5, 40);
    for (let i = 0; i < 40; i += 10) pen.hair(rim.slice(i, i + 4), 0.6, t.ink, FAR * 0.22);
    // The overcast deck itself: broad grey swells of cloud, barely shaded.
    for (const [x, y, w, h] of [[160, 40, 260, 18], [520, 30, 220, 14], [900, 54, 240, 16], [340, 120, 280, 12], [760, 150, 200, 10]] as const) {
      glow(t, x, y, w, h, FOG_SHADE, 0.18);
      glow(t, x - w * 0.1, y - h * 0.4, w * 0.8, h * 0.7, FOG, 0.3);
    }
  });
}

/** Low stratus and fog banks lying along the horizon: their own layer, drifting slowly (the gulls are movers). */
export function clouds(d: Draw): void {
  // Haze thickening down to the horizon, taking over from the sky's own wash as it fades.
  band(d, KELP_SKY_H * 0.4, KELP_SKY_H, SKY, 0, 0.38);
  band(d, KELP_SKY_H, FOG_BASE, SKY, 0.38, 0.2);
  band(d, KELP_SKY_H * 0.7, FOG_BASE, SKY_PALE, 0, 0.6);
  tiled(d, 965, (t) => {
    for (const [x, y, w, h] of [[150, 52, 300, 10], [620, 36, 340, 12], [930, 88, 220, 8], [400, 116, 260, 9], [780, 160, 230, 7], [110, 184, 200, 6], [560, 206, 260, 6]] as const) stratus(t, x, y, w, h);
    // Banks of fog sitting on the sea, and higher heaps that roll over the capes.
    for (const [x, w, h] of [[150, 340, 34], [540, 260, 24], [880, 320, 40]] as const) fogBank(t, x, FOG_BASE, w, h);
    for (const [x, base, w, h] of [[700, FOG_BASE - 30, 150, 18], [980, FOG_BASE - 44, 120, 16], [360, FOG_BASE - 18, 110, 12]] as const) fogBank(t, x, base, w, h, 0.85);
  });
}

const HORIZON = 74;

/** A cape's skyline: steep at its seaward tip (x0), a forested crest rising inland, sloping off at x1. */
function ridge(x0: number, x1: number, h: number, phase: number): (x: number) => number {
  return (x) => {
    const u = (x - x0) / (x1 - x0);
    if (u <= 0 || u >= 1) return 0;
    const tip = Math.min(1, u / 0.05) ** 0.6;
    const tail = Math.min(1, (1 - u) / 0.2) ** 1.2;
    return h * tip * tail * (0.62 + 0.3 * u + 0.08 * Math.sin(u * 17 + phase));
  };
}

/** The open Pacific: capes of forest fading into the fog one behind another, sea stacks, long swells, rafts of kelp. */
export function sea(d: Draw): void {
  const H = KELP_SEA_H;
  band(d, HORIZON, H * 0.6, SEA_GREY, 0.42, 0.45);
  band(d, H * 0.6, H, SEA, 0.45, 0.42);
  tiled(d, 962, (t) => {
    const { pen } = t;
    // Furthest first: each nearer cape darker and taller, hiding the inland end of the one behind.
    cape(t, 350, 640, HORIZON, ridge(350, 640, 13, 0.4), 0.1);
    cape(t, 490, 830, HORIZON, ridge(490, 830, 24, 1.9), 0.35);
    const near = ridge(700, 1090, 40, 3.1);
    cape(t, 700, 1090, HORIZON, near, 0.65);
    // Stacks off the nearest cape's tip, the swell breaking white round them.
    for (const [x0, x1, h] of [[676, 690, 13], [662, 668, 6], [300, 306, 5]] as const) {
      seaStack(t, x0, x1, HORIZON + 1, h, (u) => Math.sin(Math.PI * u) ** 0.4, 0.55);
      pen.hair([pt(x0 - 3, HORIZON + 1.2), pt(x1 + 3, HORIZON + 1.2)], 0.9, PAPER_FILL, 0.9);
    }
    // The fog lies on the water: the horizon all but lost in it.
    mist(t, -60, 1100, HORIZON - 2, 7, 0.7);
    for (let x = -20; x < W + 20; x += 60 + pen.rng() * 80) pen.hair([pt(x, HORIZON), pt(x + 20 + pen.rng() * 50, HORIZON)], 0.6, t.ink, FAR * 0.35);
    longSwells(t, HORIZON + 5, H - 8, 9);
    kelpBed(t, 90, 260, (x) => 132 + 3 * wave(x, 5), 5, 0.45);
    kelpBed(t, 520, 640, () => 150, 6, 0.5);
    kelpBed(t, 840, 960, () => 118, 4, 0.38);
  });
}

const WATER = KELP_CLIFFS_H - 50;

/**
 * The near coast: a forested headland ending in a cliff, the lighthouse on
 * its bench and the keeper's house below; Haystack Rock and its needles in
 * the surf; a kelp bed with an otter in it; the low rocks of the point with
 * a harbor seal hauled out.
 */
export function cliffs(d: Draw): void {
  band(d, WATER - 8, WATER + 6, SEA, 0, 0.45);
  band(d, WATER + 6, KELP_CLIFFS_H, SEA, 0.45, 0.4);
  tiled(d, 963, (t) => {
    const hh = through([[-70, 0], [-56, 18], [-30, 50], [10, 80], [60, 108], [120, 132], [180, 146], [228, 138], [258, 116], [278, 90], [292, 74], [336, 68], [350, 44], [362, 0]]);
    headland(t, -70, 364, WATER, hh, 282);
    // Fog caught in the trees along the top.
    mist(t, -30, 150, WATER - 104, 10, 0.75);
    mist(t, 120, 270, WATER - 128, 8, 0.6);
    // The keeper's house in its clearing below the light, and the light on its bench.
    const clearing = [pt(226, WATER - 52), ...bezier(pt(226, WATER - 52), pt(250, WATER - 70), pt(282, WATER - 54), 10).slice(1), pt(282, WATER - 46), pt(226, WATER - 46)];
    t.pen.fill(clearing, '#8fa46e', 0.5);
    keepersHouse(t, 254, WATER - 56, 0.95);
    for (const [x, h] of [[226, 22], [286, 18], [214, 26]] as const) spruce(t, x, WATER - 50, h);
    pnwLighthouse(t, 322, WATER - hh(322) + 1, 1.15);
    // Haystack Rock and its needles.
    seaStack(t, 410, 530, WATER, 112, (u) => Math.sin(Math.PI * u) ** 0.3 * (1 - 0.18 * Math.min(1, Math.max(0, (u - 0.55) / 0.15)) ** 2) * (0.95 + 0.05 * Math.sin(u * 11)));
    seaStack(t, 534, 552, WATER, 46, (u) => Math.sin(Math.PI * u) ** 0.5);
    seaStack(t, 560, 570, WATER, 24, (u) => Math.sin(Math.PI * u) ** 0.6);
    // The point: low black rocks, a seal hauled out on the biggest.
    const rocks = [[860, 26, 14], [900, 34, 20], [940, 22, 11], [826, 14, 7]].map(([x, rx, ry]) => {
      const shape = woolsack(t, x!, WATER - ry! * 0.7, rx!, ry!, 2.4, WATER + 3, 1.4);
      stackRock(t, shape);
      return shape;
    });
    const seat = Math.min(...rocks[1]!.filter((p) => Math.abs(p.x - 900) < 8).map((p) => p.y));
    harborSeal(t, 902, seat + 1.5, 0.95);
    for (const [x0, x1] of [[-70, 366], [416, 526], [530, 574], [804, 966]] as const) surf(t, x0, x1, WATER);
    longSwells(t, WATER + 10, KELP_CLIFFS_H - 12, 4);
    // The kelp bed: floats and blades streaming on the current, an otter on its back among them.
    kelpBed(t, 590, 800, (x) => WATER + 14 + 4 * Math.sin(x * 0.05), 14, 1);
    kelpBed(t, 380, 590, (x) => WATER + 30 + 3 * Math.sin(x * 0.04), 12, 1.2);
    kelpBed(t, 760, 1010, () => WATER + 32, 12, 1.2);
    seaOtter(t, 694, WATER + 20, 1.15);
  });
  fadeBottom(d, KELP_CLIFFS_H, 30);
}

/** A dune behind the beach: a hump of loose sand from x0 to x1, `h` high at its crest. Returns its top. */
function dune(t: Draw, x0: number, x1: number, ground: (x: number) => number, h: number): (x: number) => number {
  const { pen } = t;
  const top = (x: number): number => ground(x) - h * Math.max(0, Math.sin((Math.PI * (x - x0)) / (x1 - x0))) ** 0.8;
  const edge: Pt[] = [];
  for (let x = x0; x <= x1; x += 4) edge.push(pt(x, top(x)));
  const shape = [...edge, pt(x1, ground(x1) + 6), pt(x0, ground(x0) + 6)];
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, SAND, 0.5);
  pen.stipple(shape, Math.round((x1 - x0) * h * 0.08), () => 0.6, 0.35, SAND_GRAIN);
  // Beachgrass greening the crest, thinning down the slope.
  pen.clipped(shape, () => pen.fill(edge.map((p) => pt(p.x, p.y + h * 0.45)).concat([...edge].reverse()), DUNE_GRASS, 0.3));
  for (let x = x0 + 6; x < x1 - 6; x += 5 + pen.rng() * 6) {
    const y = top(x) + 1 + pen.rng() * h * 0.3;
    pen.hair([pt(x, y), pt(x + 1.5 + pen.rng() * 2, y - 3 - pen.rng() * 3)], 0.5, DUNE_GRASS, 0.8);
  }
  pen.clipped(shape, () => pen.hatch(shape, 1.8, 1.15, 0.35, { color: t.ink, alpha: FAR * 0.22, onlyBelow: Math.min(...edge.map((p) => p.y)) + h * 0.5 }));
  pen.hair(edge, 0.7, t.ink, FAR * 0.8);
  return top;
}

/** The beach floor: grey-tan sand, laid once across exactly one tile so its edges neither double nor seam. */
function floorSand(d: Draw, top: (x: number) => number): void {
  const { pen } = d;
  const edge: Pt[] = [];
  for (let x = 0; x <= W; x += 8) edge.push(pt(x, top(x)));
  const shape = [...edge, pt(W, KELP_SHORE_H), pt(0, KELP_SHORE_H)];
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, SAND, 0.55);
  pen.stipple(shape, 2400, () => 0.5, 0.35, SAND_GRAIN);
  pen.fill([...edge, ...[...edge].reverse().map((p) => pt(p.x, p.y + 6))], '#8f8a78', 0.2);
}

/**
 * The near shore: a grey beach with the winter's driftwood logs piled at
 * its back, dunes of beachgrass with salal and shore pines behind, and the
 * wrack of the last tide along the sand.
 */
export function shore(d: Draw): void {
  const G = SHORE_GROUND;
  const top = (x: number): number => G - 3 * wave(x, 3, 0.6) - 2 * wave(x, 7, 1.7);
  tiled(d, 964, (t) => {
    const west = dune(t, -40, 250, top, 44);
    for (const [x, h] of [[30, 130], [64, 96], [196, 84], [-6, 70]] as const) spruce(t, x, west(x) + 4, h);
    salal(t, 130, west(130) + 3, 90, 24);
    for (const x of [-10, 70, 150, 220]) beachgrass(t, x, west(x) + 2, 22);
    const east = dune(t, 800, 1010, top, 30);
    salal(t, 860, east(860) + 3, 70, 18);
    for (const [x, h] of [[952, 104], [924, 70]] as const) spruce(t, x, east(x) + 4, h);
    for (const x of [810, 900, 990]) beachgrass(t, x, east(x) + 2, 20);
  });
  floorSand(d, top);
  tiled(d, 966, (t) => {
    const { pen } = t;
    const edge: Pt[] = [];
    for (let x = -20; x <= W + 20; x += 8) edge.push(pt(x, top(x)));
    pen.stroke(edge, 1.1, t.ink, FAR, false);
    // The log pile: whole trees thrown up by winter storms, criss-crossed at the back of the beach.
    driftLog(t, pt(270, top(270) - 2), pt(480, top(480) - 2), 10, true);
    driftLog(t, pt(560, top(560) + 2), pt(390, top(390) - 14), 7);
    driftLog(t, pt(650, top(650) + 2), pt(800, top(800) - 2), 11, true);
    driftLog(t, pt(470, top(470) + 12), pt(700, top(700) + 10), 7);
    driftLog(t, pt(30, top(30) + 14), pt(150, top(150) + 12), 6);
    driftLog(t, pt(990, top(990) + 16), pt(860, top(860) + 12), 7);
    for (const x of [240, 720, 340]) beachgrass(t, x, top(x) + 4, 16);
    // The wrack line: kelp and eelgrass left by the last tide.
    wrackLine(t, -20, W + 20, (x) => top(x) + 24 + 3 * wave(x, 4, 0.3));
  });
  fadeBottom(d, KELP_SHORE_H, 40);
}
