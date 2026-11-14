import { SCREEN, type Ground, type TerrainPatch } from '../../../logic/land';
import type { StructPlace } from '../../../logic/level/types';
import type { LootTable } from '../../../logic/loot';
import type { Pt } from '../../../logic/vec';

/**
 * Small helpers for writing chapter 1 layouts by hand: points in screens,
 * lines of structures, rivers with bridges. Everything returns plain
 * immutable data; a layout stays a literal you can read.
 */
export const W = SCREEN.w;
export const H = SCREEN.h;

/** A point in screens: at(1.5, 0.5) is the middle of the top row's second screen. */
export const at = (sx: number, sy: number): Pt => ({ x: Math.round(sx * W), y: Math.round(sy * H) });

/** `n` structures of a kind in a line from (x, y), `dx`/`dy` apart. */
export function row(kind: string, x: number, y: number, n: number, dx: number, dy = 0, tag?: string): StructPlace[] {
  return Array.from({ length: n }, (_, i) => ({ kind, x: Math.round(x + dx * i), y: Math.round(y + dy * i), tag }));
}

/** One structure per point. */
export function each(kind: string, pts: readonly (readonly [number, number])[], tag?: string): StructPlace[] {
  return pts.map(([x, y]) => ({ kind, x, y, tag }));
}

export const patch = (ground: Ground, x: number, y: number, w: number, h: number): TerrainPatch => ({ ground, shape: { kind: 'rect', x, y, w, h } });
export const blob = (ground: Ground, x: number, y: number, r: number): TerrainPatch => ({ ground, shape: { kind: 'circle', x, y, r } });
export const path = (ground: Ground, pts: readonly Pt[], width: number): TerrainPatch => ({ ground, shape: { kind: 'path', pts, width } });

/** A bridge deck across a river, and its two rails. `across`: 'x' when the river runs north-south. */
export function bridge(c: Pt, across: 'x' | 'y', length = 220): { deck: TerrainPatch; rails: StructPlace[] } {
  const w = across === 'x' ? length : 110;
  const h = across === 'x' ? 110 : length;
  const kind = across === 'x' ? 'bridgeRail' : 'bridgeRailV';
  const off = across === 'x' ? { x: 0, y: 50 } : { x: 50, y: 0 };
  return {
    deck: patch('bridge', c.x - w / 2, c.y - h / 2, w, h),
    rails: [-1, 1].map((s) => ({ kind, x: c.x + off.x * s, y: c.y + off.y * s })),
  };
}

/** A farmyard: house, barn, a shed and fences, around (x, y). */
export function farmyard(x: number, y: number): StructPlace[] {
  return [
    { kind: 'farmhouse', x: x - 160, y: y - 60 },
    { kind: 'barn', x: x + 170, y: y - 40 },
    { kind: 'shed', x: x - 20, y: y + 110 },
    ...row('fence', x - 260, y + 200, 4, 130),
    { kind: 'bush', x: x - 280, y: y + 60 },
  ];
}

/** Loot for rolled crates, by stage of the chapter. */
export const LOOT_EARLY: LootTable = { families: ['machinegun', 'cannon', 'light', 'medium', 'wheels', 'halftracks'], crateMk: [0.75, 0.25, 0], kitShare: 0.3 };
export const LOOT_MIDDLE: LootTable = { families: ['machinegun', 'cannon', 'rockets', 'light', 'medium', 'wheels', 'halftracks', 'tracks'], crateMk: [0.7, 0.3, 0], kitShare: 0.3 };
export const LOOT_LATE: LootTable = { families: ['machinegun', 'cannon', 'rockets', 'light', 'medium', 'heavy', 'wheels', 'halftracks', 'tracks'], crateMk: [0.6, 0.4, 0], kitShare: 0.3 };

/** Common chapter 1 tanks. */
export const TANK = {
  scout: 'machinegun1/light1/wheels1',
  scout2: 'machinegun2/light1/wheels1',
  gunner: 'cannon1/medium1/halftracks1',
  gunner2: 'cannon2/medium1/halftracks1',
  rocket: 'rockets1/medium1/tracks1',
  heavy: 'cannon1/heavy1/tracks1',
  heavy2: 'cannon2/heavy2/tracks1',
  truck: 'machinegun1/medium1/wheels1',
} as const;
