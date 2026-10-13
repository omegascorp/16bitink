import type { Box } from './body';
import { isSolid, type Terrain, type TilePos } from './terrain';

/**
 * Which block pushing drills (no dig button: you push into the ground).
 *
 * - Sideways into a wall you can't walk or step up: the block ahead.
 * - Down: the block underfoot. Up: the block over your head.
 * - A diagonal cuts a staircase, two blocks a step dug as one: the
 *   diagonal block and the one joining it to you (overhead going up, ahead
 *   going down), so it never leaves a hole touching the tunnel only at a
 *   corner, wherever you stop. Walking and the one-tile step-up then carry
 *   the prospector along it.
 *
 * Only with footing (the ground, a ladder, or hovering on the jetpack).
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
  /** A second block dug in the same go (a diagonal's joining block). */
  readonly with?: TilePos;
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
  if (push.ix === 0) return push.iy !== 0 ? at(col, row + push.iy, true) : null;
  if (push.iy !== 0) {
    // No re-centring on a diagonal: it would pull the prospector back off the stair they're stepping onto.
    const diagonal: TilePos = [col + push.ix, row + push.iy];
    const join: TilePos = push.iy < 0 ? [col, row - 1] : [col + push.ix, row];
    const [d, j] = [solid(...diagonal), solid(...join)];
    if (d && j) return { tile: diagonal, centre: false, with: join };
    if (d) return { tile: diagonal, centre: false };
    return j ? { tile: join, centre: false } : null;
  }
  return blocked ? at(col + push.ix, row) : null;
}

/** x that centres a body of width `w` over column `col`. */
export function centredX(col: number, w: number, tile: number): number {
  return col * tile + (tile - w) / 2;
}
