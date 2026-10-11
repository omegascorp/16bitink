import { type Draw, pt } from '../kit';
import type { Pt } from '../pen';
import { PAPER_FILL } from '../palette';
import { float } from './coast';
import { BACKDROP_W, band, FAR, fadeBottom, tiled } from './common';
import { glow } from './estuary';
import { surf } from './fogCoast';
import { through } from './granite';
import { glitter } from './gulfCoast';
import { barrens, fishingStage, flagpole, inuksuk, outportChurch, saltbox, SALTBOX_BLUE, SALTBOX_GREEN, SALTBOX_RED, SALTBOX_WHITE, SALTBOX_YELLOW, spindrift, washLine } from './labradorCoast';
import { cobble, lobsterPot, lymeGrass, shingle, SHINGLE, SHINGLE_DARK, snowDrift, stormRidge, strandedIce, upturnedDory } from './labradorShore';
import { cloudStreet, COLD_SKY, gustLine, lenticular, lowSun, SKY_PALE, streamers, SUN_PALE } from './labradorSky';
import { boulder, chop, whitecaps } from './malabar';
import { brash, harpPup, harpSeal, iceberg, iceFoot, icePan, LAB_SEA, LAB_SEA_FAR, packIce } from './packIce';
import { driftLog } from './pnw';
import { cirrus } from './water';

/**
 * Beach 9: Frost Shingle, a storm beach on the Labrador coast in early
 * spring, a bright, bitter day with a gale blowing off the land. Far off, a
 * pale, cold, high sky, the low sun ringed by its halo with sun dogs either
 * side, mares' tails high up, stratocumulus laid out in long streets and
 * torn into streamers at their lee ends, lenticulars standing over the
 * hills; kittiwakes and tumbling ravens on the wind; then the grey-blue
 * Labrador Sea crowded with broken pack ice, flat white pans with turquoise
 * edges, slush between them, icebergs standing tall among them, a
 * longliner and a punt shouldering through the chop and eiders beating
 * low over the water in a line; the barren hills of the coast, dark rock
 * and brown tundra with snow in the gullies, an inuksuk on the ridge, the
 * ice foot still fast along the shore; an outport at its cove, saltbox
 * houses painted red, yellow and white, a little church, washing and a flag
 * standing straight out in the wind, fishing stages on their stilts; a
 * berg grounded off the point and harp seals hauled out on a pan with a
 * whitecoat; nearest, the shingle storm ridge of rounded grey, ochre and
 * slate stones, bleached driftwood, snow drifted in the lee of the
 * boulders, lyme grass bent over by the wind, lobster pots, a dory turned
 * turtle for the winter, and blocks of ice the tide left on the stones.
 * (No small creatures nearby: the level's own crabs and the like must
 * never be mistaken for scenery.)
 */
const W = BACKDROP_W;
const SUN_X = 720;
const SUN_Y = 190;

/** A smooth wave that repeats exactly every tile, so anything shaped by it wraps seamlessly. */
const wave = (x: number, k: number, phase = 0): number => Math.sin((x / W) * Math.PI * 2 * k + phase);

/**
 * The sky and clouds reach down to the horizon (their layers sit low, as
 * the harbour's do, see THEMES), so the far cloud streets and the
 * lenticulars stand on the sea's far edge.
 */
export const FROST_SKY_H = 300;
const SKY_HORIZON = 288;
export const FROST_SEA_H = 200;
export const FROST_CLIFFS_H = 300;
const SHORE_HEADROOM = 70;
export const FROST_SHORE_H = 250 + SHORE_HEADROOM;
const SHORE_GROUND = 200 + SHORE_HEADROOM;

