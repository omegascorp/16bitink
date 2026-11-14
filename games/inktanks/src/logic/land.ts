import type { Material } from './damage';
import { distToSegment, type Bounds, type Shape } from './geom';
import type { Pt } from './vec';

/**
 * A level's map: a few screens of ground patches and structures, with named
 * points and roads for the level's start, enemies and objective. Built once
 * per level from its layout (src/logic/level/load.ts).
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
  /** Low cover (sandbags, fences, crates, hay): shots pass over it in their first 50 px; it never blocks sight. */
  readonly low?: boolean;
  /** Mission tag: 'target' (raid), 'cage' (rescue)… */
  readonly tag?: string;
}

export interface LandDef {
  readonly id: string;
  readonly name: string;
  /** Size in screens (960 × 540 each). */
  readonly cols: number;
  readonly rows: number;
  readonly base: Ground;
  /** Painted in order: later patches cover earlier ones. */
  readonly terrain: readonly TerrainPatch[];
  readonly structures: readonly StructureDef[];
  readonly roads: Readonly<Record<string, readonly Pt[]>>;
  readonly points: Readonly<Record<string, Pt>>;
}

export interface Land {
  readonly def: LandDef;
  readonly width: number;
  readonly height: number;
  /** Screens. */
  readonly area: number;
  readonly bounds: Bounds;
  readonly gridCols: number;
  readonly gridRows: number;
  /** Ground index (into GROUNDS) per grid cell. */
  readonly ground: Uint8Array;
  readonly structures: readonly StructureDef[];
}

export function inPatch(p: PatchShape, x: number, y: number): boolean {
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

export function buildLand(def: LandDef): Land {
  const width = def.cols * SCREEN.w;
  const height = def.rows * SCREEN.h;
  const gridCols = Math.ceil(width / CELL);
  const gridRows = Math.ceil(height / CELL);
  const ground = new Uint8Array(gridCols * gridRows).fill(GROUNDS.indexOf(def.base));
  for (let gy = 0; gy < gridRows; gy++) {
    for (let gx = 0; gx < gridCols; gx++) {
      const x = (gx + 0.5) * CELL;
      const y = (gy + 0.5) * CELL;
      for (const p of def.terrain) if (inPatch(p.shape, x, y)) ground[gy * gridCols + gx] = GROUNDS.indexOf(p.ground);
    }
  }
  return {
    def, width, height, area: def.cols * def.rows, bounds: { x0: 0, y0: 0, x1: width, y1: height },
    gridCols, gridRows, ground, structures: def.structures,
  };
}

export function cellIndex(l: Land, x: number, y: number): number {
  const gx = Math.floor(x / CELL);
  const gy = Math.floor(y / CELL);
  if (gx < 0 || gy < 0 || gx >= l.gridCols || gy >= l.gridRows) return -1;
  return gy * l.gridCols + gx;
}

export function groundAt(l: Land, x: number, y: number): Ground {
  const i = cellIndex(l, x, y);
  return i < 0 ? 'water' : GROUNDS[l.ground[i]!]!;
}

/** On the map, dry and drivable. */
export function isDrivable(l: Land, x: number, y: number): boolean {
  return groundAt(l, x, y) !== 'water';
}
