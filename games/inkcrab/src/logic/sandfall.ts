import type { TilePos } from './dig';
import { setTile, tileAt, TILE, type Terrain } from './terrain';

/**
 * Loose sand: clumps the crab put down fall straight down until they land.
 * Packed beach sand holds, so tunnels keep their roofs; only placed sand
 * moves. `blocked` stops a clump on something that isn't terrain (the crab).
 * Returns every tile that changed (where clumps left and where they landed).
 */
export function settleColumn(t: Terrain, x: number, blocked: (x: number, y: number) => boolean): TilePos[] {
  const changed: TilePos[] = [];
  // Bottom up, so a stack of clumps falls together.
  for (let y = t.height - 2; y >= 0; y--) {
    if (tileAt(t, x, y) !== TILE.placed) continue;
    let to = y;
    while (to + 1 < t.height && tileAt(t, x, to + 1) === TILE.air && !blocked(x, to + 1)) to++;
    if (to === y) continue;
    setTile(t, x, y, TILE.air);
    setTile(t, x, to, TILE.placed);
    changed.push([x, y], [x, to]);
  }
  return changed;
}
