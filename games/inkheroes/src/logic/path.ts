import type { Grid } from './map';
import { inGrid, passable, ROAD_COST, TERRAIN_COST, tileIndex } from './map';

export interface Tile {
  readonly x: number;
  readonly y: number;
}

export interface PathStep extends Tile {
  /** Movement points this step costs. */
  readonly cost: number;
  /** What it would cost straight (a diagonal step that doesn't fit is still allowed when this does). */
  readonly straight: number;
  /** 0 when the hero gets there today, 1 tomorrow… */
  readonly day: number;
}

/** What the pathfinder needs to know about the world beyond the ground. */
export interface Terrainview {
  readonly grid: Grid;
  /** Tiles nothing may enter (object footprints, other heroes). */
  readonly solid: ReadonlySet<number>;
  /** Tiles a path may end on but not pass through (object gates, monsters' guard zones). */
  readonly stopAt: ReadonlySet<number>;
  /** Monsters' tiles: a path to one may step on from its guard zone (that's attacking it). */
  readonly monsters?: ReadonlySet<number>;
  /** Pathfinding skill: 0..0.75 off rough ground's extra cost. */
  readonly pathfinding: number;
}

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]] as const;

/** What stepping from one tile to its neighbour costs (H3: the ground you leave; roads only road to road). */
export function stepCost(v: Terrainview, from: Tile, to: Tile): number {
  const g = v.grid;
  const a = tileIndex(g, from.x, from.y);
  const b = tileIndex(g, to.x, to.y);
  // Off a bridge onto open ground costs as plain ground.
  let base = g.cover[a] === 'road' && g.cover[b] === 'road' ? ROAD_COST : g.terrain[a] === 'water' ? 100 : TERRAIN_COST[g.terrain[a]!];
  if (base > 100) base = Math.round(100 + (base - 100) * (1 - v.pathfinding));
  return from.x !== to.x && from.y !== to.y ? Math.round(base * Math.SQRT2) : base;
}

/**
 * The cheapest route to (tx, ty), then split into days: today's points
 * first, then `daily` each day after. A last step that costs more than is
 * left is still allowed when its straight cost would fit (as H3).
 */
export function findPath(v: Terrainview, from: Tile, tx: number, ty: number, mpLeft: number, daily: number): PathStep[] | null {
  const g = v.grid;
  if (!inGrid(g, tx, ty) || (tx === from.x && ty === from.y)) return null;
  const goal = tileIndex(g, tx, ty);
  if (v.solid.has(goal) || !passable(g, tx, ty)) return null;
  const n = g.w * g.h;
  const dist = new Float64Array(n).fill(Infinity);
  const prev = new Int32Array(n).fill(-1);
  const start = tileIndex(g, from.x, from.y);
  dist[start] = 0;
  // A plain Dijkstra over a binary heap: maps are small.
  const heap: [number, number][] = [[0, start]];
  while (heap.length) {
    const [d, i] = popMin(heap);
    if (d > dist[i]!) continue;
    if (i === goal) break;
    // A stop tile is never walked through, except from a monster's guard zone onto the monster being attacked.
    const onlyGoal = i !== start && v.stopAt.has(i);
    if (onlyGoal && !v.monsters?.has(goal)) continue;
    const x = i % g.w;
    const y = Math.floor(i / g.w);
    for (const [dx, dy] of DIRS) {
      const nx = x + dx;
      const ny = y + dy;
      if (!passable(g, nx, ny)) continue;
      const j = tileIndex(g, nx, ny);
      if (onlyGoal && j !== goal) continue;
      if (v.solid.has(j)) continue;
      const nd = d + stepCost(v, { x, y }, { x: nx, y: ny });
      if (nd < dist[j]!) {
        dist[j] = nd;
        prev[j] = i;
        pushHeap(heap, [nd, j]);
      }
    }
  }
  if (dist[goal] === Infinity) return null;
  const tiles: Tile[] = [];
  for (let i = goal; i !== start; i = prev[i]!) tiles.unshift({ x: i % g.w, y: Math.floor(i / g.w) });
  return schedule(v, from, tiles, mpLeft, daily);
}

function schedule(v: Terrainview, from: Tile, tiles: readonly Tile[], mpLeft: number, daily: number): PathStep[] {
  const out: PathStep[] = [];
  let left = mpLeft;
  let day = 0;
  let at = from;
  for (const t of tiles) {
    const cost = stepCost(v, at, t);
    const straight = straightCost(v, at, t);
    if (cost > left && straight > left) {
      day++;
      left = daily;
    }
    left = Math.max(0, left - cost);
    out.push({ ...t, cost, straight, day });
    at = t;
  }
  return out;
}

/** The cost of a step as if it weren't diagonal. */
function straightCost(v: Terrainview, from: Tile, to: Tile): number {
  return stepCost(v, from, { x: to.x, y: from.y === to.y || from.x === to.x ? to.y : from.y });
}

/** Whether a hero with `left` points can take this step now. */
export function canStep(step: PathStep, left: number): boolean {
  return step.cost <= left || step.straight <= left;
}

function pushHeap(h: [number, number][], item: [number, number]): void {
  h.push(item);
  let i = h.length - 1;
  while (i > 0) {
    const p = (i - 1) >> 1;
    if (h[p]![0] <= h[i]![0]) break;
    [h[p], h[i]] = [h[i]!, h[p]!];
    i = p;
  }
}

function popMin(h: [number, number][]): [number, number] {
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
