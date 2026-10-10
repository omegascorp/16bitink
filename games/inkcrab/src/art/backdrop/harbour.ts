import { bezier, type Draw, pt } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { chineseNet, churchFront, stiltHut, tiledHouse } from './chineseNets';
import { BACKDROP_W, band, FAR, fadeBottom, tiled } from './common';
import { glow } from './estuary';
import { longSwells, surf } from './fogCoast';
import { glitter } from './gulfCoast';
import { type Bands, beachedVallam, keralaTrawler, vallam, VALLAM_BLUE, VALLAM_GREEN, VALLAM_RED, vallamHull } from './keralaBoats';
import { fallenFrond, floatLine, grassBank, husk, netHeap, screwPine, seaWall } from './keralaLife';
import { boulder, breakwater, chop, farCoast, lateriteCliff, SEA, SEA_FAR, stripedLighthouse, whitecaps } from './malabar';
import { cloudDeck, cumulonimbus, fractus, rainCurtain, SLATE, sunbreak, VIOLET, virga, WASHED } from './monsoonSky';
import { puddle } from './mudLife';
import { palm } from './tropic';
import { reflection } from './water';

/**
 * Beach 8: Monsoon Harbour, a fishing village on the Malabar coast of
 * Kerala, Fort Kochi or Varkala way, in a lull of the south-west monsoon.
 * Far off, a low, heavy ceiling of slate and violet cloud, thunderheads
 * towering far out at sea with their anvils spread and curtains of rain
 * trailing from them to the water, and a break of washed light low on the
 * horizon with shafts of it slanting down; brahminy kites wheeling, crows
 * and egrets crossing; then the grey-green Arabian Sea running short and
 * choppy with whitecaps, a low coast of coconut groves, the harbour's
 * breakwater with its light, trawlers and vallams working; the red
 * laterite cliffs with palms leaning off their lip and the red-and-white
 * lighthouse on the headland; the row of Chinese fishing nets along the
 * waterfront, stilt huts under palm thatch, tiled houses and a whitewashed
 * church among the palms, painted boats at their moorings; nearest, wet
 * golden-brown sand with the vallams drawn up on their rollers, heaps of
 * net strung with orange floats, puddles holding the grey sky, the sea
 * wall's granite boulders and the palms leaning out over the beach. (No
 * small creatures nearby: the level's own crabs and the like must never be
 * mistaken for scenery.)
 */
const W = BACKDROP_W;
const SAND = '#c9a46a';
const SAND_WET = '#a9885a';
const SAND_GRAIN = '#7d6440';

/** A smooth wave that repeats exactly every tile, so anything shaped by it wraps seamlessly. */
const wave = (x: number, k: number, phase = 0): number => Math.sin((x / W) * Math.PI * 2 * k + phase);

/**
 * The sky and clouds reach down to the horizon (their layers sit low, as
 * the wreck's do, see THEMES), so the thunderheads and their rain stand on
 * the sea's far edge.
 */
export const HARBOUR_SKY_H = 300;
const SKY_HORIZON = 288;
export const HARBOUR_SEA_H = 200;
export const HARBOUR_CLIFFS_H = 300;
const SHORE_HEADROOM = 70;
export const HARBOUR_SHORE_H = 250 + SHORE_HEADROOM;
const SHORE_GROUND = 200 + SHORE_HEADROOM;
const BREAK_X = 600;

export function sky(d: Draw): void {
  const H = HARBOUR_SKY_H;
  // Heavy slate overhead, greying to violet, then the washed light along the horizon; gone before the layer's foot.
  band(d, 0, H * 0.35, SLATE, 0.46, 0.42);
  band(d, H * 0.35, H * 0.8, SLATE, 0.42, 0.1);
  band(d, H * 0.3, H * 0.75, VIOLET, 0, 0.28);
  band(d, H * 0.75, H, VIOLET, 0.28, 0);
  band(d, H * 0.76, H * 0.93, WASHED, 0, 0.62);
  band(d, H * 0.93, H, WASHED, 0.62, 0);
  tiled(d, 981, (t) => {
    sunbreak(t, BREAK_X, SKY_HORIZON, 210, 7);
    // Thunderheads far out over the sea, rain trailing from them.
    cumulonimbus(t, 190, 196, 120, 150, SKY_HORIZON, 16);
    cumulonimbus(t, 860, 214, 92, 112, SKY_HORIZON, 12);
    cumulonimbus(t, 430, 262, 44, 52, SKY_HORIZON, 5);
    rainCurtain(t, 1000, 170, SKY_HORIZON, 70, 14, 0.3);
    rainCurtain(t, 700, 200, SKY_HORIZON - 2, 40, 10, 0.18);
    // Haze lying along the horizon.
    for (let k = 0; k < 12; k++) glow(t, (k * W) / 12 + t.pen.jitter(20), SKY_HORIZON + 2, 90, 8, WASHED, 0.45);
  });
}

