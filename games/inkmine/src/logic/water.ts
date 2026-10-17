import { indexOf, TILE, wrapX, type Terrain, type TilePos } from './terrain';

/**
 * Water on the tile grid (spec, "Brine: Water and air"): one flag per open
 * tile. Two kinds:
 *
 * - **The sea** never runs out and keeps its level: every open tile at or
 *   below `seaRow` that it reaches is under water, so a tunnel dug up into
 *   the seabed floods for good, as far as it runs below sea level.
 * - **Bodies in the rock** (sealed pockets, flooded caves) hold so much
 *   water. Opened, a body's water pours into whatever is lower, filling the
 *   lowest open tile next to it first, until it stands level in both, as
 *   water does in joined pipes. It never climbs a rise, so a pocket opened
 *   from above stays put; air left at the top of a cave stays air. A body
 *   that reaches the sea joins it.
 *
 * Tiles marked `dry` (an air bell someone keeps full) never take water.
 *
 * A flood takes time: the new level is worked out at once, then tiles move
 * a few at a time (`RATE` a second), the highest of the old water drained
 * as the lowest of the new is filled, so the volume never changes. Opening
 * more ground first finishes any flood under way.
 *
 * The grid wraps with the terrain. Mutated in place, as the terrain is.
 */
export interface Flow {
  /** Tile indexes to fill, in order. */
  readonly fill: readonly number[];
  /** Tile indexes to drain, in order. */
  readonly drain: readonly number[];
  done: number;
  /** Where it started, for saying "flood!" near you. */
  readonly at: TilePos;
  /** The sea coming in: what it fills is the sea's. */
  readonly sea: boolean;
}

/** Tiles a second a flood moves. */
export const RATE = 40;

export class Water {
  readonly wet: Uint8Array;
  /** 1 where the water is the sea's (wet too). */
  readonly sea: Uint8Array;
  readonly dry: Uint8Array;
  flows: Flow[] = [];
  private budget = 0;

  constructor(
    private readonly t: Terrain,
    /** The first row the sea fills (null on a world without one). */
    readonly seaRow: number | null,
    wet?: Uint8Array,
    dry?: Uint8Array,
  ) {
    const n = t.width * t.height;
    this.wet = new Uint8Array(n);
    this.sea = new Uint8Array(n);
    this.dry = dry ?? new Uint8Array(n);
    if (wet) for (let i = 0; i < n; i++) if (wet[i] && this.open(i)) this.wet[i] = 1;
  }

  /**
   * The water as carved: `bodies` (the pockets and flooded caves), then the
   * sea let in from the open sky below sea level (`roof`, each column's
   * first solid row), straight to its level.
   */
  static carved(t: Terrain, seaRow: number | null, bodies: Uint8Array, dry: Uint8Array, roof: Int32Array): Water {
    const w = new Water(t, seaRow, bodies, dry);
    if (seaRow !== null) {
      const seeds: number[] = [];
      for (let x = 0; x < t.width; x++) for (let y = Math.max(0, seaRow); y < roof[x]!; y++) seeds.push(y * t.width + x);
      w.apply(w.seaFlood(seeds));
    }
    // A body a cave runs into settles into it at once, as if it always had.
    const seen = new Uint8Array(w.wet.length);
    for (let i = 0; i < w.wet.length; i++) {
      if (!w.wet[i] || w.sea[i] || seen[i]) continue;
      for (const k of w.body(i)) seen[k] = 1;
      w.apply(w.pour(i, [0, 0]));
      for (const k of w.body(i)) seen[k] = 1;
    }
    return w;
  }

  /**
   * Water as saved (`wet`): which of it is the sea is worked out again, from
   * the open sky below sea level through the water.
   */
  static saved(t: Terrain, seaRow: number | null, wet: Uint8Array, dry: Uint8Array, roof: Int32Array): Water {
    const w = new Water(t, seaRow, wet, dry);
    if (seaRow === null) return w;
    const queue: number[] = [];
    for (let x = 0; x < t.width; x++) {
      for (let y = Math.max(0, seaRow); y < roof[x]!; y++) {
        const i = y * t.width + x;
        if (w.wet[i] && !w.sea[i]) {
          w.sea[i] = 1;
          queue.push(i);
        }
      }
    }
    for (let q = 0; q < queue.length; q++) {
      for (const j of w.around(queue[q]!)) {
        if (w.wet[j] && !w.sea[j]) {
          w.sea[j] = 1;
          queue.push(j);
        }
      }
    }
    return w;
  }

  isWet(x: number, y: number): boolean {
    return y >= 0 && y < this.t.height && this.wet[indexOf(this.t, x, y)] === 1;
  }

  /** Metres of water from tile (x, y) up to the surface over it: 0 when it's dry. */
  depthAt(x: number, y: number): number {
    let d = 0;
    while (this.isWet(x, y - d)) d++;
    return d;
  }

  /** Whether a flood is still moving. */
  get flowing(): boolean {
    return this.flows.length > 0;
  }

