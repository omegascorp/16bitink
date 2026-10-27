import { capsuleContact, type Contact, type Seg } from './geom';

/**
 * The grain simulation: water, lava, coins and the stone that water makes
 * of lava, all as small particles. Liquids use double density relaxation
 * (Clavet, Beaudoin & Poulin 2005), which levels a pool and splashes without
 * a pressure solve. Everything runs in board pixels per fixed step with no
 * randomness, so the same pulls always give the same result.
 */

export const DEAD = 0;
export const WATER = 1;
export const LAVA = 2;
export const COIN = 3;
export const STONE = 4;
export type Kind = typeof DEAD | typeof WATER | typeof LAVA | typeof COIN | typeof STONE;

/** Simulation steps per second. */
export const STEPS_PER_SECOND = 120;
/** Grain radius for collisions with walls, pins and the creatures. */
export const GRAIN_R = 6;
/** Liquid interaction radius: grains closer than this push (or pull) each other. */
const H = 22;
/** Gravity in px per step². */
export const GRAVITY = 0.075;
/** Neighbour density a resting liquid settles at (about one grain every 11 px). */
const REST = 1.7;
const STIFF = 0.9;
const STIFF_NEAR = 2.4;
/** Fastest a grain moves in a step: below a pin's thickness, so nothing tunnels. */
const MAX_SPEED = 7;
/** Velocity kept per step (the rest is lost to drag), by kind. */
const KEEP: Record<number, number> = { [WATER]: 0.996, [LAVA]: 0.985, [COIN]: 0.985, [STONE]: 0.97 };
/** Share of sliding speed lost against a wall each step, by kind. */
const FRICTION: Record<number, number> = { [WATER]: 0.02, [LAVA]: 0.06, [COIN]: 0.2, [STONE]: 0.3 };
/**
 * Mass by kind: heavier grains sink through lighter ones. New stone is gravel,
 * heaviest of all: it sinks and spreads into a flat bed, then sets solid once
 * it has been still for SET_STEPS, so stone always ends up as a level floor
 * however the lava arrived.
 */
const MASS: Record<number, number> = { [WATER]: 1, [LAVA]: 1.4, [COIN]: 2.2, [STONE]: 3 };
const SET_STEPS = 40;
/** Coins slower than this are damped hard, so a heap of gold lies still. */
const COIN_REST = 0.1;
/**
 * A coin that has rested this long falls asleep: it holds its place exactly
 * (a heap otherwise creeps as it settles under its own weight) until a pin
 * is pulled, something fast comes by, or a creature pushes it.
 */
const SLEEP_STEPS = 60;
const WAKE_SPEED = 0.6;
const STILL_SPEED = 0.12;
/**
 * Lava that has come to rest against stone freezes too, once that stone is a
 * few steps old: a cooling front sweeps through a pool once water reaches
 * it, rather than a thin crust sealing hot lava under it. Lava still pouring
 * doesn't freeze this way, so a falling stream never turns to a stone
 * waterfall; it cools where it lands.
 */
const FRONT_DELAY = 5;
const RESTING_SPEED = 0.3;
/** Grains this close touch, for reactions. */
const TOUCH = GRAIN_R * 2 + 1.5;
/** The board, padded: grains past it are gone. */
const MIN_X = -40;
const MAX_X = 760;
const MIN_Y = -40;
const MAX_Y = 1320;
const CELL = H;
const COLS = Math.ceil((MAX_X - MIN_X) / CELL);
const ROWS = Math.ceil((MAX_Y - MIN_Y) / CELL);
/** Most neighbours one grain looks at; packed liquid has about 12. */
const MAX_NEIGHBOURS = 48;

export type GrainEvent =
  | { readonly type: 'steam'; readonly x: number; readonly y: number }
  | { readonly type: 'melt'; readonly x: number; readonly y: number }
  | { readonly type: 'lost'; readonly kind: Kind };

export class Grains {
  count = 0;
  private nextId = 0;
  readonly x: Float64Array;
  readonly y: Float64Array;
  readonly vx: Float64Array;
  readonly vy: Float64Array;
  readonly kind: Uint8Array;
  /** Steps since this grain turned to stone (for the art's cooling glow). */
  readonly age: Uint16Array;
  /** A grain's id for life: indices change as grains are removed, ids don't. */
  readonly id: Uint16Array;
  /** 1 for grains holding still: stone that has set (for good), coins asleep (until woken). */
  readonly set: Uint8Array;
  private readonly still: Uint8Array;
  private readonly px: Float64Array;
  private readonly py: Float64Array;
  private readonly cellStart = new Int32Array(COLS * ROWS + 1);
  private readonly cellFill = new Int32Array(COLS * ROWS);
  private readonly cellOf: Int32Array;
  private readonly sorted: Int32Array;
  private readonly nIdx = new Int32Array(MAX_NEIGHBOURS);
  private readonly nQ = new Float64Array(MAX_NEIGHBOURS);
  private readonly contact: Contact = { nx: 0, ny: 0, depth: 0 };