/** The low monsoon ceiling, ragged scud driven under it and grey veils of rain hanging: their own layer, drifting. */
export function clouds(d: Draw): void {
  band(d, 0, 50, SLATE, 0.2, 0);
  tiled(d, 985, (t) => {
    cloudDeck(t, 0, 56);
    virga(t, 410, 60, 70, 70, 10);
    virga(t, 760, 64, 46, 50, 8);
    virga(t, 70, 62, 50, 40, 6);
    for (const [x, y, w, h] of [[150, 112, 130, 14], [540, 96, 170, 16], [820, 148, 110, 12], [340, 176, 90, 10], [970, 78, 110, 13], [650, 206, 70, 8]] as const) fractus(t, x, y, w, h);
  });
}

const HORIZON = 70;

/** The Arabian Sea: a low coast of palms, the harbour's breakwater and its light, far boats, short choppy seas and whitecaps. */
export function sea(d: Draw): void {
  const H = HARBOUR_SEA_H;
  band(d, HORIZON, H * 0.6, SEA_FAR, 0.42, 0.45);
  band(d, H * 0.6, H, SEA, 0.45, 0.42);
  band(d, HORIZON, HORIZON + 22, WASHED, 0.45, 0);
  tiled(d, 982, (t) => {
    const { pen } = t;
    farCoast(t, 760, 1250, HORIZON, 10, 0.85);
    farCoast(t, 300, 410, HORIZON, 5, 0.55);
    pen.stroke([pt(-20, HORIZON), pt(W + 20, HORIZON)], 0.9, t.ink, FAR * 0.7, false);
    // Light from the break, lying on the water under it.
    glow(t, BREAK_X, HORIZON + 8, 180, 14, WASHED, 0.6);
    glitter(t, BREAK_X - 140, BREAK_X + 140, HORIZON + 2, H - 30, 110, BREAK_X, WASHED);
    keralaTrawler(t, 330, HORIZON + 3, 0.28);
    keralaTrawler(t, 690, HORIZON + 5, 0.34);
    vallam(t, 236, HORIZON + 16, 0.36);
    breakwater(t, 420, 560, HORIZON + 24, 4.5, 0.8, true);
    longSwells(t, HORIZON + 8, H - 10, 6);
    chop(t, HORIZON + 3, H - 6, 900);
    whitecaps(t, HORIZON + 10, H - 6, 120);
  });
}

const WATER = HARBOUR_CLIFFS_H - 50;

/** A boat at her mooring: the hull rocking on the water, its reflection and the line to the buoy. */
function moored(t: Draw, x: number, water: number, s: number, bands: Bands): void {
  const P = (dx: number, dy: number): Pt => pt(x + dx * s, water + 1 * s + dy * s);
  reflection(t, x, water + 1, 50 * s, 8 * s, bands.mid, 0.3);
  vallamHull(t, P, bands, s);
  t.pen.hair(bezier(P(33, -18), P(40, -6), P(46, 1), 6), 0.35, t.ink, FAR * 0.7);
  t.pen.dot(x + 46 * s, water + 0.5, 1.2 * s, '#e8823a', 0.8);
}

