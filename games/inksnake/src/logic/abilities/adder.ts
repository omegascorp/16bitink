import { BOARD, type LevelDef, type ZoneDef } from '../../level/types';
import { createRng } from '../rng';
import { inZone, inZoneShape } from '../zones';
import { clamp, dist, type Pt } from '../vec';
import type { Ability, AbilityCtx, AbilityInput, AbilityMaker } from './types';

/**
 * The adder is cold-blooded: its warmth (0 cold .. 1 warm) sets how fast it
 * moves and turns. It drains slowly and fills fast in sunshine, fastest
 * when the snake lies still in the sun (basking). The sunny ground is the
 * level's 'sun' zones, with cloud shadows drifting over them on the wind,
 * the same way every time a level is played, so the sunny spots shift.
 * Being cold never costs a life, but a cold snake can't get away.
 */

/** Warm to cold in about this long with no sun, s (faster at night, and in the pool's cold water). */
const DRAIN_TIME = 35;
const NIGHT_DRAIN = 1.4;
const WATER_DRAIN = 2;
/** Warmth a second with the whole body in the sun, and on top of that while basking. */
const SUN_GAIN = 0.08;
const BASK_GAIN = 0.28;
/** At night only the stones that soaked up the day's sun are warm, and less so. */
const STONE_GAIN = 0.6;
/** The head's share of how sunny the snake is (the rest is the body's). */
const HEAD_SHARE = 0.3;
/** Speed and turning: cold .. warm, and a little more when hot (above WARM). */
const SPEED = { cold: 0.45, warm: 1, hot: 1.08 } as const;
const TURN = { cold: 0.55, warm: 1, hot: 1.05 } as const;
const WARM = 0.85;
/** The meter warns below this. */
const LOW = 0.3;
/** It basks once still this long in the sun, s, while cooler than BASK_BELOW; it takes this long to settle. */
const BASK_AFTER = 0.4;
const BASK_BELOW = 0.75;
const SETTLE = 0.35;
/** The pool's water slows it, as a share of its speed. */
const SWIM = 0.7;
/** Starting warmth: a usual day, a cold spring morning (levels teaching it), and a night. */
const START = { usual: 0.8, cold: 0.12, night: 0.6 } as const;
/** The hint that teaches a cold start (its level starts cold). */
export const COLD_START_HINT = 'adder-cold';
/** Sun zones painted with this look are warm stones at night; 'clear' ones never cloud over. */
export const LOOK_STONE = 'warmstone';
export const LOOK_CLEAR = 'clear';
const CLOUDS = 3;
/** A cloud's shadow shades this share of its drawn size (its soft edge is still sunny). */
const CLOUD_CORE = 0.85;

/** A cloud's shadow on the board, an ellipse: where it is now and how big. */
export interface Cloud {
  readonly x: number;
  readonly y: number;
  readonly rx: number;
  readonly ry: number;
}

interface CloudPlan {
  readonly x0: number;
  readonly y0: number;
  readonly vx: number;
  readonly vy: number;
  readonly rx: number;
  readonly ry: number;
}

/** A steady seed from a level id, so its weather always plays out the same way. */
function seedOf(id: string): number {
  let h = 17;
  for (let i = 0; i < id.length; i++) h = (h * 33 + id.charCodeAt(i)) >>> 0;
  return h;
}

const plans = new WeakMap<LevelDef, readonly CloudPlan[]>();

/** Whether a level's sun ever clouds over: night has no clouds, and 'clear' patches never do. */
function cloudy(level: LevelDef): boolean {
  return !level.dark && (level.zones ?? []).some((z) => z.kind === 'sun' && z.look !== LOOK_CLEAR && z.look !== LOOK_STONE);
}

/** The level's clouds: a few, on one wind, seeded by its id. */
function planOf(level: LevelDef): readonly CloudPlan[] {
  const known = plans.get(level);
  if (known) return known;
  const rng = createRng(seedOf(level.id));
  const wind = (rng() < 0.5 ? -1 : 1) * (20 + rng() * 10);
  const plan = cloudy(level)
    ? Array.from({ length: CLOUDS }, (_, i): CloudPlan => ({
      x0: ((i + rng() * 0.6) / CLOUDS) * (BOARD.w + 300) - 150, y0: 60 + rng() * (BOARD.h - 120),
      vx: wind * (0.85 + rng() * 0.3), vy: (rng() - 0.5) * 8, rx: 110 + rng() * 50, ry: 72 + rng() * 30,
    }))
    : [];
  plans.set(level, plan);
  return plan;
}

/** Wraps `v` into lo..hi. */
const wrap = (v: number, lo: number, hi: number): number => lo + ((((v - lo) % (hi - lo)) + (hi - lo)) % (hi - lo));

/** The cloud shadows over a level `elapsed` s in (drifting across and round again). */
export function cloudsAt(level: LevelDef, elapsed: number): Cloud[] {
  return planOf(level).map((c) => ({
    x: wrap(c.x0 + c.vx * elapsed, -c.rx, BOARD.w + c.rx),
    y: wrap(c.y0 + c.vy * elapsed, -c.ry, BOARD.h + c.ry),
    rx: c.rx, ry: c.ry,
  }));
}

/** Whether a cloud's shadow lies on `p`. */
export function shaded(p: Pt, clouds: readonly Cloud[]): boolean {
  return clouds.some((c) => ((p.x - c.x) / (c.rx * CLOUD_CORE)) ** 2 + ((p.y - c.y) / (c.ry * CLOUD_CORE)) ** 2 < 1);
}