export function sky(d: Draw): void {
  const H = FROST_SKY_H;
  // A clear, cold blue overhead, paling to near white along the horizon; gone before the layer's foot.
  band(d, 0, H * 0.4, COLD_SKY, 0.62, 0.46);
  band(d, H * 0.4, H * 0.85, COLD_SKY, 0.46, 0.08);
  band(d, H * 0.5, H * 0.9, SKY_PALE, 0, 0.75);
  band(d, H * 0.9, H, SKY_PALE, 0.75, 0);
  tiled(d, 991, (t) => {
    const { pen } = t;
    // Mares' tails high up: the wind aloft.
    for (const [x, y, w] of [[110, 34, 90], [370, 20, 70], [540, 58, 84], [930, 28, 100], [250, 96, 60]] as const) cirrus(t, x, y, w);
    lowSun(t, SUN_X, SUN_Y, 58);
    // Lenticulars standing in the wind over the far hills.
    lenticular(t, 230, 236, 120, 8, 3);
    lenticular(t, 880, 250, 74, 6, 2);
    // Far cloud streets running away towards the horizon, closer and thinner the further off.
    for (const [y, h] of [[262, 6], [276, 4], [284, 3]] as const) cloudStreet(t, 0, W - 40, y, h);
    for (let k = 0; k < 12; k++) glow(t, (k * W) / 12 + pen.jitter(20), SKY_HORIZON + 2, 90, 7, SKY_PALE, 0.55);
  });
}

/** Stratocumulus in long streets on the gale, torn at their lee ends, and the gusts themselves: their own layer, drifting briskly. */
export function clouds(d: Draw): void {
  tiled(d, 995, (t) => {
    cloudStreet(t, 0, W - 80, 52, 17, -0.01);
    cloudStreet(t, 40, W - 60, 124, 12, 0.008);
    cloudStreet(t, 0, W - 50, 190, 8);
    for (const [x, y, len] of [[420, 30, 160], [760, 84, 120], [160, 150, 90]] as const) streamers(t, x, y, len, 6);
    for (const [x, y, len, curl] of [[60, 92, 120, 1], [520, 150, 150, -1], [820, 196, 100, 1], [300, 228, 80, -1], [660, 40, 90, 1]] as const) gustLine(t, x, y, len, curl);
  });
}

const HORIZON = 70;

/** The Labrador Sea: far barrens on the horizon, icebergs among the pack ice, slush, short seas whipped white by the wind. */
export function sea(d: Draw): void {
  const H = FROST_SEA_H;
  band(d, HORIZON, H * 0.55, LAB_SEA_FAR, 0.55, 0.55);
  band(d, H * 0.55, H, LAB_SEA, 0.55, 0.5);
  band(d, HORIZON, HORIZON + 18, SKY_PALE, 0.45, 0);
  tiled(d, 992, (t) => {
    const { pen } = t;
    barrens(t, 520, 1150, HORIZON, through([[520, 0], [560, 8], [640, 14], [720, 22], [800, 17], [880, 26], [960, 20], [1040, 12], [1120, 6], [1150, 0]]), 0.2, 1.3);
    barrens(t, 120, 330, HORIZON, through([[120, 0], [170, 6], [240, 9], [300, 5], [330, 0]]), 0.1, 1.3);
    pen.stroke([pt(-20, HORIZON), pt(W + 20, HORIZON)], 0.9, t.ink, FAR * 0.7, false);
    glitter(t, SUN_X - 140, SUN_X + 140, HORIZON + 2, H - 40, 70, SUN_X, SUN_PALE);
    chop(t, HORIZON + 3, H - 6, 520);
    whitecaps(t, HORIZON + 10, H - 6, 120);
    // The far pack: a white rim of ice along the horizon, then the bergs standing in it, then the nearer pans.
    packIce(t, 0, W, HORIZON + 2, HORIZON + 14, 70, 0.45);
    iceberg(t, 640, HORIZON + 6, 0.5, 'drydock');
    iceberg(t, 430, HORIZON + 3, 0.22, 'tabular');
    iceberg(t, 230, HORIZON + 12, 0.85, 'pinnacle');
    packIce(t, 0, W, HORIZON + 14, H - 14, 40, 0.9);
    brash(t, 0, W, HORIZON + 6, H - 10, 150);
  });
}

const WATER = FROST_CLIFFS_H - 50;

