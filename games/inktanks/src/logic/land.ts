import type { Material } from './damage';
import { distToSegment, type Bounds, type Shape } from './geom';
import type { Pt } from './vec';

/**
 * A chapter's land: a grid of screens split into regions that open one per
 * level. Levels play on the regions open so far; earlier regions stay.
 */
export const SCREEN = { w: 960, h: 540 } as const;
/** The ground and navigation grid's cell, native px. */
export const CELL = 40;

export type Ground = 'grass' | 'grassDry' | 'dirt' | 'sand' | 'mud' | 'water' | 'bridge';
export const GROUNDS: readonly Ground[] = ['grass', 'grassDry', 'dirt', 'sand', 'mud', 'water', 'bridge'];

export type PatchShape =
  | { readonly kind: 'rect'; readonly x: number; readonly y: number; readonly w: number; readonly h: number }
  | { readonly kind: 'circle'; readonly x: number; readonly y: number; readonly r: number }
  | { readonly kind: 'path'; readonly pts: readonly Pt[]; readonly width: number };

export interface TerrainPatch {
  readonly ground: Ground;
  readonly shape: PatchShape;
}

export interface StructureDef {
  readonly id: string;
  /** The world art key (structures/<kind>-<state>.png). */
  readonly kind: string;
  /** Ground origin, world native px. */
  readonly x: number;
  readonly y: number;
  readonly shape: Shape;
  readonly material: Material;
  /** 0: can't be destroyed. */
  readonly hp: number;
  /** Tracks and heavy hulls drive through it (fences, small trees). */
  readonly flattenable?: boolean;
  /** Hides a tank that isn't firing (bushes, tall crops); doesn't block. */
  readonly cover?: boolean;
  /** Has a roof that hides tanks under it. */
  readonly roof?: boolean;
  /** Mission tag: 'target' (raid), 'radar'… */
  readonly tag?: string;
}

export interface RegionDef {
  readonly id: string;
  readonly name: string;
  /** The level that opens it. */
  readonly level: number;
  /** Screen cells [col, row]. */
  readonly cells: readonly (readonly [number, number])[];
}

export interface LandDef {
  readonly id: string;
  readonly name: string;
  readonly cols: number;
  readonly rows: number;
  readonly base: Ground;
  readonly regions: readonly RegionDef[];
  readonly terrain: readonly TerrainPatch[];
  readonly structures: readonly StructureDef[];
  readonly crateSpots: readonly Pt[];
  readonly roads: Readonly<Record<string, readonly Pt[]>>;
  readonly points: Readonly<Record<string, Pt>>;
}

export interface OpenLand {
  readonly def: LandDef;
  readonly level: number;
  readonly width: number;
  readonly height: number;
  /** Screens open. */
  readonly area: number;
  readonly bounds: Bounds;
  readonly gridCols: number;
  readonly gridRows: number;
  /** Ground index (into GROUNDS) per grid cell. */
  readonly ground: Uint8Array;
  /** 1 where the grid cell is on open land. */
  readonly open: Uint8Array;
  readonly structures: readonly StructureDef[];
  readonly crateSpots: readonly Pt[];
  /** The region this level opened. */
  readonly region: RegionDef | null;
}

export function openCells(def: LandDef, level: number): Set<number> {
  const s = new Set<number>();
  for (const r of def.regions) if (r.level <= level) for (const [c, row] of r.cells) s.add(row * def.cols + c);
  return s;
}

function inPatch(p: PatchShape, x: number, y: number): boolean {
  switch (p.kind) {
    case 'rect':
      return x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h;
    case 'circle':
      return (x - p.x) ** 2 + (y - p.y) ** 2 <= p.r * p.r;
    case 'path':
      for (let i = 1; i < p.pts.length; i++) {
        const a = p.pts[i - 1]!;
        const b = p.pts[i]!;
        if (distToSegment(x, y, a.x, a.y, b.x, b.y) <= p.width / 2) return true;
      }
      return false;
  }
}

export function openLand(def: LandDef, level: number): OpenLand {
  const width = def.cols * SCREEN.w;
  const height = def.rows * SCREEN.h;
  const cells = openCells(def, level);
  const gridCols = Math.ceil(width / CELL);
  const gridRows = Math.ceil(height / CELL);
  const ground = new Uint8Array(gridCols * gridRows).fill(GROUNDS.indexOf(def.base));
  const open = new Uint8Array(gridCols * gridRows);
  const isOpenPx = (x: number, y: number): boolean => cells.has(Math.floor(y / SCREEN.h) * def.cols + Math.floor(x / SCREEN.w));
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let gy = 0; gy < gridRows; gy++) {
    for (let gx = 0; gx < gridCols; gx++) {
      const x = (gx + 0.5) * CELL;
      const y = (gy + 0.5) * CELL;
      const i = gy * gridCols + gx;
      for (const p of def.terrain) if (inPatch(p.shape, x, y)) ground[i] = GROUNDS.indexOf(p.ground);
      if (isOpenPx(x, y)) {
        open[i] = 1;
        x0 = Math.min(x0, gx * CELL);
        y0 = Math.min(y0, gy * CELL);
        x1 = Math.max(x1, (gx + 1) * CELL);
        y1 = Math.max(y1, (gy + 1) * CELL);
      }
    }
  }
  return {
    def,
    level,
    width,
    height,
    area: cells.size,
    bounds: { x0, y0, x1, y1 },
    gridCols,
    gridRows,
    ground,
    open,
    structures: def.structures.filter((s) => isOpenPx(s.x, s.y)),
    crateSpots: def.crateSpots.filter((p) => isOpenPx(p.x, p.y)),
    region: def.regions.find((r) => r.level === level) ?? null,
  };
}

export function cellIndex(l: OpenLand, x: number, y: number): number {
  const gx = Math.floor(x / CELL);
  const gy = Math.floor(y / CELL);
  if (gx < 0 || gy < 0 || gx >= l.gridCols || gy >= l.gridRows) return -1;
  return gy * l.gridCols + gx;
}

export function groundAt(l: OpenLand, x: number, y: number): Ground {
  const i = cellIndex(l, x, y);
  return i < 0 ? 'water' : GROUNDS[l.ground[i]!]!;
}

export function isOpenAt(l: OpenLand, x: number, y: number): boolean {
  const i = cellIndex(l, x, y);
  return i >= 0 && l.open[i] === 1;
}

/** Open, dry and drivable. */
export function isDrivable(l: OpenLand, x: number, y: number): boolean {
  return isOpenAt(l, x, y) && groundAt(l, x, y) !== 'water';
}

/** The circle around the open land: the storm's first circle. */
export function openCircle(l: OpenLand): { x: number; y: number; r: number } {
  const { x0, y0, x1, y1 } = l.bounds;
  return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, r: Math.hypot(x1 - x0, y1 - y0) / 2 };
}

/** The centre of a region, world px. */
export function regionCentre(r: RegionDef): Pt {
  const n = r.cells.length;
  const cx = r.cells.reduce((s, [c]) => s + c + 0.5, 0) / n;
  const cy = r.cells.reduce((s, [, row]) => s + row + 0.5, 0) / n;
  return { x: cx * SCREEN.w, y: cy * SCREEN.h };
}

/** Bots, crates and supply drops scale with the open area so density per screen holds. */
export function scaleForArea(area: number): { bots: number; crates: number } {
  return {
    bots: Math.max(3, Math.round(5 * Math.pow(area / 4, 0.47))),
    crates: Math.round(8 * Math.pow(area / 4, 0.78)),
  };
}
