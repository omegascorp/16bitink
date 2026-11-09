import { passable, tileIndex } from '../map';
import { stepCost, type Terrainview, type Tile } from '../path';

/**
 * What every tile costs to reach from one hero, in one search (the
 * pathfinder's rules: a stop tile ends a way, an object's tile is visited
 * from beside it), so a lord can weigh every target at once and only plans
 * the way to the one he picks.
 */

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]] as const;

/** Movement points to each tile (Infinity: out of reach). */
export function reachFrom(v: Terrainview, from: Tile): Float64Array {
  const g = v.grid;
  const dist = new Float64Array(g.w * g.h).fill(Infinity);
  const start = tileIndex(g, from.x, from.y);
  dist[start] = 0;
  const heap: [number, number][] = [[0, start]];
  while (heap.length) {
    const [d, i] = pop(heap);
    if (d > dist[i]!) continue;
    // Objects end a way; a stop tile (a guard zone, a gate) too, but for the object beside it (a guarding monster is fought from there).
    if (i !== start && v.visit?.has(i)) continue;
    const stop = i !== start && v.stopAt.has(i);
    const x = i % g.w;
    const y = Math.floor(i / g.w);
    for (const [dx, dy] of DIRS) {
      const nx = x + dx;
      const ny = y + dy;
      if (!passable(g, nx, ny)) continue;
      const j = tileIndex(g, nx, ny);
      if (v.solid.has(j) || (stop && !v.visit?.has(j))) continue;
      const nd = d + stepCost(v, { x, y }, { x: nx, y: ny });
      if (nd < dist[j]!) {
        dist[j] = nd;
        push(heap, [nd, j]);
      }
    }
  }
  return dist;
}

/** The days a way of `cost` points takes with `left` today and `daily` after (0: today). */
export const daysFor = (cost: number, left: number, daily: number): number => (cost <= left ? 0 : Math.ceil((cost - left) / daily));

function push(h: [number, number][], item: [number, number]): void {
  h.push(item);
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
      const l = 2 * i + 1;
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
