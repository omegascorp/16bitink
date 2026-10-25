import { BOARD, type LevelDef, type ZoneKind } from '../level/types';
import { ABILITIES, type Ability, type AbilityCtx } from './abilities/index';
import { pushOffBody } from './bodyBlock';
import { findLoop, loopHint, ringRadius, ringTargets, SQUEEZE_TIME, SWALLOW_TIME, type Loop } from './coil';
import { makeBoss, makeEnemies } from './enemies/index';
import type { Boss, Enemy, EnemyCtx, EnemyEvent, HurtCause } from './enemyTypes';
import { catchable, freeSpot, makePrey, preySpec, stepPrey, type Prey, type PreyKind, type PreyWorld } from './prey';
import { STAGGER_TIME } from './preyMoves';
import { createRng, type Rng } from './rng';
import { Snake, type SnakeInput } from './snake';
import { BIG_MEAL, venomMaxOf } from './species';
import { dist, pt, pushOut, type Pt, type Shape, wrapAngle } from './vec';
import { inZone } from './zones';

export const LIVES = 3;
/** A new prey animal comes this long after one is eaten, s. */
const RESPAWN = [1.2, 2.6] as const;
/** New prey appears at least this far from the head, px. */
const SPAWN_AWAY = 170;
/** Points for scaring an enemy off. */
const SCARE_POINTS = 5;
const BOSS_HIT_POINTS = 50;
/** A coil that catches more than one at once scores each meal this much more per extra one. */
const COIL_BONUS = 0.5;
/** After a coil the snake may cross its own body this long, s, as it slides out of the loop. */
const UNCOIL_TIME = 1.2;
/** A venomous strike lands on prey this close to the head, past its edge, px. */
const BITE_REACH = 10;
/** How far prey (by its size) and hunters keep their middles off the snake's body, px from its edge. */
const PREY_GIRTH = 0.4;
const ENEMY_GIRTH = 10;
/** Swallowing a meal much wider than the snake takes this many times a coiled swallow. */
const BIG_SWALLOW = 1.5;

/** Why a level was lost: out of lives, or (a rush) out of time. */
export type LossCause = HurtCause | 'time';

export type WorldEvent =
  | EnemyEvent
  | { readonly type: 'eat'; readonly kind: PreyKind; readonly x: number; readonly y: number; readonly size: number; readonly marked: boolean }
  | { readonly type: 'squeeze'; readonly x: number; readonly y: number; readonly count: number }
  | { readonly type: 'bite'; readonly kind: PreyKind; readonly x: number; readonly y: number }
  | { readonly type: 'strike' }
  | { readonly type: 'hurt'; readonly cause: HurtCause; readonly x: number; readonly y: number }
  | { readonly type: 'nip'; readonly x: number; readonly y: number; readonly amount: number }
  | { readonly type: 'bump' }
  | { readonly type: 'grown' }
  | { readonly type: 'won' }
  | { readonly type: 'lost'; readonly cause: LossCause };

export type WorldState = 'play' | 'won' | 'lost';

/** A squeeze under way: the loop's samples, where they started and where they're pulled to. */
interface Squeeze {
  readonly loop: Loop;
  readonly from: readonly Pt[];
  readonly to: readonly Pt[];
}

/**
 * One level's rules: the snake (and its ability), the prey kept on the
 * board, the enemies, the ground's zones and the goal. `step` runs a frame
 * and returns what happened, for the views and sounds to show. No Phaser:
 * it's all tested headless.
 */