  constructor(readonly capacity: number) {
    this.x = new Float64Array(capacity);
    this.y = new Float64Array(capacity);
    this.vx = new Float64Array(capacity);
    this.vy = new Float64Array(capacity);
    this.px = new Float64Array(capacity);
    this.py = new Float64Array(capacity);
    this.kind = new Uint8Array(capacity);
    this.age = new Uint16Array(capacity);
    this.set = new Uint8Array(capacity);
    this.still = new Uint8Array(capacity);
    this.id = new Uint16Array(capacity);
    this.cellOf = new Int32Array(capacity);
    this.sorted = new Int32Array(capacity);
  }

  add(kind: Kind, x: number, y: number): void {
    if (this.count >= this.capacity) throw new Error('Grain capacity reached');
    const i = this.count++;
    this.id[i] = this.nextId++;
    this.kind[i] = kind;
    this.x[i] = x;
    this.y[i] = y;
    this.vx[i] = 0;
    this.vy[i] = 0;
    this.age[i] = 0;
    this.set[i] = 0;
    this.still[i] = 0;
  }

  /** True for grains that hold still this step: set stone and sleeping coins. */
  private held(i: number): boolean {
    return this.set[i] === 1;
  }

  /** Wakes every sleeping coin (a pin was pulled: what held them may be gone). */
  wakeAll(): void {
    for (let i = 0; i < this.count; i++) this.wake(i);
  }

  /** Wakes one coin. */
  wake(i: number): void {
    if (this.kind[i] !== COIN) return;
    this.set[i] = 0;
    this.still[i] = 0;
  }

  /** Counts the live grains of one kind. */
  countOf(kind: Kind): number {
    let n = 0;
    for (let i = 0; i < this.count; i++) if (this.kind[i] === kind) n++;
    return n;
  }

  /** The fastest live moving grain's speed, in px per step. */
  maxSpeed(): number {
    let m = 0;
    for (let i = 0; i < this.count; i++) {
      if (this.kind[i] === DEAD || this.held(i)) continue;
      const s = this.vx[i]! * this.vx[i]! + this.vy[i]! * this.vy[i]!;
      if (s > m) m = s;
    }
    return Math.sqrt(m);
  }

  /** Calls `fn` with every live grain within `r` of (x, y). Uses the hash from the last step. */
  near(x: number, y: number, r: number, fn: (i: number) => void): void {
    const c0 = Math.max(0, Math.floor((x - r - MIN_X) / CELL));
    const c1 = Math.min(COLS - 1, Math.floor((x + r - MIN_X) / CELL));
    const r0 = Math.max(0, Math.floor((y - r - MIN_Y) / CELL));
    const r1 = Math.min(ROWS - 1, Math.floor((y + r - MIN_Y) / CELL));
    const r2 = r * r;
    for (let row = r0; row <= r1; row++) {
      for (let col = c0; col <= c1; col++) {
        const cell = row * COLS + col;
        for (let s = this.cellStart[cell]!; s < this.cellStart[cell + 1]!; s++) {
          const j = this.sorted[s]!;
          if (this.kind[j] === DEAD) continue;
          const dx = this.x[j]! - x;
          const dy = this.y[j]! - y;
          if (dx * dx + dy * dy < r2) fn(j);
        }
      }
    }
  }

  /** One fixed step against the given walls and pins. Reactions and losses are appended to `events`. */
  step(segs: readonly Seg[], events: GrainEvent[]): void {
    this.integrate();
    this.buildHash();
    this.relax();
    this.collide(segs);
    this.updateVelocities();
    this.react(events);
    this.cull(events);
    // Again after packing, so near() sees this step's grains under their new indices.
    this.buildHash();
  }

  private integrate(): void {
    for (let i = 0; i < this.count; i++) {
      const k = this.kind[i];
      if (k === DEAD) continue;
      if (k === STONE && this.age[i]! < 65535) this.age[i]!++;
      if (this.held(i)) continue;
      this.px[i] = this.x[i]!;
      this.py[i] = this.y[i]!;
      let vx = this.vx[i]!;
      let vy = this.vy[i]! + GRAVITY;
      const s = vx * vx + vy * vy;
      if (s > MAX_SPEED * MAX_SPEED) {
        const f = MAX_SPEED / Math.sqrt(s);
        vx *= f;
        vy *= f;
      }
      this.x[i] = this.x[i]! + vx;
      this.y[i] = this.y[i]! + vy;
    }
  }

