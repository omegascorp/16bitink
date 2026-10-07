import type { TilePos } from './dig';
import { setTile, tileAt, TILE, type Terrain } from './terrain';

/**
 * Water on the tile grid, as a wet flag per open tile. The sea comes in
 * from the right-hand edge of the beach: every open tile below the tide
 * line that the sea can reach through open tiles is under water, tunnels
 * included. As the tide drops, water that can run back down to the sea
 * (never uphill) drains; what's held in a hollow of rock or sand stays: a
 * rock pool. Water left above the sea trickles down into any hole under it,
 * or over an edge beside it, so a pool dug into drains into the tunnel.
 */
export interface Water {
  readonly width: number;
  readonly height: number;
  /** 1 where an open tile is under water. */
  readonly wet: Uint8Array;
  /** 1 where it's the open sea (reached from the edge below the tide), not a pool. */
  readonly sea: Uint8Array;
}

export function createWater(t: Terrain): Water {
  return { width: t.width, height: t.height, wet: new Uint8Array(t.width * t.height), sea: new Uint8Array(t.width * t.height) };
}

const open = (t: Terrain, x: number, y: number): boolean => x >= 0 && y >= 0 && x < t.width && y < t.height && tileAt(t, x, y) === TILE.air;

export function isWet(w: Water, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < w.width && y < w.height && w.wet[y * w.width + x] === 1;
}

/** Whether a tile's middle is below the sea's surface. */
const belowTide = (y: number, seaY: number, tile: number): boolean => (y + 0.5) * tile > seaY;

/**
 * Brings the water up to date with the sea at `seaY` (world y): floods
 * what the sea reaches, drains what can run back to it, then lets left-over
 * water fall or spread one tile. Returns whether anything changed.
 */
export function updateWater(t: Terrain, w: Water, seaY: number, tile: number): boolean {
  const W = t.width;
  const before = w.wet.slice();
  // Sand or rock where water was: it's pushed out.
  for (let i = 0; i < w.wet.length; i++) if (w.wet[i] && t.tiles[i] !== TILE.air) w.wet[i] = 0;
  // 1. The sea: open tiles below the tide reached from the right-hand edge.
  w.sea.fill(0);
  const queue: number[] = [];
  for (let y = 0; y < t.height; y++) {
    if (open(t, W - 1, y) && belowTide(y, seaY, tile)) {
      w.sea[y * W + W - 1] = 1;
      queue.push(y * W + W - 1);
    }
  }
  for (let q = 0; q < queue.length; q++) {
    const i = queue[q]!;
    const x = i % W;
    const y = (i - x) / W;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx;
      const ny = y + dy;
      const j = ny * W + nx;
      if (!open(t, nx, ny) || w.sea[j] || !belowTide(ny, seaY, tile)) continue;
      w.sea[j] = 1;
      queue.push(j);
    }
  }
  for (let i = 0; i < w.wet.length; i++) if (w.sea[i]) w.wet[i] = 1;
  // 2. Draining: water above the tide that can run down or sideways (never up) to the sea goes out with it.
  const drains = new Uint8Array(w.wet.length);
  const back: number[] = [];
  // Seeds: the sea, and the seaward edge itself (water reaching it runs off into the sea beyond).
  for (let i = 0; i < w.sea.length; i++) {
    const edge = i % W === W - 1 && t.tiles[i] === TILE.air;
    if (!w.sea[i] && !edge) continue;
    drains[i] = 1;
    back.push(i);
  }
  for (let q = 0; q < back.length; q++) {
    const i = back[q]!;
    const x = i % W;
    const y = (i - x) / W;
    // Tiles water could have come from: the one above, and those beside.
    for (const [dx, dy] of [[0, -1], [1, 0], [-1, 0]] as const) {
      const nx = x + dx;
      const ny = y + dy;
      const j = ny * W + nx;
      if (!open(t, nx, ny) || drains[j]) continue;
      drains[j] = 1;
      back.push(j);
    }
  }
  for (let i = 0; i < w.wet.length; i++) if (w.wet[i] && !w.sea[i] && drains[i]) w.wet[i] = 0;
  // 3. Left-over water (pools) falls into an open tile under it, or over an edge beside it.
  trickle(t, w);
  for (let i = 0; i < w.wet.length; i++) if (w.wet[i] !== before[i]) return true;
  return false;
}

function trickle(t: Terrain, w: Water): void {
  const W = t.width;
  const moved = new Uint8Array(w.wet.length);
  for (let y = t.height - 2; y >= 0; y--) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (!w.wet[i] || w.sea[i] || moved[i]) continue;
      const below = i + W;
      if (open(t, x, y + 1) && !w.wet[below]) {
        w.wet[i] = 0;
        w.wet[below] = 1;
        moved[below] = 1;
        continue;
      }
      // Sideways only over an edge, into a drop beside it: level water lies still.
      for (const dx of [1, -1]) {
        const j = i + dx;
        const drop = open(t, x + dx, y + 1) && !w.wet[j + W];
        if (open(t, x + dx, y) && !w.wet[j] && drop) {
          w.wet[i] = 0;
          w.wet[j] = 1;
          moved[j] = 1;
          break;
        }
      }
    }
  }
}

/**
 * The sea working on sand put down below the tide: a placed clump in the
 * sea slumps a row a tick, down or down to one side, until it lies flat on
 * the seabed. Nothing is lost. Returns tiles changed, as from/to pairs.
 */
export function washStep(t: Terrain, w: Water, flip: boolean): TilePos[] {
  const W = t.width;
  const changed: TilePos[] = [];
  const sides = flip ? [1, -1] : [-1, 1];
  const inSea = (x: number, y: number): boolean => x >= 0 && x < W && y >= 0 && y < t.height && w.sea[y * W + x] === 1;
  for (let y = t.height - 2; y >= 0; y--) {
    for (let x = 0; x < W; x++) {
      if (tileAt(t, x, y) !== TILE.placed) continue;
      // Only clumps the sea is lapping at.
      if (!inSea(x - 1, y) && !inSea(x + 1, y) && !inSea(x, y - 1) && !inSea(x, y + 1)) continue;
      let to: TilePos | null = open(t, x, y + 1) ? [x, y + 1] : null;
      for (const d of sides) if (!to && open(t, x + d, y) && open(t, x + d, y + 1)) to = [x + d, y + 1];
      if (!to) continue;
      setTile(t, x, y, TILE.air);
      setTile(t, to[0], to[1], TILE.placed);
      changed.push([x, y], to);
    }
  }
  return changed;
}
