import { pointInShape, pushOut, shapeBounds } from '../geom';
import { CELL, GROUNDS, type Land, type StructureDef } from '../land';

/**
 * The coarse navigation grid, one cell per ground cell (CELL px). A cost of 0
 * blocks; sand and mud cost more. Solid structures block their cells (grown
 * by a tank's half-width); when one breaks, its cells reopen and `version`
 * goes up so cached flow fields are dropped.
 */
export interface NavGrid {
  readonly cols: number;
  readonly rows: number;
  readonly cost: Uint8Array;
  /** Cells each structure blocks, to reopen them when it breaks. */
  readonly blocks: Map<string, number[]>;
  version: number;
}

const GROUND_COST: Readonly<Record<string, number>> = { grass: 2, grassDry: 2, dirt: 2, bridge: 2, sand: 3, mud: 3, water: 0 };
/**
 * How much a solid's footprint is grown when marking cells: more than half a
 * cell, so a thin wall (the world art's are 4–14 px) blocks the cells on
 * both sides even when it lies on a cell boundary.
 */
const MARGIN = 22;

export function solid(s: StructureDef): boolean {
  return !s.cover && !s.flattenable;
}

export function buildNav(l: Land): NavGrid {
  const cols = l.gridCols;
  const rows = l.gridRows;
  const cost = new Uint8Array(cols * rows);
  for (let i = 0; i < cost.length; i++) cost[i] = GROUND_COST[GROUNDS[l.ground[i]!]!]!;
  const blocks = new Map<string, number[]>();
  for (const s of l.structures) {
    if (!solid(s)) continue;
    const b = shapeBounds(s.shape, s.x, s.y);
    const cells: number[] = [];
    for (let gy = Math.max(0, Math.floor((b.y0 - MARGIN) / CELL)); gy <= Math.min(rows - 1, Math.floor((b.y1 + MARGIN) / CELL)); gy++) {
      for (let gx = Math.max(0, Math.floor((b.x0 - MARGIN) / CELL)); gx <= Math.min(cols - 1, Math.floor((b.x1 + MARGIN) / CELL)); gx++) {
        const cx = (gx + 0.5) * CELL;
        const cy = (gy + 0.5) * CELL;
        if (pointInShape(s.shape, s.x, s.y, cx, cy) || pushOut(s.shape, s.x, s.y, cx, cy, MARGIN)) {
          const i = gy * cols + gx;
          cells.push(i);
          cost[i] = 0;
        }
      }
    }
    blocks.set(s.id, cells);
  }
  return { cols, rows, cost, blocks, version: 0 };
}

/** Reopens a broken structure's cells to the ground under them. */
export function unblock(nav: NavGrid, l: Land, id: string): void {
  const cells = nav.blocks.get(id);
  if (!cells) return;
  for (const i of cells) nav.cost[i] = GROUND_COST[GROUNDS[l.ground[i]!]!]!;
  nav.blocks.delete(id);
  // Another solid may still cover some of those cells.
  for (const other of nav.blocks.values()) for (const i of other) nav.cost[i] = 0;
  nav.version++;
}

export function passable(nav: NavGrid, x: number, y: number): boolean {
  const gx = Math.floor(x / CELL);
  const gy = Math.floor(y / CELL);
  if (gx < 0 || gy < 0 || gx >= nav.cols || gy >= nav.rows) return false;
  return nav.cost[gy * nav.cols + gx]! > 0;
}

/** Whether a straight drive from a to b stays on passable cells (sampled every half cell). */
export function clearLine(nav: NavGrid, ax: number, ay: number, bx: number, by: number): boolean {
  const d = Math.hypot(bx - ax, by - ay);
  const n = Math.max(1, Math.ceil(d / (CELL / 2)));
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    if (!passable(nav, ax + (bx - ax) * t, ay + (by - ay) * t)) return false;
  }
  return true;
}

/** The nearest passable cell centre to (x, y), searching rings outwards. */
export function nearestPassable(nav: NavGrid, x: number, y: number, maxRing = 12): { x: number; y: number } | null {
  const gx0 = Math.floor(x / CELL);
  const gy0 = Math.floor(y / CELL);
  for (let ring = 0; ring <= maxRing; ring++) {
    for (let dy = -ring; dy <= ring; dy++) {
      for (let dx = -ring; dx <= ring; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
        const gx = gx0 + dx;
        const gy = gy0 + dy;
        if (gx < 0 || gy < 0 || gx >= nav.cols || gy >= nav.rows) continue;
        if (nav.cost[gy * nav.cols + gx]! > 0) return { x: (gx + 0.5) * CELL, y: (gy + 0.5) * CELL };
      }
    }
  }
  return null;
}
