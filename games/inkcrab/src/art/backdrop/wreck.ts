import { type Draw, oval, pt } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { BACKDROP_W, band, FAR, fadeBottom, tiled } from './common';
import { glow, towering } from './estuary';
import { longSwells, surf } from './fogCoast';
import { perchedPelican } from './gulfAnimals';
import { barrierIsland, dayMarker, glitter, GULF, GULF_FAR, ironLighthouse, ledge, limestone, sandbar } from './gulfCoast';
import { sabalPalm, seaGrape, seaOats, shellWrack } from './gulfLife';
import { driftLog } from './pnw';
import { bleachedTree, pilings, shipTimber, shipwreck } from './shipwreck';
import { cloud } from './tropic';

/**
 * Beach 7: Wreck Cove, a shelling beach on Florida's Gulf coast, Sanibel or
 * Captiva way, in warm late-afternoon light. Far off, a soft blue sky
 * warming to gold at the horizon, cumulus towering far out over the water
 * and fair-weather clouds drifting, an osprey circling and laughing gulls;
 * then the calm green Gulf, a barrier island lying low along the horizon
 * with its iron-frame lighthouse on the far point, a shrimp boat running
 * home with her nets hoisted, dolphins rolling and pelicans in file low
 * over the water; an old wooden sailing ship wrecked on the limestone just
 * offshore, broken-backed and listing, her stern stove in to the ribs, a
 * snapped mast trailing rags of sail and rigging, the surf breaking white
 * against her, with the stumps of an old pier running out from a spit of
 * sea grape and cabbage palms, a pelican resting on one; nearest, white
 * sand and low dunes of sea oats and sea grape under cabbage palms, big
 * bleached driftwood and a whole white tree, a ship's timber with its iron
 * bolts washed up, and the wrack line studded with shells. (No small
 * creatures nearby: the level's own crabs and the like must never be
 * mistaken for scenery.)
 */
const W = BACKDROP_W;
const SKY = '#8fc2dc';
const SKY_WARM = '#f7d29a';
const SKY_GOLD = '#fbe6bf';
const SAND = '#efe6cf';
const SAND_GRAIN = '#9c8f74';
const DUNE_GREEN = '#a3ad6a';
const SUN_X = 300;

/** A smooth wave that repeats exactly every tile, so anything shaped by it wraps seamlessly. */
const wave = (x: number, k: number, phase = 0): number => Math.sin((x / W) * Math.PI * 2 * k + phase);

/**
 * The sky and clouds reach down to the horizon (their layers sit lower
 * than other themes' skies, see THEMES), so the cumulus can tower up off
 * the far edge of the sea.
 */
export const WRECK_SKY_H = 300;
const CLOUD_BASE = 284;
export const WRECK_SEA_H = 200;
export const WRECK_CLIFFS_H = 300;
const SHORE_HEADROOM = 70;
export const WRECK_SHORE_H = 250 + SHORE_HEADROOM;
const SHORE_GROUND = 200 + SHORE_HEADROOM;

export function sky(d: Draw): void {
  const H = WRECK_SKY_H;
  // Soft blue overhead, warming down through gold to the horizon; it fades out before the layer's foot.
  band(d, 0, H * 0.35, SKY, 0.3, 0.36);
  band(d, H * 0.35, H * 0.8, SKY, 0.36, 0);
  band(d, H * 0.4, H * 0.88, SKY_WARM, 0, 0.5);
  band(d, H * 0.88, H, SKY_WARM, 0.5, 0);
  band(d, H * 0.7, H * 0.9, SKY_GOLD, 0, 0.5);
  band(d, H * 0.9, H, SKY_GOLD, 0.5, 0);
  tiled(d, 971, (t) => {
    const { pen } = t;
    // The late sun, lowering in the west: a white disc in a broad golden glow.
    glow(t, SUN_X, 150, 150, 110, '#fbe2a8', 0.5);
    glow(t, SUN_X, 150, 36, 34, '#fff6e0', 0.9);
    pen.fill(oval(SUN_X, 150, 12, 12, 24), PAPER_FILL, 1);
    const rim = oval(SUN_X, 150, 13, 13, 36);
    for (let i = 0; i < 36; i += 6) pen.hair(rim.slice(i, i + 4), 0.7, t.ink, FAR * 0.45);
    // Cumulus towering far out over the Gulf, lit gold on the side towards the sun.
    for (const [x, w, h] of [[600, 140, 150], [880, 96, 104], [90, 80, 74], [420, 56, 44]] as const) {
      towering(t, x, CLOUD_BASE, w, h);
      glow(t, x - w * 0.3, CLOUD_BASE - h * 0.6, w * 0.45, h * 0.5, '#f8c99a', 0.22);
    }
    // Haze lying along the horizon.
    for (let x = -40; x < W + 40; x += 80) glow(t, x + pen.jitter(20), CLOUD_BASE + 2, 90, 9, SKY_GOLD, 0.5);
  });
}

