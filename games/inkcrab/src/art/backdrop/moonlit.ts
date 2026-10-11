import { bezier, cub, type Draw, pt } from '../kit';
import { PAPER_FILL } from '../palette';
import { pandanus, sprout } from './beach';
import { BACKDROP_W, band, FAR, fadeBottom, tiled } from './common';
import { glow } from './estuary';
import { surf } from './fogCoast';
import { through } from './granite';
import { BAY, BAY_DEEP, BAY_FAR, farLighthouse, glowBreakers, glowFoam, moonPath, nightIsland, nightSwell, sparks } from './glowSea';
import { boulder } from './malabar';
import { bluff, campfire, casuarina, litWindow, rainforest, shackBody } from './nightCoast';
import { coconut, goatsFoot, loggerhead, MOON_SAND, moonSand, spinifex, tideline, turtleTrack } from './nightShore';
import { fullMoon, HAZE, INDIGO, milkyWay, moonCloud, moonlit, NIGHT, NIGHT_BLUE, southernCross, stars, veil } from './nightSky';
import { driftLog, wrackLine } from './pnw';
import { palm } from './tropic';

/**
 * Beach 10: Moonlit Bay, a tropical bay on the Queensland coast on a
 * summer night, the plankton blooming in the warm water. Far off, a deep
 * indigo sky, the full moon low over the sea in a pool of light with a
 * ring round it, the Milky Way winding overhead with the Southern Cross
 * and its Pointers in it, and clouds drifting across, dark with silver
 * linings; flying foxes rowing across the moon in a straggling line,
 * night herons and noddies; then the dark bay with the moon's long path
 * glittering across it, the reef's breakers glowing electric blue with
 * plankton, islands black on the horizon, one with a lighthouse blinking,
 * a prawn trawler working under her floodlights and a tinnie with a
 * lantern; nearer, a headland of dark rainforest and hoop pines ending in
 * a rocky bluff, a cove with a fibro shack lit warm in its window, a
 * campfire on the sand with two people at it, she-oaks, screw pines and
 * coconut palms against the night, its little waves glowing as they
 * break; nearest, pale moonlit sand, the tideline glowing where each
 * wave runs up, loggerhead tracks hauled up the beach and a turtle
 * digging her nest, a coconut or two, driftwood, spinifex and goat's-foot
 * runners. (No small creatures nearby: the level's own crabs and the like
 * must never be mistaken for scenery.)
 */
const W = BACKDROP_W;
const MOON_X = 330;
const MOON_Y = 196;

/** A smooth wave that repeats exactly every tile, so anything shaped by it wraps seamlessly. */
const wave = (x: number, k: number, phase = 0): number => Math.sin((x / W) * Math.PI * 2 * k + phase);

/**
 * The sky and clouds reach down to the horizon (their layers sit low, as
 * the frost's do, see THEMES), so the moon hangs low over the sea's far edge.
 */
export const MOONLIT_SKY_H = 300;
const SKY_HORIZON = 288;
export const MOONLIT_SEA_H = 200;
export const MOONLIT_CLIFFS_H = 300;
const SHORE_HEADROOM = 70;
export const MOONLIT_SHORE_H = 250 + SHORE_HEADROOM;
const SHORE_GROUND = 200 + SHORE_HEADROOM;

