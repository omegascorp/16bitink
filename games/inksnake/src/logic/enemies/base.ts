import type { Enemy, EnemyCtx } from '../enemyTypes';
import { clamp, dist, pt, type Pt } from '../vec';

/** What every enemy shares: where it is, its mode and how long it has been in it. */
export abstract class EnemyBase<M extends string> implements Enemy {
  x: number;
  y: number;
  heading = 0;
  alt = 0;
  protected m: M;
  protected age = 0;
  /** Seconds left in the current mode, when it has a set length. */
  protected left = 0;

  protected constructor(readonly id: number, readonly kind: string, at: Pt, mode: M) {
    this.x = at.x;
    this.y = at.y;
    this.m = mode;
  }

  get mode(): string {
    return this.m;
  }

  get modeAge(): number {
    return this.age;
  }

  abstract get away(): boolean;

  abstract step(ctx: EnemyCtx, dt: number): void;

  protected go(mode: M, seconds = 0): void {
    this.m = mode;
    this.age = 0;
    this.left = seconds;
  }

  /** Ages the mode; returns true once its set time has run out. */
  protected tick(dt: number): boolean {
    this.age += dt;
    this.left -= dt;
    return this.left <= 0;
  }

  /** Moves towards `to` at `speed` px/s, facing it; returns true on arrival. */
  protected moveTo(to: Pt, speed: number, dt: number): boolean {
    const d = dist(this, to);
    if (d < 1) return true;
    this.heading = Math.atan2(to.y - this.y, to.x - this.x);
    const s = Math.min(d, speed * dt);
    this.x += Math.cos(this.heading) * s;
    this.y += Math.sin(this.heading) * s;
    return s >= d;
  }

  /** Keeps it on the board, `pad` px in from the edges. */
  protected keepOn(ctx: EnemyCtx, pad: number): void {
    this.x = clamp(this.x, pad, ctx.w - pad);
    this.y = clamp(this.y, pad, ctx.h - pad);
  }

  /** Whether the snake struck it: a lunge with the head this close. */
  protected struckBy(ctx: EnemyCtx, reach: number): boolean {
    return ctx.snake.striking && dist(ctx.snake.head, this) < reach + ctx.snake.width / 2;
  }

  protected here(): Pt {
    return pt(this.x, this.y);
  }
}