export class World {
  readonly level: LevelDef;
  readonly snake: Snake;
  readonly ability: Ability | null;
  readonly prey: Prey[] = [];
  readonly enemies: Enemy[];
  readonly boss: Boss | null;
  readonly solids: readonly Shape[];
  readonly maxLives: number;
  lives: number;
  score = 0;
  elapsed = 0;
  state: WorldState = 'play';
  lostBy: LossCause | undefined;
  /** Meals eaten this level, by kind (marked ones only for the feast's kind). */
  readonly eaten: Partial<Record<PreyKind, number>> = {};
  /** The loop the head is about to close round prey, for its dotted ring. */
  hint: Loop | null = null;
  /** Best count caught in one coil, for the result card. */
  bestCoil = 0;
  /** The meals waiting to be swallowed (after a squeeze, or a big sleeping one). */
  private queue: Prey[] = [];
  private squeeze: Squeeze | null = null;
  private readonly rng: Rng;
  private nextId = 1;
  /** Countdowns to the next of each kind of prey, s. */
  private readonly respawn: { kind: PreyKind; t: number }[] = [];
  private events: WorldEvent[] = [];
  /** Already over the target length, so the grown event fires once. */
  private reached = false;
  private coilMultiplier = 1;
  /** How long the swallow under way takes, s. */
  private gulpTime = SWALLOW_TIME;
  /** The middle of the coil just squeezed, until the snake slides out of it. */
  private lastCoil: Pt | null = null;
  private readonly ctx: EnemyCtx;
  private readonly actx: AbilityCtx;
  private readonly pw: PreyWorld;

  /** `seed` replays the level differently (tests and promo clips); by default each level always plays out the same way at the start. */
  constructor(level: LevelDef, seed = 0) {
    this.level = level;
    this.rng = createRng(seedOf(level.id) + seed);
    this.snake = new Snake(level.snake, level.start, level.heading, level.length);
    this.snake.maxLength = Math.max(level.target, level.length);
    this.solids = (level.solids ?? []).map((s) => (s.kind === 'circle' ? { kind: 'circle', x: s.x, y: s.y, r: s.r } : { kind: 'rect', x: s.x, y: s.y, w: s.w, h: s.h }));
    this.maxLives = level.lives ?? LIVES;
    this.lives = this.maxLives;
    this.enemies = makeEnemies(level, () => this.nextId++);
    this.boss = makeBoss(level, () => this.nextId++);
    this.ability = ABILITIES[level.snake]?.(level) ?? null;
    this.pw = this.makePreyWorld();
    this.ctx = this.makeEnemyCtx();
    this.actx = this.makeAbilityCtx();
    for (const def of level.prey) for (let i = 0; i < def.count; i++) this.spawn(def.kind, true);
  }

  /** The level's goal so far, 0..1: the meter shows it. */
  get progress(): number {
    const l = this.level;
    if (l.goal?.kind === 'boss' && this.boss) return 1 - this.boss.hp / this.boss.maxHp;
    const grow = Math.min(1, Math.max(0, (this.snake.length + this.snake.pending - l.length) / Math.max(1, l.target - l.length)));
    if (l.goal?.kind === 'feast') return (grow + Math.min(1, this.feasted / l.goal.count)) / 2;
    return grow;
  }

  /** Marked meals of the feast's kind eaten so far. */
  get feasted(): number {
    const g = this.level.goal;
    return g?.kind === 'feast' ? this.eaten[g.food] ?? 0 : 0;
  }

  /** Seconds left on a rush's clock, or null. */
  get timeLeft(): number | null {
    const g = this.level.goal;
    return g?.kind === 'rush' ? Math.max(0, g.seconds - this.elapsed) : null;
  }

  /** The squeeze's progress 0..1 and its loop, while one is under way. */
  get squeezing(): { readonly t: number; readonly loop: Loop } | null {
    const s = this.squeeze;
    return s ? { t: 1 - this.snake.modeTime / SQUEEZE_TIME, loop: s.loop } : null;
  }

  /** The meal being swallowed, and how far down it is 0..1. */
  get gulping(): { readonly prey: Prey; readonly t: number } | null {
    const p = this.queue[0];
    return p && this.snake.mode === 'swallow' ? { prey: p, t: 1 - this.snake.modeTime / this.gulpTime } : null;
  }

  /** Whether a point lies in ground of this kind (water, sand, trees…). */
  inZone(p: Pt, kind: ZoneKind): boolean {
    return inZone(p, this.level.zones ?? [], kind);
  }

