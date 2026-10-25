import { BOARD } from '../../level/types';
import type { AbilityCtx } from '../abilities/types';
import { edgePoint, type EnemyCtx } from '../enemyTypes';
import { RivalSnake, type RivalSpec } from '../enemies/rival';
import { catchable } from '../preyTypes';
import type { Snake } from '../snake';
import { clamp, dist, pt, type Pt } from '../vec';
import { JUNGLE_PREY } from './junglePrey';

/**
 * The Jungle's rival snakes: the king cobra's prey. A rival narrower than
 * the cobra's gape goes down whole the moment the cobra's head touches it
 * (and it slips away from a cobra that could eat it); one wider than the
 * cobra bites when their heads meet. A rock python is too wide ever to
 * swallow awake: a strike's venom makes it stagger and fall asleep, and a
 * sleeping python is swallowed whatever its size. Grow wide enough and a
 * krait that was a danger becomes dinner.
 */

type JungleMode = 'away' | 'roam' | 'hunt' | 'flee' | 'stagger' | 'sleep' | 'eaten';

/** A Jungle rival's habits, on top of the shared ones. */
export interface JungleRivalSpec extends RivalSpec {
  /** The prey kind it goes down as (junglePrey.ts): what a feast counts and what it's worth. */
  readonly meal: string;
  /** A strike's venom puts it to sleep (the python: too wide to swallow awake). */
  readonly sleepy: boolean;
  /** It slips away from a cobra that could eat it once the cobra's head comes this close, px (0: never). */
  readonly shy: number;
  /** How much faster it goes slipping away. */
  readonly dash: number;
}

/** Bitten, it slows over this long, then sleeps this long, s. */
const STAGGER_TIME = 2;
const SLEEP_TIME = 8;
/** Scared off by a strike, or turning away after a bite, it keeps away this long, s. */
const FLEE_TIME = 3;
const BITE_REST = 1.4;
/** The most a rival may grow eating the level's prey, as a share of its length on arrival. */
const MAX_GROWTH = 0.35;

/** Indian rat snakes: quick and harmless, eating the frogs and rats; a king cobra's favourite meal. */
export const RAT_SNAKE: JungleRivalSpec = {
  body: { name: 'Indian rat snake', latin: 'Ptyas mucosa', width: 12, speed: 118, turn: 4.2, big: 'none' },
  length: 150, hunts: 0, cause: 'bitten', eatsPrey: true, respawn: 5, points: 30,
  meal: 'ratsnake', sleepy: false, shy: 110, dash: 1.3,
};

/** A young banded krait: thinner than the cobra, sluggish by day. Dinner. */
export const SMALL_KRAIT: JungleRivalSpec = {
  body: { name: 'banded krait', latin: 'Bungarus fasciatus', width: 14, speed: 96, turn: 3.4, big: 'none' },
  length: 150, hunts: 0, cause: 'krait', eatsPrey: false, respawn: 6, points: 35,
  meal: 'banded-krait', sleepy: false, shy: 80, dash: 1.2,
};

/** A big banded krait: wider than a young cobra, and a snake-eater too, so it hunts you while it's the bigger. */
export const BIG_KRAIT: JungleRivalSpec = {
  body: { name: 'banded krait', latin: 'Bungarus fasciatus', width: 23, speed: 100, turn: 3.2, big: 'none' },
  length: 230, hunts: 170, cause: 'krait', eatsPrey: false, respawn: 9, points: 55,
  meal: 'big-krait', sleepy: false, shy: 90, dash: 1.15,
};

/** An Indian rock python: slow and far too wide to swallow awake; it squeezes a head it meets. */
export const ROCK_PYTHON: JungleRivalSpec = {
  body: { name: 'Indian rock python', latin: 'Python molurus', width: 32, speed: 60, turn: 2.4, big: 'none' },
  length: 270, hunts: 0, cause: 'constricted', eatsPrey: true, respawn: 10, points: 80,
  meal: 'rock-python', sleepy: true, shy: 0, dash: 1,
};

/**
 * A Jungle rival snake. It replaces RivalSnake's habits (its state is its
 * own) but stays a RivalSnake, so the game draws it as a snake. The cobra
 * swallows it through `swallowRival` (run by the hood ability every frame),
 * as one of the chapter's meal prey, so feasts and the score count it.
 */
export class JungleRival extends RivalSnake {
  readonly own: JungleRivalSpec;
  private phase: JungleMode = 'away';
  private phaseAge = 0;
  private phaseLeft: number;
  private aim: Pt | null = null;
  private biteRest = 0;
  /** Seconds a hood still holds it still. */
  private still = 0;

  constructor(id: number, kind: string, arriveIn: number, spec: JungleRivalSpec) {
    super(id, kind, arriveIn, spec, kind);
    this.own = spec;
    this.phaseLeft = arriveIn;
  }

  override get mode(): string {
    return this.still > 0 && this.phase !== 'sleep' && this.phase !== 'stagger' ? 'frozen' : this.phase;
  }

  override get modeAge(): number {
    return this.phaseAge;
  }

  override get away(): boolean {
    return this.phase === 'away' || this.phase === 'eaten';
  }

