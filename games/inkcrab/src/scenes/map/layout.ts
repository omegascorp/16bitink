import type { Biome } from '../../level/biomes';

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
  /** Open water between islands. */
  strait: 300,
  /** Water before the first island, for the title and compass. */
  start: 420,
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

  // How much island there is at x (0 in a strait, 1 along its beaches), and which island.
  const landAt = (px: number): { land: number; seed: number } => {
    let land = 0;
    let seed = 0;
    regions.forEach((r, i) => {
      const ramp = (t: number): number => Math.min(1, Math.max(0, t));
      const k = Math.min(ramp((px - r.x0 + MAP.shoal * 0.3) / MAP.shoal), ramp((r.x1 + MAP.shoal * 0.3 - px) / MAP.shoal));
      if (k > land) {
        land = k;
        seed = i;
      }
    });
    // A quarter ellipse: the island's ends come round instead of to a point.
    return { land: Math.sqrt(1 - (1 - land) ** 2), seed };
  };
  // Both shores close in on the island's middle line towards its ends, rounding them off.
  const shores = (px: number): { top: number; coast: number } => {
    const { land, seed } = landAt(px);
    const coast = MAP.coastY + 34 * Math.sin(px / 210 + seed * 1.9) + 16 * Math.sin(px / 77 + seed);
    const top = MAP.topY + 22 * Math.sin(px / 160 + seed * 2.7) + 10 * Math.sin(px / 53 + seed);
    const mid = (coast + top) / 2;
    return { top: mid - (mid - top) * land, coast: mid + (coast - mid) * land };
  };
  const coastAt = (px: number): number => shores(px).coast;
  const topAt = (px: number): number => shores(px).top;

  let index = 0;
  const nodes: MapNode[] = regions.flatMap((r, ri) =>
    r.beach.levelIds.map((levelId, li) => {
      const nx = r.x0 + MAP.pad + li * MAP.nodeGap;
      // Zigzag up and down the sand so the route reads as a walk, not a ruler.
      const ny = coastAt(nx) - MAP.sandBand / 2 + Math.sin(index * 1.7) * (MAP.sandBand / 2 - MAP.nodeRadius * 1.6);
      return { levelId, index: index++, region: ri, x: nx, y: ny };
    }),
  );
  return { width, height: MAP.height, regions, nodes, coastAt, topAt };
}

/** Which island the camera is over: the nearest one, counting a strait's halves to its neighbours. */
export function regionIndexAt(layout: MapLayout, x: number): number {
  const rs = layout.regions;
  for (let i = 0; i < rs.length - 1; i++) if (x < (rs[i]!.x1 + rs[i + 1]!.x0) / 2) return i;
  return rs.length - 1;
}
