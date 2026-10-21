import { buildPath, type Pt } from '../../logic/path';

/**
 * Pure geometry of the level map: the estate's garden plan, seen from above
 * like the boards, on one long scroll the gecko climbs from the bottom
 * (chapter 1, the garden by the house) to the top (the night garden). Each
 * chapter is a band of the plan with a gate at its foot; a worn stone
 * groove winds up through all of them, a pocket in it for every level.
 */

/** How a chapter's band is painted: in full, or as a pencil draft while it isn't built yet. */
export type MapPlace = 'garden' | 'pond' | 'greenhouse' | 'orchard' | 'rockery' | 'draft';

export const MAP = {
  width: 1600,
  /** The groove winds either side of this x. */
  mid: 800,
  /** How far either side of `mid` it swings. */
  swing: 230,
  /** Height between one level's pocket and the next. */
  nodeGap: 132,
  nodeRadius: 30,
  /** Below a chapter's first level: its gate and sign. */
  head: 320,
  /** Above a chapter's last level, before the next chapter's band. */
  tail: 110,
  /** Plain paper below the first chapter and above the last. */
  margin: 240,
  /** Width of the groove the path is worn into. */
  groove: 34,
} as const;

export interface MapChapter {
  readonly name: string;
  readonly place: MapPlace;
  readonly levelIds: readonly string[];
}

export interface MapRegion {
  readonly index: number;
  readonly chapter: MapChapter;
  /** World y of the band's top edge (smaller) and bottom edge. */
  readonly top: number;
  readonly bottom: number;
  /** Where the chapter's gate stands across the groove. */
  readonly gate: Pt;
  /** Where its name board stands, beside the gate. */
  readonly sign: Pt;
}

export interface MapNode {
  readonly levelId: string;
  /** 0-based across the whole game. */
  readonly index: number;
  readonly region: number;
  /** 0-based within its chapter. */
  readonly local: number;
  readonly x: number;
  readonly y: number;
  /** Which side its name goes on: away from the groove's bend. */
  readonly side: 1 | -1;
}

export interface MapLayout {
  readonly width: number;
  readonly height: number;
  readonly regions: readonly MapRegion[];
  readonly nodes: readonly MapNode[];
  /** The groove, bottom to top, resampled every few px. */
  readonly path: readonly Pt[];
  /** Distance along `path` of each node, same order as `nodes`. */
  readonly nodeS: readonly number[];
  /** Distance from the start of `path` to each of its points. */
  readonly cum: readonly number[];
}

/** The groove's x at a level's place in its chapter. */
function swingX(region: number, local: number): number {
  return MAP.mid + MAP.swing * Math.sin(local * 1.05 + region * 0.9 + 0.6);
}

export function computeMapLayout(chapters: readonly MapChapter[]): MapLayout {
  if (chapters.length === 0) throw new Error('computeMapLayout: no chapters');
  const heights = chapters.map((c) => MAP.head + Math.max(0, c.levelIds.length - 1) * MAP.nodeGap + MAP.tail);
  const height = MAP.margin * 2 + heights.reduce((a, b) => a + b, 0);
  const regions: MapRegion[] = [];
  const nodes: MapNode[] = [];
  const control: Pt[] = [{ x: MAP.mid, y: height }];
  let bottom = height - MAP.margin;
  let index = 0;
  chapters.forEach((chapter, r) => {
    const top = bottom - heights[r]!;
    const gate = { x: MAP.mid, y: bottom - MAP.head * 0.42 };
    regions.push({ index: r, chapter, top, bottom, gate, sign: { x: MAP.mid + 225, y: gate.y + 18 } });
    control.push({ x: MAP.mid, y: bottom - 20 }, gate);
    chapter.levelIds.forEach((levelId, local) => {
      const x = swingX(r, local);
      const y = bottom - MAP.head - local * MAP.nodeGap;
      // The name goes on the outside of the bend, where there's room.
      const side: 1 | -1 = x >= MAP.mid ? 1 : -1;
      nodes.push({ levelId, index: index++, region: r, local, x, y, side });
      control.push({ x, y });
    });
    bottom = top;
  });
  control.push({ x: MAP.mid, y: bottom - 30 }, { x: MAP.mid, y: 0 });
  const built = buildPath(control);
  const nodeS = nodes.map((n) => nearestS(built.pts, built.cum, n));
  return { width: MAP.width, height, regions, nodes, path: built.pts, cum: built.cum, nodeS };
}

function nearestS(pts: readonly Pt[], cum: readonly number[], p: Pt): number {
  let best = 0;
  let bestD = Infinity;
  pts.forEach((q, i) => {
    const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return cum[best] ?? 0;
}

/** The point `s` along the groove. */
export function pathPoint(layout: MapLayout, s: number): Pt {
  const { path, cum } = layout;
  if (s <= 0) return path[0]!;
  if (s >= cum[cum.length - 1]!) return path[path.length - 1]!;
  let lo = 0;
  let hi = cum.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (cum[m]! <= s) lo = m;
    else hi = m;
  }
  const a = path[lo]!;
  const b = path[hi]!;
  const t = (s - cum[lo]!) / Math.max(1e-6, cum[hi]! - cum[lo]!);
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** The region whose band contains world y (the nearest at the ends). */
export function regionAt(layout: MapLayout, y: number): number {
  const i = layout.regions.findIndex((r) => y >= r.top && y < r.bottom);
  if (i >= 0) return i;
  return y < layout.regions[layout.regions.length - 1]!.top ? layout.regions.length - 1 : 0;
}
