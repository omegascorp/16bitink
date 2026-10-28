import { buildPath, nearestS, pointAt, type Path, type Pt } from '../../logic/path';

/**
 * Pure geometry of the Ink Atlas map: one long scroll Nib climbs from the
 * bottom (chapter 1, the Jungle Temple) to the top (the Dragon's Hoard).
 * Each chapter is a band of the page with its ruin drawn at the foot; a
 * dotted trail winds up through all of them, a stop on it for every level.
 */

export const MAP = {
  width: 1000,
  /** The trail winds either side of this x. */
  mid: 500,
  /** How far either side of `mid` it swings. */
  swing: 210,
  /** Height between one level's stop and the next. */
  nodeGap: 128,
  nodeRadius: 30,
  /** Below a chapter's first level: its ruin and name. */
  head: 360,
  /** Above a chapter's last level, before the next chapter's band. */
  tail: 110,
  /** Plain page below the first chapter and above the last. */
  margin: 260,
} as const;

export interface MapChapter {
  readonly name: string;
  /** Built and playable (painted in ink), or still a pencil draft. */
  readonly built: boolean;
  readonly levelIds: readonly string[];
}

export interface MapRegion {
  readonly index: number;
  readonly chapter: MapChapter;
  /** World y of the band's top edge (smaller) and bottom edge. */
  readonly top: number;
  readonly bottom: number;
  /** Where the chapter's ruin is drawn, and its name under it. */
  readonly ruin: Pt;
}

export interface MapNode {
  readonly levelId: string;
  /** 0-based across the whole map. */
  readonly index: number;
  readonly region: number;
  /** 0-based within its chapter. */
  readonly local: number;
  readonly x: number;
  readonly y: number;
}

export interface MapLayout {
  readonly width: number;
  readonly height: number;
  readonly regions: readonly MapRegion[];
  readonly nodes: readonly MapNode[];
  /** The trail, bottom to top. */
  readonly path: Path;
  /** Distance along the trail of each node, same order as `nodes`. */
  readonly nodeS: readonly number[];
}

function swingX(region: number, local: number): number {
  return MAP.mid + MAP.swing * Math.sin(local * 1.05 + region * 0.9 + 0.6);
}

export function computeMapLayout(chapters: readonly MapChapter[]): MapLayout {
  if (chapters.length === 0) throw new Error('computeMapLayout: no chapters');
  const heights = chapters.map((c) => MAP.head + Math.max(0, c.levelIds.length - 1) * MAP.nodeGap + MAP.tail);
  const height = MAP.margin * 2 + heights.reduce((a, b) => a + b, 0);
  const regions: MapRegion[] = [];
  const nodes: MapNode[] = [];
  const control: Pt[] = [{ x: MAP.mid, y: height - 40 }];
  let bottom = height - MAP.margin;
  let index = 0;
  chapters.forEach((chapter, r) => {
    const top = bottom - heights[r]!;
    // The ruin sits beside the trail's way in, on alternate sides.
    const side = r % 2 ? -1 : 1;
    regions.push({ index: r, chapter, top, bottom, ruin: { x: MAP.mid + side * 230, y: bottom - MAP.head * 0.48 } });
    control.push({ x: MAP.mid - side * 60, y: bottom - MAP.head * 0.3 });
    chapter.levelIds.forEach((levelId, local) => {
      const x = swingX(r, local);
      const y = bottom - MAP.head - local * MAP.nodeGap;
      nodes.push({ levelId, index: index++, region: r, local, x, y });
      control.push({ x, y });
    });
    bottom = top;
  });
  control.push({ x: MAP.mid, y: bottom - 30 }, { x: MAP.mid, y: 40 });
  const path = buildPath(control);
  return { width: MAP.width, height, regions, nodes, path, nodeS: nodes.map((n) => nearestS(path, n)) };
}

export function trailPoint(layout: MapLayout, s: number): Pt {
  return pointAt(layout.path, s);
}

/** The chapter whose band holds world y (the nearest at the ends). */
export function regionAt(layout: MapLayout, y: number): number {
  const i = layout.regions.findIndex((r) => y >= r.top && y < r.bottom);
  if (i >= 0) return i;
  return y < layout.regions[layout.regions.length - 1]!.top ? layout.regions.length - 1 : 0;
}
