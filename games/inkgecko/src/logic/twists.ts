import { BOARD, type LevelDef } from '../level/types';
import type { Pt } from './path';
import type { Rng } from './rng';

/** Wind: a gust blows this long, then a calm this long, then it comes from the other side. */
export const GUST_FOR = 3.5;
export const CALM_FOR = 2.5;
/** A gust takes this long to build and to die away, s. */
const GUST_RAMP = 0.6;
/** Surge: the lines lurch on this many times their speed, for this long, after a warning this long. */
export const SURGE_FACTOR = 3.2;
export const SURGE_FOR = 1.4;
export const SURGE_WARN = 1;
/** Tide: the lines draw back this fast, for this long. */
export const TIDE_SPEED = 110;
export const TIDE_FOR = 1.6;
/** A drifting leaf's radius (what stops shots), and how fast it drifts, board px. */
export const LEAF_R = 30;
const LEAF_SPEED = { min: 42, max: 66 } as const;
/** A leaf that has blown off the board comes back after this long, s. */
const LEAF_BACK = { min: 1, max: 3 } as const;
/** Restless pads: the warning comes this long before the pad tips the gecko off, s. */
export const PAD_WARN = 1.5;

export interface Leaf {
  readonly id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
  angle: number;
  /** Off the board, waiting this long to blow back on. */
  away: number;
  /** A wobble across its drift, so it flutters rather than slides. */
  readonly phase: number;
}

/** Where events go: the board's list of them. */
export interface Sink<E> {
  push(...events: E[]): number;
}

export type TwistEvent =
  | { readonly type: 'gust'; readonly dir: -1 | 1 }
  | { readonly type: 'surgeSoon' }
  | { readonly type: 'surge' }
  | { readonly type: 'tide' }
  | { readonly type: 'padWarn'; readonly pad: number };

/**
 * A level's twist, as it plays out over time: wind gusts, surges and tides
 * of the lines, the leaves drifting over the board, the gecko's wander and
 * how long it has stood on a restless pad. The board asks it how fast the
 * lines roll and where things are; it never touches the lines itself.
 */
export class Twists {
  /** The wind now: which side it blows to (−1 left, 1 right) and how hard, 0..1. */
  windDir: -1 | 1;
  gust = 0;
  leaves: Leaf[] = [];
  /** Seconds the gecko has stood on its pad (restless pads). */
  padClock = 0;
  private windClock = 0;
  private surgeClock = 0;
  private surgeWarned = false;
  private surgeLeft = 0;
  private tideClock = 0;
  private tideLeft = 0;
  private padWarned = false;

  constructor(private readonly level: LevelDef, private readonly rng: Rng, nextId: () => number) {
    this.windDir = rng() < 0.5 ? -1 : 1;
    // The first gust comes after a short calm.
    this.windClock = GUST_FOR + CALM_FOR - 1;
    for (let i = 0; i < (level.leaves ?? 0); i++) {
      const leaf = this.blowIn(nextId());
      // Spread across the board at the start, rather than all at its edges.
      const t = ((i + 0.5) / (level.leaves ?? 1)) * 0.8 * (BOARD.w / Math.abs(leaf.vx));
      leaf.x += leaf.vx * t;
      leaf.y += leaf.vy * t;
      this.leaves.push(leaf);
    }
  }

  /** How strongly the wind pushes a shot sideways now, board px/s² (signed). */
  get push(): number {
    return (this.level.wind ?? 0) * this.gust * this.windDir;
  }

  /** The lines' speed now, from the level's: faster in a surge, backwards in a tide, else unchanged. */
  speed(base: number): number {
    if (this.tideLeft > 0) return -TIDE_SPEED;
    return this.surgeLeft > 0 ? base * SURGE_FACTOR : base;
  }

  get surging(): boolean {
    return this.surgeLeft > 0;
  }

  get tiding(): boolean {
    return this.tideLeft > 0;
  }

  /** `quiet`: the burrows are shut, so surges and tides rest. */
  step(dt: number, quiet: boolean, events: Sink<TwistEvent>): void {
    this.stepWind(dt, events);
    this.stepSurge(dt, quiet, events);
    this.stepTide(dt, quiet, events);
    this.stepLeaves(dt);
  }

  private stepWind(dt: number, events: Sink<TwistEvent>): void {
    if (!this.level.wind) return;
    this.windClock += dt;
    const cycle = GUST_FOR + CALM_FOR;
    if (this.windClock >= cycle) {
      this.windClock -= cycle;
      this.windDir = this.windDir === 1 ? -1 : 1;
      events.push({ type: 'gust', dir: this.windDir });
    }
    const t = this.windClock;
    this.gust = t >= GUST_FOR ? 0 : Math.min(1, t / GUST_RAMP, (GUST_FOR - t) / GUST_RAMP);
  }

