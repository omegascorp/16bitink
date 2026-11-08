import { edgePoint, type EnemyCtx } from '../enemyTypes';
import { clamp, dist, pt, type Pt } from '../vec';
import { EnemyBase } from './base';

type CatMode = 'enter' | 'stalk' | 'crouch' | 'pounce' | 'dazed' | 'startle' | 'retreat' | 'gone';

/** It likes to stalk from about this far, px, and only crouches to pounce from within this range. */
const STALK_DIST = 175;
const POUNCE_RANGE = [100, 280] as const;
const STALK_SPEED = 70;
/** The crouch: its wiggle before the pounce, the tell, s. */
const CROUCH_TIME = 0.9;
const POUNCE_TIME = 0.36;
/** A pounce lands on the head if it passes this close, px. */
const POUNCE_REACH = 32;
/** After a missed pounce it's off balance this long: strike it then, s. */
const DAZED_TIME = 1.7;
/** A strike lands on it this close, px. */
const STRIKE_REACH = 46;
/** How far ahead of the head it aims, s of the snake's movement. */
const LEAD = 0.3;

/**
 * The Old Tomcat, chapter 1's boss, a pouncer: it stalks the snake from a
 * distance, crouches and wiggles (a dotted lane shows where it will
 * land), then pounces. A pounce through the head costs a life. A pounce
 * that misses leaves it off balance, and a strike then hurts it: it leaps
 * straight up in fright, like a cat meeting a cucumber, and backs off.
 * Under cover the snake can't be seen, so it only prowls where it last
 * saw the head.
 */
export class Tomcat extends EnemyBase<CatMode> {
  hp: number;
  readonly maxHp: number;
  /** The lane of the coming pounce, while crouched or pouncing. */
  lane: { readonly from: Pt; readonly to: Pt } | null = null;
  private lastSeen: Pt;
  private target: Pt = pt(0, 0);

  constructor(id: number, hp: number, w: number, h: number) {
    super(id, 'tomcat', pt(w + 60, h * 0.5), 'enter');
    this.hp = hp;
    this.maxHp = hp;
    this.lastSeen = pt(w / 2, h / 2);
    this.left = 1.2;
  }

  get away(): boolean {
    return this.m === 'gone';
  }

  get beaten(): boolean {
    return this.hp <= 0;
  }

  step(ctx: EnemyCtx, dt: number): void {
    const done = this.tick(dt);
    const snake = ctx.snake;
    if (!snake.hidden) this.lastSeen = pt(snake.head.x, snake.head.y);
    switch (this.m) {
      case 'enter':
        this.moveTo(pt(ctx.w - 140, ctx.h * 0.5), 160, dt);
        if (done) this.go('stalk', 2.4 + ctx.rng() * 1.2);
        return;
      case 'stalk':
        this.stalk(ctx, dt, done);
        return;
      case 'crouch':
        // Eyes on the head, but the pounce's line is set: the wiggle is the warning.
        if (done && this.lane) {
          this.go('pounce', POUNCE_TIME);
          ctx.emit({ type: 'pounce', x: this.x, y: this.y });
        }
        return;
      case 'pounce':
        this.pounce(ctx, done);
        return;
      case 'dazed':
        if (this.struckBy(ctx, STRIKE_REACH)) {
          this.hit(ctx);
          return;
        }
        if (done) this.go('stalk', 2 + ctx.rng() * 1.5);
        return;
      case 'startle':
        this.moveTo(this.target, 420, dt);
        this.alt = Math.sin(Math.min(1, this.age / 0.5) * Math.PI) * 0.6;
        if (done) {
          this.alt = 0;
          if (this.beaten) {
            this.target = edgePoint(ctx.rng, ctx.w, ctx.h, 120);
            this.go('retreat', 2);
            ctx.emit({ type: 'bossBeaten', x: this.x, y: this.y });
          } else this.go('retreat', 1.4);
        }
        return;
      case 'retreat':
        this.moveTo(this.target, this.beaten ? 260 : 120, dt);
        if (done) this.go(this.beaten ? 'gone' : 'stalk', 2.4 + ctx.rng());
        return;
      case 'gone':
        return;
    }
  }

