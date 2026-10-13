import type { Box } from './body';
import { isSolid, type Terrain, type TilePos } from './terrain';

/**
 * Which block pushing drills (no dig button: you push into the ground).
 *
 * - Sideways into a wall you can't walk or step up: the block ahead.
 * - Down: the block underfoot. Down and sideways: the block ahead, then the
 *   one below it, so holding the two cuts a slope down.
 * - Up: the block over your head. Up and sideways: the block overhead, then
 *   the one above the block ahead, so holding the two cuts stairs up (the
 *   prospector steps up a one-tile ledge by walking into it).
 *
 * Only from the ground or a ladder, never in mid-air.
 */
export interface Push {
  /** -1, 0 or 1. */
  readonly ix: number;
  readonly iy: number;
}

/** Whether a vertical dig re-centres the prospector over its column (so they drop or rise into the hole cleanly). */
export interface DrillTarget {
  readonly tile: TilePos;
  readonly centre: boolean;
}

export function bodyCell(b: Box, tile: number): { col: number; row: number } {
  return { col: Math.floor((b.x + b.w / 2) / tile), row: Math.floor((b.y + b.h / 2) / tile) };
}

/** The block a push drills, or null. `blocked` says the sideways walk this step was stopped by a wall. */
export function drillTarget(t: Terrain, b: Box, tile: number, push: Push, footing: boolean, blocked: boolean): DrillTarget | null {
  if (!footing || (push.ix === 0 && push.iy === 0)) return null;
  const { col, row } = bodyCell(b, tile);
  const solid = (x: number, y: number): boolean => isSolid(t, x, y);
  const at = (x: number, y: number, centre = false): DrillTarget | null => (solid(x, y) ? { tile: [x, y], centre } : null);
  if (push.iy > 0) {
    if (push.ix === 0) return at(col, row + 1, true);
    return at(col + push.ix, row) ?? at(col + push.ix, row + 1);
  }
  if (push.iy < 0) {
    if (push.ix === 0) return at(col, row - 1, true);
    return at(col, row - 1, true) ?? at(col + push.ix, row - 1);
  }
  return blocked ? at(col + push.ix, row) : null;
}

/** x that centres a body of width `w` over column `col`. */
export function centredX(col: number, w: number, tile: number): number {
  return col * tile + (tile - w) / 2;
}