/** The headland: the laterite cliff, palms leaning off its lip, the lighthouse; boulders and surf at its foot. */
function headland(t: Draw): void {
  const height = (x: number): number => {
    if (x < -150 || x > 214) return 0;
    const rise = Math.min(1, (x + 150) / 80) ** 0.8;
    return rise * (82 + 18 * Math.sin((x + 60) * 0.012) + 4 * Math.sin(x * 0.07));
  };
  for (const [x, h, lean] of [[-110, 60, 0.14], [-50, 74, 0.22], [30, 66, -0.12], [170, 80, 0.3], [196, 58, 0.36]] as const) palm(t, x, WATER - height(x) + 4, h, lean, 0.45);
  stripedLighthouse(t, 100, WATER - height(100) + 1, 1.15);
  lateriteCliff(t, -150, 214, WATER, height);
  for (const [x, rx, ry] of [[218, 12, 9], [232, 7, 5], [-30, 9, 5], [120, 10, 6], [200, 8, 6]] as const) boulder(t, x, WATER - ry * 0.4, rx, ry);
  surf(t, -150, 245, WATER);
}

/** The village: palms and houses on a low bank, the church among them, stilt huts at the water's edge. */
function village(t: Draw, x0: number, x1: number): void {
  const { pen } = t;
  const land = (x: number): number => WATER - 12 * Math.max(0, Math.min(1, (x - x0) / 30, (x1 - x) / 30));
  for (const [x, h, lean] of [[340, 96, 0.1], [430, 116, -0.08], [520, 100, 0.16], [640, 124, -0.06], [700, 92, 0.2]] as const) palm(t, x, land(x) + 2, h, lean, 0.5);
  churchFront(t, 575, land(575) + 1, 1);
  tiledHouse(t, 395, land(395) + 1, 0.9, '#e9d8b8');
  tiledHouse(t, 485, land(485) + 1, 0.85, '#b9cfd6', 1.2);
  tiledHouse(t, 665, land(665) + 1, 0.9, '#dcb7aa');
  for (const [x, h, lean] of [[455, 80, 0.24], [612, 70, -0.2]] as const) palm(t, x, land(x) + 3, h, lean, 0.45);
  const edge: Pt[] = [];
  for (let x = x0; x <= x1; x += 4) edge.push(pt(x, land(x)));
  const bank = [...edge, pt(x1, WATER + 2), pt(x0, WATER + 2)];
  pen.fill(bank, PAPER_FILL, 1);
  pen.fill(bank, SAND, 0.5);
  pen.clipped(bank, () => pen.fill(edge.map((p) => pt(p.x, p.y + 4)).concat([...edge].reverse()), '#6f8f52', 0.45));
  pen.hair(edge, 0.6, t.ink, FAR * 0.8);
  stiltHut(t, 312, WATER + 1, 0.95);
  stiltHut(t, 735, WATER + 1, 0.9);
}

/**
 * The harbour: the laterite headland and its lighthouse, the village among
 * its palms, the Chinese nets along the waterfront, boats at their moorings.
 */
export function cliffs(d: Draw): void {
  band(d, WATER - 8, WATER + 6, SEA, 0, 0.45);
  band(d, WATER + 6, HARBOUR_CLIFFS_H, SEA, 0.45, 0.4);
  tiled(d, 983, (t) => {
    headland(t);
    village(t, 290, 760);
    moored(t, 258, WATER + 4, 0.7, VALLAM_RED);
    for (const [x, lift, s] of [[332, 1, 0.8], [425, 0.65, 0.9], [515, 0.1, 0.85], [606, 0.95, 0.9], [700, 0.4, 0.8]] as const) chineseNet(t, x, WATER, s, lift);
    surf(t, 290, 760, WATER);
    moored(t, 800, WATER + 10, 0.8, VALLAM_GREEN);
    moored(t, 846, WATER + 3, 0.6, VALLAM_BLUE);
    longSwells(t, WATER + 10, HARBOUR_CLIFFS_H - 12, 4);
    whitecaps(t, WATER + 12, HARBOUR_CLIFFS_H - 14, 30);
  });
  fadeBottom(d, HARBOUR_CLIFFS_H, 30);
}