  /**
   * Ground just opened: any water beside it pours in (a body), or floods in
   * (the sea). Finishes any flood under way first; when one opening touches
   * more than one body, all but the last flood are finished at once, so each
   * is worked out against the water as it will stand. Returns the floods
   * started.
   */
  opened(tiles: readonly TilePos[]): Flow[] {
    if (!tiles.length) return [];
    this.settle();
    const contacts: { readonly j: number; readonly i: number; readonly at: TilePos }[] = [];
    for (const [x, y] of tiles) {
      const i = indexOf(this.t, x, y);
      if (!this.open(i) || this.wet[i]) continue;
      for (const j of this.around(i)) if (this.wet[j]) contacts.push({ j, i, at: [x, y] });
    }
    const started: Flow[] = [];
    const done = new Set<number>();
    for (const { j, i, at } of contacts) {
      if (done.has(j) || !this.wet[j] || this.wet[i]) continue;
      this.settle();
      const flow = this.sea[j] ? this.seaFlood([i], at) : this.pour(j, at);
      for (const k of [...flow.fill, ...flow.drain]) done.add(k);
      if (!this.sea[j]) for (const k of this.body(j)) done.add(k);
      if (!flow.fill.length && !flow.drain.length) continue;
      this.flows.push(flow);
      started.push(flow);
    }
    return started;
  }

  /** Moves the floods on by `dt` s. Returns the tiles whose water changed. */
  step(dt: number): TilePos[] {
    if (!this.flows.length) {
      this.budget = 0;
      return [];
    }
    this.budget += RATE * dt;
    const changed: TilePos[] = [];
    while (this.budget >= 1 && this.flows.length) {
      const f = this.flows[0]!;
      this.move(f, f.done, changed);
      f.done++;
      this.budget--;
      if (f.done >= Math.max(f.fill.length, f.drain.length)) this.flows.shift();
    }
    return changed;
  }

  /** The water as it will stand once every flood has finished, without finishing them: what a save keeps. */
  settledWet(): Uint8Array {
    const out = this.wet.slice();
    for (const f of this.flows) {
      for (let k = f.done; k < Math.max(f.fill.length, f.drain.length); k++) {
        const d = f.drain[k];
        if (d !== undefined) out[d] = 0;
        const i = f.fill[k];
        if (i !== undefined && this.open(i)) out[i] = 1;
      }
    }
    return out;
  }

  /** Every flood finished at once (before saving, or before working out the next). Returns the tiles changed. */
  settle(): TilePos[] {
    const changed: TilePos[] = [];
    for (const f of this.flows) for (let k = f.done; k < Math.max(f.fill.length, f.drain.length); k++) this.move(f, k, changed);
    this.flows = [];
    this.budget = 0;
    return changed;
  }

  private move(f: Flow, k: number, changed: TilePos[]): void {
    const W = this.t.width;
    const d = f.drain[k];
    if (d !== undefined && this.wet[d]) {
      this.wet[d] = 0;
      this.sea[d] = 0;
      changed.push([d % W, Math.floor(d / W)]);
    }
    const i = f.fill[k];
    if (i !== undefined && this.open(i)) {
      this.wet[i] = 1;
      if (f.sea) this.sea[i] = 1;
      changed.push([i % W, Math.floor(i / W)]);
    }
  }

  private apply(f: Flow): void {
    this.flows.push(f);
    this.settle();
  }

  /** An open tile water may stand in. */
  private open(i: number): boolean {
    return this.t.tiles[i] === TILE.air && !this.dry[i];
  }

  /** The four tiles round tile `i` that are on the grid (round the join on a wrapping world). */
  private around(i: number): number[] {
    const W = this.t.width;
    const x = i % W;
    const y = (i - x) / W;
    const out: number[] = [];
    if (y > 0) out.push(i - W);
    if (y < this.t.height - 1) out.push(i + W);
    if (this.t.wrap || x > 0) out.push(y * W + wrapX(this.t, x - 1));
    if (this.t.wrap || x < W - 1) out.push(y * W + wrapX(this.t, x + 1));
    return out;
  }

  /** The body of (non-sea) water that tile `i` is in: its tiles. */
  private body(i: number): number[] {
    const out = [i];
    const seen = new Set(out);
    for (let q = 0; q < out.length; q++) {
      for (const j of this.around(out[q]!)) {
        if (this.wet[j] && !this.sea[j] && !seen.has(j)) {
          seen.add(j);
          out.push(j);
        }
      }
    }
    return out;
  }