/** How warm the ground at `p` is: 1 in sunshine, less on night's warm stones, 0 in shade (clouds, heather, gorse). */
export function sunAt(level: LevelDef, p: Pt, clouds: readonly Cloud[]): number {
  const zones: readonly ZoneDef[] = level.zones ?? [];
  if (!inZone(p, zones, 'sun')) return 0;
  if ((level.cover ?? []).some((c) => dist(p, c) < c.r - 4)) return 0;
  if (level.dark) return zones.some((z) => z.kind === 'sun' && z.look === LOOK_STONE && inZoneShape(p, z)) ? STONE_GAIN : 0;
  const clear = zones.some((z) => z.kind === 'sun' && z.look === LOOK_CLEAR && inZoneShape(p, z));
  return clear || !shaded(p, clouds) ? 1 : 0;
}

/** Whether the ground at `p` is in sunshine `elapsed` s into a level (the badger shies from it). */
export function sunnyAt(level: LevelDef, p: Pt, elapsed: number): boolean {
  return sunAt(level, p, cloudsAt(level, elapsed)) > 0;
}

/** A lerp through cold (0), warm (WARM) and hot (1). */
function byWarmth(v: number, k: { readonly cold: number; readonly warm: number; readonly hot: number }): number {
  if (v <= WARM) return k.cold + (k.warm - k.cold) * (v / WARM);
  return k.warm + (k.hot - k.warm) * ((v - WARM) / (1 - WARM));
}

/**
 * The adder's warmth. Passive: no button. Lying still in a sun patch (no
 * steering) while cool makes it settle and bask; steering again moves on.
 * The view and the test bot read its clouds, its sun and its basking.
 */
export class Warmth implements Ability {
  readonly id = 'warmth';
  readonly label = 'Warmth';
  readonly button = false;
  value: number;
  /** 0 moving .. 1 settled to bask. */
  bask = 0;
  /** How sunny the snake is now, 0..1 (its body's share in the sun). */
  sun = 0;
  clouds: Cloud[] = [];
  private still = 0;
  /** Told it's cold, until it warms up again. */
  private shivered = false;

  constructor(private readonly level: LevelDef) {
    const cold = (level.teach ?? []).includes(COLD_START_HINT);
    this.value = cold ? START.cold : level.dark ? START.night : START.usual;
    this.clouds = cloudsAt(level, 0);
  }

  get charge(): number {
    return this.value;
  }

  get active(): boolean {
    return this.bask > 0.5;
  }

  get basking(): boolean {
    return this.bask >= 1;
  }

  /** How warm the ground at `p` is now (0 shade .. 1 sunshine). */
  sunAt(p: Pt): number {
    return sunAt(this.level, p, this.clouds);
  }

  step(ctx: AbilityCtx, input: AbilityInput, dt: number): void {
    const s = ctx.snake;
    this.clouds = cloudsAt(this.level, ctx.elapsed);
    this.sun = this.bodySun(ctx);
    const headSun = this.sunAt(s.head);
    // Basking: still (no steering) with the head in the sun, while cool.
    this.still = input.steering || s.mode !== 'move' ? 0 : this.still + dt;
    const wants = headSun > 0 && this.still > BASK_AFTER && this.value < (this.bask > 0 ? 1 : BASK_BELOW) && !s.striking;
    this.bask = clamp(this.bask + (wants ? dt : -dt * 3) / SETTLE, 0, 1);
    const wet = ctx.inZone(s.head, 'water');
    const drain = (1 / DRAIN_TIME) * (this.level.dark ? NIGHT_DRAIN : 1) * (wet ? WATER_DRAIN : 1);
    const gain = SUN_GAIN * this.sun + BASK_GAIN * this.bask * headSun;
    const was = this.value;
    this.value = clamp(this.value + (gain - drain) * dt, 0, 1);
    this.tell(ctx, was);
    s.speedScale = byWarmth(this.value, SPEED) * (1 - this.bask) * (wet ? SWIM : 1);
    s.turnScale = byWarmth(this.value, TURN);
    if (this.basking) s.hold = true;
    s.meter = { label: 'warmth', value: this.value, low: this.value < LOW };
  }

  /** How much of the snake lies in the sun: the head counts for HEAD_SHARE, the body (every few samples) for the rest. */
  private bodySun(ctx: AbilityCtx): number {
    const s = ctx.snake;
    const pts = s.trail.pts;
    const n = s.trail.count;
    let sum = 0;
    let k = 0;
    for (let i = 0; i < n; i += 4) {
      sum += this.sunAt(pts[i]!);
      k++;
    }
    return HEAD_SHARE * this.sunAt(s.head) + (1 - HEAD_SHARE) * (k ? sum / k : 0);
  }

  /** A shiver when it gets cold, and a sigh when basking has warmed it through. */
  private tell(ctx: AbilityCtx, was: number): void {
    const h = ctx.snake.head;
    if (!this.shivered && this.value < 0.22 && was >= 0.22) {
      this.shivered = true;
      ctx.emit({ type: 'say', text: 'Brrr… cold!', x: h.x, y: h.y - 30 });
    }
    if (this.shivered && this.value > 0.6) this.shivered = false;
    if (this.bask > 0 && this.value >= 1 && was < 1) ctx.emit({ type: 'say', text: 'Warm!', x: h.x, y: h.y - 30 });
  }
}

export const ADDER: AbilityMaker = (level) => new Warmth(level);
