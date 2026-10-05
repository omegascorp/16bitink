import type { Box } from './body';
import { isDiggable, tileAt, TILE, type Terrain } from './terrain';

/** Tile coordinates. */
export type TilePos = readonly [number, number];

export function tileSpan(b: Box, tile: number): { x0: number; x1: number; y0: number; y1: number } {
  return {
    x0: Math.floor(b.x / tile),
    x1: Math.floor((b.x + b.w - 1e-6) / tile),
    y0: Math.floor(b.y / tile),
    y1: Math.floor((b.y + b.h - 1e-6) / tile),
  };
}

/**
 * The strip a dig removes, sized to the crab, so bigger crabs dig bigger
 * tunnels. Down: the row under the body. Ahead: the column in front. Up:
 * the row over the head; or, while walking, the column in front raised a
 * tile, which cuts a step to climb.
 */
export function digTargets(b: Box, facing: 1 | -1, aimY: -1 | 0 | 1, walking: boolean, tile: number): TilePos[] {
  const s = tileSpan(b, tile);
  const out: TilePos[] = [];
  const col = facing > 0 ? s.x1 + 1 : s.x0 - 1;
  if (aimY === 1) for (let x = s.x0; x <= s.x1; x++) out.push([x, s.y1 + 1]);
  else if (aimY === -1 && !walking) for (let x = s.x0; x <= s.x1; x++) out.push([x, s.y0 - 1]);
  else if (aimY === -1) for (let y = s.y0 - 1; y <= s.y1 - 1; y++) out.push([col, y]);
  else for (let y = s.y0; y <= s.y1; y++) out.push([col, y]);
  return out;
}

/**
 * Where one clump goes (it then falls until it lands, see sandfall.ts).
 * Down: under the body when there's room, so jumping and dropping sand
 * builds a pillar out of a pit. Otherwise in front: a hole at the crab's
 * feet first, then a wall built up from the feet to just over the head.
 * Null when there's no room.
 */
export function placeTarget(t: Terrain, b: Box, facing: 1 | -1, aimY: -1 | 0 | 1, tile: number): TilePos | null {
  const s = tileSpan(b, tile);
  if (aimY === 1) {
    // The first row wholly below the body; the crab drops onto it.
    const x = Math.floor((b.x + b.w / 2) / tile);
    if (tileAt(t, x, s.y1 + 1) === TILE.air) return [x, s.y1 + 1];
  }
  const col = facing > 0 ? s.x1 + 1 : s.x0 - 1;
  for (let y = s.y1 + 1; y >= s.y0 - 1; y--) if (tileAt(t, col, y) === TILE.air) return [col, y];
  return null;
}

export function diggableOf(t: Terrain, tiles: readonly TilePos[]): TilePos[] {
  return tiles.filter(([x, y]) => isDiggable(t, x, y));
}

/** Whether a tapped tile is close enough to the crab to dig or fill. */
export function inReach(b: Box, [x, y]: TilePos, tile: number): boolean {
  const s = tileSpan(b, tile);
  return x >= s.x0 - 1 && x <= s.x1 + 1 && y >= s.y0 - 1 && y <= s.y1 + 1;
}
