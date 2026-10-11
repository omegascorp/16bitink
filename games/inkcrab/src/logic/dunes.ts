import type { TilePos } from './dig';
import { setTile, tileAt, TILE, type Terrain } from './terrain';

/**
 * Dune sand: dry and loose, so it pours. A loose tile with open space under
 * it drops a row; one standing on a slope steeper than sand will rest at
 * (open beside it and below that) slides down a row that way. Each tile
 * moves at most one row a tick, so a disturbed slope visibly runs, and a
 * slope of single steps (45 degrees) holds. Packed sand under the dunes
 * never moves, so deep tunnels keep their roofs; shallow ones under dune
 * sand cave in.
 */

/** Tiles sand can't pour into besides solid ground: the crab, a creature. */
export type Blocked = (x: number, y: number) => boolean;

const inside = (t: Terrain, x: number, y: number): boolean => x >= 0 && x < t.width && y >= 0 && y < t.height;

function open(t: Terrain, x: number, y: number, blocked: Blocked): boolean {
  return inside(t, x, y) && tileAt(t, x, y) === TILE.air && !blocked(x, y);
}

/**
 * One tick of pouring over `cols`. Rows go bottom up so a falling stack
 * moves together and nothing moves twice. `flip` alternates which way a
 * tile tries first, so a peak spreads evenly. Returns every tile that
 * changed (where sand left and where it landed).
 */
export function pourStep(t: Terrain, cols: Iterable<number>, blocked: Blocked, flip: boolean): TilePos[] {
  const xs = [...new Set(cols)].filter((x) => x >= 0 && x < t.width);
  const sides = flip ? [1, -1] : [-1, 1];
  const changed: TilePos[] = [];
  for (let y = t.height - 2; y >= 0; y--) {
    for (const x of xs) {
      if (tileAt(t, x, y) !== TILE.loose) continue;
      let to: TilePos | null = open(t, x, y + 1, blocked) ? [x, y + 1] : null;
      for (const d of sides) {
        if (to) break;
        if (open(t, x + d, y, blocked) && open(t, x + d, y + 1, blocked)) to = [x + d, y + 1];
      }
      if (!to) continue;
      setTile(t, x, y, TILE.air);
      setTile(t, to[0], to[1], TILE.loose);
      changed.push([x, y], to);
    }
  }
  return changed;
}

/** Pours the whole beach until it rests (level building: a dune starts still). Returns the ticks it took. */
export function settleDunes(t: Terrain, limit = 400): number {
  const all = Array.from({ length: t.width }, (_, x) => x);
  const never = (): boolean => false;
  for (let tick = 0; tick < limit; tick++) if (!pourStep(t, all, never, tick % 2 === 1).length) return tick;
  return limit;
}

/** Columns worth checking after these tiles changed: theirs and either side. */
export function columnsAround(tiles: readonly TilePos[]): Set<number> {
  const cols = new Set<number>();
  for (const [x] of tiles) for (let d = -1; d <= 1; d++) cols.add(x + d);
  return cols;
}
