import type { BiomeId } from '../../level/biomes';

/**
 * Each island's silhouette: how far its near (southern) shore and far
 * (northern) shore sit from the chart's average lines, along the island.
 * `u` runs 0..1 from the island's west end to its east end (a little past
 * either way over its rounded ends); `x` is the world x, for ripples that
 * shouldn't repeat from island to island. Positive is south (down).
 *
 * The level route follows the near shore, so a profile can bend it into a
 * cove or a crescent and the levels follow; the far shore shapes what's
 * inland: a desert running off the top of the chart, a volcano's bulge.
 */
export interface ShoreProfile {
  readonly coast: (u: number, x: number) => number;
  readonly top: (u: number, x: number) => number;
}

const clamp01 = (t: number): number => Math.min(1, Math.max(0, t));
/** A bell centred on c, about w wide. */
const bump = (u: number, c: number, w: number): number => Math.exp(-(((u - c) / w) ** 2));
const smooth = (e0: number, e1: number, u: number): number => {
  const t = clamp01((u - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
/** Sharp-cornered ripples, irregular: rocky points between rounded bights. */
const jag = (x: number, k: number): number =>
  (Math.abs(Math.sin(x / k)) + 0.6 * Math.abs(Math.sin(x / (k * 1.73) + 1.3)) + 0.35 * Math.abs(Math.sin(x / (k * 0.61) + 0.4))) / 1.95 - 0.62;
const arch = (u: number): number => Math.sin(Math.PI * clamp01(u));

export const PROFILES: Readonly<Record<BiomeId, ShoreProfile>> = {
  // A coral ring: an even, gently waving rim round its lagoon.
  atoll: {
    coast: (_u, x) => 22 * Math.sin(x / 210 + 0.4) + 9 * Math.sin(x / 77),
    top: (_u, x) => -12 + 16 * Math.sin(x / 160 + 1.1) + 7 * Math.sin(x / 53),
  },
  // Desert running off the top of the chart, narrowing to a sand spit in the east.
  dunes: {
    coast: (_u, x) => 24 * Math.sin(x / 320 + 2) + 6 * Math.sin(x / 91),
    top: (u, x) => -200 * smooth(-0.12, 0.16, u) + 372 * smooth(0.6, 0.84, u) + 8 * Math.sin(x / 140),
  },
  // Granite: broken, cornered shores and a headland reaching north.
  rockpool: {
    coast: (_u, x) => 26 * Math.sin(x / 180 + 0.7) + 14 * jag(x, 29) + 6 * jag(x, 11),
    top: (u, x) => 16 * Math.sin(x / 150) + 16 * jag(x, 23) - 46 * bump(u, 0.82, 0.08),
  },
  // Low, lobed shores where the mangroves push out over the mud.
  mangrove: {
    coast: (_u, x) => 18 * Math.sin(x / 250 + 1.3) + 8 * Math.sin(x / 31),
    top: (_u, x) => 6 + 14 * Math.sin(x / 120 + 0.2) + 12 * Math.sin(x / 37),
  },
  // A volcano's cone bulging north out of a round island.
  basalt: {
    coast: (u, x) => 16 * Math.sin(x / 230 + 2.2) + 7 * Math.sin(x / 63) + 34 * bump(u, 0.3, 0.3),
    top: (u, x) => 10 * Math.sin(x / 140) - 82 * bump(u, 0.27, 0.17),
  },
  // A ragged forested coast (the fjords are cut into it from the north).
  kelp: {
    coast: (_u, x) => 24 * Math.sin(x / 170 + 0.9) + 11 * Math.sin(x / 47) + 6 * jag(x, 19),
    top: (_u, x) => 22 * Math.sin(x / 140 + 2.4) + 9 * Math.sin(x / 40),
  },
  // A cove bitten out of the south shore between two points.
  wreck: {
    coast: (u, x) => -78 * arch((u - 0.04) / 0.92) ** 1.4 + 44 * (bump(u, -0.02, 0.07) + bump(u, 1.02, 0.07)) + 8 * Math.sin(x / 60),
    top: (_u, x) => 14 * Math.sin(x / 190 + 0.5) + 7 * Math.sin(x / 50),
  },
  // A straight, worked shore for the harbour town.
  harbour: {
    coast: (_u, x) => 12 * Math.sin(x / 260 + 0.3) + 4 * Math.sin(x / 37),
    top: (_u, x) => 16 * Math.sin(x / 150 + 1.6) + 8 * Math.sin(x / 44),
  },
  // Ice-scoured: many small coves and points on both shores.
  frost: {
    coast: (_u, x) => 24 * Math.sin(x / 150 + 1.9) + 11 * Math.sin(x / 33) + 8 * jag(x, 17),
    top: (_u, x) => 22 * Math.sin(x / 110 + 0.8) + 13 * Math.sin(x / 29) + 6 * jag(x, 13),
  },
  // A crescent: both shores bow north round the bay, its horns reaching south.
  moonlit: {
    coast: (u, x) => -92 * arch(u) ** 2 + 30 * (bump(u, 0, 0.09) + bump(u, 1, 0.09)) + 6 * Math.sin(x / 70),
    top: (u, x) => -26 * arch(u) ** 2 + 10 * Math.sin(x / 110 + 0.3),
  },
};