export function sky(d: Draw): void {
  const H = MOONLIT_SKY_H;
  // Deep indigo overhead (the wash a little thinner at its very top edge), bluer lower down,
  // paling to a moonlit haze along the horizon; gone before the layer's foot.
  band(d, 0, H * 0.08, NIGHT, 0.72, 0.92);
  band(d, H * 0.08, H * 0.5, NIGHT, 0.92, 0.85);
  band(d, H * 0.5, H * 0.96, NIGHT, 0.85, 0.3);
  band(d, H * 0.3, H * 0.85, INDIGO, 0, 0.5);
  band(d, H * 0.7, H * 0.96, NIGHT_BLUE, 0, 0.6);
  band(d, H * 0.86, H * 0.96, HAZE, 0, 0.5);
  band(d, H * 0.96, H, HAZE, 0.5, 0);
  tiled(d, 1001, (t) => {
    milkyWay(t, (x) => 90 + 50 * wave(x, 1, 2.69), 46);
    stars(t, 0, SKY_HORIZON - 6, 900, MOON_X, MOON_Y, 150);
    southernCross(t, 760, 128, 1.2);
    fullMoon(t, MOON_X, MOON_Y, 20, 64);
    for (let k = 0; k < 12; k++) glow(t, (k * W) / 12 + t.pen.jitter(20), SKY_HORIZON + 2, 90, 6, HAZE, 0.4);
  });
}

/** Clouds by moonlight, dark-hearted and silver-lined, and thin veils: their own layer, drifting slowly across the moon. */
export function clouds(d: Draw): void {
  tiled(d, 1005, (t) => {
    moonCloud(t, 150, 132, 170, 34);
    moonCloud(t, 560, 76, 110, 22, 0.8);
    moonCloud(t, 880, 168, 210, 38);
    moonCloud(t, 430, 238, 96, 16, 0.9);
    veil(t, 700, 236, 180, 7);
    veil(t, 300, 40, 150, 6, 0.7);
    veil(t, 990, 96, 120, 5, 0.8);
  });
}

const HORIZON = 70;
export const LIGHT_X = 650;
const LIGHT_GROUND = HORIZON - 20;
/** The lighthouse's lamp, where its flash (a mover) blinks. */
export const LIGHT_Y = LIGHT_GROUND - 9.8;
const REEF = 128;

/** The reef's edge: a wavering line across the tile, broken where the channel runs through. */
const reef = (x: number): number => REEF + 3 * wave(x, 3, 0.8) + 1.5 * wave(x, 7, 0.2);

/** The bay: islands on the horizon, the moon's path, the reef's breakers glowing blue, sparks of plankton. */
export function sea(d: Draw): void {
  const H = MOONLIT_SEA_H;
  band(d, HORIZON, H * 0.55, BAY_FAR, 0.9, 0.9);
  band(d, H * 0.55, H, BAY, 0.9, 0.9);
  band(d, HORIZON, HORIZON + 16, HAZE, 0.4, 0);
  band(d, REEF + 6, H, BAY_DEEP, 0, 0.35);
  tiled(d, 1002, (t) => {
    const { pen } = t;
    nightIsland(t, 540, 760, HORIZON, through([[540, 0], [570, 8], [610, 15], [650, 21], [680, 18], [720, 9], [760, 0]]), 1, 8);
    farLighthouse(t, LIGHT_X, LIGHT_GROUND, 1);
    nightIsland(t, 470, 545, HORIZON, through([[470, 0], [500, 5], [530, 3], [545, 0]]), 0.7, 2);
    nightIsland(t, 60, 230, HORIZON, through([[60, 0], [100, 7], [150, 11], [200, 6], [230, 0]]), 0.45, 4);
    nightIsland(t, 880, 960, HORIZON, through([[880, 0], [910, 4], [940, 5], [960, 0]]), 0.35, 1);
    pen.stroke([pt(-20, HORIZON), pt(W + 20, HORIZON)], 0.9, t.ink, FAR * 0.6, false);
    // Far boats' lights on the horizon.
    for (const [x, c] of [[300, '#fff6d6'], [430, '#fff6d6'], [990, '#ffd27a']] as const) {
      glow(t, x, HORIZON - 1.5, 4, 2.5, c, 0.7);
      pen.dot(x, HORIZON - 1.5, 0.5, c, 1);
    }
    moonPath(t, MOON_X, HORIZON + 1, H - 6, 1000);
    nightSwell(t, HORIZON + 3, H - 6, 420);
    // The reef's breakers in their runs, the channel left open, then foam and sparks inside it.
    for (const [x0, x1] of [[-30, 250], [310, 620], [690, 1000]] as const) {
      for (let x = x0; x < x1; x += 60) glowBreakers(t, x, Math.min(x1, x + 64), reef(x + 30), 0.8);
    }
    glowFoam(t, 0, W, REEF + 8, REEF + 30, 3);
    sparks(t, 0, W, REEF + 6, H - 8, 160, 0.9);
    sparks(t, 0, W, HORIZON + 30, REEF - 6, 40, 0.6);
  });
}

