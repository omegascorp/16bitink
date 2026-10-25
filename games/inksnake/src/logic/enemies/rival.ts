import { BOARD } from '../../level/types';
import { edgePoint, type EnemyCtx } from '../enemyTypes';
import { catchable } from '../preyTypes';
import { Snake, type SnakeInput } from '../snake';
import type { SnakeSpec } from '../species';
import { clamp, dist, pt, type Pt } from '../vec';

type RivalMode = 'away' | 'roam' | 'hunt' | 'eaten';

/** A rival snake's habits (a kingsnake, rat snakes, kraits, a bigger anaconda). */
export interface RivalSpec {
  /** Its body: width, speed, turning (big: 'none'; it swallows prey up to its gape). */
  readonly body: SnakeSpec;
  /** Its length when it arrives, px. */
  readonly length: number;
  /** It hunts the player's head when it sees it this close (a kingsnake): 0 never. */
  readonly hunts: number;
  /** Its bite costs a life when its head meets yours and it's the bigger snake. */
  readonly cause: string;
  /** It eats the level's prey too, growing as it does. */
  readonly eatsPrey: boolean;
  /** Back this long after it's eaten (a snake-eater's meal), s. */
  readonly respawn: number;
  /** For a snake-eater: points and growth when it's swallowed. */
  readonly points: number;
}

/**
 * A rival snake, drawn and moving like the player's own (a Snake on its
 * own trail). It roams after the level's prey and eats it; a hunter goes
 * for the player's head when it sees it. Heads meeting: the bigger bites,
 * a life lost if that's the rival. A snake-eater (the king cobra) swallows
 * a rival narrower than its gape whenever its head touches it.
 */
export class RivalSnake {
  readonly kind: string;
  readonly snake: Snake;
  x: number;
  y: number;
  heading = 0;
  alt = 0;
  private m: RivalMode = 'away';
  private age = 0;
  private left: number;
  private target: Pt | null = null;
  /** A bite on the player's head rests this long, s. */
  private rest = 0;

  constructor(readonly id: number, kind: string, arriveIn: number, readonly spec: RivalSpec, art: string) {
    this.kind = kind;
    this.left = arriveIn;
    this.snake = new Snake('corn', pt(-200, -200), 0, spec.length, spec.body, art);
    this.x = -200;
    this.y = -200;
  }

  get mode(): string {
    return this.m;
  }

  get modeAge(): number {
    return this.age;
  }

  get away(): boolean {
    return this.m === 'away' || this.m === 'eaten';
  }

  freeze(seconds: number): void {
    if (this.away) return;
    this.rest = Math.max(this.rest, seconds);
  }

  frighten(ctx: EnemyCtx, from: Pt): boolean {
    if (this.away) return false;
    const a = Math.atan2(this.snake.head.y - from.y, this.snake.head.x - from.x);
    this.target = pt(clamp(this.snake.head.x + Math.cos(a) * 300, 30, ctx.w - 30), clamp(this.snake.head.y + Math.sin(a) * 300, 30, ctx.h - 30));
    this.m = 'roam';
    this.left = 3;
    return true;
  }

  step(ctx: EnemyCtx, dt: number): void {
    this.age += dt;
    this.left -= dt;
    this.rest = Math.max(0, this.rest - dt);
    if (this.away) {
      if (this.left > 0) return;
      this.arrive(ctx);
      return;
    }
    const s = this.snake;
    const me = ctx.snake;
    // The player swallows a rival narrower than its gape.
    if (me.spec.snakeEater && s.width <= me.gape && me.mode === 'move' && this.touches(me.head, me.width)) {
      ctx.feed(s.head, s.width * 1.6, s.length * 0.45, this.spec.points);
      this.m = 'eaten';
      this.left = this.spec.respawn;
      this.x = -200;
      this.y = -200;
      return;
    }
    const sees = this.spec.hunts > 0 && !me.hidden && dist(me.head, s.head) < this.spec.hunts;
    if (sees) this.target = me.head;
    else if (!this.target || dist(this.target, s.head) < 20 || this.left <= 0) this.pick(ctx);
    const input: SnakeInput = { toward: this.rest > 0 ? null : this.target, face: null, strike: sees && dist(me.head, s.head) < 70 };
    if (this.rest <= 0) s.steer(input, dt, BOARD, ctx.solids);
    s.digest(dt);
    this.x = s.head.x;
    this.y = s.head.y;
    this.heading = s.heading;
    if (this.spec.eatsPrey) this.eatPrey(ctx);
    // Heads meeting: the bigger snake bites.
    if (this.rest <= 0 && dist(me.head, s.head) < (me.width + s.width) / 2 + 4 && s.width > me.width * 1.04) {
      if (ctx.hurt(this.spec.cause, s.head)) this.rest = 1.2;
    }
  }

  /** Whether a head of width `w` at `p` touches this rival anywhere along its body. */
  private touches(p: Pt, w: number): boolean {
    const s = this.snake;
    const r = (w + s.width) / 2;
    const pts = s.trail.pts;
    for (let i = 0; i < s.trail.count; i += 2) if (dist(pts[i]!, p) < r) return true;
    return false;
  }

  /** The nearest prey it can swallow, or somewhere to roam. */
  private pick(ctx: EnemyCtx): void {
    const s = this.snake;
    let best: Pt | null = null;
    let bd = Infinity;
    if (this.spec.eatsPrey) {
      for (const p of ctx.prey) {
        if (!catchable(p) || ctx.preySpec(p.kind).size > s.gape) continue;
        const d = dist(p, s.head);
        if (d < bd) {
          bd = d;
          best = p;
        }
      }
    }
    this.target = best ?? pt(60 + ctx.rng() * (ctx.w - 120), 60 + ctx.rng() * (ctx.h - 120));
    this.left = 3 + ctx.rng() * 3;
  }

  private eatPrey(ctx: EnemyCtx): void {
    const s = this.snake;
    for (const p of [...ctx.prey]) {
      if (!catchable(p)) continue;
      const spec = ctx.preySpec(p.kind);
      if (spec.size > s.gape || dist(p, s.head) > s.width * 0.65 + spec.size / 2) continue;
      ctx.takePrey(p);
      s.swallowed(spec.size, spec.growth * 0.6);
      ctx.emit({ type: 'say', text: 'gulp', x: p.x, y: p.y - 18 });
      this.target = null;
    }
  }

  private arrive(ctx: EnemyCtx): void {
    const e = edgePoint(ctx.rng, ctx.w, ctx.h, 10);
    const into = pt(clamp(e.x, 10, ctx.w - 10), clamp(e.y, 10, ctx.h - 10));
    const heading = Math.atan2(ctx.h / 2 - into.y, ctx.w / 2 - into.x);
    // A fresh body, laid out behind it off the board's edge.
    const s = this.snake;
    s.trail.length = this.spec.length;
    s.trail.pts = Array.from({ length: Math.ceil(this.spec.length / 4) + 1 }, (_, i) => pt(into.x - Math.cos(heading) * i * 4, into.y - Math.sin(heading) * i * 4));
    s.heading = heading;
    s.lumps.length = 0;
    s.pending = 0;
    this.m = 'roam';
    this.age = 0;
    this.target = null;
    ctx.emit({ type: 'arrive', kind: this.kind, x: into.x, y: into.y });
  }
}