/** The headland: a barren hill of dark rock and tundra, snow in its gullies, the inuksuk on its shoulder, the ice foot along its shore. */
function headland(t: Draw): void {
  const height = through([[-250, 0], [-226, 12], [-190, 44], [-150, 74], [-104, 100], [-56, 122], [-14, 134], [24, 128], [60, 110], [100, 94], [140, 86], [176, 90], [210, 80], [244, 56], [276, 30], [300, 12], [320, 0]]);
  barrens(t, -250, 320, WATER, height, 1, 1);
  inuksuk(t, 166, WATER - height(166) + 1.5, 1.5);
  // Snow smoking off the summit and the shoulder in the gale.
  spindrift(t, -12, WATER - height(-12) - 1, 60);
  spindrift(t, 178, WATER - height(178) - 1, 36);
  for (const [x, rx, ry] of [[-232, 12, 8], [-206, 8, 5], [280, 10, 7], [306, 7, 4], [40, 9, 5]] as const) boulder(t, x, WATER - ry * 0.4, rx, ry);
  iceFoot(t, -246, -60, WATER, 4);
  iceFoot(t, 60, 318, WATER, 3.5);
  surf(t, -250, 320, WATER);
}

/** The outport: barrens rising behind the cove, its houses and church on the slope, washing and a flag out in the wind. */
function outport(t: Draw): void {
  const back = through([[300, 0], [340, 30], [420, 58], [500, 74], [580, 70], [660, 84], [730, 52], [790, 0]]);
  barrens(t, 300, 790, WATER, back, 0.55, 1.1);
  spindrift(t, 662, WATER - back(662) - 1, 40);
  const slope = through([[290, 0], [320, 12], [380, 18], [450, 26], [540, 30], [620, 24], [680, 16], [720, 8], [760, 0]]);
  barrens(t, 290, 760, WATER, slope, 0.85, 0.5);
  const ground = (x: number, up = 0): number => WATER - slope(x) + 2 + up;
  // The upper row, smaller up the slope; then the lower row along the shore.
  saltbox(t, 470, ground(470, -18), 0.62, SALTBOX_RED);
  saltbox(t, 600, ground(600, -16), 0.6, SALTBOX_YELLOW, -1);
  outportChurch(t, 512, ground(512, -6), 0.8);
  washLine(t, pt(560, ground(560, -12)), pt(586, ground(586, -12)), 0.8, ['#f4f1ea', '#c4423a', '#5f86a0', '#f4f1ea', '#e3b23c']);
  flagpole(t, 640, ground(640, -2), 30, 0.9);
  saltbox(t, 380, ground(380), 0.85, SALTBOX_YELLOW);
  saltbox(t, 432, ground(432), 0.8, SALTBOX_WHITE, -1);
  saltbox(t, 670, ground(670), 0.85, SALTBOX_RED, -1);
  saltbox(t, 720, ground(720), 0.75, SALTBOX_GREEN);
  saltbox(t, 560, ground(560), 0.78, SALTBOX_BLUE);
  fishingStage(t, 350, WATER + 3, 1.15);
  fishingStage(t, 630, WATER + 4, 1.05);
  surf(t, 300, 760, WATER);
}

/** The berg grounded off the point, and harp seals hauled out on a big pan in front of the cove with a whitecoat among them. */
function iceOffshore(t: Draw): void {
  iceberg(t, 790, WATER + 2, 1.15, 'pinnacle');
  packIce(t, 0, W, WATER + 4, WATER + 24, 14, 1.2);
  const pan = icePan(t, 520, WATER + 13, 120, 3.5, 0.09);
  const seat = (x: number): number => Math.min(...pan.filter((p) => Math.abs(p.x - x) < 14).map((p) => p.y)) + 4;
  harpSeal(t, 482, seat(482), 1);
  harpPup(t, 518, seat(518) + 1, 0.95, -1);
  harpSeal(t, 560, seat(560) + 1.5, 0.95, -1);
  brash(t, 0, W, WATER + 6, FROST_CLIFFS_H - 18, 40);
}

/**
 * The coast: the barren headland with its inuksuk, the outport at its
 * cove with the stages on the water, a berg grounded off the point, ice in
 * the cove with seals on it.
 */
export function cliffs(d: Draw): void {
  band(d, WATER - 8, WATER + 6, LAB_SEA, 0, 0.5);
  band(d, WATER + 6, FROST_CLIFFS_H, LAB_SEA, 0.5, 0.45);
  tiled(d, 993, (t) => {
    outport(t);
    headland(t);
    chop(t, WATER + 3, FROST_CLIFFS_H - 12, 140);
    whitecaps(t, WATER + 6, FROST_CLIFFS_H - 14, 30);
    iceOffshore(t);
  });
  fadeBottom(d, FROST_CLIFFS_H, 30);
}