  step(input: SnakeInput, dt: number): WorldEvent[] {
    this.events = [];
    if (this.state !== 'play') {
      // The level is decided: the board lives on a moment under the result card.
      for (const p of this.prey) stepPrey(p, preySpec(p.kind), this.pw, dt);
      return this.events;
    }
    this.elapsed += dt;
    const snake = this.snake;
    this.runAbility(input, dt);
    snake.hidden = this.underCover(snake.head) || snake.cloak !== 'none';
    if (snake.steer(input, dt, BOARD, this.solids)) this.events.push({ type: 'strike' });
    if (snake.bumped) this.events.push({ type: 'bump' });
    this.runMode(dt);
    snake.digest(dt);
    if (snake.mode === 'move') {
      this.bite();
      this.eatAtHead();
      this.coilOrBite();
    }
    this.hint = snake.mode === 'move' && snake.spec.big === 'coil' ? loopHint(snake, this.prey) : null;
    // Prey a coil is closing round freezes in fear: the loop can always be finished.
    for (const p of this.prey) p.frozen = this.hint?.prey.includes(p) ?? false;
    for (const p of this.prey) stepPrey(p, preySpec(p.kind), this.pw, dt);
    for (const e of this.enemies) e.step(this.ctx, dt);
    this.boss?.step(this.ctx, dt);
    this.keepOffBody();
    this.tickRespawns(dt);
    this.judge();
    return this.events;
  }

  /** The snake's ability runs first each frame: it may hold the snake, cloak it, slow it, keep its meter. */
  private runAbility(input: SnakeInput, dt: number): void {
    const s = this.snake;
    s.cloak = 'none';
    s.speedScale = 1;
    s.turnScale = 1;
    s.hold = false;
    if (!this.ability) return;
    const steering = input.face !== null || (input.moved === true && input.toward !== null && dist(input.toward, s.head) > 40);
    this.ability.step(this.actx, { held: input.ability === true, pressed: input.abilityPressed === true, steering }, dt);
  }

  /** Squeezes tighten, then each meal waiting goes down in turn; a stun wears off. */
  private runMode(dt: number): void {
    const snake = this.snake;
    const ended = snake.tickMode(dt);
    if (snake.mode === 'squeeze' && this.squeeze) {
      const t = 1 - snake.modeTime / SQUEEZE_TIME;
      const e = t * t * (3 - 2 * t);
      const { from, to } = this.squeeze;
      for (let i = 0; i < from.length; i++) {
        const a = from[i]!;
        const b = to[i]!;
        snake.trail.pts[i] = pt(a.x + (b.x - a.x) * e, a.y + (b.y - a.y) * e);
      }
      // The coiled prey are drawn in to the middle as the loop closes.
      const c = this.squeeze.loop.centre;
      for (const p of this.queue) {
        p.x += (c.x - p.x) * Math.min(1, dt * 6);
        p.y += (c.y - p.y) * Math.min(1, dt * 6);
      }
      if (ended) {
        this.squeeze = null;
        this.nextGulp();
      }
      return;
    }
    if (snake.mode === 'swallow' && ended) {
      const p = this.queue.shift();
      if (p) this.swallow(p, this.coilMultiplier);
      this.nextGulp();
      return;
    }
    if (snake.mode === 'stun' && ended) snake.mode = 'move';
  }

  /** Swallowing the next meal waiting, or moving on when there are none left. */
  private nextGulp(): void {
    const snake = this.snake;
    const p = this.queue[0];
    if (p) {
      snake.mode = 'swallow';
      this.gulpTime = SWALLOW_TIME * (preySpec(p.kind).size > snake.width * BIG_MEAL * 1.6 ? BIG_SWALLOW : 1);
      snake.modeTime = this.gulpTime;
      // The head turns to the meal.
      snake.heading = Math.atan2(p.y - snake.head.y, p.x - snake.head.x);
      return;
    }
    snake.mode = 'move';
    this.coilMultiplier = 1;
    // Out of a coil: facing out of the loop, free to slide over its own body a moment.
    const c = this.lastCoil;
    if (c) {
      snake.heading = Math.atan2(snake.head.y - c.y, snake.head.x - c.x);
      snake.uncoil = UNCOIL_TIME;
      this.lastCoil = null;
    }
  }