  /** Asleep from venom: it can be swallowed whatever its size. */
  get asleep(): boolean {
    return this.phase === 'sleep';
  }

  override freeze(seconds: number): void {
    if (this.away) return;
    this.still = Math.max(this.still, seconds);
  }

  override frighten(ctx: EnemyCtx, from: Pt): boolean {
    if (this.away || this.phase === 'sleep' || this.phase === 'stagger') return false;
    this.fleeFrom(ctx, from, FLEE_TIME);
    return true;
  }

  /** Whether `me` can swallow it now: it's narrower than its gape, or asleep. */
  edibleBy(me: Snake): boolean {
    return me.spec.snakeEater === true && (this.snake.width <= me.gape || this.asleep);
  }

  /** Whether it bites `me` when their heads meet: it's the bigger, and awake and free. */
  dangerTo(me: Snake): boolean {
    return !this.edibleBy(me) && this.snake.width > me.width * 1.04 && this.phase !== 'sleep' && this.phase !== 'stagger';
  }

  /** Whether a head of width `w` at `p` touches its body anywhere. */
  touchedBy(p: Pt, w: number): boolean {
    const s = this.snake;
    const r = (w + s.width) / 2;
    const pts = s.trail.pts;
    const n = s.trail.count;
    for (let i = 0; i < n; i += 2) if (dist(pts[i]!, p) < r) return true;
    return false;
  }

  /** Swallowed by the cobra: off the board, back after a while. */
  swallowed(): void {
    this.phase = 'eaten';
    this.phaseAge = 0;
    this.phaseLeft = this.own.respawn;
    this.still = 0;
    this.x = -200;
    this.y = -200;
  }

  override step(ctx: EnemyCtx, dt: number): void {
    this.phaseAge += dt;
    this.phaseLeft -= dt;
    this.biteRest = Math.max(0, this.biteRest - dt);
    this.still = Math.max(0, this.still - dt);
    if (this.away) {
      if (this.phaseLeft <= 0) this.arriveOn(ctx);
      return;
    }
    const s = this.snake;
    const me = ctx.snake;
    s.speedScale = 1;
    this.struck(ctx);
    if (this.phase === 'sleep') {
      if (this.phaseLeft <= 0) {
        this.go('roam', 0);
        ctx.emit({ type: 'say', text: '!', x: s.head.x, y: s.head.y - 24 });
      }
      return;
    }
    if (this.phase === 'stagger') {
      s.speedScale = 0.7 * Math.max(0, this.phaseLeft / STAGGER_TIME);
      if (this.phaseLeft <= 0) {
        this.go('sleep', SLEEP_TIME);
        ctx.emit({ type: 'say', text: 'zzz…', x: s.head.x, y: s.head.y - 24 });
        return;
      }
    } else if (this.still <= 0) this.choose(ctx);
    if (this.still <= 0) s.steer({ toward: this.phase === 'stagger' ? null : this.aim, face: null, strike: false }, dt, BOARD, ctx.solids);
    s.digest(dt);
    this.x = s.head.x;
    this.y = s.head.y;
    this.heading = s.heading;
    if (this.own.eatsPrey && this.still <= 0 && this.phase !== 'stagger') this.graze(ctx);
    // Heads meeting: the bigger snake bites.
    if (this.biteRest <= 0 && this.still <= 0 && this.dangerTo(me) && dist(me.head, s.head) < (me.width + s.width) / 2 + 4) {
      if (ctx.hurt(this.own.cause, s.head)) {
        this.biteRest = BITE_REST;
        this.fleeFrom(ctx, me.head, 1.5);
      }
    }
  }

  /** A strike landing on it: venom puts a sleepy one to sleep; a bigger one is sent off. */
  private struck(ctx: EnemyCtx): void {
    const me = ctx.snake;
    if (!me.striking || this.phase === 'stagger' || this.phase === 'sleep' || !this.touchedBy(me.head, me.width + 8)) return;
    const s = this.snake;
    if (this.own.sleepy && !this.edibleBy(me)) {
      this.go('stagger', STAGGER_TIME);
      this.still = 0;
      ctx.emit({ type: 'say', text: 'Bite!', x: s.head.x, y: s.head.y - 26, danger: true });
    } else if (this.dangerTo(me) && this.phase !== 'flee') {
      this.fleeFrom(ctx, me.head, FLEE_TIME);
      this.biteRest = Math.max(this.biteRest, 0.8);
      ctx.emit({ type: 'scared', kind: this.kind, x: s.head.x, y: s.head.y });
    }
  }

  /** Where to go this frame: away from a cobra that could eat it, after one it could bite, after food, or about. */
  private choose(ctx: EnemyCtx): void {
    const s = this.snake;
    const me = ctx.snake;
    const d = dist(me.head, s.head);
    const sees = !me.hidden;
    if (this.phase === 'flee' && this.phaseLeft > 0) {
      s.speedScale = this.own.dash;
      return;
    }
    if (this.own.shy > 0 && sees && d < this.own.shy && this.edibleBy(me)) {
      this.fleeFrom(ctx, me.head, 0.6);
      s.speedScale = this.own.dash;
      return;
    }
    if (this.own.hunts > 0 && sees && d < this.own.hunts && this.dangerTo(me)) {
      if (this.phase !== 'hunt') ctx.emit({ type: 'say', text: '!', x: s.head.x, y: s.head.y - 24, danger: true });
      this.phase = 'hunt';
      this.aim = me.head;
      return;
    }
    if (this.phase !== 'roam') this.go('roam', 0);
    if (!this.aim || dist(this.aim, s.head) < 20 || this.phaseLeft <= 0) this.wander(ctx);
  }