  private buildHash(): void {
    const { cellStart, cellOf, sorted } = this;
    cellStart.fill(0);
    for (let i = 0; i < this.count; i++) {
      const col = Math.min(COLS - 1, Math.max(0, Math.floor((this.x[i]! - MIN_X) / CELL)));
      const row = Math.min(ROWS - 1, Math.max(0, Math.floor((this.y[i]! - MIN_Y) / CELL)));
      const c = row * COLS + col;
      cellOf[i] = c;
      cellStart[c + 1]!++;
    }
    for (let c = 0; c < COLS * ROWS; c++) cellStart[c + 1]! += cellStart[c]!;
    const fill = this.cellFill;
    fill.set(cellStart.subarray(0, COLS * ROWS));
    for (let i = 0; i < this.count; i++) sorted[fill[cellOf[i]!]!++] = i;
  }

  /** Gathers grain i's neighbours within H into nIdx/nQ; returns how many. */
  private gather(i: number): number {
    const xi = this.x[i]!;
    const yi = this.y[i]!;
    const c = this.cellOf[i]!;
    const col = c % COLS;
    const row = (c - col) / COLS;
    let n = 0;
    for (let rr = Math.max(0, row - 1); rr <= Math.min(ROWS - 1, row + 1); rr++) {
      for (let cc = Math.max(0, col - 1); cc <= Math.min(COLS - 1, col + 1); cc++) {
        const cell = rr * COLS + cc;
        for (let s = this.cellStart[cell]!; s < this.cellStart[cell + 1]!; s++) {
          const j = this.sorted[s]!;
          if (j === i || this.kind[j] === DEAD) continue;
          const dx = this.x[j]! - xi;
          const dy = this.y[j]! - yi;
          const d2 = dx * dx + dy * dy;
          if (d2 >= H * H || n >= MAX_NEIGHBOURS) continue;
          this.nIdx[n] = j;
          this.nQ[n] = 1 - Math.sqrt(d2) / H;
          n++;
        }
      }
    }
    return n;
  }

