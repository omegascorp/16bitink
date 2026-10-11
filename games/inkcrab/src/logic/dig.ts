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
 * The columns a dig down or up takes: the crab's width in whole tiles,
 * centred under it. Not every column it touches, so a crab one tile wide
 * standing across two digs one tile (and is nudged over the hole).
 */
export function digColumns(b: Box, tile: number): { x0: number; x1: number } {
  const n = Math.max(1, Math.ceil(b.w / tile - 1e-6));
  const x0 = Math.round((b.x + b.w / 2) / tile - n / 2);
  return { x0, x1: x0 + n - 1 };
}

/**
 * The strip a dig removes, sized to the crab, so bigger crabs dig bigger
 * tunnels. Down: the row under the body. Ahead: the column in front. Up:
 * the row over the head. While walking, up and down cut a stair instead:
 * the row over the head (or under the feet) plus the column in front
 * shifted a tile that way. The crab rises (or drops) into the cleared row,
 * then walks across, so holding dig tunnels a diagonal at any size.
 */
export function digTargets(b: Box, facing: 1 | -1, aimY: -1 | 0 | 1, walking: boolean, tile: number): TilePos[] {
  const s = tileSpan(b, tile);
  const c = digColumns(b, tile);
  const out: TilePos[] = [];
  const col = facing > 0 ? s.x1 + 1 : s.x0 - 1;
  if (aimY === 0) {
    for (let y = s.y0; y <= s.y1; y++) out.push([col, y]);
    return out;
  }
  const row = aimY === 1 ? s.y1 + 1 : s.y0 - 1;
  for (let x = c.x0; x <= c.x1; x++) out.push([x, row]);
  if (walking) for (let y = s.y0 + aimY; y <= s.y1 + aimY; y++) out.push([col, y]);
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