  /** Whether the snake eats this kind at all (the egg-eater eats only eggs). */
  private eats(kind: PreyKind): boolean {
    const diet = this.snake.spec.diet;
    return !diet || diet.includes(kind);
  }

  /**
   * A venomous snake's strike on prey too big to swallow: it runs off,
   * slower and slower, and falls asleep, to be swallowed then.
   */
  private bite(): void {
    const snake = this.snake;
    if (snake.spec.big !== 'venom' || !snake.striking) return;
    const max = venomMaxOf(snake.width);
    for (const p of this.prey) {
      if (!catchable(p) || p.mode === 'stagger' || p.mode === 'sleep' || !this.eats(p.kind)) continue;
      const spec = preySpec(p.kind);
      if (spec.size <= snake.gape || spec.size > max) continue;
      if (dist(snake.head, p) > snake.width / 2 + spec.size / 2 + BITE_REACH) continue;
      p.mode = 'stagger';
      p.timer = STAGGER_TIME;
      p.heading = Math.atan2(p.y - snake.head.y, p.x - snake.head.x);
      this.events.push({ type: 'bite', kind: p.kind, x: p.x, y: p.y });
    }
  }

  /**
   * What the head touches goes down: prey narrow enough on the spot, a
   * sleeping bitten one too (whatever its size); anything much wider than
   * the snake holds it still a moment while its jaws work over it.
   */
  private eatAtHead(): void {
    const snake = this.snake;
    const h = snake.head;
    for (const p of [...this.prey]) {
      if (!catchable(p) || !this.eats(p.kind)) continue;
      const spec = preySpec(p.kind);
      const asleep = p.mode === 'sleep';
      if (spec.size > snake.gape && !asleep) continue;
      if (dist(h, p) > snake.width * 0.65 + spec.size / 2) continue;
      if (asleep || spec.size > snake.width * BIG_MEAL) {
        p.mode = 'caught';
        this.queue = [p];
        this.nextGulp();
        return;
      }
      this.swallow(p, 1);
    }
  }

  /** A meal goes down: points, a lump, growth, and another of its kind on the way. */
  private swallow(p: Prey, multiplier: number): void {
    const spec = preySpec(p.kind);
    const i = this.prey.indexOf(p);
    if (i >= 0) this.prey.splice(i, 1);
    this.snake.swallowed(spec.size, spec.growth);
    this.score += Math.round(spec.points * multiplier);
    const counts = this.level.goal?.kind !== 'feast' || this.level.goal.food !== p.kind || p.marked;
    if (counts) this.eaten[p.kind] = (this.eaten[p.kind] ?? 0) + 1;
    this.events.push({ type: 'eat', kind: p.kind, x: p.x, y: p.y, size: spec.size, marked: p.marked });
    this.respawn.push({ kind: p.kind, t: RESPAWN[0] + this.rng() * (RESPAWN[1] - RESPAWN[0]) });
  }

  /** A loop closed round prey starts a squeeze (constrictors); otherwise a head crossing the body ties a knot. */
  private coilOrBite(): void {
    const snake = this.snake;
    if (snake.spec.big === 'coil') {
      const loop = findLoop(snake, this.prey.filter((p) => this.eats(p.kind)));
      if (loop) {
        this.startSqueeze(loop);
        return;
      }
    }
    if (snake.bitten() >= 0) this.hurt('knot', snake.head);
  }

  private startSqueeze(loop: Loop): void {
    const snake = this.snake;
    const biggest = Math.max(...loop.prey.map((p) => preySpec(p.kind).size));
    const from = snake.trail.pts.slice(0, loop.k + 1);
    const to = ringTargets(from, loop.centre, ringRadius(biggest, snake.width));
    this.squeeze = { loop, from, to };
    this.lastCoil = loop.centre;
    this.queue = [...loop.prey];
    for (const p of loop.prey) p.mode = 'caught';
    this.coilMultiplier = 1 + COIL_BONUS * (loop.prey.length - 1);
    this.bestCoil = Math.max(this.bestCoil, loop.prey.length);
    snake.mode = 'squeeze';
    snake.modeTime = SQUEEZE_TIME;
    snake.strikeTime = 0;
    this.events.push({ type: 'squeeze', x: loop.centre.x, y: loop.centre.y, count: loop.prey.length });
  }