  /**
   * The body tile `i` is in, poured again into the ground as it now is.
   * Each open tile it can reach gets the level the water must rise to before
   * it gets there: its own row, or the highest point on the lowest way to
   * it, if that's higher. The water fills the lowest levels first, and
   * within a level the deepest tiles first, so water standing at a gap
   * spills through it and down the far side. It never climbs over a rise it
   * can't fill up to. Another body it reaches joins it; reaching the sea, it
   * becomes the sea's.
   */
  private pour(i: number, at: TilePos): Flow {
    const W = this.t.width;
    const row = (k: number): number => Math.floor(k / W);
    const from = this.body(i);
    const freed = new Set(from);
    let volume = from.length;
    const deepest = from.reduce((a, b) => (b > a ? b : a));
    const heap = new LevelHeap();
    const queued = new Set<number>([deepest]);
    heap.push(deepest, row(deepest), row(deepest));
    // Every tile the water could reach by the level it stops at, in the order levels are reached.
    const reached: { readonly k: number; readonly level: number; readonly n: number }[] = [];
    while (heap.size) {
      // Once there's room for all of it, the level it stops at is finished, and that's all.
      if (reached.length >= volume && heap.topLevel !== reached[reached.length - 1]!.level) break;
      const { k, level } = heap.pop();
      // It found the sea: it's the sea's now.
      if (this.sea[k]) return this.seaFlood(from, at);
      if (this.wet[k] && !freed.has(k)) {
        // Another body: it joins, and its water is poured with this one.
        for (const j of this.body(k)) {
          freed.add(j);
          from.push(j);
          volume++;
        }
      }
      reached.push({ k, level, n: reached.length });
      for (const j of this.around(k)) {
        if (queued.has(j) || !this.open(j)) continue;
        queued.add(j);
        heap.push(j, Math.min(row(j), level), row(j));
      }
    }
    // Lowest level first (the biggest row), deepest first within it.
    reached.sort((a, b) => b.level - a.level || row(b.k) - row(a.k) || a.n - b.n);
    const target = new Set(reached.slice(0, volume).map((r) => r.k));
    const fill = reached.slice(0, volume).map((r) => r.k).filter((k) => !freed.has(k));
    // Highest of the old water first, as its surface drops.
    const drain = from.filter((k) => !target.has(k)).sort((a, b) => row(a) - row(b));
    return { fill, drain, done: 0, at, sea: false };
  }

  /**
   * The sea let in from `seeds`: every open tile at or below sea level it
   * reaches through dry ground, nearest first. A body it meets joins it
   * whole: its water below sea level becomes the sea's, and what stood
   * above sea level runs out.
   */
  private seaFlood(seeds: readonly number[], at: TilePos = [0, 0]): Flow {
    const W = this.t.width;
    const row = this.seaRow ?? Infinity;
    const below = (k: number): boolean => Math.floor(k / W) >= row;
    const fill: number[] = [];
    const drain: number[] = [];
    const seen = new Set<number>();
    const queue: number[] = [];
    const visit = (k: number): void => {
      if (seen.has(k) || this.sea[k] || !this.open(k)) return;
      seen.add(k);
      if (this.wet[k]) {
        for (const b of this.body(k)) {
          seen.add(b);
          if (!below(b)) drain.push(b);
          else {
            this.sea[b] = 1;
            queue.push(b);
          }
        }
        return;
      }
      if (!below(k)) return;
      fill.push(k);
      queue.push(k);
    };
    for (const s of seeds) visit(s);
    for (let q = 0; q < queue.length; q++) for (const j of this.around(queue[q]!)) visit(j);
    drain.sort((a, b) => Math.floor(a / W) - Math.floor(b / W));
    return { fill, drain, done: 0, at, sea: true };
  }
}

/**
 * Tiles by the level water must reach to get to them, lowest first (the
 * biggest row), then the deepest, then the first pushed.
 */
class LevelHeap {
  private readonly items: { readonly k: number; readonly level: number; readonly row: number; readonly seq: number }[] = [];
  private seq = 0;

  get size(): number {
    return this.items.length;
  }

  get topLevel(): number | undefined {
    return this.items[0]?.level;
  }

  push(k: number, level: number, row: number): void {
    this.items.push({ k, level, row, seq: this.seq++ });
    let c = this.items.length - 1;
    while (c > 0) {
      const p = (c - 1) >> 1;
      if (!this.before(c, p)) break;
      this.swap(p, c);
      c = p;
    }
  }

  pop(): { readonly k: number; readonly level: number } {
    const top = this.items[0]!;
    const last = this.items.pop()!;
    if (this.items.length) {
      this.items[0] = last;
      let p = 0;
      for (;;) {
        const l = p * 2 + 1;
        const r = l + 1;
        let m = p;
        if (l < this.items.length && this.before(l, m)) m = l;
        if (r < this.items.length && this.before(r, m)) m = r;
        if (m === p) break;
        this.swap(p, m);
        p = m;
      }
    }
    return top;
  }

  private before(a: number, b: number): boolean {
    const x = this.items[a]!;
    const y = this.items[b]!;
    return x.level !== y.level ? x.level > y.level : x.row !== y.row ? x.row > y.row : x.seq < y.seq;
  }

  private swap(a: number, b: number): void {
    [this.items[a], this.items[b]] = [this.items[b]!, this.items[a]!];
  }
}
