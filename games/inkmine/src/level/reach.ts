import { tileCost, VOLATILE_COST, type DrillSpec } from '../logic/drill';
import { indexOf, inside, TILE, tileAt, volatileAt, type Terrain } from '../logic/terrain';
import { blastBreaks, lightsWhenDrilled, volatileKeyOf } from '../logic/volatiles';

/**
 * The level test's reachability check (spec, "Levels"): the least energy
 * to open a way from the lander to every tile, with a given drill. Open
 * tiles cost nothing, rock costs what the drill pays for it, and firedamp
 * or a charge costs a tap and then blows the soil and stone round it open
 * for free (a spore pocket only opens: it needs a blast to go off). Getting about (walking, flying, ladders) is taken as given:
 * this asks whether the ground lets you through, not how you climb.
 *
 * Returns the cost per tile index, Infinity where the drill can't reach.
 */
export function energyMap(t: Terrain, drill: DrillSpec, start: readonly [number, number]): Float64Array {
  const n = t.width * t.height;
  const cost = new Float64Array(n).fill(Infinity);
  // Tiles a blast would open: anything blastable next to a volatile.
  const blown = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const kind = volatileKeyOf(t.volatile[i]!);
    if (!kind || !lightsWhenDrilled(kind)) continue;
    const vx = i % t.width;
    const vy = Math.floor(i / t.width);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (inside(t, vx + dx, vy + dy) && blastBreaks(t, vx + dx, vy + dy)) blown[indexOf(t, vx + dx, vy + dy)] = 1;
    }
  }
  const step = (x: number, y: number): number | null => {
    if (volatileAt(t, x, y)) return VOLATILE_COST;
    const tile = tileAt(t, x, y);
    if (tile === TILE.air) return 0;
    if (blown[indexOf(t, x, y)] && blastBreaks(t, x, y)) return 0;
    return tileCost(drill, tile);
  };
  const [sx, sy] = start;
  const heap: [number, number][] = [[0, indexOf(t, sx, sy)]];
  cost[indexOf(t, sx, sy)] = 0;
  while (heap.length) {
    const [c, i] = pop(heap);
    if (c > cost[i]!) continue;
    const x = i % t.width;
    const y = Math.floor(i / t.width);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx;
      const ny = y + dy;
      if (!inside(t, nx, ny)) continue;
      const s = step(nx, ny);
      if (s === null) continue;
      const j = indexOf(t, nx, ny);
      if (c + s < cost[j]!) {
        cost[j] = c + s;
        push(heap, [c + s, j]);
      }
    }
  }
  return cost;
}

function push(h: [number, number][], v: [number, number]): void {
  h.push(v);
  let i = h.length - 1;
  while (i > 0) {
    const p = (i - 1) >> 1;
    if (h[p]![0] <= h[i]![0]) break;
    [h[p], h[i]] = [h[i]!, h[p]!];
    i = p;
  }
}

function pop(h: [number, number][]): [number, number] {
  const top = h[0]!;
  const last = h.pop()!;
  if (h.length) {
    h[0] = last;
    let i = 0;
    for (;;) {
      const l = i * 2 + 1;
      const r = l + 1;
      let m = i;
      if (l < h.length && h[l]![0] < h[m]![0]) m = l;
      if (r < h.length && h[r]![0] < h[m]![0]) m = r;
      if (m === i) break;
      [h[m], h[i]] = [h[i]!, h[m]!];
      i = m;
    }
  }
  return top;
}