  /** Costs a life; a squeeze or swallow under way is broken and its prey run off. */
  private hurt(cause: HurtCause, at: Pt): boolean {
    const snake = this.snake;
    if (snake.safe > 0 || this.state !== 'play') return false;
    for (const p of this.queue) {
      p.mode = 'flee';
      p.timer = 1;
    }
    this.queue = [];
    this.squeeze = null;
    this.lastCoil = null;
    this.lives -= 1;
    snake.hurt();
    this.events.push({ type: 'hurt', cause, x: at.x, y: at.y });
    if (this.lives <= 0) this.lose(cause);
    return true;
  }

  private judge(): void {
    if (this.state !== 'play') return;
    const l = this.level;
    const s = this.snake;
    const grown = s.length + s.pending >= l.target;
    if (grown && !this.reached) {
      this.reached = true;
      this.events.push({ type: 'grown' });
    }
    if (l.goal?.kind === 'boss') {
      if (this.boss?.beaten && s.mode === 'move') this.win();
      return;
    }
    const fed = l.goal?.kind !== 'feast' || this.feasted >= l.goal.count;
    // The level is won once the last meal is down, not mid-swallow.
    if (grown && fed && s.mode === 'move' && s.length >= l.target - 0.5) {
      this.win();
      return;
    }
    if (l.goal?.kind === 'rush' && this.elapsed >= l.goal.seconds) this.lose('time');
  }

  private win(): void {
    this.state = 'won';
    this.events.push({ type: 'won' });
  }

  private lose(cause: LossCause): void {
    this.state = 'lost';
    this.lostBy = cause;
    this.events.push({ type: 'lost', cause });
  }

  private underCover(p: Pt): boolean {
    return (this.level.cover ?? []).some((c) => dist(p, c) < c.r - 4) || this.inZone(p, 'grass');
  }

  private makePreyWorld(): PreyWorld {
    const world = this;
    return {
      w: BOARD.w, h: BOARD.h, solids: this.solids, rng: this.rng,
      get head() { return world.snake.head; },
      get headSeen() { return !world.snake.hidden; },
      inZone: (p, kind) => this.inZone(p, kind),
    };
  }

  private makeEnemyCtx(): EnemyCtx {
    const world = this;
    return {
      snake: this.snake, w: BOARD.w, h: BOARD.h, solids: this.solids, rng: this.rng, level: this.level, prey: this.prey,
      get elapsed() { return world.elapsed; },
      inZone: (p, kind) => this.inZone(p, kind),
      preySpec: (kind) => preySpec(kind as PreyKind),
      hurt: (cause, at) => this.hurt(cause, at),
      nip: (amount, at) => {
        const lost = this.snake.nip(amount);
        if (lost > 0) this.events.push({ type: 'nip', x: at.x, y: at.y, amount: lost });
        return lost;
      },
      feed: (at, size, growth, points) => {
        this.snake.swallowed(size, growth);
        this.score += points;
        this.events.push({ type: 'eat', kind: 'rival', x: at.x, y: at.y, size, marked: false });
      },
      takePrey: (p) => {
        const i = this.prey.indexOf(p);
        if (i < 0) return;
        this.prey.splice(i, 1);
        this.respawn.push({ kind: p.kind, t: RESPAWN[1] });
      },
      emit: (e) => {
        if (e.type === 'scared') this.score += SCARE_POINTS;
        if (e.type === 'bossHit') this.score += BOSS_HIT_POINTS;
        this.events.push(e);
      },
    };
  }