  /** The nearest prey it can swallow (while it may still grow), or somewhere to roam. */
  private wander(ctx: EnemyCtx): void {
    const s = this.snake;
    let best: Pt | null = null;
    let bd = Infinity;
    if (this.own.eatsPrey && s.length < this.own.length * (1 + MAX_GROWTH)) {
      for (const p of ctx.prey) {
        if (!catchable(p) || sizeOf(p.kind) > s.gape) continue;
        const d = dist(p, s.head);
        if (d < bd) {
          bd = d;
          best = p;
        }
      }
    }
    this.aim = best ?? pt(60 + ctx.rng() * (ctx.w - 120), 60 + ctx.rng() * (ctx.h - 120));
    this.phaseLeft = 3 + ctx.rng() * 3;
  }

  private graze(ctx: EnemyCtx): void {
    const s = this.snake;
    if (s.length >= this.own.length * (1 + MAX_GROWTH)) return;
    for (const p of [...ctx.prey]) {
      if (!catchable(p) || p.kind in MEALS) continue;
      const size = sizeOf(p.kind);
      if (size > s.gape || dist(p, s.head) > s.width * 0.65 + size / 2) continue;
      ctx.takePrey(p);
      s.swallowed(size, (JUNGLE_PREY[p.kind]?.growth ?? 30) * 0.6);
      ctx.emit({ type: 'say', text: 'gulp', x: p.x, y: p.y - 18 });
      this.aim = null;
    }
  }

  private fleeFrom(ctx: EnemyCtx, from: Pt, seconds: number): void {
    const h = this.snake.head;
    const a = Math.atan2(h.y - from.y, h.x - from.x);
    this.aim = pt(clamp(h.x + Math.cos(a) * 300, 30, ctx.w - 30), clamp(h.y + Math.sin(a) * 300, 30, ctx.h - 30));
    this.go('flee', seconds);
  }

  private go(mode: JungleMode, seconds: number): void {
    this.phase = mode;
    this.phaseAge = 0;
    this.phaseLeft = seconds;
  }

  /** In from an edge on a fresh body, laid out behind it off the board. */
  private arriveOn(ctx: EnemyCtx): void {
    const e = edgePoint(ctx.rng, ctx.w, ctx.h, 10);
    const into = pt(clamp(e.x, 10, ctx.w - 10), clamp(e.y, 10, ctx.h - 10));
    const heading = Math.atan2(ctx.h / 2 - into.y, ctx.w / 2 - into.x);
    const s = this.snake;
    s.trail.length = this.own.length;
    s.trail.pts = Array.from({ length: Math.ceil(this.own.length / 4) + 1 }, (_, i) => pt(into.x - Math.cos(heading) * i * 4, into.y - Math.sin(heading) * i * 4));
    s.heading = heading;
    s.lumps.length = 0;
    s.pending = 0;
    this.x = into.x;
    this.y = into.y;
    this.heading = heading;
    this.aim = null;
    this.still = 0;
    this.go('roam', 0);
    ctx.emit({ type: 'arrive', kind: this.kind, x: into.x, y: into.y });
  }
}

/** The meal kinds: never eaten by a rival. */
const MEALS: Readonly<Record<string, true>> = { ratsnake: true, 'banded-krait': true, 'big-krait': true, 'rock-python': true };

/** A prey kind's size (the chapter's own; anything else counts as a frog). */
function sizeOf(kind: string): number {
  return JUNGLE_PREY[kind]?.size ?? 15;
}

/**
 * The king cobra swallows a rival its head touches, if it can (narrower
 * than its gape, or asleep): the rival leaves the board and its meal prey
 * is put down at the head, where the world swallows it this same frame
 * (a sleeping python with the big-meal pause). Run first thing each frame,
 * by the cobra's ability. Returns whether it swallowed one.
 */
export function swallowRival(ctx: AbilityCtx): boolean {
  const s = ctx.snake;
  if (s.spec.snakeEater !== true || s.mode !== 'move') return false;
  for (const e of ctx.enemies) {
    if (!(e instanceof JungleRival) || e.away || !e.edibleBy(s) || !e.touchedBy(s.head, s.width)) continue;
    const asleep = e.asleep;
    const meal = ctx.spawnPrey(e.own.meal, s.head);
    if (!meal) return false;
    const g = ctx.level.goal;
    meal.mode = asleep ? 'sleep' : 'idle';
    meal.shown = 1;
    meal.timer = 0;
    meal.heading = e.heading;
    meal.marked = g?.kind === 'feast' && g.food === e.own.meal;
    e.swallowed();
    return true;
  }
  return false;
}