  /** Keeps its distance from where it saw the head, circling slowly; crouches when it has a line. */
  private stalk(ctx: EnemyCtx, dt: number, done: boolean): void {
    const seen = this.lastSeen;
    const a = Math.atan2(this.y - seen.y, this.x - seen.x) + dt * 0.35;
    const spot = pt(clamp(seen.x + Math.cos(a) * STALK_DIST, 40, ctx.w - 40), clamp(seen.y + Math.sin(a) * STALK_DIST, 40, ctx.h - 40));
    this.moveTo(spot, STALK_SPEED, dt);
    this.heading = Math.atan2(seen.y - this.y, seen.x - this.x);
    if (Math.floor(this.age * 1.3) !== Math.floor((this.age - dt) * 1.3) && ctx.rng() < 0.2) ctx.emit({ type: 'growl', x: this.x, y: this.y });
    const d = dist(this, ctx.snake.head);
    if (done && !ctx.snake.hidden && d > POUNCE_RANGE[0] && d < POUNCE_RANGE[1]) {
      const s = ctx.snake;
      const v = s.spec.speed * LEAD;
      const aim = pt(clamp(s.head.x + Math.cos(s.heading) * v, 30, ctx.w - 30), clamp(s.head.y + Math.sin(s.heading) * v, 30, ctx.h - 30));
      // Leaps a little past where it aims, so a still snake can't sit under it.
      const ang = Math.atan2(aim.y - this.y, aim.x - this.x);
      const to = pt(clamp(aim.x + Math.cos(ang) * 40, 30, ctx.w - 30), clamp(aim.y + Math.sin(ang) * 40, 30, ctx.h - 30));
      this.lane = { from: this.here(), to };
      this.heading = ang;
      this.go('crouch', CROUCH_TIME);
      ctx.emit({ type: 'crouch', x: this.x, y: this.y });
    } else if (done) this.left = 0.6;
  }

  private pounce(ctx: EnemyCtx, done: boolean): void {
    const lane = this.lane;
    if (!lane) return;
    const t = Math.min(1, this.age / POUNCE_TIME);
    this.x = lane.from.x + (lane.to.x - lane.from.x) * t;
    this.y = lane.from.y + (lane.to.y - lane.from.y) * t;
    this.alt = Math.sin(t * Math.PI) * 0.5;
    if (dist(this, ctx.snake.head) < POUNCE_REACH + ctx.snake.width / 2 && ctx.hurt('pounced', this.here())) {
      this.lane = null;
      this.alt = 0;
      const a = Math.atan2(this.y - ctx.snake.head.y, this.x - ctx.snake.head.x);
      this.target = pt(clamp(this.x + Math.cos(a) * 160, 40, ctx.w - 40), clamp(this.y + Math.sin(a) * 160, 40, ctx.h - 40));
      this.go('retreat', 1.6);
      return;
    }
    if (!done) return;
    this.lane = null;
    this.alt = 0;
    this.go('dazed', DAZED_TIME);
    ctx.emit({ type: 'dazed', x: this.x, y: this.y });
  }

  private hit(ctx: EnemyCtx): void {
    this.hp -= 1;
    ctx.emit({ type: 'bossHit', x: this.x, y: this.y });
    ctx.emit({ type: 'startle', x: this.x, y: this.y });
    const head = ctx.snake.head;
    const a = Math.atan2(this.y - head.y, this.x - head.x);
    this.target = pt(clamp(this.x + Math.cos(a) * 200, 50, ctx.w - 50), clamp(this.y + Math.sin(a) * 200, 50, ctx.h - 50));
    this.go('startle', 0.5);
  }
}