  private makeAbilityCtx(): AbilityCtx {
    const world = this;
    return {
      snake: this.snake, level: this.level, rng: this.rng, enemies: this.enemies, prey: this.prey, boss: this.boss, enemyCtx: this.ctx,
      get elapsed() { return world.elapsed; },
      inZone: (p, kind) => this.inZone(p, kind),
      hurt: (cause, at) => this.hurt(cause, at),
      spawnPrey: (kind, at) => {
        const p = makePrey(this.nextId++, kind, at, this.rng);
        this.prey.push(p);
        return p;
      },
      emit: (e) => this.ctx.emit(e),
    };
  }

  /** New prey of `kind`: eggs in an empty nest, the rest anywhere free in its zone and away from the head. */
  private spawn(kind: PreyKind, atStart = false): void {
    const spec = preySpec(kind);
    const goal = this.level.goal;
    const marked = goal?.kind === 'feast' && goal.food === kind;
    if (spec.gait === 'still' && !spec.zone) {
      const nests = this.level.nests ?? [];
      const free = nests.filter((n) => !this.prey.some((p) => p.nest && dist(p.nest, n) < 1));
      if (!free.length) return;
      const nest = free[Math.floor(this.rng() * free.length)]!;
      this.prey.push(makePrey(this.nextId++, kind, nest, this.rng, nest, marked));
      return;
    }
    const at = freeSpot(this.pw, spec.size / 2, atStart ? SPAWN_AWAY * 0.6 : SPAWN_AWAY, spec.zone);
    if (at) this.prey.push(makePrey(this.nextId++, kind, at, this.rng, null, marked));
  }

  /**
   * The snake's body is solid to what walks or swims at its level: prey and
   * ground hunters slide along it rather than through it (so prey inside a
   * loop stays inside). Not to eggs, to anything in the air, or to hunters
   * that pass over it (see Enemy.overBody). Ground hunters are kept out of
   * solid things too (prey keep themselves out, see preyMoves.keepIn).
   */
  private keepOffBody(): void {
    const snake = this.snake;
    for (const p of this.prey) {
      if (p.alt > 0.05 || p.frozen || p.mode === 'caught' || p.mode === 'hidden') continue;
      const spec = preySpec(p.kind);
      if (spec.gait === 'still') continue;
      const out = pushOffBody(snake, p, spec.size * PREY_GIRTH);
      if (!out) continue;
      p.x = out.p.x;
      p.y = out.p.y;
      // Off along the body, keeping the side it was already heading.
      const along = Math.atan2(out.n.x, -out.n.y);
      p.heading = Math.cos(wrapAngle(p.heading - along)) >= 0 ? along : wrapAngle(along + Math.PI);
    }
    for (const e of [...this.enemies, ...(this.boss ? [this.boss] : [])]) {
      if (e.away || e.overBody || e.alt > 0.05) continue;
      // The body first: squeezed between it and a rock, a hunter ends up against the body, never in the rock.
      slide(e, pushOffBody(snake, e, ENEMY_GIRTH));
      for (const sh of this.solids) slide(e, pushOut(e, ENEMY_GIRTH, sh));
    }
  }

  private tickRespawns(dt: number): void {
    for (let i = this.respawn.length - 1; i >= 0; i--) {
      const r = this.respawn[i]!;
      r.t -= dt;
      if (r.t > 0) continue;
      this.respawn.splice(i, 1);
      const want = this.level.prey.find((d) => d.kind === r.kind)?.count ?? 0;
      if (this.prey.filter((p) => p.kind === r.kind).length < want) this.spawn(r.kind);
    }
  }
}

/** A steady seed from a level id. */
function seedOf(id: string): number {
  let h = 7;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * Puts a hunter where a push left it, turning the way it was pressing into
 * a slide along the surface (the side its heading favours), so one running
 * at a rock or a coil goes round it instead of stalling there.
 */
function slide(e: Enemy, out: { readonly p: Pt; readonly n: Pt } | null): void {
  if (!out) return;
  const depth = dist(out.p, e);
  const ax = -out.n.y;
  const ay = out.n.x;
  const side = Math.cos(e.heading) * ax + Math.sin(e.heading) * ay >= 0 ? 1 : -1;
  e.x = out.p.x + ax * side * depth;
  e.y = out.p.y + ay * side * depth;
}
