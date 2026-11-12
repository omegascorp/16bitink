import { CELL } from '../land';
import type { NavGrid } from './grid';

/**
 * Flow fields: one Dijkstra pass from a goal cell gives every cell its cost
 * to the goal, and a tank anywhere steers to its cheapest neighbour. Fields
 * are cached per goal cell, so bots heading for the same circle or crate
 * share one.
 */
export interface FlowField {
  readonly goal: number;
  readonly version: number;
  readonly dist: Float32Array;
}

const NB: readonly (readonly [number, number, number])[] = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2],
];

/** A binary min-heap of cell indices keyed by a distance array. */
class Heap {
  private readonly items: number[] = [];
  constructor(private readonly key: Float32Array) {}
  get size(): number {
    return this.items.length;
  }
  push(i: number): void {
    const a = this.items;
    a.push(i);
    let c = a.length - 1;
    while (c > 0) {
      const p = (c - 1) >> 1;
      if (this.key[a[p]!]! <= this.key[a[c]!]!) break;
      [a[p], a[c]] = [a[c]!, a[p]!];
      c = p;
    }
  }
  pop(): number {
    const a = this.items;
    const top = a[0]!;
    const last = a.pop()!;
    if (a.length > 0) {
      a[0] = last;
      let p = 0;
      for (;;) {
        const l = p * 2 + 1;
        const r = l + 1;
        let m = p;
        if (l < a.length && this.key[a[l]!]! < this.key[a[m]!]!) m = l;
        if (r < a.length && this.key[a[r]!]! < this.key[a[m]!]!) m = r;
        if (m === p) break;
        [a[p], a[m]] = [a[m]!, a[p]!];
        p = m;
      }
    }
    return top;
  }
}

export function buildFlow(nav: NavGrid, goal: number): FlowField {
  const { cols, rows, cost } = nav;
  const dist = new Float32Array(cols * rows).fill(Infinity);
  const heap = new Heap(dist);
  dist[goal] = 0;
  heap.push(goal);
  while (heap.size > 0) {
    const i = heap.pop();
    const gx = i % cols;
    const gy = (i - gx) / cols;
    const di = dist[i]!;
    for (const [dx, dy, w] of NB) {
      const nx = gx + dx;
      const ny = gy + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      const n = ny * cols + nx;
      const c = cost[n]!;
      if (c === 0) continue;
      // No corner cutting past a blocked cell.
      if (dx !== 0 && dy !== 0 && (cost[gy * cols + nx] === 0 || cost[ny * cols + gx] === 0)) continue;
      const nd = di + w * c;
      if (nd < dist[n]!) {
        dist[n] = nd;
        heap.push(n);
      }
    }
  }
  return { goal, version: nav.version, dist };
}

/** The direction to drive from (x, y), radians, or null at the goal or off the field. */
export function flowDir(nav: NavGrid, f: FlowField, x: number, y: number): number | null {
  const gx = Math.floor(x / CELL);
  const gy = Math.floor(y / CELL);
  if (gx < 0 || gy < 0 || gx >= nav.cols || gy >= nav.rows) return null;
  const i = gy * nav.cols + gx;
  if (i === f.goal) return null;
  let best = f.dist[i]!;
  let bx = 0;
  let by = 0;
  for (const [dx, dy] of NB) {
    const nx = gx + dx;
    const ny = gy + dy;
    if (nx < 0 || ny < 0 || nx >= nav.cols || ny >= nav.rows) continue;
    const d = f.dist[ny * nav.cols + nx]!;
    if (d < best) {
      best = d;
      bx = dx;
      by = dy;
    }
  }
  if (bx === 0 && by === 0) return null;
  // Aim at the neighbour's centre, so tanks ease back onto the cell lines.
  return Math.atan2((gy + by + 0.5) * CELL - y, (gx + bx + 0.5) * CELL - x);
}

export class FlowCache {
  private readonly fields = new Map<number, FlowField>();
  builds = 0;
  constructor(private readonly nav: NavGrid, private readonly max = 48) {}

  get(x: number, y: number): FlowField | null {
    const gx = Math.floor(x / CELL);
    const gy = Math.floor(y / CELL);
    if (gx < 0 || gy < 0 || gx >= this.nav.cols || gy >= this.nav.rows) return null;
    const goal = gy * this.nav.cols + gx;
    const hit = this.fields.get(goal);
    if (hit && hit.version === this.nav.version) {
      this.fields.delete(goal);
      this.fields.set(goal, hit);
      return hit;
    }
    const f = buildFlow(this.nav, goal);
    this.builds++;
    this.fields.set(goal, f);
    if (this.fields.size > this.max) this.fields.delete(this.fields.keys().next().value!);
    return f;
  }
}