/** Fair-weather cumulus drifting slowly across: their own layer (the osprey and gulls are movers). */
export function clouds(d: Draw): void {
  tiled(d, 975, (t) => {
    for (const [x, y, w, n] of [[170, 64, 104, 6], [520, 40, 76, 5], [830, 92, 92, 5], [360, 150, 54, 4], [990, 196, 38, 3], [250, 236, 28, 3], [760, 228, 26, 3]] as const) cloud(t, x, y, w, n);
  });
}

const HORIZON = 70;

/** The calm Gulf: barrier islands on the horizon with their lighthouse, a channel marker, swell and the sun's glitter. */
export function sea(d: Draw): void {
  const H = WRECK_SEA_H;
  band(d, HORIZON, H, GULF_FAR, 0.45, 0.1);
  band(d, HORIZON, H, GULF, 0.04, 0.4);
  band(d, HORIZON, HORIZON + 24, SKY_GOLD, 0.45, 0);
  tiled(d, 972, (t) => {
    const { pen } = t;
    barrierIsland(t, -30, 400, HORIZON, 6, 0.8);
    const point = barrierIsland(t, 520, 740, HORIZON, 8);
    ironLighthouse(t, 716, HORIZON - point(716) + 1.5, 0.95);
    barrierIsland(t, 820, 980, HORIZON, 4, 0.6);
    pen.stroke([pt(-20, HORIZON), pt(W + 20, HORIZON)], 0.9, t.ink, FAR * 0.8, false);
    longSwells(t, HORIZON + 6, H - 8, 7);
    glitter(t, 0, W, HORIZON + 2, H - 4, 220, SUN_X + 40, '#fbe2a8');
    dayMarker(t, 470, 112, 1, true);
    dayMarker(t, 506, 104, 0.8, false);
  });
}

const WATER = WRECK_CLIFFS_H - 50;

/**
 * The cove: a low spit of white sand with sea grape and cabbage palms, the
 * old pier's stumps running out from it, a pelican resting on one; the
 * wreck on the limestone just offshore with the surf breaking against her,
 * and more rocks along the cove.
 */
export function cliffs(d: Draw): void {
  band(d, WATER - 8, WATER + 6, GULF, 0, 0.45);
  band(d, WATER + 6, WRECK_CLIFFS_H, GULF, 0.45, 0.4);
  tiled(d, 973, (t) => {
    const { pen } = t;
    sandbar(t, 300, 520, WATER + 26, 9);
    sandbar(t, 760, 1000, WATER + 36, 11);
    // The spit: a low hump of white sand running into the water, thick with sea grape, a few palms.
    const spit = (x: number): number => WATER - 22 * Math.max(0, Math.min(1, (230 - x) / 90, (x + 110) / 70)) ** 0.7 - 3 * Math.sin(x * 0.05);
    for (const [x, h, lean] of [[40, 120, 0.04], [96, 96, -0.06], [-10, 84, 0.08]] as const) sabalPalm(t, x, spit(x) + 6, h, lean);
    const edge: Pt[] = [];
    for (let x = -116; x <= 250; x += 4) edge.push(pt(x, Math.min(WATER + 1, spit(x))));
    const land = [...edge, pt(250, WATER + 2), pt(-116, WATER + 2)];
    pen.fill(land, PAPER_FILL, 1);
    pen.fill(land, SAND, 0.7);
    pen.stipple(land, 500, () => 0.6, 0.35, SAND_GRAIN);
    pen.hair(edge, 0.7, t.ink, FAR * 0.8);
    for (const [x, w, h] of [[10, 110, 30], [120, 80, 22], [180, 50, 14]] as const) seaGrape(t, x, spit(x) + 3, w, h);
    // The old pier's stumps, marching out into the cove.
    const tops = pilings(t, [[236, 34, 0], [262, 30, 0.04], [288, 36, -0.02], [314, 22, 0.08], [340, 30, 0], [366, 14, -0.1], [392, 24, 0.03], [420, 10, 0.12]], WATER + 3);
    perchedPelican(t, tops[2]!.x, tops[2]!.y, 1.1, -1);
    // The wreck, and the limestone she struck: rocks round her bow and stern, others along the cove.
    shipwreck(t, 620, WATER + 2, 1.5);
    const rock = (x: number, rx: number, ry: number): void => limestone(t, ledge(t, x, rx * 2, ry * 1.2, WATER), WATER);
    rock(768, 38, 20);
    rock(724, 20, 11);
    rock(476, 14, 7);
    rock(440, 9, 4);
    rock(890, 36, 20);
    rock(932, 22, 12);
    rock(856, 12, 6);
    for (const [x0, x1] of [[150, 250], [430, 830], [836, 960]] as const) surf(t, x0, x1, WATER);
    // Waves bursting against her side and through the ribs aft.
    for (const [x, y, rx, ry] of [[500, WATER - 14, 30, 20], [540, WATER - 6, 22, 9], [800, WATER - 22, 26, 20], [740, WATER - 8, 20, 8], [880, WATER - 24, 18, 14]] as const) {
      glow(t, x, y, rx, ry, '#ffffff', 0.8);
      // Spray flung up: a burst of white flecks and drops.
      for (let k = 0; k < 14; k++) {
        const a = -Math.PI / 2 + pen.jitter(1.1);
        const r = rx * (0.3 + pen.rng() * 0.7);
        const p = pt(x + Math.cos(a) * r, y + ry * 0.5 + Math.sin(a) * r * 0.9);
        if (k % 3) pen.dot(p.x, p.y, 0.5 + pen.rng() * 0.5, PAPER_FILL, 0.9);
        else pen.hair([pt(x + Math.cos(a) * r * 0.3, y + ry * 0.6), p], 0.6, PAPER_FILL, 0.85);
      }
    }
    longSwells(t, WATER + 10, WRECK_CLIFFS_H - 12, 4);
  });
  fadeBottom(d, WRECK_CLIFFS_H, 30);
}