/** The beach floor: grey shingle, laid once across exactly one tile so it neither doubles nor seams. */
function floorShingle(d: Draw, top: (x: number) => number): void {
  const { pen } = d;
  const edge: Pt[] = [];
  for (let x = 0; x <= W; x += 8) edge.push(pt(x, top(x)));
  const shape = [...edge, pt(W, FROST_SHORE_H), pt(0, FROST_SHORE_H)];
  pen.fill(shape, PAPER_FILL, 1);
  pen.fill(shape, SHINGLE, 0.5);
  pen.stipple(shape, 2400, () => 0.5, 0.4, SHINGLE_DARK);
  pen.fill([...edge, ...[...edge].reverse().map((p) => pt(p.x, p.y + 8))], SHINGLE_DARK, 0.18);
}

/** A boulder on the ridge, with the snow drifted into its lee. */
function drifted(t: Draw, x: number, ground: number, rx: number, ry: number, drift: number): void {
  boulder(t, x, ground - ry * 0.55, rx, ry);
  snowDrift(t, x + rx * 0.55, ground, drift, ry * 0.9);
}

/**
 * The near shore: the shingle storm ridge, its crest strewn with bleached
 * driftwood, boulders with snow drifted in their lee, the dory turned
 * turtle, lobster pots and their buoy, lyme grass bent by the wind; below,
 * the stones themselves and blocks of stranded ice.
 */
export function shore(d: Draw): void {
  const G = SHORE_GROUND;
  const top = (x: number): number => G - 4 * wave(x, 2, 0.3) - 2.5 * wave(x, 5, 1.4);
  tiled(d, 994, (t) => {
    // Two humps of the ridge, overlapping, the further first.
    const east = stormRidge(t, 470, 1080, top, 22);
    const west = stormRidge(t, -70, 540, top, 30);
    drifted(t, 120, west(120) + 10, 30, 22, 80);
    drifted(t, 905, east(905) + 8, 24, 18, 64);
    upturnedDory(t, 340, west(340) + 4, 1.9);
    lobsterPot(t, 700, east(700) + 4, 1.55);
    lobsterPot(t, 735, east(735) + 5, 1.55);
    lobsterPot(t, 716, east(716) - 11, 1.45);
    float(t, 790, east(790) + 4, 1.4, true);
    driftLog(t, pt(560, east(560) + 4), pt(660, east(660) - 1), 5);
    for (const [x, h] of [[30, 40], [210, 34], [262, 30], [450, 38], [600, 32], [850, 40], [990, 32]] as const) lymeGrass(t, x, Math.min(west(x), east(x)) + 3, h);
    drifted(t, 640, top(640) + 4, 20, 15, 56);
    driftLog(t, pt(400, top(400) + 3), pt(560, top(560) - 1), 6);
  });
  floorShingle(d, top);
  tiled(d, 996, (t) => {
    // (No ink along the floor's top: the ridge's own skyline is the beach's edge.)
    shingle(t, 0, W, top, 44, 900);
    driftLog(t, pt(860, top(860) + 14), pt(990, top(990) + 10), 5);
    driftLog(t, pt(30, top(30) + 22), pt(140, top(140) + 26), 4);
    for (const [x, dy, w, h, tilt] of [[520, 22, 34, 18, 0.06], [214, 30, 24, 12, -0.08], [938, 34, 28, 14, 0.04]] as const) strandedIce(t, x, top(x) + dy, w, h, tilt);
    for (const [x, dy, rx, ry] of [[600, 18, 9, 6], [300, 30, 8, 5], [780, 26, 10, 6]] as const) {
      cobble(t, x, top(x) + dy, rx, ry, '#8f8c84');
      snowDrift(t, x + rx * 0.6, top(x) + dy + ry * 0.6, 26, ry * 0.9);
    }
    for (const x of [380, 680, 960]) lymeGrass(t, x, top(x) + 16, 20);
  });
  fadeBottom(d, FROST_SHORE_H, 40);
}