  private stepSurge(dt: number, quiet: boolean, events: Sink<TwistEvent>): void {
    const every = this.level.surge;
    if (!every) return;
    this.surgeLeft = Math.max(0, this.surgeLeft - dt);
    if (quiet) return;
    this.surgeClock += dt;
    if (!this.surgeWarned && this.surgeClock >= every - SURGE_WARN) {
      this.surgeWarned = true;
      events.push({ type: 'surgeSoon' });
    }
    if (this.surgeClock < every) return;
    this.surgeClock = 0;
    this.surgeWarned = false;
    this.surgeLeft = SURGE_FOR;
    events.push({ type: 'surge' });
  }

  private stepTide(dt: number, quiet: boolean, events: Sink<TwistEvent>): void {
    const every = this.level.tide;
    if (!every) return;
    this.tideLeft = Math.max(0, this.tideLeft - dt);
    if (quiet) return;
    this.tideClock += dt;
    if (this.tideClock < every) return;
    this.tideClock = 0;
    this.tideLeft = TIDE_FOR;
    events.push({ type: 'tide' });
  }

  /** A leaf blowing on at a random edge, drifting across towards the far side. */
  private blowIn(id: number): Leaf {
    const r = this.rng;
    const fromLeft = r() < 0.5;
    const speed = LEAF_SPEED.min + r() * (LEAF_SPEED.max - LEAF_SPEED.min);
    const y = 90 + r() * (BOARD.h - 180);
    const aim = 90 + r() * (BOARD.h - 180);
    const a = Math.atan2(aim - y, BOARD.w);
    const dir = fromLeft ? 1 : -1;
    return {
      id, x: fromLeft ? -LEAF_R : BOARD.w + LEAF_R, y, vx: Math.cos(a) * speed * dir, vy: Math.sin(a) * speed,
      spin: (r() - 0.5) * 0.8, angle: r() * Math.PI * 2, away: 0, phase: r() * Math.PI * 2,
    };
  }

  private stepLeaves(dt: number): void {
    this.leaves = this.leaves.map((leaf) => {
      if (leaf.away > 0) {
        leaf.away -= dt;
        return leaf.away > 0 ? leaf : { ...this.blowIn(leaf.id) };
      }
      const wobble = Math.sin(leaf.x / 60 + leaf.phase) * 14;
      leaf.x += leaf.vx * dt;
      leaf.y += (leaf.vy + wobble) * dt;
      leaf.angle += leaf.spin * dt;
      const off = leaf.x < -LEAF_R * 2 || leaf.x > BOARD.w + LEAF_R * 2 || leaf.y < -LEAF_R * 2 || leaf.y > BOARD.h + LEAF_R * 2;
      if (off) leaf.away = LEAF_BACK.min + this.rng() * (LEAF_BACK.max - LEAF_BACK.min);
      return leaf;
    });
  }

  /** The leaf a shot at p (radius r) runs into, if any; the leaf is knocked along the shot's way. */
  leafAt(p: Pt, r: number, push: Pt): Leaf | null {
    const leaf = this.leaves.find((l) => l.away <= 0 && Math.hypot(l.x - p.x, l.y - p.y) < LEAF_R + r * 0.6);
    if (!leaf) return null;
    leaf.vx += push.x * 0.04;
    leaf.vy += push.y * 0.04;
    leaf.spin += (this.rng() - 0.5) * 3;
    return leaf;
  }

  /**
   * Restless pads: counts the gecko's time on its pad; true when the pad
   * tips it off. `standing` is false mid-hop (and resets the count).
   */
  stepPad(dt: number, standing: boolean, pad: number, events: Sink<TwistEvent>): boolean {
    const limit = this.level.restless;
    if (!limit) return false;
    if (!standing) {
      this.padClock = 0;
      this.padWarned = false;
      return false;
    }
    this.padClock += dt;
    if (!this.padWarned && this.padClock >= limit - PAD_WARN) {
      this.padWarned = true;
      events.push({ type: 'padWarn', pad });
    }
    return this.padClock >= limit;
  }
}

/** Pivot levels that wander: where the gecko stands after `elapsed` seconds, pacing a figure of eight through its spot. */
export function wanderAt(level: LevelDef, spot: Pt, elapsed: number): Pt {
  const w = level.wander;
  if (!w) return spot;
  const a = (elapsed / w.period) * Math.PI * 2;
  return { x: spot.x + Math.sin(a) * w.rx, y: spot.y + Math.sin(a * 2) * w.ry };
}

/** Every point a wandering gecko passes through (for checking its room), one per step of a lap. */
export function wanderLoop(level: LevelDef, spot: Pt, steps = 48): Pt[] {
  const w = level.wander;
  if (!w) return [spot];
  return Array.from({ length: steps }, (_, i) => wanderAt(level, spot, (i / steps) * w.period));
}