  /** Double density relaxation: pushes crowded grains apart, so a pool levels and holds its volume. */
  private relax(): void {
    for (let i = 0; i < this.count; i++) {
      const ki = this.kind[i]!;
      if (ki === DEAD || this.held(i)) continue;
      const n = this.gather(i);
      const fast = this.vx[i]! * this.vx[i]! + this.vy[i]! * this.vy[i]! > WAKE_SPEED * WAKE_SPEED;
      let rho = 0;
      let rhoNear = 0;
      for (let a = 0; a < n; a++) {
        const q = this.nQ[a]!;
        rho += q * q;
        rhoNear += q * q * q;
      }
      const p = STIFF * (rho - REST);
      const pNear = STIFF_NEAR * rhoNear;
      const mi = MASS[ki]!;
      for (let a = 0; a < n; a++) {
        const j = this.nIdx[a]!;
        const q = this.nQ[a]!;
        let dx = this.x[j]! - this.x[i]!;
        let dy = this.y[j]! - this.y[i]!;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 1e-6) {
          // Two grains on one spot: part them along a fixed direction picked by index.
          dx = i < j ? 1 : -1;
          dy = 0;
        } else {
          dx /= d;
          dy /= d;
        }
        const push = p * q + pNear * q * q;
        const kj = this.kind[j]!;
        if (fast && kj === COIN && this.set[j]) this.wake(j);
        if (this.held(j)) {
          this.x[i] = this.x[i]! - dx * push;
          this.y[i] = this.y[i]! - dy * push;
          continue;
        }
        const mj = MASS[kj]!;
        const shareJ = mi / (mi + mj);
        this.x[j] = this.x[j]! + dx * push * shareJ;
        this.y[j] = this.y[j]! + dy * push * shareJ;
        this.x[i] = this.x[i]! - dx * push * (1 - shareJ);
        this.y[i] = this.y[i]! - dy * push * (1 - shareJ);
      }
    }
  }

  private collide(segs: readonly Seg[]): void {
    const c = this.contact;
    for (let i = 0; i < this.count; i++) {
      const k = this.kind[i];
      if (k === DEAD || this.held(i)) continue;
      for (const s of segs) {
        if (!capsuleContact(s, this.x[i]!, this.y[i]!, GRAIN_R, c)) continue;
        this.x[i] = this.x[i]! + c.nx * c.depth;
        this.y[i] = this.y[i]! + c.ny * c.depth;
        // Friction: hold back the sliding part of this step's move.
        const mx = this.x[i]! - this.px[i]!;
        const my = this.y[i]! - this.py[i]!;
        const along = mx * -c.ny + my * c.nx;
        const f = FRICTION[k!]! * along;
        this.x[i] = this.x[i]! + c.ny * f;
        this.y[i] = this.y[i]! - c.nx * f;
      }
    }
  }

  private updateVelocities(): void {
    for (let i = 0; i < this.count; i++) {
      const k = this.kind[i]!;
      if (k === DEAD || this.held(i)) continue;
      const keep = KEEP[k]!;
      this.vx[i] = (this.x[i]! - this.px[i]!) * keep;
      this.vy[i] = (this.y[i]! - this.py[i]!) * keep;
      // Coins at rest settle instead of jostling in place, then fall asleep.
      if (k === COIN) {
        const resting = this.vx[i]! * this.vx[i]! + this.vy[i]! * this.vy[i]! < COIN_REST * COIN_REST;
        if (resting) {
          this.vx[i] = this.vx[i]! * 0.3;
          this.vy[i] = this.vy[i]! * 0.3;
        }
        this.still[i] = resting ? Math.min(255, this.still[i]! + 1) : 0;
        if (this.still[i]! >= SLEEP_STEPS) {
          this.set[i] = 1;
          this.vx[i] = 0;
          this.vy[i] = 0;
        }
        continue;
      }
      if (k !== STONE) continue;
      // Gravel that has stopped sets solid.
      const slow = this.vx[i]! * this.vx[i]! + this.vy[i]! * this.vy[i]! < STILL_SPEED * STILL_SPEED;
      this.still[i] = slow ? this.still[i]! + 1 : 0;
      if (this.still[i]! >= SET_STEPS) {
        this.set[i] = 1;
        this.vx[i] = 0;
        this.vy[i] = 0;
      }
    }
  }

  /**
   * Water touching lava turns that lava to stone and boils away. Resting lava
   * touching stone freezes too (see FRONT_DELAY). Lava melts any coin it touches.
   */
  private react(events: GrainEvent[]): void {
    for (let i = 0; i < this.count; i++) {
      if (this.kind[i] !== LAVA) continue;
      const resting = this.vx[i]! * this.vx[i]! + this.vy[i]! * this.vy[i]! < RESTING_SPEED * RESTING_SPEED;
      const n = this.gather(i);
      for (let a = 0; a < n; a++) {
        const j = this.nIdx[a]!;
        const kj = this.kind[j];
        if (kj !== WATER && kj !== COIN && kj !== STONE) continue;
        const dx = this.x[j]! - this.x[i]!;
        const dy = this.y[j]! - this.y[i]!;
        if (dx * dx + dy * dy > TOUCH * TOUCH) continue;
        if (kj === STONE) {
          if (!resting || this.age[j]! < FRONT_DELAY) continue;
          this.freeze(i);
          break;
        }
        this.kind[j] = DEAD;
        if (kj === WATER) {
          this.freeze(i);
          events.push({ type: 'steam', x: this.x[i]!, y: this.y[i]! });
          break;
        }
        events.push({ type: 'melt', x: this.x[j]!, y: this.y[j]! });
      }
    }
  }

  private freeze(i: number): void {
    this.kind[i] = STONE;
    this.vx[i] = this.vx[i]! * 0.3;
    this.vy[i] = this.vy[i]! * 0.3;
    this.age[i] = 0;
    this.set[i] = 0;
    this.still[i] = 0;
  }

  /** Drops grains that left the board, then packs the live ones (keeping their order, so it stays deterministic). */
  private cull(events: GrainEvent[]): void {
    let w = 0;
    for (let i = 0; i < this.count; i++) {
      const k = this.kind[i]!;
      if (k !== DEAD && (this.x[i]! < MIN_X + 1 || this.x[i]! > MAX_X - 1 || this.y[i]! > MAX_Y - 1 || this.y[i]! < MIN_Y + 1)) {
        events.push({ type: 'lost', kind: k as Kind });
        this.kind[i] = DEAD;
      }
      if (this.kind[i] === DEAD) continue;
      if (w !== i) {
        this.x[w] = this.x[i]!;
        this.y[w] = this.y[i]!;
        this.vx[w] = this.vx[i]!;
        this.vy[w] = this.vy[i]!;
        this.px[w] = this.px[i]!;
        this.py[w] = this.py[i]!;
        this.kind[w] = this.kind[i]!;
        this.age[w] = this.age[i]!;
        this.set[w] = this.set[i]!;
        this.still[w] = this.still[i]!;
        this.id[w] = this.id[i]!;
      }
      w++;
    }
    this.count = w;
  }

  /** Marks grain i gone (a coin Nib picked up, a drop pushed off the board). */
  remove(i: number): void {
    this.kind[i] = DEAD;
  }
}
