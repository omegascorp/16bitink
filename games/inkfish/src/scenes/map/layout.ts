import type { ChapterInfo } from '../../levels/types';

/**
 * Pure geometry of the level map: a side-view sea chart where the seabed
 * steps down from the shore into a trench, one plateau per zone.
 * Grows with content: add zones or levels and the map just gets longer.
 */
export const MAP = {
  shore: 420,
  nodeGap: 128,
  zonePad: 170,
  surfaceY: 150,
  firstFloor: 470,
  floorStep: 70,
  nodeLift: 110,
  bottomPad: 220,
} as const;

export interface MapChapter {
  readonly info: ChapterInfo;
  readonly levelIds: readonly string[];
  /** Not owned: drawn as a pencil draft. */
  readonly locked: boolean;
}

export interface MapZone {
  readonly chapter: MapChapter;
  readonly x0: number;
  readonly x1: number;
  readonly floorY: number;
}

export interface MapNode {
  readonly levelId: string;
  /** 0-based position across the whole game. */
  readonly index: number;
  readonly zone: number;
  readonly x: number;
  readonly y: number;
}

export interface MapLayout {
  readonly width: number;
  readonly height: number;
  readonly zones: readonly MapZone[];
  readonly nodes: readonly MapNode[];
  floorAt(x: number): number;
}

const smoothstep = (t: number): number => {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
};

export function computeMapLayout(chapters: readonly MapChapter[]): MapLayout {
  if (chapters.length === 0) throw new Error('computeMapLayout: no chapters');
  let x = MAP.shore;
  const zones: MapZone[] = chapters.map((chapter, i) => {
    const w = MAP.zonePad * 2 + Math.max(0, chapter.levelIds.length - 1) * MAP.nodeGap;
    const zone = { chapter, x0: x, x1: x + w, floorY: MAP.firstFloor + i * MAP.floorStep };
    x += w;
    return zone;
  });
  const width = x + MAP.zonePad;
  const last = zones[zones.length - 1]!;
  const height = last.floorY + MAP.bottomPad;

  // Plateaus joined by short slopes at zone borders; a beach rises to the shore.
  const floorAt = (px: number): number => {
    const first = zones[0]!;
    if (px <= first.x0) {
      const t = smoothstep((px - first.x0 * 0.25) / (first.x0 * 0.75));
      return MAP.surfaceY + 30 + (first.floorY - MAP.surfaceY - 30) * t;
    }
    for (let i = 0; i < zones.length; i++) {
      const z = zones[i]!;
      const next = zones[i + 1];
      if (px > z.x1 && next) continue;
      if (!next || px < z.x1 - MAP.zonePad * 0.5) return z.floorY;
      const t = smoothstep((px - (z.x1 - MAP.zonePad * 0.5)) / MAP.zonePad);
      return z.floorY + (next.floorY - z.floorY) * t;
    }
    return last.floorY;
  };

  let index = 0;
  const nodes: MapNode[] = zones.flatMap((z, zi) =>
    z.chapter.levelIds.map((levelId, li) => {
      const nx = z.x0 + MAP.zonePad + li * MAP.nodeGap;
      // A gentle wave so the route reads as a swim, not a ruler.
      const ny = floorAt(nx) - MAP.nodeLift + Math.sin(index * 1.3) * 26;
      return { levelId, index: index++, zone: zi, x: nx, y: ny };
    }),
  );
  return { width, height, zones, nodes, floorAt };
}

/** Which zone the camera is looking at. */
export function zoneIndexAt(layout: MapLayout, x: number): number {
  const i = layout.zones.findIndex((z) => x < z.x1);
  return i === -1 ? layout.zones.length - 1 : Math.max(0, i);
}