const WATER = MOONLIT_CLIFFS_H - 50;
const SHACK_X = 470;
/** The campfire on the cove's sand, where its flames (a mover) flicker. */
export const FIRE_X = 560;
export const FIRE_Y = WATER - 6;

/** The headland: a rocky bluff dropping to the sea, rainforest heaped over its back, hoop pines up on the ridge, the surf glowing at its foot. */
function headland(t: Draw): void {
  const rock = through([[-200, 0], [-170, 16], [-130, 42], [-90, 70], [-50, 92], [-14, 104], [20, 98], [60, 82], [100, 86], [136, 92], [160, 82], [180, 58], [198, 32], [216, 14], [236, 0]]);
  // The forest cloaks the rock's back and crown right down to the water, thinning out to nothing over the bluff's face.
  const clamp = (u: number): number => Math.min(1, Math.max(0, u));
  const depth = (x: number): number => (46 + 160 * clamp((120 - x) / 60)) * clamp((182 - x) / 50);
  const canopy = (x: number): number => rock(x) + 4 + 0.15 * depth(x) + 4 * Math.sin(x / 23);
  moonlit(t, NIGHT, 0.62, (n) => {
    bluff(n, -200, 236, WATER - 4, rock);
    rainforest(n, -200, 182, WATER - 6, canopy, [[-120, 44], [-70, 56], [-24, 48], [34, 42], [96, 50], [132, 38]], (x) => Math.max(-2, rock(x) - depth(x)));
    for (const [x, rx, ry] of [[-188, 14, 9], [-160, 10, 6], [222, 13, 9], [244, 9, 6], [196, 8, 5]] as const) boulder(n, x, WATER - ry * 0.4, rx, ry);
  });
  surf(t, -196, -140, WATER);
  surf(t, 170, 250, WATER);
  glowBreakers(t, -200, -130, WATER + 1, 0.9);
  glowBreakers(t, 160, 256, WATER + 1, 0.9);
}

/**
 * The cove: a low sandy point running out from the headland, a scrub of
 * beach trees along its crest, she-oaks, screw pines and a palm standing
 * up against the bay, the shack among them and the fire on the sand.
 */
function cove(t: Draw): void {
  const scrub = through([[230, 0], [260, 16], [300, 22], [350, 14], [400, 10], [430, 18], [520, 12], [600, 8], [660, 16], [720, 20], [790, 12], [830, 0]]);
  moonlit(t, NIGHT, 0.66, (n) => {
    casuarina(n, 300, WATER - 10, 74, 0.06);
    casuarina(n, 770, WATER - 8, 64, -0.1);
    rainforest(n, 230, 830, WATER - 8, scrub, []);
  });
  const berm = through([[234, 0], [262, 6], [790, 7], [830, 0]]);
  const sand = [pt(230, WATER + 1)];
  for (let x = 234; x <= 830; x += 6) sand.push(pt(x, WATER - berm(x) - 2));
  sand.push(pt(834, WATER + 1));
  moonlit(t, NIGHT, 0.5, (n) => {
    n.pen.fill(sand, PAPER_FILL, 1);
    n.pen.fill(sand, MOON_SAND, 0.8);
    n.pen.hair(sand.slice(1, -1), 0.5, n.ink, FAR * 0.6);
    palm(n, 640, WATER - 7, 70, 0.3, 0.7);
    palm(n, 676, WATER - 7, 52, 0.12, 0.6);
    pandanus(n, 404, WATER - 7, 34, -0.2);
    pandanus(n, 724, WATER - 6, 30, 0.25);
  });
  const win = { x: 0, y: 0, w: 0, h: 0 };
  moonlit(t, NIGHT, 0.45, (n) => Object.assign(win, shackBody(n, SHACK_X, WATER - 7, 1.25)));
  litWindow(t, win, 1.25);
  campfire(t, FIRE_X, FIRE_Y, 1.1);
  glowBreakers(t, 236, 830, WATER + 2, 0.8);
}

