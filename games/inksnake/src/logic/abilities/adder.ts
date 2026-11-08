import { BOARD, type LevelDef, type ZoneDef } from '../../level/types';
import { createRng } from '../rng';
import { inZone, inZoneShape } from '../zones';
import { clamp, dist, type Pt } from '../vec';
import type { Prompt } from '../enemyTypes';
import type { Ability, AbilityCtx, AbilityInput, AbilityMaker } from './types';

/**
 * The adder is cold-blooded: its warmth (0 cold .. 1 warm) sets how fast it
 * moves and turns. It drains slowly and fills fast in sunshine, faster
 * the more of the body lies in it, with no need to stop. The sunny ground is the
 * level's 'sun' zones, with cloud shadows drifting over them on the wind,
 * the same way every time a level is played, so the sunny spots shift.
 * Being cold never costs a life, but a cold snake can't get away.
 */

/** Warm to cold in about this long with no sun, s (faster at night, and in the pool's cold water). */
const DRAIN_TIME = 35;
const NIGHT_DRAIN = 1.4;
const WATER_DRAIN = 2;
/** Warmth a second with the whole body in the sun (a pass through a patch with the head alone gives about a third of it). */
const SUN_GAIN = 0.45;
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
/** The notes over the board say what the sun is doing while it's cooler than this. */
const TELL_BELOW = 0.7;
/** How fast the shimmer of warming up comes and goes, per s. */
const GLOW_RATE = 4;
const PROMPTS = {
  cold: { mouse: 'Cold and slow! Get into a patch of sunshine to warm up', touch: 'Cold and slow! Get into a patch of sunshine to warm up' },
  stones: { mouse: 'Cold and slow! Lie on the warm stones to warm up', touch: 'Cold and slow! Lie on the warm stones to warm up' },
  cloud: { mouse: 'A cloud is over this patch: find one in the sunshine', touch: 'A cloud is over this patch: find one in the sunshine' },
  warming: { mouse: 'Warming up in the sunshine…', touch: 'Warming up in the sunshine…' },
} as const satisfies Record<string, Prompt>;
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
 * The adder's warmth. Passive: no button. Sunshine on the body warms it
 * as it goes; shade, clouds and the pool cool it. The view and the test
 * bot read its clouds, its sun and whether it's warming.
 */
export class Warmth implements Ability {
  readonly id = 'warmth';
  readonly label = 'Warmth';
  readonly button = false;
  value: number;
  /** 0..1, eased: how much it's warming up now (the view's shimmer). */
  warming = 0;
  /** How sunny the snake is now, 0..1 (its body's share in the sun). */
  sun = 0;
  clouds: Cloud[] = [];
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
    return this.warming > 0.5;
  }

  /** How warm the ground at `p` is now (0 shade .. 1 sunshine). */
  sunAt(p: Pt): number {
    return sunAt(this.level, p, this.clouds);
  }

  step(ctx: AbilityCtx, _input: AbilityInput, dt: number): void {
    const s = ctx.snake;
    this.clouds = cloudsAt(this.level, ctx.elapsed);
    this.sun = this.bodySun(ctx);
    const wet = ctx.inZone(s.head, 'water');
    const drain = (1 / DRAIN_TIME) * (this.level.dark ? NIGHT_DRAIN : 1) * (wet ? WATER_DRAIN : 1);
    const gain = SUN_GAIN * this.sun;
    const was = this.value;
    this.value = clamp(this.value + (gain - drain) * dt, 0, 1);
    const glow = gain > drain && this.value < 1 ? 1 : 0;
    this.warming = clamp(this.warming + Math.sign(glow - this.warming) * GLOW_RATE * dt, 0, 1);
    this.tell(ctx, was);
    s.speedScale = byWarmth(this.value, SPEED) * (wet ? SWIM : 1);
    s.turnScale = byWarmth(this.value, TURN);
    const label = this.value < LOW ? 'cold: slow' : this.value >= WARM ? 'warm: fast' : 'warmth';
    s.meter = { label, value: this.value, low: this.value < LOW };
  }

  /** What the sun is doing for a cool snake: warming it, hidden by a cloud, or nowhere near. */
  prompt(snake: { readonly head: Pt }): Prompt | null {
    if (this.value >= TELL_BELOW) return null;
    if (this.warming > 0.5) return PROMPTS.warming;
    const h = snake.head;
    const covered = !this.level.dark && inZone(h, this.level.zones ?? [], 'sun') && this.sunAt(h) <= 0 && shaded(h, this.clouds);
    if (covered) return PROMPTS.cloud;
    if (this.value < LOW) return this.level.dark ? PROMPTS.stones : PROMPTS.cold;
    return null;
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

  /** A shiver when it gets cold, and a sigh when the sun has warmed it through. */
  private tell(ctx: AbilityCtx, was: number): void {
    const h = ctx.snake.head;
    if (!this.shivered && this.value < 0.22 && was >= 0.22) {
      this.shivered = true;
      ctx.emit({ type: 'say', text: 'Brrr… cold!', x: h.x, y: h.y - 30 });
    }
    if (this.shivered && this.value > 0.6) this.shivered = false;
    if (this.value >= 1 && was < 1) ctx.emit({ type: 'say', text: 'Warm!', x: h.x, y: h.y - 30 });
  }
}

export const ADDER: AbilityMaker = (level) => new Warmth(level);