/** A dune behind the beach: a hump of white sand from x0 to x1, `h` high at its crest. Returns its top. */
function dune(t: Draw, x0: number, x1: number, ground: (x: number) => number, h: number): (x: number) => number {
  const { pen } = t;
  const top = (x: number): number => ground(x) - h * Math.max(0, Math.sin((Math.PI * (x - x0)) / (x1 - x0))) ** 0.8;
  const edge: Pt[] = [];
  for (let x = x0; x <= x1; x += 4) edge.push(pt(x, top(x)));
  const shape = [...edge, pt(x1, ground(x1) + 6), pt(x0, ground(x0) + 6)];
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, SAND, 0.55);
  pen.stipple(shape, Math.round((x1 - x0) * h * 0.06), () => 0.6, 0.35, SAND_GRAIN);
  pen.clipped(shape, () => pen.fill(edge.map((p) => pt(p.x, p.y + h * 0.4)).concat([...edge].reverse()), DUNE_GREEN, 0.25));
  pen.clipped(shape, () => pen.hatch(shape, 1.8, 1.15, 0.35, { color: t.ink, alpha: FAR * 0.2, onlyBelow: Math.min(...edge.map((p) => p.y)) + h * 0.5 }));
  pen.hair(edge, 0.7, t.ink, FAR * 0.8);
  return top;
}

/** The beach floor: white shell sand, laid once across exactly one tile so its edges neither double nor seam. */
function floorSand(d: Draw, top: (x: number) => number): void {
  const { pen } = d;
  const edge: Pt[] = [];
  for (let x = 0; x <= W; x += 8) edge.push(pt(x, top(x)));
  const shape = [...edge, pt(W, WRECK_SHORE_H), pt(0, WRECK_SHORE_H)];
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, SAND, 0.6);
  pen.stipple(shape, 2000, () => 0.5, 0.35, SAND_GRAIN);
  pen.fill([...edge, ...[...edge].reverse().map((p) => pt(p.x, p.y + 6))], '#b9ad92', 0.18);
}

/**
 * The near shore: low dunes of sea oats and sea grape under cabbage palms,
 * white sand below with the big driftwood lying on it, a whole bleached
 * tree, the ship's timber washed up, and the wrack line studded with shells.
 */
export function shore(d: Draw): void {
  const G = SHORE_GROUND;
  const top = (x: number): number => G - 3 * wave(x, 3, 0.9) - 2 * wave(x, 7, 2.2);
  tiled(d, 974, (t) => {
    for (const [x, h, lean] of [[70, 124, 0.05], [196, 100, -0.08]] as const) sabalPalm(t, x, top(x) - 30, h, lean);
    const west = dune(t, -40, 290, top, 42);
    seaGrape(t, 120, west(120) + 4, 120, 34);
    seaGrape(t, 250, west(250) + 3, 60, 18);
    for (const x of [-20, 30, 190, 270]) seaOats(t, x, west(x) + 2, 46);
    sabalPalm(t, 944, top(944) - 22, 112, -0.04);
    const east = dune(t, 790, 1010, top, 30);
    seaGrape(t, 870, east(870) + 4, 90, 26);
    for (const x of [810, 930, 990]) seaOats(t, x, east(x) + 2, 42);
  });
  floorSand(d, top);
  tiled(d, 976, (t) => {
    const { pen } = t;
    const edge: Pt[] = [];
    for (let x = -20; x <= W + 20; x += 8) edge.push(pt(x, top(x)));
    pen.stroke(edge, 1.1, t.ink, FAR, false);
    bleachedTree(t, pt(330, top(330) + 2), pt(560, top(560) - 4), 8);
    driftLog(t, pt(640, top(640) + 8), pt(770, top(770) + 4), 7);
    shipTimber(t, pt(470, top(470) + 18), pt(600, top(600) + 15), 4);
    driftLog(t, pt(40, top(40) + 16), pt(150, top(150) + 14), 5);
    for (const x of [310, 620, 790]) seaOats(t, x, top(x) + 4, 30);
    shellWrack(t, -20, W + 20, (x) => top(x) + 30 + 3 * wave(x, 4, 0.3));
  });
  fadeBottom(d, WRECK_SHORE_H, 40);
}