/** The beach floor: wet golden-brown sand holding the sky's grey sheen, laid once across exactly one tile so it neither doubles nor seams. */
function floorSand(d: Draw, top: (x: number) => number): void {
  const { pen } = d;
  const edge: Pt[] = [];
  for (let x = 0; x <= W; x += 8) edge.push(pt(x, top(x)));
  const shape = [...edge, pt(W, HARBOUR_SHORE_H), pt(0, HARBOUR_SHORE_H)];
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, SAND, 0.55);
  pen.stipple(shape, 2200, () => 0.5, 0.35, SAND_GRAIN);
  pen.fill([...edge, ...[...edge].reverse().map((p) => pt(p.x, p.y + 6))], SAND_WET, 0.25);
  pen.clipped(shape, () => {
    pen.fill([pt(0, SHORE_GROUND + 26), pt(W, SHORE_GROUND + 26), pt(W, HARBOUR_SHORE_H), pt(0, HARBOUR_SHORE_H)], SAND_WET, 0.25);
    // The wet sand's sheen: long pale streaks and grey glazes of sky lying in it.
    for (let k = 0; k < 40; k++) {
      const x = (k * W) / 40 + pen.jitter(10);
      const y = SHORE_GROUND + 30 + pen.rng() * 30;
      const len = 20 + pen.rng() * 50;
      pen.hair([pt(x, y), pt(x + len, y + pen.jitter(0.4))], 0.7, PAPER_FILL, 0.5);
      if (k % 3 === 0) pen.fill([pt(x, y + 1), pt(x + len, y + 1), pt(x + len * 0.9, y + 3), pt(x + len * 0.1, y + 3)], SLATE, 0.12);
    }
  });
}

/**
 * The near shore: the grassy bank under leaning palms with screw pines,
 * the sea wall's granite boulders, wet sand with vallams drawn up on their
 * rollers, heaps of net and their floats, husks and fronds, and puddles
 * holding the grey sky.
 */
export function shore(d: Draw): void {
  const G = SHORE_GROUND;
  const top = (x: number): number => G - 3 * wave(x, 3, 0.4) - 2 * wave(x, 7, 1.1);
  tiled(d, 984, (t) => {
    for (const [x, h, lean] of [[30, 160, 0.2], [120, 128, -0.12], [-50, 120, 0.3], [230, 110, 0.34]] as const) palm(t, x, top(x) - 26, h, lean, 0.9);
    const bank = grassBank(t, -60, 300, top, 34);
    for (const x of [170, 270, -20]) screwPine(t, x, bank(x) + 3, 34);
    palm(t, 900, top(900) - 22, 150, -0.3, 0.9);
    palm(t, 970, top(970) - 20, 118, -0.16, 0.85);
    seaWall(t, 780, 1010, top, 28);
  });
  floorSand(d, top);
  tiled(d, 986, (t) => {
    const { pen } = t;
    const edge: Pt[] = [];
    for (let x = -20; x <= W + 20; x += 8) edge.push(pt(x, top(x)));
    pen.stroke(edge, 1.1, t.ink, FAR, false);
    for (const [x, rx, ry] of [[770, 10, 7], [1006, 12, 8], [990, 7, 5]] as const) boulder(t, x, top(x) + 6, rx, ry);
    fallenFrond(t, pt(60, top(60) + 20), pt(170, top(170) + 16));
    beachedVallam(t, 440, top(440) + 18, 1.5, VALLAM_BLUE, -0.03);
    netHeap(t, 575, top(575) + 22, 42, 9, '#3f7f9a');
    beachedVallam(t, 705, top(705) + 24, 1.25, VALLAM_RED, 0.04);
    netHeap(t, 860, top(860) + 30, 36, 8, '#4f8f5a');
    floatLine(t, bezier(pt(250, top(250) + 34), pt(300, top(300) + 30), pt(340, top(340) + 38), 10));
    for (const [x, y, rx, ry] of [[300, 44, 26, 3.5], [610, 46, 34, 4], [940, 44, 22, 3], [120, 46, 18, 2.5]] as const) puddle(t, x, top(x) + y, rx, ry, SLATE);
    for (const [x, dy] of [[220, 26], [520, 40], [790, 36], [990, 30], [340, 20]] as const) husk(t, x, top(x) + dy, 1.1);
  });
  fadeBottom(d, HARBOUR_SHORE_H, 40);
}