/**
 * The coast: the rainforest headland with its hoop pines, the cove with
 * its shack and campfire under the she-oaks, the little waves glowing all
 * along the shore, dark water in front sparked with plankton.
 */
export function cliffs(d: Draw): void {
  band(d, WATER - 8, WATER + 6, BAY, 0, 0.85);
  band(d, WATER + 6, MOONLIT_CLIFFS_H, BAY, 0.85, 0.8);
  tiled(d, 1003, (t) => {
    cove(t);
    headland(t);
    nightSwell(t, WATER + 5, MOONLIT_CLIFFS_H - 12, 110);
    glowFoam(t, 0, W, WATER + 8, WATER + 26, 2);
    sparks(t, 0, W, WATER + 6, MOONLIT_CLIFFS_H - 14, 70, 1.1);
  });
  fadeBottom(d, MOONLIT_CLIFFS_H, 30);
}

/**
 * The near shore: pale moonlit sand, the glowing tideline at its back,
 * loggerhead tracks up the beach and a turtle digging her nest, an old
 * track that went back down, coconuts, a driftwood log, spinifex and
 * goat's-foot runners.
 */
export function shore(d: Draw): void {
  const G = SHORE_GROUND;
  const top = (x: number): number => G - 38 + 3 * wave(x, 2, 0.4) + 1.5 * wave(x, 5, 1.1);
  const reach = (x: number): number => 6 + 2.5 * wave(x, 3, 0.2) + 1.5 * wave(x, 7, 2);
  moonSand(d, top, MOONLIT_SHORE_H);
  tiled(d, 1004, (t) => {
    tideline(t, top, reach);
    // Last spring tide's wrack: a broken line of weed and pumice up the sand.
    wrackLine(t, 0, W, (x) => top(x) + 22 + 2 * wave(x, 3, 1));
    const wet = (x: number): number => top(x) + reach(x) + 8;
    // Her track up from the water, and an older one that came up, nested and went back down.
    turtleTrack(t, bezier(pt(500, top(500) + 2), pt(530, G - 20), pt(578, G - 4), 20), (u) => 4 + 6 * u, wet(520));
    turtleTrack(t, cub(pt(150, top(150) + 2), pt(150, G + 14), pt(290, G + 14), pt(292, top(292) + 2), 30), (u) => 4 + 6 * Math.sin(u * Math.PI), wet(200), 0.6);
    moonlit(t, NIGHT, 0.25, (n) => {
      loggerhead(n, 610, G - 2, 1.3);
      driftLog(n, pt(760, G + 4), pt(880, G - 2), 5);
      driftLog(n, pt(800, G + 1), pt(836, G - 12), 2);
      coconut(n, 80, G + 6, 1.3, 0.2);
      coconut(n, 392, G - 2, 1.1, -0.4);
      coconut(n, 940, G + 12, 1.4, 0.6);
      sprout(n, 440, G + 12);
      spinifex(n, 26, G + 22, 16);
      spinifex(n, 990, G + 26, 18);
      goatsFoot(n, pt(-10, G + 30), pt(110, G + 18));
      goatsFoot(n, pt(860, G + 26), pt(1010, G + 34));
    });
  });
  fadeBottom(d, MOONLIT_SHORE_H, 40);
}
