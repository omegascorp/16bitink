import type { Biome } from '../../level/biomes';
import { PROFILES } from './profiles';

/**
 * Pure geometry of the level map: a beachcomber's chart seen from above.
 * Each beach is an island, its scrub inland at the top, a band of sand,
 * then the sea; the level route walks along the sand. Islands sit side by
 * side across a long chart, a strait of open water between each.
 */
export const MAP = {
  height: 760,
  /** Where the island's shoreline sits on average. */
  coastY: 470,
  /** Sand between the scrub and the waterline. */
  sandBand: 150,
  /** Where the island's far (northern) shore sits on average. */
  topY: 120,
  nodeGap: 112,
  nodeRadius: 22,
  /** Island ends beyond its first and last levels. */
  pad: 170,
  /** Open water between islands, room for a sea creature or a ship. */
  strait: 440,
  /** Water before the first island (and after the last), for the title, compass and flourishes. */
  start: 560,
  /** How far the coast takes to rise out of a strait. */
  shoal: 150,
} as const;

export interface MapBeach {
  readonly biome: Biome;
  readonly levelIds: readonly string[];
  /** Has playable levels; unbuilt beaches are drawn as pencil drafts. */
  readonly built: boolean;
}

export interface MapRegion {
  readonly beach: MapBeach;
  readonly x0: number;
  readonly x1: number;
}

export interface MapNode {
  readonly levelId: string;
  /** 0-based across the whole game. */
  readonly index: number;
  readonly region: number;
  readonly x: number;
  readonly y: number;
}

export interface MapLayout {
  readonly width: number;
  readonly height: number;
  readonly regions: readonly MapRegion[];
  readonly nodes: readonly MapNode[];
  /** The near shoreline's y at a world x: land above it, sea below. */
  coastAt(x: number): number;
  /** The island's far shore: land below it, sea above. Equal to coastAt where there's no island. */
  topAt(x: number): number;
  /** Top of the sand band (where the island's interior starts) at x. */
  scrubAt(x: number): number;
}

export function computeMapLayout(beaches: readonly MapBeach[]): MapLayout {
  if (beaches.length === 0) throw new Error('computeMapLayout: no beaches');
  let x = MAP.start;
  const regions: MapRegion[] = beaches.map((beach) => {
    const w = MAP.pad * 2 + Math.max(0, beach.levelIds.length - 1) * MAP.nodeGap;
    const region = { beach, x0: x, x1: x + w };
    x += w + MAP.strait;
    return region;
  });
  const width = x - MAP.strait + MAP.start;

  // How much island there is at x (0 in a strait, 1 along its beaches), and which island (the nearest, in a strait).
  const landAt = (px: number): { land: number; seed: number } => {
    let raw = -Infinity;
    let seed = 0;
    regions.forEach((r, i) => {
      const k = Math.min((px - r.x0 + MAP.shoal * 0.3) / MAP.shoal, (r.x1 + MAP.shoal * 0.3 - px) / MAP.shoal);
      if (k > raw) {
        raw = k;
        seed = i;
      }
    });
    const land = Math.min(1, Math.max(0, raw));
    // A quarter ellipse: the island's ends come round instead of to a point.
    return { land: Math.sqrt(1 - (1 - land) ** 2), seed };
  };
  // Each island's own silhouette, its two shores closing in on its middle line towards its ends.
  const shores = (px: number): { top: number; coast: number } => {
    const { land, seed } = landAt(px);
    const r = regions[seed]!;
    const p = PROFILES[r.beach.biome.id];
    const u = (px - r.x0) / (r.x1 - r.x0);
    const coast = MAP.coastY + p.coast(u, px);
    const top = MAP.topY + p.top(u, px);
    const mid = (coast + top) / 2;
    return { top: mid - (mid - top) * land, coast: mid + (coast - mid) * land };
  };
  const coastAt = (px: number): number => shores(px).coast;
  const topAt = (px: number): number => shores(px).top;
  const scrubAt = (px: number): number => coastAt(px) - MAP.sandBand + 10 * Math.sin(px / 37) + 6 * Math.sin(px / 13);

  let index = 0;
  const nodes: MapNode[] = regions.flatMap((r, ri) =>
    r.beach.levelIds.map((levelId, li) => {
      const nx = r.x0 + MAP.pad + li * MAP.nodeGap;
      // Zigzag up and down the sand so the route reads as a walk, not a ruler.
      const ny = coastAt(nx) - MAP.sandBand / 2 + Math.sin(index * 1.7) * (MAP.sandBand / 2 - MAP.nodeRadius * 1.6);
      return { levelId, index: index++, region: ri, x: nx, y: ny };
    }),
  );
  return { width, height: MAP.height, regions, nodes, coastAt, topAt, scrubAt };
}

/** Which island the camera is over: the nearest one, counting a strait's halves to its neighbours. */
export function regionIndexAt(layout: MapLayout, x: number): number {
  const rs = layout.regions;
  for (let i = 0; i < rs.length - 1; i++) if (x < (rs[i]!.x1 + rs[i + 1]!.x0) / 2) return i;
  return rs.length - 1;
}

/**
 * How far (x, y) is from the level route: the nearest ring's edge or the
 * nearest stretch of tracks between two levels of one island. Drawings on
 * the chart keep clear of it so the route reads cleanly.
 */
export function routeDistance(layout: MapLayout, x: number, y: number): number {
  const { nodes } = layout;
  let best = Infinity;
  // Nodes run left to right; only the few near x matter.
  let lo = 0;
  let hi = nodes.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (nodes[mid]!.x < x - 400) lo = mid + 1;
    else hi = mid;
  }
  for (let i = lo; i < nodes.length && nodes[i]!.x < x + 400; i++) {
    const a = nodes[i]!;
    best = Math.min(best, Math.hypot(x - a.x, y - a.y) - MAP.nodeRadius);
    const b = nodes[i + 1];
    if (!b || b.region !== a.region) continue;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const t = Math.min(1, Math.max(0, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy)));
    best = Math.min(best, Math.hypot(x - a.x - dx * t, y - a.y - dy * t) - 4);
  }
  return best;
}
